import { useId, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';

import type { Manual } from '@superion/domain';
import { Button } from '@superion/ui';

import { useManualActions } from '../hooks/useManuals';
import { IndexStatusBadge } from './IndexStatusBadge';

interface ManualTableProps {
  manuals: Manual[];
  onDownload: (manual: Manual) => void;
}

export function ManualTable({ manuals, onDownload }: ManualTableProps) {
  const { t } = useTranslation();
  const { reindexManual, archiveManual } = useManualActions();
  const [confirmArchiveId, setConfirmArchiveId] = useState<string | null>(null);
  const dialogTitleId = useId();

  const confirmManual = manuals.find((manual) => manual.id === confirmArchiveId);

  return (
    <>
      <div className="overflow-x-auto rounded-md border border-[hsl(217_33%_17%)]">
        <table className="min-w-full text-left text-sm" data-testid="manuals-table">
          <thead className="bg-[hsl(217_33%_12%)] text-xs uppercase text-[hsl(215_20%_65%)]">
            <tr>
              <th className="px-3 py-2">{t('manuals.columns.title')}</th>
              <th className="px-3 py-2">{t('manuals.columns.model')}</th>
              <th className="px-3 py-2">{t('manuals.columns.version')}</th>
              <th className="px-3 py-2">{t('manuals.columns.status')}</th>
              <th className="px-3 py-2">{t('manuals.columns.chunks')}</th>
              <th className="px-3 py-2">{t('manuals.columns.uploadedAt')}</th>
              <th className="px-3 py-2">{t('manuals.columns.author')}</th>
              <th className="px-3 py-2 text-right">{t('manuals.columns.actions')}</th>
            </tr>
          </thead>
          <tbody>
            {manuals.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-3 py-8 text-center text-[hsl(215_20%_65%)]">
                  {t('manuals.empty')}
                </td>
              </tr>
            ) : (
              manuals.map((manual) => (
                <tr
                  key={manual.id}
                  data-testid="manual-row"
                  className="border-b border-[hsl(217_33%_17%)] hover:bg-[hsl(217_33%_12%)]"
                >
                  <td className="px-3 py-2">
                    <Link
                      to={`/manuals/${manual.id}`}
                      className="font-medium text-[hsl(217_91%_60%)] hover:underline"
                    >
                      {manual.title}
                    </Link>
                  </td>
                  <td className="px-3 py-2">{manual.assetModel}</td>
                  <td className="px-3 py-2 tabular-nums">v{manual.version}</td>
                  <td className="px-3 py-2">
                    <IndexStatusBadge indexStatus={manual.indexStatus} status={manual.status} />
                  </td>
                  <td className="px-3 py-2 tabular-nums">{manual.chunkCount}</td>
                  <td className="px-3 py-2 text-[hsl(215_20%_65%)]">
                    {new Date(manual.uploadedAt).toLocaleDateString()}
                  </td>
                  <td className="px-3 py-2">{manual.uploadedBy.fullName}</td>
                  <td className="px-3 py-2 text-right">
                    <div className="flex justify-end gap-2">
                      {manual.status === 'archived' ? (
                        <Button
                          variant="ghost"
                          className="min-h-10 px-2 text-xs"
                          disabled
                          title={t('manuals.actions.restoreNotAvailable')}
                        >
                          {t('manuals.actions.restore')}
                        </Button>
                      ) : (
                        <>
                          <Button
                            variant="secondary"
                            className="min-h-10 px-2 text-xs"
                            disabled={reindexManual.isPending}
                            onClick={() => void reindexManual.mutateAsync(manual.id)}
                          >
                            {t('manuals.actions.reindex')}
                          </Button>
                          <Button
                            variant="secondary"
                            className="min-h-10 px-2 text-xs"
                            onClick={() => onDownload(manual)}
                          >
                            {t('manuals.actions.download')}
                          </Button>
                          <Button
                            variant="ghost"
                            className="min-h-10 px-2 text-xs"
                            onClick={() => setConfirmArchiveId(manual.id)}
                          >
                            {t('manuals.actions.archive')}
                          </Button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {confirmArchiveId && confirmManual ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby={dialogTitleId}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
        >
          <div className="w-full max-w-md rounded-md border border-[hsl(217_33%_22%)] bg-[hsl(222_47%_8%)] p-4">
            <p id={dialogTitleId} className="mb-4 text-sm">
              {t('manuals.confirmArchive', { title: confirmManual.title })}
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setConfirmArchiveId(null)}>
                {t('manuals.confirmCancel')}
              </Button>
              <Button
                onClick={() => {
                  void archiveManual.mutateAsync(confirmArchiveId).finally(() => {
                    setConfirmArchiveId(null);
                  });
                }}
              >
                {t('manuals.confirmSubmit')}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
