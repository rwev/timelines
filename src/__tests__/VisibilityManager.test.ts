import { describe, it, expect } from 'vitest';
import { VisibilityManager } from '../VisibilityManager';
import type { TimelineNode, ScaleFn } from '../types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function node(
  id: string,
  start: number,
  end: number,
  children?: TimelineNode[],
): TimelineNode {
  return { id, label: id, start, end, children };
}

function eventNode(id: string, start: number): TimelineNode {
  return { id, label: id, type: 'event', start };
}

/**
 * Create a simple linear scale mapping [domainMin, domainMax] → [0, width].
 * Mirrors what d3 scaleLinear does, but without the dependency.
 */
function linearScale(
  domainMin: number,
  domainMax: number,
  width: number,
): ScaleFn {
  const dRange = domainMax - domainMin || 1;
  return ((v: Date | number) => {
    const n = typeof v === 'number' ? v : v.getTime();
    return ((n - domainMin) / dRange) * width;
  }) as ScaleFn;
}

// ---------------------------------------------------------------------------
// Basic visibility
// ---------------------------------------------------------------------------

describe('VisibilityManager basic visibility', () => {
  // Two top-level spans, each with children.
  //
  // scale: [0, 200] → [0, 800]  ⇒  1 unit = 4px
  // 'a' at [0, 100]  → 400px wide
  // 'b' at [100, 200] → 400px wide

  const data: TimelineNode[] = [
    node('a', 0, 100, [
      node('a1', 0, 50),
      node('a2', 50, 100),
    ]),
    node('b', 100, 200, [
      node('b1', 100, 150),
      node('b2', 150, 200),
    ]),
  ];

  it('always includes top-level nodes', () => {
    const vm = new VisibilityManager();
    const scale = linearScale(0, 200, 800);

    // With a very high threshold, no children should appear,
    // but top-level nodes are always visible.
    const { visibleNodes } = vm.computeVisibility(data, scale, 9999, 9998, Infinity);

    const ids = visibleNodes.map((n) => n.id);
    expect(ids).toContain('a');
    expect(ids).toContain('b');
    expect(ids).not.toContain('a1');
    expect(ids).not.toContain('b1');
  });

  it('reveals children when parent span is wide enough', () => {
    const vm = new VisibilityManager();
    // scale maps [0, 200] → [0, 800]
    // 'a' is 400px wide, 'a1' at [0,50] would be 200px wide in this scale.
    const scale = linearScale(0, 200, 800);

    // expandThreshold = 100: both a (400px) and b (400px) exceed it,
    // so their children should be visible.
    const { visibleNodes } = vm.computeVisibility(data, scale, 100, 80, Infinity);

    const ids = visibleNodes.map((n) => n.id);
    expect(ids).toContain('a1');
    expect(ids).toContain('a2');
    expect(ids).toContain('b1');
    expect(ids).toContain('b2');
  });

  it('hides children when parent span is too narrow', () => {
    const vm = new VisibilityManager();
    // scale maps [0, 200] → [0, 100]
    // 'a' is only 50px wide → below threshold of 60.
    const scale = linearScale(0, 200, 100);

    const { visibleNodes } = vm.computeVisibility(data, scale, 60, 40, Infinity);

    const ids = visibleNodes.map((n) => n.id);
    expect(ids).toContain('a');  // top-level always visible
    expect(ids).not.toContain('a1');
    expect(ids).not.toContain('b1');
  });
});

// ---------------------------------------------------------------------------
// Events
// ---------------------------------------------------------------------------

describe('VisibilityManager events', () => {
  const data: TimelineNode[] = [
    eventNode('ev-top', 50),
    node('a', 0, 100, [
      eventNode('ev-child', 25),
      node('a1', 0, 50),
    ]),
  ];

  it('top-level events are always visible', () => {
    const vm = new VisibilityManager();
    const scale = linearScale(0, 100, 100); // narrow: a is 100px

    const { visibleNodes } = vm.computeVisibility(data, scale, 9999, 9998, Infinity);

    const ids = visibleNodes.map((n) => n.id);
    expect(ids).toContain('ev-top');
  });

  it('child events appear when parent span is wide enough', () => {
    const vm = new VisibilityManager();
    const scale = linearScale(0, 100, 800); // a is 800px → wide enough

    const { visibleNodes } = vm.computeVisibility(data, scale, 60, 40, Infinity);

    const ids = visibleNodes.map((n) => n.id);
    expect(ids).toContain('ev-child');
    expect(ids).toContain('a1');
  });
});

// ---------------------------------------------------------------------------
// Expanded IDs (detail indicator control)
// ---------------------------------------------------------------------------

describe('VisibilityManager expandedIds', () => {
  const data: TimelineNode[] = [
    node('a', 0, 100, [
      node('a1', 0, 50),
    ]),
    node('b', 100, 200), // leaf — no children
  ];

  it('marks nodes as expanded when children are visible', () => {
    const vm = new VisibilityManager();
    const scale = linearScale(0, 200, 800); // a is 400px wide

    const { expandedIds } = vm.computeVisibility(data, scale, 100, 80, Infinity);

    // 'a' has children and is wide enough → its children are visible → expanded.
    expect(expandedIds.has('a')).toBe(true);
    // 'b' has no children → never in expandedIds.
    expect(expandedIds.has('b')).toBe(false);
  });

  it('does not mark nodes as expanded when children are hidden', () => {
    const vm = new VisibilityManager();
    const scale = linearScale(0, 200, 100); // a is only 50px wide

    const { expandedIds } = vm.computeVisibility(data, scale, 60, 40, Infinity);

    // 'a' is too narrow → children hidden → not expanded.
    expect(expandedIds.has('a')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Hysteresis
// ---------------------------------------------------------------------------

describe('VisibilityManager hysteresis', () => {
  // Single span with children, covering the full domain.
  // With domain [0, 100] → [0, 800]:
  //   'a' = 800px. children 'a1' = 400px.
  //
  // We'll vary the scale width to simulate zoom levels.
  const data: TimelineNode[] = [
    node('a', 0, 100, [
      node('a1', 0, 50, [
        node('a1a', 0, 25),
      ]),
    ]),
  ];

  it('uses different thresholds for reveal vs hide', () => {
    const vm = new VisibilityManager();

    // a1 covers [0,50] = half the domain. Its pixel width = scale_width / 2.
    //
    // Thresholds: expand = 60, collapse = 20.
    //
    // At scale_width 80:  a1 = 40px → below expand (60) → hidden.
    // At scale_width 200: a1 = 100px → above expand (60) → visible.
    // At scale_width 80:  a1 = 40px → below expand but ABOVE collapse (20) → still visible.
    // At scale_width 30:  a1 = 15px → below collapse (20) → hidden.

    // Step 1: narrow scale — a1 is 40px, below expand threshold.
    const r1 = vm.computeVisibility(data, linearScale(0, 100, 80), 60, 20, Infinity);
    expect(r1.visibleNodes.map((n) => n.id)).not.toContain('a1');

    // Step 2: wide scale — a1 is 100px, above expand threshold.
    const r2 = vm.computeVisibility(data, linearScale(0, 100, 200), 60, 20, Infinity);
    expect(r2.visibleNodes.map((n) => n.id)).toContain('a1');

    // Step 3: scale back — a1 is 40px.
    // Below expand (60) but above collapse (20) → hysteresis keeps a1 visible.
    const r3 = vm.computeVisibility(data, linearScale(0, 100, 80), 60, 20, Infinity);
    expect(r3.visibleNodes.map((n) => n.id)).toContain('a1');

    // Step 4: scale to very narrow — a1 is 15px, below collapse threshold.
    const r4 = vm.computeVisibility(data, linearScale(0, 100, 30), 60, 20, Infinity);
    expect(r4.visibleNodes.map((n) => n.id)).not.toContain('a1');
  });
});

// ---------------------------------------------------------------------------
// maxDepth
// ---------------------------------------------------------------------------

describe('VisibilityManager maxDepth', () => {
  const data: TimelineNode[] = [
    node('a', 0, 100, [
      node('a1', 0, 100, [
        node('a1a', 0, 100, [
          node('leaf', 0, 50),
        ]),
      ]),
    ]),
  ];

  it('respects maxDepth limit', () => {
    const vm = new VisibilityManager();
    const scale = linearScale(0, 100, 800);

    const { visibleNodes } = vm.computeVisibility(data, scale, 10, 5, 2);

    const ids = visibleNodes.map((n) => n.id);
    expect(ids).toContain('a');     // depth 0
    expect(ids).toContain('a1');    // depth 1
    expect(ids).toContain('a1a');   // depth 2
    expect(ids).not.toContain('leaf'); // depth 3 — blocked
  });
});

// ---------------------------------------------------------------------------
// isChanged
// ---------------------------------------------------------------------------

describe('VisibilityManager isChanged', () => {
  const data: TimelineNode[] = [
    node('a', 0, 100, [
      node('a1', 0, 50),
    ]),
  ];

  it('reports change when visible set differs', () => {
    const vm = new VisibilityManager();
    const narrow = linearScale(0, 100, 30);
    const wide = linearScale(0, 100, 800);

    vm.computeVisibility(data, narrow, 60, 40, Infinity);
    const { isChanged } = vm.computeVisibility(data, wide, 60, 40, Infinity);
    expect(isChanged).toBe(true);
  });

  it('reports stable when visible set is unchanged', () => {
    const vm = new VisibilityManager();
    const scale = linearScale(0, 100, 800);

    vm.computeVisibility(data, scale, 60, 40, Infinity);
    const { isChanged } = vm.computeVisibility(data, scale, 60, 40, Infinity);
    expect(isChanged).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Edge cases
// ---------------------------------------------------------------------------

describe('VisibilityManager edge cases', () => {
  it('handles empty data', () => {
    const vm = new VisibilityManager();
    const scale = linearScale(0, 1, 800);
    const { visibleNodes } = vm.computeVisibility([], scale, 60, 40, Infinity);
    expect(visibleNodes.length).toBe(0);
  });

  it('handles circular references without infinite loop', () => {
    const a: TimelineNode = { id: 'a', label: 'A', start: 0, end: 100, children: [] };
    const b: TimelineNode = { id: 'b', label: 'B', start: 0, end: 100, children: [] };
    a.children = [b];
    b.children = [a];

    const vm = new VisibilityManager();
    const scale = linearScale(0, 100, 800);

    // Should not throw or hang.
    const { visibleNodes } = vm.computeVisibility([a], scale, 10, 5, Infinity);
    expect(visibleNodes.map((n) => n.id)).toContain('a');
  });
});
