import type { Platform } from '../types';
import { useI18n } from '../lib/i18n';

const EXAMPLES: Record<Platform, { label: string; url: string }[]> = {
  instagram: [
    { label: 'Reel', url: 'https://www.instagram.com/reel/ABCxyz123/' },
    { label: 'Post', url: 'https://www.instagram.com/p/ABCxyz123/' },
    { label: 'IGTV', url: 'https://www.instagram.com/tv/ABCxyz123/' },
  ],
  facebook: [
    { label: 'Post', url: 'https://www.facebook.com/<page>/posts/123456789' },
    { label: 'Video', url: 'https://www.facebook.com/watch?v=123456789' },
    { label: 'Reel', url: 'https://www.facebook.com/reel/123456789' },
    { label: 'fb.watch', url: 'https://fb.watch/AbCdEfGh/' },
  ],
  tiktok: [
    { label: 'Video', url: 'https://www.tiktok.com/@user/video/1234567890' },
    { label: 'Photo', url: 'https://www.tiktok.com/@user/photo/1234567890' },
    { label: 'Short', url: 'https://vm.tiktok.com/ABCxyz/' },
  ],
};

export function Guide({ platform }: { platform: Platform }) {
  const { t } = useI18n();
  const c = t.guide[platform];
  const examples = EXAMPLES[platform];

  return (
    <div className="rounded-2xl border border-border-subtle bg-bg-raised p-4 sm:p-5 space-y-3 sm:space-y-4 shadow-card">
      <div>
        <h3 className="text-sm font-semibold text-fg mb-1">{t.guide.title}</h3>
        <p className="text-sm text-fg-muted">{c.intro}</p>
      </div>

      <ol className="space-y-2">
        {c.steps.map((step, i) => (
          <li key={i} className="flex gap-3 text-sm text-fg-secondary">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent/15 text-xs font-semibold text-accent">
              {i + 1}
            </span>
            <span className="pt-0.5">{step}</span>
          </li>
        ))}
      </ol>

      <div>
        <div className="text-xs font-medium uppercase tracking-wide text-fg-muted mb-2">{t.guide.examplesTitle}</div>
        <ul className="space-y-1.5">
          {examples.map((ex) => (
            <li key={ex.label} className="flex items-center gap-2 text-xs">
              <span className="rounded bg-bg-sunken px-1.5 py-0.5 font-medium text-fg-secondary">{ex.label}</span>
              <code className="truncate text-fg-muted">{ex.url}</code>
            </li>
          ))}
        </ul>
      </div>

      {c.warnings.length > 0 && (
        <div className="rounded-lg bg-warning/10 border border-warning/30 px-3 py-2 space-y-1">
          {c.warnings.map((w, i) => (
            <p key={i} className="text-xs text-warning">⚠ {w}</p>
          ))}
        </div>
      )}
    </div>
  );
}
