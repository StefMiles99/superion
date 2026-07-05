import * as Sentry from '@sentry/react';
import { onCLS, onFID, onINP, onLCP, type Metric } from 'web-vitals';

export interface TelemetryOptions {
  sentryDsn: string;
  enabled: boolean;
  apiBaseUrl: string;
  webVitalsEndpoint?: string;
}

export interface TelemetryEvent {
  name: string;
  properties?: Record<string, unknown> | undefined;
  timestamp: string;
}

declare global {
  interface Window {
    __capture?: (event: TelemetryEvent) => void;
  }
}

let telemetryEnabled = false;

function emitEvent(event: TelemetryEvent): void {
  if (typeof window !== 'undefined' && window.__capture) {
    window.__capture(event);
  }

  if (!telemetryEnabled) {
    return;
  }

  Sentry.addBreadcrumb({
    category: 'telemetry',
    message: event.name,
    ...(event.properties ? { data: event.properties } : {}),
    level: 'info',
  });
}

export function trackEvent(name: string, properties?: Record<string, unknown>): void {
  emitEvent({
    name,
    properties,
    timestamp: new Date().toISOString(),
  });
}

async function sendWebVital(metric: Metric, endpoint: string): Promise<void> {
  const body = {
    name: metric.name,
    value: metric.value,
    id: metric.id,
    rating: metric.rating,
    navigationType: metric.navigationType,
    timestamp: new Date().toISOString(),
  };

  try {
    await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      keepalive: true,
    });
  } catch {
    // Telemetry must not break the app.
  }
}

function initWebVitals(endpoint: string): void {
  const report = (metric: Metric) => {
    void sendWebVital(metric, endpoint);
    trackEvent(`web_vital_${metric.name.toLowerCase()}`, {
      value: metric.value,
      rating: metric.rating,
    });
  };

  onLCP(report);
  onFID(report);
  onINP(report);
  onCLS(report);
}

function patchConsoleError(): void {
  const original = console.error.bind(console);
  console.error = (...args: unknown[]) => {
    original(...args);
    if (!telemetryEnabled) {
      return;
    }
    Sentry.captureException(
      args[0] instanceof Error ? args[0] : new Error(String(args[0] ?? 'console.error')),
    );
  };
}

export function initTelemetry(options: TelemetryOptions): void {
  telemetryEnabled = options.enabled;

  if (options.sentryDsn) {
    Sentry.init({
      dsn: options.sentryDsn,
      enabled: options.enabled,
      integrations: [Sentry.browserTracingIntegration()],
      tracesSampleRate: 0.1,
    });
  }

  patchConsoleError();

  window.addEventListener('error', (event) => {
    if (!telemetryEnabled) {
      return;
    }
    Sentry.captureException(event.error ?? new Error(event.message));
  });

  window.addEventListener('unhandledrejection', (event) => {
    if (!telemetryEnabled) {
      return;
    }
    Sentry.captureException(
      event.reason instanceof Error ? event.reason : new Error(String(event.reason)),
    );
  });

  const vitalsEndpoint =
    options.webVitalsEndpoint?.trim() ||
    `${options.apiBaseUrl.replace(/\/$/, '')}/telemetry`;

  if (telemetryEnabled) {
    initWebVitals(vitalsEndpoint);
  }
}

export { Sentry };
