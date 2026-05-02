import type { Platform } from '../types';
import { platformLabel } from '../lib/platform';

export function PlatformBadge({ platform }: { platform: Platform }) {
  const cls = platform === 'instagram' ? 'bg-instagram' : 'bg-facebook';
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold text-white ${cls}`}>
      {platformLabel(platform)}
    </span>
  );
}
