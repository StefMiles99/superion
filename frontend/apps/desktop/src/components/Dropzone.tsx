import { useCallback } from 'react';
import { useDropzone, type FileRejection } from 'react-dropzone';
import { useTranslation } from 'react-i18next';

import { cn } from '@superion/ui';

const MAX_SIZE_BYTES = 50 * 1024 * 1024;

interface DropzoneProps {
  onFileSelected: (file: File) => void;
  disabled?: boolean;
  className?: string;
}

export function Dropzone({ onFileSelected, disabled = false, className }: DropzoneProps) {
  const { t } = useTranslation();

  const onDrop = useCallback(
    (acceptedFiles: File[], rejectedFiles: readonly FileRejection[]) => {
      if (rejectedFiles.length > 0) {
        return;
      }

      const file = acceptedFiles[0];
      if (file) {
        onFileSelected(file);
      }
    },
    [onFileSelected],
  );

  const { getRootProps, getInputProps, isDragActive, fileRejections, open } = useDropzone({
    onDrop,
    accept: { 'application/pdf': ['.pdf'] },
    maxSize: MAX_SIZE_BYTES,
    multiple: false,
    disabled,
    noClick: true,
    noKeyboard: true,
  });

  const rejectionMessage =
    fileRejections[0]?.errors[0]?.code === 'file-too-large'
      ? t('manuals.upload.fileTooLarge')
      : fileRejections[0]?.errors[0]?.code === 'file-invalid-type'
        ? t('manuals.upload.invalidType')
        : null;

  return (
    <div className={className}>
      <div
        {...getRootProps()}
        data-testid="dropzone"
        className={cn(
          'flex min-h-40 cursor-pointer flex-col items-center justify-center rounded-md border-2 border-dashed px-4 py-8 text-center transition-colors',
          isDragActive
            ? 'border-[hsl(217_91%_60%)] bg-[hsl(217_33%_12%)]'
            : 'border-[hsl(217_33%_22%)] bg-[hsl(222_47%_6%)]',
          disabled && 'pointer-events-none opacity-50',
        )}
        onClick={() => {
          if (!disabled) {
            open();
          }
        }}
      >
        <input {...getInputProps()} data-testid="dropzone-input" />
        <p className="mb-2 text-sm text-[hsl(210_40%_98%)]">{t('manuals.upload.dropHint')}</p>
        <p className="text-xs text-[hsl(215_20%_65%)]">{t('manuals.upload.dropSubhint')}</p>
      </div>

      {rejectionMessage ? (
        <p className="mt-2 text-sm text-[hsl(0_84%_60%)]" role="alert">
          {rejectionMessage}
        </p>
      ) : null}
    </div>
  );
}
