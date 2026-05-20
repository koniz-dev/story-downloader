import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Capture the registered web-vitals callbacks so we can fire them with synthetic
// Metric objects and inspect what hits the track() sink.
const callbacks: Record<string, (metric: { name: string; value: number }) => void> = {};

vi.mock('web-vitals', () => ({
  onLCP: (cb: (m: { name: string; value: number }) => void) => {
    callbacks.LCP = cb;
  },
  onINP: (cb: (m: { name: string; value: number }) => void) => {
    callbacks.INP = cb;
  },
  onCLS: (cb: (m: { name: string; value: number }) => void) => {
    callbacks.CLS = cb;
  },
  onTTFB: (cb: (m: { name: string; value: number }) => void) => {
    callbacks.TTFB = cb;
  },
  onFCP: (cb: (m: { name: string; value: number }) => void) => {
    callbacks.FCP = cb;
  },
}));

const trackMock = vi.fn();
vi.mock('../../src/lib/track', () => ({
  track: (payload: unknown) => trackMock(payload),
}));

beforeEach(async () => {
  trackMock.mockReset();
  for (const k of Object.keys(callbacks)) delete callbacks[k];
  // Re-import after mocks/state are reset so onX() registers fresh callbacks.
  vi.resetModules();
  const { reportWebVitals } = await import('../../src/lib/vitals');
  reportWebVitals();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('reportWebVitals', () => {
  it('registers a callback for each of LCP / INP / CLS / TTFB / FCP', () => {
    expect(Object.keys(callbacks).sort()).toEqual(['CLS', 'FCP', 'INP', 'LCP', 'TTFB']);
  });

  it.each([
    ['LCP', 'vitals.lcp', 2500.7, 2501],
    ['INP', 'vitals.inp', 180.4, 180],
    ['TTFB', 'vitals.ttfb', 412.9, 413],
    ['FCP', 'vitals.fcp', 1100.2, 1100],
  ])(
    '%s reports through track as %s with rounded ms',
    (metric, event, value, expectedMs) => {
      callbacks[metric]({ name: metric, value });
      expect(trackMock).toHaveBeenCalledWith({ event, ms: expectedMs });
    },
  );

  it('CLS multiplies the unitless score by 1000 so it fits the ms field', () => {
    // CLS values are typically 0.0–0.5. Multiplying by 1000 lets the existing
    // `ms` double on the AE schema carry the metric without bumping positions.
    callbacks.CLS({ name: 'CLS', value: 0.123 });
    expect(trackMock).toHaveBeenCalledWith({ event: 'vitals.cls', ms: 123 });
  });

  it('CLS at zero still emits an event (good-CLS pages are signal, not noise)', () => {
    callbacks.CLS({ name: 'CLS', value: 0 });
    expect(trackMock).toHaveBeenCalledWith({ event: 'vitals.cls', ms: 0 });
  });
});
