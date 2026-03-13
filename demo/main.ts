import { Timeline } from '../src/index';
import type { TimelineNode } from '../src/index';

// ---------------------------------------------------------------------------
// Old Testament Timeline (~2350 BC - ~430 BC)
//
// Dates are negative numbers representing BCE years: -2091 = 2091 BC.
// A linear scale is used so that earlier dates (more negative) are on the
// left and later dates on the right.
//
// Chronology follows the traditional consensus:
//   - Patriarchal dates: Ussher-derived conservative estimates
//   - Monarchic dates: Thiele's chronology (the most widely cited)
//   - Prophetic dates: correlated with the kings they served under
//   - Exile/Return dates: well-attested historically
//
// The hierarchy is 3-4 levels deep in places, with ~130 total nodes.
// ---------------------------------------------------------------------------

const data: TimelineNode[] = [
  // =========================================================================
  // Top-level landmark event — before the Patriarchal narrative
  // =========================================================================
  {
    id: 'flood',
    type: 'event',
    label: 'The Flood',
    start: -2348,
  },

  // =========================================================================
  // 1. PATRIARCHS (2091 - 1876 BC)
  //    Abraham's call through Jacob's descent into Egypt.
  //    Overlapping lifespans will exercise swim-lane layout.
  // =========================================================================
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
          { id: 'sodom-destroyed', type: 'event', label: 'Destruction of Sodom', start: -2067 },
          { id: 'binding-of-isaac', type: 'event', label: 'Binding of Isaac', start: -2050 },
        ],
      },
      {
        id: 'isaac',
        label: 'Isaac',
        start: -2066,
        end: -1886,
        children: [
          { id: 'isaac-rebekah', type: 'event', label: 'Isaac Marries Rebekah', start: -2026 },
          { id: 'esau-jacob-born', type: 'event', label: 'Esau & Jacob Born', start: -2006 },
          { id: 'blessing-of-jacob', type: 'event', label: 'Isaac Blesses Jacob', start: -1929 },
        ],
      },
      {
        id: 'jacob',
        label: 'Jacob / Israel',
        start: -2006,
        end: -1876,
        children: [
          { id: 'jacobs-ladder', type: 'event', label: "Jacob's Ladder at Bethel", start: -1929 },
          { id: 'wrestling-peniel', type: 'event', label: 'Wrestling at Peniel', start: -1906 },
          { id: 'joseph-sold', type: 'event', label: 'Joseph Sold into Slavery', start: -1898 },
          { id: 'jacob-enters-egypt', type: 'event', label: 'Jacob Enters Egypt', start: -1876 },
        ],
      },
    ],
  },

  // =========================================================================
  // 2. EGYPT & EXODUS (1876 - 1406 BC)
  //    430-year sojourn, the Exodus, and wilderness wandering.
  // =========================================================================
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
        children: [
          { id: 'brothers-reunited', type: 'event', label: 'Brothers Reunited', start: -1876 },
          { id: 'death-of-joseph', type: 'event', label: 'Death of Joseph', start: -1805 },
        ],
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
          { id: 'golden-calf', type: 'event', label: 'Golden Calf', start: -1445 },
          {
            id: 'tabernacle',
            label: 'Tabernacle Constructed',
            start: -1445,
            end: -1444,
          },
          { id: 'twelve-spies', type: 'event', label: 'Twelve Spies Sent to Canaan', start: -1444 },
          { id: 'korahs-rebellion', type: 'event', label: "Korah's Rebellion", start: -1425 },
          { id: 'death-of-moses', type: 'event', label: 'Death of Moses', start: -1406 },
        ],
      },
    ],
  },

  // =========================================================================
  // 3. CONQUEST & JUDGES (1406 - 1050 BC)
  //    Settlement of Canaan and the cyclical era of the Judges.
  // =========================================================================
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
          { id: 'crossing-jordan', type: 'event', label: 'Crossing the Jordan', start: -1406 },
          { id: 'fall-of-jericho', type: 'event', label: 'Fall of Jericho', start: -1406 },
          { id: 'sun-stands-still', type: 'event', label: 'Sun Stands Still at Gibeon', start: -1405 },
          { id: 'land-divided', type: 'event', label: 'Land Divided Among Tribes', start: -1399 },
          { id: 'death-of-joshua', type: 'event', label: 'Death of Joshua', start: -1375 },
        ],
      },
      {
        id: 'judges',
        label: 'Period of the Judges',
        start: -1375,
        end: -1050,
        children: [
          {
            id: 'othniel',
            label: 'Othniel',
            start: -1374,
            end: -1334,
          },
          {
            id: 'ehud',
            label: 'Ehud',
            start: -1316,
            end: -1236,
          },
          {
            id: 'deborah-barak',
            label: 'Deborah & Barak',
            start: -1209,
            end: -1169,
            children: [
              { id: 'defeat-of-sisera', type: 'event', label: 'Defeat of Sisera', start: -1209 },
              { id: 'song-of-deborah', type: 'event', label: 'Song of Deborah', start: -1209 },
            ],
          },
          {
            id: 'gideon',
            label: 'Gideon',
            start: -1162,
            end: -1122,
            children: [
              { id: 'gideons-fleece', type: 'event', label: "Gideon's Fleece", start: -1162 },
              { id: '300-defeat-midian', type: 'event', label: '300 Defeat Midian', start: -1162 },
            ],
          },
          { id: 'samuel-born', type: 'event', label: 'Samuel Born', start: -1105 },
          { id: 'ruth-and-boaz', type: 'event', label: 'Ruth & Boaz', start: -1100 },
          {
            id: 'samson',
            label: 'Samson',
            start: -1075,
            end: -1055,
            children: [
              { id: 'samson-delilah', type: 'event', label: 'Samson & Delilah', start: -1060 },
              { id: 'samson-temple', type: 'event', label: 'Samson Destroys Dagon Temple', start: -1055 },
            ],
          },
        ],
      },
    ],
  },

  // =========================================================================
  // 4. UNITED MONARCHY (1050 - 931 BC)
  //    Saul, David, and Solomon — Israel's golden age.
  // =========================================================================
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
          { id: 'samuel-anoints-saul', type: 'event', label: 'Samuel Anoints Saul', start: -1050 },
          { id: 'david-anointed', type: 'event', label: 'David Anointed by Samuel', start: -1025 },
          { id: 'david-goliath', type: 'event', label: 'David & Goliath', start: -1024 },
          {
            id: 'david-exile',
            label: "David's Exile from Saul",
            start: -1020,
            end: -1010,
          },
          { id: 'witch-of-endor', type: 'event', label: 'Witch of Endor', start: -1011 },
          { id: 'saul-death', type: 'event', label: 'Death of Saul at Mt. Gilboa', start: -1010 },
        ],
      },
      {
        id: 'david',
        label: 'Reign of David',
        start: -1010,
        end: -970,
        children: [
          {
            id: 'david-hebron',
            label: 'David at Hebron',
            start: -1010,
            end: -1003,
          },
          {
            id: 'david-jerusalem',
            label: 'David at Jerusalem',
            start: -1003,
            end: -970,
          },
          { id: 'capture-jerusalem', type: 'event', label: 'David Captures Jerusalem', start: -1003 },
          { id: 'ark-to-jerusalem', type: 'event', label: 'Ark Brought to Jerusalem', start: -1000 },
          { id: 'david-bathsheba', type: 'event', label: 'David & Bathsheba', start: -995 },
          { id: 'nathans-parable', type: 'event', label: "Nathan's Parable", start: -995 },
          { id: 'absaloms-rebellion', type: 'event', label: "Absalom's Rebellion", start: -979 },
        ],
      },
      {
        id: 'solomon',
        label: 'Reign of Solomon',
        start: -970,
        end: -931,
        children: [
          { id: 'solomons-judgment', type: 'event', label: "Solomon's Judgment", start: -968 },
          {
            id: 'temple-construction',
            label: 'Temple Construction',
            start: -966,
            end: -959,
          },
          { id: 'temple-dedicated', type: 'event', label: 'Temple Dedicated', start: -959 },
          { id: 'queen-of-sheba', type: 'event', label: 'Queen of Sheba Visits', start: -940 },
          { id: 'solomon-idols', type: 'event', label: 'Solomon Turns to Idolatry', start: -935 },
        ],
      },
    ],
  },

  // =========================================================================
  // 5. DIVIDED MONARCHY (931 - 586 BC)
  //    Three parallel sub-timelines: Israel (North), Judah (South),
  //    and the Prophetic Voices — a deliberate 3-lane overlap to
  //    exercise swim-lane layout with multiple drill-down perspectives.
  // =========================================================================
  {
    id: 'divided-monarchy',
    label: 'Divided Monarchy',
    start: -931,
    end: -586,
    children: [
      // --- Kingdom of Israel (North) ---
      {
        id: 'kingdom-israel',
        label: 'Kingdom of Israel (North)',
        start: -931,
        end: -722,
        children: [
          {
            id: 'jeroboam-i',
            label: 'Jeroboam I',
            start: -931,
            end: -910,
            children: [
              { id: 'golden-calves', type: 'event', label: 'Golden Calves at Dan & Bethel', start: -931 },
            ],
          },
          {
            id: 'omri-dynasty',
            label: 'Omri Dynasty',
            start: -885,
            end: -841,
            children: [
              {
                id: 'ahab-jezebel',
                label: 'Ahab & Jezebel',
                start: -874,
                end: -853,
                children: [
                  { id: 'elijah-carmel', type: 'event', label: 'Elijah on Mt. Carmel', start: -860 },
                  { id: 'naboths-vineyard', type: 'event', label: "Naboth's Vineyard", start: -855 },
                  { id: 'battle-ramoth-gilead', type: 'event', label: 'Battle of Ramoth-Gilead', start: -853 },
                  { id: 'ahab-death', type: 'event', label: 'Ahab Dies in Battle', start: -853 },
                ],
              },
              { id: 'jehus-revolt', type: 'event', label: "Jehu's Revolt", start: -841 },
            ],
          },
          {
            id: 'jehu-dynasty',
            label: 'Jehu Dynasty',
            start: -841,
            end: -753,
            children: [
              { id: 'jehu', label: 'Jehu', start: -841, end: -814 },
              { id: 'jeroboam-ii', label: 'Jeroboam II', start: -782, end: -753 },
            ],
          },
          {
            id: 'israel-last-kings',
            label: 'Final Kings',
            start: -752,
            end: -722,
          },
          { id: 'fall-of-samaria', type: 'event', label: 'Fall of Samaria to Assyria', start: -722 },
        ],
      },

      // --- Kingdom of Judah (South) ---
      {
        id: 'kingdom-judah',
        label: 'Kingdom of Judah (South)',
        start: -931,
        end: -586,
        children: [
          {
            id: 'judah-early-kings',
            label: 'Rehoboam to Jehoshaphat',
            start: -931,
            end: -848,
            children: [
              { id: 'kingdom-divides', type: 'event', label: 'Kingdom Divides', start: -931 },
              { id: 'shishak-invasion', type: 'event', label: "Pharaoh Shishak's Invasion", start: -925 },
              { id: 'jehoshaphat-reform', type: 'event', label: "Jehoshaphat's Judicial Reform", start: -868 },
            ],
          },
          {
            id: 'hezekiah',
            label: 'Hezekiah',
            start: -716,
            end: -687,
            children: [
              { id: 'hezekiahs-tunnel', type: 'event', label: "Hezekiah's Tunnel Built", start: -702 },
              { id: 'sennacherib-siege', type: 'event', label: "Sennacherib's Siege of Jerusalem", start: -701 },
              { id: 'hezekiah-illness', type: 'event', label: "Hezekiah's Illness & Recovery", start: -700 },
            ],
          },
          {
            id: 'josiah',
            label: "Josiah's Reign",
            start: -640,
            end: -609,
            children: [
              { id: 'book-of-law', type: 'event', label: 'Book of the Law Found', start: -622 },
              {
                id: 'josiahs-reforms',
                label: "Josiah's Reforms",
                start: -622,
                end: -609,
              },
              { id: 'battle-of-megiddo', type: 'event', label: 'Battle of Megiddo / Josiah Dies', start: -609 },
            ],
          },
          {
            id: 'judah-last-kings',
            label: 'Last Kings of Judah',
            start: -609,
            end: -586,
            children: [
              { id: 'jehoiakim', label: 'Jehoiakim', start: -609, end: -598 },
              { id: 'jehoiachin', label: 'Jehoiachin', start: -598, end: -597 },
              { id: 'zedekiah', label: 'Zedekiah', start: -597, end: -586 },
              { id: 'deportation-597', type: 'event', label: 'Deportation to Babylon', start: -597 },
              { id: 'fall-of-jerusalem', type: 'event', label: 'Fall of Jerusalem', start: -586 },
            ],
          },
        ],
      },

      // --- Prophetic Voices (overlaps both kingdoms) ---
      {
        id: 'prophetic-voices',
        label: 'Prophetic Voices',
        start: -870,
        end: -586,
        children: [
          {
            id: 'elijah-elisha',
            label: 'Elijah & Elisha',
            start: -870,
            end: -800,
            children: [
              { id: 'elijah-horeb', type: 'event', label: 'Elijah at Mount Horeb', start: -858 },
              { id: 'elijah-taken-up', type: 'event', label: "Elijah's Chariot of Fire", start: -850 },
              { id: 'elisha-naaman', type: 'event', label: 'Elisha Heals Naaman', start: -845 },
              { id: 'elisha-shunammite', type: 'event', label: "Elisha & the Shunammite's Son", start: -840 },
            ],
          },
          { id: 'jonah-nineveh', type: 'event', label: 'Jonah Sent to Nineveh', start: -760 },
          { id: 'amos', label: 'Amos', start: -760, end: -750 },
          { id: 'hosea', label: 'Hosea', start: -755, end: -725 },
          {
            id: 'isaiah',
            label: 'Isaiah',
            start: -740,
            end: -700,
            children: [
              { id: 'isaiah-vision', type: 'event', label: "Isaiah's Temple Vision", start: -740 },
              { id: 'isaiah-immanuel', type: 'event', label: 'Immanuel Prophecy', start: -735 },
            ],
          },
          { id: 'micah', label: 'Micah', start: -735, end: -700 },
          {
            id: 'jeremiah',
            label: 'Jeremiah',
            start: -626,
            end: -586,
            children: [
              { id: 'jeremiahs-call', type: 'event', label: "Jeremiah's Call", start: -626 },
              { id: 'temple-sermon', type: 'event', label: "Jeremiah's Temple Sermon", start: -609 },
              { id: 'scroll-burned', type: 'event', label: 'King Burns Scroll', start: -605 },
            ],
          },
        ],
      },

      // Standalone event at the Divided Monarchy level
      { id: 'shishak-top', type: 'event', label: "Shishak Invades", start: -925 },
    ],
  },

  // =========================================================================
  // 6. EXILE & RETURN (586 - 430 BC)
  //    Babylonian captivity, Daniel & Ezekiel, Persian restoration.
  // =========================================================================
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
          {
            id: 'daniel-in-babylon',
            label: 'Daniel in Babylon',
            start: -586,
            end: -538,
            children: [
              { id: 'fiery-furnace', type: 'event', label: 'Fiery Furnace', start: -585 },
              { id: 'nebuchadnezzar-dream', type: 'event', label: "Nebuchadnezzar's Dream", start: -582 },
              { id: 'handwriting-wall', type: 'event', label: 'Handwriting on the Wall', start: -539 },
              { id: 'lions-den', type: 'event', label: "Daniel in the Lions' Den", start: -538 },
            ],
          },
          {
            id: 'ezekiel',
            label: "Ezekiel's Ministry",
            start: -586,
            end: -571,
            children: [
              { id: 'ezekiel-visions', type: 'event', label: 'Visions by the River Chebar', start: -586 },
              { id: 'valley-dry-bones', type: 'event', label: 'Valley of Dry Bones', start: -580 },
              { id: 'new-temple-vision', type: 'event', label: 'Vision of the New Temple', start: -573 },
            ],
          },
          { id: 'edict-of-cyrus', type: 'event', label: 'Edict of Cyrus', start: -538 },
        ],
      },
      {
        id: 'return-restoration',
        label: 'Return & Restoration',
        start: -538,
        end: -430,
        children: [
          {
            id: 'zerubbabel-return',
            label: 'First Return under Zerubbabel',
            start: -538,
            end: -516,
            children: [
              { id: 'altar-rebuilt', type: 'event', label: 'Altar Rebuilt', start: -537 },
              { id: 'temple-foundation', type: 'event', label: 'Temple Foundation Laid', start: -536 },
              { id: 'second-temple', type: 'event', label: 'Second Temple Completed', start: -516 },
            ],
          },
          { id: 'esther', type: 'event', label: 'Esther Saves the Jews', start: -473 },
          {
            id: 'ezra-return',
            label: "Ezra's Return",
            start: -458,
            end: -445,
            children: [
              { id: 'ezra-reads-law', type: 'event', label: 'Ezra Reads the Law', start: -458 },
              { id: 'ezra-reforms', type: 'event', label: "Ezra's Reforms", start: -457 },
            ],
          },
          {
            id: 'nehemiah',
            label: 'Nehemiah Rebuilds Walls',
            start: -445,
            end: -430,
            children: [
              { id: 'walls-completed', type: 'event', label: 'Walls Completed in 52 Days', start: -445 },
              { id: 'public-reading', type: 'event', label: 'Public Reading of the Law', start: -444 },
              { id: 'covenant-renewal', type: 'event', label: 'Covenant Renewal', start: -444 },
            ],
          },
        ],
      },
    ],
  },

  // Final top-level landmark — the last OT prophetic voice
  {
    id: 'malachi',
    type: 'event',
    label: "Malachi's Prophecy",
    start: -430,
  },
];

// ---------------------------------------------------------------------------
// Initialize timeline
// ---------------------------------------------------------------------------

const container = document.getElementById('timeline-container')!;

const tl = new Timeline(container, {
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
  bandWidth: 900,
  bandGap: 24,
  verticalGap: 50,
  padding: { left: 30, right: 30 },
  animationDuration: 300,
  depthFade: 0,
  exclusiveExpand: true,
  focusOnExpand: true,
  viewport: {
    minZoom: 0.1,
    maxZoom: 3,
    fitPadding: 50,
  },
  onDrillDown: (node) => {
    console.log('Drilled down into:', node.label);
  },
  onCollapse: (node) => {
    console.log('Collapsed:', node.label);
  },
});

// ---------------------------------------------------------------------------
// Wire up controls
// ---------------------------------------------------------------------------

document.getElementById('btn-collapse')!.addEventListener('click', () => {
  tl.collapseAll();
  tl.fitToContent();
});

document.getElementById('btn-fit')!.addEventListener('click', () => {
  tl.fitToContent();
});
