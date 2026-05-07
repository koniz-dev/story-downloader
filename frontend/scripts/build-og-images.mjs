// Generate one 1200x630 OG image per locale into dist/og/<locale>.png and
// public/og/<locale>.png. Runs as `prebuild`. Fonts are fetched from Google
// Fonts on first build and cached under node_modules/.cache/og-fonts.

import { mkdirSync, writeFileSync, existsSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';
import wawoff from 'wawoff2';
import { SEO, LOCALES } from './seo-data.mjs';

// Detect woff2 magic bytes ("wOF2"). Satori's bundled opentype.js cannot read
// woff2; we must decompress to TTF first.
function isWoff2(buf) {
  return buf.length >= 4 && buf[0] === 0x77 && buf[1] === 0x4f && buf[2] === 0x46 && buf[3] === 0x32;
}

async function toTtf(buf) {
  if (!isWoff2(buf)) return buf;
  const decompressed = await wawoff.decompress(new Uint8Array(buf));
  return Buffer.from(decompressed);
}

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const PUBLIC_OG = join(ROOT, 'public', 'og');
const FONT_CACHE = join(ROOT, 'node_modules', '.cache', 'og-fonts');

// Google Fonts CSS API → returns one or more `@font-face` blocks. We pass
// `&text=` so we only download codepoints we actually render. CJK text can
// split across multiple subset blocks; we fetch each and pass them all to
// satori (which uses the first one that covers each glyph). Satori 0.20+
// reads woff2 directly via an internal WASM decoder.
async function fetchGoogleFonts(family, weight, text) {
  const cacheKey = createHash('sha1').update(`${family}|${weight}|${text}`).digest('hex');
  const cacheDir = join(FONT_CACHE, cacheKey);
  const manifestPath = join(cacheDir, 'manifest.json');
  if (existsSync(manifestPath)) {
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
    return manifest.files.map((f) => readFileSync(join(cacheDir, f)));
  }

  const url =
    `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family)}:wght@${weight}` +
    `&text=${encodeURIComponent(text)}`;
  const css = await fetch(url, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36',
    },
  }).then((r) => r.text());

  const matches = [
    ...css.matchAll(/src:\s*url\((https:[^)]+)\)\s*format\(['"][^'"]+['"]\)/g),
  ];
  if (matches.length === 0) {
    throw new Error(`No font URLs found for ${family} ${weight}\nCSS:\n${css}`);
  }

  mkdirSync(cacheDir, { recursive: true });
  const filenames = [];
  const buffers = [];
  for (let i = 0; i < matches.length; i++) {
    const raw = Buffer.from(await fetch(matches[i][1]).then((r) => r.arrayBuffer()));
    const ttf = await toTtf(raw);
    const name = `${i}.ttf`;
    writeFileSync(join(cacheDir, name), ttf);
    filenames.push(name);
    buffers.push(ttf);
  }
  writeFileSync(manifestPath, JSON.stringify({ files: filenames }));
  return buffers;
}

// Pick the right font family per locale. Latin + Vietnamese both render well
// with Inter; CJK locales get Noto Sans variants.
function fontFamilyFor(locale) {
  switch (locale) {
    case 'ja': return 'Noto Sans JP';
    case 'ko': return 'Noto Sans KR';
    case 'zh': return 'Noto Sans SC';
    default:   return 'Inter';
  }
}

// React-element-shaped node helper (no JSX in .mjs).
function h(type, props, ...children) {
  return { type, props: { ...props, children: children.length === 1 ? children[0] : children } };
}

function template(copy) {
  return h(
    'div',
    {
      style: {
        width: '1200px',
        height: '630px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '64px 72px',
        background:
          'linear-gradient(135deg, #020617 0%, #1e1b4b 55%, #4c1d95 100%)',
        color: '#f1f5f9',
        fontFamily: 'Sans',
      },
    },
    // Header: wordmark
    h(
      'div',
      { style: { display: 'flex', alignItems: 'center', gap: '16px' } },
      h(
        'div',
        {
          style: {
            width: '56px',
            height: '56px',
            borderRadius: '14px',
            background: 'linear-gradient(135deg, #6366f1, #d946ef, #fbbf24)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '32px',
            fontWeight: 800,
            color: '#0f172a',
          },
        },
        'S',
      ),
      h(
        'div',
        {
          style: {
            fontSize: '32px',
            fontWeight: 700,
            letterSpacing: '-0.5px',
            color: '#e2e8f0',
          },
        },
        'Social Downloader',
      ),
    ),
    // Headline + subline
    h(
      'div',
      { style: { display: 'flex', flexDirection: 'column', gap: '20px' } },
      h(
        'div',
        {
          style: {
            fontSize: '76px',
            fontWeight: 800,
            lineHeight: 1.05,
            letterSpacing: '-1.5px',
            color: '#ffffff',
          },
        },
        copy.ogTitle,
      ),
      h(
        'div',
        {
          style: {
            fontSize: '34px',
            fontWeight: 500,
            lineHeight: 1.3,
            color: '#cbd5e1',
          },
        },
        copy.ogSubtitle,
      ),
    ),
    // Footer: pill chips for IG / FB + URL
    h(
      'div',
      {
        style: {
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        },
      },
      h(
        'div',
        { style: { display: 'flex', gap: '14px' } },
        h(
          'div',
          {
            style: {
              padding: '10px 22px',
              borderRadius: '999px',
              background: 'rgba(244, 114, 182, 0.18)',
              border: '1px solid rgba(244, 114, 182, 0.45)',
              color: '#fbcfe8',
              fontSize: '24px',
              fontWeight: 600,
              display: 'flex',
            },
          },
          'Instagram',
        ),
        h(
          'div',
          {
            style: {
              padding: '10px 22px',
              borderRadius: '999px',
              background: 'rgba(96, 165, 250, 0.18)',
              border: '1px solid rgba(96, 165, 250, 0.45)',
              color: '#bfdbfe',
              fontSize: '24px',
              fontWeight: 600,
              display: 'flex',
            },
          },
          'Facebook',
        ),
      ),
      h(
        'div',
        {
          style: {
            fontSize: '22px',
            color: '#94a3b8',
            display: 'flex',
          },
        },
        'koniz-dev.github.io/story-downloader',
      ),
    ),
  );
}

async function buildOne(locale) {
  const copy = SEO[locale];
  const family = fontFamilyFor(locale);
  // Collect all glyphs that will appear in this image, so the Google Fonts
  // text-subset request returns just enough font data.
  const glyphs = [
    'Social Downloader',
    copy.ogTitle,
    copy.ogSubtitle,
    'Instagram',
    'Facebook',
    'koniz-dev.github.io/story-downloader',
    'S',
  ].join('');

  const [regulars, bolds, extras] = await Promise.all([
    fetchGoogleFonts(family, 500, glyphs),
    fetchGoogleFonts(family, 700, glyphs),
    fetchGoogleFonts(family, 800, glyphs),
  ]);

  const fonts = [
    ...regulars.map((data) => ({ name: 'Sans', data, weight: 500, style: 'normal' })),
    ...bolds.map((data)    => ({ name: 'Sans', data, weight: 700, style: 'normal' })),
    ...extras.map((data)   => ({ name: 'Sans', data, weight: 800, style: 'normal' })),
  ];

  const svg = await satori(template(copy), {
    width: 1200,
    height: 630,
    fonts,
  });

  const png = new Resvg(svg, { fitTo: { mode: 'width', value: 1200 } }).render().asPng();

  mkdirSync(PUBLIC_OG, { recursive: true });
  const out = join(PUBLIC_OG, `${locale}.png`);
  writeFileSync(out, png);
  console.log(`  ✔ og/${locale}.png  (${(png.length / 1024).toFixed(0)} KB)`);
}

async function main() {
  console.log('Generating OG images:');
  for (const locale of LOCALES) {
    await buildOne(locale);
  }
}

main().catch((err) => {
  console.error('OG image generation failed:', err);
  process.exit(1);
});
