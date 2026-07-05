import { useTranslation } from 'react-i18next';

import type { AssistantHistoryEntry } from '@superion/domain';

import { AssistantAnswerCard } from './AssistantAnswerCard';

interface AssistantHistoryListProps {
  entries: AssistantHistoryEntry[];
}

export function AssistantHistoryList({ entries }: AssistantHistoryListProps) {
  const { t } = useTranslation();

  if (entries.length === 0) {
    return (
      <p className="text-sm text-[hsl(215_20%_65%)]" data-testid="assistant-history-empty">
        {t('assistant.history.empty')}
      </p>
    );
  }

  return (
    <ul className="space-y-4" data-testid="assistant-history-list">
      {[...entries].reverse().map((entry) => (
        <li key={entry.id} className="space-y-3">
          <p className="text-sm font-medium text-[hsl(215_20%_65%)]">{entry.question}</p>
          <AssistantAnswerCard answer={entry.answer} />
        </li>
      ))}
    </ul>
  );
}
