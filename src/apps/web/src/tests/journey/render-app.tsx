import { render } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { appRoutes } from '@/app/router';
import { ErrorBoundary } from '@/shared/components/ErrorBoundary';
import { Toaster } from '@/shared/components/ui/toaster';
import { ThemeProvider } from '@/shared/providers/ThemeProvider';
import { Providers } from '@/app/providers';

export const renderApp = (options: {
  route?: string;
  queryClient?: QueryClient;
} = {}) => {
  const router = createMemoryRouter(appRoutes, {
    initialEntries: [options.route ?? '/'],
  });

  const queryClient =
    options.queryClient ??
    new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
          gcTime: 0,
        },
        mutations: {
          retry: false,
        },
      },
    });

  const result = render(
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <Providers>
          <ErrorBoundary titleKey="errors.appUnavailableTitle">
            <RouterProvider router={router} />
            <Toaster />
          </ErrorBoundary>
        </Providers>
      </ThemeProvider>
    </QueryClientProvider>,
  );

  return { ...result, router };
};
