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

import { resetApiClient, getApiClient, InMemoryApiClient } from '@superion/api-client';
import { useAuthStore } from '@superion/auth';
import { initI18n } from '@superion/i18n';
import { getWsClient, resetWsClient } from '@superion/ws-client';

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
  { initialEntries = ['/login'] }: { initialEntries?: string[] } = {},
): RenderResult & { router: Router } {
  localStorage.clear();
  useAuthStore.setState({ session: null, isAuthenticated: false });
  resetApiClient();
  resetWsClient();

  const api = getApiClient();
  const ws = getWsClient();
  if (api instanceof InMemoryApiClient && typeof ws.emit === 'function') {
    api.setPhotoEventEmitter((event) => {
      ws.emit?.(event);
    });
  }

  const queryClient = createTestQueryClient();
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
