import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  readStored,
  systemPrefersDark,
  resolve,
  syncThemeColorMeta,
} from '../../src/lib/theme';

const LIGHT_BG = '#fafafc';
const DARK_BG = '#020617';

function metas(): HTMLMetaElement[] {
  return Array.from(
    document.head.querySelectorAll('meta[name="theme-color"]'),
  ) as HTMLMetaElement[];
}

// HTMLMetaElement.media IDL is a recent addition not implemented by jsdom,
// so read via the attribute API which is universal.
function mediaOf(m: HTMLMetaElement): string {
  return m.getAttribute('media') ?? '';
}

function setMatchMedia(matchesDark: boolean) {
  const listeners: Array<(ev: MediaQueryListEvent) => void> = [];
  const mql = {
    matches: matchesDark,
    media: '(prefers-color-scheme: dark)',
    onchange: null,
    addEventListener: (_: string, fn: (ev: MediaQueryListEvent) => void) => {
      listeners.push(fn);
    },
    removeEventListener: (_: string, fn: (ev: MediaQueryListEvent) => void) => {
      const i = listeners.indexOf(fn);
      if (i >= 0) listeners.splice(i, 1);
    },
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  };
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    writable: true,
    value: vi.fn().mockReturnValue(mql),
  });
}

beforeEach(() => {
  document.head.innerHTML = '';
  localStorage.clear();
});

afterEach(() => {
  document.head.innerHTML = '';
  localStorage.clear();
});

describe('readStored', () => {
  it('returns "system" when localStorage has nothing for the key', () => {
    expect(readStored()).toBe('system');
  });

  it.each(['light', 'dark', 'system'] as const)(
    'returns "%s" when stored',
    (v) => {
      localStorage.setItem('sd.theme', v);
      expect(readStored()).toBe(v);
    },
  );

  it('returns "system" when the stored value is garbage', () => {
    localStorage.setItem('sd.theme', 'mauve');
    expect(readStored()).toBe('system');
  });

  it('returns "system" when localStorage.getItem throws (Safari private mode, Firefox block-cookies)', () => {
    // Safari private mode and Firefox with "block cookies" both throw on
    // Storage access — the Storage object exists but its methods reject.
    // The previous implementation would crash the whole app because the
    // error bubbled out of useState's initializer.
    const originalGetItem = window.localStorage.getItem;
    window.localStorage.getItem = () => {
      throw new Error('SecurityError: storage access denied');
    };
    try {
      expect(readStored()).toBe('system');
    } finally {
      window.localStorage.getItem = originalGetItem;
    }
  });
});

describe('systemPrefersDark', () => {
  it('returns true when matchMedia reports dark', () => {
    setMatchMedia(true);
    expect(systemPrefersDark()).toBe(true);
  });

  it('returns false when matchMedia reports light', () => {
    setMatchMedia(false);
    expect(systemPrefersDark()).toBe(false);
  });
});

describe('resolve', () => {
  it('"dark" → "dark"', () => {
    expect(resolve('dark')).toBe('dark');
  });
  it('"light" → "light"', () => {
    expect(resolve('light')).toBe('light');
  });
  it('"system" follows matchMedia (dark)', () => {
    setMatchMedia(true);
    expect(resolve('system')).toBe('dark');
  });
  it('"system" follows matchMedia (light)', () => {
    setMatchMedia(false);
    expect(resolve('system')).toBe('light');
  });
});

describe('syncThemeColorMeta', () => {
  it('"system" inserts two media-scoped theme-color metas', () => {
    syncThemeColorMeta('system', 'light');
    const m = metas();
    expect(m).toHaveLength(2);
    const light = m.find((x) => mediaOf(x).includes('light'));
    const dark = m.find((x) => mediaOf(x).includes('dark'));
    expect(light?.content).toBe(LIGHT_BG);
    expect(dark?.content).toBe(DARK_BG);
  });

  it('"dark" replaces media-scoped metas with a single media-less dark meta', () => {
    syncThemeColorMeta('system', 'light');
    syncThemeColorMeta('dark', 'dark');
    const m = metas();
    expect(m).toHaveLength(1);
    expect(m[0].getAttribute('media')).toBeNull();
    expect(m[0].content).toBe(DARK_BG);
  });

  it('"light" replaces media-scoped metas with a single media-less light meta', () => {
    syncThemeColorMeta('system', 'light');
    syncThemeColorMeta('light', 'light');
    const m = metas();
    expect(m).toHaveLength(1);
    expect(m[0].getAttribute('media')).toBeNull();
    expect(m[0].content).toBe(LIGHT_BG);
  });

  it('system → dark → system restores both media-scoped metas', () => {
    syncThemeColorMeta('system', 'light');
    expect(metas()).toHaveLength(2);
    syncThemeColorMeta('dark', 'dark');
    expect(metas()).toHaveLength(1);
    syncThemeColorMeta('system', 'light');
    const m = metas();
    expect(m).toHaveLength(2);
    expect(m.some((x) => mediaOf(x).includes('light') && x.content === LIGHT_BG)).toBe(true);
    expect(m.some((x) => mediaOf(x).includes('dark') && x.content === DARK_BG)).toBe(true);
  });

  it('is idempotent in system mode — does not duplicate metas on repeat call', () => {
    syncThemeColorMeta('system', 'light');
    syncThemeColorMeta('system', 'light');
    expect(metas()).toHaveLength(2);
  });
});
