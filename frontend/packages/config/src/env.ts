import { z } from 'zod';

const EnvSchema = z.object({
  VITE_API_BASE_URL: z.string().url().default('http://localhost:8000'),
  VITE_WS_BASE_URL: z.string().default('ws://localhost:8000'),
  VITE_API_MODE: z.enum(['mock', 'http']).default('mock'),
  VITE_WS_MODE: z.enum(['mock', 'real']).default('mock'),
  VITE_DEFAULT_LOCALE: z.string().default('es-ES'),
  VITE_DEFAULT_THEME: z.enum(['dark', 'light']).default('dark'),
  VITE_SENTRY_DSN: z.string().default(''),
  VITE_TELEMETRY_ENABLED: z
    .enum(['true', 'false'])
    .default('true')
    .transform((v) => v === 'true'),
});

export type Env = z.infer<typeof EnvSchema>;

export function parseEnv(raw: Record<string, string | undefined>): Env {
  return EnvSchema.parse(raw);
}

export function getEnv(): Env {
  return EnvSchema.parse({
    VITE_API_BASE_URL: import.meta.env.VITE_API_BASE_URL,
    VITE_WS_BASE_URL: import.meta.env.VITE_WS_BASE_URL,
    VITE_API_MODE: import.meta.env.VITE_API_MODE,
    VITE_WS_MODE: import.meta.env.VITE_WS_MODE,
    VITE_DEFAULT_LOCALE: import.meta.env.VITE_DEFAULT_LOCALE,
    VITE_DEFAULT_THEME: import.meta.env.VITE_DEFAULT_THEME,
    VITE_SENTRY_DSN: import.meta.env.VITE_SENTRY_DSN,
    VITE_TELEMETRY_ENABLED: import.meta.env.VITE_TELEMETRY_ENABLED,
  });
}
