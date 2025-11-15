import { prisma } from '../lib/prisma';
import { BehaviorType, PaymentMethod } from '@prisma/client';

class PersonalizationService {
  /**
   * Track user behavior
   */
  async trackBehavior(data: {
    userId?: string;
    sessionId?: string;
    type: BehaviorType;
    productId?: string;
    categoryId?: string;
    searchQuery?: string;
    metadata?: any;
  }) {
    const behavior = await prisma.userBehavior.create({
      data,
    });

    // Update user preferences based on behavior
    if (data.userId) {
      await this.updateUserPreferences(data.userId);
    }

    return behavior;
  }

  /**
   * Get personalized homepage
   */
  async getPersonalizedHomepage(userId?: string, sessionId?: string) {
    if (!userId && !sessionId) {
      return this.getDefaultHomepage();
    }

    const recommendations = await this.getPersonalizedRecommendations(
      userId,
      sessionId,
      12
    );
    const categories = await this.getPreferredCategories(userId, sessionId);
    const trending = await this.getTrendingForUser(userId, sessionId);

    return {
      recommendations,
      preferredCategories: categories,
      trending,
    };
  }

  /**
   * Get personalized product recommendations
   */
  async getPersonalizedRecommendations(
    userId?: string,
    sessionId?: string,
    limit = 10
  ) {
    const behaviors = await prisma.userBehavior.findMany({
      where: {
        ...(userId ? { userId } : { sessionId }),
        type: {
          in: [
            BehaviorType.PRODUCT_VIEW,
            BehaviorType.ADD_TO_CART,
            BehaviorType.PURCHASE,
            BehaviorType.WISHLIST_ADD,
          ],
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    // Extract category preferences
    const categoryScores: Record<string, number> = {};
    const productIds: Set<string> = new Set();

    behaviors.forEach((behavior) => {
      if (behavior.productId) {
        productIds.add(behavior.productId);
      }

      if (behavior.categoryId) {
        const weight = this.getBehaviorWeight(behavior.type);
        categoryScores[behavior.categoryId] =
          (categoryScores[behavior.categoryId] || 0) + weight;
      }
    });

    // Get products from top categories
    const topCategories = Object.entries(categoryScores)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([categoryId]) => categoryId);

    if (topCategories.length === 0) {
      return this.getDefaultRecommendations(limit);
    }

    const products = await prisma.product.findMany({
      where: {
        categoryId: { in: topCategories },
        id: { notIn: Array.from(productIds) }, // Exclude already viewed
        isActive: true,
        stock: { gt: 0 },
      },
      include: {
        vendor: {
          select: {
            businessName: true,
            isVerified: true,
          },
        },
      },
      orderBy: [{ rating: 'desc' }, { totalSales: 'desc' }],
      take: limit,
    });

    return products;
  }

  /**
   * Get preferred categories for user
   */
  async getPreferredCategories(userId?: string, sessionId?: string, limit = 5) {
    const behaviors = await prisma.userBehavior.groupBy({
      by: ['categoryId'],
      where: {
        ...(userId ? { userId } : { sessionId }),
        categoryId: { not: null },
      },
      _count: true,
      orderBy: {
        _count: {
          categoryId: 'desc',
        },
      },
      take: limit,
    });

    const categoryIds = behaviors
      .map((b) => b.categoryId)
      .filter((id): id is string => id !== null);

    if (categoryIds.length === 0) {
      return [];
    }

    const categories = await prisma.category.findMany({
      where: { id: { in: categoryIds } },
    });

    return categories;
  }

  /**
   * Get trending products for user based on their preferences
   */
  async getTrendingForUser(userId?: string, sessionId?: string, limit = 8) {
    const preferredCategories = await this.getPreferredCategories(
      userId,
      sessionId,
      3
    );

    const categoryIds = preferredCategories.map((c) => c.id);

    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const products = await prisma.product.findMany({
      where: {
        ...(categoryIds.length > 0 && { categoryId: { in: categoryIds } }),
        isActive: true,
        stock: { gt: 0 },
        createdAt: { gte: sevenDaysAgo },
      },
      include: {
        vendor: {
          select: {
            businessName: true,
            isVerified: true,
          },
        },
      },
      orderBy: [{ views: 'desc' }, { rating: 'desc' }],
      take: limit,
    });

    return products;
  }

  /**
   * Update user preferences based on behavior
   */
  private async updateUserPreferences(userId: string) {
    const behaviors = await prisma.userBehavior.findMany({
      where: {
        userId,
        type: {
          in: [BehaviorType.PURCHASE, BehaviorType.ADD_TO_CART],
        },
      },
      include: {
        product: true,
      },
      take: 100,
    });

    // Calculate category preferences
    const categoryPreferences: Record<string, number> = {};
    let totalPrice = 0;
    let priceCount = 0;
    const vendorCounts: Record<string, number> = {};

    behaviors.forEach((behavior) => {
      if (behavior.product) {
        const weight = behavior.type === BehaviorType.PURCHASE ? 3 : 1;

        categoryPreferences[behavior.product.categoryId] =
          (categoryPreferences[behavior.product.categoryId] || 0) + weight;

        if (behavior.type === BehaviorType.PURCHASE) {
          totalPrice += behavior.product.price;
          priceCount++;

          vendorCounts[behavior.product.vendorId] =
            (vendorCounts[behavior.product.vendorId] || 0) + 1;
        }
      }
    });

    const avgPrice = priceCount > 0 ? totalPrice / priceCount : undefined;
    const favoriteVendors = Object.entries(vendorCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([vendorId]) => vendorId);

    // Get order data for payment preference
    const orders = await prisma.order.findMany({
      where: { userId },
      include: { payment: true },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    const paymentMethods = orders
      .map((o) => o.payment?.method)
      .filter((m): m is PaymentMethod => m !== null && m !== undefined);

    const preferredPayment = paymentMethods[0]; // Most recent

    await prisma.userPreference.upsert({
      where: { userId },
      create: {
        userId,
        categoryPreferences,
        minPriceRange: avgPrice ? avgPrice * 0.5 : undefined,
        maxPriceRange: avgPrice ? avgPrice * 2 : undefined,
        favoriteVendors,
        preferredPayment,
      },
      update: {
        categoryPreferences,
        minPriceRange: avgPrice ? avgPrice * 0.5 : undefined,
        maxPriceRange: avgPrice ? avgPrice * 2 : undefined,
        favoriteVendors,
        preferredPayment,
        lastUpdated: new Date(),
      },
    });
  }

  /**
   * Get default homepage (for new/anonymous users)
   */
  private async getDefaultHomepage() {
    const trending = await this.getDefaultRecommendations(8);
    const categories = await prisma.category.findMany({
      where: { isActive: true, parentId: null },
      orderBy: { order: 'asc' },
      take: 6,
    });

    return {
      recommendations: trending,
      preferredCategories: categories,
      trending,
    };
  }

  /**
   * Get default recommendations (trending products)
   */
  private async getDefaultRecommendations(limit: number) {
    return await prisma.product.findMany({
      where: {
        isActive: true,
        stock: { gt: 0 },
      },
      include: {
        vendor: {
          select: {
            businessName: true,
            isVerified: true,
          },
        },
      },
      orderBy: [{ totalSales: 'desc' }, { rating: 'desc' }],
      take: limit,
    });
  }

  /**
   * Get behavior weight for scoring
   */
  private getBehaviorWeight(type: BehaviorType): number {
    const weights: Record<BehaviorType, number> = {
      [BehaviorType.PURCHASE]: 10,
      [BehaviorType.ADD_TO_CART]: 5,
      [BehaviorType.WISHLIST_ADD]: 3,
      [BehaviorType.PRODUCT_VIEW]: 1,
      [BehaviorType.PRODUCT_SEARCH]: 2,
      [BehaviorType.CATEGORY_BROWSE]: 2,
      [BehaviorType.REMOVE_FROM_CART]: -2,
      [BehaviorType.REVIEW_SUBMIT]: 7,
    };

    return weights[type] || 1;
  }

  /**
   * Get search suggestions based on user history
   */
  async getSearchSuggestions(userId?: string, limit = 5) {
    if (!userId) {
      // Return popular searches for anonymous users
      return await this.getPopularSearches(limit);
    }

    const recentSearches = await prisma.userBehavior.findMany({
      where: {
        userId,
        type: BehaviorType.PRODUCT_SEARCH,
        searchQuery: { not: null },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      distinct: ['searchQuery'],
    });

    return recentSearches.map((b) => b.searchQuery).filter((q): q is string => q !== null);
  }

  /**
   * Get popular searches
   */
  private async getPopularSearches(limit: number) {
    const searches = await prisma.userBehavior.groupBy({
      by: ['searchQuery'],
      where: {
        type: BehaviorType.PRODUCT_SEARCH,
        searchQuery: { not: null },
      },
      _count: true,
      orderBy: {
        _count: {
          searchQuery: 'desc',
        },
      },
      take: limit,
    });

    return searches.map((s) => s.searchQuery).filter((q): q is string => q !== null);
  }
}

export default new PersonalizationService();
