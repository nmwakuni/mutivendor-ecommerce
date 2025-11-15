import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import vendorAnalyticsService from '../services/vendor-analytics.service';

class VendorAnalyticsController {
  // ============================================
  // VENDOR DASHBOARD ANALYTICS
  // ============================================

  /**
   * Get vendor dashboard overview
   * GET /api/vendor-analytics/dashboard
   */
  getDashboard = asyncHandler(async (req: Request, res: Response) => {
    const vendorId = req.user!.vendorId;

    if (!vendorId) {
      return res.status(403).json({
        success: false,
        message: 'Vendor account required',
      });
    }

    const dashboard = await vendorAnalyticsService.getVendorDashboard(vendorId);

    res.json({
      success: true,
      data: dashboard,
    });
  });

  /**
   * Get sales analytics
   * GET /api/vendor-analytics/sales
   */
  getSalesAnalytics = asyncHandler(async (req: Request, res: Response) => {
    const vendorId = req.user!.vendorId;
    const { startDate, endDate, groupBy = 'day' } = req.query;

    if (!vendorId) {
      return res.status(403).json({
        success: false,
        message: 'Vendor account required',
      });
    }

    const analytics = await vendorAnalyticsService.getSalesAnalytics(
      vendorId,
      startDate ? new Date(startDate as string) : undefined,
      endDate ? new Date(endDate as string) : undefined,
      groupBy as 'day' | 'week' | 'month'
    );

    res.json({
      success: true,
      data: analytics,
    });
  });

  /**
   * Get revenue forecast
   * GET /api/vendor-analytics/forecast
   */
  getRevenueForecast = asyncHandler(async (req: Request, res: Response) => {
    const vendorId = req.user!.vendorId;
    const { months = 3 } = req.query;

    if (!vendorId) {
      return res.status(403).json({
        success: false,
        message: 'Vendor account required',
      });
    }

    const forecast = await vendorAnalyticsService.getRevenueForecast(
      vendorId,
      Number(months)
    );

    res.json({
      success: true,
      data: forecast,
    });
  });

  /**
   * Get product performance
   * GET /api/vendor-analytics/products
   */
  getProductPerformance = asyncHandler(async (req: Request, res: Response) => {
    const vendorId = req.user!.vendorId;
    const { startDate, endDate, sortBy = 'revenue', limit = 10 } = req.query;

    if (!vendorId) {
      return res.status(403).json({
        success: false,
        message: 'Vendor account required',
      });
    }

    const performance = await vendorAnalyticsService.getProductPerformance(
      vendorId,
      startDate ? new Date(startDate as string) : undefined,
      endDate ? new Date(endDate as string) : undefined,
      sortBy as 'revenue' | 'orders' | 'views',
      Number(limit)
    );

    res.json({
      success: true,
      data: performance,
    });
  });

  /**
   * Get customer analytics
   * GET /api/vendor-analytics/customers
   */
  getCustomerAnalytics = asyncHandler(async (req: Request, res: Response) => {
    const vendorId = req.user!.vendorId;

    if (!vendorId) {
      return res.status(403).json({
        success: false,
        message: 'Vendor account required',
      });
    }

    const analytics = await vendorAnalyticsService.getCustomerAnalytics(
      vendorId
    );

    res.json({
      success: true,
      data: analytics,
    });
  });

  /**
   * Get top customers
   * GET /api/vendor-analytics/customers/top
   */
  getTopCustomers = asyncHandler(async (req: Request, res: Response) => {
    const vendorId = req.user!.vendorId;
    const { limit = 10, sortBy = 'revenue' } = req.query;

    if (!vendorId) {
      return res.status(403).json({
        success: false,
        message: 'Vendor account required',
      });
    }

    const customers = await vendorAnalyticsService.getTopCustomers(
      vendorId,
      Number(limit),
      sortBy as 'revenue' | 'orders'
    );

    res.json({
      success: true,
      data: customers,
    });
  });

  /**
   * Get traffic analytics
   * GET /api/vendor-analytics/traffic
   */
  getTrafficAnalytics = asyncHandler(async (req: Request, res: Response) => {
    const vendorId = req.user!.vendorId;
    const { startDate, endDate } = req.query;

    if (!vendorId) {
      return res.status(403).json({
        success: false,
        message: 'Vendor account required',
      });
    }

    const analytics = await vendorAnalyticsService.getTrafficAnalytics(
      vendorId,
      startDate ? new Date(startDate as string) : undefined,
      endDate ? new Date(endDate as string) : undefined
    );

    res.json({
      success: true,
      data: analytics,
    });
  });

  /**
   * Get conversion analytics
   * GET /api/vendor-analytics/conversions
   */
  getConversionAnalytics = asyncHandler(async (req: Request, res: Response) => {
    const vendorId = req.user!.vendorId;
    const { startDate, endDate } = req.query;

    if (!vendorId) {
      return res.status(403).json({
        success: false,
        message: 'Vendor account required',
      });
    }

    const analytics = await vendorAnalyticsService.getConversionAnalytics(
      vendorId,
      startDate ? new Date(startDate as string) : undefined,
      endDate ? new Date(endDate as string) : undefined
    );

    res.json({
      success: true,
      data: analytics,
    });
  });

  /**
   * Get inventory analytics
   * GET /api/vendor-analytics/inventory
   */
  getInventoryAnalytics = asyncHandler(async (req: Request, res: Response) => {
    const vendorId = req.user!.vendorId;

    if (!vendorId) {
      return res.status(403).json({
        success: false,
        message: 'Vendor account required',
      });
    }

    const analytics = await vendorAnalyticsService.getInventoryAnalytics(
      vendorId
    );

    res.json({
      success: true,
      data: analytics,
    });
  });

  /**
   * Get review analytics
   * GET /api/vendor-analytics/reviews
   */
  getReviewAnalytics = asyncHandler(async (req: Request, res: Response) => {
    const vendorId = req.user!.vendorId;

    if (!vendorId) {
      return res.status(403).json({
        success: false,
        message: 'Vendor account required',
      });
    }

    const analytics = await vendorAnalyticsService.getReviewAnalytics(vendorId);

    res.json({
      success: true,
      data: analytics,
    });
  });

  /**
   * Get comparative analytics (vs marketplace average)
   * GET /api/vendor-analytics/comparative
   */
  getComparativeAnalytics = asyncHandler(
    async (req: Request, res: Response) => {
      const vendorId = req.user!.vendorId;

      if (!vendorId) {
        return res.status(403).json({
          success: false,
          message: 'Vendor account required',
        });
      }

      const analytics = await vendorAnalyticsService.getComparativeAnalytics(
        vendorId
      );

      res.json({
        success: true,
        data: analytics,
      });
    }
  );

  /**
   * Get performance metrics over time
   * GET /api/vendor-analytics/metrics
   */
  getPerformanceMetrics = asyncHandler(async (req: Request, res: Response) => {
    const vendorId = req.user!.vendorId;
    const { startDate, endDate, metrics } = req.query;

    if (!vendorId) {
      return res.status(403).json({
        success: false,
        message: 'Vendor account required',
      });
    }

    const data = await vendorAnalyticsService.getPerformanceMetrics(
      vendorId,
      startDate ? new Date(startDate as string) : undefined,
      endDate ? new Date(endDate as string) : undefined,
      metrics ? (metrics as string).split(',') : undefined
    );

    res.json({
      success: true,
      data,
    });
  });

  /**
   * Export analytics report
   * GET /api/vendor-analytics/export
   */
  exportReport = asyncHandler(async (req: Request, res: Response) => {
    const vendorId = req.user!.vendorId;
    const { startDate, endDate, format = 'csv' } = req.query;

    if (!vendorId) {
      return res.status(403).json({
        success: false,
        message: 'Vendor account required',
      });
    }

    const report = await vendorAnalyticsService.exportAnalyticsReport(
      vendorId,
      startDate ? new Date(startDate as string) : undefined,
      endDate ? new Date(endDate as string) : undefined,
      format as 'csv' | 'pdf' | 'excel'
    );

    res.json({
      success: true,
      data: report,
    });
  });

  // ============================================
  // ADMIN ENDPOINTS
  // ============================================

  /**
   * Get platform-wide analytics
   * GET /api/vendor-analytics/admin/platform
   */
  getPlatformAnalytics = asyncHandler(async (req: Request, res: Response) => {
    const { startDate, endDate } = req.query;

    const analytics = await vendorAnalyticsService.getPlatformAnalytics(
      startDate ? new Date(startDate as string) : undefined,
      endDate ? new Date(endDate as string) : undefined
    );

    res.json({
      success: true,
      data: analytics,
    });
  });

  /**
   * Get top performing vendors
   * GET /api/vendor-analytics/admin/top-vendors
   */
  getTopVendors = asyncHandler(async (req: Request, res: Response) => {
    const { limit = 10, sortBy = 'revenue', period = 'month' } = req.query;

    const vendors = await vendorAnalyticsService.getTopVendors(
      Number(limit),
      sortBy as 'revenue' | 'orders' | 'rating',
      period as 'week' | 'month' | 'year'
    );

    res.json({
      success: true,
      data: vendors,
    });
  });

  /**
   * Get vendor analytics by ID (admin)
   * GET /api/vendor-analytics/admin/vendor/:vendorId
   */
  getVendorAnalytics = asyncHandler(async (req: Request, res: Response) => {
    const { vendorId } = req.params;
    const { startDate, endDate } = req.query;

    const analytics = await vendorAnalyticsService.getVendorAnalyticsByAdmin(
      vendorId,
      startDate ? new Date(startDate as string) : undefined,
      endDate ? new Date(endDate as string) : undefined
    );

    res.json({
      success: true,
      data: analytics,
    });
  });
}

export default new VendorAnalyticsController();
