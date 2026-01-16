## Context
NestJS dependencies are currently on major version 10, but some toolchain packages now require NestJS 11. This creates peer dependency conflicts and blocks automated security updates.

## Goals / Non-Goals
- Goals:
  - Upgrade to NestJS 11 with a consistent, compatible dependency set.
  - Preserve runtime behavior and API contracts where possible.
  - Keep the upgrade scoped to backend dependencies and required code changes.
- Non-Goals:
  - No new features or API surface changes.
  - No frontend changes beyond dependency alignment if required.

## Decisions
- Decision: Target NestJS 11 across all @nestjs/* packages to avoid mixed majors.
- Decision: Prefer minimal code changes needed to satisfy NestJS 11 breaking changes.

## Risks / Trade-offs
- Risk: Breaking changes in NestJS 11 may require refactors or config updates.
  Mitigation: Follow migration notes and update tests to confirm behavior.
- Risk: Transitive dependency updates may affect runtime.
  Mitigation: Run full test, lint, and type-check suites.

## Migration Plan
1. Bump @nestjs/* and related tooling packages to v11-compatible versions.
2. Fix compile/runtime issues caused by breaking changes.
3. Run test, lint, and type-check.
4. Document any user-visible behavior changes.

## Open Questions
- Are there any specific modules that should remain on v10 due to compatibility constraints?
