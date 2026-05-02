import { useEffect, useState } from 'react';
import { PlatformSelector } from './components/PlatformSelector';
import { Guide } from './components/Guide';
import { UrlForm } from './components/UrlForm';
import { MediaCard } from './components/MediaCard';
import { ErrorAlert } from './components/ErrorAlert';
import { PlatformBadge } from './components/PlatformBadge';
import { LanguageSelector } from './components/LanguageSelector';
import { resolveMedia, ApiError } from './lib/api';
import { track } from './lib/track';
import { format, useI18n } from './lib/i18n';
import type { Platform, ResolveResponse } from './types';

const STORAGE_KEY = 'sd.platform';

export function App() {
  const { t } = useI18n();
  const [platform, setPlatform] = useState<Platform | null>(() => {
    const saved = typeof localStorage !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null;
    return saved === 'instagram' || saved === 'facebook' ? saved : null;
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
      const template = code && code in t.serverError
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
    <div className="relative min-h-screen flex flex-col">
      <div className="pointer-events-none absolute inset-0 overflow-hidden -z-10">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 h-[480px] w-[820px] rounded-full bg-indigo-500/15 blur-[120px]" />
        <div className="absolute -bottom-40 right-0 h-[420px] w-[620px] rounded-full bg-fuchsia-500/10 blur-[120px]" />
      </div>

      <header className="border-b border-slate-800/60 backdrop-blur-sm">
        <div className="max-w-3xl mx-auto px-4 py-6 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-indigo-300 via-fuchsia-300 to-amber-200 bg-clip-text text-transparent">
              {t.app.title}
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">{t.app.subtitle}</p>
          </div>
          <LanguageSelector />
        </div>
      </header>

      <main className="flex-1 max-w-3xl w-full mx-auto px-4 py-8 space-y-6">
        <section className="space-y-3">
          <h2 className="text-sm font-medium text-slate-300">{t.steps.selectPlatform}</h2>
          <PlatformSelector value={platform} onChange={handlePlatformChange} />
        </section>

        {platform && (
          <>
            <section className="space-y-3">
              <h2 className="text-sm font-medium text-slate-300">{t.steps.guide}</h2>
              <Guide platform={platform} />
            </section>

            <section className="space-y-3">
              <h2 className="text-sm font-medium text-slate-300">{t.steps.pasteAndDownload}</h2>
              <UrlForm platform={platform} loading={loading} onSubmit={handleSubmit} />
            </section>
          </>
        )}

        {error && <ErrorAlert message={error.message} code={error.code} onDismiss={() => setError(null)} />}

        {result && result.mediaItems.length > 0 && (
          <section className="space-y-3">
            <div className="flex items-center gap-2">
              <PlatformBadge platform={result.platform} kind={result.kind} />
              <span className="text-sm text-slate-400">
                {format(t.result.found, { n: result.mediaItems.length })}
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {result.mediaItems.map((item, i) => (
                <MediaCard key={`${item.url}-${i}`} item={item} platform={result.platform} kind={result.kind} />
              ))}
            </div>
          </section>
        )}
      </main>

      <footer className="border-t border-slate-800/60 py-6">
        <div className="max-w-3xl mx-auto px-4 text-xs text-slate-500 text-center">
          {t.app.footer}
        </div>
      </footer>
    </div>
  );
}
