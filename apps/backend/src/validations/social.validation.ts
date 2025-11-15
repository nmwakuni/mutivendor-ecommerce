import { z } from 'zod';
import { GiftRegistryType, GiftRegistryPrivacy, SharePlatform } from '@prisma/client';

export const createGiftRegistrySchema = z.object({
  name: z.string().min(1).max(200),
  type: z.nativeEnum(GiftRegistryType),
  description: z.string().max(1000).optional(),
  eventDate: z.string().datetime().or(z.date()),
  privacy: z.nativeEnum(GiftRegistryPrivacy).optional(),
  shippingAddressId: z.string().cuid().optional(),
});

export const updateGiftRegistrySchema = createGiftRegistrySchema.partial();

export const addItemToRegistrySchema = z.object({
  productId: z.string().cuid(),
  quantity: z.number().int().positive().default(1),
  priority: z.number().int().min(0).max(10).default(0),
});

export const removeItemFromRegistrySchema = z.object({
  productId: z.string().cuid(),
});

export const purchaseRegistryItemSchema = z.object({
  productId: z.string().cuid(),
  quantity: z.number().int().positive(),
});

export const shareProductSchema = z.object({
  productId: z.string().cuid(),
  platform: z.nativeEnum(SharePlatform),
});

export const searchRegistriesSchema = z.object({
  query: z.string().min(1),
  type: z.nativeEnum(GiftRegistryType).optional(),
});
