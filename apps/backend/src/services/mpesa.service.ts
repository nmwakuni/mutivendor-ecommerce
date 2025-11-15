import axios from 'axios';
import { config } from '@/config/env';
import { logger } from '@/config/logger';
import { cache } from '@/config/redis';

interface MpesaAuthResponse {
  access_token: string;
  expires_in: string;
}

interface StkPushRequest {
  phoneNumber: string;
  amount: number;
  accountReference: string;
  transactionDesc: string;
}

interface StkPushResponse {
  MerchantRequestID: string;
  CheckoutRequestID: string;
  ResponseCode: string;
  ResponseDescription: string;
  CustomerMessage: string;
}

interface B2CRequest {
  phoneNumber: string;
  amount: number;
  remarks: string;
  occasion?: string;
}

export class MpesaService {
  private baseUrl: string;
  private readonly CACHE_KEY = 'mpesa:access_token';
  private readonly TOKEN_TTL = 3500; // 58 minutes (token valid for 1 hour)

  constructor() {
    this.baseUrl =
      config.mpesa.environment === 'production'
        ? 'https://api.safaricom.co.ke'
        : 'https://sandbox.safaricom.co.ke';
  }

  /**
   * Get M-Pesa access token (cached)
   */
  private async getAccessToken(): Promise<string> {
    // Check cache first
    const cachedToken = await cache.get<string>(this.CACHE_KEY);
    if (cachedToken) {
      return cachedToken;
    }

    try {
      const auth = Buffer.from(
        `${config.mpesa.consumerKey}:${config.mpesa.consumerSecret}`
      ).toString('base64');

      const response = await axios.get<MpesaAuthResponse>(
        `${this.baseUrl}/oauth/v1/generate?grant_type=client_credentials`,
        {
          headers: {
            Authorization: `Basic ${auth}`,
          },
        }
      );

      const token = response.data.access_token;

      // Cache token
      await cache.set(this.CACHE_KEY, token, this.TOKEN_TTL);

      logger.info('M-Pesa access token generated');
      return token;
    } catch (error) {
      logger.error('M-Pesa auth error:', error);
      throw new Error('Failed to authenticate with M-Pesa');
    }
  }

  /**
   * Format phone number to 254XXXXXXXXX
   */
  private formatPhoneNumber(phone: string): string {
    let formatted = phone.replace(/\s+/g, '');

    if (formatted.startsWith('0')) {
      formatted = '254' + formatted.substring(1);
    } else if (formatted.startsWith('+254')) {
      formatted = formatted.substring(1);
    } else if (formatted.startsWith('254')) {
      // Already formatted
    } else {
      formatted = '254' + formatted;
    }

    return formatted;
  }

  /**
   * Generate timestamp in format YYYYMMDDHHmmss
   */
  private generateTimestamp(): string {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hour = String(date.getHours()).padStart(2, '0');
    const minute = String(date.getMinutes()).padStart(2, '0');
    const second = String(date.getSeconds()).padStart(2, '0');

    return `${year}${month}${day}${hour}${minute}${second}`;
  }

  /**
   * Generate password for STK Push
   */
  private generatePassword(timestamp: string): string {
    const data = config.mpesa.shortcode + config.mpesa.passkey + timestamp;
    return Buffer.from(data).toString('base64');
  }

  /**
   * Initiate STK Push
   */
  async stkPush(request: StkPushRequest): Promise<StkPushResponse> {
    try {
      const accessToken = await this.getAccessToken();
      const timestamp = this.generateTimestamp();
      const password = this.generatePassword(timestamp);
      const phoneNumber = this.formatPhoneNumber(request.phoneNumber);

      const payload = {
        BusinessShortCode: config.mpesa.shortcode,
        Password: password,
        Timestamp: timestamp,
        TransactionType: 'CustomerPayBillOnline',
        Amount: Math.round(request.amount),
        PartyA: phoneNumber,
        PartyB: config.mpesa.shortcode,
        PhoneNumber: phoneNumber,
        CallBackURL: config.mpesa.callbackUrl,
        AccountReference: request.accountReference,
        TransactionDesc: request.transactionDesc,
      };

      const response = await axios.post<StkPushResponse>(
        `${this.baseUrl}/mpesa/stkpush/v1/processrequest`,
        payload,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      logger.info('STK Push initiated:', {
        checkoutRequestId: response.data.CheckoutRequestID,
        phoneNumber,
        amount: request.amount,
      });

      return response.data;
    } catch (error) {
      logger.error('STK Push error:', error);
      throw new Error('Failed to initiate M-Pesa payment');
    }
  }

  /**
   * Query STK Push transaction status
   */
  async queryStkPush(checkoutRequestId: string): Promise<unknown> {
    try {
      const accessToken = await this.getAccessToken();
      const timestamp = this.generateTimestamp();
      const password = this.generatePassword(timestamp);

      const payload = {
        BusinessShortCode: config.mpesa.shortcode,
        Password: password,
        Timestamp: timestamp,
        CheckoutRequestID: checkoutRequestId,
      };

      const response = await axios.post(
        `${this.baseUrl}/mpesa/stkpushquery/v1/query`,
        payload,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      return response.data;
    } catch (error) {
      logger.error('STK Push query error:', error);
      throw new Error('Failed to query M-Pesa transaction');
    }
  }

  /**
   * B2C - Send money to customer/vendor (for refunds, payouts)
   */
  async b2c(request: B2CRequest): Promise<unknown> {
    try {
      const accessToken = await this.getAccessToken();
      const phoneNumber = this.formatPhoneNumber(request.phoneNumber);

      const payload = {
        InitiatorName: config.mpesa.shortcode,
        SecurityCredential: '', // You need to generate this from M-Pesa portal
        CommandID: 'BusinessPayment',
        Amount: Math.round(request.amount),
        PartyA: config.mpesa.shortcode,
        PartyB: phoneNumber,
        Remarks: request.remarks,
        QueueTimeOutURL: `${config.app.apiUrl}/api/v1/payments/mpesa/b2c/timeout`,
        ResultURL: `${config.app.apiUrl}/api/v1/payments/mpesa/b2c/result`,
        Occasion: request.occasion || 'Payout',
      };

      const response = await axios.post(`${this.baseUrl}/mpesa/b2c/v1/paymentrequest`, payload, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      logger.info('B2C initiated:', {
        phoneNumber,
        amount: request.amount,
      });

      return response.data;
    } catch (error) {
      logger.error('B2C error:', error);
      throw new Error('Failed to initiate B2C payment');
    }
  }
}

export const mpesaService = new MpesaService();
