import { select } from 'd3-selection';
import 'd3-transition';
import type { Selection, BaseType } from 'd3-selection';
import type {
  GraphNode,
  ResolvedOptions,
  TimelineNode,
  TimelineOptions,
} from './types';
import { resolveOptions, flattenGraphTree } from './utils';
import { ThemeManager } from './themes';
import { GraphLayout } from './GraphLayout';
import { BandRenderer } from './BandRenderer';
import { EdgeRenderer } from './EdgeRenderer';
import { InteractionManager } from './InteractionManager';
import { Viewport } from './Viewport';

/**
 * Main entry point for the timelines library.
 *
 * Creates a single pannable/zoomable SVG canvas containing a hierarchical
 * graph of connected timeline bands. Clicking a span expands its children
 * as a new band below, connected by Bezier edges. The entire graph reflows
 * smoothly on every interaction.
 *
 * Usage:
 * ```ts
 * const tl = new Timeline(document.getElementById('container')!, {
 *   data: myNodes,
 *   scale: { type: 'time' },
 *   bandWidth: 800,
 * });
 *
 * tl.expandNode('some-id');
 * tl.fitToContent();
 * tl.destroy();
 * ```
 */
export class Timeline {
  private container: HTMLElement;
  private opts: ResolvedOptions;
  private svg!: Selection<SVGSVGElement, unknown, BaseType, unknown>;
  private zoomG!: Selection<SVGGElement, unknown, BaseType, unknown>;
  private edgesG!: Selection<SVGGElement, unknown, BaseType, unknown>;
  private bandsG!: Selection<SVGGElement, unknown, BaseType, unknown>;

  private themeManager: ThemeManager;
  private graphLayout: GraphLayout;
  private bandRenderer: BandRenderer;
  private edgeRenderer: EdgeRenderer;
  private interactionManager: InteractionManager;
  private viewport: Viewport;
  private resizeObserver: ResizeObserver | null = null;

  private isFirstRender = true;

  constructor(container: HTMLElement, options: TimelineOptions) {
    if (!container) {
      throw new Error('Timeline: container element is required');
    }
    if (!Array.isArray(options?.data)) {
      throw new Error('Timeline: options.data must be an array of TimelineNode');
    }

    this.container = container;
    this.opts = resolveOptions(options);

    this.container.classList.add('timelines-root');

    // Initialize sub-systems.
    this.themeManager = new ThemeManager();
    this.graphLayout = new GraphLayout(this.opts);
    this.bandRenderer = new BandRenderer(this.opts);
    this.edgeRenderer = new EdgeRenderer(this.opts);
    this.viewport = new Viewport(this.opts.viewport);
    this.interactionManager = new InteractionManager(
      this.opts,
      this.graphLayout,
      this.container,
      (focusNodeId) => this.render(focusNodeId),
    );

    // Inject theme.
    this.themeManager.apply(this.container);

    // Build the SVG structure.
    this.createSvg();

    // Initial render.
    this.render();

    // Responsive resize.
    this.setupResizeObserver();
  }

  // -----------------------------------------------------------------------
  // Public API
  // -----------------------------------------------------------------------

  /** Programmatically expand a node to show its children. */
  expandNode(nodeId: string, options?: { exclusive?: boolean; focus?: boolean }): void {
    const exclusive = options?.exclusive ?? this.opts.exclusiveExpand;
    const focus = options?.focus ?? this.opts.focusOnExpand;

    if (exclusive) {
      this.graphLayout.expandExclusive(nodeId);
    } else {
      this.graphLayout.expand(nodeId);
    }

    this.render(focus ? nodeId : undefined);
  }

  /** Programmatically collapse a node and its descendants. */
  collapseNode(nodeId: string): void {
    this.graphLayout.collapse(nodeId);
    this.render();
  }

  /** Collapse all expanded nodes. */
  collapseAll(): void {
    this.graphLayout.collapseAll();
    this.render();
  }

  /** Replace the data and re-render from scratch. */
  update(data: TimelineNode[]): void {
    this.opts.data = data;
    this.graphLayout.collapseAll();
    this.isFirstRender = true;
    this.render();
  }

  /** Animate the viewport to fit all visible bands. */
  fitToContent(animate = true): void {
    const root = this.graphLayout.computeLayout();
    const bounds = this.graphLayout.computeBounds(root);
    this.viewport.fitToContent(bounds, animate);
  }

  /** Clean up all DOM elements, observers, and event listeners. */
  destroy(): void {
    this.resizeObserver?.disconnect();
    this.viewport.destroy();
    this.themeManager.destroy();
    this.svg.remove();
    this.container.classList.remove('timelines-root');
  }

  // -----------------------------------------------------------------------
  // Core render loop
  // -----------------------------------------------------------------------

  private render(focusNodeId?: string): void {
    // 1. Compute graph layout.
    const root = this.graphLayout.computeLayout();
    const edges = this.graphLayout.computeEdges(root);
    const allNodes = flattenGraphTree(root);

    // 2. Render edges (below bands so bands draw on top).
    this.edgeRenderer.render(this.edgesG, edges);

    // 3. Render bands via D3 data join.
    this.renderBands(allNodes);

    // 4. Fit viewport.
    //    On first render: snap immediately (no animation, wait for browser layout).
    //    On drill-down (focusNodeId set): fit to the expanded child band.
    //    Otherwise: fit to the full graph bounds.
    const fullBounds = this.graphLayout.computeBounds(root);
    if (this.isFirstRender) {
      this.isFirstRender = false;
      requestAnimationFrame(() => {
        this.viewport.fitToContent(fullBounds, false);
      });
    } else {
      // Determine the target bounds: child band if focusing, else full graph.
      let targetBounds = fullBounds;
      if (focusNodeId) {
        const focusNode = allNodes.find((n) => n.id === focusNodeId);
        if (focusNode) {
          targetBounds = {
            x: focusNode.x,
            y: focusNode.y,
            width: focusNode.width,
            height: focusNode.height,
          };
        }
      }

      // Delay the fit until the band/edge transitions have largely completed,
      // so the viewport smoothly follows the content.
      setTimeout(() => {
        this.viewport.fitToContent(targetBounds, true);
      }, this.opts.animationDuration * 0.6);
    }
  }

  private renderBands(allNodes: GraphNode[]): void {
    const { opts } = this;

    const bandSel = this.bandsG
      .selectAll<SVGGElement, GraphNode>('g.tl-band')
      .data(allNodes, (d) => d.id);

    // --- Exit ---------------------------------------------------------------
    bandSel
      .exit<GraphNode>()
      .transition()
      .duration(opts.animationDuration)
      .style('opacity', 0)
      .attr('transform', function (d) {
        // Collapse toward parent position if available.
        const parent = d.parentGraphNode;
        if (parent) {
          return `translate(${parent.x + parent.width / 2}, ${parent.y + parent.height})`;
        }
        return select(this).attr('transform');
      })
      .remove();

    // --- Enter --------------------------------------------------------------
    const bandEnter = bandSel
      .enter()
      .append('g')
      .attr('class', 'tl-band')
      .style('opacity', 0)
      .attr('transform', (d) => {
        // Enter from parent position if available, else own position.
        const parent = d.parentGraphNode;
        if (parent) {
          return `translate(${parent.x + parent.width / 2}, ${parent.y + parent.height})`;
        }
        return `translate(${d.x}, ${d.y})`;
      });

    // --- Merge (enter + update) ---------------------------------------------
    const bandMerge = bandEnter.merge(bandSel);

    bandMerge
      .transition()
      .duration(opts.animationDuration)
      .style('opacity', (d) => Math.max(0.65, 1 - d.band.depth * opts.depthFade))
      .attr('transform', (d) => `translate(${d.x}, ${d.y})`);

    // Render each band's internal content.
    bandMerge.each((_d, i, nodes) => {
      const g = select<SVGGElement, GraphNode>(nodes[i]);
      const graphNode = g.datum();
      this.bandRenderer.render(
        g,
        graphNode,
        this.interactionManager.handleClick,
        this.interactionManager.handleHover,
      );
    });
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

    // Root zoom group — all content lives inside this.
    this.zoomG = this.svg.append('g').attr('class', 'tl-zoom-group');

    // Edges render below bands.
    this.edgesG = this.zoomG.append('g').attr('class', 'tl-edges');
    // Bands render above edges.
    this.bandsG = this.zoomG.append('g').attr('class', 'tl-bands');

    // Attach pan/zoom.
    this.viewport.setup(this.svg, this.zoomG);
  }

  private setupResizeObserver(): void {
    if (typeof ResizeObserver === 'undefined') return;

    let timer: ReturnType<typeof setTimeout>;
    this.resizeObserver = new ResizeObserver(() => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        // Re-fit on resize to keep content visible.
        this.fitToContent(false);
      }, 100);
    });
    this.resizeObserver.observe(this.container);
  }
}
