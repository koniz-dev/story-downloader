import type { Translations } from './types';

export const ko: Translations = {
  app: {
    title: 'Social Downloader',
    subtitle: 'Instagram과 Facebook의 공개 릴스, 게시물, 동영상 다운로드',
    footer: '개인 용도로만 사용하세요. 창작자의 개인정보와 저작권을 존중해 주세요.',
  },
  language: {
    label: '언어',
  },
  steps: {
    selectPlatform: '1. 플랫폼 선택',
    guide: '2. 링크 가져오는 방법',
    pasteAndDownload: '3. 링크 붙여넣고 다운로드',
  },
  platform: {
    instagram: { name: 'Instagram', kinds: '릴스 / 게시물 / IGTV' },
    facebook: { name: 'Facebook', kinds: '게시물 / 동영상 / 릴스' },
  },
  kind: {
    reel: '릴스',
    post: '게시물',
    video: '동영상',
    story: '스토리',
  },
  guide: {
    title: '링크 가져오는 방법',
    examplesTitle: '유효한 URL 예시',
    instagram: {
      intro: '공개 계정의 Instagram 콘텐츠를 지원합니다. 계정이 공개 상태여야 합니다.',
      steps: [
        'Instagram(웹 또는 앱)에서 다운로드할 릴스 / 게시물 / IGTV를 엽니다.',
        '게시물 오른쪽 상단의 ⋯(점 세 개) 아이콘을 누릅니다.',
        '"링크 복사"를 선택합니다.',
        '이 페이지로 돌아와 아래 입력란에 링크를 붙여넣습니다.',
      ],
      warnings: [
        '스토리(/stories/...)는 보통 로그인이 필요합니다 — 시도는 하지만 대부분 실패합니다.',
        '비공개 계정은 익명으로 다운로드할 수 없습니다.',
      ],
    },
    facebook: {
      intro: '공개 설정(Audience = Public)의 Facebook 게시물과 동영상을 지원합니다.',
      steps: [
        'Facebook에서 다운로드할 게시물이나 동영상을 엽니다.',
        '게시물 오른쪽 상단의 ⋯ 아이콘 → "링크 복사"를 클릭합니다.',
        '또는 게시 시간(예: "2일 전")을 클릭해 고유 링크를 열고 주소창에서 URL을 복사합니다.',
        '아래 입력란에 링크를 붙여넣습니다.',
      ],
      warnings: [
        '"친구만 보기" 게시물이나 비공개 그룹은 다운로드할 수 없습니다.',
        'Facebook 스토리는 거의 항상 비공개여서 일반적으로 다운로드할 수 없습니다.',
      ],
    },
  },
  form: {
    label: '{platform} URL 붙여넣기',
    submit: '다운로드',
    submitting: '처리 중…',
    error: {
      wrongPlatform: '이 URL은 {got}의 것이며 {expected}이(가) 아닙니다. 위쪽 탭을 바꾸거나 다른 URL을 붙여넣으세요.',
      notUrl: '유효하지 않은 URL입니다. 브라우저 주소창에서 복사해 주세요.',
      unknownKind: 'URL을 인식할 수 없습니다. 위 가이드의 "유효한 URL 예시"를 참고하세요.',
      generic: '알 수 없는 오류',
    },
  },
  result: {
    found: '{n}개의 미디어를 찾았습니다',
    noMedia: '이 게시물에서 미디어를 찾을 수 없습니다.',
  },
  media: {
    video: '동영상',
    image: '이미지',
    download: '다운로드',
  },
  alert: {
    close: '닫기',
    code: '코드',
  },
};
