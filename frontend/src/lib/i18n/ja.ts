import type { Translations } from './types';

export const ja: Translations = {
  app: {
    title: 'Social Downloader',
    subtitle: 'Instagram と Facebook の公開リール・投稿・動画をダウンロード',
    footer: '個人利用のみ。コンテンツ制作者のプライバシーと著作権を尊重してください。',
  },
  language: {
    label: '言語',
  },
  steps: {
    selectPlatform: '1. プラットフォームを選択',
    guide: '2. リンクの取得方法',
    pasteAndDownload: '3. リンクを貼ってダウンロード',
  },
  platform: {
    instagram: { name: 'Instagram', kinds: 'リール / 投稿 / IGTV' },
    facebook: { name: 'Facebook', kinds: '投稿 / 動画 / リール' },
  },
  kind: {
    reel: 'リール',
    post: '投稿',
    video: '動画',
    story: 'ストーリー',
  },
  guide: {
    title: 'リンクの取得方法',
    examplesTitle: '有効な URL の例',
    instagram: {
      intro: '公開アカウントの Instagram コンテンツに対応します。アカウントは「公開」設定が必要です。',
      steps: [
        'Instagram(Web またはアプリ)を開き、ダウンロードしたいリール / 投稿 / IGTV を表示します。',
        '投稿の右上にある ⋯(三点アイコン)をタップします。',
        '「リンクをコピー」を選択します。',
        'このページに戻り、下のボックスにリンクを貼り付けます。',
      ],
      warnings: [
        'ストーリー(/stories/...)は通常ログインが必要です。試みますが、大半は失敗します。',
        '非公開アカウントは匿名でダウンロードできません。',
      ],
    },
    facebook: {
      intro: '公開設定(Audience = Public)の Facebook 投稿と動画に対応します。',
      steps: [
        'Facebook を開き、ダウンロードしたい投稿または動画にアクセスします。',
        '投稿右上の ⋯ アイコン →「リンクをコピー」をクリックします。',
        'または投稿日時(例:「2 日前」)をクリックして固定リンクを開き、アドレスバーから URL をコピーします。',
        '下のボックスにリンクを貼り付けます。',
      ],
      warnings: [
        '「友達のみ」の投稿や非公開グループはダウンロードできません。',
        'Facebook ストーリーはほぼ常に非公開です — 通常はダウンロードできません。',
      ],
    },
  },
  form: {
    label: '{platform} の URL を貼り付け',
    submit: 'ダウンロード',
    submitting: '処理中…',
    error: {
      wrongPlatform: 'この URL は {got} のものです({expected} ではありません)。上のタブを切り替えるか、別の URL を貼り付けてください。',
      notUrl: 'URL が無効です。ブラウザのアドレスバーからコピーしてください。',
      unknownKind: 'URL を認識できません。上のガイドの「有効な URL の例」をご覧ください。',
      generic: '不明なエラー',
    },
  },
  result: {
    found: '{n} 件のメディアが見つかりました',
    noMedia: 'この投稿にメディアが見つかりません。',
  },
  media: {
    video: '動画',
    image: '画像',
    download: 'ダウンロード',
  },
  alert: {
    close: '閉じる',
    code: 'コード',
  },
};
