import { Request, Response, NextFunction } from 'express';
import loyaltyService from '../services/loyalty.service';
import { asyncHandler } from '../utils/asyncHandler';
import { ApiError } from '../utils/ApiError';
import * as validation from '../validations/loyalty.validation';

class LoyaltyController {
  // ============================================
  // USER ENDPOINTS
  // ============================================

  /**
   * GET /api/loyalty/balance
   * Get current user's loyalty points balance
   */
  getBalance = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const balance = await loyaltyService.getUserBalance(userId);
    const tier = await loyaltyService.getUserTier(userId);

    res.json({
      success: true,
      data: {
        balance,
        tier,
      },
    });
  });

  /**
   * GET /api/loyalty/transactions
   * Get user's point transaction history
   */
  getTransactions = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;

    const result = await loyaltyService.getTransactionHistory(userId, limit, offset);

    res.json({
      success: true,
      data: result,
    });
  });

  /**
   * GET /api/loyalty/rewards
   * Get available rewards
   */
  getRewards = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.id;
    const rewards = await loyaltyService.getAvailableRewards(userId);

    res.json({
      success: true,
      data: rewards,
    });
  });

  /**
   * POST /api/loyalty/rewards/:rewardId/redeem
   * Redeem a reward
   */
  redeemReward = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const { rewardId } = req.params;

    const userReward = await loyaltyService.redeemReward(userId, rewardId);

    res.json({
      success: true,
      message: 'Reward redeemed successfully',
      data: userReward,
    });
  });

  /**
   * GET /api/loyalty/my-rewards
   * Get user's redeemed rewards
   */
  getMyRewards = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const includeUsed = req.query.includeUsed === 'true';

    const rewards = await loyaltyService.getUserRewards(userId, includeUsed);

    res.json({
      success: true,
      data: rewards,
    });
  });

  /**
   * POST /api/loyalty/use-reward
   * Use a redeemed reward
   */
  useReward = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const { code } = validation.useRewardSchema.parse(req.body);

    const reward = await loyaltyService.useReward(userId, code);

    res.json({
      success: true,
      message: 'Reward used successfully',
      data: reward,
    });
  });

  /**
   * GET /api/loyalty/tiers
   * Get all loyalty tiers
   */
  getTiers = asyncHandler(async (req: Request, res: Response) => {
    const tiers = await loyaltyService.getAllTiers();

    res.json({
      success: true,
      data: tiers,
    });
  });

  // ============================================
  // ADMIN ENDPOINTS
  // ============================================

  /**
   * POST /api/loyalty/admin/tiers
   * Create loyalty tier (Admin)
   */
  createTier = asyncHandler(async (req: Request, res: Response) => {
    const data = validation.createTierSchema.parse(req.body);
    const tier = await loyaltyService.createTier(data);

    res.status(201).json({
      success: true,
      message: 'Loyalty tier created successfully',
      data: tier,
    });
  });

  /**
   * PATCH /api/loyalty/admin/tiers/:tierId
   * Update loyalty tier (Admin)
   */
  updateTier = asyncHandler(async (req: Request, res: Response) => {
    const { tierId } = req.params;
    const data = validation.updateTierSchema.parse(req.body);

    const tier = await loyaltyService.updateTier(tierId, data);

    res.json({
      success: true,
      message: 'Loyalty tier updated successfully',
      data: tier,
    });
  });

  /**
   * POST /api/loyalty/admin/rewards
   * Create reward (Admin)
   */
  createReward = asyncHandler(async (req: Request, res: Response) => {
    const data = validation.createRewardSchema.parse(req.body);
    const reward = await loyaltyService.createReward(data);

    res.status(201).json({
      success: true,
      message: 'Reward created successfully',
      data: reward,
    });
  });

  /**
   * PATCH /api/loyalty/admin/rewards/:rewardId
   * Update reward (Admin)
   */
  updateReward = asyncHandler(async (req: Request, res: Response) => {
    const { rewardId } = req.params;
    const data = validation.updateRewardSchema.parse(req.body);

    const reward = await loyaltyService.updateReward(rewardId, data);

    res.json({
      success: true,
      message: 'Reward updated successfully',
      data: reward,
    });
  });

  /**
   * DELETE /api/loyalty/admin/rewards/:rewardId
   * Delete reward (Admin)
   */
  deleteReward = asyncHandler(async (req: Request, res: Response) => {
    const { rewardId } = req.params;
    await loyaltyService.deleteReward(rewardId);

    res.json({
      success: true,
      message: 'Reward deleted successfully',
    });
  });

  /**
   * POST /api/loyalty/admin/award-points
   * Manually award points to user (Admin)
   */
  awardPoints = asyncHandler(async (req: Request, res: Response) => {
    const data = validation.awardPointsSchema.parse(req.body);

    const transaction = await loyaltyService.awardPoints(
      data.userId,
      data.points,
      data.type,
      data.description,
      data.reference
    );

    res.json({
      success: true,
      message: 'Points awarded successfully',
      data: transaction,
    });
  });
}

export default new LoyaltyController();
