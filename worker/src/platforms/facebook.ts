import { ResolveError, type ResolveResult, type MediaItem } from '../types';

const HEADERS_BROWSER: HeadersInit = {
  'User-Agent':
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
  Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9',
};

export async function resolveFacebook(rawUrl: string): Promise<ResolveResult> {
  const url = new URL(rawUrl);
  const isStory =
    url.pathname.includes('/stories/') ||
    url.pathname.startsWith('/story.php') ||
    url.searchParams.has('story_fbid');

  if (!isStory) {
    throw new ResolveError(
      'URL không nhận diện được là Facebook story. Hỗ trợ /stories/<id>/ hoặc story.php?story_fbid=...',
      'INVALID_FACEBOOK_URL',
    );
  }

  const html = await fetchHtml(rawUrl);
  const items = extractFromHtml(html);

  if (items.length === 0) {
    throw new ResolveError(
      'Không tìm thấy media. Hầu hết Facebook story là riêng tư — chỉ story public mới tải được mà không cần đăng nhập.',
      'FACEBOOK_NO_MEDIA',
      404,
    );
  }

  return { platform: 'facebook', mediaItems: items };
}

async function fetchHtml(url: string): Promise<string> {
  const res = await fetch(url, { headers: HEADERS_BROWSER, redirect: 'follow' });
  if (!res.ok) {
    throw new ResolveError(`Facebook trả về ${res.status}`, 'FACEBOOK_FETCH_FAILED', 502);
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
