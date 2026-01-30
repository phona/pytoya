# Security Configuration

This document describes application-level security settings and policies.

## Config Section

Security settings live under `security` in `src/apps/api/config.yaml`.

### CORS
Environment overrides:
- `ENABLE_CORS` (default: true)
- `ALLOWED_ORIGIN_1` (default: `http://localhost:3001`)
- `ALLOWED_ORIGIN_2` (default: empty)

### Rate Limiting
Environment overrides:
- `RATE_LIMIT_ENABLED` (default: true)
- `RATE_LIMIT_TTL` (default: 60000 ms)
- `RATE_LIMIT_LIMIT` (default: 120 requests)
- `RATE_LIMIT_STORAGE` (default: `memory`, or `redis`)

### Account Lockout
Environment overrides:
- `ACCOUNT_LOCKOUT_ENABLED` (default: true)

Thresholds are configured in `src/apps/api/config.yaml` under `security.accountLockout.thresholds`.

## Password Policy
- Minimum length: 8
- Maximum length: 128
- Must include uppercase, lowercase, number, and special character

### CLI Exception (Dev Only)
The `newuser` CLI command supports `--allow-weak-password` to create test accounts that do not meet the password policy.
This flag is blocked when `NODE_ENV=production`.

## Username Policy
- 3 to 50 characters
- Must start with a letter
- Allowed characters: letters, numbers, `_`, `-`

## File Access Protection
The `/api/uploads` route (relative to the deployment base path) requires a valid JWT and checks project ownership.
Admins bypass ownership checks.

## Authorization
PyToYa enforces authorization using a combination of:
- JWT authentication (`JwtAuthGuard`) to require a valid user session.
- CASL abilities (`@casl/ability`) for centralized “admin vs project owner” policy checks.

High-level policy:
- **Admin** can manage all resources.
- **Non-admin** is restricted to project-owned resources (projects/groups/manifests/schemas/validation scripts) and may only read global catalogs (e.g. extractor list).

## Secret Masking
PyToYa never returns stored secrets (e.g. LLM API keys, extractor API keys) in API responses.

- LLM model `parameters` secret fields are returned as `********`.
- Text extractor `config` secret fields are returned as `********`.
- Updates MAY send `********` for secret fields to indicate “keep existing value”.
- Use “Test Connection” in the UI to verify a configured secret; there is no “reveal secret” endpoint.

## Request Tracing
All responses include `X-Request-ID` and error payloads include `requestId` for correlation.
