// AGH German Pathway showreel: pure function of time. window.seek(t) paints frame t (lib/motion.js).
// Timing is in beats (u) on the measured 120 bpm grid; docs/shotlist.md is the plan this file follows.
import * as M from './lib/motion.js';

const { W, H, FORMAT, E, prog, lerp, clamp, springU, springKeys, SPRING, wobble, font, layout, fitSize, cover, rrect, shake, noise1, hash01, mulberry32, bump } = M;

// Brand tokens (logo art + poster type). One accent: gold.
const C = {
  navy: '#02122B', deep: '#07142E', gold: '#FFC61A', logoGold: '#FEB101', red: '#E6141E',
  sky: '#83A7FB', white: '#FFFFFF', paper: '#FBFBF8', ink: '#02122B',
};
const DISPLAY = 'Display', UI = 'UI';
const S = FORMAT.safe;                 // x 72, y 250, w 936, h 1240
const CAP_Y = 1418;                     // caption pill centre: steady for the whole film

const WORDS = (await fetch('words.json').then((r) => r.json())).words;
const LOGO = (await fetch('assets/logo/layers.json').then((r) => r.json())).layers;

// ------------------------------------------------------------------ hits (sfx.mjs voices these)
const HITS = [
  [0, 'ribbons sweep open', 'whoosh', { len: 0.7, from: 300, to: 3200 }],
  [1, 'DREAMING OF', 'tick'],
  [2, 'GERMANY?', 'thud', { pitch: 70, to: 45 }],
  [6.22, 'JOB OFFER slam', 'thud', { pitch: 80, to: 40 }],
  [6.22, 'JOB OFFER sub', 'sub', { len: 0.6 }],
  [7.08, 'FIRST?', 'thud', { pitch: 95, to: 50 }],
  [11.5, 'ribbon wipe', 'whoosh', { len: 0.6, from: 3000, to: 400, pan: -0.3 }],
  [13, 'START WITH whip', 'whoosh', { len: 0.35, from: 800, to: 3000, pan: -0.4 }],
  [14.4, 'YOUR GOAL whip', 'thud', { pitch: 85, to: 48 }],
  [15.5, 'plane takes off', 'whoosh', { len: 1.4, from: 250, to: 1400, pan: 0.2 }],
  [16.3, 'chip: goal', 'blip', { pitch: 'A5' }],
  [18.2, 'chip: qualifications', 'blip', { pitch: 'C#6' }],
  [20.7, 'chip: plans', 'blip', { pitch: 'E6' }],
  [23.2, 'destination ring', 'blip', { pitch: 'A6' }],
  [24.2, 'destination ring 2', 'blip', { pitch: 'E6' }],
  [27.3, 'zoom through', 'whoosh', { len: 0.8, from: 200, to: 5000 }],
  [29, 'NO OFFER drop', 'thud', { pitch: 75, to: 42 }],
  [30, 'YET? bounce', 'pop', { pitch: 'E5' }],
  [31.4, 'card flips in', 'whoosh', { len: 0.4, from: 600, to: 2600, pan: 0.3 }],
  [32.2, 'card lands', 'thud', { pitch: 90, to: 55 }],
  [34.5, 'card sheen', 'swell', { len: 0.6 }],
  [39.25, 'requirements stamp', 'thud', { pitch: 140, to: 70 }],
  [43.2, 'card flip to Bavaria', 'whoosh', { len: 0.5, from: 500, to: 3500 }],
  [45, 'YOUR NEXT', 'pop', { pitch: 'A5' }],
  [46.4, 'CHAPTER.', 'thud', { pitch: 85, to: 45 }],
  [47.9, 'tick: route', 'bell', { pitch: 'A5' }],
  [49.6, 'tick: next step', 'bell', { pitch: 'D6' }],
  [54.9, 'ribbon wipe to end card', 'whoosh', { len: 0.6, from: 400, to: 4000 }],
  [56, 'end card', 'impact'],
  [56.1, 'ribbons rise', 'pop', { pitch: 'D5' }],
  [57.2, 'building lifts', 'pop', { pitch: 'F#5' }],
  [57.6, 'plane arcs in', 'whoosh', { len: 0.5, from: 1200, to: 3200, pan: 0.4 }],
  [58.0, 'A', 'tok', { pitch: 'A4' }],
  [58.2, 'G', 'tok', { pitch: 'C#5' }],
  [58.4, 'H', 'tok', { pitch: 'E5' }],
  [59.6, 'bar filled', 'bell', { pitch: 'A6' }],
  [60.2, 'phone', 'tick'],
  [61.0, 'url', 'tick'],
];

// ------------------------------------------------------------------ helpers
const RNG = mulberry32(7);
let GRAIN = [];

// Cover-fit a plate with zoom about the focal point, a little rotation and drift.
function plate(ctx, img, { zoom = 1, fx = 0.5, fy = 0.5, rot = 0, dx = 0, dy = 0, sx = 1 } = {}) {
  ctx.save();
  ctx.translate(W / 2 + dx, H / 2 + dy); ctx.rotate(rot); ctx.scale(sx, 1); ctx.translate(-W / 2, -H / 2);
  const s = Math.max(W / img.width, H / img.height) * zoom;
  const dw = img.width * s, dh = img.height * s;
  ctx.drawImage(img, (W - dw) * fx, (H - dh) * fy, dw, dh);
  ctx.restore();
}
// screen position of an image point under plate()'s mapping (rotation ignored)
function plateXY(img, { zoom = 1, fx = 0.5, fy = 0.5, dx = 0, dy = 0 }, px, py) {
  const s = Math.max(W / img.width, H / img.height) * zoom;
  const dw = img.width * s, dh = img.height * s;
  return [(W - dw) * fx + px * dw + dx, (H - dh) * fy + py * dh + dy];
}
function grad(ctx, y0, y1, c0, c1) {
  const g = ctx.createLinearGradient(0, y0, 0, y1); g.addColorStop(0, c0); g.addColorStop(1, c1);
  ctx.fillStyle = g; ctx.fillRect(0, Math.min(y0, y1), W, Math.abs(y1 - y0));
}
// Grade: top scrim for headlines, bottom scrim for the caption, vignette.
function grade(ctx, top = 0.62, bottom = 0.55) {
  grad(ctx, 0, H * 0.46, `rgba(4,12,32,${top})`, 'rgba(4,12,32,0)');
  grad(ctx, H * 0.62, H, 'rgba(4,10,26,0)', `rgba(4,10,26,${bottom})`);
  const v = ctx.createRadialGradient(W / 2, H * 0.48, H * 0.32, W / 2, H * 0.5, H * 0.78);
  v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,4,16,0.5)');
  ctx.fillStyle = v; ctx.fillRect(0, 0, W, H);
}
// Breathing sun: additive warm bloom + a thin anamorphic streak.
function sun(ctx, x, y, r, k, u) {
  if (k <= 0) return;
  const breathe = 0.85 + 0.15 * Math.sin(u * 0.9);
  ctx.save(); ctx.globalCompositeOperation = 'screen';
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, `rgba(255,214,140,${0.75 * k * breathe})`);
  g.addColorStop(0.25, `rgba(255,160,60,${0.32 * k * breathe})`);
  g.addColorStop(1, 'rgba(255,120,40,0)');
  ctx.fillStyle = g; ctx.fillRect(x - r, y - r, 2 * r, 2 * r);
  const sg = ctx.createLinearGradient(x - W, y, x + W, y);
  sg.addColorStop(0, 'rgba(255,190,90,0)'); sg.addColorStop(0.5, `rgba(255,220,160,${0.5 * k * breathe})`); sg.addColorStop(1, 'rgba(255,190,90,0)');
  ctx.fillStyle = sg; ctx.fillRect(x - W, y - 3, 2 * W, 6);
  ctx.restore();
}
// A moving light leak (warm, soft) that crosses the frame between u0 and u1.
function leak(ctx, u, u0, u1, y = H * 0.4, a = 0.35) {
  const p = prog(u, u0, u1); if (p <= 0 || p >= 1) return;
  const x = lerp(-W * 0.4, W * 1.4, E.inOutSine(p)), k = Math.sin(Math.PI * p) * a;
  ctx.save(); ctx.globalCompositeOperation = 'screen';
  const g = ctx.createRadialGradient(x, y, 0, x, y, W * 0.7);
  g.addColorStop(0, `rgba(255,190,110,${k})`); g.addColorStop(1, 'rgba(255,120,60,0)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); ctx.restore();
}

// ------------------------------------------------------------------ kinetic type
// line: { str, size, weight, color, x, y (baseline), u0, style, exit, stagger, align }
function kinetic(ctx, u, L) {
  const f = font(L.size, L.weight, DISPLAY), track = -0.02 * L.size;
  const lay = layout(ctx, L.str, f, track);
  const x0 = L.align === 'center' ? W / 2 - lay.width / 2 : L.x;
  const st = L.stagger ?? 0.035;
  const n = lay.glyphs.length;
  ctx.save();
  ctx.shadowColor = 'rgba(2,8,24,0.55)'; ctx.shadowBlur = L.size * 0.22; ctx.shadowOffsetY = L.size * 0.04;
  lay.glyphs.forEach((g, j) => {
    if (g.ch === ' ') return;
    const order = L.reverse ? n - 1 - j : j;
    const ua = L.u0 + order * st;
    let x = x0 + g.cx, y = L.y, sx = 1, sy = 1, rot = 0, skew = 0, a = 1;
    if (L.style === 'rise') {          // from below a baseline mask, springy
      const k = springU(u, ua, SPRING.bouncy); if (k <= 0) return;
      y += (1 - k) * L.size * 1.1; skew = (1 - k) * 0.25;
    } else if (L.style === 'whipL' || L.style === 'whipR') {   // horizontal whip with skew
      const k = springU(u, ua, { stiffness: 300, damping: 22 }); if (k <= 0) return;
      const dir = L.style === 'whipL' ? -1 : 1;
      x += dir * (1 - k) * W * 1.1; skew = dir * -(1 - k) * 0.6 + dir * 0.08 * wobble(u - ua - 0.3, 2, 5);
    } else if (L.style === 'drop') {   // falls from above, lands with a bounce
      const k = springU(u, ua, { stiffness: 210, damping: 11 }); if (k <= 0) return;
      y -= (1 - k) * (L.size * 3); const q = 0.12 * wobble(u - ua - 0.25, 2.4, 6);
      sx = 1 + q; sy = 1 - q;
    } else if (L.style === 'pop') {    // scales up from nothing with a twist
      const k = springU(u, ua, { stiffness: 320, damping: 14 }); if (k <= 0) return;
      sx = sy = k; rot = (1 - k) * (j % 2 ? 0.5 : -0.5); y += (1 - k) * L.size * 0.3;
    } else if (L.style === 'slam') {   // from huge + transparent to size: lands hard
      const p = prog(u, ua, ua + 0.32); if (p <= 0) return;
      const e = E.inCubic(p); sx = sy = lerp(2.6, 1, e) + 0.05 * wobble(u - ua - 0.32, 3, 7);
      a = clamp(p * 2.5); y += (1 - e) * -L.size * 0.4;
    }
    if (L.exit !== undefined) {        // fall out with anticipation
      const ex = L.exit + order * 0.025;
      const p = E.inBack(prog(u, ex, ex + 0.45), 1.6); if (p >= 1) return;
      y += p * (H * 0.55); rot += p * (j % 2 ? 0.3 : -0.25); a *= 1 - Math.max(0, p - 0.7) / 0.3;
    }
    if (a <= 0 || Math.abs(sx) < 1e-3) return;
    ctx.save(); ctx.globalAlpha *= a;
    ctx.translate(x, y); ctx.rotate(rot); if (skew) ctx.transform(1, 0, -skew, 1, 0, 0); ctx.scale(sx, sy);
    ctx.font = f; ctx.fillStyle = L.color; ctx.textAlign = 'center';
    ctx.fillText(g.ch, 0, 0);
    ctx.restore();
  });
  ctx.restore();
  return { x0, width: lay.width };
}
const fit = (ctx, str, weight, max, w = S.w) => fitSize(ctx, str, weight, DISPLAY, w, max, -0.02);

// supporting line in the UI face, slides up from a mask
function subline(ctx, u, str, x, y, size, u0, color = C.white, weight = 600, exit) {
  const k = springU(u, u0, SPRING.gentle); if (k <= 0) return;
  let a = clamp(k * 1.4); if (exit !== undefined) a *= 1 - E.inCubic(prog(u, exit, exit + 0.4));
  if (a <= 0) return;
  ctx.save(); ctx.beginPath(); ctx.rect(0, y - size * 1.2, W, size * 1.6); ctx.clip();
  ctx.globalAlpha = a; ctx.font = font(size, weight, UI); ctx.fillStyle = color; ctx.textAlign = 'left';
  ctx.shadowColor = 'rgba(2,8,24,0.6)'; ctx.shadowBlur = 16;
  ctx.fillText(str, x, y + (1 - k) * size * 1.3);
  ctx.restore();
}

// ------------------------------------------------------------------ brand ribbons (logo stripes)
// Bands lean like the logo's flag ribbons. n = sweep direction (normal), d = along the band.
const RIB_D = (() => { const v = [0.36, -1], l = Math.hypot(...v); return [v[0] / l, v[1] / l]; })();
const RIB_N = [-RIB_D[1], RIB_D[0]];   // points right-ish
const RIBBONS = [
  { c: C.sky, w: 90, lag: 0.0 }, { c: C.red, w: 190, lag: 0.03 }, { c: C.logoGold, w: 260, lag: 0.06 }, { c: C.navy, w: 360, lag: 0.09 },
];
const proj = (x, y) => x * RIB_N[0] + y * RIB_N[1];
const S_MIN = Math.min(proj(0, 0), proj(W, 0), proj(0, H), proj(W, H)) - 50;
const S_MAX = Math.max(proj(0, 0), proj(W, 0), proj(0, H), proj(W, H)) + 50;
function bandPath(ctx, s0, s1) {
  const L = 4000, [nx, ny] = RIB_N, [dx, dy] = RIB_D;
  ctx.beginPath();
  ctx.moveTo(nx * s0 + dx * L, ny * s0 + dy * L); ctx.lineTo(nx * s1 + dx * L, ny * s1 + dy * L);
  ctx.lineTo(nx * s1 - dx * L, ny * s1 - dy * L); ctx.lineTo(nx * s0 - dx * L, ny * s0 - dy * L); ctx.closePath();
}
// Sweep: bands travel along n; the new scene shows behind the last band. dir 1 = left->right.
function ribbonWipe(ctx, u, u0, dur, drawOld, drawNew, dir = 1) {
  const span = S_MAX - S_MIN + 900;
  const pos = (lag) => { const p = E.inOutCubic(prog(u, u0 + lag * dur * 2, u0 + dur + lag * dur * 2)); return p; };
  // trailing edge (behind the last band) defines the reveal
  const last = RIBBONS[RIBBONS.length - 1];
  const sOf = (p) => dir > 0 ? lerp(S_MIN - 700, S_MAX + 200, p) : lerp(S_MAX + 700, S_MIN - 200, p);
  const trail = sOf(pos(last.lag)) - dir * last.w;
  drawOld(ctx);
  ctx.save(); dir > 0 ? bandPath(ctx, S_MIN - 2000, trail) : bandPath(ctx, trail, S_MAX + 2000); ctx.clip(); drawNew(ctx); ctx.restore();
  RIBBONS.forEach((r, i) => {
    const s = sOf(pos(r.lag)) - dir * (RIBBONS.slice(0, i).reduce((a, b) => a + b.w * 0.55, 0));
    ctx.save(); ctx.shadowColor = 'rgba(0,0,0,0.35)'; ctx.shadowBlur = 40;
    dir > 0 ? bandPath(ctx, s - r.w, s) : bandPath(ctx, s, s + r.w);
    ctx.fillStyle = r.c; ctx.fill(); ctx.restore();
  });
  return span;
}

// ------------------------------------------------------------------ captions (steady pill)
const GROUPS = (() => {
  const sents = []; let cur = [];
  WORDS.forEach((w, i) => { cur.push(w); if (/[.?!]$/.test(w.w) || i === WORDS.length - 1) { sents.push(cur); cur = []; } });
  const len = (ws) => ws.map((x) => x.w).join(' ').length;
  const gs = [];
  sents.forEach((ws) => {
    const parts = len(ws) <= 34 ? 1 : Math.ceil(len(ws) / 31);
    if (parts <= 1) { gs.push(ws); return; }
    const target = len(ws) / parts; let g = [];
    ws.forEach((w, i) => { g.push(w); if (gs.length < 999 && len(g) >= target * 0.92 && i < ws.length - 1) { gs.push(g); g = []; } });
    if (g.length) gs.push(g);
  });
  return gs.map((ws, i) => ({ ws, t0: ws[0].t0 - 0.12, text: ws.map((x) => x.w).join(' ') }));
})();
function captions(ctx, u, t) {
  let gi = 0; for (let i = 0; i < GROUPS.length; i++) if (t >= GROUPS[i].t0) gi = i;
  const g = GROUPS[gi];
  ctx.font = font(50, 700, UI);
  const fsz = Math.min(50, Math.floor(50 * 900 / Math.max(...GROUPS.map((G) => ctx.measureText(G.text).width)))), f = font(fsz, 700, UI);
  const widthOf = (G) => { ctx.font = f; return ctx.measureText(G.text).width; };
  const into = gi > 0 ? clamp((t - g.t0) / 0.16) : 1;
  const wPrev = gi > 0 ? widthOf(GROUPS[gi - 1]) : widthOf(g);
  const tw = lerp(wPrev, widthOf(g), E.outCubic(into));
  const padX = 38, ph = 92, pw = tw + padX * 2;
  // the pill itself arrives once, on frame 0 it is already there
  const appear = 1;
  ctx.save();
  ctx.globalAlpha = appear;
  rrect(ctx, W / 2 - pw / 2, CAP_Y - ph / 2, pw, ph, ph / 2);
  ctx.fillStyle = 'rgba(3,12,32,0.78)'; ctx.fill();
  ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(255,198,26,0.35)'; ctx.stroke();
  // words
  ctx.font = f; ctx.textAlign = 'left';
  const space = ctx.measureText(' ').width;
  const drawGroup = (G, alpha, dy) => {
    const total = ctx.measureText(G.text).width;
    let x = W / 2 - total / 2;
    G.ws.forEach((w) => {
      const ww = ctx.measureText(w.w).width;
      const spoken = t >= w.t0, active = t >= w.t0 && t < w.t1 + 0.08;
      const kk = clamp((t - w.t0) / 0.1);
      ctx.save(); ctx.globalAlpha = alpha * (spoken ? 1 : 0.5);
      ctx.fillStyle = active ? C.gold : C.white;
      const sc = active ? 1 + 0.06 * Math.sin(Math.PI * kk) : 1;
      ctx.translate(x + ww / 2, CAP_Y + fsz * 0.36 + dy); ctx.scale(sc, sc);
      ctx.fillText(w.w, -ww / 2, 0); ctx.restore();
      x += ww + space;
    });
  };
  ctx.beginPath(); ctx.rect(0, CAP_Y - ph / 2 + 4, W, ph - 8); ctx.clip();
  if (into < 1 && gi > 0) drawGroup(GROUPS[gi - 1], 1 - into, -into * 40);
  drawGroup(g, into, (1 - E.outCubic(into)) * 40);
  ctx.restore();
}

// ------------------------------------------------------------------ scene A: Berlin   (u 0..12)
function sceneA(ctx, u, IMG) {
  const img = IMG.berlin;
  const z = lerp(1.38, 1.06, springU(u, -0.6, { stiffness: 40, damping: 14 })) + 0.06 * springU(u, 3.6, SPRING.gentle) + 0.01 * u;
  const cam = { zoom: z, fx: 0.5, fy: 0.62, rot: lerp(-0.035, 0, springU(u, -0.6, SPRING.gentle)) };
  ctx.save(); shake(ctx, u, 6.22, 26, 3, 0.18); shake(ctx, u, 7.08, 16, 5, 0.15);
  plate(ctx, img, cam);
  const [sx, sy] = plateXY(img, cam, 0.5, 0.727);
  sun(ctx, sx, sy, 520, 1, u);
  grade(ctx);
  ctx.restore();
  leak(ctx, u, 8, 12, H * 0.32, 0.3);
  // headline 1
  const s1 = fit(ctx, 'DREAMING OF', 800, 118), s2 = fit(ctx, 'GERMANY?', 900, 200);
  const y1 = S.y + 120, y2 = y1 + s2 * 0.98;
  kinetic(ctx, u, { str: 'DREAMING OF', size: s1, weight: 800, color: C.white, x: S.x, y: y1, u0: 0.75, style: 'rise', exit: 3.5 });
  kinetic(ctx, u, { str: 'GERMANY?', size: s2, weight: 900, color: C.gold, x: S.x, y: y2, u0: 1.85, style: 'rise', exit: 3.6, stagger: 0.04 });
  // headline 2 (poster 01)
  const h1 = fit(ctx, 'JOB OFFER', 900, 210), h2 = fit(ctx, 'FIRST?', 900, 210);
  const b1 = S.y + h1 * 0.95, b2 = b1 + h2 * 0.98;
  kinetic(ctx, u, { str: 'JOB OFFER', size: h1, weight: 900, color: C.gold, x: S.x, y: b1, u0: 6.12, style: 'slam', stagger: 0.03 });
  kinetic(ctx, u, { str: 'FIRST?', size: h2, weight: 900, color: C.gold, x: S.x, y: b2, u0: 6.98, style: 'slam', stagger: 0.04 });
  subline(ctx, u, 'Before planning your', S.x + 4, b2 + 100, 58, 8.2);
  subline(ctx, u, 'Germany pathway?', S.x + 4, b2 + 172, 58, 8.5);
}

// ------------------------------------------------------------------ scene B: Hamburg   (u 12..28)
const ROUTE = [[560, 1330], [150, 1190], [960, 1020], [545, 880]];
function bez(p, t) {
  const m = 1 - t;
  return [0, 1].map((i) => m * m * m * p[0][i] + 3 * m * m * t * p[1][i] + 3 * m * t * t * p[2][i] + t * t * t * p[3][i]);
}
function sceneB(ctx, u, IMG) {
  const img = IMG.hamburg;
  const through = E.inExpo(prog(u, 26.3, 28.05));
  const cam = { zoom: lerp(1.04, 1.2, E.inOutSine(prog(u, 11, 27))) * lerp(1, 7, through), fx: 0.5, fy: lerp(0.58, 0.6, through) };
  plate(ctx, img, cam);
  grade(ctx, 0.6 * (1 - through), 0.5);
  // warm window flicker: a soft glow on the central building that swells into the zoom-through
  const [bx, by] = plateXY(img, cam, 0.5, 0.6);
  sun(ctx, bx, by, 380 + 1400 * through, 0.25 + 1.2 * through, u * 0.5);
  const hx = 1 - through;
  ctx.save(); ctx.globalAlpha = hx;
  const s1 = fit(ctx, 'START WITH', 800, 132), s2 = fit(ctx, 'YOUR GOAL.', 900, 196);
  const y1 = S.y + s1 * 0.95, y2 = y1 + s2 * 1.0;
  kinetic(ctx, u, { str: 'START WITH', size: s1, weight: 800, color: C.white, x: S.x, y: y1, u0: 12.75, style: 'whipL', stagger: 0.02, reverse: true });
  kinetic(ctx, u, { str: 'YOUR GOAL.', size: s2, weight: 900, color: C.gold, x: S.x, y: y2, u0: 14.15, style: 'whipR', stagger: 0.02 });
  // route: gold dashed path drawn up the canal, plane at its tip
  const p = M.kf(u, [[15.3, 0], [16.3, 0.17], [18.2, 0.5], [20.7, 0.86], [22.2, 1]], E.inOutSine);
  if (p > 0) {
    const N = 80, upto = Math.floor(N * p);
    ctx.save(); ctx.lineCap = 'round';
    for (let i = 0; i < upto; i++) {
      if (i % 2) continue;
      const a = bez(ROUTE, i / N), b = bez(ROUTE, Math.min(p, (i + 1) / N));
      ctx.beginPath(); ctx.moveTo(...a); ctx.lineTo(...b);
      ctx.lineWidth = lerp(16, 7, i / N); ctx.strokeStyle = C.gold;
      ctx.shadowColor = 'rgba(255,170,30,0.6)'; ctx.shadowBlur = 18; ctx.stroke();
    }
    ctx.restore();
    // once drawn, a light pulse runs the route and the destination rings
    for (const pu of [22.6, 24.6]) {
      const q = prog(u, pu, pu + 1.6); if (q <= 0 || q >= 1) continue;
      const [x, y] = bez(ROUTE, E.inOutSine(q));
      const g = ctx.createRadialGradient(x, y, 0, x, y, 70);
      g.addColorStop(0, 'rgba(255,240,200,0.95)'); g.addColorStop(1, 'rgba(255,198,26,0)');
      ctx.save(); ctx.globalCompositeOperation = 'screen'; ctx.fillStyle = g; ctx.fillRect(x - 70, y - 70, 140, 140); ctx.restore();
    }
    for (const ru of [23.2, 24.2, 26.2]) {
      const q = prog(u, ru, ru + 1.4); if (q <= 0 || q >= 1) continue;
      const [x, y] = bez(ROUTE, 0.86);
      ctx.beginPath(); ctx.arc(x, y, 20 + 90 * E.outCubic(q), 0, M.TAU);
      ctx.lineWidth = 5; ctx.strokeStyle = `rgba(255,198,26,${1 - q})`; ctx.stroke();
    }
    // checkpoints + chips
    const CH = [[0.17, 'Your goal', 16.3, 1], [0.5, 'Your qualifications', 18.2, -1], [0.86, 'Your plans', 20.7, 1]];
    CH.forEach(([pt, label, uc, side]) => {
      const k = springU(u, uc, SPRING.bouncy); if (k <= 0) return;
      const [x, y] = bez(ROUTE, pt);
      ctx.save(); ctx.beginPath(); ctx.arc(x, y, 20 * k, 0, M.TAU); ctx.fillStyle = C.white; ctx.fill();
      ctx.beginPath(); ctx.arc(x, y, 10 * k, 0, M.TAU); ctx.fillStyle = C.gold; ctx.fill(); ctx.restore();
      ctx.font = font(44, 700, UI); const tw = ctx.measureText(label).width;
      const cw = tw + 64, chh = 80;
      let cx = side > 0 ? x + 44 : x - 44 - cw; cx = clamp(cx, S.x, S.x + S.w - cw);
      const cy = y - chh / 2 - 6;
      ctx.save(); ctx.translate(cx + (side > 0 ? 0 : cw), cy + chh / 2); ctx.scale(k, k); ctx.translate(-(cx + (side > 0 ? 0 : cw)), -(cy + chh / 2));
      ctx.shadowColor = 'rgba(0,0,0,0.35)'; ctx.shadowBlur = 24; ctx.shadowOffsetY = 8;
      rrect(ctx, cx, cy, cw, chh, chh / 2); ctx.fillStyle = 'rgba(255,255,255,0.96)'; ctx.fill();
      ctx.shadowColor = 'transparent';
      ctx.fillStyle = C.ink; ctx.textAlign = 'left'; ctx.fillText(label, cx + 32, cy + chh / 2 + 15);
      ctx.restore();
    });
    // plane at the tip, nose along the tangent
    const pp = Math.max(0.002, Math.min(p, 0.999));
    const [px, py] = bez(ROUTE, pp), [qx, qy] = bez(ROUTE, Math.min(1, pp + 0.01));
    const ang = Math.atan2(qy - py, qx - px);
    const pl = IMG.plane_w, sc = lerp(0.95, 0.55, pp);
    const land = 1 - E.outCubic(prog(u, 22.2, 23.2));
    ctx.save(); ctx.translate(px, py); ctx.rotate(ang + 0.42 + 0.15 * Math.sin(u * 2.2) * land); ctx.scale(sc, sc);
    ctx.shadowColor = 'rgba(255,190,60,0.8)'; ctx.shadowBlur = 20;
    ctx.drawImage(pl, -pl.width * 0.75, -pl.height / 2);
    ctx.restore();
  }
  ctx.restore();
  // zoom-through flash
  const fl = bump(u, 28, 0.6);
  if (fl > 0) { ctx.fillStyle = `rgba(255,226,170,${fl * 0.8})`; ctx.fillRect(0, 0, W, H); }
}

// ------------------------------------------------------------------ Opportunity Card graphic
const CARD = { w: 820, h: 517 };
function drawCard(ctx, u, IMG, sheen) {
  const { w, h } = CARD;
  const x = -w / 2, y = -h / 2;
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.5)'; ctx.shadowBlur = 60; ctx.shadowOffsetY = 26;
  rrect(ctx, x, y, w, h, 38);
  const g = ctx.createLinearGradient(x, y, x + w, y + h); g.addColorStop(0, '#0C2350'); g.addColorStop(0.55, '#061632'); g.addColorStop(1, '#02122B');
  ctx.fillStyle = g; ctx.fill();
  ctx.restore();
  ctx.save(); rrect(ctx, x, y, w, h, 38); ctx.clip();
  // the logo's ribbons as the card's artwork, right side
  ctx.globalAlpha = 0.95;
  const mk = (name, s, ox, oy) => { const L = LOGO[name.replace('_w', '')]; const im = IMG['L_' + name]; ctx.drawImage(im, ox + L[0] * s, oy + L[1] * s, L[2] * s, L[3] * s); };
  const s = 0.27, ox = x + w - 1003 * s - 44, oy = y + 44 - 124 * s;
  ['stripe_dark_w', 'stripe_light', 'stripe_gold', 'stripe_red', 'building_w'].forEach((n) => mk(n, s, ox, oy));
  ctx.globalAlpha = 1;
  // gold chip
  rrect(ctx, x + 56, y + 70, 104, 78, 14);
  const cg = ctx.createLinearGradient(x + 56, y + 70, x + 160, y + 148); cg.addColorStop(0, '#FFE08A'); cg.addColorStop(1, '#E6A400');
  ctx.fillStyle = cg; ctx.fill();
  ctx.strokeStyle = 'rgba(120,80,0,0.45)'; ctx.lineWidth = 2;
  for (const yy of [96, 122]) { ctx.beginPath(); ctx.moveTo(x + 56, y + yy); ctx.lineTo(x + 160, y + yy); ctx.stroke(); }
  ctx.beginPath(); ctx.moveTo(x + 108, y + 70); ctx.lineTo(x + 108, y + 148); ctx.stroke();
  // type
  ctx.textAlign = 'left'; ctx.fillStyle = C.gold; ctx.font = font(78, 900, DISPLAY);
  ctx.fillText('OPPORTUNITY', x + 56, y + 296); ctx.fillText('CARD', x + 56, y + 376);
  ctx.fillStyle = C.white; ctx.font = font(36, 600, UI); ctx.fillText('Job-search route', x + 58, y + 434);
  ctx.fillStyle = C.sky; ctx.font = font(26, 700, UI); ctx.letterSpacing = '3px';
  ctx.fillText('FOR ELIGIBLE APPLICANTS', x + 58, y + 478); ctx.letterSpacing = '0px';
  // holographic sheen
  if (sheen > 0 && sheen < 1) {
    const sxp = lerp(x - w * 0.6, x + w * 1.6, sheen);
    const sg = ctx.createLinearGradient(sxp - 160, y, sxp + 160, y + h * 0.3);
    sg.addColorStop(0, 'rgba(255,255,255,0)'); sg.addColorStop(0.5, 'rgba(255,240,200,0.32)'); sg.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = sg; ctx.fillRect(x, y, w, h);
  }
  ctx.restore();
  rrect(ctx, x + 1, y + 1, w - 2, h - 2, 37); ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(255,198,26,0.5)'; ctx.stroke();
  // "Requirements apply" stamp lands on the card when it is said
  const k = springU(u, 39.25, { stiffness: 380, damping: 16 });
  if (k > 0) {
    const tw = 430, th = 70, tx = x + w - tw + 40, ty = y + h - 28;
    ctx.save(); ctx.translate(tx + tw / 2, ty + th / 2); ctx.rotate(-0.07); ctx.scale(lerp(1.8, 1, k), lerp(1.8, 1, k)); ctx.globalAlpha = clamp(k * 2);
    ctx.shadowColor = 'rgba(0,0,0,0.45)'; ctx.shadowBlur = 24; ctx.shadowOffsetY = 8;
    rrect(ctx, -tw / 2, -th / 2, tw, th, 14); ctx.fillStyle = C.navy; ctx.fill(); ctx.shadowColor = 'transparent';
    ctx.lineWidth = 4; ctx.strokeStyle = C.gold; ctx.stroke();
    ctx.fillStyle = C.gold; ctx.font = font(32, 800, UI); ctx.textAlign = 'center'; ctx.letterSpacing = '2px';
    ctx.fillText('REQUIREMENTS APPLY', 0, 11); ctx.letterSpacing = '0px';
    ctx.restore();
  }
}

// ------------------------------------------------------------------ scene C: Heidelberg   (u 28..44)
const CARD_Y = 960;
function sceneC(ctx, u, IMG, { noCard = false } = {}) {
  const img = IMG.heidelberg;
  const arrive = E.outExpo(prog(u, 27.9, 29.6));
  const cam = { zoom: lerp(1.7, 1.14, arrive) + 0.03 * prog(u, 29, 44), fx: lerp(0.7, 0.42, E.inOutSine(prog(u, 28, 44))), fy: 0.5 };
  plate(ctx, img, cam);
  const [sx, sy] = plateXY(img, cam, 0.048, 0.464);
  sun(ctx, sx, sy, 560, 1, u);
  grade(ctx, 0.66, 0.6);
  const s1 = fit(ctx, 'NO OFFER', 900, 200), s2 = s1;
  const y1 = S.y + s1 * 0.95, y2 = y1 + s2 * 0.98;
  kinetic(ctx, u, { str: 'NO OFFER', size: s1, weight: 900, color: C.gold, x: S.x, y: y1, u0: 28.75, style: 'drop', stagger: 0.04 });
  kinetic(ctx, u, { str: 'YET?', size: s2, weight: 900, color: C.white, x: S.x, y: y2, u0: 29.8, style: 'drop', stagger: 0.06 });
  // the card flips in on "Opportunity Card"
  if (!noCard) {
    const k = springU(u, 31.4, { stiffness: 150, damping: 12 });
    if (k > 0) {
      const ang = (1 - k) * Math.PI * 0.5;
      const bob = 8 * Math.sin((u - 31.4) * 0.8);
      ctx.save(); ctx.translate(W / 2, CARD_Y + (1 - k) * 260 + bob); ctx.rotate(-0.05 * (1 - k) + 0.012 * Math.sin(u * 0.6));
      ctx.scale(Math.max(0.001, Math.cos(ang)), 1 - 0.06 * Math.sin(ang)); ctx.transform(1, 0.12 * Math.sin(ang), 0, 1, 0, 0);
      drawCard(ctx, u, IMG, prog(u, 34.2, 35.6));
      ctx.restore();
    }
  }
}
// C -> D: the card grows to fill the frame and flips; its back face is Bavaria
function flipCD(ctx, u, IMG) {
  const g = prog(u, 42.2, 43.3), f2 = prog(u, 43.3, 44.1);
  if (f2 <= 0) {
    sceneC(ctx, u, IMG, { noCard: true });
    ctx.fillStyle = `rgba(2,10,28,${0.55 * E.inCubic(g)})`; ctx.fillRect(0, 0, W, H);
    const sc = lerp(1, 3.9, E.inCubic(g)), ang = E.inCubic(g) * Math.PI * 0.5;
    ctx.save(); ctx.translate(W / 2, lerp(CARD_Y, H / 2, E.inCubic(g)));
    ctx.scale(sc * Math.max(0.001, Math.cos(ang)), sc); ctx.transform(1, 0.18 * Math.sin(ang), 0, 1, 0, 0);
    drawCard(ctx, u, IMG, 0); ctx.restore();
  } else {
    sceneC(ctx, u, IMG, { noCard: true });
    ctx.fillStyle = 'rgba(2,10,28,0.55)'; ctx.fillRect(0, 0, W, H);
    const k = E.outCubic(f2), ang = (1 - k) * Math.PI * 0.5;
    ctx.save(); ctx.translate(W / 2, H / 2); ctx.scale(Math.max(0.001, Math.cos(ang)), 1); ctx.transform(1, -0.18 * Math.sin(ang), 0, 1, 0, 0); ctx.translate(-W / 2, -H / 2);
    sceneD(ctx, u, IMG); ctx.restore();
  }
}

// ------------------------------------------------------------------ scene D: Bavaria   (u 44..56)
const BAR = { x: S.x + 4, y: 0, w: 560, h: 16 };
function sceneD(ctx, u, IMG) {
  const img = IMG.bavaria;
  const crane = springU(u, 43.6, { stiffness: 22, damping: 9 });
  const cam = { zoom: lerp(1.32, 1.05, crane) + 0.02 * prog(u, 46, 56), fx: lerp(0.62, 0.5, crane), fy: lerp(0.95, 0.5, crane) };
  plate(ctx, img, cam);
  const [sx, sy] = plateXY(img, cam, 0.143, 0.475);
  sun(ctx, sx, sy, 600, 1, u);
  grade(ctx, 0.7, 0.55);
  leak(ctx, u, 50, 55, H * 0.45, 0.25);
  const s1 = fit(ctx, 'YOUR NEXT', 900, 196), s2 = fit(ctx, 'CHAPTER.', 900, 196);
  const y1 = S.y + s1 * 0.95, y2 = y1 + s2 * 0.98;
  kinetic(ctx, u, { str: 'YOUR NEXT', size: s1, weight: 900, color: C.gold, x: S.x, y: y1, u0: 44.9, style: 'pop', stagger: 0.04 });
  kinetic(ctx, u, { str: 'CHAPTER.', size: s2, weight: 900, color: C.gold, x: S.x, y: y2, u0: 46.3, style: 'pop', stagger: 0.045 });
  // checklist
  const rows = [['Check your route.', 47.85], ['Prepare your next step.', 49.55]];
  const r0 = y2 + 120;
  rows.forEach(([txt, uc], i) => {
    const y = r0 + i * 110;
    const k = springU(u, uc - 0.4, SPRING.snappy); if (k <= 0) return;
    ctx.save(); ctx.globalAlpha = clamp(k * 1.5); ctx.translate((1 - k) * -60, 0);
    // ring + tick
    const cx = S.x + 34, cy = y - 21;
    ctx.beginPath(); ctx.arc(cx, cy, 32, 0, M.TAU); ctx.lineWidth = 5; ctx.strokeStyle = C.gold; ctx.stroke();
    const tk = E.outCubic(prog(u, uc, uc + 0.5));
    const fillK = springU(u, uc, SPRING.bouncy);
    if (fillK > 0) { ctx.beginPath(); ctx.arc(cx, cy, 32 * Math.min(1.08, fillK), 0, M.TAU); ctx.fillStyle = C.gold; ctx.fill(); }
    if (tk > 0) {
      ctx.save(); ctx.lineWidth = 7; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.strokeStyle = C.navy;
      ctx.setLineDash([60, 60]); ctx.lineDashOffset = 60 * (1 - tk);
      ctx.beginPath(); ctx.moveTo(cx - 13, cy + 1); ctx.lineTo(cx - 3, cy + 11); ctx.lineTo(cx + 15, cy - 10); ctx.stroke(); ctx.restore();
    }
    ctx.font = font(60, 700, UI); ctx.fillStyle = C.white; ctx.textAlign = 'left';
    ctx.shadowColor = 'rgba(2,8,24,0.6)'; ctx.shadowBlur = 16;
    ctx.fillText(txt, S.x + 96, y);
    ctx.restore();
  });
  // progress bar (the logo's bar): fills as the steps tick
  BAR.y = r0 + 2 * 110 - 24;
  const bk = springU(u, 47.2, SPRING.snappy);
  if (bk > 0) {
    ctx.save(); ctx.globalAlpha = clamp(bk * 1.5);
    rrect(ctx, BAR.x, BAR.y, BAR.w * bk, BAR.h, 8); ctx.fillStyle = 'rgba(224,234,250,0.35)'; ctx.fill();
    const fill = M.kf(u, [[47.6, 0], [48.6, 0.5], [49.4, 0.5], [50.6, 1]], E.outCubic);
    if (fill > 0) { rrect(ctx, BAR.x, BAR.y, BAR.w * fill, BAR.h, 8); ctx.fillStyle = C.gold; ctx.fill(); }
    ctx.restore();
  }
}
// D -> E: the bar floods the frame gold, then a paper panel wipes up with a slanted edge
function floodDE(ctx, u, IMG) {
  const p = prog(u, 54.5, 55.5), e = p < 0.5 ? 4 * p * p * p : 1 - (-2 * p + 2) ** 3 / 2;
  sceneD(ctx, u, IMG);
  if (p > 0) {
    const x = lerp(BAR.x, 0, e), y = lerp(BAR.y, 0, e), w = lerp(BAR.w, W, e), h = lerp(BAR.h, H, e);
    rrect(ctx, x, y, w, h, lerp(8, 0, e)); ctx.fillStyle = C.gold; ctx.fill();
  }
  const q = E.outQuint(prog(u, 55.35, 56.0));
  if (q > 0) {
    const top = lerp(H + 300, -300, q);
    ctx.save(); ctx.beginPath(); ctx.moveTo(0, top + 260); ctx.lineTo(W, top); ctx.lineTo(W, H); ctx.lineTo(0, H); ctx.closePath(); ctx.clip();
    sceneE(ctx, u, IMG); ctx.restore();
  }
}

// ------------------------------------------------------------------ scene E: end card   (u 56..68)
const LS = 0.62, LOX = 540 - 628 * LS, LOY = 290 - 124 * LS;
function layer(ctx, IMG, name, { dx = 0, dy = 0, sx = 1, sy = 1, rot = 0, px = 0.5, py = 1, a = 1 } = {}) {
  const L = LOGO[name]; const im = IMG['L_' + name];
  const x = LOX + L[0] * LS, y = LOY + L[1] * LS, w = L[2] * LS, h = L[3] * LS;
  const ax = x + w * px, ay = y + h * py;
  ctx.save(); ctx.globalAlpha *= a; ctx.translate(ax + dx, ay + dy); ctx.rotate(rot); ctx.scale(sx, sy);
  ctx.drawImage(im, -w * px, -h * py, w, h); ctx.restore();
}
function sceneE(ctx, u, IMG) {
  ctx.fillStyle = C.paper; ctx.fillRect(0, 0, W, H);
  // faint drifting ribbons in the paper (texture, not decoration)
  const gl = ctx.createRadialGradient(W / 2, 560, 0, W / 2, 560, 760);
  gl.addColorStop(0, `rgba(255,198,26,${0.16 + 0.03 * Math.sin(u * 0.8)})`); gl.addColorStop(1, 'rgba(255,198,26,0)');
  ctx.fillStyle = gl; ctx.fillRect(0, 0, W, H);
  const markBase = LOY + 790 * LS;
  // ribbons rise out of the mark's baseline along their lean
  ctx.save(); ctx.beginPath(); ctx.rect(0, 0, W, markBase); ctx.clip();
  [['stripe_dark', 55.8], ['stripe_light', 55.95], ['stripe_gold', 56.1], ['stripe_red', 56.25]].forEach(([n, uu]) => {
    const k = springU(u, uu, { stiffness: 200, damping: 16 }); if (k <= 0) return;
    const d = (1 - k) * 520;
    layer(ctx, IMG, n, { dx: -d * 0.34, dy: d });
  });
  ctx.restore();
  // building lifts with squash
  const kb = springU(u, 57.2, SPRING.bouncy);
  if (kb > 0) { const q = 0.1 * wobble(u - 57.45, 2.2, 5); layer(ctx, IMG, 'building', { sx: kb * (1 + q), sy: kb * (1 - q) }); }
  // plane arcs in from the left
  const pp = prog(u, 57.35, 58.3);
  if (pp > 0) {
    const L = LOGO.plane, ex = LOX + (L[0] + L[2] / 2) * LS, ey = LOY + (L[1] + L[3] / 2) * LS;
    const e = E.outCubic(pp), bx = lerp(-200, ex, e), by = ey + Math.sin(e * Math.PI) * -160 + (1 - e) * 300;
    const ang = (1 - e) * -0.6 + 0.06 * wobble(u - 58.3, 1.8, 4);
    layer(ctx, IMG, 'plane', { dx: bx - ex, dy: by - ey, rot: ang, py: 0.5, sx: lerp(1.6, 1, e), sy: lerp(1.6, 1, e) });
  }
  // A G H pop
  [['A', 57.95], ['G', 58.15], ['H', 58.35]].forEach(([n, uu]) => {
    const k = springU(u, uu, { stiffness: 340, damping: 15 }); if (k <= 0) return;
    layer(ctx, IMG, n, { sx: k, sy: k, rot: (1 - k) * 0.3 });
  });
  // tagline wipes left to right
  const tp = E.outCubic(prog(u, 58.6, 59.3));
  if (tp > 0) {
    const L = LOGO.tagline; ctx.save(); ctx.beginPath(); ctx.rect(LOX + L[0] * LS, 0, L[2] * LS * tp, H); ctx.clip();
    layer(ctx, IMG, 'tagline', { dx: (1 - tp) * -30 }); ctx.restore();
  }
  // progress bar: track + gold fill to the logo's 52%
  const tk = E.outCubic(prog(u, 58.8, 59.2));
  if (tk > 0) {
    const bx = LOX + 234 * LS, by = LOY + 1113 * LS, bw = (1032 - 234) * LS, bh = 29 * LS;
    rrect(ctx, bx, by, bw * tk, bh, bh / 2); ctx.fillStyle = '#E0EAFA'; ctx.fill();
    const f = springU(u, 59.0, { stiffness: 120, damping: 12 }) * (416 / 798);
    if (f > 0) { rrect(ctx, bx, by, bw * f, bh, bh / 2); ctx.fillStyle = C.logoGold; ctx.fill(); }
  }
  // CTA (poster 04)
  const cy = 1050;
  const k1 = springU(u, 57.4, SPRING.snappy);
  if (k1 > 0) {
    ctx.save(); ctx.globalAlpha = clamp(k1 * 1.4); ctx.textAlign = 'center';
    ctx.font = font(fit(ctx, 'Message AGH German Pathway.', 800, 60, 900), 800, DISPLAY); ctx.fillStyle = C.ink;
    ctx.fillText('Message AGH German Pathway.', W / 2, cy + (1 - k1) * 40); ctx.restore();
  }
  const k2 = springU(u, 60.1, SPRING.bouncy);
  if (k2 > 0) {
    const pw = 620, ph = 112, px = W / 2 - pw / 2, py = cy + 50;
    ctx.save(); ctx.translate(W / 2, py + ph / 2); ctx.scale(k2, k2); ctx.translate(-W / 2, -(py + ph / 2));
    ctx.shadowColor = 'rgba(2,18,43,0.25)'; ctx.shadowBlur = 30; ctx.shadowOffsetY = 12;
    rrect(ctx, px, py, pw, ph, ph / 2); ctx.fillStyle = C.navy; ctx.fill(); ctx.shadowColor = 'transparent';
    ctx.font = font(60, 800, DISPLAY); ctx.fillStyle = C.gold; ctx.textAlign = 'center';
    ctx.fillText('+971 50 441 8859', W / 2, py + ph / 2 + 21);
    // shine across the pill
    const sh = prog(u, 61.5, 62.6);
    if (sh > 0 && sh < 1) { ctx.save(); rrect(ctx, px, py, pw, ph, ph / 2); ctx.clip(); const sx = lerp(px - 200, px + pw + 200, sh);
      const g = ctx.createLinearGradient(sx - 90, 0, sx + 90, 0); g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.5, 'rgba(255,255,255,0.28)'); g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = g; ctx.fillRect(px, py, pw, ph); ctx.restore(); }
    ctx.restore();
  }
  const k3 = springU(u, 60.9, SPRING.gentle);
  if (k3 > 0) {
    ctx.save(); ctx.globalAlpha = clamp(k3 * 1.4); ctx.textAlign = 'center'; ctx.font = font(46, 600, UI); ctx.fillStyle = 'rgba(2,18,43,0.78)';
    ctx.fillText('aghgermanpathway.com', W / 2, cy + 236 + (1 - k3) * 30); ctx.restore();
  }
}

// ------------------------------------------------------------------ film
M.film({
  fonts: [font(100, 900, DISPLAY), font(100, 800, DISPLAY), font(40, 600, UI), font(40, 700, UI)],
  images: {
    berlin: 'assets/plates/berlin.png', hamburg: 'assets/plates/hamburg.png',
    heidelberg: 'assets/plates/heidelberg.png', bavaria: 'assets/plates/bavaria.png',
    plane_w: 'assets/logo/plane_w.png',
    ...Object.fromEntries(['stripe_dark', 'stripe_light', 'stripe_gold', 'stripe_red', 'building', 'plane', 'A', 'G', 'H', 'tagline', 'stripe_dark_w', 'building_w']
      .map((n) => ['L_' + n, `assets/logo/${n}.png`])),
  },
  hits: HITS,
  init() {
    // four seeded grain tiles; the frame picks one from t, so grain stays a pure function of time
    GRAIN = [0, 1, 2, 3].map((s) => {
      const c = document.createElement('canvas'); c.width = 360; c.height = 640;
      const g = c.getContext('2d'); const id = g.createImageData(c.width, c.height); const r = mulberry32(100 + s);
      for (let i = 0; i < id.data.length; i += 4) { const v = 128 + (r() - 0.5) * 120; id.data[i] = id.data[i + 1] = id.data[i + 2] = v; id.data[i + 3] = 255; }
      g.putImageData(id, 0, 0); return c;
    });
  },
  draw(ctx, u, t, IMG) {
    const navy = (c) => { c.fillStyle = C.deep; c.fillRect(0, 0, W, H); };
    if (u < 2.4) ribbonWipe(ctx, u, -1.25, 2.2, navy, (c) => sceneA(c, u, IMG), 1);
    else if (u < 11.0) sceneA(ctx, u, IMG);
    else if (u < 13.2) ribbonWipe(ctx, u, 11.0, 1.4, (c) => sceneA(c, u, IMG), (c) => sceneB(c, u, IMG), -1);
    else if (u < 28) sceneB(ctx, u, IMG);
    else if (u < 42.2) { sceneC(ctx, u, IMG); const fl = bump(u, 28, 0.6); if (fl > 0) { ctx.fillStyle = `rgba(255,226,170,${fl * 0.8})`; ctx.fillRect(0, 0, W, H); } }
    else if (u < 44.1) flipCD(ctx, u, IMG);
    else if (u < 54.4) sceneD(ctx, u, IMG);
    else if (u < 56.0) ribbonWipe(ctx, u, 54.3, 1.2, (c) => sceneD(c, u, IMG), (c) => sceneE(c, u, IMG), 1);
    else sceneE(ctx, u, IMG);
    // film grain over everything but the paper end card
    const gk = u < 55.8 ? 0.06 : 0.025;
    ctx.save(); ctx.globalCompositeOperation = 'overlay'; ctx.globalAlpha = gk;
    ctx.drawImage(GRAIN[Math.floor(t * 24) % 4], 0, 0, W, H); ctx.restore();
    captions(ctx, u, t);
  },
});
