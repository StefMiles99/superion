import { useTranslation } from "@superion/i18n";
import { Button, Spinner } from "@superion/ui";
import { useState } from "react";
import { DesktopShell } from "@/components/DesktopShell";
import { ManualsTable } from "@/components/ManualsTable";
import { UploadDialog } from "@/components/UploadDialog";
import { useManuals } from "@/hooks/useManuals";

export default function ManualsPage() {
  const { t } = useTranslation();
  const { data, isLoading, isError } = useManuals();
  const [showUpload, setShowUpload] = useState(false);

  return (
    <DesktopShell>
      <div className="mb-8 flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">{t("manuals.title")}</h1>
          <p className="mt-1 text-slate-400">{t("manuals.subtitle")}</p>
        </div>
        <Button fullWidth={false} onClick={() => setShowUpload(true)}>
          + {t("manuals.upload")}
        </Button>
      </div>

      {isLoading && (
        <div className="mt-20 flex justify-center">
          <Spinner />
        </div>
      )}
      {isError && <p className="mt-10 text-center text-rose-400">{t("manuals.error")}</p>}

      {data && data.items.length === 0 && (
        <div className="mt-20 rounded-2xl border border-dashed border-slate-800 py-16 text-center text-slate-500">
          {t("manuals.empty")}
        </div>
      )}

      {data && data.items.length > 0 && <ManualsTable manuals={data.items} />}

      {showUpload && <UploadDialog onClose={() => setShowUpload(false)} />}
    </DesktopShell>
  );
}
