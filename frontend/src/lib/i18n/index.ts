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
const STORAGE_KEY = 'sd.locale';

function isLocale(v: string | null): v is Locale {
  return v === 'en' || v === 'vi' || v === 'ja' || v === 'ko' || v === 'zh';
}

function detectLocale(): Locale {
  if (typeof localStorage !== 'undefined') {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (isLocale(saved)) return saved;
  }
  if (typeof navigator !== 'undefined' && navigator.language) {
    const tag = navigator.language.toLowerCase();
    if (tag.startsWith('vi')) return 'vi';
    if (tag.startsWith('ja')) return 'ja';
    if (tag.startsWith('ko')) return 'ko';
    if (tag.startsWith('zh')) return 'zh';
  }
  return 'en';
}

interface I18nContextValue {
  locale: Locale;
  t: Translations;
  setLocale: (l: Locale) => void;
}

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocale] = useState<Locale>(detectLocale);

  useEffect(() => {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, locale);
    }
    if (typeof document !== 'undefined') {
      document.documentElement.lang = locale;
    }
  }, [locale]);

  const value = useMemo<I18nContextValue>(
    () => ({ locale, t: DICTS[locale], setLocale }),
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
