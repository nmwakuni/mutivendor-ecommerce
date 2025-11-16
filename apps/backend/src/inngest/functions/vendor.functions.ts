import { inngest } from '../client';
import { prisma } from '@/config/database';
import { mpesaService } from '@/services/mpesa.service';
import { logger } from '@/config/logger';

/**
 * Process vendor payout via M-Pesa B2C
 */
export const processVendorPayout = inngest.createFunction(
  {
    id: 'process-vendor-payout',
    name: 'Process Vendor Payout',
    retries: 3,
  },
  { event: 'vendor/payout.process' },
  async ({ event, step }) => {
    const { vendorId, amount, periodStart, periodEnd, orderCount } = event.data;

    const vendor = await step.run('get-vendor-details', async () => {
      return await prisma.vendor.findUnique({
        where: { id: vendorId },
        include: { user: true },
      });
    });

    if (!vendor) {
      throw new Error('Vendor not found');
    }

    // Create payout record
    const payout = await step.run('create-payout-record', async () => {
      return await prisma.payout.create({
        data: {
          vendorId,
          amount,
          periodStart: new Date(periodStart),
          periodEnd: new Date(periodEnd),
          orderCount,
          bankName: vendor.bankName || 'M-Pesa',
          accountNumber: vendor.accountNumber || vendor.user.phone || '',
          accountName: vendor.accountName || vendor.businessName,
          phoneNumber: vendor.user.phone,
          status: 'PENDING',
        },
      });
    });

    // Process M-Pesa B2C payment
    await step.run('process-mpesa-b2c', async () => {
      if (!vendor.user.phone) {
        throw new Error('Vendor phone number not found');
      }

      try {
        const result = await mpesaService.b2c({
          phoneNumber: vendor.user.phone,
          amount,
          remarks: `Payout for ${orderCount} orders`,
          occasion: 'Vendor Payout',
        });

        // Update payout with M-Pesa transaction ID
        await prisma.payout.update({
          where: { id: payout.id },
          data: {
            status: 'COMPLETED',
            paidAt: new Date(),
            // mpesaTransactionId will be updated from callback
          },
        });

        logger.info('Vendor payout processed', { vendorId, payoutId: payout.id, amount });
      } catch (error) {
        await prisma.payout.update({
          where: { id: payout.id },
          data: { status: 'FAILED' },
        });
        throw error;
      }
    });
  }
);

/**
 * Handle vendor approval
 */
export const handleVendorApproval = inngest.createFunction(
  {
    id: 'handle-vendor-approval',
    name: 'Handle Vendor Approval',
  },
  { event: 'vendor/approved' },
  async ({ event, step }) => {
    const { vendorId, userId } = event.data;

    const vendor = await step.run('get-vendor-details', async () => {
      return await prisma.vendor.findUnique({
        where: { id: vendorId },
        include: { user: true },
      });
    });

    if (!vendor) {
      throw new Error('Vendor not found');
    }

    // Send approval email
    await step.run('send-approval-email', async () => {
      await inngest.send({
        name: 'email/send.vendor-approval',
        data: {
          to: vendor.user.email,
          vendorName: `${vendor.user.firstName || ''} ${vendor.user.lastName || ''}`.trim(),
          businessName: vendor.businessName,
        },
      });
    });
  }
);
