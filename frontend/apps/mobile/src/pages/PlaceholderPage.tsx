import { useTranslation } from 'react-i18next';

import { Card } from '@superion/ui';

export default function PlaceholderPage() {
  const { t } = useTranslation();

  return (
    <main
      data-testid="foundation-placeholder"
      className="flex min-h-screen items-center justify-center p-4"
    >
      <Card className="max-w-md text-center">
        <h1 className="mb-2 text-2xl font-bold">{t('foundation.title')}</h1>
        <p className="text-[hsl(215_20%_65%)]">{t('foundation.mobileDescription')}</p>
      </Card>
    </main>
  );
}
