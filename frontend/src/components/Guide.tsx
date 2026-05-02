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
};

export function Guide({ platform }: { platform: Platform }) {
  const { t } = useI18n();
  const c = t.guide[platform];
  const examples = EXAMPLES[platform];

  return (
    <div className="rounded-2xl border border-slate-700/60 bg-slate-800/30 p-5 space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-slate-200 mb-1">{t.guide.title}</h3>
        <p className="text-sm text-slate-400">{c.intro}</p>
      </div>

      <ol className="space-y-2">
        {c.steps.map((step, i) => (
          <li key={i} className="flex gap-3 text-sm text-slate-300">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-500/20 text-xs font-semibold text-indigo-300">
              {i + 1}
            </span>
            <span className="pt-0.5">{step}</span>
          </li>
        ))}
      </ol>

      <div>
        <div className="text-xs font-medium uppercase tracking-wide text-slate-500 mb-2">{t.guide.examplesTitle}</div>
        <ul className="space-y-1.5">
          {examples.map((ex) => (
            <li key={ex.label} className="flex items-center gap-2 text-xs">
              <span className="rounded bg-slate-700/60 px-1.5 py-0.5 font-medium text-slate-300">{ex.label}</span>
              <code className="truncate text-slate-400">{ex.url}</code>
            </li>
          ))}
        </ul>
      </div>

      {c.warnings.length > 0 && (
        <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 px-3 py-2 space-y-1">
          {c.warnings.map((w, i) => (
            <p key={i} className="text-xs text-amber-200/90">⚠ {w}</p>
          ))}
        </div>
      )}
    </div>
  );
}
