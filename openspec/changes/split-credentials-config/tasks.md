# Implementation Tasks

## 1. Install Dependencies
- [ ] 1.1 Install `handlebars` package: `npm install handlebars`
- [ ] 1.2 Install `@types/handlebars` for TypeScript support

## 2. Create Config Loader Module
- [ ] 2.1 Create `src/apps/api/src/config/config.loader.ts` with Handlebars template processor
- [ ] 2.2 Implement `loadConfigWithSubstitution()` function
- [ ] 2.3 Register `{{default}}` helper for optional values
- [ ] 2.4 Add error handling for missing required environment variables
- [ ] 2.5 Add YAML parsing with proper error messages

## 3. Update Config Module
- [ ] 3.1 Modify `src/apps/api/src/config/app.config.ts` to use new loader
- [ ] 3.2 Update `src/apps/api/src/config/env.validation.ts` to require credential env vars
- [ ] 3.3 Remove default values for sensitive configuration

## 4. Convert Config File to Template
- [ ] 4.1 Modify `src/apps/api/config.yaml` to use template placeholders
- [ ] 4.2 Replace `database.password` with `{{DB_PASSWORD}}`
- [ ] 4.3 Replace `jwt.secret` with `{{JWT_SECRET}}`
- [ ] 4.4 Replace `llm.apiKey` with `{{LLM_API_KEY}}`
- [ ] 4.5 Add optional `{{default}}` for non-sensitive values (e.g., ports)
- [ ] 4.6 Add `CONFIG_PATH` environment variable support with default to `./config.yaml`

## 5. Update Helm Charts
- [ ] 5.1 Modify `helm/pytoya/templates/configmap.yaml` to mount config file
- [ ] 5.2 Update `helm/pytoya/templates/secret.yaml` with credential env vars
- [ ] 5.3 Update `helm/pytoya/templates/deployment.yaml` to inject Secret env vars
- [ ] 5.4 Update `helm/pytoya/values.yaml` with credential fields

## 6. Update Documentation
- [ ] 6.1 Update `CLAUDE.md` with new config pattern
- [ ] 6.2 Update `docs/PROVIDER_SETUP.md` if applicable
- [ ] 6.3 Document env var requirements in README

## 7. Update Tests
- [ ] 7.1 Update `src/apps/api/src/config/app.config.spec.ts` (if exists)
- [ ] 7.2 Add tests for `config.loader.ts`
- [ ] 7.3 Test missing env var error handling
- [ ] 7.4 Test template substitution with various inputs

## 8. Migration Guide
- [ ] 8.1 Create migration steps for existing deployments
- [ ] 8.2 Document rollback procedure

## 9. Validation
- [ ] 9.1 Run `openspec validate split-credentials-config --strict`
- [ ] 9.2 Test local dev with environment variables
- [ ] 9.3 Test Docker build with env vars
- [ ] 9.4 Test Kubernetes deployment with Secrets
