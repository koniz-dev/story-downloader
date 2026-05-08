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

export async function resolveInstagram(rawUrl: string): Promise<ResolveResult> {
  const url = new URL(rawUrl);
  const kind = detectInstagramKind(url);
  if (!kind) {
    throw new ResolveError(
      'Invalid Instagram URL. Supported: Reel (/reel/<id>), Post (/p/<id>), IGTV (/tv/<id>), Story (/stories/<user>/<id>).',
      'INVALID_INSTAGRAM_URL',
    );
  }

  let items: MediaItem[] = [];

  if (kind !== 'story') {
    const shortcode = extractShortcode(url);
    if (shortcode) {
      items = await tryEmbed(shortcode, kind);
    }
  }

  if (items.length === 0) {
    const html = await fetchHtml(rawUrl, kind);
    items = extractFromHtml(html);
  }

  if (items.length === 0) {
    throw new ResolveError(
      kind === 'story'
        ? 'Could not extract media. Instagram stories usually require login — only a few public stories work anonymously.'
        : 'Could not extract media. The post may be private or the page structure has changed.',
      kind === 'story' ? 'INSTAGRAM_STORY_BLOCKED' : 'INSTAGRAM_NO_MEDIA',
      404,
    );
  }

  const expectsVideo = kind === 'reel' || kind === 'video';
  const degraded = expectsVideo && !items.some((i) => i.type === 'video');

  return {
    platform: 'instagram',
    kind,
    mediaItems: items,
    ...(degraded ? { degraded: true } : {}),
  };
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

function parseEmbed(html: string): MediaItem[] {
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

function extractFromHtml(html: string): MediaItem[] {
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
  return s
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

function unescapeJson(s: string): string {
  return s
    .replace(/\\u0026/g, '&')
    .replace(/\\u002F/gi, '/')
    .replace(/\\\//g, '/')
    .replace(/\\"/g, '"');
}
