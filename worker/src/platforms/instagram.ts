import { ResolveError, type ResolveResult, type MediaItem, type ContentKind } from '../types';
import { FETCH_TIMEOUT_MS, MAX_HTML_BYTES, readBoundedText } from '../util/fetch';

const HEADERS_BROWSER: HeadersInit = {
  'User-Agent':
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
  Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9',
};

export function detectInstagramKind(url: URL): ContentKind | null {
  const p = url.pathname;
  if (/^\/(?:[^/]+\/)?reels?\/[^/]+/i.test(p)) return 'reel';
  if (/^\/(?:[^/]+\/)?p\/[^/]+/i.test(p)) return 'post';
  if (/^\/(?:[^/]+\/)?tv\/[^/]+/i.test(p)) return 'video';
  if (/^\/stories\/[^/]+\/\d+/i.test(p)) return 'story';
  return null;
}

// 1-hour cache for successful resolves. IG signed `oe=` URLs are valid for ~24h,
// so 1h sits comfortably inside that window. The big win is bulk mode + retries:
// IG aggressively rate-limits anonymous Worker egress, and a cache hit dodges
// the upstream round-trip (and the rate-limit bucket) entirely. og:video /
// og:image URLs are public CDN URLs with no user identity — safe to share
// across callers.
const IG_RESOLVE_CACHE_TTL_S = 3600;
// Exact-match list of tracking params IG appends from share/sharesheet flows.
// They don't affect resolution, so stripping them maximises hit rate.
const IG_TRACKING_PARAMS = ['igsh', 'igshid', 'utm_source', 'utm_medium', 'utm_campaign', 'utm_content'];

export function normalizeInstagramCacheKey(rawUrl: string): string | null {
  try {
    const u = new URL(rawUrl);
    u.hash = '';
    u.hostname = u.hostname.toLowerCase();
    for (const key of IG_TRACKING_PARAMS) u.searchParams.delete(key);
    return u.toString();
  } catch {
    return null;
  }
}

function cacheRequestForIg(normalizedUrl: string): Request {
  return new Request(
    `https://ig-cache.local/resolve/${encodeURIComponent(normalizedUrl)}`,
    { method: 'GET' },
  );
}

export async function resolveInstagram(rawUrl: string): Promise<ResolveResult> {
  const url = new URL(rawUrl);
  const kind = detectInstagramKind(url);
  if (!kind) {
    throw new ResolveError(
      'Invalid Instagram URL. Supported: Reel (/reel/<id>), Post (/p/<id>), IGTV (/tv/<id>), Story (/stories/<user>/<id>).',
      'INVALID_INSTAGRAM_URL',
    );
  }

  if (kind === 'story') {
    // Anonymous IG story fetches almost never succeed (see docs/limitations.md);
    // skip the upstream round-trip and surface the same error the items-empty
    // path would have produced.
    throw new ResolveError(
      'Could not extract media. Instagram stories usually require login — only a few public stories work anonymously.',
      'INSTAGRAM_STORY_BLOCKED',
      422,
    );
  }

  const normalized = normalizeInstagramCacheKey(rawUrl);
  const cache = (globalThis as { caches?: CacheStorage }).caches?.default;
  // Cache lookup before any upstream fetch — a hit dodges IG's rate-limit
  // bucket entirely, which matters because IG throttles aggressively.
  if (normalized && cache) {
    try {
      const hit = await cache.match(cacheRequestForIg(normalized));
      if (hit) {
        const cached = (await hit.json()) as ResolveResult | null;
        if (cached?.mediaItems && cached.mediaItems.length > 0) return cached;
      }
    } catch {
      // Cache read is best-effort; fall through to a fresh fetch.
    }
  }

  let items: MediaItem[] = [];

  const shortcode = extractShortcode(url);
  if (shortcode) {
    items = await tryEmbed(shortcode, kind);
  }

  if (items.length === 0) {
    const html = await fetchHtml(rawUrl, kind);
    items = extractFromHtml(html);
  }

  if (items.length === 0) {
    // 422 (not 404): we got Instagram's page successfully but couldn't find
    // playable media in it. The endpoint and the post both exist; the
    // request is just unprocessable. See same rationale in tiktok.ts.
    throw new ResolveError(
      'Could not extract media. The post may be private or the page structure has changed.',
      'INSTAGRAM_NO_MEDIA',
      422,
    );
  }

  const expectsVideo = kind === 'reel' || kind === 'video';
  const degraded = expectsVideo && !items.some((i) => i.type === 'video');

  const result: ResolveResult = {
    platform: 'instagram',
    kind,
    mediaItems: items,
    ...(degraded ? { degraded: true } : {}),
  };

  // Only cache success — never poison the cache with an empty result. Mirror
  // the Facebook pattern (see normalizeFacebookCacheKey).
  if (normalized && cache) {
    try {
      const cacheRes = new Response(JSON.stringify(result), {
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': `max-age=${IG_RESOLVE_CACHE_TTL_S}`,
        },
      });
      await cache.put(cacheRequestForIg(normalized), cacheRes);
    } catch {
      // Cache write is best-effort; never block the response on it.
    }
  }

  return result;
}

function extractShortcode(url: URL): string | null {
  const m = url.pathname.match(/^\/(?:[^/]+\/)?(?:reels?|p|tv)\/([^/?#]+)/i);
  return m?.[1] ?? null;
}

function embedPrefix(kind: ContentKind): string {
  if (kind === 'reel') return 'reel';
  if (kind === 'video') return 'tv';
  return 'p';
}

async function tryEmbed(shortcode: string, kind: ContentKind): Promise<MediaItem[]> {
  const url = `https://www.instagram.com/${embedPrefix(kind)}/${shortcode}/embed/captioned/`;
  let res: Response;
  try {
    res = await fetch(url, {
      headers: HEADERS_BROWSER,
      redirect: 'follow',
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
  } catch {
    return [];
  }
  if (!res.ok) return [];
  let html: string;
  try {
    html = await readBoundedText(res, MAX_HTML_BYTES);
  } catch {
    return [];
  }
  return parseEmbed(html);
}

export function parseEmbed(html: string): MediaItem[] {
  const items: MediaItem[] = [];

  const videoMatch = html.match(/"video_url":"([^"]+)"/);
  const displayMatch = html.match(/"display_url":"([^"]+)"/);
  const thumbMatch = html.match(/"thumbnail_src":"([^"]+)"/);
  const thumbnail = displayMatch ?? thumbMatch;

  if (videoMatch) {
    items.push({
      type: 'video',
      url: unescapeJson(videoMatch[1]),
      thumbnail: thumbnail ? unescapeJson(thumbnail[1]) : undefined,
    });
  } else if (displayMatch) {
    items.push({ type: 'image', url: unescapeJson(displayMatch[1]) });
  }

  return items;
}

export function isInstagramHost(hostname: string): boolean {
  return /(?:^|\.)instagram\.com$/i.test(hostname);
}

async function fetchHtml(url: string, kind: ContentKind): Promise<string> {
  let res: Response;
  try {
    res = await fetch(url, {
      headers: HEADERS_BROWSER,
      redirect: 'follow',
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
  } catch (e) {
    if (e instanceof DOMException && e.name === 'TimeoutError') {
      throw new ResolveError('Instagram timed out', 'INSTAGRAM_FETCH_FAILED', 504);
    }
    throw new ResolveError('Could not connect to Instagram', 'INSTAGRAM_FETCH_FAILED', 502);
  }
  // Defence-in-depth: if an upstream redirect ever took us off the Instagram
  // host family, refuse to parse the body. The extracted og:* URLs flow back
  // to the client (and into /api/proxy) — if we let attacker HTML through
  // here, the host allowlist in proxy.ts is the last line, not the first.
  if (res.url) {
    let finalUrl: URL;
    try {
      finalUrl = new URL(res.url);
    } catch {
      throw new ResolveError('Instagram returned an unparseable final URL', 'INSTAGRAM_FETCH_FAILED', 502);
    }
    if (!isInstagramHost(finalUrl.hostname)) {
      throw new ResolveError(
        `Instagram redirect landed off-platform on ${finalUrl.hostname}`,
        'HOST_NOT_ALLOWED',
        502,
        { host: finalUrl.hostname },
      );
    }
  }
  if (!res.ok) {
    if (res.status === 429) {
      throw new ResolveError(
        'Instagram is rate-limiting requests. Wait 1-2 minutes and try again, or use a different URL.',
        'INSTAGRAM_RATE_LIMITED',
        429,
      );
    }
    if (res.status === 404) {
      throw new ResolveError(
        kind === 'story'
          ? 'Story does not exist or has expired (24h limit).'
          : 'Post does not exist or has been deleted.',
        kind === 'story' ? 'INSTAGRAM_STORY_EXPIRED' : 'INSTAGRAM_NOT_FOUND',
        404,
      );
    }
    throw new ResolveError(
      `Instagram returned ${res.status}`,
      'INSTAGRAM_FETCH_FAILED',
      502,
      { status: res.status },
    );
  }
  return await readBoundedText(res, MAX_HTML_BYTES);
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

function unescapeJson(s: string): string {
  return s
    .replace(/\\u0026/g, '&')
    .replace(/\\u002F/gi, '/')
    .replace(/\\\//g, '/')
    .replace(/\\"/g, '"');
}
