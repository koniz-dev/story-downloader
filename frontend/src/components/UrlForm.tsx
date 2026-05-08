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
  tiktok: 'https://www.tiktok.com/@user/video/...',
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
      <label className="block text-sm font-medium text-fg-secondary">
        {format(t.form.label, { platform: t.platform[platform].name })}
      </label>
      <div className="flex flex-col xs:flex-row gap-2">
        <input
          type="url"
          inputMode="url"
          autoComplete="off"
          placeholder={PLACEHOLDERS[platform]}
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onBlur={() => setTouched(true)}
          className="flex-1 rounded-xl bg-bg-raised border border-border-subtle px-4 py-3 min-h-[48px] text-base text-fg placeholder:text-fg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-ring focus-visible:border-accent transition-colors motion-reduce:transition-none disabled:opacity-60"
          disabled={loading}
        />
        <button
          type="submit"
          disabled={!canSubmit}
          className="rounded-xl bg-gradient-to-br from-accent to-accent2 hover:brightness-110 disabled:from-bg-sunken disabled:to-bg-sunken disabled:text-fg-muted disabled:cursor-not-allowed disabled:hover:brightness-100 px-6 py-3 min-h-[48px] font-semibold text-white shadow-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ring transition-[filter,transform] motion-reduce:transition-none active:scale-[0.98] motion-reduce:active:scale-100"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <Spinner /> {t.form.submitting}
            </span>
          ) : (
            t.form.submit
          )}
        </button>
      </div>
      {wrongPlatform && (
        <p className="text-xs text-warning">
          {format(t.form.error.wrongPlatform, {
            got: t.platform[detectedPlatform!].name,
            expected: t.platform[platform].name,
          })}
        </p>
      )}
      {notUrl && <p className="text-xs text-warning">{t.form.error.notUrl}</p>}
      {touched && url.length > 0 && detectedPlatform === platform && !validKind && (
        <p className="text-xs text-warning">{t.form.error.unknownKind}</p>
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
