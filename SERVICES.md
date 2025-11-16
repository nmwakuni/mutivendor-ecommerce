# Services Integration Guide

This document explains the third-party services integrated into the marketplace and how to use them.

## ImageKit - File Uploads & CDN

### Overview
ImageKit provides real-time image optimization, transformation, and CDN delivery. Perfect for product images, avatars, and vendor assets.

### Setup
1. Sign up at [ImageKit.io](https://imagekit.io/)
2. Get your credentials from the dashboard:
   - Public Key
   - Private Key
   - URL Endpoint
3. Add to `.env`:
```env
IMAGEKIT_PUBLIC_KEY=your-public-key
IMAGEKIT_PRIVATE_KEY=your-private-key
IMAGEKIT_URL_ENDPOINT=https://ik.imagekit.io/your-id
```

### Usage

```typescript
import { imagekitService } from '@/services/imagekit.service';

// Upload product image
const result = await imagekitService.uploadProductImage({
  file: buffer, // or base64 string
  fileName: 'product-123.jpg',
  productId: 'prod_123',
});

// Get optimized thumbnail URL
const thumbnailUrl = imagekitService.getProductThumbnail(
  result.filePath,
  300 // size in pixels
);

// Delete image
await imagekitService.delete(result.fileId);
```

### Features
- **Automatic optimization**: WebP conversion, quality adjustment
- **Real-time transformations**: Resize, crop, format conversion
- **CDN delivery**: Fast global content delivery
- **Folder organization**: Products, avatars, vendors
- **Bulk operations**: Delete multiple files at once

## Resend - Email Service

### Overview
Modern email API with excellent developer experience. Handles all transactional emails.

### Setup
1. Sign up at [Resend.com](https://resend.com/)
2. Verify your domain (or use sandbox for testing)
3. Get API key from dashboard
4. Add to `.env`:
```env
RESEND_API_KEY=re_your-api-key
EMAIL_FROM=noreply@yourdomain.com
```

### Usage

```typescript
import { emailService } from '@/services/email.service';

// Send welcome email
await emailService.sendWelcomeEmail(
  'user@example.com',
  'John Doe'
);

// Send password reset
await emailService.sendPasswordResetEmail(
  'user@example.com',
  resetToken,
  'John Doe'
);

// Send order confirmation
await emailService.sendOrderConfirmation(
  'user@example.com',
  {
    orderNumber: 'ORD-12345',
    customerName: 'John Doe',
    items: [{ name: 'Product', quantity: 1, price: 1000 }],
    total: 1000,
    shippingAddress: 'Nairobi, Kenya',
  }
);
```

### Pre-built Email Templates
- ✅ Welcome email
- ✅ Password reset
- ✅ Email verification
- ✅ Order confirmation
- ✅ Vendor approval
- 📝 Order status updates (implement as needed)
- 📝 Shipping notifications (implement as needed)

## Inngest - Background Jobs & Workflows

### Overview
Inngest handles asynchronous tasks, retries, and complex workflows. Critical for reliable marketplace operations.

### Setup
1. Sign up at [Inngest.com](https://www.inngest.com/)
2. Create a new app
3. Get your keys from dashboard
4. Add to `.env`:
```env
INNGEST_EVENT_KEY=your-event-key
INNGEST_SIGNING_KEY=your-signing-key
```

### Usage

```typescript
import { inngest } from '@/inngest/client';

// Send an event (triggers background function)
await inngest.send({
  name: 'email/send.welcome',
  data: {
    to: 'user@example.com',
    userName: 'John Doe',
  },
});

// Events are processed automatically by registered functions
```

### Background Functions

#### Email Functions
- `email/send.welcome` - Send welcome email to new users
- `email/send.password-reset` - Send password reset email
- `email/send.verification` - Send email verification
- `email/send.order-confirmation` - Send order confirmation
- `email/send.vendor-approval` - Send vendor approval notification

#### M-Pesa Functions
- `mpesa/payment.received` - Process successful M-Pesa payment
  - Updates payment record
  - Confirms order
  - Deducts inventory
  - Triggers order created event
- `mpesa/payment.failed` - Handle failed payment
  - Updates payment status
  - Cancels order
  - Sends notification

#### Order Functions
- `order/created` - Process new order
  - Track analytics
  - Update vendor stats
  - Send confirmation email
- `order/status.updated` - Handle status changes
  - Track in analytics
  - Send status notifications

#### Inventory Functions
- `inventory/low-stock` - Alert vendor of low stock
- `inventory/update` - Process inventory changes
  - Update stock levels
  - Create audit logs
  - Trigger low stock alerts

#### Vendor Functions
- `vendor/payout.process` - Process vendor payouts via M-Pesa B2C
  - Create payout record
  - Send M-Pesa B2C payment
  - Update payout status
- `vendor/approved` - Handle vendor approval
  - Send approval email
  - Track in analytics

### Why Inngest?

**Reliability**
- Automatic retries with exponential backoff
- Dead letter queue for failed jobs
- Guaranteed execution

**Observability**
- View all function runs in dashboard
- Debug with full execution logs
- Track success/failure rates

**Scalability**
- Handles high volume of events
- Parallel execution
- No infrastructure management

### Example Workflows

#### M-Pesa Payment Flow
```
Customer pays → M-Pesa callback → Trigger event
  ↓
mpesa/payment.received function:
  1. Update payment record
  2. Confirm order
  3. Deduct inventory
  4. Trigger order/created
  ↓
order/created function:
  1. Track analytics
  2. Update vendor stats
  3. Send confirmation email
```

#### Vendor Payout Flow
```
Admin triggers payout → vendor/payout.process
  ↓
  1. Create payout record
  2. Call M-Pesa B2C API
  3. Wait for callback
  4. Update payout status
  5. Send notification
```

## M-Pesa Daraja API

### Overview
Safaricom's M-Pesa API for mobile money payments in Kenya.

### Setup
1. Register at [Daraja Portal](https://developer.safaricom.co.ke/)
2. Create an app (sandbox or production)
3. Get credentials
4. Add to `.env`:
```env
MPESA_CONSUMER_KEY=your-consumer-key
MPESA_CONSUMER_SECRET=your-consumer-secret
MPESA_SHORTCODE=174379
MPESA_PASSKEY=your-passkey
MPESA_CALLBACK_URL=https://your-domain.com/api/v1/payments/mpesa/callback
MPESA_ENVIRONMENT=sandbox # or production
```

### Features Implemented

**STK Push (Customer Payments)**
```typescript
import { mpesaService } from '@/services/mpesa.service';

const result = await mpesaService.stkPush({
  phoneNumber: '254712345678',
  amount: 1000,
  accountReference: 'ORD-12345',
  transactionDesc: 'Payment for Order #12345',
});
```

**B2C (Vendor Payouts)**
```typescript
await mpesaService.b2c({
  phoneNumber: '254712345678',
  amount: 5000,
  remarks: 'Vendor payout for 10 orders',
  occasion: 'Payout',
});
```

**Query Transaction Status**
```typescript
const status = await mpesaService.queryStkPush(checkoutRequestId);
```

### Callbacks
M-Pesa callbacks are handled by Inngest:
- Successful payments trigger `mpesa/payment.received`
- Failed payments trigger `mpesa/payment.failed`

## Integration Checklist

### Production Deployment

**ImageKit**
- [ ] Create production account
- [ ] Verify domain
- [ ] Set up folder structure
- [ ] Configure transformations
- [ ] Test image upload/delete
- [ ] Set up CDN caching rules

**Resend**
- [ ] Create production account
- [ ] Verify sending domain
- [ ] Set up SPF/DKIM/DMARC
- [ ] Test all email templates
- [ ] Set up webhooks (optional)
- [ ] Monitor delivery rates

**Inngest**
- [ ] Create production app
- [ ] Deploy functions
- [ ] Set up monitoring
- [ ] Configure retry policies
- [ ] Test critical workflows
- [ ] Set up alerts

**M-Pesa**
- [ ] Move to production environment
- [ ] Get production credentials
- [ ] Test with real transactions
- [ ] Set up Go Live paperwork
- [ ] Configure callback URLs
- [ ] Monitor transaction success rates

## Monitoring & Debugging

### ImageKit
- Dashboard: View usage, bandwidth, transformations
- Logs: Check upload/delete operations
- Analytics: Track popular images

### Resend
- Dashboard: View sent emails, delivery rates
- Logs: Check individual email status
- Webhooks: Get real-time delivery events

### Inngest
- Dashboard: View all function runs
- Logs: Debug with full execution traces
- Metrics: Track success/failure rates
- Alerts: Get notified of failures

### M-Pesa
- Daraja Portal: Check API usage
- Logs: Monitor webhook calls
- Status Queries: Verify transaction status

## Cost Estimates

### ImageKit
- **Free tier**: 20 GB bandwidth, 20 GB storage
- **Startup**: $49/month - 100 GB bandwidth
- **Growth**: $99/month - 500 GB bandwidth

### Resend
- **Free tier**: 3,000 emails/month
- **Pro**: $20/month - 50,000 emails/month
- **Scale**: $80/month - 500,000 emails/month

### Inngest
- **Free tier**: 50,000 function runs/month
- **Pro**: $20/month - 500,000 runs/month
- **Enterprise**: Custom pricing

### M-Pesa
- **Transaction fees**: 1.5% - 3% per transaction
- **No setup fees** for C2B
- **B2C fees**: KES 33 per transaction

## Best Practices

### ImageKit
- Use unique file names to prevent conflicts
- Organize files in logical folders
- Delete unused images to save costs
- Use transformations for different sizes
- Cache transformed URLs

### Resend
- Use templates for consistency
- Test emails in sandbox first
- Monitor delivery rates
- Handle bounces properly
- Rate limit email sending

### Inngest
- Keep functions idempotent
- Use steps for long-running tasks
- Add proper error handling
- Monitor function performance
- Set appropriate retry limits

### M-Pesa
- Always validate callback signatures
- Store transaction IDs
- Handle duplicate callbacks
- Test in sandbox thoroughly
- Monitor transaction failures

## Troubleshooting

### ImageKit
**Issue**: Upload fails
- Check API credentials
- Verify file size limits
- Check network connectivity

### Resend
**Issue**: Emails not delivered
- Verify domain SPF/DKIM
- Check spam folders
- Validate email addresses
- Review Resend logs

### Inngest
**Issue**: Function not triggered
- Check event name spelling
- Verify Inngest keys
- Check function registration
- Review Inngest dashboard

### M-Pesa
**Issue**: Payment fails
- Verify credentials
- Check phone number format
- Ensure sufficient balance
- Review Daraja logs

---

For detailed API documentation, refer to each service's official docs.
