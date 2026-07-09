// Build the Israel country pack for AIRWAR "operational" mode.
// Inputs: ne10m.geojson, ne10m_lakes.geojson, dem/7_x_y.png (terrarium)
// Output: /home/user/AIRWAR/countries/il.js
const fs = require('fs');
const { PNG } = require('pngjs');
const union = require('@turf/union').default || require('@turf/union');
const { featureCollection } = require('@turf/helpers');

// ── Frame: 1200×800 km, 1 px = 1 km, centered near Jerusalem ──
const LON0 = 35.0, LAT0 = 31.6;
const KM_LAT = 110.574;
const KM_LON = 111.320 * Math.cos(LAT0 * Math.PI / 180);
const W = 1200, H = 800;
const projX = lon => 600 + (lon - LON0) * KM_LON;
const projY = lat => 400 - (lat - LAT0) * KM_LAT;
const invLon = x => LON0 + (x - 600) / KM_LON;
const invLat = y => LAT0 - (y - 400) / KM_LAT;

// ── Geometry helpers ──
function ringArea(r) {
  let a = 0;
  for (let i = 0; i < r.length; i++) {
    const [x1, y1] = r[i], [x2, y2] = r[(i + 1) % r.length];
    a += x1 * y2 - x2 * y1;
  }
  return Math.abs(a / 2);
}

// Sutherland–Hodgman clip of a ring to the frame rect
function clipRect(ring) {
  const edges = [
    p => p[0] >= 0,  (a, b) => lerpEdge(a, b, 0, 'x'),
    p => p[0] <= W,  (a, b) => lerpEdge(a, b, W, 'x'),
    p => p[1] >= 0,  (a, b) => lerpEdge(a, b, 0, 'y'),
    p => p[1] <= H,  (a, b) => lerpEdge(a, b, H, 'y')
  ];
  function lerpEdge(a, b, v, axis) {
    const i = axis === 'x' ? 0 : 1, j = 1 - i;
    const t = (v - a[i]) / (b[i] - a[i]);
    const out = [];
    out[i] = v;
    out[j] = a[j] + t * (b[j] - a[j]);
    return out;
  }
  let poly = ring;
  for (let e = 0; e < 8; e += 2) {
    const inside = edges[e], isect = edges[e + 1];
    const out = [];
    for (let i = 0; i < poly.length; i++) {
      const cur = poly[i], prev = poly[(i + poly.length - 1) % poly.length];
      const curIn = inside(cur), prevIn = inside(prev);
      if (curIn) {
        if (!prevIn) out.push(isect(prev, cur));
        out.push(cur);
      } else if (prevIn) {
        out.push(isect(prev, cur));
      }
    }
    poly = out;
    if (!poly.length) return [];
  }
  return poly;
}

// Douglas–Peucker simplification (closed ring)
function simplify(ring, tol) {
  if (ring.length < 8) return ring;
  const keep = new Array(ring.length).fill(false);
  keep[0] = keep[Math.floor(ring.length / 2)] = true;
  function dp(i0, i1) {
    let maxD = -1, maxI = -1;
    const [x1, y1] = ring[i0], [x2, y2] = ring[i1 % ring.length];
    const dx = x2 - x1, dy = y2 - y1;
    const len = Math.hypot(dx, dy) || 1e-9;
    for (let i = i0 + 1; i < i1; i++) {
      const [px, py] = ring[i];
      const d = Math.abs(dy * px - dx * py + x2 * y1 - y2 * x1) / len;
      if (d > maxD) { maxD = d; maxI = i; }
    }
    if (maxD > tol) {
      keep[maxI] = true;
      dp(i0, maxI); dp(maxI, i1);
    }
  }
  dp(0, Math.floor(ring.length / 2));
  dp(Math.floor(ring.length / 2), ring.length);
  return ring.filter((_, i) => keep[i]);
}

function projectRings(geom) {
  const polys = geom.type === 'Polygon' ? [geom.coordinates] : geom.coordinates;
  const out = [];
  for (const poly of polys) {
    const outer = poly[0].map(([lon, lat]) => [projX(lon), projY(lat)]);
    out.push(outer);
  }
  return out;
}

function round1(ring) { return ring.map(([x, y]) => [Math.round(x * 10) / 10, Math.round(y * 10) / 10]); }

// ── Load admin-0 ──
const admin = JSON.parse(fs.readFileSync('ne10m.geojson', 'utf8'));
const byName = {};
for (const f of admin.features) {
  byName[f.properties.ADMIN] = f;
}

// Home air-defense zone: Israel ∪ Palestine (one contiguous airspace)
const isr = byName['Israel'];
const pse = byName['Palestine'];
if (!isr) throw new Error('Israel feature missing');
let homeFeature = isr;
if (pse) {
  try {
    const u = union(featureCollection([isr, pse]));
    if (u) homeFeature = u;
  } catch (e) {
    try { const u2 = union(isr, pse); if (u2) homeFeature = u2; } catch (e2) { console.log('union failed, using Israel only'); }
  }
}
let homeRings = projectRings(homeFeature.geometry)
  .map(r => clipRect(r)).filter(r => r.length >= 3 && ringArea(r) > 300)
  .sort((a, b) => ringArea(b) - ringArea(a));
console.log('home rings:', homeRings.map(r => Math.round(ringArea(r))));
const home = round1(simplify(homeRings[0], 1.2));
console.log('home points:', home.length);

// Neighbors present in the frame
const NEIGHBOR_DEFS = [
  { admin: 'Lebanon', en: 'Lebanon', he: 'לבנון', eligible: true },
  { admin: 'Syria', en: 'Syria', he: 'סוריה', eligible: true },
  { admin: 'Jordan', en: 'Jordan', he: 'ירדן', eligible: true },
  { admin: 'Egypt', en: 'Egypt', he: 'מצרים', eligible: true },
  { admin: 'Saudi Arabia', en: 'Saudi Arabia', he: 'סעודיה', eligible: false },
  { admin: 'Iraq', en: 'Iraq', he: 'עיראק', eligible: false },
  { admin: 'Cyprus', en: 'Cyprus', he: 'קפריסין', eligible: false },
  { admin: 'Northern Cyprus', en: 'Cyprus', he: 'קפריסין', eligible: false, mergeInto: 'Cyprus' }
];
const neighbors = [];
for (const nd of NEIGHBOR_DEFS) {
  const f = byName[nd.admin];
  if (!f) { console.log('missing:', nd.admin); continue; }
  const rings = projectRings(f.geometry)
    .map(r => clipRect(r)).filter(r => r.length >= 3 && ringArea(r) > 400)
    .sort((a, b) => ringArea(b) - ringArea(a));
  if (!rings.length) { console.log('outside frame:', nd.admin); continue; }
  const poly = round1(simplify(rings[0], 2.5));
  const existing = nd.mergeInto && neighbors.find(n => n.en === nd.mergeInto);
  if (existing) { existing.polys.push(poly); continue; }
  neighbors.push({ en: nd.en, he: nd.he, eligible: nd.eligible, polys: [poly] });
  console.log('neighbor', nd.admin, poly.length, 'pts, area', Math.round(ringArea(poly)));
}

// ── Lakes: Sea of Galilee + Dead Sea ──
const lakesSrc = JSON.parse(fs.readFileSync('ne10m_lakes.geojson', 'utf8'));
const lakes = [];
for (const f of lakesSrc.features) {
  const nm = (f.properties.name || '') + '|' + (f.properties.name_alt || '');
  if (!/Galilee|Tiberias|Kinneret|Dead Sea/i.test(nm)) continue;
  for (const ring of projectRings(f.geometry)) {
    const c = clipRect(ring);
    if (c.length >= 3 && ringArea(c) > 30) {
      const s = round1(simplify(c, 0.8));
      let cx = 0, cy = 0;
      for (const [x, y] of s) { cx += x; cy += y; }
      lakes.push({ poly: s, cx: Math.round(cx / s.length), cy: Math.round(cy / s.length), name: f.properties.name });
      console.log('lake', f.properties.name, s.length, 'pts');
    }
  }
}

// ── DEM: sample the 241×161 grid (5 km cells) from terrarium z7 tiles ──
const Z = 7, TILES = {};
for (const fn of fs.readdirSync('dem')) {
  const m = fn.match(/7_(\d+)_(\d+)\.png/);
  if (m) TILES[`${m[1]}_${m[2]}`] = PNG.sync.read(fs.readFileSync('dem/' + fn));
}
function elevAt(lon, lat) {
  const n = 128 * 256; // world pixels at z7
  const px = (lon + 180) / 360 * n;
  const latR = lat * Math.PI / 180;
  const py = (1 - Math.log(Math.tan(latR) + 1 / Math.cos(latR)) / Math.PI) / 2 * n;
  const tx = Math.floor(px / 256), ty = Math.floor(py / 256);
  const t = TILES[`${tx}_${ty}`];
  if (!t) return 0;
  const ox = Math.min(255, Math.max(0, Math.floor(px - tx * 256)));
  const oy = Math.min(255, Math.max(0, Math.floor(py - ty * 256)));
  const idx = (oy * 256 + ox) * 4;
  return t.data[idx] * 256 + t.data[idx + 1] + t.data[idx + 2] / 256 - 32768;
}
const GW = 241, GH = 161, CELL = 5;
const elevM = new Float64Array(GW * GH);
let maxEl = 0;
for (let iy = 0; iy < GH; iy++) {
  for (let ix = 0; ix < GW; ix++) {
    const e = Math.max(0, elevAt(invLon(ix * CELL), invLat(iy * CELL)));
    elevM[iy * GW + ix] = e;
    if (e > maxEl) maxEl = e;
  }
}
console.log('max elevation (m):', Math.round(maxEl));
const scale = maxEl / 255;
const q = Buffer.alloc(GW * GH);
for (let i = 0; i < GW * GH; i++) q[i] = Math.round(elevM[i] / scale);

// ── Named peaks inside home (top local maxima, min 45 km apart) ──
function pointInPoly(x, y, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i][0], yi = poly[i][1], xj = poly[j][0], yj = poly[j][1];
    if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) inside = !inside;
  }
  return inside;
}
const peaks = [];
for (let iy = 2; iy < GH - 2; iy++) {
  for (let ix = 2; ix < GW - 2; ix++) {
    const e = elevM[iy * GW + ix];
    if (e < 500) continue;
    let isMax = true;
    for (let dy = -2; dy <= 2 && isMax; dy++)
      for (let dx = -2; dx <= 2; dx++)
        if ((dx || dy) && elevM[(iy + dy) * GW + ix + dx] > e) { isMax = false; break; }
    if (!isMax) continue;
    const x = ix * CELL, y = iy * CELL;
    if (!pointInPoly(x, y, home)) continue;
    peaks.push({ x, y, alt: Math.round(e) / 1000 });
  }
}
peaks.sort((a, b) => b.alt - a.alt);
const chosen = [];
for (const p of peaks) {
  if (chosen.every(c => Math.hypot(c.x - p.x, c.y - p.y) > 45)) chosen.push(p);
  if (chosen.length >= 4) break;
}
console.log('peaks:', JSON.stringify(chosen));

// ── Strategic targets (real coordinates, roles mirror the template) ──
const T = (en, he, lat, lon, value, flags = {}) => ({
  name: en, nameHe: he,
  x: Math.round(projX(lon)), y: Math.round(projY(lat)),
  value, ...flags
});
const targets = [
  T('Jerusalem', 'ירושלים', 31.7683, 35.2137, 5, { capital: true }),
  T('Tel Aviv', 'תל אביב', 32.0853, 34.7818, 3),
  T('Haifa', 'חיפה', 32.7940, 34.9896, 3),
  T('Beer Sheva', 'באר שבע', 31.2518, 34.7913, 2),
  T('Nevatim Airbase', 'בסיס נבטים', 31.2083, 34.6828, 4, { airbase: true })
];
for (const t of targets) {
  console.log(t.name, t.x, t.y, 'inside:', pointInPoly(t.x, t.y, home));
}

// ── Emit the pack ──
const pack = {
  id: 'il',
  name: 'Israel',
  nameHe: 'ישראל',
  attribution: 'Borders: Natural Earth (public domain). Elevation: Mapzen/AWS Terrain Tiles (SRTM et al.).',
  home,
  neighbors: neighbors.map(n => ({ name: n.en, nameHe: n.he, eligible: n.eligible, polys: n.polys })),
  lakes: lakes.map(l => ({ poly: l.poly, cx: l.cx, cy: l.cy })),
  targets,
  peaks: chosen,
  heights: { w: GW, h: GH, cell: CELL, scaleM: Math.round(scale * 1000) / 1000, b64: q.toString('base64') }
};
const js = 'window.COUNTRY_PACKS = window.COUNTRY_PACKS || {};\n' +
  'window.COUNTRY_PACKS["il"] = ' + JSON.stringify(pack) + ';\n';
fs.mkdirSync('/home/user/AIRWAR/countries', { recursive: true });
fs.writeFileSync('/home/user/AIRWAR/countries/il.js', js);
console.log('pack written:', fs.statSync('/home/user/AIRWAR/countries/il.js').size, 'bytes');
