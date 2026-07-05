import { validateManualFile, type ManualFileError } from "@superion/domain";
import { useTranslation } from "@superion/i18n";
import { cn } from "@superion/ui";
import { useRef, useState, type DragEvent } from "react";

interface DropzoneProps {
  file: File | null;
  onFile: (file: File | null) => void;
  onError: (error: ManualFileError | null) => void;
}

export function Dropzone({ file, onFile, onError }: DropzoneProps) {
  const { t } = useTranslation();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const accept = (candidate: File | undefined) => {
    if (!candidate) return;
    const result = validateManualFile({
      type: candidate.type,
      size: candidate.size,
      name: candidate.name,
    });
    if (result.ok) {
      onError(null);
      onFile(candidate);
    } else {
      onError(result.error);
      onFile(null);
    }
  };

  const onDrop = (e: DragEvent<HTMLButtonElement>) => {
    e.preventDefault();
    setDragging(false);
    accept(e.dataTransfer.files[0]);
  };

  return (
    <div>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={cn(
          "flex w-full flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed px-6 py-10 text-center transition-colors",
          dragging ? "border-sky-500 bg-sky-500/5" : "border-slate-700 bg-slate-900/50",
        )}
      >
        <svg className="h-10 w-10 text-slate-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <path d="M12 16V4m0 0l-4 4m4-4l4 4" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" strokeLinecap="round" />
        </svg>
        {file ? (
          <span className="text-sm font-medium text-slate-200">
            {t("manuals.selected")}: {file.name}
          </span>
        ) : (
          <>
            <span className="text-sm font-medium text-slate-300">{t("manuals.dropzone")}</span>
            <span className="text-xs text-slate-500">{t("manuals.dropzoneHint")}</span>
          </>
        )}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf,.pdf"
        className="hidden"
        onChange={(e) => accept(e.target.files?.[0])}
      />
    </div>
  );
}
