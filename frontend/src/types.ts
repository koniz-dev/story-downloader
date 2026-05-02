export type Platform = 'instagram' | 'facebook';
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

export interface ResolveResponse {
  platform: Platform;
  kind: ContentKind;
  mediaItems: MediaItem[];
  degraded?: boolean;
}

export interface ResolveError {
  error: string;
  code?: string;
}
