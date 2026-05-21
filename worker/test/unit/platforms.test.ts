import { describe, it, expect } from 'vitest';
import { detectInstagramKind, isInstagramHost } from '../../src/platforms/instagram';
import { detectFacebookKind, isFacebookHost } from '../../src/platforms/facebook';
import {
  chooseProxyPageUrl,
  detectTikTokKind,
  extractPhotoItems,
  isTikTokHost,
  isTikTokPageUrl,
} from '../../src/platforms/tiktok';

function u(href: string): URL {
  return new URL(href);
}

describe('detectInstagramKind', () => {
  it.each([
    ['https://www.instagram.com/reel/ABC123/', 'reel'],
    ['https://www.instagram.com/reels/ABC123/', 'reel'],
    ['https://www.instagram.com/somebody/reel/ABC123/', 'reel'],
    ['https://www.instagram.com/p/ABC123/', 'post'],
    ['https://www.instagram.com/somebody/p/ABC123/', 'post'],
    ['https://www.instagram.com/tv/ABC123/', 'video'],
    ['https://www.instagram.com/stories/user/12345/', 'story'],
  ])('%s → %s', (href, expected) => {
    expect(detectInstagramKind(u(href))).toBe(expected);
  });

  it.each([
    'https://www.instagram.com/',
    'https://www.instagram.com/explore/',
    'https://www.instagram.com/stories/user/', // missing numeric id
    'https://www.instagram.com/p/', // missing shortcode
  ])('null for unsupported %s', (href) => {
    expect(detectInstagramKind(u(href))).toBeNull();
  });
});

describe('detectFacebookKind', () => {
  it.each([
    ['https://www.facebook.com/reel/1234567890', 'reel'],
    ['https://www.facebook.com/watch?v=1234567890', 'video'],
    ['https://www.facebook.com/somepage/videos/1234567890', 'video'],
    ['https://www.facebook.com/somepage/videos/series/1234567890', 'video'],
    ['https://www.facebook.com/somepage/posts/abcdef', 'post'],
    ['https://www.facebook.com/posts/abcdef', 'post'],
    ['https://www.facebook.com/story.php?story_fbid=1&id=2', 'post'],
    ['https://www.facebook.com/anything?story_fbid=1&id=2', 'post'],
    ['https://www.facebook.com/stories/1234567890', 'story'],
    ['https://fb.watch/AbCd/', 'video'],
    ['https://www.facebook.com/share/1EkDv4S7Bw/', 'post'],
    ['https://www.facebook.com/share/v/AbCdEf/', 'video'],
    ['https://www.facebook.com/share/r/AbCdEf/', 'reel'],
    ['https://www.facebook.com/share/p/AbCdEf/', 'post'],
    ['https://www.facebook.com/share/s/AbCdEf/', 'story'],
  ])('%s → %s', (href, expected) => {
    expect(detectFacebookKind(u(href))).toBe(expected);
  });

  it.each([
    'https://www.facebook.com/',
    'https://www.facebook.com/marketplace/',
    'https://www.facebook.com/watch', // no v= param
    'https://www.facebook.com/share/', // empty share token
  ])('null for unsupported %s', (href) => {
    expect(detectFacebookKind(u(href))).toBeNull();
  });
});

describe('detectTikTokKind', () => {
  it.each([
    ['https://www.tiktok.com/@user/video/1234567890', 'video'],
    ['https://www.tiktok.com/@user.with.dots/video/1234567890', 'video'],
    ['https://www.tiktok.com/@user/photo/1234567890', 'post'],
    ['https://m.tiktok.com/v/1234567890', 'video'],
  ])('%s → %s', (href, expected) => {
    expect(detectTikTokKind(u(href))).toBe(expected);
  });

  it.each([
    'https://www.tiktok.com/',
    'https://www.tiktok.com/discover/anything',
    'https://www.tiktok.com/@user', // profile page
    'https://www.tiktok.com/t/short', // short link, not a kind URL
    'https://vm.tiktok.com/ABC/', // short link host
  ])('null for non-kind %s', (href) => {
    expect(detectTikTokKind(u(href))).toBeNull();
  });
});

describe('extractPhotoItems', () => {
  it('picks the first usable https entry from urlList per photo', () => {
    const itemStruct = {
      imagePost: {
        images: [
          {
            imageURL: {
              urlList: [
                'https://p16-sign-va.tiktokcdn.com/a.jpg',
                'https://p77-sign-va.tiktokcdn.com/a.jpg',
                'https://p19-sign-va.tiktokcdn.com/a.jpg',
              ],
            },
          },
          {
            imageURL: {
              urlList: [
                'https://p16-sign-va.tiktokcdn.com/b.jpg',
                'https://p77-sign-va.tiktokcdn.com/b.jpg',
                'https://p19-sign-va.tiktokcdn.com/b.jpg',
              ],
            },
          },
        ],
      },
    };
    const items = extractPhotoItems(itemStruct);
    expect(items).toEqual([
      { type: 'image', url: 'https://p16-sign-va.tiktokcdn.com/a.jpg' },
      { type: 'image', url: 'https://p16-sign-va.tiktokcdn.com/b.jpg' },
    ]);
  });

  it('skips non-https / empty entries and falls through later in urlList', () => {
    const itemStruct = {
      imagePost: {
        images: [
          {
            imageURL: {
              urlList: [
                '',
                'http://insecure.example.com/a.jpg',
                'https://p19-sign-va.tiktokcdn.com/a.jpg',
                'https://p77-sign-va.tiktokcdn.com/a.jpg',
              ],
            },
          },
        ],
      },
    };
    const items = extractPhotoItems(itemStruct);
    expect(items).toEqual([
      { type: 'image', url: 'https://p19-sign-va.tiktokcdn.com/a.jpg' },
    ]);
  });

  it('drops photos with no usable url', () => {
    const itemStruct = {
      imagePost: {
        images: [
          { imageURL: { urlList: [] } },
          { imageURL: { urlList: ['https://ok.tiktokcdn.com/x.jpg'] } },
        ],
      },
    };
    const items = extractPhotoItems(itemStruct);
    expect(items).toEqual([
      { type: 'image', url: 'https://ok.tiktokcdn.com/x.jpg' },
    ]);
  });
});

describe('chooseProxyPageUrl', () => {
  it('uses finalUrl when it matches the input URL', () => {
    const u = 'https://www.tiktok.com/@user/video/1234567890';
    expect(chooseProxyPageUrl(u, u)).toBe(u);
  });

  it('uses finalUrl when redirect lands on a different host but still a TikTok page', () => {
    const input = 'https://vm.tiktok.com/ABCxyz/';
    const finalUrl = 'https://www.tiktok.com/@user/video/1234567890';
    expect(chooseProxyPageUrl(input, finalUrl)).toBe(finalUrl);
  });

  it('falls back to input when finalUrl is the regional WAF/about fallback page', () => {
    // Detection upstream throws TIKTOK_RATE_LIMITED for /hk/about, but if the
    // signal ever drifts we still must not point the proxy at the about page.
    const input = 'https://www.tiktok.com/@user/video/1234567890';
    const finalUrl = 'https://www.tiktok.com/hk/about';
    expect(chooseProxyPageUrl(input, finalUrl)).toBe(input);
  });

  it('falls back to input when finalUrl is canonical-but-unparseable (empty username)', () => {
    const input = 'https://m.tiktok.com/v/1234567890';
    const finalUrl = 'https://www.tiktok.com/@/video/1234567890?_r=1';
    expect(chooseProxyPageUrl(input, finalUrl)).toBe(input);
  });

  it('falls back to input when finalUrl is unparseable', () => {
    const input = 'https://www.tiktok.com/@user/video/1234567890';
    expect(chooseProxyPageUrl(input, 'not a url')).toBe(input);
  });

  it('falls back to input when finalUrl is off-platform', () => {
    const input = 'https://www.tiktok.com/@user/video/1234567890';
    const finalUrl = 'https://www.example.com/blocked';
    expect(chooseProxyPageUrl(input, finalUrl)).toBe(input);
  });
});

describe('isTikTokHost / isInstagramHost / isFacebookHost', () => {
  // These post-redirect host checks gate body parsing in the platform
  // resolvers. The risk being mitigated is a redirect from a platform URL
  // landing on an attacker-controlled host whose response we'd otherwise
  // parse — and whose Set-Cookie we'd harvest in the TikTok case. The
  // matchers must accept any subdomain of the platform but reject lookalike
  // suffixes (foo.tiktok.com.attacker.com) and tiktok-substring decoys.
  it.each([
    ['www.tiktok.com', true],
    ['m.tiktok.com', true],
    ['vm.tiktok.com', true],
    ['tiktok.com.attacker.com', false],
    ['notreally-tiktok.com', false],
    ['evil.com', false],
    ['', false],
  ])('isTikTokHost(%s) → %s', (host, expected) => {
    expect(isTikTokHost(host)).toBe(expected);
  });

  it.each([
    ['www.instagram.com', true],
    ['m.instagram.com', true],
    ['instagram.com.attacker.com', false],
    ['notinstagram.com', false],
    ['scontent.cdninstagram.com', false], // CDN, not the main host
    ['', false],
  ])('isInstagramHost(%s) → %s', (host, expected) => {
    expect(isInstagramHost(host)).toBe(expected);
  });

  it.each([
    ['www.facebook.com', true],
    ['m.facebook.com', true],
    ['fb.com', true],
    ['mbasic.fb.com', true],
    ['fb.watch', true],
    ['facebook.com.attacker.com', false],
    ['fakefacebook.com', false],
    ['', false],
  ])('isFacebookHost(%s) → %s', (host, expected) => {
    expect(isFacebookHost(host)).toBe(expected);
  });
});

describe('isTikTokPageUrl', () => {
  it.each([
    'https://www.tiktok.com/@user/video/1234567890',
    'https://www.tiktok.com/@user/photo/1234567890',
    'https://m.tiktok.com/v/1234567890',
    'https://www.tiktok.com/t/ABCxyz',
    'https://vm.tiktok.com/ABCxyz/',
  ])('true for %s', (href) => {
    expect(isTikTokPageUrl(u(href))).toBe(true);
  });

  it.each([
    'https://www.tiktok.com/',
    'https://www.tiktok.com/discover/foo',
    'https://www.instagram.com/reel/ABC',
  ])('false for %s', (href) => {
    expect(isTikTokPageUrl(u(href))).toBe(false);
  });
});
