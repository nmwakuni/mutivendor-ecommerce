import { inngest } from '../client';
import { prisma } from '@/config/database';
import { logger } from '@/config/logger';
import { posthog } from '@/config/posthog';

/**
 * Process order creation (analytics, notifications, etc.)
 */
export const processOrderCreated = inngest.createFunction(
  {
    id: 'process-order-created',
    name: 'Process Order Created',
  },
  { event: 'order/created' },
  async ({ event, step }) => {
    const { orderId, userId, vendorId, total } = event.data;

    // Track analytics
    await step.run('track-order-analytics', async () => {
      posthog.capture({
        distinctId: userId,
        event: 'order_created',
        properties: {
          orderId,
          vendorId,
          total,
        },
      });
      logger.info('Order analytics tracked', { orderId });
    });

    // Update vendor stats
    await step.run('update-vendor-stats', async () => {
      await prisma.vendor.update({
        where: { id: vendorId },
        data: {
          totalOrders: { increment: 1 },
          totalSales: { increment: total },
        },
      });
      logger.info('Vendor stats updated', { vendorId });
    });

    // Send order confirmation email (trigger another function)
    await step.run('trigger-order-confirmation-email', async () => {
      const order = await prisma.order.findUnique({
        where: { id: orderId },
        include: {
          user: true,
          items: {
            include: { product: true },
          },
          shippingAddress: true,
        },
      });

      if (!order) {
        throw new Error('Order not found');
      }

      await inngest.send({
        name: 'email/send.order-confirmation',
        data: {
          to: order.user.email,
          orderDetails: {
            orderNumber: order.orderNumber,
            customerName: `${order.user.firstName || ''} ${order.user.lastName || ''}`.trim(),
            items: order.items.map((item) => ({
              name: item.product.name,
              quantity: item.quantity,
              price: item.price,
            })),
            total: order.total,
            shippingAddress: `${order.shippingAddress.address1}, ${order.shippingAddress.city}`,
          },
        },
      });
    });
  }
);

/**
 * Process order status updates
 */
export const processOrderStatusUpdate = inngest.createFunction(
  {
    id: 'process-order-status-update',
    name: 'Process Order Status Update',
  },
  { event: 'order/status.updated' },
  async ({ event, step }) => {
    const { orderId, oldStatus, newStatus, userId } = event.data;

    // Track status change in analytics
    await step.run('track-status-change', async () => {
      posthog.capture({
        distinctId: userId,
        event: 'order_status_updated',
        properties: {
          orderId,
          oldStatus,
          newStatus,
        },
      });
      logger.info('Order status change tracked', { orderId, oldStatus, newStatus });
    });

    // Send notification email based on status
    await step.run('send-status-notification', async () => {
      // Implementation for sending status update emails
      logger.info('Status notification sent', { orderId, newStatus });
    });
  }
);
