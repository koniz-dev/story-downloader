// Integration tests run inside a real workerd isolate via @cloudflare/vitest-pool-workers.
// Outbound-fetch mocking (`fetchMock`) was removed in v0.16; we only cover
// behaviour that doesn't require mocking an external response. The cases we
// can't test here (resolve-success path, proxy-stream path) are exercised by
// the production stress tests against the deployed worker.

import { describe, it, expect } from 'vitest';
import { SELF } from 'cloudflare:test';

const BASE = 'http://example.com';
const ALLOWED_ORIGIN = 'https://koniz-dev.github.io';

function jsonRequest(path: string, body: unknown, ipOverride?: string): Request {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (ipOverride) headers['cf-connecting-ip'] = ipOverride;
  return new Request(`${BASE}${path}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
}

describe('GET /api/health', () => {
  it('returns 200 with ok:true', async () => {
    const res = await SELF.fetch(`${BASE}/api/health`);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
  });
});

describe('CORS', () => {
  it('OPTIONS from allowed origin returns 204 with ACAO', async () => {
    const res = await SELF.fetch(
      new Request(`${BASE}/api/resolve`, {
        method: 'OPTIONS',
        headers: { Origin: ALLOWED_ORIGIN, 'Access-Control-Request-Method': 'POST' },
      }),
    );
    expect(res.status).toBe(204);
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe(ALLOWED_ORIGIN);
  });

  it('OPTIONS from rogue github.io subdomain omits ACAO', async () => {
    const res = await SELF.fetch(
      new Request(`${BASE}/api/resolve`, {
        method: 'OPTIONS',
        headers: { Origin: 'https://attacker.github.io', 'Access-Control-Request-Method': 'POST' },
      }),
    );
    expect(res.status).toBe(204);
    expect(res.headers.get('Access-Control-Allow-Origin')).toBeNull();
  });

  it('GET from allowed origin sets ACAO + Vary on responses', async () => {
    const res = await SELF.fetch(
      new Request(`${BASE}/api/health`, {
        headers: { Origin: ALLOWED_ORIGIN },
      }),
    );
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe(ALLOWED_ORIGIN);
    expect(res.headers.get('Vary')).toBe('Origin');
  });
});

describe('POST /api/resolve — input validation', () => {
  it('rejects missing body field', async () => {
    const res = await SELF.fetch(jsonRequest('/api/resolve', {}, '203.0.113.100'));
    expect(res.status).toBe(400);
    expect(((await res.json()) as { code: string }).code).toBe('MISSING_URL');
  });

  it('rejects URL string field with wrong type', async () => {
    const res = await SELF.fetch(jsonRequest('/api/resolve', { url: 12345 }, '203.0.113.101'));
    expect(res.status).toBe(400);
    expect(((await res.json()) as { code: string }).code).toBe('MISSING_URL');
  });

  it('rejects non-platform host (UNSUPPORTED_PLATFORM)', async () => {
    const res = await SELF.fetch(
      jsonRequest('/api/resolve', { url: 'https://example.com/x' }, '203.0.113.102'),
    );
    expect(res.status).toBe(400);
    expect(((await res.json()) as { code: string }).code).toBe('UNSUPPORTED_PLATFORM');
  });

  it('rejects unsupported TikTok subpath (INVALID_TIKTOK_URL)', async () => {
    const res = await SELF.fetch(
      jsonRequest(
        '/api/resolve',
        { url: 'https://www.tiktok.com/discover/foo' },
        '203.0.113.103',
      ),
    );
    expect(res.status).toBe(400);
    expect(((await res.json()) as { code: string }).code).toBe('INVALID_TIKTOK_URL');
  });

  it('rejects malformed JSON body', async () => {
    const res = await SELF.fetch(
      new Request(`${BASE}/api/resolve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{not-json',
      }),
    );
    expect(res.status).toBe(400);
    expect(((await res.json()) as { code: string }).code).toBe('MISSING_URL');
  });
});

describe('GET /api/proxy — input validation + whitelist', () => {
  it('rejects missing url param (MISSING_URL)', async () => {
    const res = await SELF.fetch(`${BASE}/api/proxy`);
    expect(res.status).toBe(400);
    expect(((await res.json()) as { code: string }).code).toBe('MISSING_URL');
  });

  it('rejects malformed url (INVALID_URL)', async () => {
    const res = await SELF.fetch(`${BASE}/api/proxy?url=not-a-url`);
    expect(res.status).toBe(400);
    expect(((await res.json()) as { code: string }).code).toBe('INVALID_URL');
  });

  it('rejects http:// (INVALID_PROTOCOL)', async () => {
    const res = await SELF.fetch(
      `${BASE}/api/proxy?url=${encodeURIComponent('http://www.cdninstagram.com/foo.mp4')}`,
    );
    expect(res.status).toBe(400);
    expect(((await res.json()) as { code: string }).code).toBe('INVALID_PROTOCOL');
  });

  it('rejects non-whitelisted host (HOST_NOT_ALLOWED)', async () => {
    const res = await SELF.fetch(
      `${BASE}/api/proxy?url=${encodeURIComponent('https://attacker.com/foo.mp4')}`,
    );
    expect(res.status).toBe(403);
    expect(((await res.json()) as { code: string }).code).toBe('HOST_NOT_ALLOWED');
  });
});

describe('Rate limiter', () => {
  // Each test uses a unique IP so windows don't overlap with sibling tests.
  function reqFromIP(ip: string, path: string, body: unknown): Request {
    return new Request(`${BASE}${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'cf-connecting-ip': ip,
      },
      body: JSON.stringify(body),
    });
  }

  it('blocks the 31st /api/resolve request from one IP', async () => {
    const ip = '203.0.113.1';
    let firstRateLimitedAt = -1;
    let lastCode = 0;
    for (let i = 1; i <= 33; i++) {
      const res = await SELF.fetch(reqFromIP(ip, '/api/resolve', { url: 'not-a-url' }));
      lastCode = res.status;
      if (res.status === 429 && firstRateLimitedAt === -1) firstRateLimitedAt = i;
    }
    expect(firstRateLimitedAt).toBe(31);
    expect(lastCode).toBe(429);
  });

  it('keeps separate buckets per IP', async () => {
    const a = '203.0.113.10';
    const b = '203.0.113.11';
    for (let i = 0; i < 30; i++) {
      await SELF.fetch(reqFromIP(a, '/api/resolve', { url: 'not-a-url' }));
    }
    expect(
      (await SELF.fetch(reqFromIP(a, '/api/resolve', { url: 'not-a-url' }))).status,
    ).toBe(429);
    // Different IP → fresh bucket → not 429
    expect(
      (await SELF.fetch(reqFromIP(b, '/api/resolve', { url: 'not-a-url' }))).status,
    ).not.toBe(429);
  });

  it('keeps separate buckets per route', async () => {
    const ip = '203.0.113.20';
    for (let i = 0; i < 30; i++) {
      await SELF.fetch(reqFromIP(ip, '/api/resolve', { url: 'not-a-url' }));
    }
    expect(
      (await SELF.fetch(reqFromIP(ip, '/api/resolve', { url: 'not-a-url' }))).status,
    ).toBe(429);
    // /api/proxy has a separate bucket
    const proxyRes = await SELF.fetch(
      new Request(`${BASE}/api/proxy`, {
        headers: { 'cf-connecting-ip': ip },
      }),
    );
    expect(proxyRes.status).not.toBe(429);
  });

  it('returns RATE_LIMITED with route param in body', async () => {
    const ip = '203.0.113.30';
    for (let i = 0; i < 30; i++) {
      await SELF.fetch(reqFromIP(ip, '/api/resolve', { url: 'not-a-url' }));
    }
    const blocked = await SELF.fetch(reqFromIP(ip, '/api/resolve', { url: 'not-a-url' }));
    expect(blocked.status).toBe(429);
    const body = (await blocked.json()) as { code: string; params?: { route?: string } };
    expect(body.code).toBe('RATE_LIMITED');
    expect(body.params?.route).toBe('/api/resolve');
  });
});

describe('Unknown routes', () => {
  it('GET /unknown returns 404', async () => {
    const res = await SELF.fetch(`${BASE}/unknown`);
    expect(res.status).toBe(404);
  });

  it('GET /api/health with PUT method returns 404', async () => {
    const res = await SELF.fetch(
      new Request(`${BASE}/api/health`, { method: 'PUT' }),
    );
    expect(res.status).toBe(404);
  });
});
