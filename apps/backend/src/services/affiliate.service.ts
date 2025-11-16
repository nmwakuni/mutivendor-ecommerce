import { prisma } from '../lib/prisma';
import { AffiliateStatus, CommissionStatus } from '@prisma/client';
import { ApiError } from '../utils/ApiError';

class AffiliateService {
  /**
   * Apply to become an affiliate
   */
  async apply(userId: string, data: {
    instagramHandle?: string;
    twitterHandle?: string;
    tiktokHandle?: string;
    youtubeChannel?: string;
    websiteUrl?: string;
    followers?: number;
    bankName?: string;
    accountNumber?: string;
    accountName?: string;
    phoneNumber?: string;
  }) {
    // Check if already an affiliate
    const existing = await prisma.affiliate.findUnique({
      where: { userId },
    });

    if (existing) {
      throw new ApiError(400, 'You are already an affiliate');
    }

    // Generate unique affiliate code
    const code = await this.generateUniqueCode(userId);

    const affiliate = await prisma.affiliate.create({
      data: {
        userId,
        code,
        ...data,
        status: AffiliateStatus.PENDING,
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    return affiliate;
  }

  /**
   * Approve affiliate application (Admin)
   */
  async approveAffiliate(affiliateId: string, commissionRate?: number) {
    const affiliate = await prisma.affiliate.update({
      where: { id: affiliateId },
      data: {
        status: AffiliateStatus.ACTIVE,
        approvedAt: new Date(),
        ...(commissionRate && { commissionRate }),
      },
      include: {
        user: true,
      },
    });

    return affiliate;
  }

  /**
   * Reject affiliate application (Admin)
   */
  async rejectAffiliate(affiliateId: string, reason?: string) {
    const affiliate = await prisma.affiliate.update({
      where: { id: affiliateId },
      data: {
        status: AffiliateStatus.REJECTED,
        notes: reason,
      },
    });

    return affiliate;
  }

  /**
   * Suspend affiliate (Admin)
   */
  async suspendAffiliate(affiliateId: string, reason?: string) {
    const affiliate = await prisma.affiliate.update({
      where: { id: affiliateId },
      data: {
        status: AffiliateStatus.SUSPENDED,
        notes: reason,
      },
    });

    return affiliate;
  }

  /**
   * Track affiliate click
   */
  async trackClick(
    affiliateCode: string,
    data: {
      ipAddress?: string;
      userAgent?: string;
      referrer?: string;
      landingPage?: string;
    }
  ) {
    const affiliate = await prisma.affiliate.findUnique({
      where: { code: affiliateCode },
    });

    if (!affiliate || affiliate.status !== AffiliateStatus.ACTIVE) {
      return null;
    }

    const click = await prisma.affiliateClick.create({
      data: {
        affiliateId: affiliate.id,
        ...data,
      },
    });

    // Update affiliate click count
    await prisma.affiliate.update({
      where: { id: affiliate.id },
      data: { totalClicks: { increment: 1 } },
    });

    return { click, affiliateId: affiliate.id };
  }

  /**
   * Convert click to sale
   */
  async convertToSale(
    affiliateId: string,
    orderId: string,
    orderAmount: number
  ) {
    const affiliate = await prisma.affiliate.findUnique({
      where: { id: affiliateId },
    });

    if (!affiliate || affiliate.status !== AffiliateStatus.ACTIVE) {
      return null;
    }

    // Calculate commission
    const commissionRate = affiliate.commissionRate;
    const commissionAmount = (orderAmount * commissionRate) / 100;

    // Create commission record
    const commission = await prisma.affiliateCommission.create({
      data: {
        affiliateId,
        orderId,
        orderAmount,
        commissionRate,
        commissionAmount,
        status: CommissionStatus.PENDING,
      },
    });

    // Update affiliate stats
    await prisma.affiliate.update({
      where: { id: affiliateId },
      data: {
        totalOrders: { increment: 1 },
        totalRevenue: { increment: orderAmount },
        totalCommission: { increment: commissionAmount },
      },
    });

    // Mark click as converted (find most recent click from this order's user)
    // In practice, you'd store affiliateId in order or session
    await prisma.affiliateClick.updateMany({
      where: {
        affiliateId,
        convertedToSale: false,
      },
      data: {
        convertedToSale: true,
        orderId,
      },
    });

    return commission;
  }

  /**
   * Get affiliate by code
   */
  async getByCode(code: string) {
    const affiliate = await prisma.affiliate.findUnique({
      where: { code },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatar: true,
          },
        },
      },
    });

    return affiliate;
  }

  /**
   * Get affiliate by user ID
   */
  async getByUserId(userId: string) {
    const affiliate = await prisma.affiliate.findUnique({
      where: { userId },
      include: {
        _count: {
          select: {
            clicks: true,
            commissions: true,
          },
        },
      },
    });

    return affiliate;
  }

  /**
   * Get affiliate dashboard stats
   */
  async getDashboardStats(affiliateId: string, days = 30) {
    const affiliate = await prisma.affiliate.findUnique({
      where: { id: affiliateId },
    });

    if (!affiliate) {
      throw new ApiError(404, 'Affiliate not found');
    }

    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    // Recent clicks
    const recentClicks = await prisma.affiliateClick.count({
      where: {
        affiliateId,
        createdAt: { gte: startDate },
      },
    });

    // Recent conversions
    const recentConversions = await prisma.affiliateClick.count({
      where: {
        affiliateId,
        convertedToSale: true,
        createdAt: { gte: startDate },
      },
    });

    // Recent commissions
    const recentCommissionsData = await prisma.affiliateCommission.aggregate({
      where: {
        affiliateId,
        createdAt: { gte: startDate },
      },
      _sum: {
        commissionAmount: true,
        orderAmount: true,
      },
      _count: true,
    });

    // Pending commissions
    const pendingCommissions = await prisma.affiliateCommission.aggregate({
      where: {
        affiliateId,
        status: CommissionStatus.PENDING,
      },
      _sum: {
        commissionAmount: true,
      },
    });

    // Approved commissions (ready for payout)
    const approvedCommissions = await prisma.affiliateCommission.aggregate({
      where: {
        affiliateId,
        status: CommissionStatus.APPROVED,
      },
      _sum: {
        commissionAmount: true,
      },
    });

    // Paid commissions
    const paidCommissions = await prisma.affiliateCommission.aggregate({
      where: {
        affiliateId,
        status: CommissionStatus.PAID,
      },
      _sum: {
        commissionAmount: true,
      },
    });

    const conversionRate = recentClicks > 0
      ? (recentConversions / recentClicks) * 100
      : 0;

    return {
      totalStats: {
        totalClicks: affiliate.totalClicks,
        totalOrders: affiliate.totalOrders,
        totalRevenue: affiliate.totalRevenue,
        totalCommission: affiliate.totalCommission,
      },
      periodStats: {
        clicks: recentClicks,
        conversions: recentConversions,
        conversionRate: conversionRate.toFixed(2),
        revenue: recentCommissionsData._sum.orderAmount || 0,
        commission: recentCommissionsData._sum.commissionAmount || 0,
        avgOrderValue:
          recentCommissionsData._count > 0
            ? (recentCommissionsData._sum.orderAmount || 0) / recentCommissionsData._count
            : 0,
      },
      earnings: {
        pending: pendingCommissions._sum.commissionAmount || 0,
        approved: approvedCommissions._sum.commissionAmount || 0,
        paid: paidCommissions._sum.commissionAmount || 0,
      },
    };
  }

  /**
   * Get affiliate commissions
   */
  async getCommissions(
    affiliateId: string,
    status?: CommissionStatus,
    limit = 50,
    offset = 0
  ) {
    const where: any = { affiliateId };
    if (status) {
      where.status = status;
    }

    const commissions = await prisma.affiliateCommission.findMany({
      where,
      include: {
        order: {
          select: {
            id: true,
            orderNumber: true,
            createdAt: true,
            user: {
              select: {
                firstName: true,
                lastName: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    });

    const total = await prisma.affiliateCommission.count({ where });

    return { commissions, total };
  }

  /**
   * Get pending affiliates (Admin)
   */
  async getPendingAffiliates(limit = 50, offset = 0) {
    const affiliates = await prisma.affiliate.findMany({
      where: { status: AffiliateStatus.PENDING },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            createdAt: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    });

    const total = await prisma.affiliate.count({
      where: { status: AffiliateStatus.PENDING },
    });

    return { affiliates, total };
  }

  /**
   * Get all affiliates (Admin)
   */
  async getAllAffiliates(
    status?: AffiliateStatus,
    limit = 50,
    offset = 0
  ) {
    const where: any = {};
    if (status) {
      where.status = status;
    }

    const affiliates = await prisma.affiliate.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        _count: {
          select: {
            clicks: true,
            commissions: true,
          },
        },
      },
      orderBy: { totalRevenue: 'desc' },
      take: limit,
      skip: offset,
    });

    const total = await prisma.affiliate.count({ where });

    return { affiliates, total };
  }

  /**
   * Approve commission (Admin)
   */
  async approveCommission(commissionId: string) {
    const commission = await prisma.affiliateCommission.update({
      where: { id: commissionId },
      data: { status: CommissionStatus.APPROVED },
    });

    return commission;
  }

  /**
   * Mark commission as paid (Admin)
   */
  async markCommissionPaid(commissionId: string, notes?: string) {
    const commission = await prisma.affiliateCommission.update({
      where: { id: commissionId },
      data: {
        status: CommissionStatus.PAID,
        paidAt: new Date(),
        notes,
      },
    });

    return commission;
  }

  /**
   * Batch approve commissions (Admin)
   */
  async batchApproveCommissions(commissionIds: string[]) {
    await prisma.affiliateCommission.updateMany({
      where: { id: { in: commissionIds } },
      data: { status: CommissionStatus.APPROVED },
    });

    return { updated: commissionIds.length };
  }

  /**
   * Batch pay commissions (Admin)
   */
  async batchPayCommissions(commissionIds: string[], notes?: string) {
    await prisma.affiliateCommission.updateMany({
      where: { id: { in: commissionIds } },
      data: {
        status: CommissionStatus.PAID,
        paidAt: new Date(),
        notes,
      },
    });

    return { updated: commissionIds.length };
  }

  /**
   * Update affiliate profile
   */
  async updateProfile(
    affiliateId: string,
    data: Partial<{
      instagramHandle: string;
      twitterHandle: string;
      tiktokHandle: string;
      youtubeChannel: string;
      websiteUrl: string;
      followers: number;
      bankName: string;
      accountNumber: string;
      accountName: string;
      phoneNumber: string;
    }>
  ) {
    const affiliate = await prisma.affiliate.update({
      where: { id: affiliateId },
      data,
    });

    return affiliate;
  }

  /**
   * Update commission rate (Admin)
   */
  async updateCommissionRate(affiliateId: string, rate: number) {
    if (rate < 0 || rate > 50) {
      throw new ApiError(400, 'Commission rate must be between 0 and 50%');
    }

    const affiliate = await prisma.affiliate.update({
      where: { id: affiliateId },
      data: { commissionRate: rate },
    });

    return affiliate;
  }

  /**
   * Get top performing affiliates (Admin)
   */
  async getTopAffiliates(limit = 10, period = 30) {
    const startDate = new Date(Date.now() - period * 24 * 60 * 60 * 1000);

    const affiliates = await prisma.affiliate.findMany({
      where: {
        status: AffiliateStatus.ACTIVE,
      },
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        commissions: {
          where: {
            createdAt: { gte: startDate },
          },
          select: {
            commissionAmount: true,
            orderAmount: true,
          },
        },
      },
      take: limit,
    });

    const ranked = affiliates
      .map((affiliate) => {
        const periodRevenue = affiliate.commissions.reduce(
          (sum, c) => sum + c.orderAmount,
          0
        );
        const periodCommission = affiliate.commissions.reduce(
          (sum, c) => sum + c.commissionAmount,
          0
        );

        return {
          ...affiliate,
          periodRevenue,
          periodCommission,
          periodOrders: affiliate.commissions.length,
        };
      })
      .sort((a, b) => b.periodRevenue - a.periodRevenue);

    return ranked;
  }

  // ============================================
  // HELPERS
  // ============================================

  private async generateUniqueCode(userId: string): Promise<string> {
    // Extract user identifier
    const userPart = userId.substring(0, 4).toUpperCase();

    // Generate random part
    const randomPart = Math.random().toString(36).substring(2, 8).toUpperCase();

    const code = `${userPart}${randomPart}`;

    // Check if code exists
    const existing = await prisma.affiliate.findUnique({
      where: { code },
    });

    if (existing) {
      // Recursively try again
      return this.generateUniqueCode(userId);
    }

    return code;
  }
}

export default new AffiliateService();
