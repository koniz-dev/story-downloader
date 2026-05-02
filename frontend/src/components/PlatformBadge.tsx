import type { Platform, ContentKind } from '../types';
import { platformLabel, kindLabel } from '../lib/platform';
import { PlatformIcon } from './PlatformIcon';

export function PlatformBadge({ platform, kind }: { platform: Platform; kind?: ContentKind }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-800/80 border border-slate-700/60 px-2.5 py-1 text-xs font-medium text-slate-200">
      <PlatformIcon platform={platform} className="h-3.5 w-3.5" />
      {platformLabel(platform)}
      {kind && <span className="text-slate-500">·</span>}
      {kind && <span className="text-slate-400">{kindLabel(kind)}</span>}
    </span>
  );
}
