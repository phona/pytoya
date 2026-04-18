# projects Spec Delta (improve-analytics-panel)

## ADDED Requirements

### Requirement: Project Analytics Recommendations Endpoint
The API SHALL expose `GET /projects/:id/analytics/recommendations` returning a list of deterministic, rule-based recommendations that suggest how the owner can improve the project's extraction workflow.

The endpoint SHALL require the same authentication and ownership checks as the existing `GET /projects/:id/analytics` endpoint. Non-owner non-admin users SHALL receive a `403 Forbidden` response (parity with the existing project API surface, which throws `ProjectOwnershipException`).

The response SHALL be a JSON object of shape:

```json
{
  "generatedAt": "<ISO 8601 timestamp>",
  "recommendations": [
    {
      "id": "ocr-quality-low",
      "severity": "warning" | "info" | "critical",
      "titleKey": "analytics.recommendations.ocrQuality.title",
      "titleVars": { "percent": 32 },
      "evidence": [
        {
          "labelKey": "analytics.recommendations.ocrQuality.evidence.poorShare",
          "value": "32%"
        }
      ],
      "actionHref": "/projects/<id>/settings/extractors",
      "actionLabelKey": "analytics.recommendations.action.editExtractor"
    }
  ]
}
```

When no analyzer emits a recommendation, `recommendations` SHALL be an empty array (not `null`).

#### Scenario: Endpoint returns a sorted, owner-scoped list
- **GIVEN** a user owns project `42` and is authenticated
- **WHEN** the user calls `GET /projects/42/analytics/recommendations`
- **THEN** the response SHALL be `200 OK`
- **AND** the body SHALL match the shape `{ generatedAt: ISO string, recommendations: Recommendation[] }`
- **AND** the `recommendations` array SHALL be sorted by severity (`critical` before `warning` before `info`)

### Requirement: Recommendation Analyzers Cover Core Workflow Failure Modes
The analytics recommendations service SHALL run at minimum the following analyzers, each scoped to the requested project and using data already persisted in the system:

- **OCR quality**: emits a recommendation when, over the last 30 days, at least 5 manifests have an `ocrQualityScore` and the share of manifests with `ocrQualityScore < 70` exceeds 25%.
- **Field correction**: aggregates paths from `OperationLogEntity.diffs[].path` over the last 30 days and emits one recommendation per field path that has been corrected in 5 or more distinct manifests, up to the top 3 such paths.
- **Model failure**: emits a recommendation when, over the last 30 days, at least 10 manifests reached a terminal status and more than 10% are `failed`.
- **Backlog**: emits a recommendation when 5 or more manifests have been in `pending` or `partial` status for longer than 7 days.

The service MUST be purely deterministic (no LLM calls), expose each analyzer as a pure function over repository reads, and return results sorted by severity (`critical` first, then `warning`, then `info`).

#### Scenario: OCR quality recommendation for a project with many low-score manifests
- **GIVEN** 20 manifests in project `42` completed OCR in the last 30 days
- **AND** 8 of them have `ocrQualityScore` less than 70
- **WHEN** the owner requests `GET /projects/42/analytics/recommendations`
- **THEN** the response SHALL include a recommendation with `id='ocr-quality-low'` and severity `warning`
- **AND** its `evidence` SHALL reference the 40% poor share
- **AND** its `actionHref` SHALL point to the project's extractor settings page

#### Scenario: Field correction recommendation for frequently-corrected fields
- **GIVEN** in the last 30 days, human reviewers corrected the `poNo` field in 6 different manifests
- **WHEN** the owner requests `GET /projects/42/analytics/recommendations`
- **THEN** the response SHALL include a recommendation with `id='field-correction-poNo'` (or equivalent per-path id)
- **AND** its `actionHref` SHALL point to `/projects/42/settings/rules`

#### Scenario: No recommendations when the project is healthy
- **GIVEN** a project whose OCR quality, failure rate, backlog, and correction counts all sit below the analyzer thresholds
- **WHEN** the owner requests `GET /projects/42/analytics/recommendations`
- **THEN** the response SHALL be `{ "generatedAt": "...", "recommendations": [] }`

#### Scenario: Non-owner non-admin user is rejected
- **GIVEN** a user who neither owns project `42` nor has admin role
- **WHEN** they request `GET /projects/42/analytics/recommendations`
- **THEN** the API SHALL respond with `403 Forbidden` (parity with the existing project analytics endpoint)
