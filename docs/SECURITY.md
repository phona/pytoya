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

## Username Policy
- 3 to 50 characters
- Must start with a letter
- Allowed characters: letters, numbers, `_`, `-`

## File Access Protection
The `/uploads` route requires a valid JWT and checks project ownership.
Admins bypass ownership checks.

## Request Tracing
All responses include `X-Request-ID` and error payloads include `requestId` for correlation.
