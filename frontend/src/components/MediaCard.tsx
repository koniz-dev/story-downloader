import type { MediaItem } from '../types';
import { downloadMedia } from '../lib/download';
import { proxyUrl } from '../lib/api';

export function MediaCard({ item }: { item: MediaItem }) {
  const previewSrc = item.thumbnail ?? proxyUrl(item.url);

  return (
    <div className="rounded-xl bg-slate-800/60 border border-slate-700 overflow-hidden flex flex-col">
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
          <img src={previewSrc} alt="story media" className="w-full h-full object-contain" />
        )}
        <span className="absolute top-2 left-2 px-2 py-0.5 rounded text-xs font-semibold bg-black/60 text-white uppercase">
          {item.type}
        </span>
      </div>
      <div className="p-3 flex items-center justify-between gap-2">
        <span className="text-xs text-slate-400 truncate">
          {item.width && item.height ? `${item.width}×${item.height}` : 'Story media'}
        </span>
        <button
          onClick={() => downloadMedia(item)}
          className="rounded-md bg-emerald-600 hover:bg-emerald-500 px-3 py-1.5 text-sm font-semibold transition"
        >
          Tải xuống
        </button>
      </div>
    </div>
  );
}
