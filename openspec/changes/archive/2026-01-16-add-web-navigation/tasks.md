## 1. Implementation

- [x] 1.1 Update `HomePage.tsx` to implement auth-based redirect logic
  - Check authentication state from auth store
  - Redirect to `/projects` if authenticated
  - Show landing page if not authenticated
- [x] 1.2 Create landing page UI in `HomePage.tsx`
  - Add hero section with app name and description
  - Add features list (OCR + LLM extraction)
  - Add login and register CTA buttons
  - Style with Tailwind CSS
- [x] 1.3 Create `SidebarNav` component in `shared/components/`
  - Define navigation items (Projects, Models, Schemas, Prompts, Validation Scripts)
  - Implement active route highlighting using React Router's `useLocation`
  - Add logout button with auth store integration
- [x] 1.4 Update `DashboardLayout.tsx` to integrate sidebar
  - Import and render `SidebarNav` component
  - Implement mobile-responsive layout with collapsible sidebar
  - Add hamburger menu toggle for mobile
  - Ensure layout works with existing `<Outlet />` for child routes
- [x] 1.5 Test navigation flows
  - Verify auth-based redirect on `/`
  - Verify all navigation links work correctly
  - Verify active route highlighting
  - Verify logout functionality
  - Test mobile responsive behavior

## 2. Testing

- [x] 2.1 Write unit tests for `HomePage.tsx` redirect logic
- [x] 2.2 Write unit tests for `SidebarNav` component
- [x] 2.3 Write integration tests for navigation flow
- [x] 2.4 Update `DashboardLayout` tests if needed

## 3. Documentation

- [x] 3.1 Update `docs/WEB_APP.md` with navigation structure
- [x] 3.2 Add navigation component documentation
