import type { Translations } from './types';

export const zh: Translations = {
  app: {
    title: 'Social Downloader',
    subtitle: '下载 Instagram 与 Facebook 的公开 Reel、帖子和视频',
    footer: '仅供个人使用。请尊重创作者的隐私和版权。',
  },
  language: {
    label: '语言',
  },
  steps: {
    selectPlatform: '1. 选择平台',
    guide: '2. 如何获取链接',
    pasteAndDownload: '3. 粘贴链接并下载',
  },
  platform: {
    instagram: { name: 'Instagram', kinds: 'Reel / 帖子 / IGTV' },
    facebook: { name: 'Facebook', kinds: '帖子 / 视频 / Reel' },
  },
  kind: {
    reel: 'Reel',
    post: '帖子',
    video: '视频',
    story: '快拍',
  },
  guide: {
    title: '如何获取链接',
    examplesTitle: '有效 URL 示例',
    instagram: {
      intro: '支持公开账号的 Instagram 内容。账号必须设为公开。',
      steps: [
        '打开 Instagram(网页或 App),进入要下载的 Reel / 帖子 / IGTV。',
        '点击帖子右上角的 ⋯(三点)图标。',
        '选择「复制链接」。',
        '回到此页面,把链接粘贴到下方输入框。',
      ],
      warnings: [
        '快拍(/stories/...)通常需要登录 — 会尝试但大多数会失败。',
        '私密账号无法匿名下载。',
      ],
    },
    facebook: {
      intro: '支持设为公开(Audience = Public)的 Facebook 帖子和视频。',
      steps: [
        '打开 Facebook,进入要下载的帖子或视频。',
        '点击帖子右上角的 ⋯ 图标 → 「复制链接」。',
        '或点击发布时间(如「2 天前」)打开固定链接,然后从地址栏复制 URL。',
        '把链接粘贴到下方输入框。',
      ],
      warnings: [
        '「仅好友可见」的帖子和不公开的群组无法下载。',
        'Facebook 快拍几乎都是私密的 — 通常无法下载。',
      ],
    },
  },
  form: {
    label: '粘贴 {platform} URL',
    submit: '下载',
    submitting: '处理中…',
    error: {
      wrongPlatform: '此 URL 属于 {got},不是 {expected}。请切换上方平台标签或粘贴其他 URL。',
      notUrl: 'URL 无效。请从浏览器地址栏复制。',
      unknownKind: '无法识别的 URL。请参考上方指南中的「有效 URL 示例」。',
      generic: '未知错误',
    },
  },
  result: {
    found: '找到 {n} 个媒体',
    noMedia: '此帖子未找到媒体。',
  },
  media: {
    video: '视频',
    image: '图片',
    download: '下载',
  },
  alert: {
    close: '关闭',
    code: '错误码',
  },
};
