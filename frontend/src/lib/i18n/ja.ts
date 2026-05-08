import type { Translations } from './types';

export const ja: Translations = {
  app: {
    title: 'Social Downloader',
    subtitle: 'Instagram・Facebook・TikTok の公開動画をダウンロード',
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
    tiktok: { name: 'TikTok', kinds: '動画 / 写真' },
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
    tiktok: {
      intro: 'TikTok の公開動画と写真スライドショーに対応します。ダウンロードした動画には TikTok のウォーターマークが入ります。',
      steps: [
        'TikTok アプリまたは Web を開き、対象の動画を表示します。',
        '「シェア」(矢印アイコン)→「リンクをコピー」をタップします。',
        'デスクトップではアドレスバーから URL をコピーします。',
        '下のボックスにリンクを貼り付けます。',
      ],
      warnings: [
        'ダウンロードした動画には常に TikTok のウォーターマークが含まれます — クリーン版にはログインが必要です。',
        'TikTok がサーバーを一時的にレート制限することがあります。「再試行」エラーが出たら 30 秒ほど待って再度お試しください。',
        '一部の動画は地域制限により匿名では取得できません。',
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
    degraded: 'サムネイルのみ取得できました。Instagram が未ログインリクエストの動画アクセスを制限している可能性があります。',
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
  serverError: {
    NO_WORKER_URL: 'VITE_WORKER_URL が未設定です。frontend/.env.local を作成し、VITE_WORKER_URL=https://... を設定してください。',
    NETWORK_ERROR: 'ネットワークエラー。インターネット接続を確認してから、もう一度お試しください。',
    WORKER_HTTP_ERROR: 'Worker から {status} が返されました。',
    MISSING_URL: 'URL が指定されていません。',
    UNSUPPORTED_PLATFORM: 'URL は Instagram・Facebook・TikTok のいずれでもありません。',
    INVALID_URL: 'URL が無効です。',
    INVALID_PROTOCOL: 'https:// のみ受け付けます。',
    HOST_NOT_ALLOWED: 'ドメイン {host} はホワイトリストに含まれていません。',
    UPSTREAM_ERROR: 'アップストリームから {status} が返されました。',
    INTERNAL: '内部エラーが発生しました。もう一度お試しください。',
    INVALID_INSTAGRAM_URL: 'Instagram の URL が無効です。対応:リール / 投稿 / IGTV / ストーリー。',
    INSTAGRAM_STORY_BLOCKED: 'メディアを取得できません。Instagram ストーリーは通常ログインが必要です — 一部の公開ストーリーのみ匿名で取得できます。',
    INSTAGRAM_NO_MEDIA: 'メディアを取得できません。投稿が非公開か、Instagram のページ構造が変更された可能性があります。',
    INSTAGRAM_RATE_LIMITED: 'Instagram がリクエストを制限しています。1〜2 分後に再試行するか、別の URL をお試しください。',
    INSTAGRAM_NOT_FOUND: 'この Instagram 投稿は存在しないか、削除されています。',
    INSTAGRAM_STORY_EXPIRED: 'この Instagram ストーリーは存在しないか、24 時間の期限が切れています。',
    INSTAGRAM_FETCH_FAILED: 'Instagram から {status} が返されました。後ほど再試行してください。',
    INVALID_FACEBOOK_URL: 'Facebook の URL が無効です。対応:投稿 / 動画 / リール / fb.watch。',
    FACEBOOK_STORY_BLOCKED: 'Facebook ストーリーはほぼ常に非公開です — 匿名リクエストでは取得できません。',
    FACEBOOK_NO_MEDIA: 'メディアを取得できません。投稿が非公開・友達のみ公開、または Facebook のページ構造が変更された可能性があります。',
    FACEBOOK_RATE_LIMITED: 'Facebook がリクエストを制限しています。1〜2 分後に再試行してください。',
    FACEBOOK_NOT_FOUND: 'この Facebook 投稿は存在しないか、削除されています。',
    FACEBOOK_STORY_EXPIRED: 'この Facebook ストーリーは存在しないか、24 時間の期限が切れています。',
    FACEBOOK_FETCH_FAILED: 'Facebook から {status} が返されました。後ほど再試行してください。',
    INVALID_TIKTOK_URL: 'TikTok の URL が無効です。対応:動画 (/@<user>/video/<id>)、写真 (/@<user>/photo/<id>)、短縮リンク (vm.tiktok.com、tiktok.com/t/)。',
    TIKTOK_NO_MEDIA: 'メディアを取得できません。動画が非公開・地域制限、または TikTok のページ構造が変更された可能性があります。',
    TIKTOK_RATE_LIMITED: 'TikTok が一時的にリクエストをブロックしています。30 秒ほど待って再度お試しください。',
    TIKTOK_NOT_FOUND: 'この TikTok 動画は存在しないか、削除されています。',
    TIKTOK_FETCH_FAILED: 'TikTok から {status} が返されました。後ほど再試行してください。',
    TIKTOK_GEO_BLOCKED: 'TikTok がリクエストをブロックしました。動画が地域制限を受けているか、ログインが必要な可能性があります。',
  },
};
