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
