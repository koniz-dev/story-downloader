import { ResolveError, type ResolveResult, type MediaItem, type ContentKind } from '../types';

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
  if (url.hostname === 'fb.watch' || url.hostname.endsWith('.fb.watch')) return 'video';
  return null;
}

export async function resolveFacebook(rawUrl: string): Promise<ResolveResult> {
  const url = new URL(rawUrl);
  const kind = detectFacebookKind(url);
  if (!kind) {
    throw new ResolveError(
      'Invalid Facebook URL. Supported: Post (/<page>/posts/<id>), Video (/<page>/videos/<id> or /watch?v=<id>), Reel (/reel/<id>), fb.watch.',
      'INVALID_FACEBOOK_URL',
    );
  }

  const html = await fetchHtml(rawUrl, kind);
  const items = extractFromHtml(html);

  if (items.length === 0) {
    throw new ResolveError(
      kind === 'story'
        ? 'Facebook stories are almost always private — anonymous requests cannot fetch them.'
        : 'Could not extract media. The post may be private, friends-only, or the page structure has changed.',
      kind === 'story' ? 'FACEBOOK_STORY_BLOCKED' : 'FACEBOOK_NO_MEDIA',
      404,
    );
  }

  return { platform: 'facebook', kind, mediaItems: items };
}

async function fetchHtml(url: string, kind: ContentKind): Promise<string> {
  const res = await fetch(url, { headers: HEADERS_BROWSER, redirect: 'follow' });
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
  return await res.text();
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
  return s
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

function unescapeJson(s: string): string {
  return s.replace(/\\\//g, '/').replace(/\\u0026/g, '&');
}
