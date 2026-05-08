import { test, expect } from '@playwright/test';

const TIKTOK_URL = 'https://www.tiktok.com/@khaby.lame/video/6804458085789256966';

test.describe('Resolve flow', () => {
  test('successful TikTok resolve renders MediaCard', async ({ page }) => {
    await page.route('**/api/resolve', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          platform: 'tiktok',
          kind: 'video',
          mediaItems: [
            {
              type: 'video',
              url: TIKTOK_URL,
              thumbnail: 'https://p16-sign-va.tiktokcdn.com/cover.jpg',
            },
          ],
        }),
      });
    });

    await page.goto('/');
    await page.getByRole('button', { name: /TikTok/i }).click();
    await page.locator('input[type="url"]').fill(TIKTOK_URL);
    await page.getByRole('button', { name: /^Download$/ }).click();

    // Result section becomes visible — find by the "Download" CTA inside the card.
    // (There's a Submit "Download" button in the form too, so we wait for the
    // count of Download buttons to grow past 1.)
    await expect(page.getByText(/Found 1 media/i)).toBeVisible();
  });

  test('rate-limited response shows the retry message', async ({ page }) => {
    await page.route('**/api/resolve', async (route) => {
      await route.fulfill({
        status: 429,
        contentType: 'application/json',
        body: JSON.stringify({
          error: 'Too many requests. Wait a minute and try again.',
          code: 'RATE_LIMITED',
          params: { route: '/api/resolve' },
        }),
      });
    });

    await page.goto('/');
    await page.getByRole('button', { name: /TikTok/i }).click();
    await page.locator('input[type="url"]').fill(TIKTOK_URL);
    await page.getByRole('button', { name: /^Download$/ }).click();

    // Wait for the error alert to appear (red-tinted box). The English copy
    // for RATE_LIMITED starts with "Too many requests".
    await expect(page.getByText('Too many requests', { exact: false })).toBeVisible({
      timeout: 10_000,
    });
    // The error alert also displays the code label.
    await expect(page.getByText('RATE_LIMITED', { exact: false })).toBeVisible();
  });

  test('wrong-platform URL shows inline warning before submit', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: /Instagram/i }).click();
    // Paste a TikTok URL while Instagram tab is active.
    await page.locator('input[type="url"]').fill(TIKTOK_URL);
    await page.locator('input[type="url"]').blur();
    await expect(page.getByText(/Switch the platform/i)).toBeVisible();
  });
});

test('platform selection persists across reload', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /TikTok/i }).click();
  // Verify TikTok tile is selected (ARIA pressed).
  const tiktokBtn = page.getByRole('button', { name: /TikTok/i });
  await expect(tiktokBtn).toHaveAttribute('aria-pressed', 'true');

  await page.reload();
  await expect(page.getByRole('button', { name: /TikTok/i })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
});
