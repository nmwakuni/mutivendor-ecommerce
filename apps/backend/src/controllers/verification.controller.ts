import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import verificationService from '../services/verification.service';
import {
  submitVerificationSchema,
  uploadDocumentSchema,
} from '../validations/verification.validation';

class VerificationController {
  // ============================================
  // VENDOR VERIFICATION
  // ============================================

  /**
   * Submit verification request
   * POST /api/verification/submit
   */
  submitVerification = asyncHandler(async (req: Request, res: Response) => {
    const vendorId = req.user!.vendorId;
    const data = submitVerificationSchema.parse(req.body);

    if (!vendorId) {
      return res.status(403).json({
        success: false,
        message: 'Vendor account required',
      });
    }

    const verification = await verificationService.submitVerification(
      vendorId,
      data
    );

    res.status(201).json({
      success: true,
      data: verification,
    });
  });

  /**
   * Get vendor's verification status
   * GET /api/verification/status
   */
  getVerificationStatus = asyncHandler(
    async (req: Request, res: Response) => {
      const vendorId = req.user!.vendorId;

      if (!vendorId) {
        return res.status(403).json({
          success: false,
          message: 'Vendor account required',
        });
      }

      const verification = await verificationService.getVendorVerification(
        vendorId
      );

      res.json({
        success: true,
        data: verification,
      });
    }
  );

  /**
   * Upload verification document
   * POST /api/verification/documents
   */
  uploadDocument = asyncHandler(async (req: Request, res: Response) => {
    const vendorId = req.user!.vendorId;
    const { verificationId, documentType, documentUrl } =
      uploadDocumentSchema.parse(req.body);

    if (!vendorId) {
      return res.status(403).json({
        success: false,
        message: 'Vendor account required',
      });
    }

    const document = await verificationService.uploadDocument(
      vendorId,
      verificationId,
      documentType,
      documentUrl
    );

    res.status(201).json({
      success: true,
      data: document,
    });
  });

  /**
   * Get verification documents
   * GET /api/verification/:verificationId/documents
   */
  getDocuments = asyncHandler(async (req: Request, res: Response) => {
    const vendorId = req.user!.vendorId;
    const { verificationId } = req.params;

    if (!vendorId) {
      return res.status(403).json({
        success: false,
        message: 'Vendor account required',
      });
    }

    const documents = await verificationService.getVerificationDocuments(
      verificationId,
      vendorId
    );

    res.json({
      success: true,
      data: documents,
    });
  });

  /**
   * Delete verification document
   * DELETE /api/verification/documents/:documentId
   */
  deleteDocument = asyncHandler(async (req: Request, res: Response) => {
    const vendorId = req.user!.vendorId;
    const { documentId } = req.params;

    if (!vendorId) {
      return res.status(403).json({
        success: false,
        message: 'Vendor account required',
      });
    }

    await verificationService.deleteDocument(documentId, vendorId);

    res.json({
      success: true,
      message: 'Document deleted',
    });
  });

  /**
   * Get verification requirements
   * GET /api/verification/requirements
   */
  getRequirements = asyncHandler(async (req: Request, res: Response) => {
    const requirements = await verificationService.getVerificationRequirements();

    res.json({
      success: true,
      data: requirements,
    });
  });

  // ============================================
  // ADMIN ENDPOINTS
  // ============================================

  /**
   * Get all pending verifications
   * GET /api/verification/admin/pending
   */
  getPendingVerifications = asyncHandler(
    async (req: Request, res: Response) => {
      const { page = 1, limit = 20 } = req.query;

      const verifications = await verificationService.getPendingVerifications({
        page: Number(page),
        limit: Number(limit),
      });

      res.json({
        success: true,
        data: verifications,
      });
    }
  );

  /**
   * Get all verifications (with filters)
   * GET /api/verification/admin/all
   */
  getAllVerifications = asyncHandler(async (req: Request, res: Response) => {
    const { page = 1, limit = 20, status, type } = req.query;

    const verifications = await verificationService.getAllVerifications({
      page: Number(page),
      limit: Number(limit),
      status: status as string | undefined,
      type: type as string | undefined,
    });

    res.json({
      success: true,
      data: verifications,
    });
  });

  /**
   * Get verification details (admin)
   * GET /api/verification/admin/:verificationId
   */
  getVerificationDetails = asyncHandler(
    async (req: Request, res: Response) => {
      const { verificationId } = req.params;

      const verification = await verificationService.getVerificationById(
        verificationId
      );

      res.json({
        success: true,
        data: verification,
      });
    }
  );

  /**
   * Approve verification
   * POST /api/verification/admin/:verificationId/approve
   */
  approveVerification = asyncHandler(async (req: Request, res: Response) => {
    const adminId = req.user!.id;
    const { verificationId } = req.params;
    const { notes, badgeLevel } = req.body;

    const verification = await verificationService.approveVerification(
      verificationId,
      adminId,
      notes,
      badgeLevel
    );

    res.json({
      success: true,
      data: verification,
      message: 'Verification approved',
    });
  });

  /**
   * Reject verification
   * POST /api/verification/admin/:verificationId/reject
   */
  rejectVerification = asyncHandler(async (req: Request, res: Response) => {
    const adminId = req.user!.id;
    const { verificationId } = req.params;
    const { reason, notes } = req.body;

    const verification = await verificationService.rejectVerification(
      verificationId,
      adminId,
      reason,
      notes
    );

    res.json({
      success: true,
      data: verification,
      message: 'Verification rejected',
    });
  });

  /**
   * Request more documents
   * POST /api/verification/admin/:verificationId/request-documents
   */
  requestMoreDocuments = asyncHandler(async (req: Request, res: Response) => {
    const adminId = req.user!.id;
    const { verificationId } = req.params;
    const { documentsNeeded, notes } = req.body;

    const verification = await verificationService.requestMoreDocuments(
      verificationId,
      adminId,
      documentsNeeded,
      notes
    );

    res.json({
      success: true,
      data: verification,
      message: 'Additional documents requested',
    });
  });

  /**
   * Get verification analytics
   * GET /api/verification/admin/analytics
   */
  getAnalytics = asyncHandler(async (req: Request, res: Response) => {
    const { startDate, endDate } = req.query;

    const analytics = await verificationService.getVerificationAnalytics(
      startDate ? new Date(startDate as string) : undefined,
      endDate ? new Date(endDate as string) : undefined
    );

    res.json({
      success: true,
      data: analytics,
    });
  });

  /**
   * Revoke verification
   * POST /api/verification/admin/:verificationId/revoke
   */
  revokeVerification = asyncHandler(async (req: Request, res: Response) => {
    const adminId = req.user!.id;
    const { verificationId } = req.params;
    const { reason, notes } = req.body;

    const verification = await verificationService.revokeVerification(
      verificationId,
      adminId,
      reason,
      notes
    );

    res.json({
      success: true,
      data: verification,
      message: 'Verification revoked',
    });
  });

  /**
   * Get expiring verifications
   * GET /api/verification/admin/expiring
   */
  getExpiringVerifications = asyncHandler(
    async (req: Request, res: Response) => {
      const { days = 30 } = req.query;

      const verifications = await verificationService.getExpiringVerifications(
        Number(days)
      );

      res.json({
        success: true,
        data: verifications,
      });
    }
  );
}

export default new VerificationController();
