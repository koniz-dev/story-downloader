// requestId on resolve.{ok,fail} mirrors the worker's per-request correlation
// ID so frontend track logs can be joined with worker structured logs.
type TrackEvent =
  | { event: 'platform.select'; platform: string }
  | { event: 'resolve.start'; platform: string }
  | { event: 'resolve.ok'; platform: string; kind: string; items: number; ms: number; requestId?: string }
  | { event: 'resolve.fail'; platform: string; code?: string; ms: number; requestId?: string }
  | { event: 'download.click'; platform: string; kind: string; type: string }
  | { event: 'bulk.start'; count: number }
  | { event: 'bulk.complete'; ok: number; failed: number; total: number }
  | { event: 'share-target.received'; platform: string };

const TRACK_URL = (import.meta.env.VITE_WORKER_URL as string | undefined)?.replace(/\/$/, '') ?? '';

export function track(payload: TrackEvent): void {
  if (typeof console !== 'undefined') {
    console.log('[track]', JSON.stringify(payload));
  }
  if (!TRACK_URL) return;
  const url = `${TRACK_URL}/api/track`;
  const body = JSON.stringify(payload);
  try {
    // fetch+keepalive is MDN's documented replacement for sendBeacon — it
    // also survives page unload but, unlike sendBeacon, lets us set
    // credentials: 'omit'. sendBeacon hardcodes credentials: 'include',
    // which trips a CORS preflight failure against the analytics worker
    // (worker intentionally does not return Access-Control-Allow-
    // Credentials: true since the endpoint is anonymous). Worse, the
    // sendBeacon API "succeeds" at queue time and fails the network call
    // silently — there's no way to fall back to fetch on CORS rejection.
    // Content-Type text/plain is CORS-safelisted so the request stays
    // simple (no preflight); the worker parses the body as JSON regardless
    // of the Content-Type header.
    fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
      body,
      keepalive: true,
      credentials: 'omit',
    }).catch(() => {
      // Analytics never blocks UX. Swallow.
    });
  } catch {
    // Analytics never blocks UX. Swallow.
  }
}
