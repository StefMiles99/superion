import { describe, expect, it, vi } from "vitest";
import type { VoiceState } from "@superion/domain";
import { InMemoryVoiceClient } from "../src/in_memory";

describe("InMemoryVoiceClient", () => {
  it("emite la secuencia de estados de voz al conectar", async () => {
    vi.useFakeTimers();
    try {
      const states: VoiceState[] = [];
      const client = new InMemoryVoiceClient();
      await client.connect(
        { signedUrl: "mock", dynamicVariables: {} },
        { onState: (s) => states.push(s), onError: () => {} },
      );
      expect(states).toEqual(["connecting"]);
      vi.advanceTimersByTime(3000);
      expect(states).toContain("listening");
      expect(states).toContain("speaking");
    } finally {
      vi.useRealTimers();
    }
  });

  it("al desconectar cancela transiciones pendientes", async () => {
    vi.useFakeTimers();
    try {
      const states: VoiceState[] = [];
      const client = new InMemoryVoiceClient();
      await client.connect(
        { signedUrl: "mock", dynamicVariables: {} },
        { onState: (s) => states.push(s), onError: () => {} },
      );
      await client.disconnect();
      vi.advanceTimersByTime(6000);
      expect(states).toEqual(["connecting"]);
    } finally {
      vi.useRealTimers();
    }
  });
});
