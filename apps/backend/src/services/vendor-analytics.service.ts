import { prisma } from '../lib/prisma';
import { BehaviorType } from '@prisma/client';

class VendorAnalyticsService {
  /**
   * Record daily analytics for vendor
   */
  async recordDailyAnalytics(vendorId: string, date: Date) {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    // Get orders for the day
    const orders = await prisma.order.findMany({
      where: {
        vendorId,
        createdAt: { gte: startOfDay, lte: endOfDay },
        status: { notIn: ['CANCELLED'] },
      },
      include: {
        items: true,
      },
    });

    const revenue = orders.reduce((sum, order) => sum + order.total, 0);
    const orderCount = orders.length;
    const avgOrderValue = orderCount > 0 ? revenue / orderCount : 0;

    // Get unique customers
    const customerIds = new Set(orders.map((o) => o.userId));
    const newCustomers = await this.getNewCustomersCount(
      vendorId,
      Array.from(customerIds),
      startOfDay
    );
    const returningCustomers = customerIds.size - newCustomers;

    // Get product views
    const productIds = await prisma.product.findMany({
      where: { vendorId },
      select: { id: true },
    }).then(products => products.map(p => p.id));

    const productViews = await prisma.userBehavior.count({
      where: {
        productId: { in: productIds },
        type: BehaviorType.PRODUCT_VIEW,
        createdAt: { gte: startOfDay, lte: endOfDay },
      },
    });

    const addToCart = await prisma.userBehavior.count({
      where: {
        productId: { in: productIds },
        type: BehaviorType.ADD_TO_CART,
        createdAt: { gte: startOfDay, lte: endOfDay },
      },
    });

    const conversionRate = productViews > 0 ? (orderCount / productViews) * 100 : 0;

    // Get inventory status
    const products = await prisma.product.findMany({
      where: { vendorId },
    });

    const lowStockProducts = products.filter(
      (p) => p.trackInventory && p.stock > 0 && p.stock <= p.lowStockThreshold
    ).length;

    const outOfStockProducts = products.filter(
      (p) => p.trackInventory && p.stock === 0
    ).length;

    // Upsert analytics
    await prisma.vendorAnalytics.upsert({
      where: {
        vendorId_date: {
          vendorId,
          date: startOfDay,
        },
      },
      create: {
        vendorId,
        date: startOfDay,
        revenue,
        orders: orderCount,
        avgOrderValue,
        productViews,
        addToCart,
        conversionRate,
        newCustomers,
        returningCustomers,
        lowStockProducts,
        outOfStockProducts,
      },
      update: {
        revenue,
        orders: orderCount,
        avgOrderValue,
        productViews,
        addToCart,
        conversionRate,
        newCustomers,
        returningCustomers,
        lowStockProducts,
        outOfStockProducts,
        updatedAt: new Date(),
      },
    });
  }

  /**
   * Get vendor dashboard analytics
   */
  async getVendorDashboard(vendorId: string, days = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    startDate.setHours(0, 0, 0, 0);

    const analytics = await prisma.vendorAnalytics.findMany({
      where: {
        vendorId,
        date: { gte: startDate },
      },
      orderBy: { date: 'asc' },
    });

    const totalRevenue = analytics.reduce((sum, a) => sum + a.revenue, 0);
    const totalOrders = analytics.reduce((sum, a) => sum + a.orders, 0);
    const totalViews = analytics.reduce((sum, a) => sum + a.productViews, 0);
    const avgConversionRate = analytics.length > 0
      ? analytics.reduce((sum, a) => sum + a.conversionRate, 0) / analytics.length
      : 0;

    // Get today's stats
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayAnalytics = analytics.find(
      (a) => a.date.getTime() === today.getTime()
    );

    // Get yesterday's stats for comparison
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayAnalytics = analytics.find(
      (a) => a.date.getTime() === yesterday.getTime()
    );

    const revenueChange = yesterdayAnalytics
      ? ((todayAnalytics?.revenue || 0) - yesterdayAnalytics.revenue) / yesterdayAnalytics.revenue * 100
      : 0;

    const ordersChange = yesterdayAnalytics
      ? ((todayAnalytics?.orders || 0) - yesterdayAnalytics.orders) / yesterdayAnalytics.orders * 100
      : 0;

    // Top products
    const topProducts = await this.getTopProducts(vendorId, days);

    // Low stock alerts
    const lowStockAlerts = await this.getLowStockProducts(vendorId);

    return {
      summary: {
        totalRevenue,
        totalOrders,
        avgOrderValue: totalOrders > 0 ? totalRevenue / totalOrders : 0,
        totalViews,
        avgConversionRate: avgConversionRate.toFixed(2),
      },
      today: {
        revenue: todayAnalytics?.revenue || 0,
        orders: todayAnalytics?.orders || 0,
        views: todayAnalytics?.productViews || 0,
        revenueChange: revenueChange.toFixed(1),
        ordersChange: ordersChange.toFixed(1),
      },
      timeline: analytics,
      topProducts,
      lowStockAlerts,
    };
  }

  /**
   * Get top performing products
   */
  async getTopProducts(vendorId: string, days = 30, limit = 10) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const products = await prisma.product.findMany({
      where: {
        vendorId,
        orderItems: {
          some: {
            order: {
              createdAt: { gte: startDate },
              status: { notIn: ['CANCELLED'] },
            },
          },
        },
      },
      include: {
        orderItems: {
          where: {
            order: {
              createdAt: { gte: startDate },
              status: { notIn: ['CANCELLED'] },
            },
          },
        },
      },
      take: limit,
    });

    const productsWithSales = products.map((product) => {
      const periodSales = product.orderItems.reduce(
        (sum, item) => sum + item.quantity,
        0
      );
      const periodRevenue = product.orderItems.reduce(
        (sum, item) => sum + item.total,
        0
      );

      return {
        id: product.id,
        name: product.name,
        price: product.price,
        stock: product.stock,
        rating: product.rating,
        periodSales,
        periodRevenue,
      };
    });

    return productsWithSales.sort((a, b) => b.periodRevenue - a.periodRevenue);
  }

  /**
   * Get low stock products
   */
  async getLowStockProducts(vendorId: string) {
    const products = await prisma.product.findMany({
      where: {
        vendorId,
        isActive: true,
        trackInventory: true,
        stock: { lte: prisma.product.fields.lowStockThreshold },
        stock: { gt: 0 },
      },
      orderBy: { stock: 'asc' },
      take: 20,
    });

    return products;
  }

  /**
   * Get sales by category
   */
  async getSalesByCategory(vendorId: string, days = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const orderItems = await prisma.orderItem.findMany({
      where: {
        order: {
          vendorId,
          createdAt: { gte: startDate },
          status: { notIn: ['CANCELLED'] },
        },
      },
      include: {
        product: {
          include: {
            category: true,
          },
        },
      },
    });

    const categoryStats: Record<string, { name: string; revenue: number; items: number }> = {};

    orderItems.forEach((item) => {
      const categoryId = item.product.categoryId;
      const categoryName = item.product.category.name;

      if (!categoryStats[categoryId]) {
        categoryStats[categoryId] = {
          name: categoryName,
          revenue: 0,
          items: 0,
        };
      }

      categoryStats[categoryId].revenue += item.total;
      categoryStats[categoryId].items += item.quantity;
    });

    return Object.entries(categoryStats)
      .map(([categoryId, stats]) => ({
        categoryId,
        ...stats,
      }))
      .sort((a, b) => b.revenue - a.revenue);
  }

  /**
   * Get customer insights
   */
  async getCustomerInsights(vendorId: string, days = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const orders = await prisma.order.findMany({
      where: {
        vendorId,
        createdAt: { gte: startDate },
        status: { notIn: ['CANCELLED'] },
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    const customerOrders: Record<string, { count: number; revenue: number; user: any }> = {};

    orders.forEach((order) => {
      if (!customerOrders[order.userId]) {
        customerOrders[order.userId] = {
          count: 0,
          revenue: 0,
          user: order.user,
        };
      }

      customerOrders[order.userId].count++;
      customerOrders[order.userId].revenue += order.total;
    });

    const topCustomers = Object.entries(customerOrders)
      .map(([userId, data]) => ({
        userId,
        ...data,
        avgOrderValue: data.revenue / data.count,
      }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);

    const uniqueCustomers = Object.keys(customerOrders).length;
    const repeatCustomers = Object.values(customerOrders).filter(
      (c) => c.count > 1
    ).length;

    return {
      uniqueCustomers,
      repeatCustomers,
      repeatRate: uniqueCustomers > 0 ? (repeatCustomers / uniqueCustomers) * 100 : 0,
      topCustomers,
    };
  }

  /**
   * Get revenue forecast
   */
  async getRevenueForecast(vendorId: string, days = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const analytics = await prisma.vendorAnalytics.findMany({
      where: {
        vendorId,
        date: { gte: startDate },
      },
      orderBy: { date: 'asc' },
    });

    if (analytics.length < 7) {
      return { forecast: [], confidence: 'low' };
    }

    // Simple moving average forecast
    const avgRevenue = analytics.reduce((sum, a) => sum + a.revenue, 0) / analytics.length;
    const recentAvg = analytics
      .slice(-7)
      .reduce((sum, a) => sum + a.revenue, 0) / 7;

    const trend = recentAvg - avgRevenue;

    const forecast = [];
    for (let i = 1; i <= 7; i++) {
      const forecastDate = new Date();
      forecastDate.setDate(forecastDate.getDate() + i);
      forecast.push({
        date: forecastDate,
        predictedRevenue: Math.max(0, recentAvg + trend * i),
      });
    }

    return {
      forecast,
      confidence: analytics.length >= 30 ? 'high' : 'medium',
    };
  }

  /**
   * Helper: Get new customers count
   */
  private async getNewCustomersCount(
    vendorId: string,
    customerIds: string[],
    date: Date
  ): Promise<number> {
    let newCount = 0;

    for (const customerId of customerIds) {
      const firstOrder = await prisma.order.findFirst({
        where: {
          vendorId,
          userId: customerId,
        },
        orderBy: { createdAt: 'asc' },
      });

      if (firstOrder && firstOrder.createdAt >= date) {
        newCount++;
      }
    }

    return newCount;
  }
}

export default new VendorAnalyticsService();
