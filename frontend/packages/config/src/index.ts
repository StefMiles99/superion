export type AdapterMode = "mock" | "http";
export type WsMode = "mock" | "real";
export type VoiceMode = "mock" | "elevenlabs";

function str(value: string | undefined, fallback: string): string {
  return value && value.length > 0 ? value : fallback;
}

const apiBaseUrl = str(import.meta.env.VITE_API_BASE_URL, "http://localhost:8000").replace(
  /\/$/,
  "",
);

function deriveWs(): string {
  const explicit = import.meta.env.VITE_WS_BASE_URL;
  if (explicit && explicit.length > 0) return explicit.replace(/\/$/, "");
  return apiBaseUrl.replace(/^http/, "ws");
}

export interface AppConfig {
  apiMode: AdapterMode;
  wsMode: WsMode;
  voiceMode: VoiceMode;
  apiBaseUrl: string;
  wsBaseUrl: string;
  defaultLocale: string;
  isDev: boolean;
}

export const config: AppConfig = {
  apiMode: (import.meta.env.VITE_API_MODE as AdapterMode) ?? "mock",
  wsMode: (import.meta.env.VITE_WS_MODE as WsMode) ?? "mock",
  voiceMode: (import.meta.env.VITE_VOICE_MODE as VoiceMode) ?? "mock",
  apiBaseUrl,
  wsBaseUrl: deriveWs(),
  defaultLocale: str(import.meta.env.VITE_DEFAULT_LOCALE, "es-ES"),
  isDev: Boolean(import.meta.env.DEV),
};
