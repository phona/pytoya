# Change: Upgrade NestJS to v11

## Why
- Resolve dependency conflicts where core packages require NestJS 11.
- Align with supported NestJS major version and reduce security exposure.

## What Changes
- **BREAKING** Upgrade all @nestjs/* runtime packages to major version 11.
- Update NestJS tooling packages to v11-compatible releases.
- Adjust API code/config/tests for NestJS 11 breaking changes.
- Re-run and fix automated checks (test, lint, type-check).

## Impact
- Affected specs: backend-standards
- Affected code: src/apps/api, package.json, package-lock.json
