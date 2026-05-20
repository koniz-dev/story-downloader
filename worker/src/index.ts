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
  enforceBodySize(request);

  const started = Date.now();
  const body = (await request.json().catch(() => null)) as { url?: string } | null;
  if (!body?.url || typeof body.url !== 'string') {
    throw new ResolveError('Body must include "url" string field', 'MISSING_URL');
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
  const lenHeader = request.headers.get('Content-Length');
  if (lenHeader) {
    const len = Number.parseInt(lenHeader, 10);
    if (Number.isFinite(len) && len > MAX_TRACK_BODY_BYTES) {
      throw new ResolveError(
        `Track body exceeds ${MAX_TRACK_BODY_BYTES} bytes`,
        'BODY_TOO_LARGE',
        413,
        { limit: MAX_TRACK_BODY_BYTES, length: len },
      );
    }
  }
  const raw = await request.json().catch(() => null);
  const payload = validateTrackPayload(raw);
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

function enforceBodySize(request: Request): void {
  const lenHeader = request.headers.get('Content-Length');
  if (!lenHeader) return; // Clients may omit; downstream JSON.parse caps the damage.
  const len = Number.parseInt(lenHeader, 10);
  if (Number.isFinite(len) && len > MAX_RESOLVE_BODY_BYTES) {
    throw new ResolveError(
      `Request body exceeds ${MAX_RESOLVE_BODY_BYTES} bytes`,
      'BODY_TOO_LARGE',
      413,
      { limit: MAX_RESOLVE_BODY_BYTES, length: len },
    );
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
  const message = isResolveErr ? e.message : e instanceof Error ? e.message : 'Internal error';
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
      logEvent('request.error', {
        requestId,
        url: request.url,
        method: request.method,
        code: e instanceof ResolveError ? e.code : 'INTERNAL',
        message: e instanceof Error ? e.message : String(e),
      });
      return errorResponse(e, requestId, cors);
    }
  },
};
