import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import escrowService from '../services/escrow.service';
import {
  raiseDisputeSchema,
  resolveDisputeSchema,
} from '../validations/escrow.validation';

class EscrowController {
  // ============================================
  // ESCROW MANAGEMENT
  // ============================================

  /**
   * Get escrow details for order
   * GET /api/escrow/order/:orderId
   */
  getOrderEscrow = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const { orderId } = req.params;

    const escrow = await escrowService.getEscrowByOrder(orderId, userId);

    res.json({
      success: true,
      data: escrow,
    });
  });

  /**
   * Get all user's escrow transactions (buyer)
   * GET /api/escrow/buyer
   */
  getBuyerEscrows = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const { status } = req.query;

    const escrows = await escrowService.getBuyerEscrows(
      userId,
      status as string | undefined
    );

    res.json({
      success: true,
      data: escrows,
    });
  });

  /**
   * Get all vendor's escrow transactions
   * GET /api/escrow/vendor
   */
  getVendorEscrows = asyncHandler(async (req: Request, res: Response) => {
    const vendorId = req.user!.vendorId;
    const { status } = req.query;

    if (!vendorId) {
      return res.status(403).json({
        success: false,
        message: 'Vendor account required',
      });
    }

    const escrows = await escrowService.getVendorEscrows(
      vendorId,
      status as string | undefined
    );

    res.json({
      success: true,
      data: escrows,
    });
  });

  /**
   * Release escrow (buyer confirms delivery)
   * POST /api/escrow/:escrowId/release
   */
  releaseEscrow = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const { escrowId } = req.params;

    const escrow = await escrowService.releaseEscrow(escrowId, userId);

    res.json({
      success: true,
      data: escrow,
      message: 'Payment released to vendor',
    });
  });

  /**
   * Request refund (buyer requests money back)
   * POST /api/escrow/:escrowId/refund
   */
  requestRefund = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const { escrowId } = req.params;
    const { reason } = req.body;

    const escrow = await escrowService.refundEscrow(escrowId, userId, reason);

    res.json({
      success: true,
      data: escrow,
      message: 'Refund processed',
    });
  });

  // ============================================
  // DISPUTE MANAGEMENT
  // ============================================

  /**
   * Raise dispute
   * POST /api/escrow/disputes
   */
  raiseDispute = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const { orderId, reason, description, evidence } =
      raiseDisputeSchema.parse(req.body);

    const dispute = await escrowService.createDispute(
      userId,
      orderId,
      reason,
      description,
      evidence
    );

    res.status(201).json({
      success: true,
      data: dispute,
    });
  });

  /**
   * Get user's disputes
   * GET /api/escrow/disputes
   */
  getMyDisputes = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const { status } = req.query;

    const disputes = await escrowService.getUserDisputes(
      userId,
      status as string | undefined
    );

    res.json({
      success: true,
      data: disputes,
    });
  });

  /**
   * Get vendor's disputes
   * GET /api/escrow/disputes/vendor
   */
  getVendorDisputes = asyncHandler(async (req: Request, res: Response) => {
    const vendorId = req.user!.vendorId;
    const { status } = req.query;

    if (!vendorId) {
      return res.status(403).json({
        success: false,
        message: 'Vendor account required',
      });
    }

    const disputes = await escrowService.getVendorDisputes(
      vendorId,
      status as string | undefined
    );

    res.json({
      success: true,
      data: disputes,
    });
  });

  /**
   * Get dispute details
   * GET /api/escrow/disputes/:disputeId
   */
  getDispute = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const { disputeId } = req.params;

    const dispute = await escrowService.getDispute(disputeId, userId);

    res.json({
      success: true,
      data: dispute,
    });
  });

  /**
   * Add evidence to dispute
   * POST /api/escrow/disputes/:disputeId/evidence
   */
  addEvidence = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const { disputeId } = req.params;
    const { evidence } = req.body;

    const dispute = await escrowService.addDisputeEvidence(
      disputeId,
      userId,
      evidence
    );

    res.json({
      success: true,
      data: dispute,
    });
  });

  /**
   * Respond to dispute (vendor)
   * POST /api/escrow/disputes/:disputeId/respond
   */
  respondToDispute = asyncHandler(async (req: Request, res: Response) => {
    const vendorId = req.user!.vendorId;
    const { disputeId } = req.params;
    const { response, evidence } = req.body;

    if (!vendorId) {
      return res.status(403).json({
        success: false,
        message: 'Vendor account required',
      });
    }

    const dispute = await escrowService.respondToDispute(
      disputeId,
      vendorId,
      response,
      evidence
    );

    res.json({
      success: true,
      data: dispute,
    });
  });

  // ============================================
  // ADMIN ENDPOINTS
  // ============================================

  /**
   * Get all disputes (admin)
   * GET /api/escrow/admin/disputes
   */
  getAllDisputes = asyncHandler(async (req: Request, res: Response) => {
    const { page = 1, limit = 20, status } = req.query;

    const disputes = await escrowService.getAllDisputes({
      page: Number(page),
      limit: Number(limit),
      status: status as string | undefined,
    });

    res.json({
      success: true,
      data: disputes,
    });
  });

  /**
   * Resolve dispute (admin)
   * POST /api/escrow/admin/disputes/:disputeId/resolve
   */
  resolveDispute = asyncHandler(async (req: Request, res: Response) => {
    const adminId = req.user!.id;
    const { disputeId } = req.params;
    const { resolution, refundAmount, notes } =
      resolveDisputeSchema.parse(req.body);

    const dispute = await escrowService.resolveDispute(
      disputeId,
      adminId,
      resolution,
      refundAmount,
      notes
    );

    res.json({
      success: true,
      data: dispute,
    });
  });

  /**
   * Get escrow analytics (admin)
   * GET /api/escrow/admin/analytics
   */
  getAnalytics = asyncHandler(async (req: Request, res: Response) => {
    const { startDate, endDate } = req.query;

    const analytics = await escrowService.getEscrowAnalytics(
      startDate ? new Date(startDate as string) : undefined,
      endDate ? new Date(endDate as string) : undefined
    );

    res.json({
      success: true,
      data: analytics,
    });
  });

  /**
   * Get pending releases (admin monitoring)
   * GET /api/escrow/admin/pending-releases
   */
  getPendingReleases = asyncHandler(async (req: Request, res: Response) => {
    const { page = 1, limit = 20 } = req.query;

    const escrows = await escrowService.getPendingReleases({
      page: Number(page),
      limit: Number(limit),
    });

    res.json({
      success: true,
      data: escrows,
    });
  });

  /**
   * Manually release escrow (admin override)
   * POST /api/escrow/admin/:escrowId/release
   */
  adminReleaseEscrow = asyncHandler(async (req: Request, res: Response) => {
    const adminId = req.user!.id;
    const { escrowId } = req.params;
    const { notes } = req.body;

    const escrow = await escrowService.adminReleaseEscrow(
      escrowId,
      adminId,
      notes
    );

    res.json({
      success: true,
      data: escrow,
      message: 'Escrow released by admin',
    });
  });

  /**
   * Manually refund escrow (admin override)
   * POST /api/escrow/admin/:escrowId/refund
   */
  adminRefundEscrow = asyncHandler(async (req: Request, res: Response) => {
    const adminId = req.user!.id;
    const { escrowId } = req.params;
    const { notes } = req.body;

    const escrow = await escrowService.adminRefundEscrow(
      escrowId,
      adminId,
      notes
    );

    res.json({
      success: true,
      data: escrow,
      message: 'Escrow refunded by admin',
    });
  });
}

export default new EscrowController();
