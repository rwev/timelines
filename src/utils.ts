import type {
  GraphNode,
  TimelineNode,
  TimelineOptions,
  ResolvedOptions,
  ResolvedZoomableOptions,
  ZoomableTimelineOptions,
  TimeScaleConfig,
  ViewportOptions,
} from './types';

// ---------------------------------------------------------------------------
// Default option resolution
// ---------------------------------------------------------------------------

const DEFAULT_SCALE: TimeScaleConfig = {
  type: 'time',
  tickCount: 8,
};

const DEFAULT_VIEWPORT: ViewportOptions = {
  minZoom: 0.1,
  maxZoom: 4,
  fitPadding: 40,
};

export function resolveOptions(opts: TimelineOptions): ResolvedOptions {
  const bandWidth = Math.max(1, opts.bandWidth ?? 800);
  const padding = opts.padding ?? { left: 20, right: 20 };

  // Ensure padding doesn't exceed band width.
  const maxPad = bandWidth / 2 - 1;
  const clampedPadding = {
    left: Math.max(0, Math.min(padding.left, maxPad)),
    right: Math.max(0, Math.min(padding.right, maxPad)),
  };

  return {
    data: opts.data,
    scale: { ...DEFAULT_SCALE, ...opts.scale } as TimeScaleConfig,
    bandHeight: opts.bandHeight ?? 40,
    bandWidth,
    bandGap: opts.bandGap ?? 24,
    verticalGap: opts.verticalGap ?? 60,
    padding: clampedPadding,
    animationDuration: Math.max(0, opts.animationDuration ?? 300),
    swimLanes: opts.swimLanes ?? true,
    depthFade: opts.depthFade ?? 0.12,
    exclusiveExpand: opts.exclusiveExpand ?? true,
    focusOnExpand: opts.focusOnExpand ?? true,
    viewport: { ...DEFAULT_VIEWPORT, ...opts.viewport },
    onDrillDown: opts.onDrillDown,
    onCollapse: opts.onCollapse,
    onHover: opts.onHover,
  };
}

// ---------------------------------------------------------------------------
// Zoomable option resolution
// ---------------------------------------------------------------------------

/**
 * Resolve `ZoomableTimelineOptions` into a fully-defaulted object.
 * Delegates shared layout/scale fields to `resolveOptions`,
 * then layers on the semantic-zoom-specific defaults.
 */
export function resolveZoomableOptions(opts: ZoomableTimelineOptions): ResolvedZoomableOptions {
  const base = resolveOptions({
    data: opts.data,
    scale: opts.scale,
    padding: opts.padding,
    animationDuration: opts.animationDuration,
    onHover: opts.onHover,
  });

  return {
    ...base,
    expandThreshold: opts.expandThreshold ?? 60,
    collapseThreshold: opts.collapseThreshold ?? 40,
    maxDepth: opts.maxDepth ?? Infinity,
    minZoom: opts.minZoom ?? 0.5,
    maxZoom: opts.maxZoom ?? 80,
  };
}

// ---------------------------------------------------------------------------
// Tree helpers
// ---------------------------------------------------------------------------

/** Convert a `Date | number` to a numeric timestamp for comparison. */
export function toNumeric(v: Date | number): number {
  return v instanceof Date ? v.getTime() : v;
}

/** Whether this node represents a discrete event (no duration). */
export function isEvent(node: TimelineNode): boolean {
  return node.type === 'event' || node.end === undefined;
}

/** Safe accessor for a node's end value: returns `start` for events. */
export function nodeEnd(node: TimelineNode): Date | number {
  return node.end ?? node.start;
}

/** Find a node by id anywhere in the data tree. */
export function findNode(
  roots: TimelineNode[],
  id: string,
  visited = new Set<string>(),
): TimelineNode | null {
  for (const root of roots) {
    if (root.id === id) return root;
    if (visited.has(root.id)) continue;
    visited.add(root.id);
    if (root.children) {
      const found = findNode(root.children, id, visited);
      if (found) return found;
    }
  }
  return null;
}

/** Compute the minimum start and maximum end across a set of nodes. */
export function computeDomain(nodes: TimelineNode[]): [Date | number, Date | number] {
  if (nodes.length === 0) {
    return [0, 1];
  }

  let minStart = toNumeric(nodes[0].start);
  let maxEnd = toNumeric(nodeEnd(nodes[0]));

  for (const node of nodes) {
    const s = toNumeric(node.start);
    const e = toNumeric(nodeEnd(node));
    if (s < minStart) minStart = s;
    if (e > maxEnd) maxEnd = e;
  }

  // Preserve the original type: if inputs are Dates, return Dates.
  const isDate = nodes[0].start instanceof Date;
  if (isDate) {
    return [new Date(minStart), new Date(maxEnd)];
  }
  return [minStart, maxEnd];
}

/** Check whether two spans overlap in time. */
export function spansOverlap(a: TimelineNode, b: TimelineNode): boolean {
  return toNumeric(a.start) < toNumeric(nodeEnd(b)) && toNumeric(b.start) < toNumeric(nodeEnd(a));
}

// ---------------------------------------------------------------------------
// Graph tree helpers
// ---------------------------------------------------------------------------

/** Flatten a GraphNode tree into an array (pre-order DFS). */
export function flattenGraphTree(root: GraphNode): GraphNode[] {
  const result: GraphNode[] = [];
  const stack: GraphNode[] = [root];
  while (stack.length > 0) {
    const node = stack.pop()!;
    result.push(node);
    // Push children in reverse so they come off the stack in order.
    for (let i = node.children.length - 1; i >= 0; i--) {
      stack.push(node.children[i]);
    }
  }
  return result;
}
