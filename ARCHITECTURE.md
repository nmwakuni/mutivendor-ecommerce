# Architecture Documentation

## Overview

This is a production-ready, feature-rich multi-vendor marketplace platform designed specifically for East Africa, with deep M-Pesa integration, real-time delivery tracking, and comprehensive vendor management.

## Technology Stack

### Backend
- **Runtime**: Node.js 18+
- **Framework**: Express.js with TypeScript
- **Database**: PostgreSQL with Prisma ORM
- **Cache**: Redis (Upstash)
- **Authentication**: better-auth + JWT
- **Security**: Arcjet (rate limiting, bot protection) + Helmet
- **Monitoring**: Sentry (error tracking) + Winston (logging)
- **Analytics**: PostHog
- **Validation**: Zod

### Frontend
- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: TailwindCSS
- **UI Components**: shadcn/ui (Radix UI primitives)
- **State Management**: Zustand
- **Data Fetching**: TanStack Query (React Query)
- **Forms**: React Hook Form + Zod
- **HTTP Client**: Axios

### Infrastructure
- **Hosting**: AWS / Railway
- **File Storage**: AWS S3
- **Email**: NodeMailer (SMTP)
- **Payments**: M-Pesa Daraja API

## Architecture Patterns

### Backend Architecture

#### Layered Architecture
```
┌─────────────────────────────────────────┐
│            Controllers                   │
│  (Request handling, response formatting) │
└─────────────────┬───────────────────────┘
                  │
┌─────────────────▼───────────────────────┐
│            Services                      │
│     (Business logic, orchestration)      │
└─────────────────┬───────────────────────┘
                  │
┌─────────────────▼───────────────────────┐
│         Prisma Client                    │
│      (Database access layer)             │
└─────────────────────────────────────────┘
```

#### Key Directories
- **config/**: Environment variables, database, Redis, Sentry, PostHog setup
- **middleware/**: Authentication, authorization, validation, error handling, rate limiting
- **routes/**: API route definitions
- **controllers/**: Request handlers
- **services/**: Business logic layer
- **validations/**: Zod schemas for request validation
- **utils/**: Helper functions
- **types/**: TypeScript type definitions

### Frontend Architecture

#### App Router Structure
```
apps/frontend/src/
├── app/                    # Next.js App Router
│   ├── (auth)/            # Auth routes group
│   ├── (vendor)/          # Vendor dashboard routes
│   ├── (admin)/           # Admin panel routes
│   ├── products/          # Product pages
│   ├── orders/            # Order pages
│   └── layout.tsx         # Root layout
├── components/
│   ├── ui/                # shadcn components
│   ├── features/          # Feature-specific components
│   └── layouts/           # Layout components
├── lib/                   # Core utilities
│   ├── api.ts            # Axios instance
│   └── utils.ts          # Helper functions
├── hooks/                 # Custom React hooks
├── store/                 # Zustand stores
│   ├── auth.store.ts     # Authentication state
│   └── cart.store.ts     # Shopping cart state
└── types/                 # TypeScript types
```

## Database Schema

### Core Entities

#### Users & Authentication
- **User**: Customer, vendor, admin accounts
- **Vendor**: Vendor profiles and business information
- **Address**: User delivery addresses

#### Products & Inventory
- **Category**: Hierarchical product categories
- **Product**: Product listings with variants
- **InventoryLog**: Stock movement tracking

#### Orders & Transactions
- **Order**: Customer orders
- **OrderItem**: Line items in orders
- **Payment**: Payment records (M-Pesa, etc.)
- **Delivery**: Delivery tracking
- **DeliveryTracking**: Delivery status events

#### Reviews & Engagement
- **Review**: Product reviews and ratings
- **CartItem**: Shopping cart
- **Wishlist**: User wishlists

#### Payouts
- **Payout**: Vendor payout records

## Key Features Implementation

### 1. M-Pesa Integration

**STK Push Flow**:
```typescript
Customer initiates payment
    ↓
Backend calls M-Pesa STK Push API
    ↓
Customer receives M-Pesa prompt on phone
    ↓
Customer enters PIN
    ↓
M-Pesa calls webhook with payment status
    ↓
Backend updates order and payment status
    ↓
Customer receives confirmation
```

**Implementation**: `apps/backend/src/services/mpesa.service.ts`

### 2. Multi-Vendor Management

**Vendor Onboarding Flow**:
1. User registers as vendor
2. Submits business information
3. Admin reviews and approves
4. Vendor can start listing products
5. Commission automatically calculated on sales

**Commission Model**:
- Configurable per-vendor commission rate
- Automatic calculation on order placement
- Periodic payout system via M-Pesa B2C

### 3. Inventory Management

**Real-time Stock Tracking**:
- Automatic stock deduction on order
- Low stock alerts
- Inventory logs for audit trail
- Multi-location support ready

### 4. Delivery Tracking

**Real-time Updates**:
- Integration-ready for courier APIs
- GPS coordinate tracking
- Status event timeline
- SMS notifications via Africa's Talking (ready to integrate)

### 5. Product Recommendations

**AI-Powered Recommendations** (to be implemented):
- User behavior tracking via PostHog
- Collaborative filtering
- Category-based suggestions
- Trending products

### 6. Admin Panel

**Features**:
- Vendor approval workflow
- Order management
- Analytics dashboard
- System configuration

## Security

### Authentication & Authorization
- JWT-based authentication
- Role-based access control (RBAC)
- Password reset with secure tokens
- Email verification

### API Security
- Helmet.js security headers
- CORS configuration
- Rate limiting (general + endpoint-specific)
- Arcjet bot protection
- Input validation with Zod
- SQL injection prevention (Prisma)

### Payment Security
- PCI-compliant M-Pesa integration
- Transaction logging
- Webhook signature verification

## Performance Optimization

### Backend
- Redis caching for:
  - M-Pesa access tokens
  - Frequently accessed data
  - Session storage
- Database query optimization with Prisma
- Compression middleware
- Pagination on all list endpoints

### Frontend
- Next.js App Router with server components
- Image optimization (next/image)
- Code splitting
- TanStack Query caching
- Zustand for client-side state (persistent)

## Monitoring & Observability

### Error Tracking
- Sentry for backend error tracking
- Sentry for frontend error tracking
- Source maps for debugging

### Logging
- Winston for structured logging
- Daily log rotation
- Different log levels per environment

### Analytics
- PostHog for product analytics
- User behavior tracking
- Feature flags capability

## Development Workflow

### Local Development
```bash
# Install dependencies
npm install

# Set up environment variables
cp apps/backend/.env.example apps/backend/.env
cp apps/frontend/.env.example apps/frontend/.env

# Run database migrations
npm run db:migrate -w apps/backend

# Start development servers
npm run dev
```

### Code Quality
- ESLint for linting
- Prettier for formatting
- TypeScript strict mode
- Pre-commit hooks (recommended)

## Deployment

### Backend Deployment (Railway/AWS)
1. Set environment variables
2. Build: `npm run build -w apps/backend`
3. Run migrations: `npm run db:migrate -w apps/backend`
4. Start: `npm start -w apps/backend`

### Frontend Deployment (Vercel/AWS)
1. Set environment variables
2. Build: `npm run build -w apps/frontend`
3. Deploy static assets

## Environment Variables

### Required Backend Vars
- `DATABASE_URL`: PostgreSQL connection string
- `REDIS_URL`: Redis connection string
- `MPESA_CONSUMER_KEY`, `MPESA_CONSUMER_SECRET`: M-Pesa credentials
- `JWT_SECRET`: JWT signing secret
- `SMTP_*`: Email configuration

### Required Frontend Vars
- `NEXT_PUBLIC_API_URL`: Backend API URL
- `NEXT_PUBLIC_APP_URL`: Frontend URL

## API Documentation

### Versioning
- Current version: v1
- Base path: `/api/v1`

### Response Format
```typescript
{
  success: boolean;
  message: string;
  data?: T;
  meta?: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}
```

### Error Format
```typescript
{
  success: false;
  message: string;
  errors?: ValidationError[];
}
```

## Future Enhancements

1. **Multi-currency support**: USD, UGX, TZS
2. **Mobile app**: React Native
3. **Advanced analytics**: Vendor dashboards
4. **Live chat**: Customer support
5. **Multi-language**: Swahili, French
6. **Subscription products**: Recurring payments
7. **Flash sales**: Time-limited offers
8. **Loyalty program**: Points and rewards

## License

MIT

---

**Note**: This is a living document. Update as the architecture evolves.
