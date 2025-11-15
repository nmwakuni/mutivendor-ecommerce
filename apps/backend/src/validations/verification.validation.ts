import { z } from 'zod';
import { DocumentType } from '@prisma/client';

export const submitVerificationSchema = z.object({
  ownerFullName: z.string().min(1),
  ownerIdNumber: z.string().min(1),
  ownerPhone: z.string().min(1),
  ownerEmail: z.string().email(),
  businessAddress: z.string().optional(),
  businessCity: z.string().optional(),
  businessCountry: z.string().length(2).default('KE'),
});

export const uploadDocumentSchema = z.object({
  type: z.nativeEnum(DocumentType),
  fileUrl: z.string().url(),
  fileName: z.string().min(1),
});

export const verifyDocumentSchema = z.object({
  notes: z.string().optional(),
});

export const rejectVerificationSchema = z.object({
  reason: z.string().min(10),
});
