import { ResolveError, type ResolveResult, type MediaItem, type ContentKind } from '../types';
import { FETCH_TIMEOUT_MS, MAX_HTML_BYTES, readBoundedText } from '../util/fetch';

const HEADERS_BROWSER: HeadersInit = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9',
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
  return { html: await readBoundedText(res, MAX_HTML_BYTES), finalUrl: res.url, cookies };
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

  const { html, finalUrl } = await fetchTikTokPage(rawUrl);

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
    throw new ResolveError(
      'Could not extract media. The video may be private, geo-restricted, or TikTok may have changed its page structure.',
      'TIKTOK_NO_MEDIA',
      404,
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

function extractPhotoItems(itemStruct: TikTokItemStruct): MediaItem[] {
  const images = itemStruct.imagePost?.images;
  if (!Array.isArray(images)) return [];
  const items: MediaItem[] = [];
  for (const img of images) {
    const url =
      pickString(img, ['imageURL', 'urlList', '0']) ??
      pickString(img, ['imageURL', 'urlList', '1']);
    if (url) items.push({ type: 'image', url });
  }
  return items;
}

function ogFallback(html: string, kind: ContentKind, finalUrl: string): ResolveResult {
  const imageUrl = matchMeta(html, 'og:image');
  if (!imageUrl) {
    throw new ResolveError(
      'Could not extract media. The video may be private, geo-restricted, or TikTok may have changed its page structure.',
      'TIKTOK_NO_MEDIA',
      404,
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
  return s
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}
