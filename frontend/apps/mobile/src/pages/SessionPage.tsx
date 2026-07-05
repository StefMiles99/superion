import { useTranslation } from "@superion/i18n";
import { Button, Screen, Spinner, cn } from "@superion/ui";
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { AnalysisEdge } from "@/components/AnalysisEdge";
import { AssistantHint } from "@/components/AssistantHint";
import { CameraCapture } from "@/components/CameraCapture";
import { ConversationTranscript } from "@/components/ConversationTranscript";
import { MicButton } from "@/components/MicButton";
import { StepBanner } from "@/components/StepBanner";
import { useSessionControls } from "@/hooks/useSession";
import { useSessionEvents } from "@/hooks/useSessionEvents";
import { useUploadPhoto } from "@/hooks/useUploadPhoto";
import { useVoiceAgent } from "@/hooks/useVoiceAgent";
import { readTemplate } from "@/hooks/useWorkOrders";
import { useSessionStore } from "@/stores/session";

export default function SessionPage() {
  const { t } = useTranslation();
  const { id = "" } = useParams();
  const navigate = useNavigate();

  const template = useMemo(() => readTemplate(id), [id]);
  const setSteps = useSessionStore((s) => s.setSteps);
  const reset = useSessionStore((s) => s.reset);

  const steps = useSessionStore((s) => s.steps);
  const currentIndex = useSessionStore((s) => s.currentStepIndex);
  const status = useSessionStore((s) => s.status);
  const analysis = useSessionStore((s) => s.analysis);
  const lastAnswer = useSessionStore((s) => s.lastAnswer);
  const transcript = useSessionStore((s) => s.transcript);

  const [showCamera, setShowCamera] = useState(false);

  useSessionEvents(id);
  const voice = useVoiceAgent(id);
  const upload = useUploadPhoto(id);
  const controls = useSessionControls(id);

  useEffect(() => {
    if (template) setSteps(template.steps);
    return () => reset();
  }, [template, setSteps, reset]);

  useEffect(() => {
    if (status === "finalized") navigate(`/report/${id}`, { replace: true });
  }, [status, id, navigate]);

  const currentStep = steps[currentIndex];

  if (steps.length === 0) {
    return (
      <Screen className="items-center justify-center">
        <Spinner />
        <p className="mt-4 text-slate-400">{t("session.connecting")}</p>
      </Screen>
    );
  }

  const onCapture = (blob: Blob) => {
    setShowCamera(false);
    upload.mutate({
      file: blob,
      stepIndex: currentIndex,
      criteria: currentStep?.photo_criteria ?? undefined,
    });
  };

  return (
    <Screen className="pt-6">
      <StepBanner step={currentStep} currentIndex={currentIndex} total={steps.length} />

      <div className="mt-4">
        <AssistantHint answer={lastAnswer} />
        <ConversationTranscript entries={transcript} />
      </div>

      <div className="flex flex-1 items-center justify-center py-6">
        <MicButton state={voice.state} onToggle={() => void voice.toggle()} />
      </div>

      <div className="flex flex-col gap-3 pb-6">
        {currentStep?.requires_photo && (
          <Button variant="surface" onClick={() => setShowCamera(true)}>
            {t("session.takePhoto")}
          </Button>
        )}

        <div className="flex gap-3">
          {status === "paused" ? (
            <Button variant="ghost" onClick={() => controls.resume.mutate()}>
              {t("session.resume")}
            </Button>
          ) : (
            <Button variant="ghost" onClick={() => controls.pause.mutate()}>
              {t("session.pause")}
            </Button>
          )}
          <Button
            variant="danger"
            onClick={() => controls.finalize.mutate()}
            disabled={controls.finalize.isPending}
          >
            {controls.finalize.isPending ? t("session.finalizing") : t("session.finalize")}
          </Button>
        </div>
      </div>

      <AnalysisEdge analysis={analysis} />

      {status === "paused" && (
        <div className={cn("fixed inset-0 z-30 flex items-center justify-center bg-slate-950/70")}>
          <span className="rounded-full bg-slate-800 px-6 py-3 text-lg font-semibold text-slate-100">
            {t("session.paused")}
          </span>
        </div>
      )}

      {showCamera && (
        <CameraCapture
          criteria={currentStep?.photo_criteria}
          onCapture={onCapture}
          onClose={() => setShowCamera(false)}
        />
      )}
    </Screen>
  );
}
