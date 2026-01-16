# Change: Improve Web Accessibility

## Why

The web application currently lacks accessibility features, making it difficult or impossible for users with disabilities to use the application effectively. Missing aria-labels on interactive elements, lack of keyboard navigation support, and no accessibility tooling (eslint-plugin-jsx-a11y) means accessibility issues are not caught during development.

## What Changes

- Add `aria-label` attributes to buttons, links, and form inputs without visible labels
- Add `role` attributes where semantic HTML is insufficient
- Ensure keyboard navigation works for all interactive elements (Tab, Enter, Escape)
- Add focus management for modals, dropdowns, and dynamic content
- Add `eslint-plugin-jsx-a11y` to catch accessibility issues during development
- Add keyboard event handlers where needed
- Ensure proper heading hierarchy and landmark regions

## Impact

- Affected specs: `web-app` (accessibility capability)
- Affected code: All interactive components in `src/apps/web/src/`
- Dependencies: Add `eslint-plugin-jsx-a11y` to devDependencies
- Breaking changes: None

## Migration

No migration needed - these are additive improvements that enhance accessibility without changing existing behavior for mouse/visual users.
