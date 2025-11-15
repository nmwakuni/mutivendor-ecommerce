import { inngest } from '../client';
import { emailService } from '../../services/email.service';
import { prisma } from '../../config/database';
import { logger } from '../../config/logger';

// Send welcome email on registration
export const sendWelcomeEmail = inngest.createFunction(
  {
    id: 'send-welcome-email',
    name: 'Send Welcome Email',
    retries: 3,
  },
  { event: 'user/registered' },
  async ({ event }) => {
    const { userId, email, firstName } = event.data;

    try {
      await emailService.sendWelcomeEmail(email, firstName || 'Customer');

      logger.info(`Welcome email sent to user ${userId}`);

      return { success: true, userId };
    } catch (error) {
      logger.error(`Failed to send welcome email to user ${userId}:`, error);
      throw error;
    }
  }
);

// Send cart abandonment reminder
export const sendCartAbandonmentReminder = inngest.createFunction(
  {
    id: 'send-cart-abandonment-reminder',
    name: 'Send Cart Abandonment Reminder',
    retries: 2,
  },
  { event: 'cart/abandoned' },
  async ({ event, step }) => {
    const { userId } = event.data;

    // Wait 1 hour before sending first reminder
    await step.sleep('wait-1-hour', '1h');

    // Check if cart still has items and user hasn't placed an order
    const cartItems = await step.run('check-cart-items', async () => {
      return prisma.cartItem.findMany({
        where: { userId },
        include: {
          product: {
            select: {
              name: true,
              price: true,
              thumbnail: true,
            },
          },
        },
      });
    });

    if (cartItems.length === 0) {
      logger.info(`Cart empty for user ${userId}, skipping reminder`);
      return { success: false, reason: 'Cart empty' };
    }

    // Check if user has placed an order in the last hour
    const recentOrder = await step.run('check-recent-order', async () => {
      return prisma.order.findFirst({
        where: {
          userId,
          createdAt: {
            gte: new Date(Date.now() - 60 * 60 * 1000),
          },
        },
      });
    });

    if (recentOrder) {
      logger.info(`User ${userId} placed an order, skipping reminder`);
      return { success: false, reason: 'Order placed' };
    }

    // Get user email
    const user = await step.run('get-user', async () => {
      return prisma.user.findUnique({
        where: { id: userId },
        select: {
          email: true,
          firstName: true,
          lastName: true,
        },
      });
    });

    if (!user) {
      logger.error(`User ${userId} not found`);
      return { success: false, reason: 'User not found' };
    }

    // Send reminder email
    await step.run('send-reminder-email', async () => {
      const items = cartItems.map((item) => ({
        name: item.product.name,
        quantity: item.quantity,
        price: item.product.price,
        image: item.product.thumbnail,
      }));

      const total = cartItems.reduce(
        (sum, item) => sum + item.product.price * item.quantity,
        0
      );

      await emailService.sendEmail({
        to: user.email,
        subject: "You left items in your cart! Don't miss out",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Hi ${user.firstName || 'there'},</h2>
            <p>You left ${cartItems.length} item(s) in your cart. Complete your purchase now!</p>

            <div style="margin: 20px 0;">
              ${items
                .map(
                  (item) => `
                <div style="border-bottom: 1px solid #eee; padding: 10px 0;">
                  <p><strong>${item.name}</strong></p>
                  <p>Quantity: ${item.quantity} × KES ${item.price.toLocaleString()}</p>
                </div>
              `
                )
                .join('')}
            </div>

            <p style="font-size: 18px; font-weight: bold;">Total: KES ${total.toLocaleString()}</p>

            <a href="${process.env.FRONTEND_URL}/cart" style="display: inline-block; background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0;">
              Complete Your Purchase
            </a>

            <p style="color: #666; font-size: 14px; margin-top: 30px;">
              This is a one-time reminder about your cart items.
            </p>
          </div>
        `,
      });

      return { success: true };
    });

    logger.info(`Cart abandonment reminder sent to user ${userId}`);

    return { success: true, itemCount: cartItems.length };
  }
);

// Send order confirmation with upsell recommendations
export const sendOrderConfirmationWithRecommendations = inngest.createFunction(
  {
    id: 'send-order-confirmation-with-recommendations',
    name: 'Send Order Confirmation with Product Recommendations',
    retries: 3,
  },
  { event: 'order/confirmed' },
  async ({ event, step }) => {
    const { orderId } = event.data;

    // Get order details
    const order = await step.run('get-order', async () => {
      return prisma.order.findUnique({
        where: { id: orderId },
        include: {
          user: true,
          items: {
            include: {
              product: {
                include: {
                  category: true,
                },
              },
            },
          },
          shippingAddress: true,
        },
      });
    });

    if (!order) {
      logger.error(`Order ${orderId} not found`);
      return { success: false };
    }

    // Get product recommendations based on purchased items
    const recommendations = await step.run('get-recommendations', async () => {
      const categoryIds = order.items.map((item) => item.product.categoryId);

      return prisma.product.findMany({
        where: {
          categoryId: {
            in: categoryIds,
          },
          id: {
            notIn: order.items.map((item) => item.productId),
          },
          isActive: true,
          stock: {
            gt: 0,
          },
        },
        orderBy: {
          rating: 'desc',
        },
        take: 4,
        select: {
          id: true,
          name: true,
          price: true,
          thumbnail: true,
          rating: true,
        },
      });
    });

    // Send order confirmation email with recommendations
    await step.run('send-confirmation-email', async () => {
      const emailHTML = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Order Confirmed!</h2>
          <p>Hi ${order.user.firstName},</p>
          <p>Thank you for your order! Your order #${order.orderNumber} has been confirmed.</p>

          <h3>Order Details:</h3>
          <div style="background-color: #f9fafb; padding: 15px; border-radius: 6px;">
            ${order.items
              .map(
                (item) => `
              <div style="border-bottom: 1px solid #e5e7eb; padding: 10px 0;">
                <p><strong>${item.product.name}</strong></p>
                <p>Quantity: ${item.quantity} × KES ${item.price.toLocaleString()}</p>
              </div>
            `
              )
              .join('')}
            <p style="font-size: 18px; font-weight: bold; margin-top: 15px;">Total: KES ${order.total.toLocaleString()}</p>
          </div>

          <h3>Shipping Address:</h3>
          <p>
            ${order.shippingAddress.firstName} ${order.shippingAddress.lastName}<br/>
            ${order.shippingAddress.address1}<br/>
            ${order.shippingAddress.city}, ${order.shippingAddress.county}
          </p>

          ${
            recommendations.length > 0
              ? `
          <h3 style="margin-top: 30px;">You Might Also Like:</h3>
          <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; margin-top: 15px;">
            ${recommendations
              .map(
                (product) => `
              <div style="border: 1px solid #e5e7eb; border-radius: 8px; padding: 10px; text-align: center;">
                <img src="${product.thumbnail}" alt="${product.name}" style="width: 100%; height: 150px; object-fit: cover; border-radius: 6px;"/>
                <p style="font-weight: bold; margin: 10px 0 5px;">${product.name}</p>
                <p style="color: #4F46E5; font-size: 16px; font-weight: bold;">KES ${product.price.toLocaleString()}</p>
                <a href="${process.env.FRONTEND_URL}/products/${product.id}" style="display: inline-block; background-color: #4F46E5; color: white; padding: 8px 16px; text-decoration: none; border-radius: 6px; font-size: 14px; margin-top: 5px;">
                  View Product
                </a>
              </div>
            `
              )
              .join('')}
          </div>
          `
              : ''
          }

          <p style="margin-top: 30px;">
            We'll send you tracking information once your order ships.
          </p>

          <p>Thanks for shopping with us!</p>
        </div>
      `;

      await emailService.sendEmail({
        to: order.user.email,
        subject: `Order Confirmation - #${order.orderNumber}`,
        html: emailHTML,
      });
    });

    logger.info(`Order confirmation with recommendations sent for order ${orderId}`);

    return { success: true, recommendationCount: recommendations.length };
  }
);

// Track cart abandonment
export const trackCartAbandonment = inngest.createFunction(
  {
    id: 'track-cart-abandonment',
    name: 'Track Cart Abandonment',
  },
  { cron: '0 */6 * * *' }, // Run every 6 hours
  async ({ step }) => {
    // Find users with cart items who haven't been active in 2 hours
    const cutoffTime = new Date(Date.now() - 2 * 60 * 60 * 1000);

    const abandonedCarts = await step.run('find-abandoned-carts', async () => {
      return prisma.user.findMany({
        where: {
          cart: {
            some: {
              updatedAt: {
                lt: cutoffTime,
              },
            },
          },
        },
        select: {
          id: true,
          email: true,
          cart: {
            select: {
              id: true,
              updatedAt: true,
            },
          },
        },
      });
    });

    // Send cart abandonment events
    const events = abandonedCarts.map((user) =>
      inngest.send({
        name: 'cart/abandoned',
        data: {
          userId: user.id,
          email: user.email,
          cartUpdatedAt: user.cart[0]?.updatedAt.toISOString(),
        },
      })
    );

    await Promise.all(events);

    logger.info(`Tracked ${abandonedCarts.length} abandoned carts`);

    return { abandonedCartCount: abandonedCarts.length };
  }
);
