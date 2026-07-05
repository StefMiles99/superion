import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';

import { getApiClient } from '@superion/api-client';
import { useAuth, useLogout } from '@superion/auth';
import type { Manual, ManualStatus } from '@superion/domain';
import { AppShell, Button, Input, Skeleton, ToastContainer, showToast } from '@superion/ui';

import { ManualTable } from '../components/ManualTable';
import { useManuals } from '../hooks/useManuals';

const STATUS_FILTERS: Array<{ value: ManualStatus | undefined; labelKey: string }> = [
  { value: undefined, labelKey: 'manuals.filters.all' },
  { value: 'active', labelKey: 'manuals.filters.active' },
  { value: 'indexing', labelKey: 'manuals.filters.indexing' },
  { value: 'archived', labelKey: 'manuals.filters.archived' },
  { value: 'error', labelKey: 'manuals.filters.error' },
];

export default function ManualsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const logout = useLogout();
  const [statusFilter, setStatusFilter] = useState<ManualStatus | undefined>();
  const [searchQuery, setSearchQuery] = useState('');

  const filter = useMemo(
    () => ({
      ...(statusFilter ? { status: statusFilter } : {}),
      ...(searchQuery.trim() ? { q: searchQuery.trim() } : {}),
    }),
    [searchQuery, statusFilter],
  );

  const { manuals, isLoading, isError } = useManuals(filter);

  const handleLogout = async () => {
    await logout.mutateAsync();
    navigate('/login', { replace: true });
  };

  const handleDownload = async (manual: Manual) => {
    try {
      const detail = await getApiClient().getManual(manual.id);
      if (detail.downloadUrl.startsWith('mock://')) {
        showToast(t('manuals.toast.downloadMock'));
        return;
      }
      window.open(detail.downloadUrl, '_blank', 'noopener,noreferrer');
    } catch {
      showToast(t('manuals.toast.downloadError'));
    }
  };

  return (
    <>
      <AppShell
        title={t('manuals.title')}
        {...(user?.fullName ? { userName: user.fullName } : {})}
        logoutLabel={t('auth.logout')}
        onLogout={handleLogout}
        headerActions={
          <Button onClick={() => navigate('/manuals/upload')}>{t('manuals.uploadButton')}</Button>
        }
      >
        <div className="p-4" data-testid="manuals-page">
          <div className="mb-4 flex flex-wrap items-end gap-4" data-testid="manuals-filters">
            <div className="min-w-48 flex-1">
              <label className="mb-1 block text-xs text-[hsl(215_20%_65%)]" htmlFor="manuals-search">
                {t('manuals.filters.search')}
              </label>
              <Input
                id="manuals-search"
                name="q"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder={t('manuals.filters.searchPlaceholder')}
              />
            </div>

            <div>
              <label
                className="mb-1 block text-xs text-[hsl(215_20%_65%)]"
                htmlFor="manuals-status-filter"
              >
                {t('manuals.filters.status')}
              </label>
              <select
                id="manuals-status-filter"
                value={statusFilter ?? ''}
                onChange={(event) => {
                  const value = event.target.value;
                  setStatusFilter(value ? (value as ManualStatus) : undefined);
                }}
                className="rounded-md border border-[hsl(217_33%_22%)] bg-[hsl(222_47%_6%)] px-3 py-2 text-sm"
              >
                {STATUS_FILTERS.map((option) => (
                  <option key={option.labelKey} value={option.value ?? ''}>
                    {t(option.labelKey)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {isLoading ? <Skeleton className="h-48 w-full" /> : null}

          {isError ? (
            <p className="text-sm text-[hsl(0_84%_60%)]">{t('manuals.errorLoading')}</p>
          ) : null}

          {!isLoading && !isError ? (
            <ManualTable manuals={manuals} onDownload={(manual) => void handleDownload(manual)} />
          ) : null}
        </div>
      </AppShell>
      <ToastContainer />
    </>
  );
}
