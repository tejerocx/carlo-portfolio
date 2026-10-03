/* AVC Immigration Consultants — Dubai · 24s motion showreel.
 * Fully procedural, frame-accurate canvas animation.
 *   - Open index.html (via a static server) for a live preview; click to restart, ?t=12 to freeze.
 *   - render.cjs drives window.renderFrame(t) headlessly to export the MP4.
 */
(() => {
'use strict';

const W = 1920, H = 1080, DUR = 24;
const C = {
  navy: '#0B1D45', navyDk: '#050E26', navyLt: '#16306A', ink: '#0A1838',
  gold: '#D4A940', goldLt: '#F6DD94', goldDk: '#9A7426', cream: '#F4EEDF',
  ivory: '#FAF8F3', white: '#FFFFFF',
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
  inOutSine: x => -(Math.cos(Math.PI * x) - 1) / 2,
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

// ------------------------------------------------------------ gold material
/** Vertical metallic gold between y0 (top) and y1 (bottom). */
function goldV(c, y0, y1) {
  const g = c.createLinearGradient(0, y0, 0, y1);
  g.addColorStop(0, '#FFF0B8'); g.addColorStop(.28, '#E8C35E'); g.addColorStop(.5, '#A8791F');
  g.addColorStop(.62, '#C99A35'); g.addColorStop(.85, '#F3D37E'); g.addColorStop(1, '#B4862A');
  return g;
}
/** A moving specular band centred at x (transparent outside). */
function shineBand(c, x, w = 260, a = .85) {
  const g = c.createLinearGradient(x - w, 0, x + w, 0);
  g.addColorStop(0, 'rgba(255,250,230,0)'); g.addColorStop(.5, `rgba(255,250,230,${a})`); g.addColorStop(1, 'rgba(255,250,230,0)');
  return g;
}

// ------------------------------------------------------------ type
const F = {
  cin: (s, w = 700) => `${w} ${s}px 'Cinzel'`,
  cor: s => `italic 500 ${s}px 'Cormorant'`,
  mont: (s, w = 600) => `${w} ${s}px 'Montserrat'`,
};
const posCache = new Map();
function charPos(c, str, f, tr = 0) {
  const k = f + '|' + str + '|' + tr;
  let v = posCache.get(k);
  if (v) return v;
  c.save(); c.font = f; c.letterSpacing = tr + 'px';
  const xs = [];
  for (let i = 0; i < str.length; i++) xs.push(c.measureText(str.slice(0, i + 1)).width - c.measureText(str[i]).width);
  const m = c.measureText(str);
  v = { xs, total: m.width - tr };
  c.restore(); posCache.set(k, v);
  return v;
}
/** Letters rise through a mask (optionally exit upward). `fill` may be a colour or gradient. */
function riseText(c, str, x, y, size, f, fill, t, t0, o = {}) {
  const { stagger = .03, dur = .6, align = 'left', tr = 0, exit = null, ease = E.outExpo, mask = true, shine = null, alpha = 1, glow = 0 } = o;
  if (t < t0) return;
  const { xs, total } = charPos(c, str, f, tr);
  const x0 = align === 'center' ? x - total / 2 : align === 'right' ? x - total : x;
  const pass = style => {
    for (let i = 0; i < str.length; i++) {
      if (str[i] === ' ') continue;
      const s = t0 + i * stagger;
      let dy = (1 - ease(P(t, s, s + dur))) * size * 1.15;
      if (exit) { const e0 = exit[0] + i * stagger * .5; dy -= E.inExpo(P(t, e0, e0 + exit[1])) * size * 1.15; }
      c.fillStyle = style; c.fillText(str[i], x0 + xs[i], y + dy);
    }
  };
  c.save(); c.font = f; c.letterSpacing = '0px'; c.globalAlpha *= alpha;
  if (mask) { c.beginPath(); c.rect(x0 - size, y - size * 1.05, total + size * 2, size * 1.35); c.clip(); }
  if (glow) { c.shadowColor = rgba(C.gold, .5); c.shadowBlur = glow; }
  pass(fill);
  c.shadowBlur = 0;
  if (shine !== null) pass(shineBand(c, lerp(x0 - 300, x0 + total + 300, shine)));
  c.restore();
}
/** Tracking-in fade (luxury style): letters converge from wide spacing. */
function trackText(c, str, x, y, f, fill, t, t0, o = {}) {
  const { dur = .9, tr0 = 60, tr1 = 8, align = 'center', alpha = 1 } = o;
  const p = P(t, t0, t0 + dur);
  if (p <= 0) return;
  const e = E.outExpo(p), tr = lerp(tr0, tr1, e);
  const { xs, total } = charPos(c, str, f, Math.round(tr));
  const x0 = align === 'center' ? x - total / 2 : x;
  c.save(); c.font = f; c.letterSpacing = '0px'; c.fillStyle = fill;
  for (let i = 0; i < str.length; i++) {
    const d = Math.abs(i - (str.length - 1) / 2) / (str.length / 2);
    c.globalAlpha = alpha * clamp(p * 2.2 - d * .6);
    c.fillText(str[i], x0 + xs[i], y);
  }
  c.restore();
}
function fadeText(c, str, x, y, f, fill, t, t0, o = {}) {
  const { dur = .6, align = 'left', tr = 0, exit = null, rise = 18 } = o;
  let a = E.outCubic(P(t, t0, t0 + dur));
  if (exit) a *= 1 - P(t, exit, exit + .3);
  if (a <= 0) return;
  c.save(); c.font = f; c.letterSpacing = tr + 'px'; c.textAlign = align; c.fillStyle = fill; c.globalAlpha *= a;
  c.fillText(str, x, y + (1 - a) * rise); c.restore();
}
const GLYPHS = 'ABCDEFGHJKLMNPQRSTUVWXYZ0123456789';
function decodeText(c, str, x, y, f, color, t, t0, o = {}) {
  const { dur = .7, align = 'left', tr = 3, exit = null } = o;
  if (t < t0) return;
  let a = 1; if (exit) a *= 1 - P(t, exit, exit + .25);
  if (a <= 0) return;
  const n = str.length, p = P(t, t0, t0 + dur), frame = Math.floor(t * 30);
  let s = '';
  for (let i = 0; i < n; i++) {
    const ap = i / n * .55, lock = ap + .45;
    if (p < ap) s += ' ';
    else if (p < lock && str[i] !== ' ') s += GLYPHS[Math.floor(hash(i, frame) * GLYPHS.length)];
    else s += str[i];
  }
  c.save(); c.font = f; c.letterSpacing = tr + 'px'; c.fillStyle = color; c.globalAlpha *= a; c.textAlign = align;
  c.fillText(s.replace(/\s+$/, ''), x, y); c.restore();
}

// ------------------------------------------------------------ shared fx
const impacts = [[.4, 2], [1.35, 2], [2.2, 7], [6.1, 3], [15.0, 12], [18.55, 9], [21.75, 3]];
function shake(t) {
  let x = 0, y = 0;
  for (const [ti, a] of impacts) {
    const d = t - ti; if (d < 0 || d > .6) continue;
    const env = a * Math.exp(-d * 11);
    x += env * Math.sin(d * 83 + ti * 7); y += env * Math.cos(d * 71 + ti * 3);
  }
  return [x, y];
}
const BOKEH = (() => { const r = rng(11); return Array.from({ length: 34 }, () => ({ x: r(), y: r(), z: r(), ph: r() * TAU })); })();
const DUST = (() => { const r = rng(7); return Array.from({ length: 160 }, () => ({ x: r(), y: r(), z: r(), ph: r() * TAU })); })();
function bokeh(c, t, a = 1) {
  c.save(); c.globalCompositeOperation = 'lighter';
  for (const p of BOKEH) {
    const z = .3 + p.z * .7, r = 18 + 60 * z;
    const x = (p.x * (W + 200) + t * 18 * z) % (W + 200) - 100, y = p.y * H + Math.sin(t * .5 + p.ph) * 30;
    const g = c.createRadialGradient(x, y, 0, x, y, r);
    const al = a * .07 * (.5 + .5 * Math.sin(t * 1.3 + p.ph));
    g.addColorStop(0, rgba(C.goldLt, al)); g.addColorStop(.7, rgba(C.gold, al * .6)); g.addColorStop(1, rgba(C.gold, 0));
    c.fillStyle = g; c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill();
  }
  c.restore();
}
function dust(c, t, a = 1, col = C.goldLt) {
  c.save(); c.fillStyle = col;
  for (const p of DUST) {
    const z = .25 + p.z * .75;
    const x = ((p.x * W + Math.sin(t * .4 + p.ph) * 40 * z + t * 10 * z) % W + W) % W;
    const y = ((p.y * H - t * 22 * z) % H + H) % H;
    c.globalAlpha = a * (.1 + .4 * z) * (.6 + .4 * Math.sin(t * 2.3 + p.ph));
    c.beginPath(); c.arc(x, y, .5 + 1.6 * z, 0, TAU); c.fill();
  }
  c.restore();
}
function darkBg(c, cx = W / 2, cy = H / 2) {
  const g = c.createRadialGradient(cx, cy, 0, cx, cy, 1300);
  g.addColorStop(0, '#132B5E'); g.addColorStop(.5, '#0A1A40'); g.addColorStop(1, '#02060F');
  c.fillStyle = g; c.fillRect(-60, -60, W + 120, H + 120);
}
function vignette(c, a = .55) {
  const g = c.createRadialGradient(W / 2, H / 2, H * .35, W / 2, H / 2, H * 1.05);
  g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, `rgba(0,0,0,${a})`);
  c.fillStyle = g; c.fillRect(-60, -60, W + 120, H + 120);
}
function star4(c, x, y, r, a = 1) {
  if (a <= 0 || r <= 0) return;
  c.save(); c.globalCompositeOperation = 'lighter'; c.translate(x, y);
  const g = c.createRadialGradient(0, 0, 0, 0, 0, r * .9);
  g.addColorStop(0, `rgba(255,248,220,${a})`); g.addColorStop(.25, rgba(C.goldLt, .5 * a)); g.addColorStop(1, rgba(C.gold, 0));
  c.fillStyle = g; c.beginPath(); c.arc(0, 0, r * .9, 0, TAU); c.fill();
  c.fillStyle = `rgba(255,250,230,${a})`;
  for (const rot of [0, Math.PI / 2]) {
    c.save(); c.rotate(rot); c.beginPath();
    c.moveTo(-r * 2, 0); c.quadraticCurveTo(0, -r * .06, r * 2, 0); c.quadraticCurveTo(0, r * .06, -r * 2, 0); c.fill(); c.restore();
  }
  c.restore();
}

// ------------------------------------------------------------ Dubai skyline (unit space: baseline y=0, x ∈ [-150,150])
const SKY = [
  [-142, 14, 48, 'block'], [-126, 18, 74, 'step'], [-108, 14, 60, 'block'], [-92, 18, 118, 'twin'], [-74, 16, 102, 'twin'],
  [-57, 20, 70, 'block'], [-40, 14, 138, 'spire'], [-25, 16, 92, 'step'], [0, 30, 205, 'burj'], [24, 16, 108, 'step'],
  [40, 13, 128, 'spire'], [56, 18, 84, 'block'], [76, 28, 150, 'sail'], [99, 14, 74, 'step'], [114, 16, 98, 'spire'],
  [131, 15, 58, 'block'], [146, 11, 42, 'block'],
];
function bldPath(c, b) {
  const [x, w, h, type] = b, l = x - w / 2, r = x + w / 2;
  c.beginPath();
  switch (type) {
    case 'block': c.rect(l, -h, w, h); c.rect(x - w * .2, -h - 6, w * .4, 6); break;
    case 'step': c.rect(l, -h * .72, w, h * .72); c.rect(l + w * .18, -h, w * .64, h * .28 + 1); break;
    case 'twin': c.moveTo(l, 0); c.lineTo(l, -h * .86); c.lineTo(r, -h); c.lineTo(r, 0); c.closePath(); break;
    case 'spire': c.rect(l, -h * .88, w, h * .88); c.moveTo(x - w * .32, -h * .88); c.lineTo(x, -h * 1.02); c.lineTo(x + w * .32, -h * .88); c.closePath(); c.rect(x - .8, -h * 1.12, 1.6, h * .12); break;
    case 'burj': {
      const tiers = [[1, .0, .3], [.8, .3, .5], [.62, .5, .66], [.46, .66, .79], [.32, .79, .89], [.2, .89, .96]];
      for (const [k, a, bb] of tiers) c.rect(x - w * k / 2, -h * bb, w * k, h * (bb - a) + 1);
      c.moveTo(x - w * .1, -h * .96); c.lineTo(x, -h * 1.17); c.lineTo(x + w * .1, -h * .96); c.closePath();
      break;
    }
    case 'sail':
      c.moveTo(l, 0); c.lineTo(l, -h); c.quadraticCurveTo(r + w * .55, -h * .52, r, 0); c.closePath();
      c.rect(l - 1.2, -h * 1.12, 2.4, h * .12); break;
  }
}
const bldDelay = b => (1 - Math.abs(b[0]) / 150) * .55 + (b[3] === 'burj' ? .12 : 0);
/** Draw the skyline growing from its baseline. p0 = start time, dur = total rise duration. */
function drawSkyline(c, t, t0, dur, fill, o = {}) {
  const { windows = false, edge = null } = o;
  c.save(); c.beginPath(); c.rect(-400, -600, 800, 600.5); c.clip();
  for (const b of SKY) {
    const s = t0 + bldDelay(b) * dur, p = E.outBack(P(t, s, s + dur * .45), 1.2);
    if (p <= 0) continue;
    const h = b[2] * (b[3] === 'burj' ? 1.2 : 1.15);
    c.save(); c.translate(0, (1 - p) * h);
    bldPath(c, b); c.fillStyle = fill; c.fill();
    if (windows && b[1] > 12) {
      c.save(); bldPath(c, b); c.clip();
      c.strokeStyle = rgba(C.navyDk, .14); c.lineWidth = .6;
      c.beginPath(); for (let y = -5; y > -b[2] * 1.2; y -= 9) { c.moveTo(b[0] - b[1], y); c.lineTo(b[0] + b[1], y); } c.stroke();
      c.strokeStyle = rgba('#FFF4D0', .35); c.beginPath(); c.moveTo(b[0] - b[1] * .5 + 1.5, 0); c.lineTo(b[0] - b[1] * .5 + 1.5, -b[2] * 1.2); c.stroke();
      c.restore();
    }
    if (edge) { c.strokeStyle = edge; c.lineWidth = 1; bldPath(c, b); c.stroke(); }
    c.restore();
  }
  c.restore();
}

// ------------------------------------------------------------ globe
const v3 = (la, lo) => { const p = la * D2R, l = lo * D2R; return [Math.cos(p) * Math.sin(l), Math.sin(p), Math.cos(p) * Math.cos(l)]; };
const DOTS = (window.GLOBE_DOTS || []).map(([la, lo]) => v3(la, lo));
const HUB = v3(25.2, 55.27);
const CITIES = [[43.65, -79.38], [51.5, -0.13], [-33.87, 151.2], [52.5, 13.4], [40.7, -74.0], [14.6, 121.0], [19.1, 72.9], [30.0, 31.2], [-36.85, 174.76], [38.7, -9.1], [1.35, 103.8], [-26.2, 28.05]].map(([a, b]) => v3(a, b));
function globeState(t) {
  const k = E.inOutCubic(P(t, 7.2, 10.6));
  return { lon: lerp(118, 52, k) * D2R, lat: lerp(-4, 20, k) * D2R, R: 400 * lerp(.85, 1, E.outExpo(P(t, 7.2, 8.6))), cx: 1340, cy: 560 };
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

// ------------------------------------------------------------ HUD
const CHAPTERS = [[0, 'I  ·  PROLOGUE'], [3.76, 'II  ·  DUBAI'], [7.86, 'III  ·  THE WORLD'], [11.91, 'IV  ·  THE PROCESS'], [17.0, 'V  ·  THE MARK']];
function hud(c, t, dark) {
  const a = P(t, .2, .7) * (1 - P(t, 20.9, 21.4));
  if (a <= 0) return;
  const col = dark ? '230,200,130' : '11,29,69';
  c.save(); c.globalAlpha *= a;
  c.strokeStyle = `rgba(${col},.5)`; c.lineWidth = 1.5;
  const m = 46, L = 22;
  for (const [x, y, sx, sy] of [[m, m, 1, 1], [W - m, m, -1, 1], [m, H - m, 1, -1], [W - m, H - m, -1, -1]]) {
    c.beginPath(); c.moveTo(x, y + sy * L); c.lineTo(x, y); c.lineTo(x + sx * L, y); c.stroke();
  }
  c.font = F.mont(13, 600); c.letterSpacing = '4px'; c.fillStyle = `rgba(${col},.75)`;
  c.fillText('AVC  —  DUBAI', 92, 88);
  c.textAlign = 'right'; c.fillText('SHOWREEL  MMXXVI', W - 92, 88);
  let label = CHAPTERS[0][1]; for (const [s, l] of CHAPTERS) if (t >= s) label = l;
  c.fillText(label, W - 92, H - 80);
  c.textAlign = 'left';
  const fr = Math.floor(t * 60);
  c.fillText(`TC 00:00:${String(Math.floor(fr / 60)).padStart(2, '0')}:${String(fr % 60).padStart(2, '0')}`, 92, H - 80);
  c.fillStyle = `rgba(${col},.2)`; c.fillRect(W - 92 - 200, H - 110, 200, 1.5);
  c.fillStyle = C.gold; c.fillRect(W - 92 - 200, H - 110.5, 200 * t / DUR, 2.5);
  c.restore();
}

// ============================================================ SCENE 1 — prologue
const S1_WORDS = [['NEW COUNTRY.', .32, 1.12], ['NEW CAREER.', 1.27, 2.02], ['NEW BEGINNING.', 2.12, null]];
function scene1(c, t) {
  darkBg(c);
  const fl = t > 2.2 ? Math.exp(-(t - 2.2) * 3.5) : 0;
  if (fl > .01) {
    const g = c.createRadialGradient(W / 2, 540, 0, W / 2, 540, 1000);
    g.addColorStop(0, rgba(C.gold, .3 * fl)); g.addColorStop(1, rgba(C.gold, 0));
    c.fillStyle = g; c.fillRect(0, 0, W, H);
  }
  bokeh(c, t, P(t, 0, 1)); dust(c, t, P(t, 0, .8));
  c.save();
  const z = 1 + .06 * E.inOutCubic(P(t, 0, 3.4));
  c.translate(W / 2, H / 2); c.scale(z, z); c.translate(-W / 2, -H / 2);

  // anamorphic light streak draws the frame lines
  const sx = lerp(-300, W + 300, E.inOutCubic(P(t, 0, 1.0)));
  const lw = E.inOutCubic(P(t, .05, 1.0));
  c.fillStyle = goldV(c, 0, 0); c.fillStyle = rgba(C.gold, .7);
  for (const y of [395, 655]) {
    const half = 520 * lw;
    c.fillRect(W / 2 - half, y - .75, half * 2, 1.5);
    c.beginPath(); c.moveTo(W / 2 - half - 10, y); c.lineTo(W / 2 - half, y - 3); c.lineTo(W / 2 - half, y + 3); c.fill();
  }
  if (t < 1.2) {
    c.save(); c.globalCompositeOperation = 'lighter';
    const g = c.createRadialGradient(sx, 540, 0, sx, 540, 300);
    g.addColorStop(0, 'rgba(255,240,200,.9)'); g.addColorStop(.2, rgba(C.gold, .35)); g.addColorStop(1, rgba(C.gold, 0));
    c.translate(sx, 540); c.scale(4, .08); c.translate(-sx, -540);
    c.fillStyle = g; c.beginPath(); c.arc(sx, 540, 300, 0, TAU); c.fill(); c.restore();
    star4(c, sx, 540, 40, 1 - P(t, .9, 1.15));
  }
  // diamond markers
  for (const y of [395, 655]) {
    const d = clamp(spring(t - .9, 9, 18), 0, 1.3);
    if (d <= 0) continue;
    c.save(); c.translate(W / 2, y); c.rotate(Math.PI / 4); c.scale(d, d); c.fillStyle = C.goldLt; c.fillRect(-5, -5, 10, 10); c.restore();
  }

  for (const [w, t0, ex] of S1_WORDS) {
    if (t < t0 || (ex && t > ex + .4)) continue;
    const last = !ex;
    const fill = last ? goldV(c, 470, 575) : '#F3EBDD';
    const punch = 1 + .07 * (1 - E.outExpo(P(t, t0 + .1, t0 + .8)));
    c.save(); c.translate(W / 2, 520); c.scale(punch, punch); c.translate(-W / 2, -520);
    riseText(c, w, W / 2, 575, 140, F.cin(140, 700), fill, t, t0, {
      align: 'center', tr: 10, stagger: .028, dur: .55, exit: ex ? [ex, .18] : null,
      shine: last ? P(t, 2.45, 3.1) : null, glow: last ? 26 : 0,
    });
    c.restore();
  }
  trackText(c, 'IMMIGRATION  ·  CONSULTANTS  ·  DUBAI', W / 2, 720, F.mont(16, 600), rgba(C.goldLt, .75), t, .7, { tr0: 30, tr1: 9, dur: 1.4 });
  c.restore();
  // burst sparkles on impact
  if (t > 2.2 && t < 3.4) {
    const r = rng(5), k = t - 2.2;
    for (let i = 0; i < 26; i++) {
      const a = r() * TAU, v = 300 + 600 * r(), d = v * k * Math.exp(-k * 2);
      star4(c, W / 2 + Math.cos(a) * d * 1.6, 530 + Math.sin(a) * d * .6, 6 + 10 * r(), (1 - k / 1.2) * (.5 + .5 * Math.sin(t * 20 + i)));
    }
  }
  vignette(c, .6);
  hud(c, t, true);
}

// ============================================================ transitions
function waveY(x, base, t) { return base + 70 * Math.sin(x * .0035 + t * 3) + 36 * Math.sin(x * .0085 - t * 2.2); }
/** Gold silk wave rises from the bottom, revealing `next` beneath it. */
function waveWipe(c, t, t0, dur, next) {
  const base = lerp(H + 200, -320, E.inOutCubic(P(t, t0, t0 + dur)));
  const path = off => { c.beginPath(); c.moveTo(-60, H + 60); for (let x = -60; x <= W + 60; x += 20) c.lineTo(x, waveY(x, base + off, t)); c.lineTo(W + 60, H + 60); c.closePath(); };
  c.save(); path(0); c.clip(); next(); c.restore();
  c.save(); c.lineWidth = 1.2;
  for (let k = 0; k < 14; k++) {
    c.strokeStyle = rgba(k % 3 ? C.gold : C.goldLt, .75 - k * .045);
    c.beginPath(); for (let x = -60; x <= W + 60; x += 20) { const y = waveY(x + k * 12, base - 10 - k * 10, t + k * .02); x === -60 ? c.moveTo(x, y) : c.lineTo(x, y); } c.stroke();
  }
  c.lineWidth = 6; c.strokeStyle = goldV(c, base - 120, base + 120);
  c.beginPath(); for (let x = -60; x <= W + 60; x += 20) { const y = waveY(x, base, t); x === -60 ? c.moveTo(x, y) : c.lineTo(x, y); } c.stroke();
  c.restore();
}
function iris(c, x, y, r, next, ring = C.gold) {
  if (r <= 0) return;
  c.save(); c.beginPath(); c.arc(x, y, r, 0, TAU); c.clip(); next(); c.restore();
  c.save(); c.strokeStyle = ring; c.lineWidth = 6; c.beginPath(); c.arc(x, y, r + 8, 0, TAU); c.stroke();
  c.lineWidth = 1.5; c.globalAlpha = .6; c.beginPath(); c.arc(x, y, r * 1.06 + 30, 0, TAU); c.stroke(); c.restore();
}
function slit(c, t, t0, dur, next) {
  const h = (H + 40) * E.inOutExpo(P(t, t0, t0 + dur));
  const flash = Math.sin(Math.PI * P(t, t0 - .15, t0 + dur * .6));
  if (h > 0) { c.save(); c.beginPath(); c.rect(-60, H / 2 - h / 2, W + 120, h); c.clip(); next(); c.restore(); }
  c.save(); c.globalCompositeOperation = 'lighter';
  for (const y of [H / 2 - h / 2, H / 2 + h / 2]) {
    const g = c.createLinearGradient(0, y - 30, 0, y + 30);
    g.addColorStop(0, rgba(C.gold, 0)); g.addColorStop(.5, `rgba(255,236,180,${.9 * flash + .3})`); g.addColorStop(1, rgba(C.gold, 0));
    c.fillStyle = g; c.fillRect(-60, y - 30, W + 120, 60);
  }
  c.restore();
}

// ============================================================ SCENE 2 — Dubai skyline
const STARS = (() => { const r = rng(3); return Array.from({ length: 170 }, () => [r() * W, r() * 640, r(), r() * TAU]); })();
let burjTip = [960, 160];
function scene2(c, t) {
  const sky = c.createLinearGradient(0, 0, 0, 860);
  sky.addColorStop(0, '#030918'); sky.addColorStop(.6, '#0B1C45'); sky.addColorStop(1, '#1E3A75');
  c.fillStyle = sky; c.fillRect(-60, -60, W + 120, H + 120);
  const hg = c.createRadialGradient(W / 2, 880, 0, W / 2, 880, 900);
  hg.addColorStop(0, rgba(C.gold, .28)); hg.addColorStop(1, rgba(C.gold, 0));
  c.fillStyle = hg; c.fillRect(0, 0, W, H);
  for (const [x, y, z, ph] of STARS) { c.fillStyle = `rgba(255,240,210,${(.2 + .6 * z) * (.5 + .5 * Math.sin(t * 3 + ph))})`; c.fillRect(x, y, 1 + z * 1.5, 1 + z * 1.5); }
  // crescent moon
  c.save(); c.translate(1610, 200 - 10 * P(t, 3, 7.8)); c.beginPath(); c.arc(0, 0, 34, 0, TAU); c.clip();
  c.fillStyle = goldV(c, -34, 34); c.beginPath(); c.rect(-40, -40, 80, 80); c.arc(-12, -8, 31, 0, TAU, true); c.fill('evenodd'); c.restore();
  const mg = c.createRadialGradient(1610, 200, 0, 1610, 200, 140); mg.addColorStop(0, rgba(C.goldLt, .12)); mg.addColorStop(1, rgba(C.goldLt, 0)); c.fillStyle = mg; c.fillRect(1400, 0, 420, 400);

  const z = 1 + .07 * E.inOutCubic(P(t, 3.0, 7.9));
  c.save(); c.translate(W / 2, 560); c.scale(z, z); c.translate(-W / 2, -560);

  // searchlights
  for (const [x, ph] of [[620, 0], [1330, 2]]) {
    const a = -Math.PI / 2 + Math.sin(t * .9 + ph) * .45, al = .08 * P(t, 4.5, 5.5);
    if (al <= 0) continue;
    c.save(); c.translate(x, 860); c.rotate(a + Math.PI / 2);
    const g = c.createLinearGradient(0, 0, 0, -1100); g.addColorStop(0, rgba(C.goldLt, al)); g.addColorStop(1, rgba(C.goldLt, 0));
    c.fillStyle = g; c.beginPath(); c.moveTo(-4, 0); c.lineTo(-90, -1100); c.lineTo(90, -1100); c.lineTo(4, 0); c.fill(); c.restore();
  }
  // DUBAI behind the skyline
  const dp = P(t, 4.5, 6.6);
  if (dp > 0) {
    const e = E.outExpo(dp), tr = Math.round(lerp(150, 46, e)), f = F.cin(300, 600);
    const { xs, total } = charPos(c, 'DUBAI', f, tr);
    c.save(); c.font = f; c.letterSpacing = '0px'; c.globalAlpha = clamp(dp * 1.6);
    c.lineWidth = 1.6; c.strokeStyle = rgba(C.goldLt, .55); c.fillStyle = rgba(C.gold, .1);
    for (let i = 0; i < 5; i++) { c.fillText('DUBAI'[i], W / 2 - total / 2 + xs[i], 560); c.strokeText('DUBAI'[i], W / 2 - total / 2 + xs[i], 560); }
    c.restore();
  }
  // back skylines
  for (const [x, s, d] of [[360, 1.45, .2], [1560, 1.35, .3]]) {
    c.save(); c.translate(x, 860); c.scale(s * (x > W / 2 ? -1 : 1), s);
    drawSkyline(c, t, 3.45 + d, 1.6, rgba(C.goldDk, .5)); c.restore();
  }
  // hero skyline
  c.save(); c.translate(W / 2, 860); c.scale(2.9, 2.9);
  drawSkyline(c, t, 3.6, 2.2, goldV(c, -250, 0), { windows: true });
  c.restore();
  // water + reflection
  c.fillStyle = '#071430'; c.fillRect(-60, 860, W + 120, 300);
  c.save(); c.beginPath(); c.rect(-60, 860, W + 120, 300); c.clip();
  c.globalAlpha = .28; c.translate(W / 2, 860); c.scale(2.9, -2.9 * .55);
  drawSkyline(c, t, 3.6, 2.2, goldV(c, -250, 0)); c.restore();
  const wg = c.createLinearGradient(0, 860, 0, H); wg.addColorStop(0, 'rgba(7,20,48,0)'); wg.addColorStop(1, 'rgba(4,10,26,.95)');
  c.fillStyle = wg; c.fillRect(-60, 860, W + 120, 300);
  for (let i = 0; i < 40; i++) {
    const y = 866 + hash(i, 1) * 200, x = (hash(i, 2) * W + t * 30 * (1 + hash(i, 3))) % W, w = 20 + 80 * hash(i, 4);
    c.fillStyle = rgba(C.goldLt, .25 * (.5 + .5 * Math.sin(t * 4 + i)) * (1 - (y - 860) / 220) * P(t, 4, 5));
    c.fillRect(x - w / 2, y, w, 1.5);
  }
  c.fillStyle = rgba(C.goldLt, .7); c.fillRect(-60, 859, W + 120, 1.5);
  // Burj sparkle
  const tip = [W / 2, 860 - 205 * 1.17 * 2.9];
  star4(c, tip[0], tip[1], 70 * Math.sin(Math.PI * P(t, 6.0, 6.9)), 1);
  star4(c, tip[0], tip[1], 10 + 2 * Math.sin(t * 8), P(t, 6.2, 6.6));
  c.restore();
  burjTip = [W / 2 + (tip[0] - W / 2) * z, 560 + (tip[1] - 560) * z];

  fadeText(c, 'UNITED ARAB EMIRATES', 150, 180, F.mont(16, 600), rgba(C.goldLt, .8), t, 5.2, { tr: 12 });
  fadeText(c, 'Where every', 148, 240, F.cor(56), '#F3EBDD', t, 5.45);
  fadeText(c, 'journey begins.', 148, 292, F.cor(56), '#F3EBDD', t, 5.6);
  decodeText(c, '25.2048° N  ·  55.2708° E', W / 2, 1000, F.mont(15, 600), rgba(C.goldLt, .7), t, 5.8, { align: 'center', tr: 6 });
  vignette(c, .5);
  hud(c, t, true);
}

// ============================================================ SCENE 3 — globe
function scene3(c, t) {
  darkBg(c, 1340, 560);
  dust(c, t, .6);
  const g = globeState(t);
  const hz = rot(g, HUB), hs = scr(g, hz);
  const Z = Math.exp(Math.log(14) * E.inCubic(P(t, 10.7, 11.7)));
  c.save(); c.translate(hs[0], hs[1]); c.scale(Z, Z); c.translate(-hs[0], -hs[1]);

  const at = c.createRadialGradient(g.cx, g.cy, g.R * .92, g.cx, g.cy, g.R * 1.3);
  at.addColorStop(0, rgba(C.gold, .22)); at.addColorStop(1, rgba(C.gold, 0));
  c.fillStyle = at; c.beginPath(); c.arc(g.cx, g.cy, g.R * 1.3, 0, TAU); c.fill();
  const bd = c.createRadialGradient(g.cx - g.R * .35, g.cy - g.R * .4, 0, g.cx, g.cy, g.R);
  bd.addColorStop(0, '#1C3470'); bd.addColorStop(1, '#050D24');
  c.fillStyle = bd; c.beginPath(); c.arc(g.cx, g.cy, g.R, 0, TAU); c.fill();
  c.strokeStyle = rgba(C.gold, .08); c.lineWidth = 1;
  const line = pts => { c.beginPath(); let on = false; for (const v of pts) { const r = rot(g, v); if (r[2] > 0) { const s = scr(g, r); on ? c.lineTo(s[0], s[1]) : c.moveTo(s[0], s[1]); on = true; } else on = false; } c.stroke(); };
  for (let lo = -180; lo < 180; lo += 30) line(Array.from({ length: 46 }, (_, i) => v3(-90 + i * 4, lo)));
  for (let la = -60; la <= 60; la += 30) line(Array.from({ length: 91 }, (_, i) => v3(la, -180 + i * 4)));
  const dr = 1.95 * g.R / 400, buckets = [[], [], [], []];
  for (const d of DOTS) { const r = rot(g, d); if (r[2] > 0) buckets[Math.min(3, (r[2] * 4) | 0)].push(r); }
  buckets.forEach((b, i) => {
    c.fillStyle = rgba('#EAD49A', .15 + i * .19); c.beginPath();
    for (const r of b) { const x = g.cx + r[0] * g.R, y = g.cy - r[1] * g.R; c.moveTo(x + dr, y); c.arc(x, y, dr * (.7 + r[2] * .4), 0, TAU); }
    c.fill();
  });
  c.strokeStyle = rgba(C.gold, .4); c.lineWidth = 1.5; c.beginPath(); c.arc(g.cx, g.cy, g.R, 0, TAU); c.stroke();

  // arcs radiate from / return to the Dubai hub
  CITIES.forEach((o, i) => {
    const t0 = 7.9 + i * .15, head = E.inOutCubic(P(t, t0, t0 + 1.0));
    if (head <= 0) return;
    const outbound = i % 3 !== 2, a = outbound ? HUB : o, b = outbound ? o : HUB;
    const ang = Math.acos(clamp(a[0] * b[0] + a[1] * b[1] + a[2] * b[2], -1, 1)), lift = .05 + .24 * ang / Math.PI;
    const N = 64, pts = [];
    for (let k = 0; k <= N; k++) {
      const s = k / N * head, v = slerp(a, b, s), h = 1 + lift * Math.sin(Math.PI * s);
      const r = rot(g, [v[0] * h, v[1] * h, v[2] * h]);
      pts.push([...scr(g, r), r[2] > 0 || r[0] * r[0] + r[1] * r[1] > 1]);
    }
    c.lineCap = 'round';
    for (let k = 1; k <= N; k++) {
      const p0 = pts[k - 1], p1 = pts[k]; if (!p0[2] || !p1[2]) continue;
      const tail = Math.pow(k / N, 2.2);
      c.strokeStyle = rgba(C.goldLt, .2 + .75 * tail * (head < 1 ? 1 : 1 - P(t, t0 + 1, t0 + 1.5)));
      c.lineWidth = 1.2 + 2 * tail; c.beginPath(); c.moveTo(p0[0], p0[1]); c.lineTo(p1[0], p1[1]); c.stroke();
    }
    const hp = pts[N];
    if (head < 1 && hp[2]) star4(c, hp[0], hp[1], 12, 1);
    const end = pts[N], ap = P(t, t0 + 1, t0 + 1.7);
    if (end[2] && ap > 0 && ap < 1) { c.strokeStyle = rgba(C.goldLt, 1 - ap); c.lineWidth = 2; c.beginPath(); c.arc(end[0], end[1], 4 + 30 * E.outCubic(ap), 0, TAU); c.stroke(); }
    if (end[2] && head >= 1 && outbound) { c.fillStyle = C.goldLt; c.beginPath(); c.arc(end[0], end[1], 2.5, 0, TAU); c.fill(); }
  });
  // hub
  const pin = clamp(spring(t - 7.7, 8, 18), 0, 1.3);
  if (pin > 0) {
    for (let k = 0; k < 3; k++) { const q = ((t * .8 + k / 3) % 1); c.strokeStyle = rgba(C.gold, (1 - q) * .8); c.lineWidth = 1.5; c.beginPath(); c.arc(hs[0], hs[1], 8 + 46 * q, 0, TAU); c.stroke(); }
    c.save(); c.translate(hs[0], hs[1]); c.scale(pin, pin);
    c.fillStyle = goldV(c, -10, 10); c.beginPath(); c.arc(0, 0, 9, 0, TAU); c.fill();
    c.fillStyle = '#fff'; c.beginPath(); c.arc(0, 0, 3.5, 0, TAU); c.fill(); c.restore();
  }
  const co = E.inOutExpo(P(t, 8.4, 9.0));
  if (co > 0) {
    const [x, y] = hs, x1 = x + 70, y1 = y - 110, x2 = x1 + 190, k1 = clamp(co * 2), k2 = clamp(co * 2 - 1);
    c.strokeStyle = rgba(C.goldLt, .9); c.lineWidth = 1.5; c.beginPath(); c.moveTo(x, y); c.lineTo(lerp(x, x1, k1), lerp(y, y1, k1)); if (k2 > 0) c.lineTo(lerp(x1, x2, k2), y1); c.stroke();
    decodeText(c, 'DUBAI', x1 + 4, y1 - 14, F.cin(26, 700), C.goldLt, t, 8.7, { tr: 8, dur: .5 });
    decodeText(c, 'UAE  ·  HQ', x1 + 4, y1 + 24, F.mont(12, 600), 'rgba(255,255,255,.6)', t, 8.8, { tr: 4, dur: .5 });
  }
  c.restore();

  const ex = 10.45;
  c.save(); c.globalAlpha = 1 - P(t, 10.8, 11.1);
  fadeText(c, '— BEYOND BORDERS', 150, 380, F.mont(16, 700), C.gold, t, 7.6, { tr: 8 });
  riseText(c, 'ONE CITY.', 150, 490, 76, F.cin(76, 700), '#F3EBDD', t, 7.75, { tr: 4, exit: [ex, .2] });
  riseText(c, 'A world of', 152, 590, 70, F.cor(70), goldV(c, 540, 600), t, 8.3, { exit: [ex + .05, .2], stagger: .025 });
  riseText(c, 'POSSIBILITIES.', 150, 690, 72, F.cin(72, 700), '#F3EBDD', t, 8.75, { tr: 2, stagger: .025, exit: [ex + .1, .2] });
  decodeText(c, '25.2048° N  /  55.2708° E', 150, 760, F.mont(15, 600), rgba(C.goldLt, .6), t, 9.3, { tr: 4, exit: ex });
  c.restore();
  vignette(c, .55);
  hud(c, t, true);
  return hs;
}

// ============================================================ SCENE 4 — the process (passport)
const STEPS = ['CONSULTATION', 'DOCUMENTATION', 'APPLICATION', 'APPROVAL'];
const STEP_T = [13.35, 13.85, 14.35, 15.0];
const ROMAN = ['I', 'II', 'III', 'IV'];
const PW = 340, PH = 480, PC = [1220, 560];
function openAt(t) { return E.inOutCubic(P(t, 12.45, 13.15)) - E.inOutCubic(P(t, 15.75, 16.2)); }
function guilloche(c, t, cx, cy, a) {
  c.save(); c.translate(cx, cy); c.rotate(t * .05); c.globalAlpha = a; c.lineWidth = 1;
  for (const [R, r, d, col] of [[300, 77, 160, C.gold], [420, 61, 200, C.goldDk], [520, 113, 140, C.gold]]) {
    c.strokeStyle = rgba(col, .35); c.beginPath();
    for (let i = 0; i <= 1400; i++) {
      const th = i / 1400 * TAU * r / 4;
      const x = (R - r) * Math.cos(th) + d * Math.cos((R - r) / r * th), y = (R - r) * Math.sin(th) - d * Math.sin((R - r) / r * th);
      i ? c.lineTo(x, y) : c.moveTo(x, y);
    }
    c.stroke();
  }
  c.restore();
}
function miniEmblem(c, r, t = Infinity) {
  c.save();
  c.strokeStyle = goldV(c, -r, r); c.lineWidth = r * .06; c.beginPath(); c.arc(0, 0, r, 0, TAU); c.stroke();
  c.lineWidth = r * .015; c.beginPath(); c.arc(0, 0, r * .9, 0, TAU); c.stroke();
  c.save(); c.translate(0, r * .18); c.scale(r / 300, r / 300); drawSkyline(c, t, -10, 1, goldV(c, -250, 0)); c.restore();
  c.restore();
}
function scene4(c, t) {
  darkBg(c, PC[0], PC[1]);
  guilloche(c, t, PC[0], PC[1], P(t, 11.4, 12.4) * .8);
  dust(c, t, .5);
  // step list
  fadeText(c, '— THE PROCESS', 170, 330, F.mont(16, 700), C.gold, t, 11.9, { tr: 8, exit: 15.9 });
  STEPS.forEach((s, i) => {
    const y = 430 + i * 92, t0 = 12.2 + i * .1, done = P(t, STEP_T[i], STEP_T[i] + .3);
    const exA = 1 - P(t, 15.9 + i * .04, 16.2 + i * .04);
    c.save(); c.globalAlpha = exA;
    fadeText(c, ROMAN[i], 170, y, F.cin(30, 700), goldV(c, y - 30, y), t, t0, { rise: 24 });
    // check ring
    const ck = clamp(spring(t - STEP_T[i], 9, 18), 0, 1.25);
    c.strokeStyle = rgba(C.gold, .45 * P(t, t0, t0 + .4)); c.lineWidth = 1.5; c.beginPath(); c.arc(258, y - 11, 17, 0, TAU); c.stroke();
    if (ck > 0) {
      c.save(); c.translate(258, y - 11); c.scale(ck, ck);
      c.fillStyle = goldV(c, -17, 17); c.beginPath(); c.arc(0, 0, 17, 0, TAU); c.fill();
      c.strokeStyle = C.navyDk; c.lineWidth = 3; c.lineCap = 'round'; c.lineJoin = 'round';
      c.beginPath(); c.moveTo(-7, 0); c.lineTo(-2, 5); c.lineTo(7, -5); c.stroke(); c.restore();
    }
    const col = done > 0 ? `rgba(246,221,148,${.55 + .45 * done})` : 'rgba(243,235,221,.55)';
    fadeText(c, s, 300, y, F.mont(30, 700), col, t, t0 + .05, { tr: 4, rise: 24 });
    c.restore();
  });
  // connector line between checks
  c.save(); c.globalAlpha = 1 - P(t, 15.9, 16.2);
  const lp = clamp((t - 13.35) / (15.0 - 13.35)) * 3 * 92;
  c.fillStyle = rgba(C.gold, .25); c.fillRect(257, 419 + 17, 2, 3 * 92 - 34);
  c.fillStyle = C.gold; c.fillRect(257, 419 + 17, 2, Math.max(0, lp - 34 * 0));
  c.restore();

  // passport
  const enter = E.outExpo(P(t, 11.6, 12.4));
  const op = openAt(t), spine = lerp(PC[0] - PW / 2, PC[0], op);
  const Z = Math.exp(Math.log(9) * E.inCubic(P(t, 16.05, 16.9)));
  const coverC = [spine + PW / 2, PC[1] - 60];
  c.save();
  c.translate(coverC[0], coverC[1]); c.scale(Z, Z); c.translate(-coverC[0], -coverC[1]);
  c.translate(0, (1 - enter) * 700); c.translate(PC[0], PC[1]); c.rotate((1 - enter) * -.35); c.translate(-PC[0], -PC[1]);
  const top = PC[1] - PH / 2;
  // shadow
  c.fillStyle = 'rgba(0,0,0,.35)'; c.beginPath(); c.ellipse(spine + (op > .5 ? 0 : PW / 2), PC[1] + PH / 2 + 30, PW * (.7 + op * .6), 24, 0, 0, TAU); c.fill();
  // visa page (right)
  if (op > .02) {
    c.save();
    c.fillStyle = C.cream; c.beginPath(); c.roundRect(spine, top + 6, PW - 6, PH - 12, [0, 10, 10, 0]); c.fill();
    c.save(); c.clip();
    c.strokeStyle = rgba(C.gold, .22); c.lineWidth = 1;
    for (let k = 0; k < 22; k++) { c.beginPath(); for (let x = spine; x <= spine + PW; x += 6) { const y = top + 20 + k * 21 + 6 * Math.sin(x * .05 + k); x === spine ? c.moveTo(x, y) : c.lineTo(x, y); } c.stroke(); }
    c.font = F.cin(22, 700); c.fillStyle = C.navy; c.letterSpacing = '8px'; c.fillText('VISA', spine + 26, top + 52);
    c.strokeStyle = rgba(C.navy, .5); c.lineWidth = 1.5; c.strokeRect(spine + 26, top + 80, 92, 116);
    c.fillStyle = rgba(C.navy, .12); c.beginPath(); c.arc(spine + 72, top + 125, 22, 0, TAU); c.fill(); c.beginPath(); c.ellipse(spine + 72, top + 192, 36, 26, 0, Math.PI, 0); c.fill();
    const bars = [[140, 90, 0], [140, 70, 0], [140, 110, 1], [140, 60, 1], [26, 220, 2], [26, 160, 2], [26, 240, 3], [26, 120, 3]];
    bars.forEach(([x, w, step], k) => {
      const y = top + 96 + (k < 4 ? k * 26 : 130 + (k - 4) * 26);
      const q = E.outCubic(P(t, STEP_T[step] - .35 + (k % 2) * .08, STEP_T[step] + (k % 2) * .08));
      c.fillStyle = rgba(C.navy, .12); c.fillRect(spine + x, y, w, 8);
      c.fillStyle = rgba(C.navy, .7); c.fillRect(spine + x, y, w * q, 8);
    });
    c.fillStyle = rgba(C.navy, .55);
    for (let r = 0; r < 2; r++) for (let k = 0; k < 28; k++) if (hash(k, r) > .25) c.fillRect(spine + 24 + k * 10.5, top + PH - 70 + r * 22, 7, 11);
    // stamp
    const sp = P(t, 14.85, 15.0);
    if (sp > 0) {
      const s = lerp(3.2, 1, E.inCubic(sp)), cx = spine + 205, cy = top + 300;
      c.save(); c.translate(cx, cy); c.rotate(-.22); c.scale(s, s); c.globalAlpha = clamp(sp * 2) * .92;
      c.strokeStyle = '#A0762A'; c.fillStyle = '#A0762A';
      c.lineWidth = 4; c.beginPath(); c.arc(0, 0, 78, 0, TAU); c.stroke();
      c.lineWidth = 1.5; c.beginPath(); c.arc(0, 0, 68, 0, TAU); c.stroke();
      c.font = F.cin(25, 900); c.textAlign = 'center'; c.letterSpacing = '3px'; c.fillText('APPROVED', 2, 9);
      c.font = F.mont(10, 700); c.letterSpacing = '3px'; c.fillText('AVC  ·  DUBAI', 2, -30); c.fillText('★  ★  ★', 2, 44);
      c.restore();
      if (t > 15.0) { // ink flecks
        const r = rng(9), k = t - 15.0;
        for (let i = 0; i < 18; i++) { const a = r() * TAU, d = 90 + 60 * r(); c.fillStyle = rgba('#A0762A', .7 * (1 - P(k, .3, 1.2))); c.beginPath(); c.arc(cx + Math.cos(a) * d * E.outExpo(clamp(k * 4)), cy + Math.sin(a) * d * E.outExpo(clamp(k * 4)), 1.5 + 3 * r(), 0, TAU); c.fill(); }
      }
    }
    c.restore(); c.restore();
  }
  // cover (front / inside) rotating about the spine
  const ca = Math.cos(op * Math.PI);
  c.save(); c.translate(spine, 0); c.scale(ca === 0 ? .001 : ca, 1);
  if (ca > 0) {
    c.fillStyle = '#0E2253'; c.beginPath(); c.roundRect(0, top, PW, PH, [4, 14, 14, 4]); c.fill();
    const cg = c.createLinearGradient(0, top, PW, top + PH); cg.addColorStop(0, 'rgba(255,255,255,.08)'); cg.addColorStop(.5, 'rgba(255,255,255,0)'); cg.addColorStop(1, 'rgba(0,0,0,.25)');
    c.fillStyle = cg; c.fill();
    c.strokeStyle = rgba(C.gold, .7); c.lineWidth = 1.5; c.strokeRect(16, top + 16, PW - 32, PH - 32);
    c.save(); c.translate(PW / 2, PC[1] - 60); miniEmblem(c, 74); c.restore();
    c.font = F.cin(30, 700); c.textAlign = 'center'; c.letterSpacing = '12px'; c.fillStyle = goldV(c, PC[1] + 70, PC[1] + 100); c.fillText('PASSPORT', PW / 2 + 6, PC[1] + 100);
    c.font = F.mont(11, 600); c.letterSpacing = '5px'; c.fillStyle = rgba(C.goldLt, .7); c.fillText('YOUR NEXT CHAPTER', PW / 2 + 3, PC[1] + 140);
    if (t > 11.8 && t < 12.6) { c.fillStyle = shineBand(c, lerp(-200, PW + 200, P(t, 11.8, 12.5)), 90, .35); c.fillRect(0, top, PW, PH); }
  } else {
    c.fillStyle = '#132B62'; c.beginPath(); c.roundRect(0, top, PW, PH, [4, 14, 14, 4]); c.fill();
    c.save(); c.clip(); c.translate(PW / 2, PC[1]); guilloche(c, 0, 0, 0, .5); c.restore();
  }
  c.restore();
  c.restore();
  hud(c, t, true);
  return coverC;
}

// ============================================================ SCENE 5/6 — emblem build + end card
const ER = 270;
function emblemXf(t) {
  const m = E.inOutExpo(P(t, 21.0, 21.8));
  const s = lerp(1.42 * (1 + .025 * E.inOutCubic(P(t, 17, 21))), 1.02, m) * (1 + .012 * P(t, 21.8, 24));
  return { s, cx: lerp(W / 2, 600, m), cy: 540 };
}
function waves(c, t, t0) {
  const p = E.outExpo(P(t, t0, t0 + 1.2));
  if (p <= 0) return;
  const u = Math.sin(t * .8) * 30, v = Math.cos(t * .7) * 26;
  c.save(); c.translate(0, (1 - p) * 420);
  // left
  const L = off => { c.moveTo(-60, H - 250 + off + u * .3); c.bezierCurveTo(380, H - 190 + off + u, 700, H - 30 + off - u, 1060, H + 40 + off); };
  const R = off => { c.moveTo(W + 60, H - 470 + off + v * .3); c.bezierCurveTo(W - 300, H - 230 + off + v, W - 720, H - 70 + off - v, W - 1160, H + 40 + off); };
  for (const [fn, side] of [[L, -1], [R, 1]]) {
    c.beginPath(); fn(0); c.lineTo(side < 0 ? -60 : W + 60, H + 60); c.closePath();
    const g = c.createLinearGradient(0, H - 400, 0, H); g.addColorStop(0, '#1A3473'); g.addColorStop(1, '#081536');
    c.fillStyle = g; c.fill();
    c.beginPath(); fn(46); c.lineTo(side < 0 ? -60 : W + 60, H + 60); c.closePath(); c.fillStyle = 'rgba(5,14,38,.55)'; c.fill();
    c.lineWidth = 5; c.strokeStyle = goldV(c, H - 400, H); c.beginPath(); fn(0); c.stroke();
    c.lineWidth = 2.2; c.beginPath(); fn(40); c.stroke();
    c.lineWidth = .9;
    for (let k = 1; k <= 14; k++) { c.strokeStyle = rgba(C.gold, .5 - k * .03); c.beginPath(); fn(-k * 9 - (side > 0 ? k * 3 : 0)); c.stroke(); }
  }
  c.restore();
}
function curvedText(c, str, r, t, t0, f, fill) {
  c.save(); c.font = f; c.fillStyle = fill; c.textAlign = 'center'; c.letterSpacing = '0px';
  const widths = [...str].map(ch => c.measureText(ch).width + 7);
  const totalA = widths.reduce((a, b) => a + b, 0) / r;
  let a = Math.PI / 2 + totalA / 2;
  [...str].forEach((ch, i) => {
    const w = widths[i] / r; a -= w / 2;
    const q = P(t, t0 + i * .028, t0 + i * .028 + .3);
    if (q > 0) {
      c.save(); c.globalAlpha = q; c.translate(Math.cos(a) * r, Math.sin(a) * r); c.rotate(a - Math.PI / 2); c.translate(0, (1 - E.outCubic(q)) * 14); c.fillText(ch, 0, 0); c.restore();
    }
    a -= w / 2;
  });
  c.restore();
}
function drawEmblem(c, t) {
  // ring
  const rp = E.inOutCubic(P(t, 16.35, 17.0));
  const disc = E.outExpo(P(t, 16.55, 17.1));
  if (disc > 0) {
    const g = c.createRadialGradient(-80, -100, 0, 0, 0, ER);
    g.addColorStop(0, '#1A3678'); g.addColorStop(1, '#091A44');
    c.fillStyle = g; c.beginPath(); c.arc(0, 0, ER * disc, 0, TAU); c.fill();
  }
  if (rp > 0) {
    c.lineCap = 'round';
    c.strokeStyle = goldV(c, -ER, ER); c.lineWidth = 11;
    c.beginPath(); c.arc(0, 0, ER, -Math.PI / 2, -Math.PI / 2 + TAU * rp); c.stroke();
    const ip = E.inOutCubic(P(t, 16.7, 17.2));
    c.lineWidth = 1.6; c.beginPath(); c.arc(0, 0, ER - 13, Math.PI / 2, Math.PI / 2 + TAU * ip); c.stroke();
    if (rp < 1) { const a = -Math.PI / 2 + TAU * rp; star4(c, Math.cos(a) * ER, Math.sin(a) * ER, 26, 1); }
  }
  // arch over skyline
  const ap = E.inOutCubic(P(t, 17.0, 17.55));
  if (ap > 0) { c.strokeStyle = goldV(c, -190, -35); c.lineWidth = 3.5; c.beginPath(); c.arc(0, -35, 152, Math.PI, Math.PI + Math.PI * ap); c.stroke(); }
  c.save(); c.translate(0, -35); c.scale(.92, .92); drawSkyline(c, t, 17.1, 1.0, goldV(c, -260, 0), { windows: true }); c.restore();
  c.fillStyle = goldV(c, -40, -30); c.fillRect(-152 * P(t, 17.05, 17.4), -36, 304 * P(t, 17.05, 17.4), 2);
  star4(c, 0, -35 - 205 * 1.17 * .92, 34 * Math.sin(Math.PI * P(t, 18.0, 18.6)), 1);
  // AVC
  const f = F.cin(146, 800), { xs, total } = charPos(c, 'AVC', f, 4);
  c.save(); c.beginPath(); c.rect(-260, -40, 520, 150); c.clip(); c.font = f; c.letterSpacing = '0px';
  const ag = goldV(c, 0, 100);
  ['A', 'V', 'C'].forEach((ch, i) => {
    const p = P(t, 18.15 + i * .09, 18.6 + i * .09);
    if (p <= 0) return;
    c.fillStyle = 'rgba(0,0,0,.35)'; c.fillText(ch, -total / 2 + xs[i] + 3, 103 + (1 - E.outBack(p, 1.3)) * 170 + 4);
    c.fillStyle = ag; c.fillText(ch, -total / 2 + xs[i], 103 + (1 - E.outBack(p, 1.3)) * 170);
  });
  const sh = P(t, 19.9, 20.7);
  if (sh > 0 && sh < 1) { c.fillStyle = shineBand(c, lerp(-300, 300, sh), 110); c.fillText('A', -total / 2 + xs[0], 103); c.fillText('V', -total / 2 + xs[1], 103); c.fillText('C', -total / 2 + xs[2], 103); }
  c.restore();
  // dots, divider, diamond
  for (const sx of [-1, 1]) { const d = clamp(spring(t - 18.6, 9, 18), 0, 1.3); if (d > 0) { c.fillStyle = goldV(c, 60, 72); c.beginPath(); c.arc(sx * 222, 66, 5 * d, 0, TAU); c.fill(); } }
  const dv = E.inOutExpo(P(t, 18.65, 19.05));
  if (dv > 0) { c.fillStyle = goldV(c, 118, 122); c.fillRect(-148 * dv, 119, 296 * dv, 2); }
  const dm = clamp(spring(t - 18.95, 9, 18), 0, 1.3);
  if (dm > 0) { c.save(); c.translate(0, 120); c.rotate(Math.PI / 4); c.scale(dm, dm); c.fillStyle = C.goldLt; c.fillRect(-5.5, -5.5, 11, 11); c.restore(); }
  trackText(c, 'DUBAI', 0, 163, F.cin(38, 700), goldV(c, 133, 163), t, 18.85, { tr0: 50, tr1: 22, dur: .8 });
  curvedText(c, 'IMMIGRATION CONSULTANTS', 239, t, 19.05, F.mont(19, 600), '#F3EBDD');
  // glints on the ring
  if (t > 19.4) for (let k = 0; k < 3; k++) { const a = (t * .35 + k / 3) * TAU, tw = Math.max(0, Math.sin(t * 2.5 + k * 2)); star4(c, Math.cos(a) * ER, Math.sin(a) * ER, 16 * tw, tw); }
}
function sceneLight(c, t) {
  c.fillStyle = C.ivory; c.fillRect(-60, -60, W + 120, H + 120);
  const bg = c.createRadialGradient(W / 2, 420, 0, W / 2, 420, 1100);
  bg.addColorStop(0, '#FFFFFF'); bg.addColorStop(1, '#ECE8DE'); c.fillStyle = bg; c.fillRect(-60, -60, W + 120, H + 120);
  // silky sheen lines
  c.save(); c.strokeStyle = 'rgba(180,170,150,.12)'; c.lineWidth = 1;
  for (let k = 0; k < 10; k++) { c.beginPath(); for (let x = -60; x <= W + 60; x += 30) { const y = 140 + k * 26 + 120 * Math.sin(x * .0016 + k * .2 + t * .3); x === -60 ? c.moveTo(x, y) : c.lineTo(x, y); } c.stroke(); }
  c.restore();
  waves(c, t, 17.6);
  const X = emblemXf(t);
  // soft shadow + halo
  const hp = P(t, 16.6, 17.4);
  if (hp > 0) {
    const g = c.createRadialGradient(X.cx, X.cy + 20, ER * X.s * .9, X.cx, X.cy + 20, ER * X.s * 1.25);
    g.addColorStop(0, `rgba(10,24,56,${.28 * hp})`); g.addColorStop(1, 'rgba(10,24,56,0)');
    c.fillStyle = g; c.beginPath(); c.arc(X.cx, X.cy + 20, ER * X.s * 1.25, 0, TAU); c.fill();
  }
  // emblem drawn into a layer so the shine sweep only touches it
  const l = lctx;
  l.setTransform(1, 0, 0, 1, 0, 0); l.clearRect(0, 0, W, H);
  l.setTransform(X.s, 0, 0, X.s, X.cx, X.cy);
  drawEmblem(l, t);
  const sh = P(t, 20.0, 20.8);
  if (sh > 0 && sh < 1) {
    l.save(); l.setTransform(1, 0, 0, 1, 0, 0); l.globalCompositeOperation = 'source-atop';
    const x = lerp(X.cx - 600, X.cx + 600, E.inOutCubic(sh));
    l.translate(x, H / 2); l.transform(1, 0, -.5, 1, 0, 0); l.translate(-x, -H / 2);
    l.fillStyle = shineBand(l, x, 150, .4); l.fillRect(x - 200, -300, 400, H + 600); l.restore();
  }
  c.drawImage(layer, 0, 0);
  // AVC impact rings
  const ip = t - 18.55;
  if (ip > 0 && ip < 1.4) for (let k = 0; k < 3; k++) {
    const q = P(ip, k * .1, 1.1 + k * .1); if (q <= 0 || q >= 1) continue;
    c.strokeStyle = rgba(C.goldDk, .35 * (1 - q)); c.lineWidth = 2; c.beginPath(); c.arc(X.cx, X.cy, ER * X.s + 20 + 700 * E.outCubic(q), 0, TAU); c.stroke();
  }
  // end card
  if (t > 21.2) {
    const x = 1050;
    const dvp = E.inOutExpo(P(t, 21.3, 21.8));
    c.fillStyle = rgba(C.gold, .8); c.fillRect(985, 540 - 200 * dvp, 1.5, 400 * dvp);
    riseText(c, 'YOUR JOURNEY.', x, 470, 68, F.cin(68, 700), C.navy, t, 21.45, { tr: 3, stagger: .025 });
    riseText(c, 'OUR EXPERTISE.', x, 560, 68, F.cin(68, 700), goldV(c, 510, 565), t, 21.65, { tr: 3, stagger: .025, shine: P(t, 22.6, 23.4) });
    const lp = E.inOutExpo(P(t, 21.95, 22.5));
    c.fillStyle = goldV(c, 600, 604); c.fillRect(x, 603, 560 * lp, 2);
    decodeText(c, 'avcimmigrationconsultants.com', x, 662, F.mont(30, 600), C.navy, t, 22.1, { tr: 1, dur: .8 });
    fadeText(c, 'DUBAI  ·  UNITED ARAB EMIRATES', x, 712, F.mont(15, 600), rgba(C.navy, .6), t, 22.5, { tr: 7 });
  }
  hud(c, t, false);
}

// ============================================================ master timeline
function render(c, t) {
  c.setTransform(1, 0, 0, 1, 0, 0);
  c.globalAlpha = 1; c.globalCompositeOperation = 'source-over'; c.shadowBlur = 0;
  const [sx, sy] = shake(t);
  c.translate(W / 2 + sx, H / 2 + sy); c.scale(1.012, 1.012); c.translate(-W / 2, -H / 2);
  if (t < 2.85) scene1(c, t);
  else if (t < 3.75) { scene1(c, t); waveWipe(c, t, 2.85, .85, () => scene2(c, t)); }
  else if (t < 7.1) scene2(c, t);
  else if (t < 7.85) { scene2(c, t); const tip = burjTip; iris(c, tip[0], tip[1], 2400 * E.inOutExpo(P(t, 7.1, 7.8)), () => scene3(c, t)); }
  else if (t < 11.1) scene3(c, t);
  else if (t < 11.9) { scene3(c, t); slit(c, t, 11.15, .65, () => scene4(c, t)); }
  else if (t < 16.25) scene4(c, t);
  else if (t < 17.0) { const cc = scene4(c, t); iris(c, cc[0], cc[1], 2600 * E.inOutExpo(P(t, 16.25, 16.95)), () => sceneLight(c, t), C.gold); }
  else sceneLight(c, t);
}

// ------------------------------------------------------------ output
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
    octx.globalAlpha = 1 / (i + 1); octx.globalCompositeOperation = 'source-over'; octx.drawImage(work, 0, 0);
  }
  const fr = Math.floor(t * 24);
  octx.save(); octx.globalCompositeOperation = 'overlay'; octx.globalAlpha = .055;
  octx.translate((fr * 37) % 256, (fr * 91) % 256); octx.fillStyle = octx.createPattern(grains[fr % 4], 'repeat'); octx.fillRect(-256, -256, W + 512, H + 512);
  octx.restore(); octx.globalAlpha = 1;
}
async function init() {
  await Promise.all([document.fonts.load(F.cin(100, 700)), document.fonts.load(F.cin(100, 800)), document.fonts.load(F.cor(40)), document.fonts.load(F.mont(20, 600)), document.fonts.load(F.mont(20, 700))]);
  await document.fonts.ready;
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
