import type { BulkRow } from '../types';
import { detectPlatform } from '../lib/platform';
import { MediaCard } from './MediaCard';
import { MediaCardSkeleton } from './MediaCardSkeleton';
import { ErrorAlert } from './ErrorAlert';
import { PlatformBadge } from './PlatformBadge';
import { useI18n, format } from '../lib/i18n';

interface Props {
  row: BulkRow;
  index: number;
}

export function BulkResultRow({ row, index }: Props) {
  const { t } = useI18n();
  const detected = detectPlatform(row.url);
  const resolved = row.status === 'ok' ? row.response : null;
  const platform = resolved?.platform ?? detected ?? null;
  const kind = resolved?.kind;

  return (
    <section className="space-y-3 rounded-2xl border border-border-subtle bg-bg-raised/30 p-3 sm:p-4">
      <header className="flex flex-wrap items-center gap-2 sm:gap-3">
        <span className="text-xs font-semibold text-fg-muted">#{index + 1}</span>
        {platform && <PlatformBadge platform={platform} kind={kind} />}
        <span
          className="text-xs text-fg-muted font-mono truncate flex-1 min-w-0"
          title={row.url}
        >
          {row.url}
        </span>
        <StatusPill status={row.status} count={resolved?.mediaItems.length ?? 0} />
      </header>

      {row.status === 'pending' && (
        <p className="text-xs text-fg-muted">{t.result.loading}</p>
      )}

      {row.status === 'loading' && (
        <div
          className="grid gap-4 grid-cols-1 sm:grid-cols-[repeat(auto-fit,minmax(220px,1fr))]"
          aria-live="polite"
          aria-busy="true"
        >
          <span className="sr-only">{t.result.loading}</span>
          <MediaCardSkeleton index={0} />
          <MediaCardSkeleton index={1} />
        </div>
      )}

      {row.status === 'error' && (
        <ErrorAlert message={row.message} code={row.code} requestId={row.requestId} />
      )}

      {row.status === 'ok' && resolved && resolved.mediaItems.length > 0 && (
        <>
          {resolved.degraded && (
            <div className="rounded-lg bg-warning/10 border border-warning/30 px-3 py-2">
              <p className="text-xs text-warning">{format(t.result.found, { n: resolved.mediaItems.length })} · {t.result.degraded}</p>
            </div>
          )}
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-[repeat(auto-fit,minmax(220px,1fr))]">
            {resolved.mediaItems.map((item, i) => (
              <MediaCard
                key={`${item.url}-${i}`}
                item={item}
                platform={resolved.platform}
                kind={resolved.kind}
                index={i}
              />
            ))}
          </div>
        </>
      )}

      {row.status === 'ok' && resolved && resolved.mediaItems.length === 0 && (
        <ErrorAlert message={t.result.noMedia} code="NO_MEDIA" />
      )}
    </section>
  );
}

function StatusPill({ status, count }: { status: BulkRow['status']; count: number }) {
  const { t } = useI18n();
  const map: Record<BulkRow['status'], { label: string; cls: string }> = {
    pending: { label: '•', cls: 'border-border-subtle bg-bg-raised/40 text-fg-muted' },
    loading: { label: '…', cls: 'border-accent/30 bg-accent/10 text-accent' },
    ok: { label: format(t.result.found, { n: count }), cls: 'border-success/30 bg-success/10 text-emerald-800 dark:text-emerald-300' },
    error: { label: '!', cls: 'border-danger/30 bg-danger/10 text-danger' },
  };
  const { label, cls } = map[status];
  return (
    <span className={`ml-auto inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${cls}`}>
      {label}
    </span>
  );
}
