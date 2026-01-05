# VaultGuard Deployment Guide

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Environment Configuration](#environment-configuration)
3. [Local Development](#local-development)
4. [Production Deployment](#production-deployment)
5. [Database Setup](#database-setup)
6. [Monitoring and Logs](#monitoring-and-logs)
7. [Troubleshooting](#troubleshooting)

## Prerequisites

### Required Software

- **Node.js**: 18.x or higher
- **npm**: 8.x or higher (comes with Node.js)
- **Docker**: 20.x or higher (for production deployment)
- **Docker Compose**: 2.x or higher
- **PostgreSQL**: 15.x (if not using Docker)
- **Redis**: 7.x (if not using Docker)

### Required Accounts

- **Sui Wallet**: For testnet/mainnet interaction
- **Walrus Account**: For decentralized storage
- **Domain** (optional): For production hosting

## Environment Configuration

### Frontend Environment Variables

Create `apps/web/.env`:

```env
# Sui Network Configuration
VITE_PACKAGE_ID=0x4eb541917d237dd2c932a4c7d79840c5c943a262ecf009bdbd855c528187ed6b

# API Configuration (Optional)
VITE_API_URL=http://localhost:3001
```

### Backend Environment Variables

Create `apps/api/.env`:

```env
# Server Configuration
PORT=3001
NODE_ENV=production

# Database Configuration
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/vault_guard

# Redis Configuration
REDIS_URL=redis://localhost:6379

# Worker Configuration
ENABLE_WORKER=true

# Sui Network Configuration
SUI_NETWORK=testnet

# CORS Configuration (comma-separated origins)
CORS_ORIGINS=https://your-domain.com,http://localhost:5173

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

## Local Development

### Option 1: Frontend Only (Recommended for Quick Start)

The frontend works standalone with Sui + Walrus + Seal.

```bash
# Install dependencies
cd apps/web
npm install

# Create environment file
echo "VITE_PACKAGE_ID=0x4eb541917d237dd2c932a4c7d79840c5c943a262ecf009bdbd855c528187ed6b" > .env

# Start development server
npm run dev
```

Access at: http://localhost:5173

### Option 2: Full Stack Development

For multi-device sync, warranty reminders, and analytics.

```bash
# 1. Start Docker services (PostgreSQL + Redis)
docker-compose up -d postgres redis

# 2. Install all dependencies
npm install

# 3. Setup Backend
cd apps/api
npm install
cp .env.example .env

# Generate Prisma client and run migrations
npm run db:generate
npm run db:migrate

# 4. Setup Frontend
cd ../web
npm install
cp .env.example .env

# 5. Start everything (from root)
cd ../..
npm run dev
```

Access:
- Frontend: http://localhost:5173
- Backend API: http://localhost:3001
- Health Check: http://localhost:3001/health

## Production Deployment

### Option A: Docker Compose (Recommended)

Complete stack deployment with single command:

```bash
# 1. Configure environment variables for Docker
cp .env.docker.example .env

# IMPORTANT: Edit .env and change the following:
# - POSTGRES_PASSWORD (use a strong random password)
# - DATABASE_URL (update with the new password)
# - CORS_ORIGINS (set to your actual domain)
nano .env

# 2. Configure application-specific environment files
cp apps/web/.env.example apps/web/.env
cp apps/api/.env.example apps/api/.env

# Edit with production values
# Set NODE_ENV=production in apps/api/.env

# 3. Build and start all services
docker-compose up -d --build

# 4. Run database migrations
docker-compose exec api npx prisma migrate deploy

# 5. Check status
docker-compose ps
docker-compose logs -f
```

Services:
- Web: http://localhost (port 80)
- API: http://localhost:3001
- PostgreSQL: localhost:5432
- Redis: localhost:6379

### Option B: Separate Deployments

#### Deploy Frontend (Vercel/Netlify)

**Vercel:**
```bash
cd apps/web
vercel --prod
```

**Netlify:**
```bash
cd apps/web
npm run build
netlify deploy --prod --dir=dist
```

Environment variables to set:
- `VITE_PACKAGE_ID`: Your Sui contract package ID
- `VITE_API_URL`: Your backend API URL (if using backend)

#### Deploy Backend (Heroku/Railway/DigitalOcean)

**Railway:**
```bash
cd apps/api
railway init
railway up
```

**Heroku:**
```bash
cd apps/api
heroku create vault-guard-api
heroku addons:create heroku-postgresql:mini
heroku addons:create heroku-redis:mini
git push heroku main
heroku run npx prisma migrate deploy
```

Environment variables to set:
- `DATABASE_URL`: PostgreSQL connection string
- `REDIS_URL`: Redis connection string
- `NODE_ENV=production`
- `ENABLE_WORKER=true`
- `CORS_ORIGINS`: Your frontend URLs

### Option C: VPS Deployment (Digital Ocean, AWS EC2, etc.)

```bash
# 1. SSH into your server
ssh user@your-server-ip

# 2. Install dependencies
sudo apt update
sudo apt install -y docker.io docker-compose git nodejs npm

# 3. Clone repository
git clone https://github.com/your-username/vault-guard.git
cd vault-guard

# 4. Configure environment
cp apps/web/.env.example apps/web/.env
cp apps/api/.env.example apps/api/.env
# Edit .env files

# 5. Deploy with Docker
docker-compose up -d --build

# 6. Setup nginx reverse proxy (optional)
sudo apt install -y nginx
sudo nano /etc/nginx/sites-available/vault-guard
```

Sample Nginx config:
```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:80;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    location /api {
        proxy_pass http://localhost:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

## Database Setup

### Initialize Database

```bash
# Using Docker
docker-compose exec api npx prisma migrate deploy

# Using local PostgreSQL
cd apps/api
npm run db:migrate
```

### Database Backup

```bash
# Backup
docker-compose exec postgres pg_dump -U postgres vault_guard > backup.sql

# Restore
docker-compose exec -T postgres psql -U postgres vault_guard < backup.sql
```

## Monitoring and Logs

### Health Checks

```bash
# API health
curl http://localhost:3001/health

# Expected response:
{
  "status": "ok",
  "timestamp": "2024-01-05T10:00:00.000Z",
  "uptime": 3600,
  "environment": "production",
  "services": {
    "api": "healthy",
    "database": "healthy",
    "redis": "healthy"
  }
}
```

### Logs

```bash
# View all logs
docker-compose logs -f

# View specific service logs
docker-compose logs -f api
docker-compose logs -f web
docker-compose logs -f postgres

# View last 100 lines
docker-compose logs --tail=100 api
```

### Monitoring

Consider adding:
- **Sentry** for error tracking
- **DataDog** or **New Relic** for performance monitoring
- **Uptime Robot** for uptime monitoring
- **Grafana + Prometheus** for metrics

## Troubleshooting

### Frontend Issues

**Problem**: "Cannot connect to wallet"
- Ensure Sui wallet extension is installed
- Check if wallet is connected to correct network (testnet/mainnet)
- Verify VITE_PACKAGE_ID is correct

**Problem**: "Failed to upload to Walrus"
- Check Walrus network status
- Verify file size is within limits
- Check browser console for detailed errors

### Backend Issues

**Problem**: "Database connection failed"
```bash
# Check database status
docker-compose exec postgres psql -U postgres -c "SELECT 1"

# Check connection string
echo $DATABASE_URL

# Restart database
docker-compose restart postgres
```

**Problem**: "Redis connection failed"
```bash
# Check Redis status
docker-compose exec redis redis-cli ping

# Restart Redis
docker-compose restart redis
```

**Problem**: "Worker not processing reminders"
- Ensure `ENABLE_WORKER=true` in .env
- Check Redis connection
- View worker logs: `docker-compose logs -f api | grep Worker`

### Build Issues

**Problem**: "Module not found"
```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

**Problem**: "Prisma client not generated"
```bash
cd apps/api
npm run db:generate
```

### Performance Issues

**Problem**: "Slow API responses"
- Check database query performance
- Add database indexes if needed
- Enable Redis caching
- Increase API rate limits if needed

**Problem**: "Large bundle size"
```bash
# Analyze bundle
cd apps/web
npm run build
npx vite-bundle-visualizer
```

## Security Considerations

1. **Never commit `.env` files** to version control
2. **Use strong database passwords** in production
3. **Enable HTTPS** for production deployments
4. **Set proper CORS origins** - don't use wildcard (*)
5. **Keep dependencies updated**: `npm audit fix`
6. **Use environment-specific configurations**
7. **Enable rate limiting** on API endpoints
8. **Monitor for security vulnerabilities**

## Scaling Considerations

### Horizontal Scaling

```yaml
# docker-compose.yml - Scale API instances
services:
  api:
    deploy:
      replicas: 3
```

### Database Optimization

```sql
-- Add indexes for frequently queried fields
CREATE INDEX idx_receipts_user_id ON receipts(user_id);
CREATE INDEX idx_receipts_warranty_expiry ON receipts(warranty_expiry);
CREATE INDEX idx_reminders_remind_at ON reminders(remind_at);
```

### Caching Strategy

Consider adding Redis caching for:
- User receipt lists
- Frequently accessed receipts
- Reminder notifications

## Maintenance

### Regular Tasks

1. **Weekly**: Check logs for errors
2. **Monthly**: Update dependencies
3. **Quarterly**: Review security advisories
4. **Database backups**: Daily automated backups

### Updates

```bash
# Update dependencies
npm update

# Update Docker images
docker-compose pull
docker-compose up -d --build
```

## Support

For issues and questions:
- GitHub Issues: https://github.com/your-username/vault-guard/issues
- Documentation: https://github.com/your-username/vault-guard/wiki
