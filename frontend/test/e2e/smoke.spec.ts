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
