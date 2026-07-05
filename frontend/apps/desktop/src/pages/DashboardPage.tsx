import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';

import { useAuth, useLogout } from '@superion/auth';
import type { SessionStatus } from '@superion/domain';
import { AppShell, Skeleton, ToastContainer } from '@superion/ui';

import { SessionRow } from '../components/SessionRow';
import { useActiveSessions } from '../hooks/useActiveSessions';
import { useDashboardFilters } from '../hooks/useDashboardFilters';

const STATUS_FILTERS: Array<{ value: SessionStatus | undefined; labelKey: string }> = [
  { value: undefined, labelKey: 'dashboard.filters.all' },
  { value: 'active', labelKey: 'dashboard.filters.active' },
  { value: 'paused', labelKey: 'dashboard.filters.paused' },
  { value: 'finalized', labelKey: 'dashboard.filters.finalized' },
];

export default function DashboardPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const logout = useLogout();
  const { filters, setStatus, setTechnicianId } = useDashboardFilters();
  const { sessions, allSessions, isLoading, isError, connectionState } = useActiveSessions(
    user?.plantId,
    filters,
  );

  const technicians = Array.from(
    new Map(allSessions.map((session) => [session.technicianId, session.technicianName])).entries(),
  );

  const handleLogout = async () => {
    await logout.mutateAsync();
    navigate('/login', { replace: true });
  };

  const connectionLabel =
    connectionState === 'open'
      ? null
      : connectionState === 'reconnecting'
        ? t('dashboard.connection.reconnecting')
        : t('dashboard.connection.connecting');

  return (
    <>
      <AppShell
        title={t('dashboard.title')}
        {...(user?.fullName ? { userName: user.fullName } : {})}
        logoutLabel={t('auth.logout')}
        onLogout={handleLogout}
        headerMeta={
          connectionLabel ? (
            <span data-testid="ws-connection-indicator">{connectionLabel}</span>
          ) : null
        }
      >
        <div className="p-4">
          <div className="mb-4 flex flex-wrap items-end gap-4" data-testid="dashboard-filters">
            <div>
              <p className="mb-1 text-xs text-[hsl(215_20%_65%)]">{t('dashboard.filters.plant')}</p>
              <p className="text-sm font-medium">{user?.plantId ?? '—'}</p>
            </div>

            <div>
              <label
                className="mb-1 block text-xs text-[hsl(215_20%_65%)]"
                htmlFor="dashboard-status-filter"
              >
                {t('dashboard.filters.status')}
              </label>
              <select
                id="dashboard-status-filter"
                value={filters.status ?? ''}
                onChange={(event) => {
                  const value = event.target.value;
                  setStatus(value ? (value as SessionStatus) : undefined);
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

            <div>
              <label
                className="mb-1 block text-xs text-[hsl(215_20%_65%)]"
                htmlFor="dashboard-technician-filter"
              >
                {t('dashboard.filters.technician')}
              </label>
              <select
                id="dashboard-technician-filter"
                value={filters.technicianId ?? ''}
                onChange={(event) => {
                  const value = event.target.value;
                  setTechnicianId(value || undefined);
                }}
                className="rounded-md border border-[hsl(217_33%_22%)] bg-[hsl(222_47%_6%)] px-3 py-2 text-sm"
              >
                <option value="">{t('dashboard.filters.allTechnicians')}</option>
                {technicians.map(([id, name]) => (
                  <option key={id} value={id}>
                    {name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {isLoading ? (
            <Skeleton className="h-48 w-full" />
          ) : null}

          {isError ? (
            <p className="text-sm text-[hsl(0_84%_60%)]">{t('dashboard.errorLoading')}</p>
          ) : null}

          {!isLoading && !isError ? (
            <div className="overflow-x-auto rounded-md border border-[hsl(217_33%_17%)]">
              <table className="min-w-full text-left text-sm" data-testid="sessions-table">
                <thead className="bg-[hsl(217_33%_12%)] text-xs uppercase text-[hsl(215_20%_65%)]">
                  <tr>
                    <th className="px-3 py-2">{t('dashboard.columns.workOrder')}</th>
                    <th className="px-3 py-2">{t('dashboard.columns.asset')}</th>
                    <th className="px-3 py-2">{t('dashboard.columns.technician')}</th>
                    <th className="px-3 py-2">{t('dashboard.columns.step')}</th>
                    <th className="px-3 py-2">{t('dashboard.columns.elapsed')}</th>
                    <th className="px-3 py-2">{t('dashboard.columns.lastEvent')}</th>
                    <th className="px-3 py-2 text-right">{t('dashboard.columns.actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {sessions.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-3 py-8 text-center text-[hsl(215_20%_65%)]">
                        {t('dashboard.empty')}
                      </td>
                    </tr>
                  ) : (
                    sessions.map((session) => (
                      <SessionRow
                        key={session.id}
                        session={session}
                        onNavigate={(sessionId) => navigate(`/sessions/${sessionId}`)}
                      />
                    ))
                  )}
                </tbody>
              </table>
            </div>
          ) : null}
        </div>
      </AppShell>
      <ToastContainer />
    </>
  );
}
