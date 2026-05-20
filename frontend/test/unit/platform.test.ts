import { describe, it, expect } from 'vitest';
import { detectPlatform, detectKind } from '../../src/lib/platform';

describe('detectPlatform', () => {
  it.each([
    ['https://www.instagram.com/reel/ABC/', 'instagram'],
    ['https://instagram.com/p/ABC/', 'instagram'],
    ['https://www.facebook.com/page/posts/123', 'facebook'],
    ['https://m.facebook.com/watch?v=1', 'facebook'],
    ['https://fb.watch/AbCd/', 'facebook'],
    ['https://www.tiktok.com/@user/video/123', 'tiktok'],
    ['https://m.tiktok.com/v/123', 'tiktok'],
    ['https://vm.tiktok.com/ABC/', 'tiktok'],
  ])('%s → %s', (url, expected) => {
    expect(detectPlatform(url)).toBe(expected);
  });

  it.each([
    'https://example.com/x',
    'https://www.tiktok.cn/@user/video/123',
    'not-a-url',
    '',
    '://broken',
  ])('null for %s', (url) => {
    expect(detectPlatform(url)).toBeNull();
  });

  it('trims whitespace', () => {
    expect(detectPlatform('  https://www.instagram.com/reel/ABC/  ')).toBe('instagram');
  });
});

describe('detectKind — instagram', () => {
  it.each([
    ['https://www.instagram.com/reel/ABC/', 'reel'],
    ['https://www.instagram.com/reels/ABC/', 'reel'],
    ['https://www.instagram.com/p/ABC/', 'post'],
    ['https://www.instagram.com/tv/ABC/', 'video'],
    ['https://www.instagram.com/stories/user/123/', 'story'],
  ])('%s → %s', (url, expected) => {
    expect(detectKind(url, 'instagram')).toBe(expected);
  });

  it.each(['https://www.instagram.com/', 'https://www.instagram.com/explore/'])(
    'null for %s',
    (url) => {
      expect(detectKind(url, 'instagram')).toBeNull();
    },
  );
});

describe('detectKind — facebook', () => {
  it.each([
    ['https://www.facebook.com/reel/123', 'reel'],
    ['https://www.facebook.com/watch?v=123', 'video'],
    ['https://www.facebook.com/page/videos/123', 'video'],
    ['https://www.facebook.com/page/posts/abc', 'post'],
    ['https://www.facebook.com/story.php?story_fbid=1&id=2', 'post'],
    ['https://www.facebook.com/stories/123', 'story'],
    ['https://fb.watch/AbCd/', 'video'],
    ['https://www.facebook.com/share/1EkDv4S7Bw/', 'post'],
    ['https://www.facebook.com/share/v/AbCdEf/', 'video'],
    ['https://www.facebook.com/share/r/AbCdEf/', 'reel'],
    ['https://www.facebook.com/share/p/AbCdEf/', 'post'],
    ['https://www.facebook.com/share/s/AbCdEf/', 'story'],
  ])('%s → %s', (url, expected) => {
    expect(detectKind(url, 'facebook')).toBe(expected);
  });
});

describe('detectKind — tiktok', () => {
  it.each([
    ['https://www.tiktok.com/@user/video/123', 'video'],
    ['https://www.tiktok.com/@user/photo/123', 'post'],
    ['https://m.tiktok.com/v/123', 'video'],
    ['https://www.tiktok.com/t/ABC', 'video'], // short link, optimistic accept
    ['https://vm.tiktok.com/ABC/', 'video'], // short host
  ])('%s → %s', (url, expected) => {
    expect(detectKind(url, 'tiktok')).toBe(expected);
  });

  it('null for tiktok homepage / discover', () => {
    expect(detectKind('https://www.tiktok.com/', 'tiktok')).toBeNull();
    expect(detectKind('https://www.tiktok.com/discover/foo', 'tiktok')).toBeNull();
  });
});
