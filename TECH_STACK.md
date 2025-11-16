# Technology Stack

## Backend Technologies

### Core Framework
- **Node.js** (v18+) - JavaScript runtime
- **Express.js** - Web application framework
- **TypeScript** - Static type checking

### Database & ORM
- **PostgreSQL** - Primary relational database
- **Prisma** - Next-generation ORM
  - Type-safe database queries
  - Automatic migrations
  - Database introspection
  - Prisma Studio for database management

### Caching & Sessions
- **Redis** (via Upstash) - In-memory data store
  - Session management
  - API response caching
  - M-Pesa token caching
  - Rate limiting

### Authentication & Security
- **better-auth** - Modern authentication library
  - Email/password authentication
  - Password reset functionality
  - Email verification
- **jsonwebtoken** - JWT token generation/verification
- **bcryptjs** - Password hashing
- **Helmet** - Security headers
- **Arcjet** - Advanced security features
  - Bot detection
  - Rate limiting
  - DDoS protection
  - Shield against common attacks

### Validation
- **Zod** - TypeScript-first schema validation
  - Request body validation
  - Query parameter validation
  - Environment variable validation
  - Type inference

### Payment Integration
- **M-Pesa Daraja API** - Mobile money payments
  - STK Push (customer payments)
  - B2C (vendor payouts)
  - Transaction queries
  - Webhook handling

### Email
- **Nodemailer** - Email sending
  - SMTP support
  - HTML emails
  - Attachment support

### Monitoring & Logging
- **Sentry** - Error tracking and monitoring
  - Real-time error alerts
  - Performance monitoring
  - Source map support
- **Winston** - Logging library
  - Multiple log levels
  - Daily log rotation
  - Structured logging
  - Multiple transports

### Analytics
- **PostHog** - Product analytics
  - Event tracking
  - User behavior analysis
  - Feature flags
  - A/B testing capability

### Development Tools
- **tsx** - TypeScript execution
- **ESLint** - Code linting
- **Prettier** - Code formatting
- **Nodemon** - Development server

## Frontend Technologies

### Core Framework
- **Next.js 14** - React framework
  - App Router
  - Server Components
  - Server Actions
  - Route handlers
  - Image optimization
  - Font optimization

### Language & Type Safety
- **TypeScript** - Static typing
- **Zod** - Runtime validation

### UI & Styling
- **React 18** - UI library
- **TailwindCSS** - Utility-first CSS framework
- **shadcn/ui** - Re-usable components built on:
  - **Radix UI** - Accessible component primitives
  - **class-variance-authority** - Variant styling
  - **tailwind-merge** - Tailwind class merging
  - **clsx** - Conditional classes
- **Lucide React** - Icon library
- **next-themes** - Dark mode support

### State Management
- **Zustand** - Lightweight state management
  - Cart state
  - Auth state
  - Persist middleware
  - DevTools support

### Data Fetching & Caching
- **TanStack Query** (React Query) - Data fetching
  - Server state management
  - Automatic caching
  - Background refetching
  - Optimistic updates
  - DevTools included
- **Axios** - HTTP client
  - Request/response interceptors
  - Automatic JSON transformation
  - Error handling

### Forms & Validation
- **React Hook Form** - Form management
  - Performance optimized
  - Easy validation
  - Minimal re-renders
- **@hookform/resolvers** - Zod integration

### UI Components (shadcn/ui included)
- Accordion
- Alert Dialog
- Avatar
- Button
- Card
- Checkbox
- Dialog
- Dropdown Menu
- Label
- Popover
- Radio Group
- Select
- Separator
- Slider
- Switch
- Tabs
- Toast/Sonner (notifications)
- Tooltip

### Charts & Visualization
- **Recharts** - Chart library
  - Line charts
  - Bar charts
  - Pie charts
  - Area charts

### Date Handling
- **date-fns** - Date utility library
  - Formatting
  - Parsing
  - Manipulation

### Monitoring & Analytics
- **@sentry/nextjs** - Error tracking
- **posthog-js** - Analytics client

## Development & Build Tools

### Package Management
- **npm workspaces** - Monorepo management

### Build Tools
- **Next.js compiler** - Frontend builds
- **TypeScript compiler** - Backend builds
- **Turbopack** - Fast bundler (Next.js dev)

### Code Quality
- **ESLint** - JavaScript/TypeScript linting
  - Next.js config
  - TypeScript rules
  - Import sorting
- **Prettier** - Code formatting
  - Consistent style
  - Auto-formatting

### Version Control
- **Git** - Source control
- **GitHub** - Repository hosting

## Infrastructure & DevOps

### Hosting Options
- **Railway** - Platform-as-a-Service
  - Easy deployment
  - Automatic scaling
  - Built-in PostgreSQL/Redis
- **AWS** - Cloud infrastructure
  - EC2 for backend
  - RDS for PostgreSQL
  - ElastiCache for Redis
  - S3 for file storage
  - CloudFront for CDN

### CI/CD (Recommended)
- **GitHub Actions** - Automation
  - Automated testing
  - Automated deployment
  - Code quality checks

### File Storage
- **AWS S3** - Object storage
  - Product images
  - User avatars
  - Documents

## External Services & APIs

### Payment
- **M-Pesa Daraja API** - Mobile payments

### Communication
- **SMTP Provider** - Email delivery
  - Gmail
  - SendGrid
  - Amazon SES
- **Africa's Talking** (ready to integrate) - SMS

### Maps & Location
- **Google Maps API** (ready to integrate)
  - Geocoding
  - Distance calculation
  - Location tracking

## Why This Stack?

### Type Safety Everywhere
- TypeScript on backend and frontend
- Zod for runtime validation
- Prisma for database type safety
- End-to-end type safety

### Developer Experience
- Hot reload on both frontend/backend
- Excellent TypeScript support
- Great debugging tools
- Strong community support

### Performance
- Redis caching
- Next.js optimizations
- TanStack Query caching
- Database query optimization

### Scalability
- Stateless backend (horizontal scaling)
- Redis for distributed caching
- PostgreSQL for reliable data storage
- CDN for static assets

### Security
- Multiple layers of protection
- Industry best practices
- Regular security updates
- Automated vulnerability scanning

### East Africa Specific
- M-Pesa integration (critical for Kenya)
- SMS support via Africa's Talking
- Multi-currency ready
- Offline-first capabilities

### Modern & Maintained
- All packages actively maintained
- Regular updates
- Strong community
- Long-term support

## Version Requirements

### Minimum Versions
- Node.js: 18.0.0+
- PostgreSQL: 14.0+
- Redis: 6.0+

### Recommended Versions
- Node.js: 18.18.0 (LTS)
- PostgreSQL: 15.x
- Redis: 7.x

---

This stack is production-ready and battle-tested for modern web applications.
