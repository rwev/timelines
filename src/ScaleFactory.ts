import { scaleTime, scaleLinear } from 'd3-scale';
import type { ScaleTime, ScaleLinear } from 'd3-scale';
import { axisBottom } from 'd3-axis';
import type { Axis } from 'd3-axis';
import type { TimeScaleConfig, TimelineNode, TimelineScale } from './types';
import { computeDomain, nodeEnd } from './utils';

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
  const domain = config.domain ?? computeDomain(nodes);

  if (config.type === 'time') {
    const d = domain as [Date, Date];
    const scale = scaleTime<number>().domain(d).range(range).nice();

    const ax = axisBottom(scale as ScaleTime<number, number, never>);
    if (config.tickCount) ax.ticks(config.tickCount);
    if (config.tickFormat) ax.tickFormat(config.tickFormat as (d: Date | { valueOf(): number }, i: number) => string);

    return { scale, axis: ax as unknown as Axis<Date | number> };
  }

  // Linear
  const d = domain as [number, number];
  const scale = scaleLinear<number>().domain(d).range(range).nice();

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
  const s = scale as (v: Date | number) => number;
  return [s(node.start as Date & number), s(nodeEnd(node) as Date & number)];
}
