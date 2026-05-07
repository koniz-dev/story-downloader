import { createContext, createElement, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Locale, Translations } from './types';
import { en } from './en';
import { vi } from './vi';
import { ja } from './ja';
import { ko } from './ko';
import { zh } from './zh';

export { LOCALES } from './types';
export type { Locale, Translations } from './types';

const DICTS: Record<Locale, Translations> = { en, vi, ja, ko, zh };

function isLocale(v: string | null | undefined): v is Locale {
  return v === 'en' || v === 'vi' || v === 'ja' || v === 'ko' || v === 'zh';
}

function getBase(): string {
  const raw = (import.meta.env.BASE_URL ?? '/') as string;
  return raw.replace(/\/+$/, '');
}

// Each locale ships its own pre-rendered HTML, so the URL path is the source
// of truth. `/<base>/` → en, `/<base>/<locale>/` → that locale.
function detectLocale(): Locale {
  if (typeof window === 'undefined') return 'en';
  const base = getBase();
  let after = window.location.pathname;
  if (base && after.startsWith(base)) after = after.slice(base.length);
  const seg = after.split('/').filter(Boolean)[0];
  return isLocale(seg) ? seg : 'en';
}

interface I18nContextValue {
  locale: Locale;
  t: Translations;
  setLocale: (l: Locale) => void;
}

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale] = useState<Locale>(detectLocale);

  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.lang = locale;
    }
  }, [locale]);

  const value = useMemo<I18nContextValue>(
    () => ({
      locale,
      t: DICTS[locale],
      setLocale: (next: Locale) => {
        if (next === locale || typeof window === 'undefined') return;
        const base = getBase();
        const target = next === 'en' ? `${base}/` : `${base}/${next}/`;
        window.location.assign(target);
      },
    }),
    [locale],
  );

  return createElement(I18nContext.Provider, { value }, children);
}

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used within I18nProvider');
  return ctx;
}

export function format(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, k: string) =>
    Object.prototype.hasOwnProperty.call(vars, k) ? String(vars[k]) : `{${k}}`,
  );
}

export function platformName(t: Translations, p: 'instagram' | 'facebook'): string {
  return t.platform[p].name;
}

export function kindName(t: Translations, k: 'reel' | 'post' | 'video' | 'story'): string {
  return t.kind[k];
}
