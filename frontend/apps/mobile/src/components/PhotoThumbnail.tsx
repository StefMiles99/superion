import { useTranslation } from 'react-i18next';

interface PhotoThumbnailProps {
  thumbnailUrl: string | null;
  isSyncing?: boolean;
}

export function PhotoThumbnail({ thumbnailUrl, isSyncing = false }: PhotoThumbnailProps) {
  const { t } = useTranslation();

  if (!thumbnailUrl && !isSyncing) {
    return null;
  }

  return (
    <div className="relative inline-flex" data-testid="photo-thumbnail">
      {thumbnailUrl ? (
        <img
          src={thumbnailUrl}
          alt={t('photo.thumbnailAlt')}
          className="h-16 w-16 rounded-lg border border-[hsl(217_33%_17%)] object-cover"
          loading="lazy"
        />
      ) : (
        <div className="flex h-16 w-16 items-center justify-center rounded-lg border border-dashed border-[hsl(217_33%_17%)] bg-[hsl(222_47%_8%)] text-xs text-[hsl(215_20%_65%)]">
          {t('photo.pendingThumb')}
        </div>
      )}
      {isSyncing ? (
        <span className="absolute -right-1 -top-1 rounded-full bg-[hsl(45_93%_58%)] px-2 py-0.5 text-[10px] font-semibold text-[hsl(222_47%_6%)]">
          {t('photo.syncingBadge')}
        </span>
      ) : null}
    </div>
  );
}
