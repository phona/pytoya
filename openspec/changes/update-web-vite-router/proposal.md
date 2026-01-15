# Change: Migrate web app to Vite + React Router

## Why
The current frontend uses Next.js App Router even though the app is a client-only SPA backed by NestJS. Migrating to Vite simplifies the stack and aligns tooling with a pure SPA approach.

## What Changes
- Replace Next.js App Router with a Vite + React Router data router setup.
- Replace Next.js-specific features (metadata, next/font, next/navigation) with SPA equivalents.
- Update frontend build and dev tooling from Next.js to Vite.
- Switch frontend unit testing from Jest to Vitest.
- **BREAKING** Update monorepo expectations for frontend app structure and scripts.

## Impact
- Affected specs: monorepo, testing
- Affected code: src/apps/web (routing, app entry, config), root package scripts, Docker/K8s web build config
