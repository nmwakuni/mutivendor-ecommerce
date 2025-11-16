import { z } from 'zod';

export const createCategorySchema = z.object({
  name: z.string().min(2, 'Category name must be at least 2 characters').max(100),
  slug: z.string().min(2).max(100).optional(),
  description: z.string().max(500).optional(),
  parentId: z.string().cuid().optional(),
  order: z.number().int().min(0).optional(),
});

export const updateCategorySchema = z.object({
  name: z.string().min(2).max(100).optional(),
  slug: z.string().min(2).max(100).optional(),
  description: z.string().max(500).optional(),
  parentId: z.string().cuid().nullable().optional(),
  isActive: z.boolean().optional(),
  order: z.number().int().min(0).optional(),
});

export type CreateCategoryData = z.infer<typeof createCategorySchema>;
export type UpdateCategoryData = z.infer<typeof updateCategorySchema>;
