import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, type RenderResult } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import {
  createMemoryRouter,
  type RouteObject,
  type Router,
  RouterProvider,
} from 'react-router';

import { resetApiClient } from '@superion/api-client';
import { useAuthStore } from '@superion/auth';
import type { AuthSession } from '@superion/domain';
import { initI18n } from '@superion/i18n';

import { useWorkOrderFilterStore } from '../src/hooks/useWorkOrderFilters';

export function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
}

export function renderWithProviders(
  routes: RouteObject[],
  {
    initialEntries = ['/login'],
    session = null,
    queryClient = createTestQueryClient(),
  }: {
    initialEntries?: string[];
    session?: AuthSession | null;
    queryClient?: QueryClient;
  } = {},
): RenderResult & { router: Router } {
  localStorage.clear();
  resetApiClient();
  useWorkOrderFilterStore.setState({ filters: {} });

  const isAuthenticated = session !== null && session.expiresAt > Date.now();
  useAuthStore.setState({
    session,
    isAuthenticated,
  });

  const router = createMemoryRouter(routes, { initialEntries });
  const i18n = initI18n('es-ES');

  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <I18nextProvider i18n={i18n}>{children}</I18nextProvider>
      </QueryClientProvider>
    );
  }

  const view = render(<RouterProvider router={router} />, { wrapper: Wrapper });
  return { ...view, router };
}
