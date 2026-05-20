import { useRef, useState, type FormEvent } from 'react';
import type { Platform } from '../types';
import { detectPlatform, detectKind } from '../lib/platform';
import { format, useI18n } from '../lib/i18n';
import { useToast } from '../lib/toast';
import { scrollFocusedIntoView } from '../lib/scroll';

interface Props {
  platform: Platform;
  loading: boolean;
  mode?: 'single' | 'bulk';
  onSubmit: (url: string) => void;
  onPlatformSwitch?: (next: Platform) => void;
}

const PLACEHOLDERS: Record<Platform, string> = {
  instagram: 'https://www.instagram.com/reel/...',
  facebook: 'https://www.facebook.com/.../posts/...',
  tiktok: 'https://www.tiktok.com/@user/video/...',
};

export function UrlForm({ platform, loading, mode = 'single', onSubmit, onPlatformSwitch }: Props) {
  if (mode === 'bulk') {
    return <BulkUrlForm platform={platform} loading={loading} onSubmit={onSubmit} />;
  }
  return <SingleUrlForm platform={platform} loading={loading} onSubmit={onSubmit} onPlatformSwitch={onPlatformSwitch} />;
}

function SingleUrlForm({ platform, loading, onSubmit, onPlatformSwitch }: Omit<Props, 'mode'>) {
  const { t } = useI18n();
  const toast = useToast();
  const [url, setUrl] = useState('');
  const [touched, setTouched] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const detectedPlatform = url ? detectPlatform(url) : null;
  const detectedKind = url && detectedPlatform === platform ? detectKind(url, platform) : null;

  const wrongPlatform = touched && url.length > 0 && detectedPlatform !== null && detectedPlatform !== platform;
  const notUrl = touched && url.length > 0 && detectedPlatform === null;
  const validKind = detectedKind !== null;

  const canSubmit = !loading && validKind;

  // navigator.clipboard.readText is gated behind a user gesture (the button
  // click satisfies it) and a Permissions Policy. Catch all rejection paths
  // and tell the user how to recover instead of failing silently.
  async function handlePaste() {
    if (typeof navigator === 'undefined' || !navigator.clipboard?.readText) {
      toast.show(t.form.pasteFailed, 'error');
      inputRef.current?.focus();
      return;
    }
    try {
      const text = (await navigator.clipboard.readText()).trim();
      if (!text) {
        inputRef.current?.focus();
        return;
      }
      setUrl(text);
      setTouched(true);
      inputRef.current?.focus();
    } catch {
      toast.show(t.form.pasteFailed, 'error');
      inputRef.current?.focus();
    }
  }

  function handleClear() {
    setUrl('');
    setTouched(false);
    inputRef.current?.focus();
  }

  function handleSwitchPlatform() {
    if (!detectedPlatform || detectedPlatform === platform) return;
    onPlatformSwitch?.(detectedPlatform);
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setTouched(true);
    if (!canSubmit) return;
    onSubmit(url.trim());
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-2" noValidate>
      <label htmlFor="sd-url-input" className="block text-sm font-medium text-fg-secondary">
        {format(t.form.label, { platform: t.platform[platform].name })}
      </label>
      <div className="flex flex-col xs:flex-row gap-2">
        <div className="glass flex-1 flex items-stretch rounded-xl focus-within:ring-2 focus-within:ring-accent-ring transition-shadow motion-reduce:transition-none">
          <input
            ref={inputRef}
            id="sd-url-input"
            type="url"
            inputMode="url"
            autoComplete="off"
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
            placeholder={PLACEHOLDERS[platform]}
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onBlur={() => setTouched(true)}
            onFocus={() => scrollFocusedIntoView(inputRef.current)}
            className="flex-1 bg-transparent rounded-xl px-4 py-3 min-h-[52px] text-base text-fg placeholder:text-fg-muted focus:outline-none disabled:opacity-60"
            disabled={loading}
            aria-invalid={wrongPlatform || notUrl ? true : undefined}
            aria-describedby={
              wrongPlatform ? 'sd-url-wrong-platform' : notUrl ? 'sd-url-not-url' : undefined
            }
          />
          {url.length > 0 ? (
            <button
              type="button"
              onClick={handleClear}
              disabled={loading}
              aria-label={t.form.clear}
              title={t.form.clear}
              className="shrink-0 inline-flex items-center justify-center h-[52px] w-11 text-fg-muted hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ring rounded-r-xl transition-colors motion-reduce:transition-none disabled:opacity-40"
            >
              <ClearIcon className="h-4 w-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handlePaste}
              disabled={loading}
              aria-label={t.form.paste}
              title={t.form.paste}
              className="shrink-0 inline-flex items-center gap-1.5 px-3 h-[52px] text-sm font-medium text-fg-secondary hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ring rounded-r-xl transition-colors motion-reduce:transition-none disabled:opacity-40"
            >
              <PasteIcon className="h-4 w-4" aria-hidden="true" />
              <span className="hidden xs:inline">{t.form.paste}</span>
            </button>
          )}
        </div>
        <button
          type="submit"
          disabled={!canSubmit}
          className="btn-shimmer rounded-xl bg-gradient-to-br from-[rgb(var(--neon-1))] via-[rgb(var(--neon-2))] to-[rgb(var(--neon-3))] hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:brightness-100 px-6 py-3 min-h-[52px] font-semibold text-white shadow-pop focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ring transition-[filter,transform] motion-reduce:transition-none active:scale-[0.98] motion-reduce:active:scale-100"
        >
          <span className="relative z-10 flex items-center justify-center gap-2">
            {loading ? (
              <>
                <Spinner /> {t.form.submitting}
              </>
            ) : (
              t.form.submit
            )}
          </span>
        </button>
      </div>
      {wrongPlatform && (
        <div
          id="sd-url-wrong-platform"
          className="flex flex-wrap items-center gap-2 text-xs text-warning"
        >
          <span>
            {format(t.form.error.wrongPlatform, {
              got: t.platform[detectedPlatform!].name,
              expected: t.platform[platform].name,
            })}
          </span>
          {onPlatformSwitch && (
            <button
              type="button"
              onClick={handleSwitchPlatform}
              className="inline-flex items-center gap-1 rounded-full border border-warning/40 bg-warning/10 hover:bg-warning/20 px-2.5 py-1 text-xs font-medium text-warning focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-warning transition-colors motion-reduce:transition-none"
            >
              <ArrowRightIcon className="h-3 w-3" />
              {format(t.form.switchTo, { platform: t.platform[detectedPlatform!].name })}
            </button>
          )}
        </div>
      )}
      {notUrl && (
        <p id="sd-url-not-url" className="text-xs text-warning">
          {t.form.error.notUrl}
        </p>
      )}
      {touched && url.length > 0 && detectedPlatform === platform && !validKind && (
        <p className="text-xs text-warning">{t.form.error.unknownKind}</p>
      )}
    </form>
  );
}

function BulkUrlForm({ platform, loading, onSubmit }: Omit<Props, 'mode' | 'onPlatformSwitch'>) {
  const { t } = useI18n();
  const toast = useToast();
  const [text, setText] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const canSubmit = !loading && text.trim().length > 0;

  async function handlePaste() {
    if (typeof navigator === 'undefined' || !navigator.clipboard?.readText) {
      toast.show(t.form.pasteFailed, 'error');
      textareaRef.current?.focus();
      return;
    }
    try {
      const clip = (await navigator.clipboard.readText()).trim();
      if (!clip) {
        textareaRef.current?.focus();
        return;
      }
      setText((prev) => (prev.trim().length === 0 ? clip : `${prev.replace(/\s+$/, '')}\n${clip}`));
      textareaRef.current?.focus();
    } catch {
      toast.show(t.form.pasteFailed, 'error');
      textareaRef.current?.focus();
    }
  }

  function handleClear() {
    setText('');
    textareaRef.current?.focus();
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    onSubmit(text);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-2" noValidate>
      <label htmlFor="sd-url-textarea" className="block text-sm font-medium text-fg-secondary">
        {format(t.form.label, { platform: t.platform[platform].name })}
      </label>
      <div className="glass rounded-xl focus-within:ring-2 focus-within:ring-accent-ring transition-shadow motion-reduce:transition-none">
        <textarea
          ref={textareaRef}
          id="sd-url-textarea"
          rows={5}
          autoComplete="off"
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
          placeholder={t.bulk.textareaPlaceholder}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onFocus={() => scrollFocusedIntoView(textareaRef.current)}
          className="w-full bg-transparent rounded-xl px-4 py-3 font-mono text-sm text-fg placeholder:text-fg-muted focus:outline-none disabled:opacity-60 resize-y min-h-[140px]"
          disabled={loading}
        />
      </div>
      <div className="flex flex-col xs:flex-row gap-2">
        <div className="flex gap-2 xs:flex-1">
          {text.trim().length > 0 ? (
            <button
              type="button"
              onClick={handleClear}
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-3 h-[44px] text-sm font-medium text-fg-secondary hover:text-fg rounded-lg border border-border-subtle bg-bg-raised/40 hover:bg-bg-raised focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ring transition-colors motion-reduce:transition-none disabled:opacity-40"
            >
              <ClearIcon className="h-4 w-4" />
              {t.form.clear}
            </button>
          ) : (
            <button
              type="button"
              onClick={handlePaste}
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-3 h-[44px] text-sm font-medium text-fg-secondary hover:text-fg rounded-lg border border-border-subtle bg-bg-raised/40 hover:bg-bg-raised focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ring transition-colors motion-reduce:transition-none disabled:opacity-40"
            >
              <PasteIcon className="h-4 w-4" aria-hidden="true" />
              {t.form.paste}
            </button>
          )}
        </div>
        <button
          type="submit"
          disabled={!canSubmit}
          className="btn-shimmer rounded-xl bg-gradient-to-br from-[rgb(var(--neon-1))] via-[rgb(var(--neon-2))] to-[rgb(var(--neon-3))] hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:brightness-100 px-6 py-3 min-h-[52px] font-semibold text-white shadow-pop focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ring transition-[filter,transform] motion-reduce:transition-none active:scale-[0.98] motion-reduce:active:scale-100"
        >
          <span className="relative z-10 flex items-center justify-center gap-2">
            {loading ? (
              <>
                <Spinner /> {t.form.submitting}
              </>
            ) : (
              t.form.submit
            )}
          </span>
        </button>
      </div>
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

function ClearIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="m6 6 12 12" />
      <path d="M18 6 6 18" />
    </svg>
  );
}

function PasteIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="8" y="3" width="8" height="4" rx="1" />
      <path d="M16 5h2a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h2" />
    </svg>
  );
}

function ArrowRightIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M5 12h14" />
      <path d="m13 6 6 6-6 6" />
    </svg>
  );
}
