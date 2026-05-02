import { useState, FormEvent } from 'react';
import type { Platform } from '../types';
import { detectPlatform, detectKind, platformLabel } from '../lib/platform';

interface Props {
  platform: Platform;
  loading: boolean;
  onSubmit: (url: string) => void;
}

const PLACEHOLDERS: Record<Platform, string> = {
  instagram: 'https://www.instagram.com/reel/...',
  facebook: 'https://www.facebook.com/.../posts/...',
};

export function UrlForm({ platform, loading, onSubmit }: Props) {
  const [url, setUrl] = useState('');
  const [touched, setTouched] = useState(false);

  const detectedPlatform = url ? detectPlatform(url) : null;
  const detectedKind = url && detectedPlatform === platform ? detectKind(url, platform) : null;

  const wrongPlatform = touched && url.length > 0 && detectedPlatform !== null && detectedPlatform !== platform;
  const notUrl = touched && url.length > 0 && detectedPlatform === null;
  const validKind = detectedKind !== null;

  const canSubmit = !loading && validKind;

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setTouched(true);
    if (!canSubmit) return;
    onSubmit(url.trim());
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      <label className="block text-sm font-medium text-slate-300">
        Dán URL {platformLabel(platform)}
      </label>
      <div className="flex flex-col sm:flex-row gap-2">
        <input
          type="url"
          inputMode="url"
          autoComplete="off"
          placeholder={PLACEHOLDERS[platform]}
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onBlur={() => setTouched(true)}
          className="flex-1 rounded-xl bg-slate-800/80 border border-slate-700 px-4 py-3 text-base placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-400/60 focus:border-indigo-400/40 transition"
          disabled={loading}
        />
        <button
          type="submit"
          disabled={!canSubmit}
          className="rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 hover:from-indigo-400 hover:to-purple-500 disabled:from-slate-700 disabled:to-slate-700 disabled:cursor-not-allowed px-6 py-3 font-semibold text-white shadow-lg shadow-indigo-500/20 transition active:scale-[0.98]"
        >
          {loading ? (
            <span className="flex items-center gap-2">
              <Spinner /> Đang xử lý…
            </span>
          ) : (
            'Tải xuống'
          )}
        </button>
      </div>
      {wrongPlatform && (
        <p className="text-xs text-amber-400">
          URL này thuộc {platformLabel(detectedPlatform!)}, không phải {platformLabel(platform)}. Đổi tab nền tảng phía trên hoặc dán URL khác.
        </p>
      )}
      {notUrl && <p className="text-xs text-amber-400">URL không hợp lệ. Hãy copy từ thanh địa chỉ trình duyệt.</p>}
      {touched && url.length > 0 && detectedPlatform === platform && !validKind && (
        <p className="text-xs text-amber-400">
          URL không nhận diện được. Tham khảo "Ví dụ URL hợp lệ" ở phần hướng dẫn phía trên.
        </p>
      )}
    </form>
  );
}

function Spinner() {
  return (
    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="3" opacity="0.25" />
      <path d="M21 12a9 9 0 0 1-9 9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}
