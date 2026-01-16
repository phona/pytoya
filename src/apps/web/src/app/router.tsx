import { createBrowserRouter } from 'react-router-dom';
import { AuthLayout } from '../routes/auth/AuthLayout';
import { LoginPage } from '../routes/auth/LoginPage';
import { RegisterPage } from '../routes/auth/RegisterPage';
import { ProtectedRoute } from '../routes/auth/ProtectedRoute';
import { DashboardLayout } from '../routes/dashboard/DashboardLayout';
import { HomePage } from '../routes/HomePage';
import { ProjectsPage } from '../routes/dashboard/ProjectsPage';
import { ProjectDetailPage } from '../routes/dashboard/ProjectDetailPage';
import { ManifestsPage } from '../routes/dashboard/ManifestsPage';
import { SchemasPage } from '../routes/dashboard/SchemasPage';
import { SchemaDetailPage } from '../routes/dashboard/SchemaDetailPage';
import { ModelsPage } from '../routes/dashboard/ModelsPage';
import { PromptsPage } from '../routes/dashboard/PromptsPage';
import { ValidationScriptsPage } from '../routes/dashboard/ValidationScriptsPage';
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
          { path: 'register', element: <RegisterPage /> },
        ],
      },
      {
        element: (
          <ErrorBoundary title="Dashboard unavailable">
            <ProtectedRoute>
              <DashboardLayout />
            </ProtectedRoute>
          </ErrorBoundary>
        ),
        children: [
          { path: 'projects', element: <ProjectsPage /> },
          { path: 'projects/:id', element: <ProjectDetailPage /> },
          { path: 'projects/:id/groups/:groupId/manifests', element: <ManifestsPage /> },
          { path: 'schemas', element: <SchemasPage /> },
          { path: 'schemas/:id', element: <SchemaDetailPage /> },
          { path: 'models', element: <ModelsPage /> },
          { path: 'prompts', element: <PromptsPage /> },
          { path: 'validation-scripts', element: <ValidationScriptsPage /> },
        ],
      },
    ],
  },
]);
