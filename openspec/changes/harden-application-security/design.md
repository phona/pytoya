# Design: Harden Application-Level Security

## Context

The PyToYa API has critical security vulnerabilities that a WAF cannot address:
- No CORS configuration
- Public access to uploaded files (invoices contain sensitive data)
- Missing security headers
- Weak authentication policies
- No protection against credential stuffing
- Inconsistent error handling

### Constraints

- Must maintain backward compatibility where possible
- Breaking changes should be documented clearly
- Security measures should not degrade performance significantly
- Must follow NestJS best practices
- Must comply with existing backend-standards spec

### Stakeholders

- **Security**: All vulnerabilities must be addressed
- **Users**: Existing users may be affected by stricter password policies
- **Frontend**: CORS changes may require configuration updates
- **Operations**: New monitoring/logging for security events

## Goals / Non-Goals

### Goals
1. Implement all critical application-level security measures
2. Provide clear error messages without leaking sensitive information
3. Maintain reasonable performance
4. Enable monitoring and auditing of security events
5. Follow security best practices (OWASP)

### Non-Goals
1. Password reset flow (separate feature proposal)
2. Refresh token mechanism (separate feature proposal)
3. Two-factor authentication (future enhancement)
4. API rate limiting per user (basic throttling only)
5. Swagger documentation (separate proposal)

## Decisions

### Decision 1: CORS Configuration

**Choice**: Enable CORS with configurable origin whitelist via config file

**Configuration**:
```yaml
# config.yaml
server:
  port: 3000
  logLevel: info

security:
  cors:
    enabled: {{ENABLE_CORS}}
    allowedOrigins:
      - {{default ALLOWED_ORIGIN_1 "http://localhost:3001"}}
      - {{default ALLOWED_ORIGIN_2 ""}}
    credentials: true
    methods:
      - GET
      - POST
      - PUT
      - DELETE
      - PATCH
    allowedHeaders:
      - Content-Type
      - Authorization
```

**Implementation**:
```typescript
// main.ts
const config = app.get(ConfigService);
if (config.get('security.cors.enabled')) {
  app.enableCors({
    origin: config.get('security.cors.allowedOrigins'),
    credentials: config.get('security.cors.credentials'),
    methods: config.get('security.cors.methods'),
    allowedHeaders: config.get('security.cors.allowedHeaders'),
  });
}
```

**Rationale**:
- Credentials required for JWT cookies/tokens
- Whitelist approach prevents unauthorized origins
- Config file centralizes all security settings
- Template variables allow environment-specific values

**Alternatives Rejected**:
- `origin: '*'` + credentials - Browsers reject this combination
- Environment variables only - Less consistent with config.yaml pattern

### Decision 2: Static File Authentication

**Choice**: Create JwtOrPublicGuard that authenticates but allows read-only access to user's own files

**Implementation**:
```typescript
@Injectable()
export class JwtOrPublicGuard implements CanActivate {
  async canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;

    if (!authHeader) {
      throw new UnauthorizedException('Authentication required');
    }

    // Validate JWT and file ownership
    const user = await this.jwtService.verify(authHeader);
    const filePath = request.path;

    // Check if user owns this file (query manifest entity)
    return this.fileAccessService.canAccess(user.id, filePath);
  }
}
```

**Rationale**:
- Files contain sensitive invoice data
- User isolation prevents data leakage
- Guard pattern follows NestJS conventions

**File Ownership Check**:
- Query ManifestEntity to verify file belongs to user's project
- Return 403 if access denied
- Return 404 if file doesn't exist (don't leak existence)

### Decision 3: Password Complexity Requirements

**Choice**: Enforce industry-standard password policy

**Requirements**:
- Minimum 8 characters (increased from 6)
- At least one uppercase letter
- At least one lowercase letter
- At least one number
- At least one special character
- Maximum 128 characters

**Implementation**:
```typescript
// register.dto.ts
export class RegisterDto {
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
  password!: string;
}
```

**Rationale**:
- Aligns with OWASP recommendations
- Prevents common weak passwords
- Special character requirement increases entropy

**Existing User Migration**:
- Flag accounts with weak passwords (require reset on next login)
- Admin tool to identify affected users
- Graceful migration (not immediate rejection)

### Decision 4: Username Validation

**Choice**: Restrict usernames to alphanumeric with limited special characters

**Requirements**:
- 3-50 characters
- Alphanumeric, underscore, hyphen only
- Must start with a letter
- Case-insensitive unique

**Implementation**:
```typescript
@IsString()
@MinLength(3)
@MaxLength(50)
@Matches(/^[a-zA-Z][a-zA-Z0-9_-]*$/)
@Matches(/^(?=.*[a-zA-Z]).*$/)  // At least one letter
username!: string;
```

**Rationale**:
- Prevents confusion (special characters like Unicode lookalikes)
- Prevents SQL injection (though ORM handles this)
- Consistent with modern username conventions

### Decision 5: Account Lockout Policy

**Choice**: Progressive lockout with exponential backoff

**Policy**:
- 5 failed attempts = 15 minute lockout
- 10 failed attempts = 1 hour lockout
- 15 failed attempts = Permanent lock (admin unlock required)
- Reset counter on successful login
- Reset counter after 24 hours of inactivity

**Implementation**:
```typescript
// users.entity.ts
@Entity()
export class UserEntity {
  // ... existing columns
  @Column({ default: 0 })
  failedLoginAttempts: number;

  @Column({ type: 'timestamp', nullable: true })
  lockedUntil: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  lastLoginAt: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  lastFailedLoginAt: Date | null;
}

// auth.service.ts
async login(dto: LoginDto) {
  const user = await this.usersRepository.findOne({
    where: { username: dto.username }
  });

  // Check if locked
  if (user.lockedUntil && user.lockedUntil > new Date()) {
    throw new UnauthorizedException(
      `Account locked until ${user.lockedUntil.toISOString()}`
    );
  }

  // Verify password
  if (!await bcrypt.compare(dto.password, user.password)) {
    user.failedLoginAttempts++;
    user.lastFailedLoginAt = new Date();

    // Apply lockout
    if (user.failedLoginAttempts >= 15) {
      user.lockedUntil = null; // Permanent lock
    } else if (user.failedLoginAttempts >= 10) {
      user.lockedUntil = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    } else if (user.failedLoginAttempts >= 5) {
      user.lockedUntil = new Date(Date.now() + 15 * 60 * 1000); // 15 min
    }

    await this.usersRepository.save(user);
    throw new UnauthorizedException('Invalid credentials');
  }

  // Successful login - reset counter
  user.failedLoginAttempts = 0;
  user.lockedUntil = null;
  user.lastLoginAt = new Date();
  await this.usersRepository.save(user);

  // ... generate token
}
```

**Rationale**:
- Exponential backoff prevents rapid retries
- Permanent lock protects against persistent attacks
- 24-hour reset prevents accidental permanent locks
- Clear error messages inform users of lockout

**Admin Unlock Endpoint**:
```typescript
@Post('users/:id/unlock')
@UseGuards(JwtAuthGuard, AdminGuard)
async unlockUser(@Param('id') id: string) {
  await this.usersRepository.update(id, {
    failedLoginAttempts: 0,
    lockedUntil: null,
  });
}
```

### Decision 6: Rate Limiting Strategy

**Choice**: Use `@nestjs/throttler` with Redis storage

**Configuration**:
```typescript
// app.module.ts
ThrottlerModule.forRoot([{
  name: 'short',
  ttl: 60000,      // 1 minute
  limit: 10,       // 10 requests
}, {
  name: 'strict',
  ttl: 60000,      // 1 minute
  limit: 5,        // 5 requests
}]),

// auth.controller.ts
@Throttle('strict', 5, 60)  // 5 requests per minute
@Post('login')
async login(@Body() dto: LoginDto) {
  // ...
}

@Throttle('short', 3, 60)  // 3 requests per minute
@Post('register')
async register(@Body() dto: RegisterDto) {
  // ...
}
```

**Rationale**:
- Stricter limits on auth endpoints (brute force protection)
- Registration limit prevents spam account creation
- Redis storage enables distributed rate limiting

### Decision 7: Security Headers (Helmet)

**Choice**: Use `@nestjs/helmet` with custom CSP

**Configuration**:
```typescript
// main.ts
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ['\'self\''],
      // API doesn't load scripts, but policy is still useful
    },
  },
  hsts: {
    maxAge: 31536000,  // 1 year
    includeSubDomains: true,
    preload: true,
  },
}));
```

**Headers Added**:
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `X-XSS-Protection: 1; mode=block`
- `Strict-Transport-Security: max-age=31536000; includeSubDomains; preload`
- `Content-Security-Policy: default-src 'self'`

**Rationale**:
- Defense-in-depth approach
- Prevents clickjacking, MIME-sniffing, XSS
- HSTS enforces HTTPS

### Decision 8: Global Exception Filter

**Choice**: Create centralized exception filter with consistent format

**Response Format**:
```typescript
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "User-friendly message",
    "requestId": "uuid-here",
    "timestamp": "2024-01-15T10:30:00Z",
    "path": "/api/auth/login"
  }
}
```

**Implementation**:
```typescript
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ExecutionContext) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const errorResponse = {
      error: {
        code: this.getErrorCode(exception),
        message: this.getUserMessage(exception),
        requestId: request.headers['x-request-id'] || 'unknown',
        timestamp: new Date().toISOString(),
        path: request.url,
      },
    };

    // Log error with request ID
    this.logger.error(
      `${request.headers['x-request-id']} - ${exception}`,
    );

    response.status(status).json(errorResponse);
  }

  private getErrorCode(exception: unknown): string {
    if (exception instanceof HttpException) {
      return `${exception.constructor.name}`;
    }
    return 'INTERNAL_SERVER_ERROR';
  }

  private getUserMessage(exception: unknown): string {
    // Return safe messages in production
    if (process.env.NODE_ENV === 'production') {
      if (exception instanceof HttpException) {
        return exception.message;
      }
      return 'An unexpected error occurred';
    }
    // Include stack trace in development
    return (exception as any).message;
  }
}
```

**Rationale**:
- Consistent error format across all endpoints
- Request ID enables log correlation
- Production mode prevents information leakage
- Development mode includes debugging info

### Decision 9: Request ID Tracking

**Choice**: Generate UUID if not provided by client

**Implementation**:
```typescript
@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  use(req: any, res: any, next: () => void) {
    req.id = req.headers['x-request-id'] || randomUUID();
    res.setHeader('X-Request-ID', req.id);
    next();
  }
}

// main.ts
app.use((req, res, next) => {
  req.id = req.headers['x-request-id'] || randomUUID();
  res.setHeader('X-Request-ID', req.id);
  Logger.log(`[${req.id}] ${req.method} ${req.url}`);
  next();
});
```

**Rationale**:
- Enables distributed tracing
- Correlates logs across services
- Helps debug production issues

## Architecture

### Security Layers

```
┌─────────────────────────────────────────────────────────────┐
│                         CORS Layer                          │
│  - Validates origin                                         │
│  - Enforces allowed methods/headers                         │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      Security Headers Layer                  │
│  - Helmet middleware                                        │
│  - CSP, HSTS, X-Frame-Options, etc.                        │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                     Rate Limiting Layer                      │
│  - Throttler guard                                          │
│  - Per-IP and per-endpoint limits                           │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                   Authentication Layer                       │
│  - JWT guard                                                │
│  - Account lockout check                                    │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                     Authorization Layer                      │
│  - Role-based access control                                │
│  - Resource ownership checks                                │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      Business Logic                          │
│  - Controllers and services                                 │
│  - Input validation (DTOs)                                  │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                   Exception Filter                           │
│  - Consistent error responses                               │
│  - Request ID tracking                                      │
│  - Sanitized messages (production)                          │
└─────────────────────────────────────────────────────────────┘
```

## Database Schema Changes

### User Entity Additions

```sql
-- Migration file
ALTER TABLE "user"
ADD COLUMN "failedLoginAttempts" INTEGER DEFAULT 0,
ADD COLUMN "lockedUntil" TIMESTAMP,
ADD COLUMN "lastLoginAt" TIMESTAMP,
ADD COLUMN "lastFailedLoginAt" TIMESTAMP;

-- Index for lockout queries
CREATE INDEX "idx_user_locked_until" ON "user"("lockedUntil")
WHERE "lockedUntil" IS NOT NULL;
```

## Environment Variables

```bash
# CORS Configuration (for config.yaml template)
ENABLE_CORS=true
ALLOWED_ORIGIN_1=http://localhost:3001
ALLOWED_ORIGIN_2=https://app.example.com

# Rate Limiting (uses Redis if configured)
REDIS_HOST=localhost
REDIS_PORT=6379

# Security
NODE_ENV=production  # Controls error detail level
```

## Configuration File Structure

```yaml
# config.yaml (with security section)
server:
  port: 3000
  logLevel: info

database:
  host: {{DB_HOST}}
  port: {{DB_PORT}}
  username: {{DB_USERNAME}}
  password: {{DB_PASSWORD}}

security:
  cors:
    enabled: {{ENABLE_CORS}}
    allowedOrigins:
      - {{default ALLOWED_ORIGIN_1 "http://localhost:3001"}}
      - {{default ALLOWED_ORIGIN_2 ""}}
    credentials: true
    methods:
      - GET
      - POST
      - PUT
      - DELETE
      - PATCH
    allowedHeaders:
      - Content-Type
      - Authorization

  rateLimit:
    enabled: true
    ttl: 60000
    limit: 10
    storage: redis  # or 'memory'

  accountLockout:
    enabled: true
    thresholds:
      - attempts: 5
        duration: 900000   # 15 minutes
      - attempts: 10
        duration: 3600000  # 1 hour
      - attempts: 15
        permanent: true

  passwordPolicy:
    minLength: 8
    maxLength: 128
    requireUppercase: true
    requireLowercase: true
    requireNumber: true
    requireSpecialChar: true
    specialChars: "@$!%*?&"

  usernamePolicy:
    minLength: 3
    maxLength: 50
    pattern: "^[a-zA-Z][a-zA-Z0-9_-]*$"
```

## Risks / Trade-offs

### Risk 1: Breaking Existing Frontend
**Risk**: CORS changes may block legitimate requests
**Mitigation**: Clear documentation, staged rollout, allow list testing

### Risk 2: User Experience Impact
**Risk**: Stricter password/username policies frustrate users
**Mitigation**: Clear error messages, helpful requirements text, migration period

### Risk 3: Account Lockout Abuse
**Risk**: Attacker deliberately locks victim's account
**Mitigation**: Reasonable thresholds, admin unlock capability, IP-based rate limiting

### Risk 4: Performance Impact
**Risk**: Additional middleware/database queries slow requests
**Mitigation**: Indexed queries, minimal middleware overhead, caching where appropriate

### Risk 5: False Positive Lockouts
**Risk**: Legitimate users get locked out
**Mitigation**: Clear error messages, reasonable time windows, self-unlock after timeout

### Trade-off: Security vs Usability
**Trade-off**: Stricter policies reduce usability
**Justification**: Security is critical for invoice processing system; clear documentation helps users

### Trade-off: Error Detail vs Information Leakage
**Trade-off**: Detailed errors help debugging but leak information
**Justification**: Environment-specific handling (dev=detail, prod=safe)

## Migration Plan

### Phase 1: Database Changes
1. Create migration for new User columns
2. Run migration in development
3. Test account lockout functionality

### Phase 2: Code Changes
1. Add new dependencies
2. Implement security features (independent of each other)
3. Add comprehensive tests
4. Update documentation

### Phase 3: Frontend Coordination
1. Document CORS requirements
2. Update error handling for new format
3. Update password/username validation messages

### Phase 4: Deployment
1. Deploy to development environment
2. Test all security measures
3. Deploy to staging
4. Conduct security audit
5. Deploy to production

### Phase 5: User Migration
1. Identify users with weak passwords
2. Force password reset on next login
3. Communicate changes to users

### Rollback Procedure
If deployment fails:
1. Revert code changes
2. Database columns remain (no rollback needed)
3. Restore previous configuration
4. Communicate with users

## Open Questions

1. **Should account lockout be IP-based or user-based?**
   - **Decision**: User-based (prevents distributed attacks)

2. **Should we notify users of failed login attempts?**
   - **Decision**: Optional future enhancement (email notifications)

3. **What should the permanent lockout threshold be?**
   - **Decision**: 15 failed attempts (configurable)

4. **Should rate limiting be per-IP or per-user?**
   - **Decision**: Per-IP for auth endpoints, per-user for others
