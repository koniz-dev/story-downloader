import { ResolveError, type ResolveResult, type MediaItem, type ContentKind } from '../types';
import { FETCH_TIMEOUT_MS, MAX_HTML_BYTES, readBoundedText } from '../util/fetch';

const HEADERS_BROWSER: HeadersInit = {
  'User-Agent':
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
  Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9',
};

export function detectFacebookKind(url: URL): ContentKind | null {
  const p = url.pathname;
  if (/^\/reel\/\d+/i.test(p)) return 'reel';
  if (/^\/watch\/?/i.test(p) && url.searchParams.has('v')) return 'video';
  if (/\/videos\/(?:[^/]+\/)?\d+/i.test(p)) return 'video';
  if (/^\/[^/]+\/posts\/[^/]+/i.test(p)) return 'post';
  if (/^\/posts\/[^/]+/i.test(p)) return 'post';
  if (p.startsWith('/story.php') || url.searchParams.has('story_fbid')) return 'post';
  if (/^\/stories\/\d+/i.test(p)) return 'story';
  // Universal share links. /share/<opaque> resolves via redirect server-side;
  // tag as 'post' optimistically and let fetch follow the redirect.
  if (/^\/share\/v\/[^/]+/i.test(p)) return 'video';
  if (/^\/share\/r\/[^/]+/i.test(p)) return 'reel';
  if (/^\/share\/p\/[^/]+/i.test(p)) return 'post';
  if (/^\/share\/s\/[^/]+/i.test(p)) return 'story';
  if (/^\/share\/[^/]+/i.test(p)) return 'post';
  if (url.hostname === 'fb.watch' || url.hostname.endsWith('.fb.watch')) return 'video';
  return null;
}

// 1-hour cache for successful resolves. FB serves a stub OG page (~4 KB,
// `og:image` only) probabilistically: testing shows ~40% of anonymous
// Worker requests get a real OG page, the rest get an empty stub. Caching
// the lucky-fetch shifts win-rate per-URL toward 100% after the first
// successful resolve. og:image URLs carry a signed `oe=` expiry that's
// typically 24h+, so 1h is comfortably inside the validity window.
// Privacy note: og:image URLs are public CDN URLs with no user identity —
// safe to share across callers (unlike TikTok cookies which we scope per-IP).
const FB_RESOLVE_CACHE_TTL_S = 3600;
// Per-URL tracking params FB injects to attribute clicks back to the user
// who shared the link. They don't affect resolved media, so strip from the
// cache key to maximise hits across users referencing the same post.
const FB_TRACKING_PARAM_PREFIXES = ['__cft__', '__tn__', '__xts__', 'fbclid'];

export function normalizeFacebookCacheKey(rawUrl: string): string | null {
  try {
    const u = new URL(rawUrl);
    u.hash = '';
    for (const key of [...u.searchParams.keys()]) {
      if (FB_TRACKING_PARAM_PREFIXES.some((prefix) => key.startsWith(prefix))) {
        u.searchParams.delete(key);
      }
    }
    return u.toString();
  } catch {
    return null;
  }
}

function cacheRequestForFb(normalizedUrl: string): Request {
  return new Request(
    `https://fb-cache.local/resolve/${encodeURIComponent(normalizedUrl)}`,
    { method: 'GET' },
  );
}

export async function resolveFacebook(rawUrl: string): Promise<ResolveResult> {
  const url = new URL(rawUrl);
  const initialKind = detectFacebookKind(url);
  if (!initialKind) {
    throw new ResolveError(
      'Invalid Facebook URL. Supported: Post (/<page>/posts/<id>), Video (/<page>/videos/<id> or /watch?v=<id>), Reel (/reel/<id>), share link (/share/<token>), fb.watch.',
      'INVALID_FACEBOOK_URL',
    );
  }

  const normalized = normalizeFacebookCacheKey(rawUrl);
  const cache = (globalThis as { caches?: CacheStorage }).caches?.default;
  // Cache lookup before any upstream fetch — a hit dodges FB's anti-bot
  // lottery entirely.
  if (normalized && cache) {
    try {
      const hit = await cache.match(cacheRequestForFb(normalized));
      if (hit) {
        const cached = (await hit.json()) as ResolveResult | null;
        if (cached?.mediaItems && cached.mediaItems.length > 0) return cached;
      }
    } catch {
      // Cache read is best-effort; fall through to a fresh fetch.
    }
  }

  const { html, finalUrl } = await fetchHtml(rawUrl, initialKind);
  const kind = reconcileKind(url, finalUrl, initialKind);
  const items = extractFromHtml(html);

  if (items.length === 0) {
    // 422 (not 404): we got Facebook's page successfully but couldn't find
    // playable media in it. The endpoint and the post both exist; the
    // request is just unprocessable. See same rationale in tiktok.ts.
    throw new ResolveError(
      kind === 'story'
        ? 'Facebook stories are almost always private — anonymous requests cannot fetch them.'
        : 'Could not extract media. The post may be private, friends-only, or the page structure has changed.',
      kind === 'story' ? 'FACEBOOK_STORY_BLOCKED' : 'FACEBOOK_NO_MEDIA',
      422,
    );
  }

  const result: ResolveResult = { platform: 'facebook', kind, mediaItems: items };

  // Only cache success — never poison the cache with an empty result.
  if (normalized && cache) {
    try {
      const cacheRes = new Response(JSON.stringify(result), {
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': `max-age=${FB_RESOLVE_CACHE_TTL_S}`,
        },
      });
      await cache.put(cacheRequestForFb(normalized), cacheRes);
    } catch {
      // Cache write is best-effort; never block the response on it.
    }
  }

  return result;
}

export function isFacebookHost(hostname: string): boolean {
  return /(?:^|\.)facebook\.com$|(?:^|\.)fb\.com$|(?:^|\.)fb\.watch$/i.test(hostname);
}

async function fetchHtml(url: string, kind: ContentKind): Promise<{ html: string; finalUrl: string }> {
  let res: Response;
  try {
    res = await fetch(url, {
      headers: HEADERS_BROWSER,
      redirect: 'follow',
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
  } catch (e) {
    if (e instanceof DOMException && e.name === 'TimeoutError') {
      throw new ResolveError('Facebook timed out', 'FACEBOOK_FETCH_FAILED', 504);
    }
    throw new ResolveError('Could not connect to Facebook', 'FACEBOOK_FETCH_FAILED', 502);
  }
  // Defence-in-depth: refuse to parse body if a redirect landed off the
  // Facebook host family. Extracted og:* / playable_url values are echoed
  // back to the caller and the host allowlist in proxy.ts only fires when
  // the user clicks Download — we don't want to leak attacker URLs to the
  // resolve response in the meantime.
  if (res.url) {
    let finalUrl: URL;
    try {
      finalUrl = new URL(res.url);
    } catch {
      throw new ResolveError('Facebook returned an unparseable final URL', 'FACEBOOK_FETCH_FAILED', 502);
    }
    if (!isFacebookHost(finalUrl.hostname)) {
      throw new ResolveError(
        `Facebook redirect landed off-platform on ${finalUrl.hostname}`,
        'HOST_NOT_ALLOWED',
        502,
        { host: finalUrl.hostname },
      );
    }
  }
  if (!res.ok) {
    if (res.status === 429) {
      throw new ResolveError(
        'Facebook is rate-limiting requests. Wait 1-2 minutes and try again.',
        'FACEBOOK_RATE_LIMITED',
        429,
      );
    }
    if (res.status === 404) {
      throw new ResolveError(
        kind === 'story'
          ? 'Story does not exist or has expired (24h limit).'
          : 'Post does not exist or has been deleted.',
        kind === 'story' ? 'FACEBOOK_STORY_EXPIRED' : 'FACEBOOK_NOT_FOUND',
        404,
      );
    }
    throw new ResolveError(
      `Facebook returned ${res.status}`,
      'FACEBOOK_FETCH_FAILED',
      502,
      { status: res.status },
    );
  }
  const finalUrl = res.url || url;
  const html = await readBoundedText(res, MAX_HTML_BYTES);
  return { html, finalUrl };
}

// Pure helper: when the input arrived as /share/<token>, the kind was tagged
// optimistically. After redirect resolution, if the final URL parses to a
// concrete kind, prefer that — but never override a non-/share/ input where
// the caller's intent was explicit.
export function reconcileKind(
  initialUrl: URL,
  finalUrl: string,
  initialKind: ContentKind,
): ContentKind {
  if (!/^\/share\//i.test(initialUrl.pathname)) return initialKind;
  let parsed: URL;
  try {
    parsed = new URL(finalUrl);
  } catch {
    return initialKind;
  }
  const redetected = detectFacebookKind(parsed);
  return redetected ?? initialKind;
}

export function extractFromHtml(html: string): MediaItem[] {
  const items: MediaItem[] = [];

  const videoUrl = matchMeta(html, 'og:video') ?? matchMeta(html, 'og:video:secure_url');
  const imageUrl = matchMeta(html, 'og:image');

  if (videoUrl) {
    items.push({
      type: 'video',
      url: decodeHtml(videoUrl),
      thumbnail: imageUrl ? decodeHtml(imageUrl) : undefined,
    });
  } else if (imageUrl) {
    items.push({ type: 'image', url: decodeHtml(imageUrl) });
  }

  const inlineHd = html.match(/"playable_url(?:_quality_hd)?":"([^"]+)"/);
  if (inlineHd && !items.some((i) => i.type === 'video')) {
    items.push({ type: 'video', url: unescapeJson(inlineHd[1]) });
  }

  return items;
}

function matchMeta(html: string, property: string): string | null {
  const re = new RegExp(
    `<meta[^>]+property=["']${escapeRe(property)}["'][^>]+content=["']([^"']+)["']`,
    'i',
  );
  const m = html.match(re);
  return m?.[1] ?? null;
}

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function decodeHtml(s: string): string {
  // Single-pass: sequential .replace() chains double-unescape — e.g. an
  // input of `&amp;quot;` (literal `&quot;`) would become `"` instead of
  // the intended `&quot;`. One regex prevents the second pass from
  // ever seeing the output of the first.
  return s.replace(/&(amp|quot|#39|lt|gt);/g, (m, e) => {
    switch (e) {
      case 'amp': return '&';
      case 'quot': return '"';
      case '#39': return "'";
      case 'lt': return '<';
      case 'gt': return '>';
      default: return m;
    }
  });
}

export function unescapeJson(s: string): string {
  // Single-pass tokenizer: a sequential .replace() chain risks letting a later
  // step re-consume an earlier step's output (e.g. \\ -> \ followed by \/ -> /
  // would turn a literal "\\/" into "/"). One regex over all escape forms
  // means each source character is decoded at most once.
  return s.replace(/\\u0026|\\u002[fF]|\\u003[dD]|\\\/|\\"|\\\\/g, (m) => {
    switch (m) {
      case '\\u0026': return '&';
      case '\\u002f':
      case '\\u002F': return '/';
      case '\\u003d':
      case '\\u003D': return '=';
      case '\\/': return '/';
      case '\\"': return '"';
      case '\\\\': return '\\';
      default: return m;
    }
  });
}
