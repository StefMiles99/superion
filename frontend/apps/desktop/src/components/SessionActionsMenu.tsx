import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import type { SessionSummary } from '@superion/domain';
import { Button } from '@superion/ui';

import { useRemoteActions } from '../hooks/useRemoteActions';

interface SessionActionsMenuProps {
  session: SessionSummary;
  onPause: () => void;
  onResume: () => void;
}

export function SessionActionsMenu({ session, onPause, onResume }: SessionActionsMenuProps) {
  const { t } = useTranslation();
  const { addNote } = useRemoteActions();
  const [open, setOpen] = useState(false);
  const [noteOpen, setNoteOpen] = useState(false);
  const [noteDraft, setNoteDraft] = useState('');
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [open]);

  const handleAddNote = async () => {
    const trimmed = noteDraft.trim();
    if (!trimmed) {
      return;
    }

    await addNote.mutateAsync({
      sessionId: session.id,
      workOrderCode: session.workOrderCode,
      note: trimmed,
    });
    setNoteDraft('');
    setNoteOpen(false);
    setOpen(false);
  };

  return (
    <div className="relative inline-block text-left" ref={menuRef}>
      <Button
        variant="secondary"
        className="min-h-10 px-3"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        {t('dashboard.actions.menu')}
      </Button>

      {open ? (
        <div
          role="menu"
          className="absolute right-0 z-10 mt-1 min-w-40 rounded-md border border-[hsl(217_33%_22%)] bg-[hsl(222_47%_8%)] py-1 shadow-lg"
        >
          {session.status === 'active' ? (
            <button
              type="button"
              role="menuitem"
              className="block w-full px-3 py-2 text-left text-sm hover:bg-[hsl(217_33%_17%)]"
              onClick={() => {
                setOpen(false);
                onPause();
              }}
            >
              {t('dashboard.actions.pause')}
            </button>
          ) : null}
          {session.status === 'paused' ? (
            <button
              type="button"
              role="menuitem"
              className="block w-full px-3 py-2 text-left text-sm hover:bg-[hsl(217_33%_17%)]"
              onClick={() => {
                setOpen(false);
                onResume();
              }}
            >
              {t('dashboard.actions.resume')}
            </button>
          ) : null}
          <button
            type="button"
            role="menuitem"
            className="block w-full px-3 py-2 text-left text-sm hover:bg-[hsl(217_33%_17%)]"
            onClick={() => {
              setNoteOpen(true);
            }}
          >
            {t('dashboard.actions.addNote')}
          </button>
        </div>
      ) : null}

      {noteOpen ? (
        <div className="absolute right-0 z-20 mt-1 w-64 rounded-md border border-[hsl(217_33%_22%)] bg-[hsl(222_47%_8%)] p-3 shadow-lg">
          <label className="mb-2 block text-sm" htmlFor={`note-${session.id}`}>
            {t('dashboard.actions.noteLabel')}
          </label>
          <textarea
            id={`note-${session.id}`}
            value={noteDraft}
            onChange={(event) => setNoteDraft(event.target.value)}
            className="mb-2 w-full rounded-md border border-[hsl(217_33%_22%)] bg-[hsl(222_47%_6%)] p-2 text-sm"
            rows={3}
          />
          <div className="flex justify-end gap-2">
            <Button variant="ghost" className="min-h-10" onClick={() => setNoteOpen(false)}>
              {t('dashboard.confirmCancel')}
            </Button>
            <Button className="min-h-10" onClick={() => void handleAddNote()}>
              {t('dashboard.actions.saveNote')}
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
