// Post-build step: clone dist/index.html into one HTML file per non-default
// locale with localized <title>, <meta description>, og:*, twitter:*,
// canonical, hreflang, and JSON-LD. Also emit dist/sitemap.xml.
//
// The source frontend/index.html intentionally has a near-empty <head>; we
// rebuild the head here from scratch and reattach Vite's emitted asset tags.

import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { SEO, LOCALES, DEFAULT_LOCALE, SITE_URL, urlForLocale } from './seo-data.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const DIST = join(ROOT, 'dist');

function escAttr(s) {
  return s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
}

function escHtml(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// Vite injects bundled CSS/JS into <head>. Extract those (and any preload /
// modulepreload hints) so we can put them back after rewriting the head.
function extractViteAssets(headHtml) {
  const tags = [];
  const patterns = [
    /<script\b[^>]*\bsrc="[^"]*\/assets\/[^"]+"[^>]*><\/script>/g,
    /<link\b[^>]*\bhref="[^"]*\/assets\/[^"]+"[^>]*\/?>/g,
    /<link\b[^>]*\brel="(?:modulepreload|preload|prefetch|dns-prefetch|preconnect)"[^>]*\/?>/g,
  ];
  for (const re of patterns) {
    let m;
    while ((m = re.exec(headHtml)) !== null) {
      if (!tags.includes(m[0])) tags.push(m[0]);
    }
  }
  return tags;
}

function buildHreflangBlock() {
  const lines = LOCALES.map(
    (l) =>
      `    <link rel="alternate" hreflang="${l}" href="${escAttr(urlForLocale(l))}" />`,
  );
  lines.push(
    `    <link rel="alternate" hreflang="x-default" href="${escAttr(urlForLocale(DEFAULT_LOCALE))}" />`,
  );
  return lines.join('\n');
}

function buildJsonLd(locale, copy) {
  const obj = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: 'Social Downloader',
    alternateName: copy.ogTitle,
    url: urlForLocale(locale),
    description: copy.description,
    applicationCategory: 'MultimediaApplication',
    operatingSystem: 'Any',
    browserRequirements: 'Requires JavaScript',
    isAccessibleForFree: true,
    inLanguage: LOCALES,
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
    featureList: [
      'Download public Instagram Reels',
      'Download public Instagram Posts and carousels',
      'Download public IGTV videos',
      'Download public Facebook videos and Reels',
      'Support fb.watch short links',
      'Download public TikTok videos and photo slideshows',
      'Support vm.tiktok.com short links',
      'Multilingual UI (English, Vietnamese, Japanese, Korean, Chinese)',
    ],
    author: {
      '@type': 'Person',
      name: 'koniz-dev',
      url: 'https://github.com/koniz-dev',
    },
  };
  return JSON.stringify(obj, null, 2);
}

function buildHead(locale, viteAssets) {
  const copy = SEO[locale];
  const url = urlForLocale(locale);
  const ogImage = `${SITE_URL}/og/${locale}.png`;
  // Public assets (theme-init.js, favicon.svg) live at dist root. Default
  // locale's HTML is at dist/index.html so `./` works; other locales are at
  // dist/<locale>/index.html and need `../`.
  const rootRel = locale === DEFAULT_LOCALE ? './' : '../';

  // Defence-in-depth CSP. The worker URL is locked to a fixed origin; OG
  // images / favicons are same-origin. Tailwind requires 'unsafe-inline' for
  // style attributes generated at runtime — there is no equivalent for scripts.
  // `frame-ancestors`, `sandbox`, and `report-uri` are intentionally omitted:
  // CSP delivered via <meta> can't carry them (the browser warns and ignores).
  // Setting them via response header isn't possible on GitHub Pages.
  const workerOrigin = 'https://story-dl-worker.koniz-dev.workers.dev';
  const csp = [
    "default-src 'self'",
    "script-src 'self'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' https: data:",
    `media-src 'self' ${workerOrigin}`,
    `connect-src 'self' ${workerOrigin}`,
    "base-uri 'self'",
    "form-action 'self'",
  ].join('; ');

  return `<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
    <meta http-equiv="Content-Security-Policy" content="${escAttr(csp)}" />
    <link rel="icon" type="image/svg+xml" href="${rootRel}favicon.svg" />
    <link rel="manifest" href="${rootRel}manifest.webmanifest" />
    <meta name="theme-color" content="#fafafc" media="(prefers-color-scheme: light)" />
    <meta name="theme-color" content="#020617" media="(prefers-color-scheme: dark)" />
    <script src="${rootRel}theme-init.js"></script>

    <title>${escHtml(copy.title)}</title>
    <meta name="description" content="${escAttr(copy.description)}" />
    <meta name="keywords" content="${escAttr(copy.keywords)}" />
    <meta name="author" content="koniz-dev" />
    <meta name="robots" content="index, follow" />

    <link rel="canonical" href="${escAttr(url)}" />

${buildHreflangBlock()}

    <meta property="og:type" content="website" />
    <meta property="og:site_name" content="Social Downloader" />
    <meta property="og:url" content="${escAttr(url)}" />
    <meta property="og:title" content="${escAttr(copy.title)}" />
    <meta property="og:description" content="${escAttr(copy.description)}" />
    <meta property="og:image" content="${escAttr(ogImage)}" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta property="og:locale" content="${escAttr(copy.ogLocale)}" />
${LOCALES.filter((l) => l !== locale)
  .map((l) => `    <meta property="og:locale:alternate" content="${escAttr(SEO[l].ogLocale)}" />`)
  .join('\n')}

    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${escAttr(copy.twitterTitle)}" />
    <meta name="twitter:description" content="${escAttr(copy.twitterDescription)}" />
    <meta name="twitter:image" content="${escAttr(ogImage)}" />

${viteAssets.map((t) => `    ${t}`).join('\n')}

    <script type="application/ld+json">
${buildJsonLd(locale, copy)}
    </script>
  </head>`;
}

// Visible content rendered into <div id="root"> so crawlers and screen readers
// see a hero h1 + intro before React hydrates. ReactDOM.createRoot replaces
// the children on mount, so the skeleton vanishes once the app boots; the
// noscript fallback keeps the page meaningful for users with JS disabled.
function buildBodySkeleton(locale) {
  const copy = SEO[locale];
  return `<div id="root">
      <div data-prerender="skeleton" style="min-height:100dvh;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:24px;text-align:center;font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#0f172a;">
        <h1 style="font-size:1.875rem;font-weight:700;margin:0 0 12px;">${escHtml(copy.heroH1)}</h1>
        <p style="max-width:42rem;font-size:1rem;line-height:1.55;color:#475569;margin:0 0 16px;">${escHtml(copy.heroIntro)}</p>
        <p style="font-size:0.875rem;color:#94a3b8;margin:0;">${escHtml(copy.loadingLabel)}</p>
      </div>
    </div>
    <noscript>
      <div style="padding:24px;text-align:center;font-family:system-ui,sans-serif;">
        <h1>${escHtml(copy.heroH1)}</h1>
        <p>${escHtml(copy.heroIntro)}</p>
        <p><strong>JavaScript is required to use this app.</strong></p>
      </div>
    </noscript>`;
}

function rewrite(html, locale) {
  const headMatch = html.match(/<head>[\s\S]*?<\/head>/);
  if (!headMatch) throw new Error('Could not find <head> in dist/index.html');
  const viteAssets = extractViteAssets(headMatch[0]);
  return html
    .replace(/<html\b[^>]*>/, `<html lang="${escAttr(SEO[locale].htmlLang)}">`)
    .replace(/<head>[\s\S]*?<\/head>/, buildHead(locale, viteAssets))
    .replace(/<div id="root"><\/div>/, buildBodySkeleton(locale));
}

// GitHub Pages serves /404.html with HTTP 404 status for any unmatched path.
// Build a small standalone page (no React, no Vite bundle) that shows the
// localized "not found" message. Locale is detected client-side from the URL
// prefix, falling back to en. Each locale's text is embedded so the page is
// useful even without JS.
function build404() {
  const blocks = LOCALES.map((locale) => {
    const copy = SEO[locale];
    const home = locale === DEFAULT_LOCALE ? './' : `./${locale}/`;
    return `      <div data-locale="${escAttr(locale)}" lang="${escAttr(copy.htmlLang)}" hidden>
        <p class="badge">404</p>
        <h1>${escHtml(copy.notFoundTitle)}</h1>
        <p class="body">${escHtml(copy.notFoundBody)}</p>
        <a class="cta" href="${escAttr(home)}">${escHtml(copy.notFoundCta)}</a>
      </div>`;
  }).join('\n');

  const localesJson = JSON.stringify(LOCALES);
  const defaultJson = JSON.stringify(DEFAULT_LOCALE);

  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="robots" content="noindex" />
    <title>404 — Page not found</title>
    <link rel="icon" type="image/svg+xml" href="./favicon.svg" />
    <style>
      :root { color-scheme: light dark; }
      * { box-sizing: border-box; }
      body {
        margin: 0;
        min-height: 100dvh;
        display: flex;
        align-items: center;
        justify-content: center;
        font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        background: #fafafc;
        color: #0f172a;
        padding: 24px;
      }
      @media (prefers-color-scheme: dark) {
        body { background: #020617; color: #f8fafc; }
        .body { color: #94a3b8; }
        .cta { background: #f8fafc; color: #020617; }
      }
      main { max-width: 36rem; text-align: center; }
      .badge {
        display: inline-block;
        font-size: 0.75rem;
        font-weight: 700;
        letter-spacing: 0.1em;
        color: #64748b;
        margin: 0 0 1rem;
      }
      h1 { font-size: 1.875rem; margin: 0 0 0.75rem; }
      .body { font-size: 1rem; line-height: 1.55; color: #475569; margin: 0 0 1.5rem; }
      .cta {
        display: inline-block;
        padding: 0.625rem 1.25rem;
        background: #0f172a;
        color: #f8fafc;
        text-decoration: none;
        border-radius: 0.5rem;
        font-weight: 600;
      }
      .cta:hover, .cta:focus { opacity: 0.9; }
    </style>
  </head>
  <body>
    <main id="not-found">
${blocks}
    </main>
    <script>
      (function () {
        var LOCALES = ${localesJson};
        var DEFAULT = ${defaultJson};
        // Detect locale from the URL prefix the user landed on. GitHub Pages
        // rewrites all 404s to /404.html but keeps the original location, so
        // history.state and document.location are not authoritative — read
        // the original path from document.referrer if same-origin, else from
        // the location pathname.
        function detect() {
          var path = window.location.pathname || '/';
          var match = path.match(/\\/([a-z]{2})\\/?(?:$|[^a-z])/);
          if (match && LOCALES.indexOf(match[1]) !== -1) return match[1];
          var nav = (navigator.language || '').slice(0, 2).toLowerCase();
          if (LOCALES.indexOf(nav) !== -1) return nav;
          return DEFAULT;
        }
        var locale = detect();
        document.documentElement.lang = locale;
        var blocks = document.querySelectorAll('[data-locale]');
        for (var i = 0; i < blocks.length; i++) {
          var el = blocks[i];
          if (el.getAttribute('data-locale') === locale) el.hidden = false;
        }
        // Defensive: if detection somehow fails, show the default locale.
        var visible = document.querySelector('[data-locale]:not([hidden])');
        if (!visible) {
          var fallback = document.querySelector('[data-locale="' + DEFAULT + '"]');
          if (fallback) fallback.hidden = false;
        }
      })();
    </script>
  </body>
</html>
`;
}

function buildSitemap() {
  const today = new Date().toISOString().slice(0, 10);
  const entries = LOCALES.map((locale) => {
    const url = urlForLocale(locale);
    // Per the sitemap XSD, <loc>, <lastmod>, <changefreq>, <priority> must
    // come in that order, BEFORE any extension elements like <xhtml:link>.
    // Google's strict parser rejects the file otherwise ("Sitemap could not
    // be read").
    const alts = LOCALES.map(
      (l) =>
        `    <xhtml:link rel="alternate" hreflang="${l}" href="${escAttr(urlForLocale(l))}" />`,
    ).join('\n');
    return `  <url>
    <loc>${escAttr(url)}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>${locale === DEFAULT_LOCALE ? '1.0' : '0.9'}</priority>
${alts}
    <xhtml:link rel="alternate" hreflang="x-default" href="${escAttr(urlForLocale(DEFAULT_LOCALE))}" />
  </url>`;
  }).join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${entries}
</urlset>
`;
}

function main() {
  const sourcePath = join(DIST, 'index.html');
  if (!existsSync(sourcePath)) {
    throw new Error(`Expected ${sourcePath} (run vite build first)`);
  }
  const sourceHtml = readFileSync(sourcePath, 'utf8');

  console.log('Generating per-locale HTML:');
  for (const locale of LOCALES) {
    const html = rewrite(sourceHtml, locale);
    if (locale === DEFAULT_LOCALE) {
      writeFileSync(sourcePath, html);
      console.log(`  ✔ index.html (${locale})`);
    } else {
      const dir = join(DIST, locale);
      mkdirSync(dir, { recursive: true });
      writeFileSync(join(dir, 'index.html'), html);
      console.log(`  ✔ ${locale}/index.html`);
    }
  }

  writeFileSync(join(DIST, '404.html'), build404());
  console.log('  ✔ 404.html');

  writeFileSync(join(DIST, 'sitemap.xml'), buildSitemap());
  console.log('  ✔ sitemap.xml');
}

// Pure builders are exported for unit testing. main() only runs when this
// file is invoked directly (npm run build), not when imported by tests.
export { buildBodySkeleton, buildHead, build404, buildSitemap, rewrite };

const invokedAsScript =
  import.meta.url === `file://${process.argv[1]}` ||
  import.meta.url.endsWith('/build-locale-html.mjs') && process.argv[1]?.endsWith('build-locale-html.mjs');

if (invokedAsScript) {
  try {
    main();
  } catch (err) {
    console.error('Locale HTML generation failed:', err);
    process.exit(1);
  }
}
