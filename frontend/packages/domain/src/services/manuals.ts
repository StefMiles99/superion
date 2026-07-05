import { MAX_MANUAL_BYTES } from "../manuals";
import { err, ok, type Result } from "../result";

export type ManualFileError = "not_pdf" | "too_large" | "empty";

export interface ManualFileInfo {
  type: string;
  size: number;
  name?: string;
}

/** Valida (puro) que el archivo sea un PDF dentro del límite de tamaño. */
export function validateManualFile(file: ManualFileInfo): Result<true, ManualFileError> {
  if (file.size <= 0) return err("empty");
  const isPdf = file.type.includes("pdf") || (file.name?.toLowerCase().endsWith(".pdf") ?? false);
  if (!isPdf) return err("not_pdf");
  if (file.size > MAX_MANUAL_BYTES) return err("too_large");
  return ok(true);
}

export function isIndexingInProgress(indexStatus: string): boolean {
  return indexStatus === "pending";
}
