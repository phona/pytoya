# Build stage (monorepo/workspaces: build from repo root context)
ARG NODE_IMAGE=node:20-alpine
FROM ${NODE_IMAGE} AS deps
WORKDIR /repo

# Install deps with the root lockfile, but only invalidate on dependency changes
COPY .npmrc package.json package-lock.json tsconfig.base.json ./
COPY src/apps/web/package.json src/apps/web/tsconfig*.json ./src/apps/web/
COPY src/apps/api/package.json ./src/apps/api/package.json
RUN npm ci

FROM deps AS builder
ARG VITE_API_URL=/api
ARG VITE_WS_URL=
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_WS_URL=$VITE_WS_URL

COPY src/apps/web ./src/apps/web
RUN npm run build --workspace=@pytoya/web

# Runtime stage
FROM ${NODE_IMAGE} AS runner
WORKDIR /app
ENV NODE_ENV=production

RUN addgroup -g 1001 -S nodejs && adduser -S web -u 1001

# Serve static assets with a minimal server
COPY --from=builder /repo/src/apps/web/dist ./dist
RUN npm install -g serve

USER web
EXPOSE 3000

CMD ["serve", "-s", "dist", "-l", "3000"]
