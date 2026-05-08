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
};

export async function checkRateLimit(request: Request, route: string): Promise<void> {
  const limit = ROUTE_LIMITS[route];
  if (!limit) return;
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
