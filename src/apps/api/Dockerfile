# Build stage (monorepo/workspaces: build from repo root context)
ARG NODE_IMAGE=node:20-alpine
FROM ${NODE_IMAGE} AS deps
WORKDIR /repo

# Install deps with the root lockfile, but only invalidate on dependency changes
COPY .npmrc package.json package-lock.json tsconfig.base.json ./
COPY src/apps/api/package.json src/apps/api/nest-cli.json src/apps/api/tsconfig*.json ./src/apps/api/
COPY src/apps/web/package.json ./src/apps/web/package.json
COPY src/shared/package.json src/shared/tsconfig.json ./src/shared/
RUN npm ci

FROM deps AS builder
COPY src/apps/api ./src/apps/api
RUN npm run build --workspace=@pytoya/api

# Runtime stage
FROM ${NODE_IMAGE} AS runner
WORKDIR /app
ENV NODE_ENV=production

RUN addgroup -g 1001 -S nodejs && adduser -S nestjs -u 1001

# Keep runtime simple/reliable: copy node_modules from build (includes dev deps)
COPY --from=deps /repo/node_modules ./node_modules
COPY --from=builder /repo/src/apps/api/dist ./dist

USER nestjs
EXPOSE 3000

CMD ["node", "dist/main.js"]
