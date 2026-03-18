import { scaleTime, scaleLinear } from 'd3-scale';
import type { ScaleTime, ScaleLinear } from 'd3-scale';
import { axisBottom } from 'd3-axis';
import type { Axis } from 'd3-axis';
import type { ScaleFn, TimeScaleConfig, TimelineNode, TimelineScale } from './types';
import { computeDomain, nodeEnd, toNumeric } from './utils';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * If both ends of a domain are equal, widen by a small amount so D3
 * scales produce finite values instead of NaN.
 */
function widenIfDegenerate(
  domain: [Date | number, Date | number],
): [Date | number, Date | number] {
  const lo = toNumeric(domain[0]);
  const hi = toNumeric(domain[1]);
  if (lo !== hi) return domain;

  // Dates: widen by 1 day; numbers: widen by 1.
  if (domain[0] instanceof Date) {
    return [new Date(lo - 86_400_000), new Date(hi + 86_400_000)];
  }
  return [lo - 1, hi + 1];
}

// ---------------------------------------------------------------------------
// Scale creation
// ---------------------------------------------------------------------------

export interface ScaleResult {
  scale: TimelineScale;
  axis: Axis<Date | number>;
}

/**
 * Create a D3 scale and axis generator for a set of nodes.
 *
 * @param config  Scale configuration from the user.
 * @param nodes   The nodes being rendered in this band (used to auto-compute domain).
 * @param range   The pixel range `[left, right]` for the output.
 */
export function createScale(
  config: TimeScaleConfig,
  nodes: TimelineNode[],
  range: [number, number],
): ScaleResult {
  const rawDomain = config.domain ?? computeDomain(nodes);

  // Widen degenerate domains where min === max to avoid NaN from D3 scales.
  const domain = widenIfDegenerate(rawDomain);

  if (config.type === 'time') {
    const d = domain as [Date, Date];
    const scale = scaleTime<number>().domain(d).range(range);
    if (config.nice !== false) scale.nice();

    const ax = axisBottom(scale as ScaleTime<number, number, never>);
    if (config.tickCount) ax.ticks(config.tickCount);
    if (config.tickFormat) ax.tickFormat(config.tickFormat as (d: Date | { valueOf(): number }, i: number) => string);

    return { scale, axis: ax as unknown as Axis<Date | number> };
  }

  // Linear
  const d = domain as [number, number];
  const scale = scaleLinear<number>().domain(d).range(range);
  if (config.nice !== false) scale.nice();

  const ax = axisBottom(scale as ScaleLinear<number, number, never>);
  if (config.tickCount) ax.ticks(config.tickCount);
  if (config.tickFormat) ax.tickFormat(config.tickFormat as (d: number | { valueOf(): number }, i: number) => string);

  return { scale, axis: ax as unknown as Axis<Date | number> };
}

/**
 * Map a node's start/end to pixel x-coordinates using the given scale.
 */
export function nodeToPixelRange(
  node: TimelineNode,
  scale: TimelineScale,
): [number, number] {
  const s = scale as ScaleFn;
  return [s(node.start), s(nodeEnd(node))];
}
