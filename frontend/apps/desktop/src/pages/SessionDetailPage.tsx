import { eventsToTranscript } from "@superion/domain";
import { useTranslation } from "@superion/i18n";
import { Button, ConversationLog, ReportContent, Spinner } from "@superion/ui";
import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { DesktopShell } from "@/components/DesktopShell";
import { useReport, useSessionTranscript } from "@/hooks/useSessions";
import { useServices } from "@/services/context";

export default function SessionDetailPage() {
  const { t } = useTranslation();
  const { id = "" } = useParams();
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
    title: t("sessions.fullTranscript"),
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

  return (
    <DesktopShell>
      <Link to="/sessions" className="mb-6 inline-block text-sm text-slate-400 hover:text-slate-200">
        ← {t("sessions.backToList")}
      </Link>

      {isLoading && (
        <div className="flex justify-center py-16">
          <Spinner />
        </div>
      )}

      {isError && <p className="text-rose-400">{t("report.loadError")}</p>}

      {report && (
        <div className="grid gap-8 lg:grid-cols-2">
          <div>
            <div className="mb-6 flex items-center justify-between gap-4">
              <h1 className="text-2xl font-bold text-white">{t("sessions.detailTitle")}</h1>
              {report.status === "finalized" && (
                <Button onClick={() => void download()} disabled={downloading}>
                  {downloading ? t("report.downloading") : t("report.download")}
                </Button>
              )}
            </div>
            <ReportContent
              report={{
                header: report.content.header,
                summary: report.content.summary,
                procedure: report.content.procedure,
                findings: report.content.findings,
              }}
              labels={reportLabels}
            />
          </div>
          <ConversationLog
            entries={transcript.map((e) => ({
              id: e.id,
              speaker: e.speaker,
              text: e.text,
              kind: e.kind,
            }))}
            labels={transcriptLabels}
            full
          />
        </div>
      )}
    </DesktopShell>
  );
}
