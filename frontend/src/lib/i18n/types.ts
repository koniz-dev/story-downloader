export type Locale = 'en' | 'vi' | 'ja' | 'ko' | 'zh';

export interface Translations {
  app: {
    title: string;
    subtitle: string;
    footer: string;
  };
  language: {
    label: string;
  };
  steps: {
    selectPlatform: string;
    guide: string;
    pasteAndDownload: string;
  };
  platform: {
    instagram: { name: string; kinds: string };
    facebook: { name: string; kinds: string };
  };
  kind: {
    reel: string;
    post: string;
    video: string;
    story: string;
  };
  guide: {
    title: string;
    examplesTitle: string;
    instagram: {
      intro: string;
      steps: [string, string, string, string];
      warnings: string[];
    };
    facebook: {
      intro: string;
      steps: [string, string, string, string];
      warnings: string[];
    };
  };
  form: {
    label: string;
    submit: string;
    submitting: string;
    error: {
      wrongPlatform: string;
      notUrl: string;
      unknownKind: string;
      generic: string;
    };
  };
  result: {
    found: string;
    noMedia: string;
  };
  media: {
    video: string;
    image: string;
    download: string;
  };
  alert: {
    close: string;
    code: string;
  };
  serverError: {
    NO_WORKER_URL: string;
    NETWORK_ERROR: string;
    WORKER_HTTP_ERROR: string;
    MISSING_URL: string;
    UNSUPPORTED_PLATFORM: string;
    INVALID_URL: string;
    INVALID_PROTOCOL: string;
    HOST_NOT_ALLOWED: string;
    UPSTREAM_ERROR: string;
    INTERNAL: string;
    INVALID_INSTAGRAM_URL: string;
    INSTAGRAM_STORY_BLOCKED: string;
    INSTAGRAM_NO_MEDIA: string;
    INSTAGRAM_RATE_LIMITED: string;
    INSTAGRAM_NOT_FOUND: string;
    INSTAGRAM_STORY_EXPIRED: string;
    INSTAGRAM_FETCH_FAILED: string;
    INVALID_FACEBOOK_URL: string;
    FACEBOOK_STORY_BLOCKED: string;
    FACEBOOK_NO_MEDIA: string;
    FACEBOOK_RATE_LIMITED: string;
    FACEBOOK_NOT_FOUND: string;
    FACEBOOK_STORY_EXPIRED: string;
    FACEBOOK_FETCH_FAILED: string;
  };
}

export const LOCALES: { code: Locale; name: string }[] = [
  { code: 'en', name: 'English' },
  { code: 'vi', name: 'Tiếng Việt' },
  { code: 'ja', name: '日本語' },
  { code: 'ko', name: '한국어' },
  { code: 'zh', name: '中文' },
];
