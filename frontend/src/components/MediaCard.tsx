import type { MediaItem, Platform, ContentKind } from '../types';
import { downloadMedia } from '../lib/download';
import { proxyUrl } from '../lib/api';
import { useI18n } from '../lib/i18n';
import { useToast } from '../lib/toast';

interface Props {
  item: MediaItem;
  platform: Platform;
  kind: ContentKind;
  index?: number;
}

export function MediaCard({ item, platform, kind, index = 0 }: Props) {
  const { t } = useI18n();
  const toast = useToast();
  const previewSrc = item.thumbnail ?? proxyUrl(item.url);

  async function handleCopy() {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(item.url);
      } else {
        // Legacy execCommand path for older WebViews. Best-effort — failures
        // fall through to the catch and surface a generic clipboard error.
        const ta = document.createElement('textarea');
        ta.value = item.url;
        ta.setAttribute('readonly', '');
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        ta.remove();
      }
      toast.show(t.toast.copied);
    } catch {
      toast.show(t.form.pasteFailed, 'error');
    }
  }

  function handleDownload() {
    downloadMedia(item, platform, kind);
    toast.show(t.toast.downloadStarted);
  }

  return (
    <div
      className="glass animate-fadeUp group rounded-2xl overflow-hidden flex flex-col shadow-card hover:shadow-pop hover:-translate-y-0.5 transition-all duration-200 motion-reduce:transition-none motion-reduce:hover:translate-y-0"
      style={{ animationDelay: `${index * 60}ms` }}
    >
      <div className="relative aspect-[9/16] max-h-[70vh] bg-bg-sunken flex items-center justify-center">
        {item.type === 'video' ? (
          <video
            src={proxyUrl(item.url)}
            poster={item.thumbnail}
            controls
            playsInline
            preload="metadata"
            className="w-full h-full object-contain"
          />
        ) : (
          <img
            src={previewSrc}
            alt="media preview"
            loading="lazy"
            decoding="async"
            className="w-full h-full object-contain"
          />
        )}
        <span className="absolute top-2 left-2 px-2 py-0.5 rounded-md text-[10px] font-bold bg-black/70 backdrop-blur text-white uppercase tracking-wide">
          {item.type}
        </span>
      </div>
      {/* Mobile: dimension line on its own row + a full-width Download CTA so
          the primary action is unmissable with a thumb. Copy URL is a smaller
          secondary affordance to its left. sm+ collapses everything inline. */}
      <div className="p-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <span className="text-xs text-fg-muted truncate order-1 sm:order-none">
          {item.width && item.height
            ? `${item.width}×${item.height}`
            : item.type === 'video'
              ? t.media.video
              : t.media.image}
        </span>
        <div className="flex items-center gap-2 sm:gap-1.5 order-2 sm:order-none">
          <button
            type="button"
            onClick={handleCopy}
            aria-label={t.media.copyUrl}
            title={t.media.copyUrl}
            className="inline-flex h-11 w-11 sm:h-10 sm:w-10 items-center justify-center rounded-lg text-fg-secondary hover:text-fg bg-bg-sunken/60 hover:bg-bg-sunken sm:bg-transparent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ring transition-colors motion-reduce:transition-none shrink-0"
          >
            <CopyIcon className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={handleDownload}
            className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 rounded-lg bg-success hover:brightness-110 active:scale-[0.98] motion-reduce:active:scale-100 px-4 py-3 sm:py-2.5 min-h-[44px] text-sm font-semibold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-success transition-[filter,transform] motion-reduce:transition-none"
          >
            <DownloadIcon className="h-4 w-4" /> {t.media.download}
          </button>
        </div>
      </div>
    </div>
  );
}

function DownloadIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 3v12" />
      <path d="m7 10 5 5 5-5" />
      <path d="M5 21h14" />
    </svg>
  );
}

function CopyIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="9" y="9" width="11" height="11" rx="2" />
      <path d="M5 15V6a2 2 0 0 1 2-2h9" />
    </svg>
  );
}
