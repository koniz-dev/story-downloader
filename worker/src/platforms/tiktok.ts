import { ResolveError, type ResolveResult, type MediaItem, type ContentKind } from '../types';
import { FETCH_TIMEOUT_MS, MAX_HTML_BYTES, readBoundedText } from '../util/fetch';

// Chrome 124 (the previous value) is from April 2024. By 2026 TikTok's WAF
// flags stale UA strings as bots. The full sec-ch-ua-* + sec-fetch-* set
// makes the request look like a real top-level navigation from Chrome on
// Windows. NOTE: this alone won't bypass an IP-level block on Cloudflare
// Workers egress — that's why we also detect the WAF challenge HTML and
// surface a clearer error message (see isWafChallenge).
const HEADERS_BROWSER: HeadersInit = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36',
  Accept:
    'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9',
  'Accept-Encoding': 'gzip, deflate, br',
  'sec-ch-ua': '"Chromium";v="135", "Not(A:Brand";v="24", "Google Chrome";v="135"',
  'sec-ch-ua-mobile': '?0',
  'sec-ch-ua-platform': '"Windows"',
  'Sec-Fetch-Dest': 'document',
  'Sec-Fetch-Mode': 'navigate',
  'Sec-Fetch-Site': 'none',
  'Sec-Fetch-User': '?1',
  'Upgrade-Insecure-Requests': '1',
};

export const TIKTOK_BROWSER_UA = HEADERS_BROWSER['User-Agent' as keyof HeadersInit] as string;

export function detectTikTokKind(url: URL): ContentKind | null {
  const p = url.pathname;
  if (/^\/@[^/]+\/video\/\d+/i.test(p)) return 'video';
  if (/^\/@[^/]+\/photo\/\d+/i.test(p)) return 'post';
  if (/^\/v\/\d+/i.test(p)) return 'video';
  return null;
}

export function isTikTokPageUrl(url: URL): boolean {
  if (/(?:^|\.)vm\.tiktok\.com$/i.test(url.hostname)) return true;
  if (!/(?:^|\.)tiktok\.com$/i.test(url.hostname)) return false;
  if (detectTikTokKind(url)) return true;
  if (/^\/t\/[^/]+/i.test(url.pathname)) return true;
  return false;
}

export interface TikTokFetchResult {
  html: string;
  finalUrl: string;
  cookies: string;
}

// /api/resolve and /api/proxy each call fetchTikTokPage for the same URL within
// seconds of each other (resolve, then user clicks Download). On the hot path
// the second fetch always wins the same HTML, so cache it briefly to halve
// egress and conserve the CF Workers rate-limit budget against TikTok.
//
// We cache the parsed payload (html + finalUrl + cookies), not the raw
// Response. The redirect chain + status are needed for Slardar/region-fallback
// detection in fetchTikTokPage and there's no clean way to round-trip those
// through a Response stored in caches.default; on miss we always run the full
// detection path, on hit the upstream response was already known-good when
// stored.
const TIKTOK_PAGE_CACHE_TTL_S = 30;

function normalizeTikTokCacheKey(rawUrl: string): string | null {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return null;
  }
  parsed.hash = '';
  parsed.hostname = parsed.hostname.toLowerCase();
  // Tracking params TikTok appends but that don't affect which video resolves.
  // Conservative list: anything we're not sure about stays in the key.
  const tracking = ['_t', '_r', 'is_from_webapp', 'sender_device', 'lang'];
  for (const k of tracking) parsed.searchParams.delete(k);
  return parsed.toString();
}

function cacheRequestFor(normalizedUrl: string): Request {
  return new Request(
    `https://tt-cache.local/page/${encodeURIComponent(normalizedUrl)}`,
    { method: 'GET' },
  );
}

export async function fetchTikTokPageCached(rawUrl: string): Promise<TikTokFetchResult> {
  const normalized = normalizeTikTokCacheKey(rawUrl);
  const cache = (globalThis as { caches?: CacheStorage }).caches?.default;
  if (!normalized || !cache) {
    return await fetchTikTokPage(rawUrl);
  }
  const cacheReq = cacheRequestFor(normalized);
  const hit = await cache.match(cacheReq);
  if (hit) {
    try {
      const payload = (await hit.json()) as TikTokFetchResult;
      if (payload && typeof payload.html === 'string') return payload;
    } catch {
      // fall through to refetch
    }
  }
  const fresh = await fetchTikTokPage(rawUrl);
  try {
    const body = JSON.stringify(fresh);
    const cacheRes = new Response(body, {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': `max-age=${TIKTOK_PAGE_CACHE_TTL_S}`,
      },
    });
    await cache.put(cacheReq, cacheRes);
  } catch {
    // caching is best-effort; never let a cache failure break the request
  }
  return fresh;
}

export async function fetchTikTokPage(rawUrl: string): Promise<TikTokFetchResult> {
  let res: Response;
  try {
    res = await fetch(rawUrl, {
      headers: HEADERS_BROWSER,
      redirect: 'follow',
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
  } catch (e) {
    if (e instanceof DOMException && e.name === 'TimeoutError') {
      throw new ResolveError('TikTok timed out', 'TIKTOK_FETCH_FAILED', 504);
    }
    throw new ResolveError('Could not connect to TikTok.', 'TIKTOK_FETCH_FAILED', 502);
  }
  if (!res.ok) {
    if (res.status === 429) {
      throw new ResolveError(
        'TikTok is rate-limiting requests. Wait a few minutes and try again.',
        'TIKTOK_RATE_LIMITED',
        429,
      );
    }
    if (res.status === 404 || res.status === 410) {
      throw new ResolveError('Video does not exist or has been deleted.', 'TIKTOK_NOT_FOUND', 404);
    }
    if (res.status === 403) {
      throw new ResolveError(
        'TikTok blocked the request. The video may be geo-restricted or require login.',
        'TIKTOK_GEO_BLOCKED',
        403,
      );
    }
    throw new ResolveError(`TikTok returned ${res.status}`, 'TIKTOK_FETCH_FAILED', 502, {
      status: res.status,
    });
  }
  const cookies = collectCookies(res.headers);
  // When TikTok rate-limits a CF Workers egress IP it soft-blocks by 302'ing
  // every video URL to a regional landing page (/hk/about, /sg/about, etc.).
  // Body is 200 OK with no itemInfo, so the parser would otherwise return a
  // generic TIKTOK_NO_MEDIA — surface it as rate-limit so users know to retry.
  if (/^\/[a-z]{2}\/about\/?$/i.test(new URL(res.url).pathname)) {
    throw new ResolveError(
      'TikTok temporarily blocked the request. Wait 30 seconds and try again.',
      'TIKTOK_RATE_LIMITED',
      429,
    );
  }
  const html = await readBoundedText(res, MAX_HTML_BYTES);
  // Hard-block: TikTok's Slardar WAF returns a tiny "Please wait…" challenge
  // page (no __UNIVERSAL_DATA_FOR_REHYDRATION__, no og:image). The parser
  // would otherwise emit TIKTOK_NO_MEDIA, which blames the user's URL.
  // Detect the challenge markers and surface a clearer error code so the
  // localised message can correctly say "the downloader is being blocked,
  // not your video."
  if (isWafChallenge(html)) {
    throw new ResolveError(
      'TikTok is temporarily blocking this downloader (Slardar WAF challenge). Try again later.',
      'TIKTOK_BLOCKED',
      502,
    );
  }
  return { html, finalUrl: res.url, cookies };
}

// The Slardar WAF challenge page is recognisable by any of these markers.
// We require two hits before classifying (paranoia: TikTok could in theory
// embed `slardar_us_waf` in legitimate logging on a normal page).
export function isWafChallenge(html: string): boolean {
  if (html.length > 8 * 1024) return false; // real video pages are >> 100 KB
  const markers = [
    'slardar_us_waf',
    '_wafchallengeid',
    'waforiginalreid',
    'obj/waf-aiso/',
  ];
  let hits = 0;
  for (const m of markers) if (html.includes(m)) hits++;
  return hits >= 2;
}

function collectCookies(headers: Headers): string {
  // Workers exposes getSetCookie(); browser's built-in fetch may not. Fall back to combined header.
  const list = (headers as Headers & { getSetCookie?: () => string[] }).getSetCookie?.() ?? [];
  if (list.length > 0) {
    return list.map((c) => c.split(';')[0]).join('; ');
  }
  const single = headers.get('set-cookie');
  if (!single) return '';
  return single
    .split(/,(?=\s*[A-Za-z0-9_-]+=)/)
    .map((c) => c.split(';')[0].trim())
    .join('; ');
}

interface TikTokItemStruct {
  video?: Record<string, unknown>;
  imagePost?: { images?: unknown[] };
}

export function parseTikTokItemStruct(html: string): TikTokItemStruct | null {
  const m = html.match(
    /<script[^>]*id="__UNIVERSAL_DATA_FOR_REHYDRATION__"[^>]*>([\s\S]+?)<\/script>/,
  );
  if (!m) return null;
  let data: unknown;
  try {
    data = JSON.parse(m[1]);
  } catch {
    return null;
  }
  return pick(data, [
    '__DEFAULT_SCOPE__',
    'webapp.video-detail',
    'itemInfo',
    'itemStruct',
  ]) as TikTokItemStruct | null;
}

export function extractPlayAddr(itemStruct: TikTokItemStruct): string | null {
  const v = itemStruct.video;
  if (!v) return null;
  return (
    pickString(v, ['playAddr']) ??
    pickString(v, ['downloadAddr']) ??
    pickString(v, ['bitrateInfo', '0', 'PlayAddr', 'UrlList', '0'])
  );
}

export async function resolveTikTok(rawUrl: string): Promise<ResolveResult> {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new ResolveError('Invalid TikTok URL.', 'INVALID_TIKTOK_URL');
  }

  const earlyKind = detectTikTokKind(url);
  if (!isTikTokPageUrl(url)) {
    throw new ResolveError(
      'Invalid TikTok URL. Supported: video (/@<user>/video/<id>), photo (/@<user>/photo/<id>), short links (vm.tiktok.com/<id>, tiktok.com/t/<id>).',
      'INVALID_TIKTOK_URL',
    );
  }

  const { html, finalUrl } = await fetchTikTokPageCached(rawUrl);

  let finalUrlObj = url;
  try {
    finalUrlObj = new URL(finalUrl);
  } catch {
    // keep original
  }
  const kind: ContentKind = detectTikTokKind(finalUrlObj) ?? earlyKind ?? 'video';

  // The proxy re-fetches this URL, so it must round-trip back through
  // isTikTokPageUrl. Some redirects land on canonical-but-unparseable forms
  // (e.g. m.tiktok.com/v/<id> → www.tiktok.com/@/video/<id>?_r=1 with an
  // empty username); fall back to the original input in those cases.
  const proxyPageUrl = isTikTokPageUrl(finalUrlObj) ? finalUrl : rawUrl;

  const itemStruct = parseTikTokItemStruct(html);
  if (!itemStruct) {
    return ogFallback(html, kind, proxyPageUrl);
  }

  if (kind === 'post') {
    const items = extractPhotoItems(itemStruct);
    if (items.length === 0) return ogFallback(html, kind, proxyPageUrl);
    return { platform: 'tiktok', kind, mediaItems: items };
  }

  const cover = extractCover(itemStruct);
  const hasPlayAddr = !!extractPlayAddr(itemStruct);
  if (!hasPlayAddr && !cover) {
    // 422 (not 404): we successfully fetched & parsed TikTok's page — the
    // resource exists. The request is just unprocessable because we couldn't
    // recover playAddr/cover. 404 would falsely imply the endpoint or video
    // is missing and surfaces a red "GET /api/resolve 404" in DevTools that
    // looks like the worker is broken.
    throw new ResolveError(
      'Could not extract media. The video may be private, geo-restricted, or TikTok may have changed its page structure.',
      'TIKTOK_NO_MEDIA',
      422,
    );
  }

  const items: MediaItem[] = [];
  if (hasPlayAddr) {
    items.push({
      type: 'video',
      url: proxyPageUrl,
      ...(cover ? { thumbnail: cover } : {}),
    });
  } else if (cover) {
    items.push({ type: 'image', url: cover });
  }

  const degraded = !hasPlayAddr;
  return {
    platform: 'tiktok',
    kind,
    mediaItems: items,
    ...(degraded ? { degraded: true } : {}),
  };
}

function extractCover(itemStruct: TikTokItemStruct): string | null {
  const v = itemStruct.video;
  if (!v) return null;
  return (
    pickString(v, ['cover']) ??
    pickString(v, ['originCover']) ??
    pickString(v, ['dynamicCover'])
  );
}

export function extractPhotoItems(itemStruct: TikTokItemStruct): MediaItem[] {
  const images = itemStruct.imagePost?.images;
  if (!Array.isArray(images)) return [];
  const items: MediaItem[] = [];
  for (const img of images) {
    const url = pickFirstUsableUrl(img);
    if (url) items.push({ type: 'image', url });
  }
  return items;
}

// Per photo TikTok returns several CDN variants under imageURL.urlList. The
// previous code only tried indexes 0 and 1, dropping the rest. Semantics are
// "one URL per photo, pick the best CDN variant" (not "expand each variant
// into its own MediaItem"), so iterate the full array and take the first https
// URL we find.
function pickFirstUsableUrl(img: unknown): string | null {
  const list = pick(img, ['imageURL', 'urlList']);
  if (!Array.isArray(list)) return null;
  for (const entry of list) {
    if (typeof entry === 'string' && /^https:\/\//i.test(entry)) {
      return entry;
    }
  }
  return null;
}

function ogFallback(html: string, kind: ContentKind, finalUrl: string): ResolveResult {
  const imageUrl = matchMeta(html, 'og:image');
  if (!imageUrl) {
    throw new ResolveError(
      'Could not extract media. The video may be private, geo-restricted, or TikTok may have changed its page structure.',
      'TIKTOK_NO_MEDIA',
      422,
    );
  }
  const decoded = decodeHtml(imageUrl);
  // For video kind we still need proxy-via-page; thumbnail is just a degraded preview.
  if (kind === 'video') {
    return {
      platform: 'tiktok',
      kind,
      mediaItems: [{ type: 'video', url: finalUrl, thumbnail: decoded }],
      degraded: true,
    };
  }
  return {
    platform: 'tiktok',
    kind,
    mediaItems: [{ type: 'image', url: decoded }],
    degraded: true,
  };
}

function pick(obj: unknown, path: string[]): unknown {
  let cur: unknown = obj;
  for (const key of path) {
    if (cur === null || typeof cur !== 'object') return null;
    cur = (cur as Record<string, unknown>)[key];
  }
  return cur ?? null;
}

function pickString(obj: unknown, path: string[]): string | null {
  const v = pick(obj, path);
  return typeof v === 'string' && v.length > 0 ? v : null;
}

function matchMeta(html: string, property: string): string | null {
  const re = new RegExp(
    `<meta[^>]+(?:property|name)=["']${escapeRe(property)}["'][^>]+content=["']([^"']+)["']`,
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
