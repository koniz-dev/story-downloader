import { useMemo, useRef, useState } from 'react';
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
  const videoRef = useRef<HTMLVideoElement>(null);
  // Idle: render the poster + a big custom Play button overlay. Once the user
  // explicitly taps Play, swap the overlay off and let the native <video>
  // controls handle scrub/volume/PiP. Hides the browser-chrome appearance of
  // a bare <video controls> at rest, and lets us strip the redundant "Download
  // video" entry from the controls menu so our Download CTA below is the
  // single, unambiguous download path.
  const [playing, setPlaying] = useState(false);
  const proxiedUrl = useMemo(() => proxyUrl(item.url), [item.url]);
  const previewSrc = item.thumbnail ?? proxiedUrl;

  function handleDownload() {
    downloadMedia(item, platform, kind);
    toast.show(t.toast.downloadStarted);
  }

  function handlePlay() {
    setPlaying(true);
    // play() returns a Promise that can reject (iOS autoplay policy, network
    // hiccup). Swallow — the user can tap the native play button to retry
    // once controls are visible.
    void videoRef.current?.play().catch(() => {});
  }

  return (
    <div
      className="glass animate-fadeUp rounded-2xl overflow-hidden flex flex-col shadow-card hover:shadow-pop hover:-translate-y-0.5 transition-all duration-200 motion-reduce:transition-none motion-reduce:hover:translate-y-0"
      style={{ animationDelay: `${index * 60}ms` }}
    >
      <div className="relative aspect-[9/16] max-h-[70vh] bg-bg-sunken flex items-center justify-center">
        {item.type === 'video' ? (
          <>
            <video
              ref={videoRef}
              src={proxiedUrl}
              poster={item.thumbnail}
              playsInline
              preload="metadata"
              controls={playing}
              // nodownload: kill the duplicate "Download video" item in
              // Chrome/Edge's native ⋮ menu so our CTA below is the only
              // download path. noplaybackrate trims the menu further.
              // disablePictureInPicture removes the inline PiP toggle.
              controlsList="nodownload noplaybackrate"
              disablePictureInPicture
              className="w-full h-full object-contain"
            />
            {!playing && (
              <button
                type="button"
                onClick={handlePlay}
                aria-label={t.media.play}
                className="group/play absolute inset-0 flex items-center justify-center bg-black/15 hover:bg-black/30 focus-visible:bg-black/30 focus-visible:outline-none transition-colors motion-reduce:transition-none"
              >
                <span className="flex items-center justify-center h-16 w-16 rounded-full bg-black/55 backdrop-blur text-white shadow-pop group-hover/play:scale-105 group-active/play:scale-95 motion-reduce:group-hover/play:scale-100 motion-reduce:group-active/play:scale-100 transition-transform">
                  <PlayIcon className="h-7 w-7 translate-x-0.5" />
                </span>
              </button>
            )}
          </>
        ) : (
          <img
            src={previewSrc}
            alt="media preview"
            loading="lazy"
            decoding="async"
            className="w-full h-full object-contain"
          />
        )}
        <span className="absolute top-2 left-2 px-2 py-0.5 rounded-md text-[10px] font-bold bg-black/70 backdrop-blur text-white uppercase tracking-wide pointer-events-none">
          {item.type}
        </span>
      </div>
      <div className="p-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <span className="text-xs text-fg-muted truncate">
          {item.width && item.height
            ? `${item.width}×${item.height}`
            : item.type === 'video'
              ? t.media.video
              : t.media.image}
        </span>
        <button
          type="button"
          onClick={handleDownload}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 rounded-lg bg-success hover:brightness-110 active:scale-[0.98] motion-reduce:active:scale-100 px-4 py-3 sm:py-2.5 min-h-[44px] text-sm font-semibold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-success transition-[filter,transform] motion-reduce:transition-none"
        >
          <DownloadIcon className="h-4 w-4" /> {t.media.download}
        </button>
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

function PlayIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
      <path d="M8 5v14l11-7L8 5Z" />
    </svg>
  );
}
