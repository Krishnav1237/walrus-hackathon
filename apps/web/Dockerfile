# Production Dockerfile for VaultGuard Web App
FROM node:18-alpine AS base

# Install dependencies only when needed
FROM base AS deps
WORKDIR /app

# Copy package files
COPY apps/web/package*.json ./apps/web/
COPY package*.json ./

# Install dependencies
RUN cd apps/web && npm ci --only=production

# Build the application
FROM base AS builder
WORKDIR /app

# Copy dependencies
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/web/node_modules ./apps/web/node_modules

# Copy source
COPY apps/web ./apps/web
COPY package*.json ./

# Build
WORKDIR /app/apps/web
RUN npm run build

# Production image
FROM nginx:alpine AS runner

# Copy built files
COPY --from=builder /app/apps/web/dist /usr/share/nginx/html

# Copy nginx configuration
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
