/* Procedural soundtrack for the AVC showreel — 120 BPM, D Hijaz.
 * Synthesized oud (Karplus-Strong), darbuka doum/tek, pads, shimmer and impacts,
 * all placed on the visual timeline in showreel.js. Writes out/soundtrack.wav.
 *   node audio.cjs
 */
const fs = require('fs');
const path = require('path');

const SR = 48000, DUR = 24, N = SR * DUR;
const dry = [new Float32Array(N), new Float32Array(N)];
const mus = [new Float32Array(N), new Float32Array(N)];   // side-chained
const send = [new Float32Array(N), new Float32Array(N)];
const TAU = Math.PI * 2;
let seed = 98765;
const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
const noise = () => rnd() * 2 - 1;
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const S = t => Math.round(t * SR);
const panG = p => [Math.cos((p + 1) * Math.PI / 4), Math.sin((p + 1) * Math.PI / 4)];
const hz = m => 440 * Math.pow(2, (m - 69) / 12);

function svf() {
  let ic1 = 0, ic2 = 0;
  return (x, fc, q = .7) => {
    const g = Math.tan(Math.PI * clamp(fc, 20, SR * .45) / SR), k = 1 / q;
    const a1 = 1 / (1 + g * (g + k)), a2 = g * a1, a3 = g * a2;
    const v3 = x - ic2, v1 = a1 * ic1 + a2 * v3, v2 = ic2 + a2 * ic1 + a3 * v3;
    ic1 = 2 * v1 - ic1; ic2 = 2 * v2 - ic2;
    return { lp: v2, bp: v1, hp: x - k * v1 - v2 };
  };
}
function put(bus, i, v, pan = 0, s = 0) {
  if (i < 0 || i >= N) return;
  const [l, r] = panG(pan);
  bus[0][i] += v * l; bus[1][i] += v * r;
  if (s) { send[0][i] += v * l * s; send[1][i] += v * r * s; }
}
const saw = ph => 2 * (ph - Math.floor(ph + .5));

// ------------------------------------------------------------ instruments
const kicks = [];
function kick(t, amp = 1, decay = .2, f0 = 160, f1 = 46) {
  kicks.push([t, amp]);
  const i0 = S(t), n = S(decay * 3); let ph = 0;
  for (let i = 0; i < n; i++) {
    const s = i / SR; ph += TAU * (f1 + (f0 - f1) * Math.exp(-s * 28)) / SR;
    let v = Math.sin(ph) * Math.exp(-s / decay);
    if (s < .004) v += noise() * .4 * (1 - s / .004);
    put(dry, i0 + i, Math.tanh(v * 1.5) * amp * .85);
  }
}
function crash(t, amp = .3, decay = .7) {
  const i0 = S(t), n = S(decay * 3.5), fl = svf(), fr = svf();
  for (let i = 0; i < n && i0 + i < N; i++) { const e = Math.exp(-i / SR / decay) * amp; dry[0][i0 + i] += fl(noise(), 6000).hp * e; dry[1][i0 + i] += fr(noise(), 6000).hp * e; }
}
function boom(t, amp = 1) {
  kick(t, amp * .9, 1.0, 110, 30);
  crash(t, amp * .3);
  const i0 = S(t), n = S(2.5), f = svf();
  for (let i = 0; i < n; i++) { const s = i / SR; put(dry, i0 + i, f(noise(), 250 + 2200 * Math.exp(-s * 6)).lp * Math.exp(-s * 2.2) * amp * .45, 0, .6); }
}
function doum(t, amp = .6) {
  const i0 = S(t), n = S(.5); let ph = 0;
  for (let i = 0; i < n; i++) { const s = i / SR; ph += TAU * (70 + 50 * Math.exp(-s * 30)) / SR; put(dry, i0 + i, Math.sin(ph) * Math.exp(-s / .16) * amp, 0, .1); }
}
function tek(t, amp = .25, pan = 0) {
  const i0 = S(t), n = S(.08), f = svf();
  for (let i = 0; i < n; i++) { const s = i / SR; put(dry, i0 + i, (f(noise(), 3200, 2).bp * 2 + Math.sin(TAU * 900 * s) * .4) * Math.exp(-s / .018) * amp, pan, .12); }
}
function shaker(t, amp = .06, pan = 0) {
  const i0 = S(t), n = S(.06), f = svf();
  for (let i = 0; i < n; i++) { const x = i / n; put(dry, i0 + i, f(noise(), 9000, 1).hp * Math.sin(Math.PI * x) * amp, pan); }
}
function clap(t, amp = .4) {
  const i0 = S(t), n = S(.5), f = svf();
  for (let i = 0; i < n; i++) {
    const s = i / SR; let e = Math.exp(-s / .13);
    for (const o of [0, .011, .022]) if (s >= o && s < o + .009) e = Math.max(e, 1 - (s - o) / .009);
    put(dry, i0 + i, f(noise(), 1400, 1.4).bp * e * amp * 2, 0, .4);
  }
}
/** Karplus-Strong plucked string — reads as an oud. */
function oud(t, m, amp = .3, pan = 0, decay = .9965, len = 1.6) {
  const f = hz(m), d = Math.max(2, Math.round(SR / f)), buf = new Float32Array(d);
  const lp = svf();
  for (let k = 0; k < d; k++) buf[k] = lp(noise(), 3500).lp;
  const i0 = S(t), n = S(len); let idx = 0, prev = 0;
  for (let i = 0; i < n; i++) {
    const cur = buf[idx], nxt = buf[(idx + 1) % d];
    const v = (cur + nxt) * .5 * decay;
    buf[idx] = v; idx = (idx + 1) % d;
    const o = cur - prev * .2; prev = cur;
    put(mus, i0 + i, o * amp * (i < n - 2400 ? 1 : (n - i) / 2400), pan, .3);
  }
}
function whoosh(t, dur, amp, f0, f1, p0 = 0, p1 = 0, shape = 'swell', q = 1.6) {
  const i0 = S(t), n = S(dur), f = svf();
  for (let i = 0; i < n; i++) {
    const x = i / n;
    const e = shape === 'rise' ? Math.pow(x, 2.2) * (x > .97 ? (1 - x) / .03 : 1) : Math.pow(Math.sin(Math.PI * x), 1.6);
    put(dry, i0 + i, f(noise(), f0 * Math.pow(f1 / f0, shape === 'rise' ? x * x : x), q).bp * e * amp * 2, p0 + (p1 - p0) * x, .3);
  }
}
function bell(t, freq, amp = .15, pan = 0, decay = 1.2, ratio = 3.5) {
  const i0 = S(t), n = S(decay * 4);
  for (let i = 0; i < n; i++) {
    const s = i / SR, idx = 2 * Math.exp(-s * 9);
    put(dry, i0 + i, Math.sin(TAU * freq * s + idx * Math.sin(TAU * freq * ratio * s)) * Math.exp(-s / decay) * Math.min(1, s * 800) * amp, pan, .6);
  }
}
function shimmer(t, dur, amp = .05) {
  for (let k = 0; k < 14; k++) bell(t + k * dur / 14, hz([74, 78, 81, 86, 90, 93, 98][k % 7] + (k > 6 ? 12 : 0)), amp, -.8 + k * .12, .7, 2);
}
function tick(t, amp = .06, pan = 0) {
  const i0 = S(t), n = S(.012), f = svf();
  for (let i = 0; i < n; i++) put(dry, i0 + i, f(noise(), 5000, 3).bp * (1 - i / n) * amp * 3, pan, .15);
}
function thud(t, amp = .5, freq = 120) {
  const i0 = S(t), n = S(.4), f = svf();
  for (let i = 0; i < n; i++) { const s = i / SR; put(dry, i0 + i, (Math.sin(TAU * freq * s * (1 + Math.exp(-s * 40))) * .8 + f(noise(), 800).lp * .5) * Math.exp(-s / .08) * amp, 0, .3); }
}
function bass(t, m, dur, amp = .28) {
  const i0 = S(t), n = S(dur + .05), f = svf(), fq = hz(m); let ph = 0;
  for (let i = 0; i < n; i++) {
    const s = i / SR; ph += fq / SR;
    const env = Math.min(1, s * 300) * Math.exp(-s / (dur * .9)) * (s > dur ? Math.max(0, 1 - (s - dur) / .05) : 1);
    put(mus, i0 + i, f(saw(ph) + Math.sin(TAU * fq * .5 * s), 160 + 1200 * Math.exp(-s * 16), 1.1).lp * env * amp);
  }
}
function pad(t0, t1, ms, amp = .05, cutoff = 1400, att = .4, rel = .8) {
  const i0 = S(t0), n = S(t1 - t0 + rel), fl = svf(), fr = svf();
  const vs = ms.flatMap(m => [-8, 0, 8].map(c => ({ f: hz(m) * Math.pow(2, c / 1200), ph: rnd() })));
  for (let i = 0; i < n && i0 + i < N; i++) {
    const s = i / SR, dur = t1 - t0;
    const env = Math.min(1, s / att) * (s > dur ? Math.max(0, 1 - (s - dur) / rel) : 1);
    let l = 0, r = 0; vs.forEach((v, k) => { v.ph += v.f / SR; if (k % 2) l += saw(v.ph); else r += saw(v.ph); });
    const fc = cutoff * (1 + .2 * Math.sin(TAU * .25 * (t0 + s)));
    mus[0][i0 + i] += fl(l, fc, .8).lp * env * amp; mus[1][i0 + i] += fr(r, fc, .8).lp * env * amp;
  }
}
function stab(t, ms, amp = .14) {
  const i0 = S(t), n = S(1.8), f = svf(), ph = ms.map(() => rnd());
  for (let i = 0; i < n; i++) {
    const s = i / SR; let x = 0;
    ms.forEach((m, k) => { ph[k] += hz(m) / SR; x += saw(ph[k]) + saw(ph[k] * 1.004); });
    put(dry, i0 + i, f(x, 300 + 5000 * Math.exp(-s * 5), .9).lp * Math.exp(-s / .55) * amp, 0, .7);
  }
}

// ------------------------------------------------------------ harmony (D Hijaz)
const CH = { D: [50, 54, 57, 62], Gm: [55, 58, 62, 67], Eb: [51, 55, 58, 63], Dadd: [50, 54, 57, 64, 69] };
const RIFF = [[0, 62], [.25, 63], [.5, 66], [.75, 67], [1.0, 69], [1.25, 67], [1.375, 66], [1.5, 63], [1.75, 62]];
const riff = (t0, oct = 0, amp = .28) => RIFF.forEach(([d, m], i) => oud(t0 + d, m + oct, amp, Math.sin(i) * .3));
const groove = (t0, bars, amp = 1) => {
  for (let b = 0; b < bars * 4; b++) {
    const t = t0 + b * .5;
    if (b % 4 === 0 || b % 4 === 2) { doum(t, .55 * amp); kick(t, .55 * amp); } else tek(t, .22 * amp, -.2);
    tek(t + .25, .14 * amp, .3); if (b % 2) tek(t + .375, .08 * amp, .4);
    shaker(t + .125, .05 * amp, -.4); shaker(t + .375, .05 * amp, .4);
  }
};

// ------------------------------------------------------------ arrangement
// 0–2.85 prologue
pad(0, 2.25, [38, 45, 50], .07, 500, 1.2, .5);
whoosh(0, 1.1, .45, 600, 5000, -.9, .9);                               // light streak
[[.05, 62], [.32, 69], [.6, 70], [.85, 69], [1.27, 66], [1.5, 67], [1.75, 66], [1.95, 63]].forEach(([t, m]) => oud(t, m, .3, 0, .997, 2));
[.32, 1.27].forEach(t => { kick(t, .6, .4, 120, 40); tick(t, .08); });
whoosh(1.3, .9, .5, 300, 7000, 0, 0, 'rise', 2.4);
boom(2.2, 1); stab(2.2, CH.D.map(m => m + 12), .12); oud(2.2, 50, .4, 0, .998, 2.5); shimmer(2.25, .6, .035);
whoosh(2.8, .95, .6, 250, 4000, -.5, .5, 'swell', 1.3);                // silk wave
// 3.5–7.1 Dubai skyline groove
groove(3.5, 2); riff(3.5); riff(5.5, 12, .22);
for (let e = 0; e < 14; e++) bass(3.5 + e * .25, e % 4 === 2 ? 50 : 38, .2);
pad(3.5, 5.5, CH.D, .04, 1300); pad(5.5, 7.2, CH.Gm, .04, 1300);
for (let k = 0; k < 12; k++) bell(3.65 + k * .17, hz([62, 66, 69, 74, 78, 81][k % 6] + (k > 5 ? 12 : 0)), .035, -.6 + k * .1, .5);
shimmer(6.0, .5, .045); kick(6.1, .5, .5, 110, 36);
// 7.1 iris → globe
whoosh(6.95, .9, .65, 200, 3500, 0, 0, 'rise', 1.6);
crash(7.8, .18);
pad(7.6, 9.5, CH.Gm, .055, 1800, .3); pad(9.5, 11.3, CH.Eb, .055, 1800, .3);
[8.0, 9.0, 10.0].forEach(t => { kick(t, .5); doum(t, .35); }); [8.5, 9.5].forEach(t => clap(t, .25));
for (let i = 0; i < 26; i++) shaker(7.9 + i * .125, i % 2 ? .04 : .07, Math.sin(i) * .6);
for (let i = 0; i < 12; i++) bell(7.9 + i * .15, hz([62, 63, 66, 69, 70, 74][i % 6] + 12), .06, -.7 + i * .12, .8);
[[8.0, 62], [8.75, 69], [9.25, 70], [9.5, 69], [10.0, 66], [10.5, 63]].forEach(([t, m]) => oud(t, m, .22, .2, .997, 1.8));
for (let e = 0; e < 7; e++) bass(7.85 + e * .5, e < 4 ? 43 : 39, .4, .2);
// zoom + slit
whoosh(10.6, 1.05, .75, 150, 8000, 0, 0, 'rise', 1.4);
boom(11.65, .55);
// 11.6–16.2 process
whoosh(11.55, .8, .45, 400, 2500, .6, 0, 'swell', 1.4);                 // passport enters
thud(12.4, .3, 140); whoosh(12.45, .6, .35, 900, 3000, .2, -.4, 'swell', 2.5); // cover opens
groove(11.75, 2, .9); riff(11.75, 0, .25); riff(13.75, 12, .2);
for (let e = 0; e < 13; e++) bass(11.75 + e * .25, e % 4 === 2 ? 50 : 38, .2);
pad(11.75, 13.75, CH.D, .04, 1300); pad(13.75, 15.0, CH.Eb, .04, 1300);
[[13.35, 74], [13.85, 78], [14.35, 81]].forEach(([t, m]) => { bell(t, hz(m), .12, .3); tick(t, .12); });
for (let i = 0; i < 8; i++) clap(14.45 + i * (.065 - i * .003), .05 + i * .02);
whoosh(14.3, .7, .5, 300, 6000, 0, 0, 'rise', 2);
boom(15.0, 1.15); thud(15.0, .8, 90); bell(15.0, hz(86), .12, 0, 1.6); stab(15.0, CH.D.map(m => m + 12), .1);
pad(15.0, 16.3, CH.Dadd, .05, 1600, .05, .3);
thud(16.15, .35, 110); whoosh(15.7, .55, .3, 900, 3000, -.4, .2, 'swell', 2.5); // cover closes
whoosh(15.95, 1.0, .7, 200, 7000, 0, 0, 'rise', 1.6);                  // zoom into emblem
// 16.3–21 emblem build
crash(16.95, .15); shimmer(16.35, .65, .04);
pad(16.95, 18.55, CH.Gm, .045, 1200, .2, .1);
for (let k = 0; k < 9; k++) oud(17.1 + k * .11, [62, 63, 66, 67, 69, 70, 72, 74, 78][k], .2, -.5 + k * .12, .996, 1);
shimmer(18.0, .4, .04);
whoosh(17.8, .75, .55, 300, 7000, 0, 0, 'rise', 2);
boom(18.55, 1.2); stab(18.55, CH.Dadd.map(m => m + 12), .14); oud(18.55, 50, .45, 0, .998, 3); oud(18.56, 62, .3, .2, .998, 3);
for (let i = 0; i < 9; i++) tick(18.9 + i * .07, .04, (i - 4) / 5);
for (let i = 0; i < 23; i++) tick(19.05 + i * .028, .025, -.6 + i * .05);
pad(18.55, 21.8, CH.Dadd, .055, 1700, .05, .4);
groove(19.0, 1, .55);
for (let e = 0; e < 8; e++) bass(19.0 + e * .25, e % 4 === 2 ? 50 : 38, .2, .2);
shimmer(20.0, .7, .04);
// 21 end card
whoosh(20.9, .9, .5, 300, 4000, .4, -.4, 'swell', 1.4);
kick(21.75, .5, .5, 110, 36); crash(21.75, .12);
[[21.75, 74], [22.0, 72], [22.25, 70], [22.5, 69], [22.75, 66], [23.0, 67], [23.25, 62]].forEach(([t, m]) => oud(t, m, .27, .1, .997, 2));
pad(21.75, 24, CH.Dadd, .06, 2000, .05, .1); bass(21.75, 38, 2.2, .26);
bell(21.8, hz(86), .07, -.3, 1.6); bell(23.25, hz(74), .06, .3, 1.6);
for (let i = 0; i < 26; i++) tick(22.1 + i * .03, .02, .3);

// ------------------------------------------------------------ mix
const duck = new Float32Array(N).fill(1);
for (const [t, a] of kicks) { const i0 = S(t), n = S(.3); for (let i = 0; i < n && i0 + i < N; i++) duck[i0 + i] = Math.min(duck[i0 + i], 1 - .45 * Math.min(1, a) * Math.exp(-i / SR / .09)); }
for (let c = 0; c < 2; c++) for (let i = 0; i < N; i++) { mus[c][i] *= duck[i]; send[c][i] += mus[c][i] * .2; }
function reverb(inp, off) {
  const sc = SR / 44100, o = new Float32Array(N);
  const combs = [1116, 1188, 1277, 1356, 1422, 1491, 1557, 1617].map(d => ({ b: new Float32Array(Math.round((d + off) * sc)), i: 0, s: 0 }));
  const aps = [556, 441, 341, 225].map(d => ({ b: new Float32Array(Math.round((d + off) * sc)), i: 0 }));
  for (let n = 0; n < N; n++) {
    const x = inp[n] * .015; let y = 0;
    for (const c of combs) { const v = c.b[c.i]; c.s = v * .75 + c.s * .25; c.b[c.i] = x + c.s * .87; c.i = (c.i + 1) % c.b.length; y += v; }
    for (const a of aps) { const v = a.b[a.i], w = -y + v; a.b[a.i] = y + v * .5; a.i = (a.i + 1) % a.b.length; y = w; }
    o[n] = y;
  }
  return o;
}
const rv = [reverb(send[0], 0), reverb(send[1], 23)];
const L = new Float32Array(N), R = new Float32Array(N);
let peak = 0;
for (let i = 0; i < N; i++) {
  const s = i / SR, fade = Math.min(1, s / .01) * (s > DUR - .6 ? Math.max(0, (DUR - s) / .6) : 1);
  L[i] = Math.tanh((dry[0][i] + mus[0][i] * 1.3 + rv[0][i] * 4) * .75) * fade;
  R[i] = Math.tanh((dry[1][i] + mus[1][i] * 1.3 + rv[1][i] * 4) * .75) * fade;
  peak = Math.max(peak, Math.abs(L[i]), Math.abs(R[i]));
}
const g = (+process.argv[2] || .84) / peak;
const buf = Buffer.alloc(44 + N * 4);
buf.write('RIFF', 0); buf.writeUInt32LE(36 + N * 4, 4); buf.write('WAVEfmt ', 8);
buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(2, 22); buf.writeUInt32LE(SR, 24);
buf.writeUInt32LE(SR * 4, 28); buf.writeUInt16LE(4, 32); buf.writeUInt16LE(16, 34); buf.write('data', 36); buf.writeUInt32LE(N * 4, 40);
for (let i = 0; i < N; i++) { buf.writeInt16LE(Math.round(clamp(L[i] * g, -1, 1) * 32767), 44 + i * 4); buf.writeInt16LE(Math.round(clamp(R[i] * g, -1, 1) * 32767), 46 + i * 4); }
const outDir = path.join(__dirname, 'out'); fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, 'soundtrack.wav'), buf);
console.log('wrote out/soundtrack.wav  peak', peak.toFixed(3));
