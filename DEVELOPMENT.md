# Development Guide

## Quick Start

### Prerequisites
- Node.js 18+ installed
- PostgreSQL 14+ running
- Redis running (or Upstash account)
- M-Pesa sandbox credentials (from Safaricom Daraja)

### 1. Clone and Install

```bash
cd mutivendor-ecommerce
npm install
```

### 2. Environment Setup

#### Backend Environment
```bash
cp apps/backend/.env.example apps/backend/.env
```

Edit `apps/backend/.env` and configure:
- **Database**: PostgreSQL connection string
- **Redis**: Upstash Redis URL
- **M-Pesa**: Daraja API credentials
- **JWT**: Generate a secure secret (min 32 chars)
- **SMTP**: Email configuration

#### Frontend Environment
```bash
cp apps/frontend/.env.example apps/frontend/.env
```

Edit `apps/frontend/.env` and configure:
- **API URL**: Backend URL (http://localhost:5000 for local)
- **App URL**: Frontend URL (http://localhost:3000 for local)

### 3. Database Setup

```bash
# Generate Prisma Client
npm run db:generate -w apps/backend

# Run migrations
npm run db:migrate -w apps/backend

# (Optional) Seed database
npm run db:seed -w apps/backend
```

### 4. Start Development Servers

```bash
# Start both backend and frontend
npm run dev

# Or start individually
npm run dev:backend    # Backend on http://localhost:5000
npm run dev:frontend   # Frontend on http://localhost:3000
```

## Project Structure

```
mutivendor-ecommerce/
├── apps/
│   ├── backend/              # Express API
│   │   ├── src/
│   │   │   ├── config/      # Configuration files
│   │   │   ├── middleware/  # Express middleware
│   │   │   ├── routes/      # API routes
│   │   │   ├── controllers/ # Route controllers
│   │   │   ├── services/    # Business logic
│   │   │   ├── validations/ # Zod schemas
│   │   │   ├── utils/       # Utilities
│   │   │   ├── types/       # TypeScript types
│   │   │   ├── app.ts       # Express app
│   │   │   └── server.ts    # Server entry
│   │   └── prisma/
│   │       └── schema.prisma # Database schema
│   │
│   └── frontend/             # Next.js app
│       ├── src/
│       │   ├── app/         # Next.js App Router
│       │   ├── components/  # React components
│       │   │   ├── ui/      # shadcn components
│       │   │   └── features/ # Feature components
│       │   ├── lib/         # Core utilities
│       │   ├── hooks/       # Custom hooks
│       │   ├── store/       # Zustand stores
│       │   ├── types/       # TypeScript types
│       │   └── styles/      # Global styles
│       └── public/          # Static assets
│
├── packages/                 # Shared packages (future)
└── docs/                    # Documentation
```

## Development Workflow

### Creating a New Feature

#### 1. Backend (API Endpoint)

**Step 1: Define Prisma Model** (if needed)
```prisma
// apps/backend/prisma/schema.prisma
model Feature {
  id        String   @id @default(cuid())
  name      String
  createdAt DateTime @default(now())
}
```

**Step 2: Create Validation Schema**
```typescript
// apps/backend/src/validations/feature.validation.ts
import { z } from 'zod';

export const createFeatureSchema = z.object({
  body: z.object({
    name: z.string().min(1).max(255),
  }),
});
```

**Step 3: Create Service**
```typescript
// apps/backend/src/services/feature.service.ts
import { prisma } from '@/config/database';

export class FeatureService {
  async create(name: string) {
    return await prisma.feature.create({
      data: { name },
    });
  }

  async getAll() {
    return await prisma.feature.findMany();
  }
}

export const featureService = new FeatureService();
```

**Step 4: Create Controller**
```typescript
// apps/backend/src/controllers/feature.controller.ts
import { Request, Response } from 'express';
import { featureService } from '@/services/feature.service';
import { ApiResponseHelper } from '@/utils/response';

export class FeatureController {
  async create(req: Request, res: Response) {
    const { name } = req.body;
    const feature = await featureService.create(name);
    return ApiResponseHelper.created(res, feature, 'Feature created');
  }

  async getAll(req: Request, res: Response) {
    const features = await featureService.getAll();
    return ApiResponseHelper.success(res, features);
  }
}

export const featureController = new FeatureController();
```

**Step 5: Create Routes**
```typescript
// apps/backend/src/routes/feature.routes.ts
import { Router } from 'express';
import { featureController } from '@/controllers/feature.controller';
import { validate } from '@/middleware/validate';
import { authenticate } from '@/middleware/auth';
import { createFeatureSchema } from '@/validations/feature.validation';

const router = Router();

router.post('/', authenticate, validate(createFeatureSchema), featureController.create);
router.get('/', featureController.getAll);

export default router;
```

**Step 6: Register Route**
```typescript
// apps/backend/src/app.ts
import featureRoutes from './routes/feature.routes';

// In createApp function
apiRouter.use('/features', featureRoutes);
```

#### 2. Frontend (UI Component)

**Step 1: Create API Hook**
```typescript
// apps/frontend/src/hooks/use-features.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

interface Feature {
  id: string;
  name: string;
}

export function useFeatures() {
  return useQuery({
    queryKey: ['features'],
    queryFn: async () => {
      const { data } = await api.get<{ data: Feature[] }>('/features');
      return data.data;
    },
  });
}

export function useCreateFeature() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (name: string) => {
      const { data } = await api.post('/features', { name });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['features'] });
    },
  });
}
```

**Step 2: Create Component**
```typescript
// apps/frontend/src/components/features/feature-list.tsx
'use client';

import { useFeatures } from '@/hooks/use-features';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function FeatureList() {
  const { data: features, isLoading } = useFeatures();

  if (isLoading) return <div>Loading...</div>;

  return (
    <div className="grid gap-4">
      {features?.map((feature) => (
        <Card key={feature.id}>
          <CardHeader>
            <CardTitle>{feature.name}</CardTitle>
          </CardHeader>
        </Card>
      ))}
    </div>
  );
}
```

**Step 3: Use in Page**
```typescript
// apps/frontend/src/app/features/page.tsx
import { FeatureList } from '@/components/features/feature-list';

export default function FeaturesPage() {
  return (
    <main className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6">Features</h1>
      <FeatureList />
    </main>
  );
}
```

## Database Management

### Creating Migrations

```bash
# Create a migration
npm run db:migrate -w apps/backend

# Reset database (careful!)
npx prisma migrate reset -w apps/backend

# View database in Prisma Studio
npm run db:studio -w apps/backend
```

### Seeding Data

```typescript
// apps/backend/prisma/seed.ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Create sample data
  await prisma.user.create({
    data: {
      email: 'admin@example.com',
      role: 'ADMIN',
      // ... more fields
    },
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
```

Run seed:
```bash
npm run db:seed -w apps/backend
```

## Testing

### Backend Testing (to be implemented)
```bash
npm run test -w apps/backend
npm run test:watch -w apps/backend
npm run test:coverage -w apps/backend
```

### Frontend Testing (to be implemented)
```bash
npm run test -w apps/frontend
npm run test:watch -w apps/frontend
npm run test:e2e -w apps/frontend
```

## Code Quality

### Linting
```bash
# Lint all workspaces
npm run lint

# Lint backend only
npm run lint -w apps/backend

# Fix linting issues
npm run lint:fix -w apps/backend
```

### Formatting
```bash
# Format all files
npm run format

# Check formatting
npx prettier --check "**/*.{ts,tsx,js,jsx,json,md}"
```

### Type Checking
```bash
# Check types
npm run type-check

# Check backend types
npm run type-check -w apps/backend
```

## Common Tasks

### Adding a shadcn Component
```bash
# Navigate to frontend
cd apps/frontend

# Add a component (e.g., dialog)
npx shadcn-ui@latest add dialog
```

### Environment Variable Reference

#### Backend Required Variables
- `DATABASE_URL` - PostgreSQL connection string
- `REDIS_URL` - Redis connection string
- `JWT_SECRET` - JWT signing secret (min 32 chars)
- `AUTH_SECRET` - Auth secret (min 32 chars)
- `MPESA_CONSUMER_KEY` - M-Pesa consumer key
- `MPESA_CONSUMER_SECRET` - M-Pesa consumer secret
- `MPESA_SHORTCODE` - M-Pesa business shortcode
- `MPESA_PASSKEY` - M-Pesa passkey
- `SMTP_HOST` - Email server host
- `SMTP_USER` - Email username
- `SMTP_PASSWORD` - Email password

#### Optional Variables
- `SENTRY_DSN` - Sentry error tracking
- `POSTHOG_API_KEY` - PostHog analytics
- `ARCJET_KEY` - Arcjet security
- `AWS_ACCESS_KEY_ID` - AWS S3 access
- `AWS_SECRET_ACCESS_KEY` - AWS S3 secret

## Debugging

### Backend Debugging
1. Add `debugger` statement in code
2. Run with Node inspector:
```bash
node --inspect-brk node_modules/.bin/tsx src/server.ts
```
3. Attach VS Code debugger

### Frontend Debugging
1. Use React DevTools browser extension
2. Use TanStack Query DevTools (included)
3. Check browser console
4. Use Next.js error overlay

## Performance Optimization

### Backend
- Use Redis caching for frequently accessed data
- Optimize database queries with Prisma includes/selects
- Use pagination on all list endpoints
- Enable compression middleware

### Frontend
- Use Next.js Image component for images
- Implement lazy loading for heavy components
- Use TanStack Query for caching
- Minimize client-side JavaScript

## Troubleshooting

### Port Already in Use
```bash
# Find process using port 5000
lsof -i :5000

# Kill process
kill -9 <PID>
```

### Database Connection Issues
- Ensure PostgreSQL is running
- Check DATABASE_URL format
- Verify database exists
- Check firewall/network settings

### Redis Connection Issues
- Ensure Redis is running (or Upstash URL is correct)
- Check REDIS_URL format
- Verify network connectivity

### Build Errors
```bash
# Clean and reinstall
rm -rf node_modules
rm package-lock.json
npm install

# Clean Next.js cache
rm -rf apps/frontend/.next
```

## Resources

- [Express.js Docs](https://expressjs.com/)
- [Next.js Docs](https://nextjs.org/docs)
- [Prisma Docs](https://www.prisma.io/docs)
- [shadcn/ui](https://ui.shadcn.com/)
- [TanStack Query](https://tanstack.com/query)
- [M-Pesa Daraja API](https://developer.safaricom.co.ke/)

## Getting Help

- Check existing issues on GitHub
- Read the documentation
- Review the code examples
- Ask in discussions

---

Happy coding! 🚀
