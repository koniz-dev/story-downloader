import type { Platform, ContentKind } from '../types';
import { format, useI18n } from '../lib/i18n';
import { PlatformBadge } from './PlatformBadge';

interface Props {
  platform: Platform;
  kind: ContentKind;
  count: number;
  onDownloadAll?: () => void;
}

export function ResultsHeader({ platform, kind, count, onDownloadAll }: Props) {
  const { t } = useI18n();
  return (
    <div className="flex flex-wrap items-center gap-2 sm:gap-3">
      <PlatformBadge platform={platform} kind={kind} />
      <span className="text-sm text-fg-muted">{format(t.result.found, { n: count })}</span>
      {onDownloadAll && (
        <button
          type="button"
          onClick={onDownloadAll}
          className="ml-auto inline-flex items-center gap-1.5 rounded-full border border-accent/30 bg-accent/10 hover:bg-accent/20 px-3 py-1.5 min-h-[36px] text-xs font-semibold text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ring transition-colors motion-reduce:transition-none"
        >
          <DownloadAllIcon className="h-3.5 w-3.5" />
          {t.result.downloadAll}
        </button>
      )}
    </div>
  );
}

function DownloadAllIcon({ className }: { className?: string }) {
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
