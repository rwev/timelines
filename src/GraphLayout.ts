import type {
  BandDescriptor,
  Bounds,
  EdgeDatum,
  GraphNode,
  ResolvedOptions,
  ScaleFn,
  TimelineNode,
  TimeScaleConfig,
} from './types';
import { assignLanes, assignSingleLane } from './LaneAssigner';
import { createScale } from './ScaleFactory';
import { computeBandHeight, computeRowCounts } from './BandRenderer';
import { nodeEnd } from './utils';

/**
 * Computes a 2D hierarchical tree layout of timeline bands.
 *
 * Each band is a `GraphNode` positioned in global SVG space.
 * The root band is centered at the origin; child bands hang below
 * their parent spans with Bezier edges connecting them.
 *
 * The layout algorithm:
 * 1. Build graph tree from expansion state.
 * 2. Assign dimensions to each node.
 * 3. Position root centered at origin.
 * 4. Position children centered below their respective parent spans.
 * 5. Resolve horizontal overlaps between sibling children.
 */
export class GraphLayout {
  private expanded = new Set<string>();
  private opts: ResolvedOptions;

  constructor(opts: ResolvedOptions) {
    this.opts = opts;
  }

  // -----------------------------------------------------------------------
  // Expansion state
  // -----------------------------------------------------------------------

  isExpanded(nodeId: string): boolean {
    return this.expanded.has(nodeId);
  }

  expand(nodeId: string): void {
    this.expanded.add(nodeId);
  }

  collapse(nodeId: string): void {
    this.expanded.delete(nodeId);
    const node = this.findNodeInData(nodeId);
    if (node?.children) {
      this.collapseDescendants(node.children);
    }
  }

  collapseAll(): void {
    this.expanded.clear();
  }

  toggle(nodeId: string): boolean {
    if (this.expanded.has(nodeId)) {
      this.collapse(nodeId);
      return false;
    }
    this.expand(nodeId);
    return true;
  }

  /**
   * Expand a node while collapsing all other expanded paths.
   * Preserves only the ancestors of `nodeId` (they must be expanded
   * for the target to be visible), then expands the target.
   */
  expandExclusive(nodeId: string): void {
    const ancestors = this.findAncestorPath(nodeId);
    this.expanded.clear();
    for (const id of ancestors) {
      this.expanded.add(id);
    }
    this.expanded.add(nodeId);
  }

  /**
   * Walk the data tree and return the ids of all ancestors from
   * root down to (but not including) the node with the given id.
   */
  private findAncestorPath(targetId: string): string[] {
    const path: string[] = [];
    this.findPathRecursive(this.opts.data, targetId, path);
    return path;
  }

  private findPathRecursive(
    nodes: TimelineNode[],
    targetId: string,
    path: string[],
    visited = new Set<string>(),
  ): boolean {
    for (const node of nodes) {
      if (node.id === targetId) return true;
      if (visited.has(node.id)) continue;
      visited.add(node.id);
      if (node.children) {
        path.push(node.id);
        if (this.findPathRecursive(node.children, targetId, path, visited)) return true;
        path.pop();
      }
    }
    return false;
  }

  // -----------------------------------------------------------------------
  // Layout computation
  // -----------------------------------------------------------------------

  /**
   * Compute the full graph layout and return the root GraphNode.
   */
  computeLayout(): GraphNode {
    const root = this.buildGraphTree();
    this.assignDimensions(root);
    this.positionRoot(root);
    this.positionChildrenRecursive(root);
    this.resolveOverlapsRecursive(root);
    return root;
  }

  /**
   * Compute edge data for all parent-child connections in the graph.
   */
  computeEdges(root: GraphNode): EdgeDatum[] {
    const edges: EdgeDatum[] = [];
    this.collectEdges(root, edges);
    return edges;
  }

  /**
   * Compute the axis-aligned bounding box of all graph nodes.
   */
  computeBounds(root: GraphNode): Bounds {
    let minX = root.x;
    let minY = root.y;
    let maxX = root.x + root.width;
    let maxY = root.y + root.height;

    const stack: GraphNode[] = [...root.children];
    while (stack.length > 0) {
      const node = stack.pop()!;
      if (node.x < minX) minX = node.x;
      if (node.y < minY) minY = node.y;
      if (node.x + node.width > maxX) maxX = node.x + node.width;
      if (node.y + node.height > maxY) maxY = node.y + node.height;
      stack.push(...node.children);
    }

    return {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY,
    };
  }

  // -----------------------------------------------------------------------
  // Graph tree construction
  // -----------------------------------------------------------------------

  private buildGraphTree(): GraphNode {
    const rootBand = this.makeBand(null, this.opts.data, 0);

    const root: GraphNode = {
      id: 'root',
      band: rootBand,
      parentSpan: null,
      parentGraphNode: null,
      children: [],
      x: 0,
      y: 0,
      width: 0,
      height: 0,
    };

    this.buildChildrenRecursive(root);
    return root;
  }

  private buildChildrenRecursive(parent: GraphNode, visited = new Set<string>()): void {
    for (const node of parent.band.nodes) {
      if (this.expanded.has(node.id) && node.children && node.children.length > 0) {
        // Guard against circular data references.
        if (visited.has(node.id)) continue;
        visited.add(node.id);

        const childBand = this.makeBand(node, node.children, parent.band.depth + 1);

        const childGraphNode: GraphNode = {
          id: node.id,
          band: childBand,
          parentSpan: node,
          parentGraphNode: parent,
          children: [],
          x: 0,
          y: 0,
          width: 0,
          height: 0,
        };

        parent.children.push(childGraphNode);
        this.buildChildrenRecursive(childGraphNode, visited);
      }
    }
  }

  // -----------------------------------------------------------------------
  // Dimension assignment
  // -----------------------------------------------------------------------

  private assignDimensions(node: GraphNode): void {
    node.width = this.opts.bandWidth;
    const { rowsAbove, rowsBelow } = computeRowCounts(node.band.nodes);
    node.height = computeBandHeight(rowsAbove, rowsBelow);

    for (const child of node.children) {
      this.assignDimensions(child);
    }
  }

  // -----------------------------------------------------------------------
  // Positioning
  // -----------------------------------------------------------------------

  private positionRoot(root: GraphNode): void {
    root.x = -root.width / 2;
    root.y = 0;
  }

  /**
   * Position each child band centered below its parent span.
   */
  private positionChildrenRecursive(parent: GraphNode): void {
    if (parent.children.length === 0) return;

    const s = this.createBandScale(parent);
    const padLeft = this.opts.padding.left;

    for (const child of parent.children) {
      if (!child.parentSpan) continue;

      // Compute the parent span's center-x in global coordinates.
      const spanX0 = s(child.parentSpan.start);
      const spanX1 = s(nodeEnd(child.parentSpan));
      const spanCenterLocal = (spanX0 + spanX1) / 2;
      const spanCenterGlobal = parent.x + padLeft + spanCenterLocal;

      // Center the child band under the parent span.
      child.x = spanCenterGlobal - child.width / 2;
      child.y = parent.y + parent.height + this.opts.verticalGap;

      // Recurse.
      this.positionChildrenRecursive(child);
    }
  }

  /**
   * Resolve horizontal overlaps between sibling child bands.
   * Scans left-to-right and pushes overlapping bands rightward.
   */
  private resolveOverlapsRecursive(node: GraphNode): void {
    if (node.children.length < 2) {
      // Still need to recurse into grandchildren.
      for (const child of node.children) {
        this.resolveOverlapsRecursive(child);
      }
      return;
    }

    // Sort children by x position.
    node.children.sort((a, b) => a.x - b.x);

    // Push overlapping siblings apart.
    const gap = this.opts.bandGap;
    for (let i = 1; i < node.children.length; i++) {
      const prev = node.children[i - 1];
      const curr = node.children[i];
      const rightEdgePrev = this.rightEdge(prev) + gap;

      if (curr.x < rightEdgePrev) {
        const shift = rightEdgePrev - curr.x;
        this.shiftSubtree(curr, shift);
      }
    }

    // Re-center the group of children under the parent band.
    this.recenterChildren(node);

    // Recurse.
    for (const child of node.children) {
      this.resolveOverlapsRecursive(child);
    }
  }

  /**
   * Compute the rightmost x edge of a subtree rooted at `node`.
   */
  private rightEdge(node: GraphNode): number {
    let maxRight = node.x + node.width;
    const stack: GraphNode[] = [...node.children];
    while (stack.length > 0) {
      const n = stack.pop()!;
      const r = n.x + n.width;
      if (r > maxRight) maxRight = r;
      stack.push(...n.children);
    }
    return maxRight;
  }

  /**
   * Shift a subtree horizontally by `dx`.
   */
  private shiftSubtree(node: GraphNode, dx: number): void {
    node.x += dx;
    const stack: GraphNode[] = [...node.children];
    while (stack.length > 0) {
      const n = stack.pop()!;
      n.x += dx;
      stack.push(...n.children);
    }
  }

  /**
   * Re-center children so their collective center aligns with the
   * parent band's center.
   */
  private recenterChildren(parent: GraphNode): void {
    const children = parent.children;
    if (children.length === 0) return;

    const leftMost = children[0].x;
    const rightMost = children[children.length - 1].x + children[children.length - 1].width;
    const childrenCenter = (leftMost + rightMost) / 2;
    const parentCenter = parent.x + parent.width / 2;
    const shift = parentCenter - childrenCenter;

    for (const child of children) {
      this.shiftSubtree(child, shift);
    }
  }

  // -----------------------------------------------------------------------
  // Edge computation
  // -----------------------------------------------------------------------

  private collectEdges(node: GraphNode, edges: EdgeDatum[]): void {
    if (node.children.length === 0) return;

    const s = this.createBandScale(node);
    const padLeft = this.opts.padding.left;
    const padRight = this.opts.padding.right;

    for (const child of node.children) {
      if (!child.parentSpan) continue;

      // Source: left and right endpoints of the parent span (bottom of parent band).
      const spanX0 = s(child.parentSpan.start);
      const spanX1 = s(nodeEnd(child.parentSpan));
      const sourceLeftX = node.x + padLeft + spanX0;
      const sourceRightX = node.x + padLeft + spanX1;
      const sourceY = node.y + node.height;

      // Target: left and right ends of the child band's axis (top of child band).
      const targetLeftX = child.x + padLeft;
      const targetRightX = child.x + child.width - padRight;
      const targetY = child.y;

      // Left edge: parent span start → child band axis left.
      edges.push({
        id: `${child.id}-l`,
        sourcePoint: [sourceLeftX, sourceY],
        targetPoint: [targetLeftX, targetY],
      });

      // Right edge: parent span end → child band axis right.
      edges.push({
        id: `${child.id}-r`,
        sourcePoint: [sourceRightX, sourceY],
        targetPoint: [targetRightX, targetY],
      });

      // Recurse.
      this.collectEdges(child, edges);
    }
  }

  // -----------------------------------------------------------------------
  // Helpers
  // -----------------------------------------------------------------------

  private makeBand(
    parentNode: TimelineNode | null,
    nodes: TimelineNode[],
    depth: number,
  ): BandDescriptor {
    const { laneCount } = this.opts.swimLanes
      ? assignLanes(nodes)
      : assignSingleLane(nodes);

    return {
      parentNode,
      nodes,
      depth,
      laneCount: Math.max(1, laneCount),
    };
  }

  /**
   * Create a D3 scale for a graph node's band.
   * The domain is scoped to the parent span's range (for child bands)
   * or the full data range (for root).
   */
  private createBandScale(graphNode: GraphNode): ScaleFn {
    const band = graphNode.band;
    const padLeft = this.opts.padding.left;
    const padRight = this.opts.padding.right;
    const innerWidth = graphNode.width - padLeft - padRight;

    const parentDomain = band.parentNode
      ? [band.parentNode.start, nodeEnd(band.parentNode)] as [Date, Date] | [number, number]
      : undefined;
    const scaleConfig: TimeScaleConfig = {
      ...this.opts.scale,
      domain: parentDomain ?? this.opts.scale.domain,
    };

    const { scale } = createScale(scaleConfig, band.nodes, [0, innerWidth]);
    return scale as ScaleFn;
  }

  private collapseDescendants(nodes: TimelineNode[], visited = new Set<string>()): void {
    for (const node of nodes) {
      if (visited.has(node.id)) continue;
      visited.add(node.id);
      this.expanded.delete(node.id);
      if (node.children) {
        this.collapseDescendants(node.children, visited);
      }
    }
  }

  private findNodeInData(id: string): TimelineNode | null {
    return findNodeRecursive(this.opts.data, id);
  }
}

function findNodeRecursive(
  nodes: TimelineNode[],
  id: string,
  visited = new Set<string>(),
): TimelineNode | null {
  for (const node of nodes) {
    if (node.id === id) return node;
    if (visited.has(node.id)) continue;
    visited.add(node.id);
    if (node.children) {
      const found = findNodeRecursive(node.children, id, visited);
      if (found) return found;
    }
  }
  return null;
}
