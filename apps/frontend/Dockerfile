# ==========================================
# Multi-stage Dockerfile for Next.js Frontend
# Optimized for production with security & performance
# ==========================================

FROM node:20-alpine AS base

# Install system dependencies
RUN apk add --no-cache libc6-compat

# ==========================================
# Stage 1: Dependencies (Production Only)
# ==========================================
FROM base AS deps

WORKDIR /app

# Copy package files for workspace
COPY package*.json ./
COPY apps/frontend/package*.json ./apps/frontend/

# Install production dependencies only
RUN npm ci --workspace=apps/frontend --include-workspace-root --only=production --ignore-scripts && \
    npm cache clean --force

# ==========================================
# Stage 2: Builder (Build Next.js)
# ==========================================
FROM base AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY apps/frontend/package*.json ./apps/frontend/

# Install all dependencies (including dev dependencies for building)
RUN npm ci --workspace=apps/frontend --include-workspace-root

# Copy source code
COPY apps/frontend ./apps/frontend
COPY tsconfig.json ./

# Build arguments for environment variables
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_WS_URL

# Set environment variables for build
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_WS_URL=$NEXT_PUBLIC_WS_URL
ENV NEXT_TELEMETRY_DISABLED=1

# Build Next.js application
WORKDIR /app/apps/frontend
RUN npm run build

# ==========================================
# Stage 3: Runner (Final Production Image)
# ==========================================
FROM base AS runner

WORKDIR /app

# Set environment to production
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Create non-root user for security
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy necessary files from builder
# Next.js standalone output
COPY --from=builder --chown=nextjs:nodejs /app/apps/frontend/.next/standalone ./
# Static files
COPY --from=builder --chown=nextjs:nodejs /app/apps/frontend/.next/static ./apps/frontend/.next/static
# Public folder
COPY --from=builder --chown=nextjs:nodejs /app/apps/frontend/public ./apps/frontend/public

# Switch to non-root user
USER nextjs

# Expose application port
EXPOSE 3000

# Add health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3000', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"

# Start Next.js server
CMD ["node", "apps/frontend/server.js"]
