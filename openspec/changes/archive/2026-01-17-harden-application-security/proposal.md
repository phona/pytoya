# Change: Harden Application-Level Security

## Why

The API application has several critical security vulnerabilities that a WAF cannot address:

1. **No CORS configuration** - Allows any origin to make requests
2. **Exposed static files** - `/uploads` route serves files without authentication
3. **Missing security headers** - No CSP, X-Frame-Options, etc.
4. **Weak password policy** - Only 6 character minimum, no complexity requirements
5. **No username validation** - No length/format constraints
6. **No account lockout** - Vulnerable to credential stuffing
7. **Inconsistent error handling** - May leak sensitive information

These issues pose significant security risks and must be addressed before production deployment.

## What Changes

### Critical Security Fixes
- **ADDED**: CORS configuration with origin whitelist
- **ADDED**: Authentication guard for `/uploads` route
- **ADDED**: Security headers via `@nestjs/helmet`
- **MODIFIED**: Password validation with complexity requirements
- **MODIFIED**: Username validation with length/format constraints
- **ADDED**: Account lockout after failed login attempts
- **ADDED**: Global exception filter for consistent error responses

### Breaking Changes
- Password requirements become stricter (complexity enforced)
- Username requirements become stricter (length/format enforced)
- File uploads require authentication (previously public)
- CORS is enabled by default and must be configured in config.yaml

## Impact

- **Affected specs**: backend-standards, auth
- **Affected code**:
  - `src/apps/api/src/main.ts` (CORS, Helmet)
  - `src/apps/api/src/auth/dto/register.dto.ts` (password validation)
  - `src/apps/api/src/auth/dto/login.dto.ts` (username validation)
  - `src/apps/api/src/auth/auth.service.ts` (account lockout)
  - `src/apps/api/src/common/filters/` (global exception filter - new)
  - `src/apps/api/src/common/guards/` (file upload guard - new)
  - `src/apps/api/src/users/users.entity.ts` (add failed login tracking)
- **Migration**: Existing users with weak passwords may need to reset
- **Security**: Significantly reduces attack surface
