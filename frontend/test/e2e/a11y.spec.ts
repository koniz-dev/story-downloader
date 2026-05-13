import { test, expect } from '@playwright/test';
import { AxeBuilder } from '@axe-core/playwright';

// Smoke-level a11y check. Scans the home page and asserts there are no
// SERIOUS or CRITICAL WCAG 2 AA violations. We don't gate on minor/moderate
// findings here because some come from third-party UI choices (colour
// contrast on platform brand badges); track those separately if they crop up.

test('home page has no serious or critical a11y violations', async ({ page }) => {
  await page.goto('/');
  // Wait for React to hydrate and replace the prerender skeleton; otherwise
  // axe sees the skeleton's inline-styled markup and produces noise.
  await page.getByRole('button', { name: /Instagram/i }).waitFor();

  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'best-practice'])
    .analyze();

  const blocking = results.violations.filter(
    (v) => v.impact === 'serious' || v.impact === 'critical',
  );

  if (blocking.length > 0) {
    console.log('A11y violations:');
    for (const v of blocking) {
      console.log(`  [${v.impact}] ${v.id}: ${v.help} (${v.helpUrl})`);
      for (const node of v.nodes) {
        console.log(`    target: ${node.target.join(' ')}`);
      }
    }
  }

  expect(blocking, 'no serious/critical a11y violations').toEqual([]);
});

test('platform-selected state has no serious a11y violations', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /TikTok/i }).click();
  // Guide content should render.
  await page.getByText(/watermark/i).first().waitFor();

  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa'])
    .analyze();

  const blocking = results.violations.filter(
    (v) => v.impact === 'serious' || v.impact === 'critical',
  );

  expect(blocking).toEqual([]);
});
