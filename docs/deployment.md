# Deployment

The frontend goes to **GitHub Pages**, the backend goes to **Cloudflare
Workers**. Both have free tiers that cover personal use.

## 1. Deploy the Worker to Cloudflare

```bash
cd worker
npx wrangler login
npx wrangler deploy
# Note the URL — looks like: https://story-dl-worker.<account>.workers.dev
```

## 2. Push the repo and enable GitHub Pages

```bash
# From the project root
git init
git add .
git commit -m "Initial commit"
gh repo create story-downloader --public --source=. --push
```

In **Settings → Pages**, set **Source = GitHub Actions**.

## 3. Configure the frontend variable

**Settings → Secrets and variables → Actions → Variables → New repository variable**:

| Name              | Value                                                |
| ----------------- | ---------------------------------------------------- |
| `VITE_WORKER_URL` | `https://story-dl-worker.<account>.workers.dev`      |

> This is a **Variable** (public), not a Secret — the value is embedded in the
> built JS bundle and visible to anyone with DevTools.

## 4. (Optional) Deploy the Worker via GitHub Actions

If you want the Worker to redeploy on every push to `main`, add these secrets.

**Settings → Secrets and variables → Actions → Secrets**:

| Name                    | Description                                       |
| ----------------------- | ------------------------------------------------- |
| `CLOUDFLARE_API_TOKEN`  | Token from Cloudflare → My Profile → API Tokens   |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare dashboard → Account ID                 |

The token needs the `Workers Scripts:Edit` permission scope.

## 5. Configure CORS on the Worker

By default, `localhost:5173` and any `*.github.io` origin are allowed. If you
serve the frontend from a custom domain, edit `ALLOWED_ORIGINS` in
`worker/wrangler.toml`:

```toml
[vars]
ALLOWED_ORIGINS = "http://localhost:5173,https://your-user.github.io,https://yourdomain.com"
```

Then redeploy:

```bash
cd worker && npx wrangler deploy
```

## 6. (Optional) Use a custom domain

- For the frontend: add a `CNAME` file under `frontend/public/` containing your
  domain, then configure DNS per
  [GitHub's Pages custom-domain guide](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site).
- For the Worker: bind a custom route in **Cloudflare → Workers → Triggers**.
  Update `VITE_WORKER_URL` and `ALLOWED_ORIGINS` accordingly.
- For SEO: add a repository **Variable** named `SITE_URL` with the new origin
  (e.g. `https://yourdomain.com`). The build step picks it up and bakes it
  into every locale's canonical, hreflang, OG, and `sitemap.xml`. To wire it
  in, add one line under `Build` in `.github/workflows/deploy-pages.yml`:
  ```yaml
  env:
    VITE_WORKER_URL: ${{ vars.VITE_WORKER_URL }}
    VITE_BASE_PATH: /${{ github.event.repository.name }}/
    SITE_URL: ${{ vars.SITE_URL }}
  ```
  When the variable is unset, the default is `https://koniz-dev.github.io/story-downloader`.

## 7. Post-deploy SEO checklist

Run this **once after the very first deploy** and again any time you ship a
material change to OG images, titles, descriptions, or the locale set.

### 7.1 Verify ownership in Google Search Console

One-time setup. Skip if already done.

1. Go to https://search.google.com/search-console.
2. Choose **URL prefix** (not Domain — you don't control DNS for `github.io`).
3. Enter `https://koniz-dev.github.io/story-downloader/`.
4. Pick the **HTML file** verification method, download `googleXXXX.html`.
5. Drop the file into `frontend/public/`. Vite copies `public/` to `dist/` on
   every build, so it stays live.
6. Commit + push, wait for the `deploy-pages` workflow to finish.
7. Open `https://koniz-dev.github.io/story-downloader/googleXXXX.html` in a
   browser to confirm it loads, then click **Verify** in GSC.

### 7.2 Submit the sitemap

GSC sidebar → **Sitemaps** → enter `sitemap.xml` → **Submit**.

The full URL is `https://koniz-dev.github.io/story-downloader/sitemap.xml`,
but GSC takes the relative path. Status should flip to **Success** within a
few minutes after submit.

> **Important**: only submit *after* the deploy that produced the sitemap is
> live (check the URL in a browser first). Submitting before deploy gives
> "Couldn't fetch" — fix by removing the entry and re-submitting.

`Discovered pages` count lags by hours/days even when status is Success.
That's normal; don't keep poking it.

### 7.3 Speed up first-time indexing

GSC top bar → **Inspect any URL** → paste each URL in turn → **Request Indexing**:

- `https://koniz-dev.github.io/story-downloader/`
- `https://koniz-dev.github.io/story-downloader/vi/`
- `https://koniz-dev.github.io/story-downloader/ja/`
- `https://koniz-dev.github.io/story-downloader/ko/`
- `https://koniz-dev.github.io/story-downloader/zh/`

Quota is ~10 requests/day per property — 5 fits easily. URLs typically appear
in Google search 2–7 days later. Track via GSC sidebar → **Pages**: each URL
moves from "Crawled — currently not indexed" → "Indexed".

### 7.4 Refresh social-media OG caches

Facebook caches OG metadata for ~30 days. After the first deploy (and after
any OG image / title / description change), force re-scrape:

- **Facebook**: https://developers.facebook.com/tools/debug/ — paste each
  locale URL → click **Scrape Again**. Login required.
- **LinkedIn**: https://www.linkedin.com/post-inspector/ — paste URL → click
  **Inspect**. This force-refreshes LinkedIn's cache too.
- **Twitter/X**: their public Card Validator was deprecated in 2022. Tweet
  the URL from a draft account to spot-check the preview if you care.

Skip this step on routine code-only deploys — only run it when you've
changed the meta tags or the OG images.
