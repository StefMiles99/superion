import { getApiClient } from '@superion/api-client';
import { useMutation } from '@tanstack/react-query';

function triggerBlobDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.style.display = 'none';
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

async function sharePdfFile(blob: Blob, filename: string): Promise<boolean> {
  if (!navigator.share || !navigator.canShare) {
    return false;
  }

  const file = new File([blob], filename, { type: 'application/pdf' });
  if (!navigator.canShare({ files: [file] })) {
    return false;
  }

  await navigator.share({
    files: [file],
    title: filename,
  });
  return true;
}

export function useDownloadPdf(sessionId: string | undefined, filename: string) {
  return useMutation({
    mutationFn: async () => {
      const api = getApiClient();
      const blob = await api.getReportPdf(sessionId!);
      return blob;
    },
    onSuccess: async (blob) => {
      const shared = await sharePdfFile(blob, filename).catch(() => false);
      if (!shared) {
        triggerBlobDownload(blob, filename);
      }
    },
  });
}

export { triggerBlobDownload, sharePdfFile };
