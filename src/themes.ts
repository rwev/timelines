import type { ThemeTokens } from './types';

// ---------------------------------------------------------------------------
// Default token values
//
// These are injected as CSS custom properties under `.timelines-root`.
// Override any variable in your own stylesheet to re-theme the component:
//
//   .timelines-root {
//     --tl-axis-color: #336699;
//     --tl-bracket-color: #224466;
//     /* … */
//   }
// ---------------------------------------------------------------------------

const DEFAULT_TOKENS: ThemeTokens = {
  axisColor: '#666666',
  axisText: '#444444',
  bracketColor: '#333333',
  bracketLeafColor: '#666666',
  bracketHoverColor: '#000000',
  markerFill: '#333333',
  markerStroke: '#666666',
  labelColor: '#333333',
  edgeColor: '#666666',
  edgeHoverColor: '#222222',
};

// ---------------------------------------------------------------------------
// CSS variable injection
// ---------------------------------------------------------------------------

const CSS_VAR_PREFIX = '--tl-';

function tokensToCssVars(tokens: ThemeTokens): string {
  return Object.entries(tokens)
    .map(([key, value]) => `  ${CSS_VAR_PREFIX}${camelToKebab(key)}: ${value};`)
    .join('\n');
}

function camelToKebab(s: string): string {
  return s.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`);
}

/**
 * Build the full `<style>` content that defines CSS custom properties
 * scoped under `.timelines-root`.
 */
function buildStyleSheet(tokens: ThemeTokens): string {
  return `.timelines-root {\n${tokensToCssVars(tokens)}\n}`;
}

// ---------------------------------------------------------------------------
// ThemeManager
// ---------------------------------------------------------------------------

export class ThemeManager {
  private styleEl: HTMLStyleElement | null = null;

  /** Inject the theme `<style>` element under the given container. */
  apply(container: HTMLElement): void {
    if (!this.styleEl) {
      this.styleEl = document.createElement('style');
      this.styleEl.setAttribute('data-timelines-theme', '');
      container.prepend(this.styleEl);
    }
    this.styleEl.textContent = buildStyleSheet(DEFAULT_TOKENS);
  }

  destroy(): void {
    this.styleEl?.remove();
    this.styleEl = null;
  }
}

/**
 * Helper that returns a CSS `var()` reference for a theme token.
 *
 * Must be applied via `.style()` (not `.attr()`) so the browser
 * resolves the custom property at paint time.
 */
export function cssVar(token: keyof ThemeTokens): string {
  return `var(${CSS_VAR_PREFIX}${camelToKebab(token)})`;
}
