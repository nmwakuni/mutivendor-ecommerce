import { prisma } from '../lib/prisma';
import { EscrowStatus, DisputeStatus, OrderStatus } from '@prisma/client';
import { ApiError } from '../utils/ApiError';

class EscrowService {
  /**
   * Create escrow for payment
   */
  async createEscrow(paymentId: string, amount: number, daysUntilRelease = 7) {
    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
      include: { order: true },
    });

    if (!payment) {
      throw new ApiError(404, 'Payment not found');
    }

    const autoReleaseAt = new Date();
    autoReleaseAt.setDate(autoReleaseAt.getDate() + daysUntilRelease);

    const escrow = await prisma.escrowPayment.create({
      data: {
        paymentId,
        amount,
        status: EscrowStatus.HELD,
        autoReleaseAt,
      },
    });

    return escrow;
  }

  /**
   * Release escrow to vendor
   */
  async releaseToVendor(escrowId: string) {
    const escrow = await prisma.escrowPayment.findUnique({
      where: { id: escrowId },
      include: {
        payment: {
          include: {
            order: true,
          },
        },
      },
    });

    if (!escrow) {
      throw new ApiError(404, 'Escrow not found');
    }

    if (escrow.status !== EscrowStatus.HELD) {
      throw new ApiError(400, 'Escrow is not in held status');
    }

    // Check if there's an active dispute
    const dispute = await prisma.dispute.findUnique({
      where: { escrowId: escrow.id },
    });

    if (dispute && dispute.status === DisputeStatus.OPEN) {
      throw new ApiError(400, 'Cannot release escrow with active dispute');
    }

    const updated = await prisma.escrowPayment.update({
      where: { id: escrowId },
      data: {
        status: EscrowStatus.RELEASED_TO_VENDOR,
        releasedAt: new Date(),
      },
    });

    // TODO: Trigger vendor payout process
    // This would integrate with payment service to pay the vendor

    return updated;
  }

  /**
   * Refund escrow to customer
   */
  async refundToCustomer(escrowId: string, reason?: string) {
    const escrow = await prisma.escrowPayment.findUnique({
      where: { id: escrowId },
      include: {
        payment: {
          include: {
            order: true,
          },
        },
      },
    });

    if (!escrow) {
      throw new ApiError(404, 'Escrow not found');
    }

    if (escrow.status !== EscrowStatus.HELD && escrow.status !== EscrowStatus.DISPUTED) {
      throw new ApiError(400, 'Escrow cannot be refunded in current status');
    }

    const updated = await prisma.escrowPayment.update({
      where: { id: escrowId },
      data: {
        status: EscrowStatus.REFUNDED_TO_CUSTOMER,
        releasedAt: new Date(),
      },
    });

    // Update order status
    await prisma.order.update({
      where: { id: escrow.payment.orderId },
      data: { status: OrderStatus.REFUNDED },
    });

    // TODO: Process refund through payment gateway

    return updated;
  }

  /**
   * Raise a dispute
   */
  async raiseDispute(
    orderId: string,
    userId: string,
    reason: string,
    description: string,
    evidence: string[]
  ) {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        payment: {
          include: {
            escrow: true,
          },
        },
      },
    });

    if (!order) {
      throw new ApiError(404, 'Order not found');
    }

    if (!order.payment?.escrow) {
      throw new ApiError(400, 'No escrow found for this order');
    }

    if (order.payment.escrow.status !== EscrowStatus.HELD) {
      throw new ApiError(400, 'Escrow must be in held status to raise dispute');
    }

    // Check if user is authorized (customer or vendor)
    const isCustomer = order.userId === userId;
    const vendor = await prisma.vendor.findUnique({
      where: { id: order.vendorId },
    });
    const isVendor = vendor?.userId === userId;

    if (!isCustomer && !isVendor) {
      throw new ApiError(403, 'Not authorized to raise dispute for this order');
    }

    const dispute = await prisma.dispute.create({
      data: {
        escrowId: order.payment.escrow.id,
        orderId,
        raisedBy: userId,
        reason,
        description,
        evidence,
        status: DisputeStatus.OPEN,
      },
    });

    // Update escrow status
    await prisma.escrowPayment.update({
      where: { id: order.payment.escrow.id },
      data: { status: EscrowStatus.DISPUTED },
    });

    return dispute;
  }

  /**
   * Resolve dispute (Admin)
   */
  async resolveDispute(
    disputeId: string,
    adminUserId: string,
    resolution: 'customer' | 'vendor',
    resolutionNotes: string
  ) {
    const dispute = await prisma.dispute.findUnique({
      where: { id: disputeId },
      include: {
        escrow: {
          include: {
            payment: {
              include: {
                order: true,
              },
            },
          },
        },
      },
    });

    if (!dispute) {
      throw new ApiError(404, 'Dispute not found');
    }

    if (dispute.status !== DisputeStatus.OPEN) {
      throw new ApiError(400, 'Dispute is not open');
    }

    const newStatus = resolution === 'customer'
      ? DisputeStatus.RESOLVED_CUSTOMER
      : DisputeStatus.RESOLVED_VENDOR;

    const updated = await prisma.dispute.update({
      where: { id: disputeId },
      data: {
        status: newStatus,
        resolution: resolutionNotes,
        resolvedBy: adminUserId,
        resolvedAt: new Date(),
      },
    });

    // Process escrow based on resolution
    if (resolution === 'customer') {
      await this.refundToCustomer(dispute.escrowId, resolutionNotes);
    } else {
      await this.releaseToVendor(dispute.escrowId);
    }

    return updated;
  }

  /**
   * Get dispute details
   */
  async getDispute(disputeId: string) {
    const dispute = await prisma.dispute.findUnique({
      where: { id: disputeId },
      include: {
        order: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
            vendor: {
              include: {
                user: {
                  select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    email: true,
                  },
                },
              },
            },
            items: {
              include: {
                product: true,
              },
            },
          },
        },
        escrow: true,
      },
    });

    return dispute;
  }

  /**
   * Get open disputes (Admin)
   */
  async getOpenDisputes(limit = 50, offset = 0) {
    const disputes = await prisma.dispute.findMany({
      where: {
        status: { in: [DisputeStatus.OPEN, DisputeStatus.UNDER_REVIEW] },
      },
      include: {
        order: {
          include: {
            user: {
              select: {
                firstName: true,
                lastName: true,
              },
            },
            vendor: {
              select: {
                businessName: true,
              },
            },
          },
        },
        escrow: true,
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    });

    const total = await prisma.dispute.count({
      where: {
        status: { in: [DisputeStatus.OPEN, DisputeStatus.UNDER_REVIEW] },
      },
    });

    return { disputes, total };
  }

  /**
   * Auto-release expired escrows
   */
  async autoReleaseExpiredEscrows() {
    const expiredEscrows = await prisma.escrowPayment.findMany({
      where: {
        status: EscrowStatus.HELD,
        autoReleaseAt: { lte: new Date() },
      },
    });

    const results = [];

    for (const escrow of expiredEscrows) {
      try {
        // Check if there's an active dispute
        const dispute = await prisma.dispute.findUnique({
          where: { escrowId: escrow.id },
        });

        if (!dispute || dispute.status !== DisputeStatus.OPEN) {
          await this.releaseToVendor(escrow.id);
          results.push({ escrowId: escrow.id, status: 'released' });
        }
      } catch (error) {
        console.error(`Failed to auto-release escrow ${escrow.id}:`, error);
        results.push({ escrowId: escrow.id, status: 'failed' });
      }
    }

    return results;
  }

  /**
   * Get escrow by payment ID
   */
  async getEscrowByPayment(paymentId: string) {
    const escrow = await prisma.escrowPayment.findUnique({
      where: { paymentId },
      include: {
        payment: {
          include: {
            order: true,
          },
        },
        dispute: true,
      },
    });

    return escrow;
  }

  /**
   * Mark dispute under review
   */
  async markDisputeUnderReview(disputeId: string, adminUserId: string) {
    const dispute = await prisma.dispute.update({
      where: { id: disputeId },
      data: {
        status: DisputeStatus.UNDER_REVIEW,
        resolvedBy: adminUserId,
      },
    });

    return dispute;
  }

  /**
   * Cancel dispute
   */
  async cancelDispute(disputeId: string, userId: string) {
    const dispute = await prisma.dispute.findUnique({
      where: { id: disputeId },
      include: {
        escrow: true,
      },
    });

    if (!dispute) {
      throw new ApiError(404, 'Dispute not found');
    }

    // Only the person who raised it can cancel
    if (dispute.raisedBy !== userId) {
      throw new ApiError(403, 'Not authorized to cancel this dispute');
    }

    if (dispute.status !== DisputeStatus.OPEN) {
      throw new ApiError(400, 'Only open disputes can be cancelled');
    }

    const updated = await prisma.dispute.update({
      where: { id: disputeId },
      data: { status: DisputeStatus.CANCELLED },
    });

    // Revert escrow to held status
    await prisma.escrowPayment.update({
      where: { id: dispute.escrowId },
      data: { status: EscrowStatus.HELD },
    });

    return updated;
  }
}

export default new EscrowService();
