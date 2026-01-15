# Change: Add Helm-managed migration Job

## Why
Database schema changes need a safe, explicit mechanism in Kubernetes that runs migrations once per deploy and avoids pod startup races.

## What Changes
- Add a Helm-managed migration Job that runs before API pods start (pre-install/pre-upgrade hook).
- Run the Job using the same API image/tag so migration code matches the deployed application.
- Define the migration command and environment wiring (reuse API env/secrets).
- Expose Helm values to enable/disable the Job, configure TTL cleanup, and set backoff limits.
- Document the operational flow and failure behavior for migrations during deploys.

## Impact
- Affected specs: `openspec/specs/kubernetes/spec.md`, `openspec/specs/database/spec.md`
- Affected code: Helm chart templates/values (proposal stage only)
