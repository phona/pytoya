# Build stage (monorepo/workspaces: build from repo root context)
ARG NODE_IMAGE=node:20-alpine
FROM ${NODE_IMAGE} AS deps
WORKDIR /repo

# Install deps with the root lockfile, but only invalidate on dependency changes
COPY .npmrc package.json package-lock.json tsconfig.base.json ./
COPY src/apps/web/package.json src/apps/web/next.config.js src/apps/web/tsconfig*.json ./src/apps/web/
COPY src/apps/api/package.json ./src/apps/api/package.json
RUN npm ci

FROM deps AS builder
ARG NEXT_PUBLIC_API_URL=/api
ARG NEXT_PUBLIC_WS_URL=
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_WS_URL=$NEXT_PUBLIC_WS_URL

COPY src/apps/web ./src/apps/web
RUN npm run build --workspace=@pytoya/web

# Runtime stage
FROM ${NODE_IMAGE} AS runner
WORKDIR /app
ENV NODE_ENV=production

RUN addgroup -g 1001 -S nodejs && adduser -S nextjs -u 1001

# Next.js standalone output bundles its own node_modules
COPY --from=builder /repo/src/apps/web/.next/standalone ./
COPY --from=builder /repo/src/apps/web/.next/static ./.next/static

USER nextjs
EXPOSE 3000

CMD ["node", "server.js"]
