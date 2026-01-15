# Design: Consolidated CLI entrypoint for serve + admin seed

## Overview
Introduce a dedicated CLI entrypoint using `nest-commander` to handle both service startup and admin seeding. The CLI exposes `serve` to start the API and `newadmin` for create-only admin seeding. Startup seeding in `main.ts` is removed to avoid implicit behavior.

## Decisions
- **CLI library**: `nest-commander` (compatible with NestJS 10).
- **Create-only semantics**: No updates to existing admin records; explicit remediation is a separate operator action.
- **Config access**: Use `ConfigService` only (aligns with backend-standards).
- **Serve command**: Uses the same bootstrap path as the current `main.ts` startup for consistent app initialization.

## Command shape
- Command names: `serve`, `newadmin`
- Execution path: `node dist/cli <command>` (or `ts-node` for local dev) with the commands registered in a dedicated CLI module.

## Trade-offs
- Removing startup seeding means environments must invoke `newadmin` explicitly during setup/deploy.
- CLI commands require build artifacts (or ts-node) to run, but avoid unintended startup changes.
