import { useTranslation } from 'react-i18next';
import { Link, useNavigate, useParams } from 'react-router';

import { AppShell, Button, Skeleton } from '@superion/ui';

import { ErrorBanner } from '../components/ErrorBanner';
import { PriorityChip } from '../components/PriorityChip';
import { StatusBadge } from '../components/StatusBadge';
import { useStartSession } from '../hooks/useStartSession';
import { useWorkOrder } from '../hooks/useWorkOrder';

function WorkOrderDetailSkeleton() {
  return (
    <div className="space-y-4" data-testid="work-order-detail-skeleton">
      <Skeleton height="2rem" className="w-1/3" />
      <Skeleton height="1rem" className="w-2/3" />
      <Skeleton height="6rem" className="w-full" />
    </div>
  );
}

export default function WorkOrderDetailPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { data: workOrder, error, isLoading, refetch } = useWorkOrder(id);
  const startSession = useStartSession();

  const canStart =
    workOrder?.status === 'pending' && !startSession.isPending && !startSession.isSuccess;

  const handleStart = () => {
    if (!id) {
      return;
    }
    startSession.mutate(id);
  };

  return (
    <AppShell
      title={workOrder?.code ?? t('workOrders.detail.title')}
      backLabel={t('workOrders.detail.back')}
      onBack={() => navigate('/work-orders')}
    >
      <div className="flex min-h-[calc(100vh-4rem)] flex-col p-4">
        {isLoading ? <WorkOrderDetailSkeleton /> : null}

        {error ? (
          <ErrorBanner
            message={t('workOrders.detail.errorLoading')}
            retryLabel={t('workOrders.retry')}
            onRetry={() => {
              void refetch();
            }}
          />
        ) : null}

        {workOrder ? (
          <div className="flex flex-1 flex-col space-y-4">
            <div className="space-y-2">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h1 className="text-xl font-bold">{workOrder.code}</h1>
                  <p className="text-sm text-[hsl(215_20%_65%)]">
                    {workOrder.asset.name} · {workOrder.asset.tag}
                  </p>
                </div>
                <StatusBadge status={workOrder.status} />
              </div>
              <p className="text-sm text-[hsl(215_20%_65%)]">{workOrder.procedureName}</p>
              <div className="flex items-center gap-2">
                <PriorityChip priority={workOrder.priority} />
                <span className="text-xs text-[hsl(215_20%_65%)]">
                  {t('workOrders.card.estimatedMinutes', {
                    minutes: workOrder.estimatedMinutes,
                  })}
                </span>
              </div>
            </div>

            {workOrder.description ? (
              <section>
                <h2 className="mb-1 text-sm font-semibold">{t('workOrders.detail.description')}</h2>
                <p className="text-sm text-[hsl(215_20%_75%)]">{workOrder.description}</p>
              </section>
            ) : null}

            {workOrder.notes ? (
              <section>
                <h2 className="mb-1 text-sm font-semibold">{t('workOrders.detail.notes')}</h2>
                <p className="text-sm text-[hsl(215_20%_75%)]">{workOrder.notes}</p>
              </section>
            ) : null}

            {startSession.error ? (
              <div
                role="alert"
                aria-live="assertive"
                className="rounded-lg border border-[hsl(0_84%_60%/0.4)] bg-[hsl(0_84%_60%/0.1)] p-3 text-sm text-[hsl(0_84%_70%)]"
              >
                {t('workOrders.detail.startError')}
              </div>
            ) : null}

            <div className="mt-auto pt-6">
              {canStart ? (
                <Button
                  type="button"
                  className="min-h-14 w-full text-base"
                  onClick={handleStart}
                  disabled={startSession.isPending}
                  aria-busy={startSession.isPending}
                >
                  {t('session.start')}
                </Button>
              ) : null}

              {workOrder.status === 'in_progress' || workOrder.status === 'paused' ? (
                <p className="text-center text-sm text-[hsl(215_20%_65%)]">
                  {t('workOrders.detail.alreadyStarted')}{' '}
                  <Link to="/work-orders" className="text-[hsl(217_91%_60%)] underline">
                    {t('workOrders.detail.backToList')}
                  </Link>
                </p>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>
    </AppShell>
  );
}
