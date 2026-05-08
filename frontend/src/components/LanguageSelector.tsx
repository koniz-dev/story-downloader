import { LOCALES, useI18n, type Locale } from '../lib/i18n';

export function LanguageSelector() {
  const { locale, setLocale, t } = useI18n();

  return (
    <label className="flex items-center gap-2 text-xs text-fg-muted">
      <span className="sr-only">{t.language.label}</span>
      <span aria-hidden="true" className="hidden xs:inline">🌐</span>
      <select
        value={locale}
        onChange={(e) => setLocale(e.target.value as Locale)}
        aria-label={t.language.label}
        className="glass rounded-lg px-2 py-2 min-h-[40px] text-sm text-fg focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-ring"
      >
        {LOCALES.map((l) => (
          <option key={l.code} value={l.code} className="bg-bg-overlay text-fg">
            {l.name}
          </option>
        ))}
      </select>
    </label>
  );
}
