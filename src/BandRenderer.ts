import { select } from 'd3-selection';
import 'd3-transition';
import type { Selection, BaseType } from 'd3-selection';
import type {
  GraphNode,
  ResolvedOptions,
  ScaleFn,
  TimelineNode,
  TimelineScale,
  TimeScaleConfig,
} from './types';
import { createScale } from './ScaleFactory';
import { cssVar } from './themes';
import { toNumeric, isEvent as isEventNode, nodeEnd } from './utils';

// ---------------------------------------------------------------------------
// Layout constants
// ---------------------------------------------------------------------------

/** Height reserved for the D3 axis (tick marks + tick labels). */
export const AXIS_AREA_HEIGHT = 24;

/** Vertical extent of a bracket from the axis line. */
const BRACKET_HEIGHT = 16;

/** Extra space above the topmost / below the bottommost bracket bar
 *  so that label text (centered on the bar) doesn't clip. */
const LABEL_OVERFLOW = 8;

/** Padding in px on each side of the label gap in the bracket bar. */
const LABEL_GAP_PAD = 5;

/** Minimum pixel width of a span to render its label. */
const MIN_LABEL_WIDTH = 28;

/** Minimum pixel separation between brackets in the same row.
 *  Prevents touching/adjacent brackets from visually merging. */
const BRACKET_SEPARATION = 12;

/** Half-width of the collision zone for discrete events (px).
 *  Events have zero duration, so they need a synthetic width for overlap detection. */
const EVENT_HALF_WIDTH = 25;

// ---------------------------------------------------------------------------
// Depth-scaled visual style
// ---------------------------------------------------------------------------

/**
 * All rendering parameters that attenuate with hierarchy depth.
 * Depth 0 (root) is visually dominant; each deeper level gets
 * progressively lighter / smaller.
 */
interface DepthStyle {
  axisStrokeWidth: number;
  axisFontSize: number;
  bracketInteractiveWidth: number;
  bracketLeafWidth: number;
  markerInteractiveR: number;
  markerLeafR: number;
  labelFontSize: number;
  labelInteractiveWeight: number;
  labelLeafWeight: number;
}

/** Linear step-down with a floor: base - depth * step, clamped to min. */
function step(base: number, perDepth: number, min: number, depth: number): number {
  return Math.max(min, base - depth * perDepth);
}

function computeDepthStyle(depth: number): DepthStyle {
  return {
    axisStrokeWidth:          step(3.0,  0.5,  1.5,  depth),
    axisFontSize:             step(12,   1.5,  9,    depth),
    bracketInteractiveWidth:  step(2.5,  0.5,  1.2,  depth),
    bracketLeafWidth:         step(2.0,  0.4,  1.0,  depth),
    markerInteractiveR:       step(5,    0.8,  3,    depth),
    markerLeafR:              step(3.5,  0.5,  2,    depth),
    labelFontSize:            step(12,   1.5,  9,    depth),
    labelInteractiveWeight:   step(700,  100,  400,  depth),
    labelLeafWeight:          400,
  };
}

// ---------------------------------------------------------------------------
// Derived span datum used internally during rendering
// ---------------------------------------------------------------------------

interface SpanDatum {
  node: TimelineNode;
  /** Left pixel position (rendering). For events, x0 === x1. */
  x0: number;
  /** Right pixel position (rendering). For events, x0 === x1. */
  x1: number;
  /** Left collision boundary (may be wider than x0 for events). */
  cx0: number;
  /** Right collision boundary (may be wider than x1 for events). */
  cx1: number;
  interactive: boolean;
  isEvent: boolean;
  direction: 1 | -1;
  row: number;
}

// ---------------------------------------------------------------------------
// Exported height helpers (used by GraphLayout)
// ---------------------------------------------------------------------------

/**
 * Compute the total pixel height a band needs.
 *
 * Labels sit ON the bracket bar (like a fieldset legend), so each row's
 * height is `BRACKET_HEIGHT`.  An extra `LABEL_OVERFLOW` is added at the
 * top/bottom edges so that label text doesn't clip outside the band.
 */
export function computeBandHeight(
  rowsAbove: number,
  rowsBelow: number,
): number {
  const above = rowsAbove > 0 ? rowsAbove * BRACKET_HEIGHT + LABEL_OVERFLOW : 0;
  const below = rowsBelow > 0 ? rowsBelow * BRACKET_HEIGHT + LABEL_OVERFLOW : 0;
  return above + AXIS_AREA_HEIGHT + below;
}

/**
 * Compute how many bracket rows are needed above and below the axis.
 */
export function computeRowCounts(
  nodes: TimelineNode[],
): { rowsAbove: number; rowsBelow: number } {
  if (nodes.length === 0) return { rowsAbove: 0, rowsBelow: 0 };
  const datums = buildSpanDatums(nodes, identityScale);
  let maxAbove = 0;
  let maxBelow = 0;
  for (const d of datums) {
    if (d.direction === 1) maxAbove = Math.max(maxAbove, d.row + 1);
    else maxBelow = Math.max(maxBelow, d.row + 1);
  }
  return { rowsAbove: Math.max(1, maxAbove), rowsBelow: maxBelow };
}

const identityScale = ((v: Date | number) => toNumeric(v)) as unknown as TimelineScale;

// ---------------------------------------------------------------------------
// BandRenderer
// ---------------------------------------------------------------------------

export class BandRenderer {
  private opts: ResolvedOptions;

  constructor(opts: ResolvedOptions) {
    this.opts = opts;
  }

  render(
    parentG: Selection<SVGGElement, GraphNode, BaseType, unknown>,
    graphNode: GraphNode,
    onClick: (node: TimelineNode) => void,
    onHover: (node: TimelineNode | null) => void,
  ): void {
    const { opts } = this;
    const band = graphNode.band;
    const depth = band.depth;
    const ds = computeDepthStyle(depth);
    const width = graphNode.width;
    const padLeft = opts.padding.left;
    const padRight = opts.padding.right;
    const innerWidth = Math.max(1, width - padLeft - padRight);

    // --- Scale ---------------------------------------------------------------
    const parentDomain = band.parentNode
      ? [band.parentNode.start, nodeEnd(band.parentNode)] as [Date, Date] | [number, number]
      : undefined;
    const scaleConfig: TimeScaleConfig = {
      ...opts.scale,
      domain: parentDomain ?? opts.scale.domain,
    };

    const { scale, axis } = createScale(scaleConfig, band.nodes, [0, innerWidth]);

    // --- Compute axis Y position ---------------------------------------------
    //
    // Layout (top to bottom):
    //   [aboveSpace]  — bracket rows above the axis line
    //   axisLineY     — the axis line; brackets originate here, markers sit here
    //   [AXIS_AREA]   — D3 axis tick marks + labels (below the line)
    //   [belowSpace]  — bracket rows below the axis area
    //
    const { rowsAbove } = computeRowCounts(band.nodes);
    const aboveSpace = rowsAbove > 0 ? rowsAbove * BRACKET_HEIGHT + LABEL_OVERFLOW : 0;
    const axisLineY = aboveSpace;

    // --- Axis ----------------------------------------------------------------
    let axisG = parentG.select<SVGGElement>('g.tl-axis');
    if (axisG.empty()) {
      axisG = parentG.append('g').attr('class', 'tl-axis');
    }
    axisG.attr('transform', `translate(${padLeft}, ${axisLineY})`);
    axisG.call(axis as any);

    axisG.selectAll('.domain').style('stroke', cssVar('axisColor'))
      .attr('stroke-width', ds.axisStrokeWidth);
    axisG.selectAll('.tick line').style('stroke', cssVar('axisColor'))
      .attr('stroke-opacity', 0.7);
    axisG.selectAll('.tick text')
      .style('fill', cssVar('axisText'))
      .style('font-size', `${ds.axisFontSize}px`);

    // --- Build span datums ---------------------------------------------------
    const datums = buildSpanDatums(band.nodes, scale);

    // --- Span groups ---------------------------------------------------------
    let spansG = parentG.select<SVGGElement>('g.tl-spans');
    if (spansG.empty()) {
      spansG = parentG.append('g').attr('class', 'tl-spans');
    }
    spansG.attr('transform', `translate(${padLeft}, 0)`);

    const spanSel = spansG
      .selectAll<SVGGElement, SpanDatum>('g.tl-span')
      .data(datums, (d) => d.node.id);

    // Exit
    spanSel
      .exit()
      .transition('span-exit')
      .duration(opts.animationDuration)
      .style('opacity', 0)
      .remove();

    // Enter
    const spanEnter = spanSel
      .enter()
      .append('g')
      .attr('class', 'tl-span')
      .style('opacity', 0);

    spanEnter.append('path').attr('class', 'tl-bracket');
    spanEnter.append('circle').attr('class', 'tl-marker-start');
    spanEnter.append('circle').attr('class', 'tl-marker-end');
    spanEnter.append('text').attr('class', 'tl-span-label');
    spanEnter.append('title');

    // Merge
    const spanMerge = spanEnter.merge(spanSel);

    spanMerge
      .transition('span-enter')
      .duration(opts.animationDuration)
      .style('opacity', 1);

    // --- Marker circles (start) ----------------------------------------------
    // Events: single filled marker at the event position.
    // Spans: paired markers at start/end (filled for interactive, hollow for leaf).
    spanMerge
      .select<SVGCircleElement>('circle.tl-marker-start')
      .attr('cx', (d) => d.x0)
      .attr('cy', axisLineY)
      .attr('r', (d) => {
        if (d.isEvent) return ds.markerLeafR;
        return d.interactive ? ds.markerInteractiveR : ds.markerLeafR;
      })
      .style('fill', (d) => {
        if (d.isEvent) return cssVar('markerFill');
        return d.interactive ? cssVar('markerFill') : 'none';
      })
      .style('stroke', (d) => {
        if (d.isEvent) return cssVar('markerFill');
        return d.interactive ? cssVar('markerFill') : cssVar('markerStroke');
      })
      .attr('stroke-width', (d) => {
        if (d.isEvent) return 0;
        return d.interactive ? 0 : 2;
      });

    // --- Marker circles (end) ------------------------------------------------
    // Hidden for events (r=0).
    spanMerge
      .select<SVGCircleElement>('circle.tl-marker-end')
      .attr('cx', (d) => d.x1)
      .attr('cy', axisLineY)
      .attr('r', (d) => {
        if (d.isEvent) return 0;
        return d.interactive ? ds.markerInteractiveR : ds.markerLeafR;
      })
      .style('fill', (d) => (d.interactive ? cssVar('markerFill') : 'none'))
      .style('stroke', (d) =>
        d.interactive ? cssVar('markerFill') : cssVar('markerStroke'),
      )
      .attr('stroke-width', (d) => (d.interactive ? 0 : 2));

    // --- Labels (horizontal, inline with bracket bar — fieldset-legend style) -
    //
    // Two-pass rendering:
    //   1. Render label text horizontally, centered on the span / event.
    //   2. Measure rendered width; truncate with ellipsis if wider than span.
    //   3. Draw bracket path with a cutout gap matching the final label width.

    spanMerge
      .select<SVGTextElement>('text.tl-span-label')
      .text((d) => d.node.label)
      .attr('x', (d) => d.isEvent ? d.x0 : (d.x0 + d.x1) / 2)
      .attr('y', (d) => barY(d, axisLineY))
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'central')
      .attr('transform', null)
      .style('fill', cssVar('labelColor'))
      .style('font-size', `${ds.labelFontSize}px`)
      .style('font-weight', (d) =>
        String(d.interactive ? ds.labelInteractiveWeight : ds.labelLeafWeight))
      .style('pointer-events', 'auto');

    // --- Measure, truncate, and draw bracket with label cutout ----------------

    spanMerge.each(function (d) {
      const g = select(this);
      const textEl = g.select<SVGTextElement>('text.tl-span-label');
      const textNode = textEl.node();

      let labelWidth = 0;

      if (textNode) {
        if (d.isEvent) {
          // Events: no bracket to constrain, just measure.
          labelWidth = textNode.getComputedTextLength();
        } else {
          const spanWidth = d.x1 - d.x0;
          if (spanWidth < MIN_LABEL_WIDTH) {
            textEl.text('');
          } else {
            const maxWidth = spanWidth - 2 * LABEL_GAP_PAD;
            clipText(textEl, maxWidth);
            labelWidth = textNode.getComputedTextLength();
          }
        }
      }

      const pathD = d.isEvent
        ? eventTickPath(d, axisLineY)
        : bracketPath(d, axisLineY, labelWidth);

      g.select<SVGPathElement>('path.tl-bracket')
        .attr('d', pathD)
        .style('fill', 'none')
        .style('stroke',
          d.interactive ? cssVar('bracketColor') : cssVar('bracketLeafColor'))
        .attr('stroke-width',
          d.interactive ? ds.bracketInteractiveWidth : ds.bracketLeafWidth)
        .attr('stroke-linecap', 'round')
        .attr('stroke-linejoin', 'round');
    });

    // Tooltip — always shows full (untruncated) label text.
    spanMerge.select('title').text((d) => d.node.label);

    // --- Interaction ---------------------------------------------------------
    // Events are not interactive (no drill-down). Spans get click/hover.
    spanMerge
      .style('cursor', (d) => (d.interactive ? 'pointer' : 'default'))
      .on('click', (_event, d) => {
        if (d.interactive) onClick(d.node);
      })
      .on('mouseenter', function (_event, d) {
        if (d.isEvent) { onHover(d.node); return; }
        const g = select(this);
        g.select('path.tl-bracket')
          .style('stroke', cssVar('bracketHoverColor'))
          .attr('stroke-width',
            (d.interactive ? ds.bracketInteractiveWidth : ds.bracketLeafWidth) + 1);
        g.selectAll<SVGCircleElement, unknown>('circle')
          .attr('r',
            (d.interactive ? ds.markerInteractiveR : ds.markerLeafR) + 1);
        onHover(d.node);
      })
      .on('mouseleave', function (_event, d) {
        if (d.isEvent) { onHover(null); return; }
        const g = select(this);
        g.select('path.tl-bracket')
          .style('stroke',
            d.interactive ? cssVar('bracketColor') : cssVar('bracketLeafColor'))
          .attr('stroke-width',
            d.interactive ? ds.bracketInteractiveWidth : ds.bracketLeafWidth);
        g.selectAll<SVGCircleElement, unknown>('circle')
          .attr('r', d.interactive ? ds.markerInteractiveR : ds.markerLeafR);
        onHover(null);
      });
  }
}

// ---------------------------------------------------------------------------
// Bracket geometry
// ---------------------------------------------------------------------------

/**
 * Y-coordinate of the bracket's horizontal bar (where the label sits).
 *
 * Above-brackets extend upward from the axis line.
 * Below-brackets extend downward starting BELOW the axis area
 * (so they don't overlap tick labels).
 */
function barY(d: SpanDatum, axisLineY: number): number {
  const offset = (d.row + 1) * BRACKET_HEIGHT;
  if (d.direction === 1) {
    return axisLineY - offset;
  }
  // Below: skip past the axis area, then offset downward.
  return axisLineY + AXIS_AREA_HEIGHT + offset;
}

/**
 * SVG path for a bracket whose horizontal bar splits around the label:
 *
 *   |─── Label Text ───|
 *   │                   │
 *   ● (axis line)       ● (axis line)
 *
 * The vertical ticks originate from the axis line for above-brackets.
 * For below-brackets, they originate from the bottom of the axis area.
 * If `labelWidth` is 0 (label hidden), draws a solid horizontal bar.
 */
function bracketPath(
  d: SpanDatum,
  axisLineY: number,
  labelWidth: number,
): string {
  const tipY = barY(d, axisLineY);

  // Vertical ticks start from the axis line (above) or bottom of axis area (below).
  const baseY = d.direction === 1 ? axisLineY : axisLineY + AXIS_AREA_HEIGHT;

  if (labelWidth <= 0 || d.x1 - d.x0 < MIN_LABEL_WIDTH) {
    // Complete bar, no gap.
    return [
      `M ${d.x0} ${baseY}`,
      `L ${d.x0} ${tipY}`,
      `L ${d.x1} ${tipY}`,
      `L ${d.x1} ${baseY}`,
    ].join(' ');
  }

  // Split the horizontal bar around the label.
  const midX = (d.x0 + d.x1) / 2;
  const halfGap = labelWidth / 2 + LABEL_GAP_PAD;
  const gapStart = Math.max(d.x0 + 1, midX - halfGap);
  const gapEnd = Math.min(d.x1 - 1, midX + halfGap);

  return [
    // Left vertical tick + left portion of bar → stop at gap
    `M ${d.x0} ${baseY} L ${d.x0} ${tipY} L ${gapStart} ${tipY}`,
    // Right portion of bar (after gap) + right vertical tick
    `M ${gapEnd} ${tipY} L ${d.x1} ${tipY} L ${d.x1} ${baseY}`,
  ].join(' ');
}

/**
 * SVG path for a discrete event: a single vertical tick from the axis
 * line to the label row.
 *
 *     Label
 *       |
 *       ● (axis line)
 */
function eventTickPath(d: SpanDatum, axisLineY: number): string {
  const tipY = barY(d, axisLineY);
  const baseY = d.direction === 1 ? axisLineY : axisLineY + AXIS_AREA_HEIGHT;
  return `M ${d.x0} ${baseY} L ${d.x0} ${tipY}`;
}

// ---------------------------------------------------------------------------
// Span placement: default above, spill below only on overlap
// ---------------------------------------------------------------------------

function buildSpanDatums(
  nodes: TimelineNode[],
  scale: TimelineScale,
): SpanDatum[] {
  if (nodes.length === 0) return [];

  const s = scale as ScaleFn;

  const sorted = [...nodes].sort((a, b) => {
    const diff = toNumeric(a.start) - toNumeric(b.start);
    return diff !== 0 ? diff : toNumeric(nodeEnd(a)) - toNumeric(nodeEnd(b));
  });

  const datums: SpanDatum[] = sorted.map((node) => {
    const ev = isEventNode(node);
    const x0 = s(node.start);
    const x1 = ev ? x0 : s(nodeEnd(node));
    return {
      node,
      x0,
      x1,
      // Collision range: events get a synthetic width so labels don't pile up.
      cx0: ev ? x0 - EVENT_HALF_WIDTH : x0,
      cx1: ev ? x0 + EVENT_HALF_WIDTH : x1,
      interactive: !ev && !!(node.children && node.children.length > 0),
      isEvent: ev,
      direction: 1 as 1 | -1,
      row: 0,
    };
  });

  // Track occupied pixel ranges per (direction, row) slot.
  const occupied = new Map<string, number[][]>();
  const key = (dir: 1 | -1, row: number) => `${dir},${row}`;

  const fits = (d: SpanDatum, dir: 1 | -1, row: number): boolean => {
    const intervals = occupied.get(key(dir, row));
    if (!intervals) return true;
    for (const [ox0, ox1] of intervals) {
      if (d.cx0 < ox1 && ox0 < d.cx1) return false;
    }
    return true;
  };

  const place = (d: SpanDatum, dir: 1 | -1, row: number): void => {
    d.direction = dir;
    d.row = row;
    const k = key(dir, row);
    let intervals = occupied.get(k);
    if (!intervals) {
      intervals = [];
      occupied.set(k, intervals);
    }
    intervals.push([d.cx0, d.cx1 + BRACKET_SEPARATION]);
  };

  for (const d of datums) {
    let placed = false;
    for (let row = 0; row < 20 && !placed; row++) {
      if (fits(d, 1, row)) { place(d, 1, row); placed = true; }
      else if (fits(d, -1, row)) { place(d, -1, row); placed = true; }
    }
    if (!placed) place(d, 1, 20);
  }

  return datums;
}

// ---------------------------------------------------------------------------
// Text clipping helper
// ---------------------------------------------------------------------------

function clipText(
  // Datum and parent types vary by call-site context; only the element matters.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  textSel: Selection<SVGTextElement, any, any, any>,
  maxWidth: number,
): void {
  const textNode = textSel.node();
  if (!textNode) return;

  let text = textSel.text();
  if (!text) return;
  if (maxWidth <= 0) { textSel.text(''); return; }
  if (textNode.getComputedTextLength() <= maxWidth) return;

  while (text.length > 0 && textNode.getComputedTextLength() > maxWidth) {
    text = text.slice(0, -1);
    textSel.text(text + '\u2026');
  }
}
