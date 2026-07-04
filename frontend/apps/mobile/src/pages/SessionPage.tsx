import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router';

import {
  getCurrentStep,
  getTotalSteps,
} from '@superion/domain';
import { AppShell, Button, Skeleton } from '@superion/ui';

import { CompactStepList } from '../components/CompactStepList';
import { ErrorBanner } from '../components/ErrorBanner';
import { StepActions } from '../components/StepActions';
import { StepCard } from '../components/StepCard';
import { Stepper } from '../components/Stepper';
import { Timer } from '../components/Timer';
import { useEta } from '../hooks/useEta';
import { useSession, useSessionProcedure } from '../hooks/useSession';
import { useSessionActions } from '../hooks/useSessionActions';
import { useSessionTimers } from '../hooks/useSessionTimers';
import { useWorkOrder } from '../hooks/useWorkOrder';

function SessionPageSkeleton() {
  return (
    <div className="space-y-4 p-4" data-testid="session-skeleton">
      <Skeleton height="1.5rem" className="w-1/2" />
      <Skeleton height="12rem" className="w-full" />
    </div>
  );
}

export default function SessionPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id: sessionId } = useParams<{ id: string }>();

  const { data: session, error: sessionError, isLoading: sessionLoading, refetch } =
    useSession(sessionId);
  const { data: procedure, error: procedureError, isLoading: procedureLoading } =
    useSessionProcedure(sessionId);
  const { data: workOrder } = useWorkOrder(session?.workOrderId);
  const { advanceStep, pauseSession, resumeSession, getAdvanceError, clearAdvanceError } =
    useSessionActions(sessionId);

  const { totalSeconds, stepSeconds } = useSessionTimers(session);
  const etaSeconds = useEta(session, procedure, totalSeconds);

  const isLoading = sessionLoading || procedureLoading;
  const error = sessionError ?? procedureError;
  const advanceError = getAdvanceError();

  const currentStep =
    session && procedure ? getCurrentStep(procedure, session.currentStepIndex) : undefined;
  const totalSteps = procedure ? getTotalSteps(procedure) : 0;
  const isPaused = session?.status === 'paused';

  const handleAdvance = () => {
    if (!session) {
      return;
    }
    clearAdvanceError();
    advanceStep.mutate(session.currentStepIndex);
  };

  const handlePauseToggle = () => {
    if (!session) {
      return;
    }
    if (session.status === 'active') {
      pauseSession.mutate();
      return;
    }
    if (session.status === 'paused') {
      resumeSession.mutate();
    }
  };

  const photoErrorMessage =
    advanceError?.code === 'STEP_REQUIRES_PHOTO'
      ? t('session.errors.requiresPhoto')
      : advanceError?.message ?? null;

  return (
    <AppShell
      title={workOrder?.code ?? t('session.title')}
      backLabel={t('session.back')}
      onBack={() => navigate(`/work-orders/${session?.workOrderId ?? ''}`)}
      headerActions={
        session ? (
          <Button
            type="button"
            variant="secondary"
            className="min-h-10 px-3 text-sm"
            onClick={handlePauseToggle}
            disabled={pauseSession.isPending || resumeSession.isPending}
            aria-label={isPaused ? t('session.actions.resume') : t('session.actions.pause')}
          >
            {isPaused ? t('session.actions.resume') : t('session.actions.pause')}
          </Button>
        ) : undefined
      }
      headerMeta={
        session ? (
          <Timer
            seconds={totalSeconds}
            label={t('session.timer')}
            testId="total-timer"
          />
        ) : undefined
      }
    >
      {isLoading ? <SessionPageSkeleton /> : null}

      {error ? (
        <div className="p-4">
          <ErrorBanner
            message={t('session.errorLoading')}
            retryLabel={t('workOrders.retry')}
            onRetry={() => {
              void refetch();
            }}
          />
        </div>
      ) : null}

      {session && procedure && currentStep ? (
        <div className="flex min-h-[calc(100vh-4rem)] flex-col">
          {photoErrorMessage ? (
            <div
              role="alert"
              aria-live="assertive"
              data-testid="session-step-error"
              className="mx-4 mt-4 rounded-lg border border-[hsl(0_84%_60%/0.4)] bg-[hsl(0_84%_60%/0.1)] p-3 text-sm text-[hsl(0_84%_70%)]"
            >
              {photoErrorMessage}
            </div>
          ) : null}

          <div className="flex-1 space-y-4 p-4">
            <Stepper currentStepIndex={session.currentStepIndex} totalSteps={totalSteps} />
            <CompactStepList steps={procedure.steps} currentStepIndex={session.currentStepIndex} />
            <StepCard
              step={currentStep}
              stepSeconds={stepSeconds}
              etaSeconds={etaSeconds}
            />
          </div>

          <StepActions
            onAdvance={handleAdvance}
            isAdvancing={advanceStep.isPending}
            disabled={isPaused}
          />
        </div>
      ) : null}
    </AppShell>
  );
}
