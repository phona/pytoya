# Design: Simplify Server Configuration

## Current Configuration Structure

```yaml
server:
  nodeEnv: development
  port: 3000

logging:
  levels: info
```

## Issues

1. **Mixed concerns**: Server and logging are separate but related
2. **Unused field**: `nodeEnv` exists in defaults but not in validation
3. **Naming inconsistency**: Validator expects root-level `logLevel` but config uses `logging.levels`

## New Configuration Structure

```yaml
server:
  port: 3000
  logLevel: info
```

## Benefits

1. **Collected concerns**: All server settings in one place
2. **Simpler**: Flat structure with fewer nested objects
3. **Consistent**: Matches typical framework patterns
4. **Minimal**: Only contains what we actually use

## Implementation Notes

- Update `ServerConfig` class to include `logLevel` property
- Remove `LoggingConfig` class entirely
- Update code to read `server.logLevel` instead of `logging.levels`
- Fix `main.ts` bootstrap to read `server.port` from config and pass to `app.listen()`
- Remove `nodeEnv` usage from `data-source.ts` (logging check)

## Configuration File Design Principles

This change establishes the following principles for configuration design:

### 1. Domain-Based Grouping
Configuration should be grouped by domain/feature area, not by technical layer:
- ✅ Good: `server.logLevel`, `server.port` (all server concerns together)
- ❌ Bad: `logging.levels`, `server.port` (technical separation)

### 2. Flat Over Nested
Prefer flat structures within domain groups:
- ✅ Good: `server.logLevel`
- ❌ Bad: `server.logging.levels` (unnecessary nesting)

### 3. Defaults in Code, Not in File
Default values should be defined in the codebase (`app.config.ts`), not in example config files:
- The `config.yaml` file should only contain overrides for development/production
- Default config in code serves as documentation and fallback
- Example files should be minimal and show only commonly-overridden values

### 4. Single Source of Truth
Each configuration value should have one canonical path:
- No reading from multiple sources (e.g., `process.env` fallbacks)
- Config loader should merge defaults with user config once at startup
- No runtime environment variable access after app initialization

### 5. Validation Mirrors Structure
TypeScript validation classes should mirror the YAML structure exactly:
- If `server.logLevel` exists in YAML, `ServerConfig` should have a `logLevel` property
- No "hidden" paths that exist in validator but not in config file
- Validation failures should point to exact config path

### 6. Environment-Specific Values
Environment-specific configuration should use deployment tooling, not config files:
- Use Helm values for Kubernetes deployments
- Use environment-specific config files for local development only
- Never commit production secrets or URLs to the repository
