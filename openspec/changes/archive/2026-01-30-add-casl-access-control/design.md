# Design: add-casl-access-control

## Goals

- Centralize authorization rules (role + ownership) using CASL abilities.
- Keep policy checks testable and consistent with NestJS patterns (guards + decorators).
- Avoid overengineering: start with a small action set and the endpoints with known gaps.

## Key Decisions

### 1) Use CASL directly (no extra Nest wrapper)

Rationale:
- Minimal dependencies: only `@casl/ability` is required.
- Nest integration is straightforward via Guards + custom decorators.

### 2) Explicit global vs project-scoped resources

Rule of thumb:
- Global/admin resources (queue/jobs control, extractor catalog) => admin-only.
- Project resources (projects/groups/manifests/scripts) => owner or admin.

## Concepts

Actions:
- `read`, `create`, `update`, `delete`, `manage`

Subjects:
- `Project`, `Group`, `Manifest`, `Schema`, `ValidationScript`, `Extractor`, `Model`, `Queue`, `Job`

## Policy Evaluation Pattern

Two patterns are allowed:

1) **Preloaded entity check**
```
entity = service.findOne(...)
assert ability.can('update', entity)
```

2) **Parameter-based check for “admin-only” surfaces**
```
assert ability.can('manage', 'Queue')
```

Prefer (1) for project-scoped resources so ownership is enforced via the entity’s relations.

