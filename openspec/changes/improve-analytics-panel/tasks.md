# Tasks

## 1. Web — Keep Analytics reachable (Bug 1)

- [x] Add a small Zustand store `src/apps/web/src/shared/stores/recent-project.ts` exporting `lastProjectId` state and a `setLastProjectId(id | null)` action.
- [x] Update `SidebarNav` (or a thin wrapper) to call `setLastProjectId` whenever the current route matches `/projects/:id`.
- [x] Move `nav.analytics` into the `sidebar.section.work` section and remove it from the project-scoped section.
- [x] Resolve the link target as `/projects/{lastId}/analytics` when `lastId` exists, otherwise `/projects`.
- [x] Keep `isPathActive` matching correct when target is `/projects/{lastId}/analytics` (avoid accidental active state on `/projects`).

## 2. API — Recommendations service (Bug 2)

- [x] Add shared DTO types in `src/shared/types/projects/analytics-recommendations.ts` (`AnalyticsRecommendationDto`, `AnalyticsEvidenceDto`, `AnalyticsRecommendationsResponseDto`, `RecommendationSeverity`).
- [x] Create `src/apps/api/src/projects/analytics-recommendations.service.ts` with four analyzers:
  - [x] `OcrQualityAnalyzer` — `poorCount / scoredCount > 0.25` over last 30 days AND `scoredCount >= 5`.
  - [x] `FieldCorrectionAnalyzer` — top-3 `diffs[].path` in last 30 days; flag paths with `>= 5` distinct manifests corrected.
  - [x] `ModelFailureAnalyzer` — `failed / total > 0.1` over last 30 days AND `total >= 10`.
  - [x] `BacklogAnalyzer` — manifests in `pending` or `partial` older than 7 days; flag when count >= 5.
- [x] Wire the service in `projects.module.ts` and expose `GET /projects/:id/analytics/recommendations` in `projects.controller.ts`.
- [x] Ensure all DB access is scoped by `projectId` through the existing `findOne` ownership check.
- [x] Unit tests: `analytics-recommendations.service.spec.ts` covering each analyzer's emit / no-emit behavior.

## 3. Web — Recommendations panel (Bug 2)

- [x] Extend `src/apps/web/src/api/projects.ts` with `getProjectRecommendations(projectId)` and the response types.
- [x] Add `useProjectRecommendations(projectId)` hook in `src/apps/web/src/shared/hooks/use-projects.ts`.
- [x] Add `src/apps/web/src/shared/components/RecommendationsPanel.tsx` rendering severity badge, localized title (via `t(titleKey, titleVars)`), evidence list, and optional action button linking to `actionHref`.
- [x] Mount the panel at the top of `ProjectAnalyticsPage` (above the summary cards); hide the panel when the server returns zero recommendations.
- [x] Add i18n keys to `src/apps/web/src/shared/i18n/locales/en.ts` and `zh-CN.ts` for:
  - `analytics.recommendations.title`, `analytics.recommendations.empty`
  - `analytics.recommendations.action.viewManifests`, `analytics.recommendations.action.editRules`, `analytics.recommendations.action.viewCosts`
  - Per-analyzer `title` + `evidence` keys (`analytics.recommendations.ocrQuality.*`, `analytics.recommendations.fieldCorrection.*`, `analytics.recommendations.modelFailure.*`, `analytics.recommendations.backlog.*`).
  - Severity labels: `analytics.recommendations.severity.{info,warning,critical}`.

## 4. Validation

- [ ] `openspec validate improve-analytics-panel --strict` passes (to be run in CI — `openspec` CLI is not installed on the dev box that scaffolded this change).
- [ ] `npm run lint`, `npm run type-check`, and `npm test` pass in CI.
- [x] All other implementation tasks above checked off.
