import { describe, it, expect } from 'vitest';
import { cssVar } from '../themes';

// ---------------------------------------------------------------------------
// cssVar
// ---------------------------------------------------------------------------

describe('cssVar', () => {
  it('returns a CSS var() reference for a camelCase token', () => {
    expect(cssVar('axisColor')).toBe('var(--tl-axis-color)');
  });

  it('handles multi-word camelCase tokens', () => {
    expect(cssVar('bracketHoverColor')).toBe('var(--tl-bracket-hover-color)');
  });

  it('handles single-word tokens', () => {
    // No uppercase letters to convert.
    expect(cssVar('edgeColor')).toBe('var(--tl-edge-color)');
  });

  it('returns consistent prefix for all tokens', () => {
    const tokens = [
      'axisColor',
      'axisText',
      'bracketColor',
      'bracketLeafColor',
      'bracketHoverColor',
      'markerFill',
      'markerStroke',
      'labelColor',
      'edgeColor',
      'edgeHoverColor',
    ] as const;

    for (const token of tokens) {
      const result = cssVar(token);
      expect(result).toMatch(/^var\(--tl-[a-z-]+\)$/);
    }
  });
});
