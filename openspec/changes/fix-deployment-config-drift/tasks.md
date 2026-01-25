## 1. Spec deltas + docs
- [ ] 1.1 Update delta specs for `kubernetes` and `monorepo`
- [ ] 1.2 Document web config strategy (Option A: build-time Vite config)
- [ ] 1.3 Validate OpenSpec change (`openspec validate fix-deployment-config-drift --strict`)

## 2. Helm config correctness
- [ ] 2.1 Ensure Helm `config.yaml` template includes required sections (`queue`, `features`)
- [ ] 2.2 Align Helm defaults with `values.yaml` (rate limiting defaults, etc.)
- [ ] 2.3 Ensure secret placeholders are YAML-safe (quote placeholders where needed)

## 3. Docker Compose reliability
- [ ] 3.1 Fix Compose build context to match Dockerfile expectations (repo-root context)
- [ ] 3.2 Align Compose env var names with API config template variables
- [ ] 3.3 Decide OCR service approach for compose (service vs external) and document it

## 4. Web configuration
- [ ] 4.1 Build-time config: ensure docs/build scripts consistently build web with `VITE_API_URL`/`VITE_WS_URL`
- [ ] 4.2 Ensure Helm does not imply runtime `VITE_*` overrides for the bundle (document/remove if misleading)

## 5. Dependency gate
- [ ] 5.1 Ask for confirmation before adding any production dependency
