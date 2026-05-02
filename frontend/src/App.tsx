import { useEffect, useState } from 'react';
import { PlatformSelector } from './components/PlatformSelector';
import { Guide } from './components/Guide';
import { UrlForm } from './components/UrlForm';
import { MediaCard } from './components/MediaCard';
import { ErrorAlert } from './components/ErrorAlert';
import { PlatformBadge } from './components/PlatformBadge';
import { resolveMedia, ApiError } from './lib/api';
import { track } from './lib/track';
import type { Platform, ResolveResponse } from './types';

const STORAGE_KEY = 'sd.platform';

export function App() {
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
        setError({ message: 'Không tìm thấy media nào trong bài này.', code: 'NO_MEDIA' });
      }
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : e instanceof Error ? e.message : 'Lỗi không xác định';
      const code = e instanceof ApiError ? e.code : undefined;
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
        <div className="max-w-3xl mx-auto px-4 py-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-indigo-300 via-fuchsia-300 to-amber-200 bg-clip-text text-transparent">
              Social Downloader
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              Tải Reel, Post, Video công khai từ Instagram &amp; Facebook
            </p>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-3xl w-full mx-auto px-4 py-8 space-y-6">
        <section className="space-y-3">
          <h2 className="text-sm font-medium text-slate-300">1. Chọn nền tảng</h2>
          <PlatformSelector value={platform} onChange={handlePlatformChange} />
        </section>

        {platform && (
          <>
            <section className="space-y-3">
              <h2 className="text-sm font-medium text-slate-300">2. Hướng dẫn lấy link</h2>
              <Guide platform={platform} />
            </section>

            <section className="space-y-3">
              <h2 className="text-sm font-medium text-slate-300">3. Dán link &amp; tải</h2>
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
                Tìm thấy {result.mediaItems.length} media
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
          Tool dành cho mục đích cá nhân. Tôn trọng quyền riêng tư và bản quyền của người tạo nội dung.
        </div>
      </footer>
    </div>
  );
}
