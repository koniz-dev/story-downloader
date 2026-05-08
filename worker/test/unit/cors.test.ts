import { describe, it, expect } from 'vitest';
import { corsHeaders, handlePreflight } from '../../src/cors';
import type { Env } from '../../src/types';

const ENV: Env = {
  ALLOWED_ORIGINS: 'http://localhost:5173,https://koniz-dev.github.io',
};

function req(origin: string | null, method = 'POST'): Request {
  const headers: Record<string, string> = {};
  if (origin !== null) headers.Origin = origin;
  return new Request('https://example.com/api/resolve', { method, headers });
}

describe('corsHeaders', () => {
  it('echoes back exact-match allowed origin', () => {
    const h = corsHeaders(req('https://koniz-dev.github.io'), ENV) as Record<string, string>;
    expect(h['Access-Control-Allow-Origin']).toBe('https://koniz-dev.github.io');
  });

  it('echoes back localhost dev origin', () => {
    const h = corsHeaders(req('http://localhost:5173'), ENV) as Record<string, string>;
    expect(h['Access-Control-Allow-Origin']).toBe('http://localhost:5173');
  });

  it('omits ACAO for unknown origins', () => {
    const h = corsHeaders(req('https://attacker.com'), ENV) as Record<string, string>;
    expect(h['Access-Control-Allow-Origin']).toBeUndefined();
  });

  it('omits ACAO for sibling github.io subdomain', () => {
    // Tightening from the original `*.github.io` wildcard to a specific URL
    // means rogue github.io repos no longer get free CORS.
    const h = corsHeaders(req('https://attacker.github.io'), ENV) as Record<string, string>;
    expect(h['Access-Control-Allow-Origin']).toBeUndefined();
  });

  it('omits ACAO when no Origin header is sent', () => {
    const h = corsHeaders(req(null), ENV) as Record<string, string>;
    expect(h['Access-Control-Allow-Origin']).toBeUndefined();
  });

  it('always sets Vary: Origin and method/header allowlists', () => {
    const h = corsHeaders(req('https://anything.com'), ENV) as Record<string, string>;
    expect(h['Vary']).toBe('Origin');
    expect(h['Access-Control-Allow-Methods']).toContain('POST');
    expect(h['Access-Control-Allow-Headers']).toContain('Content-Type');
  });

  describe('with wildcard pattern', () => {
    const ENV_WILD: Env = { ALLOWED_ORIGINS: 'https://*.github.io' };

    it('matches any github.io subdomain when the pattern allows it', () => {
      const h = corsHeaders(req('https://anything.github.io'), ENV_WILD) as Record<string, string>;
      expect(h['Access-Control-Allow-Origin']).toBe('https://anything.github.io');
    });

    it('does NOT match through prefix injection', () => {
      // Because the regex is anchored at the host (^https://...$), a fully
      // qualified rogue origin can't sneak the pattern in via path.
      const h = corsHeaders(req('https://github.io.evil.com'), ENV_WILD) as Record<string, string>;
      expect(h['Access-Control-Allow-Origin']).toBeUndefined();
    });
  });
});

describe('handlePreflight', () => {
  it('returns 204 for OPTIONS', () => {
    const res = handlePreflight(req('https://koniz-dev.github.io', 'OPTIONS'), ENV);
    expect(res?.status).toBe(204);
  });

  it('returns null for non-OPTIONS', () => {
    expect(handlePreflight(req('https://koniz-dev.github.io', 'GET'), ENV)).toBeNull();
    expect(handlePreflight(req('https://koniz-dev.github.io', 'POST'), ENV)).toBeNull();
  });
});
