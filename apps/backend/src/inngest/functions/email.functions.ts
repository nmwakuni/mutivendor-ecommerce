import { inngest } from '../client';
import { emailService } from '@/services/email.service';
import { logger } from '@/config/logger';

/**
 * Send welcome email when user registers
 */
export const sendWelcomeEmail = inngest.createFunction(
  {
    id: 'send-welcome-email',
    name: 'Send Welcome Email',
    retries: 3,
  },
  { event: 'email/send.welcome' },
  async ({ event, step }) => {
    return await step.run('send-welcome-email', async () => {
      logger.info('Sending welcome email', { to: event.data.to });
      return await emailService.sendWelcomeEmail(event.data.to, event.data.userName);
    });
  }
);

/**
 * Send password reset email
 */
export const sendPasswordResetEmail = inngest.createFunction(
  {
    id: 'send-password-reset-email',
    name: 'Send Password Reset Email',
    retries: 3,
  },
  { event: 'email/send.password-reset' },
  async ({ event, step }) => {
    return await step.run('send-password-reset-email', async () => {
      logger.info('Sending password reset email', { to: event.data.to });
      return await emailService.sendPasswordResetEmail(
        event.data.to,
        event.data.resetToken,
        event.data.userName
      );
    });
  }
);

/**
 * Send email verification
 */
export const sendVerificationEmail = inngest.createFunction(
  {
    id: 'send-verification-email',
    name: 'Send Email Verification',
    retries: 3,
  },
  { event: 'email/send.verification' },
  async ({ event, step }) => {
    return await step.run('send-verification-email', async () => {
      logger.info('Sending verification email', { to: event.data.to });
      return await emailService.sendVerificationEmail(
        event.data.to,
        event.data.verificationToken,
        event.data.userName
      );
    });
  }
);

/**
 * Send order confirmation email
 */
export const sendOrderConfirmationEmail = inngest.createFunction(
  {
    id: 'send-order-confirmation-email',
    name: 'Send Order Confirmation Email',
    retries: 3,
  },
  { event: 'email/send.order-confirmation' },
  async ({ event, step }) => {
    return await step.run('send-order-confirmation-email', async () => {
      logger.info('Sending order confirmation email', {
        to: event.data.to,
        orderNumber: event.data.orderDetails.orderNumber,
      });
      return await emailService.sendOrderConfirmation(event.data.to, event.data.orderDetails);
    });
  }
);

/**
 * Send vendor approval email
 */
export const sendVendorApprovalEmail = inngest.createFunction(
  {
    id: 'send-vendor-approval-email',
    name: 'Send Vendor Approval Email',
    retries: 3,
  },
  { event: 'email/send.vendor-approval' },
  async ({ event, step }) => {
    return await step.run('send-vendor-approval-email', async () => {
      logger.info('Sending vendor approval email', { to: event.data.to });
      return await emailService.sendVendorApproval(
        event.data.to,
        event.data.vendorName,
        event.data.businessName
      );
    });
  }
);
