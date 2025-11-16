import { Request, Response } from 'express';
import { inngest } from '@/inngest/client';
import { logger } from '@/config/logger';
import { ApiResponseHelper } from '@/utils/response';

export class PaymentController {
  /**
   * M-Pesa callback handler
   */
  async mpesaCallback(req: Request, res: Response) {
    const callbackData = req.body;

    logger.info('M-Pesa callback received', { callbackData });

    try {
      const { Body } = callbackData;
      const { stkCallback } = Body;

      const { ResultCode, ResultDesc, CallbackMetadata } = stkCallback;

      if (ResultCode === 0) {
        // Payment successful
        const metadata = CallbackMetadata.Item;

        const amount = metadata.find((item: any) => item.Name === 'Amount')?.Value;
        const mpesaReceiptNumber = metadata.find((item: any) => item.Name === 'MpesaReceiptNumber')?.Value;
        const transactionDate = metadata.find((item: any) => item.Name === 'TransactionDate')?.Value;
        const phoneNumber = metadata.find((item: any) => item.Name === 'PhoneNumber')?.Value;

        // Find order by phone number or merchant request ID
        // For now, we'll need to implement order lookup
        // Trigger payment received event
        await inngest.send({
          name: 'mpesa/payment.received',
          data: {
            orderId: 'order-id-from-lookup', // TODO: Implement order lookup
            mpesaReceiptNumber: String(mpesaReceiptNumber),
            phoneNumber: String(phoneNumber),
            amount: Number(amount),
            transactionDate: String(transactionDate),
          },
        });

        logger.info('M-Pesa payment successful', {
          mpesaReceiptNumber,
          amount,
        });
      } else {
        // Payment failed
        logger.error('M-Pesa payment failed', {
          ResultCode,
          ResultDesc,
        });

        await inngest.send({
          name: 'mpesa/payment.failed',
          data: {
            orderId: 'order-id-from-lookup', // TODO: Implement order lookup
            phoneNumber: 'phone-from-request',
            errorMessage: ResultDesc,
          },
        });
      }

      // Always respond with 200 to acknowledge receipt
      return res.status(200).json({ ResultCode: 0, ResultDesc: 'Accepted' });
    } catch (error) {
      logger.error('M-Pesa callback processing error', error);
      // Still return 200 to prevent M-Pesa from retrying
      return res.status(200).json({ ResultCode: 0, ResultDesc: 'Accepted' });
    }
  }

  /**
   * M-Pesa timeout handler
   */
  async mpesaTimeout(req: Request, res: Response) {
    logger.warn('M-Pesa timeout', { data: req.body });
    return res.status(200).json({ ResultCode: 0, ResultDesc: 'Accepted' });
  }
}

export const paymentController = new PaymentController();
