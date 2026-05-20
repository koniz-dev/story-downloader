type TrackEvent =
  | { event: 'platform.select'; platform: string }
  | { event: 'resolve.start'; platform: string }
  | { event: 'resolve.ok'; platform: string; kind: string; items: number; ms: number }
  | { event: 'resolve.fail'; platform: string; code?: string; ms: number }
  | { event: 'download.click'; platform: string; kind: string; type: string }
  | { event: 'bulk.start'; count: number }
  | { event: 'bulk.complete'; ok: number; failed: number; total: number };

export function track(payload: TrackEvent): void {
  if (typeof console !== 'undefined') {
    console.log('[track]', JSON.stringify(payload));
  }
}
