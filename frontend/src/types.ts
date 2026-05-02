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

export interface ResolveResponse {
  platform: Platform;
  mediaItems: MediaItem[];
}

export interface ResolveError {
  error: string;
  code?: string;
}
