import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router';

import { useAuth, useLogout } from '@superion/auth';
import type { ManualSearchChunk } from '@superion/domain';
import { AppShell, Input, Label, Skeleton } from '@superion/ui';

import { IndexStatusBadge } from '../components/IndexStatusBadge';
import { PdfViewer } from '../components/PdfViewer';
import { useManual } from '../hooks/useManuals';
import { useManualSearch } from '../hooks/useManualSearch';

function highlightTerm(content: string, term: string) {
  if (!term.trim()) {
    return content;
  }

  const regex = new RegExp(`(${escapeRegExp(term)})`, 'gi');
  const parts = content.split(regex);

  return parts.map((part, index) =>
    part.toLowerCase() === term.toLowerCase() ? (
      <mark key={index} className="rounded bg-[hsl(45_93%_47%_/0.35)] px-0.5">
        {part}
      </mark>
    ) : (
      part
    ),
  );
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function SearchResultItem({ chunk, term }: { chunk: ManualSearchChunk; term: string }) {
  return (
    <li
      className="rounded-md border border-[hsl(217_33%_22%)] bg-[hsl(222_47%_6%)] p-3 text-sm"
      data-testid="search-result"
    >
      <p className="mb-1 text-xs text-[hsl(215_20%_65%)]">
        {chunk.sectionPath} · p.{chunk.page}
      </p>
      <p>{highlightTerm(chunk.content, term)}</p>
    </li>
  );
}

export default function ManualDetailPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams();
  const { user } = useAuth();
  const logout = useLogout();
  const [searchQuery, setSearchQuery] = useState('');

  const manualQuery = useManual(id);
  const searchQueryResult = useManualSearch(id, searchQuery);

  const handleLogout = async () => {
    await logout.mutateAsync();
    navigate('/login', { replace: true });
  };

  const manual = manualQuery.data;

  return (
    <AppShell
      title={manual?.title ?? t('manuals.detail.title')}
      {...(user?.fullName ? { userName: user.fullName } : {})}
      logoutLabel={t('auth.logout')}
      onLogout={handleLogout}
      backLabel={t('manuals.detail.back')}
      onBack={() => navigate('/manuals')}
    >
      <div className="p-4" data-testid="manual-detail-page">
        {manualQuery.isLoading ? <Skeleton className="mb-4 h-8 w-64" /> : null}

        {manualQuery.isError ? (
          <p className="text-sm text-[hsl(0_84%_60%)]">{t('manuals.detail.errorLoading')}</p>
        ) : null}

        {manual ? (
          <>
            <div className="mb-4 flex flex-wrap items-center gap-3">
              <p className="text-sm text-[hsl(215_20%_65%)]">{manual.assetModel}</p>
              <IndexStatusBadge indexStatus={manual.indexStatus} status={manual.status} />
              <span className="text-sm text-[hsl(215_20%_65%)]">
                {t('manuals.detail.chunks', { count: manual.chunkCount })}
              </span>
            </div>

            <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
              <PdfViewer url={manual.downloadUrl} title={manual.title} />

              <aside>
                <Label htmlFor="manual-search">{t('manuals.detail.searchLabel')}</Label>
                <Input
                  id="manual-search"
                  name="search"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder={t('manuals.detail.searchPlaceholder')}
                  className="mb-3"
                />

                <div aria-live="polite">
                  {searchQueryResult.isFetching ? (
                    <p className="text-sm text-[hsl(215_20%_65%)]">{t('common.loading')}</p>
                  ) : null}

                  {!searchQueryResult.isFetching && searchQuery.trim() ? (
                    searchQueryResult.data?.items.length ? (
                      <ul className="space-y-2">
                        {searchQueryResult.data.items.map((chunk) => (
                          <SearchResultItem
                            key={chunk.chunkId}
                            chunk={chunk}
                            term={searchQuery.trim()}
                          />
                        ))}
                      </ul>
                    ) : (
                      <p className="text-sm text-[hsl(215_20%_65%)]">
                        {t('manuals.detail.searchEmpty')}
                      </p>
                    )
                  ) : (
                    <p className="text-sm text-[hsl(215_20%_65%)]">
                      {t('manuals.detail.searchHint')}
                    </p>
                  )}
                </div>
              </aside>
            </div>
          </>
        ) : null}
      </div>
    </AppShell>
  );
}
