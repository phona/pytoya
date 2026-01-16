## 1. Page Component Tests
- [ ] 1.1 Add tests for `ProjectsPage.tsx` (render, loading states, error states, user interactions)
- [ ] 1.2 Add tests for `ModelsPage.tsx` (render, loading states, create/edit/delete flows)
- [ ] 1.3 Add tests for `ManifestsPage.tsx` (render, filtering, pagination)

## 2. Hook Tests
- [ ] 2.1 Add tests for `useManifests.ts` hook (data fetching, cache invalidation, mutations)
- [ ] 2.2 Add tests for `useWebSocket.ts` hook (connection, reconnection, event handling)
- [ ] 2.3 Add tests for `useModels.ts` hook (CRUD operations, optimistic updates)

## 3. Shared Component Tests
- [ ] 3.1 Add tests for `ModelCard.tsx` component
- [ ] 3.2 Add tests for `ModelForm.tsx` component (validation, submit handling)
- [ ] 3.3 Add tests for `ExtractionStrategySelector.tsx` component

## 4. Test Utilities
- [ ] 4.1 Create test data factory functions in `test/mocks/factories.ts`
- [ ] 4.2 Add custom test utilities for common render patterns
- [ ] 4.3 Update MSW handlers if needed for new test scenarios

## 5. Coverage Enforcement
- [ ] 5.1 Update `package.json` scripts for coverage reporting
- [ ] 5.2 Ensure 60% coverage threshold is enforced in CI
