import { useState } from 'react';
import { UrlForm } from './components/UrlForm';
import { MediaCard } from './components/MediaCard';
import { ErrorAlert } from './components/ErrorAlert';
import { PlatformBadge } from './components/PlatformBadge';
import { resolveStory, ApiError } from './lib/api';
import type { ResolveResponse } from './types';

export function App() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ResolveResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(url: string) {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await resolveStory(url);
      setResult(res);
      if (res.mediaItems.length === 0) {
        setError('Không tìm thấy media nào trong story này. Có thể story là riêng tư hoặc đã hết hạn.');
      }
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : e instanceof Error ? e.message : 'Lỗi không xác định';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-slate-800">
        <div className="max-w-3xl mx-auto px-4 py-6">
          <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-instagram to-facebook bg-clip-text text-transparent">
            Story Downloader
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Dán URL story Instagram hoặc Facebook để tải về. Chỉ hỗ trợ story công khai.
          </p>
        </div>
      </header>

      <main className="flex-1 max-w-3xl w-full mx-auto px-4 py-8 space-y-6">
        <UrlForm loading={loading} onSubmit={handleSubmit} />

        {error && <ErrorAlert message={error} onDismiss={() => setError(null)} />}

        {result && result.mediaItems.length > 0 && (
          <section className="space-y-3">
            <div className="flex items-center gap-2">
              <PlatformBadge platform={result.platform} />
              <span className="text-sm text-slate-400">
                Tìm thấy {result.mediaItems.length} media
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {result.mediaItems.map((item, i) => (
                <MediaCard key={`${item.url}-${i}`} item={item} />
              ))}
            </div>
          </section>
        )}
      </main>

      <footer className="border-t border-slate-800 py-6">
        <div className="max-w-3xl mx-auto px-4 text-xs text-slate-500 text-center">
          Tool dành cho mục đích cá nhân. Tôn trọng quyền riêng tư và bản quyền của người tạo nội dung.
        </div>
      </footer>
    </div>
  );
}
