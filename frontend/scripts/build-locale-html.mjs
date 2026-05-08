// Post-build step: clone dist/index.html into one HTML file per non-default
// locale with localized <title>, <meta description>, og:*, twitter:*,
// canonical, hreflang, and JSON-LD. Also emit dist/sitemap.xml.
//
// The source frontend/index.html intentionally has a near-empty <head>; we
// rebuild the head here from scratch and reattach Vite's emitted asset tags.

import { mkdirSync, readFileSync, writeFileSync, copyFileSync, existsSync } from 'node:fs';
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

  return `<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <link rel="icon" type="image/svg+xml" href="./favicon.svg" />
    <meta name="theme-color" content="#020617" />

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

function rewrite(html, locale) {
  const headMatch = html.match(/<head>[\s\S]*?<\/head>/);
  if (!headMatch) throw new Error('Could not find <head> in dist/index.html');
  const viteAssets = extractViteAssets(headMatch[0]);
  return html
    .replace(/<html\b[^>]*>/, `<html lang="${escAttr(SEO[locale].htmlLang)}">`)
    .replace(/<head>[\s\S]*?<\/head>/, buildHead(locale, viteAssets));
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

  // GitHub Pages serves 404.html for unknown paths. Use the English page so
  // mistyped URLs still render the SPA shell.
  copyFileSync(sourcePath, join(DIST, '404.html'));
  console.log('  ✔ 404.html');

  writeFileSync(join(DIST, 'sitemap.xml'), buildSitemap());
  console.log('  ✔ sitemap.xml');
}

try {
  main();
} catch (err) {
  console.error('Locale HTML generation failed:', err);
  process.exit(1);
}
