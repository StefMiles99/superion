import { useTranslation } from 'react-i18next';

import type { AssistantAnswer } from '@superion/domain';

import { CitationChip } from './CitationChip';

interface AssistantAnswerCardProps {
  answer: AssistantAnswer;
}

export function AssistantAnswerCard({ answer }: AssistantAnswerCardProps) {
  const { t } = useTranslation();

  return (
    <article
      className="space-y-4 rounded-lg border border-[hsl(217_33%_17%)] bg-[hsl(222_47%_8%)] p-4"
      aria-live="polite"
      data-testid="assistant-answer-card"
    >
      <p className="whitespace-pre-wrap text-base leading-relaxed text-[hsl(210_40%_98%)]">
        {answer.answerText}
      </p>
      <div className="space-y-2">
        <p className="text-sm font-medium text-[hsl(215_20%_65%)]">
          {t('assistant.answer.citationsHeading')}
        </p>
        <div className="flex flex-wrap gap-2">
          {answer.citations.map((citation) => (
            <CitationChip key={citation.chunkId} citation={citation} />
          ))}
        </div>
      </div>
    </article>
  );
}
