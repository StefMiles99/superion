import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { RouterProvider } from 'react-router';

import { getEnv } from '@superion/config';
import { ErrorBoundary, ThemeProvider } from '@superion/ui';
import { Sentry } from '@superion/telemetry';

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

function SkipToContent() {
  const { t } = useTranslation();
  return (
    <a
      href="#main-content"
      className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-[hsl(217_91%_60%)] focus:px-4 focus:py-2 focus:text-[hsl(222_47%_6%)]"
    >
      {t('a11y.skipToContent')}
    </a>
  );
}

function AppProviders() {
  const { t } = useTranslation();

  return (
    <ThemeProvider theme={env.VITE_DEFAULT_THEME}>
      <SkipToContent />
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
          <main id="main-content">
            <RouterProvider router={router} />
          </main>
        </QueryClientProvider>
      </ErrorBoundary>
    </ThemeProvider>
  );
}

export function App() {
  return <AppProviders />;
}
