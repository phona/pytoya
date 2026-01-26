# Design: Split Credentials from Configuration

## Context

The PyToYa API currently stores all configuration (including sensitive credentials) in `config.yaml` which is committed to version control. This presents security vulnerabilities:

- Credentials are visible in git history
- No separation between config and secrets
- Kubernetes ConfigMaps are not designed for secrets
- Difficult to rotate credentials

### Constraints

- Must maintain backward compatibility with local development (Docker)
- Must work with Kubernetes deployments without complex init containers
- Should fail fast when credentials are missing
- Must follow 12-factor app principles
- Must comply with existing backend-standards spec

### Stakeholders

- **Security**: Credentials must not be in git
- **Development**: Local dev should work with shell-exported env vars
- **Operations**: Kubernetes deployment must use K8s Secrets
- **Testing**: Test configs should use test credentials

## Goals / Non-Goals

### Goals
1. Separate sensitive credentials from non-sensitive configuration
2. Support multiple deployment environments (local, Docker, K8s)
3. Fail fast with clear errors when required env vars are missing
4. Maintain single source of truth for config structure
5. Keep existing `@nestjs/config` pattern

### Non-Goals
1. External secret management (AWS Secrets Manager, Vault) - out of scope
2. Runtime secret reloading - not required
3. Complex encryption/decryption - env var injection is sufficient
4. Migration of existing git history - accepted limitation
5. .env file support - developers must set env vars explicitly

## Decisions

### Decision 1: Use Handlebars Templates

**Choice**: Handlebars template engine for config preprocessing

**Rationale**:
- Simple syntax (`{{VAR_NAME}}`) familiar to many
- Built-in helper support (`{{default}}`)
- No external tooling required - processed at app startup
- Works identically in Docker, K8s, and local dev
- Template errors caught at startup (fail fast)

**Alternatives Considered**:

| Option | Pros | Cons |
|--------|------|------|
| **envsubst** | Built-in to Linux | Requires shell, not portable to Windows |
| **Init container** | No code changes | Complex K8s setup, doesn't work locally |
| **NestJS ConfigService only** | No preprocessing | Lose YAML structure readability |
| **Custom regex replace** | No dependency | Limited features, harder to maintain |
| **Handlebars** (chosen) | Feature-rich, portable | Adds dependency |

### Decision 2: Environment Variable Injection

**Choice**: Inject credentials via environment variables

**Rationale**:
- 12-factor app compliant
- Works everywhere: shell exports, Docker `-e`, K8s Secrets
- Kubernetes Secrets mount as env vars natively
- No additional tooling required

**Template Syntax**:
```yaml
# config.yaml
database:
  host: {{default DB_HOST "localhost"}}
  port: {{default DB_PORT "5432"}}
  password: {{DB_PASSWORD}}  # Required - no default
```

### Decision 3: Fail Fast for Missing Credentials

**Choice**: Throw error at startup if required env var is missing

**Rationale**:
- Prevents runtime failures after app has started
- Clear error message indicates exactly which var is missing
- Better than silent defaults or undefined behavior

**Error Message**:
```
ConfigurationError: Required environment variable 'DB_PASSWORD' is not set.
Please set DB_PASSWORD before starting the application.
```

### Decision 4: Keep config.yaml Name

**Choice**: Keep `config.yaml` as the filename (not renamed to `.tmpl`)

**Rationale**:
- Simpler developer experience
- No confusion about file naming
- Template syntax makes it clear preprocessing occurs
- Backward compatible with tooling that expects `config.yaml`

### Decision 5: Config Path via Environment Variable

**Choice**: Support `CONFIG_PATH` env var, default to `./config.yaml`

**Rationale**:
- Allows flexibility for different deployment scenarios
- Testing can use different config files
- Backward compatible with existing config structure

## Architecture

### Component Structure

```
┌─────────────────────────────────────────────────────────────┐
│                        Application Startup                  │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    app.config.ts                            │
│  - Reads CONFIG_PATH (default: ./config.yaml)              │
│  - Calls loadConfigWithSubstitution()                       │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                   config.loader.ts                          │
│  1. Read template file (config.yaml)                       │
│  2. Register Handlebars helpers (default, etc.)            │
│  3. Compile template with process.env                       │
│  4. Validate all required vars present                      │
│  5. Parse YAML and return object                            │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                 ConfigService (@nestjs/config)              │
│  - Receives parsed config object                            │
│  - Validates against schema                                 │
│  - Provides to application via DI                          │
└─────────────────────────────────────────────────────────────┘
```

### File Structure

```
src/apps/api/
├── config.yaml               # Template with {{VAR}} placeholders (committed)
└── src/config/
    ├── config.loader.ts      # NEW: Template processor
    ├── app.config.ts         # MODIFIED: Uses loader
    └── env.validation.ts     # MODIFIED: Credential env vars
```

## Environment Mappings

### Local Development
```bash
# Shell export (bash/zsh)
export DB_HOST=localhost
export DB_PORT=5432
export DB_USERNAME=pytoya_user
export DB_PASSWORD=dev_password_123
export JWT_SECRET=dev-jwt-secret-change-me

npm run start:dev
```

Or with PowerShell:
```powershell
$env:DB_HOST="localhost"
$env:DB_PASSWORD="dev_password_123"
$env:JWT_SECRET="dev-jwt-secret-change-me"
npm run start:dev
```

### Docker Compose
```yaml
services:
  api:
    environment:
      - DB_HOST=postgres
      - DB_PASSWORD=${DB_PASSWORD}
      - JWT_SECRET=${JWT_SECRET}
```

### Kubernetes
```yaml
apiVersion: v1
kind: Secret
metadata:
  name: pytoya-credentials
type: Opaque
stringData:
  DB_PASSWORD: "{{ .Values.db.password }}"
  JWT_SECRET: "{{ .Values.jwt.secret }}"
---
apiVersion: apps/v1
kind: Deployment
spec:
  template:
    spec:
      containers:
      - name: api
        envFrom:
        - secretRef:
            name: pytoya-credentials
```

## Risks / Trade-offs

### Risk 1: Template Syntax Errors
**Risk**: Invalid Handlebars syntax causes startup failure
**Mitigation**: Clear error messages with line numbers; validation during development

### Risk 2: Breaking Change for Existing Deployments
**Risk**: Current deployments may have hardcoded credentials in config.yaml
**Mitigation**: Clear migration guide; support transition period

### Risk 3: Environment Variable Size Limits
**Risk**: Some systems limit env var size (typically 32KB+)
**Mitigation**: Credentials are small (<1KB); not a concern for this use case

### Risk 4: Secret Visibility in Process List
**Risk**: Environment variables visible in `/proc/*/environ`
**Mitigation**: Accepted limitation; K8s Secrets are already base64; use external secrets manager for higher security

### Risk 5: Developer Friction
**Risk**: Developers must manually set env vars for local development
**Mitigation**: Document clear setup instructions; provide shell script helpers

### Trade-off: Additional Dependency
**Trade-off**: Adding Handlebars increases bundle size
**Justification**: Minimal impact (~20KB gzipped); simplicity outweighs cost

### Trade-off: No .env File Support
**Trade-off**: Developers must set env vars explicitly instead of using .env files
**Justification**: Simpler implementation; avoids dependency on dotenv package; clearer env var sources

## Migration Plan

### Phase 1: Implementation
1. Install Handlebars dependency
2. Create config.loader.ts
3. Update app.config.ts
4. Update tests

### Phase 2: Template Conversion
1. Update config.yaml with `{{VAR}}` placeholders for credentials
2. Add `{{default}}` for optional values
3. Update Helm charts

### Phase 3: Deployment
1. Deploy to development environment
2. Verify all services start correctly
3. Deploy to staging
4. Deploy to production

### Rollback Procedure
If deployment fails:
1. Revert config.yaml to hardcoded values
2. Revert code changes to use old config loader
3. Redeploy previous version

## Open Questions

1. **Should we add a helper script for local development env setup?**
   - **Decision**: Optional; document manual setup first, add script if requested

2. **Should we add support for YAML anchors/aliases before/after templating?**
   - **Decision**: No, Handlebars provides sufficient functionality

3. **Should template errors be validation errors or runtime errors?**
   - **Decision**: Runtime errors at startup (fail fast)

4. **Should we support nested env var objects (e.g., `DB__PASSWORD`)?**
   - **Decision**: No, flat env var names are clearer and more portable
