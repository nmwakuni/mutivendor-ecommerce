import { prisma } from '../lib/prisma';
import { FraudRiskLevel } from '@prisma/client';
import { ApiError } from '../utils/ApiError';

interface FraudCheckData {
  userId?: string;
  orderId?: string;
  orderAmount: number;
  ipAddress?: string;
  deviceFingerprint?: string;
  email?: string;
  phone?: string;
  shippingAddress?: any;
  billingAddress?: any;
  paymentMethod?: string;
}

interface RiskFactor {
  type: string;
  description: string;
  weight: number; // 0-100
}

class FraudService {
  /**
   * Analyze order for fraud
   */
  async analyzeOrder(data: FraudCheckData) {
    const factors: RiskFactor[] = [];
    let totalScore = 0;

    // Check for multiple orders from same IP in short time
    if (data.ipAddress) {
      const recentOrders = await this.checkRecentOrdersFromIP(data.ipAddress);
      if (recentOrders >= 5) {
        factors.push({
          type: 'MULTIPLE_ORDERS_SAME_IP',
          description: `${recentOrders} orders from same IP in last hour`,
          weight: 30,
        });
        totalScore += 30;
      }
    }

    // Check for high order amount for new users
    if (data.userId) {
      const user = await prisma.user.findUnique({
        where: { id: data.userId },
        include: { orders: true },
      });

      if (user) {
        const accountAge = Date.now() - user.createdAt.getTime();
        const accountAgeDays = accountAge / (1000 * 60 * 60 * 24);

        // New account (< 7 days) with high value order
        if (accountAgeDays < 7 && data.orderAmount > 50000) {
          factors.push({
            type: 'NEW_ACCOUNT_HIGH_VALUE',
            description: 'New account with high value order',
            weight: 40,
          });
          totalScore += 40;
        }

        // Check order velocity
        const ordersLast24h = user.orders.filter(
          (order) => Date.now() - order.createdAt.getTime() < 24 * 60 * 60 * 1000
        ).length;

        if (ordersLast24h >= 10) {
          factors.push({
            type: 'HIGH_ORDER_VELOCITY',
            description: `${ordersLast24h} orders in last 24 hours`,
            weight: 35,
          });
          totalScore += 35;
        }

        // Check for unverified email or phone
        if (!user.emailVerified) {
          factors.push({
            type: 'UNVERIFIED_EMAIL',
            description: 'Email not verified',
            weight: 15,
          });
          totalScore += 15;
        }

        if (!user.phoneVerified) {
          factors.push({
            type: 'UNVERIFIED_PHONE',
            description: 'Phone not verified',
            weight: 15,
          });
          totalScore += 15;
        }
      }
    }

    // Check for address mismatch
    if (data.shippingAddress && data.billingAddress) {
      const addressMatch = this.compareAddresses(
        data.shippingAddress,
        data.billingAddress
      );

      if (!addressMatch) {
        factors.push({
          type: 'ADDRESS_MISMATCH',
          description: 'Shipping and billing addresses do not match',
          weight: 20,
        });
        totalScore += 20;
      }
    }

    // Check for suspicious email patterns
    if (data.email) {
      const suspiciousEmail = this.checkSuspiciousEmail(data.email);
      if (suspiciousEmail) {
        factors.push({
          type: 'SUSPICIOUS_EMAIL',
          description: 'Email contains suspicious patterns',
          weight: 25,
        });
        totalScore += 25;
      }
    }

    // Check for device fingerprint reuse
    if (data.deviceFingerprint) {
      const deviceUsage = await this.checkDeviceFingerprintUsage(
        data.deviceFingerprint
      );
      if (deviceUsage >= 5) {
        factors.push({
          type: 'DEVICE_FINGERPRINT_REUSE',
          description: `Device used in ${deviceUsage} different accounts`,
          weight: 30,
        });
        totalScore += 30;
      }
    }

    // Check for blacklisted IP
    if (data.ipAddress) {
      const isBlacklisted = await this.checkIPBlacklist(data.ipAddress);
      if (isBlacklisted) {
        factors.push({
          type: 'BLACKLISTED_IP',
          description: 'IP address is blacklisted',
          weight: 50,
        });
        totalScore += 50;
      }
    }

    // Determine risk level
    const riskLevel = this.calculateRiskLevel(totalScore);

    // Create fraud score record
    const fraudScore = await prisma.fraudScore.create({
      data: {
        orderId: data.orderId,
        userId: data.userId,
        riskLevel,
        score: Math.min(totalScore, 100),
        factors: factors,
        ipAddress: data.ipAddress,
        deviceFingerprint: data.deviceFingerprint,
        isBlocked: riskLevel === FraudRiskLevel.CRITICAL,
      },
    });

    return {
      fraudScore,
      shouldBlock: riskLevel === FraudRiskLevel.CRITICAL,
      requiresReview: riskLevel === FraudRiskLevel.HIGH || riskLevel === FraudRiskLevel.CRITICAL,
    };
  }

  /**
   * Get fraud score for order
   */
  async getOrderFraudScore(orderId: string) {
    const fraudScore = await prisma.fraudScore.findUnique({
      where: { orderId },
    });

    return fraudScore;
  }

  /**
   * Get all high-risk orders for review
   */
  async getHighRiskOrders(limit = 50, offset = 0) {
    const scores = await prisma.fraudScore.findMany({
      where: {
        riskLevel: { in: [FraudRiskLevel.HIGH, FraudRiskLevel.CRITICAL] },
        reviewedBy: null,
      },
      include: {
        order: {
          include: {
            user: true,
            items: {
              include: {
                product: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    });

    const total = await prisma.fraudScore.count({
      where: {
        riskLevel: { in: [FraudRiskLevel.HIGH, FraudRiskLevel.CRITICAL] },
        reviewedBy: null,
      },
    });

    return { scores, total };
  }

  /**
   * Review fraud case (Admin)
   */
  async reviewFraudCase(
    fraudScoreId: string,
    adminUserId: string,
    decision: 'approve' | 'block',
    notes?: string
  ) {
    const fraudScore = await prisma.fraudScore.update({
      where: { id: fraudScoreId },
      data: {
        reviewedBy: adminUserId,
        reviewedAt: new Date(),
        isBlocked: decision === 'block',
        notes,
      },
    });

    // If blocked, cancel the order
    if (decision === 'block' && fraudScore.orderId) {
      await prisma.order.update({
        where: { id: fraudScore.orderId },
        data: {
          status: 'CANCELLED',
          cancelledAt: new Date(),
        },
      });
    }

    return fraudScore;
  }

  /**
   * Get user fraud history
   */
  async getUserFraudHistory(userId: string) {
    const scores = await prisma.fraudScore.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    const avgScore = scores.length > 0
      ? scores.reduce((sum, s) => sum + s.score, 0) / scores.length
      : 0;

    const highRiskCount = scores.filter(
      (s) => s.riskLevel === FraudRiskLevel.HIGH || s.riskLevel === FraudRiskLevel.CRITICAL
    ).length;

    return {
      scores,
      avgScore,
      highRiskCount,
      isSuspicious: avgScore > 50 || highRiskCount >= 2,
    };
  }

  // ============================================
  // HELPER METHODS
  // ============================================

  private async checkRecentOrdersFromIP(ipAddress: string): Promise<number> {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

    const count = await prisma.fraudScore.count({
      where: {
        ipAddress,
        createdAt: { gte: oneHourAgo },
      },
    });

    return count;
  }

  private compareAddresses(address1: any, address2: any): boolean {
    if (!address1 || !address2) return true;

    const normalize = (str: string) =>
      str.toLowerCase().replace(/[^a-z0-9]/g, '');

    return (
      normalize(address1.address1 || '') === normalize(address2.address1 || '') &&
      normalize(address1.city || '') === normalize(address2.city || '') &&
      normalize(address1.postalCode || '') === normalize(address2.postalCode || '')
    );
  }

  private checkSuspiciousEmail(email: string): boolean {
    const suspiciousPatterns = [
      /temp.*mail/i,
      /disposable/i,
      /guerrilla/i,
      /mailinator/i,
      /10minute/i,
      /^[a-z]{1,3}[0-9]{5,}@/i, // Short letters followed by many numbers
    ];

    return suspiciousPatterns.some((pattern) => pattern.test(email));
  }

  private async checkDeviceFingerprintUsage(fingerprint: string): Promise<number> {
    const uniqueUsers = await prisma.fraudScore.findMany({
      where: { deviceFingerprint: fingerprint },
      distinct: ['userId'],
      select: { userId: true },
    });

    return uniqueUsers.length;
  }

  private async checkIPBlacklist(ipAddress: string): Promise<boolean> {
    // In production, this would check against a real IP blacklist service
    // For now, we'll check our own database of blocked IPs

    const blockedCount = await prisma.fraudScore.count({
      where: {
        ipAddress,
        isBlocked: true,
      },
    });

    return blockedCount >= 3;
  }

  private calculateRiskLevel(score: number): FraudRiskLevel {
    if (score >= 70) return FraudRiskLevel.CRITICAL;
    if (score >= 50) return FraudRiskLevel.HIGH;
    if (score >= 30) return FraudRiskLevel.MEDIUM;
    return FraudRiskLevel.LOW;
  }

  /**
   * Get fraud statistics
   */
  async getFraudStatistics(days = 30) {
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const totalScans = await prisma.fraudScore.count({
      where: { createdAt: { gte: startDate } },
    });

    const blockedOrders = await prisma.fraudScore.count({
      where: {
        createdAt: { gte: startDate },
        isBlocked: true,
      },
    });

    const byRiskLevel = await prisma.fraudScore.groupBy({
      by: ['riskLevel'],
      where: { createdAt: { gte: startDate } },
      _count: true,
    });

    const avgScore = await prisma.fraudScore.aggregate({
      where: { createdAt: { gte: startDate } },
      _avg: { score: true },
    });

    return {
      totalScans,
      blockedOrders,
      blockRate: totalScans > 0 ? (blockedOrders / totalScans) * 100 : 0,
      byRiskLevel: byRiskLevel.map((item) => ({
        riskLevel: item.riskLevel,
        count: item._count,
      })),
      avgScore: avgScore._avg.score || 0,
    };
  }

  /**
   * Blacklist IP address
   */
  async blacklistIP(ipAddress: string, adminUserId: string, reason: string) {
    // Mark all fraud scores from this IP as blocked
    await prisma.fraudScore.updateMany({
      where: { ipAddress },
      data: {
        isBlocked: true,
        reviewedBy: adminUserId,
        reviewedAt: new Date(),
        notes: `IP blacklisted: ${reason}`,
      },
    });

    return { success: true, message: `IP ${ipAddress} has been blacklisted` };
  }

  /**
   * Whitelist user (reduce fraud score for trusted users)
   */
  async whitelistUser(userId: string, adminUserId: string) {
    await prisma.fraudScore.updateMany({
      where: { userId },
      data: {
        isBlocked: false,
        reviewedBy: adminUserId,
        reviewedAt: new Date(),
        notes: 'User whitelisted by admin',
      },
    });

    return { success: true, message: 'User has been whitelisted' };
  }
}

export default new FraudService();
