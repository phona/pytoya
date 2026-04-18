# Change: improve-analytics-panel

## Why

Two problems with the project-level Analytics panel make the feature feel unreliable and low-value:

1. **Nav item disappears unexpectedly.** `SidebarNav.buildNavSections` (`src/apps/web/src/shared/components/SidebarNav.tsx`) only emits the `nav.analytics` entry while the current URL matches `/projects/:id/...`. Leaving a project (e.g. clicking Projects, Profile, Extractors, Models) removes the link entirely. Users perceive this as the panel "vanishing" and can't find their way back without re-entering a project first.
2. **Panel is descriptive-only, not prescriptive.** The current `ProjectAnalyticsPage` renders totals, a status bar, OCR quality distribution, a 30-day activity chart, and a paginated correction history. None of these tell the user *what to do next* — which extractor/model to swap, which field needs a better prompt rule, which backlog to drain. Users have asked for improvement suggestions, not just charts.

Both issues concern the same feature surface, so we address them together.

## What Changes

### A) Keep Analytics reachable from anywhere (Bug 1)

- Track the most recently viewed project id in a small client store (Zustand), updated whenever the current route matches `/projects/:id[/...]`.
- Move the `nav.analytics` entry out of the project-scoped sidebar section into the top-level **Work** section so it's always visible.
- Resolve the link target:
  - If a project context is active or has been visited in this session → `/projects/{lastId}/analytics`.
  - Otherwise → `/projects` (project picker), so clicking the entry is never a dead end.
- Remove the duplicate project-scoped entry — a single, always-visible entry is clearer than two context-sensitive ones.

### B) Add a Recommendations panel (Bug 2)

- New backend endpoint `GET /projects/:id/analytics/recommendations` backed by `AnalyticsRecommendationsService` and a set of deterministic, rule-based analyzers:
  - **OcrQualityAnalyzer** — flags projects where the share of manifests with `ocrQualityScore < 70` exceeds a threshold. Suggests reprocessing with `force=true` or switching the text extractor.
  - **FieldCorrectionAnalyzer** — aggregates `OperationLogEntity.diffs[].path` across the recent window and surfaces the top-N corrected field paths. Suggests tightening the prompt rules for those fields (link to Project Settings → Rules).
  - **ModelFailureAnalyzer** — flags elevated `status='failed'` ratios in the last 30 days. Suggests reviewing the LLM model or retry config.
  - **BacklogAnalyzer** — flags manifests that have been stuck in `pending`/`partial` longer than a configured age threshold.
- Each analyzer returns structured `Recommendation` objects with `id`, `severity`, `titleKey`, `titleVars`, `evidence[]`, optional `actionHref`, and `actionLabelKey`, so the UI can render localized, clickable cards with evidence.
- New web component `RecommendationsPanel` renders above the existing summary cards with severity badges, evidence rows, and action buttons that deep-link into the relevant settings/filter views.
- No LLM layer in this change — analyzers are pure functions over existing entities, easy to unit test.

### Non-goals

- An aggregated cross-project analytics dashboard.
- LLM-generated narrative advice (may come later; the `Recommendation` shape is designed to allow layering it without rewrites).
- Changing the layout or data sources of existing summary cards, status distribution, OCR quality panel, activity chart, or correction history.
- Re-processing/reprocessing automation (we link to existing flows, we don't build new ones).

## Impact

- **Affected specs**
  - `openspec/specs/web-app/spec.md` — sidebar nav behavior and project analytics page composition.
  - `openspec/specs/projects/spec.md` — project analytics API surface.
- **Affected code**
  - Web: `src/apps/web/src/shared/components/SidebarNav.tsx`, `src/apps/web/src/shared/stores/` (new `recent-project.ts`), `src/apps/web/src/routes/dashboard/DashboardLayout.tsx` or the `SidebarNav` host to subscribe to route changes, `src/apps/web/src/routes/dashboard/ProjectAnalyticsPage.tsx`, `src/apps/web/src/api/projects.ts`, `src/apps/web/src/shared/hooks/use-projects.ts`, `src/apps/web/src/shared/i18n/locales/{en,zh-CN}.ts`.
  - API: `src/apps/api/src/projects/analytics-recommendations.service.ts` (new), `src/apps/api/src/projects/projects.controller.ts`, `src/apps/api/src/projects/projects.module.ts`, shared DTO types under `src/shared/types/`.
- **Backward compatibility**: additive. The existing `/projects/:id/analytics` endpoint and page keep their contract. Recommendations is a new endpoint and a new UI section. Nav behavior becomes a superset (entry is always visible; previously-working project-scoped path still works).
