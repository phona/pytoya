# Build stage (monorepo/workspaces: build from repo root context)
ARG NODE_IMAGE=node:20-alpine
FROM ${NODE_IMAGE} AS deps
WORKDIR /repo

# Install deps with the root lockfile, but only invalidate on dependency changes
COPY .npmrc package.json package-lock.json tsconfig.base.json ./
COPY src/apps/web/package.json src/apps/web/tsconfig*.json ./src/apps/web/
COPY src/shared/package.json src/shared/tsconfig.json ./src/shared/
RUN npm ci -w @pytoya/web -w @pytoya/shared

FROM deps AS builder
ARG VITE_API_URL=/api
ARG VITE_WS_URL=
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_WS_URL=$VITE_WS_URL

COPY src/shared/src ./src/shared/src
COPY src/apps/web ./src/apps/web
RUN npm run build --workspace=@pytoya/web

# Runtime stage
FROM nginxinc/nginx-unprivileged:1.27-alpine AS runner
COPY src/apps/web/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /repo/src/apps/web/dist /usr/share/nginx/html
EXPOSE 3000
