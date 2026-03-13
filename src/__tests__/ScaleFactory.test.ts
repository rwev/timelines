import { describe, it, expect } from 'vitest';
import { createScale, nodeToPixelRange } from '../ScaleFactory';
import type { TimelineNode, TimeScaleConfig } from '../types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function node(id: string, start: number, end: number): TimelineNode {
  return { id, label: id, start, end };
}

function dateNode(id: string, start: string, end: string): TimelineNode {
  return { id, label: id, start: new Date(start), end: new Date(end) };
}

// ---------------------------------------------------------------------------
// createScale — linear
// ---------------------------------------------------------------------------

describe('createScale linear', () => {
  const config: TimeScaleConfig = { type: 'linear', tickCount: 5 };

  it('produces a scale that maps domain to range', () => {
    const nodes = [node('a', 0, 100)];
    const { scale } = createScale(config, nodes, [0, 800]);
    const s = scale as (v: number) => number;
    // After .nice(), domain may be widened but 0 and 100 should stay in range.
    expect(s(0)).toBeGreaterThanOrEqual(0);
    expect(s(100)).toBeLessThanOrEqual(800);
    expect(s(0)).toBeLessThan(s(100));
  });

  it('returns an axis generator', () => {
    const nodes = [node('a', 0, 100)];
    const { axis } = createScale(config, nodes, [0, 800]);
    expect(axis).toBeDefined();
    expect(typeof axis.scale).toBe('function');
  });

  it('respects explicit domain override', () => {
    const configWithDomain: TimeScaleConfig = {
      type: 'linear',
      domain: [10, 90],
    };
    const { scale } = createScale(configWithDomain, [], [0, 400]);
    const s = scale as (v: number) => number;
    // 10 should map near the left edge, 90 near the right.
    expect(s(10)).toBeLessThan(s(90));
  });

  it('handles single-value domain without NaN', () => {
    const nodes = [node('a', 5, 5)];
    const { scale } = createScale(config, nodes, [0, 800]);
    const s = scale as (v: number) => number;
    // Degenerate domain is widened, so the result should be finite.
    expect(Number.isFinite(s(5))).toBe(true);
  });

  it('handles empty node list (fallback domain)', () => {
    const { scale } = createScale(config, [], [0, 800]);
    const s = scale as (v: number) => number;
    expect(Number.isFinite(s(0))).toBe(true);
    expect(Number.isFinite(s(1))).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// createScale — time
// ---------------------------------------------------------------------------

describe('createScale time', () => {
  const config: TimeScaleConfig = { type: 'time', tickCount: 5 };

  it('produces a time scale for Date nodes', () => {
    const nodes = [
      dateNode('a', '2020-01-01', '2020-12-31'),
      dateNode('b', '2020-06-01', '2021-06-01'),
    ];
    const { scale } = createScale(config, nodes, [0, 800]);
    const s = scale as (v: Date) => number;
    expect(s(new Date('2020-01-01'))).toBeLessThan(s(new Date('2021-06-01')));
  });

  it('handles single-value time domain without NaN', () => {
    const d = new Date('2020-06-15');
    const nodes: TimelineNode[] = [{ id: 'a', label: 'a', start: d, end: d }];
    const { scale } = createScale(config, nodes, [0, 800]);
    const s = scale as (v: Date) => number;
    expect(Number.isFinite(s(d))).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// nodeToPixelRange
// ---------------------------------------------------------------------------

describe('nodeToPixelRange', () => {
  it('maps start and end to pixel positions', () => {
    const config: TimeScaleConfig = { type: 'linear', domain: [0, 100] };
    const { scale } = createScale(config, [], [0, 400]);
    const n = node('a', 25, 75);
    const [x0, x1] = nodeToPixelRange(n, scale);
    expect(x0).toBeLessThan(x1);
    expect(x0).toBeGreaterThanOrEqual(0);
    expect(x1).toBeLessThanOrEqual(400);
  });

  it('returns equal values for zero-duration events', () => {
    const config: TimeScaleConfig = { type: 'linear', domain: [0, 100] };
    const { scale } = createScale(config, [], [0, 400]);
    const evt: TimelineNode = { id: 'e', label: 'e', type: 'event', start: 50 };
    const [x0, x1] = nodeToPixelRange(evt, scale);
    expect(x0).toBe(x1);
  });
});
