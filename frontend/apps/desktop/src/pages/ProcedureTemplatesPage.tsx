import { useId, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router';

import { getApiClient } from '@superion/api-client';
import { useAuth, useLogout } from '@superion/auth';
import type { ProcedureTemplateListItem } from '@superion/domain';
import { AppShell, Button, Skeleton, ToastContainer, showToast } from '@superion/ui';

import { useProcedureTemplateMutations } from '../hooks/useProcedureTemplateMutations';
import { useProcedureTemplates } from '../hooks/useProcedureTemplates';

export default function ProcedureTemplatesPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const logout = useLogout();
  const { templates, isLoading, isError } = useProcedureTemplates();
  const { archiveTemplate } = useProcedureTemplateMutations();
  const [confirmArchiveId, setConfirmArchiveId] = useState<string | null>(null);
  const dialogTitleId = useId();

  const confirmTemplate = templates.find((template) => template.id === confirmArchiveId);

  const handleLogout = async () => {
    await logout.mutateAsync();
    navigate('/login', { replace: true });
  };

  const handleDuplicate = async (template: ProcedureTemplateListItem) => {
    try {
      const detail = await getApiClient().getProcedureTemplate(template.id);
      navigate('/procedures/new', {
        state: {
          duplicateFrom: {
            ...detail,
            name: detail.name,
            version: detail.version + 1,
          },
        },
      });
    } catch {
      showToast(t('procedures.toast.loadError'));
    }
  };

  return (
    <>
      <AppShell
        title={t('procedures.title')}
        {...(user?.fullName ? { userName: user.fullName } : {})}
        logoutLabel={t('auth.logout')}
        onLogout={handleLogout}
        headerActions={
          <Button onClick={() => navigate('/procedures/new')}>{t('procedures.newButton')}</Button>
        }
      >
        <div className="p-4" data-testid="procedures-page">
          {isLoading ? <Skeleton className="h-48 w-full" /> : null}

          {isError ? (
            <p className="text-sm text-[hsl(0_84%_60%)]">{t('procedures.errorLoading')}</p>
          ) : null}

          {!isLoading && !isError ? (
            <div className="overflow-x-auto rounded-md border border-[hsl(217_33%_17%)]">
              <table className="min-w-full text-left text-sm" data-testid="procedures-table">
                <thead className="bg-[hsl(217_33%_12%)] text-xs uppercase text-[hsl(215_20%_65%)]">
                  <tr>
                    <th className="px-3 py-2">{t('procedures.columns.name')}</th>
                    <th className="px-3 py-2">{t('procedures.columns.version')}</th>
                    <th className="px-3 py-2">{t('procedures.columns.manual')}</th>
                    <th className="px-3 py-2">{t('procedures.columns.steps')}</th>
                    <th className="px-3 py-2">{t('procedures.columns.minutes')}</th>
                    <th className="px-3 py-2">{t('procedures.columns.status')}</th>
                    <th className="px-3 py-2 text-right">{t('procedures.columns.actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {templates.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-3 py-8 text-center text-[hsl(215_20%_65%)]">
                        {t('procedures.empty')}
                      </td>
                    </tr>
                  ) : (
                    templates.map((template) => (
                      <tr
                        key={template.id}
                        data-testid="procedure-row"
                        className="border-b border-[hsl(217_33%_17%)] hover:bg-[hsl(217_33%_12%)]"
                      >
                        <td className="px-3 py-2">
                          <Link
                            to={`/procedures/${template.id}`}
                            className="font-medium text-[hsl(217_91%_60%)] hover:underline"
                          >
                            {template.name}
                          </Link>
                        </td>
                        <td className="px-3 py-2 tabular-nums">v{template.version}</td>
                        <td className="px-3 py-2">{template.manualTitle}</td>
                        <td className="px-3 py-2 tabular-nums">{template.stepCount}</td>
                        <td className="px-3 py-2 tabular-nums">{template.estimatedMinutes}</td>
                        <td className="px-3 py-2">{t(`procedures.status.${template.status}`)}</td>
                        <td className="px-3 py-2 text-right">
                          <div className="flex justify-end gap-2">
                            {template.status === 'archived' ? null : (
                              <>
                                <Button
                                  variant="secondary"
                                  className="min-h-10 px-2 text-xs"
                                  onClick={() => void handleDuplicate(template)}
                                >
                                  {t('procedures.actions.duplicate')}
                                </Button>
                                <Button
                                  variant="ghost"
                                  className="min-h-10 px-2 text-xs"
                                  onClick={() => setConfirmArchiveId(template.id)}
                                >
                                  {t('procedures.actions.archive')}
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
          ) : null}
        </div>
      </AppShell>

      {confirmArchiveId && confirmTemplate ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby={dialogTitleId}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
        >
          <div className="w-full max-w-md rounded-md border border-[hsl(217_33%_22%)] bg-[hsl(222_47%_8%)] p-4">
            <p id={dialogTitleId} className="mb-4 text-sm">
              {t('procedures.confirmArchive', { name: confirmTemplate.name })}
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setConfirmArchiveId(null)}>
                {t('procedures.confirmCancel')}
              </Button>
              <Button
                onClick={() => {
                  void archiveTemplate.mutateAsync(confirmArchiveId).finally(() => {
                    setConfirmArchiveId(null);
                  });
                }}
              >
                {t('procedures.confirmSubmit')}
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      <ToastContainer />
    </>
  );
}
