import { z } from 'zod';

export const chatMessageSchema = z.object({
  message: z.string().min(1).max(1000),
  sessionId: z.string().optional(),
});

export const getConversationHistorySchema = z.object({
  conversationId: z.string().cuid(),
  limit: z.number().int().positive().max(100).default(50),
});
