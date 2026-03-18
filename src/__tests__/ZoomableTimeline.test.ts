// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ZoomableTimeline } from '../ZoomableTimeline';
import type { TimelineNode } from '../types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function node(
  id: string,
  start: number,
  end: number,
  children?: TimelineNode[],
): TimelineNode {
  return { id, label: id, start, end, children };
}

const sampleData: TimelineNode[] = [
  node('a', 0, 50, [
    node('a1', 0, 20),
    node('a2', 25, 50),
  ]),
  node('b', 50, 100, [
    node('b1', 50, 75),
    node('b2', 75, 100),
  ]),
];

function createContainer(): HTMLElement {
  const el = document.createElement('div');
  document.body.appendChild(el);
  Object.defineProperty(el, 'clientWidth', { value: 800, configurable: true });
  Object.defineProperty(el, 'clientHeight', { value: 400, configurable: true });

  // Patch SVG elements to satisfy d3-zoom (jsdom lacks SVG baseVal).
  const origCreateElementNS = document.createElementNS.bind(document);
  document.createElementNS = function (
    ns: string | null,
    tag: string,
  ): Element {
    const elem = origCreateElementNS(ns, tag);
    if (tag === 'svg') {
      Object.defineProperty(elem, 'width', {
        value: { baseVal: { value: 800 } },
        configurable: true,
      });
      Object.defineProperty(elem, 'height', {
        value: { baseVal: { value: 400 } },
        configurable: true,
      });
      elem.getBoundingClientRect = () => ({
        x: 0, y: 0, width: 800, height: 400,
        top: 0, right: 800, bottom: 400, left: 0,
        toJSON() {},
      });
    }
    return elem;
  } as typeof document.createElementNS;

  return el;
}

// Stub APIs missing from jsdom.
beforeEach(() => {
  if (typeof globalThis.ResizeObserver === 'undefined') {
    globalThis.ResizeObserver = class {
      observe(): void {}
      unobserve(): void {}
      disconnect(): void {}
    } as unknown as typeof ResizeObserver;
  }
  if (typeof SVGElement !== 'undefined') {
    (SVGElement.prototype as any).getComputedTextLength = () => 0;
  }
});

// ---------------------------------------------------------------------------
// Construction
// ---------------------------------------------------------------------------

describe('ZoomableTimeline construction', () => {
  let container: HTMLElement;

  afterEach(() => {
    container?.remove();
  });

  it('throws if container is null', () => {
    expect(() => new ZoomableTimeline(null as any, { data: [] })).toThrow(
      'container element is required',
    );
  });

  it('throws if data is not an array', () => {
    container = createContainer();
    expect(() => new ZoomableTimeline(container, { data: null as any })).toThrow(
      'options.data must be an array',
    );
  });

  it('creates an SVG element inside the container', () => {
    container = createContainer();
    const tl = new ZoomableTimeline(container, {
      data: sampleData,
      scale: { type: 'linear' },
    });

    expect(container.querySelector('svg.tl-svg')).not.toBeNull();
    tl.destroy();
  });

  it('adds the timelines-root class', () => {
    container = createContainer();
    const tl = new ZoomableTimeline(container, {
      data: sampleData,
      scale: { type: 'linear' },
    });

    expect(container.classList.contains('timelines-root')).toBe(true);
    tl.destroy();
  });

  it('renders a single tl-band group', () => {
    container = createContainer();
    const tl = new ZoomableTimeline(container, {
      data: sampleData,
      scale: { type: 'linear' },
    });

    const bands = container.querySelectorAll('g.tl-band');
    expect(bands.length).toBe(1);
    tl.destroy();
  });
});

// ---------------------------------------------------------------------------
// Destroy
// ---------------------------------------------------------------------------

describe('ZoomableTimeline destroy', () => {
  let container: HTMLElement;

  afterEach(() => {
    container?.remove();
  });

  it('removes SVG and class on destroy', () => {
    container = createContainer();
    const tl = new ZoomableTimeline(container, {
      data: sampleData,
      scale: { type: 'linear' },
    });

    tl.destroy();
    expect(container.querySelector('svg.tl-svg')).toBeNull();
    expect(container.classList.contains('timelines-root')).toBe(false);
  });

  it('can be destroyed multiple times without error', () => {
    container = createContainer();
    const tl = new ZoomableTimeline(container, {
      data: sampleData,
      scale: { type: 'linear' },
    });

    tl.destroy();
    expect(() => tl.destroy()).not.toThrow();
  });
});
