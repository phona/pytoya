# Design: Helm admin seed job

## Overview
Introduce a Helm hook Job that runs after install/upgrade. The Job executes `node dist/cli newadmin` when admin values are set, using the same environment as the API deployment. The job is create-only and safe to re-run.

## Decisions
- **Hook type**: Post-install and post-upgrade Job for explicit admin creation.
- **Trigger**: Only render/run Job when `admin.username` and `admin.password` are set.
- **Secrets**: Store admin credentials in the existing chart Secret to avoid plaintext in the Job manifest.

## Trade-offs
- Hooks add cluster resources that must be cleaned up; use hook-delete-policy.
- Re-running on upgrade is safe because the command is create-only.
