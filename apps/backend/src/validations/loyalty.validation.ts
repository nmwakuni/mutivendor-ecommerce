import { z } from 'zod';
import { LoyaltyTierLevel, PointTransactionType, RewardType } from '@prisma/client';

export const createTierSchema = z.object({
  name: z.string().min(1),
  level: z.nativeEnum(LoyaltyTierLevel),
  minPoints: z.number().int().min(0),
  maxPoints: z.number().int().positive().optional(),
  benefits: z.array(z.string()),
  discountPercent: z.number().min(0).max(100),
  icon: z.string().optional(),
  color: z.string().optional(),
});

export const updateTierSchema = createTierSchema.partial();

export const createRewardSchema = z.object({
  name: z.string().min(1),
  description: z.string().min(1),
  type: z.nativeEnum(RewardType),
  pointsCost: z.number().int().positive(),
  value: z.number().positive(),
  image: z.string().url().optional(),
  stock: z.number().int().min(0).optional(),
  validityDays: z.number().int().positive().optional(),
});

export const updateRewardSchema = createRewardSchema.partial();

export const redeemRewardSchema = z.object({
  rewardId: z.string().cuid(),
});

export const useRewardSchema = z.object({
  code: z.string().length(12),
});

export const awardPointsSchema = z.object({
  userId: z.string().cuid(),
  points: z.number().int().positive(),
  type: z.nativeEnum(PointTransactionType),
  description: z.string().min(1),
  reference: z.string().optional(),
});
