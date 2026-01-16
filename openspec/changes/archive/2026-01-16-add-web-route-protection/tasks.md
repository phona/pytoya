## 1. Implementation
- [x] 1.1 Create `ProtectedRoute.tsx` component in `src/apps/web/src/routes/auth/`
- [x] 1.2 Add authentication check using Zustand auth store
- [x] 1.3 Add loading state during auth check
- [x] 1.4 Implement redirect to login page for unauthenticated users
- [x] 1.5 Preserve intended destination using `location.state` or query params
- [x] 1.6 Update `router.tsx` to wrap dashboard routes with `ProtectedRoute`

## 2. Testing
- [x] 2.1 Add tests for `ProtectedRoute` component (authenticated path)
- [x] 2.2 Add tests for `ProtectedRoute` component (unauthenticated redirect)
- [x] 2.3 Add tests for `ProtectedRoute` component (loading state)
- [x] 2.4 Add tests for post-login redirect flow
