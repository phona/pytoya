# Implementation Tasks

## 1. Install Dependencies
- [ ] 1.1 Install `@nestjs/throttler`: `npm install @nestjs/throttler`
- [ ] 1.2 Install `@nestjs/helmet`: `npm install @nestjs/helmet`
- [ ] 1.3 Install `@types/helmet` for TypeScript support

## 2. Add CORS Configuration
- [ ] 2.1 Add `security.cors` section to `config.yaml`
- [ ] 2.2 Update `app.config.ts` to read CORS settings from config
- [ ] 2.3 Update `env.validation.ts` to validate CORS config
- [ ] 2.4 Update `main.ts` to enable CORS from config
- [ ] 2.5 Set default development origin (localhost:3001)

## 3. Add Security Headers (Helmet)
- [ ] 3.1 Import and configure Helmet in `main.ts`
- [ ] 3.2 Configure Content-Security-Policy for API
- [ ] 3.3 Configure HSTS (HTTP Strict Transport Security)
- [ ] 3.4 Add X-Frame-Options to prevent clickjacking
- [ ] 3.5 Add X-Content-Type-Options to prevent MIME-sniffing

## 4. Protect Static File Routes
- [ ] 4.1 Create `src/apps/api/src/common/guards/jwt-or-public.guard.ts`
- [ ] 4.2 Update main.ts to wrap `/uploads` route with authentication
- [ ] 4.3 Add file ownership check to guard (user can only access their files)
- [ ] 4.4 Test file access with and without authentication

## 5. Strengthen Password Validation
- [ ] 5.1 Update `register.dto.ts` with complexity requirements:
  - Minimum 8 characters
  - At least one uppercase letter
  - At least one lowercase letter
  - At least one number
  - At least one special character
- [ ] 5.2 Add maximum length constraint (128 characters)
- [ ] 5.3 Update password change DTO if exists
- [ ] 5.4 Add validation tests

## 6. Add Username Validation
- [ ] 6.1 Update `register.dto.ts` with username requirements:
  - Minimum 3 characters
  - Maximum 50 characters
  - Alphanumeric plus underscore and hyphen only
  - Must start with letter
- [ ] 6.2 Add validation tests
- [ ] 6.3 Update login DTO with same validation

## 7. Implement Account Lockout
- [ ] 7.1 Add `failedLoginAttempts` column to UserEntity
- [ ] 7.2 Add `lockedUntil` column to UserEntity
- [ ] 7.3 Create database migration for new columns
- [ ] 7.4 Update `auth.service.ts` to track failed attempts
- [ ] 7.5 Implement lockout logic (5 attempts = 15 minute lockout)
- [ ] 7.6 Add admin endpoint to unlock users
- [ ] 7.7 Return clear error message for locked accounts
- [ ] 7.8 Add tests for lockout behavior

## 8. Add Rate Limiting (Throttler)
- [ ] 8.1 Configure `@nestjs/throttler` in app.module.ts
- [ ] 8.2 Add rate limit to auth endpoints (10 requests per minute)
- [ ] 8.3 Add rate limit to login endpoint (stricter: 5 per minute)
- [ ] 8.4 Add rate limit to registration (3 per minute per IP)
- [ ] 8.5 Configure storage (Redis if available, in-memory fallback)

## 9. Create Global Exception Filter
- [ ] 9.1 Create `src/apps/api/src/common/filters/all-exceptions.filter.ts`
- [ ] 9.2 Implement consistent error response format
- [ ] 9.3 Sanitize error messages (remove stack traces in production)
- [ ] 9.4 Log all errors with request ID
- [ ] 9.5 Register filter in main.ts
- [ ] 9.6 Add tests for error responses

## 10. Update User Entity
- [ ] 10.1 Add `failedLoginAttempts` property
- [ ] 10.2 Add `lockedUntil` property
- [ ] 10.3 Add `lastLoginAt` property
- [ ] 10.4 Add `lastFailedLoginAt` property

## 11. Add Request ID Tracking
- [ ] 11.1 Create request ID middleware
- [ ] 11.2 Add X-Request-ID header to responses
- [ ] 11.3 Include request ID in all error responses
- [ ] 11.4 Include request ID in all logs

## 12. Update Documentation
- [ ] 12.1 Update CLAUDE.md with new security features
- [ ] 12.2 Document security config section in config.yaml
- [ ] 12.3 Document password/username requirements
- [ ] 12.4 Document account lockout behavior
- [ ] 12.5 Document environment variables for security config
- [ ] 12.6 Add security setup to README

## 13. Add Tests
- [ ] 13.1 Test CORS with allowed/disallowed origins
- [ ] 13.2 Test file upload access control
- [ ] 13.3 Test password validation (valid and invalid)
- [ ] 13.4 Test username validation (valid and invalid)
- [ ] 13.5 Test account lockout flow
- [ ] 13.6 Test rate limiting on auth endpoints
- [ ] 13.7 Test global exception filter
- [ ] 13.9 Test request ID tracking

## 14. Migration Guide
- [ ] 14.1 Document password complexity upgrade impact
- [ ] 14.2 Document existing user migration strategy
- [ ] 14.3 Create admin tool to identify weak passwords
- [ ] 14.4 Document rollback procedure

## 15. Validation
- [ ] 15.1 Run `openspec validate harden-application-security --strict`
- [ ] 15.2 Test all security measures locally
- [ ] 15.3 Test with Docker environment
- [ ] 15.4 Security audit before production deploy
