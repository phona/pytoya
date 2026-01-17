# Change: Split Credentials from Configuration

## Why

Currently, sensitive credentials (database passwords, JWT secrets, API keys) are stored in `config.yaml` which is committed to the repository. This creates security risks:

1. **Plaintext secrets in version control** - Credentials are visible in git history
2. **Accidental commits** - Developers may commit production credentials
3. **No secret rotation** - Secrets are static in config files
4. **Kubernetes ConfigMap limitation** - ConfigMaps store plain text, Secrets store base64 (but still visible)

This change implements Handlebars-based template preprocessing to:
- Keep non-sensitive configuration in `config.yaml` (committed to git)
- Inject sensitive values from environment variables (set by Kubernetes Secrets, Docker env vars, or shell exports)
- Fail fast when required credentials are missing
- Maintain a single source of truth for configuration structure

## What Changes

- **ADDED**: Handlebars template loader in config subsystem
- **MODIFIED**: `config.yaml` becomes `config.yaml.tmpl` with `{{VAR_NAME}}` placeholders for credentials
- **MODIFIED**: Backend-standards spec to require credential separation
- **MODIFIED**: Kubernetes spec to document Secret injection
- **REMOVED**: Hardcoded credentials from committed config files

### Breaking Changes

- Existing `config.yaml` must use `{{VAR_NAME}}` placeholders for credentials
- Environment variables become required for credentials (no defaults)
- Local development requires explicit environment variable setting

## Impact

- **Affected specs**: backend-standards, kubernetes
- **Affected code**:
  - `src/apps/api/src/config/config.loader.ts` (new file)
  - `src/apps/api/src/config/app.config.ts` (modified)
  - `src/apps/api/config.yaml` (modified with placeholders)
  - `helm/pytoya/templates/configmap.yaml` (modified)
  - `helm/pytoya/templates/secret.yaml` (modified)
- **Migration**: Developers must set environment variables after deploy
- **Security**: Credentials no longer stored in git history
