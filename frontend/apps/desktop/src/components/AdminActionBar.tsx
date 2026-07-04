import { useId, useState } from 'react';
import { useTranslation } from 'react-i18next';

import type { SessionStatus } from '@superion/domain';
import { Button } from '@superion/ui';

import { useAdminActions } from '../hooks/useAdminActions';

interface AdminActionBarProps {
  sessionId: string;
  workOrderCode: string;
  status: SessionStatus;
  currentStepIndex: number;
}

export function AdminActionBar({
  sessionId,
  workOrderCode,
  status,
  currentStepIndex,
}: AdminActionBarProps) {
  const { t } = useTranslation();
  const { pauseSession, resumeSession, forceAdvance, addNote } = useAdminActions();
  const [confirmAction, setConfirmAction] = useState<'pause' | 'resume' | 'force' | null>(null);
  const [noteOpen, setNoteOpen] = useState(false);
  const [noteDraft, setNoteDraft] = useState('');
  const dialogTitleId = useId();

  const handleConfirm = async () => {
    if (confirmAction === 'pause') {
      await pauseSession.mutateAsync({ sessionId, workOrderCode });
    }
    if (confirmAction === 'resume') {
      await resumeSession.mutateAsync({ sessionId, workOrderCode });
    }
    if (confirmAction === 'force') {
      await forceAdvance.mutateAsync({ sessionId, workOrderCode, stepIndex: currentStepIndex });
    }
    setConfirmAction(null);
  };

  const handleSaveNote = async () => {
    const trimmed = noteDraft.trim();
    if (!trimmed) {
      return;
    }

    await addNote.mutateAsync({ sessionId, workOrderCode, note: trimmed });
    setNoteDraft('');
    setNoteOpen(false);
  };

  return (
    <div className="flex flex-wrap items-center gap-2" data-testid="admin-action-bar">
      {status === 'active' ? (
        <Button variant="secondary" onClick={() => setConfirmAction('pause')}>
          {t('sessionDetail.admin.pauseRemote')}
        </Button>
      ) : null}
      {status === 'paused' ? (
        <Button variant="secondary" onClick={() => setConfirmAction('resume')}>
          {t('sessionDetail.admin.resumeRemote')}
        </Button>
      ) : null}
      {status === 'active' ? (
        <Button variant="secondary" onClick={() => setConfirmAction('force')}>
          {t('sessionDetail.admin.forceAdvance')}
        </Button>
      ) : null}
      <Button variant="ghost" onClick={() => setNoteOpen((value) => !value)}>
        {t('sessionDetail.admin.addNote')}
      </Button>

      {noteOpen ? (
        <div className="w-full rounded-md border border-[hsl(217_33%_22%)] bg-[hsl(222_47%_8%)] p-3">
          <label className="mb-2 block text-sm" htmlFor={`admin-note-${sessionId}`}>
            {t('sessionDetail.admin.noteLabel')}
          </label>
          <textarea
            id={`admin-note-${sessionId}`}
            value={noteDraft}
            onChange={(event) => setNoteDraft(event.target.value)}
            className="mb-2 w-full rounded-md border border-[hsl(217_33%_22%)] bg-[hsl(222_47%_6%)] p-2 text-sm"
            rows={3}
          />
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setNoteOpen(false)}>
              {t('sessionDetail.admin.cancel')}
            </Button>
            <Button onClick={() => void handleSaveNote()}>{t('sessionDetail.admin.saveNote')}</Button>
          </div>
        </div>
      ) : null}

      {confirmAction ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby={dialogTitleId}
          className="fixed inset-0 z-50 flex items-center justify-center bg-[hsl(222_47%_6%/0.72)] p-4"
        >
          <div className="w-full max-w-md rounded-md border border-[hsl(217_33%_22%)] bg-[hsl(222_47%_8%)] p-4 shadow-xl">
            <p id={dialogTitleId} className="mb-4 text-sm">
              {confirmAction === 'pause'
                ? t('sessionDetail.admin.confirmPause', { code: workOrderCode })
                : confirmAction === 'resume'
                  ? t('sessionDetail.admin.confirmResume', { code: workOrderCode })
                  : t('sessionDetail.admin.confirmForceAdvance', { code: workOrderCode })}
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setConfirmAction(null)}>
                {t('sessionDetail.admin.cancel')}
              </Button>
              <Button onClick={() => void handleConfirm()}>{t('sessionDetail.admin.confirm')}</Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
