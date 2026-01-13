# Change: Monorepo Restructuring

## Why
Current codebase is a Python CLI application with YAML-based storage. To enable modern web UI, real-time processing, and better maintainability, the project needs to be restructured as a TypeScript monorepo with separate backend (NestJS) and frontend (Next.js) applications.

## What Changes
- Create monorepo structure with `src/apps/api` (NestJS) and `src/apps/web` (Next.js)
- Set up root package.json with npm workspaces
- Configure Docker Compose to run both apps and dependencies (PostgreSQL, Redis)
- Create shared types in `src/libs/` (optional)
- Update build scripts for monorepo management
- Initialize TypeScript configurations for both apps

## Impact
- Affected specs: New architecture (no existing specs to modify)
- Affected code: Complete restructuring from Python CLI to TypeScript monorepo
- **BREAKING**: Python CLI becomes legacy; new TypeScript apps replace all functionality
