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

[SEE_REPO_FILE]