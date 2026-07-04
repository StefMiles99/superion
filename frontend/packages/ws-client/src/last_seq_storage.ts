const STORAGE_PREFIX = 'superion.ws.last_seq.';

export function readLastSeq(sessionId: string): number {
  if (typeof sessionStorage === 'undefined') {
    return 0;
  }

  const raw = sessionStorage.getItem(`${STORAGE_PREFIX}${sessionId}`);
  if (!raw) {
    return 0;
  }

  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
}

export function writeLastSeq(sessionId: string, seq: number): void {
  if (typeof sessionStorage === 'undefined') {
    return;
  }

  sessionStorage.setItem(`${STORAGE_PREFIX}${sessionId}`, String(seq));
}

export function clearLastSeq(sessionId: string): void {
  if (typeof sessionStorage === 'undefined') {
    return;
  }

  sessionStorage.removeItem(`${STORAGE_PREFIX}${sessionId}`);
}
