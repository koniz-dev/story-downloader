import { proxyUrl } from './api';
import { track } from './track';
import type { MediaItem, Platform, ContentKind } from '../types';

export function downloadMedia(item: MediaItem, platform: Platform, kind: ContentKind): void {
  const filename = item.filename ?? defaultFilename(item, platform, kind);
  const href = proxyUrl(item.url, filename);
  track({ event: 'download.click', platform, kind, type: item.type });
  const a = document.createElement('a');
  a.href = href;
  a.download = filename;
  a.rel = 'noopener noreferrer';
  document.body.appendChild(a);
  a.click();
  a.remove();
}

function defaultFilename(item: MediaItem, platform: Platform, kind: ContentKind): string {
  const ext = item.type === 'video' ? 'mp4' : 'jpg';
  const stamp = Date.now();
  return `${platform}-${kind}-${stamp}.${ext}`;
}
