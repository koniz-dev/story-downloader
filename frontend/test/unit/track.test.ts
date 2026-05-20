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
  let sendBeaconMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    consoleLog = vi.spyOn(console, 'log').mockImplementation(() => {});
    fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
    vi.stubGlobal('fetch', fetchMock);
    sendBeaconMock = vi.fn(() => true);
    vi.stubGlobal('navigator', { sendBeacon: sendBeaconMock });
  });

  it('always logs the payload to console', async () => {
    const track = await loadTrack(WORKER);
    track({ event: 'platform.select', platform: 'instagram' });
    expect(consoleLog).toHaveBeenCalledWith(
      '[track]',
      JSON.stringify({ event: 'platform.select', platform: 'instagram' }),
    );
  });

  it('uses sendBeacon when available and the call returns true', async () => {
    const track = await loadTrack(WORKER);
    track({ event: 'platform.select', platform: 'tiktok' });
    expect(sendBeaconMock).toHaveBeenCalledTimes(1);
    const [url, blob] = sendBeaconMock.mock.calls[0];
    expect(url).toBe(`${WORKER}/api/track`);
    expect(blob).toBeInstanceOf(Blob);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('falls back to fetch with keepalive when sendBeacon returns false', async () => {
    sendBeaconMock.mockReturnValue(false);
    const track = await loadTrack(WORKER);
    track({ event: 'resolve.start', platform: 'facebook' });
    expect(sendBeaconMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(`${WORKER}/api/track`);
    expect((init as RequestInit).method).toBe('POST');
    expect((init as RequestInit).keepalive).toBe(true);
    expect((init as RequestInit).body).toBe(
      JSON.stringify({ event: 'resolve.start', platform: 'facebook' }),
    );
  });

  it('falls back to fetch when sendBeacon throws', async () => {
    sendBeaconMock.mockImplementation(() => {
      throw new Error('queue full');
    });
    const track = await loadTrack(WORKER);
    track({ event: 'bulk.start', count: 5 });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('falls back to fetch when navigator.sendBeacon is undefined', async () => {
    vi.stubGlobal('navigator', {});
    const track = await loadTrack(WORKER);
    track({ event: 'bulk.start', count: 3 });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('does not beacon or fetch when VITE_WORKER_URL is empty (console-only)', async () => {
    const track = await loadTrack('');
    track({ event: 'platform.select', platform: 'instagram' });
    expect(consoleLog).toHaveBeenCalledTimes(1);
    expect(sendBeaconMock).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('swallows fetch rejections (analytics never throws into UX)', async () => {
    sendBeaconMock.mockReturnValue(false);
    fetchMock.mockRejectedValue(new Error('network down'));
    const track = await loadTrack(WORKER);
    expect(() =>
      track({ event: 'resolve.fail', platform: 'tiktok', code: 'BOOM', ms: 100 }),
    ).not.toThrow();
  });
});
