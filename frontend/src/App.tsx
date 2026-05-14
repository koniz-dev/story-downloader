import { useEffect, useState } from 'react';
import { PlatformSelector } from './components/PlatformSelector';
import { CollapsibleGuide } from './components/CollapsibleGuide';
import { UrlForm } from './components/UrlForm';
import { MediaCard } from './components/MediaCard';
import { MediaCardSkeleton } from './components/MediaCardSkeleton';
import { ResultsHeader } from './components/ResultsHeader';
import { ErrorAlert } from './components/ErrorAlert';
import { LanguageSelector } from './components/LanguageSelector';
import { ThemeToggle } from './components/ThemeToggle';
import { resolveMedia, ApiError } from './lib/api';
import { track } from './lib/track';
import { format, useI18n } from './lib/i18n';
import { useToast } from './lib/toast';
import { downloadMedia } from './lib/download';
import type { Platform, ResolveResponse } from './types';

const STORAGE_KEY = 'sd.platform';

export function App() {
  const { t } = useI18n();
  const toast = useToast();
  const [platform, setPlatform] = useState<Platform | null>(() => {
    const saved = typeof localStorage !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null;
    return saved === 'instagram' || saved === 'facebook' || saved === 'tiktok' ? saved : null;
  });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ResolveResponse | null>(null);
  const [error, setError] = useState<{ message: string; code?: string; requestId?: string } | null>(null);

  useEffect(() => {
    if (platform) localStorage.setItem(STORAGE_KEY, platform);
  }, [platform]);

  function handlePlatformChange(p: Platform) {
    setPlatform(p);
    setResult(null);
    setError(null);
    track({ event: 'platform.select', platform: p });
  }

  function handleDownloadAll() {
    if (!result || result.mediaItems.length === 0) return;
    const items = result.mediaItems;
    toast.show(format(t.toast.downloadingAll, { n: items.length }));
    // Stagger downloads so the browser surfaces a permission prompt for the
    // first one and then accepts the rest without re-prompting on most engines.
    items.forEach((item, i) => {
      window.setTimeout(() => downloadMedia(item, result.platform, result.kind), i * 250);
    });
  }

  async function handleSubmit(url: string) {
    if (!platform) return;
    setLoading(true);
    setError(null);
    setResult(null);
    const started = Date.now();
    track({ event: 'resolve.start', platform });
    try {
      const res = await resolveMedia(url);
      setResult(res);
      track({ event: 'resolve.ok', platform, kind: res.kind, items: res.mediaItems.length, ms: Date.now() - started });
      if (res.mediaItems.length === 0) {
        setError({ message: t.result.noMedia, code: 'NO_MEDIA' });
      }
    } catch (e) {
      const code = e instanceof ApiError ? e.code : undefined;
      const params = e instanceof ApiError ? e.params : undefined;
      const requestId = e instanceof ApiError ? e.requestId : undefined;
      const template = code && Object.prototype.hasOwnProperty.call(t.serverError, code)
        ? t.serverError[code as keyof typeof t.serverError]
        : null;
      const msg = template ? format(template, params ?? {}) : t.form.error.generic;
      setError({ message: msg, code, requestId });
      track({ event: 'resolve.fail', platform, code, ms: Date.now() - started });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative min-h-[100dvh] flex flex-col">
      <div className="bg-mesh" aria-hidden="true" />

      <header className="glass-strong sticky top-0 z-20 pt-safe-t pl-safe-l pr-safe-r">
        <div className="max-w-3xl mx-auto px-4 py-4 sm:py-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
          <div className="min-w-0">
            <h1
              className="text-xl xs:text-2xl sm:text-3xl font-bold bg-clip-text text-transparent"
              style={{
                backgroundImage:
                  'linear-gradient(90deg, rgb(var(--neon-1)), rgb(var(--neon-2)), rgb(var(--neon-3)), rgb(var(--neon-4)))',
              }}
            >
              {t.app.title}
            </h1>
            <p className="text-xs sm:text-sm text-fg-muted mt-1">{t.app.subtitle}</p>
          </div>
          <div className="flex items-center gap-2 self-end sm:self-auto">
            <LanguageSelector />
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-3xl w-full mx-auto px-4 py-6 sm:py-8 space-y-5 sm:space-y-6 pl-safe-l pr-safe-r">
        <section className="space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-fg-muted">{t.steps.selectPlatform}</h2>
          <PlatformSelector value={platform} onChange={handlePlatformChange} />
        </section>

        {platform && (
          <>
            <section className="space-y-3">
              <h2 className="text-xs font-semibold uppercase tracking-wide text-fg-muted">{t.steps.pasteAndDownload}</h2>
              <UrlForm
                platform={platform}
                loading={loading}
                onSubmit={handleSubmit}
                onPlatformSwitch={handlePlatformChange}
              />
            </section>

            <section className="space-y-3">
              <h2 className="text-xs font-semibold uppercase tracking-wide text-fg-muted">{t.steps.guide}</h2>
              <CollapsibleGuide platform={platform} />
            </section>
          </>
        )}

        {error && (
          <ErrorAlert
            message={error.message}
            code={error.code}
            requestId={error.requestId}
            onDismiss={() => setError(null)}
          />
        )}

        {loading && !result && (
          <section className="space-y-3" aria-live="polite" aria-busy="true">
            <span className="sr-only">{t.result.loading}</span>
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-[repeat(auto-fit,minmax(220px,1fr))]">
              <MediaCardSkeleton index={0} />
              <MediaCardSkeleton index={1} />
            </div>
          </section>
        )}

        {result && result.mediaItems.length > 0 && (
          <section className="space-y-3">
            <ResultsHeader
              platform={result.platform}
              kind={result.kind}
              count={result.mediaItems.length}
              onDownloadAll={result.mediaItems.length > 1 ? handleDownloadAll : undefined}
            />
            {result.degraded && (
              <div className="rounded-lg bg-warning/10 border border-warning/30 px-3 py-2">
                <p className="text-xs text-warning">⚠ {t.result.degraded}</p>
              </div>
            )}
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-[repeat(auto-fit,minmax(220px,1fr))]">
              {result.mediaItems.map((item, i) => (
                <MediaCard
                  key={`${item.url}-${i}`}
                  item={item}
                  platform={result.platform}
                  kind={result.kind}
                  index={i}
                />
              ))}
            </div>
          </section>
        )}
      </main>

      <footer className="glass pl-safe-l pr-safe-r pt-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
        <div className="max-w-3xl mx-auto px-4 flex flex-col items-center gap-3 text-center">
          <div className="flex flex-wrap items-center justify-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-success/30 bg-success/10 px-2.5 py-1 text-[11px] font-medium text-emerald-800 dark:text-emerald-300">
              <ShieldIcon className="h-3 w-3 text-success" />
              {t.footer.privateBadge}
            </span>
            <a
              href="https://github.com/koniz-dev/story-downloader"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-full border border-border-subtle bg-bg-raised/40 hover:bg-bg-raised px-2.5 py-1 text-[11px] font-medium text-fg-secondary hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ring transition-colors motion-reduce:transition-none"
            >
              <GitHubIcon className="h-3 w-3" />
              {t.footer.source}
            </a>
          </div>
          <p className="text-xs text-fg-muted">{t.app.footer}</p>
        </div>
      </footer>
    </div>
  );
}

function ShieldIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 3 4 6v6c0 5 3.5 8.5 8 9 4.5-.5 8-4 8-9V6l-8-3Z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}

function GitHubIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M12 1.5C6.2 1.5 1.5 6.2 1.5 12c0 4.6 3 8.6 7.2 10 .5.1.7-.2.7-.5v-1.9c-2.9.6-3.5-1.4-3.5-1.4-.5-1.2-1.2-1.5-1.2-1.5-1-.7.1-.7.1-.7 1.1.1 1.6 1.1 1.6 1.1 1 1.6 2.6 1.2 3.2.9.1-.7.4-1.2.7-1.5-2.3-.3-4.8-1.2-4.8-5.2 0-1.1.4-2.1 1.1-2.8-.1-.3-.5-1.4.1-2.9 0 0 .9-.3 2.9 1.1.8-.2 1.7-.3 2.6-.3.9 0 1.8.1 2.6.3 2-1.4 2.9-1.1 2.9-1.1.6 1.5.2 2.6.1 2.9.7.7 1.1 1.7 1.1 2.8 0 4-2.5 4.9-4.8 5.2.4.3.7.9.7 1.9v2.8c0 .3.2.6.7.5 4.2-1.4 7.2-5.4 7.2-10 0-5.8-4.7-10.5-10.5-10.5Z"
      />
    </svg>
  );
}
