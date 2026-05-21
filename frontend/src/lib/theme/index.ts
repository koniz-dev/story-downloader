import {
  createContext,
  createElement,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

export type Theme = 'light' | 'dark' | 'system';
export type Resolved = 'light' | 'dark';

const STORAGE_KEY = 'sd.theme';
const LIGHT_BG = '#fafafc';
const DARK_BG = '#020617';

export function readStored(): Theme {
  // Safari private mode + Firefox "block cookies" throw on Storage access.
  // Treat any failure as "no preference saved" so the app still boots.
  try {
    if (typeof localStorage === 'undefined') return 'system';
    const v = localStorage.getItem(STORAGE_KEY);
    return v === 'light' || v === 'dark' || v === 'system' ? v : 'system';
  } catch {
    return 'system';
  }
}

export function systemPrefersDark(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-color-scheme: dark)').matches
  );
}

export function resolve(theme: Theme): Resolved {
  if (theme === 'dark') return 'dark';
  if (theme === 'light') return 'light';
  return systemPrefersDark() ? 'dark' : 'light';
}

// When the user picks a manual theme, the dual `<meta name="theme-color"
// media="(prefers-color-scheme: …)">` tags would still let the OS-preferred
// color win. Replace them with a single overriding meta. When user switches
// back to 'system', restore the dual tags so the OS preference is honored.
export function syncThemeColorMeta(theme: Theme, resolved: Resolved) {
  if (typeof document === 'undefined') return;
  const head = document.head;
  const existing = Array.from(
    head.querySelectorAll('meta[name="theme-color"]'),
  ) as HTMLMetaElement[];

  if (theme === 'system') {
    // HTMLMetaElement.media is a recent IDL addition (added for the
    // theme-color spec) — jsdom and older browsers don't expose it as a
    // property. Read/write via attribute APIs instead, which work everywhere.
    const hasLightMedia = existing.some((m) => (m.getAttribute('media') ?? '').includes('light'));
    const hasDarkMedia = existing.some((m) => (m.getAttribute('media') ?? '').includes('dark'));
    if (hasLightMedia && hasDarkMedia && existing.length === 2) return;
    existing.forEach((m) => m.remove());
    const lightMeta = document.createElement('meta');
    lightMeta.name = 'theme-color';
    lightMeta.setAttribute('media', '(prefers-color-scheme: light)');
    lightMeta.content = LIGHT_BG;
    const darkMeta = document.createElement('meta');
    darkMeta.name = 'theme-color';
    darkMeta.setAttribute('media', '(prefers-color-scheme: dark)');
    darkMeta.content = DARK_BG;
    head.append(lightMeta, darkMeta);
    return;
  }

  // Manual override: replace with a single, media-less meta tag.
  existing.forEach((m) => m.remove());
  const meta = document.createElement('meta');
  meta.name = 'theme-color';
  meta.content = resolved === 'dark' ? DARK_BG : LIGHT_BG;
  head.append(meta);
}

function applyDom(resolved: Resolved) {
  if (typeof document === 'undefined') return;
  document.documentElement.classList.toggle('dark', resolved === 'dark');
}

interface ThemeContextValue {
  theme: Theme;
  resolved: Resolved;
  setTheme: (next: Theme) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(readStored);
  const [resolved, setResolved] = useState<Resolved>(() => resolve(readStored()));

  // Apply DOM + theme-color meta on every theme change.
  useEffect(() => {
    const r = resolve(theme);
    setResolved(r);
    applyDom(r);
    syncThemeColorMeta(theme, r);
  }, [theme]);

  // Listen to system changes only when in 'system' mode.
  useEffect(() => {
    if (theme !== 'system') return;
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => {
      const r = resolve('system');
      setResolved(r);
      applyDom(r);
    };
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [theme]);

  const setTheme = useCallback((next: Theme) => {
    setThemeState(next);
    if (typeof localStorage === 'undefined') return;
    // QuotaExceededError (Safari private) / SecurityError (Firefox block-
    // cookies) must not bubble out — the in-memory theme switch already
    // worked; persistence is best-effort.
    try {
      if (next === 'system') localStorage.removeItem(STORAGE_KEY);
      else localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // swallow
    }
  }, []);

  const value = useMemo<ThemeContextValue>(
    () => ({ theme, resolved, setTheme }),
    [theme, resolved, setTheme],
  );

  return createElement(ThemeContext.Provider, { value }, children);
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
