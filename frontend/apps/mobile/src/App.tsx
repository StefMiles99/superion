import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { RouterProvider } from 'react-router';

import { getEnv } from '@superion/config';
import { ErrorBoundary, ThemeProvider } from '@superion/ui';
import { Sentry } from '@superion/telemetry';

import { PwaInstallPrompt } from './components/PwaInstallPrompt';
import { router } from './routes';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});

const env = getEnv();

function AppProviders() {
  const { t } = useTranslation();

  return (
    <ThemeProvider theme={env.VITE_DEFAULT_THEME}>
      <ErrorBoundary
        labels={{
          title: t('errors.boundaryTitle'),
          message: t('errors.boundaryMessage'),
          reload: t('errors.boundaryReload'),
        }}
        onError={(error) => {
          Sentry.captureException(error);
        }}
      >
        <QueryClientProvider client={queryClient}>
          <RouterProvider router={router} />
          <PwaInstallPrompt />
        </QueryClientProvider>
      </ErrorBoundary>
    </ThemeProvider>
  );
}

export function App() {
  return <AppProviders />;
}
