/* Anaya's Way Immigration — 32s motion showreel.
 * One procedural canvas engine with a responsive layout:
 *   index.html          → landscape 1920×1080
 *   index.html?v=1      → vertical  1080×1920
 * Add ?t=12.5 to freeze a frame; click to restart the live preview.
 * render.cjs drives window.renderFrame(t) headlessly to export MP4s.
 */
(() => {
'use strict';

const PORT = /[?&]v=1/.test(location.search);
const W = PORT ? 1080 : 1920, H = PORT ? 1920 : 1080, DUR = 32;
const CX = W / 2, CY = H / 2;
const C = {
  ink: '#101319', char: '#161B24', slate: '#232A36', paper: '#F7F5F0', paperDk: '#ECE7DD',
  amber: '#E0A63E', amberLt: '#F4CF83', amberDk: '#A9741C', grey: '#A9B1BD', greyDk: '#5C6470', white: '#FFFFFF',
};

// ------------------------------------------------------------ canvases
const out = document.getElementById('c');
out.width = W; out.height = H;
if (!PORT) { out.style.width = '100vw'; out.style.height = '56.25vw'; } else { out.style.height = '100vh'; out.style.width = '56.25vh'; }
const octx = out.getContext('2d');
const mk = () => { const c = document.createElement('canvas'); c.width = W; c.height = H; return c; };
const work = mk(), ctx = work.getContext('2d');
const layer = mk(), lctx = layer.getContext('2d');

// ------------------------------------------------------------ math
const clamp = (x, a = 0, b = 1) => x < a ? a : x > b ? b : x;
const lerp = (a, b, t) => a + (b - a) * t;
const P = (t, a, b) => clamp((t - a) / (b - a));
const TAU = Math.PI * 2;
const E = {
  outCubic: x => 1 - Math.pow(1 - x, 3),
  inCubic: x => x * x * x,
  inOutCubic: x => x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2,
  outExpo: x => x >= 1 ? 1 : 1 - Math.pow(2, -10 * x),
  inExpo: x => x <= 0 ? 0 : Math.pow(2, 10 * x - 10),
  inOutExpo: x => x <= 0 ? 0 : x >= 1 ? 1 : x < .5 ? Math.pow(2, 20 * x - 10) / 2 : (2 - Math.pow(2, -20 * x + 10)) / 2,
  outBack: (x, s = 1.70158) => 1 + (s + 1) * Math.pow(x - 1, 3) + s * Math.pow(x - 1, 2),
  inBack: (x, s = 1.70158) => (s + 1) * x * x * x - s * x * x,
};
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
const rgba = (hex, a) => { const n = parseInt(hex.slice(1), 16); return `rgba(${n >> 16 & 255},${n >> 8 & 255},${n & 255},${a})`; };

// ------------------------------------------------------------ type
const F = {
  head: (s, w = 850) => `${w} ${s}px 'Inter Tight'`,
  body: (s, w = 500) => `${w} ${s}px 'Inter'`,
  serif: s => `italic 400 ${s}px 'Instrument Serif'`,
};
/** Largest size ≤ max at which `str` fits in maxW. */
function fit(c, str, fontFn, maxW, max, trEm = 0) {
  c.save(); c.font = fontFn(100); c.letterSpacing = (trEm * 100) + 'px';
  const w = c.measureText(str).width; c.restore();
  return Math.min(max, 100 * maxW / w);
}
const posCache = new Map();
function charPos(c, str, f, tr = 0) {
  const k = f + '|' + str + '|' + tr;
  let v = posCache.get(k);
  if (v) return v;
  c.save(); c.font = f; c.letterSpacing = tr + 'px';
  const xs = [];
  for (let i = 0; i < str.length; i++) xs.push(c.measureText(str.slice(0, i + 1)).width - c.measureText(str[i]).width);
  v = { xs, total: c.measureText(str).width - tr };
  c.restore(); posCache.set(k, v);
  return v;
}
function riseText(c, str, x, y, size, f, fill, t, t0, o = {}) {
  const { stagger = .025, dur = .6, align = 'left', tr = 0, exit = null, ease = E.outExpo, mask = true, colors = null, alpha = 1, glow = 0 } = o;
  if (t < t0) return;
  const { xs, total } = charPos(c, str, f, tr);
  const x0 = align === 'center' ? x - total / 2 : align === 'right' ? x - total : x;
  c.save(); c.font = f; c.letterSpacing = '0px'; c.globalAlpha *= alpha;
  if (mask) { c.beginPath(); c.rect(x0 - size, y - size * 1.05, total + size * 2, size * 1.38); c.clip(); }
  if (glow) { c.shadowColor = rgba(C.amber, .45); c.shadowBlur = glow; }
  for (let i = 0; i < str.length; i++) {
    if (str[i] === ' ') continue;
    const s = t0 + i * stagger;
    let dy = (1 - ease(P(t, s, s + dur))) * size * 1.15;
    if (exit) { const e0 = exit[0] + i * stagger * .5; dy -= E.inExpo(P(t, e0, e0 + exit[1])) * size * 1.2; }
    c.fillStyle = colors ? (colors(str[i], i) || fill) : fill;
    c.fillText(str[i], x0 + xs[i], y + dy);
  }
  c.restore();
}
function fadeText(c, str, x, y, f, fill, t, t0, o = {}) {
  const { dur = .6, align = 'left', tr = 0, exit = null, rise = 20 } = o;
  let a = E.outCubic(P(t, t0, t0 + dur));
  if (exit) a *= 1 - P(t, exit, exit + .3);
  if (a <= 0) return;
  c.save(); c.font = f; c.letterSpacing = tr + 'px'; c.textAlign = align; c.fillStyle = fill; c.globalAlpha *= a;
  c.fillText(str, x, y + (1 - a) * rise); c.restore();
}
const GLYPHS = 'ABCDEFGHJKLMNPQRSTUVWXYZ0123456789';
function decodeText(c, str, x, y, f, color, t, t0, o = {}) {
  const { dur = .7, align = 'left', tr = 4, exit = null } = o;
  if (t < t0) return;
  let a = 1; if (exit) a *= 1 - P(t, exit, exit + .25);
  if (a <= 0) return;
  const n = str.length, p = P(t, t0, t0 + dur), fr = Math.floor(t * 30);
  let s = '';
  for (let i = 0; i < n; i++) {
    const ap = i / n * .55, lock = ap + .45;
    if (p < ap) s += ' ';
    else if (p < lock && /[A-Za-z0-9]/.test(str[i])) s += GLYPHS[Math.floor(hash(i, fr) * GLYPHS.length)];
    else s += str[i];
  }
  c.save(); c.font = f; c.letterSpacing = tr + 'px'; c.fillStyle = color; c.globalAlpha *= a; c.textAlign = align;
  c.fillText(s.replace(/\s+$/, ''), x, y); c.restore();
}
function wrap(c, str, f, maxW) {
  c.save(); c.font = f;
  const words = str.split(' '), lines = []; let cur = '';
  for (const w of words) { const n = cur ? cur + ' ' + w : w; if (c.measureText(n).width > maxW && cur) { lines.push(cur); cur = w; } else cur = n; }
  if (cur) lines.push(cur); c.restore();
  return lines;
}

// ------------------------------------------------------------ path helpers
function cubicPts(segs, n = 80) {
  // segs: [[p0,p1,p2,p3], ...]
  const pts = [];
  for (const [a, b, c2, d] of segs) for (let i = 0; i <= n; i++) {
    const s = i / n, u = 1 - s;
    pts.push([u * u * u * a[0] + 3 * u * u * s * b[0] + 3 * u * s * s * c2[0] + s * s * s * d[0], u * u * u * a[1] + 3 * u * u * s * b[1] + 3 * u * s * s * c2[1] + s * s * s * d[1]]);
  }
  let L = 0; const cum = [0];
  for (let i = 1; i < pts.length; i++) { L += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); cum.push(L); }
  return { pts, cum, L };
}
function strokeRange(c, path, a, b) {
  const { pts, cum, L } = path, la = a * L, lb = b * L;
  if (lb <= la) return null;
  c.beginPath(); let started = false, head = null;
  for (let i = 1; i < pts.length; i++) {
    if (cum[i] < la) continue;
    if (cum[i - 1] > lb) break;
    const k0 = clamp((la - cum[i - 1]) / (cum[i] - cum[i - 1] || 1)), k1 = clamp((lb - cum[i - 1]) / (cum[i] - cum[i - 1] || 1));
    const p0 = [lerp(pts[i - 1][0], pts[i][0], k0), lerp(pts[i - 1][1], pts[i][1], k0)];
    const p1 = [lerp(pts[i - 1][0], pts[i][0], k1), lerp(pts[i - 1][1], pts[i][1], k1)];
    if (!started) { c.moveTo(p0[0], p0[1]); started = true; }
    c.lineTo(p1[0], p1[1]); head = p1;
  }
  c.stroke();
  return head;
}
function glowDot(c, x, y, r, col = C.amber, a = 1) {
  const g = c.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, `rgba(255,248,230,${a})`); g.addColorStop(.25, rgba(col, .7 * a)); g.addColorStop(1, rgba(col, 0));
  c.fillStyle = g; c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill();
}

// ------------------------------------------------------------ backgrounds & fx
const impacts = [[.5, 2], [1.5, 2], [2.5, 4], [5.0, 2], [9.5, 3], [15.6, 3], [27.55, 6], [29.65, 3]];
function shake(t) {
  let x = 0, y = 0;
  for (const [ti, a] of impacts) {
    const d = t - ti; if (d < 0 || d > .6) continue;
    const env = a * Math.exp(-d * 11);
    x += env * Math.sin(d * 83 + ti * 7); y += env * Math.cos(d * 71 + ti * 3);
  }
  return [x, y];
}
const BOKEH = (() => { const r = rng(21); return Array.from({ length: 30 }, () => ({ x: r(), y: r(), z: r(), ph: r() * TAU })); })();
const DUST = (() => { const r = rng(8); return Array.from({ length: 150 }, () => ({ x: r(), y: r(), z: r(), ph: r() * TAU })); })();
function bokeh(c, t, a = 1) {
  c.save(); c.globalCompositeOperation = 'lighter';
  for (const p of BOKEH) {
    const z = .3 + p.z * .7, r = (24 + 70 * z) * (PORT ? 1.2 : 1);
    const x = (p.x * (W + 200) + t * 16 * z) % (W + 200) - 100, y = p.y * H + Math.sin(t * .5 + p.ph) * 30;
    const al = a * .07 * (.5 + .5 * Math.sin(t * 1.2 + p.ph));
    const g = c.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, rgba(C.amberLt, al)); g.addColorStop(.7, rgba(C.amber, al * .5)); g.addColorStop(1, rgba(C.amber, 0));
    c.fillStyle = g; c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill();
  }
  c.restore();
}
function dust(c, t, a = 1, col = C.amberLt) {
  c.save(); c.fillStyle = col;
  for (const p of DUST) {
    const z = .25 + p.z * .75;
    const x = ((p.x * W + Math.sin(t * .4 + p.ph) * 40 * z + t * 9 * z) % W + W) % W, y = ((p.y * H - t * 20 * z) % H + H) % H;
    c.globalAlpha = a * (.08 + .35 * z) * (.6 + .4 * Math.sin(t * 2.3 + p.ph));
    c.beginPath(); c.arc(x, y, .5 + 1.5 * z, 0, TAU); c.fill();
  }
  c.restore();
}
function darkBg(c, x = CX, y = CY * .9) {
  const g = c.createRadialGradient(x, y, 0, x, y, Math.max(W, H) * .8);
  g.addColorStop(0, '#26303F'); g.addColorStop(.5, '#141920'); g.addColorStop(1, '#07090C');
  c.fillStyle = g; c.fillRect(-60, -60, W + 120, H + 120);
}
function paperBg(c, t, sun = 1) {
  c.fillStyle = C.paper; c.fillRect(-60, -60, W + 120, H + 120);
  const g = c.createRadialGradient(W * .85, H * .12, 0, W * .85, H * .12, Math.max(W, H) * .7);
  g.addColorStop(0, rgba(C.amber, .17 * sun)); g.addColorStop(1, rgba(C.amber, 0));
  c.fillStyle = g; c.fillRect(-60, -60, W + 120, H + 120);
  const s = 46, off = (t * 6) % s;
  c.fillStyle = 'rgba(16,19,25,.06)'; c.beginPath();
  for (let y = -s + off * .5; y < H + s; y += s) for (let x = -s + off; x < W + s; x += s) c.rect(x - 1.1, y - 1.1, 2.2, 2.2);
  c.fill();
}
function vignette(c, a = .5) {
  const g = c.createRadialGradient(CX, CY, Math.min(W, H) * .35, CX, CY, Math.max(W, H) * .75);
  g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, `rgba(0,0,0,${a})`);
  c.fillStyle = g; c.fillRect(-60, -60, W + 120, H + 120);
}

// ------------------------------------------------------------ icons (stroked, drawn on with progress p, ~140px box)
function icon(c, name, p, col = C.amber, lw = 6) {
  if (p <= 0) return;
  c.save(); c.strokeStyle = col; c.lineWidth = lw; c.lineCap = 'round'; c.lineJoin = 'round';
  c.setLineDash([900 * p, 4000]); c.lineDashOffset = 0;
  c.beginPath();
  switch (name) {
    case 'scales':
      c.moveTo(0, -60); c.lineTo(0, 58); c.moveTo(-34, 60); c.lineTo(34, 60);
      c.moveTo(-58, -40); c.lineTo(58, -40);
      c.moveTo(-58, -40); c.lineTo(-74, 6); c.moveTo(-58, -40); c.lineTo(-42, 6);
      c.moveTo(58, -40); c.lineTo(42, 6); c.moveTo(58, -40); c.lineTo(74, 6);
      c.moveTo(-78, 6); c.quadraticCurveTo(-58, 34, -38, 6); c.closePath();
      c.moveTo(38, 6); c.quadraticCurveTo(58, 34, 78, 6); c.closePath();
      c.moveTo(6, -60); c.arc(0, -60, 6, 0, TAU);
      break;
    case 'heart':
      c.moveTo(0, 52); c.bezierCurveTo(-90, -6, -54, -78, 0, -34); c.bezierCurveTo(54, -78, 90, -6, 0, 52);
      c.moveTo(-50, 70); c.lineTo(50, 70);
      break;
    case 'shelter':
      c.moveTo(-74, -4); c.lineTo(0, -66); c.lineTo(74, -4);
      c.moveTo(-54, -18); c.lineTo(-54, 62); c.lineTo(54, 62); c.lineTo(54, -18);
      c.moveTo(0, 46); c.bezierCurveTo(-46, 16, -26, -26, 0, -6); c.bezierCurveTo(26, -26, 46, 16, 0, 46);
      break;
    case 'pin':
      c.moveTo(0, 66); c.bezierCurveTo(-30, 26, -54, 0, -54, -24); c.arc(0, -24, 54, Math.PI, 0); c.bezierCurveTo(54, 0, 30, 26, 0, 66);
      c.moveTo(20, -24); c.arc(0, -24, 20, 0, TAU);
      break;
    case 'shield':
      c.moveTo(0, -66); c.lineTo(56, -44); c.bezierCurveTo(56, 10, 36, 44, 0, 66); c.bezierCurveTo(-36, 44, -56, 10, -56, -44); c.closePath();
      c.moveTo(-22, 0); c.lineTo(-6, 18); c.lineTo(26, -16);
      break;
    case 'family':
      c.moveTo(-14, -34); c.arc(-30, -34, 16, 0, TAU);
      c.moveTo(-64, 50); c.bezierCurveTo(-64, 6, -50, -10, -30, -10); c.bezierCurveTo(-10, -10, 4, 6, 4, 50);
      c.moveTo(48, -8); c.arc(36, -8, 12, 0, TAU);
      c.moveTo(14, 50); c.bezierCurveTo(14, 22, 22, 12, 36, 12); c.bezierCurveTo(50, 12, 58, 22, 58, 50);
      c.moveTo(-74, 62); c.lineTo(70, 62);
      break;
    case 'document':
      c.moveTo(-44, -64); c.lineTo(22, -64); c.lineTo(48, -38); c.lineTo(48, 64); c.lineTo(-44, 64); c.closePath();
      c.moveTo(22, -64); c.lineTo(22, -38); c.lineTo(48, -38);
      c.moveTo(-26, -30); c.lineTo(8, -30); c.moveTo(-26, -12); c.lineTo(30, -12);
      c.moveTo(34, 30); c.arc(14, 30, 20, 0, TAU); c.moveTo(5, 30); c.lineTo(12, 37); c.lineTo(24, 23);
      break;
  }
  c.stroke(); c.restore();
}

// ------------------------------------------------------------ emblem (unit: ring radius 100)
function statuePath(c) {
  // Stylised Liberty: robe, head, crown, raised torch arm, tablet. Base at y=0, ~100 tall.
  c.beginPath();
  c.moveTo(-9, -58); c.lineTo(9, -58); c.lineTo(13, -30); c.lineTo(17, 0); c.lineTo(-17, 0); c.lineTo(-13, -30); c.closePath();
  c.moveTo(5.5, -67); c.arc(0, -67, 5.5, 0, TAU);
  c.moveTo(-1, -60); c.lineTo(1, -60); c.lineTo(1.5, -63); c.lineTo(-1.5, -63); c.closePath();
  c.save(); c.translate(11, -44); c.rotate(-.35); c.rect(-4, -8, 9, 16); c.restore();
}
function drawStatue(c, flame) {
  c.save();
  // knockout halo so the statue reads over the globe lines
  c.strokeStyle = C.paper; c.lineWidth = 7; c.lineJoin = 'round'; c.lineCap = 'round';
  statuePath(c); c.stroke();
  c.beginPath(); c.moveTo(-6, -60); c.lineTo(-14, -86); c.stroke();
  c.fillStyle = C.ink; statuePath(c); c.fill();
  c.strokeStyle = C.ink; c.lineWidth = 5; c.beginPath(); c.moveTo(-6, -60); c.lineTo(-14, -86); c.stroke();
  c.beginPath(); c.moveTo(-18, -88); c.lineTo(-10, -88); c.lineTo(-12, -84); c.lineTo(-16, -84); c.closePath(); c.fill();
  // crown rays
  c.lineWidth = 1.6; c.beginPath();
  for (let k = 0; k < 7; k++) { const a = -Math.PI * (.12 + .76 * k / 6); c.moveTo(Math.cos(a) * 6, -67 + Math.sin(a) * 6); c.lineTo(Math.cos(a) * 11, -67 + Math.sin(a) * 11); }
  c.stroke();
  // robe folds
  c.strokeStyle = C.paper; c.lineWidth = .9; c.beginPath();
  c.moveTo(-6, -50); c.lineTo(-10, -4); c.moveTo(-1, -48); c.lineTo(-3, -2); c.moveTo(4, -40); c.lineTo(7, -3); c.stroke();
  // flame
  if (flame > 0) {
    const f = flame, fl = 1 + .08 * Math.sin(f * 40);
    c.save(); c.translate(-14, -89); c.scale(f * fl, f * fl);
    const g = c.createRadialGradient(0, -4, 0, 0, -4, 18); g.addColorStop(0, rgba(C.amberLt, .7)); g.addColorStop(1, rgba(C.amber, 0));
    c.fillStyle = g; c.beginPath(); c.arc(0, -4, 18, 0, TAU); c.fill();
    c.fillStyle = C.amber; c.beginPath(); c.moveTo(0, -13); c.quadraticCurveTo(6, -4, 3, 0); c.lineTo(-3, 0); c.quadraticCurveTo(-6, -4, 0, -13); c.fill();
    c.restore();
  } else {
    c.fillStyle = C.ink; c.beginPath(); c.moveTo(-14, -99); c.quadraticCurveTo(-9, -92, -11, -88); c.lineTo(-17, -88); c.quadraticCurveTo(-19, -92, -14, -99); c.fill();
  }
  c.restore();
}
/** Emblem: build progress driven by absolute time and the start t0. */
function drawEmblem(c, t, t0) {
  const ring = E.inOutCubic(P(t, t0, t0 + .55)), lines = E.inOutCubic(P(t, t0 + .3, t0 + .85));
  const rise = E.outBack(P(t, t0 + .55, t0 + 1.1), 1.1), flame = clamp(spring(t - (t0 + 1.05), 8, 16), 0, 1.3);
  c.save();
  c.lineCap = 'round';
  if (lines > 0) {
    c.save(); c.beginPath(); c.arc(0, 0, 96, 0, TAU); c.clip();
    c.strokeStyle = C.ink; c.lineWidth = 5.5; c.setLineDash([600 * lines, 2000]);
    c.beginPath(); c.ellipse(0, 0, 44, 98, 0, -Math.PI / 2, Math.PI * 1.5); c.stroke();
    c.beginPath(); c.ellipse(0, 0, 78, 98, 0, -Math.PI / 2, Math.PI * 1.5); c.stroke();
    c.beginPath(); c.moveTo(0, -100); c.lineTo(0, 100); c.stroke();
    for (const y of [-46, 0, 46]) { c.beginPath(); c.moveTo(-100, y); c.lineTo(100, y); c.stroke(); }
    c.restore();
  }
  if (ring > 0) { c.strokeStyle = C.ink; c.lineWidth = 9; c.beginPath(); c.arc(0, 0, 100, Math.PI * .75, Math.PI * .75 + TAU * ring); c.stroke(); }
  if (rise > 0) {
    c.save();
    c.beginPath(); c.arc(0, 0, 104, 0, TAU); c.rect(-150, -300, 300, 240); c.clip('nonzero');
    c.translate(-30, 100 + (1 - rise) * 260); c.scale(2.3, 2.3);
    drawStatue(c, flame);
    c.restore();
  }
  c.restore();
}

// ------------------------------------------------------------ HUD
const CHAPTERS = [[0, '01 — PRECISION'], [4.7, '02 — MISSION'], [9.15, '03 — SERVICES'], [15.6, '04 — NATIONWIDE'], [21.1, '05 — VALUES']];
function hud(c, t, dark) {
  const a = P(t, .2, .7) * (1 - P(t, 25.9, 26.4));
  if (a <= 0) return;
  const col = dark ? '255,255,255' : '16,19,25';
  c.save(); c.globalAlpha *= a;
  c.strokeStyle = `rgba(${col},.35)`; c.lineWidth = 1.5;
  const m = 46, L = 22;
  for (const [x, y, sx, sy] of [[m, m, 1, 1], [W - m, m, -1, 1], [m, H - m, 1, -1], [W - m, H - m, -1, -1]]) {
    c.beginPath(); c.moveTo(x, y + sy * L); c.lineTo(x, y); c.lineTo(x + sx * L, y); c.stroke();
  }
  c.font = F.body(13, 600); c.letterSpacing = '3.5px'; c.fillStyle = `rgba(${col},.6)`;
  c.fillText('ANAYA’S WAY', 92, 88);
  c.textAlign = 'right'; c.fillText('SHOWREEL 2026', W - 92, 88);
  let label = CHAPTERS[0][1]; for (const [s, l] of CHAPTERS) if (t >= s) label = l;
  c.fillText(label, W - 92, H - 80);
  c.textAlign = 'left';
  const fr = Math.floor(t * 60);
  c.fillText(`${String(Math.floor(fr / 60)).padStart(2, '0')}:${String(fr % 60).padStart(2, '0')}`, 92, H - 80);
  c.fillStyle = `rgba(${col},.15)`; c.fillRect(W - 92 - 160, H - 108, 160, 2);
  c.fillStyle = C.amber; c.fillRect(W - 92 - 160, H - 108.5, 160 * t / DUR, 3);
  c.restore();
}

// ============================================================ SCENE 1 — precision
const S1 = PORT
  ? [['SERIOUS', .5], ['CASES.', .62], ['STRUCTURED', 1.5], ['STRATEGY.', 1.62], ['NATIONWIDE', 2.5], ['REPRESENTATION.', 2.62]]
  : [['SERIOUS CASES.', .5], ['STRUCTURED STRATEGY.', 1.5], ['NATIONWIDE REPRESENTATION.', 2.5]];
const WAY1 = cubicPts(PORT
  ? [[[-80, H * .86], [W * .3, H * .74], [W * .6, H * .95], [W + 80, H * .8]]]
  : [[[-80, H * .82], [W * .3, H * .66], [W * .65, H * .98], [W + 80, H * .76]]]);
let s1Size = 0;
function scene1(c, t) {
  darkBg(c);
  bokeh(c, t, P(t, 0, 1)); dust(c, t, P(t, 0, .8));
  const z = 1 + .05 * E.inOutCubic(P(t, 0, 4.4));
  c.save(); c.translate(CX, CY); c.scale(z, z); c.translate(-CX, -CY);
  // the "way" line
  c.strokeStyle = C.amber; c.lineWidth = 4; c.lineCap = 'round';
  const head = strokeRange(c, WAY1, 0, E.inOutCubic(P(t, .05, 1.6)));
  if (head && t < 1.7) glowDot(c, head[0], head[1], 40);
  // label
  const lh = s1Size * (PORT ? .98 : 1.02), n = S1.length;
  const y0 = CY - (n - 1) * lh / 2 + s1Size * .36;
  decodeText(c, 'IMMIGRATION, DONE WITH PRECISION.', CX, y0 - s1Size - (PORT ? 70 : 50), F.body(PORT ? 24 : 20, 600), rgba(C.amberLt, .85), t, .25, { align: 'center', tr: PORT ? 7 : 8, dur: 1.0, exit: 3.9 });
  S1.forEach(([s, t0], i) => {
    const next = S1.find(([, tt]) => tt > t0 + .2);
    const dim = next ? .6 * P(t, next[1], next[1] + .3) * (1 - P(t, 3.1, 3.4)) : 0;
    const punch = 1 + .06 * (1 - E.outExpo(P(t, t0, t0 + .6)));
    const y = y0 + i * lh;
    c.save(); c.translate(CX, y - s1Size * .35); c.scale(punch, punch); c.translate(-CX, -(y - s1Size * .35));
    riseText(c, s, CX, y, s1Size, F.head(s1Size, 850), C.white, t, t0, {
      align: 'center', stagger: .022, dur: .55, alpha: 1 - dim, exit: [3.85 + i * .04, .22],
      colors: ch => ch === '.' ? C.amber : null,
    });
    c.restore();
  });
  // highlight sweep across all lines
  const sw = P(t, 3.15, 3.75);
  if (sw > 0 && sw < 1) {
    const x = lerp(-400, W + 400, E.inOutCubic(sw));
    c.save(); c.globalCompositeOperation = 'lighter';
    const g = c.createLinearGradient(x - 200, 0, x + 200, 0);
    g.addColorStop(0, rgba(C.amber, 0)); g.addColorStop(.5, rgba(C.amber, .22)); g.addColorStop(1, rgba(C.amber, 0));
    c.fillStyle = g; c.fillRect(x - 200, y0 - s1Size * 1.2, 400, n * lh + s1Size * .6); c.restore();
  }
  c.restore();
  vignette(c, .55);
  hud(c, t, true);
}

// ============================================================ transitions
const BRUSH = cubicPts([[[-300, H + 200], [W * .15, H * .15], [W * .85, H * .85], [W + 300, -200]]]);
function brushWipe(c, t, t0, dur, next) {
  const p = E.inOutCubic(P(t, t0, t0 + dur * .55)), wgt = lerp(90, Math.hypot(W, H) * 1.05, E.inExpo(P(t, t0 + dur * .15, t0 + dur)));
  if (p <= 0) return;
  lctx.setTransform(1, 0, 0, 1, 0, 0); lctx.globalAlpha = 1; next(lctx);
  c.save(); c.setTransform(1, 0, 0, 1, 0, 0); c.lineCap = 'round';
  c.strokeStyle = C.amber; c.lineWidth = wgt + 34; strokeRange(c, BRUSH, 0, p);
  c.strokeStyle = c.createPattern(layer, 'no-repeat'); c.lineWidth = wgt; strokeRange(c, BRUSH, 0, p);
  c.restore();
}
function iris(c, x, y, r, next, ring = C.amber) {
  if (r <= 0) return;
  c.save(); c.beginPath(); c.arc(x, y, r, 0, TAU); c.clip(); next(c); c.restore();
  c.save(); c.strokeStyle = ring; c.lineWidth = 12; c.beginPath(); c.arc(x, y, r + 10, 0, TAU); c.stroke();
  c.lineWidth = 2; c.globalAlpha = .6; c.beginPath(); c.arc(x, y, r * 1.07 + 36, 0, TAU); c.stroke(); c.restore();
}
function whip(c, t, t0, dur, a, b) {
  const p = E.inOutExpo(P(t, t0, t0 + dur));
  c.save(); c.translate(-W * p, 0); a(c); c.restore();
  c.save(); c.translate(W * (1 - p), 0); b(c); c.restore();
}

// ============================================================ SCENE 2 — mission
const S2W = PORT ? 960 : 1500;
function scene2(c, t) {
  paperBg(c, t);
  c.save();
  const z = 1 + .04 * P(t, 4.2, 9);
  c.translate(CX, CY); c.scale(z, z); c.translate(-CX, -CY);
  const big = fit(c, 'DIGNITY.', s => F.head(s, 900), S2W, PORT ? 230 : 190);
  const mid = fit(c, 'AND A FAIR CHANCE', s => F.head(s, 900), S2W, PORT ? 104 : 104);
  const ser = PORT ? 92 : 80;
  const rows = [[ser + 10, 'serif'], [big * 1.02, 'big'], [big * 1.16, 'big'], [mid + 34, 'mid'], [ser + 20, 'serif']];
  const total = rows.reduce((a, r) => a + r[0], 0) + (PORT ? 60 : 20);
  let y = CY - total / 2;
  const ys = rows.map(r => { y += r[0]; return y - (r[1] === 'big' ? big * .1 : 0); });
  decodeText(c, '— OUR MISSION', CX, ys[0] - ser - (PORT ? 70 : 40), F.body(PORT ? 22 : 18, 700), C.amberDk, t, 4.5, { align: 'center', tr: 6 });
  fadeText(c, 'Everyone deserves', CX, ys[0], F.serif(ser), C.amberDk, t, 4.65, { align: 'center' });
  // SAFETY with hand-drawn underline
  riseText(c, 'SAFETY.', CX, ys[1], big, F.head(big, 900), C.ink, t, 4.95, { align: 'center', colors: ch => ch === '.' ? C.amber : null });
  const sw = charPos(c, 'SAFETY.', F.head(big, 900)).total;
  const ul = cubicPts([[[CX - sw / 2, ys[1] + big * .14], [CX - sw / 6, ys[1] + big * .24], [CX + sw / 6, ys[1] + big * .06], [CX + sw / 2, ys[1] + big * .16]]]);
  c.strokeStyle = C.amber; c.lineWidth = big * .06; c.lineCap = 'round'; strokeRange(c, ul, 0, E.inOutCubic(P(t, 5.15, 5.6)));
  // DIGNITY with marker highlight
  const dw = charPos(c, 'DIGNITY.', F.head(big, 900)).total, hp = E.inOutExpo(P(t, 5.75, 6.15));
  if (hp > 0) { c.fillStyle = rgba(C.amber, .35); c.fillRect(CX - dw / 2 - 16, ys[2] - big * .42, (dw + 32) * hp, big * .44); }
  riseText(c, 'DIGNITY.', CX, ys[2], big, F.head(big, 900), C.ink, t, 5.65, { align: 'center', colors: ch => ch === '.' ? C.amber : null });
  riseText(c, 'AND A FAIR CHANCE', CX, ys[3], mid, F.head(mid, 900), C.ink, t, 6.3, { align: 'center', stagger: .018 });
  fadeText(c, 'to present their case.', CX, ys[4], F.serif(ser), C.amberDk, t, 6.85, { align: 'center' });
  // little sparkles around
  for (let k = 0; k < 10; k++) {
    const a = P(t, 5 + k * .2, 5.4 + k * .2) * (1 - P(t, 8.4, 8.7));
    if (a <= 0) continue;
    const x = CX + (hash(k, 4) - .5) * (PORT ? 900 : 1500), yy = CY + (hash(k, 5) - .5) * (PORT ? 1300 : 800);
    c.fillStyle = rgba(k % 2 ? C.amber : C.ink, .5 * a); c.beginPath(); c.arc(x, yy + Math.sin(t * 2 + k) * 8, 3 + 4 * hash(k, 6), 0, TAU); c.fill();
  }
  c.restore();
  hud(c, t, false);
}

// ============================================================ SCENE 3 — services
const SLOT = ['ASYLUM', 'U VISA', 'T VISA', 'VAWA', 'SIJS', 'TPS', 'J-1 WAIVERS', 'FAMILY CASES'];
const SLOT_T0 = 9.45, SLOT_DT = .42;
const CARDS = [
  ['shield', 'Humanitarian Visas', 'U/T visas, VAWA, asylum, SIJS, TPS'],
  ['family', 'Family Immigration', 'I-130, adjustment of status, consular processing'],
  ['document', 'J-1 Waivers', 'Two-year home-residency requirement waivers'],
];
function scene3(c, t) {
  c.fillStyle = C.char; c.fillRect(-60, -60, W + 120, H + 120);
  const g = c.createRadialGradient(CX, CY, 0, CX, CY, Math.max(W, H) * .7);
  g.addColorStop(0, '#222B39'); g.addColorStop(1, '#0B0E13'); c.fillStyle = g; c.fillRect(-60, -60, W + 120, H + 120);
  c.strokeStyle = 'rgba(224,166,62,.05)'; c.lineWidth = 1; c.beginPath();
  for (let x = (t * 20) % 80; x < W; x += 80) { c.moveTo(x, 0); c.lineTo(x, H); }
  for (let y = 0; y < H; y += 80) { c.moveTo(0, y); c.lineTo(W, y); }
  c.stroke();
  dust(c, t, .5);

  // part A — slot machine
  const partA = 1 - P(t, 12.75, 13.05);
  const ly = PORT ? H * .4 : H * .36;
  if (partA > 0) {
    c.save(); c.globalAlpha = partA;
    const zz = 1 + .3 * E.inCubic(P(t, 12.7, 13.05));
    c.translate(CX, CY); c.scale(zz, zz); c.translate(-CX, -CY);
    riseText(c, 'WE REPRESENT', CX, ly, PORT ? 44 : 38, F.head(PORT ? 44 : 38, 800), C.amber, t, 8.7, { align: 'center', tr: 10 });
    const k = clamp(Math.floor((t - SLOT_T0) / SLOT_DT), -1, SLOT.length - 1);
    const sy = PORT ? H * .52 : H * .6, maxS = PORT ? 190 : 230;
    const size = w => fit(c, w, s => F.head(s, 900), W - (PORT ? 140 : 300), maxS);
    if (k >= 0) {
      const local = t - (SLOT_T0 + k * SLOT_DT), q = E.outBack(clamp(local / .22), 1.3);
      const cur = SLOT[k], cs = size(cur), prev = k > 0 ? SLOT[k - 1] : null;
      const cw = charPos(c, cur, F.head(cs, 900)).total, pw = prev ? charPos(c, prev, F.head(size(prev), 900)).total : cw;
      const bw = lerp(pw, cw, E.outExpo(clamp(local / .3))) + 70, bh = maxS * 1.05;
      c.save(); c.beginPath(); c.rect(0, sy - bh * .82, W, bh); c.clip();
      c.font = F.head(cs, 900); c.textAlign = 'center'; c.letterSpacing = '0px';
      c.fillStyle = C.white; c.fillText(cur, CX, sy + (1 - q) * bh);
      if (prev && local < .22) { const ps = size(prev); c.font = F.head(ps, 900); c.fillStyle = C.white; c.fillText(prev, CX, sy - E.inCubic(local / .22) * bh); }
      c.restore();
      // amber brackets
      c.strokeStyle = C.amber; c.lineWidth = 5; c.lineCap = 'square';
      const bx0 = CX - bw / 2, bx1 = CX + bw / 2, by0 = sy - bh * .78, by1 = sy + bh * .18, L = 30;
      c.beginPath();
      c.moveTo(bx0 + L, by0); c.lineTo(bx0, by0); c.lineTo(bx0, by1); c.lineTo(bx0 + L, by1);
      c.moveTo(bx1 - L, by0); c.lineTo(bx1, by0); c.lineTo(bx1, by1); c.lineTo(bx1 - L, by1);
      c.stroke();
      // counter
      c.font = F.body(PORT ? 22 : 18, 600); c.letterSpacing = '4px'; c.fillStyle = rgba(C.grey, .8); c.textAlign = 'center';
      c.fillText(`${String(k + 1).padStart(2, '0')} / ${String(SLOT.length).padStart(2, '0')}`, CX, by1 + (PORT ? 90 : 70));
      const tw = PORT ? 600 : 520;
      c.fillStyle = 'rgba(255,255,255,.12)'; c.fillRect(CX - tw / 2, by1 + (PORT ? 120 : 95), tw, 3);
      c.fillStyle = C.amber; c.fillRect(CX - tw / 2, by1 + (PORT ? 120 : 95), tw * clamp((t - SLOT_T0) / (SLOT_DT * SLOT.length)), 3);
    }
    c.restore();
  }
  // part B — the three practice areas
  if (t > 12.85) {
    const hy = PORT ? H * .2 : H * .2;
    riseText(c, 'PRACTICE AREAS', CX, hy, PORT ? 44 : 38, F.head(PORT ? 44 : 38, 800), C.amber, t, 12.9, { align: 'center', tr: 10, exit: [14.85, .2] });
    CARDS.forEach(([ic, title, sub], i) => {
      const t0 = 13.05 + i * .14, p = E.outExpo(P(t, t0, t0 + .7)), ex = E.inBack(P(t, 14.85 + i * .05, 15.15 + i * .05), 2);
      if (p <= 0 || ex >= 1) return;
      const cw = PORT ? 900 : 520, ch = PORT ? 330 : 430;
      const x = PORT ? CX : CX + (i - 1) * (cw + 44), y = PORT ? H * .38 + i * (ch + 40) : CY + 70;
      c.save(); c.translate(x, y + (1 - p) * 160); c.scale(1 - ex, (.7 + .3 * p) * (1 - ex)); c.globalAlpha = p;
      c.fillStyle = 'rgba(255,255,255,.045)'; c.strokeStyle = 'rgba(255,255,255,.12)'; c.lineWidth = 1.5;
      c.beginPath(); c.roundRect(-cw / 2, -ch / 2, cw, ch, 18); c.fill(); c.stroke();
      const hl = Math.sin(Math.PI * P(t, 13.95 + i * .25, 14.55 + i * .25));
      if (hl > 0) { c.strokeStyle = rgba(C.amber, .9 * hl); c.lineWidth = 2.5; c.beginPath(); c.roundRect(-cw / 2, -ch / 2, cw, ch, 18); c.stroke(); }
      c.fillStyle = C.amber; c.fillRect(-cw / 2 + 36, -ch / 2, (cw - 72) * E.inOutExpo(P(t, t0 + .2, t0 + .7)), 4);
      const ix = PORT ? -cw / 2 + 110 : -cw / 2 + 92, iy = PORT ? 0 : -ch / 2 + 110;
      c.save(); c.translate(ix, iy); c.scale(.62, .62); icon(c, ic, P(t, t0 + .2, t0 + .9), C.amber, 7); c.restore();
      const tx = PORT ? -cw / 2 + 210 : -cw / 2 + 40, ty = PORT ? -18 : 40;
      c.font = F.head(PORT ? 50 : 42, 800); c.fillStyle = C.white; c.letterSpacing = '0px'; c.fillText(title, tx, ty);
      c.font = F.body(PORT ? 28 : 25, 500); c.fillStyle = C.grey;
      wrap(c, sub, F.body(PORT ? 28 : 25, 500), PORT ? cw - 260 : cw - 80).forEach((ln, j) => c.fillText(ln, tx, ty + (PORT ? 52 : 56) + j * (PORT ? 38 : 36)));
      c.restore();
    });
  }
  vignette(c, .45);
  hud(c, t, true);
}

// ============================================================ SCENE 4 — nationwide
const US = window.US || { dots: [], borders: [], nation: [], arOutline: [], cities: {} };
const MAP = PORT ? { s: .94, x0: (W - 975 * .94) / 2 + 12, y0: 660 } : { s: 1.0, x0: (W - 975) / 2, y0: 262 };
const HUBP = US.cities['LITTLE ROCK'] || [566, 394];
const toS = p => [MAP.x0 + p[0] * MAP.s, MAP.y0 + p[1] * MAP.s];
const CITY_LIST = Object.entries(US.cities).filter(([k]) => k !== 'LITTLE ROCK');
const LABELS = new Set(['NEW YORK', 'LOS ANGELES', 'CHICAGO', 'MIAMI', 'SEATTLE', 'HOUSTON']);
function hubScreen(t) {
  const [x, y] = toS(HUBP), z = mapZoom(t);
  return [CX + (x - CX) * z.k + z.dx, CY + (y - CY) * z.k + z.dy];
}
function mapZoom(t) { const k = 1 + .04 * P(t, 15.2, 20.4); return { k, dx: 0, dy: 0 }; }
function scene4(c, t) {
  paperBg(c, t, .7);
  const hs0 = toS(HUBP);
  const Z = Math.exp(Math.log(10) * E.inCubic(P(t, 20.25, 21.1)));
  c.save();
  c.translate(hs0[0], hs0[1]); c.scale(Z, Z); c.translate(-hs0[0], -hs0[1]);
  const z = mapZoom(t);
  c.translate(CX, CY); c.scale(z.k, z.k); c.translate(-CX, -CY);
  c.save(); c.translate(MAP.x0, MAP.y0); c.scale(MAP.s, MAP.s);
  // nation outline + borders
  const bo = P(t, 15.9, 16.8);
  c.lineJoin = 'round';
  c.strokeStyle = `rgba(16,19,25,${.35 * bo})`; c.lineWidth = 1.4;
  for (const l of US.nation) { c.beginPath(); l.forEach(([x, y], i) => i ? c.lineTo(x, y) : c.moveTo(x, y)); c.stroke(); }
  c.strokeStyle = `rgba(16,19,25,${.1 * bo})`; c.lineWidth = .8;
  for (const l of US.borders) { c.beginPath(); l.forEach(([x, y], i) => i ? c.lineTo(x, y) : c.moveTo(x, y)); c.stroke(); }
  // dots ripple outward from Arkansas
  const ar = P(t, 16.0, 16.6);
  c.fillStyle = 'rgba(16,19,25,.3)'; c.beginPath();
  const amb = [];
  for (const [x, y, isAr] of US.dots) {
    const d = Math.hypot(x - HUBP[0], y - HUBP[1]), q = E.outBack(P(t, 15.35 + d / 700, 15.65 + d / 700), 2);
    if (q <= 0) continue;
    if (isAr && ar > 0) { amb.push([x, y, q]); continue; }
    const r = 2.1 * q; c.moveTo(x + r, y); c.arc(x, y, r, 0, TAU);
  }
  c.fill();
  if (amb.length) {
    c.save(); c.fillStyle = C.amber; c.shadowColor = C.amber; c.shadowBlur = 8; c.globalAlpha = ar;
    c.beginPath(); for (const [x, y, q] of amb) { c.moveTo(x + 2.8, y); c.arc(x, y, 2.8 * q, 0, TAU); } c.fill(); c.restore();
    c.strokeStyle = rgba(C.amberDk, .8 * ar); c.lineWidth = 1.6;
    for (const ring of US.arOutline) { c.beginPath(); ring.forEach(([x, y], i) => i ? c.lineTo(x, y) : c.moveTo(x, y)); c.closePath(); c.stroke(); }
  }
  c.restore();
  // arcs from home base to the nation
  const hs = toS(HUBP);
  CITY_LIST.forEach(([name, p], i) => {
    const t0 = 16.5 + i * .085, q = E.inOutCubic(P(t, t0, t0 + .75));
    if (q <= 0) return;
    const e = toS(p), mx = (hs[0] + e[0]) / 2, my = (hs[1] + e[1]) / 2, d = Math.hypot(e[0] - hs[0], e[1] - hs[1]);
    const ctrl = [mx, my - d * .32];
    const path = cubicPts([[hs, [lerp(hs[0], ctrl[0], .66), lerp(hs[1], ctrl[1], .66)], [lerp(e[0], ctrl[0], .66), lerp(e[1], ctrl[1], .66)], e]], 40);
    c.lineCap = 'round';
    c.strokeStyle = rgba(C.amberDk, .45); c.lineWidth = 1.6; strokeRange(c, path, 0, q);
    c.strokeStyle = C.amber; c.lineWidth = 3.2; const head = strokeRange(c, path, Math.max(0, q - .3), q);
    if (head && q < 1) glowDot(c, head[0], head[1], 16);
    const ap = P(t, t0 + .75, t0 + 1.4);
    if (ap > 0) {
      if (ap < 1) { c.strokeStyle = rgba(C.amber, 1 - ap); c.lineWidth = 2; c.beginPath(); c.arc(e[0], e[1], 4 + 22 * E.outCubic(ap), 0, TAU); c.stroke(); }
      c.fillStyle = C.ink; c.beginPath(); c.arc(e[0], e[1], 4, 0, TAU); c.fill();
      if (LABELS.has(name)) { c.font = F.body(PORT ? 15 : 13, 700); c.letterSpacing = '2px'; c.fillStyle = rgba(C.ink, .7 * clamp(ap * 3)); c.textAlign = 'center'; c.fillText(name, e[0], e[1] - 14); c.textAlign = 'left'; }
    }
  });
  // hub pin
  const pin = clamp(spring(t - 16.1, 8, 18), 0, 1.3);
  if (pin > 0) {
    for (let k = 0; k < 3; k++) { const q = (t * .7 + k / 3) % 1; c.strokeStyle = rgba(C.amber, (1 - q) * .9); c.lineWidth = 2; c.beginPath(); c.arc(hs[0], hs[1], 8 + 46 * q, 0, TAU); c.stroke(); }
    c.save(); c.translate(hs[0], hs[1] - 6); c.scale(pin * .42, pin * .42); c.translate(0, -66);
    c.fillStyle = C.ink; c.beginPath(); c.moveTo(0, 66); c.bezierCurveTo(-30, 26, -54, 0, -54, -24); c.arc(0, -24, 54, Math.PI, 0); c.bezierCurveTo(54, 0, 30, 26, 0, 66); c.fill();
    c.fillStyle = C.amber; c.beginPath(); c.arc(0, -24, 22, 0, TAU); c.fill(); c.restore();
    const lp = E.inOutExpo(P(t, 16.4, 16.9));
    if (lp > 0) {
      const lx = hs[0] + 40, lyy = hs[1] + (PORT ? 96 : 84);
      c.strokeStyle = C.ink; c.lineWidth = 1.5; c.beginPath(); c.moveTo(hs[0], hs[1] + 8); c.lineTo(hs[0] + 40 * lp, lyy - 10 * lp); c.stroke();
      decodeText(c, 'ARKANSAS  ·  HOME BASE', lx + 8, lyy, F.body(PORT ? 18 : 15, 700), C.ink, t, 16.6, { tr: 3, dur: .5 });
    }
  }
  c.restore();

  // copy
  const ts = PORT ? fit(c, 'BASED IN ARKANSAS.', s => F.head(s, 900), 960, 108) : 76;
  const t2 = PORT ? fit(c, 'SERVING CLIENTS NATIONWIDE.', s => F.head(s, 900), 960, 80) : 76;
  const ex = [20.15, .25];
  if (PORT) {
    riseText(c, 'BASED IN ARKANSAS.', CX, 360, ts, F.head(ts, 900), C.ink, t, 15.5, { align: 'center', exit: ex, colors: (ch, i) => i >= 9 ? C.amberDk : null });
    riseText(c, 'SERVING CLIENTS NATIONWIDE.', CX, 360 + ts * 1.1, t2, F.head(t2, 900), C.ink, t, 15.75, { align: 'center', stagger: .018, exit: ex });
  } else {
    riseText(c, 'BASED IN ARKANSAS.', CX, 150, ts, F.head(ts, 900), C.ink, t, 15.5, { align: 'center', exit: ex, colors: (ch, i) => i >= 9 ? C.amberDk : null });
    riseText(c, 'SERVING CLIENTS NATIONWIDE.', CX, 230, 44, F.head(44, 800), C.greyDk, t, 15.75, { align: 'center', tr: 6, stagger: .015, exit: ex });
  }
  const qy = PORT ? MAP.y0 + 610 * MAP.s + 170 : 960;
  if (PORT) {
    fadeText(c, 'Distance is not a barrier to', CX, qy, F.serif(70), C.amberDk, t, 18.3, { align: 'center', exit: 20.15 });
    fadeText(c, 'quality representation.', CX, qy + 76, F.serif(70), C.amberDk, t, 18.45, { align: 'center', exit: 20.15 });
  } else fadeText(c, 'Distance is not a barrier to quality representation.', CX, qy, F.serif(52), C.amberDk, t, 18.3, { align: 'center', exit: 20.15 });
  hud(c, t, false);
}

// ============================================================ SCENE 5 — values
const VALUES = [
  ['ATTORNEY-LED', 'REPRESENTATION', 'Every case is personally overseen by a licensed immigration attorney.', 'scales'],
  ['MISSION-DRIVEN', 'APPROACH', 'Humanitarian immigration, because everyone deserves safety and dignity.', 'heart'],
  ['TRAUMA-INFORMED', 'INTAKE', 'Designed with care, sensitivity, and respect for your boundaries.', 'shelter'],
  ['NATIONWIDE', 'SERVICE', 'Based in Arkansas. Serving clients across the entire United States.', 'pin'],
];
const VT = [21.15, 22.35, 23.55, 24.75];
const RAIL = PORT ? { x0: 190, x1: W - 190, y: H * .8 } : { x0: W * .28, x1: W * .72, y: H - 175 };
function scene5(c, t) {
  darkBg(c, PORT ? CX : W * .3, CY);
  bokeh(c, t, .7); dust(c, t, .5);
  decodeText(c, 'OUR VALUES', CX, PORT ? 300 : 150, F.body(PORT ? 22 : 18, 700), C.amberLt, t, 21.05, { align: 'center', tr: 10, exit: 25.95 });
  VALUES.forEach(([a, b, desc, ic], i) => {
    const t0 = VT[i], t1 = i < 3 ? VT[i + 1] - .12 : 25.9;
    if (t < t0 - .05 || t > t1 + .4) return;
    const ex = [t1, .22];
    const out = P(t, t1, t1 + .3);
    // icon disc
    const ix = PORT ? CX : W * .25, iy = PORT ? H * .33 : CY - 30, R = PORT ? 170 : 165;
    const dp = E.outBack(P(t, t0, t0 + .5), 1.6) * (1 - E.inBack(out, 2));
    if (dp > 0) {
      c.save(); c.translate(ix, iy); c.scale(dp, dp);
      c.fillStyle = 'rgba(255,255,255,.04)'; c.beginPath(); c.arc(0, 0, R, 0, TAU); c.fill();
      c.strokeStyle = rgba(C.amber, .35); c.lineWidth = 1.5; c.setLineDash([4, 10]); c.lineDashOffset = -t * 20; c.beginPath(); c.arc(0, 0, R + 18, 0, TAU); c.stroke(); c.setLineDash([]);
      c.strokeStyle = C.amber; c.lineWidth = 3; c.beginPath(); c.arc(0, 0, R, -Math.PI / 2, -Math.PI / 2 + TAU * E.inOutCubic(P(t, t0, t0 + .9))); c.stroke();
      c.scale(1.25, 1.25); icon(c, ic, E.inOutCubic(P(t, t0 + .1, t0 + .9)), C.amberLt, 5);
      c.restore();
    }
    const num = `0${i + 1}`;
    if (PORT) {
      const s1 = fit(c, a, s => F.head(s, 900), 940, 128), s2 = fit(c, b, s => F.head(s, 900), 940, 128), ss = Math.min(s1, s2);
      fadeText(c, num, CX, H * .5, F.head(40, 800), C.amber, t, t0, { align: 'center', exit: t1 });
      riseText(c, a, CX, H * .5 + 20 + ss, ss, F.head(ss, 900), C.white, t, t0 + .05, { align: 'center', exit: ex, stagger: .02 });
      riseText(c, b, CX, H * .5 + 20 + ss * 2.02, ss, F.head(ss, 900), C.amber, t, t0 + .12, { align: 'center', exit: ex, stagger: .02 });
      wrap(c, desc, F.body(36, 500), 860).forEach((ln, j) => fadeText(c, ln, CX, H * .5 + 90 + ss * 2.02 + j * 50, F.body(36, 500), C.grey, t, t0 + .3 + j * .06, { align: 'center', exit: t1 }));
    } else {
      const x = W * .43, ss = Math.min(fit(c, a, s => F.head(s, 900), 920, 118), fit(c, b, s => F.head(s, 900), 920, 118));
      fadeText(c, num, x, CY - 165, F.head(36, 800), C.amber, t, t0, { exit: t1 });
      riseText(c, a, x, CY - 150 + ss, ss, F.head(ss, 900), C.white, t, t0 + .05, { exit: ex, stagger: .02 });
      riseText(c, b, x, CY - 150 + ss * 2.02, ss, F.head(ss, 900), C.amber, t, t0 + .12, { exit: ex, stagger: .02 });
      wrap(c, desc, F.body(30, 500), 820).forEach((ln, j) => fadeText(c, ln, x, CY - 150 + ss * 2.02 + 70 + j * 42, F.body(30, 500), C.grey, t, t0 + .3 + j * .06, { exit: t1 }));
    }
  });
  // progress rail (the way)
  const ra = P(t, 21.1, 21.5) * (1 - P(t, 25.85, 26.1));
  if (ra > 0) {
    c.save(); c.globalAlpha = ra;
    c.fillStyle = 'rgba(255,255,255,.14)'; c.fillRect(RAIL.x0, RAIL.y - 1.5, RAIL.x1 - RAIL.x0, 3);
    const segs = VT.map((tt, i) => [tt, RAIL.x0 + (RAIL.x1 - RAIL.x0) * i / 3]);
    let fx = RAIL.x0; for (let i = 1; i < segs.length; i++) fx = lerp(fx, segs[i][1], 0) || fx;
    let fillX = RAIL.x0;
    for (let i = 1; i < 4; i++) if (t > VT[i] - .4) fillX = lerp(RAIL.x0 + (RAIL.x1 - RAIL.x0) * (i - 1) / 3, RAIL.x0 + (RAIL.x1 - RAIL.x0) * i / 3, E.inOutCubic(P(t, VT[i] - .4, VT[i])));
    c.fillStyle = C.amber; c.fillRect(RAIL.x0, RAIL.y - 2, fillX - RAIL.x0, 4);
    VT.forEach((tt, i) => {
      const x = RAIL.x0 + (RAIL.x1 - RAIL.x0) * i / 3, on = clamp(spring(t - tt, 9, 18), 0, 1.3);
      c.fillStyle = '#141920'; c.strokeStyle = rgba(C.white, .35); c.lineWidth = 2; c.beginPath(); c.arc(x, RAIL.y, 11, 0, TAU); c.fill(); c.stroke();
      if (on > 0) { c.fillStyle = C.amber; c.beginPath(); c.arc(x, RAIL.y, 11 * on, 0, TAU); c.fill(); }
      c.font = F.body(PORT ? 18 : 14, 700); c.letterSpacing = '3px'; c.textAlign = 'center'; c.fillStyle = t >= tt ? C.amberLt : 'rgba(255,255,255,.35)';
      c.fillText(`0${i + 1}`, x, RAIL.y + (PORT ? 50 : 40)); c.textAlign = 'left';
    });
    c.restore();
  }
  fadeText(c, '501(c)(3) NONPROFIT  ·  BASED IN ARKANSAS', CX, RAIL.y + (PORT ? 130 : 95), F.body(PORT ? 20 : 15, 700), rgba(C.white, .55), t, 25.3, { align: 'center', tr: 5, exit: 25.9 });
  vignette(c, .5);
  hud(c, t, true);
}

// ============================================================ SCENE 6 — identity + call to action
const BUTTONS = [['Free Case Review', true], ['Schedule a Strategy Consultation', false]];
function lockup(t) {
  // returns positions for emblem / wordmark given the time (moves up for CTA)
  const m = E.inOutExpo(P(t, 28.45, 29.1));
  if (PORT) {
    const s = lerp(1, .82, m), cy = lerp(H * .4, H * .25, m);
    return { s, cx: CX, cy };
  }
  const s = lerp(1, .82, m), cy = lerp(CY, H * .3, m);
  return { s, cx: CX, cy };
}
function scene6(c, t) {
  paperBg(c, t, .8);
  const Lk = lockup(t);
  const wmSize = PORT ? 150 : 140, R = PORT ? 160 : 118;
  const wf = F.head(wmSize, 800), wm = 'Anaya’s Way', { xs, total: ww } = charPos(c, wm, wf);
  c.save(); c.translate(Lk.cx, Lk.cy); c.scale(Lk.s, Lk.s);
  let ex, ey, wx, wy, iy;
  if (PORT) { ex = 0; ey = -190; wx = -ww / 2; wy = 120; iy = 190; }
  else { const tot = R * 2 + 56 + ww; ex = -tot / 2 + R; ey = 0; wx = ex + R + 56; wy = 30; iy = 92; }
  c.save(); c.translate(ex, ey); c.scale(R / 100, R / 100); drawEmblem(c, t, 26.15); c.restore();
  // wordmark
  c.save(); c.beginPath(); c.rect(wx - 40, wy - wmSize * 1.05, ww + 80, wmSize * 1.32); c.clip();
  c.font = wf; c.letterSpacing = '0px'; c.fillStyle = C.ink;
  for (let i = 0; i < wm.length; i++) {
    const s = 27.15 + i * .035, p = E.outBack(P(t, s, s + .45), 1.3);
    if (p > 0) c.fillText(wm[i], wx + xs[i], wy + (1 - p) * wmSize * 1.2);
  }
  c.restore();
  // IMMIGRATION tracked to the wordmark width
  const ip = P(t, 27.6, 28.3);
  if (ip > 0) {
    const isz = PORT ? 30 : 27, f = F.body(isz, 600);
    c.save(); c.font = f; c.letterSpacing = '0px';
    const base = c.measureText('IMMIGRATION').width, trEnd = (ww - base) / 10, tr = lerp(trEnd * 2.2, trEnd, E.outExpo(ip));
    const tot = base + tr * 10, x0 = wx + ww / 2 - tot / 2;
    let x = x0;
    for (const ch of 'IMMIGRATION') { c.globalAlpha = clamp(ip * 2); c.fillStyle = C.ink; c.fillText(ch, x, wy + iy - 30); x += c.measureText(ch).width + tr; }
    c.restore();
  }
  // the way — amber underline swoosh
  const sw = E.inOutCubic(P(t, 27.85, 28.45));
  if (sw > 0) {
    const yU = wy + iy;
    const path = cubicPts([[[wx - 10, yU + 4], [wx + ww * .3, yU + 26], [wx + ww * .7, yU - 14], [wx + ww + 20, yU + 6]]]);
    c.strokeStyle = C.amber; c.lineWidth = 7; c.lineCap = 'round';
    const h = strokeRange(c, path, 0, sw); if (h && sw < 1) glowDot(c, h[0], h[1], 22);
  }
  c.restore();

  // call to action
  const by = PORT ? H * .58 : H * .62;
  BUTTONS.forEach(([label, primary], i) => {
    const t0 = 28.75 + i * .14, p = E.outExpo(P(t, t0, t0 + .6));
    if (p <= 0) return;
    const f = F.head(PORT ? 40 : 30, 700);
    c.save(); c.font = f; const tw = c.measureText(label).width; c.restore();
    const bw = tw + (PORT ? 120 : 90), bh = PORT ? 116 : 84;
    let x, y;
    if (PORT) { x = CX; y = by + i * (bh + 34); }
    else { const w0 = (charPos(c, BUTTONS[0][0], f).total + 90), w1 = (charPos(c, BUTTONS[1][0], f).total + 90), gap = 30, tot = w0 + w1 + gap; x = CX - tot / 2 + (i ? w0 + gap + w1 / 2 : w0 / 2); y = by; }
    let s = 1;
    if (primary) { const k = t - 29.65; if (k > 0) s = 1 - .07 * Math.exp(-k * 9) * Math.cos(k * 22) * (k < .05 ? k / .05 : 1); }
    c.save(); c.translate(x, y + (1 - p) * 60); c.scale(s, s); c.globalAlpha = p;
    c.beginPath(); c.roundRect(-bw / 2, -bh / 2, bw, bh, 10);
    if (primary) { c.fillStyle = C.ink; c.fill(); c.shadowColor = 'rgba(0,0,0,.2)'; } else { c.strokeStyle = C.ink; c.lineWidth = 2.5; c.stroke(); }
    if (primary && t > 29.65 && t < 30.6) { const q = P(t, 29.65, 30.6); c.save(); c.strokeStyle = rgba(C.amber, 1 - q); c.lineWidth = 4; c.beginPath(); c.roundRect(-bw / 2 - 30 * q, -bh / 2 - 30 * q, bw + 60 * q, bh + 60 * q, 10 + 30 * q); c.stroke(); c.restore(); }
    if (primary) {
      const rp = P(t, 29.65, 30.4);
      if (rp > 0 && rp < 1) { c.save(); c.clip(); c.fillStyle = `rgba(255,255,255,${.22 * (1 - rp)})`; c.beginPath(); c.arc(0, 0, 40 + bw * E.outCubic(rp), 0, TAU); c.fill(); c.restore(); }
    }
    c.font = f; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = primary ? C.white : C.ink; c.fillText(label, 0, 2);
    c.restore();
    if (primary) {
      // cursor flies in and clicks
      const cp = E.outCubic(P(t, 29.05, 29.62)), ca = P(t, 29.0, 29.2) * (1 - P(t, 30.6, 30.9));
      if (ca > 0) {
        const sx = PORT ? W + 80 : W + 100, sy = PORT ? H * .82 : H * .95;
        const px = lerp(sx, x + bw * .18, cp), py = lerp(sy, y + bh * .12, cp) - Math.sin(Math.PI * cp) * 80;
        const cs = t > 29.63 && t < 29.75 ? .86 : 1;
        c.save(); c.globalAlpha = ca; c.translate(px, py); c.scale(cs * (PORT ? 1.6 : 1.3), cs * (PORT ? 1.6 : 1.3));
        c.fillStyle = C.white; c.strokeStyle = C.ink; c.lineWidth = 2; c.lineJoin = 'round';
        c.beginPath(); c.moveTo(0, 0); c.lineTo(0, 28); c.lineTo(7, 21); c.lineTo(12, 33); c.lineTo(17, 31); c.lineTo(12, 19); c.lineTo(21, 19); c.closePath(); c.fill(); c.stroke();
        c.restore();
      }
    }
  });
  const ty = PORT ? by + 2 * 150 + 40 : by + 100;
  fadeText(c, 'No obligation. No pressure.', CX, ty, F.serif(PORT ? 64 : 48), C.amberDk, t, 30.0, { align: 'center' });
  riseText(c, 'anayaswayimmigration.org', CX, ty + (PORT ? 110 : 80), PORT ? 56 : 42, F.head(PORT ? 56 : 42, 800), C.ink, t, 30.2, { align: 'center', stagger: .012 });
  const up = E.inOutExpo(P(t, 30.5, 31.0)), uw = charPos(c, 'anayaswayimmigration.org', F.head(PORT ? 56 : 42, 800)).total;
  if (up > 0) { c.fillStyle = C.amber; c.fillRect(CX - uw / 2, ty + (PORT ? 130 : 96), uw * up, 4); }
  fadeText(c, '501(c)(3) nonprofit  ·  Based in Arkansas  ·  Nationwide representation', CX, H - (PORT ? 190 : 108), F.body(PORT ? 22 : 17, 600), rgba(C.ink, .6), t, 30.45, { align: 'center' });
  fadeText(c, 'Attorney advertising. Prior results do not guarantee similar outcomes.', CX, H - (PORT ? 140 : 72), F.body(PORT ? 19 : 14, 500), rgba(C.ink, .45), t, 30.55, { align: 'center' });
  hud(c, t, false);
}

// ============================================================ master timeline
function scene2At(t) { return c => scene2(c, t); }
function render(c, t) {
  c.setTransform(1, 0, 0, 1, 0, 0);
  c.globalAlpha = 1; c.globalCompositeOperation = 'source-over'; c.shadowBlur = 0;
  const [sx, sy] = shake(t);
  c.translate(CX + sx, CY + sy); c.scale(1.012, 1.012); c.translate(-CX, -CY);
  if (t < 3.95) scene1(c, t);
  else if (t < 4.75) { scene1(c, t); brushWipe(c, t, 3.95, .8, l => { const [a, b] = shake(t); l.setTransform(1.012, 0, 0, 1.012, CX * -.012 + a, CY * -.012 + b); scene2(l, t); }); }
  else if (t < 8.55) scene2(c, t);
  else if (t < 9.2) whip(c, t, 8.55, .6, cc => scene2(cc, t), cc => scene3(cc, t));
  else if (t < 15.0) scene3(c, t);
  else if (t < 15.65) { scene3(c, t); const hs = hubScreen(t); iris(c, hs[0], hs[1], Math.hypot(W, H) * E.inOutExpo(P(t, 15.0, 15.6)), cc => scene4(cc, t)); }
  else if (t < 20.55) scene4(c, t);
  else if (t < 21.2) { scene4(c, t); const hs = toS(HUBP); iris(c, hs[0], hs[1], Math.hypot(W, H) * E.inOutExpo(P(t, 20.55, 21.15)), cc => scene5(cc, t)); }
  else if (t < 26.0) scene5(c, t);
  else if (t < 26.7) { scene5(c, t); iris(c, CX, lockup(t).cy, Math.hypot(W, H) * E.inOutExpo(P(t, 26.0, 26.65)), cc => scene6(cc, t), C.ink); }
  else scene6(c, t);
}

// ------------------------------------------------------------ output
const grains = Array.from({ length: 4 }, (_, k) => {
  const g = document.createElement('canvas'); g.width = g.height = 256;
  const gc = g.getContext('2d'), id = gc.createImageData(256, 256), r = rng(100 + k);
  for (let i = 0; i < id.data.length; i += 4) { const v = r() * 255 | 0; id.data[i] = id.data[i + 1] = id.data[i + 2] = v; id.data[i + 3] = 255; }
  gc.putImageData(id, 0, 0); return g;
});
const shutterAt = t => (t > 8.55 && t < 9.2) ? 3 : 1;
function frame(t, sub = 1, shutter = 0) {
  octx.setTransform(1, 0, 0, 1, 0, 0);
  const sh = shutter * shutterAt(t);
  if (sub > 1) sub *= shutterAt(t) > 1 ? 4 : 1;
  for (let i = 0; i < sub; i++) {
    const ti = clamp(t + (sub > 1 ? ((i + .5) / sub - .5) * sh : 0), 0, DUR - 1e-4);
    render(ctx, ti);
    octx.globalAlpha = 1 / (i + 1); octx.globalCompositeOperation = 'source-over'; octx.drawImage(work, 0, 0);
  }
  const fr = Math.floor(t * 24);
  octx.save(); octx.globalCompositeOperation = 'overlay'; octx.globalAlpha = .05;
  octx.translate((fr * 37) % 256, (fr * 91) % 256); octx.fillStyle = octx.createPattern(grains[fr % 4], 'repeat'); octx.fillRect(-256, -256, W + 512, H + 512);
  octx.restore(); octx.globalAlpha = 1;
}
async function init() {
  await Promise.all([F.head(100, 900), F.head(100, 800), F.head(100, 700), F.body(20, 500), F.body(20, 600), F.body(20, 700), F.serif(60)].map(f => document.fonts.load(f)));
  await document.fonts.ready;
  s1Size = Math.min(...S1.map(([s]) => fit(ctx, s, sz => F.head(sz, 850), PORT ? 960 : 1600, PORT ? 150 : 124)));
  window.__ready = true;
}
window.renderFrame = (t, sub = 4, shutter = .5 / 60) => frame(t, sub, shutter);
window.DURATION = DUR; window.SIZE = [W, H];
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
