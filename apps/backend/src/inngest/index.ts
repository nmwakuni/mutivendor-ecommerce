import { serve } from 'inngest/express';
import { inngest } from './client';

// Import all functions
import {
  sendWelcomeEmail,
  sendPasswordResetEmail,
  sendVerificationEmail,
  sendOrderConfirmationEmail,
  sendVendorApprovalEmail,
} from './functions/email.functions';

import { processMpesaPayment, processMpesaPaymentFailed } from './functions/mpesa.functions';

import { processOrderCreated, processOrderStatusUpdate } from './functions/order.functions';

import { alertLowStock, processInventoryUpdate } from './functions/inventory.functions';

import { processVendorPayout, handleVendorApproval } from './functions/vendor.functions';

// Export all functions
export const functions = [
  // Email functions
  sendWelcomeEmail,
  sendPasswordResetEmail,
  sendVerificationEmail,
  sendOrderConfirmationEmail,
  sendVendorApprovalEmail,

  // M-Pesa functions
  processMpesaPayment,
  processMpesaPaymentFailed,

  // Order functions
  processOrderCreated,
  processOrderStatusUpdate,

  // Inventory functions
  alertLowStock,
  processInventoryUpdate,

  // Vendor functions
  processVendorPayout,
  handleVendorApproval,
];

// Create Inngest serve handler for Express
export const inngestHandler = serve({
  client: inngest,
  functions,
});

export { inngest };
