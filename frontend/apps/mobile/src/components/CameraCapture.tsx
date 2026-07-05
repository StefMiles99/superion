import { useTranslation } from "@superion/i18n";
import { useEffect, useRef, useState } from "react";

interface CameraCaptureProps {
  criteria?: string | null;
  onCapture: (blob: Blob) => void;
  onClose: () => void;
}

/** Cámara embebida (getUserMedia). Nunca sube desde archivo ni abre apps externas. */
export function CameraCapture({ criteria, onCapture, onClose }: CameraCaptureProps) {
  const { t } = useTranslation();
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function open() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((tr) => tr.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => undefined);
        }
      } catch {
        setError(t("camera.error"));
      }
    }
    void open();
    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((tr) => tr.stop());
    };
  }, [t]);

  const capture = () => {
    const video = videoRef.current;
    if (!video) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth || 1080;
    canvas.height = video.videoHeight || 1440;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob(
      (blob) => {
        if (blob) onCapture(blob);
      },
      "image/jpeg",
      0.9,
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black">
      <div className="flex items-center justify-between p-4 text-white">
        <span className="text-lg font-semibold">{t("camera.title")}</span>
        <button type="button" onClick={onClose} className="rounded-full bg-white/20 px-4 py-2">
          {t("common.close")}
        </button>
      </div>

      <div className="relative flex-1">
        <video ref={videoRef} playsInline muted className="h-full w-full object-cover" />
        {error && (
          <div className="absolute inset-0 flex items-center justify-center p-6 text-center text-white">
            {error}
          </div>
        )}
        {criteria && !error && (
          <div className="absolute inset-x-0 top-4 mx-auto w-fit rounded-full bg-black/60 px-4 py-2 text-sm text-white">
            {t("camera.criteria")}: {criteria}
          </div>
        )}
        <div className="pointer-events-none absolute inset-8 rounded-3xl border-2 border-white/40" />
      </div>

      <div className="flex justify-center p-8">
        <button
          type="button"
          aria-label={t("camera.capture")}
          onClick={capture}
          disabled={Boolean(error)}
          className="h-20 w-20 rounded-full border-4 border-white bg-white/90 active:scale-95 disabled:opacity-40"
        />
      </div>
    </div>
  );
}
