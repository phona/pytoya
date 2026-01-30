# Design: default-manifests-pagination

## Contract

`GET /api/groups/:groupId/manifests` always returns a paginated envelope.

Defaults:
- `page`: 1
- `pageSize`: `DEFAULT_PAGE_SIZE`

Behavior:
- `meta.total` always reflects the full match count.
- `meta.totalPages` uses the resolved default page size.

