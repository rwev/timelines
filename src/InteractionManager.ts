import type { ResolvedOptions, TimelineNode, TimelineEventMap } from './types';
import { GraphLayout } from './GraphLayout';

/**
 * Manages click/hover interactions on timeline spans and dispatches
 * custom DOM events on the container element.
 *
 * Acts as the bridge between BandRenderer click callbacks and
 * the GraphLayout expansion state, triggering full graph reflows.
 */
export class InteractionManager {
  private opts: ResolvedOptions;
  private graphLayout: GraphLayout;
  private container: HTMLElement;
  private renderCallback: (focusNodeId?: string) => void;

  constructor(
    opts: ResolvedOptions,
    graphLayout: GraphLayout,
    container: HTMLElement,
    renderCallback: (focusNodeId?: string) => void,
  ) {
    this.opts = opts;
    this.graphLayout = graphLayout;
    this.container = container;
    this.renderCallback = renderCallback;
  }

  /**
   * Handle a click on a span node.
   * On drill-down: optionally collapses other paths (exclusiveExpand) and
   * focuses the viewport on the child band (focusOnExpand).
   * On collapse: always fits the full graph.
   */
  handleClick = (node: TimelineNode): void => {
    if (!node.children || node.children.length === 0) return;

    const wasExpanded = this.graphLayout.isExpanded(node.id);

    if (wasExpanded) {
      this.graphLayout.collapse(node.id);
      this.dispatch('timeline:collapse', node);
      this.opts.onCollapse?.(node);
      this.renderCallback();
    } else {
      if (this.opts.exclusiveExpand) {
        this.graphLayout.expandExclusive(node.id);
      } else {
        this.graphLayout.expand(node.id);
      }
      this.dispatch('timeline:drill-down', node);
      this.opts.onDrillDown?.(node);
      this.renderCallback(this.opts.focusOnExpand ? node.id : undefined);
    }
  };

  /**
   * Handle hover enter/leave on a span node.
   */
  handleHover = (node: TimelineNode | null): void => {
    this.dispatch('timeline:hover', node);
    this.opts.onHover?.(node);
  };

  // -----------------------------------------------------------------------
  // Event dispatch
  // -----------------------------------------------------------------------

  private dispatch<K extends keyof TimelineEventMap>(
    eventName: K,
    node: TimelineNode | null,
  ): void {
    const event = new CustomEvent(eventName, {
      detail: { node },
      bubbles: true,
    });
    this.container.dispatchEvent(event);
  }
}
