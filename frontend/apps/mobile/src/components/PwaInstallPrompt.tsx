import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@superion/ui';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function PwaInstallPrompt() {
  const { t } = useTranslation();
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const handler = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
      setVisible(true);
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  if (!visible || !deferredPrompt) {
    return null;
  }

  return (
    <div
      role="region"
      aria-label={t('pwa.installPrompt')}
      className="fixed bottom-4 left-4 right-4 z-50 rounded-lg border border-[hsl(217_33%_17%)] bg-[hsl(222_47%_9%)] p-4 shadow-lg"
    >
      <p className="mb-3 text-sm">{t('pwa.installPrompt')}</p>
      <div className="flex gap-2">
        <Button
          type="button"
          className="min-h-12 flex-1"
          onClick={() => {
            void deferredPrompt.prompt().then(() => {
              setVisible(false);
              setDeferredPrompt(null);
            });
          }}
        >
          {t('pwa.installPrompt')}
        </Button>
        <Button
          type="button"
          variant="ghost"
          className="min-h-12"
          onClick={() => {
            setVisible(false);
            setDeferredPrompt(null);
          }}
        >
          {t('pwa.installDismiss')}
        </Button>
      </div>
    </div>
  );
}
