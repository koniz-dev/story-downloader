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
};
