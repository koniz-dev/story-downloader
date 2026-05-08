export type Platform = 'instagram' | 'facebook' | 'tiktok';
export type MediaType = 'image' | 'video';
export type ContentKind = 'reel' | 'post' | 'video' | 'story';

export interface MediaItem {
  type: MediaType;
  url: string;
  thumbnail?: string;
  width?: number;
  height?: number;
  filename?: string;
}

export interface ResolveResult {
  platform: Platform;
  kind: ContentKind;
  mediaItems: MediaItem[];
  degraded?: boolean;
}

export interface Env {
  ALLOWED_ORIGINS?: string;
}

export class ResolveError extends Error {
  constructor(
    message: string,
    public code: string,
    public status: number = 400,
    public params?: Record<string, string | number>,
  ) {
    super(message);
  }
}
