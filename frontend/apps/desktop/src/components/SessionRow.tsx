import { useId, useState } from 'react';
import { useTranslation } from 'react-i18next';

import type { SessionSummary } from '@superion/domain';
import { formatDuration } from '@superion/domain';
import { Button } from '@superion/ui';

import { useRemoteActions } from '../hooks/useRemoteActions';
import { SessionActionsMenu } from './SessionActionsMenu';
import { StatusDot } from './StatusDot';

interface SessionRowProps {
  session: SessionSummary;
  onNavigate: (sessionId: string) => void;
}

export function SessionRow({ session, onNavigate }: SessionRowProps) {
  const { t } = useTranslation();
  const { pauseSession, resumeSession } = useRemoteActions();
  const [confirmAction, setConfirmAction] = useState<'pause' | 'resume' | null>(null);
  const dialogTitleId = useId();

  const handleRowClick = () => {
    onNavigate(session.id);
  };

  const handleConfirm = async () => {
    if (confirmAction === 'pause') {
      await pauseSession.mutateAsync({
        sessionId: session.id,
        workOrderCode: session.workOrderCode,
      });
    }
    if (confirmAction === 'resume') {
      await resumeSession.mutateAsync({
        sessionId: session.id,
        workOrderCode: session.workOrderCode,
      });
    }
    setConfirmAction(null);
  };

  return (
    <>
      <tr
        data-testid="session-row"
        className="cursor-pointer border-b border-[hsl(217_33%_17%)] hover:bg-[hsl(217_33%_12%)]"
        onClick={handleRowClick}
      >
        <td className="px-3 py-2">
          <div className="flex items-center gap-2">
            <StatusDot status={session.status} />
            <span className="font-medium">{session.workOrderCode}</span>
          </div>
        </td>
        <td className="px-3 py-2 text-sm">{session.assetTag}</td>
        <td className="px-3 py-2 text-sm">{session.technicianName}</td>
        <td className="px-3 py-2 text-sm">
          {t('dashboard.stepLabel', {
            number: session.currentStepIndex + 1,
            title: session.currentStepTitle,
          })}
        </td>
        <td className="px-3 py-2 text-sm tabular-nums">{formatDuration(session.elapsedSeconds)}</td>
        <td className="px-3 py-2 text-sm text-[hsl(215_20%_65%)]">
          {t(`dashboard.events.${session.lastEventType}`, {
            defaultValue: session.lastEventType,
          })}
        </td>
        <td className="px-3 py-2 text-right" onClick={(event) => event.stopPropagation()}>
          <SessionActionsMenu
            session={session}
            onPause={() => setConfirmAction('pause')}
            onResume={() => setConfirmAction('resume')}
          />
        </td>
      </tr>

      {confirmAction ? (
        <tr>
          <td colSpan={7}>
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby={dialogTitleId}
              className="mx-3 my-2 rounded-md border border-[hsl(217_33%_22%)] bg-[hsl(222_47%_8%)] p-4"
            >
              <p id={dialogTitleId} className="mb-3 text-sm">
                {confirmAction === 'pause'
                  ? t('dashboard.confirmPause', { code: session.workOrderCode })
                  : t('dashboard.confirmResume', { code: session.workOrderCode })}
              </p>
              <div className="flex justify-end gap-2">
                <Button variant="ghost" onClick={() => setConfirmAction(null)}>
                  {t('dashboard.confirmCancel')}
                </Button>
                <Button onClick={() => void handleConfirm()}>{t('dashboard.confirmSubmit')}</Button>
              </div>
            </div>
          </td>
        </tr>
      ) : null}
    </>
  );
}
