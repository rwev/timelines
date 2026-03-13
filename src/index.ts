// Public API
export { Timeline } from './Timeline';

// Types
export type {
  TimelineNode,
  NodeStyle,
  TimeScaleConfig,
  TimelineScale,
  ThemeTokens,
  TimelineOptions,
  BandDescriptor,
  LaneAssignment,
  GraphNode,
  EdgeDatum,
  ViewportOptions,
  Bounds,
  TimelineEventMap,
} from './types';

// Utilities that consumers may find useful
export { assignLanes, assignSingleLane } from './LaneAssigner';
export { computeDomain, findNode, toNumeric, flattenGraphTree, isEvent, nodeEnd } from './utils';
