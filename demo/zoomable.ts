import { ZoomableTimeline } from '../src/index';
import type { TimelineNode } from '../src/index';

// ---------------------------------------------------------------------------
// Old Testament Timeline (~2350 BC - ~430 BC)
//
// Same hierarchical dataset as the drill-down demo. The semantic-zoom
// variant renders all items on a single axis — zoom in to reveal
// progressively deeper levels of detail.
// ---------------------------------------------------------------------------

const data: TimelineNode[] = [
  {
    id: 'flood',
    type: 'event',
    label: 'The Flood',
    start: -2348,
  },
  {
    id: 'patriarchs',
    label: 'Patriarchs',
    start: -2091,
    end: -1876,
    children: [
      {
        id: 'abraham',
        label: 'Abraham',
        start: -2091,
        end: -1991,
        children: [
          { id: 'call-of-abraham', type: 'event', label: 'Call of Abraham', start: -2091 },
          { id: 'covenant-circumcision', type: 'event', label: 'Covenant of Circumcision', start: -2067 },
          { id: 'binding-of-isaac', type: 'event', label: 'Binding of Isaac', start: -2050 },
        ],
      },
      {
        id: 'isaac',
        label: 'Isaac',
        start: -2066,
        end: -1886,
        children: [
          { id: 'esau-jacob-born', type: 'event', label: 'Esau & Jacob Born', start: -2006 },
        ],
      },
      {
        id: 'jacob',
        label: 'Jacob / Israel',
        start: -2006,
        end: -1876,
        children: [
          { id: 'joseph-sold', type: 'event', label: 'Joseph Sold into Slavery', start: -1898 },
          { id: 'jacob-enters-egypt', type: 'event', label: 'Jacob Enters Egypt', start: -1876 },
        ],
      },
    ],
  },
  {
    id: 'egypt-exodus',
    label: 'Egypt & Exodus',
    start: -1876,
    end: -1406,
    children: [
      {
        id: 'joseph-in-egypt',
        label: 'Joseph in Egypt',
        start: -1876,
        end: -1805,
      },
      {
        id: 'slavery',
        label: 'Israelite Slavery',
        start: -1580,
        end: -1446,
        children: [
          { id: 'moses-birth', type: 'event', label: 'Birth of Moses', start: -1526 },
          { id: 'burning-bush', type: 'event', label: 'Burning Bush', start: -1447 },
        ],
      },
      { id: 'passover-exodus', type: 'event', label: 'Passover & Exodus', start: -1446 },
      {
        id: 'wilderness',
        label: 'Wilderness Wandering',
        start: -1446,
        end: -1406,
        children: [
          { id: 'red-sea', type: 'event', label: 'Crossing the Red Sea', start: -1446 },
          { id: 'sinai-commandments', type: 'event', label: 'Ten Commandments at Sinai', start: -1445 },
          { id: 'death-of-moses', type: 'event', label: 'Death of Moses', start: -1406 },
        ],
      },
    ],
  },
  {
    id: 'conquest-judges',
    label: 'Conquest & Judges',
    start: -1406,
    end: -1050,
    children: [
      {
        id: 'conquest',
        label: 'Conquest of Canaan',
        start: -1406,
        end: -1375,
        children: [
          { id: 'fall-of-jericho', type: 'event', label: 'Fall of Jericho', start: -1406 },
          { id: 'death-of-joshua', type: 'event', label: 'Death of Joshua', start: -1375 },
        ],
      },
      {
        id: 'judges',
        label: 'Period of the Judges',
        start: -1375,
        end: -1050,
        children: [
          { id: 'deborah-barak', label: 'Deborah & Barak', start: -1209, end: -1169 },
          { id: 'gideon', label: 'Gideon', start: -1162, end: -1122 },
          { id: 'samson', label: 'Samson', start: -1075, end: -1055 },
        ],
      },
    ],
  },
  {
    id: 'united-monarchy',
    label: 'United Monarchy',
    start: -1050,
    end: -931,
    children: [
      {
        id: 'saul',
        label: 'Reign of Saul',
        start: -1050,
        end: -1010,
        children: [
          { id: 'david-goliath', type: 'event', label: 'David & Goliath', start: -1024 },
        ],
      },
      {
        id: 'david',
        label: 'Reign of David',
        start: -1010,
        end: -970,
        children: [
          { id: 'capture-jerusalem', type: 'event', label: 'David Captures Jerusalem', start: -1003 },
          { id: 'absaloms-rebellion', type: 'event', label: "Absalom's Rebellion", start: -979 },
        ],
      },
      {
        id: 'solomon',
        label: 'Reign of Solomon',
        start: -970,
        end: -931,
        children: [
          { id: 'temple-construction', label: 'Temple Construction', start: -966, end: -959 },
          { id: 'queen-of-sheba', type: 'event', label: 'Queen of Sheba Visits', start: -940 },
        ],
      },
    ],
  },
  {
    id: 'divided-monarchy',
    label: 'Divided Monarchy',
    start: -931,
    end: -586,
    children: [
      {
        id: 'kingdom-israel',
        label: 'Kingdom of Israel (North)',
        start: -931,
        end: -722,
        children: [
          { id: 'jeroboam-i', label: 'Jeroboam I', start: -931, end: -910 },
          {
            id: 'omri-dynasty',
            label: 'Omri Dynasty',
            start: -885,
            end: -841,
          },
          { id: 'fall-of-samaria', type: 'event', label: 'Fall of Samaria', start: -722 },
        ],
      },
      {
        id: 'kingdom-judah',
        label: 'Kingdom of Judah (South)',
        start: -931,
        end: -586,
        children: [
          { id: 'hezekiah', label: 'Hezekiah', start: -716, end: -687 },
          { id: 'josiah', label: "Josiah's Reign", start: -640, end: -609 },
          { id: 'fall-of-jerusalem', type: 'event', label: 'Fall of Jerusalem', start: -586 },
        ],
      },
      {
        id: 'prophetic-voices',
        label: 'Prophetic Voices',
        start: -870,
        end: -586,
        children: [
          { id: 'isaiah', label: 'Isaiah', start: -740, end: -700 },
          { id: 'jeremiah', label: 'Jeremiah', start: -626, end: -586 },
        ],
      },
    ],
  },
  {
    id: 'exile-return',
    label: 'Exile & Return',
    start: -586,
    end: -430,
    children: [
      {
        id: 'babylonian-exile',
        label: 'Babylonian Exile',
        start: -586,
        end: -538,
        children: [
          { id: 'daniel-in-babylon', label: 'Daniel in Babylon', start: -586, end: -538 },
          { id: 'edict-of-cyrus', type: 'event', label: 'Edict of Cyrus', start: -538 },
        ],
      },
      {
        id: 'return-restoration',
        label: 'Return & Restoration',
        start: -538,
        end: -430,
        children: [
          { id: 'second-temple', type: 'event', label: 'Second Temple Completed', start: -516 },
          { id: 'nehemiah', label: 'Nehemiah Rebuilds Walls', start: -445, end: -430 },
        ],
      },
    ],
  },
  {
    id: 'malachi',
    type: 'event',
    label: "Malachi's Prophecy",
    start: -430,
  },
];

// ---------------------------------------------------------------------------
// Initialize
// ---------------------------------------------------------------------------

const container = document.getElementById('timeline-container')!;

const tl = new ZoomableTimeline(container, {
  data,
  scale: {
    type: 'linear',
    tickCount: 12,
    tickFormat: (v) => {
      const year = Math.abs(v as number);
      if (year === 0) return '0';
      return `${year} BC`;
    },
  },
  padding: { left: 30, right: 30 },
  animationDuration: 200,
  expandThreshold: 60,
  collapseThreshold: 40,
  maxZoom: 80,
});

// ---------------------------------------------------------------------------
// Controls
// ---------------------------------------------------------------------------

document.getElementById('btn-reset')!.addEventListener('click', () => {
  tl.resetZoom();
});
