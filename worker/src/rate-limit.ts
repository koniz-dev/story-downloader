import { ResolveError } from './types';

interface Limit {
  windowMs: number;
  max: number;
}

const ROUTE_LIMITS: Record<string, Limit> = {
  '/api/resolve': { windowMs: 60_000, max: 30 },
  '/api/proxy': { windowMs: 60_000, max: 60 },
  // Telemetry is high-frequency by design. Keep abuse bounded without
  // clipping normal bursts such as bulk mode plus web-vitals pings.
  '/api/track': { windowMs: 60_000, max: 120 },
};

interface RateLimitEnv {
  RATE_LIMITER?: DurableObjectNamespace;
}

interface RateLimitCheckRequest {
  ip: string;
  route: string;
  now: number;
  windowMs: number;
  max: number;
}

interface RateLimitCheckResponse {
  allowed: boolean;
}

interface StoredCounter {
  bucket: number;
  count: number;
}

export async function checkRateLimit(
  request: Request,
  env: RateLimitEnv,
  route: string,
): Promise<void> {
  const limit = ROUTE_LIMITS[route];
  if (!limit) return;

  // cf-connecting-ip is set by Cloudflare's edge before the Worker runs and
  // replaced on ingress, so clients cannot forge it on a normal CF path. When
  // tests omit it, keep a deterministic fallback instead of collapsing logic.
  const ip = request.headers.get('cf-connecting-ip') ?? 'unknown';
  if (!env.RATE_LIMITER) {
    throw new ResolveError('Rate limiter unavailable', 'INTERNAL', 500);
  }
  const stub = env.RATE_LIMITER.get(env.RATE_LIMITER.idFromName(`${route}:${ip}`));
  const res = await stub.fetch('https://rate-limiter/check', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ip,
      route,
      now: Date.now(),
      windowMs: limit.windowMs,
      max: limit.max,
    } satisfies RateLimitCheckRequest),
  });

  if (!res.ok) {
    throw new ResolveError('Rate limiter unavailable', 'INTERNAL', 500);
  }

  const body = (await res.json()) as RateLimitCheckResponse;
  if (!body.allowed) {
    throw new ResolveError(
      'Too many requests. Wait a minute and try again.',
      'RATE_LIMITED',
      429,
      { route },
    );
  }
}

export class RateLimiter {
  constructor(private readonly ctx: DurableObjectState) {}

  async fetch(request: Request): Promise<Response> {
    if (request.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 });
    }

    const payload = (await request.json()) as Partial<RateLimitCheckRequest>;
    if (
      typeof payload.ip !== 'string' ||
      typeof payload.route !== 'string' ||
      typeof payload.now !== 'number' ||
      typeof payload.windowMs !== 'number' ||
      typeof payload.max !== 'number'
    ) {
      return new Response('Bad request', { status: 400 });
    }

    const bucket = Math.floor(payload.now / payload.windowMs);
    const key = `${payload.route}:${payload.ip}`;
    const existing = (await this.ctx.storage.get<StoredCounter>(key)) ?? null;
    const count = existing && existing.bucket === bucket ? existing.count + 1 : 1;

    await this.ctx.storage.put(key, { bucket, count } satisfies StoredCounter);
    // Expire stale per-IP counters shortly after their active window.
    await this.ctx.storage.setAlarm(payload.now + payload.windowMs * 2);

    return Response.json({ allowed: count <= payload.max } satisfies RateLimitCheckResponse);
  }

  async alarm(): Promise<void> {
    await this.ctx.storage.deleteAll();
  }
}
