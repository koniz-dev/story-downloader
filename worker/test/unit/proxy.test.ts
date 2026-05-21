import { afterEach, describe, it, expect, vi } from 'vitest';
import { proxyMedia, sanitizeFilename } from '../../src/proxy';

describe('sanitizeFilename', () => {
  it('returns null for null/empty input', () => {
    expect(sanitizeFilename(null)).toBeNull();
    expect(sanitizeFilename('')).toBeNull();
  });

  it('passes through a clean filename', () => {
    expect(sanitizeFilename('khaby-video.mp4')).toBe('khaby-video.mp4');
    expect(sanitizeFilename('My Photo (2024).jpg')).toBe('My Photo (2024).jpg');
  });

  it('strips CR/LF (header injection)', () => {
    expect(sanitizeFilename('a\r\nX-Evil: true.mp4')).toBe('aX-Evil: true.mp4');
    expect(sanitizeFilename('foo\nbar')).toBe('foobar');
  });

  it('strips quote and backslash (quoted-string injection)', () => {
    expect(sanitizeFilename('a"b.mp4')).toBe('ab.mp4');
    expect(sanitizeFilename('a\\b.mp4')).toBe('ab.mp4');
  });

  it('strips semicolon (Content-Disposition param injection)', () => {
    expect(sanitizeFilename('video.mp4; filename*=utf-8\'\'evil.txt')).toBe(
      "video.mp4 filename*=utf-8''evil.txt",
    );
  });

  it('truncates to 120 characters', () => {
    const long = 'a'.repeat(200) + '.mp4';
    const result = sanitizeFilename(long);
    expect(result).not.toBeNull();
    expect(result!.length).toBe(120);
  });

  it('returns null if everything was stripped', () => {
    expect(sanitizeFilename('";\\')).toBeNull();
  });
});

describe('proxyMedia range passthrough', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('forwards inbound Range header to upstream fetch', async () => {
    const seen: { range?: string | null } = {};
    vi.stubGlobal(
      'fetch',
      vi.fn(async (_input: RequestInfo, init?: RequestInit) => {
        const headers = new Headers(init?.headers);
        seen.range = headers.get('Range');
        const res = new Response('partial', {
          status: 206,
          headers: {
            'Content-Type': 'video/mp4',
            'Content-Range': 'bytes 0-6/100',
            'Accept-Ranges': 'bytes',
            'Content-Length': '7',
          },
        });
        // The spec-default Response.url is "" — assertFinalHostAllowed runs
        // `new URL(res.url)` and would throw. Pin a URL the host whitelist
        // accepts (*.cdninstagram.com).
        Object.defineProperty(res, 'url', {
          value: 'https://scontent.cdninstagram.com/video.mp4',
          configurable: true,
        });
        return res;
      }),
    );

    const inbound = new Request('https://worker.local/api/proxy?url=x', {
      headers: { Range: 'bytes=0-6' },
    });
    const res = await proxyMedia(
      'https://scontent.cdninstagram.com/video.mp4',
      'clip.mp4',
      inbound,
    );

    expect(seen.range).toBe('bytes=0-6');
    expect(res.status).toBe(206);
    expect(res.headers.get('Content-Range')).toBe('bytes 0-6/100');
    expect(res.headers.get('Accept-Ranges')).toBe('bytes');
  });

  it('passes 200 + Accept-Ranges through when no Range was requested', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        const res = new Response('full', {
          status: 200,
          headers: {
            'Content-Type': 'video/mp4',
            'Accept-Ranges': 'bytes',
            'Content-Length': '4',
          },
        });
        Object.defineProperty(res, 'url', {
          value: 'https://scontent.cdninstagram.com/video.mp4',
          configurable: true,
        });
        return res;
      }),
    );

    const res = await proxyMedia(
      'https://scontent.cdninstagram.com/video.mp4',
      'clip.mp4',
    );
    expect(res.status).toBe(200);
    expect(res.headers.get('Accept-Ranges')).toBe('bytes');
    expect(res.headers.get('Content-Range')).toBeNull();
  });
});

describe('proxyMedia TikTok playAddr SSRF guard', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  function tikTokPageHtmlWithPlayAddr(playAddr: string): string {
    const data = {
      __DEFAULT_SCOPE__: {
        'webapp.video-detail': {
          itemInfo: {
            itemStruct: { video: { playAddr } },
          },
        },
      },
    };
    return `<!DOCTYPE html><html><body><script id="__UNIVERSAL_DATA_FOR_REHYDRATION__" type="application/json">${JSON.stringify(data)}</script></body></html>`;
  }

  it('refuses to fetch an off-CDN playAddr (would leak TikTok cookies)', async () => {
    // Simulate a doctored itemStruct that names attacker.com as the playAddr.
    // Without pre-fetch host validation we would open a TLS connection to
    // attacker.com with the harvested TikTok Set-Cookie values in the
    // request headers — by the time the post-fetch host check fires, the
    // cookies are already on the wire. The pre-fetch gate prevents that.
    const calls: string[] = [];
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo) => {
        const requestedUrl = typeof input === 'string' ? input : input.url;
        calls.push(requestedUrl);
        // First call: the TikTok page fetch. Return HTML with attacker
        // playAddr. Subsequent calls would only happen if the guard misses.
        const res = new Response(
          tikTokPageHtmlWithPlayAddr('https://attacker.example/exfil'),
          {
            status: 200,
            headers: {
              'Content-Type': 'text/html',
              'Set-Cookie': 'msToken=secret123; Path=/',
            },
          },
        );
        Object.defineProperty(res, 'url', {
          value: 'https://www.tiktok.com/@user/video/1234567890',
          configurable: true,
        });
        return res;
      }),
    );

    const inbound = new Request(
      'https://worker.local/api/proxy?url=https://www.tiktok.com/@user/video/1234567890',
      { headers: { 'cf-connecting-ip': '203.0.113.250' } },
    );
    await expect(
      proxyMedia(
        'https://www.tiktok.com/@user/video/1234567890',
        'clip.mp4',
        inbound,
      ),
    ).rejects.toMatchObject({ code: 'HOST_NOT_ALLOWED' });

    // Only the page fetch should have happened. The cookies-bearing CDN
    // fetch must NEVER have been attempted against attacker.example.
    expect(calls.every((u) => !u.includes('attacker.example'))).toBe(true);
  });

  it('refuses a playAddr served over http:// (no protocol downgrade)', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        const res = new Response(
          tikTokPageHtmlWithPlayAddr('http://v16-webapp-prime.tiktokcdn.com/video.mp4'),
          { status: 200, headers: { 'Content-Type': 'text/html' } },
        );
        Object.defineProperty(res, 'url', {
          value: 'https://www.tiktok.com/@user/video/1234567890',
          configurable: true,
        });
        return res;
      }),
    );

    const inbound = new Request(
      'https://worker.local/api/proxy?url=https://www.tiktok.com/@user/video/1234567890',
      { headers: { 'cf-connecting-ip': '203.0.113.251' } },
    );
    await expect(
      proxyMedia(
        'https://www.tiktok.com/@user/video/1234567890',
        null,
        inbound,
      ),
    ).rejects.toMatchObject({ code: 'HOST_NOT_ALLOWED' });
  });
});
