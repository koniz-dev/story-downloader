import { describe, it, expect, vi } from 'vitest';
import { validateTrackPayload, writeTrack, type TrackPayload } from '../../src/analytics';
import { ResolveError, type Env } from '../../src/types';

describe('validateTrackPayload', () => {
  it('accepts a minimal valid payload', () => {
    const p = validateTrackPayload({ event: 'platform.select' });
    expect(p.event).toBe('platform.select');
    expect(p.platform).toBeUndefined();
  });

  it('passes through known string fields', () => {
    const p = validateTrackPayload({
      event: 'resolve.fail',
      platform: 'instagram',
      code: 'INSTAGRAM_NO_MEDIA',
      requestId: 'abc-123',
    });
    expect(p.platform).toBe('instagram');
    expect(p.code).toBe('INSTAGRAM_NO_MEDIA');
    expect(p.requestId).toBe('abc-123');
  });

  it('passes through known number fields', () => {
    const p = validateTrackPayload({
      event: 'bulk.complete',
      ok: 7,
      failed: 1,
      total: 8,
    });
    expect(p.ok).toBe(7);
    expect(p.failed).toBe(1);
    expect(p.total).toBe(8);
  });

  it('drops fields with the wrong type', () => {
    const p = validateTrackPayload({
      event: 'resolve.ok',
      platform: 42,
      ms: 'not-a-number',
    });
    expect(p.platform).toBeUndefined();
    expect(p.ms).toBeUndefined();
  });

  it.each([null, undefined, 42, 'string', []])('rejects non-object body %p', (raw) => {
    expect(() => validateTrackPayload(raw)).toThrow(ResolveError);
  });

  it('rejects missing event', () => {
    expect(() => validateTrackPayload({})).toThrow(/event/);
  });

  it('rejects empty event', () => {
    expect(() => validateTrackPayload({ event: '' })).toThrow(/event/);
  });

  it('rejects event with non-allowed prefix', () => {
    expect(() => validateTrackPayload({ event: 'haxor.attempt' })).toThrow(/must start with/i);
  });

  it.each([
    'platform.select',
    'resolve.start',
    'resolve.ok',
    'resolve.fail',
    'download.click',
    'bulk.start',
    'bulk.complete',
    'share-target.received',
  ])('accepts known prefix in %s', (event) => {
    expect(() => validateTrackPayload({ event })).not.toThrow();
  });
});

describe('writeTrack', () => {
  function mockEnv(): { env: Env; writeDataPoint: ReturnType<typeof vi.fn> } {
    const writeDataPoint = vi.fn();
    return {
      writeDataPoint,
      env: {
        AE: { writeDataPoint } as unknown as AnalyticsEngineDataset,
      },
    };
  }

  it('writes positional indexes/blobs/doubles in the documented order', () => {
    const { env, writeDataPoint } = mockEnv();
    const payload: TrackPayload = {
      event: 'resolve.fail',
      platform: 'tiktok',
      kind: 'video',
      code: 'TIKTOK_RATE_LIMITED',
      type: '',
      requestId: 'req-1',
      ms: 1234,
      items: 0,
      count: 0,
      ok: 0,
      failed: 0,
      total: 0,
    };
    writeTrack(env, payload);
    expect(writeDataPoint).toHaveBeenCalledTimes(1);
    expect(writeDataPoint).toHaveBeenCalledWith({
      indexes: ['resolve.fail'],
      blobs: ['resolve.fail', 'tiktok', 'video', 'TIKTOK_RATE_LIMITED', '', 'req-1'],
      doubles: [1234, 0, 0, 0, 0, 0],
    });
  });

  it('defaults missing fields to empty string / zero', () => {
    const { env, writeDataPoint } = mockEnv();
    writeTrack(env, { event: 'platform.select', platform: 'facebook' });
    expect(writeDataPoint).toHaveBeenCalledWith({
      indexes: ['platform.select'],
      blobs: ['platform.select', 'facebook', '', '', '', ''],
      doubles: [0, 0, 0, 0, 0, 0],
    });
  });

  it('is a no-op when env.AE is undefined (local dev / unbound)', () => {
    const env: Env = {};
    expect(() => writeTrack(env, { event: 'resolve.start', platform: 'tiktok' })).not.toThrow();
  });
});
