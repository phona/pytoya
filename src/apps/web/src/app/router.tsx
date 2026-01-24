import { createBrowserRouter } from 'react-router-dom';
import { AuthLayout } from '../routes/auth/AuthLayout';
import { AdminRoute } from '../routes/auth/AdminRoute';
import { LoginPage } from '../routes/auth/LoginPage';
import { ProtectedRoute } from '../routes/auth/ProtectedRoute';
import { DashboardLayout } from '../routes/dashboard/DashboardLayout';
import { HomePage } from '../routes/HomePage';
import { ProjectsPage } from '../routes/dashboard/ProjectsPage';
import { ProjectDetailPage } from '../routes/dashboard/ProjectDetailPage';
import { ProjectSettingsBasicPage } from '../routes/dashboard/ProjectSettingsBasicPage';
import { ProjectSettingsModelsPage } from '../routes/dashboard/ProjectSettingsModelsPage';
import { ProjectSettingsExtractorsPage } from '../routes/dashboard/ProjectSettingsExtractorsPage';
import { ProjectSettingsSchemaPage } from '../routes/dashboard/ProjectSettingsSchemaPage';
import { ProjectSettingsRulesPage } from '../routes/dashboard/ProjectSettingsRulesPage';
import { ProjectSettingsValidationScriptsPage } from '../routes/dashboard/ProjectSettingsValidationScriptsPage';
import { ManifestsPage } from '../routes/dashboard/ManifestsPage';
import { ManifestAuditPage } from '../routes/dashboard/ManifestAuditPage';
import { ModelsPage } from '../routes/dashboard/ModelsPage';
import { ExtractorsPage } from '../routes/dashboard/ExtractorsPage';
import { ProjectCostSummaryPage } from '../routes/dashboard/ProjectCostSummaryPage';
import { ProfilePage } from '../routes/dashboard/ProfilePage';
import { RootLayout } from '../routes/RootLayout';
import { ErrorBoundary } from '../shared/components/ErrorBoundary';


export const router = createBrowserRouter([
  {
    element: <RootLayout />,
    children: [
      { index: true, element: <HomePage /> },
      {
        element: <AuthLayout />,
        children: [
          { path: 'login', element: <LoginPage /> },
        ],
      },
      {
        element: (
          <ErrorBoundary titleKey="errors.dashboardUnavailableTitle">
            <ProtectedRoute>
              <DashboardLayout />
            </ProtectedRoute>
          </ErrorBoundary>
        ),
        children: [
          { path: 'projects', element: <ProjectsPage /> },
          { path: 'projects/:id', element: <ProjectDetailPage /> },
          { path: 'projects/:id/settings/basic', element: <ProjectSettingsBasicPage /> },
          { path: 'projects/:id/settings/models', element: (
            <AdminRoute>
              <ProjectSettingsModelsPage />
            </AdminRoute>
          ) },
          { path: 'projects/:id/settings/extractors', element: (
            <AdminRoute>
              <ProjectSettingsExtractorsPage />
            </AdminRoute>
          ) },
          { path: 'projects/:id/settings/costs', element: <ProjectCostSummaryPage /> },
          { path: 'projects/:id/settings/schema', element: (
            <AdminRoute>
              <ProjectSettingsSchemaPage />
            </AdminRoute>
          ) },
          { path: 'projects/:id/settings/rules', element: (
            <AdminRoute>
              <ProjectSettingsRulesPage />
            </AdminRoute>
          ) },
          { path: 'projects/:id/settings/validation-scripts', element: (
            <AdminRoute>
              <ProjectSettingsValidationScriptsPage />
            </AdminRoute>
          ) },
          { path: 'projects/:id/groups/:groupId/manifests', element: <ManifestsPage /> },
          { path: 'projects/:id/groups/:groupId/manifests/:manifestId', element: <ManifestAuditPage /> },
          { path: 'profile', element: <ProfilePage /> },
          { path: 'models', element: (
            <AdminRoute>
              <ModelsPage />
            </AdminRoute>
          ) },
          { path: 'extractors', element: (
            <AdminRoute>
              <ExtractorsPage />
            </AdminRoute>
          ) },
        ],
      },
    ],
  },
]);




