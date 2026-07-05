import type { ReportPhoto } from '@superion/domain';
import { useTranslation } from 'react-i18next';

import { Card } from '@superion/ui';

interface ReportPhotoGalleryProps {
  photos: ReportPhoto[];
}

export function ReportPhotoGallery({ photos }: ReportPhotoGalleryProps) {
  const { t } = useTranslation();

  if (photos.length === 0) {
    return null;
  }

  return (
    <Card className="space-y-3" data-testid="report-photo-gallery">
      <h2 className="text-base font-semibold text-[hsl(210_40%_98%)]">
        {t('report.photosHeading')}
      </h2>
      <ul
        className="grid grid-cols-3 gap-3 sm:grid-cols-4"
        aria-label={t('report.photosHeading')}
      >
        {photos.map((photo, index) => (
          <li key={`${photo.path}-${String(index)}`} className="space-y-1">
            {photo.thumbnailUrl ? (
              <img
                src={photo.thumbnailUrl}
                alt={photo.caption || t('photo.thumbnailAlt')}
                className="aspect-square w-full rounded-lg border border-[hsl(217_33%_17%)] object-cover"
                loading="lazy"
              />
            ) : (
              <div className="flex aspect-square w-full items-center justify-center rounded-lg border border-dashed border-[hsl(217_33%_17%)] bg-[hsl(222_47%_8%)] text-xs text-[hsl(215_20%_65%)]">
                {t('photo.pendingThumb')}
              </div>
            )}
            {photo.caption ? (
              <p className="truncate text-xs text-[hsl(215_20%_65%)]">{photo.caption}</p>
            ) : null}
          </li>
        ))}
      </ul>
    </Card>
  );
}
