# Change: Remove global schemas list page

## Why
Schemas are project-scoped and accessed through project settings, so the global schemas list is redundant and confusing.

## What Changes
- Remove the `/schemas` list route and page.
- Ensure schema access flows through project settings only.

## Impact
- Affected specs: web-app
- Affected code: Router and schemas list page
