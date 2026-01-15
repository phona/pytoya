# Change: Simplify Server Configuration

## Why
The current server configuration has mixed concerns and naming inconsistencies:
- `server.nodeEnv` exists in defaults but was removed from validation
- `logging.levels` is separate from `server` config but related
- Naming is inconsistent (`logging.levels` vs root-level `logLevel` in validator)

## What Changes
- Consolidate `logLevel` into `server` config object
- Remove `logging` config section entirely
- Remove unused `nodeEnv` from server config
- Keep only essential server settings: `port` and `logLevel`

## Impact
- Affected specs: backend-standards
- Affected code:
  - `src/apps/api/src/config/app.config.ts`
  - `src/apps/api/src/config/env.validation.ts`
  - `src/apps/api/src/main.ts`
  - `src/apps/api/src/database/data-source.ts`
  - `helm/pytoya/templates/configmap.yaml`
  - `src/apps/api/config.yaml`
- **BREAKING**: Config path changes from `logging.levels` to `server.logLevel`
