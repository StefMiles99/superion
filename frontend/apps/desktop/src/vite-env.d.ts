/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_MODE?: "mock" | "http";
  readonly VITE_WS_MODE?: "mock" | "real";
  readonly VITE_VOICE_MODE?: "mock" | "elevenlabs";
  readonly VITE_API_BASE_URL?: string;
  readonly VITE_WS_BASE_URL?: string;
  readonly VITE_DEFAULT_LOCALE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
