# Change: Consolidate CLI entrypoint for serve + admin seed

## Why
Admin credentials are currently bootstrapped at API startup, which makes creation implicit and tied to app runtime. An explicit CLI command is safer and predictable for deployments, while keeping create-only behavior for the admin user.

## What Changes
- Add a CLI entrypoint with two commands:
  - `serve` starts the full API service.
  - `newadmin` seeds the default admin user using `ADMIN_USERNAME` and `ADMIN_PASSWORD` when no admin exists.
- Remove startup seeding once the CLI path is in place (admin creation becomes an explicit operator action).
- Keep admin seed behavior create-only (no updates to existing admin credentials).

## Impact
- Affected specs: auth, backend-standards (CLI runtime access), testing
- Affected code: NestJS app bootstrap, users module, new CLI entrypoint
