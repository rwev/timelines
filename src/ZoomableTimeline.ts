import { select } from 'd3-selection';
import { zoom, zoomIdentity } from 'd3-zoom';
import 'd3-transition';
import type { Selection, BaseType } from 'd3-selection';
import type { ZoomBehavior, ZoomTransform } from 'd3-zoom';
import type {
  BandDescriptor,
  GraphNode,
  ResolvedZoomableOptions,
  ScaleFn,
  TimelineNode,
  TimelineScale,
  TimeScaleConfig,
  ZoomableTimelineOptions,
} from './types';
import {
  resolveZoomableOptions,
  computeDomain,
} from './utils';
import { ThemeManager } from './themes';
import { BandRenderer, computeBandHeight, computeRowCounts } from './BandRenderer';
import { createScale } from './ScaleFactory';
import { VisibilityManager } from './VisibilityManager';

/** Debounce delay (ms) for re-rendering after the visible set changes. */
const RENDER_DEBOUNCE_MS = 80;

/**
 * Semantic-zoom timeline.
 *
 * Renders a **single** timeline band. As the user zooms in (scroll /
 * pinch), items from deeper hierarchy levels progressively appear
 * in-place on the same axis — similar to how a map application reveals
 * city labels, roads, and buildings at increasing zoom levels.
 *
 * Zooming out hides deeper items again. A detail indicator (three small
 * dots) appears on spans whose children are currently hidden, signalling
 * that more detail is available.
 *
 * The zoom is **semantic**: `d3-zoom` tracks the transform but does
 * *not* geometrically scale the SVG content. Instead, the horizontal
 * scale is recomputed via `transform.rescaleX()` on every zoom/pan
 * event, and all content is re-rendered at native resolution.
 *
 * Usage:
 * ```ts
 * const tl = new ZoomableTimeline(document.getElementById('root')!, {
 *   data: myNodes,
 *   scale: { type: 'time' },
 *   expandThreshold: 60,
 * });
 *
 * tl.resetZoom();
 * tl.destroy();
 * ```
 */
export class ZoomableTimeline {
  private container: HTMLElement;
  private opts: ResolvedZoomableOptions;

  private svg!: Selection<SVGSVGElement, unknown, BaseType, unknown>;
  private bandG!: Selection<SVGGElement, unknown, BaseType, unknown>;

  private themeManager: ThemeManager;
  private bandRenderer: BandRenderer;
  private visibilityManager: VisibilityManager;

  private zoomBehavior!: ZoomBehavior<SVGSVGElement, unknown>;
  private baseScale!: TimelineScale;
  private baseScaleConfig!: TimeScaleConfig;

  private resizeObserver: ResizeObserver | null = null;
  private isDestroyed = false;
  private pendingDebounce: ReturnType<typeof setTimeout> | null = null;
  private pendingRaf: number | null = null;

  /** Cached graph node from the most recent full render. */
  private currentGraphNode: GraphNode | null = null;

  constructor(container: HTMLElement, options: ZoomableTimelineOptions) {
    if (!container) {
      throw new Error('ZoomableTimeline: container element is required');
    }
    if (!Array.isArray(options?.data)) {
      throw new Error('ZoomableTimeline: options.data must be an array of TimelineNode');
    }

    this.container = container;
    this.opts = resolveZoomableOptions(options);
    this.container.classList.add('timelines-root');

    // Sub-systems.
    this.themeManager = new ThemeManager();
    this.bandRenderer = new BandRenderer(this.opts);
    this.visibilityManager = new VisibilityManager();

    // Inject theme.
    this.themeManager.apply(this.container);

    // Build SVG, set up zoom, initial render.
    this.createSvg();
    this.setupZoom();
    this.renderAtTransform(zoomIdentity);
    this.setupResizeObserver();
  }

  // -----------------------------------------------------------------------
  // Public API
  // -----------------------------------------------------------------------

  /** Replace the data and re-render from scratch. */
  update(data: TimelineNode[]): void {
    this.opts.data = data;
    this.rebuildBaseScale();
    this.renderAtTransform(zoomIdentity);
    if (this.svg) {
      this.svg.call(this.zoomBehavior.transform, zoomIdentity);
    }
  }

  /** Reset the zoom to show the full data domain. */
  resetZoom(animate = true): void {
    if (!this.svg) return;
    if (animate) {
      this.svg
        .transition('reset')
        .duration(400)
        .call(this.zoomBehavior.transform as any, zoomIdentity);
    } else {
      this.svg.call(this.zoomBehavior.transform, zoomIdentity);
    }
  }

  /** Clean up all DOM elements, observers, and event listeners. */
  destroy(): void {
    this.isDestroyed = true;
    if (this.pendingDebounce != null) clearTimeout(this.pendingDebounce);
    if (this.pendingRaf != null) cancelAnimationFrame(this.pendingRaf);
    this.pendingDebounce = null;
    this.pendingRaf = null;
    this.resizeObserver?.disconnect();
    this.resizeObserver = null;
    this.svg?.on('.zoom', null);
    this.svg?.remove();
    this.themeManager.destroy();
    this.container.classList.remove('timelines-root');
  }

  // -----------------------------------------------------------------------
  // SVG setup
  // -----------------------------------------------------------------------

  private createSvg(): void {
    select(this.container).select('svg.tl-svg').remove();

    this.svg = select(this.container)
      .append('svg')
      .attr('class', 'tl-svg')
      .style('display', 'block')
      .style('width', '100%')
      .style('height', '100%')
      .style('cursor', 'grab');

    // Single band group — no intermediate zoom-group since we
    // do semantic zoom (no geometric transform on a parent <g>).
    this.bandG = this.svg.append('g').attr('class', 'tl-band');

    this.rebuildBaseScale();
  }

  /**
   * (Re)create the base scale from the full data domain and the
   * current SVG width. Called on init and on resize.
   */
  private rebuildBaseScale(): void {
    const innerWidth = this.getInnerWidth();
    this.baseScaleConfig = { ...this.opts.scale };
    const { scale } = createScale(this.baseScaleConfig, this.opts.data, [0, innerWidth]);
    this.baseScale = scale;
  }

  // -----------------------------------------------------------------------
  // Semantic zoom
  // -----------------------------------------------------------------------

  private setupZoom(): void {
    this.zoomBehavior = zoom<SVGSVGElement, unknown>()
      .scaleExtent([this.opts.minZoom, this.opts.maxZoom])
      .on('zoom', (event) => {
        if (this.isDestroyed) return;
        this.handleZoom(event.transform);
      });

    this.svg.call(this.zoomBehavior);

    // Disable double-click zoom (it jumps too aggressively).
    this.svg.on('dblclick.zoom', null);
  }

  /**
   * Called on every zoom / pan event. Two-tier rendering:
   *
   * 1. **Every frame**: reposition existing items using the new scale
   *    via `bandRenderer.updatePositions()`. This keeps the axis,
   *    brackets, markers, and labels tracking the zoom in real time.
   *
   * 2. **When the visible set changes** (debounced): run a full D3
   *    data-join render so new items fade in and removed items fade out.
   */
  private handleZoom = (transform: ZoomTransform): void => {
    if (this.isDestroyed) return;

    // Semantic zoom: rescale X-axis to the zoomed domain.
    const zoomedScale = transform.rescaleX(this.baseScale) as TimelineScale;

    // --- Tier 1: per-frame position update (coalesced via rAF) ----
    if (this.currentGraphNode) {
      if (this.pendingRaf != null) cancelAnimationFrame(this.pendingRaf);
      this.pendingRaf = requestAnimationFrame(() => {
        if (this.isDestroyed) return;
        this.pendingRaf = null;
        this.updateGraphNodeDomain(this.currentGraphNode!, zoomedScale);
        this.bandRenderer.updatePositions(
          this.bandG as Selection<SVGGElement, GraphNode, BaseType, unknown>,
          this.currentGraphNode!,
        );
      });
    }

    // --- Tier 2: full data-join render when visible set changes ----
    const s = zoomedScale as ScaleFn;
    const { visibleNodes, expandedIds, isChanged } =
      this.visibilityManager.computeVisibility(
        this.opts.data, s,
        this.opts.expandThreshold,
        this.opts.collapseThreshold,
        this.opts.maxDepth,
      );

    if (!isChanged) return;

    if (this.pendingDebounce != null) clearTimeout(this.pendingDebounce);
    this.pendingDebounce = setTimeout(() => {
      if (this.isDestroyed) return;
      this.pendingDebounce = null;
      this.renderBand(zoomedScale, visibleNodes, expandedIds);
    }, RENDER_DEBOUNCE_MS);
  };

  // -----------------------------------------------------------------------
  // Rendering
  // -----------------------------------------------------------------------

  /**
   * Full render pass at a given zoom transform.
   * Used for initial render and programmatic resets.
   */
  private renderAtTransform(transform: ZoomTransform): void {
    if (this.isDestroyed) return;

    const zoomedScale = transform.rescaleX(this.baseScale) as TimelineScale;
    const s = zoomedScale as ScaleFn;

    const { visibleNodes, expandedIds } =
      this.visibilityManager.computeVisibility(
        this.opts.data, s,
        this.opts.expandThreshold,
        this.opts.collapseThreshold,
        this.opts.maxDepth,
      );

    this.renderBand(zoomedScale, visibleNodes, expandedIds);
  }

  /**
   * Render the single band with the given visible nodes.
   * Runs the full D3 data join — new items enter with a fade-in
   * transition, removed items exit with a fade-out.
   */
  private renderBand(
    zoomedScale: TimelineScale,
    visibleNodes: TimelineNode[],
    expandedIds: ReadonlySet<string>,
  ): void {
    const { opts } = this;
    const innerWidth = this.getInnerWidth();
    const svgHeight = this.getSvgHeight();

    // Compute the zoomed domain for the virtual parent node.
    const domain = typeof zoomedScale.domain === 'function'
      ? (zoomedScale.domain() as [number, number] | [Date, Date])
      : computeDomain(visibleNodes);

    // Virtual parent node: represents the current visible time window.
    // BandRenderer uses its [start, end] as the scale domain.
    const viewNode: TimelineNode = {
      id: '__zoomable_view__',
      label: '',
      start: domain[0],
      end: domain[1],
    };

    // Compute band height from visible nodes.
    const { rowsAbove, rowsBelow } = computeRowCounts(visibleNodes);
    const bandHeight = computeBandHeight(rowsAbove, rowsBelow);

    const band: BandDescriptor = {
      parentNode: viewNode,
      nodes: visibleNodes,
      depth: 0,
      laneCount: 1,
    };

    const graphNode: GraphNode = {
      id: 'root',
      band,
      parentSpan: null,
      parentGraphNode: null,
      children: [],
      x: 0,
      y: Math.max(0, (svgHeight - bandHeight) / 2),
      width: innerWidth + opts.padding.left + opts.padding.right,
      height: bandHeight,
    };

    // Cache for per-frame position updates.
    this.currentGraphNode = graphNode;

    // Position the band group.
    this.bandG
      .datum(graphNode)
      .attr('transform', `translate(${graphNode.x}, ${graphNode.y})`);

    // Override scale config to disable .nice() — the domain from
    // rescaleX must stay exact to prevent center-point drift.
    const prevNice = opts.scale.nice;
    opts.scale.nice = false;

    const noop = (): void => {};
    const handleHover = (node: TimelineNode | null): void => {
      opts.onHover?.(node);
    };

    this.bandRenderer.render(
      this.bandG as Selection<SVGGElement, GraphNode, BaseType, unknown>,
      graphNode,
      noop,
      handleHover,
      expandedIds,
    );

    // Restore (harmless — only ZoomableTimeline uses this opts object).
    opts.scale.nice = prevNice;
  }

  /**
   * Update the cached graph node's domain to match the current zoom
   * without changing the visible node set.
   */
  private updateGraphNodeDomain(
    graphNode: GraphNode,
    zoomedScale: TimelineScale,
  ): void {
    const domain = typeof zoomedScale.domain === 'function'
      ? (zoomedScale.domain() as [number, number] | [Date, Date])
      : null;
    if (!domain || !graphNode.band.parentNode) return;

    graphNode.band.parentNode.start = domain[0];
    graphNode.band.parentNode.end = domain[1];
  }

  // -----------------------------------------------------------------------
  // Helpers
  // -----------------------------------------------------------------------

  private getInnerWidth(): number {
    const svgNode = this.svg?.node();
    const svgWidth = svgNode?.getBoundingClientRect().width ?? 800;
    return Math.max(1, svgWidth - this.opts.padding.left - this.opts.padding.right);
  }

  private getSvgHeight(): number {
    return this.svg?.node()?.getBoundingClientRect().height ?? 400;
  }

  private setupResizeObserver(): void {
    if (typeof ResizeObserver === 'undefined') return;

    let timer: ReturnType<typeof setTimeout>;
    this.resizeObserver = new ResizeObserver(() => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        if (this.isDestroyed) return;
        this.rebuildBaseScale();
        this.renderAtTransform(zoomIdentity);
      }, 100);
    });
    this.resizeObserver.observe(this.container);
  }
}
