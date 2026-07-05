import type { ManualFileError } from "@superion/domain";
import { useTranslation } from "@superion/i18n";
import { Button } from "@superion/ui";
import { useState } from "react";
import { useUploadManual } from "@/hooks/useManuals";
import { Dropzone } from "./Dropzone";

export function UploadDialog({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation();
  const upload = useUploadManual();
  const [title, setTitle] = useState("");
  const [assetModel, setAssetModel] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<ManualFileError | null>(null);

  const canSubmit = title.trim() && assetModel.trim() && file && !upload.isPending;

  const submit = () => {
    if (!file) return;
    upload.mutate(
      { file, title: title.trim(), assetModel: assetModel.trim() },
      { onSuccess: onClose },
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-lg rounded-3xl bg-slate-900 p-6 ring-1 ring-slate-800">
        <h2 className="text-xl font-bold text-white">{t("manuals.uploadTitle")}</h2>

        <div className="mt-5 flex flex-col gap-4">
          <label className="flex flex-col gap-1 text-sm text-slate-400">
            {t("manuals.fieldTitle")}
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t("manuals.fieldTitlePlaceholder")}
              className="rounded-xl bg-slate-950 px-4 py-3 text-white ring-1 ring-slate-800 outline-none focus:ring-sky-500"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm text-slate-400">
            {t("manuals.fieldModel")}
            <input
              value={assetModel}
              onChange={(e) => setAssetModel(e.target.value)}
              placeholder={t("manuals.fieldModelPlaceholder")}
              className="rounded-xl bg-slate-950 px-4 py-3 text-white ring-1 ring-slate-800 outline-none focus:ring-sky-500"
            />
          </label>

          <div>
            <span className="mb-1 block text-sm text-slate-400">{t("manuals.fieldFile")}</span>
            <Dropzone file={file} onFile={setFile} onError={setFileError} />
            {fileError && (
              <p className="mt-2 text-sm text-rose-400">{t(`manuals.validation.${fileError}`)}</p>
            )}
          </div>

          {upload.isError && <p className="text-sm text-rose-400">{t("manuals.uploadError")}</p>}
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <Button variant="ghost" fullWidth={false} onClick={onClose}>
            {t("manuals.cancel")}
          </Button>
          <Button fullWidth={false} disabled={!canSubmit} onClick={submit}>
            {upload.isPending ? t("manuals.uploading") : t("manuals.submit")}
          </Button>
        </div>
      </div>
    </div>
  );
}
