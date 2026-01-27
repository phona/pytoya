# Build stage (monorepo/workspaces: build from repo root context)
ARG NODE_IMAGE=node:20-alpine
FROM ${NODE_IMAGE} AS deps
WORKDIR /repo

# Install deps with the root lockfile, but only invalidate on dependency changes
COPY .npmrc package.json package-lock.json tsconfig.base.json ./
COPY src/apps/api/package.json src/apps/api/nest-cli.json src/apps/api/tsconfig*.json ./src/apps/api/
COPY src/shared/package.json src/shared/tsconfig.json ./src/shared/
RUN npm ci -w @pytoya/api

FROM deps AS builder
COPY src/apps/api ./src/apps/api
COPY src/shared ./src/shared
RUN npm run build --workspace=@pytoya/api

# Prune dev deps so runtime image is smaller
FROM deps AS prod-deps
RUN npm prune --omit=dev -w @pytoya/api

# Runtime stage
FROM ${NODE_IMAGE} AS runner
WORKDIR /app
ENV NODE_ENV=production

RUN addgroup -g 1001 -S nodejs && adduser -S nestjs -u 1001

# Copy pruned node_modules for smaller runtime image
COPY --from=prod-deps /repo/node_modules ./node_modules
COPY --from=builder /repo/src/apps/api/dist ./dist

USER nestjs
EXPOSE 3000

CMD ["node", "dist/main.js"]
