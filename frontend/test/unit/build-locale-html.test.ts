// Build-time HTML generator tests. Imports the .mjs builder module directly
// to verify the per-locale skeleton and 404 page produce sane output for every
// supported locale.

import { describe, it, expect } from 'vitest';
// @ts-expect-error - .mjs has no type declarations
import { buildBodySkeleton, build404 } from '../../scripts/build-locale-html.mjs';
// @ts-expect-error - .mjs has no type declarations
import { LOCALES, SEO } from '../../scripts/seo-data.mjs';

// The build script HTML-escapes content before injecting it, so assertions
// compare the escaped form.
function escHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

describe('buildBodySkeleton', () => {
  for (const locale of LOCALES as string[]) {
    it(`emits the localized h1 + intro for ${locale}`, () => {
      const html = buildBodySkeleton(locale);
      const copy = (SEO as Record<string, Record<string, string>>)[locale];
      expect(html).toContain(`<h1`);
      expect(html).toContain(escHtml(copy.heroH1));
      expect(html).toContain(escHtml(copy.heroIntro));
      expect(html).toContain(escHtml(copy.loadingLabel));
    });

    it(`renders a noscript fallback for ${locale}`, () => {
      const html = buildBodySkeleton(locale);
      expect(html).toContain('<noscript>');
      expect(html).toContain('JavaScript is required');
    });
  }

  it('wraps the skeleton inside #root so React.createRoot replaces it', () => {
    const html = buildBodySkeleton('en');
    expect(html.indexOf('<div id="root">')).toBeLessThan(
      html.indexOf('<h1'),
    );
  });

  it('escapes characters that would break out of attributes', () => {
    const html = buildBodySkeleton('en');
    // The hero text uses an ampersand — must be escaped, not raw.
    expect(html).toContain('Instagram, Facebook &amp; TikTok');
    expect(html).not.toContain('Instagram, Facebook & TikTok Video');
  });
});

describe('build404', () => {
  const html = build404();

  it('emits a complete standalone HTML document', () => {
    expect(html.startsWith('<!DOCTYPE html>')).toBe(true);
    expect(html).toContain('<html');
    expect(html).toContain('</html>');
  });

  it('contains one block per supported locale', () => {
    for (const locale of LOCALES as string[]) {
      expect(html).toContain(`data-locale="${locale}"`);
    }
  });

  it('shows localized notFoundTitle for every locale', () => {
    for (const locale of LOCALES as string[]) {
      const copy = (SEO as Record<string, Record<string, string>>)[locale];
      expect(html).toContain(escHtml(copy.notFoundTitle));
      expect(html).toContain(escHtml(copy.notFoundBody));
      expect(html).toContain(escHtml(copy.notFoundCta));
    }
  });

  it('flags the page as noindex so search engines skip it', () => {
    expect(html).toMatch(/<meta\s+name="robots"\s+content="noindex"/);
  });

  it('embeds the locale list as JSON for client-side detection', () => {
    expect(html).toContain('["en","vi","ja","ko","zh"]');
  });

  it('points the home CTA at the locale-specific path', () => {
    expect(html).toContain('href="./"');
    expect(html).toContain('href="./vi/"');
    expect(html).toContain('href="./ja/"');
    expect(html).toContain('href="./ko/"');
    expect(html).toContain('href="./zh/"');
  });

  it('starts every locale block hidden so JS reveals exactly one', () => {
    const blocks = html.match(/data-locale="[a-z]{2}"[^>]*hidden/g) ?? [];
    expect(blocks.length).toBe(LOCALES.length);
  });

  it('does not pull in any Vite-bundled JS or CSS (must work standalone)', () => {
    expect(html).not.toContain('/assets/');
    expect(html).not.toContain('modulepreload');
  });
});
