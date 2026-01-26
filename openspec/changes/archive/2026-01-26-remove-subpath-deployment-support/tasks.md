## 1. Spec updates
- [x] 1.1 Update `openspec/specs/kubernetes/spec.md` to remove subpath requirement and add host-based requirement.
- [x] 1.2 Update `openspec/specs/web-app/spec.md` to remove base-path hosting requirement and add root-hosting requirement.

## 2. Helm chart changes
- [x] 2.1 Remove `global.basePath` from `helm/pytoya/values.yaml`.
- [x] 2.2 Remove `pytoya.basePath` helper and any basePath branching logic in `helm/pytoya/templates/*`.
- [x] 2.3 Remove API `server.basePath` injection from `helm/pytoya/templates/configmap.yaml`.
- [x] 2.4 Keep `/api` + `/` routing under host rules in `helm/pytoya/templates/ingress.yaml`.

## 3. API changes
- [x] 3.1 Remove `server.basePath` from API config schema and templates.
- [x] 3.2 Remove base-path routing helpers (bootstrap + websocket + storage path joins) and keep `/api` global prefix.
- [x] 3.3 Ensure health, uploads, and websocket paths remain correct under host-based routing.

## 4. Web changes
- [x] 4.1 Remove `VITE_BASE_PATH` usage from `src/apps/web/vite.config.ts` and router setup.
- [x] 4.2 Remove base-path utilities and tests if no longer needed.
- [x] 4.3 Ensure navigation, redirects, and deep-link refresh are correct at `/`.

## 5. Docker web image
- [x] 5.1 Remove `serve.json` generation and `serve -c serve.json` usage from `src/apps/web/Dockerfile`.

## 6. Docs updates
- [x] 6.1 Remove subpath build examples from `docs/DOCKER.md` and `docs/KUBERNETES_DEPLOYMENT.md`.
- [x] 6.2 Update `helm/pytoya/README.md` to remove `global.basePath` guidance and document host-based multi-app setup.

## 7. Validation
- [x] 7.1 Run `npm run test`.
- [x] 7.2 Run `npm run lint`.
- [x] 7.3 Run `npm run type-check`.
- [x] 7.4 Run `openspec validate remove-subpath-deployment-support --strict`.

## 8. Cleanup
- [ ] 8.1 Archive/close obsolete change `fix-manifests-contract-basepath-ocr-errors` (if still present) after this change is approved.
