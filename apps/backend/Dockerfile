# Multi-stage build for production-optimized backend
FROM node:18-alpine AS base

# Install dependencies only when needed
FROM base AS deps
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY apps/backend/package*.json ./apps/backend/

# Install dependencies
RUN npm ci --workspace=apps/backend --include-workspace-root

# Build stage
FROM base AS builder
WORKDIR /app

# Copy dependencies
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/backend/node_modules ./apps/backend/node_modules

# Copy source code
COPY apps/backend ./apps/backend
COPY package*.json ./
COPY tsconfig.json ./

# Generate Prisma Client
WORKDIR /app/apps/backend
RUN npx prisma generate

# Build application
RUN npm run build

# Production stage
FROM base AS runner
WORKDIR /app

ENV NODE_ENV production

# Create non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 expressjs

# Copy built application
COPY --from=builder --chown=expressjs:nodejs /app/apps/backend/dist ./dist
COPY --from=builder --chown=expressjs:nodejs /app/apps/backend/node_modules ./node_modules
COPY --from=builder --chown=expressjs:nodejs /app/apps/backend/prisma ./prisma
COPY --from=builder --chown=expressjs:nodejs /app/apps/backend/package.json ./

USER expressjs

EXPOSE 5000

ENV PORT 5000

CMD ["node", "dist/server.js"]
