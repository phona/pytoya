## Context
We need a shared centered modal dialog pattern for create/edit flows in Models and Manifests.

## Goals / Non-Goals
- Goals:
  - Standard centered modal dialog with backdrop, ESC/overlay close
  - Reuse across Models and Manifests flows
  - Models create flow uses a two-step model type selection before configuration
  - Models edit flow locks model type; only arguments are editable
- Non-Goals:
  - Full-screen mobile sheet
  - New dependency additions

## Decisions
- Decision: Build a lightweight Dialog component in `src/apps/web/src/shared/components/` using portals and basic focus handling.
- Alternatives considered: Inline modals per page (rejected due to duplication).

## Risks / Trade-offs
- Risk: Focus management is minimal without a full dialog library.
  - Mitigation: Keep focus on close button and restore focus to trigger element.

## Migration Plan
- Implement Dialog component
- Wrap Models create/edit flows
- Wrap Manifests upload and audit flows

## Open Questions
- None
