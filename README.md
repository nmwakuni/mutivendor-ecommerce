# Multi-Vendor Marketplace - East Africa

A feature-rich, production-ready multi-vendor marketplace platform tailored for East Africa, with M-Pesa integration, inventory management, delivery tracking, and more.

## 🚀 Features

### Core Marketplace
- **Multi-vendor Support**: Onboard unlimited vendors with individual dashboards
- **Product Management**: Advanced inventory tracking with low-stock alerts
- **Smart Search**: AI-powered product recommendations based on user behavior
- **Reviews & Ratings**: Customer feedback system with moderation

### Payment & Transactions
- **M-Pesa Integration**: Safaricom Daraja API for STK Push and B2C payouts
- **Multi-currency**: KES support (expandable to UGX, TZS)
- **Secure Payments**: PCI-compliant transaction handling

### Operations
- **Delivery Tracking**: Real-time order tracking
- **Inventory Management**: Stock level monitoring across multiple vendors
- **Order Management**: Complete order lifecycle management
- **Vendor Payouts**: Automated commission and payout system

### Infrastructure & Services
- **ImageKit**: Real-time image optimization and CDN delivery
- **Resend**: Modern email API for transactional emails
- **Inngest**: Background jobs and workflow automation
- **Redis (Upstash)**: Caching and session management

### Security & Monitoring
- **Arcjet**: Advanced bot protection and rate limiting
- **better-auth**: Secure authentication with password reset
- **Sentry**: Real-time error tracking
- **Winston**: Comprehensive logging
- **Helmet**: Security headers

### Analytics
- **PostHog**: Product analytics and feature flags
- **Admin Dashboard**: Comprehensive marketplace analytics
- **Vendor Analytics**: Sales and performance metrics

## 🛠 Tech Stack

### Backend
- **Runtime**: Node.js 18+
- **Framework**: Express.js + TypeScript
- **Database**: PostgreSQL (Prisma ORM)
- **Cache**: Redis (Upstash)
- **Validation**: Zod
- **Auth**: better-auth
- **Email**: Resend
- **File Storage**: ImageKit
- **Background Jobs**: Inngest

### Frontend
- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: TailwindCSS + shadcn/ui
- **State**: Zustand
- **Data Fetching**: TanStack Query
- **Forms**: React Hook Form + Zod

### Services & DevOps
- **Hosting**: AWS / Railway
- **Email**: Resend
- **File Storage & CDN**: ImageKit
- **Background Jobs**: Inngest
- **CI/CD**: GitHub Actions
- **Monitoring**: Sentry + Winston
- **Code Quality**: ESLint + Prettier

## 📁 Project Structure

```
marketplace-multi-vendor/
├── apps/
│   ├── backend/          # Express API
│   └── frontend/         # Next.js app
├── packages/
│   ├── database/         # Prisma schema
│   ├── types/            # Shared types
│   └── config/           # Shared configs
└── package.json
```

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- PostgreSQL 14+
- Redis (or Upstash account)

### Installation

```bash
# Install dependencies
npm install

# Set up environment variables
cp apps/backend/.env.example apps/backend/.env
cp apps/frontend/.env.example apps/frontend/.env

# Run database migrations
npm run db:migrate

# Start development servers
npm run dev
```

### Environment Variables

Required environment variables:
- **Database**: PostgreSQL connection string
- **Redis**: Upstash Redis URL
- **M-Pesa**: Daraja API credentials
- **ImageKit**: Public key, private key, URL endpoint
- **Resend**: API key
- **Inngest**: Event key, signing key (optional for development)
- **JWT**: Secret for token signing

See `.env.example` files and [SERVICES.md](./SERVICES.md) for detailed setup.

## 📦 Development

```bash
# Run both apps in development
npm run dev

# Run backend only
npm run dev:backend

# Run frontend only
npm run dev:frontend

# Build for production
npm run build

# Lint code
npm run lint

# Format code
npm run format
```

## 🏗 Architecture

### Backend Architecture
- **Layered Architecture**: Controllers → Services → Repositories
- **Middleware Pipeline**: Auth, validation, rate limiting, error handling
- **Service Layer**: Business logic separation
- **Repository Pattern**: Data access abstraction

### Frontend Architecture
- **App Router**: Next.js 14 app directory structure
- **Server Components**: Optimized data fetching
- **Client Components**: Interactive UI with Zustand
- **API Layer**: TanStack Query for server state

## 🔐 Security

- Rate limiting with Arcjet
- Helmet security headers
- Input validation with Zod
- SQL injection prevention (Prisma)
- XSS protection
- CSRF tokens
- Secure session management

## 📊 Database Schema

### Key Entities
- Users (Customers, Vendors, Admins)
- Products & Inventory
- Orders & OrderItems
- Payments & Transactions
- Reviews & Ratings
- Delivery Tracking

## 🚢 Deployment

### Railway
```bash
railway up
```

### AWS
- EC2 for backend
- RDS for PostgreSQL
- ElastiCache for Redis
- S3 for file storage
- CloudFront for CDN

## 📄 License

MIT

## 👥 Contributing

Contributions welcome! Please read our contributing guidelines.

---

Built with ❤️ for East Africa
