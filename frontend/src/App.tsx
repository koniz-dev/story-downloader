import { useEffect, useState } from 'react';
import { PlatformSelector } from './components/PlatformSelector';
import { CollapsibleGuide } from './components/CollapsibleGuide';
import { UrlForm } from './components/UrlForm';
import { MediaCard } from './components/MediaCard';
import { ErrorAlert } from './components/ErrorAlert';
import { PlatformBadge } from './components/PlatformBadge';
import { LanguageSelector } from './components/LanguageSelector';
import { ThemeToggle } from './components/ThemeToggle';
import { resolveMedia, ApiError } from './lib/api';
import { track } from './lib/track';
import { format, useI18n } from './lib/i18n';
import type { Platform, ResolveResponse } from './types';

const STORAGE_KEY = 'sd.platform';

export function App() {
  const { t } = useI18n();
  const [platform, setPlatform] = useState<Platform | null>(() => {
    const saved = typeof localStorage !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null;
    return saved === 'instagram' || saved === 'facebook' || saved === 'tiktok' ? saved : null;
  });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ResolveResponse | null>(null);
  const [error, setError] = useState<{ message: string; code?: string } | null>(null);

  useEffect(() => {
    if (platform) localStorage.setItem(STORAGE_KEY, platform);
  }, [platform]);

  function handlePlatformChange(p: Platform) {
    setPlatform(p);
    setResult(null);
    setError(null);
    track({ event: 'platform.select', platform: p });
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
      const template = code && Object.prototype.hasOwnProperty.call(t.serverError, code)
        ? t.serverError[code as keyof typeof t.serverError]
        : null;
      const msg = template ? format(template, params ?? {}) : t.form.error.generic;
      setError({ message: msg, code });
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
              <UrlForm platform={platform} loading={loading} onSubmit={handleSubmit} />
            </section>

            <section className="space-y-3">
              <h2 className="text-xs font-semibold uppercase tracking-wide text-fg-muted">{t.steps.guide}</h2>
              <CollapsibleGuide platform={platform} />
            </section>
          </>
        )}

        {error && <ErrorAlert message={error.message} code={error.code} onDismiss={() => setError(null)} />}

        {result && result.mediaItems.length > 0 && (
          <section className="space-y-3">
            <div className="flex items-center gap-2">
              <PlatformBadge platform={result.platform} kind={result.kind} />
              <span className="text-sm text-fg-muted">
                {format(t.result.found, { n: result.mediaItems.length })}
              </span>
            </div>
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
        <div className="max-w-3xl mx-auto px-4 text-xs text-fg-muted text-center">
          {t.app.footer}
        </div>
      </footer>
    </div>
  );
}
