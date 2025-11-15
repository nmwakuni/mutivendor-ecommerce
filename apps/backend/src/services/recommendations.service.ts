import { prisma } from '../config/database';

class RecommendationsService {
  /**
   * Get personalized product recommendations for a user
   * Based on:
   * - User's purchase history
   * - Browsing history (cart items)
   * - Popular products in similar categories
   * - Collaborative filtering (users who bought X also bought Y)
   */
  async getRecommendations(userId: string, limit: number = 10) {
    // Get user's order history
    const userOrders = await prisma.order.findMany({
      where: { userId },
      include: {
        items: {
          include: {
            product: {
              include: {
                category: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 10, // Last 10 orders
    });

    // Get categories from user's purchase history
    const purchasedCategories = new Set(
      userOrders.flatMap((order) =>
        order.items.map((item) => item.product.categoryId)
      )
    );

    // Get products from cart (browsing history)
    const cartItems = await prisma.cartItem.findMany({
      where: { userId },
      include: {
        product: {
          include: {
            category: true,
          },
        },
      },
    });

    const cartCategories = new Set(cartItems.map((item) => item.product.categoryId));

    // Combine categories
    const allCategories = new Set([...purchasedCategories, ...cartCategories]);

    if (allCategories.size === 0) {
      // If no history, return popular products
      return this.getPopularProducts(limit);
    }

    // Get products from user's interested categories
    const recommendations = await prisma.product.findMany({
      where: {
        categoryId: {
          in: Array.from(allCategories),
        },
        isActive: true,
        stock: {
          gt: 0,
        },
        // Exclude already purchased products
        id: {
          notIn: userOrders.flatMap((order) => order.items.map((item) => item.productId)),
        },
      },
      include: {
        category: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        vendor: {
          select: {
            id: true,
            businessName: true,
            rating: true,
          },
        },
      },
      orderBy: [
        { rating: 'desc' },
        { totalSales: 'desc' },
      ],
      take: limit,
    });

    return recommendations;
  }

  /**
   * Get popular products overall
   */
  async getPopularProducts(limit: number = 10) {
    return prisma.product.findMany({
      where: {
        isActive: true,
        stock: {
          gt: 0,
        },
      },
      include: {
        category: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        vendor: {
          select: {
            id: true,
            businessName: true,
            rating: true,
          },
        },
      },
      orderBy: [
        { totalSales: 'desc' },
        { rating: 'desc' },
      ],
      take: limit,
    });
  }

  /**
   * Get products frequently bought together
   */
  async getFrequentlyBoughtTogether(productId: string, limit: number = 4) {
    // Find orders containing this product
    const ordersWithProduct = await prisma.orderItem.findMany({
      where: {
        productId,
      },
      select: {
        orderId: true,
      },
      take: 100, // Last 100 orders
    });

    const orderIds = ordersWithProduct.map((item) => item.orderId);

    if (orderIds.length === 0) {
      return [];
    }

    // Find other products in those orders
    const relatedProducts = await prisma.orderItem.groupBy({
      by: ['productId'],
      where: {
        orderId: {
          in: orderIds,
        },
        productId: {
          not: productId, // Exclude the current product
        },
      },
      _count: {
        productId: true,
      },
      orderBy: {
        _count: {
          productId: 'desc',
        },
      },
      take: limit,
    });

    // Get full product details
    const productIds = relatedProducts.map((p) => p.productId);

    const products = await prisma.product.findMany({
      where: {
        id: {
          in: productIds,
        },
        isActive: true,
        stock: {
          gt: 0,
        },
      },
      include: {
        category: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        vendor: {
          select: {
            id: true,
            businessName: true,
            rating: true,
          },
        },
      },
    });

    // Sort by frequency
    const sortedProducts = products.sort((a, b) => {
      const aCount = relatedProducts.find((p) => p.productId === a.id)?._count.productId || 0;
      const bCount = relatedProducts.find((p) => p.productId === b.id)?._count.productId || 0;
      return bCount - aCount;
    });

    return sortedProducts;
  }

  /**
   * Get similar products (same category)
   */
  async getSimilarProducts(productId: string, limit: number = 6) {
    // Get the product's category
    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: { categoryId: true, price: true },
    });

    if (!product) {
      return [];
    }

    // Find products in the same category with similar price range
    const priceMin = product.price * 0.7; // 30% lower
    const priceMax = product.price * 1.3; // 30% higher

    return prisma.product.findMany({
      where: {
        categoryId: product.categoryId,
        id: {
          not: productId,
        },
        price: {
          gte: priceMin,
          lte: priceMax,
        },
        isActive: true,
        stock: {
          gt: 0,
        },
      },
      include: {
        category: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        vendor: {
          select: {
            id: true,
            businessName: true,
            rating: true,
          },
        },
      },
      orderBy: [
        { rating: 'desc' },
        { totalSales: 'desc' },
      ],
      take: limit,
    });
  }

  /**
   * Get trending products (high sales in last 7 days)
   */
  async getTrendingProducts(limit: number = 10) {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    // Get products with recent sales
    const recentOrders = await prisma.orderItem.groupBy({
      by: ['productId'],
      where: {
        order: {
          createdAt: {
            gte: sevenDaysAgo,
          },
          status: {
            in: ['CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED'],
          },
        },
      },
      _sum: {
        quantity: true,
      },
      orderBy: {
        _sum: {
          quantity: 'desc',
        },
      },
      take: limit,
    });

    const productIds = recentOrders.map((item) => item.productId);

    const products = await prisma.product.findMany({
      where: {
        id: {
          in: productIds,
        },
        isActive: true,
        stock: {
          gt: 0,
        },
      },
      include: {
        category: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        vendor: {
          select: {
            id: true,
            businessName: true,
            rating: true,
          },
        },
      },
    });

    // Sort by recent sales
    return products.sort((a, b) => {
      const aQty = recentOrders.find((r) => r.productId === a.id)?._sum.quantity || 0;
      const bQty = recentOrders.find((r) => r.productId === b.id)?._sum.quantity || 0;
      return bQty - aQty;
    });
  }
}

export const recommendationsService = new RecommendationsService();
