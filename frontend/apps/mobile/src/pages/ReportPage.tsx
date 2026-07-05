import { useTranslation } from "@superion/i18n";
import { Button, Screen } from "@superion/ui";
import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useServices } from "@/services/context";

export default function ReportPage() {
  const { t } = useTranslation();
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const { api } = useServices();
  const [downloading, setDownloading] = useState(false);

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
    <Screen className="items-center justify-center text-center">
      <div className="mb-8 flex h-24 w-24 items-center justify-center rounded-full bg-emerald-500/20">
        <svg className="h-12 w-12 text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
      <h1 className="text-3xl font-bold text-white">{t("report.title")}</h1>
      <p className="mt-2 text-slate-400">{t("report.subtitle")}</p>

      <div className="mt-10 flex w-full flex-col gap-3">
        <Button onClick={() => void download()} disabled={downloading}>
          {downloading ? t("report.downloading") : t("report.download")}
        </Button>
        <Button variant="ghost" onClick={() => navigate("/work-orders", { replace: true })}>
          {t("report.backToOrders")}
        </Button>
      </div>
    </Screen>
  );
}
