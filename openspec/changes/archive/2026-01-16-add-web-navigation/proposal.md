# Change: Add Web Navigation and Homepage

## Why

The web application currently lacks proper navigation and homepage routing:
1. The root `/` page shows only a placeholder with no clear entry point
2. No sidebar navigation exists - users must know URLs to access Models, Schemas, Prompts pages
3. Authenticated users landing on `/` see empty content instead of being directed to the app
4. Non-authenticated users have no landing page explaining the app

## What Changes

- Implement auth-based redirect on root route `/`:
  - Authenticated users → redirect to `/projects`
  - Non-authenticated users → show landing page with app description and login/register CTAs
- Add sidebar navigation component to `DashboardLayout`:
  - Navigation links to Projects, Models, Schemas, Prompts, Validation Scripts
  - Active route highlighting
  - Collapsible sidebar for mobile
  - Logout button
- Update `DashboardLayout` to integrate sidebar navigation

## Impact

- Affected specs: `web-app` (extends existing spec from `add-web-route-protection`)
- Affected code:
  - `src/apps/web/src/routes/HomePage.tsx` - implement landing page and redirect logic
  - `src/apps/web/src/routes/dashboard/DashboardLayout.tsx` - add sidebar navigation
- Breaking changes: None
- Dependencies: None (uses existing Zustand auth store, React Router)
