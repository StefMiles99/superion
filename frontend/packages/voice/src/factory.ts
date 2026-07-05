import { config } from "@superion/config";
import type { IVoiceClient } from "@superion/domain";
import { ElevenLabsVoiceClient } from "./elevenlabs";
import { InMemoryVoiceClient } from "./in_memory";

/** Devuelve el cliente de voz según VITE_VOICE_MODE (mock por defecto). */
export function createVoiceClient(): IVoiceClient {
  if (config.voiceMode === "elevenlabs") {
    return new ElevenLabsVoiceClient();
  }
  return new InMemoryVoiceClient();
}
