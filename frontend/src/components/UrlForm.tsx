import { useState, FormEvent } from 'react';
import type { Platform } from '../types';
import { detectPlatform, detectKind } from '../lib/platform';
import { format, useI18n } from '../lib/i18n';

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
  const { t } = useI18n();
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
        {format(t.form.label, { platform: t.platform[platform].name })}
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
              <Spinner /> {t.form.submitting}
            </span>
          ) : (
            t.form.submit
          )}
        </button>
      </div>
      {wrongPlatform && (
        <p className="text-xs text-amber-400">
          {format(t.form.error.wrongPlatform, {
            got: t.platform[detectedPlatform!].name,
            expected: t.platform[platform].name,
          })}
        </p>
      )}
      {notUrl && <p className="text-xs text-amber-400">{t.form.error.notUrl}</p>}
      {touched && url.length > 0 && detectedPlatform === platform && !validKind && (
        <p className="text-xs text-amber-400">{t.form.error.unknownKind}</p>
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
