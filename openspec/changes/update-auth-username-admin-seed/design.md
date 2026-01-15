## Context
Authentication currently uses email/password, and there is no bootstrap admin account. The change introduces a new identifier (username) and a startup seed behavior.

## Goals / Non-Goals
- Goals:
  - Replace email with username as the sole login identifier.
  - Seed a default admin user from environment variables if no admin exists.
  - Keep the change minimal and aligned with existing NestJS patterns.
- Non-Goals:
  - Support login via email.
  - Add a self-service username reset flow.
  - Provide admin UI for user management.

## Decisions
- Decision: Add `username` to the User entity and remove email requirement for auth flows.
  - Reason: The product direction explicitly moves to username/password.
- Decision: Create default admin user on application startup only if no admin exists.
  - Reason: Avoid overwriting credentials while enabling easy first-time access.
- Decision: Admin credentials come from `ADMIN_USERNAME` and `ADMIN_PASSWORD` environment variables.
  - Reason: Avoid hardcoded secrets and support deployment configuration.

## Risks / Trade-offs
- Risk: Removing email may break any downstream expectations or integrations.
  - Mitigation: Treat as breaking change and update affected API/UI flows together.
- Risk: Missing env vars could block first-time admin access.
  - Mitigation: Validate presence at startup and log a clear error.

## Migration Plan
1. Add `username` column and update User entity; remove email-based validation requirements.
2. Update auth/register/login DTOs and service logic to use username.
3. Update UI forms, hooks, and auth store types to use username.
4. Add startup admin seeding and document required env vars.
5. No user data migration (development-stage reset acceptable).

## Open Questions
- None (requirements provided and environment-configured admin accepted).
