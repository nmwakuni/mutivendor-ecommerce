import { prisma } from '../lib/prisma';
import { NotificationType, NotificationChannel } from '@prisma/client';
import { emailService } from './email.service';
import whatsappService from './whatsapp.service';

class NotificationService {
  /**
   * Create and send notification
   */
  async sendNotification(
    userId: string,
    type: NotificationType,
    title: string,
    message: string,
    data?: any,
    actionUrl?: string
  ) {
    // Get user preferences
    const preferences = await this.getUserPreferences(userId);
    const channels = this.getChannelsForType(type, preferences);

    // Create in-app notification
    const notification = await prisma.notification.create({
      data: {
        userId,
        type,
        title,
        message,
        data,
        actionUrl,
        channel: NotificationChannel.IN_APP,
      },
    });

    // Send via other channels based on preferences
    for (const channel of channels) {
      await this.sendViaChannel(userId, channel, title, message, type);
    }

    return notification;
  }

  /**
   * Get user's notification preferences
   */
  async getUserPreferences(userId: string) {
    let preferences = await prisma.notificationPreference.findUnique({
      where: { userId },
    });

    if (!preferences) {
      // Create default preferences
      preferences = await prisma.notificationPreference.create({
        data: { userId },
      });
    }

    return preferences;
  }

  /**
   * Update notification preferences
   */
  async updatePreferences(
    userId: string,
    preferences: Partial<{
      orderUpdates: NotificationChannel[];
      paymentUpdates: NotificationChannel[];
      deliveryUpdates: NotificationChannel[];
      priceDrops: NotificationChannel[];
      backInStock: NotificationChannel[];
      promotions: NotificationChannel[];
      messages: NotificationChannel[];
    }>
  ) {
    const updated = await prisma.notificationPreference.upsert({
      where: { userId },
      create: {
        userId,
        ...preferences,
      },
      update: preferences,
    });

    return updated;
  }

  /**
   * Get user notifications
   */
  async getUserNotifications(userId: string, limit = 50, offset = 0) {
    const notifications = await prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    });

    const unreadCount = await prisma.notification.count({
      where: { userId, isRead: false },
    });

    return { notifications, unreadCount };
  }

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId: string, userId: string) {
    const notification = await prisma.notification.findUnique({
      where: { id: notificationId },
    });

    if (!notification || notification.userId !== userId) {
      return null;
    }

    return await prisma.notification.update({
      where: { id: notificationId },
      data: { isRead: true, readAt: new Date() },
    });
  }

  /**
   * Mark all as read
   */
  async markAllAsRead(userId: string) {
    await prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true, readAt: new Date() },
    });
  }

  /**
   * Delete notification
   */
  async deleteNotification(notificationId: string, userId: string) {
    const notification = await prisma.notification.findUnique({
      where: { id: notificationId },
    });

    if (!notification || notification.userId !== userId) {
      return;
    }

    await prisma.notification.delete({
      where: { id: notificationId },
    });
  }

  // ============================================
  // PRICE ALERTS
  // ============================================

  /**
   * Create price alert
   */
  async createPriceAlert(
    userId: string,
    productId: string,
    targetPrice: number
  ) {
    const product = await prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      throw new Error('Product not found');
    }

    const alert = await prisma.priceAlert.upsert({
      where: {
        userId_productId: {
          userId,
          productId,
        },
      },
      create: {
        userId,
        productId,
        targetPrice,
      },
      update: {
        targetPrice,
        isActive: true,
      },
    });

    return alert;
  }

  /**
   * Check and trigger price alerts
   */
  async checkPriceAlerts(productId: string, newPrice: number) {
    const alerts = await prisma.priceAlert.findMany({
      where: {
        productId,
        isActive: true,
        targetPrice: { gte: newPrice },
        notifiedAt: null,
      },
      include: {
        product: true,
      },
    });

    for (const alert of alerts) {
      await this.sendNotification(
        alert.userId,
        NotificationType.PRICE_DROP,
        'Price Drop Alert!',
        `${alert.product.name} is now KES ${newPrice}! (Target: KES ${alert.targetPrice})`,
        { productId: alert.productId, oldPrice: alert.product.price, newPrice },
        `/products/${alert.product.slug}`
      );

      await prisma.priceAlert.update({
        where: { id: alert.id },
        data: { notifiedAt: new Date(), isActive: false },
      });
    }
  }

  // ============================================
  // STOCK ALERTS
  // ============================================

  /**
   * Create stock alert
   */
  async createStockAlert(userId: string, productId: string) {
    const product = await prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      throw new Error('Product not found');
    }

    const alert = await prisma.stockAlert.upsert({
      where: {
        userId_productId: {
          userId,
          productId,
        },
      },
      create: {
        userId,
        productId,
      },
      update: {
        isActive: true,
        notifiedAt: null,
      },
    });

    return alert;
  }

  /**
   * Check and trigger stock alerts
   */
  async checkStockAlerts(productId: string) {
    const product = await prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product || product.stock <= 0) {
      return;
    }

    const alerts = await prisma.stockAlert.findMany({
      where: {
        productId,
        isActive: true,
        notifiedAt: null,
      },
      include: {
        product: true,
      },
    });

    for (const alert of alerts) {
      await this.sendNotification(
        alert.userId,
        NotificationType.BACK_IN_STOCK,
        'Back in Stock!',
        `${alert.product.name} is now available!`,
        { productId: alert.productId },
        `/products/${alert.product.slug}`
      );

      await whatsappService.sendProductAvailabilityNotification(
        alert.userId,
        alert.product.name
      );

      await prisma.stockAlert.update({
        where: { id: alert.id },
        data: { notifiedAt: new Date(), isActive: false },
      });
    }
  }

  // ============================================
  // ORDER NOTIFICATIONS
  // ============================================

  async notifyOrderUpdate(orderId: string, status: string) {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { user: true },
    });

    if (!order) return;

    let title = '';
    let message = '';

    switch (status) {
      case 'CONFIRMED':
        title = 'Order Confirmed';
        message = `Your order #${order.orderNumber} has been confirmed!`;
        break;
      case 'PROCESSING':
        title = 'Order Processing';
        message = `Your order #${order.orderNumber} is being processed.`;
        break;
      case 'SHIPPED':
        title = 'Order Shipped';
        message = `Your order #${order.orderNumber} has been shipped!`;
        break;
      case 'DELIVERED':
        title = 'Order Delivered';
        message = `Your order #${order.orderNumber} has been delivered!`;
        break;
      case 'CANCELLED':
        title = 'Order Cancelled';
        message = `Your order #${order.orderNumber} has been cancelled.`;
        break;
    }

    await this.sendNotification(
      order.userId,
      NotificationType.ORDER_UPDATE,
      title,
      message,
      { orderId, status },
      `/orders/${order.id}`
    );
  }

  async notifyPaymentReceived(orderId: string) {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { user: true },
    });

    if (!order) return;

    await this.sendNotification(
      order.userId,
      NotificationType.PAYMENT_RECEIVED,
      'Payment Received',
      `Payment of KES ${order.total} received for order #${order.orderNumber}`,
      { orderId },
      `/orders/${order.id}`
    );
  }

  // ============================================
  // VENDOR NOTIFICATIONS
  // ============================================

  async notifyLowStock(vendorId: string, productId: string, stock: number) {
    const vendor = await prisma.vendor.findUnique({
      where: { id: vendorId },
      include: { user: true },
    });

    const product = await prisma.product.findUnique({
      where: { id: productId },
    });

    if (!vendor || !product) return;

    await this.sendNotification(
      vendor.userId,
      NotificationType.LOW_STOCK,
      'Low Stock Alert',
      `${product.name} is running low (${stock} remaining)`,
      { productId, stock },
      `/vendor/products/${product.id}`
    );
  }

  async notifyNewReview(vendorId: string, reviewId: string, productName: string, rating: number) {
    const vendor = await prisma.vendor.findUnique({
      where: { id: vendorId },
      include: { user: true },
    });

    if (!vendor) return;

    await this.sendNotification(
      vendor.userId,
      NotificationType.NEW_REVIEW,
      'New Review',
      `New ${rating}-star review for ${productName}`,
      { reviewId },
      `/vendor/reviews`
    );
  }

  // ============================================
  // HELPERS
  // ============================================

  private getChannelsForType(
    type: NotificationType,
    preferences: any
  ): NotificationChannel[] {
    const mapping: Record<NotificationType, keyof typeof preferences> = {
      ORDER_UPDATE: 'orderUpdates',
      PAYMENT_RECEIVED: 'paymentUpdates',
      DELIVERY_UPDATE: 'deliveryUpdates',
      PRICE_DROP: 'priceDrops',
      BACK_IN_STOCK: 'backInStock',
      NEW_REVIEW: 'orderUpdates',
      LOW_STOCK: 'orderUpdates',
      NEW_MESSAGE: 'messages',
      PROMOTION: 'promotions',
      SYSTEM: 'orderUpdates',
    };

    const key = mapping[type];
    return preferences[key] || [NotificationChannel.IN_APP];
  }

  private async sendViaChannel(
    userId: string,
    channel: NotificationChannel,
    title: string,
    message: string,
    type: NotificationType
  ) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user) return;

      switch (channel) {
        case NotificationChannel.EMAIL:
          if (user.email) {
            await emailService.sendEmail({
              to: user.email,
              subject: title,
              text: message,
              html: `<h2>${title}</h2><p>${message}</p>`,
            });
          }
          break;

        case NotificationChannel.SMS:
          // Integrate with SMS service (Africa's Talking, Twilio, etc.)
          console.log(`SMS to ${user.phone}: ${title} - ${message}`);
          break;

        case NotificationChannel.WHATSAPP:
          if (user.phone) {
            await whatsappService.sendMessage(user.phone, `*${title}*\n\n${message}`);
          }
          break;

        case NotificationChannel.PUSH:
          // Integrate with push notification service (OneSignal, FCM, etc.)
          console.log(`Push to ${userId}: ${title} - ${message}`);
          break;

        case NotificationChannel.IN_APP:
          // Already created in database
          break;
      }
    } catch (error) {
      console.error(`Failed to send via ${channel}:`, error);
    }
  }
}

export default new NotificationService();
