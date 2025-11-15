import { prisma } from '../config/database';
import { CreateCouponData, UpdateCouponData } from '../validations/coupon.validation';
import { ApiError } from '../middleware/error-handler';

class CouponService {
  async create(data: CreateCouponData) {
    // Check if code already exists
    const existing = await prisma.coupon.findUnique({
      where: { code: data.code },
    });

    if (existing) {
      throw new ApiError(400, 'Coupon code already exists');
    }

    // Validate percentage value
    if (data.type === 'PERCENTAGE' && data.value > 100) {
      throw new ApiError(400, 'Percentage value cannot exceed 100');
    }

    const coupon = await prisma.coupon.create({
      data: {
        code: data.code,
        type: data.type,
        value: data.value,
        description: data.description,
        minPurchase: data.minPurchase,
        maxDiscount: data.maxDiscount,
        usageLimit: data.usageLimit,
        usagePerUser: data.usagePerUser,
        categoryId: data.categoryId,
        vendorId: data.vendorId,
        productIds: data.productIds || [],
        startDate: data.startDate ? new Date(data.startDate) : undefined,
        expiryDate: data.expiryDate ? new Date(data.expiryDate) : undefined,
      },
      include: {
        category: true,
        vendor: true,
      },
    });

    return coupon;
  }

  async getAll(filters?: { isActive?: boolean; vendorId?: string }) {
    const where: any = {};

    if (filters?.isActive !== undefined) {
      where.isActive = filters.isActive;
    }

    if (filters?.vendorId) {
      where.vendorId = filters.vendorId;
    }

    const coupons = await prisma.coupon.findMany({
      where,
      include: {
        category: {
          select: {
            id: true,
            name: true,
          },
        },
        vendor: {
          select: {
            id: true,
            businessName: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return coupons;
  }

  async getById(id: string) {
    const coupon = await prisma.coupon.findUnique({
      where: { id },
      include: {
        category: true,
        vendor: true,
      },
    });

    if (!coupon) {
      throw new ApiError(404, 'Coupon not found');
    }

    return coupon;
  }

  async getByCode(code: string) {
    const coupon = await prisma.coupon.findUnique({
      where: { code: code.toUpperCase() },
      include: {
        category: true,
        vendor: true,
      },
    });

    if (!coupon) {
      throw new ApiError(404, 'Coupon not found');
    }

    return coupon;
  }

  async update(id: string, data: UpdateCouponData) {
    const coupon = await prisma.coupon.findUnique({
      where: { id },
    });

    if (!coupon) {
      throw new ApiError(404, 'Coupon not found');
    }

    // Validate percentage value
    if (data.type === 'PERCENTAGE' && data.value && data.value > 100) {
      throw new ApiError(400, 'Percentage value cannot exceed 100');
    }

    // Check code uniqueness if being updated
    if (data.code && data.code !== coupon.code) {
      const existing = await prisma.coupon.findUnique({
        where: { code: data.code },
      });

      if (existing) {
        throw new ApiError(400, 'Coupon code already exists');
      }
    }

    const updated = await prisma.coupon.update({
      where: { id },
      data: {
        ...data,
        startDate: data.startDate ? new Date(data.startDate) : undefined,
        expiryDate: data.expiryDate ? new Date(data.expiryDate) : undefined,
      },
      include: {
        category: true,
        vendor: true,
      },
    });

    return updated;
  }

  async delete(id: string) {
    const coupon = await prisma.coupon.findUnique({
      where: { id },
    });

    if (!coupon) {
      throw new ApiError(404, 'Coupon not found');
    }

    await prisma.coupon.delete({
      where: { id },
    });

    return { message: 'Coupon deleted successfully' };
  }

  async validate(code: string, userId: string, orderTotal: number, productIds?: string[]) {
    const coupon = await prisma.coupon.findUnique({
      where: { code: code.toUpperCase() },
      include: {
        userCoupons: {
          where: { userId },
        },
      },
    });

    if (!coupon) {
      throw new ApiError(404, 'Invalid coupon code');
    }

    // Check if active
    if (!coupon.isActive) {
      throw new ApiError(400, 'This coupon is no longer active');
    }

    // Check start date
    if (coupon.startDate && new Date() < new Date(coupon.startDate)) {
      throw new ApiError(400, 'This coupon is not yet valid');
    }

    // Check expiry date
    if (coupon.expiryDate && new Date() > new Date(coupon.expiryDate)) {
      throw new ApiError(400, 'This coupon has expired');
    }

    // Check minimum purchase
    if (coupon.minPurchase && orderTotal < coupon.minPurchase) {
      throw new ApiError(
        400,
        `Minimum purchase of KES ${coupon.minPurchase.toLocaleString()} required`
      );
    }

    // Check total usage limit
    if (coupon.usageLimit && coupon.timesUsed >= coupon.usageLimit) {
      throw new ApiError(400, 'This coupon has reached its usage limit');
    }

    // Check per-user usage limit
    if (coupon.usagePerUser) {
      const userCoupon = coupon.userCoupons[0];
      if (userCoupon && userCoupon.timesUsed >= coupon.usagePerUser) {
        throw new ApiError(400, 'You have reached the usage limit for this coupon');
      }
    }

    // Check product applicability
    if (coupon.productIds.length > 0 && productIds) {
      const hasApplicableProduct = productIds.some((pid) => coupon.productIds.includes(pid));
      if (!hasApplicableProduct) {
        throw new ApiError(400, 'This coupon is not applicable to the products in your cart');
      }
    }

    return coupon;
  }

  async calculateDiscount(coupon: any, orderTotal: number) {
    let discount = 0;

    if (coupon.type === 'PERCENTAGE') {
      discount = (orderTotal * coupon.value) / 100;
      if (coupon.maxDiscount && discount > coupon.maxDiscount) {
        discount = coupon.maxDiscount;
      }
    } else if (coupon.type === 'FIXED_AMOUNT') {
      discount = coupon.value;
    }

    // Ensure discount doesn't exceed order total
    discount = Math.min(discount, orderTotal);

    return discount;
  }

  async applyCoupon(couponId: string, userId: string) {
    // Increment coupon usage
    await prisma.coupon.update({
      where: { id: couponId },
      data: {
        timesUsed: {
          increment: 1,
        },
      },
    });

    // Track user usage
    const userCoupon = await prisma.userCoupon.findUnique({
      where: {
        userId_couponId: {
          userId,
          couponId,
        },
      },
    });

    if (userCoupon) {
      await prisma.userCoupon.update({
        where: { id: userCoupon.id },
        data: {
          timesUsed: {
            increment: 1,
          },
        },
      });
    } else {
      await prisma.userCoupon.create({
        data: {
          userId,
          couponId,
          timesUsed: 1,
        },
      });
    }
  }
}

export const couponService = new CouponService();
