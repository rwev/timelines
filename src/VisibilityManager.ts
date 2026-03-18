import type { ScaleFn, TimelineNode } from './types';
import { isEvent, nodeEnd } from './utils';

// ---------------------------------------------------------------------------
// VisibilityManager
// ---------------------------------------------------------------------------

/**
 * Result of a visibility computation pass.
 */
export interface VisibilityResult {
  /** Flat list of nodes visible at the current zoom level. */
  visibleNodes: TimelineNode[];
  /**
   * IDs of visible nodes whose children are also visible.
   * Passed to `BandRenderer` as `expandedNodeIds` to suppress
   * the detail indicator on these nodes.
   */
  expandedIds: ReadonlySet<string>;
  /** Whether the visible set changed since the last computation. */
  isChanged: boolean;
}

/**
 * Determines which nodes from the full data tree should be rendered
 * at the current semantic zoom level.
 *
 * Walks the data tree recursively. A span becomes visible when its
 * pixel width on the current (zoomed) scale exceeds the expand
 * threshold. Its children are then candidates for visibility at the
 * next depth level. Events are visible whenever their parent context
 * is visited (i.e., their enclosing span is wide enough).
 *
 * **Hysteresis**: separate expand (higher) and collapse (lower)
 * thresholds prevent flickering at threshold boundaries.
 */
export class VisibilityManager {
  private previousIds = new Set<string>();

  /**
   * Compute the set of visible nodes for the given scale.
   *
   * @param data             Root data nodes (full tree).
   * @param scale            The current zoomed scale (from `rescaleX`).
   * @param expandThreshold  Pixel width to make a span's children visible.
   * @param collapseThreshold Pixel width below which children are hidden.
   * @param maxDepth         Maximum hierarchy depth to reveal.
   */
  computeVisibility(
    data: TimelineNode[],
    scale: ScaleFn,
    expandThreshold: number,
    collapseThreshold: number,
    maxDepth: number,
  ): VisibilityResult {
    const visible: TimelineNode[] = [];
    const expandedIds = new Set<string>();

    this.walkTree(
      data, scale, expandThreshold, collapseThreshold,
      0, maxDepth, visible, expandedIds, new Set(),
    );

    // Top-level nodes (depth 0) are always visible — they are the
    // base layer of the timeline regardless of zoom level.
    for (const node of data) {
      if (!visible.includes(node)) {
        visible.push(node);
      }
    }

    const currentIds = new Set(visible.map((n) => n.id));
    const isChanged = !setsEqual(currentIds, this.previousIds);
    this.previousIds = currentIds;

    return { visibleNodes: visible, expandedIds, isChanged };
  }

  // -----------------------------------------------------------------------
  // Internals
  // -----------------------------------------------------------------------

  private walkTree(
    nodes: TimelineNode[],
    scale: ScaleFn,
    expandThreshold: number,
    collapseThreshold: number,
    depth: number,
    maxDepth: number,
    visible: TimelineNode[],
    expandedIds: Set<string>,
    visited: Set<string>,
  ): void {
    for (const node of nodes) {
      // Guard against circular data.
      if (visited.has(node.id)) continue;
      visited.add(node.id);

      if (isEvent(node)) {
        // Events are visible when their parent context is being walked.
        // Top-level events are handled by the always-visible root pass.
        if (depth > 0) visible.push(node);
        continue;
      }

      // Span: check pixel width on the current zoomed scale.
      const x0 = scale(node.start);
      const x1 = scale(nodeEnd(node));
      const pixelWidth = Math.abs(x1 - x0);

      // At depth 0, spans are always visible (added in the root pass).
      // For deeper spans, they must meet the threshold.
      if (depth > 0) {
        const wasVisible = this.previousIds.has(node.id);
        const threshold = wasVisible ? collapseThreshold : expandThreshold;
        if (pixelWidth < threshold) continue;
        visible.push(node);
      }

      // If this span has children and is wide enough, recurse.
      if (node.children && node.children.length > 0 && depth < maxDepth) {
        const wasExpanded = this.previousIds.has(node.children[0]?.id);
        const childThreshold = wasExpanded ? collapseThreshold : expandThreshold;

        if (pixelWidth >= childThreshold) {
          expandedIds.add(node.id);
          this.walkTree(
            node.children, scale, expandThreshold, collapseThreshold,
            depth + 1, maxDepth, visible, expandedIds, visited,
          );
        }
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function setsEqual(a: Set<string>, b: Set<string>): boolean {
  if (a.size !== b.size) return false;
  for (const id of a) {
    if (!b.has(id)) return false;
  }
  return true;
}
