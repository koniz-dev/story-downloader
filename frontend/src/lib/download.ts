import { proxyUrl } from './api';
import type { MediaItem } from '../types';

export function downloadMedia(item: MediaItem): void {
  const filename = item.filename ?? defaultFilename(item);
  const href = proxyUrl(item.url, filename);
  const a = document.createElement('a');
  a.href = href;
  a.download = filename;
  a.rel = 'noopener noreferrer';
  document.body.appendChild(a);
  a.click();
  a.remove();
}

function defaultFilename(item: MediaItem): string {
  const ext = item.type === 'video' ? 'mp4' : 'jpg';
  const stamp = Date.now();
  return `story-${stamp}.${ext}`;
}
