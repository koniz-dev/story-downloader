import type { Platform } from '../types';

const INSTAGRAM_RE = /(?:^|\.)instagram\.com$/i;
const FACEBOOK_RE = /(?:^|\.)facebook\.com$|(?:^|\.)fb\.com$|(?:^|\.)fb\.watch$/i;

export function detectPlatform(rawUrl: string): Platform | null {
  let url: URL;
  try {
    url = new URL(rawUrl.trim());
  } catch {
    return null;
  }

  if (INSTAGRAM_RE.test(url.hostname)) return 'instagram';
  if (FACEBOOK_RE.test(url.hostname)) return 'facebook';
  return null;
}

export function platformLabel(p: Platform): string {
  return p === 'instagram' ? 'Instagram' : 'Facebook';
}
