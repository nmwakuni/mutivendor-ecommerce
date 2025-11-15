import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import notificationService from '../services/notification.service';
import {
  updateNotificationPreferencesSchema,
  createPriceAlertSchema,
} from '../validations/notification.validation';

class NotificationController {
  // ============================================
  // USER NOTIFICATIONS
  // ============================================

  /**
   * Get user's notifications
   * GET /api/notifications
   */
  getNotifications = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const { page = 1, limit = 20, unreadOnly } = req.query;

    const notifications = await notificationService.getUserNotifications(
      userId,
      {
        page: Number(page),
        limit: Number(limit),
        unreadOnly: unreadOnly === 'true',
      }
    );

    res.json({
      success: true,
      data: notifications,
    });
  });

  /**
   * Get unread notification count
   * GET /api/notifications/unread-count
   */
  getUnreadCount = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;

    const count = await notificationService.getUnreadCount(userId);

    res.json({
      success: true,
      data: { count },
    });
  });

  /**
   * Mark notification as read
   * PUT /api/notifications/:notificationId/read
   */
  markAsRead = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const { notificationId } = req.params;

    await notificationService.markAsRead(userId, notificationId);

    res.json({
      success: true,
      message: 'Notification marked as read',
    });
  });

  /**
   * Mark all notifications as read
   * PUT /api/notifications/read-all
   */
  markAllAsRead = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;

    await notificationService.markAllAsRead(userId);

    res.json({
      success: true,
      message: 'All notifications marked as read',
    });
  });

  /**
   * Delete notification
   * DELETE /api/notifications/:notificationId
   */
  deleteNotification = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const { notificationId } = req.params;

    await notificationService.deleteNotification(userId, notificationId);

    res.json({
      success: true,
      message: 'Notification deleted',
    });
  });

  /**
   * Clear all notifications
   * DELETE /api/notifications/clear-all
   */
  clearAllNotifications = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;

    await notificationService.clearAllNotifications(userId);

    res.json({
      success: true,
      message: 'All notifications cleared',
    });
  });

  // ============================================
  // NOTIFICATION PREFERENCES
  // ============================================

  /**
   * Get notification preferences
   * GET /api/notifications/preferences
   */
  getPreferences = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;

    const preferences = await notificationService.getPreferences(userId);

    res.json({
      success: true,
      data: preferences,
    });
  });

  /**
   * Update notification preferences
   * PUT /api/notifications/preferences
   */
  updatePreferences = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const preferences = updateNotificationPreferencesSchema.parse(req.body);

    const updated = await notificationService.updatePreferences(
      userId,
      preferences
    );

    res.json({
      success: true,
      data: updated,
    });
  });

  // ============================================
  // PRICE ALERTS
  // ============================================

  /**
   * Create price alert
   * POST /api/notifications/price-alerts
   */
  createPriceAlert = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const { productId, targetPrice } = createPriceAlertSchema.parse(req.body);

    const alert = await notificationService.createPriceAlert(
      userId,
      productId,
      targetPrice
    );

    res.status(201).json({
      success: true,
      data: alert,
    });
  });

  /**
   * Get user's price alerts
   * GET /api/notifications/price-alerts
   */
  getPriceAlerts = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const { active } = req.query;

    const alerts = await notificationService.getUserPriceAlerts(
      userId,
      active === 'true'
    );

    res.json({
      success: true,
      data: alerts,
    });
  });

  /**
   * Delete price alert
   * DELETE /api/notifications/price-alerts/:alertId
   */
  deletePriceAlert = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const { alertId } = req.params;

    await notificationService.deletePriceAlert(userId, alertId);

    res.json({
      success: true,
      message: 'Price alert deleted',
    });
  });

  // ============================================
  // PUSH NOTIFICATIONS (DEVICE TOKENS)
  // ============================================

  /**
   * Register device for push notifications
   * POST /api/notifications/devices
   */
  registerDevice = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const { token, platform } = req.body;

    await notificationService.registerDeviceToken(userId, token, platform);

    res.json({
      success: true,
      message: 'Device registered for push notifications',
    });
  });

  /**
   * Unregister device
   * DELETE /api/notifications/devices/:token
   */
  unregisterDevice = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const { token } = req.params;

    await notificationService.unregisterDeviceToken(userId, token);

    res.json({
      success: true,
      message: 'Device unregistered',
    });
  });

  // ============================================
  // ADMIN ENDPOINTS
  // ============================================

  /**
   * Send notification to user(s)
   * POST /api/notifications/admin/send
   */
  sendNotification = asyncHandler(async (req: Request, res: Response) => {
    const {
      userIds,
      type,
      title,
      message,
      data,
      actionUrl,
      sendEmail,
      sendPush,
      sendSMS,
    } = req.body;

    const results = await notificationService.sendBulkNotification(
      userIds,
      type,
      title,
      message,
      data,
      actionUrl,
      { email: sendEmail, push: sendPush, sms: sendSMS }
    );

    res.json({
      success: true,
      data: results,
    });
  });

  /**
   * Send broadcast notification
   * POST /api/notifications/admin/broadcast
   */
  broadcastNotification = asyncHandler(async (req: Request, res: Response) => {
    const { type, title, message, data, actionUrl, channels } = req.body;

    const result = await notificationService.broadcastNotification(
      type,
      title,
      message,
      data,
      actionUrl,
      channels
    );

    res.json({
      success: true,
      data: result,
    });
  });

  /**
   * Get notification analytics
   * GET /api/notifications/admin/analytics
   */
  getAnalytics = asyncHandler(async (req: Request, res: Response) => {
    const { startDate, endDate, type } = req.query;

    const analytics = await notificationService.getNotificationAnalytics(
      startDate ? new Date(startDate as string) : undefined,
      endDate ? new Date(endDate as string) : undefined,
      type as string | undefined
    );

    res.json({
      success: true,
      data: analytics,
    });
  });

  /**
   * Get notification templates
   * GET /api/notifications/admin/templates
   */
  getTemplates = asyncHandler(async (req: Request, res: Response) => {
    const templates = await notificationService.getNotificationTemplates();

    res.json({
      success: true,
      data: templates,
    });
  });

  /**
   * Create notification template
   * POST /api/notifications/admin/templates
   */
  createTemplate = asyncHandler(async (req: Request, res: Response) => {
    const { name, type, title, body, channels } = req.body;

    const template = await notificationService.createNotificationTemplate(
      name,
      type,
      title,
      body,
      channels
    );

    res.status(201).json({
      success: true,
      data: template,
    });
  });
}

export default new NotificationController();
