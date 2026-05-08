import { describe, it, expect } from 'vitest';
import { extractPlayAddr, parseTikTokItemStruct } from '../../src/platforms/tiktok';

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
