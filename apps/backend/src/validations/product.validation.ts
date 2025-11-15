import { z } from 'zod';

export const createProductSchema = z.object({
  body: z.object({
    name: z.string().min(1, 'Product name is required').max(255),
    description: z.string().min(10, 'Description must be at least 10 characters'),
    shortDescription: z.string().max(500).optional(),
    price: z.number().positive('Price must be positive'),
    compareAtPrice: z.number().positive().optional(),
    costPrice: z.number().positive().optional(),
    sku: z.string().min(1, 'SKU is required'),
    barcode: z.string().optional(),
    trackInventory: z.boolean().default(true),
    stock: z.number().int().min(0).default(0),
    lowStockThreshold: z.number().int().min(0).default(10),
    categoryId: z.string().min(1, 'Category is required'),
    metaTitle: z.string().max(255).optional(),
    metaDescription: z.string().max(500).optional(),
    metaKeywords: z.array(z.string()).default([]),
    isFeatured: z.boolean().default(false),
  }),
});

export const updateProductSchema = z.object({
  body: z.object({
    name: z.string().min(1).max(255).optional(),
    description: z.string().min(10).optional(),
    shortDescription: z.string().max(500).optional(),
    price: z.number().positive().optional(),
    compareAtPrice: z.number().positive().optional(),
    costPrice: z.number().positive().optional(),
    sku: z.string().min(1).optional(),
    barcode: z.string().optional(),
    trackInventory: z.boolean().optional(),
    stock: z.number().int().min(0).optional(),
    lowStockThreshold: z.number().int().min(0).optional(),
    categoryId: z.string().optional(),
    metaTitle: z.string().max(255).optional(),
    metaDescription: z.string().max(500).optional(),
    metaKeywords: z.array(z.string()).optional(),
    isActive: z.boolean().optional(),
    isFeatured: z.boolean().optional(),
  }),
});

export const getProductsSchema = z.object({
  query: z.object({
    page: z.string().optional(),
    pageSize: z.string().optional(),
    categoryId: z.string().optional(),
    vendorId: z.string().optional(),
    search: z.string().optional(),
    minPrice: z.string().optional(),
    maxPrice: z.string().optional(),
    isActive: z.string().optional(),
    isFeatured: z.string().optional(),
    sortBy: z.string().optional(),
    sortOrder: z.enum(['asc', 'desc']).optional(),
  }),
});
