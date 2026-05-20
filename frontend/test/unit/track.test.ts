import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const WORKER = 'https://worker.example';

// Each scenario re-imports track.ts so the TRACK_URL module-load constant
// picks up the env we want. Mirror of the pattern used in api.test.ts.
async function loadTrack(envWorkerUrl: string) {
  vi.resetModules();
  vi.stubEnv('VITE_WORKER_URL', envWorkerUrl);
  return (await import('../../src/lib/track')).track;
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe('track()', () => {
  let consoleLog: ReturnType<typeof vi.spyOn>;
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    consoleLog = vi.spyOn(console, 'log').mockImplementation(() => {});
    fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
    vi.stubGlobal('fetch', fetchMock);
  });

  it('always logs the payload to console', async () => {
    const track = await loadTrack(WORKER);
    track({ event: 'platform.select', platform: 'instagram' });
    expect(consoleLog).toHaveBeenCalledWith(
      '[track]',
      JSON.stringify({ event: 'platform.select', platform: 'instagram' }),
    );
  });

  it('posts via fetch with text/plain + credentials omit + keepalive', async () => {
    const track = await loadTrack(WORKER);
    track({ event: 'resolve.start', platform: 'facebook' });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(`${WORKER}/api/track`);
    expect(init.method).toBe('POST');
    // text/plain is CORS-safelisted — no preflight, no ACAC check.
    expect((init.headers as Record<string, string>)['Content-Type']).toBe(
      'text/plain;charset=UTF-8',
    );
    // credentials:'omit' is the whole point of dropping sendBeacon (which
    // hardcoded credentials:'include' and tripped CORS preflight).
    expect(init.credentials).toBe('omit');
    expect(init.keepalive).toBe(true);
    expect(init.body).toBe(
      JSON.stringify({ event: 'resolve.start', platform: 'facebook' }),
    );
  });

  it('does not fetch when VITE_WORKER_URL is empty (console-only)', async () => {
    const track = await loadTrack('');
    track({ event: 'platform.select', platform: 'instagram' });
    expect(consoleLog).toHaveBeenCalledTimes(1);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('swallows fetch rejections (analytics never throws into UX)', async () => {
    fetchMock.mockRejectedValue(new Error('network down'));
    const track = await loadTrack(WORKER);
    expect(() =>
      track({ event: 'resolve.fail', platform: 'tiktok', code: 'BOOM', ms: 100 }),
    ).not.toThrow();
  });

  it('swallows synchronous fetch throw (e.g. blocked by extension)', async () => {
    fetchMock.mockImplementation(() => {
      throw new Error('blocked by extension');
    });
    const track = await loadTrack(WORKER);
    expect(() => track({ event: 'bulk.start', count: 3 })).not.toThrow();
  });
});
