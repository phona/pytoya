# Change: default-manifests-pagination

## Why

The manifests list API can return an unbounded number of rows when pagination parameters are omitted. This is a performance foot-gun for any UI or client that accidentally calls the endpoint without `page`/`pageSize`, and it makes worst-case behavior unpredictable.

## Root Cause

`ManifestsService.findByGroup()` only paginates when `page` or `pageSize` is explicitly provided:

ASCII:
```
GET /groups/:id/manifests            -> returns ALL matches (unbounded)
GET /groups/:id/manifests?page=1...  -> returns one page
```

## What Changes

### A) Always paginate by default

When `page` and `pageSize` are omitted:
- Default to `page=1`
- Default to `pageSize=<DEFAULT_PAGE_SIZE>`

Pseudocode:
```
page = query.page ?? 1
pageSize = query.pageSize ?? DEFAULT_PAGE_SIZE
apply skip/take always
```

Mermaid:
```mermaid
flowchart TD
  A[GET /groups/:id/manifests] --> B[Apply default page/pageSize]
  B --> C[Return {data, meta}]
  C --> D[Client can page predictably]
```

## Impact

- Affected specs:
  - `openspec/specs/manifest-filtering/spec.md` (pagination defaults)
- Affected code (implementation later):
  - API: `src/apps/api/src/manifests/manifests.service.ts` (`findByGroup`)

## Non-goals

- Adding new query flags like `all=true` (can be introduced later if needed).

