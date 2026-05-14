import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

describe('uptimeSeconds', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    // Reset module state so the lazy-init `startedAtMs` starts null each test.
    vi.resetModules();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns 0 on the first call and reflects elapsed seconds on subsequent calls', async () => {
    vi.setSystemTime(new Date('2026-05-14T08:00:00Z'));
    const { uptimeSeconds } = await import('../../src/version');

    expect(uptimeSeconds()).toBe(0);

    vi.setSystemTime(new Date('2026-05-14T08:00:01.500Z'));
    expect(uptimeSeconds()).toBe(1);

    vi.setSystemTime(new Date('2026-05-14T08:01:00Z'));
    expect(uptimeSeconds()).toBe(60);
  });

  it('does not capture timestamps before the first real call (guards the Workers Date.now()=0 footgun)', async () => {
    // Simulate the bug scenario: module imported at "epoch" (Workers cold
    // start), first probe arrives long after.
    vi.setSystemTime(new Date(0));
    const { uptimeSeconds } = await import('../../src/version');

    vi.setSystemTime(new Date('2026-05-14T08:00:00Z'));
    // First call still returns 0 because startedAtMs is lazy.
    expect(uptimeSeconds()).toBe(0);

    vi.setSystemTime(new Date('2026-05-14T08:00:42Z'));
    expect(uptimeSeconds()).toBe(42);
  });
});
