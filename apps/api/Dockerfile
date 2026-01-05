# Production Dockerfile for VaultGuard API
FROM node:18-alpine AS base

# Install dependencies only when needed
FROM base AS deps
WORKDIR /app

# Copy package files
COPY apps/api/package*.json ./apps/api/
COPY apps/api/prisma ./apps/api/prisma
COPY package*.json ./

# Install dependencies
RUN cd apps/api && npm ci --only=production

# Generate Prisma client
RUN cd apps/api && npx prisma generate

# Build the application
FROM base AS builder
WORKDIR /app

# Copy dependencies
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/api/node_modules ./apps/api/node_modules

# Copy source
COPY apps/api ./apps/api
COPY package*.json ./

# Build
WORKDIR /app/apps/api
RUN npm run build

# Production image
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production

# Install wget for health checks
RUN apk add --no-cache wget

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 appuser

# Copy built application
COPY --from=builder --chown=appuser:nodejs /app/apps/api/dist ./dist
COPY --from=builder --chown=appuser:nodejs /app/apps/api/node_modules ./node_modules
COPY --from=builder --chown=appuser:nodejs /app/apps/api/prisma ./prisma
COPY --from=builder --chown=appuser:nodejs /app/apps/api/package*.json ./

# Copy health check script
COPY --chown=appuser:nodejs apps/api/healthcheck.sh /healthcheck.sh
RUN chmod +x /healthcheck.sh

USER appuser

EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD /healthcheck.sh

CMD ["node", "dist/index.js"]
