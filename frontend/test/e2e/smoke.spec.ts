import { test, expect } from '@playwright/test';

test('home page renders and shows 3 platform tiles', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByText(/Social Downloader/i)).toBeVisible();
  // Platform tiles are buttons — there should be exactly three.
  await expect(page.getByRole('button', { name: /Instagram/i })).toBeVisible();
  await expect(page.getByRole('button', { name: /Facebook/i })).toBeVisible();
  await expect(page.getByRole('button', { name: /TikTok/i })).toBeVisible();
});

test('platform selector shows the corresponding guide', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /TikTok/i }).click();
  // TikTok guide mentions watermark in the warning block.
  await expect(page.getByText(/watermark/i).first()).toBeVisible();
  // Switch to Instagram — guide intro changes.
  await page.getByRole('button', { name: /Instagram/i }).click();
  await expect(page.getByText(/Public/i).first()).toBeVisible();
});

test('CSP meta tag is present', async ({ page }) => {
  await page.goto('/');
  const csp = await page.locator('meta[http-equiv="Content-Security-Policy"]').getAttribute('content');
  expect(csp).toContain("default-src 'self'");
  expect(csp).toContain("script-src 'self'");
  // frame-ancestors is intentionally NOT in the meta CSP (browsers ignore it).
  expect(csp).not.toContain('frame-ancestors');
});

test('pre-rendered HTML carries a visible h1 + intro before React boots', async ({ page }) => {
  // Disable JS so React never mounts — we should still see the SEO body.
  await page.context().route('**/*.js', (route) => route.abort());
  await page.goto('/');
  // The prerender skeleton sets a heroH1 from seo-data.mjs.
  await expect(page.locator('h1')).toContainText(/Instagram, Facebook (&|and) TikTok/i);
  // Intro paragraph value-prop wording.
  await expect(page.getByText(/no signup/i).first()).toBeVisible();
});

test('404 page shows localized not-found content', async ({ page }) => {
  // GitHub Pages serves /<base>/404.html for any unmatched path; vite preview
  // only exposes static files under the configured `base`, so hit the file
  // via the base path (matches what users see on the deployed site).
  await page.goto('/story-downloader/404.html');
  await expect(page.locator('main#not-found')).toBeVisible();
  await expect(page.locator('[data-locale="en"]:not([hidden])')).toContainText('Page not found');
  await expect(page.getByRole('link', { name: /Go to homepage/i })).toBeVisible();
});
