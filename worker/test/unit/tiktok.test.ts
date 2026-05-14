import { describe, it, expect } from 'vitest';
import { extractPlayAddr, isWafChallenge, parseTikTokItemStruct } from '../../src/platforms/tiktok';

const SAMPLE_PLAY_ADDR = 'https://v16-webapp-prime.tiktok.com/video/tos/abc/?signature=xxx';
const SAMPLE_DOWNLOAD_ADDR = 'https://v16-webapp-prime.tiktok.com/video/tos/abc/?download=1';

function makeHtml(itemStruct: unknown): string {
  const data = {
    __DEFAULT_SCOPE__: {
      'webapp.video-detail': { itemInfo: { itemStruct } },
    },
  };
  return `<!DOCTYPE html><html><body><script id="__UNIVERSAL_DATA_FOR_REHYDRATION__" type="application/json">${JSON.stringify(data)}</script></body></html>`;
}

describe('parseTikTokItemStruct', () => {
  it('extracts itemStruct from the embedded JSON blob', () => {
    const html = makeHtml({ video: { playAddr: SAMPLE_PLAY_ADDR } });
    const result = parseTikTokItemStruct(html);
    expect(result).toMatchObject({ video: { playAddr: SAMPLE_PLAY_ADDR } });
  });

  it('returns null when the script tag is missing', () => {
    const html = '<!DOCTYPE html><html><body>Please wait...</body></html>';
    expect(parseTikTokItemStruct(html)).toBeNull();
  });

  it('returns null when the JSON is malformed', () => {
    const html = `<script id="__UNIVERSAL_DATA_FOR_REHYDRATION__">{ not json`;
    expect(parseTikTokItemStruct(html)).toBeNull();
  });

  it('returns null when itemStruct path is missing', () => {
    const html = `<script id="__UNIVERSAL_DATA_FOR_REHYDRATION__">${JSON.stringify({ wrong: 'shape' })}</script>`;
    expect(parseTikTokItemStruct(html)).toBeNull();
  });
});

describe('extractPlayAddr', () => {
  it('prefers playAddr', () => {
    expect(
      extractPlayAddr({ video: { playAddr: SAMPLE_PLAY_ADDR, downloadAddr: SAMPLE_DOWNLOAD_ADDR } }),
    ).toBe(SAMPLE_PLAY_ADDR);
  });

  it('falls back to downloadAddr', () => {
    expect(extractPlayAddr({ video: { downloadAddr: SAMPLE_DOWNLOAD_ADDR } })).toBe(SAMPLE_DOWNLOAD_ADDR);
  });

  it('falls back to bitrateInfo[0].PlayAddr.UrlList[0]', () => {
    expect(
      extractPlayAddr({
        video: {
          bitrateInfo: [{ PlayAddr: { UrlList: ['https://cdn.example/v.mp4'] } }],
        },
      }),
    ).toBe('https://cdn.example/v.mp4');
  });

  it('returns null when no usable path exists', () => {
    expect(extractPlayAddr({ video: {} })).toBeNull();
    expect(extractPlayAddr({})).toBeNull();
    expect(extractPlayAddr({ imagePost: { images: [] } })).toBeNull();
  });

  it('ignores empty strings', () => {
    expect(extractPlayAddr({ video: { playAddr: '', downloadAddr: SAMPLE_DOWNLOAD_ADDR } })).toBe(
      SAMPLE_DOWNLOAD_ADDR,
    );
  });
});

describe('isWafChallenge', () => {
  // Captured from a real Slardar WAF "Please wait..." response. Tiny page
  // with no media; previously fell through to TIKTOK_NO_MEDIA which blamed
  // the user's URL. Detection now emits TIKTOK_BLOCKED.
  const WAF_HTML = `<!doctype html> <html lang="en">   <head>     <script id="slardar-config" type="application/json">       {         "bid": "slardar_us_waf"       }     </script>   </head>   <body>     Please wait...     <p id="wci" class="_wafchallengeid"></p>     <p id="rci" class="waforiginalreid"></p>     <script src="https://example/obj/waf-aiso/dd9807.js"></script>   </body> </html>`;

  it('identifies a real Slardar WAF challenge page', () => {
    expect(isWafChallenge(WAF_HTML)).toBe(true);
  });

  it('rejects a normal video page (too large)', () => {
    // A real TikTok video page is > 100 KB. Even if it incidentally contained
    // one WAF marker in logging code, the length cap keeps us safe.
    const html = 'x'.repeat(20_000) + '_wafchallengeid';
    expect(isWafChallenge(html)).toBe(false);
  });

  it('requires at least two markers to classify', () => {
    expect(isWafChallenge('<html>just _wafchallengeid alone</html>')).toBe(false);
    expect(
      isWafChallenge('<html>_wafchallengeid and waforiginalreid both present</html>'),
    ).toBe(true);
  });

  it('returns false for an empty body', () => {
    expect(isWafChallenge('')).toBe(false);
  });
});
