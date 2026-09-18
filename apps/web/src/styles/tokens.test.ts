import { describe, expect, it } from 'vitest';
import tokensCss from './tokens.css?raw';

const colors = Object.fromEntries(
  [...tokensCss.matchAll(/--(color-[a-z-]+):\s*(#[0-9a-f]{6});/g)].map((match) => [
    match[1],
    match[2],
  ]),
);

// WCAG 2.x relative luminance and contrast ratio.
const luminance = (hex: string) => {
  const [r = 0, g = 0, b = 0] = [1, 3, 5].map((start) => {
    const channel = parseInt(hex.slice(start, start + 2), 16) / 255;
    return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

const colorOf = (token: string) => {
  const value = colors[token];
  if (!value) {
    throw new Error(`Token ${token} is not declared as a hex color in tokens.css`);
  }
  return value;
};

const contrast = (foreground: string, background: string) => {
  const [lighter = 0, darker = 0] = [
    luminance(colorOf(foreground)),
    luminance(colorOf(background)),
  ].sort((a, b) => b - a);
  return (lighter + 0.05) / (darker + 0.05);
};

describe('design tokens', () => {
  it.each([
    ['color-text', 'color-bg'],
    ['color-text', 'color-surface'],
    ['color-text-muted', 'color-bg'],
    ['color-text-muted', 'color-surface'],
    ['color-accent', 'color-surface'],
    ['color-accent', 'color-bg'],
    ['color-accent-text', 'color-accent'],
    ['color-accent-text', 'color-accent-hover'],
    ['color-success-text', 'color-success-bg'],
    ['color-warning-text', 'color-warning-bg'],
    ['color-danger-text', 'color-danger-bg'],
    ['color-danger-text', 'color-surface'],
  ])('text %s on %s has a contrast of at least 4.5:1', (foreground, background) => {
    expect(contrast(foreground, background)).toBeGreaterThanOrEqual(4.5);
  });

  it.each(['color-bg', 'color-surface'])(
    'the focus ring has a contrast of at least 3:1 against %s',
    (background) => {
      expect(contrast('color-focus', background)).toBeGreaterThanOrEqual(3);
    },
  );

  it('keeps the touch target at 44px', () => {
    expect(tokensCss).toMatch(/--tap-size:\s*44px;/);
  });
});
