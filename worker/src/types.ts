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
  RATE_LIMITER?: DurableObjectNamespace;
  // Optional metadata injected at deploy time (see deploy-worker.yml).
  BUILD_COMMIT?: string;
  BUILD_AT?: string;
  // Optional Analytics Engine sink for /api/track. Optional so local dev
  // (and tests that don't bind it) degrade silently rather than 5xx.
  AE?: AnalyticsEngineDataset;
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
