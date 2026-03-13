import type { TimelineNode, LaneAssignment } from './types';
import { toNumeric, nodeEnd } from './utils';

/**
 * Assign swim-lane indices to a set of spans so that no two overlapping
 * spans share the same lane.
 *
 * Uses a greedy interval-scheduling approach:
 * 1. Sort spans by start time.
 * 2. Maintain an array of lane "end times" (the end of the last span placed in that lane).
 * 3. For each span, find the first lane whose end time <= span's start. If none, create a new lane.
 *
 * Returns the lane assignments and the total number of lanes needed.
 */
export function assignLanes(nodes: TimelineNode[]): {
  assignments: LaneAssignment[];
  laneCount: number;
} {
  if (nodes.length === 0) {
    return { assignments: [], laneCount: 0 };
  }

  // Sort by start, then by end (shorter spans first) for deterministic packing.
  const sorted = [...nodes].sort((a, b) => {
    const diff = toNumeric(a.start) - toNumeric(b.start);
    if (diff !== 0) return diff;
    return toNumeric(nodeEnd(a)) - toNumeric(nodeEnd(b));
  });

  /** End-time of the last span placed in each lane. */
  const laneEnds: number[] = [];

  const assignments: LaneAssignment[] = [];

  for (const node of sorted) {
    const start = toNumeric(node.start);

    // Find the first lane where the previous span has ended.
    let assignedLane = -1;
    for (let i = 0; i < laneEnds.length; i++) {
      if (laneEnds[i] <= start) {
        assignedLane = i;
        break;
      }
    }

    if (assignedLane === -1) {
      // No existing lane is free — create a new one.
      assignedLane = laneEnds.length;
      laneEnds.push(toNumeric(nodeEnd(node)));
    } else {
      laneEnds[assignedLane] = toNumeric(nodeEnd(node));
    }

    assignments.push({ node, lane: assignedLane });
  }

  return {
    assignments,
    laneCount: laneEnds.length,
  };
}

/**
 * Simple variant: place all nodes in lane 0 (no swim-laning).
 * Overlapping spans will visually overlap.
 */
export function assignSingleLane(nodes: TimelineNode[]): {
  assignments: LaneAssignment[];
  laneCount: number;
} {
  return {
    assignments: nodes.map((node) => ({ node, lane: 0 })),
    laneCount: nodes.length > 0 ? 1 : 0,
  };
}
