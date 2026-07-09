import { eventsToTranscript } from "@superion/domain";
import { useTranslation } from "@superion/i18n";
import { Button, ConversationLog, ReportContent, Screen, Spinner } from "@superion/ui";
import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useReport, useSessionTranscript } from "@/hooks/useReport";
import { useServices } from "@/services/context";

export default function ReportPage() {
  const { t } = useTranslation();
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const { api } = useServices();
  const { data: report, isLoading, isError } = useReport(id);
  const { data: events } = useSessionTranscript(id);
  const [downloading, setDownloading] = useState(false);

  const transcript = useMemo(
    () => (events ? eventsToTranscript(events) : []),
    [events],
  );

  const reportLabels = {
    summary: t("report.summary"),
    procedure: t("report.procedure"),
    findings: t("report.findings"),
    step: t("report.step"),
    observations: t("report.observations"),
    noFindings: t("report.noFindings"),
    statusDone: t("report.statusDone"),
    statusPending: t("report.statusPending"),
    statusSkipped: t("report.statusSkipped"),
  };

  const transcriptLabels = {
    title: t("session.transcript.title"),
    technician: t("session.transcript.technician"),
    agent: t("session.transcript.agent"),
    observation: t("session.transcript.observation"),
    empty: t("report.noTranscript"),
  };

  const download = async () => {
    setDownloading(true);
    try {
      const blob = await api.reportPdf(id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `reporte-${id}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setDownloading(false);
    }
  };

  if (isLoading) {
    return (
      <Screen className="items-center justify-center">
        <Spinner />
      </Screen>
    );
  }

  if (isError || !report) {
    return (
      <Screen className="items-center justify-center text-center">
        <p className="text-rose-400">{t("report.loadError")}</p>
        <Button className="mt-4" variant="ghost" onClick={() => navigate("/work-orders")}>
          {t("report.backToOrders")}
        </Button>
      </Screen>
    );
  }

  return (
    <Screen className="pt-6 pb-8">
      <div className="mb-6 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/20">
          <svg className="h-8 w-8 text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-white">{t("report.title")}</h1>
        <p className="mt-1 text-slate-400">{t("report.subtitle")}</p>
      </div>

      <ReportContent
        report={{
          header: report.content.header,
          summary: report.content.summary,
          procedure: report.content.procedure,
          findings: report.content.findings,
        }}
        labels={reportLabels}
        className="mb-6"
      />
      <ConversationLog
        entries={transcript.map((e) => ({
          id: e.id,
          speaker: e.speaker,
          text: e.text,
          kind: e.kind,
        }))}
        labels={transcriptLabels}
        full
        className="mb-8"
      />

      <div className="flex flex-col gap-3">
        <Button onClick={() => void download()} disabled={downloading || report.status !== "finalized"}>
          {downloading ? t("report.downloading") : t("report.download")}
        </Button>
        <Button variant="ghost" onClick={() => navigate("/work-orders", { replace: true })}>
          {t("report.backToOrders")}
        </Button>
      </div>
    </Screen>
  );
}
