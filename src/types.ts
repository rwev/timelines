import type { ScaleTime, ScaleLinear } from 'd3-scale';

// ---------------------------------------------------------------------------
// Data model
// ---------------------------------------------------------------------------

/** A single node in the timeline tree. */
export interface TimelineNode {
  /** Unique identifier. */
  id: string;
  /** Display label. */
  label: string;
  /**
   * Node type.
   * `'span'` (default) — a time period with start and end.
   * `'event'` — a discrete point in time (no duration, not drillable).
   */
  type?: 'span' | 'event';
  /** Start of the time span / event (Date for time scales, number for linear). */
  start: Date | number;
  /** End of the time span. Omit for discrete events. */
  end?: Date | number;
  /** Optional child nodes representing finer-grained detail. Not applicable to events. */
  children?: TimelineNode[];
  /** Arbitrary user metadata attached to this node. */
  metadata?: Record<string, unknown>;
  /** Per-node visual style overrides. */
  style?: Partial<NodeStyle>;
}

/** Visual style properties for a single span. */
export interface NodeStyle {
  /** Fill colour of the span rectangle. */
  fill: string;
  /** Stroke colour of the span rectangle. */
  stroke: string;
  /** Stroke width in pixels. */
  strokeWidth: number;
  /** Text colour of the label. */
  textColor: string;
  /** Border radius of the span rectangle. */
  borderRadius: number;
  /** Opacity (0-1). */
  opacity: number;
}

// ---------------------------------------------------------------------------
// Scale configuration
// ---------------------------------------------------------------------------

/** Determines how the horizontal axis maps data values to pixels. */
export interface TimeScaleConfig {
  /**
   * `'time'`  – uses `d3.scaleTime` (start/end must be `Date`).
   * `'linear'` – uses `d3.scaleLinear` (start/end must be `number`).
   */
  type: 'time' | 'linear';
  /** Override the automatic domain (computed from data). */
  domain?: [Date, Date] | [number, number];
  /** Approximate number of ticks on the axis. */
  tickCount?: number;
  /** Custom tick format function. */
  tickFormat?: (domainValue: Date | number, index: number) => string;
}

/** Union of D3 scale types the library works with. */
export type TimelineScale =
  | ScaleTime<number, number>
  | ScaleLinear<number, number>;

/** Callable signature for mapping data values to pixel positions. */
export type ScaleFn = (value: Date | number) => number;

// ---------------------------------------------------------------------------
// Theme
// ---------------------------------------------------------------------------

export interface ThemeTokens {
  /** Axis line & tick mark colour. */
  axisColor: string;
  /** Axis tick label text colour. */
  axisText: string;
  /** Bracket colour for interactive (expandable) spans. */
  bracketColor: string;
  /** Bracket colour for leaf (non-expandable) spans. */
  bracketLeafColor: string;
  /** Bracket colour on hover. */
  bracketHoverColor: string;
  /** Fill colour of endpoint marker circles (interactive spans). */
  markerFill: string;
  /** Stroke colour of endpoint marker circles. */
  markerStroke: string;
  /** Span label text colour. */
  labelColor: string;
  /** Edge / connector line colour. */
  edgeColor: string;
  /** Edge colour on hover. */
  edgeHoverColor: string;
}

// ---------------------------------------------------------------------------
// Layout – Band descriptor (per-band data)
// ---------------------------------------------------------------------------

/** Describes the data content of one timeline band. */
export interface BandDescriptor {
  /** The node whose children this band displays, or `null` for the root band. */
  parentNode: TimelineNode | null;
  /** The nodes rendered in this band. */
  nodes: TimelineNode[];
  /** Depth in the hierarchy (0 = root). */
  depth: number;
  /** Number of swim-lanes within this band. */
  laneCount: number;
}

/** Assignment of a node to a swim-lane row within a band. */
export interface LaneAssignment {
  node: TimelineNode;
  lane: number;
}

// ---------------------------------------------------------------------------
// Graph layout – positioned nodes and edges
// ---------------------------------------------------------------------------

/** A node in the graph tree. Each represents one timeline band positioned in 2D space. */
export interface GraphNode {
  /** Stable identifier: `'root'` for the root band, otherwise the expanded span's id. */
  id: string;
  /** The band data this graph node displays. */
  band: BandDescriptor;
  /** The span in the parent band that was expanded to produce this node, or `null` for root. */
  parentSpan: TimelineNode | null;
  /** Reference to the parent graph node, or `null` for root. */
  parentGraphNode: GraphNode | null;
  /** Child graph nodes (one per expanded span in this band). */
  children: GraphNode[];
  /** Left edge x-coordinate in global SVG space. */
  x: number;
  /** Top edge y-coordinate in global SVG space. */
  y: number;
  /** Pixel width of this band. */
  width: number;
  /** Pixel height of this band (laneCount * bandHeight + axisHeight). */
  height: number;
}

/** Describes a single Bezier edge in a left/right pair connecting a parent span to a child band. */
export interface EdgeDatum {
  /** Stable key: `${childId}-l` or `${childId}-r`. */
  id: string;
  /** Endpoint on the parent span (left or right) at the bottom of the parent band. */
  sourcePoint: [number, number];
  /** Corresponding endpoint on the child band axis (left or right) at the top of the child band. */
  targetPoint: [number, number];
}

// ---------------------------------------------------------------------------
// Viewport (pan / zoom)
// ---------------------------------------------------------------------------

export interface ViewportOptions {
  /** Minimum zoom scale. Default `0.1`. */
  minZoom: number;
  /** Maximum zoom scale. Default `4`. */
  maxZoom: number;
  /** Padding in pixels when fitting content to viewport. Default `40`. */
  fitPadding: number;
}

/** Axis-aligned bounding box. */
export interface Bounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

// ---------------------------------------------------------------------------
// Options
// ---------------------------------------------------------------------------

/** Top-level configuration passed to the `Timeline` constructor. */
export interface TimelineOptions {
  /** Root data nodes. */
  data: TimelineNode[];
  /** Scale configuration. */
  scale?: Partial<TimeScaleConfig>;
  /** Height in pixels of a single swim-lane row. */
  bandHeight?: number;
  /** Pixel width of each timeline band. */
  bandWidth?: number;
  /** Horizontal gap between sibling bands at the same depth. */
  bandGap?: number;
  /** Vertical gap between connected bands in the graph. */
  verticalGap?: number;
  /** Left/right padding inside each band for axis labels. */
  padding?: { left: number; right: number };
  /** Transition duration in milliseconds. */
  animationDuration?: number;
  /** Enable swim-lane layout for overlapping spans. */
  swimLanes?: boolean;
  /** Per-depth opacity reduction for visual hierarchy (0 = no fade). Default `0.12`. */
  depthFade?: number;
  /** Collapse other expanded paths when drilling down. Default `true`. */
  exclusiveExpand?: boolean;
  /** Focus viewport on the newly expanded child band. Default `true`. */
  focusOnExpand?: boolean;
  /** Viewport (pan/zoom) configuration. */
  viewport?: Partial<ViewportOptions>;

  // Callbacks
  onDrillDown?: (node: TimelineNode) => void;
  onCollapse?: (node: TimelineNode) => void;
  onHover?: (node: TimelineNode | null) => void;
}

/** Resolved options with all defaults applied. */
export interface ResolvedOptions extends Required<
  Omit<TimelineOptions, 'onDrillDown' | 'onCollapse' | 'onHover'>
> {
  scale: TimeScaleConfig;
  viewport: ViewportOptions;
  onDrillDown?: (node: TimelineNode) => void;
  onCollapse?: (node: TimelineNode) => void;
  onHover?: (node: TimelineNode | null) => void;
}

// ---------------------------------------------------------------------------
// Events
// ---------------------------------------------------------------------------

export interface TimelineEventMap {
  'timeline:drill-down': CustomEvent<{ node: TimelineNode }>;
  'timeline:collapse': CustomEvent<{ node: TimelineNode }>;
  'timeline:hover': CustomEvent<{ node: TimelineNode | null }>;
}
