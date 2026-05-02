import { Router, error, json } from 'itty-router';
import { resolveInstagram } from './platforms/instagram';
import { resolveFacebook } from './platforms/facebook';
import { proxyMedia } from './proxy';
import { corsHeaders, handlePreflight } from './cors';
import { ResolveError, type Env } from './types';

const router = Router();

router.get('/api/health', () => json({ ok: true }));

router.post('/api/resolve', async (request: Request) => {
  const body = (await request.json().catch(() => null)) as { url?: string } | null;
  if (!body?.url || typeof body.url !== 'string') {
    throw new ResolveError('Body cần có field "url" dạng string', 'MISSING_URL');
  }

  const platform = detectPlatform(body.url);
  if (!platform) {
    throw new ResolveError('URL không phải Instagram hoặc Facebook', 'UNSUPPORTED_PLATFORM');
  }

  const result = platform === 'instagram' ? await resolveInstagram(body.url) : await resolveFacebook(body.url);
  return json(result);
});

router.get('/api/proxy', async (request: Request) => {
  const url = new URL(request.url);
  const target = url.searchParams.get('url');
  const filename = url.searchParams.get('filename');
  if (!target) {
    throw new ResolveError('Thiếu query param "url"', 'MISSING_URL');
  }
  return await proxyMedia(target, filename);
});

router.all('*', () => error(404, 'Not Found'));

function detectPlatform(rawUrl: string): 'instagram' | 'facebook' | null {
  try {
    const u = new URL(rawUrl);
    if (/(?:^|\.)instagram\.com$/i.test(u.hostname)) return 'instagram';
    if (/(?:^|\.)facebook\.com$|(?:^|\.)fb\.com$|(?:^|\.)fb\.watch$/i.test(u.hostname)) return 'facebook';
  } catch {
    return null;
  }
  return null;
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
        return new Response(JSON.stringify({ error: e.message, code: e.code }), {
          status: e.status,
          headers: { 'Content-Type': 'application/json', ...cors },
        });
      }
      const message = e instanceof Error ? e.message : 'Internal error';
      return new Response(JSON.stringify({ error: message, code: 'INTERNAL' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...cors },
      });
    }
  },
};
