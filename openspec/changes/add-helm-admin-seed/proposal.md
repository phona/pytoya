# Change: Add Helm admin seed job via values

## Why
Production deployments need an explicit, repeatable way to create the default admin user. A Helm post-install job tied to values makes the workflow predictable and avoids implicit startup seeding.

## What Changes
- Add Helm values for `admin.username` and `admin.password` to drive admin creation.
- Add a Helm post-install/post-upgrade Job that runs `node dist/cli newadmin` when admin values are provided.
- Wire the Job to the same config/secrets environment as the API so the CLI uses the correct DB/Redis settings.

## Impact
- Affected specs: kubernetes, auth
- Affected code: Helm chart templates/values
