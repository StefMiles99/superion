import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';

import { useAuth, useLogout } from '@superion/auth';
import { AppShell, Skeleton } from '@superion/ui';

import { EmptyState } from '../components/EmptyState';
import { ErrorBanner } from '../components/ErrorBanner';
import { FilterBar } from '../components/FilterBar';
import { WorkOrderCard } from '../components/WorkOrderCard';
import { useWorkOrderFilters } from '../hooks/useWorkOrderFilters';
import { useWorkOrders } from '../hooks/useWorkOrders';

function WorkOrderSkeletonList() {
  return (
    <div className="space-y-3" data-testid="work-orders-skeleton">
      {Array.from({ length: 3 }, (_, index) => (
        <div
          key={`skeleton-${String(index)}`}
          className="rounded-lg border border-[hsl(217_33%_17%)] p-4"
        >
          <Skeleton height="1.25rem" className="mb-2 w-1/3" />
          <Skeleton height="1rem" className="mb-2 w-2/3" />
          <Skeleton height="1rem" className="w-1/2" />
        </div>
      ))}
    </div>
  );
}

export default function WorkOrdersPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const logout = useLogout();
  const { filters, setStatus, setPriority, setQuery, clearFilters } = useWorkOrderFilters();
  const { data, error, isLoading, isFetching, fetchNextPage, hasNextPage, isFetchingNextPage, refetch } =
    useWorkOrders(filters);

  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);
  const [pullDistance, setPullDistance] = useState(0);
  const touchStartY = useRef<number | null>(null);

  const workOrders = data?.pages.flatMap((page) => page.items) ?? [];

  const handleLogout = async () => {
    await logout.mutateAsync();
    navigate('/login', { replace: true });
  };

  const handleRefresh = useCallback(async () => {
    await refetch();
  }, [refetch]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || !hasNextPage) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry?.isIntersecting && !isFetchingNextPage) {
          void fetchNextPage();
        }
      },
      { rootMargin: '120px' },
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

  const handleTouchStart = (event: React.TouchEvent<HTMLDivElement>) => {
    if (listRef.current && listRef.current.scrollTop <= 0) {
      touchStartY.current = event.touches[0]?.clientY ?? null;
    }
  };

  const handleTouchMove = (event: React.TouchEvent<HTMLDivElement>) => {
    if (touchStartY.current === null) {
      return;
    }

    const currentY = event.touches[0]?.clientY ?? touchStartY.current;
    const distance = Math.max(0, currentY - touchStartY.current);
    setPullDistance(Math.min(distance, 96));
  };

  const handleTouchEnd = () => {
    if (pullDistance >= 64) {
      void handleRefresh();
    }
    touchStartY.current = null;
    setPullDistance(0);
  };

  const showEmptyState = !isLoading && !error && workOrders.length === 0;
  const showList = !isLoading && !error && workOrders.length > 0;

  return (
    <AppShell
      title={t('workOrders.title')}
      {...(user?.fullName ? { userName: user.fullName } : {})}
      logoutLabel={t('auth.logout')}
      onLogout={handleLogout}
    >
      <div className="space-y-4 p-4">
        <FilterBar
          {...(filters.status ? { status: filters.status } : {})}
          {...(filters.priority ? { priority: filters.priority } : {})}
          query={filters.q ?? ''}
          onStatusChange={setStatus}
          onPriorityChange={setPriority}
          onQueryChange={setQuery}
        />

        {pullDistance > 0 ? (
          <p className="text-center text-xs text-[hsl(215_20%_65%)]" aria-live="polite">
            {t('workOrders.pullToRefresh')}
          </p>
        ) : null}

        {error ? (
          <ErrorBanner
            message={t('workOrders.errorLoading')}
            retryLabel={t('workOrders.retry')}
            onRetry={() => {
              void refetch();
            }}
          />
        ) : null}

        {isLoading ? <WorkOrderSkeletonList /> : null}

        {showEmptyState ? (
          <EmptyState
            title={t('workOrders.empty.title')}
            description={t('workOrders.empty.description')}
            actionLabel={t('workOrders.empty.action')}
            onAction={clearFilters}
          />
        ) : null}

        {showList ? (
          <div
            ref={listRef}
            data-testid="work-orders-list"
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            className="space-y-3"
            style={{
              transform: pullDistance > 0 ? `translateY(${String(pullDistance / 4)}px)` : undefined,
            }}
          >
            {workOrders.map((workOrder) => (
              <WorkOrderCard key={workOrder.id} workOrder={workOrder} />
            ))}
            <div ref={sentinelRef} aria-hidden="true" className="h-1" />
            {isFetchingNextPage ? (
              <p className="text-center text-sm text-[hsl(215_20%_65%)]">{t('common.loading')}</p>
            ) : null}
          </div>
        ) : null}

        {isFetching && !isLoading && !isFetchingNextPage ? (
          <p className="text-center text-xs text-[hsl(215_20%_65%)]" aria-live="polite">
            {t('workOrders.refreshing')}
          </p>
        ) : null}
      </div>
    </AppShell>
  );
}
