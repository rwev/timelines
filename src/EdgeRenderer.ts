import { select } from 'd3-selection';
import { linkVertical } from 'd3-shape';
import 'd3-transition';
import type { Selection, BaseType } from 'd3-selection';
import type { EdgeDatum, ResolvedOptions } from './types';
import { cssVar } from './themes';

/**
 * Renders Bezier curve edges connecting parent spans to their
 * expanded child bands in the graph.
 *
 * Uses d3-shape's `linkVertical()` to produce smooth cubic Bezier
 * paths between source (parent span bottom-center) and target
 * (child band top-center).
 *
 * Enter animation: edge grows from a zero-length point at the source.
 * Exit animation: edge collapses back to the source point.
 */
export class EdgeRenderer {
  private opts: ResolvedOptions;

  /** d3 link generator for vertical Bezier curves. */
  private linkGen = linkVertical<EdgeDatum, [number, number]>()
    .source((d) => d.sourcePoint)
    .target((d) => d.targetPoint);

  constructor(opts: ResolvedOptions) {
    this.opts = opts;
  }

  /**
   * Render all edges into the given `<g>` group.
   *
   * @param edgesG  The `<g>` container for edge paths.
   * @param edges   Edge data from GraphLayout.computeEdges().
   */
  render(
    edgesG: Selection<SVGGElement, unknown, BaseType, unknown>,
    edges: EdgeDatum[],
  ): void {
    const { opts, linkGen } = this;

    const sel = edgesG
      .selectAll<SVGPathElement, EdgeDatum>('path.tl-edge')
      .data(edges, (d) => d.id);

    // --- Exit ---------------------------------------------------------------
    // Collapse the curve back toward the source point, then remove.
    sel
      .exit<EdgeDatum>()
      .transition('edge-exit')
      .duration(opts.animationDuration)
      .style('opacity', 0)
      .attr('d', (d) => collapsedPath(d))
      .remove();

    // --- Enter --------------------------------------------------------------
    // Start as a zero-length point at the source, then grow to full path.
    const enter = sel
      .enter()
      .append('path')
      .attr('class', 'tl-edge')
      .style('opacity', 0)
      .style('fill', 'none')
      .style('stroke', cssVar('edgeColor'))
      .attr('stroke-width', 3)
      .attr('stroke-linecap', 'round')
      .attr('d', (d) => collapsedPath(d));

    // --- Merge (enter + update) ---------------------------------------------
    enter
      .merge(sel)
      .on('mouseenter', function () {
        select(this).style('stroke', cssVar('edgeHoverColor')).attr('stroke-width', 4.5);
      })
      .on('mouseleave', function () {
        select(this).style('stroke', cssVar('edgeColor')).attr('stroke-width', 3);
      })
      .transition('edge-enter')
      .duration(opts.animationDuration)
      .style('opacity', 1)
      .attr('d', (d) => linkGen(d));
  }
}

/**
 * Generate a degenerate (zero-length) Bezier path at the source point.
 * Used as the starting/ending state for enter/exit animations.
 */
function collapsedPath(d: EdgeDatum): string {
  const [sx, sy] = d.sourcePoint;
  return `M${sx},${sy}C${sx},${sy},${sx},${sy},${sx},${sy}`;
}
