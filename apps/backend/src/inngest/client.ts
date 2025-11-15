import { Inngest, EventSchemas } from 'inngest';

// Define event schemas for type safety
type Events = {
  // Email events
  'email/send.welcome': {
    data: {
      to: string;
      userName: string;
    };
  };
  'email/send.password-reset': {
    data: {
      to: string;
      userName: string;
      resetToken: string;
    };
  };
  'email/send.verification': {
    data: {
      to: string;
      userName: string;
      verificationToken: string;
    };
  };
  'email/send.order-confirmation': {
    data: {
      to: string;
      orderDetails: {
        orderNumber: string;
        customerName: string;
        items: Array<{ name: string; quantity: number; price: number }>;
        total: number;
        shippingAddress: string;
      };
    };
  };
  'email/send.vendor-approval': {
    data: {
      to: string;
      vendorName: string;
      businessName: string;
    };
  };

  // M-Pesa events
  'mpesa/payment.received': {
    data: {
      orderId: string;
      mpesaReceiptNumber: string;
      phoneNumber: string;
      amount: number;
      transactionDate: string;
    };
  };
  'mpesa/payment.failed': {
    data: {
      orderId: string;
      phoneNumber: string;
      errorMessage: string;
    };
  };

  // Order events
  'order/created': {
    data: {
      orderId: string;
      userId: string;
      vendorId: string;
      total: number;
    };
  };
  'order/status.updated': {
    data: {
      orderId: string;
      oldStatus: string;
      newStatus: string;
      userId: string;
    };
  };

  // Inventory events
  'inventory/low-stock': {
    data: {
      productId: string;
      vendorId: string;
      currentStock: number;
      threshold: number;
    };
  };
  'inventory/update': {
    data: {
      productId: string;
      quantity: number;
      type: 'PURCHASE' | 'SALE' | 'ADJUSTMENT' | 'RETURN';
    };
  };

  // Vendor events
  'vendor/payout.process': {
    data: {
      vendorId: string;
      amount: number;
      periodStart: string;
      periodEnd: string;
      orderCount: number;
    };
  };
  'vendor/approved': {
    data: {
      vendorId: string;
      userId: string;
    };
  };

  // Analytics events
  'analytics/product.viewed': {
    data: {
      productId: string;
      userId?: string;
      timestamp: string;
    };
  };
};

// Create typed Inngest client
export const inngest = new Inngest({
  id: 'marketplace',
  schemas: new EventSchemas().fromRecord<Events>(),
});
