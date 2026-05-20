// Per-IP, per-route, sliding-minute rate limiter backed by the Cache API.
// `caches.default` is shared by all isolates within a colo, so a single client
// hitting the same colo accumulates correctly. Across colos this is still
// best-effort (each colo has its own cache); for hard global guarantees the
// upgrade path is a Durable Object on Workers Paid.

import { ResolveError } from './types';

interface Limit {
  windowMs: number;
  max: number;
}

const ROUTE_LIMITS: Record<string, Limit> = {
  '/api/resolve': { windowMs: 60_000, max: 30 },
  '/api/proxy': { windowMs: 60_000, max: 60 },
  // Telemetry is high-frequency by design (one event per UI action). A real
  // user fires ~5-15 events per session; 120/min/IP caps abuse without
  // clipping legitimate bursts (e.g. bulk download of many URLs).
  '/api/track': { windowMs: 60_000, max: 120 },
};

export async function checkRateLimit(request: Request, route: string): Promise<void> {
  const limit = ROUTE_LIMITS[route];
  if (!limit) return;
  // cf-connecting-ip is set by Cloudflare's edge before the Worker runs and
  // is stripped/overridden on ingress — clients can't forge it on a real CF
  // path. We previously gated on `request.cf != null` as belt-and-braces,
  // but that broke the integration suite (vitest-pool-workers leaves `cf`
  // null, so every test IP collapsed into one bucket) without adding real
  // protection in prod. Falling back to 'unknown' when the header is missing
  // is enough.
  const ip = request.headers.get('cf-connecting-ip') ?? 'unknown';
  const bucket = Math.floor(Date.now() / limit.windowMs);
  const windowSec = Math.floor(limit.windowMs / 1000);

  // Synthetic URL — Cache API keys must be Request objects with valid URLs;
  // the host doesn't need to match the worker's, just be parseable.
  const key = new Request(`https://rl.local${route}/${encodeURIComponent(ip)}/${bucket}`, {
    method: 'GET',
  });
  const cache = caches.default;

  const existing = await cache.match(key);
  let count = 0;
  if (existing) {
    const text = await existing.text();
    const parsed = Number.parseInt(text, 10);
    if (Number.isFinite(parsed)) count = parsed;
  }

  if (count >= limit.max) {
    throw new ResolveError(
      'Too many requests. Wait a minute and try again.',
      'RATE_LIMITED',
      429,
      { route },
    );
  }

  await cache.put(
    key,
    new Response(String(count + 1), {
      headers: { 'Cache-Control': `max-age=${windowSec}` },
    }),
  );
}
