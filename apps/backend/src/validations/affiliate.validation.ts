import { z } from 'zod';

export const applyAffiliateSchema = z.object({
  instagramHandle: z.string().optional(),
  twitterHandle: z.string().optional(),
  tiktokHandle: z.string().optional(),
  youtubeChannel: z.string().url().optional(),
  websiteUrl: z.string().url().optional(),
  followers: z.number().int().min(0).optional(),
  bankName: z.string().optional(),
  accountNumber: z.string().optional(),
  accountName: z.string().optional(),
  phoneNumber: z.string().optional(),
});

export const updateAffiliateProfileSchema = applyAffiliateSchema.partial();

export const approveAffiliateSchema = z.object({
  commissionRate: z.number().min(0).max(50).optional(),
});

export const rejectAffiliateSchema = z.object({
  reason: z.string().min(1),
});

export const updateCommissionRateSchema = z.object({
  rate: z.number().min(0).max(50),
});

export const approveCommissionSchema = z.object({
  commissionIds: z.array(z.string().cuid()),
});

export const payCommissionSchema = z.object({
  commissionIds: z.array(z.string().cuid()),
  notes: z.string().optional(),
});

export const trackClickSchema = z.object({
  affiliateCode: z.string(),
  ipAddress: z.string().ip().optional(),
  userAgent: z.string().optional(),
  referrer: z.string().url().optional(),
  landingPage: z.string().url().optional(),
});
