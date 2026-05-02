import type { Translations } from './types';

export const en: Translations = {
  app: {
    title: 'Social Downloader',
    subtitle: 'Download public Reels, Posts and Videos from Instagram & Facebook',
    footer: 'For personal use only. Respect the privacy and copyright of content creators.',
  },
  language: {
    label: 'Language',
  },
  steps: {
    selectPlatform: '1. Choose platform',
    guide: '2. How to get the link',
    pasteAndDownload: '3. Paste link & download',
  },
  platform: {
    instagram: { name: 'Instagram', kinds: 'Reel, Post, IGTV' },
    facebook: { name: 'Facebook', kinds: 'Post, Video, Reel' },
  },
  kind: {
    reel: 'Reel',
    post: 'Post',
    video: 'Video',
    story: 'Story',
  },
  guide: {
    title: 'How to get the link',
    examplesTitle: 'Example valid URLs',
    instagram: {
      intro: 'Supports public Instagram content. The account must be set to Public.',
      steps: [
        'Open Instagram (web or app), go to the Reel / Post / IGTV you want to download.',
        'Tap the ⋯ (three dots) icon at the top right of the post.',
        'Choose "Copy link".',
        'Come back here and paste the link in the box below.',
      ],
      warnings: [
        'Stories (/stories/...) usually require login — best-effort, most will fail.',
        'Private accounts cannot be downloaded anonymously.',
      ],
    },
    facebook: {
      intro: 'Supports public Facebook posts and videos (Audience = Public).',
      steps: [
        'Open Facebook, go to the post or video you want to download.',
        'Click the ⋯ icon at the top right → "Copy link".',
        'Or click the timestamp (e.g. "2 days ago") to open the permalink, then copy the URL from the address bar.',
        'Paste the link in the box below.',
      ],
      warnings: [
        'Friends-only posts and private groups cannot be downloaded.',
        'Facebook Stories are almost always private — they generally cannot be downloaded.',
      ],
    },
  },
  form: {
    label: 'Paste {platform} URL',
    submit: 'Download',
    submitting: 'Processing…',
    error: {
      wrongPlatform: 'This URL is from {got}, not {expected}. Switch the platform tab above or paste a different URL.',
      notUrl: 'Invalid URL. Copy it from your browser’s address bar.',
      unknownKind: 'URL not recognized. See "Example valid URLs" in the guide above.',
      generic: 'Unknown error',
    },
  },
  result: {
    found: 'Found {n} media',
    noMedia: 'No media found in this post.',
  },
  media: {
    video: 'Video',
    image: 'Image',
    download: 'Download',
  },
  alert: {
    close: 'Close',
    code: 'code',
  },
};
