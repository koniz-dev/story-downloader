import type { Platform, ContentKind } from '../types';
import { useI18n } from '../lib/i18n';
import { PlatformIcon } from './PlatformIcon';

export function PlatformBadge({ platform, kind }: { platform: Platform; kind?: ContentKind }) {
  const { t } = useI18n();
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-bg-raised border border-border-subtle px-2.5 py-1 text-xs font-medium text-fg-secondary">
      <PlatformIcon platform={platform} className="h-3.5 w-3.5" />
      {t.platform[platform].name}
      {kind && <span className="text-fg-muted">·</span>}
      {kind && <span className="text-fg-muted">{t.kind[kind]}</span>}
    </span>
  );
}
