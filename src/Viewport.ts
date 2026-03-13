import { zoom, zoomIdentity } from 'd3-zoom';
import type { ZoomBehavior, ZoomTransform } from 'd3-zoom';
import { select } from 'd3-selection';
import 'd3-transition';
import type { Selection, BaseType } from 'd3-selection';
import type { Bounds, ViewportOptions } from './types';

/**
 * Manages d3-zoom pan/zoom behaviour over the entire graph canvas.
 *
 * All rendered content (bands, edges) lives inside a root `<g>` group.
 * The Viewport applies a `transform` to that group based on zoom state.
 */
export class Viewport {
  private opts: ViewportOptions;
  private zoomBehavior: ZoomBehavior<SVGSVGElement, unknown>;
  private svg: Selection<SVGSVGElement, unknown, BaseType, unknown> | null = null;
  private rootG: Selection<SVGGElement, unknown, BaseType, unknown> | null = null;
  private currentTransform: ZoomTransform = zoomIdentity;

  constructor(opts: ViewportOptions) {
    this.opts = opts;

    this.zoomBehavior = zoom<SVGSVGElement, unknown>()
      .scaleExtent([opts.minZoom, opts.maxZoom])
      .on('zoom', (event) => {
        this.currentTransform = event.transform;
        this.rootG?.attr('transform', event.transform.toString());
      });
  }

  /**
   * Attach the zoom behaviour to the SVG and designate the root group.
   */
  setup(
    svg: Selection<SVGSVGElement, unknown, BaseType, unknown>,
    rootG: Selection<SVGGElement, unknown, BaseType, unknown>,
  ): void {
    this.svg = svg;
    this.rootG = rootG;

    svg.call(this.zoomBehavior);

    // Prevent double-click zoom (interferes with drill-down clicks).
    svg.on('dblclick.zoom', null);

    // Set initial transform.
    svg.call(this.zoomBehavior.transform, zoomIdentity);
  }

  /**
   * Animate the viewport to fit the given bounding box within the SVG.
   */
  fitToContent(bounds: Bounds, animate = true): void {
    if (!this.svg) return;

    const svgNode = this.svg.node();
    if (!svgNode) return;

    const { width: svgW, height: svgH } = svgNode.getBoundingClientRect();
    if (svgW === 0 || svgH === 0) return;

    const pad = this.opts.fitPadding;
    const bw = bounds.width || 1;
    const bh = bounds.height || 1;

    const maxFitScale = Math.min(this.opts.maxZoom, 1.5);
    const scale = Math.max(
      this.opts.minZoom,
      Math.min(
        (svgW - pad * 2) / bw,
        (svgH - pad * 2) / bh,
        maxFitScale,
      ),
    );

    const cx = bounds.x + bw / 2;
    const cy = bounds.y + bh / 2;
    const tx = svgW / 2 - cx * scale;
    const ty = svgH / 2 - cy * scale;

    const transform = zoomIdentity.translate(tx, ty).scale(scale);

    if (animate) {
      this.svg
        .transition('viewport')
        .duration(500)
        .call(this.zoomBehavior.transform as any, transform);
    } else {
      this.svg.call(this.zoomBehavior.transform, transform);
    }
  }

  /**
   * Animate the viewport to center on a specific point at the current scale.
   */
  panTo(x: number, y: number, animate = true): void {
    if (!this.svg) return;
    const svgNode = this.svg.node();
    if (!svgNode) return;

    const { width: svgW, height: svgH } = svgNode.getBoundingClientRect();
    const scale = this.currentTransform.k;
    const tx = svgW / 2 - x * scale;
    const ty = svgH / 2 - y * scale;

    const transform = zoomIdentity.translate(tx, ty).scale(scale);

    if (animate) {
      this.svg
        .transition('viewport')
        .duration(400)
        .call(this.zoomBehavior.transform as any, transform);
    } else {
      this.svg.call(this.zoomBehavior.transform, transform);
    }
  }

  /**
   * Reset to identity transform.
   */
  reset(animate = true): void {
    if (!this.svg) return;
    if (animate) {
      this.svg
        .transition('viewport')
        .duration(400)
        .call(this.zoomBehavior.transform as any, zoomIdentity);
    } else {
      this.svg.call(this.zoomBehavior.transform, zoomIdentity);
    }
  }

  getTransform(): ZoomTransform {
    return this.currentTransform;
  }

  destroy(): void {
    this.svg?.on('.zoom', null);
    this.svg = null;
    this.rootG = null;
  }
}
