import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';

import { useAuth, useLogout } from '@superion/auth';
import { AppShell, Button, Input, Label, ToastContainer, showToast } from '@superion/ui';

import { Dropzone } from '../components/Dropzone';
import { UploadProgress } from '../components/UploadProgress';
import { useUploadManual } from '../hooks/useUploadManual';

export default function ManualUploadPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const logout = useLogout();
  const { uploadManual, phase, manualId, errorMessage, reset } = useUploadManual();

  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [assetModel, setAssetModel] = useState('');

  const handleLogout = async () => {
    await logout.mutateAsync();
    navigate('/login', { replace: true });
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!file) {
      showToast(t('manuals.upload.fileRequired'));
      return;
    }

    if (!title.trim() || !assetModel.trim()) {
      showToast(t('manuals.upload.fieldsRequired'));
      return;
    }

    await uploadManual.mutateAsync({
      file,
      title: title.trim(),
      assetModel: assetModel.trim(),
    });
  };

  const handleGoToManual = () => {
    if (manualId) {
      navigate(`/manuals/${manualId}`);
    }
  };

  return (
    <>
      <AppShell
        title={t('manuals.upload.title')}
        {...(user?.fullName ? { userName: user.fullName } : {})}
        logoutLabel={t('auth.logout')}
        onLogout={handleLogout}
        backLabel={t('manuals.upload.back')}
        onBack={() => navigate('/manuals')}
      >
        <div className="mx-auto max-w-xl p-4" data-testid="manual-upload-page">
          <form onSubmit={(event) => void handleSubmit(event)} className="space-y-4">
            <Dropzone
              onFileSelected={(selected) => {
                setFile(selected);
                reset();
              }}
              disabled={uploadManual.isPending || phase === 'indexing'}
            />

            {file ? (
              <p className="text-sm text-[hsl(215_20%_65%)]">
                {t('manuals.upload.selectedFile', { name: file.name })}
              </p>
            ) : null}

            <div>
              <Label htmlFor="manual-title">{t('manuals.upload.titleLabel')}</Label>
              <Input
                id="manual-title"
                name="title"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                required
              />
            </div>

            <div>
              <Label htmlFor="manual-asset-model">{t('manuals.upload.modelLabel')}</Label>
              <Input
                id="manual-asset-model"
                name="assetModel"
                value={assetModel}
                onChange={(event) => setAssetModel(event.target.value)}
                required
              />
            </div>

            <UploadProgress phase={phase} errorMessage={errorMessage} />

            <div className="flex gap-2">
              {phase === 'indexed' && manualId ? (
                <Button type="button" onClick={handleGoToManual}>
                  {t('manuals.upload.viewManual')}
                </Button>
              ) : (
                <Button
                  type="submit"
                  disabled={uploadManual.isPending || phase === 'indexing' || phase === 'indexed'}
                >
                  {t('manuals.upload.submit')}
                </Button>
              )}
              <Button type="button" variant="ghost" onClick={() => navigate('/manuals')}>
                {t('manuals.upload.cancel')}
              </Button>
            </div>
          </form>
        </div>
      </AppShell>
      <ToastContainer />
    </>
  );
}
