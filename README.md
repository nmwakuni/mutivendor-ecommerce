# Multi-Vendor Marketplace

A production-ready, feature-rich multi-vendor e-commerce marketplace platform tailored for East Africa, with M-Pesa payment integration.

## Features

### Core Functionality
- 🛍️ **Multi-Vendor Support** - Scalable vendor onboarding and management system
- 💳 **M-Pesa Integration** - Safaricom Daraja API for seamless mobile money payments
- 📦 **Inventory Management** - Real-time stock tracking with low-stock alerts
- 🚚 **Delivery Tracking** - Order fulfillment with status updates
- ⭐ **Reviews & Ratings** - Customer feedback with verified purchases
- 🏷️ **Categories** - Hierarchical product organization
- 🔍 **Advanced Search** - Filter by price, category, vendor, and more

### Technical Features
- 🔐 **Authentication** - JWT-based auth with refresh tokens
- 📧 **Email Service** - Beautiful transactional emails via Resend
- 🖼️ **Image Management** - CDN-backed uploads via ImageKit
- ⚡ **Background Jobs** - Async processing with Inngest
- 📊 **Analytics** - PostHog integration for insights
- 🛡️ **Security** - Rate limiting, Helmet, Arcjet protection
- 🔍 **Monitoring** - Sentry error tracking with profiling
- 📝 **Logging** - Winston with daily rotation

## Tech Stack

### Backend
- **Runtime**: Node.js 18+
- **Framework**: Express.js
- **Language**: TypeScript
- **Database**: PostgreSQL with Prisma ORM
- **Cache**: Redis (Upstash)
- **Validation**: Zod
- **Authentication**: JWT + better-auth
- **File Upload**: Multer + ImageKit
- **Background Jobs**: Inngest

### Frontend
- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **UI Components**: shadcn/ui + Radix UI
- **Styling**: Tailwind CSS
- **State Management**: Zustand
- **Data Fetching**: TanStack Query (React Query)
- **Forms**: React Hook Form + Zod
- **HTTP Client**: Axios

## Getting Started

### Prerequisites
- Node.js 18+
- PostgreSQL 14+
- Redis
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone https://github.com/nmwakuni/mutivendor-ecommerce.git
cd mutivendor-ecommerce
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
# Edit .env with your configuration
```

4. Set up the database:
```bash
cd apps/backend
npx prisma generate
npx prisma db push
# Optional: Seed database
npm run db:seed
```

5. Start development servers:
```bash
# From root directory
npm run dev
```

The backend will run on http://localhost:5000 and frontend on http://localhost:3000.

## Docker Deployment

### Using Docker Compose

```bash
# Build and start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

### Manual Docker Build

```bash
# Build backend
docker build -f apps/backend/Dockerfile -t marketplace-backend .

# Build frontend
docker build -f apps/frontend/Dockerfile -t marketplace-frontend .

# Run containers
docker run -p 5000:5000 marketplace-backend
docker run -p 3000:3000 marketplace-frontend
```

## Scripts

### Root
- `npm run dev` - Start all development servers
- `npm run build` - Build all apps
- `npm run lint` - Lint all apps
- `npm run format` - Format code with Prettier
- `npm run test` - Run all tests
- `npm run test:coverage` - Generate coverage reports

### Backend
- `npm run dev --workspace=apps/backend` - Start backend dev server
- `npm run build --workspace=apps/backend` - Build backend
- `npm run test --workspace=apps/backend` - Run backend tests
- `npm run db:generate` - Generate Prisma Client
- `npm run db:push` - Push schema to database
- `npm run db:migrate` - Run migrations
- `npm run db:studio` - Open Prisma Studio

### Frontend
- `npm run dev --workspace=apps/frontend` - Start frontend dev server
- `npm run build --workspace=apps/frontend` - Build frontend
- `npm run test --workspace=apps/frontend` - Run frontend tests

## Testing

The project includes comprehensive test coverage:

- **Backend**: Jest + Supertest for API testing
- **Frontend**: Jest + React Testing Library for component testing

Run tests:
```bash
npm run test              # All tests
npm run test:coverage     # With coverage reports
```

## CI/CD

GitHub Actions workflows are configured for:

1. **Continuous Integration** (`.github/workflows/ci.yml`)
   - Linting and formatting checks
   - TypeScript type checking
   - Unit and integration tests
   - Build verification

2. **Docker Build & Push** (`.github/workflows/docker-build-push.yml`)
   - Build Docker images
   - Push to GitHub Container Registry (ghcr.io)
   - Automatic tagging based on branches and releases

## License

This project is licensed under the MIT License.
