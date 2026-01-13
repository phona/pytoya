# Build stage
FROM node:18-alpine AS builder
WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./
COPY tsconfig.base.json ./

# Install dependencies
RUN npm ci

# Copy source and build
COPY . .
RUN npm run build

# Production stage
FROM node:18-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nestjs -u 1001

# Copy package files
COPY package.json package-lock.json ./
RUN npm ci --only=production

# Copy built application
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules

# Create uploads directory
RUN mkdir -p /app/uploads && chown -R nestjs:nodejs /app

USER nestjs
EXPOSE 3000

CMD ["node", "dist/main.js"]
