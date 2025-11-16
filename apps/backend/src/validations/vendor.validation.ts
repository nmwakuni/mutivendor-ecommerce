import { z } from 'zod';

export const applyVendorSchema = z.object({
  body: z.object({
    businessName: z.string().min(2, 'Business name must be at least 2 characters').max(100),
    businessEmail: z.string().email('Invalid business email'),
    businessPhone: z.string().regex(/^(\+?254|0)[17]\d{8}$/, 'Invalid Kenyan phone number'),
    description: z.string().min(50, 'Description must be at least 50 characters').max(1000),
    registrationNumber: z.string().optional(),
    taxId: z.string().optional(),
    bankName: z.string().min(1, 'Bank name is required'),
    accountNumber: z.string().min(1, 'Account number is required'),
    accountName: z.string().min(1, 'Account name is required'),
  }),
});

export const updateVendorSchema = z.object({
  body: z.object({
    businessName: z.string().min(2).max(100).optional(),
    businessEmail: z.string().email().optional(),
    businessPhone: z.string().regex(/^(\+?254|0)[17]\d{8}$/).optional(),
    description: z.string().min(50).max(1000).optional(),
    registrationNumber: z.string().optional(),
    taxId: z.string().optional(),
    bankName: z.string().optional(),
    accountNumber: z.string().optional(),
    accountName: z.string().optional(),
  }),
});

export const approveVendorSchema = z.object({
  body: z.object({
    vendorId: z.string().min(1, 'Vendor ID is required'),
    commissionRate: z.number().min(0).max(100).default(15),
  }),
});

export const rejectVendorSchema = z.object({
  body: z.object({
    vendorId: z.string().min(1, 'Vendor ID is required'),
    reason: z.string().min(10, 'Rejection reason must be at least 10 characters'),
  }),
});
