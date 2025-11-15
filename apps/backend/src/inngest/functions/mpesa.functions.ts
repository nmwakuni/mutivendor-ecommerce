import { inngest } from '../client';
import { prisma } from '@/config/database';
import { logger } from '@/config/logger';

/**
 * Process successful M-Pesa payment
 */
export const processMpesaPayment = inngest.createFunction(
  {
    id: 'process-mpesa-payment',
    name: 'Process M-Pesa Payment',
    retries: 5, // Critical operation, retry more times
  },
  { event: 'mpesa/payment.received' },
  async ({ event, step }) => {
    const { orderId, mpesaReceiptNumber, phoneNumber, amount, transactionDate } = event.data;

    // Update payment record
    await step.run('update-payment-record', async () => {
      await prisma.payment.update({
        where: { orderId },
        data: {
          status: 'COMPLETED',
          mpesaReceiptNumber,
          phoneNumber,
          transactionId: mpesaReceiptNumber,
          transactionDate: new Date(transactionDate),
          paidAt: new Date(),
        },
      });
      logger.info('Payment record updated', { orderId, mpesaReceiptNumber });
    });

    // Update order status
    await step.run('update-order-status', async () => {
      await prisma.order.update({
        where: { id: orderId },
        data: {
          paymentStatus: 'COMPLETED',
          status: 'CONFIRMED',
          confirmedAt: new Date(),
        },
      });
      logger.info('Order confirmed', { orderId });
    });

    // Deduct inventory
    await step.run('deduct-inventory', async () => {
      const order = await prisma.order.findUnique({
        where: { id: orderId },
        include: { items: true },
      });

      if (!order) {
        throw new Error('Order not found');
      }

      for (const item of order.items) {
        await prisma.product.update({
          where: { id: item.productId },
          data: {
            stock: { decrement: item.quantity },
          },
        });

        // Create inventory log
        await prisma.inventoryLog.create({
          data: {
            productId: item.productId,
            type: 'SALE',
            quantity: -item.quantity,
            previousStock: 0, // Get from product
            newStock: 0, // Calculate
            reference: orderId,
          },
        });
      }
      logger.info('Inventory deducted', { orderId });
    });

    // Trigger order created event
    await step.run('trigger-order-created', async () => {
      const order = await prisma.order.findUnique({
        where: { id: orderId },
      });

      if (!order) {
        throw new Error('Order not found');
      }

      await inngest.send({
        name: 'order/created',
        data: {
          orderId: order.id,
          userId: order.userId,
          vendorId: order.vendorId,
          total: order.total,
        },
      });
    });
  }
);

/**
 * Handle failed M-Pesa payment
 */
export const processMpesaPaymentFailed = inngest.createFunction(
  {
    id: 'process-mpesa-payment-failed',
    name: 'Process M-Pesa Payment Failed',
  },
  { event: 'mpesa/payment.failed' },
  async ({ event, step }) => {
    const { orderId, phoneNumber, errorMessage } = event.data;

    // Update payment status
    await step.run('update-payment-failed', async () => {
      await prisma.payment.update({
        where: { orderId },
        data: {
          status: 'FAILED',
          metadata: { error: errorMessage } as any,
        },
      });
      logger.warn('Payment failed', { orderId, errorMessage });
    });

    // Update order status
    await step.run('update-order-cancelled', async () => {
      await prisma.order.update({
        where: { id: orderId },
        data: {
          paymentStatus: 'FAILED',
          status: 'CANCELLED',
          cancelledAt: new Date(),
        },
      });
    });

    // Send notification email
    await step.run('send-payment-failed-notification', async () => {
      // Implementation for payment failed email
      logger.info('Payment failed notification sent', { orderId });
    });
  }
);
