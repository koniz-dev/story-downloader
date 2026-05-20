import { describe, it, expect } from 'vitest';
import {
  extractFromHtml,
  normalizeFacebookCacheKey,
  reconcileKind,
  unescapeJson,
} from '../../src/platforms/facebook';

describe('extractFromHtml (facebook)', () => {
  it('og:video meta → single video item with og:image as thumbnail', () => {
    const html = `
      <html><head>
        <meta property="og:video" content="https://video.example.com/v.mp4" />
        <meta property="og:image" content="https://image.example.com/thumb.jpg" />
      </head></html>
    `;
    expect(extractFromHtml(html)).toEqual([
      {
        type: 'video',
        url: 'https://video.example.com/v.mp4',
        thumbnail: 'https://image.example.com/thumb.jpg',
      },
    ]);
  });

  it('og:video:secure_url is honored when og:video is absent', () => {
    const html = `
      <meta property="og:video:secure_url" content="https://secure.example.com/v.mp4" />
      <meta property="og:image" content="https://image.example.com/thumb.jpg" />
    `;
    expect(extractFromHtml(html)).toEqual([
      {
        type: 'video',
        url: 'https://secure.example.com/v.mp4',
        thumbnail: 'https://image.example.com/thumb.jpg',
      },
    ]);
  });

  it('only og:image → returns single image item', () => {
    const html = `<meta property="og:image" content="https://image.example.com/p.jpg" />`;
    expect(extractFromHtml(html)).toEqual([
      { type: 'image', url: 'https://image.example.com/p.jpg' },
    ]);
  });

  it('inline playable_url_quality_hd → video item with unescaped URL (slash + amp)', () => {
    // Real Meta payloads ship `\/` for slashes and `&` for ampersands.
    const html = String.raw`<script>{"playable_url_quality_hd":"https:\/\/video.example.com\/hd.mp4?token=a&sig=b"}</script>`;
    expect(extractFromHtml(html)).toEqual([
      { type: 'video', url: 'https://video.example.com/hd.mp4?token=a&sig=b' },
    ]);
  });

  it('inline playable_url (no _quality_hd) → same outcome', () => {
    const html = String.raw`<script>{"playable_url":"https:\/\/video.example.com\/sd.mp4?x=1&y=2"}</script>`;
    expect(extractFromHtml(html)).toEqual([
      { type: 'video', url: 'https://video.example.com/sd.mp4?x=1&y=2' },
    ]);
  });

  it('og:video wins over inline playable_url (no duplicate video item)', () => {
    const html = String.raw`
      <meta property="og:video" content="https://og.example.com/v.mp4" />
      <script>{"playable_url_quality_hd":"https:\/\/inline.example.com\/hd.mp4"}</script>
    `;
    const items = extractFromHtml(html);
    expect(items).toHaveLength(1);
    expect(items[0]).toEqual({ type: 'video', url: 'https://og.example.com/v.mp4' });
  });

  it('empty HTML → []', () => {
    expect(extractFromHtml('')).toEqual([]);
  });

  it('no og tags and no inline playable_url → []', () => {
    expect(extractFromHtml('<html><body>nothing useful here</body></html>')).toEqual([]);
  });

  it('og:video URL with &amp; → single-pass decode (no double-unescape)', () => {
    // The decode is single-pass: `&amp;quot;` must decode to literal `&quot;`,
    // not to `"`. Here we verify the simpler case that `&amp;` becomes `&` once.
    const html = `<meta property="og:video" content="https://video.example.com/v.mp4?a=1&amp;b=2" />`;
    expect(extractFromHtml(html)).toEqual([
      { type: 'video', url: 'https://video.example.com/v.mp4?a=1&b=2', thumbnail: undefined },
    ]);
  });

  it('og:video URL with &amp;quot; stays as &quot; (single-pass guarantee)', () => {
    const html = `<meta property="og:video" content="https://video.example.com/v.mp4?x=&amp;quot;y&amp;quot;" />`;
    const items = extractFromHtml(html);
    expect(items[0].url).toBe('https://video.example.com/v.mp4?x=&quot;y&quot;');
  });
});

describe('unescapeJson (facebook)', () => {
  const BS = '\\';
  it.each([
    [BS + '/', '/'],
    [BS + 'u0026', '&'],
    [BS + 'u002F', '/'],
    [BS + 'u002f', '/'],
    [BS + 'u003D', '='],
    [BS + 'u003d', '='],
    [BS + '"', '"'],
    [BS + BS, BS],
  ])('decodes %s to %s', (input, expected) => {
    expect(unescapeJson(input)).toBe(expected);
  });

  it('decodes a realistic inline playable_url with mixed escapes', () => {
    const input = 'https:\\/\\/cdn.example.com\\/v.mp4?token=abc\\u0026sig=xyz\\u0026q=\\"hd\\"';
    expect(unescapeJson(input)).toBe('https://cdn.example.com/v.mp4?token=abc&sig=xyz&q="hd"');
  });

  it('single-pass: \\\\\\/ decodes to \\/ (literal backslash + slash), not //', () => {
    // Source contains a literal backslash followed by an escaped slash.
    // Single-pass means \\ -> \ and \/ -> / happen independently — the engine
    // does not re-scan output, so we do not turn a literal backslash escape
    // into a second slash decode.
    expect(unescapeJson('\\\\\\/')).toBe('\\/');
  });

  it('leaves non-escape sequences alone', () => {
    expect(unescapeJson('plain string with no escapes')).toBe('plain string with no escapes');
  });
});

describe('reconcileKind (facebook)', () => {
  it('promotes /share/<token>(post) to reel when final URL is a reel page', () => {
    const initial = new URL('https://www.facebook.com/share/AbCdEf/');
    const finalUrl = 'https://www.facebook.com/reel/1234567890';
    expect(reconcileKind(initial, finalUrl, 'post')).toBe('reel');
  });

  it('promotes /share/<token>(post) to video when final URL is a /videos/ page', () => {
    const initial = new URL('https://www.facebook.com/share/AbCdEf/');
    const finalUrl = 'https://www.facebook.com/somepage/videos/1234567890';
    expect(reconcileKind(initial, finalUrl, 'post')).toBe('video');
  });

  it('promotes /share/<token>(post) to story when final URL is a /stories/ page', () => {
    const initial = new URL('https://www.facebook.com/share/AbCdEf/');
    const finalUrl = 'https://www.facebook.com/stories/1234567890';
    expect(reconcileKind(initial, finalUrl, 'post')).toBe('story');
  });

  it('keeps initial kind when /share/ final URL re-detects to null', () => {
    const initial = new URL('https://www.facebook.com/share/AbCdEf/');
    const finalUrl = 'https://www.facebook.com/some/unrecognized/page';
    expect(reconcileKind(initial, finalUrl, 'post')).toBe('post');
  });

  it('keeps initial kind when /share/ final URL is unparseable', () => {
    const initial = new URL('https://www.facebook.com/share/AbCdEf/');
    expect(reconcileKind(initial, 'not a url at all', 'post')).toBe('post');
  });

  it('does not override an explicitly-typed reel input even if the final URL says otherwise', () => {
    // Caller asked for /reel/<id>; never demote their explicit intent.
    const initial = new URL('https://www.facebook.com/reel/1234567890');
    const finalUrl = 'https://www.facebook.com/somepage/videos/9999999999';
    expect(reconcileKind(initial, finalUrl, 'reel')).toBe('reel');
  });

  it('does not override an explicit /posts/ input', () => {
    const initial = new URL('https://www.facebook.com/somepage/posts/abcdef');
    const finalUrl = 'https://www.facebook.com/reel/1234567890';
    expect(reconcileKind(initial, finalUrl, 'post')).toBe('post');
  });

  it('handles /share/v/<token> -> /videos/<id> redirect (kind stays video)', () => {
    const initial = new URL('https://www.facebook.com/share/v/AbCdEf/');
    const finalUrl = 'https://www.facebook.com/somepage/videos/1234567890';
    expect(reconcileKind(initial, finalUrl, 'video')).toBe('video');
  });
});

describe('normalizeFacebookCacheKey', () => {
  it('strips per-user attribution params so two callers share a cache entry', () => {
    const a =
      'https://www.facebook.com/u/posts/pfbidABC?__cft__[0]=AZxxxAAA&__tn__=%2CO%2CP-R';
    const b =
      'https://www.facebook.com/u/posts/pfbidABC?__cft__[0]=AZyyyBBB&__tn__=%2CO';
    expect(normalizeFacebookCacheKey(a)).toBe(normalizeFacebookCacheKey(b));
  });

  it('also strips fbclid and __xts__', () => {
    const n = normalizeFacebookCacheKey(
      'https://www.facebook.com/u/posts/pfbidABC?fbclid=IwAR123&__xts__[0]=abc',
    );
    expect(n).toBe('https://www.facebook.com/u/posts/pfbidABC');
  });

  it('preserves substantive query params (story_fbid, v, etc.)', () => {
    const n = normalizeFacebookCacheKey(
      'https://www.facebook.com/story.php?story_fbid=1&id=2&__cft__[0]=AZxxx',
    );
    expect(n).toBe('https://www.facebook.com/story.php?story_fbid=1&id=2');
  });

  it('drops hash fragment', () => {
    const n = normalizeFacebookCacheKey('https://www.facebook.com/u/posts/abc#anchor');
    expect(n).toBe('https://www.facebook.com/u/posts/abc');
  });

  it('returns null for unparseable input', () => {
    expect(normalizeFacebookCacheKey('not-a-url')).toBeNull();
  });
});
