import { z } from 'zod';

export const raiseDisputeSchema = z.object({
  orderId: z.string().cuid(),
  reason: z.string().min(1).max(100),
  description: z.string().min(10).max(2000),
  evidence: z.array(z.string().url()).default([]),
});

export const resolveDisputeSchema = z.object({
  resolution: z.enum(['customer', 'vendor']),
  resolutionNotes: z.string().min(10).max(2000),
});

export const createEscrowSchema = z.object({
  paymentId: z.string().cuid(),
  amount: z.number().positive(),
  daysUntilRelease: z.number().int().positive().default(7),
});
