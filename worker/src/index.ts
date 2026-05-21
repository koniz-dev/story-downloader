import { Router, error, json } from 'itty-router';
import { resolveInstagram } from './platforms/instagram';
import { resolveFacebook } from './platforms/facebook';
import { resolveTikTok } from './platforms/tiktok';
import { proxyMedia } from './proxy';
import { corsHeaders, handlePreflight } from './cors';
import { checkRateLimit } from './rate-limit';
import { applySecurityHeaders, getOrCreateRequestId, setRequestId } from './headers';
import { SERVICE_NAME, SERVICE_VERSION, uptimeSeconds } from './version';
import { validateTrackPayload, writeTrack } from './analytics';
import { readBoundedRequestBody } from './util/body';
import { ResolveError, type Env, type Platform } from './types';

// Cap the /api/resolve body. A platform URL fits comfortably in 2 KB; 8 KB
// gives slack for unusual short-link expansions while still rejecting
// adversarial oversized POSTs before we try to JSON-parse them.
const MAX_RESOLVE_BODY_BYTES = 8 * 1024;
// Telemetry events carry only a small key/value bag — 2 KB is plenty.
const MAX_TRACK_BODY_BYTES = 2 * 1024;

const router = Router();

// 30s edge cache on probe endpoints so a fleet of health checkers doesn't cold-
// hit the origin every probe. `timestamp` and `uptimeSec` on /api/health drift
// within the window — acceptable for liveness signals; if you need exact wall-
// clock per-probe, bypass cache at the probe layer.
const PROBE_CACHE_CONTROL = 'public, s-maxage=30';

router.get('/api/health', (_request: Request, env: Env) =>
  cachedJson(
    {
      ok: true,
      service: SERVICE_NAME,
      version: SERVICE_VERSION,
      commit: env.BUILD_COMMIT ?? null,
      builtAt: env.BUILD_AT ?? null,
      timestamp: new Date().toISOString(),
      uptimeSec: uptimeSeconds(),
    },
    PROBE_CACHE_CONTROL,
  ),
);

router.get('/api/version', (_request: Request, env: Env) =>
  cachedJson(
    {
      service: SERVICE_NAME,
      version: SERVICE_VERSION,
      commit: env.BUILD_COMMIT ?? null,
      builtAt: env.BUILD_AT ?? null,
    },
    PROBE_CACHE_CONTROL,
  ),
);

function cachedJson(body: unknown, cacheControl: string): Response {
  const res = json(body);
  // json() returns a 200; only attach the cache hint on success. 4xx/5xx
  // never flow through this helper.
  res.headers.set('Cache-Control', cacheControl);
  return res;
}

router.post('/api/resolve', async (request: Request, _env: Env, ctx: RequestContext) => {
  await checkRateLimit(request, '/api/resolve');

  const started = Date.now();
  const raw = await readBoundedRequestBody(request, MAX_RESOLVE_BODY_BYTES);
  const body = parseJson<{ url?: string }>(raw);
  if (!body?.url || typeof body.url !== 'string') {
    throw new ResolveError('Body must include "url" string field', 'MISSING_URL');
  }

  // Enforce https:// upfront. URLs reach this endpoint from public origins via
  // CORS; an http:// URL would force an opportunistic-downgrade fetch to the
  // upstream (Workers' fetch doesn't auto-upgrade http→https). Reject before
  // platform routing so we never spend egress on plaintext requests, and so
  // schemes like ftp://, ws://, javascript: can't slip through a hostname
  // regex that doesn't inspect the protocol.
  let parsed: URL;
  try {
    parsed = new URL(body.url);
  } catch {
    throw new ResolveError('URL is not parseable', 'INVALID_URL');
  }
  if (parsed.protocol !== 'https:') {
    throw new ResolveError('Only https:// URLs are accepted', 'INVALID_PROTOCOL');
  }

  const platform = detectPlatform(body.url);
  if (!platform) {
    throw new ResolveError('URL is not Instagram, Facebook, or TikTok', 'UNSUPPORTED_PLATFORM');
  }

  // Caller IP threads into the TikTok cache key so the upstream Set-Cookie
  // jar (msToken / tt_chain_token) is never shared across users.
  const callerIp = request.headers.get('cf-connecting-ip');
  try {
    const result =
      platform === 'instagram'
        ? await resolveInstagram(body.url)
        : platform === 'facebook'
          ? await resolveFacebook(body.url)
          : await resolveTikTok(body.url, callerIp);
    logEvent('resolve.ok', {
      requestId: ctx.requestId,
      platform,
      kind: result.kind,
      items: result.mediaItems.length,
      ms: Date.now() - started,
    });
    return json(result);
  } catch (e) {
    const code = e instanceof ResolveError ? e.code : 'INTERNAL';
    logEvent('resolve.fail', {
      requestId: ctx.requestId,
      platform,
      code,
      ms: Date.now() - started,
    });
    throw e;
  }
});

router.get('/api/proxy', async (request: Request, _env: Env, ctx: RequestContext) => {
  await checkRateLimit(request, '/api/proxy');
  const url = new URL(request.url);
  const target = url.searchParams.get('url');
  const filename = url.searchParams.get('filename');
  if (!target) {
    throw new ResolveError('Missing "url" query param', 'MISSING_URL');
  }
  logEvent('proxy', {
    requestId: ctx.requestId,
    host: safeHost(target),
    hasFilename: !!filename,
  });
  return await proxyMedia(target, filename, request);
});

router.post('/api/track', async (request: Request, env: Env) => {
  await checkRateLimit(request, '/api/track');
  const raw = await readBoundedRequestBody(request, MAX_TRACK_BODY_BYTES);
  const payload = validateTrackPayload(parseJson<unknown>(raw));
  writeTrack(env, payload);
  return new Response(null, { status: 204 });
});

// 405 fallbacks for known paths — without these, a GET /api/resolve falls
// through to the catch-all 404 below, which is misleading. RFC 7231 requires
// 405 with an Allow header listing supported methods.
router.all('/api/resolve', () => methodNotAllowed('POST'));
router.all('/api/proxy', () => methodNotAllowed('GET'));
router.all('/api/health', () => methodNotAllowed('GET'));
router.all('/api/version', () => methodNotAllowed('GET'));
router.all('/api/track', () => methodNotAllowed('POST'));

router.all('*', () => error(404, 'Not Found'));

function methodNotAllowed(allow: string): Response {
  return new Response(
    JSON.stringify({ error: 'Method not allowed', code: 'METHOD_NOT_ALLOWED' }),
    {
      status: 405,
      headers: {
        'Content-Type': 'application/json',
        Allow: `${allow}, OPTIONS`,
      },
    },
  );
}

function parseJson<T>(raw: string): T | null {
  if (raw.length === 0) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function detectPlatform(rawUrl: string): Platform | null {
  try {
    const u = new URL(rawUrl);
    if (/(?:^|\.)instagram\.com$/i.test(u.hostname)) return 'instagram';
    if (/(?:^|\.)facebook\.com$|(?:^|\.)fb\.com$|(?:^|\.)fb\.watch$/i.test(u.hostname)) return 'facebook';
    if (/(?:^|\.)tiktok\.com$/i.test(u.hostname)) return 'tiktok';
  } catch {
    return null;
  }
  return null;
}

function safeHost(rawUrl: string): string {
  try {
    return new URL(rawUrl).hostname;
  } catch {
    return 'invalid';
  }
}

function logEvent(event: string, data: Record<string, unknown>): void {
  console.log(JSON.stringify({ event, ...data }));
}

interface RequestContext {
  requestId: string;
}

function decorateResponse(response: Response, requestId: string, cors: HeadersInit): Response {
  const headers = new Headers(response.headers);
  for (const [k, v] of Object.entries(cors as Record<string, string>)) headers.set(k, v);
  applySecurityHeaders(headers);
  setRequestId(headers, requestId);
  return new Response(response.body, { status: response.status, headers });
}

function errorResponse(
  e: unknown,
  requestId: string,
  cors: HeadersInit,
): Response {
  const isResolveErr = e instanceof ResolveError;
  const status = isResolveErr ? e.status : 500;
  const code = isResolveErr ? e.code : 'INTERNAL';
  // ResolveError messages are authored by us and known to be safe to
  // expose. Anything else is an uncaught runtime error and may contain
  // code-structure detail ("Cannot read properties of undefined ..."),
  // file paths, or other internals — redact to a generic string and rely
  // on the worker log + requestId to debug.
  const message = isResolveErr ? e.message : 'Internal error';
  const params = isResolveErr ? e.params : undefined;
  const body = JSON.stringify({ error: message, code, params, requestId });
  const headers = new Headers({ 'Content-Type': 'application/json' });
  for (const [k, v] of Object.entries(cors as Record<string, string>)) headers.set(k, v);
  applySecurityHeaders(headers);
  setRequestId(headers, requestId);
  return new Response(body, { status, headers });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const requestId = getOrCreateRequestId(request);
    const cors = corsHeaders(request, env);

    const preflight = handlePreflight(request, env);
    if (preflight) {
      return decorateResponse(preflight, requestId, cors);
    }

    const ctx: RequestContext = { requestId };
    try {
      const response = await router.fetch(request, env, ctx);
      return decorateResponse(response, requestId, cors);
    } catch (e) {
      // Log path+method only — the inbound URL on /api/proxy carries the
      // proxied CDN URL in its query string, which references user content.
      // Admin-only logs today, but redacting up front keeps the surface
      // clean if logs ever land in a third-party SIEM.
      const inboundUrl = new URL(request.url);
      logEvent('request.error', {
        requestId,
        path: inboundUrl.pathname,
        method: request.method,
        code: e instanceof ResolveError ? e.code : 'INTERNAL',
        message: e instanceof Error ? e.message : String(e),
      });
      return errorResponse(e, requestId, cors);
    }
  },
};
