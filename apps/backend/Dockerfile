# ==========================================
# Multi-stage Dockerfile for Backend API
# Optimized for production with security & performance
# ==========================================

FROM node:20-alpine AS base

# Install system dependencies
RUN apk add --no-cache libc6-compat dumb-init

# ==========================================
# Stage 1: Dependencies (Production Only)
# ==========================================
FROM base AS deps

WORKDIR /app

# Copy package files for workspace
COPY package*.json ./
COPY apps/backend/package*.json ./apps/backend/

# Install production dependencies only
RUN npm ci --workspace=apps/backend --include-workspace-root --only=production --ignore-scripts && \
    npm cache clean --force

# ==========================================
# Stage 2: Builder (Build TypeScript)
# ==========================================
FROM base AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY apps/backend/package*.json ./apps/backend/

# Install all dependencies (including dev dependencies for building)
RUN npm ci --workspace=apps/backend --include-workspace-root

# Copy source code
COPY apps/backend ./apps/backend
COPY tsconfig.json ./

# Generate Prisma Client
WORKDIR /app/apps/backend
RUN npx prisma generate

# Build TypeScript application
RUN npm run build

# Remove dev dependencies
RUN npm prune --production

# ==========================================
# Stage 3: Runner (Final Production Image)
# ==========================================
FROM base AS runner

WORKDIR /app

# Set environment to production
ENV NODE_ENV=production
ENV PORT=3001

# Create non-root user for security
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 expressjs

# Copy production dependencies from deps stage
COPY --from=deps --chown=expressjs:nodejs /app/node_modules ./node_modules
COPY --from=deps --chown=expressjs:nodejs /app/apps/backend/node_modules ./apps/backend/node_modules

# Copy built application from builder stage
COPY --from=builder --chown=expressjs:nodejs /app/apps/backend/dist ./dist
COPY --from=builder --chown=expressjs:nodejs /app/apps/backend/package.json ./package.json

# Copy Prisma files (needed for runtime and migrations)
COPY --from=builder --chown=expressjs:nodejs /app/apps/backend/prisma ./prisma
COPY --from=builder --chown=expressjs:nodejs /app/apps/backend/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder --chown=expressjs:nodejs /app/apps/backend/node_modules/@prisma ./node_modules/@prisma

# Switch to non-root user
USER expressjs

# Expose application port
EXPOSE 3001

# Add health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3001/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"

# Use dumb-init to handle signals properly (PID 1 problem)
ENTRYPOINT ["dumb-init", "--"]

# Start the application
CMD ["node", "dist/server.js"]
