// Build-time service metadata. SERVICE_VERSION mirrors worker/package.json so
// /api/version and /api/health can report a stable identifier without reading
// package.json at runtime (Workers have no fs).
//
// BUILD_COMMIT / BUILD_AT are populated by the deploy workflow via
// `wrangler deploy --var BUILD_COMMIT:... --var BUILD_AT:...` when set; locally
// they fall through to "dev" / current timestamp at import time.

export const SERVICE_NAME = 'story-dl-worker';
export const SERVICE_VERSION = '0.1.0';

const STARTED_AT_MS = Date.now();

export function uptimeSeconds(): number {
  return Math.floor((Date.now() - STARTED_AT_MS) / 1000);
}
