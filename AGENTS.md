# AGENTS.md

Hierarchical timeline visualization library built on D3.js. TypeScript, Vite,
Vitest. Published as an ES/CJS library; demo deployed to GitHub Pages.

## Build / Lint / Test Commands

```bash
npm run build          # tsc && vite build — type-check then bundle library
npm test               # vitest run — run all tests once
npm run test:watch     # vitest — watch mode
npm run dev            # vite serve demo — local dev server for demo app
npm run build:demo     # build demo as static site (GitHub Pages)
npx tsc --noEmit       # type-check only (no linter configured)
```

### Running a single test file

```bash
npx vitest run src/__tests__/utils.test.ts
```

### Running a single test by name

```bash
npx vitest run -t "finds root-level nodes"
```

### CI

`.github/workflows/deploy.yml` runs `npm test` then `npm run build:demo`
on pushes to `main`. Node 20.

## Project Structure

```
src/
  index.ts              # Public barrel — curated re-exports only
  types.ts              # All interfaces and type aliases
  utils.ts              # Pure helper functions
  Timeline.ts           # Click-to-drill-down timeline (composes all others)
  ZoomableTimeline.ts   # Semantic-zoom timeline variant (zoom-driven expansion)
  VisibilityManager.ts  # Computes zoom-level-dependent expansion state
  BandRenderer.ts       # Renders bands (axes, spans, brackets, labels)
  EdgeRenderer.ts       # Renders Bezier edges between bands
  GraphLayout.ts        # Computes hierarchical 2D node layout
  InteractionManager.ts # Click/hover/drill-down interaction handling
  LaneAssigner.ts       # Greedy lane-packing algorithm
  ScaleFactory.ts       # Creates D3 scales and axes
  Viewport.ts           # Zoom/pan via d3-zoom
  themes.ts             # CSS custom property theming system
  __tests__/            # Co-located test files (*.test.ts)
demo/
  index.html + main.ts        # Drill-down demo
  zoomable.html + zoomable.ts # Semantic-zoom demo
```

## Code Style

### Formatting

- **2-space indentation**, no tabs.
- **Single quotes**, **semicolons always**, **trailing commas** in multi-line.
- Lines generally under ~120 characters; no strict enforced limit.

### Imports

Separate `import type` from value imports — never mix in one statement.
Order: (1) external values, (2) side-effects (`import 'd3-transition'`),
(3) external types, (4) local values, (5) local types.

```typescript
import { select } from 'd3-selection';
import 'd3-transition';
import type { Selection, BaseType } from 'd3-selection';
import { cssVar } from './themes';
import type { EdgeDatum, ResolvedOptions } from './types';
```

### Exports

**Named exports only** — no default exports. The barrel `index.ts` re-exports
the public API; use `export type { ... }` for type-only re-exports. Internal
modules (GraphLayout, BandRenderer, etc.) are not re-exported.

### Types

- **Interfaces** for object shapes; no `I` prefix. **Type aliases** only for unions.
- **Explicit return types** on exported/public functions. Helpers may infer.
- `null` = intentionally absent; `undefined` = optional property (`end?: Date`).
- Prefer `?.` and `??` over null checks.
- Utility types used: `Partial<>`, `Required<>`, `Omit<>`, `Record<string, unknown>`.

### Naming Conventions

| Element               | Convention        | Examples                              |
|-----------------------|-------------------|---------------------------------------|
| Files (class)         | PascalCase        | `Timeline.ts`, `BandRenderer.ts`      |
| Files (non-class)     | camelCase         | `types.ts`, `utils.ts`, `themes.ts`   |
| Classes               | PascalCase        | `Timeline`, `GraphLayout`             |
| Interfaces / Types    | PascalCase        | `TimelineNode`, `ResolvedOptions`     |
| Functions / variables | camelCase         | `computeDomain`, `bandHeight`         |
| Module-level consts   | UPPER_SNAKE_CASE  | `AXIS_AREA_HEIGHT`, `BRACKET_HEIGHT`  |
| Booleans              | `is`/`was` prefix | `isFirstRender`, `wasExpanded`        |
| Private members       | `private` keyword | No `_` or `#` prefix                 |
| Unused params         | `_` prefix        | `_event`, `_d`                        |
| CSS classes           | `tl-` prefix      | `tl-band`, `tl-span`, `tl-edge`      |

Short abbreviations OK: `opts`, `d` (datum), `g` (group), `s` (scale).

### Functions & Classes

- **Module-level functions**: `function` declarations (not arrows).
- **Arrow class properties**: only for callbacks needing `this` binding.
- Use `function` keyword when D3's `this` binding to DOM element is needed.
- Default params for boolean flags: `fitToContent(animate = true)`.
- Classes for stateful components; free functions for stateless logic.
- No inheritance — composition only.
- Field ordering: private fields, constructor, public API, internals, helpers.
  Sections separated by `// ---...---` comment dividers.
- Definite assignment (`!`) for fields initialized in called methods.

### Error Handling

- **No try/catch** — prevent invalid states via types and early returns.
- **Throw** only for programmer errors (null container, invalid data).
- Return `null` from search functions; return fallback values for empty inputs.
- Guard async callbacks with `isDestroyed` flag after `destroy()`.
- Optional chaining for cleanup: `this.resizeObserver?.disconnect()`.
- Non-null assertion (`!`) only when context guarantees non-null.
- **Visited-set protection** on all recursive tree walks (circular data guard).

### Comments

- `// ---...---` horizontal rules to divide files into logical sections.
- **JSDoc** (`/** ... */`) on all exported interfaces, functions, public methods.
- Inline `//` comments: explain *why*, not *what*.

### D3 Patterns

- Import individual packages (`d3-selection`, `d3-scale`), not monolithic `d3`.
- Always `import 'd3-transition'` as side-effect in files using `.transition()`.
- Fully parameterize Selection types: `Selection<SVGGElement, GraphNode, BaseType, unknown>`.
- Enter-update-exit pattern for all data joins.
- Cast scales to `ScaleFn` when used outside D3 APIs; `as any` at strict API boundaries.
- **Name all transitions** to prevent cross-cancellation (e.g., `.transition('band-layout')`).
- Theme via CSS custom properties: `cssVar('tokenName')` with `.style()` not `.attr()`.
- All transitions use `opts.animationDuration` for consistent timing.

### Testing

- Framework: Vitest. Import `describe`, `it`, `expect` from `'vitest'`.
- Files: `src/__tests__/<Module>.test.ts`.
- Local factory helpers (`node()`, `graphNode()`) at top of each test file.
- Section separators (`// ---...---`) divide test groups.
- `toEqual` for deep equality, `toBe` for primitives, `toThrow` for errors.
- DOM tests use `// @vitest-environment jsdom` directive and stub
  `ResizeObserver`, `SVGElement.getComputedTextLength`, `svg.width.baseVal`.
