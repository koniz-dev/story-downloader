import type { Platform, ContentKind } from '../types';

const INSTAGRAM_RE = /(?:^|\.)instagram\.com$/i;
const FACEBOOK_RE = /(?:^|\.)facebook\.com$|(?:^|\.)fb\.com$|(?:^|\.)fb\.watch$/i;
const TIKTOK_RE = /(?:^|\.)tiktok\.com$/i;

export function detectPlatform(rawUrl: string): Platform | null {
  let url: URL;
  try {
    url = new URL(rawUrl.trim());
  } catch {
    return null;
  }

  if (INSTAGRAM_RE.test(url.hostname)) return 'instagram';
  if (FACEBOOK_RE.test(url.hostname)) return 'facebook';
  if (TIKTOK_RE.test(url.hostname)) return 'tiktok';
  return null;
}

export function detectKind(rawUrl: string, platform: Platform): ContentKind | null {
  let url: URL;
  try {
    url = new URL(rawUrl.trim());
  } catch {
    return null;
  }

  const p = url.pathname;
  if (platform === 'instagram') {
    if (/^\/(?:[^/]+\/)?reels?\/[^/]+/i.test(p)) return 'reel';
    if (/^\/(?:[^/]+\/)?p\/[^/]+/i.test(p)) return 'post';
    if (/^\/(?:[^/]+\/)?tv\/[^/]+/i.test(p)) return 'video';
    if (/^\/stories\/[^/]+\/\d+/i.test(p)) return 'story';
    return null;
  }

  if (platform === 'tiktok') {
    if (/^\/@[^/]+\/video\/\d+/i.test(p)) return 'video';
    if (/^\/@[^/]+\/photo\/\d+/i.test(p)) return 'post';
    if (/^\/v\/\d+/i.test(p)) return 'video';
    // Short links resolve server-side; accept the shape so the form proceeds.
    if (/^\/t\/[^/]+/i.test(p)) return 'video';
    if (/(?:^|\.)vm\.tiktok\.com$/i.test(url.hostname)) return 'video';
    return null;
  }

  if (/^\/reel\/\d+/i.test(p)) return 'reel';
  if (/^\/watch\/?/i.test(p) && url.searchParams.has('v')) return 'video';
  if (/\/videos\/(?:[^/]+\/)?\d+/i.test(p)) return 'video';
  if (/\/posts\/[^/]+/i.test(p)) return 'post';
  if (p.startsWith('/story.php') || url.searchParams.has('story_fbid')) return 'post';
  if (/^\/stories\/\d+/i.test(p)) return 'story';
  if (url.hostname === 'fb.watch' || url.hostname.endsWith('.fb.watch')) return 'video';
  return null;
}

