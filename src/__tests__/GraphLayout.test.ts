import { describe, it, expect } from 'vitest';
import { GraphLayout } from '../GraphLayout';
import { resolveOptions } from '../utils';
import type { TimelineNode } from '../types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeLayout(data: TimelineNode[], overrides = {}) {
  const opts = resolveOptions({ data, ...overrides });
  return new GraphLayout(opts);
}

const sampleData: TimelineNode[] = [
  {
    id: 'a',
    label: 'A',
    start: 0,
    end: 50,
    children: [
      { id: 'a1', label: 'A1', start: 0, end: 20 },
      { id: 'a2', label: 'A2', start: 25, end: 50 },
    ],
  },
  {
    id: 'b',
    label: 'B',
    start: 50,
    end: 100,
    children: [
      { id: 'b1', label: 'B1', start: 50, end: 75 },
      { id: 'b2', label: 'B2', start: 75, end: 100 },
    ],
  },
];

// ---------------------------------------------------------------------------
// Expansion state
// ---------------------------------------------------------------------------

describe('GraphLayout expansion state', () => {
  it('starts with nothing expanded', () => {
    const layout = makeLayout(sampleData, { scale: { type: 'linear' } });
    expect(layout.isExpanded('a')).toBe(false);
    expect(layout.isExpanded('b')).toBe(false);
  });

  it('expand and collapse toggle correctly', () => {
    const layout = makeLayout(sampleData, { scale: { type: 'linear' } });
    layout.expand('a');
    expect(layout.isExpanded('a')).toBe(true);

    layout.collapse('a');
    expect(layout.isExpanded('a')).toBe(false);
  });

  it('toggle returns new state', () => {
    const layout = makeLayout(sampleData, { scale: { type: 'linear' } });
    expect(layout.toggle('a')).toBe(true); // now expanded
    expect(layout.toggle('a')).toBe(false); // now collapsed
  });

  it('collapseAll clears everything', () => {
    const layout = makeLayout(sampleData, { scale: { type: 'linear' } });
    layout.expand('a');
    layout.expand('b');
    layout.collapseAll();
    expect(layout.isExpanded('a')).toBe(false);
    expect(layout.isExpanded('b')).toBe(false);
  });

  it('collapsing a parent also collapses descendants', () => {
    const layout = makeLayout(sampleData, { scale: { type: 'linear' } });
    layout.expand('a');
    // a1 and a2 are children — even if we manually expanded them
    layout.expand('a1');
    layout.collapse('a');
    expect(layout.isExpanded('a')).toBe(false);
    expect(layout.isExpanded('a1')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Layout computation
// ---------------------------------------------------------------------------

describe('GraphLayout computeLayout', () => {
  it('produces a root graph node with correct structure', () => {
    const layout = makeLayout(sampleData, { scale: { type: 'linear' } });
    const root = layout.computeLayout();

    expect(root.id).toBe('root');
    expect(root.band.nodes).toHaveLength(2);
    expect(root.children).toHaveLength(0); // nothing expanded
    expect(root.width).toBeGreaterThan(0);
    expect(root.height).toBeGreaterThan(0);
  });

  it('adds child graph nodes when expanded', () => {
    const layout = makeLayout(sampleData, { scale: { type: 'linear' } });
    layout.expand('a');
    const root = layout.computeLayout();

    expect(root.children).toHaveLength(1);
    expect(root.children[0].id).toBe('a');
    expect(root.children[0].band.nodes).toHaveLength(2); // a1, a2
    expect(root.children[0].parentSpan?.id).toBe('a');
  });

  it('root is centered at x origin', () => {
    const layout = makeLayout(sampleData, {
      scale: { type: 'linear' },
      bandWidth: 800,
    });
    const root = layout.computeLayout();
    expect(root.x).toBe(-400); // centered: -bandWidth/2
    expect(root.y).toBe(0);
  });

  it('child band is positioned below parent', () => {
    const layout = makeLayout(sampleData, {
      scale: { type: 'linear' },
      verticalGap: 50,
    });
    layout.expand('a');
    const root = layout.computeLayout();
    const child = root.children[0];
    expect(child.y).toBe(root.y + root.height + 50);
  });
});

// ---------------------------------------------------------------------------
// Edge computation
// ---------------------------------------------------------------------------

describe('GraphLayout computeEdges', () => {
  it('returns no edges when nothing is expanded', () => {
    const layout = makeLayout(sampleData, { scale: { type: 'linear' } });
    const root = layout.computeLayout();
    const edges = layout.computeEdges(root);
    expect(edges).toHaveLength(0);
  });

  it('returns a left/right edge pair per expanded child', () => {
    const layout = makeLayout(sampleData, { scale: { type: 'linear' } });
    layout.expand('a');
    const root = layout.computeLayout();
    const edges = layout.computeEdges(root);
    expect(edges).toHaveLength(2);
    expect(edges[0].id).toBe('a-l');
    expect(edges[1].id).toBe('a-r');
  });

  it('edge source is above edge target (vertical layout)', () => {
    const layout = makeLayout(sampleData, { scale: { type: 'linear' } });
    layout.expand('a');
    const root = layout.computeLayout();
    const edges = layout.computeEdges(root);
    for (const edge of edges) {
      expect(edge.sourcePoint[1]).toBeLessThan(edge.targetPoint[1]);
    }
  });

  it('left edge source is left of right edge source', () => {
    const layout = makeLayout(sampleData, { scale: { type: 'linear' } });
    layout.expand('a');
    const root = layout.computeLayout();
    const edges = layout.computeEdges(root);
    const left = edges.find((e) => e.id === 'a-l')!;
    const right = edges.find((e) => e.id === 'a-r')!;
    expect(left.sourcePoint[0]).toBeLessThan(right.sourcePoint[0]);
    expect(left.targetPoint[0]).toBeLessThan(right.targetPoint[0]);
  });

  it('returns two edge pairs when two children expanded', () => {
    const layout = makeLayout(sampleData, { scale: { type: 'linear' } });
    layout.expand('a');
    layout.expand('b');
    const root = layout.computeLayout();
    const edges = layout.computeEdges(root);
    expect(edges).toHaveLength(4);
  });
});

// ---------------------------------------------------------------------------
// Bounds computation
// ---------------------------------------------------------------------------

describe('GraphLayout computeBounds', () => {
  it('returns tight bounds around root when nothing expanded', () => {
    const layout = makeLayout(sampleData, { scale: { type: 'linear' } });
    const root = layout.computeLayout();
    const bounds = layout.computeBounds(root);
    expect(bounds.x).toBe(root.x);
    expect(bounds.y).toBe(root.y);
    expect(bounds.width).toBe(root.width);
    expect(bounds.height).toBe(root.height);
  });

  it('expands bounds to include children', () => {
    const layout = makeLayout(sampleData, { scale: { type: 'linear' } });
    layout.expand('a');
    const root = layout.computeLayout();
    const bounds = layout.computeBounds(root);
    // Bounds should be taller than just the root.
    expect(bounds.height).toBeGreaterThan(root.height);
  });
});

// ---------------------------------------------------------------------------
// Exclusive expand
// ---------------------------------------------------------------------------

describe('GraphLayout expandExclusive', () => {
  const deepData: TimelineNode[] = [
    {
      id: 'a',
      label: 'A',
      start: 0,
      end: 50,
      children: [
        {
          id: 'a1',
          label: 'A1',
          start: 0,
          end: 20,
          children: [
            { id: 'a1x', label: 'A1X', start: 0, end: 10 },
            { id: 'a1y', label: 'A1Y', start: 10, end: 20 },
          ],
        },
        { id: 'a2', label: 'A2', start: 25, end: 50 },
      ],
    },
    {
      id: 'b',
      label: 'B',
      start: 50,
      end: 100,
      children: [
        { id: 'b1', label: 'B1', start: 50, end: 75 },
        { id: 'b2', label: 'B2', start: 75, end: 100 },
      ],
    },
  ];

  it('expanding a root node collapses other root expansions', () => {
    const layout = makeLayout(deepData, { scale: { type: 'linear' } });
    layout.expand('a');
    expect(layout.isExpanded('a')).toBe(true);

    layout.expandExclusive('b');
    expect(layout.isExpanded('b')).toBe(true);
    expect(layout.isExpanded('a')).toBe(false);
  });

  it('expanding a nested node preserves its ancestor chain', () => {
    const layout = makeLayout(deepData, { scale: { type: 'linear' } });
    // Manually expand a deep path first.
    layout.expand('a');
    layout.expand('a1');
    layout.expand('b');

    // Now exclusive-expand a1x — should keep 'a' (ancestor) but drop 'b' and 'a1'.
    // Actually a1 is also an ancestor of a1x, so it should be kept too.
    layout.expandExclusive('a1x');

    expect(layout.isExpanded('a')).toBe(true); // ancestor
    expect(layout.isExpanded('a1')).toBe(true); // ancestor
    expect(layout.isExpanded('a1x')).toBe(true); // target
    expect(layout.isExpanded('b')).toBe(false); // collapsed
  });

  it('expanding a sibling collapses the other sibling but keeps shared parent', () => {
    const layout = makeLayout(deepData, { scale: { type: 'linear' } });
    layout.expand('a');
    layout.expand('a1');

    // Exclusive-expand a2 — 'a' is the shared parent (ancestor of a2), a1 is not.
    layout.expandExclusive('a2');

    expect(layout.isExpanded('a')).toBe(true); // ancestor of a2
    expect(layout.isExpanded('a2')).toBe(true); // target
    expect(layout.isExpanded('a1')).toBe(false); // sibling, collapsed
  });

  it('produces correct graph tree after exclusive expand', () => {
    const layout = makeLayout(deepData, { scale: { type: 'linear' } });
    layout.expand('a');
    layout.expand('b');

    layout.expandExclusive('a1');

    const root = layout.computeLayout();
    // Root should have one child (a), and a should have one child (a1).
    expect(root.children).toHaveLength(1);
    expect(root.children[0].id).toBe('a');
    expect(root.children[0].children).toHaveLength(1);
    expect(root.children[0].children[0].id).toBe('a1');
  });
});

// ---------------------------------------------------------------------------
// Discrete events
// ---------------------------------------------------------------------------

describe('GraphLayout with discrete events', () => {
  const dataWithEvents: TimelineNode[] = [
    {
      id: 'a',
      label: 'A',
      start: 0,
      end: 50,
      children: [
        { id: 'a1', label: 'A1', start: 0, end: 20 },
        { id: 'evt', label: 'Event', type: 'event', start: 30 },
      ],
    },
    { id: 'e-top', label: 'Top Event', type: 'event', start: 75 },
  ];

  it('events do not produce child graph nodes when expanded', () => {
    const layout = makeLayout(dataWithEvents, { scale: { type: 'linear' } });
    // Expanding an event id should not create children.
    layout.expand('evt');
    layout.expand('e-top');
    const root = layout.computeLayout();
    expect(root.children).toHaveLength(0);
  });

  it('events do not produce edges', () => {
    const layout = makeLayout(dataWithEvents, { scale: { type: 'linear' } });
    layout.expand('evt');
    const root = layout.computeLayout();
    const edges = layout.computeEdges(root);
    expect(edges).toHaveLength(0);
  });

  it('expanding a span with event children produces edges only for the span', () => {
    const layout = makeLayout(dataWithEvents, { scale: { type: 'linear' } });
    layout.expand('a');
    const root = layout.computeLayout();
    const edges = layout.computeEdges(root);
    // One child graph node (span 'a'), two edges (left + right pair).
    expect(root.children).toHaveLength(1);
    expect(root.children[0].id).toBe('a');
    expect(edges).toHaveLength(2);
  });
});

// ---------------------------------------------------------------------------
// Edge cases
// ---------------------------------------------------------------------------

describe('GraphLayout edge cases', () => {
  it('handles empty data array', () => {
    const layout = makeLayout([], { scale: { type: 'linear' } });
    const root = layout.computeLayout();
    expect(root.id).toBe('root');
    expect(root.band.nodes).toHaveLength(0);
    expect(root.children).toHaveLength(0);
  });

  it('handles single node with no children', () => {
    const data = [{ id: 'solo', label: 'Solo', start: 0, end: 100 }];
    const layout = makeLayout(data, { scale: { type: 'linear' } });
    const root = layout.computeLayout();
    expect(root.band.nodes).toHaveLength(1);
    expect(root.children).toHaveLength(0);
  });

  it('child band is horizontally centered under parent span', () => {
    const data: TimelineNode[] = [
      {
        id: 'a',
        label: 'A',
        start: 0,
        end: 100,
        children: [
          { id: 'a1', label: 'A1', start: 0, end: 50 },
        ],
      },
    ];
    const layout = makeLayout(data, {
      scale: { type: 'linear' },
      bandWidth: 800,
      padding: { left: 20, right: 20 },
    });
    layout.expand('a');
    const root = layout.computeLayout();
    const child = root.children[0];

    // The child band's center should be close to the parent span's center.
    const childCenter = child.x + child.width / 2;
    const rootCenter = root.x + root.width / 2;
    // Span 'a' covers the full domain, so child should be roughly centered.
    expect(Math.abs(childCenter - rootCenter)).toBeLessThan(50);
  });

  it('handles circular data references without infinite loop', () => {
    const a: TimelineNode = {
      id: 'a', label: 'A', start: 0, end: 50, children: [],
    };
    const b: TimelineNode = {
      id: 'b', label: 'B', start: 50, end: 100, children: [a],
    };
    a.children = [b];

    const layout = makeLayout([a, b], {
      scale: { type: 'linear' },
      exclusiveExpand: false,
    });
    layout.expand('a');
    layout.expand('b');
    // Should complete without hanging — visited set prevents infinite recursion.
    const root = layout.computeLayout();
    expect(root).toBeDefined();
  });
});
