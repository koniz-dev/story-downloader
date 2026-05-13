// Build-time SEO copy per locale. Consumed by build-og-images.mjs and
// build-locale-html.mjs. NOT imported at runtime — keeps the bundle small.

export const LOCALES = ['en', 'vi', 'ja', 'ko', 'zh'];
export const DEFAULT_LOCALE = 'en';

export const SEO = {
  en: {
    htmlLang: 'en',
    ogLocale: 'en_US',
    title: 'Social Downloader — Free Online Instagram, Facebook & TikTok Video Downloader',
    description:
      'Free online Instagram, Facebook and TikTok video downloader. Save public Reels, Posts, IGTV, Facebook videos and TikTok videos in one click. No signup, no software.',
    keywords:
      'instagram downloader, instagram reel downloader, instagram post downloader, facebook video downloader, facebook reel downloader, igtv downloader, tiktok downloader, tiktok video downloader, save reel, download facebook video, online video downloader, free instagram downloader',
    twitterTitle: 'Social Downloader — Free Instagram, Facebook & TikTok Video Downloader',
    twitterDescription:
      'Save public Instagram Reels, Posts, IGTV, Facebook videos and TikTok videos in one click. No signup.',
    ogTitle: 'Instagram, Facebook & TikTok Downloader',
    ogSubtitle: 'Free · No signup · No software',
    heroH1: 'Instagram, Facebook & TikTok Video Downloader',
    heroIntro:
      'Paste a public Instagram, Facebook or TikTok link and save the video straight to your device. No signup, no software, free forever.',
    loadingLabel: 'Loading…',
    notFoundTitle: 'Page not found',
    notFoundBody: "The page you’re looking for doesn’t exist or has moved.",
    notFoundCta: 'Go to homepage',
  },
  vi: {
    htmlLang: 'vi',
    ogLocale: 'vi_VN',
    title: 'Social Downloader — Tải video Instagram, Facebook & TikTok miễn phí online',
    description:
      'Tải Reel, Post, Video công khai từ Instagram, Facebook và TikTok ngay trên trình duyệt. Miễn phí, không cần đăng ký, không cài phần mềm.',
    keywords:
      'tải video instagram, tải reel instagram, tải post instagram, tải video facebook, tải reel facebook, tải igtv, tải fb.watch, tải video tiktok, tiktok downloader, công cụ tải video online, tải video miễn phí',
    twitterTitle: 'Tải video Instagram, Facebook & TikTok miễn phí',
    twitterDescription:
      'Tải Reel, Post, Video công khai từ Instagram, Facebook và TikTok trong một cú click. Không cần đăng ký.',
    ogTitle: 'Tải Instagram, Facebook & TikTok',
    ogSubtitle: 'Miễn phí · Không đăng ký · Không cài app',
    heroH1: 'Tải video Instagram, Facebook & TikTok',
    heroIntro:
      'Dán link công khai từ Instagram, Facebook hoặc TikTok và lưu video về thiết bị ngay. Không đăng ký, không cài phần mềm, miễn phí mãi mãi.',
    loadingLabel: 'Đang tải…',
    notFoundTitle: 'Không tìm thấy trang',
    notFoundBody: 'Trang bạn đang tìm không tồn tại hoặc đã được di chuyển.',
    notFoundCta: 'Về trang chủ',
  },
  ja: {
    htmlLang: 'ja',
    ogLocale: 'ja_JP',
    title: 'Social Downloader — Instagram・Facebook・TikTok 動画 無料ダウンローダー',
    description:
      'Instagram・Facebook・TikTok の公開リール、投稿、IGTV、動画をワンクリックで保存。登録不要、インストール不要の無料オンラインツール。',
    keywords:
      'Instagram ダウンローダー, リール ダウンロード, Instagram 動画保存, Facebook 動画 ダウンロード, IGTV 保存, リール 保存, fb.watch ダウンロード, TikTok ダウンローダー, TikTok 動画保存, 動画ダウンローダー 無料, オンライン 動画ダウンロード',
    twitterTitle: 'Instagram・Facebook・TikTok 動画 無料ダウンローダー',
    twitterDescription:
      'Instagram・Facebook・TikTok の公開動画をワンクリックで保存。登録不要・インストール不要。',
    ogTitle: 'Instagram・Facebook・TikTok ダウンローダー',
    ogSubtitle: '無料 · 登録不要 · インストール不要',
    heroH1: 'Instagram・Facebook・TikTok 動画ダウンローダー',
    heroIntro:
      'Instagram・Facebook・TikTok の公開リンクを貼り付けるだけで、動画をそのまま端末に保存できます。登録不要、インストール不要、ずっと無料。',
    loadingLabel: '読み込み中…',
    notFoundTitle: 'ページが見つかりません',
    notFoundBody: 'お探しのページは存在しないか、移動されました。',
    notFoundCta: 'ホームへ戻る',
  },
  ko: {
    htmlLang: 'ko',
    ogLocale: 'ko_KR',
    title: 'Social Downloader — Instagram, Facebook & TikTok 동영상 무료 다운로더',
    description:
      'Instagram, Facebook과 TikTok의 공개 릴스, 게시물, IGTV, 동영상을 클릭 한 번으로 저장하세요. 가입 불필요, 설치 없이 사용 가능한 무료 온라인 도구.',
    keywords:
      'Instagram 다운로더, 릴스 다운로드, Instagram 영상 저장, Facebook 영상 다운로드, IGTV 저장, 릴스 저장, fb.watch 다운로드, TikTok 다운로더, TikTok 동영상 저장, 무료 영상 다운로더, 온라인 동영상 다운로드',
    twitterTitle: 'Instagram, Facebook & TikTok 무료 다운로더',
    twitterDescription:
      'Instagram, Facebook과 TikTok의 공개 영상을 클릭 한 번으로 저장. 가입 불필요.',
    ogTitle: 'Instagram·Facebook·TikTok 다운로더',
    ogSubtitle: '무료 · 가입 불필요 · 설치 불필요',
    heroH1: 'Instagram, Facebook & TikTok 동영상 다운로더',
    heroIntro:
      'Instagram, Facebook 또는 TikTok 공개 링크를 붙여넣고 동영상을 바로 기기에 저장하세요. 가입 불필요, 설치 없음, 영원히 무료.',
    loadingLabel: '불러오는 중…',
    notFoundTitle: '페이지를 찾을 수 없습니다',
    notFoundBody: '찾으시는 페이지가 존재하지 않거나 이동되었습니다.',
    notFoundCta: '홈으로 가기',
  },
  zh: {
    htmlLang: 'zh',
    ogLocale: 'zh_CN',
    title: 'Social Downloader — Instagram、Facebook 和 TikTok 视频免费下载工具',
    description:
      '免费在线下载 Instagram、Facebook 和 TikTok 公开 Reels、帖子、IGTV 和视频。无需注册，无需安装软件，一键保存到设备。',
    keywords:
      'Instagram 下载器, Reels 下载, Instagram 视频保存, Facebook 视频下载, IGTV 下载, Reels 保存, fb.watch 下载, TikTok 下载器, TikTok 视频下载, 在线视频下载工具, 免费视频下载',
    twitterTitle: 'Instagram、Facebook 和 TikTok 视频免费下载工具',
    twitterDescription:
      '免费在线下载 Instagram、Facebook 和 TikTok 公开视频，一键保存。无需注册。',
    ogTitle: 'Instagram、Facebook & TikTok 下载器',
    ogSubtitle: '免费 · 无需注册 · 无需安装',
    heroH1: 'Instagram、Facebook 和 TikTok 视频下载器',
    heroIntro:
      '粘贴 Instagram、Facebook 或 TikTok 公开链接，即可将视频直接保存到设备。无需注册，无需安装，永久免费。',
    loadingLabel: '加载中…',
    notFoundTitle: '页面未找到',
    notFoundBody: '您要找的页面不存在或已被移动。',
    notFoundCta: '回到首页',
  },
};

// `||` (not `??`) so an empty string from CI falls back to the default.
export const SITE_URL = (process.env.SITE_URL || 'https://koniz-dev.github.io/story-downloader').replace(/\/+$/, '');

// Map a locale to its absolute URL on the deployed site.
export function urlForLocale(locale) {
  return locale === DEFAULT_LOCALE ? `${SITE_URL}/` : `${SITE_URL}/${locale}/`;
}
