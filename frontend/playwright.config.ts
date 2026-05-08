import { defineConfig, devices } from '@playwright/test';

const PORT = 5174;
const BASE_URL = `http://localhost:${PORT}`;

export default defineConfig({
  testDir: './test/e2e',
  timeout: 30_000,
  retries: process.env.CI ? 2 : 0,
  forbidOnly: !!process.env.CI,
  use: {
    baseURL: BASE_URL,
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
  webServer: {
    // Run against the production build (`vite preview`) so tests exercise the
    // same HTML the user gets on GitHub Pages — including CSP meta, locale
    // routing, etc. Note the prebuild step (OG image generation) runs here too.
    command: `npm run build && vite preview --port ${PORT} --strictPort`,
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000, // build can take 30-90 s
    env: {
      // Same-origin — POST with `Content-Type: application/json` is not a
      // "simple" request and would otherwise trigger a CORS preflight; routing
      // through the same origin sidesteps that. Tests `page.route()` the
      // /api/* paths to fulfil responses without ever hitting the network.
      VITE_WORKER_URL: BASE_URL,
    },
  },
});
