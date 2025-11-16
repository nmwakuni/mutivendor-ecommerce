# Multi-Vendor Marketplace API Documentation

## 📚 Overview

Complete REST API documentation for the cutting-edge multi-vendor e-commerce marketplace platform.

## 🚀 Quick Start

### Access API Documentation

**Swagger UI (Interactive):**
```
http://localhost:3001/api-docs
```

**OpenAPI JSON Specification:**
```
http://localhost:3001/api-docs.json
```

### Base URL

All API endpoints are prefixed with:
```
http://localhost:3001/api/v1
```

## 🔐 Authentication

Most endpoints require authentication using JWT (JSON Web Tokens).

### How to Authenticate

1. **Login/Register** to get your JWT token
2. **Include the token** in all authenticated requests:

```bash
Authorization: Bearer <your_jwt_token>
```

### Example Request

```bash
curl -H "Authorization: Bearer eyJhbGc..." \
     https://api.marketplace.com/api/v1/loyalty/balance
```

## 📋 API Features

The API provides comprehensive endpoints for:

### Core Features
- ✅ **Authentication & Authorization** - User registration, login, JWT tokens
- ✅ **Product Management** - CRUD operations, search, filtering
- ✅ **Order Processing** - Cart, checkout, order tracking
- ✅ **Payment Integration** - Multiple payment methods
- ✅ **Multi-Vendor Operations** - Vendor registration, product management
- ✅ **Categories & Reviews** - Product organization and ratings

### Advanced Features
- 🎁 **Loyalty & Rewards** - Points system, tiers, redemption
- 💰 **Affiliate Program** - Referral tracking, commission management
- 📹 **Live Shopping** - Live streaming with real-time chat
- 🤖 **AI Chatbot** - Intelligent customer assistance
- 🎉 **Social Shopping** - Gift registries, wishlists, sharing
- 🔒 **Escrow System** - Payment protection, dispute resolution
- ✓ **Vendor Verification** - KYC/KYB verification process
- 🔔 **Smart Notifications** - Multi-channel (Email, SMS, WhatsApp, Push)
- 📊 **Vendor Analytics** - Advanced dashboards, forecasting

## 📂 Endpoint Categories

### 1. **Loyalty & Rewards** (`/loyalty`)
- `GET /loyalty/balance` - Get user's points balance
- `GET /loyalty/rewards` - List available rewards
- `POST /loyalty/rewards/:id/redeem` - Redeem a reward
- `GET /loyalty/transactions` - View points history
- `GET /loyalty/tiers` - View loyalty tiers

**Admin Endpoints:**
- `POST /loyalty/admin/tiers` - Create loyalty tier
- `POST /loyalty/admin/rewards` - Create reward
- `POST /loyalty/admin/award-points` - Award points to user

### 2. **Affiliate Program** (`/affiliates`)
- `POST /affiliates/apply` - Apply to become affiliate
- `GET /affiliates/dashboard` - View affiliate dashboard
- `GET /affiliates/commissions` - View commission earnings
- `POST /affiliates/track-click` - Track affiliate click (public)

**Admin Endpoints:**
- `GET /affiliates/admin/pending` - View pending applications
- `POST /affiliates/admin/:id/approve` - Approve affiliate
- `POST /affiliates/admin/commissions/pay` - Process commission payments

### 3. **Live Streaming** (`/livestreams`)
- `GET /livestreams` - List live streams
- `POST /livestreams/:id/join` - Join a stream
- `POST /livestreams/:id/comments` - Post comment
- `GET /livestreams/:id` - Get stream details

**Vendor Endpoints:**
- `POST /livestreams/create` - Create new stream
- `POST /livestreams/:id/start` - Start streaming
- `POST /livestreams/:id/end` - End stream
- `GET /livestreams/:id/analytics` - View stream analytics

### 4. **Chatbot** (`/chatbot`)
- `POST /chatbot/message` - Send message to AI chatbot
- `GET /chatbot/history` - Get conversation history
- `GET /chatbot/suggestions` - Get suggested questions
- `POST /chatbot/rate/:messageId` - Rate chatbot response

**Admin Endpoints:**
- `GET /chatbot/admin/analytics` - View chatbot analytics
- `GET /chatbot/admin/conversations` - Monitor conversations
- `GET /chatbot/admin/problem-queries` - View problematic queries

### 5. **Social Shopping** (`/social`)

**Gift Registries:**
- `POST /social/registries` - Create gift registry
- `GET /social/registries` - Get my registries
- `GET /social/registries/search` - Search public registries
- `POST /social/registries/:id/products` - Add product to registry
- `POST /social/registries/:id/items/:itemId/purchase` - Mark item as purchased

**Wishlists:**
- `GET /social/wishlist` - Get my wishlist
- `POST /social/wishlist` - Add to wishlist
- `POST /social/wishlist/:id/move-to-cart` - Move to cart

**Sharing:**
- `POST /social/share` - Share product
- `GET /social/products/:id/shares` - Get share count

**Collections:**
- `POST /social/collections` - Create collection
- `POST /social/collections/:id/products` - Add product

### 6. **Escrow & Disputes** (`/escrow`)
- `GET /escrow/order/:orderId` - Get escrow details
- `POST /escrow/:id/release` - Release payment to vendor
- `POST /escrow/:id/refund` - Request refund
- `POST /escrow/disputes` - Raise dispute
- `POST /escrow/disputes/:id/evidence` - Add evidence

**Admin Endpoints:**
- `GET /escrow/admin/disputes` - View all disputes
- `POST /escrow/admin/disputes/:id/resolve` - Resolve dispute
- `GET /escrow/admin/analytics` - Escrow analytics

### 7. **Vendor Verification** (`/verification`)
- `POST /verification/submit` - Submit verification request
- `GET /verification/status` - Check verification status
- `POST /verification/documents` - Upload document
- `GET /verification/requirements` - Get requirements

**Admin Endpoints:**
- `GET /verification/admin/pending` - View pending verifications
- `POST /verification/admin/:id/approve` - Approve verification
- `POST /verification/admin/:id/reject` - Reject verification
- `POST /verification/admin/:id/revoke` - Revoke verification

### 8. **Notifications** (`/notifications`)
- `GET /notifications` - Get notifications (paginated)
- `GET /notifications/unread-count` - Get unread count
- `PUT /notifications/:id/read` - Mark as read
- `PUT /notifications/read-all` - Mark all as read

**Preferences:**
- `GET /notifications/preferences` - Get preferences
- `PUT /notifications/preferences` - Update preferences

**Price Alerts:**
- `POST /notifications/price-alerts` - Create price alert
- `GET /notifications/price-alerts` - Get my price alerts
- `DELETE /notifications/price-alerts/:id` - Delete alert

**Device Registration:**
- `POST /notifications/devices` - Register device for push
- `DELETE /notifications/devices/:token` - Unregister device

**Admin Endpoints:**
- `POST /notifications/admin/send` - Send notification
- `POST /notifications/admin/broadcast` - Broadcast to all

### 9. **Vendor Analytics** (`/vendor-analytics`)
- `GET /vendor-analytics/dashboard` - Dashboard overview
- `GET /vendor-analytics/sales` - Sales analytics
- `GET /vendor-analytics/forecast` - Revenue forecast (AI-powered)
- `GET /vendor-analytics/products` - Product performance
- `GET /vendor-analytics/customers` - Customer analytics
- `GET /vendor-analytics/traffic` - Traffic analytics
- `GET /vendor-analytics/inventory` - Inventory analytics
- `GET /vendor-analytics/export` - Export report (CSV/PDF/Excel)

**Admin Endpoints:**
- `GET /vendor-analytics/admin/platform` - Platform-wide analytics
- `GET /vendor-analytics/admin/top-vendors` - Top performing vendors

## 🔑 Role-Based Access Control

The API implements role-based authorization:

### Roles
- **CUSTOMER** - Regular users
- **VENDOR** - Sellers/merchants
- **ADMIN** - Platform administrators

### Access Rules
- Most endpoints require authentication
- Some endpoints are public (e.g., product browsing, stream viewing)
- Vendor-only endpoints require VENDOR role
- Admin endpoints require ADMIN role

## 📄 Request/Response Format

### Standard Success Response
```json
{
  "success": true,
  "data": { ... },
  "message": "Operation successful"
}
```

### Standard Error Response
```json
{
  "success": false,
  "message": "Error description",
  "errors": [...]
}
```

## 📊 Pagination

List endpoints support pagination:

**Query Parameters:**
- `page` - Page number (default: 1)
- `limit` - Items per page (default: 20, max: 100)

**Example:**
```
GET /notifications?page=2&limit=50
```

## ⚡ Rate Limiting

API requests are rate-limited to prevent abuse:
- Standard endpoints: 100 requests per 15 minutes
- Auth endpoints: 5 requests per 15 minutes
- May vary by endpoint

## 🛠️ Development Tools

### Swagger UI
Interactive API explorer with:
- Try it out functionality
- Request/response examples
- Schema validation
- Authentication testing

Access at: `http://localhost:3001/api-docs`

### OpenAPI Specification
Download the complete OpenAPI 3.0 spec:
```
GET /api-docs.json
```

Import into tools like:
- Postman
- Insomnia
- Swagger Editor
- OpenAPI Generator

## 📝 Code Examples

### JavaScript/Node.js
```javascript
const response = await fetch('http://localhost:3001/api/v1/loyalty/balance', {
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
});
const data = await response.json();
```

### Python
```python
import requests

headers = {
    'Authorization': f'Bearer {token}',
    'Content-Type': 'application/json'
}

response = requests.get(
    'http://localhost:3001/api/v1/loyalty/balance',
    headers=headers
)
data = response.json()
```

### cURL
```bash
curl -X GET \
  http://localhost:3001/api/v1/loyalty/balance \
  -H 'Authorization: Bearer YOUR_TOKEN' \
  -H 'Content-Type: application/json'
```

## 🐛 Error Codes

| Code | Description |
|------|-------------|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request (validation error) |
| 401 | Unauthorized (missing/invalid token) |
| 403 | Forbidden (insufficient permissions) |
| 404 | Not Found |
| 429 | Too Many Requests (rate limited) |
| 500 | Internal Server Error |

## 🆘 Support

For API support:
- View interactive docs: `/api-docs`
- Check codebase: `apps/backend/src/routes/`
- Review validation schemas: `apps/backend/src/validations/`

## 📦 Total Endpoints

**150+ REST API endpoints** across all features!

- Loyalty & Rewards: 16 endpoints
- Affiliates: 14 endpoints
- Live Streaming: 13 endpoints
- Chatbot: 9 endpoints
- Social Shopping: 18 endpoints
- Escrow & Disputes: 16 endpoints
- Verification: 15 endpoints
- Notifications: 17 endpoints
- Vendor Analytics: 16 endpoints
- Plus core features (auth, products, orders, etc.)

---

**Built with:** Express.js, TypeScript, Prisma, PostgreSQL, Redis, Zod, Swagger/OpenAPI
