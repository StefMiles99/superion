import { useCallback, useEffect, useState } from 'react';

import { cn } from './cn';

export interface ToastMessage {
  id: string;
  message: string;
}

type ToastListener = (messages: ToastMessage[]) => void;

let toasts: ToastMessage[] = [];
const listeners = new Set<ToastListener>();

function notifyListeners(): void {
  const snapshot = [...toasts];
  for (const listener of listeners) {
    listener(snapshot);
  }
}

export function showToast(message: string, durationMs = 4000): void {
  const id = crypto.randomUUID();
  toasts = [...toasts, { id, message }];
  notifyListeners();

  window.setTimeout(() => {
    dismissToast(id);
  }, durationMs);
}

export function dismissToast(id: string): void {
  toasts = toasts.filter((item) => item.id !== id);
  notifyListeners();
}

export function clearToasts(): void {
  toasts = [];
  notifyListeners();
}

export function ToastContainer() {
  const [messages, setMessages] = useState<ToastMessage[]>(toasts);

  const handleUpdate = useCallback((next: ToastMessage[]) => {
    setMessages(next);
  }, []);

  useEffect(() => {
    listeners.add(handleUpdate);
    return () => {
      listeners.delete(handleUpdate);
    };
  }, [handleUpdate]);

  if (messages.length === 0) {
    return null;
  }

  return (
    <div
      className="pointer-events-none fixed bottom-4 right-4 z-50 flex w-full max-w-sm flex-col gap-2"
      aria-live="polite"
      aria-atomic="true"
    >
      {messages.map((toast) => (
        <div
          key={toast.id}
          role="status"
          className={cn(
            'pointer-events-auto rounded-md border border-[hsl(217_33%_22%)]',
            'bg-[hsl(222_47%_8%)] px-4 py-3 text-sm text-[hsl(210_40%_98%)] shadow-lg',
          )}
        >
          {toast.message}
        </div>
      ))}
    </div>
  );
}
