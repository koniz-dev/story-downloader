// Build-time service metadata. SERVICE_VERSION mirrors worker/package.json so
// /api/version and /api/health can report a stable identifier without reading
// package.json at runtime (Workers have no fs).
//
// BUILD_COMMIT / BUILD_AT are populated by the deploy workflow via
// `wrangler deploy --var BUILD_COMMIT:... --var BUILD_AT:...` when set; locally
// they fall through to "dev" / current timestamp at import time.

export const SERVICE_NAME = 'story-dl-worker';
export const SERVICE_VERSION = '0.1.0';

// Lazy init: Workers' `Date.now()` returns 0 at module top-level (the V8
// isolate hasn't seen a real request yet), so a module-init `STARTED_AT_MS =
// Date.now()` produces a 56-year uptime for the first probe. Defer the
// timestamp to the first real call.
let startedAtMs: number | null = null;

export function uptimeSeconds(): number {
  const now = Date.now();
  if (startedAtMs === null) {
    startedAtMs = now;
    return 0;
  }
  return Math.floor((now - startedAtMs) / 1000);
}
