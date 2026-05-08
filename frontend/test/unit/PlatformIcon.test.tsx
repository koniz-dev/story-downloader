import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { PlatformIcon } from '../../src/components/PlatformIcon';

describe('PlatformIcon', () => {
  it.each(['instagram', 'facebook', 'tiktok'] as const)(
    'renders an SVG for %s',
    (platform) => {
      const { container } = render(<PlatformIcon platform={platform} className="w-6 h-6" />);
      const svg = container.querySelector('svg');
      expect(svg).not.toBeNull();
      expect(svg?.getAttribute('aria-hidden')).toBe('true');
    },
  );

  it('TikTok variant uses the brand colours', () => {
    const { container } = render(<PlatformIcon platform="tiktok" />);
    const svg = container.querySelector('svg');
    const html = svg?.outerHTML ?? '';
    // TikTok's signature dual-shadow uses cyan + magenta.
    expect(html).toContain('#25F4EE');
    expect(html).toContain('#FE2C55');
  });
});
