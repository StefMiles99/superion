import { useTranslation } from 'react-i18next';

interface VoiceIndicatorProps {
  active: boolean;
  mode?: 'idle' | 'listening' | 'speaking';
}

export function VoiceIndicator({ active, mode = 'listening' }: VoiceIndicatorProps) {
  const { t } = useTranslation();

  if (!active || mode === 'idle') {
    return null;
  }

  const label =
    mode === 'speaking' ? t('session.voice.speaking') : t('session.voice.listening');

  return (
    <div
      className="mx-4 mt-4 flex items-center gap-3 rounded-lg border border-[hsl(210_40%_30%/0.5)] bg-[hsl(210_40%_16%/0.6)] px-4 py-3"
      data-testid="voice-indicator"
      aria-live="polite"
      role="status"
    >
      <div className="flex items-end gap-1" aria-hidden="true">
        <span className="voice-wave-bar h-3 w-1 rounded-full bg-[hsl(199_89%_48%)]" />
        <span className="voice-wave-bar h-5 w-1 rounded-full bg-[hsl(199_89%_48%)] [animation-delay:120ms]" />
        <span className="voice-wave-bar h-4 w-1 rounded-full bg-[hsl(199_89%_48%)] [animation-delay:240ms]" />
        <span className="voice-wave-bar h-6 w-1 rounded-full bg-[hsl(199_89%_48%)] [animation-delay:360ms]" />
      </div>
      <span className="text-sm font-medium text-[hsl(210_40%_92%)]">{label}</span>
    </div>
  );
}
