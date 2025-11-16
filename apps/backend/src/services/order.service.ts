import { prisma } from '@/config/database';
import { mpesaService } from '@/services/mpesa.service';
import { inngest } from '@/inngest/client';
import { NotFoundError, BadRequestError, ForbiddenError } from '@/middleware/error-handler';
import { logger } from '@/config/logger';
import { calculatePagination } from '@/utils/pagination';

interface OrderItem {
  productId: string;
  quantity: number;
}

interface CreateOrderData {
  items: OrderItem[];
  shippingAddressId: string;
  phoneNumber: string;
  customerNotes?: string;
}

export class OrderService {
  /**
   * Generate unique order number
   */
  private generateOrderNumber(): string {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `ORD-${timestamp}-${random}`;
  }

  /**
   * Create order
   */
  async create(userId: string, data: CreateOrderData) {
    // Validate products and calculate totals
    const productIds = data.items.map((item) => item.productId);
    const products = await prisma.product.findMany({
      where: {
        id: { in: productIds },
        isActive: true,
      },
      include: {
        vendor: true,
      },
    });

    if (products.length !== data.items.length) {
      throw new BadRequestError('Some products are not available');
    }

    // Check stock availability
    for (const item of data.items) {
      const product = products.find((p) => p.id === item.productId);
      if (!product) {
        throw new NotFoundError(`Product not found: ${item.productId}`);
      }

      if (product.trackInventory && product.stock < item.quantity) {
        throw new BadRequestError(`Insufficient stock for ${product.name}`);
      }
    }

    // For now, we'll assume all items are from one vendor (MVP)
    // In production, you'd split orders by vendor
    const vendor = products[0].vendor;

    // Calculate totals
    let subtotal = 0;
    const orderItems = data.items.map((item) => {
      const product = products.find((p) => p.id === item.productId)!;
      const total = product.price * item.quantity;
      subtotal += total;

      return {
        productId: item.productId,
        quantity: item.quantity,
        price: product.price,
        total,
      };
    });

    const tax = subtotal * 0.16; // 16% VAT in Kenya
    const shippingFee = 200; // Fixed shipping for now
    const total = subtotal + tax + shippingFee;

    // Calculate commission
    const commissionRate = vendor.commissionRate;
    const commissionAmount = (subtotal * commissionRate) / 100;
    const vendorPayout = subtotal - commissionAmount;

    // Create order and payment in a transaction
    const order = await prisma.$transaction(async (tx) => {
      // Create order
      const newOrder = await tx.order.create({
        data: {
          orderNumber: this.generateOrderNumber(),
          userId,
          vendorId: vendor.id,
          subtotal,
          tax,
          shippingFee,
          total,
          commissionRate,
          commissionAmount,
          vendorPayout,
          shippingAddressId: data.shippingAddressId,
          customerNotes: data.customerNotes,
          status: 'PENDING',
          paymentStatus: 'PENDING',
          items: {
            create: orderItems,
          },
        },
        include: {
          items: {
            include: {
              product: true,
            },
          },
          shippingAddress: true,
        },
      });

      // Create payment record
      await tx.payment.create({
        data: {
          orderId: newOrder.id,
          amount: total,
          currency: 'KES',
          method: 'MPESA',
          status: 'PENDING',
          phoneNumber: data.phoneNumber,
        },
      });

      return newOrder;
    });

    // Initiate M-Pesa STK Push
    try {
      const mpesaResult = await mpesaService.stkPush({
        phoneNumber: data.phoneNumber,
        amount: total,
        accountReference: order.orderNumber,
        transactionDesc: `Payment for order ${order.orderNumber}`,
      });

      logger.info('M-Pesa STK Push initiated', {
        orderId: order.id,
        orderNumber: order.orderNumber,
        checkoutRequestId: mpesaResult.CheckoutRequestID,
      });

      return {
        order,
        payment: {
          checkoutRequestId: mpesaResult.CheckoutRequestID,
          customerMessage: mpesaResult.CustomerMessage,
        },
      };
    } catch (error) {
      logger.error('M-Pesa STK Push failed', { orderId: order.id, error });

      // Update payment status
      await prisma.payment.update({
        where: { orderId: order.id },
        data: { status: 'FAILED' },
      });

      throw new BadRequestError('Failed to initiate M-Pesa payment. Please try again.');
    }
  }

  /**
   * Get order by ID
   */
  async getById(orderId: string, userId: string, userRole: string) {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: {
          include: {
            product: {
              include: {
                vendor: {
                  select: {
                    id: true,
                    businessName: true,
                    logo: true,
                  },
                },
              },
            },
          },
        },
        shippingAddress: true,
        payment: true,
        delivery: {
          include: {
            trackingEvents: {
              orderBy: {
                createdAt: 'desc',
              },
            },
          },
        },
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            phone: true,
          },
        },
      },
    });

    if (!order) {
      throw new NotFoundError('Order not found');
    }

    // Check authorization
    if (userRole === 'CUSTOMER' && order.userId !== userId) {
      throw new ForbiddenError('You can only view your own orders');
    }

    if (userRole === 'VENDOR') {
      const vendor = await prisma.vendor.findUnique({ where: { userId } });
      if (order.vendorId !== vendor?.id) {
        throw new ForbiddenError('You can only view orders for your products');
      }
    }

    return order;
  }

  /**
   * Get all orders with filters
   */
  async getAll(
    userId: string,
    userRole: string,
    filters?: {
      page?: number;
      pageSize?: number;
      status?: string;
      paymentStatus?: string;
      vendorId?: string;
      sortBy?: string;
      sortOrder?: 'asc' | 'desc';
    }
  ) {
    const {
      page = 1,
      pageSize = 20,
      status,
      paymentStatus,
      vendorId,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = filters || {};

    const where: any = {};

    // Filter based on role
    if (userRole === 'CUSTOMER') {
      where.userId = userId;
    } else if (userRole === 'VENDOR') {
      const vendor = await prisma.vendor.findUnique({ where: { userId } });
      where.vendorId = vendor?.id;
    }

    // Additional filters
    if (status) where.status = status;
    if (paymentStatus) where.paymentStatus = paymentStatus;
    if (vendorId && userRole === 'ADMIN') where.vendorId = vendorId;

    const total = await prisma.order.count({ where });
    const paginationMeta = calculatePagination(total, page, pageSize);

    const orders = await prisma.order.findMany({
      where,
      skip: paginationMeta.skip,
      take: paginationMeta.take,
      orderBy: { [sortBy]: sortOrder },
      include: {
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                thumbnail: true,
              },
            },
          },
        },
        payment: {
          select: {
            status: true,
            method: true,
          },
        },
        user: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    return {
      orders,
      meta: paginationMeta.meta,
    };
  }

  /**
   * Update order status (vendor)
   */
  async updateStatus(
    orderId: string,
    userId: string,
    status: string,
    vendorNotes?: string
  ) {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      throw new NotFoundError('Order not found');
    }

    // Check if vendor owns the order
    const vendor = await prisma.vendor.findUnique({ where: { userId } });
    if (order.vendorId !== vendor?.id) {
      throw new ForbiddenError('You can only update orders for your products');
    }

    const oldStatus = order.status;

    const updatedOrder = await prisma.order.update({
      where: { id: orderId },
      data: {
        status,
        vendorNotes,
        ...(status === 'SHIPPED' && { shippedAt: new Date() }),
        ...(status === 'DELIVERED' && { deliveredAt: new Date() }),
        ...(status === 'CANCELLED' && { cancelledAt: new Date() }),
      },
    });

    // Trigger status update event
    await inngest.send({
      name: 'order/status.updated',
      data: {
        orderId: order.id,
        oldStatus,
        newStatus: status,
        userId: order.userId,
      },
    });

    logger.info('Order status updated', {
      orderId,
      oldStatus,
      newStatus: status,
    });

    return updatedOrder;
  }

  /**
   * Cancel order (customer)
   */
  async cancel(orderId: string, userId: string) {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      throw new NotFoundError('Order not found');
    }

    if (order.userId !== userId) {
      throw new ForbiddenError('You can only cancel your own orders');
    }

    if (order.status !== 'PENDING' && order.status !== 'CONFIRMED') {
      throw new BadRequestError('Order cannot be cancelled');
    }

    const updatedOrder = await prisma.order.update({
      where: { id: orderId },
      data: {
        status: 'CANCELLED',
        cancelledAt: new Date(),
      },
    });

    logger.info('Order cancelled', { orderId, userId });

    return updatedOrder;
  }
}

export const orderService = new OrderService();
