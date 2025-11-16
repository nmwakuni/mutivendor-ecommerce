import { z } from 'zod';

export const createOrderSchema = z.object({
  body: z.object({
    items: z.array(
      z.object({
        productId: z.string().min(1, 'Product ID is required'),
        quantity: z.number().int().positive('Quantity must be positive'),
      })
    ).min(1, 'At least one item is required'),
    shippingAddressId: z.string().min(1, 'Shipping address is required'),
    phoneNumber: z.string().regex(/^(\+?254|0)[17]\d{8}$/, 'Invalid Kenyan phone number'),
    customerNotes: z.string().max(500).optional(),
  }),
});

export const updateOrderStatusSchema = z.object({
  body: z.object({
    status: z.enum(['CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED']),
    vendorNotes: z.string().max(500).optional(),
  }),
});

export const getOrdersSchema = z.object({
  query: z.object({
    page: z.string().optional(),
    pageSize: z.string().optional(),
    status: z.string().optional(),
    paymentStatus: z.string().optional(),
    vendorId: z.string().optional(),
    sortBy: z.string().optional(),
    sortOrder: z.enum(['asc', 'desc']).optional(),
  }),
});
