import { z } from 'zod';

export const createReviewSchema = z.object({
  productId: z.string().cuid('Invalid product ID'),
  rating: z.number().int().min(1, 'Rating must be at least 1').max(5, 'Rating cannot exceed 5'),
  title: z.string().min(3, 'Title must be at least 3 characters').max(100).optional(),
  comment: z.string().min(10, 'Comment must be at least 10 characters').max(1000),
});

export const updateReviewSchema = z.object({
  rating: z.number().int().min(1).max(5).optional(),
  title: z.string().min(3).max(100).optional(),
  comment: z.string().min(10).max(1000).optional(),
});

export const getReviewsSchema = z.object({
  productId: z.string().cuid().optional(),
  userId: z.string().cuid().optional(),
  rating: z.string().transform(Number).pipe(z.number().int().min(1).max(5)).optional(),
  isApproved: z.enum(['true', 'false']).transform((val) => val === 'true').optional(),
  page: z.string().transform(Number).pipe(z.number().int().min(1)).optional(),
  pageSize: z.string().transform(Number).pipe(z.number().int().min(1).max(100)).optional(),
});

export type CreateReviewData = z.infer<typeof createReviewSchema>;
export type UpdateReviewData = z.infer<typeof updateReviewSchema>;
