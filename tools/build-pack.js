// Generalized AIRWAR country-pack builder.
//   node tools/build-pack.js <id>
// Reads config from tools/pack-configs.js, shared datasets from
// scratchpad/data (admin0.geojson, lakes.geojson, places.geojson), and
// downloads the z7 terrain tiles covering the frame on demand. Emits
// /home/user/AIRWAR/countries/<id>.js in the exact shape loadRealWorld()
// consumes.
//
// Frame: 1200x800 km, 1 px = 1 km, centred on the capital (or an explicit
// override). Everything downstream (borders, neighbours, lakes, peaks,
// elevation grid, city-seeded targets with n/c/s sectors) is automatic.

const fs = require('fs');
const path = require('path');
const { PNG } = require('pngjs');
const union = require('@turf/union').default || require('@turf/union');
const { featureCollection } = require('@turf/helpers');
const { COUNTRY_HE, CITY_HE, CONFIGS } = require('./pack-configs.js');

const DATA = process.env.PACK_DATA || path.join(__dirname, '..', '..', 'scratchpad', 'data');
const OUT_DIR = path.join(__dirname, '..', 'countries');
const W = 1200, H = 800;
const KM_LAT = 110.574;

const id = process.argv[2];
if (!id || !CONFIGS[id]) {
  console.error('usage: node build-pack.js <id>  (known: ' + Object.keys(CONFIGS).join(', ') + ')');
  process.exit(1);
}
const cfg = CONFIGS[id];

// ── Load shared datasets ──
function loadJSON(f) { return JSON.parse(fs.readFileSync(path.join(DATA, f), 'utf8')); }
const admin = loadJSON('admin0.geojson');
const lakesSrc = loadJSON('lakes.geojson');
const places = loadJSON('places.geojson');

const byName = {};
for (const f of admin.features) byName[f.properties.ADMIN] = f;
const home0 = byName[cfg.admin];
if (!home0) throw new Error('admin not found: ' + cfg.admin);

// ── Frame centre: explicit override, else the country capital, else centroid ──
function featureCentroid(feat) {
  let cx = 0, cy = 0, n = 0;
  const polys = feat.geometry.type === 'Polygon' ? [feat.geometry.coordinates] : feat.geometry.coordinates;
  for (const poly of polys) for (const [lon, lat] of poly[0]) { cx += lon; cy += lat; n++; }
  return [cx / n, cy / n];
}
let center = cfg.center;
if (!center) {
  const cap = places.features.find(p => p.properties.adm0name === cfg.admin && p.properties.adm0cap === 1);
  center = cap ? [cap.properties.longitude, cap.properties.latitude] : featureCentroid(home0);
}
const [LON0, LAT0] = center;
const KM_LON = 111.320 * Math.cos(LAT0 * Math.PI / 180);
const projX = lon => 600 + (lon - LON0) * KM_LON;
const projY = lat => 400 - (lat - LAT0) * KM_LAT;
const invLon = x => LON0 + (x - 600) / KM_LON;
const invLat = y => LAT0 - (y - 400) / KM_LAT;
console.log(`[${id}] centre lon/lat = ${LON0.toFixed(2)}, ${LAT0.toFixed(2)}`);

// ── Geometry helpers (shared with the IL builder) ──
function ringArea(r) {
  let a = 0;
  for (let i = 0; i < r.length; i++) {
    const [x1, y1] = r[i], [x2, y2] = r[(i + 1) % r.length];
    a += x1 * y2 - x2 * y1;
  }
  return Math.abs(a / 2);
}
function clipRect(ring) {
  const edges = [
    p => p[0] >= 0, (a, b) => lerpEdge(a, b, 0, 'x'),
    p => p[0] <= W, (a, b) => lerpEdge(a, b, W, 'x'),
    p => p[1] >= 0, (a, b) => lerpEdge(a, b, 0, 'y'),
    p => p[1] <= H, (a, b) => lerpEdge(a, b, H, 'y')
  ];
  function lerpEdge(a, b, v, axis) {
    const i = axis === 'x' ? 0 : 1, j = 1 - i;
    const t = (v - a[i]) / (b[i] - a[i]);
    const out = []; out[i] = v; out[j] = a[j] + t * (b[j] - a[j]);
    return out;
  }
  let poly = ring;
  for (let e = 0; e < 8; e += 2) {
    const inside = edges[e], isect = edges[e + 1];
    const out = [];
    for (let i = 0; i < poly.length; i++) {
      const cur = poly[i], prev = poly[(i + poly.length - 1) % poly.length];
      const curIn = inside(cur), prevIn = inside(prev);
      if (curIn) { if (!prevIn) out.push(isect(prev, cur)); out.push(cur); }
      else if (prevIn) out.push(isect(prev, cur));
    }
    poly = out;
    if (!poly.length) return [];
  }
  return poly;
}
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
    if (maxD > tol) { keep[maxI] = true; dp(i0, maxI); dp(maxI, i1); }
  }
  dp(0, Math.floor(ring.length / 2));
  dp(Math.floor(ring.length / 2), ring.length);
  return ring.filter((_, i) => keep[i]);
}
function projectRings(geom) {
  const polys = geom.type === 'Polygon' ? [geom.coordinates] : geom.coordinates;
  return polys.map(poly => poly[0].map(([lon, lat]) => [projX(lon), projY(lat)]));
}
function round1(ring) { return ring.map(([x, y]) => [Math.round(x * 10) / 10, Math.round(y * 10) / 10]); }
function pointInPoly(x, y, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i][0], yi = poly[i][1], xj = poly[j][0], yj = poly[j][1];
    if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) inside = !inside;
  }
  return inside;
}
const heName = (dict, en) => dict[en] || en;

// ── Home polygon: largest clipped ring of the country ──
let homeRings = projectRings(home0.geometry)
  .map(clipRect).filter(r => r.length >= 3 && ringArea(r) > 300)
  .sort((a, b) => ringArea(b) - ringArea(a));
if (!homeRings.length) throw new Error('home country does not intersect frame');
const home = round1(simplify(homeRings[0], 1.4));
console.log(`[${id}] home ring: ${home.length} pts, area ${Math.round(ringArea(home))}`);

// ── Neighbours: every other admin-0 country intersecting the frame ──
const neighbors = [];
for (const f of admin.features) {
  if (f === home0) continue;
  const en = f.properties.ADMIN;
  const rings = projectRings(f.geometry)
    .map(clipRect).filter(r => r.length >= 3 && ringArea(r) > 500)
    .sort((a, b) => ringArea(b) - ringArea(a));
  if (!rings.length) continue;
  // keep up to the 2 largest rings of each neighbour
  const polys = rings.slice(0, 2).map(r => round1(simplify(r, 2.8)));
  neighbors.push({ name: en, nameHe: heName(COUNTRY_HE, en), eligible: true, polys });
}
neighbors.sort((a, b) => ringArea(b.polys[0]) - ringArea(a.polys[0]));
console.log(`[${id}] neighbours: ${neighbors.map(n => n.name).join(', ')}`);

// ── Lakes within the frame ──
const lakes = [];
for (const f of lakesSrc.features) {
  for (const ring of projectRings(f.geometry)) {
    const c = clipRect(ring);
    if (c.length >= 3 && ringArea(c) > 120) {
      const s = round1(simplify(c, 1.0));
      let cx = 0, cy = 0;
      for (const [x, y] of s) { cx += x; cy += y; }
      lakes.push({ poly: s, cx: Math.round(cx / s.length), cy: Math.round(cy / s.length) });
    }
  }
}
console.log(`[${id}] lakes: ${lakes.length}`);

// ── DEM: download z7 terrarium tiles covering the frame, sample the grid ──
function tileXY(lon, lat) {
  const n = 128;
  const x = Math.floor((lon + 180) / 360 * n);
  const latR = lat * Math.PI / 180;
  const y = Math.floor((1 - Math.log(Math.tan(latR) + 1 / Math.cos(latR)) / Math.PI) / 2 * n);
  return [x, y];
}
async function ensureTiles() {
  const corners = [[0, 0], [W, 0], [0, H], [W, H]];
  let minX = 1e9, maxX = -1e9, minY = 1e9, maxY = -1e9;
  for (const [x, y] of corners) {
    const [tx, ty] = tileXY(invLon(x), invLat(y));
    minX = Math.min(minX, tx); maxX = Math.max(maxX, tx);
    minY = Math.min(minY, ty); maxY = Math.max(maxY, ty);
  }
  const demDir = path.join(DATA, 'dem_' + id);
  fs.mkdirSync(demDir, { recursive: true });
  const TILES = {};
  for (let x = minX; x <= maxX; x++) {
    for (let y = minY; y <= maxY; y++) {
      const fn = path.join(demDir, `${x}_${y}.png`);
      if (!fs.existsSync(fn)) {
        const u = `https://s3.amazonaws.com/elevation-tiles-prod/terrarium/7/${x}/${y}.png`;
        const r = await fetch(u);
        if (!r.ok) { console.log('  tile MISS', x, y, r.status); continue; }
        fs.writeFileSync(fn, Buffer.from(await r.arrayBuffer()));
      }
      TILES[`${x}_${y}`] = PNG.sync.read(fs.readFileSync(fn));
    }
  }
  console.log(`[${id}] dem tiles: ${Object.keys(TILES).length} (x ${minX}..${maxX}, y ${minY}..${maxY})`);
  return TILES;
}

(async () => {
  const TILES = await ensureTiles();
  function elevAt(lon, lat) {
    const n = 128 * 256;
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
  const GW = 601, GH = 401, CELL = 2;
  const elevM = new Float64Array(GW * GH);
  let maxEl = 0;
  for (let iy = 0; iy < GH; iy++)
    for (let ix = 0; ix < GW; ix++) {
      const e = Math.max(0, elevAt(invLon(ix * CELL), invLat(iy * CELL)));
      elevM[iy * GW + ix] = e;
      if (e > maxEl) maxEl = e;
    }
  console.log(`[${id}] max elevation (m): ${Math.round(maxEl)}`);
  const scale = Math.max(1, maxEl) / 255;
  const q = Buffer.alloc(GW * GH);
  for (let i = 0; i < GW * GH; i++) q[i] = Math.round(elevM[i] / scale);

  // ── Peaks: strongest local maxima inside home, min 60 km apart ──
  const peaks = [];
  for (let iy = 2; iy < GH - 2; iy++)
    for (let ix = 2; ix < GW - 2; ix++) {
      const e = elevM[iy * GW + ix];
      if (e < 250) continue;
      let isMax = true;
      for (let dy = -2; dy <= 2 && isMax; dy++)
        for (let dx = -2; dx <= 2; dx++)
          if ((dx || dy) && elevM[(iy + dy) * GW + ix + dx] > e) { isMax = false; break; }
      if (!isMax) continue;
      const x = ix * CELL, y = iy * CELL;
      if (!pointInPoly(x, y, home)) continue;
      peaks.push({ x, y, alt: Math.round(e) / 1000 });
    }
  peaks.sort((a, b) => b.alt - a.alt);
  const chosenPeaks = [];
  for (const p of peaks) {
    if (chosenPeaks.every(c => Math.hypot(c.x - p.x, c.y - p.y) > 60)) chosenPeaks.push(p);
    if (chosenPeaks.length >= 4) break;
  }
  console.log(`[${id}] peaks: ${JSON.stringify(chosenPeaks)}`);

  // ── Strategic targets: capital + biggest cities inside home ──
  const cityFeats = places.features
    .filter(p => p.properties.adm0name === cfg.admin)
    .map(p => ({
      en: p.properties.name,
      lon: p.properties.longitude, lat: p.properties.latitude,
      pop: p.properties.pop_max || 0, cap: p.properties.adm0cap === 1
    }))
    .map(c => ({ ...c, x: Math.round(projX(c.lon)), y: Math.round(projY(c.lat)) }))
    .filter(c => pointInPoly(c.x, c.y, home));
  cityFeats.sort((a, b) => (b.cap - a.cap) || (b.pop - a.pop));
  // De-dup near-identical coords. A generous cap (many cities) so the
  // runtime zoning can fill every ~420km theater with 4-5 strategic
  // sites — the whole country then has a rich target set to defend.
  const picked = [];
  for (const c of cityFeats) {
    if (picked.every(p => Math.hypot(p.x - c.x, p.y - c.y) > 18)) picked.push(c);
    if (picked.length >= 30) break;
  }
  // Value by population tier (capital always top), so the highest-value
  // cities seed zones and read as the primary objectives.
  const targets = picked.map((c, i) => ({
    name: c.en, nameHe: heName(CITY_HE, c.en),
    x: c.x, y: c.y,
    value: c.cap ? 5 : i < 6 ? 4 : i < 14 ? 3 : 2,
    ...(c.cap ? { capital: true } : {})
  }));
  console.log(`[${id}] ${targets.length} targets: ${targets.map(t => t.name).join(', ')}`);

  // ── Emit ──
  const pack = {
    id, name: cfg.admin, nameHe: cfg.nameHe,
    attribution: 'Borders: Natural Earth (public domain). Elevation: Mapzen/AWS Terrain Tiles (SRTM et al.).',
    home,
    neighbors: neighbors.map(n => ({ name: n.name, nameHe: n.nameHe, eligible: n.eligible, polys: n.polys })),
    lakes,
    targets,
    peaks: chosenPeaks,
    heights: { w: GW, h: GH, cell: CELL, scaleM: Math.round(scale * 1000) / 1000, b64: q.toString('base64') }
  };
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const js = 'window.COUNTRY_PACKS = window.COUNTRY_PACKS || {};\n' +
    `window.COUNTRY_PACKS[${JSON.stringify(id)}] = ` + JSON.stringify(pack) + ';\n';
  const outFile = path.join(OUT_DIR, id + '.js');
  fs.writeFileSync(outFile, js);
  console.log(`[${id}] written ${outFile} (${fs.statSync(outFile).size} bytes)`);
})();
