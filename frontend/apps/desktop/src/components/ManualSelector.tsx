import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';

import type { Manual } from '@superion/domain';
import { Input, cn } from '@superion/ui';

interface ManualSelectorProps {
  manuals: Manual[];
  value: string;
  onChange: (manualId: string) => void;
  error?: string;
}

export function ManualSelector({ manuals, value, onChange, error }: ManualSelectorProps) {
  const { t } = useTranslation();
  const [search, setSearch] = useState('');

  const activeManuals = useMemo(
    () => manuals.filter((manual) => manual.status !== 'archived'),
    [manuals],
  );

  const filteredManuals = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) {
      return activeManuals;
    }
    return activeManuals.filter(
      (manual) =>
        manual.title.toLowerCase().includes(query) ||
        manual.assetModel.toLowerCase().includes(query),
    );
  }, [activeManuals, search]);

  if (activeManuals.length === 0) {
    return (
      <div className="rounded-md border border-dashed border-[hsl(217_33%_22%)] p-4 text-sm">
        <p className="mb-2 text-[hsl(215_20%_65%)]">{t('procedures.manualSelector.empty')}</p>
        <Link
          to="/manuals/upload"
          className={cn(
            'inline-flex min-h-12 items-center justify-center rounded-md px-4 py-2 text-sm font-medium',
            'bg-[hsl(217_33%_17%)] text-[hsl(210_40%_98%)] hover:bg-[hsl(217_33%_22%)]',
          )}
        >
          {t('procedures.manualSelector.uploadCta')}
        </Link>
      </div>
    );
  }

  return (
    <div>
      <label className="mb-1 block text-xs text-[hsl(215_20%_65%)]" htmlFor="manualId">
        {t('procedures.fields.manual')}
      </label>
      <Input
        id="manual-search"
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        placeholder={t('procedures.manualSelector.searchPlaceholder')}
        className="mb-2"
      />
      <select
        id="manualId"
        name="manualId"
        aria-label={t('procedures.fields.manual')}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-md border border-[hsl(217_33%_22%)] bg-[hsl(222_47%_6%)] px-3 py-2 text-sm"
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? 'manualId-error' : undefined}
      >
        <option value="">{t('procedures.manualSelector.placeholder')}</option>
        {filteredManuals.map((manual) => (
          <option key={manual.id} value={manual.id}>
            {manual.title}
          </option>
        ))}
      </select>
      {error ? (
        <p id="manualId-error" className="mt-1 text-xs text-[hsl(0_84%_60%)]">
          {error}
        </p>
      ) : null}
    </div>
  );
}
