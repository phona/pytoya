## 1. Backend
- [x] 1.1 Add DTO for bulk delete request/response
- [x] 1.2 Add `POST /api/groups/:groupId/manifests/delete-bulk`
- [x] 1.3 Implement `removeMany(user, groupId, manifestIds)` with ownership + group scoping
- [x] 1.4 Add/adjust backend tests as needed

## 2. Web
- [x] 2.1 Add per-manifest Delete action (confirm + toast/error)
- [x] 2.2 Add toolbar Delete… batch action using existing scope modal
- [x] 2.3 Disable “All matching current filters” when no filters are applied (Delete only)
- [x] 2.4 Add i18n strings (en + zh-CN)
- [x] 2.5 Add UI tests for bulk delete UX

## 3. Validation
- [x] 3.1 Run `npm run test`
- [x] 3.2 Run `npm run lint`
- [x] 3.3 Run `npm run type-check`
