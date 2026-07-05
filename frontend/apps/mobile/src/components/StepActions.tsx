import { useTranslation } from 'react-i18next';

import { Button } from '@superion/ui';

interface StepActionsProps {
  onAdvance: () => void;
  isAdvancing: boolean;
  disabled?: boolean;
}

export function StepActions({ onAdvance, isAdvancing, disabled = false }: StepActionsProps) {
  const { t } = useTranslation();

  return (
    <div className="border-t border-[hsl(217_33%_17%)] bg-[hsl(222_47%_6%)] p-4">
      <Button
        type="button"
        className="min-h-14 w-full text-base"
        onClick={onAdvance}
        disabled={disabled || isAdvancing}
        aria-busy={isAdvancing}
      >
        {t('session.actions.nextStep')}
      </Button>
    </div>
  );
}
