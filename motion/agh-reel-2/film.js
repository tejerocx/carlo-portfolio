// AGH German Pathway showreel II: pure function of time. window.seek(t) paints frame t (lib/motion.js).
// 128 bpm grid, 72 beats = 33.75 s. docs/shotlist.md is the plan this file follows.
// The hero is the gold "pathway" line (the logo's progress bar): it slices, routes, and fills.
import * as M from './lib/motion.js';

const { W, H, FORMAT, E, prog, lerp, clamp, springU, SPRING, wobble, font, layout, fitSize, rrect, shake, hash01, mulberry32, bump, kf } = M;

// expo in-out (motion.js has in/out only)
E.inOutExpo = (x) => (x <= 0 ? 0 : x >= 1 ? 1 : x < 0.5 ? 2 ** (20 * x - 10) / 2 : (2 - 2 ** (-20 * x + 10)) / 2);

const C = {
  navy: '#02122B', deep: '#06132C', gold: '#FFC61A', logoGold: '#FEB101', red: '#E6141E',
  sky: '#83A7FB', white: '#FFFFFF', paper: '#FBFBF8', ink: '#02122B',
};
const DISPLAY = 'Display', UI = 'UI';
const S = FORMAT.safe;
const CAP_Y = 1418;

const WORDS = (await fetch('words.json').then((r) => r.json())).words;
const LOGO = (await fetch('assets/logo/layers.json').then((r) => r.json())).layers;

// Landmarks in image-normalised coordinates
const SPOT = {
  cologne: { sun: [0.128, 0.604], water: [0.645, 1.0] },
  dresden: { sun: [0.99, 0.55], water: [0.668, 1.0], pin: [0.5, 0.79] },
  munich: { sun: [0.04, 0.562], clock: [0.8085, 0.4486], clockR: 29 / 1672 },
  frankfurt: { sun: [0.117, 0.565], water: [0.645, 0.86] },
};
const COORD = { cologne: ['50.9375', '6.9603'], dresden: ['51.0504', '13.7373'], munich: ['48.1351', '11.5820'], frankfurt: ['50.1109', '8.6821'] };

// ------------------------------------------------------------------ hits (sfx.mjs voices these)
const HITS = [
  [0, 'pathway line streaks', 'whoosh', { len: 0.5, from: 500, to: 3500 }],
  [1, 'YOUR', 'tick'],
  [1.6, 'SKILLS. light sweep', 'blip', { pitch: 'E6' }],
  [3.9, 'punch-in through the letters', 'whoosh', { len: 0.7, from: 200, to: 5000 }],
  [4, 'A NEW CHAPTER? slam', 'thud', { pitch: 80, to: 40 }],
  [9.5, 'location pin', 'pop', { pitch: 'A5' }],
  [10, 'coordinates roll', 'type', { n: 10, len: 0.6 }],
  [16.9, 'gold line slices the frame', 'whoosh', { len: 0.4, from: 1500, to: 5000, pan: -0.3 }],
  [17.5, 'halves split', 'whoosh', { len: 0.5, from: 3000, to: 300 }],
  [18.5, 'KNOW YOUR', 'tick'],
  [19.4, 'STARTING POINT.', 'thud', { pitch: 85, to: 45 }],
  [20.2, 'pin drops into the river', 'thud', { pitch: 120, to: 50 }],
  [20.3, 'ripple', 'blip', { pitch: 'C6' }],
  [21.7, '01 qualifications', 'click'],
  [24.6, '02 experience', 'click'],
  [27.0, '03 goal', 'click'],
  [27.3, 'goal check', 'bell', { pitch: 'G5' }],
  [33.2, 'pin iris opens', 'whoosh', { len: 0.6, from: 300, to: 4000 }],
  [35, 'PREPARE FOR', 'pop', { pitch: 'E5' }],
  [36.6, 'YOUR PROFESSION.', 'thud', { pitch: 85, to: 45 }],
  [38.0, 'clock ring locks on', 'bell', { pitch: 'C6' }],
  [47.5, 'clock sweep complete', 'bell', { pitch: 'G6' }],
  [11.8, 'pathway underline', 'whoosh', { len: 0.35, from: 2000, to: 5000 }],
  [39.2, 'search types: language', 'type', { n: 12, len: 0.9 }],
  [40.8, 'search types: qualification', 'type', { n: 16, len: 1.1 }],
  [42.6, 'search hit', 'blip', { pitch: 'G6' }],
  [49.2, 'spin whip', 'whoosh', { len: 0.8, from: 200, to: 6000, pan: 0.3 }],
  [50, 'drop: Frankfurt', 'impact'],
  [51, 'MAKE YOUR', 'thud', { pitch: 90, to: 50 }],
  [52.0, 'NEXT', 'click'],
  [52.35, 'STEP', 'click'],
  [52.8, 'COUNT.', 'thud', { pitch: 110, to: 45 }],
  [54.2, 'route node Cologne', 'blip', { pitch: 'C6' }],
  [54.7, 'route node Dresden', 'blip', { pitch: 'E6' }],
  [55.2, 'route node Munich', 'blip', { pitch: 'G6' }],
  [55.7, 'route node Frankfurt', 'bell', { pitch: 'C7' }],
  [56.4, 'chat bubble', 'pop', { pitch: 'A5' }],
  [61.1, 'node iris to paper', 'whoosh', { len: 0.6, from: 400, to: 4000 }],
  [62, 'end card', 'impact'],
  [61.5, 'ribbon 1', 'pop', { pitch: 'C5' }],
  [61.8, 'ribbon 2', 'pop', { pitch: 'E5' }],
  [62.1, 'ribbon 3', 'pop', { pitch: 'G5' }],
  [62.4, 'ribbon 4', 'pop', { pitch: 'C6' }],
  [64.4, 'ribbons take brand colour', 'swell', { len: 0.5 }],
  [64.7, 'building lifts', 'pop', { pitch: 'E5' }],
  [65.0, 'plane arcs in', 'whoosh', { len: 0.5, from: 1200, to: 3200, pan: 0.4 }],
  [65.4, 'A', 'tok', { pitch: 'C5' }],
  [65.6, 'G', 'tok', { pitch: 'E5' }],
  [65.8, 'H', 'tok', { pitch: 'G5' }],
  [66.6, 'bar fills', 'bell', { pitch: 'G6' }],
  [66.8, 'split-flap phone', 'type', { n: 14, len: 0.9 }],
  [68.2, 'url', 'tick'],
];

// ------------------------------------------------------------------ helpers
let GRAIN = [], OFF = null, OFF2 = null;
const camOf = (img, cam) => {
  const s = Math.max(W / img.width, H / img.height) * (cam.zoom ?? 1);
  return { s, dw: img.width * s, dh: img.height * s, fx: cam.fx ?? 0.5, fy: cam.fy ?? 0.5 };
};
// Plate with optional living water (strip displacement) under the same camera.
function plate(ctx, img, cam = {}, t = 0, water = null) {
  const { s, dw, dh, fx, fy } = camOf(img, cam);
  const x0 = (W - dw) * fx, y0 = (H - dh) * fy;
  ctx.save();
  ctx.translate(W / 2 + (cam.dx || 0), H / 2 + (cam.dy || 0)); ctx.rotate(cam.rot || 0); ctx.translate(-W / 2, -H / 2);
  ctx.drawImage(img, x0, y0, dw, dh);
  if (water) {
    const [a, b] = water, step = 3;
    for (let sy = Math.floor(a * img.height); sy < b * img.height; sy += step) {
      const d = (sy / img.height - a) / (b - a);
      const off = Math.sin(sy * 0.21 + t * 3.1) * lerp(0.4, 3.2, d) + Math.sin(sy * 0.047 - t * 1.7) * lerp(0.2, 1.6, d);
      ctx.drawImage(img, 0, sy, img.width, step + 1, x0 + off * s, y0 + sy * s, dw, (step + 1) * s);
    }
  }
  ctx.restore();
}
const plateXY = (img, cam, px, py) => { const { dw, dh, fx, fy } = camOf(img, cam); return [(W - dw) * fx + px * dw + (cam.dx || 0), (H - dh) * fy + py * dh + (cam.dy || 0)]; };
function grad(ctx, y0, y1, c0, c1) { const g = ctx.createLinearGradient(0, y0, 0, y1); g.addColorStop(0, c0); g.addColorStop(1, c1); ctx.fillStyle = g; ctx.fillRect(0, Math.min(y0, y1), W, Math.abs(y1 - y0)); }
function grade(ctx, top = 0.62, bottom = 0.55) {
  grad(ctx, 0, H * 0.46, `rgba(4,12,32,${top})`, 'rgba(4,12,32,0)');
  grad(ctx, H * 0.62, H, 'rgba(4,10,26,0)', `rgba(4,10,26,${bottom})`);
  const v = ctx.createRadialGradient(W / 2, H * 0.48, H * 0.32, W / 2, H * 0.5, H * 0.78);
  v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,4,16,0.5)'); ctx.fillStyle = v; ctx.fillRect(0, 0, W, H);
}
function sun(ctx, x, y, r, k, u) {
  if (k <= 0) return;
  const br = 0.85 + 0.15 * Math.sin(u * 0.9);
  ctx.save(); ctx.globalCompositeOperation = 'screen';
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, `rgba(255,214,140,${0.75 * k * br})`); g.addColorStop(0.25, `rgba(255,160,60,${0.3 * k * br})`); g.addColorStop(1, 'rgba(255,120,40,0)');
  ctx.fillStyle = g; ctx.fillRect(x - r, y - r, 2 * r, 2 * r);
  const sg = ctx.createLinearGradient(x - W, y, x + W, y);
  sg.addColorStop(0, 'rgba(255,190,90,0)'); sg.addColorStop(0.5, `rgba(255,220,160,${0.5 * k * br})`); sg.addColorStop(1, 'rgba(255,190,90,0)');
  ctx.fillStyle = sg; ctx.fillRect(x - W, y - 3, 2 * W, 6); ctx.restore();
}
function leak(ctx, u, u0, u1, y = H * 0.4, a = 0.35) {
  const p = prog(u, u0, u1); if (p <= 0 || p >= 1) return;
  const x = lerp(-W * 0.4, W * 1.4, E.inOutSine(p)), k = Math.sin(Math.PI * p) * a;
  ctx.save(); ctx.globalCompositeOperation = 'screen';
  const g = ctx.createRadialGradient(x, y, 0, x, y, W * 0.7); g.addColorStop(0, `rgba(255,190,110,${k})`); g.addColorStop(1, 'rgba(255,120,60,0)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); ctx.restore();
}
// beat-reactive zoom pulse (used in the peak)
const pulse = (u, a = 0.012) => 1 + a * Math.exp(-((u % 1 + 1) % 1) * 6);

// ------------------------------------------------------------------ kinetic type
function kinetic(ctx, u, L) {
  const f = font(L.size, L.weight, DISPLAY), track = -0.02 * L.size;
  const lay = layout(ctx, L.str, f, track);
  const x0 = L.align === 'center' ? W / 2 - lay.width / 2 : L.x;
  const st = L.stagger ?? 0.035, n = lay.glyphs.length;
  ctx.save();
  ctx.shadowColor = 'rgba(2,8,24,0.55)'; ctx.shadowBlur = L.size * 0.22; ctx.shadowOffsetY = L.size * 0.04;
  lay.glyphs.forEach((g, j) => {
    if (g.ch === ' ') return;
    const order = L.reverse ? n - 1 - j : j, ua = L.u0 + order * st;
    let x = x0 + g.cx, y = L.y, sx = 1, sy = 1, rot = 0, skew = 0, a = 1;
    if (L.style === 'rise') {
      const k = springU(u, ua, SPRING.bouncy); if (k <= 0) return;
      y += (1 - k) * L.size * 1.1; skew = (1 - k) * 0.25;
    } else if (L.style === 'whipL' || L.style === 'whipR') {
      const k = springU(u, ua, { stiffness: 300, damping: 22 }); if (k <= 0) return;
      const dir = L.style === 'whipL' ? -1 : 1; x += dir * (1 - k) * W * 1.1; skew = dir * -(1 - k) * 0.6;
    } else if (L.style === 'drop') {
      const k = springU(u, ua, { stiffness: 210, damping: 11 }); if (k <= 0) return;
      y -= (1 - k) * (L.size * 3); const q = 0.12 * wobble(u - ua - 0.25, 2.4, 6); sx = 1 + q; sy = 1 - q;
    } else if (L.style === 'pop') {
      const k = springU(u, ua, { stiffness: 320, damping: 14 }); if (k <= 0) return;
      sx = sy = k; rot = (1 - k) * (j % 2 ? 0.5 : -0.5); y += (1 - k) * L.size * 0.3;
    } else if (L.style === 'slam') {
      const p = prog(u, ua, ua + 0.3); if (p <= 0) return;
      const e = E.inCubic(p); sx = sy = lerp(2.6, 1, e) + 0.05 * wobble(u - ua - 0.3, 3, 7); a = clamp(p * 2.5); y += (1 - e) * -L.size * 0.4;
    } else if (L.style === 'flip') {   // each glyph flips down from its top edge like a card
      const k = springU(u, ua, { stiffness: 260, damping: 15 }); if (k <= 0) return;
      sy = Math.max(0.001, Math.sin(k * Math.PI / 2)); y -= (1 - sy) * L.size * 0.4;
    }
    if (L.exit !== undefined) {
      const ex = L.exit + order * 0.025, p = E.inBack(prog(u, ex, ex + 0.45), 1.6); if (p >= 1) return;
      y += p * (H * 0.55); rot += p * (j % 2 ? 0.3 : -0.25); a *= 1 - Math.max(0, p - 0.7) / 0.3;
    }
    if (a <= 0 || Math.abs(sx) < 1e-3) return;
    ctx.save(); ctx.globalAlpha *= a; ctx.translate(x, y); ctx.rotate(rot); if (skew) ctx.transform(1, 0, -skew, 1, 0, 0); ctx.scale(sx, sy);
    ctx.font = f; ctx.fillStyle = L.color; ctx.textAlign = 'center'; ctx.fillText(g.ch, 0, 0); ctx.restore();
  });
  ctx.restore();
  return lay;
}
const fit = (ctx, str, weight, max, w = S.w) => fitSize(ctx, str, weight, DISPLAY, w, max, -0.02);
// words appear as they are said (kinetic subtitle in the UI face)
function spokenLine(ctx, u, words, x, y, size, color = C.white, weight = 600) {
  ctx.save(); ctx.font = font(size, weight, UI); ctx.textAlign = 'left';
  ctx.shadowColor = 'rgba(2,8,24,0.7)'; ctx.shadowBlur = 18;
  let cx = x; const sp = ctx.measureText(' ').width;
  words.forEach(([w, uw]) => {
    const k = springU(u, uw - 0.1, SPRING.snappy), ww = ctx.measureText(w).width;
    if (k > 0) { ctx.globalAlpha = clamp(k * 1.5); ctx.fillStyle = color; ctx.fillText(w, cx, y + (1 - k) * size * 0.6); }
    cx += ww + sp;
  });
  ctx.restore();
}
// location super: pin + city + coordinates rolling in like an odometer
function locationTag(ctx, u, u0, city, [lat, lon], x, y) {
  const k = springU(u, u0, SPRING.bouncy); if (k <= 0) return;
  ctx.save(); ctx.globalAlpha = clamp(k * 1.6);
  rrect(ctx, x - 22, y - 58, 470 * Math.min(1, k * 1.2), 128, 28); ctx.fillStyle = 'rgba(3,12,32,0.6)'; ctx.fill();
  ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(255,198,26,0.4)'; ctx.stroke();
  // pin
  ctx.save(); ctx.translate(x + 16, y - 14 - (1 - k) * 40); ctx.scale(k, k);
  ctx.beginPath(); ctx.arc(0, -10, 14, Math.PI, 0); ctx.lineTo(0, 16); ctx.closePath(); ctx.fillStyle = C.gold; ctx.fill();
  ctx.beginPath(); ctx.arc(0, -10, 5.5, 0, M.TAU); ctx.fillStyle = C.navy; ctx.fill(); ctx.restore();
  ctx.font = font(38, 800, UI); ctx.fillStyle = C.white; ctx.letterSpacing = '8px'; ctx.textAlign = 'left';
  ctx.shadowColor = 'rgba(2,8,24,0.7)'; ctx.shadowBlur = 14;
  const reveal = E.outCubic(prog(u, u0 + 0.1, u0 + 0.7));
  const label = city.toUpperCase().slice(0, Math.ceil(city.length * reveal));
  ctx.fillText(label, x + 48, y); ctx.letterSpacing = '0px';
  // coordinates: each digit rolls until it lands
  ctx.font = font(30, 600, UI); ctx.fillStyle = 'rgba(255,214,120,0.95)';
  const str = `${lat}° N   ${lon}° E`;
  let cx = x + 48;
  [...str].forEach((ch, i) => {
    const land = u0 + 0.5 + i * 0.04;
    let c = ch;
    if (/\d/.test(ch) && u < land) c = String(Math.floor(hash01(i * 31 + Math.floor(u * 24), 7) * 10));
    if (u < u0 + 0.3 + i * 0.02) return;
    ctx.fillText(c, cx, y + 44); cx += ctx.measureText(ch).width;
  });
  ctx.restore();
}

// ------------------------------------------------------------------ captions (steady pill)
const GROUPS = (() => {
  const sents = []; let cur = [];
  WORDS.forEach((w, i) => { cur.push(w); if (/[.?!]$/.test(w.w) || i === WORDS.length - 1) { sents.push(cur); cur = []; } });
  const len = (ws) => ws.map((x) => x.w).join(' ').length, gs = [];
  sents.forEach((ws) => {
    const parts = len(ws) <= 34 ? 1 : Math.ceil(len(ws) / 31);
    if (parts <= 1) { gs.push(ws); return; }
    const target = len(ws) / parts; let g = [];
    ws.forEach((w, i) => { g.push(w); if (len(g) >= target * 0.92 && i < ws.length - 1) { gs.push(g); g = []; } });
    if (g.length) gs.push(g);
  });
  return gs.map((ws) => ({ ws, t0: ws[0].t0 - 0.12, text: ws.map((x) => x.w).join(' ') }));
})();
function captions(ctx, u, t) {
  let gi = 0; for (let i = 0; i < GROUPS.length; i++) if (t >= GROUPS[i].t0) gi = i;
  const g = GROUPS[gi];
  ctx.font = font(50, 700, UI);
  const fsz = Math.min(50, Math.floor(50 * 900 / Math.max(...GROUPS.map((G) => ctx.measureText(G.text).width)))), f = font(fsz, 700, UI);
  ctx.font = f;
  const widthOf = (G) => ctx.measureText(G.text).width;
  const into = gi > 0 ? clamp((t - g.t0) / 0.16) : 1;
  const tw = lerp(gi > 0 ? widthOf(GROUPS[gi - 1]) : widthOf(g), widthOf(g), E.outCubic(into));
  const ph = 92, pw = tw + 76;
  ctx.save();
  rrect(ctx, W / 2 - pw / 2, CAP_Y - ph / 2, pw, ph, ph / 2); ctx.fillStyle = 'rgba(3,12,32,0.8)'; ctx.fill();
  ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(255,198,26,0.35)'; ctx.stroke();
  ctx.font = f; ctx.textAlign = 'left';
  const space = ctx.measureText(' ').width;
  const drawGroup = (G, alpha, dy) => {
    let x = W / 2 - ctx.measureText(G.text).width / 2;
    G.ws.forEach((w) => {
      const ww = ctx.measureText(w.w).width, spoken = t >= w.t0, active = t >= w.t0 && t < w.t1 + 0.08, kk = clamp((t - w.t0) / 0.1);
      ctx.save(); ctx.globalAlpha = alpha * (spoken ? 1 : 0.5); ctx.fillStyle = active ? C.gold : C.white;
      const sc = active ? 1 + 0.06 * Math.sin(Math.PI * kk) : 1;
      ctx.translate(x + ww / 2, CAP_Y + fsz * 0.36 + dy); ctx.scale(sc, sc); ctx.fillText(w.w, -ww / 2, 0); ctx.restore();
      x += ww + space;
    });
  };
  ctx.beginPath(); ctx.rect(0, CAP_Y - ph / 2 + 4, W, ph - 8); ctx.clip();
  if (into < 1 && gi > 0) drawGroup(GROUPS[gi - 1], 1 - into, -into * 40);
  drawGroup(g, into, (1 - E.outCubic(into)) * 40);
  ctx.restore();
}

// ------------------------------------------------------------------ the pathway line (gold streak)
function streak(ctx, x0, y0, x1, y1, w, a = 1) {
  ctx.save(); ctx.globalAlpha = a; ctx.lineCap = 'round';
  ctx.shadowColor = 'rgba(255,190,40,0.9)'; ctx.shadowBlur = 30;
  ctx.strokeStyle = C.gold; ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
  ctx.shadowBlur = 0; ctx.strokeStyle = 'rgba(255,248,220,0.9)'; ctx.lineWidth = w * 0.35; ctx.stroke();
  ctx.restore();
}

// ------------------------------------------------------------------ S0 hook: photo inside the letters, punch-in   (u 0..4)
const HOOK_CAM = { zoom: 1.12, fx: 0.4, fy: 0.55 };
function sceneHook(ctx, u, t, IMG) {
  ctx.fillStyle = C.deep; ctx.fillRect(0, 0, W, H);
  const g = ctx.createRadialGradient(W / 2, H * 0.45, 0, W / 2, H * 0.45, H * 0.6);
  g.addColorStop(0, 'rgba(30,60,120,0.55)'); g.addColorStop(1, 'rgba(2,10,28,0)'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  // giant SKILLS. as a window into Cologne
  const size = fit(ctx, 'SKILLS.', 900, 330, W - 70);
  const f = font(size, 900, DISPLAY), lay = layout(ctx, 'SKILLS.', f, -0.02 * size);
  const tx = W / 2 - lay.width / 2, base = H * 0.5 + size * 0.36;
  const iG = lay.glyphs[2];                     // zoom into the stem of the "I"
  const fxp = tx + iG.cx, fyp = base - size * 0.36;
  const punch = E.inExpo(prog(u, 2.9, 4.0));
  const sc = lerp(springU(u, -0.3, { stiffness: 90, damping: 14 }) * 0.15 + 0.85, 26, punch) * (1 + 0.02 * u);
  const o = OFF.getContext('2d');
  o.setTransform(1, 0, 0, 1, 0, 0); o.globalCompositeOperation = 'source-over'; o.clearRect(0, 0, W, H);
  o.save(); o.translate(fxp, fyp); o.scale(sc, sc); o.translate(-fxp, -fyp);
  o.font = f; o.letterSpacing = `${-0.02 * size}px`; o.fillStyle = '#fff'; o.textAlign = 'left'; o.fillText('SKILLS.', tx, base); o.letterSpacing = '0px';
  o.restore();
  o.globalCompositeOperation = 'source-in';
  o.filter = `brightness(${lerp(1.45, 1, punch)}) saturate(${lerp(1.2, 1, punch)})`;
  plate(o, IMG.cologne, { ...HOOK_CAM, zoom: HOOK_CAM.zoom + 0.08 * (1 - punch) }, t, null);
  o.filter = 'none';
  o.globalCompositeOperation = 'source-over';
  // light sweep across the letters
  const sw = prog(u, 1.3, 2.4);
  if (sw > 0 && sw < 1) {
    o.globalCompositeOperation = 'source-atop';
    const sx = lerp(-300, W + 300, sw), lg = o.createLinearGradient(sx - 140, 0, sx + 140, 0);
    lg.addColorStop(0, 'rgba(255,255,255,0)'); lg.addColorStop(0.5, 'rgba(255,240,200,0.55)'); lg.addColorStop(1, 'rgba(255,255,255,0)');
    o.fillStyle = lg; o.fillRect(0, 0, W, H); o.globalCompositeOperation = 'source-over';
  }
  ctx.save(); ctx.shadowColor = 'rgba(0,0,0,0.5)'; ctx.shadowBlur = 40; ctx.drawImage(OFF, 0, 0); ctx.restore();
  // gold pathway streak racing under the word on frame 0
  const sp = E.outCubic(prog(u, -0.35, 0.9)), fade = 1 - prog(u, 2.6, 3.2);
  if (fade > 0) streak(ctx, lerp(-200, 80, sp), base + 46, lerp(-200, W - 80, sp), base + 46, 12, fade);
  // "YOUR" above, on the word
  const yk = springU(u, 0.85, SPRING.bouncy);
  if (yk > 0 && punch < 0.5) {
    ctx.save(); ctx.globalAlpha = clamp(yk * 1.5) * (1 - punch * 2);
    ctx.font = font(96, 800, DISPLAY); ctx.fillStyle = C.white; ctx.textAlign = 'left';
    ctx.fillText('YOUR', tx + 8, base - size * 0.82 - (1 - yk) * 60); ctx.restore();
  }
}

// ------------------------------------------------------------------ S1 Cologne   (u 4..18)
function camCologne(u) {
  return { zoom: lerp(1.12, 1.24, E.inOutSine(prog(u, 3.5, 18))) + 0.2 * E.inOutSine(prog(u, 11.5, 17)), fx: lerp(0.4, 0.55, E.inOutSine(prog(u, 4, 18))), fy: lerp(0.55, 0.6, prog(u, 11.5, 17)) };
}
function sceneCologne(ctx, u, t, IMG, opt = {}) {
  const img = IMG.cologne, cam = camCologne(u);
  plate(ctx, img, cam, t, SPOT.cologne.water);
  const [sx, sy] = plateXY(img, cam, ...SPOT.cologne.sun); sun(ctx, sx, sy, 520, 1, u);
  grade(ctx, 0.66, 0.55);
  leak(ctx, u, 12, 17, H * 0.35, 0.28);
  if (opt.noText) return;
  const s1 = fit(ctx, 'YOUR SKILLS.', 900, 150), s2 = fit(ctx, 'A NEW CHAPTER?', 900, 170);
  const y1 = S.y + s1 * 0.95, y2 = y1 + s2 * 1.02;
  kinetic(ctx, u, { str: 'YOUR SKILLS.', size: s1, weight: 900, color: C.white, x: S.x, y: y1, u0: 4.05, style: 'rise', stagger: 0.025 });
  const l2 = kinetic(ctx, u, { str: 'A NEW CHAPTER?', size: s2, weight: 900, color: C.gold, x: S.x, y: y2, u0: 3.95, style: 'slam', stagger: 0.025 });
  const ul = E.inOutCubic(prog(u, 11.8, 12.8));              // the pathway line underlines the question
  if (ul > 0) streak(ctx, S.x + 4, y2 + 22, S.x + 4 + (l2.width - 8) * ul, y2 + 22, 8, 1);
  const sub = [['Start', 5.4], ['planning', 6.0], ['your', 6.9], ['career', 7.04]], sub2 = [['in', 7.7], ['Germany.', 7.98]];
  spokenLine(ctx, u, sub, S.x + 4, y2 + 92, 54);
  spokenLine(ctx, u, sub2, S.x + 4, y2 + 160, 54);
  locationTag(ctx, u, 9.5, 'Cologne', COORD.cologne, 560, 860);
}

// ------------------------------------------------------------------ T1: the gold line slices the frame   (u 16.8..18.2)
function sliceT1(ctx, u, t, IMG) {
  const cut = E.inOutCubic(prog(u, 16.8, 17.3));       // line draws across
  const split = E.inOutExpo(prog(u, 17.25, 18.15));     // halves fly apart
  const ySplit = H * 0.52, ang = -0.08;
  sceneDresden(ctx, u, t, IMG, { preview: true });
  const half = (top) => {
    ctx.save();
    ctx.beginPath();
    if (top) { ctx.moveTo(0, 0); ctx.lineTo(W, 0); ctx.lineTo(W, ySplit + Math.tan(ang) * W / 2); ctx.lineTo(0, ySplit - Math.tan(ang) * W / 2); }
    else { ctx.moveTo(0, ySplit - Math.tan(ang) * W / 2); ctx.lineTo(W, ySplit + Math.tan(ang) * W / 2); ctx.lineTo(W, H); ctx.lineTo(0, H); }
    ctx.closePath();
    ctx.translate((top ? -1 : 1) * split * W * 1.1, (top ? -1 : 1) * split * 80);
    ctx.clip(); ctx.rotate((top ? -1 : 1) * split * 0.04);
    sceneCologne(ctx, u, t, IMG); ctx.restore();
  };
  if (split < 1) { half(true); half(false); }
  if (cut > 0 && split < 0.6) {
    const xa = -50, xb = lerp(-50, W + 50, cut);
    streak(ctx, xa, ySplit - Math.tan(ang) * (W / 2 + 50), xb, ySplit - Math.tan(ang) * W / 2 + Math.tan(ang) * xb, 14, 1 - split / 0.6);
  }
}

// ------------------------------------------------------------------ S2 Dresden   (u 18..34)
function camDresden(u) { const pz = E.inOutSine(prog(u, 29.2, 33.6)); return { zoom: lerp(1.3, 1.12, E.outCubic(prog(u, 17.3, 20))) + 0.04 * prog(u, 20, 34) + 0.16 * pz, fx: lerp(0.62, 0.5, prog(u, 17, 34)), fy: lerp(0.5, 0.64, pz) }; }
function sceneDresden(ctx, u, t, IMG, opt = {}) {
  const img = IMG.dresden, cam = camDresden(u);
  plate(ctx, img, cam, t, SPOT.dresden.water);
  const [sx, sy] = plateXY(img, cam, ...SPOT.dresden.sun); sun(ctx, sx, sy, 560, 1, u);
  grade(ctx, 0.66, 0.5);
  if (opt.preview) return;
  const s1 = fit(ctx, 'KNOW YOUR', 900, 170), s2 = fit(ctx, 'STARTING POINT.', 900, 170);
  const y1 = S.y + s1 * 0.95, y2 = y1 + s2 * 1.02;
  kinetic(ctx, u, { str: 'KNOW YOUR', size: s1, weight: 900, color: C.white, x: S.x, y: y1, u0: 18.4, style: 'flip', stagger: 0.03 });
  kinetic(ctx, u, { str: 'STARTING POINT.', size: s2, weight: 900, color: C.gold, x: S.x, y: y2, u0: 19.35, style: 'flip', stagger: 0.03 });
  // three steps: numbered glass rows slam in from the right
  const rows = [['01', 'Your qualifications.', 21.6], ['02', 'Your experience.', 24.5], ['03', 'Your goal.', 26.9]];
  rows.forEach(([n, txt, ur], i) => {
    const k = springU(u, ur, { stiffness: 260, damping: 20 }); if (k <= 0) return;
    const y = y2 + 70 + i * 104, x = S.x + (1 - k) * 700;
    ctx.save(); ctx.globalAlpha = clamp(k * 1.4);
    ctx.font = font(48, 700, UI); const tw = ctx.measureText(txt).width;
    rrect(ctx, x, y, tw + 150, 84, 42); ctx.fillStyle = 'rgba(3,12,32,0.62)'; ctx.fill();
    ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(255,198,26,0.45)'; ctx.stroke();
    ctx.beginPath(); ctx.arc(x + 44, y + 42, 28, 0, M.TAU); ctx.fillStyle = C.gold; ctx.fill();
    ctx.font = font(26, 900, DISPLAY); ctx.fillStyle = C.navy; ctx.textAlign = 'center'; ctx.fillText(n, x + 44, y + 52);
    ctx.font = font(48, 700, UI); ctx.fillStyle = C.white; ctx.textAlign = 'left'; ctx.fillText(txt, x + 92, y + 59);
    ctx.restore();
  });
  // the starting-point pin drops into the river: splash, rings, and its reflection
  const [px, py] = plateXY(img, cam, ...SPOT.dresden.pin);
  const dk = springU(u, 19.6, { stiffness: 260, damping: 13 });
  if (dk > 0) {
    const yy = lerp(py - 900, py, dk);
    for (const r0 of [20.2, 20.9, 21.6, 28.0, 28.7]) {      // rings on the water (perspective ellipses)
      const q = prog(u, r0, r0 + 2.2); if (q <= 0 || q >= 1) continue;
      ctx.save(); ctx.beginPath(); ctx.ellipse(px, py + 6, 30 + 300 * E.outCubic(q), (30 + 300 * E.outCubic(q)) * 0.22, 0, 0, M.TAU);
      ctx.lineWidth = 4 * (1 - q) + 1; ctx.strokeStyle = `rgba(255,214,120,${0.9 * (1 - q)})`; ctx.stroke(); ctx.restore();
    }
    const drawPin = (sy) => {
      ctx.save(); ctx.translate(px, yy); ctx.scale(1, sy);
      ctx.beginPath(); ctx.arc(0, -78, 40, Math.PI * 0.78, Math.PI * 0.22); ctx.lineTo(0, 0); ctx.closePath(); ctx.fillStyle = C.gold; ctx.fill();
      ctx.beginPath(); ctx.arc(0, -78, 16, 0, M.TAU); ctx.fillStyle = C.navy; ctx.fill(); ctx.restore();
    };
    ctx.save(); ctx.shadowColor = 'rgba(0,0,0,0.5)'; ctx.shadowBlur = 20; drawPin(1); ctx.restore();
    // reflection, rippling
    ctx.save(); ctx.globalAlpha = 0.35 * dk; ctx.beginPath(); ctx.rect(0, py, W, 200); ctx.clip();
    ctx.translate(Math.sin(t * 7) * 3, 0); drawPin(-0.8); ctx.restore();
  }
}

// ------------------------------------------------------------------ T2: iris out of the pin head   (u 32.6..34.2)
function irisT2(ctx, u, t, IMG) {
  sceneDresden(ctx, u, t, IMG);
  const img = IMG.dresden, cam = camDresden(u);
  const [px, py] = plateXY(img, cam, ...SPOT.dresden.pin);
  const cx = px, cy = py - 78;
  const p = E.inOutExpo(prog(u, 32.7, 34.0));
  const r = lerp(16, Math.hypot(W, H) * 1.05, p);
  ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, r + 14, 0, M.TAU); ctx.fillStyle = C.gold; ctx.fill(); ctx.restore();
  ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, r, 0, M.TAU); ctx.clip(); sceneMunich(ctx, u, t, IMG); ctx.restore();
}

// ------------------------------------------------------------------ S3 Munich   (u 34..50)
function camMunich(u) {
  const k = springU(u, 32.8, { stiffness: 14, damping: 7.5 });            // crane up from the plaza to the spire
  const spin = E.inExpo(prog(u, 49.0, 50.0));
  const pc = E.inOutSine(prog(u, 43, 48.8));
  return { zoom: lerp(1.5, 1.14, k) * (1 + 0.6 * spin) * (1 + 0.2 * pc), fx: lerp(lerp(0.45, 0.62, k), 0.8, pc), fy: lerp(lerp(1.0, 0.36, k), 0.43, pc), rot: spin * 1.2 };
}
function sceneMunich(ctx, u, t, IMG) {
  const img = IMG.munich, cam = camMunich(u);
  plate(ctx, img, cam, t, null);
  const [sx, sy] = plateXY(img, cam, ...SPOT.munich.sun); sun(ctx, sx, sy, 520, 0.9, u);
  grade(ctx, 0.6, 0.6);
  const spin = prog(u, 49.0, 50.0), hide = 1 - E.inCubic(spin);
  ctx.save(); ctx.globalAlpha = hide;
  const s1 = fit(ctx, 'PREPARE FOR', 900, 160), s2 = fit(ctx, 'YOUR PROFESSION.', 900, 160);
  const y1 = S.y + s1 * 0.95, y2 = y1 + s2 * 1.02;
  kinetic(ctx, u, { str: 'PREPARE FOR', size: s1, weight: 900, color: C.white, x: S.x, y: y1, u0: 34.9, style: 'pop', stagger: 0.035 });
  kinetic(ctx, u, { str: 'YOUR PROFESSION.', size: s2, weight: 900, color: C.gold, x: S.x, y: y2, u0: 36.45, style: 'pop', stagger: 0.03 });
  // the Rathaus clock: a gold ring locks on and sweeps (time to prepare)
  const ck = springU(u, 37.8, SPRING.bouncy);
  if (ck > 0) {
    const [cx, cy] = plateXY(img, cam, ...SPOT.munich.clock);
    const r = SPOT.munich.clockR * camOf(img, cam).dh * 1.35;
    ctx.save(); ctx.translate(cx, cy); ctx.rotate(cam.rot || 0);
    ctx.lineWidth = 6; ctx.strokeStyle = 'rgba(255,198,26,0.35)'; ctx.beginPath(); ctx.arc(0, 0, r * (2 - ck), 0, M.TAU); ctx.stroke();
    const sweep = E.inOutSine(prog(u, 38, 47.5));
    ctx.lineWidth = 9; ctx.lineCap = 'round'; ctx.strokeStyle = C.gold; ctx.shadowColor = 'rgba(255,190,40,0.9)'; ctx.shadowBlur = 20;
    ctx.beginPath(); ctx.arc(0, 0, r * (2 - ck), -Math.PI / 2, -Math.PI / 2 + M.TAU * Math.max(0.001, sweep)); ctx.stroke();
    const fl = prog(u, 47.5, 48.9);                       // sweep complete: a ring pulse
    if (fl > 0 && fl < 1) { ctx.save(); ctx.lineWidth = 6 * (1 - fl); ctx.strokeStyle = `rgba(255,214,120,${1 - fl})`; ctx.beginPath(); ctx.arc(0, 0, r * (1.4 + 3 * E.outCubic(fl)), 0, M.TAU); ctx.stroke(); ctx.restore(); }
    // ticks every quarter
    for (let i = 0; i < 12; i++) { const a = (i / 12) * M.TAU; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(Math.cos(a) * r * 1.2, Math.sin(a) * r * 1.2); ctx.lineTo(Math.cos(a) * r * 1.32, Math.sin(a) * r * 1.32); ctx.stroke(); }
    ctx.restore();
  }
  // research: a search pill types the two requirements
  const pk = springU(u, 38.6, SPRING.snappy);
  if (pk > 0) {
    const pw = 860, ph = 104, px = W / 2 - pw / 2, py = 1210;
    ctx.save(); ctx.translate(W / 2, py + ph / 2); ctx.scale(lerp(0.6, 1, pk), lerp(0.6, 1, pk)); ctx.translate(-W / 2, -(py + ph / 2)); ctx.globalAlpha *= clamp(pk * 1.5);
    ctx.shadowColor = 'rgba(0,0,0,0.4)'; ctx.shadowBlur = 30; ctx.shadowOffsetY = 10;
    rrect(ctx, px, py, pw, ph, ph / 2); ctx.fillStyle = 'rgba(255,255,255,0.97)'; ctx.fill(); ctx.shadowColor = 'transparent';
    // magnifier
    ctx.lineWidth = 6; ctx.strokeStyle = C.navy; ctx.beginPath(); ctx.arc(px + 62, py + 46, 18, 0, M.TAU); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(px + 75, py + 59); ctx.lineTo(px + 90, py + 74); ctx.stroke();
    const A = 'language requirements', B = 'qualification requirements';
    let txt = '';
    if (u < 40.5) txt = A.slice(0, Math.floor(A.length * prog(u, 39.1, 40.1)));
    else if (u < 40.8) txt = A.slice(0, Math.floor(A.length * (1 - prog(u, 40.5, 40.8))));
    else txt = B.slice(0, Math.floor(B.length * prog(u, 40.8, 42.0)));
    const matched = u > 42.5;
    ctx.font = font(44, 600, UI); ctx.textAlign = 'left'; ctx.fillStyle = C.ink; ctx.fillText(txt, px + 116, py + 67);
    const tw = ctx.measureText(txt).width;
    if (!matched && Math.floor(u * 2.5) % 2 === 0) { ctx.fillStyle = C.gold; ctx.fillRect(px + 120 + tw, py + 28, 4, 50); }
    if (matched) {   // a gold check lands at the end of the field
      const mk = springU(u, 42.5, SPRING.bouncy);
      ctx.save(); ctx.translate(px + pw - 56, py + ph / 2); ctx.scale(mk, mk);
      ctx.beginPath(); ctx.arc(0, 0, 30, 0, M.TAU); ctx.fillStyle = C.gold; ctx.fill();
      ctx.lineWidth = 7; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.strokeStyle = C.navy;
      ctx.beginPath(); ctx.moveTo(-13, 1); ctx.lineTo(-3, 11); ctx.lineTo(14, -9); ctx.stroke(); ctx.restore();
    }
    ctx.restore();
  }
  ctx.restore();
}

// ------------------------------------------------------------------ S4 Frankfurt   (u 50..62)
function camFrankfurt(u) {
  const land = E.outExpo(prog(u, 49.6, 51.2));
  return { zoom: lerp(1.9, 1.1, land) * (u >= 50 ? pulse(u - 50) : 1) + 0.04 * prog(u, 51, 62), fx: 0.5, fy: 0.52, rot: (1 - land) * -0.9 };
}
const ROUTE_Y = 1192;
function sceneFrankfurt(ctx, u, t, IMG) {
  const img = IMG.frankfurt, cam = camFrankfurt(u);
  ctx.save(); shake(ctx, u, 50, 22, 4, 0.2); shake(ctx, u, 52.8, 14, 6, 0.15);
  plate(ctx, img, cam, t, SPOT.frankfurt.water);
  const [sx, sy] = plateXY(img, cam, ...SPOT.frankfurt.sun); sun(ctx, sx, sy, 560, 1, u);
  grade(ctx, 0.66, 0.6);
  ctx.restore();
  leak(ctx, u, 56, 61, H * 0.42, 0.25);
  const s1 = fit(ctx, 'MAKE YOUR', 900, 170), s2 = fit(ctx, 'NEXT STEP COUNT.', 900, 170);
  const y1 = S.y + s1 * 0.95, y2 = y1 + s2 * 1.02;
  kinetic(ctx, u, { str: 'MAKE YOUR', size: s1, weight: 900, color: C.white, x: S.x, y: y1, u0: 50.85, style: 'slam', stagger: 0.02 });
  // NEXT / STEP / COUNT. slam word by word with the VO
  const lay2 = layout(ctx, 'NEXT STEP COUNT.', font(s2, 900, DISPLAY), -0.02 * s2);
  [['NEXT', 0, 51.9], ['STEP', 5, 52.25], ['COUNT.', 10, 52.7]].forEach(([w, gi, uw]) => {
    kinetic(ctx, u, { str: w, size: s2, weight: 900, color: C.gold, x: S.x + lay2.glyphs[gi].x, y: y2, u0: uw, style: 'slam', stagger: 0.015 });
  });
  // the pathway recap: four cities on one gold line, Frankfurt glowing
  const nodes = [['Cologne', 'cologne'], ['Dresden', 'dresden'], ['Munich', 'munich'], ['Frankfurt', 'frankfurt']];
  const xs = [170, 413, 667, 910];
  const lp = E.inOutCubic(prog(u, 53.6, 55.8));
  if (lp > 0) {
    ctx.save(); rrect(ctx, 50, ROUTE_Y - 100, W - 100, 250, 40); ctx.fillStyle = `rgba(3,12,32,${0.55 * clamp(lp * 3)})`; ctx.fill(); ctx.restore();
    ctx.save(); ctx.globalAlpha = 0.35; ctx.strokeStyle = '#E0EAFA'; ctx.lineWidth = 8; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(xs[0], ROUTE_Y); ctx.lineTo(xs[3], ROUTE_Y); ctx.stroke(); ctx.restore();
    streak(ctx, xs[0], ROUTE_Y, lerp(xs[0], xs[3], lp), ROUTE_Y, 8, 1);
  }
  nodes.forEach(([label, key], i) => {
    const uk = 54.2 + i * 0.5, k = springU(u, uk, SPRING.bouncy); if (k <= 0) return;
    const x = xs[i], r = 68 * k, im = IMG[key];
    const last = i === 3, glow = last ? 0.5 + 0.5 * Math.sin((u - 56) * Math.PI) : 0;
    ctx.save();
    if (last) { ctx.beginPath(); ctx.arc(x, ROUTE_Y, r + 14 + glow * 10, 0, M.TAU); ctx.fillStyle = `rgba(255,198,26,${0.35 + 0.3 * glow})`; ctx.fill(); }
    ctx.beginPath(); ctx.arc(x, ROUTE_Y, r + 5, 0, M.TAU); ctx.fillStyle = last ? C.gold : C.white; ctx.fill();
    ctx.beginPath(); ctx.arc(x, ROUTE_Y, r, 0, M.TAU); ctx.clip();
    const s = (2 * r) / Math.min(im.width, im.height * 0.5);
    ctx.drawImage(im, x - (im.width * s) / 2, ROUTE_Y - im.height * s * 0.52, im.width * s, im.height * s);
    ctx.restore();
    ctx.save(); ctx.globalAlpha = clamp(k * 1.5); ctx.font = font(30, 700, UI); ctx.fillStyle = last ? C.gold : C.white; ctx.textAlign = 'center';
    ctx.fillText(label, x, ROUTE_Y + 116); ctx.restore();
    if (!last) {   // done: small check badge
      const ck = springU(u, uk + 0.25, SPRING.bouncy); if (ck <= 0) return;
      ctx.save(); ctx.translate(x + 52, ROUTE_Y - 52); ctx.scale(ck, ck);
      ctx.beginPath(); ctx.arc(0, 0, 17, 0, M.TAU); ctx.fillStyle = C.gold; ctx.fill();
      ctx.lineWidth = 5; ctx.lineCap = 'round'; ctx.strokeStyle = C.navy; ctx.beginPath(); ctx.moveTo(-7, 0); ctx.lineTo(-2, 6); ctx.lineTo(8, -5); ctx.stroke(); ctx.restore();
    }
  });
  // start the conversation: a chat bubble with the AGH mark and typing dots
  const bk = springU(u, 56.3, SPRING.bouncy);
  if (bk > 0) {
    const bw = 300, bh = 118, bx = W - S.x - bw, by = y2 + 70;
    ctx.save(); ctx.translate(bx + bw, by + bh); ctx.scale(bk, bk); ctx.translate(-(bx + bw), -(by + bh));
    ctx.shadowColor = 'rgba(0,0,0,0.4)'; ctx.shadowBlur = 30; ctx.shadowOffsetY = 10;
    rrect(ctx, bx, by, bw, bh, 40); ctx.fillStyle = C.white; ctx.fill();
    ctx.beginPath(); ctx.moveTo(bx + bw - 60, by + bh - 2); ctx.lineTo(bx + bw - 8, by + bh + 34); ctx.lineTo(bx + bw - 26, by + bh - 2); ctx.closePath(); ctx.fill();
    ctx.shadowColor = 'transparent';
    // tiny logo mark
    const ms = 0.13, mox = bx + 20 - 258 * ms, moy = by + 18 - 124 * ms;
    ['stripe_dark', 'stripe_light', 'stripe_gold', 'stripe_red', 'building'].forEach((n) => { const L = LOGO[n]; ctx.drawImage(IMG['L_' + n], mox + L[0] * ms, moy + L[1] * ms, L[2] * ms, L[3] * ms); });
    for (let i = 0; i < 3; i++) {
      const jy = Math.max(0, Math.sin((u - 56.3) * Math.PI * 2 - i * 0.9)) * 12;
      ctx.beginPath(); ctx.arc(bx + 160 + i * 38, by + bh / 2 - jy, 12, 0, M.TAU); ctx.fillStyle = i === 1 ? C.gold : C.navy; ctx.fill();
    }
    ctx.restore();
  }
}
// T4: the Frankfurt node opens into the paper end card
function irisT4(ctx, u, t, IMG) {
  sceneFrankfurt(ctx, u, t, IMG);
  const p = E.inOutExpo(prog(u, 61.0, 62.0)), r = lerp(60, Math.hypot(W, H), p);
  ctx.save(); ctx.beginPath(); ctx.arc(910, ROUTE_Y, r + 18, 0, M.TAU); ctx.fillStyle = C.gold; ctx.fill(); ctx.restore();
  ctx.save(); ctx.beginPath(); ctx.arc(910, ROUTE_Y, r, 0, M.TAU); ctx.clip(); sceneEnd(ctx, u, t, IMG); ctx.restore();
}

// ------------------------------------------------------------------ S5 end card   (u 62..72)
const LS = 0.62, LOX = 540 - 628 * LS, LOY = 290 - 124 * LS;
function layer(ctx, IMG, name, { dx = 0, dy = 0, sx = 1, sy = 1, rot = 0, px = 0.5, py = 1, a = 1, src = null } = {}) {
  const L = LOGO[name], im = src || IMG['L_' + name];
  const x = LOX + L[0] * LS, y = LOY + L[1] * LS, w = L[2] * LS, h = L[3] * LS, ax = x + w * px, ay = y + h * py;
  ctx.save(); ctx.globalAlpha *= a; ctx.translate(ax + dx, ay + dy); ctx.rotate(rot); ctx.scale(sx, sy); ctx.drawImage(im, -w * px, -h * py, w, h); ctx.restore();
}
// a ribbon filled with a city photo, colour washing in from the bottom
function photoRibbon(IMG, name, city, colorK) {
  const L = LOGO[name], im = IMG['L_' + name], o = OFF2.getContext('2d');
  OFF2.width = L[2]; OFF2.height = L[3];
  o.globalCompositeOperation = 'source-over'; o.drawImage(im, 0, 0);
  o.globalCompositeOperation = 'source-in';
  const c = IMG[city], s = Math.max(L[2] / c.width, L[3] / c.height) * 1.1;
  o.drawImage(c, (L[2] - c.width * s) / 2, (L[3] - c.height * s) * 0.55, c.width * s, c.height * s);
  if (colorK > 0) { o.globalCompositeOperation = 'source-atop'; o.drawImage(im, 0, L[3] * (1 - colorK), L[2], L[3] * colorK, 0, L[3] * (1 - colorK), L[2], L[3] * colorK); }
  o.globalCompositeOperation = 'source-over';
  return OFF2;
}
function sceneEnd(ctx, u, t, IMG) {
  ctx.fillStyle = C.paper; ctx.fillRect(0, 0, W, H);
  const gl = ctx.createRadialGradient(W / 2, 560, 0, W / 2, 560, 760);
  gl.addColorStop(0, `rgba(255,198,26,${0.16 + 0.03 * Math.sin(u * 0.8)})`); gl.addColorStop(1, 'rgba(255,198,26,0)'); ctx.fillStyle = gl; ctx.fillRect(0, 0, W, H);
  const markBase = LOY + 790 * LS;
  ctx.save(); ctx.beginPath(); ctx.rect(0, 0, W, markBase); ctx.clip();
  [['stripe_dark', 61.5, 'cologne'], ['stripe_light', 61.8, 'dresden'], ['stripe_gold', 62.1, 'munich'], ['stripe_red', 62.4, 'frankfurt']].forEach(([n, uu, city], i) => {
    const k = springU(u, uu, { stiffness: 200, damping: 16 }); if (k <= 0) return;
    const d = (1 - k) * 560, ck = E.inOutCubic(prog(u, 64.2 + i * 0.12, 64.9 + i * 0.12));
    layer(ctx, IMG, n, { dx: -d * 0.34, dy: d, src: ck >= 1 ? null : photoRibbon(IMG, n, city, ck) });
  });
  ctx.restore();
  const kb = springU(u, 64.6, SPRING.bouncy);
  if (kb > 0) { const q = 0.1 * wobble(u - 64.85, 2.2, 5); layer(ctx, IMG, 'building', { sx: kb * (1 + q), sy: kb * (1 - q) }); }
  const pp = prog(u, 64.9, 65.8);
  if (pp > 0) {
    const L = LOGO.plane, ex = LOX + (L[0] + L[2] / 2) * LS, ey = LOY + (L[1] + L[3] / 2) * LS;
    const e = E.outCubic(pp), bx = lerp(-200, ex, e), by = ey + Math.sin(e * Math.PI) * -160 + (1 - e) * 300;
    layer(ctx, IMG, 'plane', { dx: bx - ex, dy: by - ey, rot: (1 - e) * -0.6 + 0.06 * wobble(u - 65.8, 1.8, 4), py: 0.5, sx: lerp(1.6, 1, e), sy: lerp(1.6, 1, e) });
  }
  [['A', 65.35], ['G', 65.55], ['H', 65.75]].forEach(([n, uu]) => {
    const k = springU(u, uu, { stiffness: 340, damping: 15 }); if (k <= 0) return;
    layer(ctx, IMG, n, { sx: k, sy: k, rot: (1 - k) * 0.3 });
  });
  const tp = E.outCubic(prog(u, 65.9, 66.5));
  if (tp > 0) { const L = LOGO.tagline; ctx.save(); ctx.beginPath(); ctx.rect(LOX + L[0] * LS, 0, L[2] * LS * tp, H); ctx.clip(); layer(ctx, IMG, 'tagline', { dx: (1 - tp) * -30 }); ctx.restore(); }
  const tk = E.outCubic(prog(u, 66.1, 66.4));
  if (tk > 0) {
    const bx = LOX + 234 * LS, by = LOY + 1113 * LS, bw = (1032 - 234) * LS, bh = 29 * LS;
    rrect(ctx, bx, by, bw * tk, bh, bh / 2); ctx.fillStyle = '#E0EAFA'; ctx.fill();
    const f = springU(u, 66.2, { stiffness: 120, damping: 12 }) * (416 / 798);
    if (f > 0) { rrect(ctx, bx, by, bw * f, bh, bh / 2); ctx.fillStyle = C.logoGold; ctx.fill(); }
  }
  // CTA
  const cy = 1050, k1 = springU(u, 62.9, SPRING.snappy);
  if (k1 > 0) {
    ctx.save(); ctx.globalAlpha = clamp(k1 * 1.4); ctx.textAlign = 'center';
    ctx.font = font(fit(ctx, 'Message AGH German Pathway.', 800, 60, 900), 800, DISPLAY); ctx.fillStyle = C.ink;
    ctx.fillText('Message AGH German Pathway.', W / 2, cy + (1 - k1) * 40); ctx.restore();
  }
  // split-flap phone number
  const PHONE = '+971 50 441 8859', u0 = 66.7;
  if (u > u0 - 0.2) {
    const cw = 50, chh = 84, gap = 6, total = PHONE.length * (cw + gap) - gap, x0 = W / 2 - total / 2, y0 = cy + 46;
    [...PHONE].forEach((ch, i) => {
      const land = u0 + 0.25 + i * 0.07, appear = springU(u, u0 + i * 0.03, SPRING.snappy); if (appear <= 0) return;
      const x = x0 + i * (cw + gap);
      ctx.save(); ctx.globalAlpha = clamp(appear * 1.5);
      if (ch !== ' ') { rrect(ctx, x, y0, cw, chh, 8); ctx.fillStyle = C.navy; ctx.fill(); }
      let c = ch;
      if (/\d/.test(ch) && u < land) c = String(Math.floor(hash01(i * 17 + Math.floor(u * 20), 3) * 10));
      if (ch !== ' ') {
        const flip = u < land ? Math.abs(Math.cos(((u * 20) % 1) * Math.PI)) : 1;
        ctx.save(); ctx.translate(x + cw / 2, y0 + chh / 2); ctx.scale(1, Math.max(0.15, flip));
        ctx.font = font(56, 800, DISPLAY); ctx.fillStyle = C.gold; ctx.textAlign = 'center'; ctx.fillText(c, 0, 20); ctx.restore();
        ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fillRect(x, y0 + chh / 2 - 1, cw, 2);
      }
      ctx.restore();
    });
  }
  const k3 = springU(u, 68.1, SPRING.gentle);
  if (k3 > 0) {
    ctx.save(); ctx.globalAlpha = clamp(k3 * 1.4); ctx.textAlign = 'center'; ctx.font = font(46, 600, UI); ctx.fillStyle = 'rgba(2,18,43,0.8)';
    ctx.fillText('aghgermanpathway.com', W / 2, cy + 236 + (1 - k3) * 30); ctx.restore();
  }
}

// ------------------------------------------------------------------ film
M.film({
  samples: 10,
  fonts: [font(100, 900, DISPLAY), font(100, 800, DISPLAY), font(40, 600, UI), font(40, 700, UI)],
  images: {
    cologne: 'assets/plates/cologne.png', dresden: 'assets/plates/dresden.png', munich: 'assets/plates/munich.png', frankfurt: 'assets/plates/frankfurt.png',
    ...Object.fromEntries(['stripe_dark', 'stripe_light', 'stripe_gold', 'stripe_red', 'building', 'plane', 'A', 'G', 'H', 'tagline'].map((n) => ['L_' + n, `assets/logo/${n}.png`])),
  },
  hits: HITS,
  init() {
    OFF = document.createElement('canvas'); OFF.width = W; OFF.height = H;
    OFF2 = document.createElement('canvas');
    GRAIN = [0, 1, 2, 3].map((s) => {
      const c = document.createElement('canvas'); c.width = 360; c.height = 640;
      const g = c.getContext('2d'), id = g.createImageData(c.width, c.height), r = mulberry32(100 + s);
      for (let i = 0; i < id.data.length; i += 4) { const v = 128 + (r() - 0.5) * 120; id.data[i] = id.data[i + 1] = id.data[i + 2] = v; id.data[i + 3] = 255; }
      g.putImageData(id, 0, 0); return c;
    });
  },
  draw(ctx, u, t, IMG) {
    if (u < 4) { sceneHook(ctx, u, t, IMG); if (u > 3.6) { ctx.save(); ctx.globalAlpha = prog(u, 3.6, 4); sceneCologne(ctx, u, t, IMG, { noText: true }); ctx.restore(); } }
    else if (u < 16.8) sceneCologne(ctx, u, t, IMG);
    else if (u < 18.15) sliceT1(ctx, u, t, IMG);
    else if (u < 32.7) sceneDresden(ctx, u, t, IMG);
    else if (u < 34.0) irisT2(ctx, u, t, IMG);
    else if (u < 50) sceneMunich(ctx, u, t, IMG);
    else if (u < 61.0) { if (u < 50) sceneMunich(ctx, u, t, IMG); else sceneFrankfurt(ctx, u, t, IMG); }
    else if (u < 62.0) irisT4(ctx, u, t, IMG);
    else sceneEnd(ctx, u, t, IMG);
    // Munich -> Frankfurt spin whip: both spin, crossfade on the beat
    if (u >= 49.4 && u < 50) { ctx.save(); ctx.globalAlpha = E.inCubic(prog(u, 49.4, 50)); sceneFrankfurt(ctx, u, t, IMG); ctx.restore(); }
    const gk = u < 61.8 ? 0.06 : 0.025;
    ctx.save(); ctx.globalCompositeOperation = 'overlay'; ctx.globalAlpha = gk; ctx.drawImage(GRAIN[Math.floor(t * 24) % 4], 0, 0, W, H); ctx.restore();
    captions(ctx, u, t);
  },
});
