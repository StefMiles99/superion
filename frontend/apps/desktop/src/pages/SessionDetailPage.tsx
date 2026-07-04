import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router';

import { useAuth, useLogout } from '@superion/auth';
import { formatDuration } from '@superion/domain';
import { AppShell, Skeleton, ToastContainer } from '@superion/ui';

import { AdminActionBar } from '../components/AdminActionBar';
import { EventStream } from '../components/EventStream';
import { ReportViewer } from '../components/ReportViewer';
import { StatusDot } from '../components/StatusDot';
import { TimelineScrubber } from '../components/TimelineScrubber';
import { useActiveSessions } from '../hooks/useActiveSessions';
import { useDashboardFilters } from '../hooks/useDashboardFilters';
import { useSessionDetail } from '../hooks/useSessionDetail';

function readStepIndexFromEvent(event: import('@superion/domain').WsEvent): number | null {
  const payload = event.payload;
  if (typeof payload !== 'object' || payload === null) {
    return null;
  }
  const record = payload as Record<string, unknown>;
  return typeof record.step_index === 'number' ? record.step_index : null;
}

export default function SessionDetailPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id: sessionId } = useParams<{ id: string }>();
  const { user } = useAuth();
  const logout = useLogout();
  const { filters } = useDashboardFilters();
  const { allSessions } = useActiveSessions(user?.plantId, filters);
  const {
    session,
    report,
    visibleEvents,
    hasMoreEvents,
    selectedSeq,
    highlightedStepIndex,
    isLoading,
    isError,
    selectEvent,
    loadMoreEvents,
    events,
  } = useSessionDetail(sessionId);

  const [citationModal, setCitationModal] = useState<{ page: number; sectionPath: string } | null>(
    null,
  );

  const workOrderCode = report?.content.header.otCode ?? '—';
  const technicianName = report?.content.header.technician ?? '—';
  const assetName = report?.content.header.asset ?? '—';
  const sessionStatus = session?.status ?? 'active';
  const currentStepIndex = session?.currentStepIndex ?? 0;

  const statusLabel = t(`dashboard.status.${sessionStatus}`);

  const handleLogout = async () => {
    await logout.mutateAsync();
    navigate('/login', { replace: true });
  };

  const handleSelectEvent = (event: import('@superion/domain').WsEvent) => {
    selectEvent(typeof event.seq === 'number' ? event.seq : null, readStepIndexFromEvent(event));
  };

  const handleTimelineSelect = (seq: number) => {
    const event = events.find((item) => item.seq === seq);
    if (event) {
      handleSelectEvent(event);
    } else {
      selectEvent(seq, null);
    }
  };

  return (
    <>
      <AppShell
        title={t('sessionDetail.title')}
        {...(user?.fullName ? { userName: user.fullName } : {})}
        logoutLabel={t('auth.logout')}
        onLogout={handleLogout}
        backLabel={t('sessionDetail.backToDashboard')}
        onBack={() => navigate('/dashboard')}
      >
        <div
          className="grid min-h-[calc(100vh-4rem)] grid-cols-[280px_1fr] gap-0"
          data-testid="session-detail-page"
        >
          <aside
            className="overflow-y-auto border-r border-[hsl(217_33%_17%)] bg-[hsl(222_47%_6%)] p-3"
            data-testid="session-detail-sidebar"
          >
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-[hsl(215_20%_50%)]">
              {t('sessionDetail.sessionsList')}
            </h2>
            <ul className="space-y-1">
              {allSessions.map((item) => {
                const selected = item.id === sessionId;
                return (
                  <li key={item.id}>
                    <button
                      type="button"
                      data-testid="session-sidebar-item"
                      data-selected={selected ? 'true' : 'false'}
                      className={
                        selected
                          ? 'flex w-full flex-col gap-1 rounded-md bg-[hsl(217_91%_60%/0.12)] px-3 py-2 text-left'
                          : 'flex w-full flex-col gap-1 rounded-md px-3 py-2 text-left hover:bg-[hsl(217_33%_12%)]'
                      }
                      onClick={() => navigate(`/sessions/${item.id}`)}
                    >
                      <span className="flex items-center gap-2 text-sm font-medium">
                        <StatusDot status={item.status} />
                        {item.workOrderCode}
                      </span>
                      <span className="text-xs text-[hsl(215_20%_65%)]">{item.technicianName}</span>
                      <span className="text-xs text-[hsl(215_20%_50%)]">
                        {t('dashboard.stepLabel', {
                          number: item.currentStepIndex + 1,
                          title: item.currentStepTitle,
                        })}
                      </span>
                      <span className="text-xs tabular-nums text-[hsl(215_20%_50%)]">
                        {formatDuration(item.elapsedSeconds)}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </aside>

          <main className="flex min-h-0 flex-col gap-3 p-4">
            {isLoading && !report ? (
              <Skeleton className="h-48 w-full" data-testid="session-detail-loading" />
            ) : null}

            {isError && !report ? (
              <p className="text-sm text-[hsl(0_84%_60%)]">{t('sessionDetail.errorLoading')}</p>
            ) : null}

            {report ? (
              <>
                <header className="space-y-2">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h1 className="text-lg font-semibold">{workOrderCode}</h1>
                      <p className="text-sm text-[hsl(215_20%_65%)]">
                        {t('sessionDetail.headerMeta', {
                          technician: technicianName,
                          asset: assetName,
                          status: statusLabel,
                        })}
                      </p>
                    </div>
                    <AdminActionBar
                      sessionId={sessionId!}
                      workOrderCode={workOrderCode}
                      status={sessionStatus}
                      currentStepIndex={currentStepIndex}
                    />
                  </div>
                  <TimelineScrubber
                    events={events}
                    selectedSeq={selectedSeq}
                    onSelectSeq={handleTimelineSelect}
                  />
                </header>

                <div className="grid min-h-0 flex-1 grid-rows-[1fr_auto] gap-3">
                  <ReportViewer report={report} highlightedStepIndex={highlightedStepIndex} />
                  <EventStream
                    events={visibleEvents}
                    selectedSeq={selectedSeq}
                    onSelectEvent={handleSelectEvent}
                    onLoadMore={loadMoreEvents}
                    hasMore={hasMoreEvents}
                    onOpenCitation={(page, sectionPath) => setCitationModal({ page, sectionPath })}
                  />
                </div>
              </>
            ) : null}
          </main>
        </div>
      </AppShell>

      {citationModal ? (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-[hsl(222_47%_6%/0.72)] p-4"
          data-testid="citation-modal"
        >
          <div className="w-full max-w-lg rounded-md border border-[hsl(217_33%_22%)] bg-[hsl(222_47%_8%)] p-4 shadow-xl">
            <h2 className="text-base font-semibold">{t('sessionDetail.citationModal.title')}</h2>
            <p className="mt-2 text-sm text-[hsl(215_20%_75%)]">
              {t('sessionDetail.citationModal.body', {
                page: citationModal.page,
                section: citationModal.sectionPath,
              })}
            </p>
            <div className="mt-4 flex justify-end">
              <button
                type="button"
                className="rounded-md bg-[hsl(217_91%_60%)] px-3 py-2 text-sm font-medium text-[hsl(222_47%_6%)]"
                onClick={() => setCitationModal(null)}
              >
                {t('sessionDetail.citationModal.close')}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <ToastContainer />
    </>
  );
}
