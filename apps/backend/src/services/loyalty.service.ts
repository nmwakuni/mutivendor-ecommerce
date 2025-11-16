import { prisma } from '../lib/prisma';
import { ApiError } from '../utils/ApiError';
import { LoyaltyTierLevel, PointTransactionType, RewardType } from '@prisma/client';

class LoyaltyService {
  /**
   * Get user's current loyalty points balance
   */
  async getUserBalance(userId: string) {
    const latestTransaction = await prisma.loyaltyPoint.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: { balance: true },
    });

    return latestTransaction?.balance || 0;
  }

  /**
   * Get user's loyalty tier based on points
   */
  async getUserTier(userId: string) {
    const balance = await this.getUserBalance(userId);

    const tier = await prisma.loyaltyTier.findFirst({
      where: {
        minPoints: { lte: balance },
        OR: [{ maxPoints: { gte: balance } }, { maxPoints: null }],
      },
      orderBy: { minPoints: 'desc' },
    });

    return tier || null;
  }

  /**
   * Award points to user
   */
  async awardPoints(
    userId: string,
    points: number,
    type: PointTransactionType,
    description: string,
    reference?: string,
    expiresAt?: Date
  ) {
    const currentBalance = await this.getUserBalance(userId);
    const newBalance = currentBalance + points;

    const transaction = await prisma.loyaltyPoint.create({
      data: {
        userId,
        type,
        points,
        balance: newBalance,
        description,
        reference,
        expiresAt,
      },
    });

    return transaction;
  }

  /**
   * Deduct points from user (for redemptions)
   */
  async deductPoints(
    userId: string,
    points: number,
    description: string,
    reference?: string
  ) {
    const currentBalance = await this.getUserBalance(userId);

    if (currentBalance < points) {
      throw new ApiError(400, 'Insufficient loyalty points');
    }

    const newBalance = currentBalance - points;

    const transaction = await prisma.loyaltyPoint.create({
      data: {
        userId,
        type: PointTransactionType.REDEEMED,
        points: -points,
        balance: newBalance,
        description,
        reference,
      },
    });

    return transaction;
  }

  /**
   * Get user's point transaction history
   */
  async getTransactionHistory(userId: string, limit = 50, offset = 0) {
    const transactions = await prisma.loyaltyPoint.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    });

    const total = await prisma.loyaltyPoint.count({ where: { userId } });

    return { transactions, total };
  }

  /**
   * Award points for purchase
   */
  async awardPurchasePoints(userId: string, orderAmount: number, orderId: string) {
    // Award 1 point per 100 KES spent
    const points = Math.floor(orderAmount / 100);

    if (points > 0) {
      await this.awardPoints(
        userId,
        points,
        PointTransactionType.EARNED_PURCHASE,
        `Purchase order #${orderId.substring(0, 8)}`,
        orderId,
        new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) // Expires in 1 year
      );
    }

    return points;
  }

  /**
   * Award points for review
   */
  async awardReviewPoints(userId: string, reviewId: string) {
    const points = 50; // Fixed points for reviews

    await this.awardPoints(
      userId,
      points,
      PointTransactionType.EARNED_REVIEW,
      'Product review',
      reviewId,
      new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
    );

    return points;
  }

  /**
   * Award points for referral
   */
  async awardReferralPoints(userId: string, referredUserId: string) {
    const points = 500; // Fixed points for successful referrals

    await this.awardPoints(
      userId,
      points,
      PointTransactionType.EARNED_REFERRAL,
      `Referred user ${referredUserId.substring(0, 8)}`,
      referredUserId,
      new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
    );

    return points;
  }

  /**
   * Award signup bonus
   */
  async awardSignupBonus(userId: string) {
    const points = 100; // Welcome bonus

    await this.awardPoints(
      userId,
      points,
      PointTransactionType.EARNED_SIGNUP,
      'Welcome bonus',
      undefined,
      new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
    );

    return points;
  }

  // ============================================
  // REWARDS MANAGEMENT
  // ============================================

  /**
   * Get all available rewards
   */
  async getAvailableRewards(userId?: string) {
    const rewards = await prisma.reward.findMany({
      where: { isActive: true },
      orderBy: { pointsCost: 'asc' },
    });

    let userBalance = 0;
    if (userId) {
      userBalance = await this.getUserBalance(userId);
    }

    return rewards.map((reward) => ({
      ...reward,
      canAfford: userBalance >= reward.pointsCost,
    }));
  }

  /**
   * Redeem a reward
   */
  async redeemReward(userId: string, rewardId: string) {
    const reward = await prisma.reward.findUnique({
      where: { id: rewardId },
    });

    if (!reward || !reward.isActive) {
      throw new ApiError(404, 'Reward not found or inactive');
    }

    // Check if reward is in stock
    if (reward.stock !== null && reward.stock <= 0) {
      throw new ApiError(400, 'Reward out of stock');
    }

    // Check user has enough points
    const userBalance = await this.getUserBalance(userId);
    if (userBalance < reward.pointsCost) {
      throw new ApiError(400, 'Insufficient points to redeem this reward');
    }

    // Generate unique code for the reward
    const code = this.generateRewardCode();

    // Calculate expiry date
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + reward.validityDays);

    // Create user reward and deduct points in a transaction
    const userReward = await prisma.$transaction(async (tx) => {
      // Deduct points
      const currentBalance = userBalance;
      const newBalance = currentBalance - reward.pointsCost;

      await tx.loyaltyPoint.create({
        data: {
          userId,
          type: PointTransactionType.REDEEMED,
          points: -reward.pointsCost,
          balance: newBalance,
          description: `Redeemed: ${reward.name}`,
          reference: rewardId,
        },
      });

      // Update reward stock if applicable
      if (reward.stock !== null) {
        await tx.reward.update({
          where: { id: rewardId },
          data: { stock: { decrement: 1 } },
        });
      }

      // Create user reward
      const createdReward = await tx.userReward.create({
        data: {
          userId,
          rewardId,
          pointsSpent: reward.pointsCost,
          code,
          expiresAt,
        },
        include: {
          reward: true,
        },
      });

      return createdReward;
    });

    return userReward;
  }

  /**
   * Get user's redeemed rewards
   */
  async getUserRewards(userId: string, includeUsed = false) {
    const where: any = { userId };
    if (!includeUsed) {
      where.isUsed = false;
      where.expiresAt = { gte: new Date() };
    }

    const rewards = await prisma.userReward.findMany({
      where,
      include: {
        reward: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return rewards;
  }

  /**
   * Mark reward as used
   */
  async useReward(userId: string, code: string) {
    const userReward = await prisma.userReward.findUnique({
      where: { code },
      include: { reward: true },
    });

    if (!userReward) {
      throw new ApiError(404, 'Reward not found');
    }

    if (userReward.userId !== userId) {
      throw new ApiError(403, 'This reward does not belong to you');
    }

    if (userReward.isUsed) {
      throw new ApiError(400, 'Reward already used');
    }

    if (new Date() > userReward.expiresAt) {
      throw new ApiError(400, 'Reward has expired');
    }

    const updated = await prisma.userReward.update({
      where: { code },
      data: {
        isUsed: true,
        usedAt: new Date(),
      },
      include: {
        reward: true,
      },
    });

    return updated;
  }

  // ============================================
  // LOYALTY TIERS MANAGEMENT (Admin)
  // ============================================

  /**
   * Create loyalty tier
   */
  async createTier(data: {
    name: string;
    level: LoyaltyTierLevel;
    minPoints: number;
    maxPoints?: number;
    benefits: any[];
    discountPercent: number;
    icon?: string;
    color?: string;
  }) {
    const tier = await prisma.loyaltyTier.create({
      data: {
        ...data,
        benefits: data.benefits,
      },
    });

    return tier;
  }

  /**
   * Get all tiers
   */
  async getAllTiers() {
    const tiers = await prisma.loyaltyTier.findMany({
      orderBy: { minPoints: 'asc' },
    });

    return tiers;
  }

  /**
   * Update tier
   */
  async updateTier(tierId: string, data: Partial<{
    name: string;
    minPoints: number;
    maxPoints: number;
    benefits: any[];
    discountPercent: number;
    icon: string;
    color: string;
  }>) {
    const tier = await prisma.loyaltyTier.update({
      where: { id: tierId },
      data,
    });

    return tier;
  }

  // ============================================
  // REWARDS MANAGEMENT (Admin/Vendor)
  // ============================================

  /**
   * Create reward
   */
  async createReward(data: {
    name: string;
    description: string;
    type: RewardType;
    pointsCost: number;
    value: number;
    image?: string;
    stock?: number;
    validityDays?: number;
  }) {
    const reward = await prisma.reward.create({
      data: {
        ...data,
        validityDays: data.validityDays || 30,
      },
    });

    return reward;
  }

  /**
   * Update reward
   */
  async updateReward(rewardId: string, data: Partial<{
    name: string;
    description: string;
    pointsCost: number;
    value: number;
    image: string;
    stock: number;
    isActive: boolean;
    validityDays: number;
  }>) {
    const reward = await prisma.reward.update({
      where: { id: rewardId },
      data,
    });

    return reward;
  }

  /**
   * Delete reward
   */
  async deleteReward(rewardId: string) {
    await prisma.reward.delete({
      where: { id: rewardId },
    });
  }

  // ============================================
  // HELPERS
  // ============================================

  private generateRewardCode(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 12; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  /**
   * Expire old points
   */
  async expireOldPoints() {
    const expiredTransactions = await prisma.loyaltyPoint.findMany({
      where: {
        expiresAt: { lt: new Date() },
        points: { gt: 0 }, // Only earned points, not redeemed
      },
      distinct: ['userId'],
    });

    for (const transaction of expiredTransactions) {
      // Recalculate user's balance excluding expired points
      const validTransactions = await prisma.loyaltyPoint.findMany({
        where: {
          userId: transaction.userId,
          OR: [
            { expiresAt: { gte: new Date() } },
            { expiresAt: null },
          ],
        },
        orderBy: { createdAt: 'asc' },
      });

      const newBalance = validTransactions.reduce((sum, t) => sum + t.points, 0);

      // Create adjustment transaction
      const currentBalance = await this.getUserBalance(transaction.userId);
      const pointsExpired = currentBalance - newBalance;

      if (pointsExpired > 0) {
        await prisma.loyaltyPoint.create({
          data: {
            userId: transaction.userId,
            type: PointTransactionType.EXPIRED,
            points: -pointsExpired,
            balance: newBalance,
            description: 'Points expired',
          },
        });
      }
    }
  }
}

export default new LoyaltyService();
