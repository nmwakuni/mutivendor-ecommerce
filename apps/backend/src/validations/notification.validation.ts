import { z } from 'zod';
import { NotificationChannel } from '@prisma/client';

export const updateNotificationPreferencesSchema = z.object({
  orderUpdates: z.array(z.nativeEnum(NotificationChannel)).optional(),
  paymentUpdates: z.array(z.nativeEnum(NotificationChannel)).optional(),
  deliveryUpdates: z.array(z.nativeEnum(NotificationChannel)).optional(),
  priceDrops: z.array(z.nativeEnum(NotificationChannel)).optional(),
  backInStock: z.array(z.nativeEnum(NotificationChannel)).optional(),
  promotions: z.array(z.nativeEnum(NotificationChannel)).optional(),
  messages: z.array(z.nativeEnum(NotificationChannel)).optional(),
});

export const createPriceAlertSchema = z.object({
  productId: z.string().cuid(),
  targetPrice: z.number().positive(),
});

export const createStockAlertSchema = z.object({
  productId: z.string().cuid(),
});
