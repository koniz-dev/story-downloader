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

export function track(payload: TrackEvent): void {
  if (typeof console !== 'undefined') {
    console.log('[track]', JSON.stringify(payload));
  }
}
