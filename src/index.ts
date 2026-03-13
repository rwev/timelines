// Public API
export { Timeline } from './Timeline';

// Types
export type {
  TimelineNode,
  NodeStyle,
  TimeScaleConfig,
  TimelineScale,
  ScaleFn,
  ThemeTokens,
  TimelineOptions,
  LaneAssignment,
  ViewportOptions,
  Bounds,
  TimelineEventMap,
} from './types';

// Utilities that consumers may find useful
export { assignLanes, assignSingleLane } from './LaneAssigner';
export { computeDomain, findNode, toNumeric, isEvent, nodeEnd } from './utils';
