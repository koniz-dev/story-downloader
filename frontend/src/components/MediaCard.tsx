import type { MediaItem, Platform, ContentKind } from '../types';
import { downloadMedia } from '../lib/download';
import { proxyUrl } from '../lib/api';

interface Props {
  item: MediaItem;
  platform: Platform;
  kind: ContentKind;
}

export function MediaCard({ item, platform, kind }: Props) {
  const previewSrc = item.thumbnail ?? proxyUrl(item.url);

  return (
    <div className="group rounded-2xl bg-slate-800/40 border border-slate-700/60 overflow-hidden flex flex-col hover:border-slate-600 transition">
      <div className="relative aspect-[9/16] bg-slate-900 flex items-center justify-center">
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
        <span className="text-xs text-slate-400 truncate">
          {item.width && item.height ? `${item.width}×${item.height}` : item.type === 'video' ? 'Video' : 'Hình ảnh'}
        </span>
        <button
          onClick={() => downloadMedia(item, platform, kind)}
          className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 active:scale-[0.97] px-3 py-1.5 text-sm font-semibold text-emerald-950 transition"
        >
          <DownloadIcon className="h-4 w-4" /> Tải xuống
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
