import { z } from 'zod';

export const CitationSchema = z.object({
  manualId: z.string().min(1),
  manualVersion: z.number().int().positive(),
  page: z.number().int().positive(),
  sectionPath: z.string().min(1),
  chunkId: z.string().min(1),
  snippet: z.string().min(1),
});

export type Citation = z.infer<typeof CitationSchema>;

export const AssistantAnswerSchema = z.object({
  query: z.string().min(1),
  answerText: z.string().min(1),
  citations: z.array(CitationSchema).min(1),
  confidence: z.number().min(0).max(1),
});

export type AssistantAnswer = z.infer<typeof AssistantAnswerSchema>;

export interface AssistantQuery {
  sessionId: string;
  question: string;
}

export interface AssistantHistoryEntry {
  id: string;
  question: string;
  answer: AssistantAnswer;
  askedAt: string;
}

export function validateAssistantAnswer(value: unknown): AssistantAnswer {
  return AssistantAnswerSchema.parse(value);
}

export function validateCitation(value: unknown): Citation {
  return CitationSchema.parse(value);
}

export function getCitationPdfUrl(citation: Citation): string {
  return `https://example.com/manual.pdf#page=${String(citation.page)}`;
}

export function formatCitationSection(citation: Citation): string {
  const parts = citation.sectionPath.split('>');
  return parts[parts.length - 1]?.trim() ?? citation.sectionPath;
}
