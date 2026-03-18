// Public API
export { Timeline } from './Timeline';
export { ZoomableTimeline } from './ZoomableTimeline';

// Types
export type {
  TimelineNode,
  NodeStyle,
  TimeScaleConfig,
  TimelineScale,
  ScaleFn,
  ThemeTokens,
  TimelineOptions,
  ZoomableTimelineOptions,
  LaneAssignment,
  ViewportOptions,
  Bounds,
  TimelineEventMap,
} from './types';

// Utilities that consumers may find useful
export { assignLanes, assignSingleLane } from './LaneAssigner';
export { computeDomain, findNode, toNumeric, isEvent, nodeEnd } from './utils';
