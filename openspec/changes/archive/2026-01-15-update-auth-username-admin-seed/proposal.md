# Change: Replace email auth with username and seed default admin

## Why
Current authentication uses email as the identifier, but the product direction requires username/password login and a predictable admin bootstrap for early-stage usage.

## What Changes
- **BREAKING**: Replace email-based authentication and registration with username-based auth in API and UI (no migration; development-stage reset acceptable).
- Add a startup bootstrap that creates a default admin user when none exists, using `ADMIN_USERNAME` and `ADMIN_PASSWORD` env values.
- Admin seed runs on API startup, skips if an admin exists, and logs an error if required env vars are missing.
- Remove email requirements from auth DTOs, validation, and UI flows.
- **Planned follow-up**: Replace startup seeding with an explicit CLI command (create-only) using a NestJS CLI helper; remove startup seeding after the CLI path is in place.

## Impact
- Affected specs: auth, database
- Affected code: NestJS auth/users modules, user entity/migrations, Next.js auth pages and hooks
