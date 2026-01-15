## Context
Migrations are currently run manually. In Kubernetes, running migrations as part of application startup risks race conditions when multiple replicas start. A Helm-managed Job can run once per release operation before API pods start.

## Goals / Non-Goals
- Goals:
  - Run migrations as a one-time Job during Helm install/upgrade.
  - Keep migration execution decoupled from API pod lifecycle.
  - Fail deployment if migrations fail.
- Non-Goals:
  - Automatic retries beyond Kubernetes Job defaults.
  - Multi-tenant or multi-database orchestration.

## Decisions
- Decision: Use a Helm hook (pre-install, pre-upgrade) to run a migration Job based on the API image.
- Decision: The Job runs the TypeORM migration command used in the API workspace.
- Decision: The Job reuses the API env/secrets and runs with the same service account as the API unless a dedicated one is introduced.
- Alternatives considered:
  - Init containers in API deployments: rejected due to race conditions and repeated execution on restarts.
  - Manual CI/CD step only: rejected because user requested Helm wiring and pre-install hook.

## Risks / Trade-offs
- Hooked Jobs can delay installs/upgrades; failed migrations block rollout.
- Concurrency: Helm hooks run once per release, but multiple simultaneous deploys still require operational coordination.

## Migration Plan
- Add Job template with hook annotations and job TTL cleanup.
- Ensure Job uses the same environment variables/secrets as API.
- Add Helm values for enabling/disabling the Job, backoff limit, and TTL seconds after finished.
- Document required values and the migration command.

## Open Questions
- None (scope and trigger confirmed).
