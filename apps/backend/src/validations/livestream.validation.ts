import { z } from 'zod';

export const createStreamSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  thumbnail: z.string().url().optional(),
  scheduledAt: z.string().datetime().or(z.date()),
  productIds: z.array(z.string().cuid()).optional(),
  tags: z.array(z.string()).optional(),
});

export const updateStreamSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(1000).optional(),
  thumbnail: z.string().url().optional(),
  scheduledAt: z.string().datetime().or(z.date()).optional(),
  tags: z.array(z.string()).optional(),
});

export const addProductsToStreamSchema = z.object({
  productIds: z.array(z.string().cuid()),
  specialPrices: z.record(z.string(), z.number().positive()).optional(),
});

export const removeProductFromStreamSchema = z.object({
  productId: z.string().cuid(),
});

export const postCommentSchema = z.object({
  message: z.string().min(1).max(500),
});

export const joinStreamSchema = z.object({
  sessionId: z.string().optional(),
});
