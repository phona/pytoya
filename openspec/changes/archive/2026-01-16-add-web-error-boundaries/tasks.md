## 1. Error Boundary Component
- [x] 1.1 Create `ErrorBoundary.tsx` class component in `src/apps/web/src/shared/components/`
- [x] 1.2 Implement error state management
- [x] 1.3 Implement user-friendly error UI with fallback message
- [x] 1.4 Add recovery actions (retry, go back to home/dashboard)
- [x] 1.5 Add error logging (console.error, consider error tracking service)

## 2. Integration
- [x] 2.1 Wrap root app component with top-level error boundary
- [x] 2.2 Consider adding route-level error boundaries for dashboard sections
- [x] 2.3 Update `router.tsx` to integrate error boundaries

## 3. Error Message Improvements
- [x] 3.1 Review and improve error messages in API client
- [x] 3.2 Add user-friendly error messages in components (loading failures, empty states)
- [x] 3.3 Ensure error messages provide actionable guidance

## 4. Testing
- [x] 4.1 Add tests for `ErrorBoundary` component (error catching, fallback UI, recovery actions)
- [x] 4.2 Test error boundary integration with router
