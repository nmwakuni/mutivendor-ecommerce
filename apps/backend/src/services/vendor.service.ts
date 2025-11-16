import { prisma } from '@/config/database';
import { inngest } from '@/inngest/client';
import { ConflictError, NotFoundError, ForbiddenError } from '@/middleware/error-handler';
import { logger } from '@/config/logger';

interface VendorApplicationData {
  businessName: string;
  businessEmail: string;
  businessPhone: string;
  description: string;
  registrationNumber?: string;
  taxId?: string;
  bankName: string;
  accountNumber: string;
  accountName: string;
}

export class VendorService {
  /**
   * Apply to become a vendor
   */
  async applyAsVendor(userId: string, data: VendorApplicationData) {
    // Check if user already has a vendor account
    const existingVendor = await prisma.vendor.findUnique({
      where: { userId },
    });

    if (existingVendor) {
      throw new ConflictError('You already have a vendor account');
    }

    // Check if business email already exists
    const existingEmail = await prisma.vendor.findUnique({
      where: { businessEmail: data.businessEmail },
    });

    if (existingEmail) {
      throw new ConflictError('Business email already registered');
    }

    // Update user role to VENDOR
    await prisma.user.update({
      where: { id: userId },
      data: { role: 'VENDOR' },
    });

    // Create vendor account
    const vendor = await prisma.vendor.create({
      data: {
        userId,
        ...data,
        status: 'PENDING',
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    logger.info('Vendor application submitted', { vendorId: vendor.id, userId });

    // TODO: Send notification to admin for review

    return vendor;
  }

  /**
   * Get vendor by ID
   */
  async getById(vendorId: string) {
    const vendor = await prisma.vendor.findUnique({
      where: { id: vendorId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            avatar: true,
          },
        },
        products: {
          take: 10,
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!vendor) {
      throw new NotFoundError('Vendor not found');
    }

    return vendor;
  }

  /**
   * Get vendor by user ID
   */
  async getByUserId(userId: string) {
    const vendor = await prisma.vendor.findUnique({
      where: { userId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            avatar: true,
          },
        },
      },
    });

    if (!vendor) {
      throw new NotFoundError('Vendor not found');
    }

    return vendor;
  }

  /**
   * Get all vendors (admin)
   */
  async getAll(filters?: {
    status?: string;
    search?: string;
    page?: number;
    pageSize?: number;
  }) {
    const { status, search, page = 1, pageSize = 20 } = filters || {};

    const where: any = {};

    if (status) {
      where.status = status;
    }

    if (search) {
      where.OR = [
        { businessName: { contains: search, mode: 'insensitive' } },
        { businessEmail: { contains: search, mode: 'insensitive' } },
      ];
    }

    const total = await prisma.vendor.count({ where });
    const skip = (page - 1) * pageSize;

    const vendors = await prisma.vendor.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    return {
      vendors,
      meta: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }

  /**
   * Update vendor
   */
  async update(vendorId: string, userId: string, data: Partial<VendorApplicationData>) {
    // Check if vendor exists and belongs to user
    const vendor = await prisma.vendor.findUnique({
      where: { id: vendorId },
    });

    if (!vendor) {
      throw new NotFoundError('Vendor not found');
    }

    if (vendor.userId !== userId) {
      throw new ForbiddenError('You can only update your own vendor account');
    }

    const updatedVendor = await prisma.vendor.update({
      where: { id: vendorId },
      data,
    });

    logger.info('Vendor updated', { vendorId, userId });

    return updatedVendor;
  }

  /**
   * Approve vendor (admin)
   */
  async approve(vendorId: string, commissionRate: number = 15) {
    const vendor = await prisma.vendor.findUnique({
      where: { id: vendorId },
      include: {
        user: true,
      },
    });

    if (!vendor) {
      throw new NotFoundError('Vendor not found');
    }

    if (vendor.status === 'APPROVED') {
      throw new ConflictError('Vendor already approved');
    }

    const updatedVendor = await prisma.vendor.update({
      where: { id: vendorId },
      data: {
        status: 'APPROVED',
        isVerified: true,
        commissionRate,
        approvedAt: new Date(),
      },
    });

    // Trigger vendor approval event
    await inngest.send({
      name: 'vendor/approved',
      data: {
        vendorId: vendor.id,
        userId: vendor.userId,
      },
    });

    logger.info('Vendor approved', { vendorId, commissionRate });

    return updatedVendor;
  }

  /**
   * Reject vendor (admin)
   */
  async reject(vendorId: string, reason: string) {
    const vendor = await prisma.vendor.findUnique({
      where: { id: vendorId },
    });

    if (!vendor) {
      throw new NotFoundError('Vendor not found');
    }

    const updatedVendor = await prisma.vendor.update({
      where: { id: vendorId },
      data: {
        status: 'REJECTED',
      },
    });

    // TODO: Send rejection email with reason

    logger.info('Vendor rejected', { vendorId, reason });

    return updatedVendor;
  }

  /**
   * Suspend vendor (admin)
   */
  async suspend(vendorId: string) {
    const vendor = await prisma.vendor.findUnique({
      where: { id: vendorId },
    });

    if (!vendor) {
      throw new NotFoundError('Vendor not found');
    }

    const updatedVendor = await prisma.vendor.update({
      where: { id: vendorId },
      data: {
        status: 'SUSPENDED',
      },
    });

    logger.warn('Vendor suspended', { vendorId });

    return updatedVendor;
  }

  /**
   * Get vendor statistics
   */
  async getStatistics(vendorId: string, userId: string) {
    const vendor = await prisma.vendor.findUnique({
      where: { id: vendorId },
    });

    if (!vendor) {
      throw new NotFoundError('Vendor not found');
    }

    if (vendor.userId !== userId) {
      throw new ForbiddenError('Unauthorized');
    }

    // Get statistics
    const [totalProducts, activeProducts, totalOrders, pendingOrders] = await Promise.all([
      prisma.product.count({ where: { vendorId } }),
      prisma.product.count({ where: { vendorId, isActive: true } }),
      prisma.order.count({ where: { vendorId } }),
      prisma.order.count({ where: { vendorId, status: 'PENDING' } }),
    ]);

    return {
      totalProducts,
      activeProducts,
      totalOrders,
      pendingOrders,
      totalSales: vendor.totalSales,
      rating: vendor.rating,
      totalReviews: vendor.totalReviews,
      commissionRate: vendor.commissionRate,
    };
  }
}

export const vendorService = new VendorService();
