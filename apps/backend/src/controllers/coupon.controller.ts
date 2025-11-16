import { Request, Response } from 'express';
import { couponService } from '../services/coupon.service';
import {
  createCouponSchema,
  updateCouponSchema,
  applyCouponSchema,
} from '../validations/coupon.validation';

export const couponController = {
  async getAll(req: Request, res: Response) {
    const { isActive, vendorId } = req.query;

    const filters: any = {};

    if (isActive !== undefined) {
      filters.isActive = isActive === 'true';
    }

    if (vendorId) {
      filters.vendorId = String(vendorId);
    }

    const coupons = await couponService.getAll(filters);

    res.json({
      success: true,
      message: 'Coupons retrieved successfully',
      data: coupons,
    });
  },

  async getById(req: Request, res: Response) {
    const { id } = req.params;

    const coupon = await couponService.getById(id);

    res.json({
      success: true,
      message: 'Coupon retrieved successfully',
      data: coupon,
    });
  },

  async create(req: Request, res: Response) {
    const validatedData = createCouponSchema.parse(req.body);

    const coupon = await couponService.create(validatedData);

    res.status(201).json({
      success: true,
      message: 'Coupon created successfully',
      data: coupon,
    });
  },

  async update(req: Request, res: Response) {
    const { id } = req.params;
    const validatedData = updateCouponSchema.parse(req.body);

    const coupon = await couponService.update(id, validatedData);

    res.json({
      success: true,
      message: 'Coupon updated successfully',
      data: coupon,
    });
  },

  async delete(req: Request, res: Response) {
    const { id } = req.params;

    const result = await couponService.delete(id);

    res.json({
      success: true,
      message: result.message,
    });
  },

  async validate(req: Request, res: Response) {
    const validatedData = applyCouponSchema.parse(req.body);
    const userId = req.user!.id;

    const coupon = await couponService.validate(
      validatedData.code,
      userId,
      validatedData.orderTotal,
      validatedData.productIds
    );

    const discount = await couponService.calculateDiscount(coupon, validatedData.orderTotal);

    res.json({
      success: true,
      message: 'Coupon is valid',
      data: {
        coupon: {
          id: coupon.id,
          code: coupon.code,
          type: coupon.type,
          description: coupon.description,
        },
        discount,
        finalTotal: validatedData.orderTotal - discount,
      },
    });
  },
};
