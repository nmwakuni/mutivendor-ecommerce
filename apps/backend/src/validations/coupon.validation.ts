import { z } from 'zod';

export const createCouponSchema = z.object({
  code: z.string().min(3).max(50).toUpperCase().regex(/^[A-Z0-9-_]+$/, 'Code must contain only uppercase letters, numbers, hyphens, and underscores'),
  type: z.enum(['PERCENTAGE', 'FIXED_AMOUNT', 'FREE_SHIPPING']),
  value: z.number().positive(),
  description: z.string().max(500).optional(),
  minPurchase: z.number().positive().optional(),
  maxDiscount: z.number().positive().optional(),
  usageLimit: z.number().int().positive().optional(),
  usagePerUser: z.number().int().positive().optional(),
  categoryId: z.string().cuid().optional(),
  vendorId: z.string().cuid().optional(),
  productIds: z.array(z.string().cuid()).optional(),
  startDate: z.string().datetime().optional(),
  expiryDate: z.string().datetime().optional(),
});

export const updateCouponSchema = z.object({
  code: z.string().min(3).max(50).toUpperCase().regex(/^[A-Z0-9-_]+$/).optional(),
  type: z.enum(['PERCENTAGE', 'FIXED_AMOUNT', 'FREE_SHIPPING']).optional(),
  value: z.number().positive().optional(),
  description: z.string().max(500).optional(),
  minPurchase: z.number().positive().nullable().optional(),
  maxDiscount: z.number().positive().nullable().optional(),
  usageLimit: z.number().int().positive().nullable().optional(),
  usagePerUser: z.number().int().positive().nullable().optional(),
  categoryId: z.string().cuid().nullable().optional(),
  vendorId: z.string().cuid().nullable().optional(),
  productIds: z.array(z.string().cuid()).optional(),
  isActive: z.boolean().optional(),
  startDate: z.string().datetime().nullable().optional(),
  expiryDate: z.string().datetime().nullable().optional(),
});

export const applyCouponSchema = z.object({
  code: z.string(),
  orderTotal: z.number().positive(),
  productIds: z.array(z.string().cuid()).optional(),
});

export type CreateCouponData = z.infer<typeof createCouponSchema>;
export type UpdateCouponData = z.infer<typeof updateCouponSchema>;
export type ApplyCouponData = z.infer<typeof applyCouponSchema>;
