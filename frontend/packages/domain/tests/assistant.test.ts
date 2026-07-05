import { describe, expect, it } from 'vitest';

import {
  AssistantAnswerSchema,
  CitationSchema,
  validateAssistantAnswer,
  validateCitation,
} from '../src/entities/assistant';

const sampleCitation = {
  manualId: 'manual-comp-1',
  manualVersion: 3,
  page: 42,
  sectionPath: '4. Mantenimiento > 4.3 Válvulas',
  chunkId: 'chunk-42',
  snippet: 'Torque de apriete: 85 N·m ± 5%.',
};

const sampleAnswer = {
  query: '¿cuál es el torque?',
  answerText: 'El torque de apriete es 85 N·m ± 5%.',
  citations: [sampleCitation],
  confidence: 0.82,
};

describe('Citation shape', () => {
  it('accepts a valid citation', () => {
    expect(() => validateCitation(sampleCitation)).not.toThrow();
    expect(CitationSchema.parse(sampleCitation).page).toBe(42);
  });

  it('rejects citation without page', () => {
    expect(() =>
      validateCitation({
        ...sampleCitation,
        page: 0,
      }),
    ).toThrow();
  });
});

describe('AssistantAnswer shape', () => {
  it('accepts a valid answer with citations', () => {
    expect(() => validateAssistantAnswer(sampleAnswer)).not.toThrow();
    const parsed = AssistantAnswerSchema.parse(sampleAnswer);
    expect(parsed.citations).toHaveLength(1);
    expect(parsed.answerText).toContain('torque');
  });

  it('rejects answer without citations', () => {
    expect(() =>
      validateAssistantAnswer({
        ...sampleAnswer,
        citations: [],
      }),
    ).toThrow();
  });
});
