import { prisma } from '../lib/prisma';
import { VerificationStatus, DocumentType } from '@prisma/client';
import { ApiError } from '../utils/ApiError';

class VerificationService {
  /**
   * Submit vendor verification
   */
  async submitVerification(vendorId: string, data: {
    ownerFullName: string;
    ownerIdNumber: string;
    ownerPhone: string;
    ownerEmail: string;
    businessAddress?: string;
    businessCity?: string;
    businessCountry?: string;
  }) {
    const vendor = await prisma.vendor.findUnique({
      where: { id: vendorId },
    });

    if (!vendor) {
      throw new ApiError(404, 'Vendor not found');
    }

    // Check if already submitted
    const existing = await prisma.vendorVerification.findUnique({
      where: { vendorId },
    });

    if (existing && existing.status === VerificationStatus.VERIFIED) {
      throw new ApiError(400, 'Vendor is already verified');
    }

    const verification = await prisma.vendorVerification.upsert({
      where: { vendorId },
      create: {
        vendorId,
        ...data,
        businessCountry: data.businessCountry || 'KE',
        status: VerificationStatus.PENDING,
      },
      update: {
        ...data,
        status: VerificationStatus.PENDING,
      },
    });

    return verification;
  }

  /**
   * Upload verification document
   */
  async uploadDocument(
    verificationId: string,
    type: DocumentType,
    fileUrl: string,
    fileName: string
  ) {
    const document = await prisma.vendorDocument.create({
      data: {
        verificationId,
        type,
        fileUrl,
        fileName,
      },
    });

    return document;
  }

  /**
   * Verify document (Admin)
   */
  async verifyDocument(documentId: string, adminUserId: string, notes?: string) {
    const document = await prisma.vendorDocument.update({
      where: { id: documentId },
      data: {
        isVerified: true,
        verifiedAt: new Date(),
        notes,
      },
    });

    return document;
  }

  /**
   * Approve verification (Admin)
   */
  async approveVerification(verificationId: string, adminUserId: string) {
    const verification = await prisma.vendorVerification.findUnique({
      where: { id: verificationId },
      include: { documents: true, vendor: true },
    });

    if (!verification) {
      throw new ApiError(404, 'Verification not found');
    }

    // Check if all documents are verified
    const allDocsVerified = verification.documents.every(doc => doc.isVerified);
    if (!allDocsVerified) {
      throw new ApiError(400, 'All documents must be verified before approval');
    }

    const expiresAt = new Date();
    expiresAt.setFullYear(expiresAt.getFullYear() + 1); // Expires in 1 year

    const updated = await prisma.vendorVerification.update({
      where: { id: verificationId },
      data: {
        status: VerificationStatus.VERIFIED,
        reviewedBy: adminUserId,
        reviewedAt: new Date(),
        verifiedAt: new Date(),
        expiresAt,
      },
    });

    // Update vendor status
    await prisma.vendor.update({
      where: { id: verification.vendorId },
      data: { isVerified: true },
    });

    return updated;
  }

  /**
   * Reject verification (Admin)
   */
  async rejectVerification(
    verificationId: string,
    adminUserId: string,
    reason: string
  ) {
    const updated = await prisma.vendorVerification.update({
      where: { id: verificationId },
      data: {
        status: VerificationStatus.REJECTED,
        reviewedBy: adminUserId,
        reviewedAt: new Date(),
        rejectionReason: reason,
      },
    });

    return updated;
  }

  /**
   * Get pending verifications (Admin)
   */
  async getPendingVerifications(limit = 50, offset = 0) {
    const verifications = await prisma.vendorVerification.findMany({
      where: { status: VerificationStatus.PENDING },
      include: {
        vendor: {
          include: {
            user: {
              select: {
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
        },
        documents: true,
      },
      orderBy: { createdAt: 'asc' },
      take: limit,
      skip: offset,
    });

    const total = await prisma.vendorVerification.count({
      where: { status: VerificationStatus.PENDING },
    });

    return { verifications, total };
  }

  /**
   * Get verification by vendor ID
   */
  async getByVendorId(vendorId: string) {
    const verification = await prisma.vendorVerification.findUnique({
      where: { vendorId },
      include: { documents: true },
    });

    return verification;
  }

  /**
   * Check and notify expiring verifications
   */
  async checkExpiringVerifications() {
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

    const expiring = await prisma.vendorVerification.findMany({
      where: {
        status: VerificationStatus.VERIFIED,
        expiresAt: { lte: thirtyDaysFromNow, gte: new Date() },
      },
      include: {
        vendor: {
          include: {
            user: true,
          },
        },
      },
    });

    // Notify vendors about expiring verification
    for (const verification of expiring) {
      // TODO: Send email notification
      console.log(`Verification expiring for vendor ${verification.vendorId}`);
    }

    return expiring;
  }
}

export default new VerificationService();
