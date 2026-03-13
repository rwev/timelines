import { describe, it, expect } from 'vitest';
import { assignLanes, assignSingleLane } from '../LaneAssigner';
import type { TimelineNode } from '../types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function node(id: string, start: number, end: number): TimelineNode {
  return { id, label: id, start, end };
}

function dateNode(id: string, start: string, end: string): TimelineNode {
  return { id, label: id, start: new Date(start), end: new Date(end) };
}

// ---------------------------------------------------------------------------
// assignLanes
// ---------------------------------------------------------------------------

describe('assignLanes', () => {
  it('returns empty for empty input', () => {
    const result = assignLanes([]);
    expect(result.assignments).toHaveLength(0);
    expect(result.laneCount).toBe(0);
  });

  it('assigns a single node to lane 0', () => {
    const nodes = [node('a', 0, 10)];
    const result = assignLanes(nodes);
    expect(result.laneCount).toBe(1);
    expect(result.assignments).toEqual([{ node: nodes[0], lane: 0 }]);
  });

  it('assigns non-overlapping nodes to the same lane', () => {
    const nodes = [node('a', 0, 5), node('b', 5, 10), node('c', 10, 15)];
    const result = assignLanes(nodes);
    expect(result.laneCount).toBe(1);
    for (const a of result.assignments) {
      expect(a.lane).toBe(0);
    }
  });

  it('assigns overlapping nodes to different lanes', () => {
    const nodes = [node('a', 0, 10), node('b', 5, 15)];
    const result = assignLanes(nodes);
    expect(result.laneCount).toBe(2);
    const lanes = new Map(result.assignments.map((a) => [a.node.id, a.lane]));
    expect(lanes.get('a')).toBe(0);
    expect(lanes.get('b')).toBe(1);
  });

  it('reuses lanes after spans end', () => {
    // a: [0, 5), b: [3, 8), c: [6, 11)
    // a and b overlap → 2 lanes. c starts after a ends → reuses lane 0.
    const nodes = [node('a', 0, 5), node('b', 3, 8), node('c', 6, 11)];
    const result = assignLanes(nodes);
    expect(result.laneCount).toBe(2);
    const lanes = new Map(result.assignments.map((a) => [a.node.id, a.lane]));
    expect(lanes.get('a')).toBe(0);
    expect(lanes.get('b')).toBe(1);
    expect(lanes.get('c')).toBe(0); // reuses lane 0 after 'a' ends
  });

  it('handles three concurrent overlaps', () => {
    const nodes = [node('a', 0, 10), node('b', 1, 11), node('c', 2, 12)];
    const result = assignLanes(nodes);
    expect(result.laneCount).toBe(3);
    const lanes = new Map(result.assignments.map((a) => [a.node.id, a.lane]));
    expect(lanes.get('a')).toBe(0);
    expect(lanes.get('b')).toBe(1);
    expect(lanes.get('c')).toBe(2);
  });

  it('works with Date values', () => {
    const nodes = [
      dateNode('x', '2020-01-01', '2020-06-01'),
      dateNode('y', '2020-03-01', '2020-09-01'),
    ];
    const result = assignLanes(nodes);
    expect(result.laneCount).toBe(2);
  });

  it('sorts by start then end for deterministic results', () => {
    // Same start, different end lengths.
    const nodes = [node('short', 0, 3), node('long', 0, 10)];
    const result = assignLanes(nodes);
    expect(result.laneCount).toBe(2);
    const lanes = new Map(result.assignments.map((a) => [a.node.id, a.lane]));
    // shorter span processed first.
    expect(lanes.get('short')).toBe(0);
    expect(lanes.get('long')).toBe(1);
  });

  it('handles discrete events (no end) mixed with spans', () => {
    const evt: TimelineNode = { id: 'evt', label: 'evt', type: 'event', start: 3 };
    const nodes = [node('a', 0, 10), evt];
    const result = assignLanes(nodes);
    // Event has zero duration, so it fits in any lane after its start.
    // It sorts after 'a' (same or later start) and can reuse lane 0 only
    // if a has ended — but a ends at 10 and evt starts at 3, so needs lane 1.
    expect(result.laneCount).toBe(2);
  });

  it('assigns events at different times to the same lane', () => {
    const e1: TimelineNode = { id: 'e1', label: 'e1', start: 0 };
    const e2: TimelineNode = { id: 'e2', label: 'e2', start: 5 };
    const result = assignLanes([e1, e2]);
    expect(result.laneCount).toBe(1);
    const lanes = new Map(result.assignments.map((a) => [a.node.id, a.lane]));
    expect(lanes.get('e1')).toBe(0);
    expect(lanes.get('e2')).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// assignSingleLane
// ---------------------------------------------------------------------------

describe('assignSingleLane', () => {
  it('returns empty for empty input', () => {
    const result = assignSingleLane([]);
    expect(result.assignments).toHaveLength(0);
    expect(result.laneCount).toBe(0);
  });

  it('places all nodes in lane 0', () => {
    const nodes = [node('a', 0, 10), node('b', 5, 15), node('c', 10, 20)];
    const result = assignSingleLane(nodes);
    expect(result.laneCount).toBe(1);
    for (const a of result.assignments) {
      expect(a.lane).toBe(0);
    }
  });
});
