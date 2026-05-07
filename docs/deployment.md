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
