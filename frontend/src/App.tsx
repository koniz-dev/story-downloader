import { useEffect, useRef, useState } from 'react';
import { PlatformSelector } from './components/PlatformSelector';
import { CollapsibleGuide } from './components/CollapsibleGuide';
import { UrlForm } from './components/UrlForm';
import { MediaCard } from './components/MediaCard';
import { MediaCardSkeleton } from './components/MediaCardSkeleton';
import { ResultsHeader } from './components/ResultsHeader';
import { ErrorAlert } from './components/ErrorAlert';
import { BulkResultRow } from './components/BulkResultRow';
import { LanguageSelector } from './components/LanguageSelector';
import { ThemeToggle } from './components/ThemeToggle';
import { StepHeader } from './components/StepHeader';
import { resolveMedia, ApiError } from './lib/api';
import { track } from './lib/track';
import { format, useI18n } from './lib/i18n';
import { useToast } from './lib/toast';
import { downloadMedia } from './lib/download';
import { detectPlatform } from './lib/platform';
import { readShareTargetUrl } from './lib/share-target';
import { scrollIntoView } from './lib/scroll';
import { useScrolled } from './lib/useScrolled';
import type { BulkRow, Platform, ResolveResponse } from './types';

const STORAGE_KEY = 'sd.platform';
const BULK_DELAY_MS = 500;

type Mode = 'single' | 'bulk';

export function App() {
  const { t } = useI18n();
  const toast = useToast();
  // Collapses subtitle + value chips on mobile once the user scrolls. Keeps
  // them on tablet+ since horizontal space isn't as scarce there.
  const scrolled = useScrolled(80);
  const [platform, setPlatform] = useState<Platform | null>(() => {
    const saved = typeof localStorage !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null;
    return saved === 'instagram' || saved === 'facebook' || saved === 'tiktok' ? saved : null;
  });
  const [mode, setMode] = useState<Mode>('single');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ResolveResponse | null>(null);
  const [error, setError] = useState<{ message: string; code?: string; requestId?: string } | null>(null);
  const [rows, setRows] = useState<BulkRow[]>([]);
  const [bulkProgress, setBulkProgress] = useState<{ done: number; total: number } | null>(null);
  const [sharedUrl, setSharedUrl] = useState<string | null>(null);

  // Web Share Target entry: when the OS share sheet hands us a URL on
  // launch, detect its platform, pre-fill the form, and strip the query
  // params so a reload doesn't re-fire the same share.
  useEffect(() => {
    const shared = readShareTargetUrl();
    if (!shared) return;
    const detected = detectPlatform(shared);
    if (!detected) return;
    setPlatform(detected);
    setSharedUrl(shared);
    if (typeof window !== 'undefined' && window.history?.replaceState) {
      window.history.replaceState(null, '', window.location.pathname + window.location.hash);
    }
    track({ event: 'share-target.received', platform: detected });
  }, []);

  // Track which platform value transitioned the user from "no selection" so
  // we only scroll the form into view when it's a fresh pick — not on every
  // toggle, not on hydration from localStorage. Avoids jumping the page on
  // initial paint and on switch-back-and-forth tinkering.
  const isInitialMount = useRef(true);
  const activeRunId = useRef(0);
  const singleRequestAbort = useRef<AbortController | null>(null);
  const urlFormRef = useRef<HTMLElement>(null);
  const resultsRef = useRef<HTMLElement>(null);
  const errorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (platform) localStorage.setItem(STORAGE_KEY, platform);
  }, [platform]);

  // Auto-scroll the URL form into view when the user picks a platform. Skip
  // the very first render so we don't yank the page when the saved platform
  // re-hydrates from localStorage.
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    if (!platform) return;
    // rAF lets the section render before we measure its position.
    const handle = window.requestAnimationFrame(() => {
      // Account for the sticky header (~64-110px depending on viewport).
      const headerHeight = document.querySelector('header')?.offsetHeight ?? 80;
      scrollIntoView(urlFormRef.current, { offsetTop: headerHeight + 12 });
    });
    return () => window.cancelAnimationFrame(handle);
  }, [platform]);

  // Auto-scroll the results into view once a successful resolve renders so
  // the user doesn't have to hunt for them below the guide on mobile.
  useEffect(() => {
    if (!result || result.mediaItems.length === 0) return;
    const handle = window.requestAnimationFrame(() => {
      const headerHeight = document.querySelector('header')?.offsetHeight ?? 80;
      scrollIntoView(resultsRef.current, { offsetTop: headerHeight + 12 });
    });
    return () => window.cancelAnimationFrame(handle);
  }, [result]);

  // Same behavior for error: an error alert that renders below the fold is
  // worthless — the user clicks Download, sees nothing change, and assumes
  // the app froze. Scroll into view only when not already visible.
  useEffect(() => {
    if (!error) return;
    const handle = window.requestAnimationFrame(() => {
      const headerHeight = document.querySelector('header')?.offsetHeight ?? 80;
      scrollIntoView(errorRef.current, { offsetTop: headerHeight + 12 });
    });
    return () => window.cancelAnimationFrame(handle);
  }, [error]);

  useEffect(
    () => () => {
      activeRunId.current++;
      singleRequestAbort.current?.abort();
    },
    [],
  );

  function cancelActiveWork(): void {
    activeRunId.current++;
    singleRequestAbort.current?.abort();
    singleRequestAbort.current = null;
  }

  function isRunActive(runId: number): boolean {
    return activeRunId.current === runId;
  }

  function handlePlatformChange(p: Platform) {
    if (loading) return;
    cancelActiveWork();
    setPlatform(p);
    setLoading(false);
    setResult(null);
    setError(null);
    setRows([]);
    setBulkProgress(null);
    track({ event: 'platform.select', platform: p });
  }

  function handleModeChange(next: Mode) {
    if (loading || next === mode) return;
    cancelActiveWork();
    setMode(next);
    setResult(null);
    setError(null);
    setRows([]);
    setBulkProgress(null);
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

  function handleBulkDownloadAll() {
    const queue = rows.flatMap((row) =>
      row.status === 'ok'
        ? row.response.mediaItems.map((item) => ({
            item,
            platform: row.response.platform,
            kind: row.response.kind,
          }))
        : [],
    );
    if (queue.length === 0) return;
    toast.show(format(t.toast.downloadingAll, { n: queue.length }));
    // Same 250ms stagger as single-result Download all — keeps the browser
    // from suppressing the bulk after the first permission prompt.
    queue.forEach((q, i) => {
      window.setTimeout(() => downloadMedia(q.item, q.platform, q.kind), i * 250);
    });
  }

  function resolveErrorMessage(e: unknown): { message: string; code?: string; requestId?: string } {
    const code = e instanceof ApiError ? e.code : undefined;
    const params = e instanceof ApiError ? e.params : undefined;
    const requestId = e instanceof ApiError ? e.requestId : undefined;
    const template = code && Object.prototype.hasOwnProperty.call(t.serverError, code)
      ? t.serverError[code as keyof typeof t.serverError]
      : null;
    const message = template ? format(template, params ?? {}) : t.form.error.generic;
    return { message, code, requestId };
  }

  async function handleSubmit(input: string) {
    if (!platform) return;
    if (mode === 'bulk') {
      await handleBulkSubmit(input);
      return;
    }
    cancelActiveWork();
    const runId = ++activeRunId.current;
    const controller = new AbortController();
    singleRequestAbort.current = controller;
    setLoading(true);
    setError(null);
    setResult(null);
    const started = Date.now();
    track({ event: 'resolve.start', platform });
    try {
      const res = await resolveMedia(input, controller.signal);
      if (!isRunActive(runId)) return;
      setResult(res);
      track({ event: 'resolve.ok', platform, kind: res.kind, items: res.mediaItems.length, ms: Date.now() - started });
      if (res.mediaItems.length === 0) {
        setError({ message: t.result.noMedia, code: 'NO_MEDIA' });
      }
    } catch (e) {
      if (!isRunActive(runId)) return;
      if (controller.signal.aborted) return;
      const { message, code, requestId } = resolveErrorMessage(e);
      setError({ message, code, requestId });
      track({ event: 'resolve.fail', platform, code, ms: Date.now() - started, requestId });
    } finally {
      if (isRunActive(runId)) {
        singleRequestAbort.current = null;
        setLoading(false);
      }
    }
  }

  async function handleBulkSubmit(text: string) {
    const lines = text.split('\n').map((s) => s.trim()).filter(Boolean);
    const valid = lines.filter((line) => detectPlatform(line) !== null);
    if (valid.length === 0) {
      toast.show(t.bulk.noValidUrls, 'error');
      return;
    }

    cancelActiveWork();
    const runId = ++activeRunId.current;
    setLoading(true);
    setError(null);
    setResult(null);
    const initial: BulkRow[] = valid.map((url) => ({ url, status: 'pending' }));
    setRows(initial);
    setBulkProgress({ done: 0, total: valid.length });
    track({ event: 'bulk.start', count: valid.length });

    let ok = 0;
    let failed = 0;

    for (let i = 0; i < valid.length; i++) {
      if (!isRunActive(runId)) return;
      const url = valid[i];
      const rowPlatform = detectPlatform(url) ?? platform ?? 'instagram';
      setRows((prev) => prev.map((r, idx) => (idx === i ? { url, status: 'loading' } : r)));
      const started = Date.now();
      track({ event: 'resolve.start', platform: rowPlatform });
      try {
        const res = await resolveMedia(url);
        if (!isRunActive(runId)) return;
        track({ event: 'resolve.ok', platform: rowPlatform, kind: res.kind, items: res.mediaItems.length, ms: Date.now() - started });
        if (res.mediaItems.length === 0) {
          failed++;
          setRows((prev) =>
            prev.map((r, idx) =>
              idx === i ? { url, status: 'error', message: t.result.noMedia, code: 'NO_MEDIA' } : r,
            ),
          );
        } else {
          ok++;
          setRows((prev) => prev.map((r, idx) => (idx === i ? { url, status: 'ok', response: res } : r)));
        }
      } catch (e) {
        if (!isRunActive(runId)) return;
        failed++;
        const { message, code, requestId } = resolveErrorMessage(e);
        track({ event: 'resolve.fail', platform: rowPlatform, code, ms: Date.now() - started, requestId });
        setRows((prev) =>
          prev.map((r, idx) =>
            idx === i ? { url, status: 'error', message, code, requestId } : r,
          ),
        );
      }
      setBulkProgress({ done: i + 1, total: valid.length });
      if (i < valid.length - 1) {
        await new Promise((res) => setTimeout(res, BULK_DELAY_MS));
      }
    }

    if (!isRunActive(runId)) return;
    setLoading(false);
    setBulkProgress(null);
    track({ event: 'bulk.complete', ok, failed, total: valid.length });
    if (failed === 0) {
      toast.show(format(t.bulk.doneAllOk, { total: valid.length }));
    } else {
      toast.show(format(t.bulk.doneSomeFailed, { ok, total: valid.length }), 'info');
    }
  }

  const hasBulkContent = rows.length > 0;
  const bulkOkRowCount = rows.reduce((n, r) => (r.status === 'ok' ? n + 1 : n), 0);
  const showBulkDownloadAll = !loading && bulkOkRowCount >= 2;
  const stepCompleted = mode === 'single'
    ? !!(result && result.mediaItems.length > 0)
    : hasBulkContent && !loading;

  return (
    <div className="relative min-h-[100dvh] flex flex-col">
      <div className="bg-mesh" aria-hidden="true" />

      <header
        data-compact={scrolled ? 'true' : 'false'}
        className="glass-strong sticky top-0 z-20 pt-safe-t transition-[padding] duration-200 motion-reduce:transition-none"
      >
        <div
          className={`max-w-3xl mx-auto px-page flex flex-row items-center justify-between gap-3 sm:gap-4 ${
            scrolled ? 'py-2.5 sm:py-3' : 'py-3 sm:py-6'
          } transition-[padding] duration-200 motion-reduce:transition-none`}
        >
          <div className="min-w-0 flex-1">
            <h1
              className={`font-bold bg-clip-text text-transparent leading-tight transition-[font-size] duration-200 motion-reduce:transition-none ${
                scrolled
                  ? 'text-base sm:text-2xl'
                  : 'text-xl xs:text-2xl sm:text-3xl'
              }`}
              style={{
                backgroundImage:
                  'linear-gradient(90deg, rgb(var(--neon-1)), rgb(var(--neon-2)), rgb(var(--neon-3)), rgb(var(--neon-4)))',
              }}
            >
              {t.app.title}
            </h1>
            {/* On mobile the subtitle + chips disappear when scrolled to free
                ~80px of viewport. Tablet+ keeps them visible — there's room. */}
            <div
              aria-hidden={scrolled ? 'true' : undefined}
              className={`overflow-hidden transition-[max-height,opacity,margin] duration-200 motion-reduce:transition-none ${
                scrolled
                  ? 'max-h-0 opacity-0 mt-0 sm:max-h-32 sm:opacity-100 sm:mt-1'
                  : 'max-h-32 opacity-100 mt-1'
              }`}
            >
              <p className="text-xs sm:text-sm text-fg-muted">{t.app.subtitle}</p>
              <ul className="mt-2 flex flex-wrap items-center gap-1.5">
                <ValueChip label={t.app.chips.free} variant="success" />
                <ValueChip label={t.app.chips.noSignup} variant="accent" />
                <ValueChip label={t.app.chips.private} variant="neutral" />
              </ul>
            </div>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <LanguageSelector />
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-3xl w-full mx-auto px-page py-6 sm:py-8 space-y-5 sm:space-y-6">
        <section className="space-y-3">
          <StepHeader
            step={1}
            label={t.steps.selectPlatform}
            state={platform ? 'completed' : 'active'}
          />
          <PlatformSelector value={platform} disabled={loading} onChange={handlePlatformChange} />
        </section>

        {platform && (
          <>
            <section ref={urlFormRef} className="space-y-3 scroll-mt-24">
              <StepHeader
                step={2}
                label={t.steps.pasteAndDownload}
                state={stepCompleted ? 'completed' : 'active'}
              />
              <ModeToggle mode={mode} disabled={loading} onChange={handleModeChange} />
              <UrlForm
                platform={platform}
                loading={loading}
                mode={mode}
                initialUrl={mode === 'single' ? sharedUrl ?? undefined : undefined}
                onSubmit={handleSubmit}
                onPlatformSwitch={mode === 'single' ? handlePlatformChange : undefined}
              />
              {bulkProgress && (
                <p className="text-xs text-fg-muted" aria-live="polite">
                  {format(t.bulk.processingProgress, bulkProgress)}
                </p>
              )}
            </section>

            {/* Feedback blocks live immediately under the form they belong
                to, NOT at the end of <main>. Putting them after the guide
                hid the error/result below the fold on every viewport once
                the guide expanded — users clicked Download and saw nothing
                change. */}
            {mode === 'single' && error && (
              <div ref={errorRef} className="scroll-mt-24">
                <ErrorAlert
                  message={error.message}
                  code={error.code}
                  requestId={error.requestId}
                  onDismiss={() => setError(null)}
                />
              </div>
            )}

            {mode === 'single' && loading && !result && (
              <section className="space-y-3" aria-live="polite" aria-busy="true">
                <span className="sr-only">{t.result.loading}</span>
                <div className="grid gap-4 grid-cols-1 sm:grid-cols-[repeat(auto-fit,minmax(220px,1fr))]">
                  <MediaCardSkeleton index={0} />
                  <MediaCardSkeleton index={1} />
                </div>
              </section>
            )}

            {mode === 'single' && result && result.mediaItems.length > 0 && (
              <section ref={resultsRef} className="space-y-3 scroll-mt-24">
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

            {mode === 'bulk' && hasBulkContent && (
              <section className="space-y-4">
                {showBulkDownloadAll && (
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={handleBulkDownloadAll}
                      disabled={loading}
                      className="inline-flex items-center gap-1.5 rounded-full border border-accent/30 bg-accent/10 hover:bg-accent/20 px-3 py-1.5 min-h-[36px] text-xs font-semibold text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ring transition-colors motion-reduce:transition-none disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <BulkDownloadAllIcon className="h-3.5 w-3.5" />
                      {t.result.downloadAll}
                    </button>
                  </div>
                )}
                {rows.map((row, i) => (
                  <BulkResultRow key={`${row.url}-${i}`} row={row} index={i} />
                ))}
              </section>
            )}

            {/* Guide is preparatory content — only useful BEFORE submit.
                Hiding it once feedback exists (error/loading/result) keeps
                step 3 from getting visually shoved around by content that
                lands between step 2 and step 3. Returns when the user
                clears the error or switches platforms. */}
            {mode === 'single' && !error && !loading && !result && (
              <section className="space-y-3">
                <StepHeader step={3} label={t.steps.guide} state="pending" />
                <CollapsibleGuide platform={platform} />
              </section>
            )}
            {mode === 'bulk' && !loading && !hasBulkContent && (
              <section className="space-y-3">
                <StepHeader step={3} label={t.steps.guide} state="pending" />
                <CollapsibleGuide platform={platform} />
              </section>
            )}
          </>
        )}
      </main>

      <footer className="glass pt-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
        <div className="max-w-3xl mx-auto px-page flex flex-col items-center gap-3 text-center">
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

function ModeToggle({
  mode,
  disabled,
  onChange,
}: {
  mode: Mode;
  disabled: boolean;
  onChange: (m: Mode) => void;
}) {
  const { t } = useI18n();
  const opts: { value: Mode; label: string }[] = [
    { value: 'single', label: t.bulk.modeSingle },
    { value: 'bulk', label: t.bulk.modeBulk },
  ];
  return (
    <div
      role="tablist"
      aria-label={t.steps.pasteAndDownload}
      className="inline-flex items-center gap-1 rounded-full border border-border-subtle bg-bg-raised/40 p-1"
    >
      {opts.map((o) => {
        const active = mode === o.value;
        return (
          <button
            key={o.value}
            type="button"
            role="tab"
            aria-selected={active}
            disabled={disabled}
            onClick={() => onChange(o.value)}
            className={`inline-flex items-center justify-center rounded-full px-3 py-1.5 text-xs font-semibold min-h-[32px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ring transition-colors motion-reduce:transition-none disabled:opacity-50 disabled:cursor-not-allowed ${
              active
                ? 'bg-accent/15 text-accent border border-accent/30'
                : 'text-fg-secondary hover:text-fg'
            }`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

const CHIP_VARIANTS = {
  // text-emerald-800 / dark:text-emerald-300 passes WCAG AA on the tinted
  // bg (the raw --success token alone hit 3.3:1 — see audit in commit
  // history). Keeping that contrast guarantee centralised here.
  success: 'border-success/30 bg-success/10 text-emerald-800 dark:text-emerald-300',
  accent: 'border-accent/30 bg-accent/10 text-accent',
  neutral: 'border-border-subtle bg-bg-raised/40 text-fg-secondary',
} as const;

function ValueChip({
  label,
  variant,
}: {
  label: string;
  variant: keyof typeof CHIP_VARIANTS;
}) {
  return (
    <li
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium ${CHIP_VARIANTS[variant]}`}
    >
      <DotIcon className="h-1.5 w-1.5" />
      {label}
    </li>
  );
}

function BulkDownloadAllIcon({ className }: { className?: string }) {
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
      <path d="M12 3v10" />
      <path d="m8 9 4 4 4-4" />
      <path d="M5 21h14" />
      <path d="M3 17h2" />
      <path d="M19 17h2" />
    </svg>
  );
}

function DotIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 8 8" className={className} aria-hidden="true">
      <circle cx="4" cy="4" r="3" fill="currentColor" />
    </svg>
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
