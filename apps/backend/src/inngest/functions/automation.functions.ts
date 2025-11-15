import { inngest } from '../client';
import loyaltyService from '../../services/loyalty.service';
import escrowService from '../../services/escrow.service';
import vendorAnalyticsService from '../../services/vendor-analytics.service';
import verificationService from '../../services/verification.service';
import notificationService from '../../services/notification.service';
import whatsappService from '../../services/whatsapp.service';
import fraudService from '../../services/fraud.service';
import { prisma } from '../../lib/prisma';

// ============================================
// LOYALTY POINT EXPIRATION (Daily at 2 AM)
// ============================================

export const expireLoyaltyPoints = inngest.createFunction(
  { id: 'expire-loyalty-points', retries: 2 },
  { cron: '0 2 * * *' }, // Every day at 2 AM
  async ({ step }) => {
    await step.run('expire-old-points', async () => {
      await loyaltyService.expireOldPoints();
      return { success: true };
    });
  }
);

// ============================================
// ESCROW AUTO-RELEASE (Every hour)
// ============================================

export const autoReleaseEscrows = inngest.createFunction(
  { id: 'auto-release-escrows', retries: 3 },
  { cron: '0 * * * *' }, // Every hour
  async ({ step }) => {
    const results = await step.run('release-expired-escrows', async () => {
      return await escrowService.autoReleaseExpiredEscrows();
    });

    return { releasedCount: results.filter(r => r.status === 'released').length };
  }
);

// ============================================
// VENDOR ANALYTICS RECORDING (Daily at midnight)
// ============================================

export const recordVendorAnalytics = inngest.createFunction(
  { id: 'record-vendor-analytics', retries: 2 },
  { cron: '0 0 * * *' }, // Every day at midnight
  async ({ step }) => {
    const vendors = await step.run('get-active-vendors', async () => {
      return await prisma.vendor.findMany({
        where: { status: 'APPROVED' },
        select: { id: true },
      });
    });

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    for (const vendor of vendors) {
      await step.run(`record-analytics-${vendor.id}`, async () => {
        await vendorAnalyticsService.recordDailyAnalytics(vendor.id, yesterday);
      });
    }

    return { vendorsProcessed: vendors.length };
  }
);

// ============================================
// VERIFICATION EXPIRY CHECK (Daily)
// ============================================

export const checkVerificationExpiry = inngest.createFunction(
  { id: 'check-verification-expiry', retries: 2 },
  { cron: '0 3 * * *' }, // Every day at 3 AM
  async ({ step }) => {
    const expiring = await step.run('check-expiring-verifications', async () => {
      return await verificationService.checkExpiringVerifications();
    });

    return { expiringCount: expiring.length };
  }
);

// ============================================
// PRICE ALERT CHECKER (Every 6 hours)
// ============================================

export const checkPriceAlerts = inngest.createFunction(
  { id: 'check-price-alerts', retries: 2 },
  { cron: '0 */6 * * *' }, // Every 6 hours
  async ({ step }) => {
    const products = await step.run('get-products-with-price-changes', async () => {
      // Get products updated in last 6 hours
      const sixHoursAgo = new Date(Date.now() - 6 * 60 * 60 * 1000);
      return await prisma.product.findMany({
        where: {
          updatedAt: { gte: sixHoursAgo },
        },
        select: { id: true, price: true },
      });
    });

    for (const product of products) {
      await step.run(`check-alerts-${product.id}`, async () => {
        await notificationService.checkPriceAlerts(product.id, product.price);
      });
    }

    return { productsChecked: products.length };
  }
);

// ============================================
// LOW STOCK ALERTS (Daily at 9 AM)
// ============================================

export const sendLowStockAlerts = inngest.createFunction(
  { id: 'send-low-stock-alerts', retries: 2 },
  { cron: '0 9 * * *' }, // Every day at 9 AM
  async ({ step }) => {
    const lowStockProducts = await step.run('get-low-stock-products', async () => {
      return await prisma.product.findMany({
        where: {
          isActive: true,
          trackInventory: true,
          stock: {
            lte: prisma.product.fields.lowStockThreshold,
          },
        },
        include: {
          vendor: {
            include: {
              user: true,
            },
          },
        },
      });
    });

    for (const product of lowStockProducts) {
      await step.run(`notify-vendor-${product.vendorId}`, async () => {
        await notificationService.notifyLowStock(
          product.vendorId,
          product.id,
          product.stock
        );
      });
    }

    return { alertsSent: lowStockProducts.length };
  }
);

// ============================================
// FRAUD SCORE CLEANUP (Weekly on Sunday at 2 AM)
// ============================================

export const cleanupOldFraudScores = inngest.createFunction(
  { id: 'cleanup-old-fraud-scores', retries: 1 },
  { cron: '0 2 * * 0' }, // Every Sunday at 2 AM
  async ({ step }) => {
    const deleted = await step.run('delete-old-fraud-scores', async () => {
      const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);

      const result = await prisma.fraudScore.deleteMany({
        where: {
          createdAt: { lt: ninetyDaysAgo },
          riskLevel: 'LOW',
        },
      });

      return result.count;
    });

    return { deletedCount: deleted };
  }
);

// ============================================
// CART ABANDONMENT WITH WHATSAPP (Event-based + Cron)
// ============================================

export const trackCartAbandonment = inngest.createFunction(
  { id: 'track-cart-abandonment' },
  { cron: '0 */6 * * *' }, // Every 6 hours
  async ({ step }) => {
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);

    const abandonedCarts = await step.run('find-abandoned-carts', async () => {
      return await prisma.user.findMany({
        where: {
          cart: {
            some: {
              updatedAt: { lt: twoHoursAgo },
            },
          },
        },
        include: {
          cart: {
            include: {
              product: true,
            },
          },
        },
      });
    });

    for (const user of abandonedCarts) {
      // Check if no orders in last 2 hours
      const recentOrder = await prisma.order.findFirst({
        where: {
          userId: user.id,
          createdAt: { gte: twoHoursAgo },
        },
      });

      if (!recentOrder && user.cart.length > 0) {
        await inngest.send({
          name: 'cart/abandoned',
          data: {
            userId: user.id,
            cartItems: user.cart,
          },
        });
      }
    }

    return { cartsFound: abandonedCarts.length };
  }
);

export const sendCartAbandonmentReminder = inngest.createFunction(
  { id: 'send-cart-abandonment-reminder', retries: 2 },
  { event: 'cart/abandoned' },
  async ({ event, step }) => {
    const { userId, cartItems } = event.data;

    // Wait 1 hour before sending
    await step.sleep('wait-1-hour', '1h');

    // Re-check if cart still has items
    const currentCart = await step.run('check-current-cart', async () => {
      return await prisma.cartItem.findMany({
        where: { userId },
        include: { product: true },
      });
    });

    if (currentCart.length === 0) {
      return { sent: false, reason: 'Cart is empty' };
    }

    // Send WhatsApp reminder
    await step.run('send-whatsapp-reminder', async () => {
      await whatsappService.sendCartAbandonmentReminder(userId, currentCart);
    });

    // Send email reminder
    await step.run('send-email-reminder', async () => {
      await notificationService.sendNotification(
        userId,
        'PROMOTION',
        'Items waiting in your cart',
        `You have ${currentCart.length} items in your cart. Complete your purchase now!`,
        { cartItems: currentCart },
        '/checkout'
      );
    });

    return { sent: true, itemsInCart: currentCart.length };
  }
);

// ============================================
// AFFILIATE COMMISSION AUTO-APPROVAL (Daily)
// ============================================

export const autoApproveCommissions = inngest.createFunction(
  { id: 'auto-approve-commissions', retries: 2 },
  { cron: '0 4 * * *' }, // Every day at 4 AM
  async ({ step }) => {
    // Auto-approve commissions for orders delivered 7+ days ago
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const approved = await step.run('approve-eligible-commissions', async () => {
      const commissions = await prisma.affiliateCommission.findMany({
        where: {
          status: 'PENDING',
          order: {
            status: 'DELIVERED',
            deliveredAt: { lte: sevenDaysAgo },
          },
        },
      });

      await prisma.affiliateCommission.updateMany({
        where: {
          id: { in: commissions.map(c => c.id) },
        },
        data: { status: 'APPROVED' },
      });

      return commissions.length;
    });

    return { approvedCount: approved };
  }
);
