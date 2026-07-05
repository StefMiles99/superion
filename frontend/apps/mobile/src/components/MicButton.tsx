import type { VoiceState } from "@superion/domain";
import { useTranslation } from "@superion/i18n";
import { cn } from "@superion/ui";

interface MicButtonProps {
  state: VoiceState;
  onToggle: () => void;
  disabled?: boolean;
}

const ACTIVE: VoiceState[] = ["listening", "speaking"];

export function MicButton({ state, onToggle, disabled }: MicButtonProps) {
  const { t } = useTranslation();
  const isActive = ACTIVE.includes(state);
  const isBusy = state === "connecting" || state === "requesting";

  const ring =
    state === "speaking"
      ? "bg-emerald-500"
      : state === "listening"
        ? "bg-sky-500"
        : state === "error"
          ? "bg-rose-500"
          : "bg-slate-700";

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative flex h-40 w-40 items-center justify-center">
        {isActive && (
          <>
            <span className={cn("absolute h-40 w-40 rounded-full opacity-30", ring, "animate-pulse-ring")} />
            <span
              className={cn("absolute h-40 w-40 rounded-full opacity-20", ring, "animate-pulse-ring")}
              style={{ animationDelay: "0.6s" }}
            />
          </>
        )}
        <button
          type="button"
          aria-label={t(`mic.${state}` as const)}
          aria-pressed={isActive}
          disabled={disabled}
          onClick={onToggle}
          className={cn(
            "relative z-10 flex h-32 w-32 items-center justify-center rounded-full text-white shadow-2xl transition-transform active:scale-95 disabled:opacity-50",
            ring,
          )}
        >
          <MicIcon className={cn("h-14 w-14", isBusy && "animate-pulse")} />
        </button>
      </div>
      <span className="text-base font-medium text-slate-300">{t(`mic.${state}` as const)}</span>
    </div>
  );
}

function MicIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <rect x="9" y="3" width="6" height="11" rx="3" fill="currentColor" stroke="none" />
      <path d="M6 11a6 6 0 0 0 12 0" strokeLinecap="round" />
      <path d="M12 17v4M8 21h8" strokeLinecap="round" />
    </svg>
  );
}
