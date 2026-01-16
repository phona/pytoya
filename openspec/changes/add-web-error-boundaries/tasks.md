## 1. Error Boundary Component
- [ ] 1.1 Create `ErrorBoundary.tsx` class component in `src/apps/web/src/shared/components/`
- [ ] 1.2 Implement error state management
- [ ] 1.3 Implement user-friendly error UI with fallback message
- [ ] 1.4 Add recovery actions (retry, go back to home/dashboard)
- [ ] 1.5 Add error logging (console.error, consider error tracking service)

## 2. Integration
- [ ] 2.1 Wrap root app component with top-level error boundary
- [ ] 2.2 Consider adding route-level error boundaries for dashboard sections
- [ ] 2.3 Update `router.tsx` to integrate error boundaries

## 3. Error Message Improvements
- [ ] 3.1 Review and improve error messages in API client
- [ ] 3.2 Add user-friendly error messages in components (loading failures, empty states)
- [ ] 3.3 Ensure error messages provide actionable guidance

## 4. Testing
- [ ] 4.1 Add tests for `ErrorBoundary` component (error catching, fallback UI, recovery actions)
- [ ] 4.2 Test error boundary integration with router
