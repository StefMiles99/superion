import type {
  IVoiceClient,
  VoiceCallbacks,
  VoiceConnectOptions,
} from "@superion/domain";

/** Voz simulada: alterna escucha/habla sin ElevenLabs, para dev/test sin backend. */
export class InMemoryVoiceClient implements IVoiceClient {
  private timers: ReturnType<typeof setTimeout>[] = [];
  private active = false;

  async connect(_options: VoiceConnectOptions, callbacks: VoiceCallbacks): Promise<void> {
    void _options;
    this.active = true;
    callbacks.onState("connecting");
    this.timers.push(
      setTimeout(() => this.active && callbacks.onState("listening"), 400),
    );
    this.timers.push(
      setTimeout(() => this.active && callbacks.onState("speaking"), 2600),
    );
    this.timers.push(
      setTimeout(() => this.active && callbacks.onState("listening"), 5200),
    );
  }

  async disconnect(): Promise<void> {
    this.active = false;
    this.timers.forEach(clearTimeout);
    this.timers = [];
  }
}
