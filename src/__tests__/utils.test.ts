import { describe, it, expect } from 'vitest';
import {
  toNumeric,
  findNode,
  computeDomain,
  spansOverlap,
  flattenGraphTree,
  resolveOptions,
  isEvent,
  nodeEnd,
} from '../utils';
import type { TimelineNode, GraphNode, BandDescriptor } from '../types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function node(
  id: string,
  start: number | Date,
  end: number | Date,
  children?: TimelineNode[],
): TimelineNode {
  return { id, label: id, start, end, children };
}

function eventNode(id: string, start: number | Date): TimelineNode {
  return { id, label: id, type: 'event', start };
}

function graphNode(
  id: string,
  children: GraphNode[] = [],
): GraphNode {
  const band: BandDescriptor = { parentNode: null, nodes: [], depth: 0, laneCount: 1 };
  return {
    id,
    band,
    parentSpan: null,
    parentGraphNode: null,
    children,
    x: 0,
    y: 0,
    width: 100,
    height: 50,
  };
}

// ---------------------------------------------------------------------------
// toNumeric
// ---------------------------------------------------------------------------

describe('toNumeric', () => {
  it('returns the number as-is for numeric input', () => {
    expect(toNumeric(42)).toBe(42);
    expect(toNumeric(0)).toBe(0);
    expect(toNumeric(-5)).toBe(-5);
  });

  it('returns the timestamp for Date input', () => {
    const d = new Date('2020-01-01T00:00:00Z');
    expect(toNumeric(d)).toBe(d.getTime());
  });
});

// ---------------------------------------------------------------------------
// findNode
// ---------------------------------------------------------------------------

describe('findNode', () => {
  const tree: TimelineNode[] = [
    node('a', 0, 10, [
      node('a1', 0, 5),
      node('a2', 5, 10, [
        node('a2i', 5, 7),
      ]),
    ]),
    node('b', 10, 20),
  ];

  it('finds root-level nodes', () => {
    expect(findNode(tree, 'a')?.id).toBe('a');
    expect(findNode(tree, 'b')?.id).toBe('b');
  });

  it('finds nested nodes', () => {
    expect(findNode(tree, 'a1')?.id).toBe('a1');
    expect(findNode(tree, 'a2i')?.id).toBe('a2i');
  });

  it('returns null for missing nodes', () => {
    expect(findNode(tree, 'nonexistent')).toBeNull();
  });

  it('returns null for empty tree', () => {
    expect(findNode([], 'a')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// computeDomain
// ---------------------------------------------------------------------------

describe('computeDomain', () => {
  it('returns [min start, max end] for numeric nodes', () => {
    const nodes = [node('a', 5, 15), node('b', 0, 10), node('c', 8, 20)];
    expect(computeDomain(nodes)).toEqual([0, 20]);
  });

  it('returns Date domain for Date nodes', () => {
    const nodes = [
      node('a', new Date('2020-01-01'), new Date('2020-06-01')),
      node('b', new Date('2019-06-01'), new Date('2021-01-01')),
    ];
    const [start, end] = computeDomain(nodes);
    expect(start).toEqual(new Date('2019-06-01'));
    expect(end).toEqual(new Date('2021-01-01'));
  });

  it('returns fallback domain for empty input', () => {
    expect(computeDomain([])).toEqual([0, 1]);
  });

  it('handles a single node', () => {
    expect(computeDomain([node('a', 3, 7)])).toEqual([3, 7]);
  });
});

// ---------------------------------------------------------------------------
// spansOverlap
// ---------------------------------------------------------------------------

describe('spansOverlap', () => {
  it('returns true for overlapping spans', () => {
    expect(spansOverlap(node('a', 0, 10), node('b', 5, 15))).toBe(true);
  });

  it('returns false for adjacent (non-overlapping) spans', () => {
    expect(spansOverlap(node('a', 0, 5), node('b', 5, 10))).toBe(false);
  });

  it('returns false for disjoint spans', () => {
    expect(spansOverlap(node('a', 0, 3), node('b', 5, 10))).toBe(false);
  });

  it('returns true when one span contains the other', () => {
    expect(spansOverlap(node('a', 0, 20), node('b', 5, 10))).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// flattenGraphTree
// ---------------------------------------------------------------------------

describe('flattenGraphTree', () => {
  it('flattens a single root node', () => {
    const root = graphNode('root');
    expect(flattenGraphTree(root).map((n) => n.id)).toEqual(['root']);
  });

  it('flattens in pre-order DFS', () => {
    const c1 = graphNode('c1');
    const c2 = graphNode('c2');
    const b1 = graphNode('b1', [c1, c2]);
    const b2 = graphNode('b2');
    const root = graphNode('root', [b1, b2]);
    expect(flattenGraphTree(root).map((n) => n.id)).toEqual([
      'root', 'b1', 'c1', 'c2', 'b2',
    ]);
  });
});

// ---------------------------------------------------------------------------
// resolveOptions
// ---------------------------------------------------------------------------

describe('resolveOptions', () => {
  it('applies defaults', () => {
    const opts = resolveOptions({ data: [] });
    expect(opts.bandWidth).toBe(800);
    expect(opts.animationDuration).toBe(300);
    expect(opts.scale.type).toBe('time');
    expect(opts.viewport.minZoom).toBe(0.1);
  });

  it('preserves user overrides', () => {
    const opts = resolveOptions({
      data: [],
      bandWidth: 1200,
      scale: { type: 'linear', tickCount: 5 },
    });
    expect(opts.bandWidth).toBe(1200);
    expect(opts.scale.type).toBe('linear');
    expect(opts.scale.tickCount).toBe(5);
  });
});

// ---------------------------------------------------------------------------
// isEvent
// ---------------------------------------------------------------------------

describe('isEvent', () => {
  it('returns true for nodes with type "event"', () => {
    expect(isEvent(eventNode('e', 5))).toBe(true);
  });

  it('returns true for nodes with no end', () => {
    expect(isEvent({ id: 'e', label: 'e', start: 5 })).toBe(true);
  });

  it('returns false for normal spans', () => {
    expect(isEvent(node('a', 0, 10))).toBe(false);
  });

  it('returns true for explicit event type even with end set', () => {
    expect(isEvent({ id: 'e', label: 'e', type: 'event', start: 5, end: 10 })).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// nodeEnd
// ---------------------------------------------------------------------------

describe('nodeEnd', () => {
  it('returns end for spans', () => {
    expect(nodeEnd(node('a', 0, 10))).toBe(10);
  });

  it('returns start for events without end', () => {
    expect(nodeEnd(eventNode('e', 42))).toBe(42);
  });

  it('returns end for events that happen to have end set', () => {
    expect(nodeEnd({ id: 'e', label: 'e', type: 'event', start: 5, end: 10 })).toBe(10);
  });

  it('works with Date values', () => {
    const d = new Date('2020-06-15');
    expect(nodeEnd(eventNode('e', d))).toBe(d);
  });
});

// ---------------------------------------------------------------------------
// computeDomain / spansOverlap with events
// ---------------------------------------------------------------------------

describe('computeDomain with events', () => {
  it('includes events in the domain', () => {
    const nodes = [node('a', 5, 15), eventNode('e', 20)];
    // Event at 20 has no end, so nodeEnd returns 20 → domain is [5, 20]
    expect(computeDomain(nodes)).toEqual([5, 20]);
  });

  it('handles all-event input', () => {
    const nodes = [eventNode('a', 3), eventNode('b', 7)];
    expect(computeDomain(nodes)).toEqual([3, 7]);
  });
});

describe('spansOverlap with events', () => {
  it('event inside span overlaps', () => {
    // Event at 5 has nodeEnd=5 → interval check: 0 < 5 && 5 < 10 → true.
    expect(spansOverlap(node('a', 0, 10), eventNode('e', 5))).toBe(true);
  });

  it('event at span end does not overlap', () => {
    // Event at 10 vs span [5, 10): 5 < 10 && 10 < 10 → false.
    expect(spansOverlap(node('a', 5, 10), eventNode('e', 10))).toBe(false);
  });

  it('event before span does not overlap', () => {
    expect(spansOverlap(node('a', 5, 10), eventNode('e', 3))).toBe(false);
  });
});
