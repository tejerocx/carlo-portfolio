// AVC Dubai — U.S. Pathways: pure function of time. window.seek(t) paints frame t (see lib/motion.js).
// Timing is in beats (u) on the measured grid (124.8 bpm); docs/shotlist.md is the plan this follows.
import * as M from './lib/motion.js';

const { W, H, E, TAU, prog, lerp, clamp, bump, springU, SPRING, wobble, shake, font, layout, fitSize, glyph, fill, rrect, mix, kf } = M;

// ---------------------------------------------------------------- brand tokens (logo + poster)
const C = {
  ink: '#04122B', navy: '#0A2148', navy2: '#13306A', navy3: '#1B3F86',
  gold: '#D4AF5A', goldL: '#F6E3A1', goldD: '#9A7230', cream: '#F7F3EA', white: '#FFFFFF',
};
const DISPLAY = 'Display', UI = 'UI';
const CX = W / 2;

// Every visual accent: [beat, label, sfx, opts]. sfx.mjs voices them from this list.
const HITS = [
  [0, 'Your rises', 'pop', { pitch: 'F5' }],
  [1, 'U.S. slams', 'impact'],
  [1.25, 'stars', 'blip', { pitch: 'C7' }],
  [2.5, 'Immigration wave', 'whoosh', { len: 0.35, from: 900, to: 3800 }],
  [3.5, 'Options', 'pop', { pitch: 'C6' }],
  [7.5, 'squeeze', 'whoosh', { len: 0.45, from: 3200, to: 500 }],
  [8, 'BROADER drop', 'impact'],
  [9, 'than you think', 'click'],
  [10.2, 'plane takes off', 'whoosh', { len: 0.9, from: 500, to: 2600, pan: 0.4 }],
  [12, 'arch draws', 'whoosh', { len: 0.4, from: 2400, to: 700 }],
  [12.75, 'persona lands', 'thud'],
  [13.5, 'logo badge', 'pop', { pitch: 'Ab5' }],
  [15.85, 'whip to EB-1', 'whoosh', { len: 0.35, from: 600, to: 3000, pan: -0.4 }],
  [16, 'EB-1 lands', 'thud'],
  [16.75, 'trophy shine', 'bell', { pitch: 'C6' }],
  [17, 'descriptor', 'tick'],
  [21.85, 'push to EB-2', 'whoosh', { len: 0.35, from: 2800, to: 700 }],
  [22, 'EB-2 lands', 'thud'],
  [22.5, 'NIW badge', 'pop', { pitch: 'Ab5' }],
  [23.25, 'seal stamp', 'thud', { pitch: 140, to: 60 }],
  [23.75, 'descriptor types', 'type', { n: 10, len: 0.7 }],
  [27.85, 'iris to E-2', 'whoosh', { len: 0.4, from: 500, to: 3600 }],
  [27.75, 'E-2 punch', 'thud'],
  [28, 'bar 1', 'blip', { pitch: 'F5' }],
  [28.5, 'bar 2', 'blip', { pitch: 'Ab5' }],
  [29, 'bar 3', 'blip', { pitch: 'C6' }],
  [29.5, 'bar 4', 'blip', { pitch: 'F6' }],
  [30, 'arrow up', 'whoosh', { len: 0.4, from: 700, to: 4200 }],
  [33.85, 'gold wipe', 'whoosh', { len: 0.4, from: 3000, to: 600, pan: 0.3 }],
  [34, 'figure 1', 'tok', { pitch: 'C5' }],
  [34.5, 'figure 2', 'tok', { pitch: 'F5' }],
  [35, 'figure 3', 'tok', { pitch: 'Ab5' }],
  [35.5, 'roof', 'tick'],
  [39.9, 'card becomes pill', 'swell', { len: 0.6 }],
  [40, 'recap lands', 'thud'],
  [40.33, 'pill', 'click'],
  [40.67, 'pill', 'click'],
  [41.25, 'arch + persona', 'whoosh', { len: 0.45, from: 700, to: 2600 }],
  [44, 'CTA turns gold', 'pop', { pitch: 'C6' }],
  [45, 'arrow nudge', 'tick'],
  [46, 'arrow nudge', 'tick'],
  [47, 'arrow nudge', 'tick'],
  [47.6, 'zoom into arrow', 'whoosh', { len: 0.4, from: 600, to: 4000 }],
  [48, 'logo flip lands', 'impact'],
  [48.5, 'logo glint', 'bell', { pitch: 'F6' }],
  [49, 'AVC DUBAI', 'click'],
  [50.5, 'glint', 'blip', { pitch: 'C7' }],
];

// ---------------------------------------------------------------- helpers
const gradCache = new Map();
// Gold foil, in a glyph's local space (baseline at 0), so it works through glyph()'s transforms.
function goldFoil(ctx, size) {
  const k = Math.round(size);
  if (gradCache.has(k)) return gradCache.get(k);
  const g = ctx.createLinearGradient(0, -0.78 * size, 0, 0.12 * size);
  g.addColorStop(0, '#FFF3C4'); g.addColorStop(0.32, '#EBCB78'); g.addColorStop(0.62, '#CDA046'); g.addColorStop(1, '#94692A');
  gradCache.set(k, g);
  return g;
}
function goldLinear(ctx, x0, y0, x1, y1) {
  const g = ctx.createLinearGradient(x0, y0, x1, y1);
  g.addColorStop(0, '#9A7230'); g.addColorStop(0.3, '#E6C46F'); g.addColorStop(0.5, '#FFF0BE'); g.addColorStop(0.7, '#D9B45C'); g.addColorStop(1, '#9A7230');
  return g;
}
// A word, centred on cx, baseline y; anim(j, n) returns per-glyph {dx, dy, sx, sy, rot, skew, a}.
function word(ctx, str, cx, y, f, size, color, track = 0, anim = null) {
  const L = layout(ctx, str, f, track);
  const x0 = cx - L.width / 2;
  const n = L.glyphs.length;
  const col = color === 'gold' ? goldFoil(ctx, size) : color;
  const base = ctx.globalAlpha;
  L.glyphs.forEach((g, j) => {
    const a = anim ? anim(j, n, g) : {};
    const al = a.a === undefined ? 1 : a.a;
    if (al <= 0.003) return;
    ctx.globalAlpha = base * clamp(al);
    glyph(ctx, g.ch, x0 + g.cx + (a.dx || 0), y + (a.dy || 0), f, col, a.sx ?? 1, a.sy ?? 1, a.rot || 0, a.skew || 0);
  });
  ctx.globalAlpha = base;
  return L;
}
const fitCache = new Map();
function fit(ctx, str, weight, family, maxW, max, track = 0) {
  const k = `${str}|${weight}|${family}|${maxW}|${max}|${track}`;
  if (!fitCache.has(k)) fitCache.set(k, fitSize(ctx, str, weight, family, maxW, max, track));
  return fitCache.get(k);
}
function withAlpha(ctx, a, fn) { if (a <= 0.003) return; const p = ctx.globalAlpha; ctx.globalAlpha = p * clamp(a); fn(); ctx.globalAlpha = p; }
function scaleAbout(ctx, s, x, y, sy = s) { ctx.translate(x, y); ctx.scale(s, sy); ctx.translate(-x, -y); }

// polylines: [[x, y], ...]; strokePoly draws the first fraction p of the length
function polyLen(pts) { let l = 0; for (let i = 1; i < pts.length; i++) l += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); return l; }
function strokePoly(ctx, pts, p = 1, close = false) {
  if (p <= 0 || pts.length < 2) return;
  const total = pts._len ?? (pts._len = polyLen(pts));
  let left = total * clamp(p);
  ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) {
    const [x0, y0] = pts[i - 1], [x1, y1] = pts[i];
    const d = Math.hypot(x1 - x0, y1 - y0);
    if (d >= left) { const k = d ? left / d : 0; ctx.lineTo(x0 + (x1 - x0) * k, y0 + (y1 - y0) * k); break; }
    ctx.lineTo(x1, y1); left -= d;
  }
  if (close && p >= 1) ctx.closePath();
  ctx.stroke();
}
// head point of a polyline at fraction p
function polyAt(pts, p) {
  const total = pts._len ?? (pts._len = polyLen(pts));
  let left = total * clamp(p);
  for (let i = 1; i < pts.length; i++) {
    const [x0, y0] = pts[i - 1], [x1, y1] = pts[i];
    const d = Math.hypot(x1 - x0, y1 - y0);
    if (d >= left) { const k = d ? left / d : 0; return [x0 + (x1 - x0) * k, y0 + (y1 - y0) * k, Math.atan2(y1 - y0, x1 - x0)]; }
    left -= d;
  }
  const a = pts[pts.length - 2], b = pts[pts.length - 1];
  return [b[0], b[1], Math.atan2(b[1] - a[1], b[0] - a[0])];
}
const arcPts = (cx, cy, rx, ry, a0, a1, n = 40) => Array.from({ length: n + 1 }, (_, i) => { const a = lerp(a0, a1, i / n); return [cx + rx * Math.cos(a), cy + ry * Math.sin(a)]; });
const bez = (p0, c, p1, n = 16) => Array.from({ length: n + 1 }, (_, i) => { const t = i / n, s = 1 - t; return [s * s * p0[0] + 2 * s * t * c[0] + t * t * p1[0], s * s * p0[1] + 2 * s * t * c[1] + t * t * p1[1]]; });
function star(ctx, x, y, r, rot = 0) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) { const a = rot - Math.PI / 2 + (i * Math.PI) / 5, rr = i % 2 ? r * 0.42 : r; ctx.lineTo(x + rr * Math.cos(a), y + rr * Math.sin(a)); }
  ctx.closePath();
}
function diamond(ctx, x, y, r) { ctx.beginPath(); ctx.moveTo(x, y - r); ctx.lineTo(x + r, y); ctx.lineTo(x, y + r); ctx.lineTo(x - r, y); ctx.closePath(); }

// ---------------------------------------------------------------- vector art (logo gold-line style)
// Skyline: Dubai (left) to New York (right), one contour, horizon at y 0, x 0..1000.
const SKY = (() => {
  const p = [[0, 0], [18, 0], [18, -58], [56, -58], [56, 0], [78, 0], [78, -168], [83, -168]];
  p.push(...bez([83, -150], [146, -128], [150, -6]).slice(1), [150, 0]);
  p.push([168, 0], [168, -92], [186, -114], [204, -92], [204, 0], [214, 0], [214, -124], [240, -124], [240, 0]);
  p.push([262, 0], [262, -62], [270, -62], [270, -112], [278, -112], [278, -172], [286, -172], [286, -222], [293, -222], [293, -262], [298, -262], [300, -336], [302, -262], [307, -262], [307, -222], [314, -222], [314, -172], [322, -172], [322, -112], [330, -112], [330, -62], [338, -62], [338, 0]);
  p.push([354, 0], [354, -132], [376, -154], [376, 0], [386, 0], [386, -112], [404, -128], [404, 0], [580, 0]);
  p.push([580, -36], [587, -36], [587, -62], [596, -62], [598, -116], [596, -126], [600, -140], [604, -147], [608, -141], [611, -130], [614, -150], [616, -171], [613, -176], [615, -186], [619, -194], [622, -186], [623, -176], [620, -171], [619, -150], [615, -122], [609, -116], [611, -62], [621, -62], [621, -36], [628, -36], [628, 0]);
  p.push([660, 0], [660, -102], [690, -102], [690, 0], [710, 0], [710, -112], [718, -112], [718, -152], [725, -152], [725, -182], [730, -182], [730, -197], [733, -197], [735, -244], [737, -197], [740, -197], [740, -182], [745, -182], [745, -152], [752, -152], [752, -112], [760, -112], [760, 0]);
  p.push([775, 0], [775, -132], [780, -152], [785, -167], [790, -204], [795, -167], [800, -152], [805, -132], [805, 0]);
  p.push([840, 0], [840, -42], [850, -42], [858, -262], [872, -262], [873, -324], [875, -262], [888, -262], [896, -42], [906, -42], [906, 0]);
  p.push([920, 0], [920, -82], [950, -82], [950, -122], [975, -122], [975, 0], [1000, 0]);
  return p;
})();
const PLANE_ARC = bez([300, -350], [460, -560], [619, -214], 40);

// Icons in unit space (-1..1), stroked.
const ICON = {
  trophy: [
    [[-0.58, -0.62], [0.58, -0.62]],
    arcPts(0, -0.62, 0.5, 0.74, 0, Math.PI, 30),
    arcPts(-0.52, -0.36, 0.24, 0.22, -Math.PI / 2, -Math.PI * 1.5, 18),
    arcPts(0.52, -0.36, 0.24, 0.22, -Math.PI / 2, Math.PI / 2, 18),
    [[0, 0.12], [0, 0.4]],
    [[-0.3, 0.4], [0.3, 0.4], [0.3, 0.52], [-0.3, 0.52], [-0.3, 0.4]],
    [[-0.44, 0.52], [0.44, 0.52], [0.44, 0.68], [-0.44, 0.68], [-0.44, 0.52]],
  ],
  doc: [
    [[0.24, -0.74], [-0.56, -0.74], [-0.56, 0.74], [0.56, 0.74], [0.56, -0.42], [0.24, -0.74], [0.24, -0.42], [0.56, -0.42]],
    [[-0.36, -0.4], [0.06, -0.4]], [[-0.36, -0.18], [0.36, -0.18]], [[-0.36, 0.04], [0.36, 0.04]], [[-0.36, 0.26], [0.0, 0.26]],
  ],
  chart: [
    [[-0.7, -0.72], [-0.7, 0.66], [0.74, 0.66]],
  ],
  family: [
    arcPts(0, -0.42, 0.2, 0.2, 0, TAU, 28),
    arcPts(0, 0.42, 0.36, 0.5, Math.PI, TAU, 24),
    arcPts(-0.54, -0.16, 0.15, 0.15, 0, TAU, 24),
    arcPts(-0.54, 0.46, 0.27, 0.36, Math.PI, TAU, 20),
    arcPts(0.54, -0.16, 0.15, 0.15, 0, TAU, 24),
    arcPts(0.54, 0.46, 0.27, 0.36, Math.PI, TAU, 20),
  ],
  envelope: [
    [[-0.8, -0.52], [0.8, -0.52], [0.8, 0.52], [-0.8, 0.52], [-0.8, -0.52]],
    [[-0.8, -0.52], [0, 0.1], [0.8, -0.52]],
  ],
  arrow: [[[-0.5, 0], [0.5, 0]], [[0.12, -0.38], [0.5, 0], [0.12, 0.38]]],
};
const ROOF = [[-0.86, -0.44], [0, -1.02], [0.86, -0.44]];

function drawIcon(ctx, name, x, y, s, p, lw = 7, color = C.gold) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  ctx.lineWidth = lw / s; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.strokeStyle = color;
  ICON[name].forEach((pts, i, all) => strokePoly(ctx, pts, clamp(p * (1 + 0.15 * all.length) - i * 0.15)));
  ctx.restore();
}

// ---------------------------------------------------------------- background (always)
let GRAIN = null, RINGS = null;
function initArt() {
  const n = 256, cv = document.createElement('canvas');
  cv.width = n; cv.height = n;
  const g = cv.getContext('2d');
  const img = g.createImageData(n, n), r = M.mulberry32(77);
  for (let i = 0; i < n * n; i++) { const v = 128 + (r() - 0.5) * 120; img.data[i * 4] = img.data[i * 4 + 1] = img.data[i * 4 + 2] = v; img.data[i * 4 + 3] = 255; }
  g.putImageData(img, 0, 0);
  GRAIN = cv;
}
function background(ctx, u, glow = 0) {
  const g = ctx.createRadialGradient(CX, 760, 60, CX, 860, 1250);
  g.addColorStop(0, mix(C.navy2, C.navy3, glow * 0.6)); g.addColorStop(0.45, C.navy); g.addColorStop(1, '#020A1C');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  // slow concentric rings (the logo's rim), barely there
  ctx.save(); ctx.translate(CX, 780); ctx.rotate(u * 0.01);
  ctx.strokeStyle = C.gold; ctx.lineWidth = 1.2;
  for (let i = 0; i < 6; i++) {
    ctx.globalAlpha = 0.045 + 0.02 * glow;
    ctx.setLineDash([2, 14 + i * 4]);
    ctx.beginPath(); ctx.arc(0, 0, 480 + i * 120 + 6 * Math.sin(u * 0.4 + i), 0, TAU); ctx.stroke();
  }
  ctx.setLineDash([]); ctx.restore(); ctx.globalAlpha = 1;
}
function grain(ctx, t) {
  if (!GRAIN) return;
  const f = Math.floor(t * 30), ox = M.hash01(f, 5) * 256, oy = M.hash01(f, 9) * 256;
  ctx.save(); ctx.globalCompositeOperation = 'overlay'; ctx.globalAlpha = 0.07;
  const pat = ctx.createPattern(GRAIN, 'repeat');
  ctx.translate(-ox, -oy); ctx.fillStyle = pat; ctx.fillRect(0, 0, W + 256, H + 256);
  ctx.restore();
  // vignette
  const v = ctx.createRadialGradient(CX, H * 0.45, H * 0.32, CX, H * 0.45, H * 0.78);
  v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,4,14,0.55)');
  ctx.fillStyle = v; ctx.fillRect(0, 0, W, H);
}
// gold light sweep: a soft diagonal band crossing the frame (drop accents)
function lightSweep(ctx, p, alpha = 0.35) {
  if (p <= 0 || p >= 1) return;
  const x = lerp(-600, W + 600, p);
  ctx.save(); ctx.globalCompositeOperation = 'screen'; ctx.translate(x, H / 2); ctx.rotate(0.35);
  const g = ctx.createLinearGradient(-220, 0, 220, 0);
  g.addColorStop(0, 'rgba(212,175,90,0)'); g.addColorStop(0.5, `rgba(246,227,161,${alpha})`); g.addColorStop(1, 'rgba(212,175,90,0)');
  ctx.fillStyle = g; ctx.fillRect(-220, -H, 440, 2 * H);
  ctx.restore();
}

// ---------------------------------------------------------------- S1 hook   (u 0..8)
const RING = { x: CX, y: 800, r: 405 };
function sceneHook(ctx, u) {
  const sq = E.inCubic(prog(u, 7.45, 7.98));                     // squeeze into a sliver
  const push = 1 + 0.06 * E.inOutSine(prog(u, 3.5, 7.5));
  const charge = prog(u, 6, 7.5);
  ctx.save();
  shake(ctx, u, 1, 16, 4, 0.18);
  scaleAbout(ctx, push * (1 - 0.95 * sq), RING.x, RING.y, push * (1 + 0.12 * sq));
  ctx.globalAlpha = 1 - prog(u, 7.85, 8);

  // ring: drawing from frame 0
  const rp = E.outExpo(prog(u, -0.3, 2.2));
  ctx.save(); ctx.translate(RING.x, RING.y); ctx.rotate(-Math.PI / 2 + u * 0.06 + charge * charge * 0.8);
  ctx.lineCap = 'round';
  ctx.strokeStyle = goldLinear(ctx, -RING.r, -RING.r, RING.r, RING.r); ctx.lineWidth = 5;
  ctx.beginPath(); ctx.arc(0, 0, RING.r, 0, TAU * rp); ctx.stroke();
  ctx.strokeStyle = C.gold; ctx.lineWidth = 1.5; ctx.globalAlpha *= 0.6;
  ctx.setLineDash([3, 11]);
  ctx.beginPath(); ctx.arc(0, 0, RING.r + 26, -TAU * rp * 0.9, 0); ctx.stroke(); ctx.setLineDash([]);
  ctx.restore();
  // side dots (logo detail), pop as the ring passes
  [[-1, 0], [1, 0]].forEach(([sx], i) => {
    const k = springU(u, 0.7 + i * 0.25, SPRING.bouncy);
    if (k <= 0) return;
    ctx.fillStyle = C.gold; ctx.beginPath(); ctx.arc(RING.x + sx * (RING.r + 60), RING.y, 9 * k, 0, TAU); ctx.fill();
  });

  const jit = (j) => charge * charge * 2.4 * M.noise1(u * 30 + j * 7.3, 11);
  // "Your": rises out of a mask line
  const fYour = font(118, 600, DISPLAY);
  ctx.save(); ctx.beginPath(); ctx.rect(0, 0, W, 590); ctx.clip();
  word(ctx, 'Your', CX, 575, fYour, 118, C.cream, 1, (j) => {
    const k = springU(u, -0.35 + j * 0.06, SPRING.snappy);
    return { dy: (1 - k) * 140 + jit(j), a: k > 0 ? 1 : 0 };
  });
  ctx.restore();
  // "U.S.": slams in gold
  const fUS = font(300, 800, DISPLAY);
  const kUS = springU(u, 0.82, { stiffness: 420, damping: 16 });
  if (kUS > 0) {
    const s = lerp(2.4, 1, kUS);
    ctx.save(); scaleAbout(ctx, s, CX, 760);
    ctx.globalAlpha *= clamp(kUS * 3);
    const L = word(ctx, 'U.S.', CX, 850, fUS, 300, 'gold', -4, (j) => ({ dx: jit(j), dy: jit(j + 3) }));
    ctx.restore();
    // flanking stars (the flag, not a particle burst)
    [-1, 1].forEach((sd, i) => {
      const k = springU(u, 1.2 + i * 0.12, SPRING.bouncy);
      if (k <= 0) return;
      ctx.save(); ctx.fillStyle = goldLinear(ctx, -30, -30, 30, 30);
      ctx.translate(CX + sd * (L.width / 2 + 62), 745); ctx.rotate((1 - k) * sd * 2.5 + u * 0.1 * sd);
      star(ctx, 0, 0, 30 * k); ctx.fill(); ctx.restore();
    });
  }
  // "Immigration": glyph wave
  const fIm = font(128, 700, DISPLAY);
  word(ctx, 'Immigration', CX, 1000, fIm, 128, C.cream, -1, (j, n) => {
    const k = springU(u, 2.3 + j * 0.045, SPRING.bouncy);
    return { dy: (1 - k) * 90 + jit(j), sy: Math.max(0.01, k), sx: 1, a: clamp(k * 2) };
  });
  // "Options": gold, scales from its centre glyph outward
  const fOp = font(128, 700, DISPLAY);
  word(ctx, 'Options', CX, 1135, fOp, 128, 'gold', -1, (j, n) => {
    const k = springU(u, 3.3 + Math.abs(j - (n - 1) / 2) * 0.07, SPRING.bouncy);
    return { sx: k, sy: k, dy: jit(j) , a: k > 0 ? 1 : 0 };
  });
  ctx.restore();
  ctx.globalAlpha = 1;
}

// ---------------------------------------------------------------- S2 broader + persona   (u 8..16)
const HORIZON = 1300, SKYX = 40;
function sceneBroader(ctx, u, IMG) {
  const out = E.inOutCubic(prog(u, 15.62, 16.08));                // whip left
  ctx.save();
  ctx.translate(-out * W * 1.1, 0);
  shake(ctx, u, 8, 22, 6, 0.2);

  // text block: centre stage b8..12, then springs to the top
  const up = springU(u, 11.9, SPRING.gentle);
  const ty = lerp(0, -440, up), ts = lerp(1, 0.56, up);
  ctx.save();
  scaleAbout(ctx, ts, CX, 760); ctx.translate(0, ty / ts);
  // BROADER: bursts from the hook's sliver, overshoots, then keeps widening (the word does what it says)
  const kx = springU(u, 7.9, { stiffness: 210, damping: 11 });
  const widen = prog(u, 8.5, 16);
  const sizeB = fit(ctx, 'BROADER', 900, DISPLAY, 800, 210, 0);
  const fB2 = font(sizeB, 900, DISPLAY);
  if (kx > 0) {
    ctx.save(); scaleAbout(ctx, lerp(0.05, 1, kx), CX, 780, lerp(1.25, 1, Math.min(1, kx)));
    word(ctx, 'BROADER', CX, 850, fB2, sizeB, 'gold', 4 + 10 * widen, () => ({}));
    ctx.restore();
  }
  // "may be" spaced caps above
  const fm = font(46, 600, UI);
  word(ctx, 'MAY BE', CX, 640, fm, 46, C.goldL, 18, (j, n) => {
    const k = springU(u, 8.2 + j * 0.05, SPRING.snappy);
    return { dy: (1 - k) * -40, a: k };
  });
  // "than you think."
  const ft = font(84, 600, DISPLAY);
  word(ctx, 'than you think.', CX, 975, ft, 84, C.cream, 0, (j) => {
    const k = springU(u, 8.85 + j * 0.03, SPRING.snappy);
    return { dy: (1 - k) * 60, a: k };
  });
  ctx.restore();

  // gold horizon thread: flashes across at the drop, drops to the skyline line
  const hp = E.outExpo(prog(u, 7.95, 8.6));
  const hy = lerp(780, HORIZON, E.inOutCubic(prog(u, 8.5, 9.4)));
  const skyOut = E.inCubic(prog(u, 11.9, 12.6));
  ctx.save();
  ctx.translate(0, skyOut * 380); ctx.globalAlpha = 1 - skyOut;
  ctx.strokeStyle = goldLinear(ctx, 0, 0, W, 0); ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(CX - hp * CX, hy); ctx.lineTo(CX + hp * CX, hy); ctx.stroke();
  // skyline: Dubai -> New York, drawn left to right
  const sp = E.inOutSine(prog(u, 9.1, 11.7));
  if (sp > 0) {
    ctx.save(); ctx.translate(SKYX, HORIZON);
    ctx.strokeStyle = C.gold; ctx.lineWidth = 3; ctx.lineJoin = 'round';
    strokePoly(ctx, SKY, sp);
    // the pen tip glint
    if (sp < 1) { const [px, py] = polyAt(SKY, sp); ctx.fillStyle = C.goldL; ctx.beginPath(); ctx.arc(px, py, 6, 0, TAU); ctx.fill(); }
    // labels under each city
    const lab = (s, x, a) => withAlpha(ctx, a, () => word(ctx, s, x, 50, font(24, 700, UI), 24, C.goldL, 8));
    lab('DUBAI', 210, E.outCubic(prog(u, 9.6, 10.2)));
    lab('UNITED STATES', 790, E.outCubic(prog(u, 11.1, 11.7)));
    // plane: Burj Khalifa -> Liberty
    const pp = E.inOutCubic(prog(u, 10.2, 11.6));
    if (pp > 0 && pp < 1.0001) {
      ctx.setLineDash([6, 10]); ctx.lineWidth = 2; ctx.strokeStyle = C.goldL; ctx.globalAlpha *= 0.8;
      strokePoly(ctx, PLANE_ARC, pp);
      ctx.setLineDash([]);
      const [x, y, a] = polyAt(PLANE_ARC, pp);
      const fade = 1 - prog(u, 11.5, 11.8);
      ctx.globalAlpha = (1 - skyOut) * fade;
      ctx.save(); ctx.translate(x, y); ctx.rotate(a); ctx.fillStyle = C.goldL;
      ctx.beginPath(); ctx.moveTo(22, 0); ctx.lineTo(-4, -4); ctx.lineTo(-10, -20); ctx.lineTo(-16, -20); ctx.lineTo(-12, -4); ctx.lineTo(-20, -3); ctx.lineTo(-25, -10); ctx.lineTo(-28, -10); ctx.lineTo(-26, 0);
      ctx.lineTo(-28, 10); ctx.lineTo(-25, 10); ctx.lineTo(-20, 3); ctx.lineTo(-12, 4); ctx.lineTo(-16, 20); ctx.lineTo(-10, 20); ctx.lineTo(-4, 4); ctx.closePath(); ctx.fill();
      ctx.restore();
    }
    ctx.restore();
  }
  ctx.restore();

  // persona in the gold arch
  if (u > 11.9) archPersona(ctx, u, 12, IMG, { y0: 600, y1: 1356, w: 600 });
  ctx.restore();
}

// arch (the logo's arc over the skyline) with the persona breaking out of it
function archPersona(ctx, u, u0, IMG, { y0, y1, w, badge = true }) {
  const x0 = CX - w / 2, x1 = CX + w / 2, r = w / 2, yc = y0 + r;
  const dp = E.inOutCubic(prog(u, u0, u0 + 1));
  const half = [[x0, y1], ...arcPts(CX, yc, r, r, Math.PI, Math.PI * 1.5, 30)];
  const halfR = [[x1, y1], ...arcPts(CX, yc, r, r, 0, -Math.PI / 2, 30)];
  // interior
  withAlpha(ctx, E.outCubic(prog(u, u0 + 0.2, u0 + 1)), () => {
    ctx.save();
    ctx.beginPath(); ctx.moveTo(x0, y1); ctx.lineTo(x0, yc); ctx.arc(CX, yc, r, Math.PI, 0); ctx.lineTo(x1, y1); ctx.closePath();
    const g = ctx.createLinearGradient(0, y0, 0, y1);
    g.addColorStop(0, '#1C438C'); g.addColorStop(0.6, '#102C63'); g.addColorStop(1, '#0A2148');
    ctx.fillStyle = g; ctx.fill(); ctx.clip();
    // warm glow behind the head
    const gl = ctx.createRadialGradient(CX, y0 + 260, 10, CX, y0 + 260, 420);
    gl.addColorStop(0, 'rgba(246,227,161,0.32)'); gl.addColorStop(1, 'rgba(246,227,161,0)');
    ctx.fillStyle = gl; ctx.fillRect(x0, y0, w, y1 - y0);
    // New York skyline inside, small
    ctx.translate(CX - 0.62 * 790, y1 - 150); ctx.scale(0.62, 0.62);
    ctx.strokeStyle = C.gold; ctx.globalAlpha *= 0.55; ctx.lineWidth = 3 / 0.62;
    strokePoly(ctx, SKY.slice(SKY.findIndex((q) => q[0] >= 580)), E.inOutSine(prog(u, u0 + 0.5, u0 + 2)));
    ctx.restore();
  });
  // persona: rises with a spring, squash on landing
  const img = IMG.persona;
  if (img) {
    const k = springU(u, u0 + 0.2, { stiffness: 200, damping: 19 });
    if (k > 0) {
      const pw = w * 1.24, ph = pw * (img.height / img.width);
      const py = y1 - ph + 40 + (1 - k) * 700;
      const q = 0.025 * wobble(u - (u0 + 0.75), 2, 5);
      const push = 1 + 0.03 * prog(u, u0 + 1, u0 + 4);
      ctx.save();
      scaleAbout(ctx, push * (1 + q), CX, y1, push * (1 - q));
      ctx.beginPath(); ctx.rect(0, 0, W, y1); ctx.clip();
      ctx.drawImage(img, CX - pw / 2, py, pw, ph);
      ctx.restore();
    }
  }
  // gold arch stroke, from both feet to the apex (drawn over her where it passes behind? no: behind arms reads wrong, keep in front only at the top)
  ctx.save();
  ctx.lineWidth = 5; ctx.lineCap = 'round'; ctx.strokeStyle = goldLinear(ctx, x0, y0, x1, y1);
  strokePoly(ctx, half, dp); strokePoly(ctx, halfR, dp);
  ctx.lineWidth = 1.5; ctx.globalAlpha *= 0.6; ctx.strokeStyle = C.gold;
  const off = 18;
  strokePoly(ctx, [[x0 - off, y1], ...arcPts(CX, yc, r + off, r + off, Math.PI, Math.PI * 1.5, 30)], dp * 0.98);
  strokePoly(ctx, [[x1 + off, y1], ...arcPts(CX, yc, r + off, r + off, 0, -Math.PI / 2, 30)], dp * 0.98);
  ctx.restore();
  // apex diamond
  const kd = springU(u, u0 + 0.95, SPRING.bouncy);
  if (kd > 0) { ctx.fillStyle = C.goldL; diamond(ctx, CX, y0 - 18 - 1, 12 * kd); ctx.fill(); }
  // logo badge on the arch shoulder
  if (badge && IMG.logo) {
    const kb = springU(u, u0 + 1.5, SPRING.bouncy);
    if (kb > 0) {
      const bx = x1 - 10, by = yc - 30, br = 78 * kb;
      ctx.save(); ctx.translate(bx, by); ctx.rotate((1 - kb) * 1.2);
      ctx.drawImage(IMG.logo, -br, -br, br * 2, br * 2);
      ctx.restore();
    }
  }
}

// ---------------------------------------------------------------- S3 pathway cards   (u 16..40)
const CARDS = [
  { u: 16, n: '01', icon: 'trophy', desc: 'EXTRAORDINARY ABILITY' },
  { u: 22, n: '02', icon: 'doc', desc: 'NATIONAL INTEREST WAIVER' },
  { u: 28, n: '03', icon: 'chart', desc: 'TREATY INVESTOR VISA' },
  { u: 34, n: '04', icon: 'family', desc: 'SPONSORED BY U.S. RELATIVES' },
];
const MED = { x: CX, y: 650, r: 168 };
const LEAD = 1;   // card content runs one beat ahead of the card's slot

function medallion(ctx, u, c, i) {
  const k = springU(u, c - 0.1, SPRING.bouncy);
  if (k <= 0) return;
  ctx.save(); scaleAbout(ctx, k, MED.x, MED.y);
  const g = ctx.createRadialGradient(MED.x - 40, MED.y - 50, 10, MED.x, MED.y, MED.r);
  g.addColorStop(0, '#1A3E86'); g.addColorStop(1, '#06173A');
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(MED.x, MED.y, MED.r, 0, TAU); ctx.fill();
  const rp = E.outCubic(prog(u, c, c + 1));
  ctx.lineCap = 'round';
  ctx.strokeStyle = goldLinear(ctx, MED.x - MED.r, MED.y - MED.r, MED.x + MED.r, MED.y + MED.r); ctx.lineWidth = 6;
  ctx.beginPath(); ctx.arc(MED.x, MED.y, MED.r, -Math.PI / 2, -Math.PI / 2 + TAU * rp); ctx.stroke();
  ctx.strokeStyle = C.gold; ctx.lineWidth = 1.5; ctx.globalAlpha *= 0.55;
  ctx.beginPath(); ctx.arc(MED.x, MED.y, MED.r - 16, Math.PI / 2, Math.PI / 2 - TAU * rp, true); ctx.stroke();
  ctx.restore();
  // the icon
  const ip = E.inOutCubic(prog(u, c + 0.2, c + 1.6));
  const icon = CARDS[i].icon;
  const S = 98;
  if (icon === 'trophy') {
    const pop = 1 + 0.08 * wobble(u - (c + 1.75), 2.4, 5);
    ctx.save(); scaleAbout(ctx, pop, MED.x, MED.y);
    drawIcon(ctx, 'trophy', MED.x, MED.y + 4, S, ip, 7);
    // star in the cup
    const ks = springU(u, c + 1.5, SPRING.bouncy);
    if (ks > 0) { ctx.fillStyle = goldLinear(ctx, MED.x - 20, MED.y - 70, MED.x + 20, MED.y - 20); star(ctx, MED.x, MED.y - 36, 26 * ks, u * 0.3); ctx.fill(); }
    ctx.restore();
    // shine across the cup
    const sh = prog(u, c + 1.6, c + 2.3);
    if (sh > 0 && sh < 1) {
      ctx.save(); ctx.beginPath(); ctx.arc(MED.x, MED.y, MED.r - 20, 0, TAU); ctx.clip();
      ctx.translate(lerp(MED.x - 200, MED.x + 200, sh), MED.y); ctx.rotate(0.5);
      const lg = ctx.createLinearGradient(-30, 0, 30, 0);
      lg.addColorStop(0, 'rgba(255,240,190,0)'); lg.addColorStop(0.5, 'rgba(255,240,190,0.55)'); lg.addColorStop(1, 'rgba(255,240,190,0)');
      ctx.fillStyle = lg; ctx.fillRect(-30, -260, 60, 520); ctx.restore();
    }
  } else if (icon === 'doc') {
    drawIcon(ctx, 'doc', MED.x - 8, MED.y, S, ip, 7);
    // seal stamps
    const ks = springU(u, c + 2.2, { stiffness: 500, damping: 22 });
    if (ks > 0) {
      const s = lerp(2.2, 1, ks);
      ctx.save(); ctx.translate(MED.x + 52, MED.y + 52); ctx.scale(s, s); ctx.rotate(-0.25 + (1 - ks) * 0.6);
      ctx.globalAlpha = clamp(ks * 2);
      ctx.fillStyle = goldLinear(ctx, -30, -30, 30, 30);
      ctx.beginPath(); ctx.moveTo(-14, 18); ctx.lineTo(-22, 52); ctx.lineTo(-8, 44); ctx.lineTo(0, 56); ctx.lineTo(4, 20); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(14, 18); ctx.lineTo(22, 52); ctx.lineTo(8, 44); ctx.lineTo(0, 56); ctx.lineTo(-4, 20); ctx.closePath(); ctx.fill();
      star(ctx, 0, 0, 34); ctx.fill();
      ctx.fillStyle = C.navy; star(ctx, 0, 0, 14); ctx.fill();
      ctx.restore();
    }
  } else if (icon === 'chart') {
    drawIcon(ctx, 'chart', MED.x, MED.y, S, ip, 7);
    const hs = [0.32, 0.52, 0.74, 1.0];
    hs.forEach((h, j) => {
      const kb = springU(u, c + 1 + j * 0.5, SPRING.bouncy);
      if (kb <= 0) return;
      const bw = 0.24 * S, bx = MED.x + (-0.52 + j * 0.32) * S, base = MED.y + 0.6 * S, bh = h * 1.05 * S * kb;
      ctx.fillStyle = goldLinear(ctx, bx, base - bh, bx + bw, base);
      rrect(ctx, bx, base - bh, bw, bh, 4); ctx.fill();
    });
    // arrow shoots up-right
    const ap = E.outCubic(prog(u, c + 3, c + 3.6));
    if (ap > 0) {
      const pts = [[-0.62, 0.2], [-0.2, -0.18], [0.08, 0.02], [0.66, -0.66]].map(([x, y]) => [MED.x + x * S, MED.y + y * S]);
      ctx.save(); ctx.strokeStyle = C.goldL; ctx.lineWidth = 8; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      strokePoly(ctx, pts, ap);
      const [hx, hy, ha] = polyAt(pts, ap);
      ctx.translate(hx, hy); ctx.rotate(ha); ctx.fillStyle = C.goldL;
      ctx.beginPath(); ctx.moveTo(14, 0); ctx.lineTo(-16, -16); ctx.lineTo(-16, 16); ctx.closePath(); ctx.fill();
      ctx.restore();
    }
  } else if (icon === 'family') {
    const fig = ICON.family;
    [[2, 3], [0, 1], [4, 5]].forEach((pair, j) => {
      const kf2 = springU(u, c + 1 + j * 0.5, SPRING.bouncy);
      if (kf2 <= 0) return;
      const fx = MED.x + [-0.54, 0, 0.54][j] * S, fy = MED.y + 0.5 * S;
      ctx.save(); ctx.translate(fx, fy); ctx.scale(kf2, kf2); ctx.translate(-fx, -fy);
      ctx.translate(MED.x, MED.y + 14); ctx.scale(S, S);
      ctx.lineWidth = 7 / S; ctx.strokeStyle = C.gold; ctx.lineCap = 'round';
      pair.forEach((pi) => strokePoly(ctx, fig[pi], 1));
      ctx.restore();
    });
    const rp2 = E.outCubic(prog(u, c + 2.4, c + 3));
    if (rp2 > 0) {
      ctx.save(); ctx.translate(MED.x, MED.y + 14); ctx.scale(S, S);
      ctx.lineWidth = 7 / S; ctx.strokeStyle = C.goldL; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      strokePoly(ctx, ROOF, rp2); ctx.restore();
    }
  }
}

function cardName(ctx, u, c, i) {
  if (i === 0) {
    const f = font(250, 800, DISPLAY);
    word(ctx, 'EB-1', CX, 1045, f, 250, 'gold', 2, (j) => {
      const k = springU(u, c + 0.75 + j * 0.07, { stiffness: 300, damping: 14 });
      return { dy: (1 - k) * -520, a: k > 0 ? 1 : 0, sy: 1 + 0.12 * wobble(u - (c + 1 + j * 0.07), 2.5, 6), sx: 1 - 0.06 * wobble(u - (c + 1 + j * 0.07), 2.5, 6) };
    });
  } else if (i === 1) {
    const f = font(200, 800, DISPLAY), fb = font(112, 800, DISPLAY);
    const L = layout(ctx, 'EB-2', f, 0), Lb = layout(ctx, 'NIW', fb, 4);
    const bw = Lb.width + 64, gap = 34, tot = L.width + gap + bw, x0 = CX - tot / 2;
    word(ctx, 'EB-2', x0 + L.width / 2, 1030, f, 200, C.cream, 0, (j) => {
      const k = springU(u, c + 0.7 + j * 0.05, SPRING.snappy);
      return { dx: (1 - k) * -700, skew: (1 - k) * 0.5, a: k > 0 ? 1 : 0 };
    });
    const kb = springU(u, c + 1.45, SPRING.bouncy);
    if (kb > 0) {
      const bx = x0 + L.width + gap, by = 1030 - 118, bh = 150;
      ctx.save(); scaleAbout(ctx, kb, bx + bw / 2, by + bh / 2);
      rrect(ctx, bx, by, bw, bh, 22); ctx.fillStyle = goldLinear(ctx, bx, by, bx + bw, by + bh); ctx.fill();
      word(ctx, 'NIW', bx + bw / 2, by + bh / 2 + 40, fb, 112, C.ink, 4);
      ctx.restore();
    }
  } else if (i === 2) {
    const f = font(240, 800, DISPLAY), f2 = font(112, 600, DISPLAY);
    const k = springU(u, c + 0.7, { stiffness: 380, damping: 15 });
    if (k > 0) { ctx.save(); scaleAbout(ctx, lerp(2.2, 1, k), CX, 900); withAlpha(ctx, k * 3, () => word(ctx, 'E-2', CX, 975, f, 240, 'gold', 2)); ctx.restore(); }
    ctx.save(); ctx.beginPath(); ctx.rect(0, 990, W, 120); ctx.clip();
    word(ctx, 'Investor', CX, 1090, f2, 112, C.cream, 1, (j) => {
      const kk = springU(u, c + 1.3 + j * 0.04, SPRING.snappy);
      return { dy: (1 - kk) * 120 };
    });
    ctx.restore();
  } else {
    const f = font(170, 800, DISPLAY), f2 = font(106, 600, DISPLAY);
    ctx.save(); ctx.beginPath(); ctx.rect(0, 800, W, 200); ctx.clip();
    word(ctx, 'Family', CX, 975, f, 170, 'gold', 1, (j) => {
      const kk = springU(u, c + 0.65 + j * 0.05, SPRING.snappy);
      return { dy: (1 - kk) * 180 };
    });
    ctx.restore();
    word(ctx, 'Immigration', CX, 1090, f2, 106, C.cream, 0, (j) => {
      const kk = springU(u, c + 1.1 + j * 0.035, SPRING.snappy);
      return { dx: (1 - kk) * 600, a: kk > 0 ? clamp(kk * 2) : 0 };
    });
  }
}

function card(ctx, u, i) {
  const c = CARDS[i].u - LEAD;
  // giant outline numeral behind, drifting (parallax depth)
  const fn = font(820, 900, DISPLAY);
  withAlpha(ctx, 0.085 * E.outCubic(prog(u, c - 0.2, c + 0.8)), () => {
    ctx.save(); ctx.translate((c + 3 - u) * 14, 0);
    ctx.font = fn; ctx.textAlign = 'center'; ctx.lineWidth = 3; ctx.strokeStyle = C.gold;
    ctx.strokeText(CARDS[i].n, CX, 1010);
    ctx.restore();
  });
  // progress diamonds + label
  for (let d = 0; d < 4; d++) {
    const x = CX + (d - 1.5) * 46, y = 330;
    ctx.lineWidth = 2; ctx.strokeStyle = C.gold;
    const on = d < i ? 1 : d === i ? springU(u, c + 0.1, SPRING.bouncy) : 0;
    diamond(ctx, x, y, 10); ctx.stroke();
    if (on > 0) { ctx.fillStyle = C.gold; diamond(ctx, x, y, 10 * Math.min(1.3, on)); ctx.fill(); }
  }
  const fl = font(30, 700, UI);
  word(ctx, `PATHWAY ${CARDS[i].n}`, CX, 405, fl, 30, C.goldL, 12, (j, n) => ({ a: clamp((u - c - 0.05 - j * 0.03) * 4) }));
  medallion(ctx, u, c, i);
  cardName(ctx, u, c, i);
  // rule with the logo's centre diamond
  const rp = E.outCubic(prog(u, c + 1.5, c + 2.3));
  if (rp > 0) {
    const y = 1135;
    ctx.strokeStyle = goldLinear(ctx, CX - 260, y, CX + 260, y); ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(CX - 24, y); ctx.lineTo(CX - 24 - 230 * rp, y); ctx.moveTo(CX + 24, y); ctx.lineTo(CX + 24 + 230 * rp, y); ctx.stroke();
    ctx.fillStyle = C.goldL; diamond(ctx, CX, y, 9 * Math.min(1, rp * 2)); ctx.fill();
  }
  // descriptor (spaced caps); EB-2's types on
  const ds = CARDS[i].desc;
  const size = fit(ctx, ds, 600, UI, 800, 38, 0.2);
  const fd = font(size, 600, UI);
  word(ctx, ds, CX, 1205, fd, size, C.cream, size * 0.2, (j, n) => {
    if (i === 1) return { a: u >= c + 2.75 + j * 0.06 ? 1 : 0 };
    const k = springU(u, c + 2 + j * 0.025, SPRING.snappy);
    return { dy: (1 - k) * 30, a: clamp(k * 1.5) };
  });
}

function scenePathways(ctx, u) {
  for (let i = 0; i < 4; i++) {
    const c = CARDS[i].u;
    if (u < c - 0.5 || u > [22.1, 28.12, 34.16, 40.0][i]) continue;
    ctx.save();
    // entrances
    if (i === 0) ctx.translate(W * 1.1 * (1 - E.inOutCubic(prog(u, 15.62, 16.08))), 0);
    if (i === 1) ctx.translate(0, H * (1 - E.inOutCubic(prog(u, 21.62, 22.08))));
    // exits
    if (i === 0) ctx.translate(0, -H * E.inOutCubic(prog(u, 21.62, 22.08)));
    if (i === 1) {
      const z = E.inCubic(prog(u, 27.6, 28.1));
      if (z > 0) { scaleAbout(ctx, 1 + 5 * z, MED.x, MED.y); ctx.globalAlpha = 1 - E.inQuad(prog(u, 27.8, 28.1)); }
    }
    if (i === 2 && u < 28.15) {
      // iris: revealed inside a circle growing from the medallion
      const ir = E.inOutCubic(prog(u, 27.62, 28.12));
      ctx.beginPath(); ctx.arc(MED.x, MED.y, lerp(0, 1500, ir), 0, TAU); ctx.clip();
      background(ctx, u);
      scaleAbout(ctx, lerp(0.7, 1, ir), MED.x, MED.y);
    }
    if (i === 3 && u < 34.2) {
      const wp = E.inOutCubic(prog(u, 33.6, 34.15));
      clipDiagonal(ctx, wp);
      background(ctx, u);
    }
    if (i === 3) {
      // break: the card shrinks into recap pill 04
      const s = E.inOutCubic(prog(u, 38.4, 39.95));
      if (s > 0) {
        const P = PILLS[3];
        const tx = P.x + 58, ty = P.y + P.h / 2;   // pill 04's icon centre
        ctx.translate(lerp(0, tx - MED.x, s), lerp(0, ty - MED.y, s));
        scaleAbout(ctx, lerp(1, 40 / MED.r, s), MED.x, MED.y);
        ctx.globalAlpha = 1 - E.inQuad(prog(u, 39.5, 39.98));
      }
    }
    const push = 1 + 0.035 * E.inOutSine(prog(u, c, c + 6));
    scaleAbout(ctx, push, CX, 800);
    card(ctx, u, i);
    ctx.restore();
    if (i === 3 && u < 34.2) goldBand(ctx, E.inOutCubic(prog(u, 33.6, 34.15)));
  }
}
// diagonal wipe geometry: band edge line at progress p across the frame (rotated 20 deg)
function wipeEdge(p) { return lerp(-500, W + 900, p); }
function clipDiagonal(ctx, p) {
  const e = wipeEdge(p);
  ctx.beginPath(); ctx.moveTo(-600, -200); ctx.lineTo(e - 400, -200); ctx.lineTo(e - 400 - 0.36 * (H + 400), H + 200); ctx.lineTo(-600, H + 200); ctx.closePath(); ctx.clip();
}
function goldBand(ctx, p) {
  if (p <= 0 || p >= 1) return;
  const e = wipeEdge(p) - 400, sl = 0.36 * (H + 400);
  ctx.save();
  ctx.beginPath(); ctx.moveTo(e, -200); ctx.lineTo(e + 120, -200); ctx.lineTo(e + 120 - sl, H + 200); ctx.lineTo(e - sl, H + 200); ctx.closePath();
  ctx.fillStyle = goldLinear(ctx, e - sl, 0, e + 120, 0); ctx.fill();
  ctx.restore();
}

// ---------------------------------------------------------------- S4 recap + CTA   (u 38..48)
const PILLS = (() => {
  const w = 392, h = 116, gap = 16, x0 = CX - w - gap / 2;
  return [
    { label: ['EB-1'], icon: 'trophy', x: x0, y: 300, w, h },
    { label: ['EB-2 NIW'], icon: 'doc', x: x0 + w + gap, y: 300, w, h },
    { label: ['E-2 Investor'], icon: 'chart', x: x0, y: 300 + h + gap, w, h },
    { label: ['Family', 'Immigration'], icon: 'family', x: x0 + w + gap, y: 300 + h + gap, w, h },
  ];
})();
function pill(ctx, P, k, u) {
  const { x, y, w, h } = P;
  ctx.save();
  rrect(ctx, x, y, w, h, h / 2);
  const g = ctx.createLinearGradient(0, y, 0, y + h); g.addColorStop(0, '#FFFFFF'); g.addColorStop(1, '#EDE6D6');
  ctx.fillStyle = g; ctx.fill();
  ctx.lineWidth = 3; ctx.strokeStyle = goldLinear(ctx, x, y, x + w, y + h); ctx.stroke();
  // icon disc
  const ix = x + 58, iy = y + h / 2;
  ctx.fillStyle = C.navy; ctx.beginPath(); ctx.arc(ix, iy, 42, 0, TAU); ctx.fill();
  ctx.lineWidth = 2.5; ctx.strokeStyle = C.gold; ctx.beginPath(); ctx.arc(ix, iy, 42, 0, TAU); ctx.stroke();
  if (P.icon === 'chart') {
    drawIcon(ctx, 'chart', ix, iy, 24, 1, 3.5);
    [0.32, 0.52, 0.74, 1].forEach((hh, j) => { const bw = 0.24 * 24, bx = ix + (-0.52 + j * 0.32) * 24, base = iy + 0.6 * 24; ctx.fillStyle = C.gold; ctx.fillRect(bx, base - hh * 25, bw, hh * 25); });
  } else if (P.icon === 'family') {
    ctx.save(); ctx.translate(ix, iy + 3); ctx.scale(24, 24); ctx.lineWidth = 3.5 / 24; ctx.strokeStyle = C.gold; ctx.lineCap = 'round';
    ICON.family.forEach((pts) => strokePoly(ctx, pts, 1)); strokePoly(ctx, ROOF, 1); ctx.restore();
  } else drawIcon(ctx, P.icon, ix, iy, 24, 1, 3.5);
  // label
  ctx.fillStyle = C.navy; ctx.fillRect(x + 112, y + 26, 2, h - 52);
  const tx = x + 132;
  if (P.label.length === 1) {
    const s = fit(ctx, P.label[0], 700, DISPLAY, w - 160, 46);
    const f = font(s, 700, DISPLAY);
    ctx.font = f; ctx.fillStyle = C.ink; ctx.textAlign = 'left'; ctx.fillText(P.label[0], tx, y + h / 2 + s * 0.34);
  } else {
    const f = font(36, 700, DISPLAY);
    ctx.font = f; ctx.fillStyle = C.ink; ctx.textAlign = 'left';
    ctx.fillText(P.label[0], tx, y + h / 2 - 6); ctx.fillText(P.label[1], tx, y + h / 2 + 34);
  }
  ctx.restore();
}
function sceneRecap(ctx, u, IMG) {
  const zin = E.inCubic(prog(u, 47.55, 48.02));                 // zoom into the CTA arrow
  ctx.save();
  if (zin > 0) { scaleAbout(ctx, 1 + 5 * zin, ARROW.x, ARROW.y); ctx.globalAlpha = 1 - E.inQuad(zin); }
  shake(ctx, u, 40, 12, 8, 0.15);
  // arch + persona below the pills
  if (u > 41) archPersona(ctx, u, 41.1, IMG, { y0: 620, y1: 1356, w: 540, badge: false });
  // pills: 04 is the Family card arriving; the others drop in with squash
  PILLS.forEach((P, j) => {
    let k, dy = 0, sq = 0;
    if (j === 3) { const g = E.outCubic(prog(u, 39.55, 39.98)); k = g; sq = 0.06 * wobble(u - 39.98, 2.5, 6) - (1 - g) * 0.0; }
    else {
      const t0 = 40 + [0, 0.33, 0.67][j];
      const s = springU(u, t0 - 0.12, { stiffness: 320, damping: 17 });
      k = s > 0 ? 1 : 0; dy = (1 - s) * -520; sq = 0.07 * wobble(u - t0, 2.5, 6);
    }
    if (!k) return;
    const breathe = 1 + 0.012 * Math.sin((u - 40) * Math.PI / 2 + j);
    ctx.save(); ctx.translate(0, dy);
    if (j === 3 && k < 1) { scaleAbout(ctx, lerp(0.35, 1, k), P.x + 58, P.y + P.h / 2); ctx.globalAlpha *= k; }
    scaleAbout(ctx, breathe * (1 + sq), P.x + P.w / 2, P.y + P.h, breathe * (1 - sq));
    pill(ctx, P, k, u);
    ctx.restore();
  });
  ctx.restore();
  return zin;
}

// ---------------------------------------------------------------- S5 end card   (u 48..52)
function sceneEnd(ctx, u, IMG) {
  const L = { x: CX, y: 740, r: 300 };
  const k = springU(u, 47.6, { stiffness: 230, damping: 17 });
  // shockwave ring (one, not a burst)
  const sw = prog(u, 48, 49.6);
  if (sw > 0 && sw < 1) {
    ctx.save(); ctx.strokeStyle = C.gold; ctx.globalAlpha = (1 - sw) * 0.7; ctx.lineWidth = 4 * (1 - sw) + 1;
    ctx.beginPath(); ctx.arc(L.x, L.y, L.r + E.outCubic(sw) * 650, 0, TAU); ctx.stroke(); ctx.restore();
  }
  // logo: coin flip into place
  const ang = (1 - E.outCubic(prog(u, 47.55, 48.08))) * Math.PI * 3;
  const sx = Math.cos(ang);
  const breathe = 1 + 0.012 * Math.sin((u - 48) * 1.6);
  const s = k * breathe;
  if (s > 0 && IMG.logo) {
    ctx.save(); ctx.translate(L.x, L.y); ctx.scale(s * Math.max(0.02, Math.abs(sx)), s);
    if (sx >= 0) ctx.drawImage(IMG.logo, -L.r, -L.r, L.r * 2, L.r * 2);
    else { ctx.fillStyle = goldLinear(ctx, -L.r, -L.r, L.r, L.r); ctx.beginPath(); ctx.arc(0, 0, L.r, 0, TAU); ctx.fill(); }
    ctx.restore();
    // glints
    for (const g0 of [48.45, 50.45]) {
      const gp = prog(u, g0, g0 + 0.7);
      if (gp <= 0 || gp >= 1) continue;
      ctx.save(); ctx.beginPath(); ctx.arc(L.x, L.y, L.r * s, 0, TAU); ctx.clip();
      ctx.globalCompositeOperation = 'screen';
      ctx.translate(lerp(L.x - 420, L.x + 420, E.inOutSine(gp)), L.y); ctx.rotate(0.55);
      const lg = ctx.createLinearGradient(-60, 0, 60, 0);
      lg.addColorStop(0, 'rgba(255,240,190,0)'); lg.addColorStop(0.5, 'rgba(255,240,190,0.6)'); lg.addColorStop(1, 'rgba(255,240,190,0)');
      ctx.fillStyle = lg; ctx.fillRect(-60, -500, 120, 1000); ctx.restore();
    }
  }
  // footer lockup (from the poster)
  const fa = font(58, 600, UI), fi = font(25, 600, UI);
  const LA = word(ctx, 'AVC DUBAI', CX, 1170, fa, 58, 'gold', 22, (j) => {
    const kk = springU(u, 48.9 + j * 0.04, SPRING.snappy);
    return { dy: (1 - kk) * 50, a: clamp(kk * 1.5) };
  });
  const rp = E.outCubic(prog(u, 49.1, 49.9));
  if (rp > 0) {
    ctx.strokeStyle = C.gold; ctx.lineWidth = 2;
    const y = 1150, half = LA.width / 2;
    ctx.beginPath(); ctx.moveTo(CX - half - 20, y - 18); ctx.lineTo(CX - half - 20 - 110 * rp, y - 18); ctx.moveTo(CX + half + 20, y - 18); ctx.lineTo(CX + half + 20 + 110 * rp, y - 18); ctx.stroke();
  }
  word(ctx, 'IMMIGRATION CONSULTANTS', CX, 1232, fi, 25, C.cream, 10, (j, n) => ({ a: clamp((u - 49.4 - Math.abs(j - n / 2) * 0.03) * 3) }));
}

// ---------------------------------------------------------------- captions (steady, all through)
const CAPS = [
  { u: 0, words: [['Your', -0.2], ['U.S.', 0.85], ['immigration', 2.35], ['options…', 3.35]] },
  { u: 8, words: [['…may', 8.15], ['be', 8.3], ['broader', 8.45], ['than', 8.9], ['you', 9.05], ['think.', 9.2]] },
  { u: 16, text: 'EB-1 — for extraordinary ability.', at: 16.6, rate: 0.16 },
  { u: 22, text: 'EB-2 NIW — the National Interest Waiver.', at: 22.6, rate: 0.16 },
  { u: 28, text: 'E-2 Investor — invest in and run a U.S. business.', at: 28.6, rate: 0.14 },
  { u: 34, text: 'Family Immigration — through U.S. relatives.', at: 34.6, rate: 0.16 },
  { u: 40, text: "Let's explore which pathway may fit your profile.", at: 40.2, rate: 0.42 },
  { u: 48, text: 'Message AVC Dubai today.', at: 48.12, rate: 0.16, icon: 'envelope' },
];
CAPS.forEach((c) => { if (!c.words) c.words = c.text.split(' ').map((w, i) => [w, c.at + i * c.rate]); });
const BOX = { x: CX - 450, y: 1346, w: 900, h: 140 };
const ARROW = { x: BOX.x + BOX.w - 66, y: BOX.y + BOX.h / 2, r: 44 };

function capLines(ctx, words, f, maxW) {
  ctx.font = f;
  const lines = [[]];
  let w = 0;
  const sp = ctx.measureText(' ').width;
  words.forEach((wd) => {
    const ww = ctx.measureText(wd[0]).width;
    if (lines[lines.length - 1].length && w + sp + ww > maxW) { lines.push([]); w = 0; }
    const line = lines[lines.length - 1];
    line.push({ s: wd[0], t: wd[1], w: ww, x: line.length ? w + sp : 0 });
    w = line.length > 1 ? w + sp + ww : ww;
    line.width = w;
  });
  return lines;
}
function captions(ctx, u) {
  const gold = E.inOutCubic(prog(u, 43.85, 44.25));               // the caption becomes the CTA
  const punch = 1 + 0.05 * wobble(u - 44, 2.2, 5) * (u > 44 ? 1 : 0);
  const appear = E.outCubic(prog(u, -1, -0.2));
  ctx.save();
  scaleAbout(ctx, punch, CX, BOX.y + BOX.h / 2);
  // box: navy glass -> gold
  rrect(ctx, BOX.x, BOX.y, BOX.w, BOX.h, 30);
  ctx.fillStyle = `rgba(4,18,43,${0.78 * appear})`; ctx.fill();
  if (gold > 0) { ctx.globalAlpha = gold; ctx.fillStyle = goldLinear(ctx, BOX.x, BOX.y, BOX.x + BOX.w, BOX.y + BOX.h); ctx.fill(); ctx.globalAlpha = 1; }
  ctx.lineWidth = 2; ctx.strokeStyle = gold > 0.5 ? 'rgba(255,240,190,0.9)' : 'rgba(212,175,90,0.75)'; ctx.stroke();
  // thin progress line along the bottom edge (the whole film)
  ctx.save(); rrect(ctx, BOX.x, BOX.y, BOX.w, BOX.h, 30); ctx.clip();
  ctx.fillStyle = gold > 0.5 ? C.ink : C.gold; ctx.globalAlpha = 0.85;
  ctx.fillRect(BOX.x, BOX.y + BOX.h - 5, BOX.w * clamp(u / 52), 5); ctx.restore();

  const cta = gold > 0.5;
  const right = 120 * gold;
  // CTA arrow circle
  if (gold > 0) {
    const ka = springU(u, 44.05, SPRING.bouncy);
    const nudge = [45, 46, 47].reduce((a, b) => a + 14 * bump(u, b + 0.1, 0.35), 0);
    ctx.save(); ctx.translate(ARROW.x, ARROW.y); ctx.scale(ka, ka);
    ctx.fillStyle = C.ink; ctx.beginPath(); ctx.arc(0, 0, ARROW.r, 0, TAU); ctx.fill();
    ctx.translate(nudge, 0); ctx.scale(30, 30); ctx.lineWidth = 4 / 30; ctx.strokeStyle = C.goldL; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ICON.arrow.forEach((p) => strokePoly(ctx, p, 1));
    ctx.restore();
  }
  // text
  const f = font(43, 600, UI);
  const col = mix(C.white, C.ink, gold);
  CAPS.forEach((cap, ci) => {
    const next = CAPS[ci + 1];
    const end = next ? next.u : 99;
    if (u < cap.u - 0.3 || u > end + 0.3) return;
    const fadeOut = next ? E.inQuad(prog(u, end - 0.05, end + 0.2)) : 0;
    if (fadeOut >= 1) return;
    const icon = cap.icon ? 58 : 0;
    const maxW = (ci >= 6 ? BOX.w - 220 : BOX.w - 90) - icon;
    const lines = capLines(ctx, cap.words, f, maxW);
    const lh = 54;
    const cy = BOX.y + BOX.h / 2 - ((lines.length - 1) * lh) / 2 + 15;
    const areaCx = BOX.x + (BOX.w - right) / 2 + icon / 2;
    lines.forEach((line, li) => {
      const x0 = areaCx - line.width / 2;
      line.forEach((wd) => {
        const p = E.outCubic(prog(u, wd.t, wd.t + 0.3));
        if (p <= 0) return;
        ctx.globalAlpha = p * (1 - fadeOut);
        ctx.font = f; ctx.textAlign = 'left'; ctx.fillStyle = col;
        // key words carry the accent
        if (gold < 0.5 && /U\.S\.|broader|EB-1|EB-2|NIW|E-2|Investor|Family|Immigration$/.test(wd.s)) ctx.fillStyle = C.goldL;
        ctx.fillText(wd.s, x0 + wd.x, cy + li * lh + (1 - p) * 10 - fadeOut * 8);
      });
      if (cap.icon && li === 0) {
        const p = E.outCubic(prog(u, cap.at - 0.3, cap.at + 0.4));
        ctx.globalAlpha = 1 - fadeOut;
        drawIcon(ctx, cap.icon, x0 - 40, cy - 13, 22, p, 3.5, col);
      }
    });
    ctx.globalAlpha = 1;
  });
  ctx.restore();
}

// ---------------------------------------------------------------- film
M.film({
  fonts: [font(100, 900, DISPLAY), font(100, 800, DISPLAY), font(100, 700, DISPLAY), font(100, 600, DISPLAY), font(40, 600, UI), font(40, 700, UI)],
  images: { logo: 'assets/logo.png', persona: 'assets/persona.png' },
  hits: HITS,
  init() { initArt(); },
  draw(ctx, u, t, IMG) {
    const glow = bump(u, 8.2, 2) * 0.8 + bump(u, 48.2, 2) * 0.6 + bump(u, 1.1, 1) * 0.3;
    background(ctx, u, glow);
    if (u < 8.05) sceneHook(ctx, u);
    if (u >= 7.95 && u < 16.2) sceneBroader(ctx, u, IMG);
    if (u >= 15.5 && u < 40.1) scenePathways(ctx, u);
    let zin = 0;
    if (u >= 38.4 && u < 48.05) zin = sceneRecap(ctx, u, IMG);
    if (zin > 0.5) { ctx.globalAlpha = (zin - 0.5) / 0.5; background(ctx, u, glow); ctx.globalAlpha = 1; }
    if (u >= 47.55) sceneEnd(ctx, u, IMG);
    lightSweep(ctx, prog(u, 7.9, 9.0), 0.24);
    lightSweep(ctx, prog(u, 39.9, 40.9), 0.22);
    captions(ctx, u);
    grain(ctx, t);
    // flash frames on the two big drops
    const fl = Math.max(bump(u, 8.02, 0.16) * 0.3, bump(u, 48.05, 0.12) * 0.2, bump(u, 1.0, 0.12) * 0.22);
    if (fl > 0) { ctx.save(); ctx.globalCompositeOperation = 'screen'; ctx.globalAlpha = fl * 0.55; fill(ctx, '#F6E3A1'); ctx.restore(); }
  },
});
