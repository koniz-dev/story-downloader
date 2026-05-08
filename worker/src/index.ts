import { Router, error, json } from 'itty-router';
import { resolveInstagram } from './platforms/instagram';
import { resolveFacebook } from './platforms/facebook';
import { resolveTikTok } from './platforms/tiktok';
import { proxyMedia } from './proxy';
import { corsHeaders, handlePreflight } from './cors';
import { ResolveError, type Env, type Platform } from './types';

const router = Router();

router.get('/api/health', () => json({ ok: true }));

router.post('/api/resolve', async (request: Request) => {
  const started = Date.now();
  const body = (await request.json().catch(() => null)) as { url?: string } | null;
  if (!body?.url || typeof body.url !== 'string') {
    throw new ResolveError('Body must include "url" string field', 'MISSING_URL');
  }

  const platform = detectPlatform(body.url);
  if (!platform) {
    throw new ResolveError('URL is not Instagram, Facebook, or TikTok', 'UNSUPPORTED_PLATFORM');
  }

  try {
    const result =
      platform === 'instagram'
        ? await resolveInstagram(body.url)
        : platform === 'facebook'
          ? await resolveFacebook(body.url)
          : await resolveTikTok(body.url);
    logEvent('resolve.ok', { platform, kind: result.kind, items: result.mediaItems.length, ms: Date.now() - started });
    return json(result);
  } catch (e) {
    const code = e instanceof ResolveError ? e.code : 'INTERNAL';
    logEvent('resolve.fail', { platform, code, ms: Date.now() - started });
    throw e;
  }
});

router.get('/api/proxy', async (request: Request) => {
  const url = new URL(request.url);
  const target = url.searchParams.get('url');
  const filename = url.searchParams.get('filename');
  if (!target) {
    throw new ResolveError('Missing "url" query param', 'MISSING_URL');
  }
  logEvent('proxy', { host: safeHost(target), hasFilename: !!filename });
  return await proxyMedia(target, filename);
});

router.all('*', () => error(404, 'Not Found'));

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

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const preflight = handlePreflight(request, env);
    if (preflight) return preflight;

    try {
      const response = await router.fetch(request, env);
      const headers = new Headers(response.headers);
      const cors = corsHeaders(request, env);
      for (const [k, v] of Object.entries(cors)) headers.set(k, v as string);
      return new Response(response.body, { status: response.status, headers });
    } catch (e) {
      const cors = corsHeaders(request, env);
      if (e instanceof ResolveError) {
        return new Response(
          JSON.stringify({ error: e.message, code: e.code, params: e.params }),
          {
            status: e.status,
            headers: { 'Content-Type': 'application/json', ...cors },
          },
        );
      }
      const message = e instanceof Error ? e.message : 'Internal error';
      return new Response(JSON.stringify({ error: message, code: 'INTERNAL' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...cors },
      });
    }
  },
};
