# web-app Spec Delta (improve-analytics-panel)

## ADDED Requirements

### Requirement: Analytics Nav Entry Is Globally Reachable
The web application SHALL expose an "Analytics" entry in the top-level sidebar Work section that is visible on every authenticated route, so the entry does not disappear when the user navigates away from a project.

The link target SHALL resolve to the most recently viewed project's analytics page if a project context is known for the current session, or to the Projects list page otherwise (so the click is never a dead end).

The web application SHALL update the "most recently viewed project" value whenever the current route matches a path of the form `/projects/:id[/...]` where `:id` is a numeric id owned by the current user.

#### Scenario: Analytics entry stays visible outside a project context
- **GIVEN** the user is authenticated
- **WHEN** the user navigates to `/profile`, `/models`, `/extractors`, or `/projects` after previously visiting `/projects/42/...`
- **THEN** the sidebar SHALL still display the "Analytics" entry
- **AND** clicking it SHALL navigate to `/projects/42/analytics`

#### Scenario: Analytics entry has a safe target with no remembered project
- **GIVEN** the user has never visited a project in the current session
- **WHEN** the user views the sidebar
- **THEN** the "Analytics" entry SHALL still be visible
- **AND** clicking it SHALL navigate to `/projects` (the projects list) instead of a broken URL

### Requirement: Project Analytics Page Shows Actionable Recommendations
The project analytics page SHALL render a "Recommendations" panel at the top of the page that lists actionable, rule-based suggestions for improving the extraction workflow. Each recommendation SHALL display:

- a severity badge (`info`, `warning`, or `critical`),
- a localized title derived from a stable `titleKey` and optional `titleVars`,
- a human-readable evidence section explaining *why* the recommendation was produced,
- an optional action button that deep-links into a relevant settings or filter view.

The panel SHALL be hidden when the server returns zero recommendations.

#### Scenario: User sees high-value recommendations above raw stats
- **GIVEN** a project exists and the recommendations endpoint returns one or more entries
- **WHEN** the user opens `/projects/:id/analytics`
- **THEN** the page SHALL render the Recommendations panel above the summary cards
- **AND** each card SHALL show severity, localized title, evidence, and (if provided) an action button

#### Scenario: Action button links to the correct remediation surface
- **GIVEN** a recommendation whose `actionHref` points to `/projects/:id/settings/rules`
- **WHEN** the user clicks the action button
- **THEN** the web application SHALL navigate to that href

#### Scenario: Empty recommendations hide the panel
- **GIVEN** the recommendations endpoint returns an empty list for a project
- **WHEN** the user opens `/projects/:id/analytics`
- **THEN** the Recommendations panel SHALL NOT be rendered
