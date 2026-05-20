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
    // sendBeacon is designed for fire-and-forget telemetry — survives page
    // unload, doesn't block paint. Some browsers reject the call (queue
    // full, blocked by an extension) — wrap in its own try so a thrown
    // sendBeacon doesn't skip the fetch fallback below.
    if (typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
      try {
        const blob = new Blob([body], { type: 'application/json' });
        if (navigator.sendBeacon(url, blob)) return;
      } catch {
        // Fall through to fetch.
      }
    }
    fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      keepalive: true,
    }).catch(() => {
      // Analytics never blocks UX. Swallow.
    });
  } catch {
    // Analytics never blocks UX. Swallow.
  }
}
