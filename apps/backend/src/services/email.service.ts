import { Resend } from 'resend';
import { config } from '@/config/env';
import { logger } from '@/config/logger';

const resend = new Resend(config.resend.apiKey);

interface SendEmailParams {
  to: string | string[];
  subject: string;
  html: string;
  from?: string;
  replyTo?: string;
  cc?: string | string[];
  bcc?: string | string[];
}

export class EmailService {
  /**
   * Send email using Resend
   */
  async sendEmail(params: SendEmailParams) {
    try {
      const { data, error } = await resend.emails.send({
        from: params.from || config.resend.from,
        to: params.to,
        subject: params.subject,
        html: params.html,
        replyTo: params.replyTo,
        cc: params.cc,
        bcc: params.bcc,
      });

      if (error) {
        logger.error('Resend email error:', error);
        throw new Error(`Failed to send email: ${error.message}`);
      }

      logger.info('Email sent successfully:', {
        id: data?.id,
        to: params.to,
        subject: params.subject,
      });

      return data;
    } catch (error) {
      logger.error('Email send error:', error);
      throw error;
    }
  }

  /**
   * Send welcome email to new user
   */
  async sendWelcomeEmail(to: string, userName: string) {
    const subject = 'Welcome to Marketplace!';
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0;">Welcome to Marketplace!</h1>
          </div>
          <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
            <h2 style="color: #333;">Hello ${userName}! 👋</h2>
            <p>Thank you for joining our marketplace community. We're excited to have you here!</p>
            <p>With your account, you can:</p>
            <ul style="line-height: 2;">
              <li>Browse thousands of products from trusted vendors</li>
              <li>Pay securely with M-Pesa</li>
              <li>Track your orders in real-time</li>
              <li>Leave reviews and ratings</li>
            </ul>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${config.app.frontendUrl}" style="background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">Start Shopping</a>
            </div>
            <p style="color: #666; font-size: 14px; margin-top: 30px;">
              If you have any questions, feel free to reach out to our support team.
            </p>
          </div>
          <div style="text-align: center; margin-top: 20px; color: #999; font-size: 12px;">
            <p>© ${new Date().getFullYear()} Marketplace. All rights reserved.</p>
          </div>
        </body>
      </html>
    `;

    return this.sendEmail({ to, subject, html });
  }

  /**
   * Send password reset email
   */
  async sendPasswordResetEmail(to: string, resetToken: string, userName: string) {
    const resetUrl = `${config.app.frontendUrl}/auth/reset-password?token=${resetToken}`;
    const subject = 'Reset Your Password';
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: #f9f9f9; padding: 30px; border-radius: 10px;">
            <h2 style="color: #333;">Password Reset Request</h2>
            <p>Hello ${userName},</p>
            <p>We received a request to reset your password. Click the button below to create a new password:</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${resetUrl}" style="background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">Reset Password</a>
            </div>
            <p style="color: #666; font-size: 14px;">
              This link will expire in 1 hour for security reasons.
            </p>
            <p style="color: #666; font-size: 14px;">
              If you didn't request a password reset, please ignore this email or contact support if you have concerns.
            </p>
          </div>
          <div style="text-align: center; margin-top: 20px; color: #999; font-size: 12px;">
            <p>© ${new Date().getFullYear()} Marketplace. All rights reserved.</p>
          </div>
        </body>
      </html>
    `;

    return this.sendEmail({ to, subject, html });
  }

  /**
   * Send email verification
   */
  async sendVerificationEmail(to: string, verificationToken: string, userName: string) {
    const verifyUrl = `${config.app.frontendUrl}/auth/verify?token=${verificationToken}`;
    const subject = 'Verify Your Email Address';
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: #f9f9f9; padding: 30px; border-radius: 10px;">
            <h2 style="color: #333;">Verify Your Email</h2>
            <p>Hello ${userName},</p>
            <p>Please verify your email address by clicking the button below:</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${verifyUrl}" style="background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">Verify Email</a>
            </div>
            <p style="color: #666; font-size: 14px;">
              This link will expire in 24 hours.
            </p>
          </div>
          <div style="text-align: center; margin-top: 20px; color: #999; font-size: 12px;">
            <p>© ${new Date().getFullYear()} Marketplace. All rights reserved.</p>
          </div>
        </body>
      </html>
    `;

    return this.sendEmail({ to, subject, html });
  }

  /**
   * Send order confirmation email
   */
  async sendOrderConfirmation(
    to: string,
    orderDetails: {
      orderNumber: string;
      customerName: string;
      items: Array<{ name: string; quantity: number; price: number }>;
      total: number;
      shippingAddress: string;
    }
  ) {
    const subject = `Order Confirmation - #${orderDetails.orderNumber}`;
    const itemsHtml = orderDetails.items
      .map(
        (item) => `
      <tr>
        <td style="padding: 10px; border-bottom: 1px solid #eee;">${item.name}</td>
        <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: center;">${item.quantity}</td>
        <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">KES ${item.price.toFixed(2)}</td>
      </tr>
    `
      )
      .join('');

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: #4CAF50; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0;">Order Confirmed! ✅</h1>
          </div>
          <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
            <h2 style="color: #333;">Thank you, ${orderDetails.customerName}!</h2>
            <p>Your order has been confirmed and will be processed shortly.</p>
            <div style="background: white; padding: 20px; border-radius: 5px; margin: 20px 0;">
              <h3 style="margin-top: 0;">Order #${orderDetails.orderNumber}</h3>
              <table style="width: 100%; margin: 20px 0;">
                <thead>
                  <tr style="background: #f5f5f5;">
                    <th style="padding: 10px; text-align: left;">Item</th>
                    <th style="padding: 10px; text-align: center;">Qty</th>
                    <th style="padding: 10px; text-align: right;">Price</th>
                  </tr>
                </thead>
                <tbody>
                  ${itemsHtml}
                </tbody>
                <tfoot>
                  <tr style="font-weight: bold; font-size: 16px;">
                    <td colspan="2" style="padding: 15px 10px; text-align: right;">Total:</td>
                    <td style="padding: 15px 10px; text-align: right;">KES ${orderDetails.total.toFixed(2)}</td>
                  </tr>
                </tfoot>
              </table>
              <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #eee;">
                <h4 style="margin: 0 0 10px 0;">Shipping Address:</h4>
                <p style="margin: 0; color: #666;">${orderDetails.shippingAddress}</p>
              </div>
            </div>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${config.app.frontendUrl}/orders/${orderDetails.orderNumber}" style="background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">Track Order</a>
            </div>
          </div>
          <div style="text-align: center; margin-top: 20px; color: #999; font-size: 12px;">
            <p>© ${new Date().getFullYear()} Marketplace. All rights reserved.</p>
          </div>
        </body>
      </html>
    `;

    return this.sendEmail({ to, subject, html });
  }

  /**
   * Send vendor approval email
   */
  async sendVendorApproval(to: string, vendorName: string, businessName: string) {
    const subject = 'Your Vendor Application has been Approved! 🎉';
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0;">Congratulations! 🎉</h1>
          </div>
          <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
            <h2 style="color: #333;">Hello ${vendorName}!</h2>
            <p>Great news! Your vendor application for <strong>${businessName}</strong> has been approved.</p>
            <p>You can now start selling on our marketplace! Here's what you can do:</p>
            <ul style="line-height: 2;">
              <li>Add your products</li>
              <li>Manage inventory</li>
              <li>Process orders</li>
              <li>Track your sales and earnings</li>
              <li>Receive payouts via M-Pesa</li>
            </ul>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${config.app.frontendUrl}/vendor/dashboard" style="background: #11998e; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">Go to Vendor Dashboard</a>
            </div>
            <p style="color: #666; font-size: 14px;">
              If you have any questions, our support team is here to help you succeed!
            </p>
          </div>
          <div style="text-align: center; margin-top: 20px; color: #999; font-size: 12px;">
            <p>© ${new Date().getFullYear()} Marketplace. All rights reserved.</p>
          </div>
        </body>
      </html>
    `;

    return this.sendEmail({ to, subject, html });
  }
}

export const emailService = new EmailService();
