import { config } from "@superion/config";
import type { VoiceState } from "@superion/domain";
import { useCallback, useRef, useState } from "react";
import { useServices } from "@/services/context";

export interface VoiceAgent {
  state: VoiceState;
  error: string | null;
  active: boolean;
  start: () => Promise<void>;
  stop: () => Promise<void>;
  toggle: () => Promise<void>;
}

/** Conexión directa (hook) entre el agente de voz y el frontend. */
export function useVoiceAgent(sessionId: string): VoiceAgent {
  const { api, voice } = useServices();
  const [state, setState] = useState<VoiceState>("idle");
  const [error, setError] = useState<string | null>(null);
  const activeRef = useRef(false);

  const start = useCallback(async () => {
    if (activeRef.current) return;
    setError(null);
    setState("requesting");
    try {
      if (config.voiceMode === "elevenlabs") {
        await navigator.mediaDevices.getUserMedia({ audio: true });
      }
      const conn = await api.voiceConnect(sessionId);
      activeRef.current = true;
      await voice.connect(
        { signedUrl: conn.signed_url, dynamicVariables: conn.dynamic_variables },
        {
          onState: (s) => setState(s),
          onError: (msg) => {
            setError(msg);
            setState("error");
          },
        },
      );
    } catch (e) {
      activeRef.current = false;
      setState("error");
      setError(e instanceof Error ? e.message : "voice_error");
    }
  }, [api, voice, sessionId]);

  const stop = useCallback(async () => {
    activeRef.current = false;
    await voice.disconnect();
    setState("idle");
  }, [voice]);

  const toggle = useCallback(async () => {
    if (activeRef.current) await stop();
    else await start();
  }, [start, stop]);

  return { state, error, active: activeRef.current, start, stop, toggle };
}
