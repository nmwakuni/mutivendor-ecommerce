import { Request, Response } from 'express';
import affiliateService from '../services/affiliate.service';
import { asyncHandler } from '../utils/asyncHandler';
import * as validation from '../validations/affiliate.validation';

class AffiliateController {
  /**
   * POST /api/affiliates/apply
   * Apply to become an affiliate
   */
  apply = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const data = validation.applyAffiliateSchema.parse(req.body);

    const affiliate = await affiliateService.apply(userId, data);

    res.status(201).json({
      success: true,
      message: 'Affiliate application submitted successfully',
      data: affiliate,
    });
  });

  /**
   * GET /api/affiliates/me
   * Get current user's affiliate account
   */
  getMyAffiliate = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const affiliate = await affiliateService.getByUserId(userId);

    res.json({
      success: true,
      data: affiliate,
    });
  });

  /**
   * GET /api/affiliates/dashboard
   * Get affiliate dashboard stats
   */
  getDashboard = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const affiliate = await affiliateService.getByUserId(userId);

    if (!affiliate) {
      return res.status(404).json({
        success: false,
        message: 'Affiliate account not found',
      });
    }

    const days = parseInt(req.query.days as string) || 30;
    const stats = await affiliateService.getDashboardStats(affiliate.id, days);

    res.json({
      success: true,
      data: stats,
    });
  });

  /**
   * GET /api/affiliates/commissions
   * Get affiliate commissions
   */
  getCommissions = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const affiliate = await affiliateService.getByUserId(userId);

    if (!affiliate) {
      return res.status(404).json({
        success: false,
        message: 'Affiliate account not found',
      });
    }

    const status = req.query.status as any;
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;

    const result = await affiliateService.getCommissions(
      affiliate.id,
      status,
      limit,
      offset
    );

    res.json({
      success: true,
      data: result,
    });
  });

  /**
   * PATCH /api/affiliates/profile
   * Update affiliate profile
   */
  updateProfile = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const affiliate = await affiliateService.getByUserId(userId);

    if (!affiliate) {
      return res.status(404).json({
        success: false,
        message: 'Affiliate account not found',
      });
    }

    const data = validation.updateAffiliateProfileSchema.parse(req.body);
    const updated = await affiliateService.updateProfile(affiliate.id, data);

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: updated,
    });
  });

  /**
   * POST /api/affiliates/track-click
   * Track affiliate click (Public)
   */
  trackClick = asyncHandler(async (req: Request, res: Response) => {
    const data = validation.trackClickSchema.parse(req.body);
    const result = await affiliateService.trackClick(data.affiliateCode, {
      ipAddress: data.ipAddress || req.ip,
      userAgent: data.userAgent || req.get('user-agent'),
      referrer: data.referrer,
      landingPage: data.landingPage,
    });

    if (!result) {
      return res.status(404).json({
        success: false,
        message: 'Invalid affiliate code',
      });
    }

    res.json({
      success: true,
      message: 'Click tracked successfully',
    });
  });

  // ============================================
  // ADMIN ENDPOINTS
  // ============================================

  /**
   * GET /api/affiliates/admin/pending
   * Get pending affiliate applications
   */
  getPending = asyncHandler(async (req: Request, res: Response) => {
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;

    const result = await affiliateService.getPendingAffiliates(limit, offset);

    res.json({
      success: true,
      data: result,
    });
  });

  /**
   * GET /api/affiliates/admin/all
   * Get all affiliates
   */
  getAll = asyncHandler(async (req: Request, res: Response) => {
    const status = req.query.status as any;
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;

    const result = await affiliateService.getAllAffiliates(status, limit, offset);

    res.json({
      success: true,
      data: result,
    });
  });

  /**
   * POST /api/affiliates/admin/:affiliateId/approve
   * Approve affiliate application
   */
  approve = asyncHandler(async (req: Request, res: Response) => {
    const { affiliateId } = req.params;
    const { commissionRate } = validation.approveAffiliateSchema.parse(req.body);

    const affiliate = await affiliateService.approveAffiliate(
      affiliateId,
      commissionRate
    );

    res.json({
      success: true,
      message: 'Affiliate approved successfully',
      data: affiliate,
    });
  });

  /**
   * POST /api/affiliates/admin/:affiliateId/reject
   * Reject affiliate application
   */
  reject = asyncHandler(async (req: Request, res: Response) => {
    const { affiliateId } = req.params;
    const { reason } = validation.rejectAffiliateSchema.parse(req.body);

    const affiliate = await affiliateService.rejectAffiliate(affiliateId, reason);

    res.json({
      success: true,
      message: 'Affiliate rejected',
      data: affiliate,
    });
  });

  /**
   * POST /api/affiliates/admin/:affiliateId/suspend
   * Suspend affiliate
   */
  suspend = asyncHandler(async (req: Request, res: Response) => {
    const { affiliateId } = req.params;
    const { reason } = req.body;

    const affiliate = await affiliateService.suspendAffiliate(affiliateId, reason);

    res.json({
      success: true,
      message: 'Affiliate suspended',
      data: affiliate,
    });
  });

  /**
   * PATCH /api/affiliates/admin/:affiliateId/commission-rate
   * Update commission rate
   */
  updateCommissionRate = asyncHandler(async (req: Request, res: Response) => {
    const { affiliateId } = req.params;
    const { rate } = validation.updateCommissionRateSchema.parse(req.body);

    const affiliate = await affiliateService.updateCommissionRate(affiliateId, rate);

    res.json({
      success: true,
      message: 'Commission rate updated',
      data: affiliate,
    });
  });

  /**
   * POST /api/affiliates/admin/commissions/approve
   * Batch approve commissions
   */
  approveCommissions = asyncHandler(async (req: Request, res: Response) => {
    const { commissionIds } = validation.approveCommissionSchema.parse(req.body);

    const result = await affiliateService.batchApproveCommissions(commissionIds);

    res.json({
      success: true,
      message: `${result.updated} commissions approved`,
      data: result,
    });
  });

  /**
   * POST /api/affiliates/admin/commissions/pay
   * Batch pay commissions
   */
  payCommissions = asyncHandler(async (req: Request, res: Response) => {
    const { commissionIds, notes } = validation.payCommissionSchema.parse(req.body);

    const result = await affiliateService.batchPayCommissions(commissionIds, notes);

    res.json({
      success: true,
      message: `${result.updated} commissions marked as paid`,
      data: result,
    });
  });

  /**
   * GET /api/affiliates/admin/top
   * Get top performing affiliates
   */
  getTopAffiliates = asyncHandler(async (req: Request, res: Response) => {
    const limit = parseInt(req.query.limit as string) || 10;
    const period = parseInt(req.query.period as string) || 30;

    const affiliates = await affiliateService.getTopAffiliates(limit, period);

    res.json({
      success: true,
      data: affiliates,
    });
  });
}

export default new AffiliateController();
