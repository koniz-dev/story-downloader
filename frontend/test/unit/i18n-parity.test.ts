import { describe, it, expect } from 'vitest';
import { en } from '../../src/lib/i18n/en';
import { vi } from '../../src/lib/i18n/vi';
import { ja } from '../../src/lib/i18n/ja';
import { ko } from '../../src/lib/i18n/ko';
import { zh } from '../../src/lib/i18n/zh';

// Walks an object collecting all leaf paths (e.g. "platform.tiktok.name").
// Used to verify every locale defines exactly the same keys as English.
function collectKeyPaths(obj: unknown, prefix = ''): string[] {
  if (obj === null || typeof obj !== 'object') return [prefix];
  if (Array.isArray(obj)) return [`${prefix}[]`];
  const out: string[] = [];
  for (const k of Object.keys(obj)) {
    const path = prefix ? `${prefix}.${k}` : k;
    out.push(...collectKeyPaths((obj as Record<string, unknown>)[k], path));
  }
  return out.sort();
}

const reference = collectKeyPaths(en);

describe('i18n locale parity', () => {
  it.each([
    ['vi', vi],
    ['ja', ja],
    ['ko', ko],
    ['zh', zh],
  ] as const)('%s has the same key paths as en', (_name, dict) => {
    expect(collectKeyPaths(dict)).toEqual(reference);
  });

  it.each([
    ['en', en],
    ['vi', vi],
    ['ja', ja],
    ['ko', ko],
    ['zh', zh],
  ] as const)('%s has all 3 platform names + kinds', (_name, dict) => {
    expect(dict.platform.instagram.name).toBeTruthy();
    expect(dict.platform.facebook.name).toBeTruthy();
    expect(dict.platform.tiktok.name).toBeTruthy();
    expect(dict.platform.instagram.kinds).toBeTruthy();
    expect(dict.platform.facebook.kinds).toBeTruthy();
    expect(dict.platform.tiktok.kinds).toBeTruthy();
  });

  it.each([
    ['en', en],
    ['vi', vi],
    ['ja', ja],
    ['ko', ko],
    ['zh', zh],
  ] as const)('%s has all 6 TikTok server-error codes', (_name, dict) => {
    const e = dict.serverError;
    expect(e.INVALID_TIKTOK_URL).toBeTruthy();
    expect(e.TIKTOK_NO_MEDIA).toBeTruthy();
    expect(e.TIKTOK_RATE_LIMITED).toBeTruthy();
    expect(e.TIKTOK_NOT_FOUND).toBeTruthy();
    expect(e.TIKTOK_FETCH_FAILED).toBeTruthy();
    expect(e.TIKTOK_GEO_BLOCKED).toBeTruthy();
  });
});
