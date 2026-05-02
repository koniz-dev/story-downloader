# Story Downloader

Website tải story từ Instagram và Facebook qua URL. Frontend chạy trên GitHub Pages,
backend là một Cloudflare Worker (free tier) đóng vai trò scraper + media proxy.

> **Lưu ý**: Tool dành cho mục đích cá nhân, chỉ hỗ trợ story công khai. Việc tải nội
> dung có bản quyền hoặc nội dung riêng tư có thể vi phạm ToS của Meta — bạn tự chịu
> trách nhiệm.

## Kiến trúc

```
GitHub Pages (Vite + React + Tailwind)
        │  POST /api/resolve, GET /api/proxy
        ▼
Cloudflare Worker (story-dl-worker)
        │  fetch + parse og: meta tags
        ▼
Instagram / Facebook public endpoints
```

- **`frontend/`** — SPA Vite + React + TypeScript + Tailwind. Deploy lên GitHub Pages
  qua workflow `.github/workflows/deploy-pages.yml`.
- **`worker/`** — Cloudflare Worker (TypeScript) với 3 route: `/api/health`,
  `/api/resolve`, `/api/proxy`. Deploy qua `wrangler deploy` hoặc workflow
  `.github/workflows/deploy-worker.yml`.

## Setup local

### Yêu cầu

- Node.js 20+
- Tài khoản Cloudflare (cho Worker) — `wrangler login` lần đầu

### Worker

```bash
cd worker
npm install
npm run dev          # http://127.0.0.1:8787
# Test:
curl http://127.0.0.1:8787/api/health
```

### Frontend

```bash
cd frontend
npm install
cp .env.example .env.local
# Sửa .env.local: VITE_WORKER_URL=http://127.0.0.1:8787
npm run dev          # http://localhost:5173
```

## Deploy

### 1. Deploy Worker lên Cloudflare

```bash
cd worker
npx wrangler login
npx wrangler deploy
# Ghi nhớ URL: https://story-dl-worker.<account>.workers.dev
```

### 2. Tạo repo GitHub và bật Pages

```bash
# Từ thư mục gốc
git init
git add .
git commit -m "Initial commit"
gh repo create story-downloader --public --source=. --push
```

Trong **Settings → Pages**, đặt **Source = GitHub Actions**.

### 3. Cấu hình Variable cho frontend

**Settings → Secrets and variables → Actions → Variables → New repository variable**:

| Name              | Value                                                |
| ----------------- | ---------------------------------------------------- |
| `VITE_WORKER_URL` | `https://story-dl-worker.<account>.workers.dev`      |

> Đây là **Variable** (public), không phải Secret — giá trị sẽ nằm trong JS bundle.

### 4. (Tùy chọn) Deploy Worker qua GitHub Actions

**Settings → Secrets and variables → Actions → Secrets**:

| Name                    | Mô tả                                             |
| ----------------------- | ------------------------------------------------- |
| `CLOUDFLARE_API_TOKEN`  | Token từ Cloudflare → My Profile → API Tokens     |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare dashboard → Account ID                 |

### 5. Cấu hình CORS trên Worker

Mặc định cho phép `localhost:5173` và mọi `*.github.io`. Nếu dùng custom domain, sửa
`ALLOWED_ORIGINS` trong `worker/wrangler.toml`:

```toml
[vars]
ALLOWED_ORIGINS = "http://localhost:5173,https://your-user.github.io,https://yourdomain.com"
```

Rồi `npx wrangler deploy` lại.

## API Worker

### `GET /api/health`

```json
{ "ok": true }
```

### `POST /api/resolve`

```json
// Request
{ "url": "https://www.instagram.com/stories/<user>/<id>/" }

// Response 200
{
  "platform": "instagram",
  "mediaItems": [
    { "type": "video", "url": "https://...mp4", "thumbnail": "https://...jpg" }
  ]
}

// Response 4xx/5xx
{ "error": "...", "code": "INSTAGRAM_NO_MEDIA" }
```

### `GET /api/proxy?url=<encoded>&filename=<optional>`

Stream media từ CDN của IG/FB về browser kèm `Content-Disposition: attachment` để
trigger download. Whitelist host: `*.cdninstagram.com`, `*.fbcdn.net`, `*.facebook.com`,
`*.instagram.com`.

## Roadmap

- [ ] Hỗ trợ Instagram Reel / Post media (không chỉ story)
- [ ] Hỗ trợ TikTok
- [ ] Tải hàng loạt nhiều URL
- [ ] PWA + share target từ mobile
- [ ] Dark/light mode toggle
- [ ] i18n VI/EN

## Giới hạn đã biết

- Story **riêng tư** không tải được (cần session cookie của user — chưa support).
- Một số story hết hạn 24h, IG/FB sẽ trả 404 → nên thử ngay khi story còn hiển thị.
- IG/FB thay đổi cấu trúc HTML/endpoint thường xuyên — khi parser fail, hãy mở issue
  hoặc cập nhật `worker/src/platforms/*.ts`.
