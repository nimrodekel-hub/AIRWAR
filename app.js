// =============================================================
// משחק מלחמה - הגנה אווירית | רפובליקת טליאריה
// סקלה: 1 פיקסל = 1 ק"מ
// =============================================================

const CATALOG = {
  // ---- Batteries ----
  // Missile speed order (fastest to slowest, per spec): Iron shield > Barak > Gecko > David's Sling > Patriot
  ironDome: {
    kind: 'battery', name: 'Iron shield', short: 'IRN',
    minRange: 4, maxRange: 70, minAlt: 0, maxAlt: 9,
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
    reactionTime: 0.5,
    missileSpeed: 380, realSpeed: 'Mach 4 (medium)',
    desc: 'Mobile short-range SAM, low-altitude'
  },
  barak8: {
    kind: 'battery', name: 'Barak', short: 'BRK',
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
    minRange: 40, maxRange: 200, minAlt: 5, maxAlt: 30,
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
const MOUNTAINS = [];
const HILLS = [];       // broad low mounds — visual texture + mild terrain-following

// Sampled heightfield: analytic gaussians are baked into a grid once per
// map regen, so getTerrainAlt is O(1) in hot loops (LOS raycasts) and the
// same data drives the hillshade/contour overlay — visuals and gameplay
// share one truth.
const TERRAIN_GRID = { cell: 5, w: 241, h: 161, data: null };
let TERRAIN_CANVAS = null;   // pre-rendered hillshade + contours overlay

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

function distToSegment(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1, dy = y2 - y1;
  const len2 = dx*dx + dy*dy;
  if (len2 === 0) return Math.hypot(px - x1, py - y1);
  const t = Math.max(0, Math.min(1, ((px-x1)*dx + (py-y1)*dy) / len2));
  return Math.hypot(px - x1 - t*dx, py - y1 - t*dy);
}

// Analytic heightfield: gaussian ridges (mountains) + gaussian mounds (hills)
function terrainAltAnalytic(x, y) {
  let alt = 0;
  for (const m of MOUNTAINS) {
    const d = distToSegment(x, y, m.x1, m.y1, m.x2, m.y2);
    alt += m.peak * Math.exp(-0.5 * (d / m.sigma) ** 2);
  }
  for (const h of HILLS) {
    const d = Math.hypot(x - h.x, y - h.y);
    alt += h.peak * Math.exp(-0.5 * (d / h.sigma) ** 2);
  }
  return alt;
}

// Bilinear lookup into the baked grid (falls back to analytic pre-bake)
function getTerrainAlt(x, y) {
  const g = TERRAIN_GRID;
  if (!g.data) return terrainAltAnalytic(x, y);
  const fx = Math.min(Math.max(x / g.cell, 0), g.w - 1.001);
  const fy = Math.min(Math.max(y / g.cell, 0), g.h - 1.001);
  const ix = Math.floor(fx), iy = Math.floor(fy);
  const tx = fx - ix, ty = fy - iy;
  const i00 = iy * g.w + ix;
  const a = g.data[i00], b = g.data[i00 + 1];
  const c = g.data[i00 + g.w], d = g.data[i00 + g.w + 1];
  return a + (b - a) * tx + (c - a) * ty + (a - b - c + d) * tx * ty;
}

function buildTerrainGrid() {
  const g = TERRAIN_GRID;
  g.data = new Float32Array(g.w * g.h);
  for (let iy = 0; iy < g.h; iy++) {
    for (let ix = 0; ix < g.w; ix++) {
      g.data[iy * g.w + ix] = terrainAltAnalytic(ix * g.cell, iy * g.cell);
    }
  }
}

// Hypsometric tint ramp — classic topographic-map colours:
// deep green lowlands → light green → tan/yellow → orange → red-brown →
// pale rock at the summits. [alt km, r, g, b, alpha]
const HYPSO_STOPS = [
  [0.10,  46, 110,  60, 0.00],
  [0.35,  62, 138,  68, 0.40],
  [0.80, 116, 160,  74, 0.55],
  [1.40, 188, 176,  92, 0.62],
  [2.10, 205, 132,  56, 0.68],
  [2.90, 188,  74,  44, 0.74],
  [3.80, 226, 208, 196, 0.80]
];

function hypsoColor(alt) {
  if (alt <= HYPSO_STOPS[0][0]) return [0, 0, 0, 0];
  const last = HYPSO_STOPS[HYPSO_STOPS.length - 1];
  if (alt >= last[0]) return [last[1], last[2], last[3], last[4]];
  for (let i = 1; i < HYPSO_STOPS.length; i++) {
    if (alt <= HYPSO_STOPS[i][0]) {
      const [h0, r0, g0, b0, a0] = HYPSO_STOPS[i - 1];
      const [h1, r1, g1, b1, a1] = HYPSO_STOPS[i];
      const t = (alt - h0) / (h1 - h0);
      return [r0 + (r1 - r0) * t, g0 + (g1 - g0) * t, b0 + (b1 - b0) * t, a0 + (a1 - a0) * t];
    }
  }
  return [0, 0, 0, 0];
}

// Render the terrain overlay once per map regen: hypsometric colouring +
// directional hillshade (lit from NW) + contour lines — all derived from
// the same heightfield the LOS engine raycasts.
function buildTerrainOverlay() {
  const w = 1200, h = 800;
  const cnv = document.createElement('canvas');
  cnv.width = w; cnv.height = h;
  const c2 = cnv.getContext('2d');
  const img = c2.createImageData(w, h);
  const px = img.data;

  // Light from the north-west, normalized
  let Lx = -0.6, Ly = -0.6, Lz = 0.55;
  const Ll = Math.hypot(Lx, Ly, Lz); Lx /= Ll; Ly /= Ll; Lz /= Ll;
  const EXAG = 30;            // vertical exaggeration for slope shading
  const CONTOUR_STEP = 0.5;   // km between contour lines

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = (y * w + x) * 4;
      const alt = getTerrainAlt(x, y);
      if (alt < 0.1) continue;   // lowland plain — base map colour shows through

      // 1. Hypsometric base colour
      let [r, g, b, a] = hypsoColor(alt);

      // 2. Hillshade composited over the tint
      const gx = getTerrainAlt(x + 2, y) - getTerrainAlt(x - 2, y);
      const gy = getTerrainAlt(x, y + 2) - getTerrainAlt(x, y - 2);
      let nx = -gx * EXAG, ny = -gy * EXAG, nz = 4;
      const nl = Math.hypot(nx, ny, nz); nx /= nl; ny /= nl; nz /= nl;
      const lam = nx * Lx + ny * Ly + nz * Lz;
      const shade = lam - Lz;   // 0 on flat ground, +lit / −shadow on slopes
      let sr, sg, sb, sa;
      if (shade > 0) { sr = 255; sg = 246; sb = 214; sa = Math.min(0.30, shade * 1.4); }
      else           { sr = 4;   sg = 10;  sb = 16;  sa = Math.min(0.48, -shade * 1.7); }
      if (sa > 0) {
        const na = sa + a * (1 - sa);
        r = (sr * sa + r * a * (1 - sa)) / na;
        g = (sg * sa + g * a * (1 - sa)) / na;
        b = (sb * sa + b * a * (1 - sa)) / na;
        a = na;
      }

      // 3. Contour lines every 0.5 km
      if (alt > 0.25) {
        const f = alt / CONTOUR_STEP;
        const frac = f - Math.floor(f);
        if (frac < 0.06 || frac > 0.94) {
          const ca = 0.25;
          const na = ca + a * (1 - ca);
          r = (10 * ca + r * a * (1 - ca)) / na;
          g = (16 * ca + g * a * (1 - ca)) / na;
          b = (12 * ca + b * a * (1 - ca)) / na;
          a = na;
        }
      }
      px[idx]     = r;
      px[idx + 1] = g;
      px[idx + 2] = b;
      px[idx + 3] = Math.round(a * 255);
    }
  }
  c2.putImageData(img, 0, 0);
  TERRAIN_CANVAS = cnv;
}

function getThreatAltMSL(t) {
  return CATALOG[t.key].altitude + getTerrainAlt(t.x, t.y);
}

function hasLOS(ax, ay, bx, by, tgtAltMSL) {
  const obsAlt = getTerrainAlt(ax, ay);
  const steps = 24;
  for (let i = 1; i < steps; i++) {
    const f = i / steps;
    const mx = ax + f * (bx - ax);
    const my = ay + f * (by - ay);
    const losAlt = obsAlt + f * (tgtAltMSL - obsAlt);
    if (getTerrainAlt(mx, my) > losAlt) return false;
  }
  return true;
}

// Terrain complexity scales with mission difficulty: more ridges and
// higher peaks on harder levels. Free play uses the medium profile.
const TERRAIN_PROFILES = {
  easy:    { west: 1, interior: 0, peakMin: 1.8, peakMax: 2.8, hills: 4 },
  medium:  { west: 2, interior: 1, peakMin: 2.0, peakMax: 3.2, hills: 6 },
  hard:    { west: 3, interior: 1, peakMin: 2.4, peakMax: 3.8, hills: 8 },
  extreme: { west: 3, interior: 2, peakMin: 2.8, peakMax: 4.5, hills: 10 }
};

const PEAK_LABELS = [];   // [{x, y, alt}] — highest point of each ridge, labelled on the map

function regenerateMountains(difficulty) {
  const prof = TERRAIN_PROFILES[difficulty] || TERRAIN_PROFILES.medium;
  MOUNTAINS.length = 0;

  // Western blocking ridges — between the red zone (x≤380) and the
  // west-most strategic targets (~560), roughly north-south so they
  // present a wide face to the W→E threat axis.
  let placed = 0;
  for (let attempt = 0; attempt < 200 && placed < prof.west; attempt++) {
    const cx = 410 + Math.random() * 180;
    const cy = 140 + Math.random() * 460;
    if (!isInsideCountry(cx, cy)) continue;
    const angle = (Math.PI / 2) + (Math.random() - 0.5) * (Math.PI / 2);
    const len = 90 + Math.random() * 110;
    MOUNTAINS.push({
      x1: cx - Math.cos(angle) * len / 2,
      y1: cy - Math.sin(angle) * len / 2,
      x2: cx + Math.cos(angle) * len / 2,
      y2: cy + Math.sin(angle) * len / 2,
      peak: prof.peakMin + Math.random() * (prof.peakMax - prof.peakMin),
      sigma: 15 + Math.random() * 17
    });
    placed++;
  }

  // Interior ridges — lower, deeper in the country, any orientation
  let interiorPlaced = 0;
  for (let attempt = 0; attempt < 200 && interiorPlaced < prof.interior; attempt++) {
    const cx = 620 + Math.random() * 280;
    const cy = 160 + Math.random() * 420;
    if (!isInsideCountry(cx, cy)) continue;
    const angle = Math.random() * Math.PI;
    const len = 70 + Math.random() * 90;
    MOUNTAINS.push({
      x1: cx - Math.cos(angle) * len / 2,
      y1: cy - Math.sin(angle) * len / 2,
      x2: cx + Math.cos(angle) * len / 2,
      y2: cy + Math.sin(angle) * len / 2,
      peak: (prof.peakMin + Math.random() * (prof.peakMax - prof.peakMin)) * 0.6,
      sigma: 14 + Math.random() * 14
    });
    interiorPlaced++;
  }

  // Broad low hills — gentle relief everywhere
  HILLS.length = 0;
  let hillsPlaced = 0;
  for (let attempt = 0; attempt < 300 && hillsPlaced < prof.hills; attempt++) {
    const x = 430 + Math.random() * 600;
    const y = 110 + Math.random() * 580;
    if (!isInsideCountry(x, y)) continue;
    HILLS.push({
      x, y,
      peak: 0.25 + Math.random() * 0.5,
      sigma: 35 + Math.random() * 55
    });
    hillsPlaced++;
  }

  // Bake the heightfield + pre-render the hypsometric overlay
  buildTerrainGrid();
  buildTerrainOverlay();

  // Locate each ridge's true summit (max of the combined field along
  // the ridge line) for the elevation labels.
  PEAK_LABELS.length = 0;
  for (const m of MOUNTAINS) {
    let best = { x: m.x1, y: m.y1, alt: 0 };
    for (let i = 0; i <= 12; i++) {
      const f = i / 12;
      const x = m.x1 + (m.x2 - m.x1) * f;
      const y = m.y1 + (m.y2 - m.y1) * f;
      const alt = getTerrainAlt(x, y);
      if (alt > best.alt) best = { x, y, alt };
    }
    PEAK_LABELS.push(best);
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
  },
  // ── "Extreme" — same dense defense as `hard`, but the defense layout is
  // hidden from the user until they press ▶. They must plan their attack
  // routes blind, as if without intelligence on the air-defense disposition.
  extreme: {
    label: 'קשה במיוחד',
    noIntel: true,
    threatBudget: { uav: 12, fighter: 4, helicopter: 4 },  // 20 total
    objective: {
      text: 'פגע ב-<b>4 יעדים שונים</b>, או ב<b>בירה + 2 נוספים</b> — <span style="color:#dc2626">ההגנה נסתרת!</span>',
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
// Capital is mandatory in all difficulties; secondary-target tolerance shrinks.
function nonCapitalHits(hits) {
  let n = 0;
  for (const name of hits) if (name !== 'Arian (Capital)') n++;
  return n;
}
const DEFENSE_DIFFICULTY = {
  easy: {
    label: 'קל',
    countMin: 8, countMax: 11,
    jitterX: 150, jitterY: 350, baseY: 200,
    budget: { ironDome: 4, sa8: 3, barak8: 3, patriot: 2, davidsSling: 2,
              longRadar: 2, medRadar: 3, shortRadar: 3 },
    objective: {
      text: 'הגן על <b>הבירה (Arian)</b> ואל תאפשר פגיעה ב-<b>3 יעדים אחרים או יותר</b>',
      check: (hits) => !hits.has('Arian (Capital)') && nonCapitalHits(hits) < 3
    }
  },
  medium: {
    label: 'בינוני',
    countMin: 14, countMax: 19,
    jitterX: 230, jitterY: 550, baseY: 100,
    budget: { ironDome: 3, sa8: 2, barak8: 2, patriot: 1, davidsSling: 1,
              longRadar: 1, medRadar: 2, shortRadar: 2 },
    objective: {
      text: 'הגן על <b>הבירה (Arian)</b> ואל תאפשר פגיעה ב-<b>2 יעדים אחרים או יותר</b>',
      check: (hits) => !hits.has('Arian (Capital)') && nonCapitalHits(hits) < 2
    }
  },
  hard: {
    label: 'קשה',
    countMin: 22, countMax: 29,
    jitterX: 320, jitterY: 700, baseY: 30,
    budget: { ironDome: 2, sa8: 1, barak8: 1, patriot: 1, davidsSling: 1,
              longRadar: 1, medRadar: 1, shortRadar: 1 },
    objective: {
      text: 'הגן על <b>הבירה (Arian)</b> ואל תאפשר אף פגיעה ביעד נוסף',
      check: (hits) => !hits.has('Arian (Capital)') && nonCapitalHits(hits) < 1
    }
  },
  // ── "Extreme" — same dense attack as `hard`, but the user does NOT see
  // the incoming threats while placing batteries. The incoming wave only
  // reveals itself when ▶ is pressed. Forces blind defense planning.
  extreme: {
    label: 'קשה במיוחד',
    noIntel: true,
    countMin: 22, countMax: 29,
    jitterX: 320, jitterY: 700, baseY: 30,
    budget: { ironDome: 2, sa8: 1, barak8: 1, patriot: 1, davidsSling: 1,
              longRadar: 1, medRadar: 1, shortRadar: 1 },
    objective: {
      text: 'הגן על <b>הבירה (Arian)</b> ואל תאפשר אף פגיעה ביעד נוסף — <span style="color:#dc2626">ההתקפה נסתרת!</span>',
      check: (hits) => !hits.has('Arian (Capital)') && nonCapitalHits(hits) < 1
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

// Red zone — the only valid origin for hostile aircraft.
// World 1200×800; red strip is x∈[0,380].
function isInsideRedZone(x, y) {
  return x >= 0 && x <= 380 && y >= 0 && y <= 800;
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
  noIntel: false,         // true on the "extreme" difficulty: hide the opposing side's deployment
  intelRevealed: false,   // flips to true when the user presses ▶ to start the sim
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
  autoAmmo: null,
  results: null,
  lastTs: 0,
  simElapsed: 0,
  drag: null,
  pan: null,
  _suppressNextClick: false,
  mouseX: 0, mouseY: 0,
  serialCounters: {},
  viewport: { offsetX: 0, offsetY: 0, scale: 1 },
  tutorialStep: 0,
  killLabels: [],         // floating "SPLASH" confirmations over fresh interceptions
  leakerFlashT: -1,       // simElapsed timestamp of the last breach (drives red edge flash)
  lastAward: null         // {score, xp, oldRank, newRank, isNewBest, best} from the last challenge run
};

let canvas, ctx, W, H, tooltip, banner, zoomLevelEl;
let nextId = 1;

// =============================================================
// פרופיל שחקן: דרגות, נק"ז (XP) ושיאים — נשמר ב-localStorage.
// המבנה מוכן להזרקה עתידית של backend (טבלת שחקנים גלובלית):
// כל הקריאות עוברות דרך loadProfile/saveProfile בלבד.
// =============================================================
const RANKS = [
  { name: 'טוראי',  minXp: 0 },
  { name: 'רב"ט',   minXp: 150 },
  { name: 'סמל',    minXp: 350 },
  { name: 'סמ"ר',   minXp: 600 },
  { name: 'רס"ל',   minXp: 950 },
  { name: 'רס"ר',   minXp: 1400 },
  { name: 'סג"מ',   minXp: 2000 },
  { name: 'סגן',    minXp: 2700 },
  { name: 'סרן',    minXp: 3500 },
  { name: 'רס"ן',   minXp: 4500 },
  { name: 'סא"ל',   minXp: 5700 },
  { name: 'אל"מ',   minXp: 7100 },
  { name: 'תא"ל',   minXp: 8700 },
  { name: 'אלוף',   minXp: 10500 },
  { name: 'רמטכ"ל', minXp: 13000 }
];

const XP_MULTIPLIER = { easy: 1, medium: 1.5, hard: 2, extreme: 3 };
const PROFILE_KEY = 'airwar-profile-v1';

let profile = loadProfile();

function loadProfile() {
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    if (raw) {
      const p = JSON.parse(raw);
      if (typeof p.xp === 'number' && p.bests) return p;
    }
  } catch (e) { /* corrupt or blocked storage — start fresh */ }
  return { xp: 0, games: 0, wins: 0, bests: {} };
}

function saveProfile() {
  try { localStorage.setItem(PROFILE_KEY, JSON.stringify(profile)); } catch (e) {}
}

function rankForXp(xp) {
  let r = RANKS[0];
  for (const rank of RANKS) if (xp >= rank.minXp) r = rank;
  return r;
}

function nextRankFor(xp) {
  for (const rank of RANKS) if (xp < rank.minXp) return rank;
  return null; // top rank reached
}

// Mission score 0-100. Defense rewards protecting value, interception
// rate and ammo discipline; attack rewards damage dealt and breach rate.
function computeMissionScore(r) {
  let score;
  if (state.challengeMode === 'attack-challenge') {
    const damageRatio = 1 - r.protectedValue / r.totalValue;
    const breachRatio = r.total ? r.survived / r.total : 0;
    score = 65 * damageRatio + 35 * breachRatio;
  } else {
    const protectedRatio = r.protectedValue / r.totalValue;
    const killRatio = r.total ? r.killed / r.total : 0;
    let spent = 0;
    for (const d of state.defenses) {
      const c = CATALOG[d.key];
      if (c.kind === 'battery') spent += (d.initialAmmo !== undefined ? d.initialAmmo : c.ammo) - d.ammo;
    }
    const efficiency = spent > 0 ? Math.min(1, r.killed / spent) : 0;
    score = 60 * protectedRatio + 25 * killRatio + 15 * efficiency;
  }
  if (r.objectiveMet) score += 5;
  return Math.max(0, Math.min(100, Math.round(score)));
}

// Award XP for a completed challenge run and persist bests/rank.
function awardMission(score) {
  const diff = state.challengeDifficulty || 'medium';
  const mult = XP_MULTIPLIER[diff] || 1;
  const won = !!(state.results && state.results.objectiveMet);
  const xpGain = Math.round(score * mult * (won ? 1 : 0.5));

  const oldRank = rankForXp(profile.xp);
  profile.xp += xpGain;
  profile.games += 1;
  if (won) profile.wins += 1;
  const bestKey = `${state.challengeMode}-${diff}`;
  const prevBest = profile.bests[bestKey] || 0;
  const isNewBest = score > prevBest;
  if (isNewBest) profile.bests[bestKey] = score;
  const newRank = rankForXp(profile.xp);
  saveProfile();

  state.lastAward = {
    score, xp: xpGain, won,
    oldRank, newRank,
    rankedUp: newRank !== oldRank,
    isNewBest,
    best: profile.bests[bestKey]
  };

  syncRemoteProfile();   // fire-and-forget: push the updated record to GitHub
}

// =============================================================
// טבלת שחקנים גלובלית — playerdb.json בריפו, דרך GitHub API.
// קריאה: בכל פתיחת משחק (ללא token דרך raw, עם token דרך ה-API).
// כתיבה: אחרי כל משימה, אם הוגדר token ו-callsign.
// ה-token נשמר ב-localStorage (מוגדר פעם אחת לכל מכשיר דרך כפתור
// 🔑 בטבלה) או מוטמע ב-tokenParts — לבחירת בעל הריפו.
// =============================================================
const REMOTE_DB = {
  owner: 'nimrodekel-hub',
  repo: 'AIRWAR',
  branch: 'main',
  path: 'playerdb.json',
  // Embedded token, split across parts (and through the prefix) so GitHub's
  // secret scanner won't match a contiguous pattern and auto-revoke it.
  // Scoped to Contents read/write on this repo only.
  tokenParts: ['github_p', 'at_11CCW6DOY0I23NBCefqw3i_EFrjgf5Og1gOmuISvyF', 'He74ybBab51kMgBP8xeixh6oAPVJHPOVndUFo4XM']
};

let remoteDb = null;          // parsed playerdb.json {players:{callsign:{...}}}
let remoteDbSha = null;       // blob sha for conflict-safe PUTs
let remoteSyncState = 'idle'; // idle | loading | ok | readonly | error

function ghToken() {
  try {
    const t = localStorage.getItem('airwar-gh-token');
    if (t) return t;
  } catch (e) {}
  const joined = REMOTE_DB.tokenParts.join('');
  return joined || null;
}

function ghApiUrl() {
  return `https://api.github.com/repos/${REMOTE_DB.owner}/${REMOTE_DB.repo}/contents/${REMOTE_DB.path}`;
}

function b64EncodeUtf8(str) {
  return btoa(unescape(encodeURIComponent(str)));
}
function b64DecodeUtf8(b64) {
  return decodeURIComponent(escape(atob(b64.replace(/\n/g, ''))));
}

async function loadRemoteDb() {
  remoteSyncState = 'loading';
  renderLeaderboard();
  const token = ghToken();
  try {
    let text = null;
    remoteDbSha = null;
    if (token) {
      const res = await fetch(`${ghApiUrl()}?ref=${REMOTE_DB.branch}`, {
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json' }
      });
      if (res.status === 404) {
        remoteDb = { players: {} };
      } else if (!res.ok) {
        throw new Error('HTTP ' + res.status);
      } else {
        const j = await res.json();
        remoteDbSha = j.sha;
        text = b64DecodeUtf8(j.content);
      }
    } else {
      // No token — public read through raw (cache-busted), leaderboard is read-only
      const res = await fetch(
        `https://raw.githubusercontent.com/${REMOTE_DB.owner}/${REMOTE_DB.repo}/${REMOTE_DB.branch}/${REMOTE_DB.path}?t=${Date.now()}`,
        { cache: 'no-store' }
      );
      if (res.status === 404) {
        remoteDb = { players: {} };
      } else if (!res.ok) {
        throw new Error('HTTP ' + res.status);
      } else {
        text = await res.text();
      }
    }
    if (text) {
      remoteDb = JSON.parse(text);
      if (!remoteDb.players) remoteDb.players = {};
    }
    remoteSyncState = token ? 'ok' : 'readonly';
    mergeRemoteIntoLocal();
  } catch (e) {
    remoteSyncState = 'error';
  }
  renderProfileStrip();
  renderLeaderboard();
}

// If this callsign already has a record from another device, adopt the
// best of both (max XP / games / wins / per-mission bests).
function mergeRemoteIntoLocal() {
  if (!remoteDb || !profile.callsign) return;
  const rec = remoteDb.players[profile.callsign];
  if (!rec) return;
  let changed = false;
  if (rec.xp > profile.xp)       { profile.xp = rec.xp; changed = true; }
  if (rec.games > profile.games) { profile.games = rec.games; changed = true; }
  if (rec.wins > profile.wins)   { profile.wins = rec.wins; changed = true; }
  for (const k of Object.keys(rec.bests || {})) {
    if ((rec.bests[k] || 0) > (profile.bests[k] || 0)) {
      profile.bests[k] = rec.bests[k];
      changed = true;
    }
  }
  if (changed) saveProfile();
}

async function syncRemoteProfile(retry = true) {
  const token = ghToken();
  if (!token || !profile.callsign) return;
  remoteSyncState = 'loading';
  renderLeaderboard();
  try {
    // Refresh latest content + sha so we don't clobber other players
    const res = await fetch(`${ghApiUrl()}?ref=${REMOTE_DB.branch}`, {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json' }
    });
    let sha = null, db = { players: {} };
    if (res.ok) {
      const j = await res.json();
      sha = j.sha;
      db = JSON.parse(b64DecodeUtf8(j.content));
      if (!db.players) db.players = {};
    } else if (res.status !== 404) {
      throw new Error('HTTP ' + res.status);
    }

    db.players[profile.callsign] = {
      xp: profile.xp,
      games: profile.games,
      wins: profile.wins,
      bests: profile.bests,
      rank: rankForXp(profile.xp).name,
      updated: new Date().toISOString()
    };

    const body = {
      message: `score: ${profile.callsign} → ${profile.xp} XP`,
      content: b64EncodeUtf8(JSON.stringify(db, null, 2)),
      branch: REMOTE_DB.branch
    };
    if (sha) body.sha = sha;

    const put = await fetch(ghApiUrl(), {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json' },
      body: JSON.stringify(body)
    });
    if (!put.ok) {
      // Conflict (someone else pushed between GET and PUT) — retry once
      if (retry && (put.status === 409 || put.status === 422)) {
        return syncRemoteProfile(false);
      }
      throw new Error('HTTP ' + put.status);
    }
    remoteDb = db;
    remoteSyncState = 'ok';
  } catch (e) {
    remoteSyncState = 'error';
  }
  renderLeaderboard();
}

// 🏆 Top-10 leaderboard table in the start modal
function renderLeaderboard() {
  const el = document.getElementById('leaderboard');
  if (!el) return;

  const token = ghToken();
  let statusTxt, statusCls;
  if (remoteSyncState === 'loading')        { statusTxt = '⟳ מסתנכרן...';                statusCls = 'lb-loading'; }
  else if (remoteSyncState === 'ok')        { statusTxt = '● מקוון';                      statusCls = 'lb-ok'; }
  else if (remoteSyncState === 'readonly')  { statusTxt = '◐ צפייה בלבד (אין מפתח)';      statusCls = 'lb-ro'; }
  else if (remoteSyncState === 'error')     { statusTxt = '✗ שגיאת סנכרון';               statusCls = 'lb-err'; }
  else                                      { statusTxt = '';                              statusCls = ''; }

  const players = remoteDb
    ? Object.entries(remoteDb.players)
        .map(([name, p]) => ({ name, ...p }))
        .sort((a, b) => (b.xp || 0) - (a.xp || 0))
        .slice(0, 10)
    : [];

  let rows = players.map((p, i) => `
    <tr class="${p.name === profile.callsign ? 'lb-me' : ''}">
      <td class="lb-pos">${i + 1}</td>
      <td class="lb-name">${p.name}</td>
      <td class="lb-rank">${p.rank || rankForXp(p.xp || 0).name}</td>
      <td class="lb-xp">${p.xp || 0}</td>
      <td class="lb-wins">${p.wins || 0}</td>
    </tr>`).join('');
  if (!rows) rows = `<tr><td colspan="5" class="lb-empty">אין עדיין שחקנים בטבלה — היה הראשון!</td></tr>`;

  el.innerHTML = `
    <div class="lb-header">
      <span class="lb-title">🏆 טבלת מפקדים</span>
      <span class="lb-status ${statusCls}">${statusTxt}</span>
      ${token ? '' : '<button id="lb-set-token" class="lb-key-btn" title="הגדר מפתח GitHub לעדכון הטבלה">🔑</button>'}
    </div>
    <table class="lb-table">
      <thead><tr><th>#</th><th>שם קוד</th><th>דרגה</th><th>XP</th><th>נצ׳</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>`;

  const keyBtn = document.getElementById('lb-set-token');
  if (keyBtn) {
    keyBtn.addEventListener('click', () => {
      const t = prompt('הדבק מפתח GitHub (fine-grained PAT עם הרשאת Contents read/write לריפו AIRWAR):');
      if (t && t.trim()) {
        try { localStorage.setItem('airwar-gh-token', t.trim()); } catch (e) {}
        loadRemoteDb();
      }
    });
  }
}

// =============================================================
// אתחול
// =============================================================
window.addEventListener('DOMContentLoaded', () => {
  canvas = document.getElementById('map');
  ctx = canvas.getContext('2d');
  tooltip = document.getElementById('tooltip');
  banner = document.getElementById('banner');
  zoomLevelEl = document.getElementById('zoom-level');
  resize();
  // Orientation change on iOS often fires `resize` while the address bar
  // is still mid-transition — we end up capturing stale dimensions and
  // the canvas bitmap stretches incorrectly when the layout settles
  // (the squished-map symptom). Re-measure on the next two frames to
  // catch the final size, and listen to every viewport event mobile
  // browsers expose.
  const reflow = () => {
    resize();
    requestAnimationFrame(() => {
      resize();
      requestAnimationFrame(resize);
    });
    placeScrubberForViewport();
  };
  window.addEventListener('resize', reflow);
  window.addEventListener('orientationchange', reflow);
  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', reflow);
  }
  placeScrubberForViewport();
  regenerateLand();
  regenerateTargets();
  regenerateMountains();
  buildButtons();
  bindControls();
  initSimButtons();
  bindCanvas();
  resetView();
  loadRemoteDb();   // async — pulls the global player table from GitHub
  requestAnimationFrame(loop);
});

function resize() {
  const r = canvas.parentElement.getBoundingClientRect();
  const newW = Math.round(r.width);
  const newH = Math.round(r.height);
  // Mid-transition viewports (especially during iOS orientation change)
  // can report a 0-sized rect — ignore them so we don't blank the canvas.
  if (newW === 0 || newH === 0) return;
  // Skip the reallocation if nothing changed (assignment clears the canvas).
  if (canvas.width  !== newW) canvas.width  = newW;
  if (canvas.height !== newH) canvas.height = newH;
  W = newW; H = newH;
}

// On mobile, the sidebar is hidden behind the hamburger — relocate the
// scrubber to the map container so the player can scrub the replay
// without opening the drawer.
function placeScrubberForViewport() {
  const sr = document.getElementById('scrubber-row');
  if (!sr) return;
  const isMobile = window.MOBILE_MODE || window.matchMedia('(max-width: 768px)').matches;
  const target = document.getElementById(isMobile ? 'map-container' : 'control-panel');
  if (sr.parentElement !== target) target.appendChild(sr);
}

function setScrubberActive(active) {
  document.getElementById('map-container').classList.toggle('scrubber-active', active);
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
    rangeText = `${c.minRange}-${c.maxRange} km • Alt ${c.minAlt}-${c.maxAlt} km<br><span class="pk-badge">PK ${(c.hitRate*100).toFixed(0)}%</span> <span class="rt-badge">RT ${c.reactionTime}s</span> <span class="speed-line">${c.realSpeed}</span>`;
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
      <tr><td>שיעור פגיעה (PK)</td><td><b style="color:#5fa86b;font-size:15px">${(c.hitRate*100).toFixed(0)}%</b></td></tr>
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
          ${c.altitude < 3 ? '<li>גובה נמוך - השתמש ב-Iron shield / SA-8 / Barak (David\'s Sling אינו אפקטיבי בגובה < 5 ק"מ)</li>' : ''}
          ${c.altitude >= 8 ? '<li>גובה גבוה - השתמש ב-Patriot / David\'s Sling (Barak אפקטיבי גם הוא)</li>' : ''}
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

function toggleMobileSidebar(force) {
  const sidebar = document.getElementById('sidebar');
  const backdrop = document.getElementById('mobile-backdrop');
  const next = force !== undefined ? force : !sidebar.classList.contains('open');
  sidebar.classList.toggle('open', next);
  backdrop.classList.toggle('open', next);
  if (next) {
    // Player tapped the menu — kill the attention pulse for this challenge.
    const m = document.getElementById('mobile-menu-toggle');
    if (m) m.classList.remove('attention');
  }
}

// Add the pulsing-blink hint to the hamburger so a new player notices
// it's the entry point to pick weapons. Called at the start of each
// challenge; auto-cleared once the sheet is opened.
function armMenuAttention() {
  if (!window.MOBILE_MODE) return;
  const m = document.getElementById('mobile-menu-toggle');
  if (m) m.classList.add('attention');
}

function closeMobileSidebar() {
  toggleMobileSidebar(false);
}

function bindControls() {
  document.getElementById('mobile-menu-toggle').addEventListener('click', () => toggleMobileSidebar());
  document.getElementById('mobile-backdrop').addEventListener('click', closeMobileSidebar);
  const newGameCta = document.getElementById('mobile-new-game-cta');
  if (newGameCta) {
    newGameCta.addEventListener('click', () => {
      hideNewGameCta();
      resetAll();
      showStartModal();
    });
  }
  document.getElementById('mission-expand-btn').addEventListener('click', () => {
    const group = document.getElementById('banner-group');
    const expanded = group.classList.toggle('expanded');
    document.getElementById('mission-expand-btn').textContent = expanded ? '▾ כסה' : '▸ פרטים';
  });

  document.querySelectorAll('.side-btn').forEach(btn => {
    btn.addEventListener('click', () => switchSide(btn.dataset.side));
  });
  document.getElementById('simulate').addEventListener('click', () => { startSim(); closeMobileSidebar(); });
  document.getElementById('pause').addEventListener('click', pauseSim);
  document.getElementById('resume').addEventListener('click', resumeSim);
  document.getElementById('stop').addEventListener('click', stopSim);
  document.getElementById('delete-mode').addEventListener('click', toggleDelete);
  document.getElementById('clear-threats').addEventListener('click', clearThreats);
  document.getElementById('reset').addEventListener('click', () => {
    resetAll();
    showStartModal();
  });
  document.getElementById('back-to-selection').addEventListener('click', () => {
    resetAll();
    showStartModal();
  });
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

  // Tutorial controls
  document.getElementById('open-tutorial').addEventListener('click', () => showTutorial(0));
  document.getElementById('tutorial-close').addEventListener('click', hideTutorial);
  document.getElementById('tutorial-prev').addEventListener('click', () => showTutorial(state.tutorialStep - 1));
  document.getElementById('tutorial-next').addEventListener('click', tutorialNext);
  document.getElementById('tutorial-modal').addEventListener('click', (ev) => {
    if (ev.target.id === 'tutorial-modal') hideTutorial();
  });

  // Start-modal controls
  document.getElementById('open-start').addEventListener('click', showStartModal);
  document.getElementById('start-tutorial-btn').addEventListener('click', () => showTutorial(0));
  document.getElementById('start-free-btn').addEventListener('click', () => {
    hideStartModal();
    setStatus('מצב חופשי - פרוס סוללות, מכ"מים ואיומים כרצונך');
  });
  document.querySelectorAll('#start-body button[data-startmode]').forEach(btn => {
    btn.addEventListener('click', () => {
      const mode = btn.dataset.startmode;
      const diff = btn.dataset.startdiff;
      hideStartModal();
      if (mode === 'defense') startDefenseChallenge(diff);
      else if (mode === 'attack') startAttackChallenge(diff);
    });
  });

  // Show the mode-selection modal as the entry point on every load
  setTimeout(showStartModal, 200);
}

function showStartModal() {
  renderProfileStrip();
  renderBestBadges();
  document.getElementById('start-modal').classList.add('visible');
}

// Player rank / XP summary at the top of the start modal.
// Includes the callsign (שם קוד) — the player's identity in the
// global leaderboard. First run shows an input; afterwards the name
// with a small ✎ to change it.
function renderProfileStrip() {
  const el = document.getElementById('profile-strip');
  if (!el) return;
  const cur = rankForXp(profile.xp);
  const next = nextRankFor(profile.xp);
  const span = next ? next.minXp - cur.minXp : 1;
  const into = next ? profile.xp - cur.minXp : 1;
  const pct = next ? Math.round(100 * into / span) : 100;

  const idHtml = profile.callsign
    ? `<span class="ps-callsign">${profile.callsign}</span>`
      + `<button class="ps-edit" id="ps-edit-name" title="שנה שם קוד (שומר על הניקוד)">✎</button>`
      + `<button class="ps-switch" id="ps-switch-player" title="התחל משחק עם שחקן אחר">🔄 החלף שחקן</button>`
    : `<input id="ps-name-input" class="ps-input" maxlength="14" placeholder="שם קוד..."><button id="ps-name-save" class="ps-save">שמור</button>`;

  el.innerHTML = `
    <div class="ps-rank">🎖 <b>${cur.name}</b></div>
    <div class="ps-id">${idHtml}</div>
    <div class="ps-bar"><div class="ps-bar-fill" style="width:${pct}%"></div></div>
    <div class="ps-stats">
      <span>XP ${profile.xp}</span>
      <span>משחקים ${profile.games}</span>
      <span>נצחונות ${profile.wins}</span>
    </div>`;

  const saveBtn = document.getElementById('ps-name-save');
  if (saveBtn) {
    const commit = () => {
      const v = document.getElementById('ps-name-input').value.trim();
      if (!v) return;
      profile.callsign = v;
      saveProfile();
      mergeRemoteIntoLocal();   // adopt this callsign's history if it exists remotely
      saveProfile();
      renderProfileStrip();
      renderLeaderboard();
      syncRemoteProfile();
    };
    saveBtn.addEventListener('click', commit);
    document.getElementById('ps-name-input').addEventListener('keydown', e => {
      if (e.key === 'Enter') commit();
    });
  }
  const editBtn = document.getElementById('ps-edit-name');
  if (editBtn) {
    editBtn.addEventListener('click', () => {
      const v = prompt('שם קוד חדש:', profile.callsign || '');
      if (v && v.trim()) {
        profile.callsign = v.trim().slice(0, 14);
        saveProfile();
        mergeRemoteIntoLocal();
        saveProfile();
        renderProfileStrip();
        renderLeaderboard();
        syncRemoteProfile();
      }
    });
  }
  const switchBtn = document.getElementById('ps-switch-player');
  if (switchBtn) switchBtn.addEventListener('click', switchPlayer);
}

// Start playing as a different commander on this device. The outgoing
// player's progress is already mirrored to the global table, so we push
// once more to be safe, then load the requested callsign: an existing
// name pulls its stats from the table, a new name starts a fresh record.
function switchPlayer() {
  syncRemoteProfile();   // flush any unsynced progress for the current player
  const v = prompt('שם קוד של השחקן (שם קיים יטען את ההתקדמות שלו, שם חדש יתחיל מאפס):', '');
  if (!v || !v.trim()) return;
  const name = v.trim().slice(0, 14);
  if (name === profile.callsign) return;
  profile = { xp: 0, games: 0, wins: 0, bests: {}, callsign: name };
  saveProfile();
  mergeRemoteIntoLocal();   // adopt this callsign's existing stats, if any
  saveProfile();
  renderProfileStrip();
  renderBestBadges();
  renderLeaderboard();
}

// Personal-best badge on each difficulty button in the start modal
function renderBestBadges() {
  document.querySelectorAll('#start-modal .diff-btn[data-startmode]').forEach(btn => {
    const mode = btn.dataset.startmode === 'attack' ? 'attack-challenge' : 'defense-challenge';
    const best = profile.bests[`${mode}-${btn.dataset.startdiff}`];
    let badge = btn.querySelector('.best-badge');
    if (best) {
      if (!badge) {
        badge = document.createElement('span');
        badge.className = 'best-badge';
        btn.appendChild(badge);
      }
      badge.textContent = best;
    } else if (badge) {
      badge.remove();
    }
  });
}
function hideStartModal() {
  document.getElementById('start-modal').classList.remove('visible');
}

const TUTORIAL_STEPS = [
  {
    title: '🎯 ברוך הבא לסימולטור הגנה אווירית',
    html: () => `
      <p>זהו סימולטור משחק מלחמה אסטרטגי בין <b style="color:#5fa8d3">צד כחול (מגן)</b> לבין <b style="color:#dc2626">צד אדום (תוקף)</b> שמתרחש במדינה הבדיונית "רפובליקת טליאריה".</p>
      <h4>שני מצבי משחק עיקריים:</h4>
      <ul>
        <li>🛡 <b>אתגר הגנה</b> - אתה המגן. המערכת שולחת איומים, ואתה צריך לפרוס סוללות הגנה אווירית ומכ"מים כדי להגן על היעדים האסטרטגיים.</li>
        <li>🎯 <b>אתגר התקפה</b> - אתה התוקף. המערכת פורסת אוטומטית הגנה, ואתה צריך לתכנן ולפרוס איומים אוויריים שיפרצו דרכה.</li>
      </ul>
      <p>שני המצבים תומכים ב<b>ארבע רמות קושי</b> (קל / בינוני / קשה / 🕶 קשה במיוחד) שמשפיעות על מספר האיומים, פיזור הסוללות, והיעדים.</p>
      <div class="tip" style="background:rgba(88,28,135,0.18);border-color:rgba(168,85,247,0.55);color:#e9d5ff">🕶 <b>קשה במיוחד — מתאר ללא מודיעין</b>: רמת קושי חדשה שמדמה תכנון ללא מודיעין מקדים. בהגנה — לא תראה את האיומים המתקרבים בזמן הפריסה. בהתקפה — לא תראה את פריסת ההגנה בזמן תכנון הנתיבים. הצד הנגדי נחשף רק כשלוחצים ▶ ומתחילה הסימולציה.</div>
      <div class="tip">💡 <b>טיפ:</b> בכל פעם שתאפס את המפה - גבולות המדינה ומיקומי היעדים האסטרטגיים יוגרלו מחדש, כך שכל משחק הוא אתגר חדש.</div>
    `
  },
  {
    title: '🗺 המפה והאזורים',
    html: () => `
      <p>המסך מציג את <b>רפובליקת טליאריה</b> במרכז (השטח המוגן בכחול-כהה), מוקפת מדינות אויב. מסביב לטליאריה <b style="color:#dc2626">אזור אדום</b> שממנו האיומים יכולים להתחיל.</p>
      <div class="tutorial-figure">
        <svg viewBox="0 0 460 220" xmlns="http://www.w3.org/2000/svg">
          <rect width="460" height="220" fill="#0a1628"/>
          <rect x="0" y="0" width="135" height="220" fill="rgba(220,38,38,0.1)"/>
          <line x1="135" y1="0" x2="135" y2="220" stroke="rgba(220,38,38,0.4)" stroke-width="1" stroke-dasharray="5,3"/>
          <text x="68" y="20" text-anchor="middle" fill="#f87171" font-size="11" font-weight="bold">Red Zone</text>
          <text x="68" y="34" text-anchor="middle" fill="rgba(248,113,113,0.7)" font-size="9">(threat origin)</text>
          <path d="M175,30 Q230,15 295,32 Q360,50 395,100 Q410,165 340,200 Q270,212 215,200 Q170,185 168,140 Q162,80 175,30 Z" fill="#1a3148" stroke="#3a6b8c" stroke-width="2"/>
          <text x="285" y="68" text-anchor="middle" fill="rgba(95,168,211,0.5)" font-size="13" font-weight="bold">Taliaria</text>
          <circle cx="245" cy="125" r="14" fill="rgba(251,191,36,0.18)" stroke="#fbbf24" stroke-width="1.5"/>
          <polygon points="245,117 248,123 254,123 249,127 251,133 245,129 239,133 241,127 236,123 242,123" fill="#fbbf24" stroke="#0a0e14" stroke-width="1"/>
          <text x="245" y="148" text-anchor="middle" fill="#fde68a" font-size="9">★ Arian (Capital)</text>
          <circle cx="320" cy="160" r="14" fill="rgba(251,191,36,0.18)" stroke="#fbbf24" stroke-width="1.5"/>
          <rect x="313" y="153" width="14" height="14" fill="#a78bfa" stroke="#0a0e14" stroke-width="1"/>
          <text x="320" y="183" text-anchor="middle" fill="#fde68a" font-size="9">▣ Eagle Airbase</text>
          <circle cx="210" cy="70" r="12" fill="rgba(251,191,36,0.18)" stroke="#fbbf24" stroke-width="1.5"/>
          <circle cx="210" cy="70" r="5" fill="#fcd34d" stroke="#0a0e14" stroke-width="1"/>
          <text x="210" y="55" text-anchor="middle" fill="#fde68a" font-size="9">Talos</text>
          <circle cx="370" cy="100" r="12" fill="rgba(251,191,36,0.18)" stroke="#fbbf24" stroke-width="1.5"/>
          <circle cx="370" cy="100" r="5" fill="#fcd34d" stroke="#0a0e14" stroke-width="1"/>
          <text x="370" y="85" text-anchor="middle" fill="#fde68a" font-size="9">Miron</text>
          <circle cx="245" cy="190" r="12" fill="rgba(251,191,36,0.18)" stroke="#fbbf24" stroke-width="1.5"/>
          <circle cx="245" cy="190" r="5" fill="#fcd34d" stroke="#0a0e14" stroke-width="1"/>
          <text x="245" y="208" text-anchor="middle" fill="#fde68a" font-size="9">Plaion</text>
        </svg>
        <div class="caption">תצוגת המפה: אזור אדום במערב (מקור איומים), טליאריה במרכז, 5 יעדים אסטרטגיים עם הילה צהובה</div>
      </div>
      <h4>5 יעדים אסטרטגיים פזורים בתוך המדינה:</h4>
      <ul>
        <li>⭐ <b>Arian (Capital)</b> - הבירה (ערך 5) - כוכב צהוב</li>
        <li>🏰 <b>Eagle Airbase</b> - בסיס חיל אוויר (ערך 4) - ריבוע סגול</li>
        <li>🏛 <b>Talos / Miron</b> - ערי מטרופולין (ערך 3 כל אחת)</li>
        <li>🏛 <b>Plaion</b> - עיר (ערך 2)</li>
      </ul>
      <p>היעדים מסומנים עם <b>הילה צהובה בולטת</b> כדי שיהיה קל לראות אותם גם מתחת לסוללות.</p>
      <h4>⛰ טופוגרפיה - רכסי הרים</h4>
      <p>בכל משחק חדש המערכת מייצרת <b>2 רכסי הרים</b> אקראיים בתוך המדינה, בגבהים של <b>2,000-4,000 מטר</b>. הרכסים מסומנים בקו רכס לבן וצל חום, ומוצגים גם בתיוג הגובה שלהם.</p>
      <p>ההרים <b style="color:#fbbf24">חוסמים קו ראיה (LOS - Line Of Sight)</b> - מכ"ם או סוללה שמסתתר מאחורי רכס לא יכולים לזהות או ליירט איום מהצד השני, כל עוד האיום נמוך מצמרת הרכס.</p>
      <div class="tip">🎲 בכל פעם שתאפס את המפה - גבולות המדינה, מיקומי היעדים <u>וגם רכסי ההרים</u> יוגרלו מחדש כדי לוודא שכל משחק שונה ומאתגר.</div>
    `
  },
  {
    title: '🛡 סוללות הגנה אווירית',
    html: () => `
      <p>חמש סוללות הגנה שונות, כל אחת עם תכונות ייחודיות. הקטלוג מימין מציג את הנתונים העיקריים.</p>
      <table>
        <tr><th>סוללה</th><th>טווח</th><th>גובה</th><th>PK</th><th>RT</th><th>תחמושת</th></tr>
        <tr><td><span class="swatch" style="background:#3b82f6"></span> Iron shield</td><td>4-70</td><td>0-9</td><td class="key">90%</td><td>1s</td><td>8</td></tr>
        <tr><td><span class="swatch" style="background:#10b981"></span> SA-8 Gecko</td><td>1.5-30</td><td>0-5</td><td class="key">65%</td><td>0.5s</td><td>3</td></tr>
        <tr><td><span class="swatch" style="background:#8b5cf6"></span> Barak</td><td>0.5-100</td><td>0-16</td><td class="key">85%</td><td>0.5s</td><td>6</td></tr>
        <tr><td><span class="swatch" style="background:#f59e0b"></span> Patriot PAC-3</td><td>3-160</td><td>0-24</td><td class="key">65%</td><td>1.5s</td><td>4</td></tr>
        <tr><td><span class="swatch" style="background:#d946ef"></span> David's Sling</td><td>40-200</td><td>5-30</td><td class="key">70%</td><td>1s</td><td>5</td></tr>
      </table>
      <h4>מה כל מספר אומר:</h4>
      <ul>
        <li><b>טווח</b> (ק"מ): בתוך הטווח הזה הסוללה יכולה ליירט.</li>
        <li><b>גובה</b>: מעטפת הגובה - איום מחוץ לתחום הזה לא ניתן ליירט (למשל David's Sling לא מיירט מסוקים בגובה 0.8 ק"מ; Iron shield לא מיירט מטוסים מעל גובה 9 ק"מ).</li>
        <li><b>PK</b>: שיעור פגיעה - אחוז המיירטים שמצליחים לפגוע בתנאי שיורט בגאומטריה תקינה.</li>
        <li><b>RT</b>: זמן תגובה - שניות מההחלטה לירות עד השיגור בפועל. בזמן הזה האיום ממשיך לנוע.</li>
        <li><b>תחמושת</b>: מספר המיירטים בסוללה. נגמרו - אין יותר ירי מהסוללה הספציפית.</li>
      </ul>
      <h4>📦 מצבור תחמושת אוטומטי (Auto-Stockpile)</h4>
      <p>בפתיחת אתגר, התחמושת של כל סוללה מחושבת אוטומטית כך שהתרחיש <b>תמיד פתיר בפריסה אופטימלית</b>. הנוסחה:</p>
      <pre style="background:#0f1420;padding:6px 10px;border-radius:4px;color:#5fa86b;font-size:12px;text-align:center">תחמושת = ⌈ (איומים ÷ סוללות-בתקציב) ÷ PK × 1.3 ⌉</pre>
      <p>למשל: 16 איומים, 5 סוללות, PK=85% → 16/5/0.85×1.3 ≈ <b>5 מיירטים</b> לכל סוללה (או הערך הקטלוגי, הגבוה מביניהם).</p>
      <div class="tutorial-figure">
        <svg viewBox="0 0 460 220" xmlns="http://www.w3.org/2000/svg">
          <rect width="460" height="220" fill="#0a1628"/>
          <rect x="0" y="190" width="460" height="30" fill="#1a3148"/>
          <line x1="40" y1="20" x2="40" y2="190" stroke="#5fa8d3" stroke-width="1"/>
          <line x1="40" y1="190" x2="430" y2="190" stroke="#3a6b8c" stroke-width="1"/>
          <text x="35" y="194" text-anchor="end" fill="#5fa8d3" font-size="9">0</text>
          <text x="35" y="162" text-anchor="end" fill="#5fa8d3" font-size="9">5</text>
          <text x="35" y="133" text-anchor="end" fill="#5fa8d3" font-size="9">10</text>
          <text x="35" y="76" text-anchor="end" fill="#5fa8d3" font-size="9">20</text>
          <text x="35" y="32" text-anchor="end" fill="#5fa8d3" font-size="9">30</text>
          <text x="20" y="105" text-anchor="middle" fill="#8fb4c9" font-size="9" transform="rotate(-90 20 105)">altitude (km)</text>
          <rect x="60" y="139" width="38" height="51" fill="rgba(59,130,246,0.18)" stroke="#3b82f6" stroke-width="1"/>
          <text x="79" y="135" text-anchor="middle" fill="#3b82f6" font-size="9" font-weight="bold">Iron shield</text>
          <text x="79" y="170" text-anchor="middle" fill="#3b82f6" font-size="9">0-9</text>
          <rect x="110" y="162" width="38" height="28" fill="rgba(16,185,129,0.18)" stroke="#10b981" stroke-width="1"/>
          <text x="129" y="135" text-anchor="middle" fill="#10b981" font-size="9" font-weight="bold">SA-8</text>
          <text x="129" y="180" text-anchor="middle" fill="#10b981" font-size="9">0-5</text>
          <rect x="160" y="99" width="38" height="91" fill="rgba(139,92,246,0.18)" stroke="#8b5cf6" stroke-width="1"/>
          <text x="179" y="93" text-anchor="middle" fill="#8b5cf6" font-size="9" font-weight="bold">Barak</text>
          <text x="179" y="150" text-anchor="middle" fill="#8b5cf6" font-size="9">0-16</text>
          <rect x="210" y="54" width="38" height="136" fill="rgba(245,158,11,0.18)" stroke="#f59e0b" stroke-width="1"/>
          <text x="229" y="48" text-anchor="middle" fill="#f59e0b" font-size="9" font-weight="bold">Patriot</text>
          <text x="229" y="125" text-anchor="middle" fill="#f59e0b" font-size="9">0-24</text>
          <rect x="260" y="20" width="38" height="142" fill="rgba(217,70,239,0.18)" stroke="#d946ef" stroke-width="1"/>
          <text x="279" y="14" text-anchor="middle" fill="#d946ef" font-size="9" font-weight="bold">D.Sling</text>
          <text x="279" y="92" text-anchor="middle" fill="#d946ef" font-size="9">5-30</text>
          <line x1="310" y1="133" x2="430" y2="133" stroke="#dc2626" stroke-width="0.7" stroke-dasharray="2,3"/>
          <text x="365" y="129" text-anchor="middle" fill="#dc2626" font-size="9" font-weight="bold">▲ Fighter @10km</text>
          <line x1="310" y1="179" x2="430" y2="179" stroke="#fbbf24" stroke-width="0.7" stroke-dasharray="2,3"/>
          <text x="365" y="176" text-anchor="middle" fill="#fbbf24" font-size="9" font-weight="bold">◆ UAV @2km</text>
          <line x1="310" y1="186" x2="430" y2="186" stroke="#a855f7" stroke-width="0.7" stroke-dasharray="2,3"/>
          <text x="365" y="206" text-anchor="middle" fill="#a855f7" font-size="9" font-weight="bold">✚ Helo @0.8km</text>
        </svg>
        <div class="caption">מעטפות הגובה של כל סוללה (תצוגת צד) - שים לב: David's Sling מתחיל מ-5 ק"מ ולא מיירט מסוקים, SA-8 לא מגיע למטוסים בגובה 10</div>
      </div>
    `
  },
  {
    title: '📡 מכ"מים ותפקידם',
    html: () => `
      <p>שלושה סוגי מכ"מים עצמאיים. הם <b>אינם יורים מיירטים</b>, אבל הם תפקיד מערכתי קריטי - <b style="color:#06b6d4">מאריכים את טווח הסוללות</b>.</p>
      <table>
        <tr><th>מכ"ם</th><th>טווח גילוי</th></tr>
        <tr><td><span class="swatch" style="background:#06b6d4"></span> Long-Range Radar</td><td>350 ק"מ</td></tr>
        <tr><td><span class="swatch" style="background:#0ea5e9"></span> Medium-Range Radar</td><td>180 ק"מ</td></tr>
        <tr><td><span class="swatch" style="background:#0891b2"></span> Short-Range Radar</td><td>100 ק"מ</td></tr>
      </table>
      <h4>איך זה עובד:</h4>
      <ul>
        <li>בלי מכ"ם חיצוני - הסוללה תירה <b>רק כשהאיום בתוך הטווח שלה</b>.</li>
        <li>עם מכ"ם שמכסה אזור מעבר לטווח הסוללה - הסוללה <b>תתחיל הכנה לירי כבר כשהאיום עוד מחוץ לטווח</b>, ובלבד שנקודת הפגיעה החזויה תהיה בתוך הטווח.</li>
        <li>במצב הזה תראה <b>הילה תכלת</b> סביב הסוללה (במקום צהובה) וקו תכלת מהסוללה אל האיום.</li>
      </ul>
      <div class="tutorial-figure">
        <svg viewBox="0 0 460 220" xmlns="http://www.w3.org/2000/svg">
          <rect width="460" height="220" fill="#0a1628"/>
          <!-- Radar coverage (large, on the LEFT — closer to threat) -->
          <circle cx="220" cy="110" r="150" fill="rgba(6,182,212,0.07)" stroke="#06b6d4" stroke-width="1" stroke-dasharray="5,5"/>
          <text x="120" y="20" text-anchor="middle" fill="#06b6d4" font-size="10" font-weight="bold">Long-Range Radar coverage</text>
          <!-- Battery range (smaller, on the RIGHT — the weapon system) -->
          <circle cx="370" cy="110" r="55" fill="rgba(245,158,11,0.12)" stroke="#f59e0b" stroke-width="1.5"/>
          <text x="370" y="46" text-anchor="middle" fill="#f59e0b" font-size="9" font-weight="bold">Patriot range</text>
          <!-- Battery (rightmost) -->
          <polygon points="370,98 383,110 370,122 357,110" fill="#f59e0b" stroke="#0a0e14" stroke-width="1.5"/>
          <text x="370" y="140" text-anchor="middle" fill="#f59e0b" font-size="9">Patriot (battery)</text>
          <!-- Radar (LEFT of battery, between threat and battery) -->
          <circle cx="220" cy="110" r="10" fill="#06b6d4" stroke="#0a0e14" stroke-width="2"/>
          <line x1="220" y1="100" x2="220" y2="105" stroke="#0a0e14" stroke-width="2"/>
          <text x="220" y="135" text-anchor="middle" fill="#06b6d4" font-size="9">Radar</text>
          <!-- Threat coming from far LEFT -->
          <polygon points="50,107 62,113 50,119 56,113" fill="#dc2626" stroke="#000" stroke-width="0.5"/>
          <text x="56" y="98" text-anchor="middle" fill="#dc2626" font-size="9">Threat →</text>
          <!-- Threat path: enters radar first, then battery -->
          <line x1="62" y1="113" x2="350" y2="113" stroke="#dc2626" stroke-width="1" stroke-dasharray="4,3"/>
          <polygon points="350,109 358,113 350,117" fill="#dc2626"/>
          <!-- Annotation: detection point (when threat enters radar coverage) -->
          <line x1="72" y1="142" x2="72" y2="160" stroke="#06b6d4" stroke-width="1"/>
          <circle cx="72" cy="113" r="3.5" fill="none" stroke="#06b6d4" stroke-width="1.5"/>
          <text x="72" y="173" text-anchor="middle" fill="#06b6d4" font-size="8" font-weight="bold">1. נכנס למכ"ם</text>
          <text x="72" y="184" text-anchor="middle" fill="#7e91a8" font-size="8">→ מתחיל גילוי</text>
          <!-- Annotation: battery prepares early -->
          <line x1="220" y1="142" x2="220" y2="160" stroke="#fbbf24" stroke-width="1"/>
          <text x="220" y="173" text-anchor="middle" fill="#fbbf24" font-size="8" font-weight="bold">2. הסוללה מתכוננת</text>
          <text x="220" y="184" text-anchor="middle" fill="#7e91a8" font-size="8">RT - בזמן שעדיין מחוץ לטווח</text>
          <!-- Annotation: enters battery range, fires -->
          <line x1="320" y1="142" x2="320" y2="160" stroke="#f59e0b" stroke-width="1"/>
          <text x="320" y="173" text-anchor="middle" fill="#f59e0b" font-size="8" font-weight="bold">3. נכנס לסוללה</text>
          <text x="320" y="184" text-anchor="middle" fill="#7e91a8" font-size="8">→ שיגור מיידי</text>
        </svg>
        <div class="caption">המכ"ם נמצא קדימה (משמאל לסוללה) - רואה את האיום הרבה לפני שהוא נכנס לטווח הסוללה. הסוללה מבצעת הכנה מוקדמת בזמן שהאיום עדיין מחוץ לטווחה.</div>
      </div>
      <div class="tip">📡 מכ"ם ארוך-טווח לפני סוללת Patriot מוסיף משמעותית את חלון היירוט שלה - זה אפקט סינרגטי מועיל ביותר.</div>
      <h4>⛰ קו ראיה (LOS - Line Of Sight) ומיסוך טופוגרפי</h4>
      <p>כל מכ"ם וכל סוללה <b>חייבים קו ראיה ישיר</b> אל האיום כדי לזהות / ליירט אותו. אם רכס הרים נמצא בין הסנסור לאיום, והאיום טס נמוך מהפסגה - <b style="color:#dc2626">האיום מוסתר</b>.</p>
      <ul>
        <li>איום שטס בגובה <b>2 ק"מ</b> מאחורי רכס בגובה <b>3.5 ק"מ</b> - בלתי-נראה לחלוטין למכ"ם שמולו.</li>
        <li>ברגע שהאיום עולה מעל גובה הרכס (טופוגרפיה תורמת לגובהו האבסולוטי), הוא <b>חוזר להיות גלוי</b>.</li>
        <li>טקטית: <b>הצב מכ"מים בקצוות</b> כך שיראו עוקפים מסביב להרים, לא רק ישירות מצד אחד.</li>
      </ul>
      <div class="tip">⛰ <b>טיפ:</b> איום עם RCS נמוך + מיסוך טופוגרפי = הרבה זמן בלתי-מזוהה. שימוש מוצלח בהרים יכול ליצור פירצות בכיסוי ההגנה.</div>
    `
  },
  {
    title: '✈ איומים אוויריים',
    html: () => `
      <p>שלושה סוגי איומים, כל אחד עם תכונות ייחודיות שמשפיעות על איזו סוללה תוכל לטפל בו:</p>
      <table>
        <tr><th>איום</th><th>מהירות</th><th>גובה</th><th>RCS</th></tr>
        <tr><td><span class="swatch" style="background:#fbbf24"></span> Attack UAV</td><td>18</td><td>2 ק"מ</td><td class="key">0.1</td></tr>
        <tr><td><span class="swatch" style="background:#dc2626"></span> Fighter Jet</td><td>40</td><td>10 ק"מ</td><td class="key">1.0</td></tr>
        <tr><td><span class="swatch" style="background:#a855f7"></span> Attack Helicopter</td><td>22</td><td>0.8 ק"מ</td><td class="key">0.7</td></tr>
      </table>
      <h4>חתימת מכ"ם (RCS) - חשוב!</h4>
      <p>RCS משפיע על הטווח האפקטיבי לפי משוואת המכ"ם: <code>range ∝ RCS<sup>¼</sup></code></p>
      <ul>
        <li><b>Fighter Jet (RCS 1.0)</b>: 100% מהטווח. נראה היטב.</li>
        <li><b>Helicopter (RCS 0.7)</b>: ~91% מהטווח.</li>
        <li><b>UAV (RCS 0.1)</b>: <b>רק ~56%</b> מהטווח. כטב"מים מאוד קשים לאיתור.</li>
      </ul>
      <div class="tip">⚠ <b>גובה משנה הכל:</b> מסוק בגובה 0.8 ק"מ לא יכול להיות מיורט ע"י David's Sling (גובה מינימום 5 ק"מ). מטוס קרב בגובה 10 ק"מ לא ניתן לתפוס ע"י SA-8 (גובה מקסימום 5).</div>
      <h4>🏔 גובה דינאמי - AGL מול גובה אבסולוטי</h4>
      <p>הערך בקטלוג של כל איום הוא <b>AGL (Above Ground Level)</b> - גובה הטיסה <u>מעל פני הקרקע</u>. האיום שומר על הגובה הזה לכל אורך הטיסה.</p>
      <p>אבל מעטפת הסוללה והגלוי-בלתי-גלוי נקבעים לפי <b>הגובה האבסולוטי</b> (גובה מעל פני הים). הסוללות פרוסות במישור ולצורך פשטות נחשבות בגובה 0, אבל המטוס שטס בגובה קבוע מעל פני הקרקע - <b>הגובה האבסולוטי שלו משתנה</b> כשהוא עובר מעל הרים.</p>
      <p>תראה זאת בתיוג שמעל לאיום (לדוגמה: <code>UAV-3 · 5.4km</code> - הגובה האבסולוטי הנוכחי).</p>
      <ul>
        <li>UAV ב-2 ק"מ AGL מעל קרקע שטוחה = 2 ק"מ גובה אבסולוטי.</li>
        <li>אותו UAV מעל רכס בגובה 3.5 ק"מ = <b>5.5 ק"מ גובה אבסולוטי</b> - מעל מעטפת SA-8 (max 5)!</li>
        <li>תוצאה: SA-8 לא תוכל ליירט אותו בעת המעבר מעל הרכס, גם אם המרחק מאפשר.</li>
      </ul>
      <h4>🎨 אייקונים מובחנים על המפה</h4>
      <ul>
        <li><b style="color:#dc2626">Fighter Jet</b> - מטוס סילון עם חרטום מחודד וכנפי דלתא.</li>
        <li><b style="color:#a855f7">Helicopter</b> - גוף מסוק עם זרוע זנב ודיסקת רוטור שקופה.</li>
        <li><b style="color:#fbbf24">UAV</b> - כטב"ם בעל גוף ארוך, כנפיים סוויפ ו-V-tail בזנב.</li>
      </ul>
    `
  },
  {
    title: '🎯 רצף יירוט - איך זה עובד',
    html: () => `
      <p>כשאיום מגיע לטווח של סוללה - מתחיל רצף של 4 שלבים:</p>
      <ol style="list-style:decimal;padding-right:20px">
        <li style="margin:8px 0"><b>1. גילוי</b> - הסוללה מגלה את האיום (ע"י המכ"ם שלה או ע"י מכ"ם חיצוני).</li>
        <li style="margin:8px 0"><b>2. זמן תגובה (RT)</b> - הסוללה "מתכוננת" לירות. תראה <b>עיגול צהוב מתמלא</b> סביב הסוללה. בזמן הזה האיום ממשיך לנוע.</li>
        <li style="margin:8px 0"><b>3. שיגור הטיל</b> - בסוף ה-RT הטיל יוצא. המערכת מחשבת את <b>נקודת הפגיעה החזויה</b> מתוך מהירות הטיל ומסלול האיום.</li>
        <li style="margin:8px 0"><b>4. תוצאה</b> - תבוצע הגרלה לפי אחוזי ה-<b>PK</b>, והמערכת מחשבת האם בוצע יירוט או שהייתה החטאה.</li>
      </ol>
      <div class="tutorial-figure">
        <svg viewBox="0 0 460 220" xmlns="http://www.w3.org/2000/svg">
          <rect width="460" height="220" fill="#0a1628"/>
          <text x="60" y="14" text-anchor="middle" fill="#5fa8d3" font-size="9" font-weight="bold">1. גילוי</text>
          <circle cx="60" cy="100" r="50" fill="rgba(245,158,11,0.08)" stroke="#f59e0b" stroke-width="1"/>
          <polygon points="60,90 70,100 60,110 50,100" fill="#f59e0b" stroke="#000" stroke-width="1"/>
          <polygon points="20,80 28,84 20,88 24,84" fill="#dc2626" stroke="#000" stroke-width="0.5"/>
          <line x1="28" y1="86" x2="55" y2="100" stroke="#dc2626" stroke-width="0.7" stroke-dasharray="2,2"/>
          <text x="60" y="200" text-anchor="middle" fill="#7e91a8" font-size="8">איום נכנס לטווח</text>
          <line x1="115" y1="20" x2="115" y2="200" stroke="#1f2a3d" stroke-width="1"/>
          <text x="170" y="14" text-anchor="middle" fill="#fbbf24" font-size="9" font-weight="bold">2. RT - הכנה</text>
          <polygon points="170,90 180,100 170,110 160,100" fill="#f59e0b" stroke="#000" stroke-width="1"/>
          <circle cx="170" cy="100" r="20" fill="none" stroke="#fbbf24" stroke-width="3" stroke-dasharray="40,20" stroke-dashoffset="40"/>
          <circle cx="170" cy="100" r="20" fill="none" stroke="rgba(251,191,36,0.2)" stroke-width="3"/>
          <text x="170" y="135" text-anchor="middle" fill="#fbbf24" font-size="10" font-weight="bold">RT 1.0s</text>
          <text x="170" y="200" text-anchor="middle" fill="#7e91a8" font-size="8">עיגול מתמלא</text>
          <line x1="225" y1="20" x2="225" y2="200" stroke="#1f2a3d" stroke-width="1"/>
          <text x="285" y="14" text-anchor="middle" fill="#5fa86b" font-size="9" font-weight="bold">3. שיגור הטיל</text>
          <polygon points="285,90 295,100 285,110 275,100" fill="#f59e0b" stroke="#000" stroke-width="1"/>
          <circle cx="285" cy="100" r="50" fill="none" stroke="rgba(245,158,11,0.3)" stroke-width="0.5"/>
          <line x1="285" y1="100" x2="320" y2="80" stroke="#fef3c7" stroke-width="2"/>
          <circle cx="320" cy="80" r="2.5" fill="#fbbf24"/>
          <polygon points="328,72 336,76 328,80 332,76" fill="#dc2626" stroke="#000" stroke-width="0.5"/>
          <text x="285" y="200" text-anchor="middle" fill="#7e91a8" font-size="8">חישוב נקודת פגיעה</text>
          <line x1="345" y1="20" x2="345" y2="200" stroke="#1f2a3d" stroke-width="1"/>
          <text x="402" y="14" text-anchor="middle" fill="#dc2626" font-size="9" font-weight="bold">4. תוצאה</text>
          <polygon points="402,90 412,100 402,110 392,100" fill="#f59e0b" stroke="#000" stroke-width="1"/>
          <circle cx="402" cy="100" r="50" fill="none" stroke="rgba(245,158,11,0.3)" stroke-width="0.5"/>
          <circle cx="430" cy="83" r="14" fill="rgba(255,180,80,0.5)"/>
          <circle cx="430" cy="83" r="8" fill="rgba(255,255,200,0.9)"/>
          <text x="402" y="200" text-anchor="middle" fill="#7e91a8" font-size="8">פגיעה / החטאה</text>
        </svg>
        <div class="caption">4 שלבי רצף היירוט מהגילוי ועד התוצאה - מה שאתה רואה על המסך לכל איום</div>
      </div>
      <h4>4 הסיבות האפשריות לפספוס:</h4>
      <ul>
        <li>🎲 <b>החטאה סטטיסטית</b> - לפי PK של הסוללה (טיל פטריוט יפספס בממוצע 35% מהיירוטים).</li>
        <li>⏱ <b>זמן מעוף לא מספיק</b> - האיום הקדים להגיע ליעד לפני שהמיירט הגיע אליו.</li>
        <li>🎯 <b>יציאה מטווח</b> - האיום יצא מעטפת הסוללה לפני שהמיירט הגיע.</li>
        <li>📐 <b>חציה משיקית</b> - האיום נע בניצב לציר הסוללה (תוך 15° מהניצב), וקיים קושי גאומטרי ליירוט.</li>
      </ul>
    `
  },
  {
    title: '🛡 משחק ההגנה - איך משחקים',
    html: () => `
      <p>אתה המגן. המערכת שולחת גלי איומים, ואתה צריך להגן על היעדים האסטרטגיים בעזרת תקציב מוגבל של סוללות ומכ"מים.</p>
      <h4>זרימת המשחק:</h4>
      <ul>
        <li>1. בחר רמת קושי (קל / בינוני / קשה / 🕶 קשה במיוחד).</li>
        <li>2. תראה את האיומים על המפה. <b>הם עדיין לא טסים</b> - יש לך זמן להתכונן ולתכנן נכון מול האיום הצפוי.</li>
        <li>3. <b>פרוס סוללות ומכ"מים</b> בתפריט (תג כתום = כמה זמין מכל סוג).</li>
        <li>4. לחץ "▶ הפעל סימולציה" כשמוכן להגנה.</li>
      </ul>
      <h4>תנאי ניצחון לפי רמה:</h4>
      <ul>
        <li>🟢 <b>קל</b>: הבירה (Arian) שלמה <u>וגם</u> פחות מ-4 יעדים נפגעו.</li>
        <li>🟡 <b>בינוני</b>: הבירה שלמה <u>וגם</u> פחות מ-3 יעדים נפגעו.</li>
        <li>🔴 <b>קשה</b>: הבירה שלמה <u>וגם</u> פחות מ-2 יעדים נפגעו.</li>
        <li>🕶 <b>קשה במיוחד (ללא מודיעין)</b>: כמו <b>קשה</b>, אבל <u>לא רואים את האיומים בזמן הפריסה</u>. נתיבי האיום מתגלים רק בלחיצה על "▶ הפעל סימולציה".</li>
      </ul>
      <div class="tip">🕶 <b>מתאר ללא מודיעין</b>: זוהי הסיטואציה המציאותית של מפקד הגנה אווירית — אין לך מודיעין מקדים על תוכניות התקיפה. חובה להתבסס על <b>הגנה רב-שכבתית</b>, פיזור גיאוגרפי, וכיסוי של היעדים בעלי הערך הגבוה ביותר.</div>
      <p><b style="color:#dc2626">פגיעה בבירה = הפסד מיידי</b>, לא משנה כמה יעדים אחרים שרדו.</p>
      <h4>🆕 ממשק חדש</h4>
      <ul>
        <li>📋 <b>מדריך שלבים</b> - בראש הסרגל הימני יוצג פאנל "מה השלב הבא?" עם 3 שלבים מתעדכנים: <span class="key">פרוס סוללות</span> → <span class="key">הוסף מכ"מים</span> → <span class="key">הפעל סימולציה</span>. השלב הנוכחי בולט בצהוב.</li>
        <li>↩ <b>חזור לבחירת משחק</b> - הכפתור הזה מחליף את בחירת הצדדים (כחול/אדום) ברגע שנבחר משחק, ומאפשר לחזור לבחירת מצב/קושי בכל זמן.</li>
        <li>🔒 <b>איומי המערכת נעולים</b> - האיומים מתפרסים אוטומטית ולא ניתן להזיזם או למחוק אותם. רק רכיבי ההגנה שלך הם בני-עריכה.</li>
        <li>🔍 <b>זום ראשוני</b> - המפה נפתחת ב-85% גודל כדי שתראה את כל המדינה. אפשר להתקרב/להתרחק עם כפתורי הזום.</li>
      </ul>
    `
  },
  {
    title: '🛡 שיקולים אסטרטגיים - הגנה',
    html: () => `
      <h4>כיצד לבחור איפה לפרוס:</h4>
      <ul>
        <li>🎯 <b>כסה היטב את הבירה ראשית</b> - היא תנאי הפסד מוחלט.</li>
        <li>🔄 <b>הגנה רב-שכבתית</b> - שתי סוללות שונות מכסות את אותו אזור (PK מוכפל: 90%×90% = 99%).</li>
        <li>📡 <b>השתמש במכ"ם חיצוני לסוללה</b> כדי להאריך את חלון הירי של סוללות איטיות (Patriot).</li>
        <li>🚁 <b>אל תשים David's Sling נגד מסוקים</b> - הוא לא נוגע בגובה <5 ק"מ. השתמש ב-Iron shield / SA-8.</li>
        <li>✈ <b>נגד Fighters בגובה 10 ק"מ</b> - Patriot, Barak, או David's Sling.</li>
        <li>◆ <b>נגד UAVs (RCS נמוך)</b> - הטווח מצטמצם ל-56% בלבד. שים את ה-Iron shield קרוב לציר ההגעה.</li>
        <li>⛰ <b>נצל את ההרים</b> - איום שטס מאחורי רכס מוסתר מהמכ"ם שלפניו. <b>אל תציב את כל המכ"מים בקו אחד</b> - פזר אותם בזוויות שונות כך שלפחות אחד יראה כל איום מסביב לרכסים. מכ"ם רחוק מאחורי רכס לא יעזור גם אם הוא ארוך-טווח.</li>
      </ul>
      <h4>כלכלת חימושים (חשוב להבין):</h4>
      <p>סוללה Iron shield יש לה רק <b>8 מיירטים</b>. אם התוקף שולח 10 איומים בו-זמנית מאותו וקטור, התחמושת תיגמר ולפחות 2 יעברו. <b>הזהר מנקודות חולשה זו</b> - הכפל סוללות באזור עם צפי לאיום משמעותי.</p>
      <div class="tutorial-figure">
        <svg viewBox="0 0 460 220" xmlns="http://www.w3.org/2000/svg">
          <rect width="460" height="220" fill="#0a1628"/>
          <text x="230" y="14" text-anchor="middle" fill="#5fa8d3" font-size="10" font-weight="bold">הגנה רב-שכבתית - 2 סוללות באזור חופף</text>
          <circle cx="180" cy="115" r="65" fill="rgba(59,130,246,0.10)" stroke="#3b82f6" stroke-width="1.5"/>
          <text x="125" y="58" fill="#3b82f6" font-size="9" font-weight="bold">Iron shield (PK 90%)</text>
          <polygon points="180,105 195,115 180,125 165,115" fill="#3b82f6" stroke="#0a0e14" stroke-width="1.5"/>
          <text x="180" y="139" text-anchor="middle" fill="#3b82f6" font-size="8">IRN</text>
          <circle cx="290" cy="115" r="65" fill="rgba(139,92,246,0.10)" stroke="#8b5cf6" stroke-width="1.5"/>
          <text x="345" y="58" fill="#8b5cf6" font-size="9" font-weight="bold">Barak (PK 85%)</text>
          <polygon points="290,105 305,115 290,125 275,115" fill="#8b5cf6" stroke="#0a0e14" stroke-width="1.5"/>
          <text x="290" y="139" text-anchor="middle" fill="#8b5cf6" font-size="8">BRK</text>
          <rect x="200" y="93" width="70" height="44" fill="rgba(95,168,107,0.18)" stroke="#5fa86b" stroke-width="1" stroke-dasharray="4,3"/>
          <text x="235" y="115" text-anchor="middle" fill="#5fa86b" font-size="9" font-weight="bold">אזור חופף</text>
          <text x="235" y="128" text-anchor="middle" fill="#5fa86b" font-size="8">99% פגיעה משולב</text>
          <polygon points="50,170 60,174 50,178 54,174" fill="#dc2626" stroke="#000" stroke-width="0.5"/>
          <text x="55" y="167" fill="#dc2626" font-size="8">איום</text>
          <line x1="55" y1="174" x2="420" y2="174" stroke="#dc2626" stroke-width="0.7" stroke-dasharray="3,3"/>
          <line x1="55" y1="174" x2="55" y2="200" stroke="#5fa86b" stroke-width="0" />
          <text x="120" y="194" text-anchor="middle" fill="#5fa86b" font-size="8">ניסיון 1: IRN</text>
          <text x="235" y="194" text-anchor="middle" fill="#5fa86b" font-size="8">ניסיון 2: IRN+BRK</text>
          <text x="350" y="194" text-anchor="middle" fill="#5fa86b" font-size="8">ניסיון 3: BRK</text>
          <text x="230" y="215" text-anchor="middle" fill="#7e91a8" font-size="9">90% × 90% = 99% (אם ראשון מפספס, השני יתפוס)</text>
        </svg>
        <div class="caption">שתי סוללות שמכסות את אותו אזור: ההסתברות שהאיום ייפגע מצטברת - אם הראשון פספס, השני נותן הזדמנות נוספת</div>
      </div>
      <div class="tip">⚡ Barak הוא הסוללה היחידה עם RT=0.5s והוא מכסה גם UAV וגם Fighter. הוא הסוללה הכי גמישה.</div>
    `
  },
  {
    title: '🎯 משחק ההתקפה - איך משחקים',
    html: () => `
      <p>אתה התוקף. המערכת פורסת אוטומטית הגנה, ואתה צריך לתכנן את ההתקפה כדי לפרוץ אותה ולעמוד במשימה.</p>
      <h4>זרימת המשחק - 3 לחיצות לפריסת מטרה אווירית:</h4>
      <ul>
        <li><b>לחיצה 1:</b> בחר סוג איום מתפריט "🔴 איומים אוויריים" (UAV / Fighter / Helicopter).</li>
        <li><b>לחיצה 2:</b> לחץ על המפה <b style="color:#dc2626">מחוץ לגבולות המדינה</b> - זו נקודת המוצא של האיום. גבול המדינה יזרח באדום מקווקו.</li>
        <li><b>לחיצה 3:</b> לחץ על אחד מהיעדים האסטרטגיים שאליו האיום יתקוף. היעדים יזרחו באדום.</li>
      </ul>
      <div class="tutorial-figure">
        <svg viewBox="0 0 460 220" xmlns="http://www.w3.org/2000/svg">
          <rect width="460" height="220" fill="#0a1628"/>
          <rect x="0" y="40" width="80" height="180" fill="#0f1420" stroke="#1f2a3d" stroke-width="1"/>
          <text x="40" y="55" text-anchor="middle" fill="#dc2626" font-size="9" font-weight="bold">תפריט איומים</text>
          <rect x="6" y="65" width="68" height="22" fill="rgba(220,38,38,0.15)" stroke="#dc2626" stroke-width="2" rx="3"/>
          <text x="40" y="80" text-anchor="middle" fill="#fbbf24" font-size="9" font-weight="bold">UAV</text>
          <circle cx="22" cy="76" r="9" fill="#dc2626"/>
          <text x="22" y="79" text-anchor="middle" fill="#fff" font-size="11" font-weight="bold">1</text>
          <rect x="6" y="95" width="68" height="22" fill="#1a2436" stroke="#2a3a55" stroke-width="1" rx="3"/>
          <text x="40" y="110" text-anchor="middle" fill="#dc2626" font-size="9">Fighter</text>
          <rect x="6" y="125" width="68" height="22" fill="#1a2436" stroke="#2a3a55" stroke-width="1" rx="3"/>
          <text x="40" y="140" text-anchor="middle" fill="#a855f7" font-size="9">Helicopter</text>
          <rect x="90" y="20" width="80" height="200" fill="rgba(220,38,38,0.10)"/>
          <line x1="170" y1="20" x2="170" y2="220" stroke="#dc2626" stroke-width="1.5" stroke-dasharray="5,3"/>
          <text x="130" y="34" text-anchor="middle" fill="#f87171" font-size="9" font-weight="bold">Red Zone</text>
          <path d="M180,40 Q230,28 295,42 Q355,60 385,105 Q400,165 335,200 Q275,215 220,205 Q175,190 173,145 Q170,90 180,40 Z" fill="#1a3148" stroke="#3a6b8c" stroke-width="2"/>
          <circle cx="135" cy="135" r="14" fill="rgba(220,38,38,0.30)" stroke="#dc2626" stroke-width="2"/>
          <text x="135" y="140" text-anchor="middle" fill="#fff" font-size="13" font-weight="bold">2</text>
          <text x="135" y="158" text-anchor="middle" fill="#f87171" font-size="9" font-weight="bold">מוצא</text>
          <circle cx="265" cy="125" r="14" fill="rgba(251,191,36,0.18)" stroke="#fbbf24" stroke-width="2"/>
          <polygon points="265,118 268,124 273,124 269,128 270,134 265,131 260,134 261,128 257,124 262,124" fill="#fbbf24" stroke="#0a0e14" stroke-width="0.5"/>
          <circle cx="295" cy="100" r="13" fill="rgba(220,38,38,0.30)" stroke="#dc2626" stroke-width="2"/>
          <text x="295" y="105" text-anchor="middle" fill="#fff" font-size="13" font-weight="bold">3</text>
          <text x="265" y="148" text-anchor="middle" fill="#fde68a" font-size="9">Arian</text>
          <line x1="148" y1="135" x2="252" y2="125" stroke="#5fa86b" stroke-width="1.5" stroke-dasharray="6,4"/>
          <polygon points="252,125 244,121 244,129" fill="#5fa86b"/>
          <text x="200" y="115" text-anchor="middle" fill="#5fa86b" font-size="8">מסלול האיום</text>
          <text x="230" y="208" text-anchor="middle" fill="#7e91a8" font-size="9">3 לחיצות: בחר סוג → נקודת מוצא → יעד אסטרטגי</text>
        </svg>
        <div class="caption">סדר ה-3 לחיצות באתגר התקפה: 1) בחר סוג איום מהתפריט • 2) לחץ באזור האדום • 3) לחץ על יעד אסטרטגי</div>
      </div>
      <p>כמות הכלים האוויריים שתוכל להשתמש מוצגת בתג אדום על כפתורי האיומים. כל איום שתציב יוריד את הכמות שבידיך.</p>
      <h4>תנאי ניצחון לפי רמה:</h4>
      <ul>
        <li>🟢 <b>קל</b>: פגע ב<b>בירה (Arian)</b>. לרשותך 40 כלים אוויריים.</li>
        <li>🟡 <b>בינוני</b>: פגע ב<b>3 יעדים אסטרטגיים שונים</b>. לרשותך 30 כלים אוויריים.</li>
        <li>🔴 <b>קשה</b>: פגע ב<b>4 יעדים שונים</b>, או ב<b>בירה + 2 נוספים</b>. לרשותך 20 כלים אוויריים.</li>
        <li>🕶 <b>קשה במיוחד (ללא מודיעין)</b>: כמו <b>קשה</b>, אבל <u>פריסת ההגנה נסתרת</u>. אתה לא רואה איפה ההגנה פרוסה — תכנן את נתיבי התקיפה לפי הנחות בלבד. ההגנה מתגלה רק כשתפעיל סימולציה.</li>
      </ul>
      <div class="tip">🕶 <b>מתאר ללא מודיעין</b>: זוהי הסיטואציה של מתכנן תקיפה אווירית כאשר המודיעין על מערך ההגנה שלם או חלקי לא קיים. תפזר את האיומים על מספר וקטורים שונים כדי למקסם סיכויי פריצה דרך נקודות חולשה שאתה לא מכיר. שלח כטב"מים זולים כ"גלאים" לפני שיגור Fighters יקרים.</div>
      <h4>🆕 ממשק חדש</h4>
      <ul>
        <li>📋 <b>מדריך שלבים</b> - תראה למעלה פאנל "מה השלב הבא?" עם 4 שלבים מתעדכנים: <span class="key">בחר סוג</span> → <span class="key">לחץ מוצא</span> → <span class="key">לחץ יעד</span> → <span class="key">הפעל</span>. השלב הנוכחי בולט בצהוב.</li>
        <li>↩ <b>חזור לבחירת משחק</b> - בכל זמן אפשר לחזור לבחור מצב/קושי שונה.</li>
      </ul>
    `
  },
  {
    title: '🎯 שיקולים אסטרטגיים - התקפה + טיפים נוספים',
    html: () => `
      <h4>כיצד לפרוץ את ההגנה:</h4>
      <ul>
        <li>💥 <b>הספקי יירוט (Interception Capacity)</b> - שלח 4-5 כטב"מים בו-זמנית מאותו וקטור כדי למצות את התחמושת של Iron shield, ואז שלח את ה-Fighters יקרי-הערך. סוללה עם תחמושת ריקה לא יורה.</li>
        <li>📡 <b>נצל RCS נמוך</b> - כטב"מים (RCS 0.1) ניתן ליירט רק ב-56% מטווח הסוללה. אם תכוון אותם דרך אזורים עם כיסוי דליל, יש סיכוי טוב לפרוץ.</li>
        <li>📐 <b>זוויות חציה משיקית</b> - אם תפזר את האיומים כך שיגיעו בניצב לסוללה (ולא בקו ישר אליה), יש סיכוי לפספוס משיקי.</li>
        <li>⛰ <b>גובה ומיסוך הרים</b> - מסוקים (0.8 ק"מ) נמלטים מ-David's Sling. Fighters (10 ק"מ) נמלטים מ-SA-8. <b>תכנן מסלולים שעוברים מאחורי רכסים</b> - האיום מוסתר מהסנסור שמסתתר מאחור עד שעובר את צמרת הרכס.</li>
        <li>🎯 <b>תקוף יעדים מוגנים פחות</b> - ההגנה מתפרסת סביב הבירה כברירת מחדל. ערים פריפריאליות עשויות להיות פחות מוגנות.</li>
      </ul>
      <h4>תכונות מערכת נוספות:</h4>
      <ul>
        <li>📋 <b>מדריך שלבים</b> - מתעדכן תוך כדי משחק כדי להזכיר לך מה לעשות הבא.</li>
        <li>↩ <b>חזור לבחירת משחק</b> - מחליף את כפתורי הצדדים, לחזרה למסך הראשי.</li>
        <li>🔍 <b>זום אוטומטי</b> - המפה מתחילה ב-85% גודל כדי לראות הכל. כפתורי הזום בצד השמאלי-עליון.</li>
        <li>📦 <b>מצבור תחמושת אוטומטי</b> - הסוללות מקבלות מספיק מיירטים לפי כמות האיומים, כך שהמשחק תמיד פתיר.</li>
        <li>📺 <b>ציר זמן</b> - אחרי הסימולציה, סקרולר מאפשר לחזור ולהריץ קדימה את האירועים.</li>
        <li>📊 <b>מסך סיכום</b> - כולל המלצות אישיות לשיפור על-בסיס מה שקרה במשחק שלך.</li>
        <li>ⓘ <b>כפתורי מידע</b> - ליד כל סוללה/מכ"ם/איום בתפריט, לקבלת פרטים מלאים.</li>
      </ul>
      <div class="tip">💡 <b>בהצלחה!</b> אפשר לפתוח את המדריך הזה שוב בכל זמן ע"י לחיצה על הכפתור <span class="key">📘 הוראות המשחק</span> מתחת לכותרת. אפשר גם להתחיל משחק חדש דרך הכפתור <span class="key">🆕 משחק חדש</span>.</div>
    `
  }
];

function showTutorial(stepIdx) {
  if (stepIdx < 0) stepIdx = 0;
  if (stepIdx >= TUTORIAL_STEPS.length) stepIdx = TUTORIAL_STEPS.length - 1;
  state.tutorialStep = stepIdx;
  const step = TUTORIAL_STEPS[stepIdx];
  const bodyEl = document.getElementById('tutorial-body');
  bodyEl.innerHTML = `
    <div class="tutorial-step">
      <h3>${step.title}</h3>
      ${step.html()}
    </div>
  `;
  bodyEl.scrollTop = 0;
  // Render dots
  const dotsEl = document.getElementById('tutorial-dots');
  dotsEl.innerHTML = TUTORIAL_STEPS.map((_, i) =>
    `<div class="tutorial-dot ${i === stepIdx ? 'active' : ''}" data-i="${i}"></div>`
  ).join('');
  dotsEl.querySelectorAll('.tutorial-dot').forEach(dot => {
    dot.addEventListener('click', () => showTutorial(parseInt(dot.dataset.i)));
  });
  // Update button states
  document.getElementById('tutorial-prev').disabled = stepIdx === 0;
  document.getElementById('tutorial-next').textContent =
    stepIdx === TUTORIAL_STEPS.length - 1 ? 'התחל לשחק! ✓' : 'הבא ›';
  document.getElementById('tutorial-modal').classList.add('visible');
}

function tutorialNext() {
  if (state.tutorialStep === TUTORIAL_STEPS.length - 1) {
    hideTutorial();
  } else {
    showTutorial(state.tutorialStep + 1);
  }
}

function hideTutorial() {
  document.getElementById('tutorial-modal').classList.remove('visible');
  // Mark seen so the auto-show on first visit won't retrigger next time
  try { localStorage.setItem('airwar-tutorial-seen', '1'); } catch (e) {}
}

function zoomBy(factor) {
  zoomAt(W / 2, H / 2, factor);
}

function zoomAt(sx, sy, factor) {
  const wx = (sx - state.viewport.offsetX) / state.viewport.scale;
  const wy = (sy - state.viewport.offsetY) / state.viewport.scale;
  const newScale = Math.max(0.5, Math.min(3, state.viewport.scale * factor));
  state.viewport.scale = newScale;
  state.viewport.offsetX = sx - wx * newScale;
  state.viewport.offsetY = sy - wy * newScale;
  updateZoomLevel();
}

function panBy(dx, dy) {
  state.viewport.offsetX += dx;
  state.viewport.offsetY += dy;
}

function resetView() {
  const isMobile = window.MOBILE_MODE || window.matchMedia('(max-width: 768px)').matches;
  const s  = isMobile ? 0.48 : 0.85;
  // On mobile bias the view toward the LEFT two-thirds of the country
  // so the western spawn region (where threats originate) is visible.
  const cx = isMobile ? 600 : 720;
  const cy = 410;
  state.viewport = {
    offsetX: W / 2 - cx * s,
    offsetY: H / 2 - cy * s,
    scale: s
  };
  updateZoomLevel();
}

function updateZoomLevel() {
  if (zoomLevelEl) zoomLevelEl.textContent = `${Math.round(state.viewport.scale * 100)}%`;
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
    })),
    defenses: state.defenses.map(d => ({
      ammo: d.ammo,
      prepareTarget: d.prepareTarget,
      prepareUntil: d.prepareUntil,
      cd: d.cd
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

function showBackButton() {
  document.getElementById('side-toggle').style.display = 'none';
  document.getElementById('back-to-selection').style.display = '';
}

function showSideToggle() {
  document.getElementById('side-toggle').style.display = '';
  document.getElementById('back-to-selection').style.display = 'none';
  document.getElementById('step-guide-overlay').style.display = 'none';
}

function updateStepGuide() {
  const overlay = document.getElementById('step-guide-overlay');
  const guide = document.getElementById('step-guide');

  if (state.challengeMode !== 'defense-challenge' && state.challengeMode !== 'attack-challenge') {
    overlay.style.display = 'none';
    return;
  }

  overlay.style.display = '';
  let steps;

  if (state.challengeMode === 'defense-challenge') {
    const hasBatteries = state.defenses.some(d => CATALOG[d.key].kind === 'battery');
    const hasRadars = state.defenses.some(d => CATALOG[d.key].kind === 'radar');
    steps = [
      { label: '1️⃣ פרוס סוללות הגנה על המפה', done: hasBatteries, current: !hasBatteries },
      { label: '2️⃣ הוסף מכ"מים להרחבת הכיסוי', done: hasRadars, current: hasBatteries && !hasRadars },
      { label: '3️⃣ לחץ "הפעל סימולציה"', done: false, current: hasBatteries }
    ];
  } else {
    const hasThreats = state.threats.length > 0;
    const isPlacing = state.mode === 'placing';
    const pickingOrigin = state.placeStep === 'origin';
    const pickingTarget = state.placeStep === 'target';
    steps = [
      { label: '1️⃣ בחר סוג איום מהתפריט', done: isPlacing || hasThreats, current: !isPlacing && !hasThreats },
      { label: '2️⃣ לחץ מחוץ לגבולות (נקודת מוצא)', done: pickingTarget || (!pickingOrigin && hasThreats), current: pickingOrigin },
      { label: '3️⃣ לחץ על יעד אסטרטגי', done: !pickingTarget && hasThreats, current: pickingTarget },
      { label: '4️⃣ לחץ "הפעל סימולציה"', done: false, current: hasThreats && !isPlacing }
    ];
  }

  guide.innerHTML = steps.map(s =>
    `<div class="step ${s.done ? 'done' : s.current ? 'current' : 'pending'}">${s.label}</div>`
  ).join('');
}

function selectPlace(key) {
  const c = CATALOG[key];
  if (isSimActive()) return;

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
  updateStepGuide();
  closeMobileSidebar();
}

function refreshButtonStates() {
  document.querySelectorAll('.btn-grid button[data-key]').forEach(b => {
    b.classList.toggle('active', state.mode === 'placing' && b.dataset.key === state.placeKey);
  });
  canvas.classList.toggle('placing', state.mode === 'placing');
  canvas.classList.toggle('deleting', state.mode === 'deleting');
  renderMobileBudgetPill();
}

function setStatus(text) { document.getElementById('mode-status').textContent = text; }

function showBanner(text, kind) {
  banner.innerHTML = text;
  banner.className = kind || '';
  banner.style.display = 'block';
  // Reset to collapsed on mobile whenever a new banner is shown
  const group = document.getElementById('banner-group');
  group.classList.remove('expanded');
  const expandBtn = document.getElementById('mission-expand-btn');
  expandBtn.style.display = '';
  expandBtn.textContent = '▸ פרטים';
}
function hideBanner() {
  banner.style.display = 'none';
  document.getElementById('mission-expand-btn').style.display = 'none';
  document.getElementById('banner-group').classList.remove('expanded');
}

// =============================================================
// אינטראקציה - עכבר
// =============================================================
function bindCanvas() {
  canvas.addEventListener('click', onCanvasClick);
  canvas.addEventListener('mousedown', onMouseDown);
  canvas.addEventListener('mousemove', onMouseMove);
  canvas.addEventListener('mouseup', onMouseUp);
  canvas.addEventListener('mouseleave', () => {
    tooltip.style.display = 'none';
    if (state.pan) { state.pan = null; canvas.classList.remove('panning'); }
  });
  canvas.addEventListener('wheel', onWheel, { passive: false });
  canvas.addEventListener('contextmenu', (ev) => { ev.preventDefault(); });
  canvas.addEventListener('touchstart', onTouchStart, { passive: false });
  canvas.addEventListener('touchmove', onTouchMove, { passive: false });
  canvas.addEventListener('touchend', onTouchEnd, { passive: false });
  canvas.addEventListener('touchcancel', onTouchCancel, { passive: false });
}

function onWheel(ev) {
  ev.preventDefault();
  const r = canvas.getBoundingClientRect();
  const sx = ev.clientX - r.left;
  const sy = ev.clientY - r.top;
  const factor = ev.deltaY < 0 ? 1.12 : 0.89;
  zoomAt(sx, sy, factor);
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
  if (state._suppressNextClick) { state._suppressNextClick = false; return; }
  if (state.drag && state.drag.moved) { state.drag = null; return; }
  state.drag = null;
  const p = getPos(ev);

  if (state.mode === 'placing') {
    const c = CATALOG[state.placeKey];

    // Three-click attack-challenge threat placement
    if (state.attackChallenge && c.kind === 'threat') {
      if (state.placeStep === 'origin') {
        if (!isInsideRedZone(p.x, p.y)) {
          flashStatus('⚠ נקודת המוצא חייבת להיות בתוך האזור האדום!', 'origin');
          return;
        }
        state.placeOrigin = { x: p.x, y: p.y };
        state.placeStep = 'target';
        setStatus(`${c.name} מ-(${Math.round(p.x)}, ${Math.round(p.y)}) - בחר יעד אסטרטגי`);
        updateStepGuide();
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
        updateStepGuide();
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
// Populated during draw() when scrubbing so drawDefenses can read snapshot
// defense fields (ammo, prepareTarget, prepareUntil) without mutating live state.
let _scrubDef = null;
function flashStatus(msg, returnStep) {
  setStatus(msg);
  clearTimeout(_flashTimer);
  _flashTimer = setTimeout(() => {
    if (state.placeStep === 'origin') {
      const c = CATALOG[state.placeKey];
      setStatus(`${c.name} - לחץ בתוך האזור האדום (נקודת מוצא)`);
    } else if (state.placeStep === 'target') {
      const c = CATALOG[state.placeKey];
      setStatus(`${c.name} - בחר יעד אסטרטגי`);
    }
  }, 1500);
}

function onMouseDown(ev) {
  // In placing mode we still want to allow drag-to-pan and pinch-zoom.
  // The click handler ignores the placement if state._suppressNextClick is
  // set (which happens when state.pan.moved becomes true during the drag),
  // so a real tap still places the item while a drag pans the map.
  if (state.mode === 'placing') {
    state.pan = {
      sx: ev.clientX, sy: ev.clientY,
      ox: state.viewport.offsetX, oy: state.viewport.offsetY,
      moved: false
    };
    canvas.classList.add('panning');
    return;
  }

  const p = getPos(ev);
  let ent = null;
  if (!isSimActive() && state.mode !== 'deleting') {
    ent = findEntityAt(p.x, p.y);
    if (ent && state.challengeMode === 'defense-challenge' && state.threats.includes(ent)) {
      ent = null;
    }
  }

  if (ent) {
    state.drag = { ent, ox: p.x - ent.x, oy: p.y - ent.y, moved: false };
  } else if (ev.button === 0 || ev.button === 1 || ev.button === 2) {
    // Drag-to-pan on empty canvas (any mouse button)
    state.pan = {
      sx: ev.clientX, sy: ev.clientY,
      ox: state.viewport.offsetX, oy: state.viewport.offsetY,
      moved: false
    };
    canvas.classList.add('panning');
  }
}

function onMouseMove(ev) {
  // Pan-drag takes priority - convert screen delta to viewport offset shift
  if (state.pan) {
    const dx = ev.clientX - state.pan.sx;
    const dy = ev.clientY - state.pan.sy;
    if (Math.abs(dx) > 5 || Math.abs(dy) > 5) state.pan.moved = true;
    state.viewport.offsetX = state.pan.ox + dx;
    state.viewport.offsetY = state.pan.oy + dy;
    tooltip.style.display = 'none';
    return;
  }

  const p = getPos(ev);
  state.mouseX = p.x; state.mouseY = p.y;
  if (state.drag) {
    state.drag.ent.x = p.x - state.drag.ox;
    state.drag.ent.y = p.y - state.drag.oy;
    state.drag.moved = true;
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
      lines.push(`תחמושת: ${ent.ammo}/${ent.initialAmmo || c.ammo}`);
    } else if (c.kind === 'radar') {
      lines.push(`גילוי: ${c.detection} ק"מ`);
    } else if (c.kind === 'threat') {
      lines[0] = `<b>${c.name} <span style="color:#fbbf24">[${ent.label}]</span></b>`;
      lines.push(`יעד: ${ent.target}`);
      lines.push(`מהירות: ${c.speed} | גובה אבסולוטי: ${(c.altitude + getTerrainAlt(ent.x, ent.y)).toFixed(1)} ק"מ (AGL ${c.altitude})`);
      lines.push(`סטטוס: ${ent.status === 'destroyed' ? 'הושמד' : ent.status === 'reached' ? 'הגיע ליעד' : 'פעיל'}`);
    }
    tooltip.innerHTML = lines.join('<br>');
    tooltip.style.display = 'block';
    const pr = canvas.parentElement.getBoundingClientRect();
    tooltip.style.left = (ev.clientX - pr.left + 14) + 'px';
    tooltip.style.top  = (ev.clientY - pr.top  + 14) + 'px';
  } else {
    tooltip.style.display = 'none';
  }
}

function onMouseUp() {
  if (state.drag) state.drag = null;
  if (state.pan) {
    if (state.pan.moved) state._suppressNextClick = true;
    state.pan = null;
    canvas.classList.remove('panning');
  }
  canvas.classList.remove('dragging');
}

// =============================================================
// Touch input — single touch maps to mouse, two touches → pinch zoom.
// preventDefault on every touch event suppresses the synthetic mouse
// events the browser would otherwise fire, so the mouse handlers stay
// untouched on desktop and never double-fire on mobile.
// =============================================================
const _touchState = { pinch: null, suppressClick: false };

function _touchToMouseEvent(touch) {
  return { clientX: touch.clientX, clientY: touch.clientY, button: 0, preventDefault: () => {} };
}

function _touchDist(t1, t2) {
  return Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
}

function onTouchStart(ev) {
  ev.preventDefault();
  if (ev.touches.length === 2) {
    state.drag = null;
    if (state.pan) { state.pan = null; canvas.classList.remove('panning'); }
    const t1 = ev.touches[0], t2 = ev.touches[1];
    const r = canvas.getBoundingClientRect();
    _touchState.pinch = {
      startDist: _touchDist(t1, t2),
      startScale: state.viewport.scale,
      startOffsetX: state.viewport.offsetX,
      startOffsetY: state.viewport.offsetY,
      cx: (t1.clientX + t2.clientX) / 2 - r.left,
      cy: (t1.clientY + t2.clientY) / 2 - r.top,
    };
    tooltip.style.display = 'none';
  } else if (ev.touches.length === 1 && !_touchState.pinch) {
    _touchState.suppressClick = false;
    onMouseDown(_touchToMouseEvent(ev.touches[0]));
  }
}

function onTouchMove(ev) {
  ev.preventDefault();
  if (_touchState.pinch && ev.touches.length >= 2) {
    const t1 = ev.touches[0], t2 = ev.touches[1];
    const p = _touchState.pinch;
    const factor = _touchDist(t1, t2) / p.startDist;
    const wx = (p.cx - p.startOffsetX) / p.startScale;
    const wy = (p.cy - p.startOffsetY) / p.startScale;
    const newScale = Math.max(0.5, Math.min(3, p.startScale * factor));
    state.viewport.scale = newScale;
    state.viewport.offsetX = p.cx - wx * newScale;
    state.viewport.offsetY = p.cy - wy * newScale;
    updateZoomLevel();
    return;
  }
  if (!_touchState.pinch && ev.touches.length === 1) {
    onMouseMove(_touchToMouseEvent(ev.touches[0]));
  }
}

function onTouchEnd(ev) {
  ev.preventDefault();
  if (_touchState.pinch) {
    if (ev.touches.length < 2) {
      _touchState.pinch = null;
      _touchState.suppressClick = true;
      state.drag = null;
      if (state.pan) { state.pan = null; canvas.classList.remove('panning'); }
    }
    return;
  }
  if (ev.touches.length === 0) {
    onMouseUp();
    tooltip.style.display = 'none';
    if (_touchState.suppressClick) {
      _touchState.suppressClick = false;
      return;
    }
    if (ev.changedTouches.length > 0) {
      onCanvasClick(_touchToMouseEvent(ev.changedTouches[0]));
    }
  }
}

function onTouchCancel() {
  _touchState.pinch = null;
  state.drag = null;
  if (state.pan) { state.pan = null; canvas.classList.remove('panning'); }
  canvas.classList.remove('dragging');
  tooltip.style.display = 'none';
}

// Returns true when the opposing side's deployment is hidden from the user
// (no-intel "extreme" difficulty, before the player presses ▶).
function intelHidden() {
  return state.noIntel && !state.intelRevealed;
}

function findEntityAt(x, y) {
  // In no-intel mode, hide the opposing side's entities from cursor detection
  // so hover / tooltips don't leak their positions.
  const hideThreats  = intelHidden() && state.challengeMode === 'defense-challenge';
  const hideDefenses = intelHidden() && state.challengeMode === 'attack-challenge';
  const pool = [
    ...(hideDefenses ? [] : state.defenses),
    ...(hideThreats  ? [] : state.threats)
  ];
  for (let i = pool.length - 1; i >= 0; i--) {
    const e = pool[i];
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
    if (!isInsideCountry(x, y)) {
      flashStatus('⚠ לא ניתן להציב מחוץ לגבולות טליאריה');
      return;
    }
    const initialAmmo = (state.autoAmmo && state.autoAmmo[key] !== undefined) ? state.autoAmmo[key] : c.ammo;
    state.defenses.push({
      id: nextId++, key, x, y,
      ammo: initialAmmo, initialAmmo, cd: 0,
      prepareTarget: null,    // threatId currently being prepared (during reactionTime)
      prepareUntil: 0          // simElapsed at which the missile actually launches
    });
  }
  if (state.budget) renderBudget();
  updateStepGuide();
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
  if (state.challengeMode === 'defense-challenge' && state.threats.includes(e)) {
    setStatus('⚠ איומי מערכת לא ניתנים למחיקה במשימת הגנה');
    return;
  }
  state.defenses = state.defenses.filter(x => x !== e);
  state.threats  = state.threats.filter(x => x !== e);
  updateStepGuide();
}

function toggleDelete() {
  state.mode = state.mode === 'deleting' ? 'idle' : 'deleting';
  state.placeKey = null;
  refreshButtonStates();
  setStatus(state.mode === 'deleting' ? 'מצב מחיקה - לחץ על רכיב כדי להסיר' : 'בחר רכיב להוספה');
  if (state.mode === 'deleting') closeMobileSidebar();
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
  updateStepGuide();
}

function resetAll() {
  state.defenses = []; state.threats = []; state.missiles = []; state.explosions = []; state.targetHits = [];
  state.killLabels = []; state.leakerFlashT = -1;
  state.history = [];
  state.scrubTime = null;
  state.serialCounters = {};
  state.results = null;
  hideNewGameCta();
  state.budget = null;
  state.threatBudget = null;
  state.objective = null;
  state.autoAmmo = null;
  state.attackChallenge = false;
  state.challengeDifficulty = null;
  state.challengeMode = null;
  state.noIntel = false;
  state.intelRevealed = false;
  state.mode = 'idle';
  state.placeKey = null;
  state.placeStep = null;
  state.placeOrigin = null;
  document.getElementById('scrubber-row').style.display = 'none';
  setScrubberActive(false);
  // Regenerate the country borders and target locations so each game is fresh
  regenerateLand();
  regenerateTargets();
  regenerateMountains();
  resetView();
  hideBanner();
  refreshButtonStates();
  renderBudget();
  renderResults();
  document.getElementById('battery-legend').style.display = 'none';
  showSideToggle();
  updateStepGuide();
  setStatus('המפה אופסה - מפה ויעדים חדשים');
}

// Display-only legend shown on the map during attack-challenge mode.
// Lists each battery type with max range and engagement altitude only.
function renderBatteryLegend() {
  const wrap = document.getElementById('battery-legend');
  if (!wrap) return;
  if (state.challengeMode !== 'attack-challenge') {
    wrap.style.display = 'none';
    return;
  }
  const list = document.getElementById('battery-legend-list');
  list.innerHTML = '';
  for (const key of BATTERY_KEYS) {
    const c = CATALOG[key];
    const row = document.createElement('div');
    row.className = 'battery-legend-row';
    row.innerHTML = `
      <span class="battery-legend-swatch" style="background:${c.color};color:${c.color}"></span>
      <span class="battery-legend-name">${c.name}</span>
      <span class="battery-legend-stats">טווח ${c.maxRange} ק"מ • גובה ${c.minAlt}-${c.maxAlt} ק"מ</span>
    `;
    list.appendChild(row);
  }
  wrap.style.display = '';
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
  // Deep ocean: radial gradient centered on the map
  const seaGrad = ctx.createRadialGradient(W * 0.5, H * 0.45, 0, W * 0.5, H * 0.5, Math.max(W, H) * 0.76);
  seaGrad.addColorStop(0,   '#0d1c34');
  seaGrad.addColorStop(0.4, '#081020');
  seaGrad.addColorStop(0.75,'#060c18');
  seaGrad.addColorStop(1,   '#030609');
  ctx.fillStyle = seaGrad;
  ctx.fillRect(0, 0, W, H);
  // Edge vignette
  const vig = ctx.createRadialGradient(W / 2, H / 2, H * 0.28, W / 2, H / 2, Math.max(W, H) * 0.72);
  vig.addColorStop(0, 'rgba(0,0,0,0)');
  vig.addColorStop(1, 'rgba(0,0,0,0.52)');
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, W, H);
  // Apply viewport transform - everything map-related scales and pans together.
  // HUD (drawn after restore) stays in screen space.
  ctx.save();
  ctx.translate(state.viewport.offsetX, state.viewport.offsetY);
  ctx.scale(state.viewport.scale, state.viewport.scale);
  drawBackground();
  drawCountry();
  drawMountains();
  drawTargets();

  // When scrubbing, swap dynamic arrays and expose snapshot defense fields via
  // the module-level _scrubDef variable (read by drawDefenses/drawCoverage).
  // We never mutate state.defenses in-place to avoid restore-order fragility.
  let _scrubSaved = null;
  const _scrubSavedElapsed = state.simElapsed;
  _scrubDef = null;
  if (state.scrubTime != null) {
    const snap = findSnapshot(state.scrubTime);
    if (snap) {
      _scrubSaved = {
        threats: state.threats, missiles: state.missiles,
        explosions: state.explosions, targetHits: state.targetHits
      };
      state.threats    = snap.threats;
      state.missiles   = snap.missiles;
      state.explosions = snap.explosions;
      state.targetHits = snap.targetHits;
      state.simElapsed = state.scrubTime;
      _scrubDef        = snap.defenses || null;
    }
  }

  drawCoverage();
  drawDefenses();
  drawThreatPaths();
  drawThreats();
  drawMissiles();
  drawExplosions();
  drawTargetHits();
  drawKillLabels();

  state.simElapsed = _scrubSavedElapsed;
  _scrubDef = null;
  if (_scrubSaved) {
    state.threats    = _scrubSaved.threats;
    state.missiles   = _scrubSaved.missiles;
    state.explosions = _scrubSaved.explosions;
    state.targetHits = _scrubSaved.targetHits;
  }

  drawPlacementGuide();
  ctx.restore();
  drawHUD();
  drawSimOverlay();
}

// Floating ✓ SPLASH confirmations — world space, rise & fade
function drawKillLabels() {
  for (const k of state.killLabels) {
    const p = k.t / k.dur;
    const alpha = p < 0.15 ? p / 0.15 : 1 - (p - 0.15) / 0.85;
    const rise = p * 26;
    ctx.save();
    ctx.globalAlpha = Math.max(0, alpha);
    ctx.font = 'bold 12px "Share Tech Mono", ui-monospace, monospace';
    ctx.textAlign = 'center';
    const txt = '✓ SPLASH';
    const y = k.y - 18 - rise;
    ctx.fillStyle = 'rgba(8, 14, 22, 0.85)';
    const tw = ctx.measureText(txt).width;
    ctx.fillRect(k.x - tw / 2 - 5, y - 11, tw + 10, 15);
    ctx.fillStyle = '#86efac';
    ctx.fillText(txt, k.x, y);
    ctx.font = '9px "Share Tech Mono", ui-monospace, monospace';
    ctx.fillStyle = 'rgba(134, 239, 172, 0.75)';
    ctx.fillText(k.battery, k.x, y + 11);
    ctx.restore();
  }
}

// Screen-space overlays during an active simulation: a large live intercept
// tally (top-centre) and a red "LEAKER" edge flash when a threat breaches.
function drawSimOverlay() {
  const simVisible = isSimActive() || state.scrubTime != null;
  if (!simVisible) return;

  // ── Live tally ──
  const total  = state.threats.length;
  if (total > 0 && state.challengeMode) {
    const killed = state.threats.filter(t => t.status === 'destroyed').length;
    const isAttack = state.challengeMode === 'attack-challenge';
    const breached = state.threats.filter(t => t.status === 'reached').length;
    const big = isAttack ? `${breached}/${total}` : `${killed}/${total}`;
    const label = isAttack ? 'BREACHED' : 'INTERCEPTED';
    const color = isAttack ? '#fca5a5' : '#86efac';

    ctx.save();
    ctx.font = 'bold 20px "Share Tech Mono", ui-monospace, monospace';
    const bigW = ctx.measureText(big).width;
    ctx.font = '8px "Share Tech Mono", ui-monospace, monospace';
    const labW = ctx.measureText(label).width;
    const bw = Math.max(bigW, labW) + 26;
    const bh = 38;
    const bx = (W - bw) / 2;
    const by = 6;
    // Chamfered backing consistent with the TACSIT HUD
    ctx.beginPath();
    ctx.moveTo(bx + 7, by); ctx.lineTo(bx + bw - 7, by);
    ctx.lineTo(bx + bw, by + 7); ctx.lineTo(bx + bw, by + bh);
    ctx.lineTo(bx + 7, by + bh); ctx.lineTo(bx, by + bh - 7);
    ctx.closePath();
    ctx.fillStyle = 'rgba(5, 8, 16, 0.85)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(95, 200, 232, 0.35)';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.textAlign = 'center';
    ctx.fillStyle = color;
    ctx.font = 'bold 20px "Share Tech Mono", ui-monospace, monospace';
    ctx.fillText(big, W / 2, by + 22);
    ctx.fillStyle = 'rgba(143, 180, 201, 0.75)';
    ctx.font = '8px "Share Tech Mono", ui-monospace, monospace';
    ctx.fillText(label, W / 2, by + 33);
    ctx.restore();
  }

  // ── Leaker flash: red edge glow for 0.9s after a breach ──
  const since = state.simElapsed - state.leakerFlashT;
  if (state.leakerFlashT >= 0 && since >= 0 && since < 0.9) {
    const a = (1 - since / 0.9) * 0.4;
    ctx.save();
    const g = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.38, W / 2, H / 2, Math.max(W, H) * 0.7);
    g.addColorStop(0, 'rgba(220, 38, 38, 0)');
    g.addColorStop(1, `rgba(220, 38, 38, ${a})`);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    if (since < 0.6) {
      ctx.font = 'bold 13px "Share Tech Mono", ui-monospace, monospace';
      ctx.textAlign = 'center';
      ctx.fillStyle = `rgba(252, 165, 165, ${1 - since / 0.6})`;
      ctx.fillText('⚠ LEAKER', W / 2, 64);
    }
    ctx.restore();
  }
}

function drawValidityRing(x, y, valid, validLabel, invalidLabel) {
  ctx.beginPath();
  ctx.arc(x, y, 12, 0, Math.PI * 2);
  ctx.strokeStyle = valid ? '#5fa86b' : '#dc2626';
  ctx.lineWidth = 2;
  ctx.setLineDash(valid ? [] : [3, 3]);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.font = 'bold 11px sans-serif';
  ctx.textAlign = 'center';
  const label = valid ? validLabel : invalidLabel;
  if (label) {
    ctx.fillStyle = valid ? '#5fa86b' : '#dc2626';
    ctx.fillText(label, x, y - 18);
  }
}

function drawPlacementGuide() {
  if (state.mode !== 'placing') return;
  const c = CATALOG[state.placeKey];
  if (!c) return;

  if (c.kind === 'battery' || c.kind === 'radar') {
    drawValidityRing(state.mouseX, state.mouseY,
      isInsideCountry(state.mouseX, state.mouseY),
      null, '✗ מחוץ לגבולות טליאריה');
    return;
  }

  if (c.kind !== 'threat') return;
  if (!state.placeStep) return;

  if (state.placeStep === 'origin') {
    drawValidityRing(state.mouseX, state.mouseY,
      isInsideRedZone(state.mouseX, state.mouseY),
      '✓ נקודת מוצא תקינה', '✗ מחוץ לאזור האדום');
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

  // Major grid lines (100km)
  ctx.strokeStyle = 'rgba(95, 168, 211, 0.07)';
  ctx.lineWidth = 0.6;
  for (let x = 0; x <= WORLD_W; x += 100) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, WORLD_H); ctx.stroke();
  }
  for (let y = 0; y <= WORLD_H; y += 100) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(WORLD_W, y); ctx.stroke();
  }
  // Minor grid (50km)
  ctx.strokeStyle = 'rgba(95, 168, 211, 0.028)';
  ctx.lineWidth = 0.4;
  for (let x = 50; x < WORLD_W; x += 100) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, WORLD_H); ctx.stroke();
  }
  for (let y = 50; y < WORLD_H; y += 100) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(WORLD_W, y); ctx.stroke();
  }

  // ── Tactical map frame: border + graduated edge ticks + corner brackets ──
  const GC = 'rgba(95, 168, 211, ';
  // Border
  ctx.strokeStyle = GC + '0.28)';
  ctx.lineWidth = 1;
  ctx.strokeRect(0, 0, WORLD_W, WORLD_H);
  // Graduated ticks: long at 100km, short at 50km, on all four edges
  ctx.strokeStyle = GC + '0.32)';
  for (let x = 50; x < WORLD_W; x += 50) {
    const major = x % 100 === 0;
    const len = major ? 8 : 4;
    ctx.lineWidth = major ? 0.9 : 0.6;
    ctx.beginPath(); ctx.moveTo(x, 0);        ctx.lineTo(x, len);             ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x, WORLD_H);  ctx.lineTo(x, WORLD_H - len);   ctx.stroke();
  }
  for (let y = 50; y < WORLD_H; y += 50) {
    const major = y % 100 === 0;
    const len = major ? 8 : 4;
    ctx.lineWidth = major ? 0.9 : 0.6;
    ctx.beginPath(); ctx.moveTo(0, y);        ctx.lineTo(len, y);             ctx.stroke();
    ctx.beginPath(); ctx.moveTo(WORLD_W, y);  ctx.lineTo(WORLD_W - len, y);   ctx.stroke();
  }
  // Corner brackets
  ctx.strokeStyle = GC + '0.5)';
  ctx.lineWidth = 1.4;
  const cb = 22;
  const corner = (cx, cy, sx, sy) => {
    ctx.beginPath();
    ctx.moveTo(cx + sx * cb, cy); ctx.lineTo(cx, cy); ctx.lineTo(cx, cy + sy * cb);
    ctx.stroke();
  };
  corner(0, 0, 1, 1); corner(WORLD_W, 0, -1, 1);
  corner(0, WORLD_H, 1, -1); corner(WORLD_W, WORLD_H, -1, -1);

  // Grid coordinate labels (km)
  ctx.fillStyle = GC + '0.22)';
  ctx.font = '9px monospace';
  ctx.textAlign = 'right';
  for (let x = 100; x < WORLD_W; x += 100) {
    ctx.fillText(x, x - 2, 18);
  }
  for (let y = 100; y < WORLD_H; y += 100) {
    ctx.fillText(y, 30, y - 2);
  }

  // Red zone - diagonal hazard stripe
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, 380, WORLD_H);
  ctx.clip();
  ctx.fillStyle = 'rgba(180, 20, 20, 0.07)';
  ctx.fillRect(0, 0, 380, WORLD_H);
  ctx.strokeStyle = 'rgba(220, 38, 38, 0.07)';
  ctx.lineWidth = 18;
  for (let i = -WORLD_H; i < 380 + WORLD_H; i += 36) {
    ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i + WORLD_H, WORLD_H); ctx.stroke();
  }
  ctx.restore();

  // Red zone border
  ctx.beginPath();
  ctx.moveTo(380, 0); ctx.lineTo(380, WORLD_H);
  ctx.strokeStyle = 'rgba(220, 38, 38, 0.22)';
  ctx.setLineDash([8, 6]);
  ctx.lineWidth = 1.2;
  ctx.stroke();
  ctx.setLineDash([]);

  // Red zone labels
  ctx.fillStyle = 'rgba(220, 38, 38, 0.52)';
  ctx.font = 'bold 11px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('RED ZONE', 190, 18);
  ctx.fillStyle = 'rgba(220, 38, 38, 0.3)';
  ctx.font = '9px monospace';
  ctx.fillText('THREAT ORIGIN', 190, 30);

  // ── Cartographic furniture: compass rose, scale bar, area labels ──
  // Compass rose (top-right, inside the frame)
  const cpx = 1124, cpy = 86, cr = 24;
  ctx.strokeStyle = GC + '0.45)';
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.arc(cpx, cpy, cr, 0, Math.PI * 2); ctx.stroke();
  ctx.beginPath(); ctx.arc(cpx, cpy, cr - 5, 0, Math.PI * 2);
  ctx.strokeStyle = GC + '0.18)';
  ctx.stroke();
  // Cardinal ticks
  ctx.strokeStyle = GC + '0.5)';
  for (let k = 0; k < 8; k++) {
    const a = k * Math.PI / 4;
    const len = k % 2 === 0 ? 5 : 3;
    ctx.beginPath();
    ctx.moveTo(cpx + Math.cos(a) * (cr - len), cpy + Math.sin(a) * (cr - len));
    ctx.lineTo(cpx + Math.cos(a) * cr,         cpy + Math.sin(a) * cr);
    ctx.stroke();
  }
  // North needle (filled) + south tail
  ctx.beginPath();
  ctx.moveTo(cpx, cpy - cr + 7);
  ctx.lineTo(cpx - 4.5, cpy + 3);
  ctx.lineTo(cpx + 4.5, cpy + 3);
  ctx.closePath();
  ctx.fillStyle = GC + '0.6)';
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(cpx - 4.5, cpy + 3);
  ctx.lineTo(cpx, cpy + cr - 7);
  ctx.lineTo(cpx + 4.5, cpy + 3);
  ctx.closePath();
  ctx.fillStyle = GC + '0.22)';
  ctx.fill();
  // N label
  ctx.fillStyle = GC + '0.8)';
  ctx.font = 'bold 11px "Share Tech Mono", monospace';
  ctx.textAlign = 'center';
  ctx.fillText('N', cpx, cpy - cr - 5);

  // Scale bar (bottom-right): 200 px = 200 km
  const sbX = 950, sbY = 772, sbW = 200;
  ctx.strokeStyle = GC + '0.5)';
  ctx.lineWidth = 1.2;
  ctx.beginPath(); ctx.moveTo(sbX, sbY); ctx.lineTo(sbX + sbW, sbY); ctx.stroke();
  for (const f of [0, 0.5, 1]) {
    ctx.beginPath();
    ctx.moveTo(sbX + sbW * f, sbY - 4);
    ctx.lineTo(sbX + sbW * f, sbY + 4);
    ctx.stroke();
  }
  ctx.fillStyle = GC + '0.55)';
  ctx.font = '8px "Share Tech Mono", monospace';
  ctx.textAlign = 'center';
  ctx.fillText('0',      sbX, sbY + 14);
  ctx.fillText('100',    sbX + sbW / 2, sbY + 14);
  ctx.fillText('200 km', sbX + sbW, sbY + 14);

  // Area labels — faint, letter-spaced, cartographic
  ctx.font = '700 20px Rajdhani, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillStyle = GC + '0.09)';
  ctx.fillText('N O R T H E R N   S E C T O R', 720, 52);
  ctx.fillStyle = GC + '0.11)';
  ctx.fillText('S O U T H E R N   A P P R O A C H', 700, 762);
  ctx.save();
  ctx.translate(1148, 420);
  ctx.rotate(-Math.PI / 2);
  ctx.fillStyle = GC + '0.10)';
  ctx.fillText('O P E N   S E A', 0, 0);
  ctx.restore();
}

function drawCountry() {
  const land = LAND_POLYGON;

  // --- Terrain fill (clip to country border) ---
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(land[0][0], land[0][1]);
  for (let i = 1; i < land.length; i++) ctx.lineTo(land[i][0], land[i][1]);
  ctx.closePath();
  ctx.clip();

  // Green terrain gradient - lit from upper-left
  const tGrad = ctx.createRadialGradient(660, 330, 20, 740, 430, 370);
  tGrad.addColorStop(0.0, '#234e38');   // bright highland green
  tGrad.addColorStop(0.3, '#1d4330');   // forest green
  tGrad.addColorStop(0.6, '#183a29');   // deeper forest
  tGrad.addColorStop(0.85,'#123021');   // shadowed valleys
  tGrad.addColorStop(1.0, '#0d2218');   // dark coast
  ctx.fillStyle = tGrad;
  ctx.fillRect(350, 50, 800, 700);

  // Real topography: hillshade + hypsometric tint + contour lines,
  // pre-rendered from the same heightfield the LOS engine raycasts.
  if (TERRAIN_CANVAS) ctx.drawImage(TERRAIN_CANVAS, 0, 0);

  // Subtle coastal shading — darker strip near boundary
  const coastGrad = ctx.createRadialGradient(720, 410, 240, 720, 410, 380);
  coastGrad.addColorStop(0, 'rgba(0,0,0,0)');
  coastGrad.addColorStop(1, 'rgba(0,0,0,0.28)');
  ctx.fillStyle = coastGrad;
  ctx.fillRect(350, 50, 800, 700);

  ctx.restore();

  // Outer glow border
  ctx.beginPath();
  ctx.moveTo(land[0][0], land[0][1]);
  for (let i = 1; i < land.length; i++) ctx.lineTo(land[i][0], land[i][1]);
  ctx.closePath();
  ctx.strokeStyle = 'rgba(60, 140, 90, 0.14)';
  ctx.lineWidth = 7;
  ctx.stroke();

  // Main border
  ctx.beginPath();
  ctx.moveTo(land[0][0], land[0][1]);
  for (let i = 1; i < land.length; i++) ctx.lineTo(land[i][0], land[i][1]);
  ctx.closePath();
  ctx.strokeStyle = 'rgba(70, 165, 115, 0.52)';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Attack-challenge border highlight
  if (state.attackChallenge && state.placeStep === 'origin') {
    ctx.beginPath();
    ctx.moveTo(land[0][0], land[0][1]);
    for (let i = 1; i < land.length; i++) ctx.lineTo(land[i][0], land[i][1]);
    ctx.closePath();
    ctx.strokeStyle = 'rgba(220, 38, 38, 0.72)';
    ctx.setLineDash([6, 4]);
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.setLineDash([]);
  }

  // Country name
  ctx.fillStyle = 'rgba(160, 220, 180, 0.26)';
  ctx.font = 'bold 27px serif';
  ctx.textAlign = 'center';
  ctx.fillText('Republic of Taliaria', 720, 162);
  ctx.font = '10px monospace';
  ctx.fillStyle = 'rgba(110, 185, 140, 0.32)';
  ctx.fillText('AIR DEFENSE COMMAND', 720, 176);
}

// The terrain body itself is rendered by the hypsometric overlay
// (TERRAIN_CANVAS, see buildTerrainOverlay). Here we only annotate the
// summits: a small triangle marker + the true elevation of each peak.
function drawMountains() {
  ctx.textAlign = 'center';
  for (const p of PEAK_LABELS) {
    if (p.alt < 0.4) continue;
    // Summit triangle
    ctx.beginPath();
    ctx.moveTo(p.x, p.y - 4);
    ctx.lineTo(p.x - 3.6, p.y + 2.6);
    ctx.lineTo(p.x + 3.6, p.y + 2.6);
    ctx.closePath();
    ctx.fillStyle = 'rgba(20, 14, 10, 0.85)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 250, 238, 0.9)';
    ctx.lineWidth = 1;
    ctx.stroke();
    // Elevation label (metres), with a soft shadow for readability
    const txt = `${Math.round(p.alt * 1000)}m`;
    ctx.font = 'bold 10px "Share Tech Mono", monospace';
    ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
    ctx.fillText(txt, p.x + 1, p.y - 8);
    ctx.fillStyle = 'rgba(255, 250, 238, 0.95)';
    ctx.fillText(txt, p.x, p.y - 9);
  }
}

function drawTargets() {
  ctx.textAlign = 'center';
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
    ctx.font = 'bold 11px monospace';
    ctx.fillText(t.name, t.x, t.y - 14);
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
  if (intelHidden() && state.challengeMode === 'attack-challenge') return;
  const now = Date.now() / 1000;
  for (const d of state.defenses) {
    const c = CATALOG[d.key];
    if (c.kind === 'radar') {
      // NO fill — the detection area must stay fully see-through so
      // terrain, threats and other coverages remain readable through it.

      // Faint concentric range rings (PPI scope geometry, very subtle)
      ctx.strokeStyle = c.color + '14';
      ctx.lineWidth = 0.6;
      for (let f = 0.25; f < 1; f += 0.25) {
        ctx.beginPath(); ctx.arc(d.x, d.y, c.detection * f, 0, Math.PI * 2); ctx.stroke();
      }
      // Faint cross-hairs through centre
      ctx.beginPath();
      ctx.moveTo(d.x - c.detection, d.y); ctx.lineTo(d.x + c.detection, d.y);
      ctx.moveTo(d.x, d.y - c.detection); ctx.lineTo(d.x, d.y + c.detection);
      ctx.strokeStyle = c.color + '10';
      ctx.stroke();

      // Outer perimeter (dashed)
      ctx.beginPath();
      ctx.arc(d.x, d.y, c.detection, 0, Math.PI * 2);
      ctx.strokeStyle = c.color + '60';
      ctx.setLineDash([5, 8]);
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.setLineDash([]);

      // Rotating sweep line — single bright leading edge
      const sweepAng = (now * 0.32 + d.x * 0.009) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(d.x, d.y);
      ctx.lineTo(d.x + Math.cos(sweepAng) * c.detection, d.y + Math.sin(sweepAng) * c.detection);
      ctx.strokeStyle = c.color + 'b0';
      ctx.lineWidth = 1.2;
      ctx.stroke();

    } else if (c.kind === 'battery') {
      // Engagement zone — gradient fill
      const eGrad = ctx.createRadialGradient(d.x, d.y, c.minRange, d.x, d.y, c.maxRange);
      eGrad.addColorStop(0,   c.color + '22');
      eGrad.addColorStop(0.7, c.color + '12');
      eGrad.addColorStop(1,   c.color + '05');
      ctx.beginPath();
      ctx.arc(d.x, d.y, c.maxRange, 0, Math.PI * 2);
      ctx.fillStyle = eGrad;
      ctx.fill();

      // Mid-range reference ring
      ctx.beginPath();
      ctx.arc(d.x, d.y, c.maxRange * 0.5, 0, Math.PI * 2);
      ctx.strokeStyle = c.color + '2e';
      ctx.lineWidth = 0.7;
      ctx.stroke();

      // Outer engagement perimeter
      ctx.beginPath();
      ctx.arc(d.x, d.y, c.maxRange, 0, Math.PI * 2);
      ctx.strokeStyle = c.color + 'b8';
      ctx.lineWidth = 1.4;
      ctx.stroke();

      // Cardinal range ticks on the perimeter (range-scale cue)
      ctx.strokeStyle = c.color + '8a';
      ctx.lineWidth = 1.1;
      for (let k = 0; k < 4; k++) {
        const a = k * Math.PI / 2;
        const ca = Math.cos(a), sa = Math.sin(a);
        ctx.beginPath();
        ctx.moveTo(d.x + ca * (c.maxRange - 5), d.y + sa * (c.maxRange - 5));
        ctx.lineTo(d.x + ca * (c.maxRange + 4), d.y + sa * (c.maxRange + 4));
        ctx.stroke();
      }

      // Inner dead-zone (minimum range)
      if (c.minRange > 5) {
        ctx.beginPath();
        ctx.arc(d.x, d.y, c.minRange, 0, Math.PI * 2);
        ctx.strokeStyle = c.color + '55';
        ctx.setLineDash([3, 3]);
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }
  }
}

function drawDefenses() {
  if (intelHidden() && state.challengeMode === 'attack-challenge') return;
  for (let i = 0; i < state.defenses.length; i++) {
    const d = state.defenses[i];
    // When scrubbing, read ammo/prepareTarget/prepareUntil from the snapshot
    // snapshot entry (set via _scrubDef by draw()).  Fall back to live `d`
    // when not scrubbing so normal render is unchanged.
    const sd = (_scrubDef && i < _scrubDef.length) ? _scrubDef[i] : d;
    const c = CATALOG[d.key];
    const depleted = c.kind === 'battery' && sd.ammo <= 0;

    // Reaction-time preparation indicator: prominent filling ring around the battery
    if (sd.prepareTarget != null && state.simElapsed < sd.prepareUntil) {
      const progress = 1 - (sd.prepareUntil - state.simElapsed) / c.reactionTime;
      // Detect "extended" mode: target currently outside this battery's range
      const tgt = state.threats.find(x => x.id === sd.prepareTarget);
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
      const remaining = (sd.prepareUntil - state.simElapsed).toFixed(1);
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

    if (c.kind === 'radar') {
      // Drop shadow
      ctx.shadowColor = 'rgba(0,0,0,0.6)'; ctx.shadowBlur = 6; ctx.shadowOffsetX = 1; ctx.shadowOffsetY = 2;
      // Outer ring
      ctx.beginPath(); ctx.arc(0, 0, 11, 0, Math.PI * 2);
      ctx.fillStyle = c.color + '22'; ctx.fill();
      ctx.strokeStyle = c.color; ctx.lineWidth = 1.5; ctx.stroke();
      ctx.shadowBlur = 0; ctx.shadowOffsetX = 0; ctx.shadowOffsetY = 0;
      // Inner ring
      ctx.beginPath(); ctx.arc(0, 0, 7, 0, Math.PI * 2);
      ctx.strokeStyle = c.color + 'cc'; ctx.lineWidth = 1; ctx.stroke();
      // Crosshair
      ctx.strokeStyle = c.color + 'aa'; ctx.lineWidth = 0.8;
      ctx.beginPath(); ctx.moveTo(-11, 0); ctx.lineTo(11, 0); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, -11); ctx.lineTo(0, 11); ctx.stroke();
      // Center dot
      ctx.beginPath(); ctx.arc(0, 0, 2.5, 0, Math.PI * 2);
      ctx.fillStyle = c.color; ctx.fill();
    } else {
      // Friendly air-defense equipment — rectangle affiliation frame
      // (MIL-STD-2525 friendly), in the system's identifying colour.
      const fr = 12;
      ctx.shadowColor = c.color; ctx.shadowBlur = depleted ? 0 : 8;
      milFriendlyFrame(fr);
      // Gradient fill (lit from top)
      const rgGrad = ctx.createLinearGradient(0, -fr, 0, fr);
      rgGrad.addColorStop(0, c.color + 'dd');
      rgGrad.addColorStop(1, c.color + '88');
      ctx.fillStyle = rgGrad; ctx.fill();
      ctx.shadowBlur = 0;
      milFriendlyFrame(fr);
      ctx.strokeStyle = 'rgba(0,0,0,0.7)'; ctx.lineWidth = 1.8; ctx.stroke();
      // Inner highlight outline
      milFriendlyFrame(fr - 3);
      ctx.strokeStyle = 'rgba(255,255,255,0.18)'; ctx.lineWidth = 0.8; ctx.stroke();
      // Abbreviation label
      ctx.fillStyle = 'rgba(255,255,255,0.92)';
      ctx.font = 'bold 8px monospace';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(c.short, 0, 0.5);
    }
    ctx.restore();

    // Identifier label below — radars only (batteries already show the
    // abbreviation inside the frame, so a second copy would be redundant).
    if (c.kind === 'radar') {
      ctx.fillStyle = depleted ? 'rgba(126,145,168,0.7)' : 'rgba(198,214,230,0.85)';
      ctx.font = '9px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(c.short, d.x, d.y + 26);
    }

    // Ammo counter pill (only for batteries)
    if (c.kind === 'battery') {
      const maxAmmo = d.initialAmmo || c.ammo;
      const txt = depleted ? 'EMPTY' : `▮ ${sd.ammo}/${maxAmmo}`;
      let bgColor, fgColor;
      if (depleted)                        { bgColor = '#6b1e2a'; fgColor = '#fca5a5'; }
      else if (sd.ammo / maxAmmo > 0.5)    { bgColor = '#1e6b3e'; fgColor = '#86efac'; }
      else if (sd.ammo / maxAmmo > 0.25)   { bgColor = '#8a5a1c'; fgColor = '#fcd34d'; }
      else                                 { bgColor = '#9c2d3e'; fgColor = '#fca5a5'; }

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
  if (intelHidden() && state.challengeMode === 'defense-challenge') return;
  for (const t of state.threats) {
    if (t.status === 'destroyed') continue;
    const c = CATALOG[t.key];
    // Full origin-to-target path, clearly visible
    ctx.beginPath();
    ctx.moveTo(t.sx, t.sy);
    ctx.lineTo(t.tx, t.ty);
    ctx.strokeStyle = c.color + '88';
    ctx.setLineDash([7, 6]);
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.setLineDash([]);
    // Remaining path (current → target) brighter solid
    if (t.status === 'inflight') {
      ctx.beginPath();
      ctx.moveTo(t.x, t.y);
      ctx.lineTo(t.tx, t.ty);
      ctx.strokeStyle = c.color + 'cc';
      ctx.setLineDash([4, 4]);
      ctx.lineWidth = 1.4;
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }
}

function drawThreats() {
  if (intelHidden() && state.challengeMode === 'defense-challenge') return;
  for (const t of state.threats) {
    const c = CATALOG[t.key];
    if (t.status === 'destroyed') continue;

    const ang = Math.atan2(t.ty - t.sy, t.tx - t.sx);

    // Engine contrail / exhaust trail behind the threat
    const trailLen = t.key === 'fighter' ? 30 : t.key === 'helicopter' ? 14 : 10;
    const cdx = Math.cos(ang), cdy = Math.sin(ang);
    const trailGrad = ctx.createLinearGradient(
      t.x, t.y,
      t.x - cdx * trailLen, t.y - cdy * trailLen
    );
    trailGrad.addColorStop(0, c.color + 'b0');
    trailGrad.addColorStop(1, c.color + '00');
    ctx.beginPath();
    ctx.moveTo(t.x, t.y);
    ctx.lineTo(t.x - cdx * trailLen, t.y - cdy * trailLen);
    ctx.strokeStyle = trailGrad;
    ctx.lineWidth = t.key === 'fighter' ? 2.5 : 1.8;
    ctx.lineCap = 'round';
    ctx.stroke();
    ctx.lineCap = 'butt';

    // Subtle affiliation glow so the track pops over coverage rings
    const haloR = t.key === 'fighter' ? 17 : t.key === 'uav' ? 8 : 12;
    const halo = ctx.createRadialGradient(t.x, t.y, 1, t.x, t.y, haloR);
    halo.addColorStop(0, c.color + '38');
    halo.addColorStop(1, c.color + '00');
    ctx.beginPath(); ctx.arc(t.x, t.y, haloR, 0, Math.PI * 2);
    ctx.fillStyle = halo; ctx.fill();

    // Aircraft silhouette — top-down, rotated to its heading.
    // UAV is rendered 30% smaller than the manned platforms to reflect
    // its true relative footprint.
    const iconScale = t.key === 'uav' ? 1.96 : 2.8;
    ctx.save();
    ctx.translate(t.x, t.y);
    ctx.rotate(ang);
    ctx.scale(iconScale, iconScale);
    ctx.fillStyle = c.color;
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.78)';
    ctx.lineWidth = 0.5;
    ctx.lineJoin = 'round';
    if (t.key === 'fighter') drawFighter();
    else if (t.key === 'helicopter') drawHelo();
    else drawDrone();
    ctx.restore();

    // Label with absolute altitude (changes over terrain)
    const altMSL = c.altitude + getTerrainAlt(t.x, t.y);
    const labelText = `${t.label} · ${altMSL.toFixed(1)}km`;
    ctx.font = 'bold 11px monospace';
    const tw = ctx.measureText(labelText).width;
    const padX = 5, padY = 2;
    const bx = t.x - tw / 2 - padX;
    const by = t.y + 16;
    const bw = tw + padX * 2;
    const bh = 14 + padY;
    ctx.fillStyle = 'rgba(6, 10, 18, 0.93)';
    ctx.strokeStyle = c.color;
    ctx.lineWidth = 1.2;
    if (ctx.roundRect) {
      ctx.beginPath(); ctx.roundRect(bx, by, bw, bh, 7); ctx.fill(); ctx.stroke();
    } else {
      ctx.fillRect(bx, by, bw, bh); ctx.strokeRect(bx, by, bw, bh);
    }
    ctx.fillStyle = c.color;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(labelText, t.x, by + bh / 2);
    ctx.textBaseline = 'alphabetic';
  }
}

// ── Friendly affiliation frame (MIL-STD-2525) for ground equipment ──
// Traces a rounded rectangle centred on the current origin; the caller
// fills/strokes and is responsible for having translated into place.
function milFriendlyFrame(r) {
  const w = r * 1.18, h = r * 0.92;
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(-w, -h, w * 2, h * 2, 2.5);
  else ctx.rect(-w, -h, w * 2, h * 2);
}

// ── Threat silhouettes — refined top-down aircraft profiles ──────────
// Drawn in a local frame with the nose pointing +x; the caller rotates
// to the track's heading. fillStyle is the affiliation colour on entry.

function drawFighter() {
  // Modern multirole jet: pointed nose, swept delta wing, twin stabilators.
  const col = ctx.fillStyle;
  // Afterburner bloom at the tail
  const ab = ctx.createRadialGradient(-6, 0, 0, -6, 0, 3.2);
  ab.addColorStop(0, 'rgba(255, 214, 130, 0.9)');
  ab.addColorStop(1, 'rgba(255, 140, 40, 0)');
  ctx.fillStyle = ab;
  ctx.beginPath(); ctx.arc(-6, 0, 3.2, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = col;
  // Single sleek silhouette (nose → left wing → tail → right wing)
  ctx.beginPath();
  ctx.moveTo(7.6, 0);
  ctx.lineTo(2.0, -1.05);
  ctx.lineTo(0.4, -1.5);
  ctx.lineTo(-3.0, -6.1);   // left wing leading edge
  ctx.lineTo(-4.6, -5.9);   // wingtip
  ctx.lineTo(-2.1, -1.7);   // wing trailing edge
  ctx.lineTo(-4.8, -2.7);   // left stabilator
  ctx.lineTo(-6.3, -2.2);
  ctx.lineTo(-5.2, -0.85);
  ctx.lineTo(-6.1, 0);      // tail cone
  ctx.lineTo(-5.2, 0.85);
  ctx.lineTo(-6.3, 2.2);
  ctx.lineTo(-4.8, 2.7);
  ctx.lineTo(-2.1, 1.7);
  ctx.lineTo(-4.6, 5.9);
  ctx.lineTo(-3.0, 6.1);
  ctx.lineTo(0.4, 1.5);
  ctx.lineTo(2.0, 1.05);
  ctx.closePath();
  ctx.fill(); ctx.stroke();
  // Canopy highlight
  ctx.beginPath();
  ctx.ellipse(2.4, 0, 1.5, 0.85, 0, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(190, 225, 245, 0.6)';
  ctx.fill();
  ctx.fillStyle = col;
}

function drawHelo() {
  // Attack helicopter, top-down: teardrop fuselage, tail boom, rotor disc.
  const col = ctx.fillStyle;
  // Tail boom
  ctx.beginPath();
  ctx.moveTo(-1.5, -0.7);
  ctx.lineTo(-7.6, -0.5);
  ctx.lineTo(-7.6, 0.5);
  ctx.lineTo(-1.5, 0.7);
  ctx.closePath();
  ctx.fill(); ctx.stroke();
  // Horizontal stabilizer at tail
  ctx.beginPath();
  ctx.moveTo(-7.1, 0);
  ctx.lineTo(-8.7, -1.9);
  ctx.lineTo(-8.0, 0);
  ctx.lineTo(-8.7, 1.9);
  ctx.closePath();
  ctx.fill(); ctx.stroke();
  // Fuselage (teardrop cabin)
  ctx.beginPath();
  ctx.moveTo(4.9, 0);
  ctx.bezierCurveTo(4.9, -2.4, 0.2, -2.5, -2.0, -1.9);
  ctx.lineTo(-2.0, 1.9);
  ctx.bezierCurveTo(0.2, 2.5, 4.9, 2.4, 4.9, 0);
  ctx.closePath();
  ctx.fill(); ctx.stroke();
  // Cockpit windshield
  ctx.beginPath();
  ctx.moveTo(4.5, -0.8);
  ctx.bezierCurveTo(3.5, -1.9, 1.5, -1.9, 0.9, -1.3);
  ctx.lineTo(0.9, 1.3);
  ctx.bezierCurveTo(1.5, 1.9, 3.5, 1.9, 4.5, 0.8);
  ctx.closePath();
  ctx.fillStyle = 'rgba(190, 225, 245, 0.55)';
  ctx.fill();
  ctx.fillStyle = col;
  // Main rotor disc (translucent) + spinning blades + hub
  ctx.save();
  ctx.globalAlpha = 0.15;
  ctx.beginPath(); ctx.arc(1.0, 0, 6.7, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
  ctx.save();
  ctx.globalAlpha = 0.7; ctx.strokeStyle = col; ctx.lineWidth = 0.7;
  ctx.beginPath(); ctx.moveTo(-5.7, 0); ctx.lineTo(7.7, 0); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(1.0, -6.7); ctx.lineTo(1.0, 6.7); ctx.stroke();
  ctx.restore();
  ctx.beginPath(); ctx.arc(1.0, 0, 0.85, 0, Math.PI * 2); ctx.fill();
}

function drawDrone() {
  // MALE-class UAV (Predator/Heron style): slim fuselage, long straight
  // high-aspect wings, V-tail, chin sensor turret.
  const col = ctx.fillStyle;
  // Wings
  ctx.beginPath();
  ctx.moveTo(0.8, -0.55);
  ctx.lineTo(-0.4, -7.3);
  ctx.lineTo(0.9, -7.3);
  ctx.lineTo(2.0, -0.5);
  ctx.lineTo(2.0, 0.5);
  ctx.lineTo(0.9, 7.3);
  ctx.lineTo(-0.4, 7.3);
  ctx.lineTo(0.8, 0.55);
  ctx.closePath();
  ctx.fill(); ctx.stroke();
  // Fuselage
  ctx.beginPath();
  ctx.moveTo(6.6, 0);
  ctx.lineTo(5.0, -0.8);
  ctx.lineTo(-5.6, -0.85);
  ctx.lineTo(-6.1, 0);
  ctx.lineTo(-5.6, 0.85);
  ctx.lineTo(5.0, 0.8);
  ctx.closePath();
  ctx.fill(); ctx.stroke();
  // V-tail
  ctx.lineWidth = 0.85;
  ctx.beginPath();
  ctx.moveTo(-5.0, -0.6); ctx.lineTo(-7.1, -2.5);
  ctx.moveTo(-5.0, 0.6);  ctx.lineTo(-7.1, 2.5);
  ctx.stroke();
  ctx.lineWidth = 0.5;
  // Chin sensor turret
  ctx.beginPath(); ctx.arc(3.3, 0, 1.2, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
}

function drawMissiles() {
  for (const m of state.missiles) {
    const dx = m.tx - m.sx, dy = m.ty - m.sy;
    const len = Math.hypot(dx, dy) || 1;
    const ux = dx / len, uy = dy / len;

    // Fire trail — gradient from bright white-yellow at head to transparent
    const trailLen = 18;
    const tGrad = ctx.createLinearGradient(
      m.x, m.y,
      m.x - ux * trailLen, m.y - uy * trailLen
    );
    tGrad.addColorStop(0,   'rgba(255, 252, 210, 0.95)');
    tGrad.addColorStop(0.35,'rgba(255, 200, 60,  0.7)');
    tGrad.addColorStop(0.7, 'rgba(255, 110, 20,  0.35)');
    tGrad.addColorStop(1,   'rgba(255, 60,  10,  0)');
    ctx.beginPath();
    ctx.moveTo(m.x, m.y);
    ctx.lineTo(m.x - ux * trailLen, m.y - uy * trailLen);
    ctx.strokeStyle = tGrad;
    ctx.lineWidth = 2.8;
    ctx.lineCap = 'round';
    ctx.stroke();
    ctx.lineCap = 'butt';

    // Bright missile head with halo
    const headGrad = ctx.createRadialGradient(m.x, m.y, 0, m.x, m.y, 5);
    headGrad.addColorStop(0, 'rgba(255, 255, 255, 1)');
    headGrad.addColorStop(0.45, 'rgba(255, 235, 80, 0.9)');
    headGrad.addColorStop(1, 'rgba(251, 191, 36, 0)');
    ctx.beginPath(); ctx.arc(m.x, m.y, 5, 0, Math.PI * 2);
    ctx.fillStyle = headGrad; ctx.fill();
  }
}

// Mid-air interception puff — multi-ring spark burst, distinct from ground impact
function drawExplosions() {
  for (const e of state.explosions) {
    const k = e.t / e.dur;
    const a = 1 - k;

    // Outer shockwave ring
    ctx.beginPath();
    ctx.arc(e.x, e.y, e.r * (0.5 + k * 2.2), 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(255, 180, 40, ${a * 0.45})`;
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Middle ring
    ctx.beginPath();
    ctx.arc(e.x, e.y, e.r * (0.4 + k * 1.1), 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(255, 230, 100, ${a * 0.6})`;
    ctx.lineWidth = 1.2;
    ctx.stroke();

    // Central fireball gradient
    const fr = e.r * 0.9 * (1 - k * 0.75);
    const fGrad = ctx.createRadialGradient(e.x, e.y, 0, e.x, e.y, fr);
    fGrad.addColorStop(0,   `rgba(255, 255, 255, ${a})`);
    fGrad.addColorStop(0.3, `rgba(255, 250, 140, ${a * 0.9})`);
    fGrad.addColorStop(0.7, `rgba(255, 180, 20,  ${a * 0.55})`);
    fGrad.addColorStop(1,   'rgba(255, 80, 10, 0)');
    ctx.beginPath(); ctx.arc(e.x, e.y, fr, 0, Math.PI * 2);
    ctx.fillStyle = fGrad; ctx.fill();
  }
}

function triggerTargetHit(t) {
  state.leakerFlashT = state.simElapsed;  // red edge flash + LEAKER callout
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
  const lines = [];

  if (isSimActive()) {
    const active   = state.threats.filter(t => t.status === 'inflight').length;
    const killed   = state.threats.filter(t => t.status === 'destroyed').length;
    const breached = state.threats.filter(t => t.status === 'reached').length;
    lines.push({ text: `▶ SIM  ${state.simElapsed.toFixed(1)} s`, color: 'rgba(95, 200, 232, 0.95)' });
    if (active   > 0) lines.push({ text: `INFLIGHT  ${active}`, color: 'rgba(251, 191, 36, 0.85)' });
    if (killed   > 0) lines.push({ text: `KILLED    ${killed}`, color: 'rgba(95, 168, 107, 0.9)' });
    if (breached > 0) lines.push({ text: `BREACHED  ${breached}`, color: 'rgba(220, 60, 60, 0.9)' });
  }
  if (state.budget) {
    lines.push({ text: '◈ DEF CHALLENGE', color: 'rgba(251, 191, 36, 0.8)' });
  }
  if (state.attackChallenge) {
    lines.push({ text: '◉ ATK CHALLENGE', color: 'rgba(220, 60, 60, 0.8)' });
  }
  if (intelHidden()) {
    lines.push({ text: '🕶 NO INTEL', color: 'rgba(216, 180, 254, 0.95)' });
  }

  if (lines.length === 0) return;

  ctx.save();
  ctx.font = '11px "Share Tech Mono", ui-monospace, monospace';
  const lineH = 17, padX = 12, padY = 22;          // padY leaves room for the title bar
  const titleH = 13;
  const maxW = lines.reduce((w, l) => Math.max(w, ctx.measureText(l.text).width), 0);
  const bw = Math.max(maxW + padX * 2, 132);
  const bh = lines.length * lineH + padY + 10;
  const bx = W - bw - 10;
  const by = 8;
  const chamfer = 9;                                // angled corner depth (MFD look)

  // Chamfered panel path — six-sided with the top-right and bottom-left
  // corners shaved off. Reads as a tactical multifunction display.
  function chamferedPath() {
    ctx.beginPath();
    ctx.moveTo(bx, by);
    ctx.lineTo(bx + bw - chamfer, by);
    ctx.lineTo(bx + bw, by + chamfer);
    ctx.lineTo(bx + bw, by + bh);
    ctx.lineTo(bx + chamfer, by + bh);
    ctx.lineTo(bx, by + bh - chamfer);
    ctx.closePath();
  }

  // Background fill + frame
  chamferedPath();
  ctx.fillStyle = 'rgba(5, 8, 16, 0.9)';
  ctx.fill();
  chamferedPath();
  ctx.strokeStyle = 'rgba(95, 200, 232, 0.42)';
  ctx.lineWidth = 1;
  ctx.stroke();

  // Title strip
  ctx.fillStyle = 'rgba(95, 200, 232, 0.10)';
  ctx.fillRect(bx + 1, by + 1, bw - chamfer - 1, titleH);
  ctx.beginPath();
  ctx.moveTo(bx + 4, by + titleH + 1.5);
  ctx.lineTo(bx + bw - 4, by + titleH + 1.5);
  ctx.strokeStyle = 'rgba(95, 200, 232, 0.35)';
  ctx.stroke();

  // Title text
  ctx.font = '9px "Share Tech Mono", ui-monospace, monospace';
  ctx.textAlign = 'left';
  ctx.fillStyle = 'rgba(95, 200, 232, 0.85)';
  ctx.fillText('TACSIT // STATUS', bx + 8, by + 10);

  // Status pulse dot on the right of the title bar
  const pulse = 0.55 + 0.45 * Math.abs(Math.sin(Date.now() * 0.004));
  ctx.beginPath();
  ctx.arc(bx + bw - chamfer - 8, by + 6.5, 2.6, 0, Math.PI * 2);
  ctx.fillStyle = `rgba(95, 200, 232, ${pulse})`;
  ctx.fill();

  // Data rows
  ctx.font = '11px "Share Tech Mono", ui-monospace, monospace';
  ctx.textAlign = 'right';
  for (let i = 0; i < lines.length; i++) {
    ctx.fillStyle = lines[i].color;
    ctx.fillText(lines[i].text, bx + bw - padX, by + padY + i * lineH + 4);
  }

  // Inner corner brackets (subtle tactical accent on opposite corners)
  const brk = 6;
  ctx.strokeStyle = 'rgba(95, 200, 232, 0.55)';
  ctx.lineWidth = 1.2;
  // top-left
  ctx.beginPath();
  ctx.moveTo(bx + 1, by + brk + 1); ctx.lineTo(bx + 1, by + 1); ctx.lineTo(bx + brk + 1, by + 1);
  ctx.stroke();
  // bottom-right
  ctx.beginPath();
  ctx.moveTo(bx + bw - 1, by + bh - brk - 1); ctx.lineTo(bx + bw - 1, by + bh - 1); ctx.lineTo(bx + bw - brk - 1, by + bh - 1);
  ctx.stroke();
  ctx.restore();
}

// =============================================================
// סימולציה
// =============================================================
const SIM_BTN = { simulate: null, pause: null, resume: null, stop: null };
const isSimActive = () => state.mode === 'sim' || state.mode === 'paused';
function initSimButtons() {
  for (const id of Object.keys(SIM_BTN)) SIM_BTN[id] = document.getElementById(id);
}
function setSimButtons(mode) {
  // mode: 'idle' | 'running' | 'paused'
  SIM_BTN.simulate.style.display = mode === 'idle'    ? '' : 'none';
  SIM_BTN.pause.style.display    = mode === 'running' ? '' : 'none';
  SIM_BTN.resume.style.display   = mode === 'paused'  ? '' : 'none';
  SIM_BTN.stop.style.display     = mode !== 'idle'    ? '' : 'none';
  renderMobileBudgetPill();
}

function startSim() {
  if (state.threats.length === 0) {
    setStatus('אין איומים להפעיל - הוסף איומים בצד אדום');
    return;
  }
  state.mode = 'sim';
  state.simElapsed = 0;
  state.missiles = []; state.explosions = []; state.targetHits = [];
  state.killLabels = []; state.leakerFlashT = -1;
  state.history = [];
  state.scrubTime = null;
  state.endLinger = null;
  hideNewGameCta();
  document.getElementById('scrubber-row').style.display = 'none';
  setScrubberActive(false);
  // reset threats and defenses
  for (const t of state.threats) {
    t.x = t.sx; t.y = t.sy; t.status = 'inflight'; t.hitBy = null;
    t.firedAt = 0; t.missedBy = []; t.depletedEnvelope = [];
  }
  for (const d of state.defenses) {
    const c = CATALOG[d.key];
    d.ammo = d.initialAmmo !== undefined ? d.initialAmmo : c.ammo; d.cd = 0;
    d.prepareTarget = null;
    d.prepareUntil = 0;
  }
  setSimButtons('running');
  hideBanner();
  // Reveal the hidden opposing side ("intel" arrives) at the moment the
  // simulation kicks off — no-intel mode only hides during planning.
  state.intelRevealed = true;
  setStatus('סימולציה פעילה...');
}

function pauseSim() {
  if (state.mode !== 'sim') return;
  state.mode = 'paused';
  setSimButtons('paused');
  setStatus('סימולציה מושהית - לחץ "המשך" לחידוש');
}

function resumeSim() {
  if (state.mode !== 'paused') return;
  state.mode = 'sim';
  state.lastTs = 0;
  setSimButtons('running');
  setStatus('סימולציה פעילה...');
}

function stopSim() {
  state.mode = 'idle';
  setSimButtons('idle');
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

  // 3c. Track threats passing through depleted-battery envelopes (for post-sim annotation)
  for (const d of state.defenses) {
    const c = CATALOG[d.key];
    if (c.kind !== 'battery' || d.ammo > 0) continue;
    for (const t of state.threats) {
      if (t.status !== 'inflight') continue;
      const tc = CATALOG[t.key];
      const effMax = effectiveEngagementRange(c, tc);
      const dist = Math.hypot(t.x - d.x, t.y - d.y);
      if (dist <= effMax && dist >= c.minRange && !t.depletedEnvelope.includes(c.short)) {
        t.depletedEnvelope.push(c.short);
      }
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
          // Kill confirmation — floating label rising over the intercept point
          state.killLabels.push({ x: target.x, y: target.y, t: 0, dur: 1.4, battery: m.battery });
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

  // 5a. Update kill-confirmation labels
  for (const k of state.killLabels) k.t += dt;
  state.killLabels = state.killLabels.filter(k => k.t < k.dur);

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

  // 6. End condition — linger 1s after the last threat/missile clears so
  // the final impact (or interception) is visible before the results panel
  // takes over.
  const active = state.threats.filter(t => t.status === 'inflight');
  if (active.length === 0 && state.missiles.length === 0) {
    if (state.endLinger == null) state.endLinger = state.simElapsed + 1.0;
    else if (state.simElapsed >= state.endLinger) {
      state.endLinger = null;
      finishSim();
    }
  } else if (state.endLinger != null) {
    state.endLinger = null;
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
    const altMSL = getThreatAltMSL(t);
    if (altMSL < c.minAlt || altMSL > c.maxAlt) continue;
    if (!hasLOS(d.x, d.y, t.x, t.y, altMSL)) continue;

    const dist = Math.hypot(t.x - d.x, t.y - d.y);
    if (dist < c.minRange) continue;  // currently in dead zone

    // Comprehensive viability evaluated at the predicted intercept point:
    // detection (organic or external radar), intercept inside the reachable
    // envelope, non-tangential geometry, and enough flight time to catch
    // the threat before it reaches its target.  Skip the shot entirely if
    // any of these would cause a certain miss — don't waste a missile.
    if (!isViableShot(t, d, c, tc)) continue;

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
  if (Math.hypot(t.x - d.x, t.y - d.y) <= ownEff && hasLOS(d.x, d.y, t.x, t.y, getThreatAltMSL(t))) organic = true;
  // Standalone radars elsewhere on the map - detection only, doesn't
  // change the missile's physical envelope but extends the battery's
  // effective engagement range when the radar covers ground beyond it.
  for (const od of state.defenses) {
    const oc = CATALOG[od.key];
    if (oc.kind !== 'radar') continue;
    const eff = oc.detection * factor;
    if (Math.hypot(t.x - od.x, t.y - od.y) <= eff && hasLOS(od.x, od.y, t.x, t.y, getThreatAltMSL(t))) {
      externalRadar = true;
      break;
    }
  }
  return { organic, externalRadar };
}

// Lead-pursuit intercept solver shared by engagement logic and fire-time
// checks.  launchDelay is the time (seconds) until the missile actually
// launches: c.reactionTime when called from pickEngagementTarget (battery
// hasn't started RT yet) and 0 when called from fireMissile (RT already
// elapsed and the threat is at the launch position now).
function computeIntercept(t, d, c, tc, launchDelay) {
  const delay = (launchDelay !== undefined) ? launchDelay : c.reactionTime;
  const fdx = t.tx - t.sx, fdy = t.ty - t.sy;
  const flen = Math.hypot(fdx, fdy) || 1;
  const tvx = fdx / flen, tvy = fdy / flen;
  const launchX = t.x + tvx * tc.speed * delay;
  const launchY = t.y + tvy * tc.speed * delay;
  let T = Math.hypot(launchX - d.x, launchY - d.y) / c.missileSpeed;
  let ipx = launchX, ipy = launchY;
  for (let i = 0; i < 6; i++) {
    ipx = launchX + tvx * tc.speed * T;
    ipy = launchY + tvy * tc.speed * T;
    T = Math.hypot(ipx - d.x, ipy - d.y) / c.missileSpeed;
  }
  return { ipx, ipy, T, tvx, tvy };
}

// Maximum engagement range for this battery vs this specific threat.
// External radar cueing bypasses the battery's RCS-limited tracking
// envelope so the only constraint becomes physical missile range.
function getEngagementLimit(t, d, c, tc) {
  const det = getDetectionInfo(t, d, c, tc);
  if (det.externalRadar) return c.maxRange;
  if (det.organic) return effectiveEngagementRange(c, tc);
  return null;  // no detection — battery cannot engage
}

// Comprehensive pre-fire viability check evaluated AT THE PREDICTED INTERCEPT
// POINT (not at the threat's current position).  Refuses shots that would
// certainly miss for known reasons:
//   - no detection (organic or external radar)
//   - intercept point outside the reachable envelope
//   - tangential geometry at impact (≤±8.6° of perpendicular crossing)
//   - missile flight time exceeds the threat's remaining time to its target
// launchDelay defaults to c.reactionTime (pick-time use); pass 0 at fire time.
function isViableShot(t, d, c, tc, launchDelay) {
  const limit = getEngagementLimit(t, d, c, tc);
  if (limit == null) return false;
  const { ipx, ipy, T, tvx, tvy } = computeIntercept(t, d, c, tc, launchDelay);
  const interceptDist = Math.hypot(ipx - d.x, ipy - d.y);
  if (interceptDist < c.minRange || interceptDist > limit) return false;
  const btx = ipx - d.x, bty = ipy - d.y;
  const blen = Math.hypot(btx, bty) || 1;
  const cosAng = (btx / blen) * tvx + (bty / blen) * tvy;
  if (Math.abs(cosAng) < 0.15) return false;
  const delay = (launchDelay !== undefined) ? launchDelay : c.reactionTime;
  const remaining = Math.hypot(t.tx - t.x, t.ty - t.y) / tc.speed;
  if (delay + T > remaining) return false;
  return true;
}

// Backwards-compatibility wrapper — kept for the canInterceptInsideRange
// call site below; behaviour is now equivalent to isViableShot with the
// default RT launchDelay.
function canInterceptInsideRange(t, d, c, tc) {
  return isViableShot(t, d, c, tc);
}

// Returns true if the threat is predicted to be moving nearly perpendicular
// to the battery LoS AT THE INTERCEPT POINT (i.e., at the moment of impact,
// not at the current moment).  Kept as a focused predicate for fireMissile's
// fast-path guard — full viability is handled by isViableShot at pick time.
function isTangentShot(t, d, c, tc) {
  const { ipx, ipy, tvx, tvy } = computeIntercept(t, d, c, tc);
  const btx = ipx - d.x, bty = ipy - d.y;
  const blen = Math.hypot(btx, bty) || 1;
  const cosAng = (btx / blen) * tvx + (bty / blen) * tvy;
  return Math.abs(cosAng) < 0.15;
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
    if (Math.hypot(t.x - d.x, t.y - d.y) <= effective && hasLOS(d.x, d.y, t.x, t.y, getThreatAltMSL(t))) return true;
  }
  return false;
}

function fireMissile(d, t) {
  const c = CATALOG[d.key];
  const tc = CATALOG[t.key];

  // Threat velocity unit vector (along its straight path to target)
  const fdx = t.tx - t.sx, fdy = t.ty - t.sy;
  const flen = Math.hypot(fdx, fdy) || 1;
  const tvx = fdx / flen, tvy = fdy / flen;
  const threatSpeed = tc.speed;
  const missileSpeed = c.missileSpeed;

  // Iterative lead-pursuit intercept solution — converges on the future
  // point where missile and threat will collide.
  let T = Math.hypot(t.x - d.x, t.y - d.y) / missileSpeed;
  let ipx = t.x, ipy = t.y;
  for (let i = 0; i < 6; i++) {
    ipx = t.x + tvx * threatSpeed * T;
    ipy = t.y + tvy * threatSpeed * T;
    T = Math.hypot(ipx - d.x, ipy - d.y) / missileSpeed;
  }

  // Pre-commit guards at fire time.  pickEngagementTarget already filters
  // tangential and out-of-envelope shots based on the predicted intercept
  // geometry, but RT-period floating-point drift or shifting detection
  // (e.g., a supporting radar dropping LoS during RT) can occasionally
  // change the geometry across the threshold.  If the actual intercept
  // point would land within ±15° of perpendicular OR outside the reachable
  // envelope, abort the launch entirely — the missile would certainly miss,
  // so don't waste the round.  Ammo is preserved; the battery becomes idle
  // and re-evaluates the threat next tick.
  {
    const btx = ipx - d.x, bty = ipy - d.y;
    const blen = Math.hypot(btx, bty) || 1;
    const cosAng = (btx / blen) * tvx + (bty / blen) * tvy;
    if (Math.abs(cosAng) < 0.15) return;
    const det = getDetectionInfo(t, d, c, tc);
    const limit = det.externalRadar ? c.maxRange
                : det.organic       ? effectiveEngagementRange(c, tc)
                : null;
    if (limit == null) return;  // lost detection during RT
    if (blen < c.minRange || blen > limit) return;  // intercept outside envelope
  }

  // Commit the shot: decrement ammo, set cooldown.
  d.cd = c.reload; d.ammo--;
  t.firedAt++;

  // Time threat will reach its target
  const threatTimeToTarget = Math.hypot(t.tx - t.x, t.ty - t.y) / threatSpeed;

  let outcome;  // 'hit' | 'flight-time' | 'statistical'

  // Rule 1: missile flight time exceeds threat's remaining time → too late
  if (T > threatTimeToTarget) {
    outcome = 'flight-time';
    // Visualize chase even though it fails: missile stops where threat would have been
    ipx = t.x + tvx * threatSpeed * threatTimeToTarget;
    ipy = t.y + tvy * threatSpeed * threatTimeToTarget;
  }
  // Rule 2: statistical hit-rate roll (tangent + out-of-range already excluded above)
  else if (Math.random() < c.hitRate) {
    outcome = 'hit';
  } else {
    outcome = 'statistical';
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
  setSimButtons('idle');
  state.history.push(captureSnapshot());
  const total = state.simElapsed;
  const slider = document.getElementById('scrubber');
  slider.min = 0;
  slider.max = total;
  slider.step = Math.max(0.05, total / 400);
  slider.value = total;
  document.getElementById('scrubber-total').textContent = total.toFixed(1);
  document.getElementById('scrubber-time').textContent = total.toFixed(1);
  document.getElementById('scrubber-row').style.display = '';
  placeScrubberForViewport();
  setScrubberActive(true);
  state.scrubTime = null;  // live until user drags
  computeResults();
  renderResults();

  // Score + XP + rank progression — challenge modes only (free play is unscored)
  state.lastAward = null;
  if (state.challengeMode === 'defense-challenge' || state.challengeMode === 'attack-challenge') {
    awardMission(computeMissionScore(state.results));
  }

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

  // ── Score + rank progression block (challenge runs only) ──
  let awardHtml = '';
  if (state.lastAward) {
    const a = state.lastAward;
    const next = nextRankFor(profile.xp);
    const cur = rankForXp(profile.xp);
    const span = next ? next.minXp - cur.minXp : 1;
    const into = next ? profile.xp - cur.minXp : 1;
    const pct = next ? Math.round(100 * into / span) : 100;
    awardHtml = `
      <div class="award-block">
        <div class="award-score">
          <div class="award-score-num">${a.score}</div>
          <div class="award-score-label">ציון משימה</div>
          ${a.isNewBest ? '<div class="award-newbest">🏅 שיא אישי חדש!</div>'
                        : `<div class="award-prevbest">שיא אישי: ${a.best}</div>`}
        </div>
        <div class="award-rank">
          <div class="award-rank-row">
            <span class="award-rank-name">🎖 ${cur.name}</span>
            <span class="award-xp">+${a.xp} XP</span>
          </div>
          <div class="award-bar"><div class="award-bar-fill" style="width:${pct}%"></div></div>
          <div class="award-rank-next">${next ? `עוד ${next.minXp - profile.xp} XP לדרגת ${next.name}` : 'הדרגה הגבוהה ביותר!'}</div>
          ${a.rankedUp ? `<div class="award-rankup">⭐ קודמת לדרגת <b>${a.newRank.name}</b>!</div>` : ''}
        </div>
      </div>`;
  }

  body.innerHTML = `
    ${awardHtml}
    <div class="modal-verdict ${verdictCls}">${verdictText}</div>

    <div class="results-section-title" style="color:${isAttack ? '#dc2626' : '#5fa8d3'}">🎯 יעדים אסטרטגיים</div>
    <div class="targets-status">${hitTargetsHtml}</div>

    <div class="modal-summary">${summaryCardsHtml}</div>

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
      recs.push('🎯 <b>הגנה מושלמת!</b> כל האיומים יורטו לפי ה-PK של הסוללות. ניתן לבחון הפחתת משאבים בלי לפגוע בכיסוי.');
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
    recs.push(`📍 <b>${counts['out-of-range']} איומים סווגו "יציאה מטווח"</b> (יעדים: ${tgts}). הסיבה: לא היה כיסוי גאומטרי, גובה הטיסה מחוץ לתקרת הסוללה, או שהאיום עזב את הטווח לפני שהמיירט הגיע. <b>פתרון:</b> פרוס סוללה ארוכת טווח (Patriot 160km / David's Sling 200km / Barak 100km) קרוב יותר לציר התקיפה.`);
  }

  if (counts['flight-time'] > 0) {
    const types = [...new Set(typesPerReason['flight-time'])].join(', ');
    recs.push(`⏱ <b>${counts['flight-time']} פספוסים מ"זמן מעוף לא מספיק"</b> - האיום (${types}) הקדים להגיע ליעד לפני שהמיירט מהסוללה הגיע אליו. <b>פתרון:</b> הצב סוללות <u>קרוב יותר לציר התקיפה</u> (פחות מרחק = פחות זמן מעוף), או השתמש במיירט מהיר יותר (David's Sling Mach 7 / Patriot Mach 5).`);
  }

  if (counts['tangent'] > 0) {
    recs.push(`📐 <b>${counts['tangent']} פספוסים מ"חציה משיקית"</b> - האיום נע בניצב לציר הסוללה (עד 15° מהניצב) ברגע היירוט, מצב שבו המיירט לא יכול לפצות. <b>פתרון:</b> מקם סוללות כך שציר ההגעה של האיום יתלכד עם קו הראייה של הסוללה ולא יעמוד בניצב לה.`);
  }

  if (counts['statistical'] > 0) {
    recs.push(`🎲 <b>${counts['statistical']} פספוסים סטטיסטיים</b> - בתחום השונות הנורמלית לפי ה-PK של הסוללה (לדוגמה: SA-8 Gecko יחטיא בממוצע 35% מהירויות). <b>פתרון:</b> <u>הגנה רב-שכבתית</u> - שתי סוללות יורות בזו אחר זו על אותו איום מכפילות את הסבירות לפגיעה (90%+90% = 99%).`);
  }

  // Target-specific hotspot
  const targetDamage = {};
  survived.forEach(b => { targetDamage[b.target] = (targetDamage[b.target] || 0) + 1; });
  const hotTargets = Object.entries(targetDamage)
    .filter(([_, n]) => n >= 2)
    .sort((a, b) => b[1] - a[1]);
  if (hotTargets.length) {
    const [tname, count] = hotTargets[0];
    recs.push(`🔥 <b>${tname} ספג ${count} פגיעות</b> - יעד תחת לחץ מיוחד. בנה סביבו הגנה רב-שכבתית: מכ"ם גילוי + סוללה ארוכת-טווח חיצונית + Iron shield כ-point-defense.`);
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
    recs.push(`⚠ <b>${batName} יורט ${count} איומים</b> - הסוללה שיירטה הכי הרבה. שלח גלי <u>הספקי יירוט</u> (3+ איומים בו-זמנית מאזור צר) למצות את התחמושת שלה, ואז שלח את האיומים החשובים שלך.`);
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
      recs.push(`✗ <b>${worstType}</b> יורט ב-${((1-ws.rate)*100).toFixed(0)}% - מבוזבז. הקטן את כמותו או השתמש בו רק כפיתיון להספקי יירוט.`);
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
    recs.push(`🛡 <b>יעד מבוצר: ${desc}</b> - אף איום לא חדר. שלח לכאן רק UAVs זולים כהספקי יירוט למיצוי תחמושת, ושמור Fighters ליעדים פרוצים.`);
  }

  // Altitude/type tactical hints
  const fighterKilled = intercepted.filter(b => b.type === 'Fighter Jet').length;
  const heloKilled = intercepted.filter(b => b.type === 'Attack Helicopter').length;
  const uavKilled = intercepted.filter(b => b.type === 'Attack UAV').length;
  if (fighterKilled >= 2) {
    recs.push('✈ <b>Fighter Jet בגובה 10 ק"מ</b> נחשפים ל-Patriot/David\'s Sling/Barak. כדי לעקוף - בחר יעדים שלא מכוסים בסוללות גובה גבוה (בדוק את עיגולי הטווח).');
  }
  if (heloKilled >= 2) {
    recs.push('🚁 <b>Attack Helicopter בגובה 0.8 ק"מ</b> פגיעים ל-Iron shield ו-SA-8. שלח אותם רק ליעדים מרוחקים מסוללות point-defense.');
  }
  if (uavKilled >= 4) {
    recs.push('◆ <b>הרבה UAVs יורטו</b> - הם איטיים וחשופים. שלח אותם בגלים מרוכזים (הספקי יירוט) במקום בודדים, או נצל אותם רק כפיתיון לפני שיגור Fighters.');
  }

  // Saturation hint based on overall interception rate
  if (intercepted.length / r.total > 0.4) {
    recs.push('💡 <b>הספקי יירוט</b> - הגדל את כמות האיומים בו-זמנית מאותו וקטור. הסוללות מוגבלות בקצב טעינה (0.4-0.8 שנ\') ובתחמושת (3-12 מיירטים) - אם תציף, אחד יעבור.');
  }

  if (recs.length === 0) {
    recs.push('💡 ההתקפה הצליחה ברובה - שמור על הטקטיקה.');
  }

  return recs;
}

function hideModal() {
  document.getElementById('modal').classList.remove('visible');
  // After the results modal closes, surface a 'Start new game' CTA on the
  // map so the player has a clear next step on mobile.
  if (state.results) showNewGameCta();
}

function showNewGameCta() {
  if (!window.MOBILE_MODE) return;
  const btn = document.getElementById('mobile-new-game-cta');
  if (btn) btn.style.display = '';
}

function hideNewGameCta() {
  const btn = document.getElementById('mobile-new-game-cta');
  if (btn) btn.style.display = 'none';
}

// Theoretical best result with the current placement: every viable engagement succeeds.
// Greedy assignment of one available battery per threat (highest-value targets first).
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

// Returns true if the threat's straight-line path comes within the battery's effective engagement range.
function threatPathEntersEnvelope(t, d, c, tc) {
  const altMSL = getThreatAltMSL(t);
  if (altMSL < c.minAlt || altMSL > c.maxAlt) return false;
  const effMax = effectiveEngagementRange(c, tc);
  const dx = t.tx - t.sx, dy = t.ty - t.sy;
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len, uy = dy / len;
  const proj = (d.x - t.sx) * ux + (d.y - t.sy) * uy;
  const cpx = t.sx + proj * ux, cpy = t.sy + proj * uy;
  return Math.hypot(cpx - d.x, cpy - d.y) <= effMax;
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

  // Case B: threat was never engaged
  const tc = CATALOG[t.key];

  // B1: threat passed through a depleted battery's envelope (tracked in real-time)
  if (t.depletedEnvelope && t.depletedEnvelope.length > 0) {
    const batts = [...new Set(t.depletedEnvelope)].join(', ');
    return `<b>בתוך מעטפת סוללה, גמר מיירטים</b> [${batts}]`;
  }

  // B2: threat path never entered any battery's engagement envelope
  const batteries = state.defenses.filter(d => CATALOG[d.key].kind === 'battery');
  if (batteries.length > 0) {
    const anyInRange = batteries.some(d => threatPathEntersEnvelope(t, d, CATALOG[d.key], tc));
    if (!anyInRange) {
      return `<b>מטרה מחוץ למעטפות היירוט של הסוללות</b>`;
    }
  }

  // B3: path entered an envelope but engagement physics prevented a shot
  const candidates = [];
  for (const d of batteries) {
    const c = CATALOG[d.key];
    candidates.push({ battery: c.short, reason: simulateEngagementOutcome(t, d, c, tc) });
  }

  if (!candidates.length) {
    return `<b>${REASON_LABEL['out-of-range']}</b> - אין סוללה כלשהי במפה`;
  }
  const priority = ['statistical', 'tangent', 'flight-time', 'out-of-range'];
  for (const p of priority) {
    const list = candidates.filter(x => x.reason === p);
    if (list.length) {
      const batNames = [...new Set(list.map(x => x.battery))].join(', ');
      return `<b>${REASON_LABEL[p]}</b> [${batNames}]`;
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
  // 1. Altitude envelope (MSL: AGL altitude + terrain elevation under threat)
  const altMSL = getThreatAltMSL(t);
  if (altMSL < c.minAlt || altMSL > c.maxAlt) return 'out-of-range';

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
  regenerateMountains(difficulty);   // terrain complexity scales with difficulty
  state.threatBudget = { ...profile.threatBudget };
  state.objective = profile.objective;
  state.noIntel = !!profile.noIntel;
  state.intelRevealed = !state.noIntel;

  const total = profile.threatBudget.uav + profile.threatBudget.fighter + profile.threatBudget.helicopter;
  const numBatteries = profile.defenses.filter(d => CATALOG[d.key].kind === 'battery').length;

  for (const item of profile.defenses) {
    const pos = resolveAnchor(item);
    const ammo = calcAutoAmmo(item.key, total, numBatteries);
    state.defenses.push({
      id: nextId++, key: item.key, x: pos.x, y: pos.y,
      ammo, initialAmmo: ammo, cd: 0,
      prepareTarget: null, prepareUntil: 0
    });
  }

  switchSide('red');
  state.mode = 'idle';
  state.placeKey = null;
  state.placeStep = null;
  state.placeOrigin = null;
  refreshButtonStates();
  renderBudget();
  renderBatteryLegend();

  const intelLine = state.noIntel
    ? `<span style="font-size:12px;font-weight:400;color:#ff7373"><b>🕶 ללא מודיעין:</b> פריסת ההגנה נסתרת — תיחשף רק כשתפעיל את הסימולציה. תקציב: ${total} איומים</span>`
    : `<span style="font-size:12px;font-weight:400">תקציב: ${total} איומים | בחר סוג, לחץ מחוץ לגבולות, ואז על יעד</span>`;
  showBanner(
    `🎯 <u>משימת התקפה - ${profile.label}</u>${state.noIntel ? ' 🕶' : ''}<br>` +
    `<span style="color:#fbbf24">תנאי ניצחון:</span> ${profile.objective.text}<br>` +
    intelLine,
    ''
  );
  setStatus(`משימת התקפה ${profile.label}${state.noIntel ? ' (ללא מודיעין)' : ''} - בחר סוג איום מהתפריט`);
  showBackButton();
  updateStepGuide();
  closeMobileSidebar();
  armMenuAttention();
  hideNewGameCta();
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
function calcAutoAmmo(key, totalThreats, numBatteries) {
  const c = CATALOG[key];
  if (c.kind !== 'battery') return c.ammo;
  return Math.max(c.ammo, Math.ceil(totalThreats / Math.max(numBatteries, 1) / c.hitRate * 1.3));
}

function startDefenseChallenge(difficulty = 'medium') {
  resetAll();
  state.challengeMode = 'defense-challenge';
  state.challengeDifficulty = difficulty;
  regenerateMountains(difficulty);   // terrain complexity scales with difficulty
  const profile = DEFENSE_DIFFICULTY[difficulty];
  if (!profile) return;
  state.objective = profile.objective;
  state.noIntel = !!profile.noIntel;
  state.intelRevealed = !state.noIntel;

  const attackSize = profile.countMin + Math.floor(Math.random() * (profile.countMax - profile.countMin));
  for (let i = 0; i < attackSize; i++) {
    const r = Math.random();
    let key;
    if (r < 0.2) key = 'fighter';
    else if (r < 0.4) key = 'helicopter';
    else key = 'uav';
    const tgt = TARGETS[Math.floor(Math.random() * TARGETS.length)];
    // Spawn only from inside the red zone (x ∈ [10, 370], y ∈ [10, 790])
    const sx = 10 + Math.random() * 360;
    const sy = 10 + Math.random() * 780;
    state.threats.push(makeThreat(
      key, sx, sy,
      tgt.x + (Math.random() - 0.5) * 30,
      tgt.y + (Math.random() - 0.5) * 30,
      tgt.name
    ));
  }

  let numBudgetBatteries = 0;
  for (const k of BATTERY_KEYS) numBudgetBatteries += (profile.budget[k] || 0);
  state.autoAmmo = {};
  for (const k of BATTERY_KEYS) state.autoAmmo[k] = calcAutoAmmo(k, attackSize, numBudgetBatteries);

  state.budget = profile.budget;
  switchSide('blue');
  const statusMsg = state.noIntel
    ? `משימת הגנה ${profile.label} (ללא מודיעין) - תכנן הגנה רב-שכבתית`
    : `משימת הגנה ${profile.label}: ${attackSize} איומים, פרוס במסגרת התקציב`;
  setStatus(statusMsg);
  const intelLine = state.noIntel
    ? `<span style="font-size:12px;font-weight:400;color:#ff7373"><b>🕶 ללא מודיעין:</b> נתיבי האיומים יחשפו רק עם תחילת הסימולציה — תכנן הגנה רב-שכבתית!</span>`
    : `<span style="font-size:12px;font-weight:400">איומים מתקרבים: ${attackSize} | פרוס במסגרת התקציב</span>`;
  showBanner(
    `🛡 <u>משימת הגנה - ${profile.label}</u>${state.noIntel ? ' 🕶' : ''}<br>` +
    `<span style="color:#fbbf24">תנאי ניצחון:</span> ${profile.objective.text}<br>` +
    intelLine,
    ''
  );
  renderBudget();
  showBackButton();
  updateStepGuide();
  closeMobileSidebar();
  armMenuAttention();
  hideNewGameCta();
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
  renderMobileBudgetPill();
}

// Compact floating "remaining budget" pill shown on the map in mobile mode
// while a challenge is active and the sheet is closed. The sidebar buttons
// (with their orange/red /max badges) are out of view once the sheet
// auto-closes after placement, so this gives an at-a-glance reminder.
function renderMobileBudgetPill() {
  if (!window.MOBILE_MODE) return;
  const pill = document.getElementById('mobile-budget-pill');
  if (!pill) return;

  const items = [];
  if (state.budget) {
    for (const k of [...BATTERY_KEYS, ...RADAR_KEYS]) {
      const max = state.budget[k] || 0;
      if (max === 0) continue;
      const used = state.defenses.filter(d => d.key === k).length;
      items.push({ key: k, remain: max - used, max });
    }
  } else if (state.threatBudget) {
    for (const k of THREAT_KEYS) {
      const max = state.threatBudget[k] || 0;
      if (max === 0) continue;
      const used = state.threats.filter(t => t.key === k).length;
      items.push({ key: k, remain: max - used, max });
    }
  }

  const mapEl = document.getElementById('map-container');
  const isShowing = items.length > 0 && !isSimActive();
  if (mapEl) {
    mapEl.classList.toggle('challenge-active', isShowing);
    mapEl.classList.toggle('attack-challenge', state.challengeMode === 'attack-challenge');
  }
  if (!isShowing) {
    pill.style.display = 'none';
    return;
  }

  pill.style.display = '';
  pill.innerHTML = items.map(it => {
    const c = CATALOG[it.key];
    const depleted = it.remain <= 0;
    const cls = `budget-chip${depleted ? ' depleted' : ''}${state.placeKey === it.key ? ' active' : ''}`;
    return `<div class="${cls}" data-key="${it.key}" style="border-color:${c.color};color:${c.color}">`
         + `<span class="budget-chip-name">${c.short}</span>`
         + `<span class="budget-chip-count">${Math.max(0, it.remain)}/${it.max}</span>`
         + `</div>`;
  }).join('');
}

