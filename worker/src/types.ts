export type Platform = 'instagram' | 'facebook';
export type MediaType = 'image' | 'video';

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
  mediaItems: MediaItem[];
}

export interface Env {
  ALLOWED_ORIGINS?: string;
}

export class ResolveError extends Error {
  constructor(message: string, public code: string, public status: number = 400) {
    super(message);
  }
}
