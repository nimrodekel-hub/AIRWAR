// =============================================================
// משחק מלחמה - הגנה אווירית | רפובליקת טליאריה
// סקלה: 1 פיקסל = 1 ק"מ
// =============================================================

const CATALOG = {
  // ---- Batteries ----
  // Missile speed order (fastest to slowest, per spec): Iron Dome > Barak > Gecko > David's Sling > Patriot
  ironDome: {
    kind: 'battery', name: 'Iron Dome', short: 'IRN',
    minRange: 4, maxRange: 70, minAlt: 0, maxAlt: 10,
    color: '#3b82f6', ammo: 8, reload: 0.4,
    hitRate: 0.90,
    reactionTime: 1,
    missileSpeed: 600, realSpeed: 'Mach 7 (fastest)',
    desc: 'Short-range interception, highly effective against UAVs and rockets'
  },
  sa8: {
    kind: 'battery', name: 'SA-8 Gecko', short: 'SA8',
    minRange: 1.5, maxRange: 30, minAlt: 0, maxAlt: 5,
    color: '#10b981', ammo: 3, reload: 0.6,
    hitRate: 0.65,
    reactionTime: 1.5,
    missileSpeed: 380, realSpeed: 'Mach 4 (medium)',
    desc: 'Mobile short-range SAM, low-altitude'
  },
  barak8: {
    kind: 'battery', name: 'Barak-8', short: 'BRK',
    minRange: 0.5, maxRange: 100, minAlt: 0, maxAlt: 16,
    color: '#8b5cf6', ammo: 6, reload: 0.5,
    hitRate: 0.85,
    reactionTime: 0.5,
    missileSpeed: 480, realSpeed: 'Mach 5.5 (fast)',
    desc: 'Multi-layered medium-to-long range system'
  },
  patriot: {
    kind: 'battery', name: 'Patriot PAC-3', short: 'PAT',
    minRange: 3, maxRange: 160, minAlt: 0, maxAlt: 24,
    color: '#f59e0b', ammo: 4, reload: 0.7,
    hitRate: 0.65,
    reactionTime: 1.5,
    missileSpeed: 220, realSpeed: 'Mach 2.5 (slowest)',
    desc: 'Long-range system, struggles with slow/small targets'
  },
  davidsSling: {
    kind: 'battery', name: "David's Sling", short: 'DSL',
    minRange: 40, maxRange: 300, minAlt: 5, maxAlt: 30,
    color: '#d946ef', ammo: 5, reload: 0.8,
    hitRate: 0.70,
    reactionTime: 1,
    missileSpeed: 280, realSpeed: 'Mach 3 (slow)',
    desc: 'Long-range interception, medium-to-high altitude'
  },
  // ---- Radars ----
  longRadar: {
    kind: 'radar', name: 'Long-Range Radar', short: 'LR',
    detection: 350, color: '#06b6d4',
    desc: '350 km detection range, sees large targets'
  },
  medRadar: {
    kind: 'radar', name: 'Medium-Range Radar', short: 'MR',
    detection: 180, color: '#0ea5e9',
    desc: '180 km detection range, balanced'
  },
  shortRadar: {
    kind: 'radar', name: 'Short-Range Radar', short: 'SR',
    detection: 100, color: '#0891b2',
    desc: '100 km detection, sees small low-altitude targets'
  },
  // ---- Threats ----
  uav: {
    kind: 'threat', name: 'Attack UAV', short: 'UAV',
    speed: 18, altitude: 2, rcs: 0.1,
    color: '#fbbf24', icon: '◆',
    desc: 'Slow, low altitude, very low radar signature (stealthy)'
  },
  fighter: {
    kind: 'threat', name: 'Fighter Jet', short: 'FTR',
    speed: 40, altitude: 10, rcs: 1.0,
    color: '#dc2626', icon: '▲',
    desc: 'Fast, high altitude'
  },
  helicopter: {
    kind: 'threat', name: 'Attack Helicopter', short: 'HEL',
    speed: 22, altitude: 0.8, rcs: 0.7,
    color: '#a855f7', icon: '✚',
    desc: 'Very low altitude, evades radars'
  }
};

const BATTERY_KEYS = ['ironDome', 'sa8', 'barak8', 'patriot', 'davidsSling'];
const RADAR_KEYS = ['longRadar', 'medRadar', 'shortRadar'];
const THREAT_KEYS = ['uav', 'fighter', 'helicopter'];

// ---- Strategic targets - base templates and live (regenerated) array ----
const BASE_TARGETS = [
  { name: 'Arian (Capital)', baseX: 720, baseY: 410, value: 5, capital: true },
  { name: 'Talos',           baseX: 560, baseY: 230, value: 3 },
  { name: 'Miron',           baseX: 920, baseY: 340, value: 3 },
  { name: 'Plaion',          baseX: 660, baseY: 600, value: 2 },
  { name: 'Eagle Airbase',   baseX: 800, baseY: 510, value: 4, airbase: true }
];
const TARGETS = [];

// ---- Country land polygon - base template and live (regenerated) array ----
const BASE_LAND_POLYGON = [
  [430, 90], [560, 70], [690, 95], [820, 80], [930, 130],
  [1010, 200], [1060, 320], [1080, 450], [1040, 570], [960, 660],
  [840, 690], [710, 700], [580, 680], [470, 620], [410, 510],
  [380, 380], [400, 250], [420, 150]
];
const LAND_POLYGON = [];

function regenerateLand() {
  LAND_POLYGON.length = 0;
  for (const [x, y] of BASE_LAND_POLYGON) {
    const dx = (Math.random() - 0.5) * 50;
    const dy = (Math.random() - 0.5) * 40;
    LAND_POLYGON.push([Math.round(x + dx), Math.round(y + dy)]);
  }
}

function regenerateTargets() {
  TARGETS.length = 0;
  for (const tpl of BASE_TARGETS) {
    let placed = null;
    for (let i = 0; i < 200; i++) {
      const x = tpl.baseX + (Math.random() - 0.5) * 90;
      const y = tpl.baseY + (Math.random() - 0.5) * 80;
      if (!isInsideCountry(x, y)) continue;
      let tooClose = false;
      for (const t of TARGETS) {
        if (Math.hypot(t.x - x, t.y - y) < 110) { tooClose = true; break; }
      }
      if (tooClose) continue;
      placed = {
        name: tpl.name, value: tpl.value,
        capital: tpl.capital, airbase: tpl.airbase,
        x: Math.round(x), y: Math.round(y)
      };
      break;
    }
    if (!placed) {
      placed = {
        name: tpl.name, value: tpl.value,
        capital: tpl.capital, airbase: tpl.airbase,
        x: tpl.baseX, y: tpl.baseY
      };
    }
    TARGETS.push(placed);
  }
}

function getCountryCenter() {
  if (!TARGETS.length) return { x: 720, y: 410 };
  let sx = 0, sy = 0;
  for (const t of TARGETS) { sx += t.x; sy += t.y; }
  return { x: sx / TARGETS.length, y: sy / TARGETS.length };
}

// Radar-equation scaling: detection / tracking range scales with the
// fourth root of RCS (range^4 ∝ σ in the standard radar equation).
// Reference RCS = 1.0 (Fighter Jet) → factor 1.0 (full range).
// Helicopter (rcs=0.7) → factor 0.915.  UAV (rcs=0.4) → factor 0.795.
// A truly stealthy target at rcs=0.1 → factor 0.562.
function rcsRangeFactor(rcs) {
  return Math.pow(Math.max(rcs, 0.001), 0.25);
}

// Effective engagement range of a battery against a specific threat.
// The missile envelope is physically fixed but the battery's tracking
// radar (used to guide the interceptor) suffers from RCS so the
// closeable engagement range shrinks for low-RCS targets.
function effectiveEngagementRange(c, tc) {
  return c.maxRange * rcsRangeFactor(tc.rcs);
}

// ---- Attack-challenge difficulty profiles ----
// System auto-deploys defense; user has limited threat budget to break through.
// Defense positions are anchored to target names (or to the country center)
// so they follow the randomized target layout each game.
// Each profile carries an explicit win condition (`objective`).
const ATTACK_DIFFICULTY = {
  easy: {
    label: 'קל',
    threatBudget: { uav: 24, fighter: 8, helicopter: 8 },  // 40 total
    objective: {
      text: 'פגע ב<b>בירה (Arian)</b>',
      check: (hits) => hits.has('Arian (Capital)')
    },
    defenses: [
      { key: 'ironDome',   anchor: 'Arian (Capital)', dy: 20 },
      { key: 'patriot',    anchor: 'center', dy: 30 },
      { key: 'medRadar',   anchor: 'center' }
    ]
  },
  medium: {
    label: 'בינוני',
    threatBudget: { uav: 18, fighter: 6, helicopter: 6 },  // 30 total
    objective: {
      text: 'פגע ב-<b>3 יעדים אסטרטגיים שונים</b>',
      check: (hits) => hits.size >= 3
    },
    defenses: [
      { key: 'ironDome',   anchor: 'Arian (Capital)' },
      { key: 'ironDome',   anchor: 'Eagle Airbase' },
      { key: 'patriot',    anchor: 'center', dy: 30 },
      { key: 'barak8',     anchor: 'Talos', dx: 40, dy: 80 },
      { key: 'medRadar',   anchor: 'center' },
      { key: 'longRadar',  anchor: 'Eagle Airbase', dx: 30, dy: -40 }
    ]
  },
  hard: {
    label: 'קשה',
    threatBudget: { uav: 12, fighter: 4, helicopter: 4 },  // 20 total
    objective: {
      text: 'פגע ב-<b>4 יעדים אסטרטגיים שונים</b>, או ב<b>בירה + 2 יעדים נוספים</b>',
      check: (hits) => hits.size >= 4 || (hits.has('Arian (Capital)') && hits.size >= 3)
    },
    defenses: [
      { key: 'ironDome',   anchor: 'Arian (Capital)' },
      { key: 'ironDome',   anchor: 'Eagle Airbase' },
      { key: 'ironDome',   anchor: 'Talos' },
      { key: 'sa8',        anchor: 'Miron' },
      { key: 'sa8',        anchor: 'Plaion' },
      { key: 'patriot',    anchor: 'center', dx: -30, dy: -40 },
      { key: 'patriot',    anchor: 'center', dx: 40, dy: 60 },
      { key: 'barak8',     anchor: 'center', dx: -100, dy: 30 },
      { key: 'davidsSling',anchor: 'center', dx: 80, dy: -20 },
      { key: 'longRadar',  anchor: 'center', dy: 40 },
      { key: 'longRadar',  anchor: 'Eagle Airbase', dx: 30, dy: -50 },
      { key: 'medRadar',   anchor: 'Talos', dx: 50, dy: 80 },
      { key: 'shortRadar', anchor: 'Miron', dx: -20, dy: 20 }
    ]
  }
};

// ---- Defense-challenge difficulty profiles ----
// System generates an attack; user places defense within a budget.
// Each profile carries an explicit win condition (`objective`).
const DEFENSE_DIFFICULTY = {
  easy: {
    label: 'קל',
    countMin: 8, countMax: 11,
    jitterX: 150, jitterY: 350, baseY: 200,
    budget: { ironDome: 4, sa8: 3, barak8: 3, patriot: 2, davidsSling: 2,
              longRadar: 2, medRadar: 3, shortRadar: 3 },
    objective: {
      text: 'הגן על <b>הבירה (Arian)</b> - אסור שתיפגע',
      check: (hits) => !hits.has('Arian (Capital)')
    }
  },
  medium: {
    label: 'בינוני',
    countMin: 14, countMax: 19,
    jitterX: 230, jitterY: 550, baseY: 100,
    budget: { ironDome: 3, sa8: 2, barak8: 2, patriot: 1, davidsSling: 1,
              longRadar: 1, medRadar: 2, shortRadar: 2 },
    objective: {
      text: 'הגן על <b>הבירה (Arian)</b> ועל <b>בסיס הנשר (Eagle Airbase)</b>',
      check: (hits) => !hits.has('Arian (Capital)') && !hits.has('Eagle Airbase')
    }
  },
  hard: {
    label: 'קשה',
    countMin: 22, countMax: 29,
    jitterX: 320, jitterY: 700, baseY: 30,
    budget: { ironDome: 2, sa8: 1, barak8: 1, patriot: 1, davidsSling: 1,
              longRadar: 1, medRadar: 1, shortRadar: 1 },
    objective: {
      text: 'לפחות <b>4 מ-5 היעדים האסטרטגיים</b> נשארו ללא פגיעה',
      check: (hits) => hits.size <= 1
    }
  }
};

function resolveAnchor(item) {
  const dx = item.dx || 0, dy = item.dy || 0;
  if (item.anchor === 'center') {
    const c = getCountryCenter();
    return { x: c.x + dx, y: c.y + dy };
  }
  if (item.anchor) {
    const tgt = TARGETS.find(t => t.name === item.anchor);
    if (tgt) return { x: tgt.x + dx, y: tgt.y + dy };
  }
  return { x: item.x || 720, y: item.y || 410 };
}

function pointInPolygon(x, y, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i][0], yi = poly[i][1];
    const xj = poly[j][0], yj = poly[j][1];
    const intersect = ((yi > y) !== (yj > y)) &&
      (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

function isInsideCountry(x, y) {
  return pointInPolygon(x, y, LAND_POLYGON);
}

// ---- Miss reason labels (Hebrew UI) ----
const REASON_LABEL = {
  'statistical': 'החטאה סטטיסטית',
  'tangent':     'חציה משיקית (ניצב לסוללה)',
  'flight-time': 'זמן מעוף לא מספיק',
  'out-of-range':'יציאה מטווח היירוט'
};

// ---- מצב כללי ----
const state = {
  mode: 'idle',
  placeKey: null,
  placeStep: null,        // null | 'origin' | 'target'  (attack challenge 3-click flow)
  placeOrigin: null,      // {x, y} captured between origin click and target click
  attackChallenge: false, // true when system-deployed defense + limited threat budget
  challengeDifficulty: null,
  side: 'blue',
  defenses: [],
  threats: [],
  missiles: [],
  explosions: [],
  targetHits: [],
  history: [],            // [{time, threats, missiles, explosions, targetHits}] - for scrubbing
  scrubTime: null,        // when set, draw uses snapshot at this time instead of live state
  challengeMode: null,    // null | 'attack-challenge' | 'defense-challenge'
  budget: null,           // defense budget (defense-challenge)
  threatBudget: null,     // threat budget (attack-challenge)
  objective: null,        // { text, check(hits) } - mission win condition
  results: null,
  lastTs: 0,
  simElapsed: 0,
  drag: null,
  mouseX: 0, mouseY: 0,
  serialCounters: {},
  viewport: { offsetX: 0, offsetY: 0, scale: 1 }
};

let canvas, ctx, W, H, tooltip, banner;
let nextId = 1;

// =============================================================
// אתחול
// =============================================================
window.addEventListener('DOMContentLoaded', () => {
  canvas = document.getElementById('map');
  ctx = canvas.getContext('2d');
  tooltip = document.getElementById('tooltip');
  banner = document.getElementById('banner');
  resize();
  window.addEventListener('resize', resize);
  regenerateLand();
  regenerateTargets();
  buildButtons();
  bindControls();
  bindCanvas();
  requestAnimationFrame(loop);
});

function resize() {
  const r = canvas.parentElement.getBoundingClientRect();
  canvas.width = W = r.width;
  canvas.height = H = r.height;
}

function buildButtons() {
  const bGrid = document.getElementById('battery-btns');
  const rGrid = document.getElementById('radar-btns');
  const tGrid = document.getElementById('threat-btns');
  BATTERY_KEYS.forEach(k => bGrid.appendChild(makeBtn(k)));
  RADAR_KEYS.forEach(k => rGrid.appendChild(makeBtn(k)));
  THREAT_KEYS.forEach(k => tGrid.appendChild(makeBtn(k)));
}

function makeBtn(k) {
  const c = CATALOG[k];
  let rangeText;
  if (c.kind === 'battery') {
    rangeText = `${c.minRange}-${c.maxRange} km • Alt ${c.minAlt}-${c.maxAlt} km<br><span class="kp-badge">KP ${(c.hitRate*100).toFixed(0)}%</span> <span class="rt-badge">RT ${c.reactionTime}s</span> <span class="speed-line">${c.realSpeed}</span>`;
  } else if (c.kind === 'radar') {
    rangeText = `Detection ${c.detection} km`;
  } else {
    rangeText = `Speed ${c.speed} • Altitude ${c.altitude} km`;
  }

  const wrapper = document.createElement('div');
  wrapper.className = 'btn-row';

  const main = document.createElement('button');
  main.dataset.key = k;
  main.innerHTML = `
    <span class="icon" style="color:${c.color}">${iconFor(k)}</span>
    <span class="info">
      <span class="name">${c.name}</span>
      <span class="range">${rangeText}</span>
    </span>`;
  main.title = c.desc;
  main.addEventListener('click', () => selectPlace(k));

  const info = document.createElement('button');
  info.className = 'info-btn';
  info.innerHTML = 'ⓘ';
  info.title = 'פרטי מערכת';
  info.addEventListener('click', (ev) => { ev.stopPropagation(); showInfoModal(k); });

  wrapper.appendChild(main);
  wrapper.appendChild(info);
  return wrapper;
}

function showInfoModal(key) {
  const c = CATALOG[key];
  document.getElementById('info-title').textContent = c.name;
  const body = document.getElementById('info-body');

  let rows = `<tr><td>תיאור</td><td>${c.desc}</td></tr>`;

  if (c.kind === 'battery') {
    // Per-threat-type effective range (RCS-adjusted)
    const fmtEff = (rcs) => `${Math.round(c.maxRange * rcsRangeFactor(rcs))} ק"מ`;
    rows += `
      <tr><td>סוג</td><td>סוללת נ"מ קרקע-אוויר</td></tr>
      <tr><td>טווח יירוט נומינלי</td><td>${c.minRange} - ${c.maxRange} ק"מ</td></tr>
      <tr><td>טווח אפקטיבי לפי RCS</td><td style="font-size:11px;line-height:1.6">
        Fighter (RCS 1.0): <b>${fmtEff(1.0)}</b><br>
        Helicopter (RCS 0.7): <b>${fmtEff(0.7)}</b><br>
        UAV (RCS 0.1): <b>${fmtEff(0.1)}</b>
        <div style="color:#7e91a8;margin-top:4px">משוואת המכ"ם: range ∝ RCS<sup>¼</sup></div>
      </td></tr>
      <tr><td>תקרת גובה</td><td>${c.minAlt} - ${c.maxAlt} ק"מ</td></tr>
      <tr><td>מהירות מיירט</td><td><b style="color:#5fa8d3">${c.realSpeed}</b> (${c.missileSpeed} px/s)</td></tr>
      <tr><td>זמן תגובה (RT)</td><td><b style="color:#06b6d4;font-size:15px">${c.reactionTime} שניות</b><div style="font-size:10px;color:#7e91a8;margin-top:2px">משך הזמן מהחלטה לירות עד שיגור בפועל</div></td></tr>
      <tr><td>שיעור פגיעה (KP)</td><td><b style="color:#5fa86b;font-size:15px">${(c.hitRate*100).toFixed(0)}%</b></td></tr>
      <tr><td>מצבור תחמושת</td><td>${c.ammo} מיירטים</td></tr>
      <tr><td>זמן טעינה בין ירי</td><td>${c.reload} שניות</td></tr>
    `;
  } else if (c.kind === 'radar') {
    const fmtEff = (rcs) => `${Math.round(c.detection * rcsRangeFactor(rcs))} ק"מ`;
    rows += `
      <tr><td>סוג</td><td>מכ"ם גילוי וכיוון</td></tr>
      <tr><td>טווח גילוי נומינלי</td><td>${c.detection} ק"מ</td></tr>
      <tr><td>טווח אפקטיבי לפי RCS</td><td style="font-size:11px;line-height:1.6">
        Fighter (RCS 1.0): <b>${fmtEff(1.0)}</b><br>
        Helicopter (RCS 0.7): <b>${fmtEff(0.7)}</b><br>
        UAV (RCS 0.1): <b>${fmtEff(0.1)}</b>
        <div style="color:#7e91a8;margin-top:4px">range ∝ RCS<sup>¼</sup></div>
      </td></tr>
      <tr><td>תפקיד מערכתי</td><td><b style="color:#06b6d4">מאריך טווח של סוללות</b></td></tr>
    `;
  } else {
    rows += `
      <tr><td>סוג</td><td>איום אווירי</td></tr>
      <tr><td>מהירות (סקלת המשחק)</td><td>${c.speed} px/s</td></tr>
      <tr><td>גובה טיסה</td><td>${c.altitude} ק"מ</td></tr>
      <tr><td>חתימת מכ"ם (RCS)</td><td>${c.rcs} ${c.rcs < 0.5 ? '(נמוכה - קשה לאתר)' : c.rcs < 0.8 ? '(בינונית)' : '(גבוהה)'}</td></tr>
    `;
  }

  let html = `
    <div class="info-card" style="border-right-color:${c.color}">
      <table class="info-table">${rows}</table>
    </div>
  `;

  if (c.kind === 'battery') {
    html += `
      <div class="info-failure-list">
        <h4>4 סיבות אפשריות לכשלון יירוט:</h4>
        <ul>
          <li><b>החטאה סטטיסטית</b> - לפי שיעור פגיעה ${(c.hitRate*100).toFixed(0)}% (${(100 - c.hitRate*100).toFixed(0)}% פספוסים בממוצע)</li>
          <li><b>זמן מעוף לא מספיק</b> - האיום מקדים להגיע ליעד לפני שהמיירט מגיע אליו (תלוי במהירות המיירט: ${c.realSpeed})</li>
          <li><b>יציאה מטווח</b> - האיום עוזב את כיסוי הסוללה (${c.maxRange} ק"מ) במהלך מעוף הטיל</li>
          <li><b>חציה משיקית</b> - האיום נע בניצב לציר הסוללה ברגע היירוט (עד 15° מהניצב)</li>
        </ul>
      </div>
      <div class="info-failure-list" style="border-color:rgba(6,182,212,0.4);background:rgba(6,182,212,0.06)">
        <h4 style="color:#06b6d4">📡 תוספת מכ"ם חיצוני</h4>
        <ul>
          <li>בלי מכ"ם רלוונטי: הסוללה משגרת מיירט <b>רק כשהאיום נכנס לטווח ${c.maxRange} ק"מ</b></li>
          <li>עם מכ"ם חיצוני שטווחו מעבר לסוללה: ניתן <b>לשגר מיירט לפני שהאיום נכנס לטווח</b> (היירוט עצמו עדיין חייב להתבצע בתוך הטווח)</li>
          <li>התוצאה: <b>יותר ניסיונות יירוט</b> לאותו איום בזמן שהוא חוצה את אזור ההגנה</li>
        </ul>
      </div>
    `;
  } else if (c.kind === 'threat') {
    html += `
      <div class="info-failure-list">
        <h4>טיפ טקטי:</h4>
        <ul>
          ${c.altitude < 3 ? '<li>גובה נמוך - השתמש ב-Iron Dome / SA-8 / Barak-8 (David\'s Sling אינו אפקטיבי בגובה < 5 ק"מ)</li>' : ''}
          ${c.altitude >= 8 ? '<li>גובה גבוה - השתמש ב-Patriot / David\'s Sling (Barak-8 אפקטיבי גם הוא)</li>' : ''}
          ${c.rcs < 0.5 ? '<li>RCS נמוך - חתימה קטנה, מכ"מים גדולים יתקשו לאתר. השתמש ב-Short-Range Radar שיעיל יותר נגד מטרות קטנות</li>' : ''}
          ${c.speed > 100 ? '<li>מהירות גבוהה - הגיע ליעד מהר. דרושות סוללות עם מיירט מהיר (David\'s Sling - Mach 7) או פריסה קרובה לציר הטיסה</li>' : ''}
        </ul>
      </div>
    `;
  }

  body.innerHTML = html;
  document.getElementById('info-modal').classList.add('visible');
}

function hideInfoModal() {
  document.getElementById('info-modal').classList.remove('visible');
}

function iconFor(k) {
  const c = CATALOG[k];
  if (c.kind === 'battery') return '⛨';
  if (c.kind === 'radar') return '⊙';
  return c.icon;
}

function bindControls() {
  document.querySelectorAll('.side-btn').forEach(btn => {
    btn.addEventListener('click', () => switchSide(btn.dataset.side));
  });
  document.getElementById('simulate').addEventListener('click', startSim);
  document.getElementById('stop').addEventListener('click', stopSim);
  document.getElementById('delete-mode').addEventListener('click', toggleDelete);
  document.getElementById('edit-targets').addEventListener('click', toggleEditTargets);
  document.getElementById('clear-threats').addEventListener('click', clearThreats);
  document.getElementById('reset').addEventListener('click', resetAll);
  document.querySelectorAll('.diff-btn[data-attack]').forEach(btn => {
    btn.addEventListener('click', () => startAttackChallenge(btn.dataset.attack));
  });
  document.querySelectorAll('.diff-btn[data-diff]').forEach(btn => {
    btn.addEventListener('click', () => startDefenseChallenge(btn.dataset.diff));
  });
  document.getElementById('modal-close').addEventListener('click', hideModal);
  document.getElementById('modal').addEventListener('click', (ev) => {
    if (ev.target.id === 'modal') hideModal();
  });
  document.getElementById('info-close').addEventListener('click', hideInfoModal);
  document.getElementById('info-modal').addEventListener('click', (ev) => {
    if (ev.target.id === 'info-modal') hideInfoModal();
  });
  document.getElementById('scrubber').addEventListener('input', onScrubberChange);
  // Viewport controls
  document.getElementById('zoom-in').addEventListener('click', () => zoomBy(1.25));
  document.getElementById('zoom-out').addEventListener('click', () => zoomBy(0.8));
  document.getElementById('pan-left').addEventListener('click', () => panBy(80, 0));
  document.getElementById('pan-right').addEventListener('click', () => panBy(-80, 0));
  document.getElementById('pan-up').addEventListener('click', () => panBy(0, 80));
  document.getElementById('pan-down').addEventListener('click', () => panBy(0, -80));
  document.getElementById('zoom-reset').addEventListener('click', resetView);
}

function zoomBy(factor) {
  const cx = W / 2, cy = H / 2;
  // World point under the screen center stays under it after the zoom
  const wx = (cx - state.viewport.offsetX) / state.viewport.scale;
  const wy = (cy - state.viewport.offsetY) / state.viewport.scale;
  const newScale = Math.max(0.5, Math.min(3, state.viewport.scale * factor));
  state.viewport.scale = newScale;
  state.viewport.offsetX = cx - wx * newScale;
  state.viewport.offsetY = cy - wy * newScale;
}

function panBy(dx, dy) {
  state.viewport.offsetX += dx;
  state.viewport.offsetY += dy;
}

function resetView() {
  state.viewport = { offsetX: 0, offsetY: 0, scale: 1 };
}

function onScrubberChange(ev) {
  const t = parseFloat(ev.target.value);
  state.scrubTime = t;
  document.getElementById('scrubber-time').textContent = t.toFixed(1);
}

function captureSnapshot() {
  return {
    time: state.simElapsed,
    threats: state.threats.map(t => ({...t, missedBy: t.missedBy ? t.missedBy.slice() : []})),
    missiles: state.missiles.map(m => ({...m})),
    explosions: state.explosions.map(e => ({...e})),
    targetHits: state.targetHits.map(e => ({
      ...e,
      people: e.people ? e.people.map(p => ({...p})) : undefined
    }))
  };
}

function findSnapshot(t) {
  if (!state.history.length) return null;
  let best = state.history[0];
  for (const s of state.history) {
    if (s.time <= t) best = s;
    else break;
  }
  return best;
}

function switchSide(side) {
  state.side = side;
  document.querySelectorAll('.side-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.side === side);
  });
  document.getElementById('blue-panel').style.display = side === 'blue' ? '' : 'none';
  document.getElementById('red-panel').style.display = side === 'red' ? '' : 'none';
  state.mode = 'idle'; state.placeKey = null;
  refreshButtonStates();
  setStatus(side === 'blue' ? 'צד כחול - בחר אמצעי הגנה' : 'צד אדום - בחר איום');
}

function selectPlace(key) {
  const c = CATALOG[key];
  if (state.mode === 'sim') return;

  // Defense budget enforcement
  if (state.budget && c.kind !== 'threat') {
    const used = state.defenses.filter(d => d.key === key).length;
    if ((state.budget[key] || 0) <= used) {
      setStatus(`לא נותרו ${c.name} בתקציב`);
      return;
    }
  }
  // Threat budget enforcement (attack challenge)
  if (state.threatBudget && c.kind === 'threat') {
    const used = state.threats.filter(t => t.key === key).length;
    if ((state.threatBudget[key] || 0) <= used) {
      setStatus(`לא נותרו ${c.name} בתקציב`);
      return;
    }
  }

  state.mode = 'placing';
  state.placeKey = key;

  // Three-click attack-challenge flow
  if (state.attackChallenge && c.kind === 'threat') {
    state.placeStep = 'origin';
    state.placeOrigin = null;
    setStatus(`${c.name} - לחץ על המפה מחוץ לגבולות המדינה (נקודת מוצא)`);
  } else {
    state.placeStep = null;
    setStatus(`מציב ${c.name} - לחץ על המפה`);
  }
  refreshButtonStates();
}

function refreshButtonStates() {
  document.querySelectorAll('.btn-grid button[data-key]').forEach(b => {
    b.classList.toggle('active', state.mode === 'placing' && b.dataset.key === state.placeKey);
  });
  canvas.classList.toggle('placing', state.mode === 'placing');
  canvas.classList.toggle('deleting', state.mode === 'deleting');
}

function setStatus(text) { document.getElementById('mode-status').textContent = text; }

function showBanner(text, kind) {
  banner.innerHTML = text;
  banner.className = kind || '';
  banner.style.display = 'block';
}
function hideBanner() { banner.style.display = 'none'; }

// =============================================================
// אינטראקציה - עכבר
// =============================================================
function bindCanvas() {
  canvas.addEventListener('click', onCanvasClick);
  canvas.addEventListener('mousedown', onMouseDown);
  canvas.addEventListener('mousemove', onMouseMove);
  canvas.addEventListener('mouseup', onMouseUp);
  canvas.addEventListener('mouseleave', () => { tooltip.style.display = 'none'; });
}

function getPos(ev) {
  const r = canvas.getBoundingClientRect();
  const sx = ev.clientX - r.left;
  const sy = ev.clientY - r.top;
  // Convert screen → world coordinates by inverting the viewport transform
  return {
    x: (sx - state.viewport.offsetX) / state.viewport.scale,
    y: (sy - state.viewport.offsetY) / state.viewport.scale
  };
}

function onCanvasClick(ev) {
  if (state.drag && state.drag.moved) { state.drag = null; return; }
  state.drag = null;
  const p = getPos(ev);

  if (state.mode === 'placing') {
    const c = CATALOG[state.placeKey];

    // Three-click attack-challenge threat placement
    if (state.attackChallenge && c.kind === 'threat') {
      if (state.placeStep === 'origin') {
        if (isInsideCountry(p.x, p.y)) {
          flashStatus('⚠ נקודת המוצא חייבת להיות מחוץ לגבולות המדינה!', 'origin');
          return;
        }
        state.placeOrigin = { x: p.x, y: p.y };
        state.placeStep = 'target';
        setStatus(`${c.name} מ-(${Math.round(p.x)}, ${Math.round(p.y)}) - בחר יעד אסטרטגי`);
        return;
      }
      if (state.placeStep === 'target') {
        const tgt = findTargetAt(p.x, p.y);
        if (!tgt) {
          flashStatus('⚠ יש ללחוץ על אחד מהיעדים האסטרטגיים!', 'target');
          return;
        }
        state.threats.push(makeThreat(state.placeKey, state.placeOrigin.x, state.placeOrigin.y, tgt.x, tgt.y, tgt.name));
        renderBudget();
        // Continue with same threat type if budget allows; otherwise prompt to choose another
        const used = state.threats.filter(t => t.key === state.placeKey).length;
        const max = (state.threatBudget && state.threatBudget[state.placeKey]) || 0;
        if (used >= max) {
          state.mode = 'idle';
          state.placeKey = null;
          state.placeStep = null;
          state.placeOrigin = null;
          refreshButtonStates();
          setStatus('מיצית את התקציב לסוג הזה - בחר סוג אחר או הפעל סימולציה');
        } else {
          state.placeStep = 'origin';
          state.placeOrigin = null;
          setStatus(`${c.name} - לחץ על נקודת מוצא לאיום הבא (${used}/${max} הוצבו)`);
        }
        return;
      }
    }

    // Default single-click placement
    placeAt(state.placeKey, p.x, p.y);
    if (state.budget) {
      if (c.kind !== 'threat') {
        const used = state.defenses.filter(d => d.key === state.placeKey).length;
        if (used >= (state.budget[state.placeKey] || 0)) {
          state.mode = 'idle'; state.placeKey = null;
          refreshButtonStates(); setStatus('סיימת להציב את הסוג הזה');
        }
      }
    }
  } else if (state.mode === 'deleting') {
    const ent = findEntityAt(p.x, p.y);
    if (ent) deleteEntity(ent);
  }
}

let _flashTimer = null;
function flashStatus(msg, returnStep) {
  setStatus(msg);
  clearTimeout(_flashTimer);
  _flashTimer = setTimeout(() => {
    if (state.placeStep === 'origin') {
      const c = CATALOG[state.placeKey];
      setStatus(`${c.name} - לחץ על המפה מחוץ לגבולות המדינה (נקודת מוצא)`);
    } else if (state.placeStep === 'target') {
      const c = CATALOG[state.placeKey];
      setStatus(`${c.name} - בחר יעד אסטרטגי`);
    }
  }, 1500);
}

function onMouseDown(ev) {
  if (state.mode === 'sim' || state.mode === 'placing' || state.mode === 'deleting') return;
  const p = getPos(ev);

  if (state.mode === 'editTargets') {
    const tgt = findTargetAt(p.x, p.y);
    if (tgt) state.drag = { ent: tgt, ox: p.x - tgt.x, oy: p.y - tgt.y, moved: false, isTarget: true };
    return;
  }

  const ent = findEntityAt(p.x, p.y);
  if (ent) state.drag = { ent, ox: p.x - ent.x, oy: p.y - ent.y, moved: false };
}

function onMouseMove(ev) {
  const p = getPos(ev);
  state.mouseX = p.x; state.mouseY = p.y;
  if (state.drag) {
    state.drag.ent.x = p.x - state.drag.ox;
    state.drag.ent.y = p.y - state.drag.oy;
    state.drag.moved = true;
    // If we're moving a strategic target, sync any threats already aimed at it
    if (state.drag.isTarget) {
      for (const t of state.threats) {
        if (t.target === state.drag.ent.name) {
          t.tx = state.drag.ent.x;
          t.ty = state.drag.ent.y;
        }
      }
    }
    canvas.classList.add('dragging');
    return;
  }
  // Tooltip
  const ent = findEntityAt(p.x, p.y);
  if (ent) {
    const c = CATALOG[ent.key];
    let lines = [`<b>${c.name}</b>`];
    if (c.kind === 'battery') {
      lines.push(`טווח: ${c.minRange}-${c.maxRange} ק"מ`);
      lines.push(`תקרה: ${c.maxAlt} ק"מ`);
      lines.push(`תחמושת: ${ent.ammo}/${c.ammo}`);
    } else if (c.kind === 'radar') {
      lines.push(`גילוי: ${c.detection} ק"מ`);
    } else if (c.kind === 'threat') {
      lines[0] = `<b>${c.name} <span style="color:#fbbf24">[${ent.label}]</span></b>`;
      lines.push(`יעד: ${ent.target}`);
      lines.push(`מהירות: ${c.speed} | גובה: ${c.altitude} ק"מ`);
      lines.push(`סטטוס: ${ent.status === 'destroyed' ? 'הושמד' : ent.status === 'reached' ? 'הגיע ליעד' : 'פעיל'}`);
    }
    tooltip.innerHTML = lines.join('<br>');
    tooltip.style.display = 'block';
    tooltip.style.left = (ev.clientX - canvas.parentElement.getBoundingClientRect().left + 14) + 'px';
    tooltip.style.top = (ev.clientY - canvas.parentElement.getBoundingClientRect().top + 14) + 'px';
  } else {
    tooltip.style.display = 'none';
  }
}

function onMouseUp() {
  if (state.drag) state.drag = null;
  canvas.classList.remove('dragging');
}

function findEntityAt(x, y) {
  const all = [...state.defenses, ...state.threats];
  for (let i = all.length - 1; i >= 0; i--) {
    const e = all[i];
    if (e.status === 'destroyed') continue;
    if (Math.hypot(e.x - x, e.y - y) <= 18) return e;
  }
  return null;
}

function placeAt(key, x, y) {
  const c = CATALOG[key];
  if (c.kind === 'threat') {
    const target = pickTarget();
    state.threats.push(makeThreat(key, x, y, target.x, target.y, target.name));
  } else {
    state.defenses.push({
      id: nextId++, key, x, y,
      ammo: c.ammo, cd: 0,
      prepareTarget: null,    // threatId currently being prepared (during reactionTime)
      prepareUntil: 0          // simElapsed at which the missile actually launches
    });
  }
  if (state.budget) renderBudget();
}

function makeThreat(key, sx, sy, tx, ty, targetName) {
  const c = CATALOG[key];
  state.serialCounters[key] = (state.serialCounters[key] || 0) + 1;
  const serial = state.serialCounters[key];
  return {
    id: nextId++, key, x: sx, y: sy, sx, sy, tx, ty,
    status: 'inflight', hitBy: null, target: targetName,
    serial, label: `${c.short}-${serial}`,
    firedAt: 0, missedBy: []
  };
}

function pickTarget() {
  const total = TARGETS.reduce((s, t) => s + t.value, 0);
  let r = Math.random() * total;
  for (const t of TARGETS) { r -= t.value; if (r <= 0) return t; }
  return TARGETS[0];
}

function deleteEntity(e) {
  state.defenses = state.defenses.filter(x => x !== e);
  state.threats  = state.threats.filter(x => x !== e);
}

function toggleDelete() {
  state.mode = state.mode === 'deleting' ? 'idle' : 'deleting';
  state.placeKey = null;
  refreshButtonStates();
  setStatus(state.mode === 'deleting' ? 'מצב מחיקה - לחץ על רכיב כדי להסיר' : 'בחר רכיב להוספה');
}

function toggleEditTargets() {
  if (state.mode === 'sim') return;
  if (state.mode === 'editTargets') {
    state.mode = 'idle';
    setStatus('יצאת ממצב עריכת יעדים');
    hideBanner();
  } else {
    state.mode = 'editTargets';
    state.placeKey = null;
    setStatus('עריכת יעדים - גרור יעדים על המפה');
    showBanner('🛠 מצב עריכת יעדים - גרור את היעדים האסטרטגיים למיקום חדש. לחץ שוב על הכפתור כדי לסיים.', '');
  }
  refreshButtonStates();
}

function findTargetAt(x, y) {
  for (let i = TARGETS.length - 1; i >= 0; i--) {
    const t = TARGETS[i];
    if (Math.hypot(t.x - x, t.y - y) <= 20) return t;
  }
  return null;
}

function clearThreats() {
  state.threats = []; state.missiles = []; state.explosions = []; state.targetHits = [];
  state.serialCounters = {};
  state.results = null; renderResults();
  setStatus('נוקו האיומים');
}

function resetAll() {
  state.defenses = []; state.threats = []; state.missiles = []; state.explosions = []; state.targetHits = [];
  state.history = [];
  state.scrubTime = null;
  state.serialCounters = {};
  state.results = null;
  state.budget = null;
  state.threatBudget = null;
  state.objective = null;
  state.attackChallenge = false;
  state.challengeDifficulty = null;
  state.challengeMode = null;
  state.mode = 'idle';
  state.placeKey = null;
  state.placeStep = null;
  state.placeOrigin = null;
  document.getElementById('scrubber-row').style.display = 'none';
  // Regenerate the country borders and target locations so each game is fresh
  regenerateLand();
  regenerateTargets();
  // Reset viewport to default
  state.viewport = { offsetX: 0, offsetY: 0, scale: 1 };
  hideBanner();
  refreshButtonStates();
  renderBudget();
  renderResults();
  setStatus('המפה אופסה - מפה ויעדים חדשים');
}

// =============================================================
// ציור
// =============================================================
function loop(ts) {
  const dt = state.lastTs ? Math.min(0.05, (ts - state.lastTs) / 1000) : 0;
  state.lastTs = ts;
  if (state.mode === 'sim') tick(dt);
  draw();
  requestAnimationFrame(loop);
}

function draw() {
  ctx.clearRect(0, 0, W, H);
  // Sea always fills the visible canvas regardless of zoom/pan
  const grad = ctx.createLinearGradient(0, 0, W, H);
  grad.addColorStop(0, '#0a1628');
  grad.addColorStop(1, '#050b18');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);
  // Apply viewport transform - everything map-related scales and pans together.
  // HUD (drawn after restore) stays in screen space.
  ctx.save();
  ctx.translate(state.viewport.offsetX, state.viewport.offsetY);
  ctx.scale(state.viewport.scale, state.viewport.scale);
  drawBackground();
  drawCountry();
  drawTargets();
  drawCoverage();
  drawDefenses();

  // If scrubbing, swap state arrays for the dynamic objects with the snapshot
  let saved = null;
  if (state.scrubTime != null) {
    const snap = findSnapshot(state.scrubTime);
    if (snap) {
      saved = {
        threats: state.threats,
        missiles: state.missiles,
        explosions: state.explosions,
        targetHits: state.targetHits
      };
      state.threats = snap.threats;
      state.missiles = snap.missiles;
      state.explosions = snap.explosions;
      state.targetHits = snap.targetHits;
    }
  }

  drawThreatPaths();
  drawThreats();
  drawMissiles();
  drawExplosions();
  drawTargetHits();

  if (saved) {
    state.threats = saved.threats;
    state.missiles = saved.missiles;
    state.explosions = saved.explosions;
    state.targetHits = saved.targetHits;
  }

  drawPlacementGuide();
  ctx.restore();
  drawHUD();
}

// Visual aid during the 3-click attack-challenge flow
function drawPlacementGuide() {
  if (state.mode !== 'placing' || !state.placeStep) return;
  const c = CATALOG[state.placeKey];
  if (!c || c.kind !== 'threat') return;

  if (state.placeStep === 'origin') {
    // Show whether the cursor is in a valid (outside-country) location
    const inside = isInsideCountry(state.mouseX, state.mouseY);
    ctx.beginPath();
    ctx.arc(state.mouseX, state.mouseY, 12, 0, Math.PI * 2);
    ctx.strokeStyle = inside ? '#dc2626' : '#5fa86b';
    ctx.lineWidth = 2;
    ctx.setLineDash(inside ? [3, 3] : []);
    ctx.stroke();
    ctx.setLineDash([]);
    if (inside) {
      ctx.fillStyle = '#dc2626';
      ctx.font = 'bold 11px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('✗ בתוך המדינה', state.mouseX, state.mouseY - 18);
    } else {
      ctx.fillStyle = '#5fa86b';
      ctx.font = 'bold 11px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('✓ נקודת מוצא תקינה', state.mouseX, state.mouseY - 18);
    }
  } else if (state.placeStep === 'target' && state.placeOrigin) {
    const o = state.placeOrigin;
    // Origin marker
    ctx.beginPath();
    ctx.arc(o.x, o.y, 6, 0, Math.PI * 2);
    ctx.fillStyle = '#dc2626';
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = '#fca5a5';
    ctx.font = 'bold 10px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('מוצא', o.x, o.y - 12);

    // Planning line from origin to cursor
    const tgt = findTargetAt(state.mouseX, state.mouseY);
    ctx.beginPath();
    ctx.moveTo(o.x, o.y);
    ctx.lineTo(state.mouseX, state.mouseY);
    ctx.strokeStyle = tgt ? '#5fa86b' : 'rgba(220, 38, 38, 0.5)';
    ctx.lineWidth = tgt ? 2.5 : 1.5;
    ctx.setLineDash([6, 6]);
    ctx.stroke();
    ctx.setLineDash([]);

    if (!tgt) {
      ctx.fillStyle = '#dc2626';
      ctx.font = 'bold 11px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('✗ לחץ על יעד אסטרטגי', state.mouseX, state.mouseY - 14);
    }
  }
}

// Drawn inside the viewport transform - grid + red-zone label move with the map
function drawBackground() {
  const WORLD_W = 1200, WORLD_H = 800;
  // Grid
  ctx.strokeStyle = 'rgba(95, 168, 211, 0.04)';
  ctx.lineWidth = 1;
  for (let x = 0; x < WORLD_W; x += 50) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, WORLD_H); ctx.stroke();
  }
  for (let y = 0; y < WORLD_H; y += 50) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(WORLD_W, y); ctx.stroke();
  }
  // Red zone band & label
  ctx.fillStyle = 'rgba(220, 38, 38, 0.06)';
  ctx.fillRect(0, 0, 380, WORLD_H);
  ctx.fillStyle = 'rgba(220, 38, 38, 0.4)';
  ctx.font = 'bold 14px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('Red Zone (Threat Origin)', 190, 30);
}

function drawCountry() {
  const land = LAND_POLYGON;
  ctx.fillStyle = '#1a3148';
  ctx.strokeStyle = '#3a6b8c';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(land[0][0], land[0][1]);
  for (let i = 1; i < land.length; i++) ctx.lineTo(land[i][0], land[i][1]);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // In attack-challenge placement step 'origin' show the border highlighted
  if (state.attackChallenge && state.placeStep === 'origin') {
    ctx.strokeStyle = 'rgba(220, 38, 38, 0.7)';
    ctx.setLineDash([6, 4]);
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(land[0][0], land[0][1]);
    for (let i = 1; i < land.length; i++) ctx.lineTo(land[i][0], land[i][1]);
    ctx.closePath();
    ctx.stroke();
    ctx.setLineDash([]);
  }

  // Mountain ridge
  ctx.fillStyle = 'rgba(120, 140, 160, 0.12)';
  ctx.beginPath();
  ctx.moveTo(550, 320);
  ctx.lineTo(620, 280); ctx.lineTo(680, 310); ctx.lineTo(740, 270);
  ctx.lineTo(800, 320); ctx.lineTo(860, 290); ctx.lineTo(900, 340);
  ctx.lineTo(870, 380); ctx.lineTo(580, 380);
  ctx.closePath(); ctx.fill();

  // Country label
  ctx.fillStyle = 'rgba(95, 168, 211, 0.35)';
  ctx.font = 'bold 28px serif';
  ctx.textAlign = 'center';
  ctx.fillText('Republic of Taliaria', 720, 160);
  ctx.font = '12px sans-serif';
  ctx.fillStyle = 'rgba(95, 168, 211, 0.5)';
  ctx.fillText('Air Defense Command', 720, 178);
}

function drawTargets() {
  ctx.textAlign = 'center';
  const editing = state.mode === 'editTargets';
  const targetingPhase = state.mode === 'placing' && state.placeStep === 'target';
  for (const t of TARGETS) {
    // Bold prominence ring (always visible) so targets aren't lost behind battery icons
    const radial = ctx.createRadialGradient(t.x, t.y, 4, t.x, t.y, 22);
    radial.addColorStop(0, 'rgba(251, 191, 36, 0.35)');
    radial.addColorStop(1, 'rgba(251, 191, 36, 0)');
    ctx.fillStyle = radial;
    ctx.beginPath();
    ctx.arc(t.x, t.y, 22, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(t.x, t.y, 18, 0, Math.PI * 2);
    ctx.strokeStyle = '#fbbf24';
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // Targeting halo for attack-challenge target-pick step
    if (targetingPhase) {
      const phase = (Date.now() / 1000) * 5 + t.x * 0.01;
      ctx.beginPath();
      ctx.arc(t.x, t.y, 22 + Math.sin(phase) * 3, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(220, 38, 38, 0.18)';
      ctx.fill();
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 4]);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    // Pulsing edit-mode halo
    if (editing) {
      const phase = (Date.now() / 1000) * 4 + t.x * 0.01;
      ctx.beginPath();
      ctx.arc(t.x, t.y, 18 + Math.sin(phase) * 2, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(251, 191, 36, 0.18)';
      ctx.fill();
      ctx.strokeStyle = '#fbbf24';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 4]);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    ctx.beginPath();
    ctx.fillStyle = t.capital ? '#fbbf24' : t.airbase ? '#a78bfa' : '#fcd34d';
    ctx.strokeStyle = '#0a0e14';
    ctx.lineWidth = 2;
    if (t.capital) {
      drawStar(t.x, t.y, 9, 5);
      ctx.fill(); ctx.stroke();
    } else if (t.airbase) {
      ctx.rect(t.x - 7, t.y - 7, 14, 14);
      ctx.fill(); ctx.stroke();
    } else {
      ctx.arc(t.x, t.y, 6, 0, Math.PI * 2);
      ctx.fill(); ctx.stroke();
    }
    ctx.fillStyle = '#fde68a';
    ctx.font = '11px sans-serif';
    ctx.fillText(t.name, t.x, t.y - 12);
  }
}

function drawStar(cx, cy, r, points) {
  ctx.beginPath();
  for (let i = 0; i < points * 2; i++) {
    const ang = (i * Math.PI) / points - Math.PI / 2;
    const rad = i % 2 === 0 ? r : r * 0.45;
    const x = cx + Math.cos(ang) * rad, y = cy + Math.sin(ang) * rad;
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  }
  ctx.closePath();
}

function drawCoverage() {
  for (const d of state.defenses) {
    const c = CATALOG[d.key];
    if (c.kind === 'radar') {
      ctx.beginPath();
      ctx.arc(d.x, d.y, c.detection, 0, Math.PI * 2);
      ctx.fillStyle = c.color + '15';
      ctx.fill();
      ctx.strokeStyle = c.color + '88';
      ctx.setLineDash([4, 6]);
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.setLineDash([]);
    } else if (c.kind === 'battery') {
      ctx.beginPath();
      ctx.arc(d.x, d.y, c.maxRange, 0, Math.PI * 2);
      ctx.fillStyle = c.color + '18';
      ctx.fill();
      ctx.strokeStyle = c.color + 'cc';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      if (c.minRange > 5) {
        ctx.beginPath();
        ctx.arc(d.x, d.y, c.minRange, 0, Math.PI * 2);
        ctx.strokeStyle = c.color + '66';
        ctx.setLineDash([3, 3]);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }
  }
}

function drawDefenses() {
  for (const d of state.defenses) {
    const c = CATALOG[d.key];
    const depleted = c.kind === 'battery' && d.ammo <= 0;

    // Reaction-time preparation indicator: prominent filling ring around the battery
    if (d.prepareTarget != null && state.simElapsed < d.prepareUntil) {
      const progress = 1 - (d.prepareUntil - state.simElapsed) / c.reactionTime;
      // Detect "extended" mode: target currently outside this battery's range
      const tgt = state.threats.find(x => x.id === d.prepareTarget);
      const extended = tgt && Math.hypot(tgt.x - d.x, tgt.y - d.y) > c.maxRange;
      const haloCol = extended ? '#06b6d4' : '#fbbf24';

      const RING_R = 26;

      // Background full ring (shows where the progress will fill)
      ctx.beginPath();
      ctx.arc(d.x, d.y, RING_R, 0, Math.PI * 2);
      ctx.strokeStyle = haloCol + '30';
      ctx.lineWidth = 5;
      ctx.stroke();

      // Filling progress arc
      ctx.beginPath();
      ctx.arc(d.x, d.y, RING_R, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * progress);
      ctx.strokeStyle = haloCol;
      ctx.lineWidth = 5;
      ctx.lineCap = 'round';
      ctx.stroke();
      ctx.lineCap = 'butt';

      // Pulsing outer halo
      ctx.beginPath();
      ctx.arc(d.x, d.y, RING_R + 6 + Math.sin(state.simElapsed * 8) * 2, 0, Math.PI * 2);
      ctx.strokeStyle = haloCol + '66';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Countdown label above the battery
      const remaining = (d.prepareUntil - state.simElapsed).toFixed(1);
      ctx.font = 'bold 11px ui-monospace, monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const txt = `RT ${remaining}s`;
      const tw = ctx.measureText(txt).width;
      ctx.fillStyle = 'rgba(8, 12, 22, 0.92)';
      ctx.fillRect(d.x - tw/2 - 4, d.y - RING_R - 16, tw + 8, 14);
      ctx.fillStyle = haloCol;
      ctx.fillText(txt, d.x, d.y - RING_R - 9);
      ctx.textBaseline = 'alphabetic';

      // Dashed line battery → tracked threat when in extended mode
      if (extended && tgt) {
        ctx.beginPath();
        ctx.moveTo(d.x, d.y);
        ctx.lineTo(tgt.x, tgt.y);
        ctx.strokeStyle = 'rgba(6, 182, 212, 0.5)';
        ctx.setLineDash([4, 4]);
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }

    ctx.save();
    if (depleted) ctx.globalAlpha = 0.35;
    ctx.translate(d.x, d.y);
    ctx.fillStyle = c.color;
    ctx.strokeStyle = '#0a0e14';
    ctx.lineWidth = 2;
    if (c.kind === 'radar') {
      // dish
      ctx.beginPath();
      ctx.arc(0, 0, 9, 0, Math.PI * 2);
      ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#0a0e14';
      ctx.fillRect(-1, -9, 2, 5);
    } else {
      // battery: hex
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2 - Math.PI / 2;
        const x = Math.cos(a) * 11, y = Math.sin(a) * 11;
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 9px sans-serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(c.short, 0, 0.5);
    }
    ctx.restore();

    // Short label below
    ctx.fillStyle = depleted ? '#7e91a8' : '#d6e0f0';
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(c.short, d.x, d.y + 24);

    // Ammo counter pill (only for batteries)
    if (c.kind === 'battery') {
      const txt = depleted ? 'EMPTY' : `▮ ${d.ammo}/${c.ammo}`;
      let bgColor, fgColor;
      if (depleted)              { bgColor = '#6b1e2a'; fgColor = '#fca5a5'; }
      else if (d.ammo / c.ammo > 0.5) { bgColor = '#1e6b3e'; fgColor = '#86efac'; }
      else if (d.ammo / c.ammo > 0.25){ bgColor = '#8a5a1c'; fgColor = '#fcd34d'; }
      else                            { bgColor = '#9c2d3e'; fgColor = '#fca5a5'; }

      ctx.font = 'bold 11px ui-monospace, monospace';
      const tw = ctx.measureText(txt).width;
      const padX = 6, padY = 2;
      const bx = d.x - tw/2 - padX;
      const by = d.y + 30;
      const bw = tw + padX*2;
      const bh = 14 + padY;
      ctx.fillStyle = bgColor;
      ctx.strokeStyle = fgColor;
      ctx.lineWidth = 1.5;
      if (ctx.roundRect) {
        ctx.beginPath(); ctx.roundRect(bx, by, bw, bh, 8); ctx.fill(); ctx.stroke();
      } else {
        ctx.fillRect(bx, by, bw, bh);
        ctx.strokeRect(bx, by, bw, bh);
      }
      ctx.fillStyle = fgColor;
      ctx.textBaseline = 'middle';
      ctx.fillText(txt, d.x, by + bh/2);
      ctx.textBaseline = 'alphabetic';
    }
  }
}

function drawThreatPaths() {
  for (const t of state.threats) {
    if (t.status === 'destroyed') continue;
    ctx.beginPath();
    ctx.moveTo(t.sx, t.sy);
    ctx.lineTo(t.tx, t.ty);
    ctx.strokeStyle = 'rgba(251, 191, 36, 0.25)';
    ctx.setLineDash([5, 6]);
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.setLineDash([]);
  }
}

function drawThreats() {
  for (const t of state.threats) {
    const c = CATALOG[t.key];
    if (t.status === 'destroyed') continue;
    ctx.save();
    ctx.translate(t.x, t.y);
    const ang = Math.atan2(t.ty - t.sy, t.tx - t.sx);
    ctx.rotate(ang);
    ctx.fillStyle = c.color;
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 1;
    if (t.key === 'fighter') drawFighter();
    else if (t.key === 'helicopter') drawHelo();
    else drawDrone();
    ctx.restore();

    // Prominent serial label with altitude (pill with battery color)
    const labelText = `${t.label} · Alt ${c.altitude}km`;
    ctx.font = 'bold 11px ui-monospace, "SF Mono", Menlo, monospace';
    const tw = ctx.measureText(labelText).width;
    const padX = 5, padY = 2;
    const bx = t.x - tw/2 - padX;
    const by = t.y + 13;
    const bw = tw + padX*2;
    const bh = 14 + padY;
    ctx.fillStyle = 'rgba(8, 12, 22, 0.92)';
    ctx.strokeStyle = c.color;
    ctx.lineWidth = 1.5;
    if (ctx.roundRect) {
      ctx.beginPath(); ctx.roundRect(bx, by, bw, bh, 7); ctx.fill(); ctx.stroke();
    } else {
      ctx.fillRect(bx, by, bw, bh); ctx.strokeRect(bx, by, bw, bh);
    }
    ctx.fillStyle = c.color;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(labelText, t.x, by + bh/2);
    ctx.textBaseline = 'alphabetic';
  }
}

function drawFighter() {
  ctx.beginPath();
  ctx.moveTo(10, 0); ctx.lineTo(-6, -6); ctx.lineTo(-3, 0); ctx.lineTo(-6, 6);
  ctx.closePath(); ctx.fill(); ctx.stroke();
}
function drawHelo() {
  ctx.beginPath();
  ctx.ellipse(0, 0, 8, 4, 0, 0, Math.PI * 2);
  ctx.fill(); ctx.stroke();
  ctx.strokeStyle = ctx.fillStyle;
  ctx.beginPath(); ctx.moveTo(-12, 0); ctx.lineTo(12, 0); ctx.stroke();
}
function drawDrone() {
  ctx.beginPath();
  ctx.moveTo(8, 0); ctx.lineTo(-4, -5); ctx.lineTo(-4, 5);
  ctx.closePath(); ctx.fill(); ctx.stroke();
}

function drawMissiles() {
  for (const m of state.missiles) {
    ctx.beginPath();
    ctx.moveTo(m.x, m.y);
    const back = 8;
    const dx = m.tx - m.sx, dy = m.ty - m.sy;
    const len = Math.hypot(dx, dy) || 1;
    ctx.lineTo(m.x - (dx / len) * back, m.y - (dy / len) * back);
    ctx.strokeStyle = '#fef3c7';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = '#fbbf24';
    ctx.beginPath(); ctx.arc(m.x, m.y, 2.5, 0, Math.PI * 2); ctx.fill();
  }
}

// Mid-air interception puff - small and quick, yellow-white spark with thin
// orange ring.  Distinct from the larger red ground-impact blast.
function drawExplosions() {
  for (const e of state.explosions) {
    const k = e.t / e.dur;
    const a = 1 - k;
    // Thin orange ring expanding
    ctx.beginPath();
    ctx.arc(e.x, e.y, e.r * (0.5 + k * 1.4), 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(251, 191, 36, ${a * 0.7})`;
    ctx.lineWidth = 1.5;
    ctx.stroke();
    // Bright yellow-white core
    ctx.beginPath();
    ctx.arc(e.x, e.y, e.r * 0.7 * a, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255, 255, 200, ${a})`;
    ctx.fill();
  }
}

function triggerTargetHit(t) {
  if (t.key === 'helicopter') {
    // Helicopter touchdown: troops disembark and run outward.  Combined with
    // a large rising smoke column + scorched ground so it's unmistakable
    // that the strategic site was breached.
    const peopleCount = 7 + Math.floor(Math.random() * 3);   // 7-9 soldiers
    const people = [];
    for (let i = 0; i < peopleCount; i++) {
      const angle = (i / peopleCount) * Math.PI * 2 + (Math.random() - 0.5) * 0.6;
      people.push({
        angle,
        distance: 0,
        speed: 18 + Math.random() * 14,
        bob: 0
      });
    }
    // Pre-spawn a sequence of smoke puffs so the column rises continuously
    const puffs = [];
    for (let i = 0; i < 8; i++) {
      puffs.push({
        bornAt: i * 0.35,
        offsetX: (Math.random() - 0.5) * 12
      });
    }
    state.targetHits.push({
      type: 'paratroopers',
      x: t.x, y: t.y,
      people, puffs, t: 0, dur: 4.5
    });
  } else {
    // Strategic-target ground impact - large bright-red blast
    state.targetHits.push({
      type: 'explosion',
      x: t.x, y: t.y,
      r: t.key === 'fighter' ? 44 : 30,
      t: 0, dur: 2.4
    });
  }
}

function drawTargetHits() {
  for (const e of state.targetHits) {
    if (e.type === 'explosion') {
      drawTargetExplosion(e);
    } else if (e.type === 'paratroopers') {
      drawParatroopers(e);
    }
  }
}

// Strategic-target ground impact - large, bright red blast.  Visually
// distinct from the small yellow-white mid-air interception puff.
function drawTargetExplosion(e) {
  const k = e.t / e.dur;
  const fade = 1 - k;

  // Outer red shockwave - largest and loudest
  ctx.beginPath();
  ctx.arc(e.x, e.y, e.r * (1 + k * 2.5), 0, Math.PI * 2);
  ctx.fillStyle = `rgba(220, 38, 38, ${fade * 0.55})`;
  ctx.fill();

  // Mid-ring saturated red
  ctx.beginPath();
  ctx.arc(e.x, e.y, e.r * (0.65 + k * 1.4), 0, Math.PI * 2);
  ctx.fillStyle = `rgba(239, 68, 68, ${fade * 0.85})`;
  ctx.fill();

  // Hot orange-red core
  ctx.beginPath();
  ctx.arc(e.x, e.y, e.r * (0.35 + k * 0.9), 0, Math.PI * 2);
  ctx.fillStyle = `rgba(255, 90, 60, ${fade * 0.95})`;
  ctx.fill();

  // White-hot heart of the blast
  ctx.beginPath();
  ctx.arc(e.x, e.y, e.r * 0.5 * fade, 0, Math.PI * 2);
  ctx.fillStyle = `rgba(255, 250, 230, ${fade})`;
  ctx.fill();

  // Dark crimson smoke ring after the flash
  if (k > 0.35) {
    const smokeFade = (1 - k) * 0.7;
    ctx.beginPath();
    ctx.arc(e.x, e.y, e.r * (1.3 + k * 1.7), 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(70, 18, 18, ${smokeFade})`;
    ctx.lineWidth = 5;
    ctx.stroke();
  }

  // Glowing red debris specks
  if (k < 0.65) {
    ctx.fillStyle = `rgba(220, 60, 60, ${fade})`;
    for (let i = 0; i < 12; i++) {
      const ang = (i / 12) * Math.PI * 2 + k * 0.7;
      const d = e.r * (0.5 + k * 2.2);
      ctx.beginPath();
      ctx.arc(e.x + Math.cos(ang) * d, e.y + Math.sin(ang) * d, 1.8, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function drawParatroopers(e) {
  const k = e.t / e.dur;
  const fade = k > 0.85 ? 1 - (k - 0.85) / 0.15 : 1;

  // 1. Scorched ground patch - persistent dark mark on the strategic target
  const groundFade = Math.min(1, e.t / 0.4) * fade;
  const grad = ctx.createRadialGradient(e.x, e.y, 2, e.x, e.y, 18);
  grad.addColorStop(0, `rgba(20, 12, 8, ${groundFade * 0.85})`);
  grad.addColorStop(1, `rgba(20, 12, 8, 0)`);
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(e.x, e.y, 20, 0, Math.PI * 2);
  ctx.fill();

  // 2. Initial impact flash - quick orange burst when the helo touches down
  if (e.t < 0.45) {
    const f = 1 - e.t / 0.45;
    ctx.beginPath();
    ctx.arc(e.x, e.y, 14 + e.t * 24, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255, 170, 60, ${f * 0.7})`;
    ctx.fill();
    ctx.beginPath();
    ctx.arc(e.x, e.y, 9 * f, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255, 240, 200, ${f})`;
    ctx.fill();
  }

  // 3. Flickering flames at the base
  if (e.t > 0.2 && k < 0.92) {
    const flicker = 0.6 + Math.sin(e.t * 30) * 0.25;
    ctx.beginPath();
    ctx.arc(e.x, e.y - 4, 6 + Math.sin(e.t * 25) * 1.5, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255, 130, 50, ${flicker * fade * 0.95})`;
    ctx.fill();
    ctx.beginPath();
    ctx.arc(e.x - 4, e.y - 1, 4 + Math.cos(e.t * 28) * 1, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255, 90, 30, ${flicker * fade * 0.8})`;
    ctx.fill();
    ctx.beginPath();
    ctx.arc(e.x + 5, e.y - 3, 4 + Math.sin(e.t * 35) * 1.2, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255, 160, 60, ${flicker * fade * 0.85})`;
    ctx.fill();
  }

  // 4. Rising smoke column - big billowing puffs that climb and grow
  if (e.puffs) {
    for (const p of e.puffs) {
      const age = e.t - p.bornAt;
      if (age <= 0 || age > 3.5) continue;
      const ageK = age / 3.5;
      const py = e.y - age * 22;
      const drift = Math.sin(age * 1.2 + p.offsetX) * 6;
      const r = 10 + ageK * 28;
      const alpha = (1 - ageK) * 0.65 * fade;
      // Outer dark smoke
      ctx.beginPath();
      ctx.arc(e.x + p.offsetX + drift, py, r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(45, 38, 35, ${alpha})`;
      ctx.fill();
      // Lighter inner highlight (lit from below by flames)
      ctx.beginPath();
      ctx.arc(e.x + p.offsetX + drift, py + r * 0.2, r * 0.6, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(135, 120, 110, ${alpha * 0.65})`;
      ctx.fill();
      // Hot edge tint when puff is fresh
      if (ageK < 0.25) {
        ctx.beginPath();
        ctx.arc(e.x + p.offsetX + drift, py + r * 0.3, r * 0.35, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(220, 130, 60, ${alpha * 0.5})`;
        ctx.fill();
      }
    }
  }

  // 5. Soldier figures running outward
  for (const p of e.people) {
    const px = e.x + Math.cos(p.angle) * p.distance;
    const py = e.y + Math.sin(p.angle) * p.distance + (p.bob || 0);
    drawSoldier(px, py, fade);
  }

  // 6. "BASE BREACHED" warning label early in the effect
  if (e.t < 1.6) {
    const labelFade = e.t < 0.2 ? e.t / 0.2 : (e.t > 1.3 ? 1 - (e.t - 1.3) / 0.3 : 1);
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const txt = '⚠ אתר נפגע';
    const tw = ctx.measureText(txt).width;
    ctx.fillStyle = `rgba(8, 12, 22, ${labelFade * 0.92})`;
    ctx.fillRect(e.x - tw/2 - 5, e.y + 24, tw + 10, 16);
    ctx.fillStyle = `rgba(252, 165, 165, ${labelFade})`;
    ctx.fillText(txt, e.x, e.y + 32);
    ctx.textBaseline = 'alphabetic';
  }
}

function drawSoldier(x, y, alpha) {
  const a = alpha != null ? alpha : 1;
  ctx.save();
  ctx.globalAlpha = a;
  // Helmet
  ctx.fillStyle = '#3a4a35';
  ctx.beginPath();
  ctx.arc(x, y - 5, 1.8, 0, Math.PI * 2);
  ctx.fill();
  // Body / uniform
  ctx.strokeStyle = '#2d3b28';
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(x, y - 3);
  ctx.lineTo(x, y + 1);
  ctx.stroke();
  // Arms (slight asymmetric for run motion)
  ctx.beginPath();
  ctx.moveTo(x - 2, y - 1);
  ctx.lineTo(x + 2, y - 2);
  ctx.stroke();
  // Legs spread (running)
  ctx.beginPath();
  ctx.moveTo(x, y + 1);
  ctx.lineTo(x - 1.8, y + 4);
  ctx.moveTo(x, y + 1);
  ctx.lineTo(x + 1.8, y + 4);
  ctx.stroke();
  ctx.restore();
}

function drawHUD() {
  if (state.mode === 'sim') {
    ctx.fillStyle = 'rgba(95, 168, 211, 0.9)';
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(`Simulation time: ${state.simElapsed.toFixed(1)} s`, W - 12, 24);
  }
  if (state.budget) {
    ctx.fillStyle = 'rgba(251, 191, 36, 0.9)';
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText('Defense Challenge Active', W - 12, 44);
  }
}

// =============================================================
// סימולציה
// =============================================================
function startSim() {
  if (state.threats.length === 0) {
    setStatus('אין איומים להפעיל - הוסף איומים בצד אדום');
    return;
  }
  state.mode = 'sim';
  state.simElapsed = 0;
  state.missiles = []; state.explosions = []; state.targetHits = [];
  state.history = [];
  state.scrubTime = null;
  document.getElementById('scrubber-row').style.display = 'none';
  // reset threats and defenses
  for (const t of state.threats) {
    t.x = t.sx; t.y = t.sy; t.status = 'inflight'; t.hitBy = null;
    t.firedAt = 0; t.missedBy = [];
  }
  for (const d of state.defenses) {
    const c = CATALOG[d.key];
    d.ammo = c.ammo; d.cd = 0;
    d.prepareTarget = null;
    d.prepareUntil = 0;
  }
  document.getElementById('simulate').style.display = 'none';
  document.getElementById('stop').style.display = '';
  hideBanner();
  setStatus('סימולציה פעילה...');
}

function stopSim() {
  state.mode = 'idle';
  document.getElementById('simulate').style.display = '';
  document.getElementById('stop').style.display = 'none';
  setStatus('סימולציה נעצרה');
}

function tick(dt) {
  state.simElapsed += dt;

  // 1. Advance threats
  for (const t of state.threats) {
    if (t.status !== 'inflight') continue;
    const c = CATALOG[t.key];
    const dx = t.tx - t.x, dy = t.ty - t.y;
    const dist = Math.hypot(dx, dy);
    const step = c.speed * dt;
    if (dist <= step) {
      t.x = t.tx; t.y = t.ty;
      if (t.status !== 'reached') triggerTargetHit(t);
      t.status = 'reached';
    } else {
      t.x += (dx / dist) * step;
      t.y += (dy / dist) * step;
    }
  }

  // 2. Cooldowns
  for (const d of state.defenses) if (d.cd > 0) d.cd -= dt;

  // 3a. Resolve completed preparations - launch missiles whose reactionTime elapsed
  for (const d of state.defenses) {
    if (d.prepareTarget == null) continue;
    if (state.simElapsed < d.prepareUntil) continue;
    const target = state.threats.find(t => t.id === d.prepareTarget);
    if (target && target.status === 'inflight') {
      fireMissile(d, target);
    }
    // If threat reached its target during preparation, the diagnose engine
    // will pick this up via the geometric simulation (flight-time miss)
    d.prepareTarget = null;
    d.prepareUntil = 0;
  }

  // 3b. Start new preparations - each idle battery commits to a target
  for (const d of state.defenses) {
    const c = CATALOG[d.key];
    if (c.kind !== 'battery') continue;
    if (d.cd > 0 || d.ammo <= 0) continue;
    if (d.prepareTarget != null) continue;  // already preparing
    const target = pickEngagementTarget(d);
    if (target) {
      d.prepareTarget = target.id;
      d.prepareUntil = state.simElapsed + c.reactionTime;
    }
  }

  // 4. Update missiles
  for (const m of state.missiles) {
    m.t += dt;
    const k = Math.min(1, m.t / m.dur);
    m.x = m.sx + (m.tx - m.sx) * k;
    m.y = m.sy + (m.ty - m.sy) * k;
    if (k >= 1 && !m.resolved) {
      m.resolved = true;
      const target = state.threats.find(t => t.id === m.threatId);
      if (target && target.status === 'inflight') {
        if (m.hit) {
          target.status = 'destroyed';
          target.hitBy = m.battery;
          // Smaller, brief mid-air interception puff
          state.explosions.push({ x: target.x, y: target.y, r: 9, t: 0, dur: 0.5 });
        } else {
          target.missedBy.push({ battery: m.battery, reason: m.reason });
          state.explosions.push({ x: m.x + (Math.random()-0.5)*10, y: m.y + (Math.random()-0.5)*10, r: 5, t: 0, dur: 0.35 });
        }
      }
    }
  }
  state.missiles = state.missiles.filter(m => m.t < m.dur + 0.1);

  // 5. Update explosions
  for (const e of state.explosions) e.t += dt;
  state.explosions = state.explosions.filter(e => e.t < e.dur);

  // 5b. Update target-hit effects (explosions on target / paratroopers)
  for (const e of state.targetHits) {
    e.t += dt;
    if (e.type === 'paratroopers') {
      for (const p of e.people) {
        // Run for the first portion of the duration, then settle
        if (e.t < e.dur * 0.7) p.distance += p.speed * dt;
        // Bobbing for run animation
        p.bob = Math.sin(e.t * 12 + p.angle * 5) * 1.2;
      }
    }
  }
  state.targetHits = state.targetHits.filter(e => e.t < e.dur);

  // 6. End condition
  const active = state.threats.filter(t => t.status === 'inflight');
  if (active.length === 0 && state.missiles.length === 0) {
    finishSim();
  }

  // 7. Snapshot for scrubber (every ~0.1s)
  const lastSnap = state.history.length ? state.history[state.history.length - 1].time : -1;
  if (state.simElapsed - lastSnap >= 0.08) {
    state.history.push(captureSnapshot());
  }
}

function pickEngagementTarget(d) {
  const c = CATALOG[d.key];
  let best = null, bestScore = -Infinity;
  for (const t of state.threats) {
    if (t.status !== 'inflight') continue;
    if (alreadyEngaged(t)) continue;
    const tc = CATALOG[t.key];
    if (tc.altitude < c.minAlt || tc.altitude > c.maxAlt) continue;

    const dist = Math.hypot(t.x - d.x, t.y - d.y);
    if (dist < c.minRange) continue;

    // RCS-adjusted effective engagement envelope - low-RCS targets shrink
    // the battery's effective tracking range (radar equation).  The missile
    // envelope is physically the same in both directions (incoming OR
    // receding) but it's tighter for stealthier threats.
    const effMax = effectiveEngagementRange(c, tc);

    if (dist > effMax) {
      // Threat beyond effective engagement range - need cueing from a
      // dedicated standalone radar AND the predicted intercept must
      // still land inside the effective engagement envelope.
      const det = getDetectionInfo(t, d, c, tc);
      if (!det.externalRadar) continue;
      if (!canInterceptInsideRange(t, d, c, tc)) continue;
    }
    // Otherwise the threat is inside the battery's effective engagement
    // envelope - approach direction (incoming or receding) does not matter.

    // Prefer threats closer to important targets
    const target = TARGETS.find(x => x.x === t.tx && x.y === t.ty);
    const value = target ? target.value : 1;
    const distToTarget = Math.hypot(t.tx - t.x, t.ty - t.y);
    const score = value * 100 - distToTarget * 0.1 - dist * 0.05;
    if (score > bestScore) { bestScore = score; best = t; }
  }
  return best;
}

// Detection breakdown for a threat from a specific battery's perspective.
// All radar ranges scale with RCS^(1/4) per the radar equation - low-RCS
// targets are detectable at substantially shorter range.
function getDetectionInfo(t, d, c, tc) {
  const factor = rcsRangeFactor(tc.rcs);
  let organic = false, externalRadar = false;
  // Battery's own organic search radar
  const ownEff = c.maxRange * factor;
  if (Math.hypot(t.x - d.x, t.y - d.y) <= ownEff) organic = true;
  // Standalone radars elsewhere on the map - detection only, doesn't
  // change the missile's physical envelope but extends the battery's
  // effective engagement range when the radar covers ground beyond it.
  for (const od of state.defenses) {
    const oc = CATALOG[od.key];
    if (oc.kind !== 'radar') continue;
    const eff = oc.detection * factor;
    if (Math.hypot(t.x - od.x, t.y - od.y) <= eff) {
      externalRadar = true;
      break;
    }
  }
  return { organic, externalRadar };
}

// Strict early-engagement gate.  The battery commits ONLY if the
// predicted lead-pursuit intercept point lands inside its engagement
// envelope (the "missile envelope" - מחוץ לעטפת הטיל המיירט).  This
// prevents wasting missiles on threats that the radar can see but
// the missile cannot physically catch in range.
function canInterceptInsideRange(t, d, c, tc) {
  const fdx = t.tx - t.sx, fdy = t.ty - t.sy;
  const flen = Math.hypot(fdx, fdy) || 1;
  const tvx = fdx / flen, tvy = fdy / flen;
  const launchX = t.x + tvx * tc.speed * c.reactionTime;
  const launchY = t.y + tvy * tc.speed * c.reactionTime;
  let T = Math.hypot(launchX - d.x, launchY - d.y) / c.missileSpeed;
  let ipx = launchX, ipy = launchY;
  for (let i = 0; i < 6; i++) {
    ipx = launchX + tvx * tc.speed * T;
    ipy = launchY + tvy * tc.speed * T;
    T = Math.hypot(ipx - d.x, ipy - d.y) / c.missileSpeed;
  }
  const interceptDist = Math.hypot(ipx - d.x, ipy - d.y);
  // Predicted intercept point MUST be inside the RCS-adjusted envelope
  const effMax = effectiveEngagementRange(c, tc);
  if (interceptDist < c.minRange || interceptDist > effMax) return false;
  const remaining = Math.hypot(t.tx - t.x, t.ty - t.y) / tc.speed;
  if (c.reactionTime + T > remaining) return false;
  return true;
}

function alreadyEngaged(t) {
  if (state.missiles.some(m => m.threatId === t.id && !m.resolved)) return true;
  if (state.defenses.some(d => d.prepareTarget === t.id)) return true;
  return false;
}

function isDetected(t) {
  const tc = CATALOG[t.key];
  // each radar/battery's organic radar checks RCS-modified range
  for (const d of state.defenses) {
    const c = CATALOG[d.key];
    const range = c.kind === 'radar' ? c.detection : c.maxRange;
    const effective = range * (0.6 + 0.4 * tc.rcs); // small RCS reduces detection
    if (Math.hypot(t.x - d.x, t.y - d.y) <= effective) return true;
  }
  return false;
}

function fireMissile(d, t) {
  const c = CATALOG[d.key];
  const tc = CATALOG[t.key];
  d.cd = c.reload; d.ammo--;
  t.firedAt++;

  // Threat velocity unit vector (along its straight path to target)
  const fdx = t.tx - t.sx, fdy = t.ty - t.sy;
  const flen = Math.hypot(fdx, fdy) || 1;
  const tvx = fdx / flen, tvy = fdy / flen;
  const threatSpeed = tc.speed;
  const missileSpeed = c.missileSpeed;

  // Iterative lead-pursuit intercept solution
  let T = Math.hypot(t.x - d.x, t.y - d.y) / missileSpeed;
  let ipx = t.x, ipy = t.y;
  for (let i = 0; i < 6; i++) {
    ipx = t.x + tvx * threatSpeed * T;
    ipy = t.y + tvy * threatSpeed * T;
    T = Math.hypot(ipx - d.x, ipy - d.y) / missileSpeed;
  }

  // Time threat will reach its target
  const threatTimeToTarget = Math.hypot(t.tx - t.x, t.ty - t.y) / threatSpeed;

  let outcome;  // 'hit' | 'flight-time' | 'out-of-range' | 'tangent' | 'statistical'

  // Rule 1: missile flight time exceeds threat's remaining time → too late
  if (T > threatTimeToTarget) {
    outcome = 'flight-time';
    // Visualize chase even though it fails: missile stops where threat would have been
    ipx = t.x + tvx * threatSpeed * threatTimeToTarget;
    ipy = t.y + tvy * threatSpeed * threatTimeToTarget;
  }
  // Rule 2: predicted intercept point exits the RCS-adjusted envelope
  else if (Math.hypot(ipx - d.x, ipy - d.y) > effectiveEngagementRange(c, tc)) {
    outcome = 'out-of-range';
  }
  // Rule 3: tangent crossing - threat moving (near-)perpendicular to battery LOS at intercept
  else {
    const btx = ipx - d.x, bty = ipy - d.y;
    const blen = Math.hypot(btx, bty) || 1;
    const cosAng = (btx / blen) * tvx + (bty / blen) * tvy;
    if (Math.abs(cosAng) < 0.15) {
      outcome = 'tangent';
    }
    // Rule 4: statistical hit-rate roll
    else if (Math.random() < c.hitRate) {
      outcome = 'hit';
    } else {
      outcome = 'statistical';
    }
  }

  state.missiles.push({
    sx: d.x, sy: d.y, x: d.x, y: d.y,
    tx: ipx, ty: ipy, t: 0, dur: Math.max(0.4, T),
    hit: outcome === 'hit',
    reason: outcome,
    threatId: t.id, battery: c.name, resolved: false
  });
}

function finishSim() {
  state.mode = 'idle';
  document.getElementById('simulate').style.display = '';
  document.getElementById('stop').style.display = 'none';
  // Capture a final snapshot so the scrubber can land exactly at the end
  state.history.push(captureSnapshot());
  // Show scrubber set to the end of the timeline
  const total = state.simElapsed;
  const slider = document.getElementById('scrubber');
  slider.min = 0;
  slider.max = total;
  slider.step = Math.max(0.05, total / 400);
  slider.value = total;
  document.getElementById('scrubber-total').textContent = total.toFixed(1);
  document.getElementById('scrubber-time').textContent = total.toFixed(1);
  document.getElementById('scrubber-row').style.display = '';
  state.scrubTime = null;  // live until user drags
  computeResults();
  renderResults();

  if (state.results && state.results.objectiveMet !== null) {
    const ok = state.results.objectiveMet;
    if (state.challengeMode === 'attack-challenge') {
      showBanner(ok
        ? `🏆 <u>משימת התקפה הושגה!</u><br><span style="font-size:12px;font-weight:400">${state.results.objectiveText}</span>`
        : `✗ <u>משימת התקפה נכשלה</u><br><span style="font-size:12px;font-weight:400">לא הושגו תנאי הניצחון: ${state.results.objectiveText}</span>`,
        ok ? 'success' : 'failure');
    } else if (state.challengeMode === 'defense-challenge') {
      showBanner(ok
        ? `🏆 <u>משימת הגנה הושגה!</u><br><span style="font-size:12px;font-weight:400">${state.results.objectiveText}</span>`
        : `✗ <u>משימת הגנה נכשלה</u><br><span style="font-size:12px;font-weight:400">תנאי הניצחון לא הושג: ${state.results.objectiveText}</span>`,
        ok ? 'success' : 'failure');
    }
  } else if (state.challengeMode === 'auto-attack' && state.results) {
    const breachRate = state.results.survived / state.results.total;
    if (breachRate >= 0.5) showBanner(`התקפה הצליחה: ${state.results.survived} איומים פרצו`, 'failure');
    else showBanner(`הגנה החזיקה: ${state.results.killed}/${state.results.total} יורטו`, 'success');
  }
  setStatus('סימולציה הסתיימה');
  showResultsModal();
}

function showResultsModal() {
  if (!state.results) return;
  const r = state.results;
  const modal = document.getElementById('modal');
  const body = document.getElementById('modal-body');

  const isAttack = state.challengeMode === 'attack-challenge';
  const score = r.protectedValue / r.totalValue;
  const damageScore = 1 - score;

  // Build the verdict from the explicit mission objective when one is defined
  let verdictCls, verdictText;
  if (r.objectiveMet !== null && r.objectiveText) {
    if (isAttack) {
      verdictCls = r.objectiveMet ? 'success' : 'failure';
      const headline = r.objectiveMet
        ? `🏆 משימת התקפה הושגה - ניצחת את ההגנה!`
        : `✗ משימת התקפה נכשלה - ההגנה החזיקה`;
      verdictText = `${headline}<br><span style="font-size:12px;font-weight:400;color:#7e91a8">תנאי ניצחון: ${r.objectiveText}</span>`;
    } else {
      verdictCls = r.objectiveMet ? 'success' : 'failure';
      const headline = r.objectiveMet
        ? `🏆 משימת הגנה הושגה - הצלחת לבלום את התקיפה!`
        : `✗ משימת הגנה נכשלה - היעד שהוגדר נפגע`;
      verdictText = `${headline}<br><span style="font-size:12px;font-weight:400;color:#7e91a8">תנאי ניצחון: ${r.objectiveText}</span>`;
    }
  } else {
    // Free play - keep the protected-value verdict
    if (score >= 0.85) { verdictCls = 'success'; verdictText = `🛡 הגנה מצוינת - ${(score*100).toFixed(0)}% מהערך האסטרטגי הוגן`; }
    else if (score >= 0.5) { verdictCls = 'partial'; verdictText = `⚠ הגנה חלקית - ${(score*100).toFixed(0)}% הוגן`; }
    else { verdictCls = 'failure'; verdictText = `✗ כישלון - רק ${(score*100).toFixed(0)}% הוגן`; }
  }

  const breachers = r.breakdown.filter(b => b.status === 'reached')
    .sort((a, b) => a.label.localeCompare(b.label));
  const intercepted = r.breakdown.filter(b => b.status === 'destroyed')
    .sort((a, b) => a.label.localeCompare(b.label));

  let breachRows = '';
  for (const b of breachers) {
    breachRows += `
      <tr class="survived">
        <td><span class="serial">${b.label}</span></td>
        <td>${b.type}</td>
        <td>${b.target}</td>
        <td class="reason">${b.reason || '-'}</td>
      </tr>`;
  }
  if (!breachers.length) {
    breachRows = `<tr><td colspan="4" style="text-align:center;color:#5fa86b;padding:14px">✓ אף איום לא חדר את ההגנה</td></tr>`;
  }

  let killRows = '';
  for (const b of intercepted) {
    let priorMisses = '';
    if (b.firedAt > 1 && b.missedBy && b.missedBy.length) {
      const reasons = [...new Set(b.missedBy.map(m => REASON_LABEL[m.reason] || m.reason))];
      priorMisses = ` <span style="color:#7e91a8;font-size:10px">(לאחר ${b.firedAt-1} פספוסים: ${reasons.join(', ')})</span>`;
    }
    killRows += `
      <tr class="destroyed">
        <td><span class="serial">${b.label}</span></td>
        <td>${b.type}</td>
        <td>${b.target}</td>
        <td>${b.hitBy || '-'}${priorMisses}</td>
      </tr>`;
  }
  if (!intercepted.length) {
    killRows = `<tr><td colspan="4" style="text-align:center;color:#d35f5f;padding:14px">לא יורט אף איום</td></tr>`;
  }

  const recs = generateRecommendations(r);
  let recsHtml = '';
  for (const rec of recs) {
    recsHtml += `<li>${rec}</li>`;
  }

  // Theoretical best given the same deployment + threats (no random misses)
  const best = computeBestPossible();
  const yourScore = r.protectedValue;
  const bestScore = best.bestProtectedValue;
  const efficiency = bestScore > 0 ? Math.min(1, yourScore / bestScore) : 1;
  const effPercent = (efficiency * 100).toFixed(0);
  let effClass, effLabel;
  if (efficiency >= 0.9) { effClass = 'success'; effLabel = 'ביצוע אופטימלי כמעט'; }
  else if (efficiency >= 0.7) { effClass = 'partial'; effLabel = 'ביצוע סביר'; }
  else { effClass = 'failure'; effLabel = 'יש מקום לשיפור משמעותי'; }

  // Benchmark from attacker's perspective (damage % achieved vs maximum the
  // defense allowed) when in attack mode; from defender's perspective otherwise
  let benchmarkHtml;
  if (isAttack) {
    const yourDamage = r.totalValue - r.protectedValue;
    const bestPossibleDamage = r.totalValue - best.bestProtectedValue;
    // For the attacker the "best" = least the defense could intercept
    // i.e. maximum damage given current attack threats vs deployed defense
    // computeBestPossible models defender-optimal play. So attacker-best = how
    // much damage even an optimal defense couldn't prevent.
    const attackerEff = bestPossibleDamage > 0
      ? Math.min(1, yourDamage / Math.max(1, r.totalValue - best.bestProtectedValue))
      : (yourDamage > 0 ? 1 : 0);
    const yourPct = (yourDamage / r.totalValue * 100).toFixed(0);
    const bestPct = (bestPossibleDamage / r.totalValue * 100).toFixed(0);
    benchmarkHtml = `
      <div class="results-section-title" style="color:#a78bfa">📊 הביצוע ההתקפי שלך אל מול אופטימום</div>
      <div class="benchmark-grid">
        <div class="benchmark-row">
          <div class="bench-label">נזק שגרמת</div>
          <div class="bench-bar"><div class="bench-fill yours" style="width:${yourPct}%;background:linear-gradient(90deg,#7c2d12,#dc2626)"></div></div>
          <div class="bench-num">${r.survived}/${r.total} פרצו | ${yourDamage}/${r.totalValue} נזק</div>
        </div>
        <div class="benchmark-row">
          <div class="bench-label">נזק תיאורטי מקסימלי</div>
          <div class="bench-bar"><div class="bench-fill best" style="width:${bestPct}%;background:linear-gradient(90deg,#92400e,#f59e0b)"></div></div>
          <div class="bench-num">${r.total - best.bestKilled}/${r.total} פרצו | ${bestPossibleDamage}/${r.totalValue} נזק</div>
        </div>
      </div>
      <div class="modal-verdict partial" style="margin-top:10px">
        🎯 גרמת ל-<b>${(attackerEff*100).toFixed(0)}%</b> מהנזק האפשרי לפי תכנון התקפה אופטימלי<br>
        <span style="font-size:11px;font-weight:400;color:#7e91a8">המקסימום מתאר את הנזק שאפילו הקצאה אופטימלית של ההגנה לא הייתה יכולה למנוע מול האיומים שבחרת ומיקומם.</span>
      </div>
    `;
  } else {
    benchmarkHtml = `
      <div class="results-section-title" style="color:#a78bfa">📊 הביצוע ההגנתי שלך אל מול אופטימום</div>
      <div class="benchmark-grid">
        <div class="benchmark-row">
          <div class="bench-label">הביצוע שלך</div>
          <div class="bench-bar"><div class="bench-fill yours" style="width:${(r.protectedValue/r.totalValue*100).toFixed(0)}%"></div></div>
          <div class="bench-num">${r.killed}/${r.total} | ${r.protectedValue}/${r.totalValue}</div>
        </div>
        <div class="benchmark-row">
          <div class="bench-label">המקסימום האפשרי</div>
          <div class="bench-bar"><div class="bench-fill best" style="width:${(best.bestProtectedValue/best.totalValue*100).toFixed(0)}%"></div></div>
          <div class="bench-num">${best.bestKilled}/${r.total} | ${best.bestProtectedValue}/${best.totalValue}</div>
        </div>
      </div>
      <div class="modal-verdict ${effClass}" style="margin-top:10px">
        🎯 השגת <b>${effPercent}%</b> מהאופטימום - ${effLabel}<br>
        <span style="font-size:11px;font-weight:400;color:#7e91a8">המקסימום מחושב לפי הפריסה הנוכחית, ללא החטאות סטטיסטיות, עם הקצאה אופטימלית של מיירטים.</span>
      </div>
    `;
  }

  // Hit-targets summary line - which strategic targets actually got struck.
  // Visual semantics flip by role:
  //   Attacker: target HIT  = success (green💥),  target intact = failure (red ✗)
  //   Defender: target HIT  = failure (red 💥),   target intact = success (green ✓)
  const hitList = TARGETS.map(t => ({
    name: t.name, value: t.value,
    hit: r.hitTargets && r.hitTargets.has(t.name)
  }));
  const hitTargetsHtml = hitList.map(t => {
    let cls, icon;
    if (isAttack) {
      cls  = t.hit ? 'safe' : 'hit';
      icon = t.hit ? '💥'   : '✗';
    } else {
      cls  = t.hit ? 'hit'  : 'safe';
      icon = t.hit ? '💥'   : '✓';
    }
    return `<span class="target-chip ${cls}">${icon} ${t.name}</span>`;
  }).join('');

  // Three top summary cards differ by mode so the framing matches the player role.
  // For attacker: "breached" is success (green), "lost" is failure (red), "damage
  // dealt" is success (green).  For defender: "intercepted" is success, etc.
  const summaryCardsHtml = isAttack
    ? `
        <div class="stat" style="border-color:#5fa86b">
          <div class="label">איומים שפרצו</div>
          <div class="value" style="color:#5fa86b">${r.survived}/${r.total}</div>
        </div>
        <div class="stat" style="border-color:#d35f5f">
          <div class="label">איומים שאבדו</div>
          <div class="value" style="color:#d35f5f">${r.killed}/${r.total}</div>
        </div>
        <div class="stat" style="border-color:#5fa86b">
          <div class="label">נזק שגרמת</div>
          <div class="value" style="color:#5fa86b">${r.totalValue - r.protectedValue}/${r.totalValue}</div>
        </div>`
    : `
        <div class="stat killed">
          <div class="label">איומים שיורטו</div>
          <div class="value">${r.killed}/${r.total}</div>
        </div>
        <div class="stat survived">
          <div class="label">איומים שחדרו</div>
          <div class="value">${r.survived}/${r.total}</div>
        </div>
        <div class="stat protected">
          <div class="label">ערך אסטרטגי הוגן</div>
          <div class="value">${r.protectedValue}/${r.totalValue}</div>
        </div>`;

  // Section labels depend on the player's role
  const breachLabel = isAttack
    ? `🎯 התקפות מוצלחות שלך (${breachers.length})`
    : `⚠ איומים שחדרו את ההגנה (${breachers.length})`;
  const interceptLabel = isAttack
    ? `💀 איומים שאבדו לאש האויב (${intercepted.length})`
    : `✓ איומים שיורטו (${intercepted.length})`;
  const recsTitle = isAttack ? 'המלצות לשיפור ההתקפה' : 'המלצות לשיפור ההגנה';

  body.innerHTML = `
    <div class="modal-verdict ${verdictCls}">${verdictText}</div>

    <div class="results-section-title" style="color:${isAttack ? '#dc2626' : '#5fa8d3'}">🎯 יעדים אסטרטגיים</div>
    <div class="targets-status">${hitTargetsHtml}</div>

    <div class="modal-summary">${summaryCardsHtml}</div>

    ${benchmarkHtml}

    <div class="results-section-title" style="color:${isAttack ? '#5fa86b' : '#d35f5f'}">${breachLabel}</div>
    <table class="results-table">
      <thead>
        <tr>
          <th>מס׳ סידורי</th>
          <th>סוג איום</th>
          <th>יעד</th>
          <th>${isAttack ? 'איך עברת את ההגנה' : 'סיבת חדירה'}</th>
        </tr>
      </thead>
      <tbody>${breachRows}</tbody>
    </table>

    <div class="results-section-title" style="color:${isAttack ? '#d35f5f' : '#5fa86b'}">${interceptLabel}</div>
    <table class="results-table">
      <thead>
        <tr>
          <th>מס׳ סידורי</th>
          <th>סוג איום</th>
          <th>יעד מקורי</th>
          <th>סוללה מיירטת</th>
        </tr>
      </thead>
      <tbody>${killRows}</tbody>
    </table>

    <div class="results-section-title" style="color:#fbbf24">💡 ${recsTitle}</div>
    <ul class="recommendations">${recsHtml}</ul>
  `;
  modal.classList.add('visible');
}

function generateRecommendations(r) {
  if (state.challengeMode === 'attack-challenge') {
    return generateAttackRecommendations(r);
  }
  return generateDefenseRecommendations(r);
}

function generateDefenseRecommendations(r) {
  const recs = [];
  const survived = r.breakdown.filter(b => b.status === 'reached');

  if (survived.length === 0) {
    if (r.killed === r.total) {
      recs.push('🎯 <b>הגנה מושלמת!</b> כל האיומים יורטו לפי ה-KP של הסוללות. ניתן לבחון הפחתת משאבים בלי לפגוע בכיסוי.');
    }
    return recs;
  }

  // Count threats per the 4 user-defined reason categories - by scanning b.reason text
  const counts = { statistical: 0, tangent: 0, 'flight-time': 0, 'out-of-range': 0 };
  const targetsPerReason = { statistical: [], tangent: [], 'flight-time': [], 'out-of-range': [] };
  const typesPerReason = { statistical: [], tangent: [], 'flight-time': [], 'out-of-range': [] };

  for (const b of survived) {
    if (!b.reason) continue;
    for (const key of Object.keys(REASON_LABEL)) {
      if (b.reason.includes(REASON_LABEL[key])) {
        counts[key]++;
        targetsPerReason[key].push(b.target);
        typesPerReason[key].push(b.type);
      }
    }
  }

  if (counts['out-of-range'] > 0) {
    const tgts = [...new Set(targetsPerReason['out-of-range'])].join(', ');
    recs.push(`📍 <b>${counts['out-of-range']} איומים סווגו "יציאה מטווח"</b> (יעדים: ${tgts}). הסיבה: לא היה כיסוי גאומטרי, גובה הטיסה מחוץ לתקרת הסוללה, או שהאיום עזב את הטווח לפני שהמיירט הגיע. <b>פתרון:</b> פרוס סוללה ארוכת טווח (Patriot 160km / David's Sling 300km / Barak-8 100km) קרוב יותר לציר התקיפה.`);
  }

  if (counts['flight-time'] > 0) {
    const types = [...new Set(typesPerReason['flight-time'])].join(', ');
    recs.push(`⏱ <b>${counts['flight-time']} פספוסים מ"זמן מעוף לא מספיק"</b> - האיום (${types}) הקדים להגיע ליעד לפני שהמיירט מהסוללה הגיע אליו. <b>פתרון:</b> הצב סוללות <u>קרוב יותר לציר התקיפה</u> (פחות מרחק = פחות זמן מעוף), או השתמש במיירט מהיר יותר (David's Sling Mach 7 / Patriot Mach 5).`);
  }

  if (counts['tangent'] > 0) {
    recs.push(`📐 <b>${counts['tangent']} פספוסים מ"חציה משיקית"</b> - האיום נע בניצב לציר הסוללה (עד 15° מהניצב) ברגע היירוט, מצב שבו המיירט לא יכול לפצות. <b>פתרון:</b> מקם סוללות כך שציר ההגעה של האיום יתלכד עם קו הראייה של הסוללה ולא יעמוד בניצב לה.`);
  }

  if (counts['statistical'] > 0) {
    recs.push(`🎲 <b>${counts['statistical']} פספוסים סטטיסטיים</b> - בתחום השונות הנורמלית לפי ה-KP של הסוללה (לדוגמה: SA-8 Gecko יחטיא בממוצע 35% מהירויות). <b>פתרון:</b> <u>הגנה רב-שכבתית</u> - שתי סוללות יורות בזו אחר זו על אותו איום מכפילות את הסבירות לפגיעה (90%+90% = 99%).`);
  }

  // Target-specific hotspot
  const targetDamage = {};
  survived.forEach(b => { targetDamage[b.target] = (targetDamage[b.target] || 0) + 1; });
  const hotTargets = Object.entries(targetDamage)
    .filter(([_, n]) => n >= 2)
    .sort((a, b) => b[1] - a[1]);
  if (hotTargets.length) {
    const [tname, count] = hotTargets[0];
    recs.push(`🔥 <b>${tname} ספג ${count} פגיעות</b> - יעד תחת לחץ מיוחד. בנה סביבו הגנה רב-שכבתית: מכ"ם גילוי + סוללה ארוכת-טווח חיצונית + Iron Dome כ-point-defense.`);
  }

  return recs;
}

// =============================================================
// המלצות שיפור התקפה (במצב אתגר התקפה)
// =============================================================
function generateAttackRecommendations(r) {
  const recs = [];
  const intercepted = r.breakdown.filter(b => b.status === 'destroyed');
  const survivors = r.breakdown.filter(b => b.status === 'reached');
  const breachRate = survivors.length / Math.max(1, r.total);

  if (breachRate >= 0.9) {
    recs.push('🏆 <b>התקפה מרהיבה!</b> ההגנה התמוטטה כמעט לחלוטין. שמור על הטקטיקה - ערב סוגי איומים, פיזור כיוונים, התרכזות ביעדים יקרי-ערך.');
  } else if (breachRate <= 0.15) {
    recs.push('💀 <b>ההתקפה נכשלה</b> - ההגנה החזיקה. במקום לעבור דרך הסוללות, זהה אזורים בלי כיסוי על המפה ושלח שם את רוב האיומים.');
  }

  // Most lethal battery against your attack
  const interByBattery = {};
  for (const b of intercepted) {
    if (b.hitBy) interByBattery[b.hitBy] = (interByBattery[b.hitBy] || 0) + 1;
  }
  const sortedBat = Object.entries(interByBattery).sort((a, b) => b[1] - a[1]);
  if (sortedBat.length && sortedBat[0][1] >= 2) {
    const [batName, count] = sortedBat[0];
    recs.push(`⚠ <b>${batName} יורט ${count} איומים</b> - הסוללה שיירטה הכי הרבה. שלח גלי <u>סטורציה</u> (3+ איומים בו-זמנית מאזור צר) למצות את התחמושת שלה, ואז שלח את האיומים החשובים שלך.`);
  }

  // Threat-type performance comparison
  const allTypes = ['Attack UAV', 'Fighter Jet', 'Attack Helicopter'];
  const typeStats = {};
  for (const type of allTypes) {
    const total = r.breakdown.filter(b => b.type === type).length;
    if (total === 0) continue;
    const surv = survivors.filter(b => b.type === type).length;
    typeStats[type] = { total, surv, rate: surv / total };
  }
  const ts = Object.entries(typeStats);
  if (ts.length >= 2) {
    const sortedT = [...ts].sort((a, b) => b[1].rate - a[1].rate);
    const [bestType, bs] = sortedT[0];
    const [worstType, ws] = sortedT[sortedT.length - 1];
    if (bs.rate - ws.rate > 0.2) {
      recs.push(`✅ <b>${bestType}</b> חדר ב-${(bs.rate*100).toFixed(0)}% מהמקרים - הסוג הכי מוצלח שלך. תכלול אותו כעיקרי בהתקפה הבאה.`);
      recs.push(`✗ <b>${worstType}</b> יורט ב-${((1-ws.rate)*100).toFixed(0)}% - מבוזבז. הקטן את כמותו או השתמש בו רק כפיתיון לסטורציה.`);
    }
  }

  // Target-by-target performance
  const targetStats = TARGETS.map(t => {
    const sent = r.breakdown.filter(b => b.target === t.name).length;
    const surv = survivors.filter(b => b.target === t.name).length;
    return { name: t.name, value: t.value, sent, surv, killed: sent - surv };
  }).filter(t => t.sent > 0);

  const undefended = targetStats.filter(t => t.surv === t.sent && t.sent > 0);
  if (undefended.length) {
    const desc = undefended.map(t => `${t.name} (ערך ${t.value})`).join(', ');
    recs.push(`📍 <b>יעד פרוץ: ${desc}</b> - כל איומיך אליו עברו. בעתיד שלח לכאן יותר Fighters יקרי-ערך כדי למקסם נזק.`);
  }
  const fortified = targetStats.filter(t => t.sent >= 2 && t.surv === 0);
  if (fortified.length) {
    const desc = fortified.map(t => t.name).join(', ');
    recs.push(`🛡 <b>יעד מבוצר: ${desc}</b> - אף איום לא חדר. שלח לכאן רק UAVs זולים כסטורציה למיצוי תחמושת, ושמור Fighters ליעדים פרוצים.`);
  }

  // Altitude/type tactical hints
  const fighterKilled = intercepted.filter(b => b.type === 'Fighter Jet').length;
  const heloKilled = intercepted.filter(b => b.type === 'Attack Helicopter').length;
  const uavKilled = intercepted.filter(b => b.type === 'Attack UAV').length;
  if (fighterKilled >= 2) {
    recs.push('✈ <b>Fighter Jet בגובה 10 ק"מ</b> נחשפים ל-Patriot/David\'s Sling/Barak-8. כדי לעקוף - בחר יעדים שלא מכוסים בסוללות גובה גבוה (בדוק את עיגולי הטווח).');
  }
  if (heloKilled >= 2) {
    recs.push('🚁 <b>Attack Helicopter בגובה 0.8 ק"מ</b> פגיעים ל-Iron Dome ו-SA-8. שלח אותם רק ליעדים מרוחקים מסוללות point-defense.');
  }
  if (uavKilled >= 4) {
    recs.push('◆ <b>הרבה UAVs יורטו</b> - הם איטיים וחשופים. שלח אותם בגלים מרוכזים (סטורציה) במקום בודדים, או נצל אותם רק כפיתיון לפני שיגור Fighters.');
  }

  // Saturation hint based on overall interception rate
  if (intercepted.length / r.total > 0.4) {
    recs.push('💡 <b>סטורציה</b> - הגדל את כמות האיומים בו-זמנית מאותו וקטור. הסוללות מוגבלות בקצב טעינה (0.4-0.8 שנ\') ובתחמושת (3-12 מיירטים) - אם תציף, אחד יעבור.');
  }

  if (recs.length === 0) {
    recs.push('💡 ההתקפה הצליחה ברובה - שמור על הטקטיקה.');
  }

  return recs;
}

function hideModal() {
  document.getElementById('modal').classList.remove('visible');
}

// Theoretical best result with the current placement: every viable engagement succeeds.
// Greedy assignment of one available battery per threat (highest-value targets first).
function computeBestPossible() {
  const ammoLeft = new Map();
  for (const d of state.defenses) {
    if (CATALOG[d.key].kind === 'battery') {
      ammoLeft.set(d.id, CATALOG[d.key].ammo);
    }
  }

  // Sort threats by target value descending (defenders prioritize high-value targets)
  const sorted = [...state.threats].sort((a, b) => {
    const va = (TARGETS.find(x => x.name === a.target) || {}).value || 0;
    const vb = (TARGETS.find(x => x.name === b.target) || {}).value || 0;
    return vb - va;
  });

  let bestKilled = 0;
  let damagedValue = 0;
  const totalValue = TARGETS.reduce((s, t) => s + t.value, 0);

  for (const t of sorted) {
    const tc = CATALOG[t.key];
    let assigned = null;
    // Find any battery that has ammo and can geometrically engage (would hit at 100% KP)
    for (const d of state.defenses) {
      const c = CATALOG[d.key];
      if (c.kind !== 'battery') continue;
      if ((ammoLeft.get(d.id) || 0) <= 0) continue;
      const outcome = simulateEngagementOutcome(t, d, c, tc);
      if (outcome === 'statistical') {
        assigned = d;
        break;
      }
    }
    if (assigned) {
      ammoLeft.set(assigned.id, ammoLeft.get(assigned.id) - 1);
      bestKilled++;
    } else {
      const tg = TARGETS.find(x => x.name === t.target);
      if (tg) damagedValue += tg.value;
    }
  }

  damagedValue = Math.min(damagedValue, totalValue);
  const total = sorted.length;
  return {
    bestKilled,
    bestSurvived: total - bestKilled,
    bestProtectedValue: totalValue - damagedValue,
    totalValue,
    bestProtectedFraction: totalValue > 0 ? (totalValue - damagedValue) / totalValue : 1
  };
}

function computeResults() {
  const total = state.threats.length;
  const killed = state.threats.filter(t => t.status === 'destroyed').length;
  const survived = total - killed;
  const reachedByTarget = {};
  const hitTargets = new Set();
  let totalValue = TARGETS.reduce((s, t) => s + t.value, 0);
  let damagedValue = 0;
  for (const t of state.threats) {
    if (t.status === 'reached') {
      reachedByTarget[t.target] = (reachedByTarget[t.target] || 0) + 1;
      hitTargets.add(t.target);
      const tg = TARGETS.find(x => x.name === t.target);
      if (tg) damagedValue += tg.value;
    }
  }
  damagedValue = Math.min(damagedValue, totalValue);
  const objectiveMet = state.objective ? !!state.objective.check(hitTargets) : null;
  state.results = {
    total, killed, survived,
    byTarget: reachedByTarget,
    hitTargets,
    totalValue, protectedValue: totalValue - damagedValue,
    objectiveMet,
    objectiveText: state.objective ? state.objective.text : null,
    breakdown: state.threats.map(t => ({
      label: t.label,
      type: CATALOG[t.key].name,
      target: t.target,
      status: t.status,
      hitBy: t.hitBy,
      reason: t.status === 'reached' ? diagnoseFailure(t) : null,
      firedAt: t.firedAt,
      missedBy: t.missedBy
    }))
  };
}

// Classify EVERY surviving threat into exactly one of the 4 user-defined miss categories:
//   statistical | flight-time | out-of-range | tangent
function diagnoseFailure(t) {
  // Case A: threat WAS engaged - report grouped miss reasons by battery
  if (t.firedAt > 0) {
    const byReason = {};
    for (const miss of t.missedBy) {
      const key = miss.reason;
      if (!byReason[key]) byReason[key] = [];
      byReason[key].push(miss.battery);
    }
    const parts = [];
    for (const reason of Object.keys(byReason)) {
      const batteries = [...new Set(byReason[reason])].join(', ');
      parts.push(`<b>${REASON_LABEL[reason] || reason}</b> [${batteries}]`);
    }
    return `נורו ${t.firedAt} טילי יירוט וכולם פספסו: ${parts.join(' • ')}`;
  }

  // Case B: threat was never engaged - simulate engagement physics for each battery
  const tc = CATALOG[t.key];
  const candidates = [];

  for (const d of state.defenses) {
    const c = CATALOG[d.key];
    if (c.kind !== 'battery') continue;
    candidates.push({ battery: c.short, reason: simulateEngagementOutcome(t, d, c, tc) });
  }

  // Pick the best (most specific) reason: prefer statistical > tangent > flight-time > out-of-range
  if (!candidates.length) {
    return `<b>${REASON_LABEL['out-of-range']}</b> - אין סוללה כלשהי במפה`;
  }
  const priority = ['statistical', 'tangent', 'flight-time', 'out-of-range'];
  for (const p of priority) {
    const list = candidates.filter(x => x.reason === p);
    if (list.length) {
      const batteries = [...new Set(list.map(x => x.battery))].join(', ');
      return `<b>${REASON_LABEL[p]}</b> [${batteries}]`;
    }
  }
  return `<b>${REASON_LABEL['out-of-range']}</b>`;
}

// Closest approach point on threat path to a battery
function closestApproachOnPath(t, d) {
  const dx = t.tx - t.sx, dy = t.ty - t.sy;
  const len2 = dx*dx + dy*dy || 1;
  let k = ((d.x - t.sx) * dx + (d.y - t.sy) * dy) / len2;
  k = Math.max(0, Math.min(1, k));
  return { x: t.sx + k * dx, y: t.sy + k * dy };
}

// Walk the engagement physics for a virtual fire.  Returns a 4-reason classification.
function simulateEngagementOutcome(t, d, c, tc) {
  // 1. Altitude envelope
  if (tc.altitude < c.minAlt || tc.altitude > c.maxAlt) return 'out-of-range';

  // RCS-adjusted effective engagement range
  const effMax = effectiveEngagementRange(c, tc);

  // 2. Path geometry vs effective range circle
  const dx = t.tx - t.sx, dy = t.ty - t.sy;
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len, uy = dy / len;
  const proj = (d.x - t.sx) * ux + (d.y - t.sy) * uy;
  const cdx = (t.sx + proj * ux) - d.x;
  const cdy = (t.sy + proj * uy) - d.y;
  const closestDist = Math.hypot(cdx, cdy);
  if (closestDist > effMax) return 'out-of-range';

  // 3. In-range chord and entry/exit times along the path
  const halfChord = Math.sqrt(effMax*effMax - closestDist*closestDist);
  const entryDist = Math.max(0, proj - halfChord);
  const exitDist  = Math.min(len, proj + halfChord);
  const inRangeTime = (exitDist - entryDist) / tc.speed;
  if (c.reactionTime > inRangeTime) return 'flight-time';

  // 4. Battery commits at entry, missile launches after reactionTime
  const launchTimeFromEntry = c.reactionTime;
  const launchX = t.sx + ux * (entryDist + tc.speed * launchTimeFromEntry);
  const launchY = t.sy + uy * (entryDist + tc.speed * launchTimeFromEntry);

  // 5. Iterative lead-pursuit intercept
  let T = Math.hypot(launchX - d.x, launchY - d.y) / c.missileSpeed;
  let ipx = launchX, ipy = launchY;
  for (let i = 0; i < 6; i++) {
    ipx = launchX + ux * tc.speed * T;
    ipy = launchY + uy * tc.speed * T;
    T = Math.hypot(ipx - d.x, ipy - d.y) / c.missileSpeed;
  }

  // 6. Threat may reach its target before missile arrives
  const remaining = Math.hypot(t.tx - launchX, t.ty - launchY) / tc.speed;
  if (T > remaining) return 'flight-time';

  // 7. Intercept point may be outside effective range
  if (Math.hypot(ipx - d.x, ipy - d.y) > effMax) return 'out-of-range';

  // 8. Tangent crossing at intercept (within 15% of perpendicular)
  const btx = ipx - d.x, bty = ipy - d.y;
  const blen = Math.hypot(btx, bty) || 1;
  const cosAng = (btx / blen) * ux + (bty / blen) * uy;
  if (Math.abs(cosAng) < 0.15) return 'tangent';

  // 9. Engagement was viable - this is a statistical miss
  return 'statistical';
}

function segmentIntersectsCircle(x1, y1, x2, y2, cx, cy, r) {
  const dx = x2 - x1, dy = y2 - y1;
  const len2 = dx*dx + dy*dy || 1;
  let k = ((cx - x1) * dx + (cy - y1) * dy) / len2;
  k = Math.max(0, Math.min(1, k));
  const px = x1 + k * dx, py = y1 + k * dy;
  return Math.hypot(px - cx, py - cy) <= r;
}

function renderResults() {
  const el = document.getElementById('results');
  if (!state.results) {
    el.innerHTML = '<div class="placeholder">טרם בוצעה סימולציה</div>';
    return;
  }
  const r = state.results;
  let html = `
    <div class="summary">
      <div class="stat killed"><div class="label">יורטו</div><div class="value">${r.killed}/${r.total}</div></div>
      <div class="stat survived"><div class="label">פרצו ליעד</div><div class="value">${r.survived}/${r.total}</div></div>
    </div>
    <div class="stat" style="grid-column:span 2;margin-bottom:6px">
      <div class="label">ערך אסטרטגי שהוגן</div>
      <div class="value" style="color:${r.protectedValue/r.totalValue >= 0.7 ? '#5fa86b' : '#d35f5f'}">${r.protectedValue}/${r.totalValue}</div>
    </div>
    <ul>`;
  for (const b of r.breakdown) {
    const cls = b.status === 'destroyed' ? 'destroyed' : 'survived';
    const txt = b.status === 'destroyed' ? `יורט ע"י ${b.hitBy || '-'}` : `→ ${b.target}`;
    html += `<li class="${cls}"><span><b style="color:#fbbf24">${b.label}</b> ${b.type}</span><span>${txt}</span></li>`;
  }
  html += '</ul><button id="show-modal" style="width:100%;margin-top:8px;padding:6px;background:#2a4571;border:1px solid #4a6b9c;border-radius:4px;color:#d6e0f0;cursor:pointer;font-family:inherit">📋 הצג טבלת תוצאות מפורטת</button>';
  el.innerHTML = html;
  const btn = document.getElementById('show-modal');
  if (btn) btn.addEventListener('click', showResultsModal);
}

// =============================================================
// אתגר התקפה - המערכת פורסת הגנה, המשתמש פורס איומים בתקציב
// =============================================================
function startAttackChallenge(difficulty) {
  resetAll();
  const profile = ATTACK_DIFFICULTY[difficulty];
  if (!profile) return;

  state.attackChallenge = true;
  state.challengeMode = 'attack-challenge';
  state.challengeDifficulty = difficulty;
  state.threatBudget = { ...profile.threatBudget };
  state.objective = profile.objective;

  // System auto-deploys defenses according to the difficulty profile.
  // Anchors are resolved against the *current* (randomized) target layout.
  for (const item of profile.defenses) {
    const pos = resolveAnchor(item);
    state.defenses.push({
      id: nextId++, key: item.key, x: pos.x, y: pos.y,
      ammo: CATALOG[item.key].ammo, cd: 0,
      prepareTarget: null, prepareUntil: 0
    });
  }

  // Switch to red side and prompt for first placement
  switchSide('red');
  state.mode = 'idle';
  state.placeKey = null;
  state.placeStep = null;
  state.placeOrigin = null;
  refreshButtonStates();
  renderBudget();

  const total = profile.threatBudget.uav + profile.threatBudget.fighter + profile.threatBudget.helicopter;
  showBanner(
    `🎯 <u>משימת התקפה - ${profile.label}</u><br>` +
    `<span style="color:#fbbf24">תנאי ניצחון:</span> ${profile.objective.text}<br>` +
    `<span style="font-size:12px;font-weight:400">תקציב: ${total} איומים | בחר סוג, לחץ מחוץ לגבולות, ואז על יעד</span>`,
    ''
  );
  setStatus(`משימת התקפה ${profile.label} - בחר סוג איום מהתפריט`);
}

// =============================================================
// תכנון התקפה אוטומטי (legacy, exposed if defenses present and no challenge)
// =============================================================
function generateAutoAttack() {
  if (state.defenses.length === 0) {
    setStatus('הצב הגנה לפני יצירת התקפה אוטומטית');
    return;
  }
  state.threats = [];
  state.serialCounters = {};
  state.challengeMode = 'auto-attack';
  state.budget = null;

  // Find weakest target = least battery overlap
  const targetScores = TARGETS.map(t => {
    let cover = 0;
    for (const d of state.defenses) {
      const c = CATALOG[d.key];
      if (c.kind !== 'battery') continue;
      const dist = Math.hypot(d.x - t.x, d.y - t.y);
      if (dist < c.maxRange) cover += (c.maxRange - dist) / c.maxRange;
    }
    return { target: t, cover };
  }).sort((a, b) => a.cover - b.cover);

  // Saturate: send waves from multiple azimuths
  const totalBatteries = state.defenses.filter(d => CATALOG[d.key].kind === 'battery').length;
  const nThreats = Math.max(8, totalBatteries * 4);

  for (let i = 0; i < nThreats; i++) {
    const tgt = targetScores[i % Math.min(3, targetScores.length)].target;
    // pick threat type to exploit gaps
    let key;
    if (i % 4 === 0) key = 'fighter';
    else if (i % 4 === 1) key = 'helicopter';
    else key = 'uav'; // saturation
    // launch from west or north
    let sx, sy;
    const fromNorth = Math.random() < 0.3;
    if (fromNorth) {
      sx = 200 + Math.random() * 600;
      sy = 20 + Math.random() * 40;
    } else {
      sx = 20 + Math.random() * 200;
      sy = 80 + Math.random() * 600;
    }
    state.threats.push(makeThreat(
      key, sx, sy,
      tgt.x + (Math.random() - 0.5) * 20,
      tgt.y + (Math.random() - 0.5) * 20,
      tgt.name
    ));
  }
  setStatus(`נוצרה התקפה: ${nThreats} איומים מכוונים לחלשות בהגנה`);
  showBanner('תכנית התקפה אוטומטית נוצרה - לחץ "הפעל סימולציה"', '');
}

// =============================================================
// אתגר הגנה
// =============================================================
function startDefenseChallenge(difficulty = 'medium') {
  resetAll();
  state.challengeMode = 'defense-challenge';
  state.challengeDifficulty = difficulty;
  const profile = DEFENSE_DIFFICULTY[difficulty];
  if (!profile) return;
  state.objective = profile.objective;

  const attackSize = profile.countMin + Math.floor(Math.random() * (profile.countMax - profile.countMin));
  for (let i = 0; i < attackSize; i++) {
    const r = Math.random();
    let key;
    if (r < 0.2) key = 'fighter';
    else if (r < 0.4) key = 'helicopter';
    else key = 'uav';
    const tgt = TARGETS[Math.floor(Math.random() * TARGETS.length)];
    let sx, sy;
    const fromNorth = Math.random() < (difficulty === 'hard' ? 0.4 : 0.3);
    if (fromNorth) {
      sx = 150 + Math.random() * (profile.jitterX + 500);
      sy = 20 + Math.random() * 60;
    } else {
      sx = 20 + Math.random() * profile.jitterX;
      sy = profile.baseY + Math.random() * profile.jitterY;
    }
    state.threats.push(makeThreat(
      key, sx, sy,
      tgt.x + (Math.random() - 0.5) * 30,
      tgt.y + (Math.random() - 0.5) * 30,
      tgt.name
    ));
  }

  state.budget = profile.budget;
  switchSide('blue');
  setStatus(`משימת הגנה ${profile.label}: ${attackSize} איומים, פרוס במסגרת התקציב`);
  showBanner(
    `🛡 <u>משימת הגנה - ${profile.label}</u><br>` +
    `<span style="color:#fbbf24">תנאי ניצחון:</span> ${profile.objective.text}<br>` +
    `<span style="font-size:12px;font-weight:400">איומים מתקרבים: ${attackSize} | פרוס במסגרת התקציב</span>`,
    ''
  );
  renderBudget();
}

function renderBudget() {
  // Defense (battery + radar) budget badges
  document.querySelectorAll('#battery-btns button[data-key], #radar-btns button[data-key]').forEach(b => {
    const k = b.dataset.key;
    let badge = b.querySelector('.budget-badge');
    if (state.budget) {
      const used = state.defenses.filter(d => d.key === k).length;
      const max = state.budget[k] || 0;
      if (!badge) {
        badge = document.createElement('span');
        badge.className = 'budget-badge';
        badge.style.cssText = 'background:#fbbf24;color:#0a0e14;padding:1px 6px;border-radius:8px;font-size:10px;font-weight:700;margin-right:4px';
        b.appendChild(badge);
      }
      badge.textContent = `${used}/${max}`;
      b.style.opacity = used >= max ? '0.5' : '1';
    } else {
      if (badge) badge.remove();
      b.style.opacity = '1';
    }
  });
  // Threat budget badges
  document.querySelectorAll('#threat-btns button[data-key]').forEach(b => {
    const k = b.dataset.key;
    let badge = b.querySelector('.budget-badge');
    if (state.threatBudget) {
      const used = state.threats.filter(t => t.key === k).length;
      const max = state.threatBudget[k] || 0;
      if (!badge) {
        badge = document.createElement('span');
        badge.className = 'budget-badge';
        badge.style.cssText = 'background:#dc2626;color:#fff;padding:1px 6px;border-radius:8px;font-size:10px;font-weight:700;margin-right:4px';
        b.appendChild(badge);
      }
      badge.textContent = `${used}/${max}`;
      b.style.opacity = used >= max ? '0.5' : '1';
    } else {
      if (badge) badge.remove();
      b.style.opacity = '1';
    }
  });
}

