import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate, useParams } from 'react-router';

import { useAuth, useLogout } from '@superion/auth';
import type { ProcedureTemplate } from '@superion/domain';
import { deriveStepIndices, normalizeStepIndices } from '@superion/domain';
import { AppShell, Button, Input, Skeleton, ToastContainer } from '@superion/ui';

import { ManualSelector } from '../components/ManualSelector';
import { ProcedureStepList } from '../components/ProcedureStepList';
import { useManuals } from '../hooks/useManuals';
import { useProcedureTemplateMutations } from '../hooks/useProcedureTemplateMutations';
import { useProcedureTemplate } from '../hooks/useProcedureTemplates';
import {
  validateProcedureTemplateDraft,
  type ProcedureTemplateDraft,
  type ProcedureValidationError,
} from '../services/procedure_validator';

function createEmptyDraft(): ProcedureTemplateDraft {
  return {
    name: '',
    version: 1,
    manualId: '',
    estimatedMinutes: 90,
    steps: [],
  };
}

function templateToDraft(template: ProcedureTemplate): ProcedureTemplateDraft {
  return {
    name: template.name,
    version: template.version,
    manualId: template.manualId,
    assetId: template.assetId ?? null,
    estimatedMinutes: template.estimatedMinutes,
    steps: template.steps.map((step) => ({ ...step })),
  };
}

function mapValidationErrors(
  errors: ProcedureValidationError[],
  translate: (key: string) => string,
): Record<string, string> {
  const mapped: Record<string, string> = {};
  for (const error of errors) {
    mapped[error.field] = translate(error.messageKey);
  }
  return mapped;
}

export default function ProcedureTemplateEditorPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams();
  const isNew = !id || id === 'new';
  const templateId = isNew ? undefined : id;

  const { user } = useAuth();
  const logout = useLogout();
  const { allManuals } = useManuals();
  const { data: existingTemplate, isLoading } = useProcedureTemplate(templateId);
  const { createTemplate, updateTemplate, archiveTemplate } = useProcedureTemplateMutations();

  const duplicateState = location.state as { duplicateFrom?: ProcedureTemplate } | null;

  const [draft, setDraft] = useState<ProcedureTemplateDraft>(createEmptyDraft());
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [showConfirmArchive, setShowConfirmArchive] = useState(false);

  useEffect(() => {
    if (duplicateState?.duplicateFrom) {
      setDraft(templateToDraft(duplicateState.duplicateFrom));
      return;
    }
    if (existingTemplate) {
      setDraft(templateToDraft(existingTemplate));
    }
  }, [duplicateState?.duplicateFrom, existingTemplate]);

  const pageTitle = useMemo(
    () => (isNew ? t('procedures.editor.newTitle') : t('procedures.editor.editTitle')),
    [isNew, t],
  );

  const handleLogout = async () => {
    await logout.mutateAsync();
    navigate('/login', { replace: true });
  };

  const validateAndSave = async () => {
    const normalizedDraft: ProcedureTemplateDraft = {
      ...draft,
      steps: normalizeStepIndices(draft.steps),
    };
    const errors = validateProcedureTemplateDraft(normalizedDraft);
    if (errors.length > 0) {
      setFieldErrors(mapValidationErrors(errors, (key) => t(key)));
      return;
    }

    setFieldErrors({});
    const input = {
      name: normalizedDraft.name.trim(),
      version: normalizedDraft.version,
      manualId: normalizedDraft.manualId,
      assetId: normalizedDraft.assetId ?? null,
      estimatedMinutes: normalizedDraft.estimatedMinutes,
      steps: normalizedDraft.steps,
    };

    if (isNew) {
      await createTemplate.mutateAsync(input);
    } else if (templateId) {
      await updateTemplate.mutateAsync({ id: templateId, input });
    }

    navigate('/procedures');
  };

  const handleDuplicate = () => {
    setDraft((current) => ({
      ...current,
      version: current.version + 1,
    }));
    navigate('/procedures/new', {
      replace: true,
      state: {
        duplicateFrom: {
          id: templateId ?? 'new',
          ...draft,
          version: draft.version + 1,
          steps: draft.steps.map((step) => ({ ...step })),
          criticalStepIndices: deriveStepIndices(draft.steps).criticalStepIndices,
          photoRequiredStepIndices: deriveStepIndices(draft.steps).photoRequiredStepIndices,
          status: 'active' as const,
        },
      },
    });
  };

  const isSaving = createTemplate.isPending || updateTemplate.isPending;

  return (
    <>
      <AppShell
        title={pageTitle}
        {...(user?.fullName ? { userName: user.fullName } : {})}
        logoutLabel={t('auth.logout')}
        onLogout={handleLogout}
        backLabel={t('procedures.editor.back')}
        onBack={() => navigate('/procedures')}
      >
        <div className="mx-auto max-w-4xl p-4" data-testid="procedure-editor-page">
          {isLoading && !isNew ? <Skeleton className="mb-4 h-32 w-full" /> : null}

          <form
            onSubmit={(event) => {
              event.preventDefault();
              void validateAndSave();
            }}
            className="space-y-4"
          >
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs text-[hsl(215_20%_65%)]" htmlFor="name">
                  {t('procedures.fields.name')}
                </label>
                <Input
                  id="name"
                  name="name"
                  value={draft.name}
                  onChange={(event) => setDraft({ ...draft, name: event.target.value })}
                  aria-invalid={fieldErrors.name ? true : undefined}
                />
                {fieldErrors.name ? (
                  <p className="mt-1 text-xs text-[hsl(0_84%_60%)]">{fieldErrors.name}</p>
                ) : null}
              </div>

              <div>
                <label className="mb-1 block text-xs text-[hsl(215_20%_65%)]" htmlFor="version">
                  {t('procedures.fields.version')}
                </label>
                <Input
                  id="version"
                  name="version"
                  type="number"
                  min={1}
                  value={draft.version}
                  onChange={(event) =>
                    setDraft({ ...draft, version: Number(event.target.value) || 1 })
                  }
                  aria-invalid={fieldErrors.version ? true : undefined}
                />
                {fieldErrors.version ? (
                  <p className="mt-1 text-xs text-[hsl(0_84%_60%)]">{fieldErrors.version}</p>
                ) : null}
              </div>
            </div>

            <ManualSelector
              manuals={allManuals}
              value={draft.manualId}
              onChange={(manualId) => setDraft({ ...draft, manualId })}
              {...(fieldErrors.manualId ? { error: fieldErrors.manualId } : {})}
            />

            <div>
              <label
                className="mb-1 block text-xs text-[hsl(215_20%_65%)]"
                htmlFor="estimatedMinutes"
              >
                {t('procedures.fields.estimatedMinutes')}
              </label>
              <Input
                id="estimatedMinutes"
                name="estimatedMinutes"
                type="number"
                min={1}
                value={draft.estimatedMinutes}
                onChange={(event) =>
                  setDraft({
                    ...draft,
                    estimatedMinutes: Number(event.target.value) || 0,
                  })
                }
                aria-invalid={fieldErrors.estimatedMinutes ? true : undefined}
              />
              {fieldErrors.estimatedMinutes ? (
                <p className="mt-1 text-xs text-[hsl(0_84%_60%)]">{fieldErrors.estimatedMinutes}</p>
              ) : null}
            </div>

            <ProcedureStepList
              steps={draft.steps}
              fieldErrors={fieldErrors}
              onChange={(steps) => setDraft({ ...draft, steps })}
            />

            <div className="flex flex-wrap gap-2 pt-2">
              <Button type="submit" disabled={isSaving}>
                {t('procedures.editor.save')}
              </Button>
              {!isNew ? (
                <>
                  <Button type="button" variant="secondary" onClick={handleDuplicate}>
                    {t('procedures.actions.duplicate')}
                  </Button>
                  <Button type="button" variant="ghost" onClick={() => setShowConfirmArchive(true)}>
                    {t('procedures.actions.archive')}
                  </Button>
                </>
              ) : null}
            </div>
          </form>
        </div>
      </AppShell>

      {showConfirmArchive && templateId ? (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
        >
          <div className="w-full max-w-md rounded-md border border-[hsl(217_33%_22%)] bg-[hsl(222_47%_8%)] p-4">
            <p className="mb-4 text-sm">{t('procedures.confirmArchive', { name: draft.name })}</p>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setShowConfirmArchive(false)}>
                {t('procedures.confirmCancel')}
              </Button>
              <Button
                onClick={() => {
                  void archiveTemplate.mutateAsync(templateId).then(() => {
                    navigate('/procedures');
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
