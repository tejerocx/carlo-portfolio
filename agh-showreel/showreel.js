/* AGH German Pathway — 20s motion showreel.
 * Fully procedural, frame-accurate canvas animation.
 *   - Open index.html for a live preview (click to restart).
 *   - render.mjs drives window.renderFrame(t) headlessly to export the MP4.
 */
(() => {
'use strict';

const W = 1920, H = 1080, DUR = 20;
const C = {
  navy: '#0A1631', ink: '#03132C', deep: '#040A1A',
  gold: '#FDB000', goldDk: '#B87E00', red: '#E7141E',
  sky: '#8FB0FB', skyLt: '#E0EAFA', grey: '#7C7C7C', blue: '#1E6CFF',
  paper: '#F7F8FB', white: '#FFFFFF',
};

// ------------------------------------------------------------ canvases
const out = document.getElementById('c');
const octx = out.getContext('2d');
const mk = () => { const c = document.createElement('canvas'); c.width = W; c.height = H; return c; };
const work = mk(), ctx = work.getContext('2d');
const layer = mk(), lctx = layer.getContext('2d');

// ------------------------------------------------------------ math
const clamp = (x, a = 0, b = 1) => x < a ? a : x > b ? b : x;
const lerp = (a, b, t) => a + (b - a) * t;
const P = (t, a, b) => clamp((t - a) / (b - a));
const TAU = Math.PI * 2, D2R = Math.PI / 180;
const E = {
  outCubic: x => 1 - Math.pow(1 - x, 3),
  inCubic: x => x * x * x,
  inOutCubic: x => x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2,
  outQuart: x => 1 - Math.pow(1 - x, 4),
  outExpo: x => x >= 1 ? 1 : 1 - Math.pow(2, -10 * x),
  inExpo: x => x <= 0 ? 0 : Math.pow(2, 10 * x - 10),
  inOutExpo: x => x <= 0 ? 0 : x >= 1 ? 1 : x < .5 ? Math.pow(2, 20 * x - 10) / 2 : (2 - Math.pow(2, -20 * x + 10)) / 2,
  outBack: (x, s = 1.70158) => 1 + (s + 1) * Math.pow(x - 1, 3) + s * Math.pow(x - 1, 2),
  inBack: (x, s = 1.70158) => (s + 1) * x * x * x - s * x * x,
};
// damped spring, dt in seconds since trigger
const spring = (dt, k = 7, w = 17) => dt <= 0 ? 0 : 1 - Math.exp(-k * dt) * Math.cos(w * dt);
function rng(seed) {
  return () => {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
const hash = (a, b = 0) => { const r = rng(a * 9973 + b * 7919 + 17); r(); return r(); };
const rgba = (hex, a) => {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${n >> 16 & 255},${n >> 8 & 255},${n & 255},${a})`;
};

// ------------------------------------------------------------ type
const F = {
  arch: s => `${s}px 'Archivo Black'`,
  mont: (s, w = 800) => `${w} ${s}px 'Montserrat'`,
  mono: (s, w = 600) => `${w} ${s}px 'JetBrains Mono'`,
};
const posCache = new Map();
function charPos(c, str, f, tr = 0) {
  const k = f + '|' + str + '|' + tr;
  let v = posCache.get(k);
  if (v) return v;
  c.save(); c.font = f; c.letterSpacing = tr + 'px';
  const xs = [];
  for (let i = 0; i < str.length; i++) {
    xs.push(c.measureText(str.slice(0, i + 1)).width - c.measureText(str[i]).width);
  }
  const m = c.measureText(str);
  v = { xs, total: m.width - tr, asc: m.actualBoundingBoxAscent };
  c.restore(); posCache.set(k, v);
  return v;
}
const capH = {}; // cap-height per family at 100px
function cap(fam, size) { return capH[fam] * size / 100; }

/** Letters rise through a mask, optionally exit upward. */
function riseText(c, str, x, y, size, f, color, t, t0, o = {}) {
  const { stagger = .03, dur = .55, align = 'left', tr = 0, exit = null, ease = E.outExpo,
    colors = null, mask = true, glow = 0, alpha = 1 } = o;
  if (t < t0) return;
  const { xs, total } = charPos(c, str, f, tr);
  const x0 = align === 'center' ? x - total / 2 : align === 'right' ? x - total : x;
  c.save();
  c.font = f; c.letterSpacing = '0px'; c.textBaseline = 'alphabetic'; c.globalAlpha *= alpha;
  if (mask) { c.beginPath(); c.rect(x0 - size, y - size * 1.02, total + size * 2, size * 1.3); c.clip(); }
  if (glow) { c.shadowColor = rgba(colors ? colors[colors.length - 1] : color, .55); c.shadowBlur = glow; }
  for (let i = 0; i < str.length; i++) {
    const ch = str[i];
    if (ch === ' ') continue;
    const s = t0 + i * stagger;
    let dy = (1 - ease(P(t, s, s + dur))) * size * 1.15;
    if (exit) {
      const e0 = exit[0] + i * stagger * .5;
      dy -= E.inExpo(P(t, e0, e0 + exit[1])) * size * 1.15;
    }
    c.fillStyle = colors ? (colors[i] || color) : color;
    c.fillText(ch, x0 + xs[i], y + dy);
  }
  c.restore();
}

/** Mono "decode" label — characters scramble then lock in. */
const GLYPHS = 'ABCDEFGHJKLMNPQRSTUVWXYZ0123456789/#%&+=<>';
function decodeText(c, str, x, y, f, color, t, t0, o = {}) {
  const { dur = .6, align = 'left', tr = 3, alpha = 1, exit = null } = o;
  if (t < t0) return;
  let a = alpha;
  if (exit) a *= 1 - P(t, exit, exit + .25);
  if (a <= 0) return;
  const n = str.length, p = P(t, t0, t0 + dur);
  const frame = Math.floor(t * 30);
  let s = '';
  for (let i = 0; i < n; i++) {
    const appear = i / n * .55, lock = appear + .45;
    if (p < appear) s += ' ';
    else if (p < lock && str[i] !== ' ') s += GLYPHS[Math.floor(hash(i, frame) * GLYPHS.length)];
    else s += str[i];
  }
  c.save(); c.font = f; c.letterSpacing = tr + 'px'; c.fillStyle = color; c.globalAlpha *= a;
  c.textAlign = align; c.fillText(s.replace(/\s+$/, ''), x, y);
  c.restore();
}

/** Colored block wipes over the area, content appears beneath, block wipes off. */
function blockReveal(c, t, t0, x, y, w, h, color, draw, dur = .26) {
  const a = E.inOutExpo(P(t, t0, t0 + dur));
  const b = E.inOutExpo(P(t, t0 + dur + .04, t0 + dur * 2 + .04));
  if (t >= t0 + dur) draw();
  if (a > 0 && b < 1) { c.fillStyle = color; c.fillRect(x + w * b, y, w * (a - b), h); }
}

// ------------------------------------------------------------ shared fx
const impacts = [[.5, 3], [1.0, 3], [1.5, 3], [2.0, 10], [6.12, 4], [15.42, 11], [18.62, 3]];
function shake(t) {
  let x = 0, y = 0;
  for (const [ti, a] of impacts) {
    const d = t - ti;
    if (d < 0 || d > .6) continue;
    const env = a * Math.exp(-d * 11);
    x += env * Math.sin(d * 83 + ti * 7);
    y += env * Math.cos(d * 71 + ti * 3);
  }
  return [x, y];
}

const DUST = (() => { const r = rng(7); return Array.from({ length: 140 }, () => ({ x: r(), y: r(), z: r(), ph: r() * TAU, g: r() < .35 })); })();
function dust(c, t, a = 1) {
  c.save();
  for (const p of DUST) {
    const z = .25 + p.z * .75;
    const x = ((p.x * W + Math.sin(t * .4 + p.ph) * 40 * z + t * 14 * z) % (W + 40) + W + 40) % (W + 40) - 20;
    const y = ((p.y * H - t * 26 * z) % H + H) % H;
    c.globalAlpha = a * (.08 + .32 * z) * (.6 + .4 * Math.sin(t * 2 + p.ph));
    c.fillStyle = p.g ? C.gold : '#BFD0FF';
    c.beginPath(); c.arc(x, y, .6 + 1.8 * z, 0, TAU); c.fill();
  }
  c.restore();
}

function darkBg(c, cx = W / 2, cy = H / 2) {
  const g = c.createRadialGradient(cx, cy, 0, cx, cy, 1250);
  g.addColorStop(0, '#13234A'); g.addColorStop(.55, '#0A1631'); g.addColorStop(1, '#03081A');
  c.fillStyle = g; c.fillRect(-60, -60, W + 120, H + 120);
}
function vignette(c, a = .55) {
  const g = c.createRadialGradient(W / 2, H / 2, H * .35, W / 2, H / 2, H * 1.05);
  g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, `rgba(0,0,0,${a})`);
  c.fillStyle = g; c.fillRect(-60, -60, W + 120, H + 120);
}
function paperBg(c, t, gridA = 1) {
  c.fillStyle = C.paper; c.fillRect(-60, -60, W + 120, H + 120);
  const s = 44, off = (t * 8) % s;
  c.fillStyle = rgba(C.navy, .085 * gridA);
  c.beginPath();
  for (let y = -s + off * .5; y < H + s; y += s) for (let x = -s + off; x < W + s; x += s) c.rect(x - 1.3, y - 1.3, 2.6, 2.6);
  c.fill();
}

// ------------------------------------------------------------ logo geometry (source art space 1254 x 1254)
const G = {
  navyL: [[525, 155], [505, 200], [484, 250], [462, 300], [439, 350], [415, 400], [389, 450], [360, 500], [329, 550], [293, 600], [263, 638]],
  navyR: [[325, 690], [352, 650], [386, 600], [417, 550], [445, 500], [471, 450], [495, 400], [518, 350], [539, 300], [559, 250], [578, 200], [598, 150], [607, 128]],
  goldL: [[615, 148], [599, 200], [581, 250], [563, 300], [551, 350], [538, 400], [525, 450], [510, 500], [493, 550], [475, 600], [454, 650], [440, 680], [430, 700], [422, 728]],
  goldR: [[422, 728], [433, 718], [447, 700], [461, 680], [479, 650], [509, 600], [535, 550], [559, 500], [582, 450], [603, 400], [623, 350], [643, 300], [661, 250], [679, 200], [697, 150], [705, 128]],
  skyAL: [[550, 330], [544, 350], [523, 400], [500, 450], [475, 500], [448, 550], [418, 600], [384, 650], [362, 680], [346, 700], [328, 722]],
  skyBL: [[623, 404], [607, 450], [587, 500], [565, 550], [541, 600], [514, 650], [496, 680], [484, 700], [470, 720], [457, 740], [445, 752]],
  skyBR: [[510, 772], [514, 760], [523, 740], [531, 720], [539, 700], [547, 680], [557, 650], [573, 600], [587, 550], [601, 500], [613, 450], [624, 407]],
  redR: [[692, 205], [718, 250], [745, 300], [773, 350], [785, 372], [777, 400], [735, 510], [701, 600], [682, 650], [671, 680], [663, 700], [651, 720], [641, 740], [635, 755]],
  redL: [[552, 715], [560, 700], [568, 680], [582, 650], [602, 600], [619, 550], [634, 500], [648, 450], [660, 400], [670, 350], [680, 300], [688, 250], [692, 205]],
  plane: [[865, 280], [990, 246], [966, 289], [1001, 323], [950, 316], [898, 327], [931, 291]],
  center: [626, 632],
};

function smoothLine(c, pts, move) {
  if (move) c.moveTo(pts[0][0], pts[0][1]); else c.lineTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length - 1; i++) {
    const [x, y] = pts[i], [nx, ny] = pts[i + 1];
    c.quadraticCurveTo(x, y, (x + nx) / 2, (y + ny) / 2);
  }
  const l = pts[pts.length - 1]; c.lineTo(l[0], l[1]);
}
const rev = a => a.slice().reverse();
function pathNavy(c) { c.beginPath(); smoothLine(c, G.navyL, true); smoothLine(c, G.navyR); c.closePath(); }
function pathGold(c) { c.beginPath(); smoothLine(c, G.goldL, true); smoothLine(c, G.goldR); c.closePath(); }
function pathSkyA(c) { c.beginPath(); smoothLine(c, G.skyAL, true); c.lineTo(402, 756); smoothLine(c, rev(G.goldL).slice(0, -1)); c.closePath(); }
function pathSkyB(c) { c.beginPath(); smoothLine(c, G.skyBL, true); smoothLine(c, G.skyBR); c.closePath(); }
function pathRed(c) { c.beginPath(); c.moveTo(...G.redR[0]); for (const p of G.redR.slice(1)) c.lineTo(...p); smoothLine(c, G.redL); c.closePath(); }

/** Reveal a stripe growing from point B toward T. */
function growClip(c, B, T, p) {
  const ang = Math.atan2(T[1] - B[1], T[0] - B[0]);
  const len = Math.hypot(T[0] - B[0], T[1] - B[1]);
  c.translate(B[0], B[1]); c.rotate(ang);
  c.beginPath(); c.rect(-200, -400, 200 + len * p * 1.15, 800);
  c.rotate(-ang); c.translate(-B[0], -B[1]);
  c.clip();
}

function drawBuilding(c, t, t0, color = C.ink, outline = true) {
  // t0: build start. Pass t = Infinity for the finished state.
  const base = E.outExpo(P(t, t0, t0 + .4));
  const ent = P(t, t0 + .3, t0 + .75), ped = P(t, t0 + .42, t0 + .9), chim = t - (t0 + .62);
  if (outline) { c.strokeStyle = C.paper; c.lineWidth = 7; c.lineJoin = 'round'; }
  const part = fn => { if (outline) { fn(); c.stroke(); } fn(); c.fill(); };
  c.fillStyle = color;
  if (base > 0) part(() => { c.beginPath(); c.roundRect(800 - 132.5 * base, 683, 265 * base, 30, 6); });
  [700, 755, 810, 866].forEach((x, i) => {
    const s = E.outBack(P(t, t0 + .12 + i * .05, t0 + .5 + i * .05), 2.2);
    if (s <= 0) return;
    const h = 131 * s;
    part(() => { c.beginPath(); c.rect(x, 684 - h, 30, h); });
  });
  if (ent > 0) {
    const y = -70 * (1 - E.outBack(ent, 2.4));
    c.save(); c.globalAlpha *= clamp(ent * 4); c.translate(0, y);
    part(() => { c.beginPath(); c.roundRect(676, 511, 246, 42, 5); });
    c.restore();
  }
  if (ped > 0) {
    const y = -110 * (1 - E.outBack(ped, 2.6));
    c.save(); c.globalAlpha *= clamp(ped * 4); c.translate(0, y);
    part(() => { c.beginPath(); c.moveTo(680, 508); c.lineTo(800, 451); c.lineTo(920, 508); c.closePath(); });
    c.restore();
  }
  if (chim > 0) {
    const s = clamp(spring(chim, 9, 20), 0, 1.3);
    c.save(); c.translate(801, 462); c.scale(1, s); c.translate(-801, -462);
    part(() => { c.beginPath(); c.rect(786, 424, 30, 38); });
    c.restore();
  }
}

function planePath(c) { c.beginPath(); c.moveTo(...G.plane[0]); for (const p of G.plane.slice(1)) c.lineTo(...p); c.closePath(); }
const PLANE_C = [940, 292], PLANE_HEAD = Math.atan2(246 - 300, 990 - 900);
/** Draw the brand plane centred at (x,y), heading `ang`, ~`w` px wide. */
function drawPlane(c, x, y, ang, w, color = C.ink) {
  c.save(); c.translate(x, y); c.rotate(ang - PLANE_HEAD); const s = w / 136; c.scale(s, s);
  c.translate(-PLANE_C[0], -PLANE_C[1]); c.fillStyle = color; planePath(c); c.fill(); c.restore();
}
function speedLines(c, p, color = C.blue) {
  const lines = [[[868, 292], [914, 294]], [[850, 302], [910, 300]], [[836, 322], [905, 303]], [[864, 326], [896, 312]]];
  c.save(); c.strokeStyle = color; c.lineWidth = 4; c.lineCap = 'round';
  lines.forEach(([a, b], i) => {
    const q = E.outExpo(P(p, i * .12, .6 + i * .12));
    const r = E.inCubic(P(p, 1.2 + i * .1, 1.7 + i * .1)) * 0; // keep lines (logo element)
    if (q <= 0) return;
    c.beginPath();
    c.moveTo(lerp(b[0], a[0], q), lerp(b[1], a[1], q)); c.lineTo(b[0] - (b[0] - a[0]) * r, b[1] - (b[1] - a[1]) * r);
    c.stroke();
  });
  c.restore();
}

// AGH + wordmark metrics are fitted to the source art in init()
const AGH = { A: [260, 225], G: [509, 216], H: [772, 199] };
let aghSize = 280, gpSize = 72, gpTr = 0;

// ------------------------------------------------------------ globe
const DOTS = (window.GLOBE_DOTS || []).map(([la, lo, de]) => {
  const p = la * D2R, l = lo * D2R;
  return [Math.cos(p) * Math.sin(l), Math.sin(p), Math.cos(p) * Math.cos(l), de];
});
const DEDOTS = (window.DE_DOTS || []).map(([la, lo]) => {
  const p = la * D2R, l = lo * D2R;
  return [Math.cos(p) * Math.sin(l), Math.sin(p), Math.cos(p) * Math.cos(l)];
});
const v3 = (la, lo) => { const p = la * D2R, l = lo * D2R; return [Math.cos(p) * Math.sin(l), Math.sin(p), Math.cos(p) * Math.cos(l)]; };
const DE = v3(51.2, 10.4);
const ORIGINS = [[14.6, 121.0], [19.1, 72.9], [6.5, 3.4], [-23.5, -46.6], [30.0, 31.2], [-6.2, 106.8], [40.7, -74.0], [-1.3, 36.8], [35.7, 139.7], [19.4, -99.1]]
  .map(([a, b]) => v3(a, b));

function globeState(t) {
  const k = E.inOutCubic(P(t, 5.6, 9.1));
  return {
    lon: lerp(78, 14, k) * D2R, lat: lerp(8, 38, k) * D2R,
    R: 410 * lerp(.82, 1, E.outExpo(P(t, 5.55, 6.9))), cx: 1290, cy: 560,
  };
}
function rot(g, v) {
  const cl = Math.cos(g.lon), sl = Math.sin(g.lon), ca = Math.cos(g.lat), sa = Math.sin(g.lat);
  const x = v[0] * cl - v[2] * sl, z1 = v[0] * sl + v[2] * cl;
  return [x, v[1] * ca - z1 * sa, v[1] * sa + z1 * ca];
}
const scr = (g, r) => [g.cx + r[0] * g.R, g.cy - r[1] * g.R];
function slerp(a, b, s) {
  const d = clamp(a[0] * b[0] + a[1] * b[1] + a[2] * b[2], -1, 1), om = Math.acos(d), so = Math.sin(om);
  const k0 = Math.sin((1 - s) * om) / so, k1 = Math.sin(s * om) / so;
  return [a[0] * k0 + b[0] * k1, a[1] * k0 + b[1] * k1, a[2] * k0 + b[2] * k1];
}
const arcLaunch = i => 6.15 + i * .16, ARC_DUR = 1.1;

// ------------------------------------------------------------ HUD
const SCENES = [[0, '01  INTRO'], [2.95, '02  VISION'], [6.0, '03  GLOBAL'], [10.0, '04  PATHWAY'], [13.7, '05  IDENTITY']];
function hud(c, t, dark) {
  const a = P(t, .15, .6) * (1 - P(t, 18.05, 18.45));
  if (a <= 0) return;
  const col = dark ? '255,255,255' : '10,22,49';
  c.save(); c.globalAlpha *= a;
  c.strokeStyle = `rgba(${col},.45)`; c.lineWidth = 2;
  const m = 46, L = 24;
  for (const [x, y, sx, sy] of [[m, m, 1, 1], [W - m, m, -1, 1], [m, H - m, 1, -1], [W - m, H - m, -1, -1]]) {
    c.beginPath(); c.moveTo(x, y + sy * L); c.lineTo(x, y); c.lineTo(x + sx * L, y); c.stroke();
  }
  c.font = F.mono(14, 600); c.letterSpacing = '3px'; c.fillStyle = `rgba(${col},.6)`;
  c.fillText('AGH / GERMAN PATHWAY', 92, 88);
  c.textAlign = 'right'; c.fillText('SHOWREEL  2026', W - 92, 88);
  let label = SCENES[0][1]; for (const [s, l] of SCENES) if (t >= s) label = l;
  c.fillText(label, W - 92, H - 80);
  c.textAlign = 'left';
  const fr = Math.floor(t * 60), ss = Math.floor(fr / 60), ff = fr % 60;
  c.fillText(`TC 00:00:${String(ss).padStart(2, '0')}:${String(ff).padStart(2, '0')}`, 92, H - 80);
  // mini brand progress bar
  c.fillStyle = `rgba(${col},.15)`; c.beginPath(); c.roundRect(W - 92 - 180, H - 112, 180, 5, 3); c.fill();
  c.fillStyle = C.gold; c.beginPath(); c.roundRect(W - 92 - 180, H - 112, 180 * t / DUR, 5, 3); c.fill();
  c.restore();
}

// ============================================================ SCENE 1 — cold open
const S1_WORDS = [['EVERY', .42, .84], ['JOURNEY', .92, 1.34], ['NEEDS A', 1.42, 1.84], ['PATHWAY.', 1.92, null]];
function scene1(c, t) {
  darkBg(c);
  // impact bloom
  const fl = Math.exp(-Math.max(0, t - 2.0) * 4) * (t > 2.0 ? 1 : 0);
  if (fl > .01) {
    const g = c.createRadialGradient(W / 2, 560, 0, W / 2, 560, 900);
    g.addColorStop(0, rgba(C.gold, .32 * fl)); g.addColorStop(1, rgba(C.gold, 0));
    c.fillStyle = g; c.fillRect(0, 0, W, H);
  }
  dust(c, t, P(t, 0, .6));
  c.save();
  const z = 1 + .07 * E.inOutCubic(P(t, 0, 3));
  c.translate(W / 2, H / 2); c.scale(z, z); c.translate(-W / 2, -H / 2);

  // opening spark → track line
  const sp = P(t, 0, .25);
  if (t < .5) {
    c.save(); c.globalAlpha = (1 - P(t, .2, .45));
    const r = 4 + 30 * E.outExpo(sp);
    const g = c.createRadialGradient(W / 2, 690, 0, W / 2, 690, r * 3);
    g.addColorStop(0, rgba(C.gold, .9)); g.addColorStop(1, rgba(C.gold, 0));
    c.fillStyle = g; c.beginPath(); c.arc(W / 2, 690, r * 3, 0, TAU); c.fill(); c.restore();
  }
  const lw = 960, ly = 690, a = E.outExpo(P(t, .08, .95));
  c.fillStyle = 'rgba(255,255,255,.16)';
  c.beginPath(); c.roundRect(W / 2 - lw / 2 * a, ly - 3, lw * a, 6, 3); c.fill();
  // tick marks along the track
  for (let i = 0; i <= 8; i++) {
    const x = W / 2 - lw / 2 + lw * i / 8, q = P(t, .3 + Math.abs(i - 4) * .05, .5 + Math.abs(i - 4) * .05);
    c.fillStyle = `rgba(255,255,255,${.35 * q})`; c.fillRect(x - 1, ly + 14, 2, 10 * q);
  }
  const f = E.inOutCubic(P(t, 1.92, 2.7));
  if (f > 0) {
    c.save(); c.shadowColor = C.gold; c.shadowBlur = 24; c.fillStyle = C.gold;
    c.beginPath(); c.roundRect(W / 2 - lw / 2, ly - 3, lw * f, 6, 3); c.fill();
    const hx = W / 2 - lw / 2 + lw * f;
    const g = c.createRadialGradient(hx, ly, 0, hx, ly, 40);
    g.addColorStop(0, 'rgba(255,255,255,.9)'); g.addColorStop(.3, rgba(C.gold, .6)); g.addColorStop(1, rgba(C.gold, 0));
    c.shadowBlur = 0; c.fillStyle = g; c.beginPath(); c.arc(hx, ly, 40, 0, TAU); c.fill();
    c.restore();
  }

  // kinetic words
  for (const [w, t0, ex] of S1_WORDS) {
    if (t < t0 || (ex && t > ex + .4)) continue;
    const punch = 1 + .1 * (1 - E.outExpo(P(t, t0 + .05, t0 + .7)));
    c.save(); c.translate(W / 2, 560); c.scale(punch, punch); c.translate(-W / 2, -560);
    const gold = w === 'PATHWAY.';
    riseText(c, w, W / 2, 620, 200, F.arch(200), gold ? C.gold : C.white, t, t0,
      { align: 'center', stagger: .025, dur: .45, exit: ex ? [ex, .16] : null, glow: gold ? 40 : 0 });
    c.restore();
  }
  decodeText(c, 'DEIN WEG NACH DEUTSCHLAND', W / 2, 770, F.mono(18, 600), 'rgba(255,255,255,.55)', t, .55, { align: 'center', tr: 9, dur: .9 });
  c.restore();
  vignette(c, .6);
  hud(c, t, true);
}

// ============================================================ transitions
/** Skewed brand ribbons sweep left→right; last band reveals `next`. */
function ribbonWipe(c, t, t0, colors, next) {
  const sk = 560;
  const edge = k => lerp(-sk, W + sk, E.inOutExpo(P(t, t0 + k * .075, t0 + .55 + k * .075)));
  const poly = e => { c.beginPath(); c.moveTo(-sk - 60, -10); c.lineTo(e + sk / 2, -10); c.lineTo(e - sk / 2, H + 10); c.lineTo(-sk - 60, H + 10); c.closePath(); };
  colors.forEach((col, k) => { const e = edge(k); if (e <= -sk) return; c.fillStyle = col; poly(e); c.fill(); });
  const e = edge(colors.length);
  if (e > -sk) { c.save(); poly(e); c.clip(); next(); c.restore(); }
}
function iris(c, x, y, r, next, ring = C.gold) {
  if (r <= 0) return;
  c.save(); c.beginPath(); c.arc(x, y, r, 0, TAU); c.clip(); next(); c.restore();
  c.save(); c.strokeStyle = ring; c.lineWidth = 10; c.globalAlpha = .9;
  c.beginPath(); c.arc(x, y, r + 14, 0, TAU); c.stroke();
  c.lineWidth = 2; c.globalAlpha = .5; c.beginPath(); c.arc(x, y, r * 1.08 + 40, 0, TAU); c.stroke(); c.restore();
}

// ============================================================ SCENE 2 — study / work / live
const S2_ROWS = [['STUDY', '.', 400, 3.0, C.gold, C.gold], ['WORK', '.', 600, 3.5, C.red, C.red], ['LIVE', '.', 800, 4.0, C.navy, C.gold]];
const SHARDS = [[1010, 220, C.gold, 1], [1560, 930, C.red, .8], [1880, 890, C.navy, .6], [960, 960, C.sky, .9], [1370, 170, C.red, .5], [1800, 1010, C.gold, .45], [1290, 900, C.sky, .4]];
let liveDot = [700, 780];
function scene2(c, t) {
  paperBg(c, t);
  const g = c.createRadialGradient(1500, 280, 0, 1500, 280, 800);
  g.addColorStop(0, rgba(C.gold, .14)); g.addColorStop(1, rgba(C.gold, 0));
  c.fillStyle = g; c.fillRect(0, 0, W, H);
  c.save();
  const z = 1 + .035 * P(t, 2.6, 6.2);
  c.translate(W / 2, H / 2); c.scale(z, z); c.translate(-W / 2 - 20 * P(t, 2.6, 6.2), -H / 2);

  c.save(); c.font = F.arch(330); c.letterSpacing = '10px'; c.strokeStyle = rgba(C.navy, .07); c.lineWidth = 2;
  c.strokeText('DEUTSCHLAND', 80 - (t - 2.5) * 110, 1050); c.restore();

  // shards
  SHARDS.forEach(([x, y, col, d], i) => {
    const s = clamp(spring(t - (3.05 + i * .08), 8, 16), 0, 1.25);
    if (s <= 0) return;
    c.save(); c.translate(x - (t - 3) * 40 * d, y + Math.sin(t * 1.6 + i) * 10 * d);
    c.rotate(-.45 + Math.sin(t * .8 + i) * .15); c.scale(s * d, s * d);
    c.fillStyle = col; c.beginPath(); c.moveTo(-20, 60); c.lineTo(10, -60); c.lineTo(40, -60); c.lineTo(10, 60); c.closePath(); c.fill();
    c.restore();
  });

  // STUDY. WORK. LIVE.
  const sz = 180, ch = cap('arch', sz);
  for (const [w, dot, y, t0, block, dotCol] of S2_ROWS) {
    const str = w + dot, { total } = charPos(c, str, F.arch(sz));
    blockReveal(c, t, t0 - .26, 166, y - ch - 18, total + 14, ch + 36, block, () => {
      const pop = 1 + .04 * (1 - E.outExpo(P(t, t0, t0 + .5)));
      c.save(); c.translate(170, y); c.scale(pop, pop);
      c.font = F.arch(sz); c.fillStyle = C.navy; c.fillText(w, 0, 0);
      c.fillStyle = dotCol; c.fillText(dot, charPos(c, str, F.arch(sz)).xs[w.length], 0);
      c.restore();
    });
    // row index
    decodeText(c, '0' + (S2_ROWS.findIndex(r => r[0] === w) + 1), 120, y - ch + 18, F.mono(16, 700), C.goldDk, t, t0, { align: 'right', tr: 2, dur: .3 });
  }

  // right column
  decodeText(c, '> DEINE ZUKUNFT. DEIN WEG.', 1100, 470, F.mono(22, 600), C.goldDk, t, 4.3, { tr: 4, dur: .7 });
  riseText(c, 'IN', 1100, 570, 64, F.mont(64, 800), C.navy, t, 4.45, { dur: .5 });
  riseText(c, 'GERMANY', 1100, 700, 130, F.arch(130), C.navy, t, 4.55, { stagger: .035, dur: .55 });
  const ul = charPos(c, 'GERMANY', F.arch(130)).total;
  [C.navy, C.red, C.gold].forEach((col, i) => {
    const q = E.inOutExpo(P(t, 4.8 + i * .1, 5.15 + i * .1));
    if (q <= 0) return;
    c.fillStyle = col; c.fillRect(1100 + ul / 3 * i, 732, ul / 3 * q, 12);
  });

  // rotating badge
  const bs = clamp(spring(t - 3.25, 7, 14), 0, 1.2);
  if (bs > 0) {
    c.save(); c.translate(1660, 250); c.scale(bs, bs);
    c.fillStyle = C.navy; c.beginPath(); c.arc(0, 0, 98, 0, TAU); c.fill();
    c.rotate(t * .7);
    const txt = 'AGH • GERMAN PATHWAY • STUDY • WORK • LIVE • ';
    c.font = F.mono(13, 700); c.fillStyle = C.white; c.textAlign = 'center';
    for (let i = 0; i < txt.length; i++) {
      c.save(); c.rotate(i / txt.length * TAU); c.fillText(txt[i], 0, -76); c.restore();
    }
    c.restore();
    c.save(); c.translate(1660, 250); c.scale(bs, bs);
    c.strokeStyle = rgba(C.gold, .9); c.lineWidth = 2; c.beginPath(); c.arc(0, 0, 56, 0, TAU); c.stroke();
    drawPlane(c, 2, 2, -.35 + Math.sin(t * 3) * .08, 66, C.gold);
    c.restore();
  }
  c.restore();
  // keep iris origin in screen space (matches camera above)
  const sx = z, ox = -W / 2 - 20 * P(t, 2.6, 6.2);
  const { xs } = charPos(c, 'LIVE.', F.arch(sz));
  const lx = 170 + xs[4] + 22, ly = 800 - 18;
  liveDot = [W / 2 + (lx + ox) * sx, H / 2 + (ly - H / 2) * sx];
  hud(c, t, false);
}

// ============================================================ SCENE 3 — globe
function scene3(c, t) {
  darkBg(c, 1290, 560);
  dust(c, t, .7);
  const g = globeState(t);
  const dez = rot(g, DE), deS = scr(g, dez);
  const Z = Math.exp(Math.log(30) * E.inCubic(P(t, 9.15, 10.3)));
  c.save();
  c.translate(deS[0], deS[1]); c.scale(Z, Z); c.translate(-deS[0], -deS[1]);

  // atmosphere + body
  const at = c.createRadialGradient(g.cx, g.cy, g.R * .92, g.cx, g.cy, g.R * 1.32);
  at.addColorStop(0, rgba(C.sky, .30)); at.addColorStop(1, rgba(C.sky, 0));
  c.fillStyle = at; c.beginPath(); c.arc(g.cx, g.cy, g.R * 1.32, 0, TAU); c.fill();
  const bd = c.createRadialGradient(g.cx - g.R * .35, g.cy - g.R * .4, 0, g.cx, g.cy, g.R);
  bd.addColorStop(0, '#1A3266'); bd.addColorStop(1, '#060F26');
  c.fillStyle = bd; c.beginPath(); c.arc(g.cx, g.cy, g.R, 0, TAU); c.fill();

  // graticule
  c.strokeStyle = rgba(C.sky, .09); c.lineWidth = 1;
  const line = pts => { c.beginPath(); let on = false; for (const v of pts) { const r = rot(g, v); if (r[2] > 0) { const s = scr(g, r); on ? c.lineTo(s[0], s[1]) : c.moveTo(s[0], s[1]); on = true; } else on = false; } c.stroke(); };
  for (let lo = -180; lo < 180; lo += 30) line(Array.from({ length: 46 }, (_, i) => v3(-90 + i * 4, lo)));
  for (let la = -60; la <= 60; la += 30) line(Array.from({ length: 91 }, (_, i) => v3(la, -180 + i * 4)));

  // land dots (bucketed by depth)
  const dr = 2.0 * g.R / 410, buckets = [[], [], [], []];
  for (const d of DOTS) {
    const r = rot(g, d);
    if (r[2] <= 0) continue;
    buckets[Math.min(3, (r[2] * 4) | 0)].push(r);
  }
  buckets.forEach((b, i) => {
    c.fillStyle = rgba('#A9C2FF', .18 + i * .2); c.beginPath();
    for (const r of b) { const x = g.cx + r[0] * g.R, y = g.cy - r[1] * g.R; c.moveTo(x + dr, y); c.arc(x, y, dr * (.7 + r[2] * .4), 0, TAU); }
    c.fill();
  });
  // Germany lights up
  const hl = P(t, 7.4, 8.3);
  if (hl > 0) {
    c.save(); c.fillStyle = C.gold; c.shadowColor = C.gold; c.shadowBlur = 12;
    c.globalAlpha = hl * (.85 + .15 * Math.sin(t * 10));
    c.beginPath();
    for (const d of DEDOTS) { const r = rot(g, d); if (r[2] <= 0) continue; const s = scr(g, r); c.moveTo(s[0] + 1.6, s[1]); c.arc(s[0], s[1], 1.6, 0, TAU); }
    c.fill(); c.restore();
  }
  c.strokeStyle = rgba(C.sky, .35); c.lineWidth = 1.5; c.beginPath(); c.arc(g.cx, g.cy, g.R, 0, TAU); c.stroke();

  // flight arcs
  ORIGINS.forEach((o, i) => {
    const t0 = arcLaunch(i), head = E.inOutCubic(P(t, t0, t0 + ARC_DUR));
    if (head <= 0) return;
    const ang = Math.acos(clamp(o[0] * DE[0] + o[1] * DE[1] + o[2] * DE[2], -1, 1));
    const lift = .05 + .24 * ang / Math.PI;
    const N = 70, pts = [];
    for (let k = 0; k <= N; k++) {
      const s = k / N * head, v = slerp(o, DE, s), h = 1 + lift * Math.sin(Math.PI * s);
      const r = rot(g, [v[0] * h, v[1] * h, v[2] * h]);
      const vis = r[2] > 0 || r[0] * r[0] + r[1] * r[1] > 1;
      pts.push([...scr(g, r), vis]);
    }
    // persistent faint trail + bright comet
    c.lineCap = 'round';
    for (let k = 1; k <= N; k++) {
      const a = pts[k - 1], b = pts[k];
      if (!a[2] || !b[2]) continue;
      const q = k / N, tail = Math.pow(q, 2.2);
      c.strokeStyle = rgba(C.gold, .22 + .7 * tail * (head < 1 ? 1 : 1 - P(t, t0 + ARC_DUR, t0 + ARC_DUR + .5)));
      c.lineWidth = 1.5 + 2 * tail;
      c.beginPath(); c.moveTo(a[0], a[1]); c.lineTo(b[0], b[1]); c.stroke();
    }
    // origin ping
    const op = P(t, t0, t0 + .7), os = pts[0];
    if (os[2] && op < 1) { c.strokeStyle = rgba(C.sky, 1 - op); c.lineWidth = 2; c.beginPath(); c.arc(os[0], os[1], 4 + 22 * E.outCubic(op), 0, TAU); c.stroke(); }
    if (os[2]) { c.fillStyle = C.sky; c.beginPath(); c.arc(os[0], os[1], 3, 0, TAU); c.fill(); }
    // head
    const hp = pts[N];
    if (head < 1 && hp[2]) {
      if (i === 0 || i === 3) {
        const pp = pts[N - 2]; drawPlane(c, hp[0], hp[1], Math.atan2(hp[1] - pp[1], hp[0] - pp[0]), 34, C.white);
      } else {
        const hg = c.createRadialGradient(hp[0], hp[1], 0, hp[0], hp[1], 16);
        hg.addColorStop(0, '#fff'); hg.addColorStop(.35, rgba(C.gold, .8)); hg.addColorStop(1, rgba(C.gold, 0));
        c.fillStyle = hg; c.beginPath(); c.arc(hp[0], hp[1], 16, 0, TAU); c.fill();
      }
    }
    // arrival pulse
    const ap = P(t, t0 + ARC_DUR, t0 + ARC_DUR + .8);
    if (ap > 0 && ap < 1) { c.strokeStyle = rgba(C.gold, 1 - ap); c.lineWidth = 3 * (1 - ap) + .5; c.beginPath(); c.arc(deS[0], deS[1], 6 + 70 * E.outCubic(ap), 0, TAU); c.stroke(); }
  });
  // Germany pin + callout
  const pin = clamp(spring(t - 7.5, 8, 18), 0, 1.3);
  if (pin > 0) {
    c.save(); c.translate(deS[0], deS[1]); c.scale(pin, pin);
    c.fillStyle = rgba(C.gold, .25); c.beginPath(); c.arc(0, 0, 18 + 4 * Math.sin(t * 6), 0, TAU); c.fill();
    c.fillStyle = C.gold; c.beginPath(); c.arc(0, 0, 8, 0, TAU); c.fill();
    c.fillStyle = '#fff'; c.beginPath(); c.arc(0, 0, 3.5, 0, TAU); c.fill();
    c.restore();
  }
  const co = E.inOutExpo(P(t, 8.0, 8.55));
  if (co > 0) {
    const [x, y] = deS, x1 = x + 80, y1 = y - 120, x2 = x1 + 210;
    c.strokeStyle = rgba(C.gold, .9); c.lineWidth = 2; c.beginPath(); c.moveTo(x, y);
    const k1 = clamp(co * 2), k2 = clamp(co * 2 - 1);
    c.lineTo(lerp(x, x1, k1), lerp(y, y1, k1)); if (k2 > 0) c.lineTo(lerp(x1, x2, k2), y1); c.stroke();
    decodeText(c, 'DEUTSCHLAND', x1 + 4, y1 - 14, F.mono(18, 700), C.gold, t, 8.3, { tr: 5, dur: .5 });
    decodeText(c, 'DESTINATION / DE', x1 + 4, y1 + 26, F.mono(12, 600), 'rgba(255,255,255,.55)', t, 8.4, { tr: 3, dur: .5 });
  }
  c.restore();

  // left copy
  const ex = 9.1;
  c.save(); c.globalAlpha = 1 - P(t, 9.35, 9.7);
  decodeText(c, '— GLOBAL PATHWAYS', 160, 352, F.mono(18, 700), C.gold, t, 6.1, { tr: 5, dur: .6 });
  riseText(c, 'FROM', 160, 450, 64, F.mont(64, 800), 'rgba(255,255,255,.7)', t, 6.2, { exit: [ex, .2] });
  riseText(c, 'ANYWHERE', 160, 572, 104, F.arch(104), C.white, t, 6.32, { exit: [ex + .04, .2] });
  riseText(c, 'TO', 160, 674, 64, F.mont(64, 800), 'rgba(255,255,255,.7)', t, 7.25, { exit: [ex + .08, .2] });
  riseText(c, 'GERMANY.', 160, 796, 104, F.arch(104), C.gold, t, 7.38, { exit: [ex + .12, .2], glow: 30 });
  decodeText(c, '51.1657° N  /  10.4515° E', 160, 866, F.mono(18, 600), 'rgba(255,255,255,.55)', t, 8.1, { tr: 3, dur: .7, exit: ex });
  c.restore();
  vignette(c, .55);
  hud(c, t, true);
  return deS;
}

// ============================================================ SCENE 4/5/6 — pathway → logo → end card
const STEPS = [['SPRACHE', 'LANGUAGE'], ['STUDIUM', 'UNIVERSITY'], ['VISUM', 'VISA'], ['KARRIERE', 'CAREER']];
const TR = { x0: 210, x1: 1710, y: 620, h: 14 };
const NODE_T = [10.6, 11.3, 12.0, 12.7];
const nodeX = i => TR.x0 + (TR.x1 - TR.x0) * (i + .5) / 4;
function fillAt(t) {
  const keys = [[10.3, 0], ...NODE_T.map((tt, i) => [tt, nodeX(i) - TR.x0]), [13.1, TR.x1 - TR.x0]];
  if (t <= keys[0][0]) return 0;
  for (let i = 1; i < keys.length; i++) {
    if (t <= keys[i][0]) return lerp(keys[i - 1][1], keys[i][1], E.inOutCubic(P(t, keys[i - 1][0], keys[i][0])));
  }
  return TR.x1 - TR.x0;
}
const LOGO_S = .86;
function logoXf(t) {
  const push = 1 + .03 * E.inOutCubic(P(t, 13.9, 17.9));
  const m = E.inOutExpo(P(t, 17.85, 18.7));
  const s = lerp(LOGO_S * push, .6, m) * (1 + .012 * P(t, 18.7, 20));
  const cx = lerp(W / 2, 560, m), cy = 540;
  return { s, ox: cx - G.center[0] * s, oy: cy - G.center[1] * s };
}

function icon(c, i, t, t0) {
  const k = t - t0;
  c.save();
  c.strokeStyle = '#fff'; c.fillStyle = '#fff'; c.lineWidth = 4; c.lineJoin = 'round'; c.lineCap = 'round';
  if (i === 0) {
    c.beginPath(); c.roundRect(-30, -26, 60, 42, 9); c.moveTo(-12, 16); c.lineTo(-18, 28); c.lineTo(0, 16); c.stroke();
    const lv = ['A1', 'A2', 'B1', 'B2', 'C1'][Math.min(4, Math.floor(P(k, 0, 1.0) * 5))];
    c.font = F.mono(19, 800); c.fillStyle = C.gold; c.textAlign = 'center'; c.fillText(lv, 0, 2);
  } else if (i === 1) {
    c.scale(.2, .2); c.translate(-800, -568); drawBuilding(c, Infinity, 0, '#fff', false);
  } else if (i === 2) {
    c.beginPath(); c.roundRect(-22, -30, 44, 58, 5); c.stroke();
    c.lineWidth = 3; c.beginPath(); c.moveTo(-12, -14); c.lineTo(12, -14); c.moveTo(-12, -4); c.lineTo(6, -4); c.stroke();
    const st = P(k, .2, .45);
    if (st > 0) {
      const s = lerp(2.2, 1, E.outBack(st, 2)); c.save(); c.globalAlpha = clamp(st * 3); c.translate(12, 14); c.rotate(-.3); c.scale(s, s);
      c.fillStyle = C.red; c.beginPath(); c.arc(0, 0, 15, 0, TAU); c.fill();
      c.strokeStyle = '#fff'; c.lineWidth = 3; c.beginPath(); c.moveTo(-6, 0); c.lineTo(-1, 5); c.lineTo(7, -5); c.stroke(); c.restore();
    }
  } else {
    c.beginPath(); c.roundRect(-30, -16, 60, 42, 6); c.stroke();
    c.beginPath(); c.roundRect(-11, -27, 22, 13, 4); c.stroke();
    c.strokeStyle = C.gold; c.beginPath(); c.moveTo(-30, 2); c.lineTo(30, 2); c.stroke();
    c.fillStyle = C.gold; c.fillRect(-5, -3, 10, 10);
  }
  c.restore();
}

function sceneLight(c, t) {
  paperBg(c, t, 1);
  // bloom behind logo
  const lb = P(t, 13.8, 15.2);
  if (lb > 0) {
    const L = logoXf(t), x = L.ox + G.center[0] * L.s, y = L.oy + 600 * L.s;
    const g = c.createRadialGradient(x, y, 0, x, y, 760);
    g.addColorStop(0, rgba(C.sky, .22 * lb)); g.addColorStop(1, rgba(C.sky, 0));
    c.fillStyle = g; c.fillRect(0, 0, W, H);
  }
  const pan = lerp(28, -28, E.inOutCubic(P(t, 9.8, 13.6)));
  const stepsOn = t < 13.7;

  // track → morphs into the logo progress bar
  const L = logoXf(t);
  const m = E.inOutExpo(P(t, 13.1, 13.9));
  const bx0 = lerp(TR.x0 + pan, L.ox + 238 * L.s, m), bx1 = lerp(TR.x1 + pan, L.ox + 1023 * L.s, m);
  const bh = lerp(TR.h, 18 * L.s, m), by = lerp(TR.y, L.oy + 1127 * L.s, m);
  const draw = E.outExpo(P(t, 10.15, 10.7));
  const frac = lerp(fillAt(t) / (TR.x1 - TR.x0), (646 - 238) / (1023 - 238), m);
  c.fillStyle = C.skyLt;
  c.beginPath(); c.roundRect(bx0, by - bh / 2, (bx1 - bx0) * draw, bh, bh / 2); c.fill();
  let headW = 0;
  if (frac > 0) {
    const fw = Math.max(bh, (bx1 - bx0) * frac);
    c.save(); c.shadowColor = rgba(C.gold, .6); c.shadowBlur = 18 * (1 - m);
    c.fillStyle = C.gold; c.beginPath(); c.roundRect(bx0, by - bh / 2, fw, bh, bh / 2); c.fill(); c.restore();
    headW = fw;
  }

  if (stepsOn) {
    c.save(); c.translate(pan, 0);
    decodeText(c, 'DEIN WEG  ·  YOUR PATHWAY', W / 2, 255, F.mono(20, 700), C.goldDk, t, 10.05, { align: 'center', tr: 6, dur: .6, exit: 12.95 });
    riseText(c, 'STEP BY STEP.', W / 2, 382, 104, F.arch(104), C.navy, t, 10.12,
      { align: 'center', stagger: .025, exit: [12.95, .22], colors: [...Array(12).fill(C.navy), C.red] });
    STEPS.forEach(([de, en], i) => {
      const x = nodeX(i), t0 = NODE_T[i];
      const out = E.inBack(P(t, 13.0 + i * .05, 13.32 + i * .05), 2);
      // idle node
      const idle = E.outBack(P(t, 10.25 + i * .06, 10.6 + i * .06), 2) * (1 - out);
      if (idle > 0) {
        c.fillStyle = C.paper; c.strokeStyle = rgba(C.navy, .3); c.lineWidth = 3;
        c.beginPath(); c.arc(x, TR.y, 13 * idle, 0, TAU); c.fill(); c.stroke();
      }
      const s = clamp(spring(t - t0 + .08, 8, 16), 0, 1.3) * (1 - out);
      if (s > 0) {
        c.save(); c.translate(x, TR.y); c.scale(s, s);
        c.strokeStyle = rgba(C.gold, .9); c.lineWidth = 2; c.setLineDash([6, 8]); c.lineDashOffset = -t * 30;
        c.beginPath(); c.arc(0, 0, 80, 0, TAU); c.stroke(); c.setLineDash([]);
        c.fillStyle = C.navy; c.strokeStyle = C.paper; c.lineWidth = 8;
        c.beginPath(); c.arc(0, 0, 62, 0, TAU); c.stroke(); c.fill();
        icon(c, i, t, t0);
        c.restore();
      }
      const pr = P(t, t0, t0 + .8);
      if (pr > 0 && pr < 1) { c.strokeStyle = rgba(C.gold, 1 - pr); c.lineWidth = 4; c.beginPath(); c.arc(x, TR.y, 64 + 70 * E.outCubic(pr), 0, TAU); c.stroke(); }
      decodeText(c, `0${i + 1} — ${de}`, x, 742, F.mono(17, 700), C.goldDk, t, t0 + .05, { align: 'center', tr: 3, dur: .5, exit: 13.0 });
      riseText(c, en, x, 800, 40, F.mont(40, 800), C.navy, t, t0 + .1, { align: 'center', stagger: .02, dur: .5, exit: [13.02 + i * .03, .2] });
    });
    c.restore();
  }

  if (headW > 0) {
  // plane rides the fill head
    const pa = P(t, 10.3, 10.6) * (1 - P(t, 12.95, 13.2));
    if (pa > 0) {
      c.save(); c.globalAlpha = pa;
      drawPlane(c, bx0 + headW - 10, by - 72 + Math.sin(t * 7) * 6, -.12 + Math.sin(t * 7 + 1) * .06, 70, C.ink);
      c.restore();
    }
  }
  if (t >= 13.6) logoScene(c, t, L);
  hud(c, t, false);
}

// confetti burst at logo impact
const BURST = (() => { const r = rng(42); const cols = [C.gold, C.red, C.navy, C.sky]; return Array.from({ length: 46 }, () => ({ a: -Math.PI * (.08 + .84 * r()), v: 500 + 900 * r(), w: 6 + 12 * r(), h: 14 + 22 * r(), rs: (r() - .5) * 18, c: cols[(r() * 4) | 0] })); })();

function logoScene(c, t, L) {
  const l = lctx;
  l.setTransform(1, 0, 0, 1, 0, 0); l.clearRect(0, 0, W, H);
  l.setTransform(L.s, 0, 0, L.s, L.ox, L.oy);

  // stripes grow from their base, with a little rotational settle
  const stripe = (t0, pathFn, B, T, color, d = .7) => {
    const p = E.outExpo(P(t, t0, t0 + d));
    if (p <= 0) return;
    const r = (1 - spring(t - t0, 6, 13)) * -.12;
    l.save(); l.translate(B[0], B[1]); l.rotate(r); l.translate(-B[0], -B[1]);
    growClip(l, B, T, p); l.fillStyle = color; pathFn(l); l.fill(); l.restore();
  };
  stripe(13.75, pathNavy, [294, 664], [566, 141], C.ink);
  stripe(13.85, pathGold, [422, 728], [660, 138], C.gold);
  stripe(13.95, pathRed, [594, 735], [700, 205], C.red);
  // sky + grey overlay stripes slide in
  const sk = E.outExpo(P(t, 14.15, 14.8));
  if (sk > 0) {
    l.save(); l.globalAlpha = clamp(sk * 2); l.translate(-60 * (1 - sk), 90 * (1 - sk));
    l.fillStyle = C.sky; pathSkyA(l); l.fill();
    l.save(); l.beginPath(); l.moveTo(-120, 225); l.lineTo(680, 953); l.lineTo(1300, 953); l.lineTo(1300, -100); l.lineTo(-120, -100); l.closePath(); l.clip();
    l.fillStyle = C.grey; pathSkyA(l); l.fill(); l.restore();
    l.restore();
    const sk2 = E.outExpo(P(t, 14.25, 14.9));
    l.save(); l.globalAlpha = clamp(sk2 * 2); l.translate(-60 * (1 - sk2), 90 * (1 - sk2));
    l.fillStyle = C.sky; pathSkyB(l); l.fill(); l.restore();
  }
  // building
  drawBuilding(l, t, 14.3, C.ink, true);
  // plane swoops in on a curve
  const pf = P(t, 14.55, 15.35);
  if (pf > 0) {
    const e = E.outCubic(pf);
    const p0 = [-700, 1100], p1 = [300, -150], p2 = [940, 292];
    const bz = s => [(1 - s) ** 2 * p0[0] + 2 * (1 - s) * s * p1[0] + s * s * p2[0], (1 - s) ** 2 * p0[1] + 2 * (1 - s) * s * p1[1] + s * s * p2[1]];
    // trail
    l.save(); l.strokeStyle = rgba(C.blue, .5 * (1 - P(t, 15.2, 15.7))); l.lineWidth = 3; l.setLineDash([2, 14]); l.lineCap = 'round';
    l.beginPath(); for (let k = 0; k <= 40; k++) { const q = bz(Math.max(0, e - .45) + k / 40 * Math.min(e, .45)); k ? l.lineTo(q[0], q[1]) : l.moveTo(q[0], q[1]); } l.stroke(); l.restore();
    const [x, y] = bz(e), [x2, y2] = bz(Math.min(1, e + .01));
    let ang = Math.atan2(y2 - y, x2 - x);
    const settle = spring(t - 15.2, 8, 18);
    if (pf >= 1 || e > .985) ang = lerp(ang, PLANE_HEAD, clamp(settle));
    const s = lerp(2.2, 1, e);
    l.save(); l.translate(x, y); l.scale(s, s); l.translate(-x, -y); drawPlane(l, x, y, pf >= 1 ? PLANE_HEAD : ang, 136, C.ink); l.restore();
    if (t > 15.15) l.save(), speedLines(l, t - 15.15), l.restore();
  }
  // AGH
  const aghT = [15.0, 15.08, 15.16];
  ['A', 'G', 'H'].forEach((ch, i) => {
    const t0 = aghT[i], p = P(t, t0, t0 + .42);
    if (p <= 0) return;
    const [left, w] = AGH[ch];
    l.save(); l.beginPath(); l.rect(200, 760, 860, 250); l.clip();
    l.font = F.arch(aghSize); l.letterSpacing = '0px';
    const m = l.measureText(ch), gw = m.actualBoundingBoxLeft + m.actualBoundingBoxRight, sx = w / gw;
    const dy = (1 - E.outBack(p, 1.4)) * 240;
    l.translate(left, 993 + dy); l.scale(sx, 1); l.fillStyle = C.ink; l.fillText(ch, m.actualBoundingBoxLeft, 0);
    l.restore();
  });
  // GERMAN PATHWAY — tracking in
  const gp = P(t, 15.45, 16.2);
  if (gp > 0) {
    const e = E.outExpo(gp), tr = gpTr + 46 * (1 - e);
    const str = 'GERMAN PATHWAY', { xs, total } = charPos(l, str, F.mont(gpSize, 800), tr);
    const x0 = 626 - total / 2;
    l.save(); l.font = F.mont(gpSize, 800); l.letterSpacing = '0px'; l.fillStyle = C.gold;
    for (let i = 0; i < str.length; i++) {
      const d = Math.abs(i - 6.5) / 6.5;
      l.globalAlpha = clamp((gp - d * .3) * 3);
      l.fillText(str[i], x0 + xs[i], 1083);
    }
    l.restore();
  }
  // shine sweep
  const sh = P(t, 16.35, 17.05);
  if (sh > 0 && sh < 1) {
    l.save(); l.setTransform(1, 0, 0, 1, 0, 0); l.globalCompositeOperation = 'source-atop';
    const x = lerp(-300, W + 300, E.inOutCubic(sh));
    const g = l.createLinearGradient(x - 160, 0, x + 160, 0);
    g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(.5, 'rgba(255,255,255,.55)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    l.translate(x, H / 2); l.transform(1, 0, -.45, 1, 0, 0); l.translate(-x, -H / 2);
    l.fillStyle = g; l.fillRect(x - 200, -200, 400, H + 400); l.restore();
  }

  // rings + confetti at AGH impact, behind logo
  const ip = t - 15.42;
  if (ip > 0 && ip < 1.4) {
    const cx = L.ox + 626 * L.s, cy = L.oy + 890 * L.s;
    for (let k = 0; k < 3; k++) {
      const q = P(ip, k * .1, 1.1 + k * .1);
      if (q <= 0 || q >= 1) continue;
      c.strokeStyle = rgba(C.navy, .16 * (1 - q)); c.lineWidth = 2;
      c.beginPath(); c.arc(cx, cy, 120 + 900 * E.outCubic(q), 0, TAU); c.stroke();
    }
  }
  c.drawImage(layer, 0, 0);
  if (ip > 0 && ip < 1.6) {
    const cx = L.ox + 626 * L.s, cy = L.oy + 880 * L.s;
    c.save();
    for (const b of BURST) {
      const x = cx + Math.cos(b.a) * b.v * ip * Math.exp(-ip * 1.2), y = cy + Math.sin(b.a) * b.v * ip * Math.exp(-ip * 1.2) + 520 * ip * ip;
      c.save(); c.globalAlpha = 1 - P(ip, .8, 1.6); c.translate(x, y); c.rotate(b.rs * ip); c.scale(1, Math.cos(ip * b.rs));
      c.fillStyle = b.c; c.fillRect(-b.w / 2, -b.h / 2, b.w, b.h); c.restore();
    }
    c.restore();
  }

  // end card
  if (t >= 18.3) {
    const dv = E.inOutExpo(P(t, 18.4, 18.9));
    c.fillStyle = rgba(C.navy, .18); c.fillRect(905, 540 - 230 * dv, 2, 460 * dv);
    const sz = 84, ch = cap('arch', sz);
    const lines = [['YOUR PATHWAY', 452, C.navy, C.gold, 18.4], ['TO GERMANY', 556, C.navy, C.red, 18.55], ['STARTS HERE.', 660, C.red, C.navy, 18.7]];
    for (const [s, y, col, blk, t0] of lines) {
      const { total } = charPos(c, s, F.arch(sz));
      blockReveal(c, t, t0 - .26, 976, y - ch - 14, total + 12, ch + 28, blk, () => {
        c.font = F.arch(sz); c.letterSpacing = '0px'; c.fillStyle = col; c.fillText(s, 980, y);
      });
    }
    decodeText(c, 'STUDY  ·  WORK  ·  LIVE  —  IN GERMANY', 982, 740, F.mono(20, 700), rgba(C.navy, .7), t, 18.95, { tr: 4, dur: .8 });
  }
}

// ============================================================ master timeline
function render(c, t) {
  c.setTransform(1, 0, 0, 1, 0, 0);
  c.globalAlpha = 1; c.globalCompositeOperation = 'source-over'; c.shadowBlur = 0;
  const [sx, sy] = shake(t);
  c.translate(W / 2 + sx, H / 2 + sy); c.scale(1.012, 1.012); c.translate(-W / 2, -H / 2);
  if (t < 2.42) scene1(c, t);
  else if (t < 3.25) { scene1(c, t); ribbonWipe(c, t, 2.42, [C.gold, C.red, C.sky], () => scene2(c, t)); }
  else if (t < 5.45) scene2(c, t);
  else if (t < 6.2) {
    scene2(c, t);
    const r = 2300 * E.inOutExpo(P(t, 5.45, 6.12));
    iris(c, liveDot[0], liveDot[1], r, () => scene3(c, t));
  } else if (t < 9.7) scene3(c, t);
  else if (t < 10.4) {
    const de = scene3(c, t);
    const r = 2400 * E.inOutExpo(P(t, 9.7, 10.35));
    iris(c, de[0], de[1], r, () => sceneLight(c, t), C.navy);
  } else sceneLight(c, t);
}

// ------------------------------------------------------------ output / capture
const grains = Array.from({ length: 4 }, (_, k) => {
  const g = document.createElement('canvas'); g.width = g.height = 256;
  const gc = g.getContext('2d'), id = gc.createImageData(256, 256), r = rng(100 + k);
  for (let i = 0; i < id.data.length; i += 4) { const v = r() * 255 | 0; id.data[i] = id.data[i + 1] = id.data[i + 2] = v; id.data[i + 3] = 255; }
  gc.putImageData(id, 0, 0); return g;
});

function frame(t, sub = 1, shutter = 0) {
  octx.setTransform(1, 0, 0, 1, 0, 0);
  for (let i = 0; i < sub; i++) {
    const ti = clamp(t + (sub > 1 ? ((i + .5) / sub - .5) * shutter : 0), 0, DUR - 1e-4);
    render(ctx, ti);
    octx.globalAlpha = 1 / (i + 1); octx.globalCompositeOperation = 'source-over';
    octx.drawImage(work, 0, 0);
  }
  // film grain
  const fr = Math.floor(t * 24);
  const pat = octx.createPattern(grains[fr % 4], 'repeat');
  octx.save(); octx.globalCompositeOperation = 'overlay'; octx.globalAlpha = .07;
  octx.translate((fr * 37) % 256, (fr * 91) % 256); octx.fillStyle = pat; octx.fillRect(-256, -256, W + 512, H + 512);
  octx.restore();
  octx.globalAlpha = 1;
}

async function init() {
  await Promise.all([document.fonts.load(F.arch(100)), document.fonts.load(F.mont(100, 800)), document.fonts.load(F.mono(20, 600)), document.fonts.load(F.mont(64, 800))]);
  await document.fonts.ready;
  for (const [k, f] of [['arch', F.arch(100)], ['mont', F.mont(100, 800)]]) { ctx.font = f; capH[k] = ctx.measureText('H').actualBoundingBoxAscent; }
  // fit AGH so its cap height matches the source art (792 → 993)
  aghSize = 201 / capH.arch * 100;
  // fit GERMAN PATHWAY: cap height 51, width 810
  gpSize = 51 / capH.mont * 100;
  ctx.font = F.mont(gpSize, 800); ctx.letterSpacing = '0px';
  const w0 = ctx.measureText('GERMAN PATHWAY').width;
  gpTr = (810 - w0) / 13;
  window.__ready = true;
}

window.renderFrame = (t, sub = 4, shutter = .5 / 60) => frame(t, sub, shutter);
window.DURATION = DUR;
init().then(() => {
  if (/capture/.test(location.search)) return;
  const m = location.search.match(/t=([\d.]+)/);
  if (m) { frame(+m[1], 1); return; }
  let start = performance.now();
  out.addEventListener('click', () => { start = performance.now(); });
  const loop = now => { frame(((now - start) / 1000) % DUR, 1); requestAnimationFrame(loop); };
  requestAnimationFrame(loop);
});
})();
