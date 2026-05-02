import type { Translations } from './types';

export const vi: Translations = {
  app: {
    title: 'Social Downloader',
    subtitle: 'Tải Reel, Post, Video công khai từ Instagram & Facebook',
    footer: 'Tool dành cho mục đích cá nhân. Tôn trọng quyền riêng tư và bản quyền của người tạo nội dung.',
  },
  language: {
    label: 'Ngôn ngữ',
  },
  steps: {
    selectPlatform: '1. Chọn nền tảng',
    guide: '2. Hướng dẫn lấy link',
    pasteAndDownload: '3. Dán link & tải',
  },
  platform: {
    instagram: { name: 'Instagram', kinds: 'Reel, Post, IGTV' },
    facebook: { name: 'Facebook', kinds: 'Post, Video, Reel' },
  },
  kind: {
    reel: 'Reel',
    post: 'Bài viết',
    video: 'Video',
    story: 'Story',
  },
  guide: {
    title: 'Cách lấy link',
    examplesTitle: 'Ví dụ URL hợp lệ',
    instagram: {
      intro: 'Hỗ trợ bài đăng công khai trên Instagram. Tài khoản phải để chế độ Public.',
      steps: [
        'Mở Instagram (web hoặc app), vào Reel / Post / IGTV bạn muốn tải.',
        'Bấm icon ⋯ (dấu ba chấm) ở góc trên phải bài đăng.',
        'Chọn "Sao chép liên kết" (Copy link).',
        'Quay lại trang này, dán link vào ô bên dưới.',
      ],
      warnings: [
        'Story (/stories/...) thường yêu cầu đăng nhập — best-effort, đa số sẽ thất bại.',
        'Tài khoản Private không tải được anonymous.',
      ],
    },
    facebook: {
      intro: 'Hỗ trợ bài đăng và video công khai trên Facebook (Audience = Public).',
      steps: [
        'Mở Facebook, vào bài viết hoặc video bạn muốn tải.',
        'Bấm icon ⋯ ở góc trên phải bài đăng → "Sao chép liên kết".',
        'Hoặc bấm thời gian đăng (vd: "2 ngày trước") để mở permalink, sau đó copy URL trên thanh địa chỉ.',
        'Dán link vào ô bên dưới.',
      ],
      warnings: [
        'Bài "Friends-only" hoặc nhóm kín không tải được.',
        'Story Facebook hầu như luôn riêng tư — gần như không tải được.',
      ],
    },
  },
  form: {
    label: 'Dán URL {platform}',
    submit: 'Tải xuống',
    submitting: 'Đang xử lý…',
    error: {
      wrongPlatform: 'URL này thuộc {got}, không phải {expected}. Đổi tab nền tảng phía trên hoặc dán URL khác.',
      notUrl: 'URL không hợp lệ. Hãy copy từ thanh địa chỉ trình duyệt.',
      unknownKind: 'URL không nhận diện được. Tham khảo "Ví dụ URL hợp lệ" ở phần hướng dẫn phía trên.',
      generic: 'Lỗi không xác định',
    },
  },
  result: {
    found: 'Tìm thấy {n} media',
    noMedia: 'Không tìm thấy media nào trong bài này.',
    degraded: 'Chỉ lấy được thumbnail — Instagram có thể đang hạn chế truy cập video cho request không đăng nhập.',
  },
  media: {
    video: 'Video',
    image: 'Hình ảnh',
    download: 'Tải xuống',
  },
  alert: {
    close: 'Đóng',
    code: 'code',
  },
  serverError: {
    NO_WORKER_URL: 'Chưa cấu hình VITE_WORKER_URL. Tạo file frontend/.env.local với VITE_WORKER_URL=https://...',
    NETWORK_ERROR: 'Lỗi mạng. Kiểm tra kết nối internet và thử lại.',
    WORKER_HTTP_ERROR: 'Worker trả về {status}.',
    MISSING_URL: 'Thiếu URL.',
    UNSUPPORTED_PLATFORM: 'URL không phải Instagram hoặc Facebook.',
    INVALID_URL: 'URL không hợp lệ.',
    INVALID_PROTOCOL: 'Chỉ chấp nhận https://.',
    HOST_NOT_ALLOWED: 'Domain {host} không nằm trong whitelist.',
    UPSTREAM_ERROR: 'Upstream trả về {status}.',
    INTERNAL: 'Lỗi nội bộ. Vui lòng thử lại.',
    INVALID_INSTAGRAM_URL: 'URL Instagram không hợp lệ. Hỗ trợ: Reel, Post, IGTV, Story.',
    INSTAGRAM_STORY_BLOCKED: 'Không trích xuất được media. Story Instagram thường yêu cầu đăng nhập — chỉ một số ít story public mới tải được anonymous.',
    INSTAGRAM_NO_MEDIA: 'Không trích xuất được media. Bài có thể là riêng tư hoặc Instagram đã đổi cấu trúc trang.',
    INSTAGRAM_RATE_LIMITED: 'Instagram tạm chặn (rate limit). Đợi 1-2 phút rồi thử lại, hoặc dùng URL khác.',
    INSTAGRAM_NOT_FOUND: 'Bài Instagram không tồn tại hoặc đã bị xoá.',
    INSTAGRAM_STORY_EXPIRED: 'Story Instagram không tồn tại hoặc đã hết hạn 24h.',
    INSTAGRAM_FETCH_FAILED: 'Instagram trả về {status}. Vui lòng thử lại sau.',
    INVALID_FACEBOOK_URL: 'URL Facebook không hợp lệ. Hỗ trợ: Post, Video, Reel, fb.watch.',
    FACEBOOK_STORY_BLOCKED: 'Story Facebook hầu như luôn riêng tư — anonymous request không tải được.',
    FACEBOOK_NO_MEDIA: 'Không trích xuất được media. Bài có thể là riêng tư, chỉ bạn bè, hoặc Facebook đã đổi cấu trúc trang.',
    FACEBOOK_RATE_LIMITED: 'Facebook tạm chặn (rate limit). Đợi 1-2 phút rồi thử lại.',
    FACEBOOK_NOT_FOUND: 'Bài Facebook không tồn tại hoặc đã bị xoá.',
    FACEBOOK_STORY_EXPIRED: 'Story Facebook không tồn tại hoặc đã hết hạn 24h.',
    FACEBOOK_FETCH_FAILED: 'Facebook trả về {status}. Vui lòng thử lại sau.',
  },
};
