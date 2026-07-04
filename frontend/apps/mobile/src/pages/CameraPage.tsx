import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router';

import { getCurrentStep } from '@superion/domain';
import { AppShell, Button } from '@superion/ui';

import { PhotoPreview } from '../components/PhotoPreview';
import { PhotoValidationOverlay } from '../components/PhotoValidationOverlay';
import { usePhotoQueue } from '../hooks/usePhotoQueue';
import { useSession, useSessionProcedure } from '../hooks/useSession';
import { useSessionStream } from '../hooks/useSessionStream';
import { useUploadPhoto } from '../hooks/useUploadPhoto';

export default function CameraPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id: sessionId } = useParams<{ id: string }>();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const { data: session } = useSession(sessionId);
  const { data: procedure } = useSessionProcedure(sessionId);
  useSessionStream(sessionId);
  const { uploadPhoto, validationState, resetValidation } = useUploadPhoto(sessionId);
  const { isSyncing } = usePhotoQueue();

  const currentStep =
    session && procedure ? getCurrentStep(procedure, session.currentStepIndex) : undefined;

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  useEffect(() => {
    if (validationState.status === 'accepted') {
      const timer = window.setTimeout(() => {
        navigate(`/sessions/${sessionId ?? ''}`);
      }, 800);
      return () => {
        window.clearTimeout(timer);
      };
    }
    return undefined;
  }, [navigate, sessionId, validationState.status]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }

    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    resetValidation();
  };

  const handleRetake = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setSelectedFile(null);
    setPreviewUrl(null);
    resetValidation();
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSend = () => {
    if (!selectedFile || !session || !currentStep) {
      return;
    }

    uploadPhoto.mutate({
      file: selectedFile,
      stepIndex: session.currentStepIndex,
      ...(currentStep.photoCriteria ? { criteria: currentStep.photoCriteria } : {}),
      fileName: selectedFile.name,
      mimeType: selectedFile.type,
    });
  };

  const openCamera = () => {
    fileInputRef.current?.click();
  };

  return (
    <AppShell
      title={t('photo.cameraTitle')}
      backLabel={t('photo.backToSession')}
      onBack={() => navigate(`/sessions/${sessionId ?? ''}`)}
    >
      <div className="relative flex min-h-[calc(100vh-4rem)] flex-col p-4">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="sr-only"
          data-testid="mock-camera"
          onChange={handleFileChange}
        />

        {currentStep?.photoCriteria ? (
          <p className="mb-4 rounded-lg border border-[hsl(217_33%_17%)] bg-[hsl(222_47%_8%)] p-4 text-base leading-relaxed text-[hsl(215_20%_80%)]">
            {currentStep.photoCriteria}
          </p>
        ) : null}

        {previewUrl && selectedFile ? (
          <PhotoPreview
            previewUrl={previewUrl}
            onRetake={handleRetake}
            onSend={handleSend}
            isSending={uploadPhoto.isPending || validationState.status === 'validating'}
            showActions={
              validationState.status === 'idle' ||
              validationState.status === 'queued' ||
              validationState.status === 'accepted'
            }
          />
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center gap-4">
            <p className="text-center text-base text-[hsl(215_20%_75%)]">{t('photo.captureHint')}</p>
            <Button type="button" className="min-h-14 w-full max-w-sm text-base" onClick={openCamera}>
              {t('photo.openCamera')}
            </Button>
          </div>
        )}

        <PhotoValidationOverlay
          status={validationState.status}
          feedback={validationState.feedback}
          retries={validationState.retries}
          maxRetries={validationState.maxRetries}
          onRetake={handleRetake}
        />

        {isSyncing ? (
          <p className="mt-4 text-center text-sm text-[hsl(45_93%_58%)]">{t('photo.syncing')}</p>
        ) : null}
      </div>
    </AppShell>
  );
}
