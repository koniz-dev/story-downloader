// Analytics Engine sink for /api/track. Positional schema — append-only.
//
//   indexes: [event]
//   blobs:   [event, platform, kind, code, type, requestId]
//   doubles: [ms,    items,    count, ok,   failed, total]
//
// SQL queries reference these as `index1`, `blob1`..`blob6`, `double1`..`double6`.
// Reordering or removing fields shifts every existing aggregation silently —
// only ever append.

import { ResolveError, type Env } from './types';

const ALLOWED_EVENT_PREFIXES = [
  'platform.',
  'resolve.',
  'download.',
  'bulk.',
  'share-target.',
] as const;

export interface TrackPayload {
  event: string;
  platform?: string;
  kind?: string;
  code?: string;
  type?: string;
  requestId?: string;
  ms?: number;
  items?: number;
  count?: number;
  ok?: number;
  failed?: number;
  total?: number;
}

export function validateTrackPayload(raw: unknown): TrackPayload {
  if (!raw || typeof raw !== 'object') {
    throw new ResolveError('Body must be a JSON object', 'INVALID_TRACK_EVENT');
  }
  const obj = raw as Record<string, unknown>;
  const event = obj.event;
  if (typeof event !== 'string' || event.length === 0) {
    throw new ResolveError('Body must include non-empty "event" string', 'INVALID_TRACK_EVENT');
  }
  if (!ALLOWED_EVENT_PREFIXES.some((p) => event.startsWith(p))) {
    throw new ResolveError(
      `Event name must start with one of: ${ALLOWED_EVENT_PREFIXES.join(', ')}`,
      'INVALID_TRACK_EVENT',
    );
  }
  return {
    event,
    platform: typeof obj.platform === 'string' ? obj.platform : undefined,
    kind: typeof obj.kind === 'string' ? obj.kind : undefined,
    code: typeof obj.code === 'string' ? obj.code : undefined,
    type: typeof obj.type === 'string' ? obj.type : undefined,
    requestId: typeof obj.requestId === 'string' ? obj.requestId : undefined,
    ms: typeof obj.ms === 'number' ? obj.ms : undefined,
    items: typeof obj.items === 'number' ? obj.items : undefined,
    count: typeof obj.count === 'number' ? obj.count : undefined,
    ok: typeof obj.ok === 'number' ? obj.ok : undefined,
    failed: typeof obj.failed === 'number' ? obj.failed : undefined,
    total: typeof obj.total === 'number' ? obj.total : undefined,
  };
}

export function writeTrack(env: Env, p: TrackPayload): void {
  env.AE?.writeDataPoint({
    indexes: [p.event],
    blobs: [
      p.event,
      p.platform ?? '',
      p.kind ?? '',
      p.code ?? '',
      p.type ?? '',
      p.requestId ?? '',
    ],
    doubles: [
      p.ms ?? 0,
      p.items ?? 0,
      p.count ?? 0,
      p.ok ?? 0,
      p.failed ?? 0,
      p.total ?? 0,
    ],
  });
}
