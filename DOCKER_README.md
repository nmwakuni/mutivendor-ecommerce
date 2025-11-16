# 🐳 Docker Setup for Multi-Vendor Marketplace

Complete Docker configuration with multi-stage builds, docker-compose orchestration, and production-ready optimizations.

## 📋 Prerequisites

- Docker Engine 20.10+
- Docker Compose 2.0+
- At least 4GB RAM available for Docker
- At least 10GB free disk space

## 🚀 Quick Start

### 1. Clone and Setup

```bash
# Clone the repository
git clone <your-repo-url>
cd mutivendor-ecommerce

# Copy environment file
cp .env.example .env

# Edit .env file with your values
nano .env  # or use your preferred editor
```

### 2. Build and Run

```bash
# Build and start all services
docker-compose up --build

# Or run in detached mode
docker-compose up -d --build
```

### 3. Access the Application

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:3001
- **API Documentation**: http://localhost:3001/api-docs
- **PostgreSQL**: localhost:5432
- **Redis**: localhost:6379

## 📦 Services

### Backend (Express + TypeScript)
- **Port**: 3001
- **Health Check**: http://localhost:3001/health
- **Multi-stage build** with Alpine Linux
- **Non-root user** for security
- **Prisma ORM** with PostgreSQL
- **Redis** for caching

### Frontend (Next.js)
- **Port**: 3000
- **Standalone output** for optimal image size
- **Multi-stage build** with Alpine Linux
- **Non-root user** for security

### PostgreSQL
- **Port**: 5432
- **Version**: 16-alpine
- **Persistent volume**: `postgres_data`
- **Health checks enabled**

### Redis
- **Port**: 6379
- **Version**: 7-alpine
- **Persistent volume**: `redis_data`
- **AOF enabled** for durability

## 🔧 Common Commands

### Start Services
```bash
# Start all services
docker-compose up

# Start in background
docker-compose up -d

# Start specific service
docker-compose up backend
```

### Stop Services
```bash
# Stop all services
docker-compose down

# Stop and remove volumes (CAUTION: deletes data)
docker-compose down -v
```

### View Logs
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f backend
docker-compose logs -f frontend

# Last 100 lines
docker-compose logs --tail=100 backend
```

### Rebuild Services
```bash
# Rebuild all
docker-compose up --build

# Rebuild specific service
docker-compose up --build backend

# Force rebuild without cache
docker-compose build --no-cache
```

### Database Operations
```bash
# Run Prisma migrations
docker-compose exec backend npx prisma migrate deploy

# Open Prisma Studio
docker-compose exec backend npx prisma studio

# Seed database
docker-compose exec backend npm run db:seed

# Reset database (CAUTION)
docker-compose exec backend npx prisma migrate reset
```

### Shell Access
```bash
# Backend shell
docker-compose exec backend sh

# Frontend shell
docker-compose exec frontend sh

# PostgreSQL shell
docker-compose exec postgres psql -U marketplace -d marketplace

# Redis CLI
docker-compose exec redis redis-cli
```

## 🛠️ Development Mode

For development with hot reload:

### Option 1: Use Development Compose File
```bash
# Create docker-compose.dev.yml
# Add volume mounts for source code
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up
```

### Option 2: Run Backend/Frontend Locally
```bash
# Start only database and Redis
docker-compose up postgres redis

# Run backend locally
cd apps/backend
npm install
npm run dev

# Run frontend locally (in another terminal)
cd apps/frontend
npm install
npm run dev
```

## 🔐 Environment Variables

Copy `.env.example` to `.env` and configure:

### Required Variables
- `DATABASE_URL` - PostgreSQL connection
- `REDIS_URL` - Redis connection
- `JWT_SECRET` - JWT signing key (min 32 chars)

### Optional but Recommended
- `IMAGEKIT_*` - File uploads
- `RESEND_API_KEY` - Email service
- `SENTRY_DSN` - Error tracking
- `OPENAI_API_KEY` - AI chatbot
- `WHATSAPP_API_TOKEN` - WhatsApp integration

See `.env.example` for complete list with descriptions.

## 📊 Resource Usage

Typical resource consumption:

| Service    | Memory | CPU   |
|-----------|--------|-------|
| PostgreSQL| ~50MB  | <5%   |
| Redis     | ~20MB  | <5%   |
| Backend   | ~100MB | ~10%  |
| Frontend  | ~150MB | ~10%  |
| **Total** | ~320MB | ~30%  |

## 🏗️ Production Deployment

### Build for Production
```bash
# Set environment
export NODE_ENV=production

# Build images
docker-compose build

# Tag images
docker tag mutivendor-ecommerce-backend:latest your-registry/marketplace-backend:v1.0.0
docker tag mutivendor-ecommerce-frontend:latest your-registry/marketplace-frontend:v1.0.0

# Push to registry
docker push your-registry/marketplace-backend:v1.0.0
docker push your-registry/marketplace-frontend:v1.0.0
```

### Production Considerations

1. **Use secrets management** (not .env files)
   - AWS Secrets Manager
   - HashiCorp Vault
   - Docker Secrets

2. **Enable HTTPS** with reverse proxy
   - Nginx
   - Traefik
   - Caddy

3. **Set strong passwords**
   - PostgreSQL
   - Redis
   - JWT secret

4. **Configure proper CORS**
   - Set correct `FRONTEND_URL`
   - Restrict origins

5. **Enable monitoring**
   - Sentry for errors
   - PostHog for analytics
   - Docker health checks

6. **Backup databases**
   - Automated PostgreSQL backups
   - Redis snapshots

## 🐛 Troubleshooting

### Container Won't Start
```bash
# Check logs
docker-compose logs backend

# Check container status
docker-compose ps

# Restart service
docker-compose restart backend
```

### Database Connection Issues
```bash
# Verify PostgreSQL is running
docker-compose exec postgres pg_isready

# Check connection from backend
docker-compose exec backend node -e "console.log(process.env.DATABASE_URL)"

# Test connection
docker-compose exec backend npx prisma db pull
```

### Port Already in Use
```bash
# Find process using port
lsof -i :3001  # backend
lsof -i :3000  # frontend
lsof -i :5432  # postgres

# Change port in .env
BACKEND_PORT=3002
FRONTEND_PORT=3001
```

### Out of Disk Space
```bash
# Remove unused images
docker image prune -a

# Remove unused volumes
docker volume prune

# Remove everything (CAUTION)
docker system prune -a --volumes
```

### Build Fails
```bash
# Clear build cache
docker builder prune

# Rebuild from scratch
docker-compose build --no-cache --pull

# Check Dockerfile syntax
docker-compose config
```

## 📝 Multi-Stage Build Details

### Backend Dockerfile Stages

1. **base**: Node.js 20 Alpine with system dependencies
2. **deps**: Install production dependencies only
3. **builder**: Build TypeScript, generate Prisma
4. **runner**: Final image with built app (< 200MB)

### Frontend Dockerfile Stages

1. **base**: Node.js 20 Alpine with system dependencies
2. **deps**: Install production dependencies only
3. **builder**: Build Next.js with standalone output
4. **runner**: Final image with optimized bundle (< 250MB)

### Benefits

- **Smaller images**: Only production dependencies in final image
- **Layer caching**: Faster rebuilds
- **Security**: Minimal attack surface
- **Performance**: Optimized for production

## 🔄 Updates and Maintenance

### Update Dependencies
```bash
# Update base images
docker-compose pull

# Rebuild with latest
docker-compose up --build
```

### Database Migrations
```bash
# Create migration
docker-compose exec backend npx prisma migrate dev --name your_migration_name

# Apply migrations
docker-compose exec backend npx prisma migrate deploy

# Check status
docker-compose exec backend npx prisma migrate status
```

## 📚 Additional Resources

- [Docker Best Practices](https://docs.docker.com/develop/dev-best-practices/)
- [Docker Compose Reference](https://docs.docker.com/compose/compose-file/)
- [Node.js Docker Best Practices](https://github.com/nodejs/docker-node/blob/main/docs/BestPractices.md)
- [Next.js Docker Deployment](https://nextjs.org/docs/deployment#docker-image)

## 🤝 Support

For issues or questions:
- Check logs: `docker-compose logs -f`
- Review health checks: `docker-compose ps`
- Consult documentation above
- Open an issue on GitHub

---

**Built with:** Docker 🐳 | Docker Compose | Alpine Linux | Node.js 20
