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

The deploy workflow (`.github/workflows/deploy.yml`) runs `npm test` then
`npm run build:demo` on pushes to `main`. Node 20.

## Project Structure

```
src/
  index.ts              # Public barrel — curated re-exports only
  types.ts              # All interfaces and type aliases
  utils.ts              # Pure helper functions
  Timeline.ts           # Main entry class (composes all others)
  BandRenderer.ts       # Renders bands (axes, spans, brackets, labels)
  EdgeRenderer.ts       # Renders edges between bands
  GraphLayout.ts        # Computes hierarchical node layout
  InteractionManager.ts # Click/hover/drill-down interaction handling
  LaneAssigner.ts       # Greedy lane-packing algorithm
  ScaleFactory.ts       # Creates D3 scales and axes
  Viewport.ts           # Zoom/pan via d3-zoom
  themes.ts             # CSS custom property theming system
  __tests__/            # Co-located test files (*.test.ts)
demo/                   # Demo app (not part of library)
```

## Code Style

### Formatting

- **2-space indentation**, no tabs
- **Single quotes** for all strings
- **Semicolons** always
- **Trailing commas** in multi-line constructs; omit in single-line
- Lines generally under ~120 characters; no strict enforced limit

### Imports

Separate `import type` from value imports — never mix in one statement.
Order: (1) external value imports, (2) side-effect imports (`import 'd3-transition'`),
(3) external type imports, (4) local value imports, (5) local type imports.

```typescript
import { select } from 'd3-selection';
import 'd3-transition';
import type { Selection, BaseType } from 'd3-selection';
import type { EdgeDatum, ResolvedOptions } from './types';
import { cssVar } from './themes';
```

### Exports

**Named exports only** — no default exports anywhere. The barrel `index.ts`
re-exports the public API; use `export type { ... }` for type-only re-exports.
Internal modules (GraphLayout, BandRenderer, etc.) are not re-exported.

### Types

- **Interfaces** for all object shapes (data models, configs, options).
  No `I` prefix on interfaces.
- **Type aliases** only for unions: `type TimelineScale = ScaleTime<...> | ScaleLinear<...>`
- **Explicit return types** on all exported/public functions and methods.
  Internal helpers may rely on inference.
- Use `null` for "intentionally absent" (`parentNode: TimelineNode | null`),
  `undefined` for optional properties (`end?: Date | number`).
- Prefer optional chaining (`?.`) and nullish coalescing (`??`) over null checks.
- Utility types used: `Partial<>`, `Required<>`, `Omit<>`, `Record<string, unknown>`.

### Naming Conventions

| Element               | Convention          | Examples                                  |
|-----------------------|---------------------|-------------------------------------------|
| Files (class)         | PascalCase          | `Timeline.ts`, `BandRenderer.ts`          |
| Files (non-class)     | camelCase           | `types.ts`, `utils.ts`, `themes.ts`       |
| Classes               | PascalCase          | `Timeline`, `GraphLayout`                 |
| Interfaces / Types    | PascalCase          | `TimelineNode`, `ResolvedOptions`         |
| Functions             | camelCase           | `computeDomain`, `assignLanes`            |
| Variables / params    | camelCase           | `bandHeight`, `innerWidth`                |
| Module-level consts   | UPPER_SNAKE_CASE    | `AXIS_AREA_HEIGHT`, `BRACKET_HEIGHT`      |
| Booleans              | `is`/`was` prefix   | `isFirstRender`, `isExpanded`             |
| Private class members | `private` keyword   | No `_` or `#` prefix                     |
| Unused params         | `_` prefix          | `_event`, `_d`                            |
| CSS classes           | `tl-` prefix        | `tl-band`, `tl-span`, `tl-edge`          |

Short local abbreviations are acceptable: `opts`, `d` (datum), `g` (group),
`s` (scale), `ax` (axis), `bw`/`bh` (bounds width/height).

### Functions

- **Module-level functions**: use `function` declarations (not arrow functions).
- **Class methods**: standard method syntax.
- **Arrow function class properties**: only for methods passed as callbacks
  (to preserve `this` binding), e.g. `handleClick = (node: TimelineNode): void => { ... }`.
- **Inline arrow functions**: for D3 chain callbacks and functional operations.
- Use traditional `function` keyword (not arrow) when D3's `this` binding to
  the DOM element is needed.
- Use default parameter values for boolean flags: `fitToContent(animate = true)`.

### Classes

- Classes for stateful components; free functions for stateless logic.
- No inheritance — composition only. `Timeline` composes renderer/manager classes.
- Field ordering: private fields, constructor, public API, internal methods, helpers.
  Sections separated by `// ---...---` comment dividers.
- Use definite assignment assertion (`!`) for fields initialized in called methods
  rather than the constructor: `private svg!: Selection<...>`.

### Error Handling

- **No try/catch** — prevent invalid states structurally via types and early returns.
- **Throw** only for programmer errors (e.g., empty input to `computeDomain`).
- **Return `null`** from search functions when no match is found.
- **Early return** for edge cases (empty input, missing DOM elements, zero dimensions).
- Use optional chaining for cleanup: `this.resizeObserver?.disconnect()`.
- Non-null assertion (`!`) only when context guarantees non-null (e.g., after
  a while-loop guard).

### Comments

- **Section separators**: `// ---...---` horizontal rules to divide files/classes
  into logical sections.
- **JSDoc** (`/** ... */`) on all exported interfaces, functions, and public methods.
- **Inline comments**: short, purpose-driven `//` comments. Explain *why*, not *what*.
- Interface properties have inline `/** ... */` doc comments.

### D3 Patterns

- Import individual D3 packages (`d3-selection`, `d3-scale`, etc.), not monolithic `d3`.
- Always include `import 'd3-transition'` as a side-effect import in files using `.transition()`.
- Fully parameterize Selection types: `Selection<SVGGElement, GraphNode, BaseType, unknown>`.
- Use the enter-update-exit pattern for data joins consistently.
- Cast scales to `(v: Date | number) => number` when used outside D3 APIs.
- Use `as any` at D3 API boundaries where TS type definitions are overly strict
  (e.g., `axisG.call(axis as any)`).
- Theme values via CSS custom properties: use `cssVar('tokenName')` helper,
  applied with `.style()` not `.attr()`.
- All transitions use `opts.animationDuration` for consistent animation timing.

### Testing

- Test framework: Vitest. Import `describe`, `it`, `expect` from `'vitest'`.
- Test files live in `src/__tests__/` and are named `<Module>.test.ts`.
- Tests use local helper factory functions (e.g., `node()`, `graphNode()`) at
  the top of the file to construct test data.
- Section separators (`// ---...---`) divide test groups within a file.
- Prefer `toEqual` for deep equality, `toBe` for primitives/identity,
  `toThrow` for error assertions.
