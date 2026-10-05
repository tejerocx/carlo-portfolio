/* Procedural soundtrack for the Anaya's Way showreel — 120 BPM, D major.
 * Warm piano theme (I–V–vi–IV) that builds into a driving beat, with plucks,
 * pads, shimmer and impacts placed on the visual timeline in showreel.js.
 * Writes out/soundtrack.wav (shared by the 16:9 and 9:16 renders).
 *   node audio.cjs
 */
const fs = require('fs');
const path = require('path');

const SR = 48000, DUR = 32, N = SR * DUR;
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
/** Felt piano: inharmonic partials, hammer noise, per-partial decay. */
function piano(t, m, amp = .18, dur = 2.5, pan = 0) {
  const f = hz(m), i0 = S(t), n = S(dur + .4), hf = svf();
  const parts = [1, 2, 3, 4, 5, 6].map((k, j) => ({ f: f * k * Math.sqrt(1 + .0004 * k * k), a: [1, .45, .22, .12, .06, .03][j], d: (1.6 - j * .2) * (f < 200 ? 1.4 : 1) }));
  for (let i = 0; i < n; i++) {
    const s = i / SR; let v = 0;
    for (const p of parts) v += Math.sin(TAU * p.f * s) * p.a * Math.exp(-s / p.d);
    if (s < .01) v += hf(noise(), 2500).bp * (1 - s / .01) * .6;
    const rel = s > dur ? Math.max(0, 1 - (s - dur) / .4) : 1;
    put(mus, i0 + i, v * amp * Math.min(1, s * 600) * rel, pan, .45);
  }
}
/** Karplus-Strong plucked string. */
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

// ------------------------------------------------------------ harmony (D major: I–V–vi–IV)
const CH = { D: [50, 54, 57, 62], A: [49, 52, 57, 61], Bm: [50, 54, 59, 62], G: [50, 55, 59, 62], Dadd: [50, 54, 57, 62, 64, 69] };
const ROOT = { D: 38, A: 33, Bm: 35, G: 31, Dadd: 38 };
const PROG = ['D', 'A', 'Bm', 'G'];
const chordAt = t => PROG[Math.floor(Math.max(0, t) / 2) % 4];
const beat = (t0, bars, amp = 1, half = false) => {
  for (let b = 0; b < bars * 4; b++) {
    const t = t0 + b * .5;
    if (!half || b % 2 === 0) kick(t, .8 * amp);
    if (b % 2 === 1) clap(t, (half ? .25 : .38) * amp);
    for (let k = 0; k < 4; k++) shaker(t + k * .125, (k % 2 ? .05 : .03) * amp, k % 2 ? .4 : -.4);
    tek(t + .25, .07 * amp, .2);
  }
};
const bassLine = (t0, n, amp = .24) => { for (let e = 0; e < n; e++) { const t = t0 + e * .25; bass(t, ROOT[chordAt(t)] + (e % 4 === 2 ? 12 : 0), .2, amp); } };
const arp = (t0, n, amp = .12, oct = 12) => { for (let e = 0; e < n; e++) { const t = t0 + e * .25, ch = CH[chordAt(t)]; oud(t, ch[e % ch.length] + oct, amp, Math.sin(e * 1.7) * .5, .995, .8); } };
const pads = (t0, t1, amp = .04, cut = 1300) => { for (let t = Math.floor(t0 / 2) * 2; t < t1; t += 2) pad(Math.max(t, t0), Math.min(t + 2, t1), CH[chordAt(t)], amp, cut, .3, .3); };

// ------------------------------------------------------------ arrangement
// 0–4 precision: piano + pulses, a slam per line
pads(0, 3.95, .035, 700);
[[0, 62], [.5, 69], [1.0, 66], [1.5, 69], [2.0, 64], [2.5, 69], [3.0, 66], [3.5, 62]].forEach(([t, m]) => piano(t, m + 12, .07, 1.2, .2));
[0, 2].forEach(t => piano(t, ROOT[chordAt(t)] + 12, .14, 2));
[.5, 1.5].forEach(t => { kick(t, .7, .35, 130, 40); tick(t, .1); });
boom(2.5, .7); stab(2.5, CH.Bm.map(m => m + 12), .07);
for (let i = 0; i < 16; i++) tick(.3 + i * .06, .025, -.5 + i * .06);       // label decode
whoosh(3.15, .6, .25, 1500, 5000, -.6, .6, 'swell', 2.5);                   // highlight sweep
whoosh(3.3, .65, .45, 300, 6000, 0, 0, 'rise', 2);
whoosh(3.9, .85, .7, 200, 3000, -.8, .8, 'swell', 1.2);                     // brush wipe
// 4.7–8.55 mission: open piano, word accents
kick(4.75, .5, .5, 110, 36); crash(4.75, .1);
pads(4.75, 8.6, .045, 1100);
[[4.75, 'D'], [5.75, 'A'], [6.75, 'Bm'], [7.75, 'G']].forEach(([t, c]) => { CH[c].forEach((m, k) => piano(t + k * .03, m + 12, .09, 1.6, -.3 + k * .2)); piano(t, ROOT[c] + 12, .14, 1.8); });
[[4.95, 74], [5.65, 78], [6.3, 81], [6.85, 86]].forEach(([t, m]) => { bell(t, hz(m), .09, .2, 1.2); thud(t, .25, 90); });
whoosh(5.1, .5, .2, 800, 3000, -.5, .5, 'swell', 2.5); whoosh(5.75, .4, .18, 1200, 4000, -.6, .2, 'swell', 3);
whoosh(7.9, .65, .4, 300, 5000, 0, 0, 'rise', 2);
whoosh(8.5, .7, .8, 400, 6000, .9, -.9, 'swell', 1.4);                     // whip pan
// 9.2–15 services: the beat drops in
boom(9.2, .6);
beat(9.2, 3, 1); bassLine(9.2, 23); arp(9.2, 23, .1); pads(9.2, 15, .035, 1500);
for (let k = 0; k < 8; k++) { const t = 9.45 + k * .42; tick(t, .14, 0); bell(t, hz(74 + [0, 2, 4, 7, 9, 12, 14, 16][k]), .05, 0, .3, 2); }
whoosh(12.7, .45, .4, 400, 4000, 0, 0, 'rise', 2);
[13.05, 13.19, 13.33].forEach((t, i) => { whoosh(t - .1, .5, .3, 700, 3000, -.6 + i * .6, -.4 + i * .6, 'swell', 2); thud(t + .25, .25, 120 + i * 20); });
[13.95, 14.2, 14.45].forEach((t, i) => bell(t, hz([78, 81, 86][i]), .05, -.5 + i * .5, .6));
whoosh(14.85, .8, .55, 250, 4000, 0, 0, 'rise', 1.6);                        // iris to the map
// 15.6–20.5 nationwide: arcs cascade like a harp
boom(15.6, .55);
pads(15.6, 20.6, .045, 1500);
[16, 17, 18, 19, 20].forEach(t => kick(t, .5)); [16.5, 17.5, 18.5, 19.5].forEach(t => clap(t, .22));
for (let i = 0; i < 40; i++) shaker(15.6 + i * .125, i % 2 ? .03 : .05, Math.sin(i) * .5);
for (let i = 0; i < 19; i++) { const t = 16.5 + i * .085, ch = CH[chordAt(t)]; oud(t, ch[i % 4] + 12 + (i > 9 ? 12 : 0), .12, -.8 + i * .09, .995, 1); }
bell(16.1, hz(74), .1, 0, 1.4); thud(16.1, .3, 100);
[[18.3, 'Bm'], [19.3, 'G']].forEach(([t, c]) => CH[c].forEach((m, k) => piano(t + k * .04, m + 12, .07, 1.4)));
bassLine(16, 18, .18);
whoosh(20.15, 1.0, .65, 200, 6000, 0, 0, 'rise', 1.6);
// 21.15–26 values: four steps, the beat returns
boom(21.15, .65);
beat(21.15, 2.4, .9); bassLine(21.15, 19); arp(21.15, 19, .08, 24); pads(21.15, 26, .04, 1400);
[21.15, 22.35, 23.55, 24.75].forEach((t, i) => { bell(t, hz([74, 78, 81, 86][i]), .1, -.3 + i * .2, 1.0); thud(t, .3, 110); whoosh(t - .15, .4, .2, 900, 3500, .3, -.3, 'swell', 2.5); });
whoosh(25.6, .45, .3, 400, 4000, 0, 0, 'rise', 2);
whoosh(25.9, .85, .55, 300, 3500, -.4, .4, 'swell', 1.3);                   // iris to identity
// 26.15–32 identity + call to action
shimmer(26.15, .6, .035);
pads(26.15, 27.55, .04, 900);
piano(26.2, 62, .12, 1.4); piano(26.7, 66, .1, 1.2); piano(27.0, 69, .1, 1);
whoosh(26.7, .55, .25, 300, 2000, 0, 0, 'swell', 1.8);                      // statue rises
bell(27.25, hz(86), .08, -.3, 1.2); whoosh(27.15, .35, .2, 2000, 6000, -.3, -.3, 'swell', 3); // torch ignites
boom(27.55, 1.0); stab(27.55, CH.Dadd.map(m => m + 12), .1);
CH.Dadd.forEach((m, k) => piano(27.55 + k * .025, m, .12, 3.5, -.4 + k * .16)); piano(27.55, 26, .18, 3.5);
for (let i = 0; i < 11; i++) tick(27.65 + i * .055, .03, -.5 + i * .1);
whoosh(27.85, .6, .3, 1200, 4500, -.7, .7, 'swell', 2.5);                   // underline swoosh
whoosh(28.4, .7, .3, 300, 2500, 0, 0, 'swell', 1.6);
pads(28.6, 32, .04, 1500); bassLine(28.6, 8, .15); beat(28.6, .5, .5, true);
[28.75, 28.89].forEach(t => thud(t, .18, 160));
tick(29.65, .4); thud(29.65, .3, 220); bell(29.68, hz(81), .1, .2, 1.2);    // the click
[[30.0, 'D'], [31.0, 'G']].forEach(([t, c]) => CH[c].forEach((m, k) => piano(t + k * .035, m + 12, .09, 1.6, -.3 + k * .2)));
piano(30.0, 38, .16, 2.4); piano(31.0, 31, .16, 1.4);
bell(30.2, hz(86), .06, .3, 1.6); bell(31.0, hz(90), .05, -.3, 1.6);
for (let i = 0; i < 24; i++) tick(30.2 + i * .02, .015, .2);

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
