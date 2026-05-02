import { LOCALES, useI18n, type Locale } from '../lib/i18n';

export function LanguageSelector() {
  const { locale, setLocale, t } = useI18n();

  return (
    <label className="flex items-center gap-2 text-xs text-slate-400">
      <span className="sr-only sm:not-sr-only">{t.language.label}</span>
      <span aria-hidden="true">🌐</span>
      <select
        value={locale}
        onChange={(e) => setLocale(e.target.value as Locale)}
        aria-label={t.language.label}
        className="rounded-lg border border-slate-700/60 bg-slate-800/60 px-2 py-1.5 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-400/60"
      >
        {LOCALES.map((l) => (
          <option key={l.code} value={l.code} className="bg-slate-900 text-slate-100">
            {l.name}
          </option>
        ))}
      </select>
    </label>
  );
}
