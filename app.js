// =============================================================
// משחק מלחמה - הגנה אווירית | רפובליקת טליאריה
// סקלה: 1 פיקסל = 1 ק"מ
// =============================================================

const CATALOG = {
  // ---- סוללות ----
  ironDome: {
    kind: 'battery', name: 'כיפת ברזל', short: 'IRN',
    minRange: 4, maxRange: 70, minAlt: 0, maxAlt: 10,
    color: '#3b82f6', ammo: 20, reload: 1.2,
    pHit: { uav: 0.92, helicopter: 0.88, fighter: 0.55 },
    desc: 'יירוט קצר טווח, יעיל מאוד נגד כטב"מים ורקטות'
  },
  sa8: {
    kind: 'battery', name: 'SA-8 גקו', short: 'SA8',
    minRange: 1.5, maxRange: 15, minAlt: 0, maxAlt: 5,
    color: '#10b981', ammo: 8, reload: 5,
    pHit: { uav: 0.65, helicopter: 0.85, fighter: 0.50 },
    desc: 'נ"מ ניידת קצרת טווח, גובה נמוך'
  },
  barak8: {
    kind: 'battery', name: 'ברק 8', short: 'BRK',
    minRange: 0.5, maxRange: 100, minAlt: 0, maxAlt: 16,
    color: '#8b5cf6', ammo: 16, reload: 4,
    pHit: { uav: 0.80, helicopter: 0.88, fighter: 0.85 },
    desc: 'מערכת רב-שכבתית לטווח בינוני-ארוך'
  },
  patriot: {
    kind: 'battery', name: 'פטריוט PAC-3', short: 'PAT',
    minRange: 3, maxRange: 160, minAlt: 0, maxAlt: 24,
    color: '#f59e0b', ammo: 16, reload: 6,
    pHit: { uav: 0.40, helicopter: 0.75, fighter: 0.85 },
    desc: 'מערכת ארוכת טווח, מתקשה במטרות איטיות וקטנות'
  },
  davidsSling: {
    kind: 'battery', name: 'שרביט קסמים', short: 'DSL',
    minRange: 40, maxRange: 300, minAlt: 5, maxAlt: 30,
    color: '#ef4444', ammo: 12, reload: 8,
    pHit: { uav: 0.30, helicopter: 0.50, fighter: 0.90 },
    desc: 'יירוט טווח ארוך, גובה בינוני-גבוה'
  },
  // ---- מכ"מים ----
  longRadar: {
    kind: 'radar', name: 'מכ"ם טווח ארוך', short: 'LR',
    detection: 350, color: '#06b6d4',
    desc: 'גילוי 350 ק"מ, רואה מטרות גדולות'
  },
  medRadar: {
    kind: 'radar', name: 'מכ"ם טווח בינוני', short: 'MR',
    detection: 180, color: '#0ea5e9',
    desc: 'גילוי 180 ק"מ, מאוזן'
  },
  shortRadar: {
    kind: 'radar', name: 'מכ"ם גילוי נמוך', short: 'SR',
    detection: 100, color: '#0891b2',
    desc: 'גילוי 100 ק"מ, רואה מטרות קטנות בגובה נמוך'
  },
  // ---- איומים ----
  uav: {
    kind: 'threat', name: 'כטב"ם תוקף', short: 'UAV',
    speed: 35, altitude: 2, rcs: 0.4,
    color: '#fbbf24', icon: '◆',
    desc: 'איטי, נמוך, חתימה קטנה'
  },
  fighter: {
    kind: 'threat', name: 'מטוס קרב', short: 'FTR',
    speed: 110, altitude: 10, rcs: 1.0,
    color: '#dc2626', icon: '▲',
    desc: 'מהיר, גובה גבוה'
  },
  helicopter: {
    kind: 'threat', name: 'מסוק תקיפה', short: 'HEL',
    speed: 45, altitude: 0.8, rcs: 0.7,
    color: '#a855f7', icon: '✚',
    desc: 'נמוך מאוד, מתחמק ממכ"מים'
  }
};

const BATTERY_KEYS = ['ironDome', 'sa8', 'barak8', 'patriot', 'davidsSling'];
const RADAR_KEYS = ['longRadar', 'medRadar', 'shortRadar'];
const THREAT_KEYS = ['uav', 'fighter', 'helicopter'];

// ---- מטרות אסטרטגיות במדינה ----
const TARGETS = [
  { name: 'אריאן (בירה)', x: 720, y: 410, value: 5, capital: true },
  { name: 'טאלוס',        x: 560, y: 230, value: 3 },
  { name: 'מירון',        x: 920, y: 340, value: 3 },
  { name: 'פלאיון',       x: 660, y: 600, value: 2 },
  { name: 'בסיס "נשר"',   x: 800, y: 510, value: 4, airbase: true }
];

// ---- מצב כללי ----
const state = {
  mode: 'idle',           // idle | placing | deleting | sim | challengeDeploy
  placeKey: null,
  side: 'blue',
  defenses: [],           // {id, key, x, y, ammo, cd}
  threats: [],            // {id, key, x, y, sx, sy, tx, ty, status, hitBy}
  missiles: [],           // {sx, sy, x, y, tx, ty, t, dur, hit, threatId}
  explosions: [],
  challengeMode: null,    // null | 'auto-attack' | 'defense-challenge'
  budget: null,           // {ironDome:1,...} for defense-challenge
  results: null,
  lastTs: 0,
  simElapsed: 0,
  drag: null
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
  const b = document.createElement('button');
  b.dataset.key = k;
  let rangeText;
  if (c.kind === 'battery') rangeText = `טווח ${c.minRange}-${c.maxRange} ק"מ • גובה ≤${c.maxAlt}`;
  else if (c.kind === 'radar') rangeText = `גילוי ${c.detection} ק"מ`;
  else rangeText = `מהירות ${c.speed} • גובה ${c.altitude} ק"מ`;
  b.innerHTML = `
    <span class="icon" style="color:${c.color}">${iconFor(k)}</span>
    <span class="info">
      <span class="name">${c.name}</span>
      <span class="range">${rangeText}</span>
    </span>`;
  b.title = c.desc;
  b.addEventListener('click', () => selectPlace(k));
  return b;
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
  document.getElementById('clear-threats').addEventListener('click', clearThreats);
  document.getElementById('reset').addEventListener('click', resetAll);
  document.getElementById('auto-attack').addEventListener('click', generateAutoAttack);
  document.getElementById('defense-challenge').addEventListener('click', startDefenseChallenge);
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
  // Check budget
  if (state.budget && c.kind !== 'threat') {
    const used = state.defenses.filter(d => d.key === key).length;
    if ((state.budget[key] || 0) <= used) {
      setStatus(`לא נותרו ${c.name} בתקציב`);
      return;
    }
  }
  state.mode = 'placing';
  state.placeKey = key;
  refreshButtonStates();
  setStatus(`מציב ${c.name} - לחץ על המפה`);
}

function refreshButtonStates() {
  document.querySelectorAll('.btn-grid button').forEach(b => {
    b.classList.toggle('active', state.mode === 'placing' && b.dataset.key === state.placeKey);
  });
  canvas.classList.toggle('placing', state.mode === 'placing');
  canvas.classList.toggle('deleting', state.mode === 'deleting');
}

function setStatus(text) { document.getElementById('mode-status').textContent = text; }

function showBanner(text, kind) {
  banner.textContent = text;
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
  return { x: ev.clientX - r.left, y: ev.clientY - r.top };
}

function onCanvasClick(ev) {
  if (state.drag && state.drag.moved) { state.drag = null; return; }
  state.drag = null;
  const p = getPos(ev);
  if (state.mode === 'placing') {
    placeAt(state.placeKey, p.x, p.y);
    if (!state.budget) {
      // keep placing
    } else {
      const c = CATALOG[state.placeKey];
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

function onMouseDown(ev) {
  if (state.mode === 'sim' || state.mode === 'placing' || state.mode === 'deleting') return;
  const p = getPos(ev);
  const ent = findEntityAt(p.x, p.y);
  if (ent) state.drag = { ent, ox: p.x - ent.x, oy: p.y - ent.y, moved: false };
}

function onMouseMove(ev) {
  const p = getPos(ev);
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
      lines.push(`תחמושת: ${ent.ammo}/${c.ammo}`);
    } else if (c.kind === 'radar') {
      lines.push(`גילוי: ${c.detection} ק"מ`);
    } else if (c.kind === 'threat') {
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
    state.threats.push({
      id: nextId++, key, x, y, sx: x, sy: y,
      tx: target.x, ty: target.y, status: 'inflight', hitBy: null, target: target.name
    });
  } else {
    state.defenses.push({
      id: nextId++, key, x, y,
      ammo: c.ammo, cd: 0
    });
  }
  if (state.budget) renderBudget();
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

function clearThreats() {
  state.threats = []; state.missiles = []; state.explosions = [];
  state.results = null; renderResults();
  setStatus('נוקו האיומים');
}

function resetAll() {
  state.defenses = []; state.threats = []; state.missiles = []; state.explosions = [];
  state.results = null; state.budget = null; state.challengeMode = null;
  state.mode = 'idle'; state.placeKey = null;
  hideBanner();
  refreshButtonStates(); renderResults();
  setStatus('המפה אופסה');
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
  drawBackground();
  drawCountry();
  drawTargets();
  drawCoverage();
  drawDefenses();
  drawThreatPaths();
  drawThreats();
  drawMissiles();
  drawExplosions();
  drawHUD();
}

function drawBackground() {
  // Sea
  const grad = ctx.createLinearGradient(0, 0, W, H);
  grad.addColorStop(0, '#0a1628');
  grad.addColorStop(1, '#050b18');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  // Grid
  ctx.strokeStyle = 'rgba(95, 168, 211, 0.04)';
  ctx.lineWidth = 1;
  for (let x = 0; x < W; x += 50) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
  }
  for (let y = 0; y < H; y += 50) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
  }

  // Red zone label
  ctx.fillStyle = 'rgba(220, 38, 38, 0.06)';
  ctx.fillRect(0, 0, 380, H);
  ctx.fillStyle = 'rgba(220, 38, 38, 0.4)';
  ctx.font = 'bold 14px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('שטח אדום (איומים)', 190, 30);
}

function drawCountry() {
  // Fictional country polygon (Taliaria)
  const land = [
    [430, 90], [560, 70], [690, 95], [820, 80], [930, 130],
    [1010, 200], [1060, 320], [1080, 450], [1040, 570], [960, 660],
    [840, 690], [710, 700], [580, 680], [470, 620], [410, 510],
    [380, 380], [400, 250], [420, 150]
  ];
  ctx.fillStyle = '#1a3148';
  ctx.strokeStyle = '#3a6b8c';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(land[0][0], land[0][1]);
  for (let i = 1; i < land.length; i++) ctx.lineTo(land[i][0], land[i][1]);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

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
  ctx.fillText('רפובליקת טליאריה', 720, 160);
  ctx.font = '12px sans-serif';
  ctx.fillStyle = 'rgba(95, 168, 211, 0.5)';
  ctx.fillText('TALIARIA', 720, 178);
}

function drawTargets() {
  ctx.textAlign = 'center';
  for (const t of TARGETS) {
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
    ctx.save();
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
    // label
    ctx.fillStyle = '#d6e0f0';
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(c.short, d.x, d.y + 24);
    if (c.kind === 'battery') {
      ctx.fillStyle = '#7e91a8';
      ctx.font = '9px sans-serif';
      ctx.fillText(`${d.ammo}/${c.ammo}`, d.x, d.y + 35);
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
    ctx.fillStyle = c.color;
    ctx.font = '9px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(c.short, t.x, t.y + 18);
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

function drawExplosions() {
  for (const e of state.explosions) {
    const a = 1 - e.t / e.dur;
    ctx.beginPath();
    ctx.arc(e.x, e.y, e.r * (1 + e.t / e.dur * 1.5), 0, Math.PI * 2);
    ctx.fillStyle = `rgba(251, 146, 60, ${a * 0.7})`;
    ctx.fill();
    ctx.beginPath();
    ctx.arc(e.x, e.y, e.r * (e.t / e.dur), 0, Math.PI * 2);
    ctx.fillStyle = `rgba(254, 240, 138, ${a})`;
    ctx.fill();
  }
}

function drawHUD() {
  if (state.mode === 'sim') {
    ctx.fillStyle = 'rgba(95, 168, 211, 0.9)';
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(`זמן סימולציה: ${state.simElapsed.toFixed(1)} שנ`, W - 12, 24);
  }
  if (state.budget) {
    ctx.fillStyle = 'rgba(251, 191, 36, 0.9)';
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText('אתגר הגנה פעיל', W - 12, 44);
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
  state.missiles = []; state.explosions = [];
  // reset threats and defenses
  for (const t of state.threats) {
    t.x = t.sx; t.y = t.sy; t.status = 'inflight'; t.hitBy = null;
  }
  for (const d of state.defenses) {
    const c = CATALOG[d.key];
    d.ammo = c.ammo; d.cd = 0;
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
      t.status = 'reached';
    } else {
      t.x += (dx / dist) * step;
      t.y += (dy / dist) * step;
    }
  }

  // 2. Cooldowns
  for (const d of state.defenses) if (d.cd > 0) d.cd -= dt;

  // 3. Engagement: each battery picks a threat to fire at
  for (const d of state.defenses) {
    const c = CATALOG[d.key];
    if (c.kind !== 'battery') continue;
    if (d.cd > 0 || d.ammo <= 0) continue;
    // detection: any radar (or own) sees the threat
    const target = pickEngagementTarget(d);
    if (target) fireMissile(d, target);
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
          state.explosions.push({ x: target.x, y: target.y, r: 18, t: 0, dur: 0.8 });
        } else {
          state.explosions.push({ x: m.x + (Math.random()-0.5)*10, y: m.y + (Math.random()-0.5)*10, r: 8, t: 0, dur: 0.4 });
        }
      }
    }
  }
  state.missiles = state.missiles.filter(m => m.t < m.dur + 0.1);

  // 5. Update explosions
  for (const e of state.explosions) e.t += dt;
  state.explosions = state.explosions.filter(e => e.t < e.dur);

  // 6. End condition
  const active = state.threats.filter(t => t.status === 'inflight');
  if (active.length === 0 && state.missiles.length === 0) {
    finishSim();
  }
}

function pickEngagementTarget(d) {
  const c = CATALOG[d.key];
  let best = null, bestScore = -Infinity;
  for (const t of state.threats) {
    if (t.status !== 'inflight') continue;
    if (alreadyEngaged(t)) continue;
    const tc = CATALOG[t.key];
    const dist = Math.hypot(t.x - d.x, t.y - d.y);
    if (dist < c.minRange || dist > c.maxRange) continue;
    if (tc.altitude < c.minAlt || tc.altitude > c.maxAlt) continue;
    if (!isDetected(t)) continue;
    // prefer threats closer to important targets
    const target = TARGETS.find(x => x.x === t.tx && x.y === t.ty);
    const value = target ? target.value : 1;
    const distToTarget = Math.hypot(t.tx - t.x, t.ty - t.y);
    const score = value * 100 - distToTarget * 0.1 - dist * 0.05;
    if (score > bestScore) { bestScore = score; best = t; }
  }
  return best;
}

function alreadyEngaged(t) {
  return state.missiles.some(m => m.threatId === t.id && !m.resolved);
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
  // intercept point: lead the target a bit
  const flightTime = Math.hypot(t.x - d.x, t.y - d.y) / 350; // 350 px/s missile
  const lx = Math.min(W, Math.max(0, t.x + (t.tx - t.sx) / Math.hypot(t.tx - t.sx, t.ty - t.sy) * tc.speed * flightTime));
  const ly = Math.min(H, Math.max(0, t.y + (t.ty - t.sy) / Math.hypot(t.tx - t.sx, t.ty - t.sy) * tc.speed * flightTime));
  const hit = Math.random() < (c.pHit[t.key] || 0.5);
  state.missiles.push({
    sx: d.x, sy: d.y, x: d.x, y: d.y,
    tx: lx, ty: ly, t: 0, dur: Math.max(0.6, flightTime),
    hit, threatId: t.id, battery: c.name, resolved: false
  });
}

function finishSim() {
  state.mode = 'idle';
  document.getElementById('simulate').style.display = '';
  document.getElementById('stop').style.display = 'none';
  computeResults();
  renderResults();

  // Banner for challenge modes
  if (state.challengeMode === 'defense-challenge' && state.results) {
    const score = state.results.protectedValue / state.results.totalValue;
    if (score >= 0.85) showBanner(`ניצחון! הגנת על ${(score*100).toFixed(0)}% מהערך האסטרטגי`, 'success');
    else if (score >= 0.5) showBanner(`הגנה חלקית: ${(score*100).toFixed(0)}% הצלחה`, '');
    else showBanner(`כשלון - רק ${(score*100).toFixed(0)}% מהיעדים הוגנו`, 'failure');
  } else if (state.challengeMode === 'auto-attack' && state.results) {
    const breachRate = state.results.survived / state.results.total;
    if (breachRate >= 0.5) showBanner(`התקפה הצליחה: ${state.results.survived} איומים פרצו`, 'failure');
    else showBanner(`הגנה החזיקה: ${state.results.killed}/${state.results.total} יורטו`, 'success');
  }
  setStatus('סימולציה הסתיימה');
}

function computeResults() {
  const total = state.threats.length;
  const killed = state.threats.filter(t => t.status === 'destroyed').length;
  const survived = total - killed;
  // strategic damage
  const reachedByTarget = {};
  let totalValue = TARGETS.reduce((s, t) => s + t.value, 0);
  let damagedValue = 0;
  for (const t of state.threats) {
    if (t.status === 'reached') {
      reachedByTarget[t.target] = (reachedByTarget[t.target] || 0) + 1;
      const tg = TARGETS.find(x => x.name === t.target);
      if (tg) damagedValue += tg.value;
    }
  }
  damagedValue = Math.min(damagedValue, totalValue);
  state.results = {
    total, killed, survived,
    byTarget: reachedByTarget,
    totalValue, protectedValue: totalValue - damagedValue,
    breakdown: state.threats.map(t => ({
      type: CATALOG[t.key].name,
      target: t.target,
      status: t.status,
      hitBy: t.hitBy
    }))
  };
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
    const txt = b.status === 'destroyed' ? `יורט ע"י ${b.hitBy || '-'}` : `הגיע ל${b.target}`;
    html += `<li class="${cls}"><span>${b.type} → ${b.target}</span><span>${txt}</span></li>`;
  }
  html += '</ul>';
  el.innerHTML = html;
}

// =============================================================
// תכנון התקפה אוטומטי
// =============================================================
function generateAutoAttack() {
  if (state.defenses.length === 0) {
    setStatus('הצב הגנה לפני יצירת התקפה אוטומטית');
    return;
  }
  state.threats = [];
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
    state.threats.push({
      id: nextId++, key, x: sx, y: sy, sx, sy,
      tx: tgt.x + (Math.random() - 0.5) * 20,
      ty: tgt.y + (Math.random() - 0.5) * 20,
      status: 'inflight', hitBy: null, target: tgt.name
    });
  }
  setStatus(`נוצרה התקפה: ${nThreats} איומים מכוונים לחלשות בהגנה`);
  showBanner('תכנית התקפה אוטומטית נוצרה - לחץ "הפעל סימולציה"', '');
}

// =============================================================
// אתגר הגנה
// =============================================================
function startDefenseChallenge() {
  resetAll();
  state.challengeMode = 'defense-challenge';
  // Generate randomized attack
  const attackSize = 14 + Math.floor(Math.random() * 6);
  for (let i = 0; i < attackSize; i++) {
    const r = Math.random();
    let key;
    if (r < 0.2) key = 'fighter';
    else if (r < 0.4) key = 'helicopter';
    else key = 'uav';
    const tgt = TARGETS[Math.floor(Math.random() * TARGETS.length)];
    let sx, sy;
    const fromNorth = Math.random() < 0.3;
    if (fromNorth) { sx = 150 + Math.random() * 700; sy = 20 + Math.random() * 50; }
    else           { sx = 20 + Math.random() * 250; sy = 100 + Math.random() * 550; }
    state.threats.push({
      id: nextId++, key, x: sx, y: sy, sx, sy,
      tx: tgt.x + (Math.random() - 0.5) * 30,
      ty: tgt.y + (Math.random() - 0.5) * 30,
      status: 'inflight', hitBy: null, target: tgt.name
    });
  }
  // Set defense budget
  state.budget = {
    ironDome: 3, sa8: 2, barak8: 2, patriot: 1, davidsSling: 1,
    longRadar: 1, medRadar: 2, shortRadar: 2
  };
  switchSide('blue');
  setStatus('אתגר הגנה: פרוס את האמצעים שהוקצו לך');
  showBanner('אתגר הגנה הופעל - פרוס הגנה במסגרת התקציב', '');
  renderBudget();
}

function renderBudget() {
  if (!state.budget) return;
  // Append budget info to button labels
  document.querySelectorAll('#battery-btns button, #radar-btns button').forEach(b => {
    const k = b.dataset.key;
    const used = state.defenses.filter(d => d.key === k).length;
    const max = state.budget[k] || 0;
    let badge = b.querySelector('.budget-badge');
    if (!badge) {
      badge = document.createElement('span');
      badge.className = 'budget-badge';
      badge.style.cssText = 'background:#fbbf24;color:#0a0e14;padding:1px 6px;border-radius:8px;font-size:10px;font-weight:700;margin-right:4px';
      b.appendChild(badge);
    }
    badge.textContent = `${used}/${max}`;
    b.style.opacity = used >= max ? '0.5' : '1';
  });
}

