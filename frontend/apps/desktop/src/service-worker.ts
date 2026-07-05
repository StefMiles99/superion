export async function registerServiceWorker(enabled: boolean): Promise<ServiceWorkerRegistration | null> {
  if (!enabled || !('serviceWorker' in navigator)) {
    return null;
  }

  try {
    return await navigator.serviceWorker.register('/service-worker.js');
  } catch {
    return null;
  }
}
