## 1. Implementation
- [x] Add API endpoint `GET /api/metrics/cost-dashboard` with currency-grouped totals and breakdowns
- [x] Ensure metrics aggregation groups by currency (never sums mixed currencies)
- [x] Ensure LLM token metrics group by `llm_model_id` and use stored token usage fields
- [x] Add shared `CostDashboardWidget` (date range + per-currency totals + breakdown)
- [x] Embed widget in `/models` for LLM metrics
- [x] Embed widget in `/extractors` for text metrics
- [x] Update Models page and Extractors page to remove hard-coded `$` totals and render per-currency totals
- [x] Add/adjust backend tests for currency grouping in new endpoint
- [x] Add/adjust web tests for per-currency rendering (no `$` assumptions)
- [x] Run `npm run test`
- [x] Run `npm run lint`
- [x] Run `npm run type-check`

## 2. Documentation
- [x] Update `docs/` or `CLAUDE.md` with dashboard endpoint contract and multi-currency behavior (no FX conversion)
