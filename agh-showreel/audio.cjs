/* Procedural soundtrack for the AGH showreel — 120 BPM, D minor, synced to the
 * visual timeline in showreel.js. Writes out/soundtrack.wav (48 kHz stereo).
 *   node audio.cjs
 */
const fs = require('fs');
const path = require('path');

const SR = 48000, DUR = 20, N = SR * DUR;
const dry = [new Float32Array(N), new Float32Array(N)];   // drums / fx
const mus = [new Float32Array(N), new Float32Array(N)];   // pads / bass (side-chained)
const send = [new Float32Array(N), new Float32Array(N)];  // reverb send
const TAU = Math.PI * 2;

let seed = 1234567;
const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
const noise = () => rnd() * 2 - 1;
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const S = t => Math.round(t * SR);
const panG = p => [Math.cos((p + 1) * Math.PI / 4), Math.sin((p + 1) * Math.PI / 4)];

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
function put(bus, i, v, pan = 0, sendAmt = 0) {
  if (i < 0 || i >= N) return;
  const [l, r] = panG(pan);
  bus[0][i] += v * l; bus[1][i] += v * r;
  if (sendAmt) { send[0][i] += v * l * sendAmt; send[1][i] += v * r * sendAmt; }
}

// ------------------------------------------------------------ instruments
const kicks = [];
function kick(t, amp = 1, decay = .2, f0 = 170, f1 = 48) {
  kicks.push([t, amp]);
  const i0 = S(t), n = S(decay * 3); let ph = 0;
  for (let i = 0; i < n; i++) {
    const s = i / SR, f = f1 + (f0 - f1) * Math.exp(-s * 28);
    ph += TAU * f / SR;
    let v = Math.sin(ph) * Math.exp(-s / decay);
    if (s < .004) v += noise() * .5 * (1 - s / .004);
    put(dry, i0 + i, Math.tanh(v * 1.6) * amp * .9);
  }
}
function boom(t, amp = 1) {
  kick(t, amp * .9, 1.1, 120, 32);
  crash(t, amp * .35);
  const i0 = S(t), n = S(2.5), f = svf();
  for (let i = 0; i < n; i++) { const s = i / SR; put(dry, i0 + i, f(noise(), 300 + 2500 * Math.exp(-s * 6)).lp * Math.exp(-s * 2.2) * amp * .5, 0, .6); }
}
function hat(t, amp = .25, open = false, pan = 0) {
  const i0 = S(t), d = open ? .18 : .035, n = S(d * 5), f = svf();
  for (let i = 0; i < n; i++) put(dry, i0 + i, f(noise(), 8000, 1.2).hp * Math.exp(-i / SR / d) * amp, pan, .05);
}
function clap(t, amp = .5) {
  const i0 = S(t), n = S(.6), f = svf();
  for (let i = 0; i < n; i++) {
    const s = i / SR;
    let e = Math.exp(-s / .14);
    for (const o of [0, .011, .022]) if (s >= o && s < o + .009) e = Math.max(e, 1 - (s - o) / .009);
    put(dry, i0 + i, f(noise(), 1500, 1.4).bp * e * amp * 2.2, 0, .35);
  }
}
function crash(t, amp = .4) {
  const i0 = S(t), n = S(2.4), fl = svf(), fr = svf();
  for (let i = 0; i < n; i++) {
    const e = Math.exp(-i / SR / .6) * amp;
    const j = i0 + i; if (j >= N) break;
    dry[0][j] += fl(noise(), 5000).hp * e; dry[1][j] += fr(noise(), 5000).hp * e;
  }
}
/** Filtered-noise sweep. shape: 'swell' (bell curve) | 'rise' (builds to end). */
function whoosh(t, dur, amp, f0, f1, p0 = 0, p1 = 0, shape = 'swell', q = 1.6) {
  const i0 = S(t), n = S(dur), f = svf();
  for (let i = 0; i < n; i++) {
    const x = i / n;
    const e = shape === 'rise' ? Math.pow(x, 2.2) * (x > .97 ? (1 - x) / .03 : 1) : Math.pow(Math.sin(Math.PI * x), 1.6);
    const fc = f0 * Math.pow(f1 / f0, shape === 'rise' ? x * x : x);
    put(dry, i0 + i, f(noise(), fc, q).bp * e * amp * 2, p0 + (p1 - p0) * x, .25);
  }
}
function bell(t, freq, amp = .2, pan = 0, decay = 1.1, ratio = 3.5) {
  const i0 = S(t), n = S(decay * 4);
  for (let i = 0; i < n; i++) {
    const s = i / SR, idx = 2.2 * Math.exp(-s * 9);
    const v = Math.sin(TAU * freq * s + idx * Math.sin(TAU * freq * ratio * s)) * Math.exp(-s / decay) * Math.min(1, s * 800);
    put(dry, i0 + i, v * amp, pan, .55);
  }
}
function tick(t, amp = .08, pan = 0) {
  const i0 = S(t), n = S(.012), f = svf();
  for (let i = 0; i < n; i++) put(dry, i0 + i, f(noise(), 4500, 3).bp * (1 - i / n) * amp * 3, pan, .1);
}
function knock(t, amp = .4, freq = 180) {
  const i0 = S(t), n = S(.25);
  for (let i = 0; i < n; i++) { const s = i / SR; put(dry, i0 + i, Math.sin(TAU * freq * s * (1 + Math.exp(-s * 40))) * Math.exp(-s / .06) * amp, 0, .25); }
}
function saw(ph) { return 2 * (ph - Math.floor(ph + .5)); }
function bass(t, freq, dur, amp = .32) {
  const i0 = S(t), n = S(dur + .05), f = svf(); let ph = 0, ph2 = 0;
  for (let i = 0; i < n; i++) {
    const s = i / SR; ph += freq / SR; ph2 += freq * 1.005 / SR;
    const env = Math.min(1, s * 300) * Math.exp(-s / (dur * .9)) * (s > dur ? Math.max(0, 1 - (s - dur) / .05) : 1);
    const v = f(saw(ph) + saw(ph2) * .6 + Math.sin(TAU * freq * .5 * s) * .8, 180 + 1400 * Math.exp(-s * 18), 1.1).lp;
    put(mus, i0 + i, v * env * amp);
  }
}
function pad(t0, t1, freqs, amp = .06, cutoff = 1400, att = .4, rel = .8, pan = 0) {
  const i0 = S(t0), n = S(t1 - t0 + rel), fl = svf(), fr = svf();
  const voices = freqs.flatMap(fq => [-7, 0, 7].map(c => ({ f: fq * Math.pow(2, c / 1200), ph: rnd() })));
  for (let i = 0; i < n; i++) {
    const s = i / SR, dur = t1 - t0;
    const env = Math.min(1, s / att) * (s > dur ? Math.max(0, 1 - (s - dur) / rel) : 1);
    let l = 0, r = 0;
    voices.forEach((v, k) => { v.ph += v.f / SR; const x = saw(v.ph); if (k % 2) l += x; else r += x; });
    const fc = cutoff * (1 + .25 * Math.sin(TAU * .3 * (t0 + s)));
    const j = i0 + i; if (j >= N) break;
    const a = env * amp;
    mus[0][j] += fl(l, fc, .8).lp * a * (1 - pan * .5); mus[1][j] += fr(r, fc, .8).lp * a * (1 + pan * .5);
  }
}
function stab(t, freqs, amp = .16) {
  const i0 = S(t), n = S(1.6), f = svf();
  const ph = freqs.map(() => rnd());
  for (let i = 0; i < n; i++) {
    const s = i / SR; let x = 0;
    freqs.forEach((fq, k) => { ph[k] += fq / SR; x += saw(ph[k]) + saw(ph[k] * 1.003); });
    put(dry, i0 + i, f(x, 300 + 5000 * Math.exp(-s * 5), .9).lp * Math.exp(-s / .5) * amp, 0, .7);
  }
}

// ------------------------------------------------------------ notes
const hz = m => 440 * Math.pow(2, (m - 69) / 12);
const CH = {
  Dm: [50, 53, 57, 64], Bb: [46, 50, 53, 60], F: [53, 57, 60, 67], C: [48, 52, 55, 62],
  Dm9: [50, 53, 57, 60, 64], Fmaj9: [53, 57, 60, 64, 67],
};
const ROOT = { Dm: 38, Bb: 34, F: 41, C: 36, Dm9: 38, Fmaj9: 41 };
const chordAt = t => t < 4 ? 'Dm' : t < 6 ? 'Bb' : t < 8 ? 'F' : t < 10 ? 'C' : t < 12 ? 'Dm' : t < 14 ? 'Bb' : t < 15.42 ? 'C' : t < 18.62 ? 'Dm9' : 'Fmaj9';
const PENTA = [74, 77, 79, 81, 84, 86, 89, 91];

// ------------------------------------------------------------ arrangement
// 0–2  cold open: drone + word thuds + riser
pad(0, 2.0, [38, 45, 50].map(hz), .07, 500, 1.2, .6);
[.5, 1.0, 1.5].forEach(t => { kick(t, .8, .35, 140, 40); tick(t + .002, .1); });
whoosh(.9, 1.1, .5, 300, 6000, -.3, .3, 'rise', 2.5);
for (let i = 0; i < 18; i++) tick(.55 + i * .05, .03, -.4 + i * .05);   // decode flicker
// 2.0 PATHWAY impact
boom(2.0, 1.0); stab(2.0, CH.Dm.map(m => hz(m + 12)), .12);
// 2.42 ribbon wipe
whoosh(2.38, .75, .65, 400, 5000, -.8, .8);
// 3–5.45 groove
for (let b = 0; b < 6; b++) { const t = 3 + b * .5; kick(t, .85); hat(t + .25, .22, b % 2 === 1); }
[3.5, 4.5].forEach(t => clap(t, .45));
for (let e = 0; e < 10; e++) { const t = 3 + e * .25, r = ROOT[chordAt(t)]; bass(t, hz(r + (e % 4 === 2 ? 12 : 0)), .2); }
[2.74, 3.24, 3.74].forEach((t, i) => whoosh(t, .3, .35, 1500, 4000, -.5, .5, 'swell', 3));
bell(4.3, hz(86), .07, .4); bell(4.45, hz(81), .06, .5);
pad(3, 5.4, CH.Dm.map(hz), .045, 1200);
pad(4, 5.5, CH.Bb.map(hz), .04, 1200);
// 5.45 iris → globe
whoosh(5.3, .9, .7, 200, 3000, 0, 0, 'rise', 1.8);
boom(6.12, .55);
// 6.1–9.2 globe: airy, half-time
pad(6.0, 8.1, CH.F.map(hz), .055, 1800, .3);
pad(8.0, 9.6, CH.C.map(hz), .055, 1800, .3);
[7.0, 8.0, 9.0].forEach(t => kick(t, .6));
for (let i = 0; i < 24; i++) { const t = 6.25 + i * .125; hat(t, i % 2 ? .07 : .11, false, Math.sin(i) * .6); }
[7.5, 8.5].forEach(t => clap(t, .3));
for (let i = 0; i < 10; i++) bell(6.15 + i * .16, hz(PENTA[i % PENTA.length]), .07, -.7 + i * .15, .8);
for (let i = 0; i < 10; i++) bell(6.15 + i * .16 + 1.1, hz(PENTA[(i + 3) % PENTA.length] + 12), .025, .2, .4, 2);
for (let e = 0; e < 12; e++) { const t = 6.12 + e * .25; bass(t, hz(ROOT[chordAt(t)]), .22, .2); }
// zoom into Germany
whoosh(9.1, 1.25, .8, 150, 7000, 0, 0, 'rise', 1.4);
kick(10.0, .9); crash(10.0, .25);
// 10–13 pathway groove
for (let b = 1; b < 6; b++) { const t = 10 + b * .5; kick(t, .85); hat(t + .25, .2, b % 2 === 0); }
for (let s = 0; s < 12; s++) hat(10 + s * .25 + .125, .05, false, .5);
[10.5, 11.5, 12.5].forEach(t => clap(t, .45));
for (let e = 0; e < 12; e++) { const t = 10 + e * .25, r = ROOT[chordAt(t)]; bass(t, hz(r + (e % 4 === 3 ? 12 : 0)), .2); }
pad(10, 12.1, CH.Dm.map(hz), .045, 1500); pad(12, 13.2, CH.Bb.map(hz), .045, 1500);
[[10.6, 74], [11.3, 77], [12.0, 81], [12.7, 86]].forEach(([t, m], i) => { bell(t, hz(m), .14, -.6 + i * .4); knock(t, .25, 140); });
tick(12.25, .15); knock(12.25, .3, 220); // visa stamp
// 13 → logo build
whoosh(13.0, .95, .6, 300, 4000, .6, -.6, 'swell', 1.2);
[13.75, 13.85, 13.95].forEach((t, i) => whoosh(t, .45, .4, 600 + i * 300, 3500, -.4 + i * .2, .2 + i * .2, 'swell', 2.5));
whoosh(14.15, .5, .3, 1500, 5000, -.6, -.2, 'swell', 3);
[14.3, 14.47, 14.52, 14.57, 14.62, 14.78, 14.92].forEach((t, i) => knock(t, .3, 120 + i * 18));
whoosh(14.5, .9, .75, 250, 3200, -1, .7, 'swell', 1.3); // plane fly-by, panned
pad(14.0, 15.4, CH.C.map(hz), .05, 900, .2, .1);
for (let i = 0; i < 12; i++) clap(14.6 + i * (.07 - i * .003), .07 + i * .02);   // roll into impact
whoosh(14.4, 1.02, .6, 400, 9000, 0, 0, 'rise', 2);
// 15.42 AGH impact
boom(15.42, 1.1); stab(15.42, CH.Dm9.map(m => hz(m + 12)), .14);
bell(15.42, hz(86), .1, 0, 1.6);
pad(15.42, 18.7, CH.Dm9.map(hz), .055, 1600, .05, .4);
for (let e = 0; e < 12; e++) { const t = 15.5 + e * .25; bass(t, hz(ROOT.Dm9 + (e % 4 === 2 ? 12 : 0)), .2, .2); }
[16.0, 16.5, 17.0, 17.5].forEach(t => kick(t, .55)); [16.75, 17.25, 17.75].forEach(t => hat(t, .12, true));
for (let i = 0; i < 9; i++) tick(15.5 + i * .07, .04, (i - 4) / 5);                  // tracking-in letters
for (let i = 0; i < 8; i++) bell(16.35 + i * .06, hz(PENTA[i] + 12), .045, -.7 + i * .2, .6); // shine
// 17.85 end card
whoosh(17.75, .9, .55, 300, 4500, .4, -.4, 'swell', 1.4);
boom(18.62, .5);
[18.14, 18.29, 18.44].forEach((t, i) => whoosh(t, .3, .3, 1500, 4500, .2, .7, 'swell', 3));
pad(18.62, 20, CH.Fmaj9.map(hz), .065, 2000, .05, .1);
bass(18.62, hz(ROOT.Fmaj9), 1.38, .28);
bell(18.62, hz(89), .1, -.3, 1.4); bell(18.7, hz(93), .07, .3, 1.4);
for (let i = 0; i < 20; i++) tick(18.95 + i * .035, .025, .3);

// ------------------------------------------------------------ mix
// sidechain pads/bass to the kicks
const duck = new Float32Array(N).fill(1);
for (const [t, a] of kicks) { const i0 = S(t), n = S(.35); for (let i = 0; i < n && i0 + i < N; i++) duck[i0 + i] = Math.min(duck[i0 + i], 1 - .55 * Math.min(1, a) * Math.exp(-i / SR / .09)); }
for (let c = 0; c < 2; c++) for (let i = 0; i < N; i++) { mus[c][i] *= duck[i]; send[c][i] += mus[c][i] * .25; }

// Freeverb-style reverb
function reverb(inp, off) {
  const sc = SR / 44100, outp = new Float32Array(N);
  const combs = [1116, 1188, 1277, 1356, 1422, 1491, 1557, 1617].map(d => ({ b: new Float32Array(Math.round((d + off) * sc)), i: 0, s: 0 }));
  const aps = [556, 441, 341, 225].map(d => ({ b: new Float32Array(Math.round((d + off) * sc)), i: 0 }));
  const fb = .86, damp = .25;
  for (let n = 0; n < N; n++) {
    const x = inp[n] * .015; let y = 0;
    for (const c of combs) { const o = c.b[c.i]; c.s = o * (1 - damp) + c.s * damp; c.b[c.i] = x + c.s * fb; c.i = (c.i + 1) % c.b.length; y += o; }
    for (const a of aps) { const o = a.b[a.i]; const v = -y + o; a.b[a.i] = y + o * .5; a.i = (a.i + 1) % a.b.length; y = v; }
    outp[n] = y;
  }
  return outp;
}
const rv = [reverb(send[0], 0), reverb(send[1], 23)];
const L = new Float32Array(N), R = new Float32Array(N);
let peak = 0;
for (let i = 0; i < N; i++) {
  const s = i / SR;
  const fade = Math.min(1, s / .01) * (s > DUR - .5 ? Math.max(0, (DUR - s) / .5) : 1);
  L[i] = Math.tanh((dry[0][i] + mus[0][i] * 1.3 + rv[0][i] * 4) * .75) * fade;
  R[i] = Math.tanh((dry[1][i] + mus[1][i] * 1.3 + rv[1][i] * 4) * .75) * fade;
  peak = Math.max(peak, Math.abs(L[i]), Math.abs(R[i]));
}
const g = .74 / peak;
const buf = Buffer.alloc(44 + N * 4);
buf.write('RIFF', 0); buf.writeUInt32LE(36 + N * 4, 4); buf.write('WAVEfmt ', 8);
buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(2, 22); buf.writeUInt32LE(SR, 24);
buf.writeUInt32LE(SR * 4, 28); buf.writeUInt16LE(4, 32); buf.writeUInt16LE(16, 34); buf.write('data', 36); buf.writeUInt32LE(N * 4, 40);
for (let i = 0; i < N; i++) { buf.writeInt16LE(Math.round(clamp(L[i] * g, -1, 1) * 32767), 44 + i * 4); buf.writeInt16LE(Math.round(clamp(R[i] * g, -1, 1) * 32767), 46 + i * 4); }
const outDir = path.join(__dirname, 'out'); fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, 'soundtrack.wav'), buf);
console.log('wrote out/soundtrack.wav  peak', peak.toFixed(3));
