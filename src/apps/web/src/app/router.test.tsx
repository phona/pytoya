import { describe, expect, it } from 'vitest';
import { router } from './router';

type RouteNode = {
  path?: string;
  index?: boolean;
  element?: any;
  children?: RouteNode[];
};

const findRoute = (
  routes: RouteNode[] | undefined,
  predicate: (route: RouteNode) => boolean,
): RouteNode | undefined => {
  if (!routes) return undefined;
  for (const route of routes) {
    if (predicate(route)) return route;
    const nested = findRoute(route.children, predicate);
    if (nested) return nested;
  }
  return undefined;
};

const routeTree = router.routes as RouteNode[];

const findRouteByPath = (path: string) =>
  findRoute(routeTree, (route) => route.path === path);

const findRouteWithChildPath = (childPath: string) =>
  findRoute(routeTree, (route) =>
    Boolean(route.children?.some((child) => child.path === childPath)),
  );

describe('router configuration', () => {
  it('should have routes defined', () => {
    expect(routeTree).toBeDefined();
    expect(routeTree.length).toBeGreaterThan(0);
  });

  it('should have home page route', () => {
    const homeRoute = findRoute(routeTree, (route) => route.index === true);
    expect(homeRoute).toBeDefined();
  });

  it('should have login route under auth layout', () => {
    const authLayoutRoute = findRouteWithChildPath('login');
    expect(authLayoutRoute).toBeDefined();
    expect(authLayoutRoute?.element?.type?.name).toBe('AuthLayout');
  });

  it('should have projects route under protected dashboard', () => {
    const dashboardLayout = findRouteWithChildPath('projects');

    expect(dashboardLayout).toBeDefined();

    const projectsRoute = findRouteByPath('projects');
    expect(projectsRoute).toBeDefined();
  });

  it('should redirect schemas to projects', () => {
    const schemasRoute = findRouteByPath('schemas');
    const schemaDetailRoute = findRouteByPath('schemas/:id');
    expect(schemasRoute).toBeUndefined();
    expect(schemaDetailRoute).toBeUndefined();
  });

  it('should have manifest route with parameters', () => {
    const manifestRoute = findRouteByPath('projects/:id/groups/:groupId/manifests');
    expect(manifestRoute).toBeDefined();
  });

  it('should have models route', () => {
    const modelsRoute = findRouteByPath('models');
    expect(modelsRoute).toBeDefined();
    expect(modelsRoute?.element?.type?.name).toBe('AdminRoute');
  });

  it('should have project settings routes', () => {
    const basicSettingsRoute = findRouteByPath('projects/:id/settings/basic');
    const modelsSettingsRoute = findRouteByPath('projects/:id/settings/models');
    const extractorsSettingsRoute = findRouteByPath('projects/:id/settings/extractors');
    const costsSettingsRoute = findRouteByPath('projects/:id/settings/costs');
    const schemaSettingsRoute = findRouteByPath('projects/:id/settings/schema');
    const rulesSettingsRoute = findRouteByPath('projects/:id/settings/rules');
    const validationScriptsSettingsRoute = findRouteByPath('projects/:id/settings/validation-scripts');
    const exportScriptsSettingsRoute = findRouteByPath('projects/:id/settings/export-scripts');

    expect(basicSettingsRoute).toBeDefined();
    expect(modelsSettingsRoute).toBeDefined();
    expect(modelsSettingsRoute?.element?.type?.name).toBe('AdminRoute');
    expect(extractorsSettingsRoute).toBeDefined();
    expect(extractorsSettingsRoute?.element?.type?.name).toBe('AdminRoute');
    expect(costsSettingsRoute).toBeDefined();
    expect(schemaSettingsRoute).toBeDefined();
    expect(schemaSettingsRoute?.element?.type?.name).toBe('AdminRoute');
    expect(rulesSettingsRoute).toBeDefined();
    expect(rulesSettingsRoute?.element?.type?.name).toBe('AdminRoute');
    expect(validationScriptsSettingsRoute).toBeDefined();
    expect(validationScriptsSettingsRoute?.element?.type?.name).toBe('AdminRoute');
    expect(exportScriptsSettingsRoute).toBeDefined();
    expect(exportScriptsSettingsRoute?.element?.type?.name).toBe('AdminRoute');
  });

  it('should have extractors route with admin protection', () => {
    const extractorsRoute = findRouteByPath('extractors');
    expect(extractorsRoute).toBeDefined();
    expect(extractorsRoute?.element?.type?.name).toBe('AdminRoute');
  });
});

describe('router structure', () => {
  it('uses RootLayout as root', () => {
    const rootRoute = routeTree[0];
    expect(rootRoute?.element?.type?.name).toBe('RootLayout');
  });

  it('has proper nesting for protected routes', () => {
    const dashboardLayout = findRouteWithChildPath('projects');

    expect(dashboardLayout).toBeDefined();

    // Check for nested ProtectedRoute
    const hasProtectedRoute = Boolean(
      dashboardLayout?.element?.props?.children?.type?.name === 'ProtectedRoute',
    );
    // Note: This check depends on how React Router renders nested elements
    const childCount = dashboardLayout?.children?.length ?? 0;
    expect(childCount).toBeGreaterThan(0);
    expect(hasProtectedRoute).toBe(true);
  });

  it('wraps admin-only routes with AdminRoute', () => {
    const modelsRoute = findRouteByPath('models');
    const extractorsRoute = findRouteByPath('extractors');
    expect(modelsRoute).toBeDefined();
    expect(modelsRoute?.element?.type?.name).toBe('AdminRoute');
    expect(extractorsRoute).toBeDefined();
    expect(extractorsRoute?.element?.type?.name).toBe('AdminRoute');
  });
});
