import type { MediaItem, Platform, ContentKind } from '../types';
import { downloadMedia } from '../lib/download';
import { proxyUrl } from '../lib/api';
import { useI18n } from '../lib/i18n';

interface Props {
  item: MediaItem;
  platform: Platform;
  kind: ContentKind;
}

export function MediaCard({ item, platform, kind }: Props) {
  const { t } = useI18n();
  const previewSrc = item.thumbnail ?? proxyUrl(item.url);

  return (
    <div className="group rounded-2xl bg-bg-raised border border-border-subtle overflow-hidden flex flex-col hover:border-border-strong shadow-card transition-colors motion-reduce:transition-none">
      <div className="relative aspect-[9/16] max-h-[70vh] bg-bg-sunken flex items-center justify-center">
        {item.type === 'video' ? (
          <video
            src={proxyUrl(item.url)}
            poster={item.thumbnail}
            controls
            playsInline
            className="w-full h-full object-contain"
          />
        ) : (
          <img src={previewSrc} alt="media preview" className="w-full h-full object-contain" />
        )}
        <span className="absolute top-2 left-2 px-2 py-0.5 rounded-md text-[10px] font-bold bg-black/70 backdrop-blur text-white uppercase tracking-wide">
          {item.type}
        </span>
      </div>
      <div className="p-3 flex items-center justify-between gap-2">
        <span className="text-xs text-fg-muted truncate">
          {item.width && item.height
            ? `${item.width}×${item.height}`
            : item.type === 'video'
              ? t.media.video
              : t.media.image}
        </span>
        <button
          onClick={() => downloadMedia(item, platform, kind)}
          className="inline-flex items-center gap-1.5 rounded-lg bg-success hover:brightness-110 active:scale-[0.97] motion-reduce:active:scale-100 px-4 py-2.5 min-h-[44px] text-sm font-semibold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-success transition-[filter,transform] motion-reduce:transition-none"
        >
          <DownloadIcon className="h-4 w-4" /> {t.media.download}
        </button>
      </div>
    </div>
  );
}

function DownloadIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 3v12" />
      <path d="m7 10 5 5 5-5" />
      <path d="M5 21h14" />
    </svg>
  );
}
