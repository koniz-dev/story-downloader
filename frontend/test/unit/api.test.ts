import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const WORKER_URL = 'https://worker.example';

describe('api (with VITE_WORKER_URL configured)', () => {
  let fetchSpy: ReturnType<typeof vi.fn>;
  let api: typeof import('../../src/lib/api');

  beforeEach(async () => {
    vi.resetModules();
    // Capture-at-module-load means env must be set BEFORE the import.
    vi.stubEnv('VITE_WORKER_URL', WORKER_URL);
    fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);
    api = await import('../../src/lib/api');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  describe('resolveMedia', () => {
    it('returns the parsed body on 200', async () => {
      const body = {
        platform: 'instagram',
        kind: 'reel',
        mediaItems: [{ type: 'video', url: 'https://cdn/a.mp4' }],
      };
      fetchSpy.mockResolvedValueOnce(
        new Response(JSON.stringify(body), { status: 200 }),
      );
      const res = await api.resolveMedia('https://insta/r/1');
      expect(res).toEqual(body);
      expect(fetchSpy).toHaveBeenCalledWith(
        `${WORKER_URL}/api/resolve`,
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ url: 'https://insta/r/1' }),
        }),
      );
    });

    it('throws ApiError with body fields on 4xx with JSON body', async () => {
      const errBody = {
        error: 'Login required',
        code: 'NEED_AUTH',
        params: { platform: 'instagram' },
        requestId: 'req-abc-1',
      };
      fetchSpy.mockResolvedValueOnce(
        new Response(JSON.stringify(errBody), { status: 401 }),
      );
      try {
        await api.resolveMedia('https://insta/r/x');
        throw new Error('should have thrown');
      } catch (e) {
        expect(e).toBeInstanceOf(api.ApiError);
        const ae = e as InstanceType<typeof api.ApiError>;
        expect(ae.message).toBe('Login required');
        expect(ae.code).toBe('NEED_AUTH');
        expect(ae.params).toEqual({ platform: 'instagram' });
        expect(ae.requestId).toBe('req-abc-1');
      }
    });

    it('falls back to X-Request-Id header when body is empty', async () => {
      fetchSpy.mockResolvedValueOnce(
        new Response('', {
          status: 502,
          headers: { 'X-Request-Id': 'req-from-header' },
        }),
      );
      try {
        await api.resolveMedia('https://insta/r/y');
        throw new Error('should have thrown');
      } catch (e) {
        expect(e).toBeInstanceOf(api.ApiError);
        const ae = e as InstanceType<typeof api.ApiError>;
        expect(ae.requestId).toBe('req-from-header');
        expect(ae.code).toBe('WORKER_HTTP_ERROR');
        expect(ae.message).toBe('Worker returned 502');
        // No body.code → params populated from status.
        expect(ae.params).toEqual({ status: 502 });
      }
    });

    it('prefers body.requestId over the header when both are present', async () => {
      fetchSpy.mockResolvedValueOnce(
        new Response(JSON.stringify({ requestId: 'req-from-body' }), {
          status: 500,
          headers: { 'X-Request-Id': 'req-from-header' },
        }),
      );
      try {
        await api.resolveMedia('https://insta/r/z');
        throw new Error('should have thrown');
      } catch (e) {
        const ae = e as InstanceType<typeof api.ApiError>;
        expect(ae.requestId).toBe('req-from-body');
      }
    });

    it('throws ApiError with NETWORK_ERROR when fetch rejects', async () => {
      fetchSpy.mockRejectedValueOnce(new TypeError('connection refused'));
      try {
        await api.resolveMedia('https://insta/r/w');
        throw new Error('should have thrown');
      } catch (e) {
        expect(e).toBeInstanceOf(api.ApiError);
        const ae = e as InstanceType<typeof api.ApiError>;
        expect(ae.code).toBe('NETWORK_ERROR');
        expect(ae.message).toBe('connection refused');
      }
    });

    it('forwards the abort signal to fetch', async () => {
      fetchSpy.mockResolvedValueOnce(new Response('{}', { status: 200 }));
      const ctrl = new AbortController();
      await api.resolveMedia('https://insta/r/sig', ctrl.signal).catch(() => {});
      expect(fetchSpy).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ signal: ctrl.signal }),
      );
    });
  });

  describe('proxyUrl', () => {
    it('builds /api/proxy?url=... with the worker base', () => {
      const u = api.proxyUrl('https://cdn.example/file.mp4');
      expect(u).toBe(`${WORKER_URL}/api/proxy?url=https%3A%2F%2Fcdn.example%2Ffile.mp4`);
    });

    it('appends &filename=... when given', () => {
      const u = api.proxyUrl('https://cdn.example/a b.mp4', 'nice name.mp4');
      // URLSearchParams encodes spaces as '+'; both pieces are present.
      expect(u).toMatch(/^https:\/\/worker\.example\/api\/proxy\?/);
      expect(u).toContain('url=https%3A%2F%2Fcdn.example%2Fa+b.mp4');
      expect(u).toContain('filename=nice+name.mp4');
    });
  });
});

describe('api (without VITE_WORKER_URL)', () => {
  let api: typeof import('../../src/lib/api');

  beforeEach(async () => {
    vi.resetModules();
    // Re-import with an empty env to trigger the NO_WORKER_URL branch.
    vi.stubEnv('VITE_WORKER_URL', '');
    api = await import('../../src/lib/api');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('throws NO_WORKER_URL when called without configuration', async () => {
    try {
      await api.resolveMedia('https://insta/r/n');
      throw new Error('should have thrown');
    } catch (e) {
      expect(e).toBeInstanceOf(api.ApiError);
      const ae = e as InstanceType<typeof api.ApiError>;
      expect(ae.code).toBe('NO_WORKER_URL');
      expect(ae.message).toMatch(/VITE_WORKER_URL/);
    }
  });
});
