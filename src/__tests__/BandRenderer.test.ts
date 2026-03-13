import { describe, it, expect } from 'vitest';
import { computeBandHeight, computeRowCounts } from '../BandRenderer';
import type { TimelineNode } from '../types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function node(id: string, start: number, end: number, children?: TimelineNode[]): TimelineNode {
  return { id, label: id, start, end, children };
}

// ---------------------------------------------------------------------------
// computeRowCounts
// ---------------------------------------------------------------------------

describe('computeRowCounts', () => {
  it('returns 0/0 for empty input', () => {
    expect(computeRowCounts([])).toEqual({ rowsAbove: 0, rowsBelow: 0 });
  });

  it('returns 1 row above for a single node', () => {
    const result = computeRowCounts([node('a', 0, 10)]);
    expect(result.rowsAbove).toBe(1);
    expect(result.rowsBelow).toBe(0);
  });

  it('returns 1 row above for non-overlapping nodes', () => {
    // Gaps must exceed BRACKET_SEPARATION (12) under identity scale.
    const nodes = [node('a', 0, 10), node('b', 30, 40), node('c', 60, 70)];
    const result = computeRowCounts(nodes);
    expect(result.rowsAbove).toBe(1);
    expect(result.rowsBelow).toBe(0);
  });

  it('spills overlapping nodes below', () => {
    // Two overlapping spans: first goes above row 0, second goes below row 0.
    const nodes = [node('a', 0, 10), node('b', 5, 15)];
    const result = computeRowCounts(nodes);
    expect(result.rowsAbove).toBe(1);
    expect(result.rowsBelow).toBe(1);
  });

  it('handles three overlapping nodes (above + below + above row 1)', () => {
    const nodes = [node('a', 0, 10), node('b', 1, 11), node('c', 2, 12)];
    const result = computeRowCounts(nodes);
    // With 3 overlapping: row 0 above, row 0 below, row 1 above.
    expect(result.rowsAbove).toBe(2);
    expect(result.rowsBelow).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// computeBandHeight
// ---------------------------------------------------------------------------

describe('computeBandHeight', () => {
  // AXIS_AREA_HEIGHT = 24, BRACKET_HEIGHT = 16, LABEL_OVERFLOW = 8

  it('returns just axis area for 0 rows', () => {
    // computeRowCounts can return { rowsAbove: 0, rowsBelow: 0 } for empty input.
    // But computeBandHeight(0, 0) should still produce a meaningful height.
    expect(computeBandHeight(0, 0)).toBe(24); // AXIS_AREA_HEIGHT only
  });

  it('computes correct height for 1 row above, 0 below', () => {
    // above = 1 * 16 + 8 = 24, below = 0, axis = 24
    expect(computeBandHeight(1, 0)).toBe(48);
  });

  it('computes correct height for 1 above, 1 below', () => {
    // above = 24, below = 24, axis = 24
    expect(computeBandHeight(1, 1)).toBe(72);
  });

  it('computes correct height for 2 above, 1 below', () => {
    // above = 2*16+8 = 40, below = 1*16+8 = 24, axis = 24
    expect(computeBandHeight(2, 1)).toBe(88);
  });

  it('is monotonically increasing with more rows', () => {
    const h1 = computeBandHeight(1, 0);
    const h2 = computeBandHeight(2, 0);
    const h3 = computeBandHeight(2, 1);
    expect(h2).toBeGreaterThan(h1);
    expect(h3).toBeGreaterThan(h2);
  });
});

// ---------------------------------------------------------------------------
// computeRowCounts with discrete events
// ---------------------------------------------------------------------------

describe('computeRowCounts with events', () => {
  it('places a single event in 1 row above', () => {
    const evt: TimelineNode = { id: 'e', label: 'e', type: 'event', start: 5 };
    const result = computeRowCounts([evt]);
    expect(result.rowsAbove).toBe(1);
    expect(result.rowsBelow).toBe(0);
  });

  it('handles mixed spans and events', () => {
    const nodes: TimelineNode[] = [
      node('a', 0, 100),
      { id: 'e', label: 'e', start: 50 },
    ];
    const result = computeRowCounts(nodes);
    // Event collision zone overlaps span → spills to below.
    expect(result.rowsAbove).toBe(1);
    expect(result.rowsBelow).toBe(1);
  });
});
