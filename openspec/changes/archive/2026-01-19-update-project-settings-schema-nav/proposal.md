# Change: Update project settings schema navigation

## Why
Project schema and rules are accessed through the Settings dropdown, and the schema detail back action should return to the owning project.

## What Changes
- Remove schema/rules/validation scripts cards from the project detail settings section.
- Route Settings > Schema to the project schema detail view.
- Route Settings > Rules to the schema detail view with the Rules tab active.
- Ensure Schema detail back action returns to the project detail page.

## Impact
- Affected specs: web-app
- Affected code: Project detail, settings dropdown, schema detail view
