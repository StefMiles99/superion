import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router';

import { AppShell, Card } from '@superion/ui';

export default function SessionDetailPage() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();

  return (
    <AppShell title={t('sessionDetail.title')}>
      <div className="flex min-h-[50vh] items-center justify-center p-4">
        <Card data-testid="session-detail-page" className="max-w-md text-center">
          <p className="text-[hsl(215_20%_65%)]">
            {t('sessionDetail.placeholder', { id: id ?? '—' })}
          </p>
        </Card>
      </div>
    </AppShell>
  );
}
