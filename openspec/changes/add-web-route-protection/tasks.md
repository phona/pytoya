## 1. Implementation
- [ ] 1.1 Create `ProtectedRoute.tsx` component in `src/apps/web/src/routes/auth/`
- [ ] 1.2 Add authentication check using Zustand auth store
- [ ] 1.3 Add loading state during auth check
- [ ] 1.4 Implement redirect to login page for unauthenticated users
- [ ] 1.5 Preserve intended destination using `location.state` or query params
- [ ] 1.6 Update `router.tsx` to wrap dashboard routes with `ProtectedRoute`

## 2. Testing
- [ ] 2.1 Add tests for `ProtectedRoute` component (authenticated path)
- [ ] 2.2 Add tests for `ProtectedRoute` component (unauthenticated redirect)
- [ ] 2.3 Add tests for `ProtectedRoute` component (loading state)
- [ ] 2.4 Add tests for post-login redirect flow
