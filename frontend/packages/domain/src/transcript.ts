import type { TranscriptEntry } from "./events";
import type { SessionEventItem } from "./report";

/** Convierte eventos REST en entradas de relato ordenadas por seq. */
export function eventsToTranscript(items: SessionEventItem[]): TranscriptEntry[] {
  const entries: TranscriptEntry[] = [];
  const sorted = [...items].sort((a, b) => a.seq - b.seq);

  for (const event of sorted) {
    if (event.type === "assistant.answered") {
      const answer = event.payload.answer_text;
      if (typeof answer === "string" && answer.trim()) {
        entries.push({
          id: `answer-${event.seq}`,
          speaker: "agent",
          text: answer,
          stepIndex: event.step_index,
          kind: "answer",
          createdAt: event.created_at,
        });
      }
      continue;
    }

    if (event.type === "event.appended") {
      const innerType = event.payload.type;
      const text = event.payload.text;
      if (typeof text !== "string" || !text.trim()) continue;

      if (innerType === "utterance") {
        const speakerRaw = event.payload.speaker;
        entries.push({
          id: `utt-${event.seq}`,
          speaker: speakerRaw === "agent" ? "agent" : "technician",
          text,
          stepIndex: event.step_index,
          kind: "utterance",
          createdAt: event.created_at,
        });
      } else if (innerType === "observation") {
        entries.push({
          id: `obs-${event.seq}`,
          speaker: "technician",
          text,
          stepIndex: event.step_index,
          kind: "observation",
          createdAt: event.created_at,
        });
      }
    }
  }

  return entries;
}
