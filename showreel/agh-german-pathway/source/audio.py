"""Procedural soundtrack for the Smash Grove showreel: 120 BPM beat, sound design, ducked voiceover."""
import numpy as np
import soundfile as sf
from scipy.signal import butter, sosfilt, resample_poly

SR = 48000
DUR = 24.5
N = int(SR * DUR)
BEAT = 0.5  # 120 BPM: one bar = 2 s, scene cuts land on bar lines
rng = np.random.default_rng(3)


def bp(x, lo, hi):
    return sosfilt(butter(2, [lo, hi], btype="band", fs=SR, output="sos"), x)


def hp(x, f):
    return sosfilt(butter(2, f, btype="high", fs=SR, output="sos"), x)


def lp(x, f):
    return sosfilt(butter(2, f, btype="low", fs=SR, output="sos"), x)


def put(buf, sig, t, gain=1.0):
    i = int(t * SR)
    if i >= len(buf):
        return
    j = min(len(buf), i + len(sig))
    buf[i:j] += sig[: j - i] * gain


def env(n, a, d):
    t = np.arange(n) / SR
    return np.minimum(1, t / max(a, 1e-4)) * np.exp(-t / d)


# ---------- instruments ----------
def kick():
    n = int(.45 * SR); t = np.arange(n) / SR
    f = 45 + 110 * np.exp(-t * 28)
    ph = 2 * np.pi * np.cumsum(f) / SR
    s = np.sin(ph) * np.exp(-t * 7) + .4 * np.sin(ph) * np.exp(-t * 30)
    click = hp(rng.standard_normal(n), 2000) * np.exp(-t * 300) * .3
    return np.tanh((s + click) * 1.6)


def clap():
    n = int(.35 * SR); t = np.arange(n) / SR
    nz = bp(rng.standard_normal(n), 900, 5000)
    e = np.exp(-t * 18)
    for d in (.0, .011, .022):
        e += (t >= d) * np.exp(-np.clip(t - d, 0, None) * 90) * .8
    return nz * e * .7


def hat(open_=False):
    n = int((.25 if open_ else .06) * SR); t = np.arange(n) / SR
    return hp(rng.standard_normal(n), 7000) * np.exp(-t * (14 if open_ else 70)) * .35


def saw(f, n):
    t = np.arange(n) / SR
    out = np.zeros(n)
    for det in (-.08, 0, .08):
        ph = (t * f * (1 + det / 100 * 12)) % 1
        out += 2 * ph - 1
    return out / 3


def bass_note(f, dur):
    n = int(dur * SR); t = np.arange(n) / SR
    s = np.sin(2 * np.pi * f * t) * .8 + lp(saw(f, n), 600) * .5
    return s * env(n, .005, dur * .6)


def stab(freqs, dur):
    n = int(dur * SR)
    s = sum(saw(f, n) for f in freqs) / len(freqs)
    t = np.arange(n) / SR
    s = sosfilt(butter(2, 3200, fs=SR, output="sos"), s)
    return s * env(n, .004, .18)


def whoosh(dur, up=True):
    n = int(dur * SR); t = np.arange(n) / SR
    nz = rng.standard_normal(n)
    out = np.zeros(n)
    blocks = 24
    for b in range(blocks):
        k = b / (blocks - 1)
        fc = 300 + (6000 if up else 3000) * (k if up else 1 - k)
        seg = slice(b * n // blocks, (b + 1) * n // blocks)
        out[seg] = bp(nz, fc * .6, min(fc * 1.6, 20000))[seg]
    shape = np.sin(np.pi * np.clip(t / dur, 0, 1)) ** 2
    return out * shape * .5


def impact():
    n = int(1.6 * SR); t = np.arange(n) / SR
    f = 38 + 80 * np.exp(-t * 14)
    boom = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 3.2)
    crack = bp(rng.standard_normal(n), 1500, 9000) * np.exp(-t * 22) * .5
    tail = lp(rng.standard_normal(n), 2500) * np.exp(-t * 2.5) * .12
    return np.tanh((boom + crack + tail) * 1.4) * .9


def pock(pitch=1.0):  # pickleball off a paddle: hollow, short, woody
    n = int(.12 * SR); t = np.arange(n) / SR
    s = (np.sin(2 * np.pi * 1150 * pitch * t) * .7 + np.sin(2 * np.pi * 2350 * pitch * t) * .35) * np.exp(-t * 60)
    s += bp(rng.standard_normal(n), 1500, 6000) * np.exp(-t * 250) * .6
    return s * .8


def tick():
    n = int(.05 * SR); t = np.arange(n) / SR
    return np.sin(2 * np.pi * 2600 * t) * np.exp(-t * 160) * .35


def riser(dur):
    n = int(dur * SR); t = np.arange(n) / SR
    f = 200 * (2 ** (t / dur * 3))
    tone = np.sin(2 * np.pi * np.cumsum(f) / SR) * .25
    return (tone + whoosh(dur) * .8) * (t / dur) ** 2


def chime():
    n = int(1.5 * SR); t = np.arange(n) / SR
    s = sum(np.sin(2 * np.pi * f * t) * np.exp(-t * d) for f, d in ((1046.5, 3), (1318.5, 3.5), (1568, 4), (2093, 5)))
    return s * .18



import json, re
CAPS = json.loads(re.search(r'window.CAPS=(\[.*?\]);', open('timing.js').read()).group(1))
def wt(word, after=0):
    for c in CAPS:
        for w, s in c["w"]:
            if s >= after and re.sub('[^a-z]', '', w.lower()) == word: return s
    return 0

def snare():
    n = int(.25 * SR); t = np.arange(n) / SR
    body = np.sin(2 * np.pi * 190 * t) * np.exp(-t * 30) * .5
    return (bp(rng.standard_normal(n), 1200, 8000) * np.exp(-t * 20) * .6 + body)

music = np.zeros(N)
Kk, C, H, HO, SN = kick(), clap(), hat(), hat(True), snare()
# uplifting I-V-vi-IV in D major
ROOTS = [73.42, 55.0, 61.74, 49.0]
CHORDS = [[293.7, 370.0, 440.0], [277.2, 329.6, 440.0], [246.9, 293.7, 370.0], [293.7, 392.0, 493.9]]
steps = int(DUR / (BEAT / 4))
for s in range(steps):
    t = s * BEAT / 4
    bar = int(t // 2) % 4
    b = int((t % 2) // BEAT)
    on4 = s % 4 == 0
    if t < 2.0:
        if t >= 1.0 and s % 2 == 0: put(music, H, t, .2 + .3 * (t - 1))   # hats build in the intro
        continue
    if 20.0 <= t < 24.0:   # end card: half-time, big and open
        if s % 8 == 0: put(music, Kk, t, .9)
        if s % 16 == 8: put(music, C, t, .5)
        if s % 2 == 0: put(music, H, t, .2)
        if s % 8 == 0: put(music, stab(CHORDS[bar], .45), t, .3)
        if s % 4 == 2: put(music, bass_note(ROOTS[bar] * 2, .2), t, .4)
        continue
    if t >= 24.0: continue
    if on4: put(music, Kk, t, .95)
    if on4 and b in (1, 3): put(music, C, t, .55)
    put(music, H, t, [.35, .12, .22, .12][s % 4])
    if s % 8 == 6: put(music, HO, t, .28)
    if s % 2 == 1: put(music, bass_note(ROOTS[bar] * 2, BEAT / 2.3), t, .5)
    if s % 16 in (0, 6, 10, 14): put(music, stab(CHORDS[bar], .28), t, .32)
# snare roll + riser into the end card
for i in range(16):
    tt = 19.0 + i * (1.0 / 16)
    put(music, SN, tt, .15 + .45 * i / 15)
put(music, riser(1.2), 18.8, .7)
put(music, riser(1.4), .6, .5)
for t in (5.2, 9.7, 15.2):
    put(music, riser(.8), t, .35)
# intro hits
put(music, Kk, .46, 1.0); put(music, stab([f * 2 for f in CHORDS[0]], .6), .46, .5)
put(music, Kk, .85, .7); put(music, stab([f * 2 for f in CHORDS[1]], .4), .85, .35)

sfx = np.zeros(N)
put(sfx, impact(), .46, .8)
put(sfx, whoosh(1.4), .3, .45)                     # plane fly-by
for c in (2.0, 6.0, 10.5, 16.0, 20.0):             # stripe wipes
    put(sfx, whoosh(.6), c - .3, .8)
    put(sfx, impact()[: int(.7 * SR)], c, .35)
for t in (2.2, 6.2, 10.65, 16.15):                 # headline slams
    put(sfx, pock(.7), t + .08, .5)
put(sfx, pock(1.2), 2.3, .4)                        # logo bug pop
put(sfx, chime(), wt('goal', 6) - .02, .35)
put(sfx, whoosh(.5, up=False), 7.2, .25)
for w in ('qualifications', 'plans'):
    put(sfx, pock(1.3), wt(w, 7) - .02, .55); put(sfx, tick(), wt(w, 7), .6)
to = wt('opportunity', 11)
put(sfx, whoosh(.55), to - .2, .7)
put(sfx, impact()[: int(.6 * SR)], to + .2, .35)
put(sfx, chime(), to + .6, .3)
put(sfx, tick(), wt('eligible', 12), .5)
for w in ('check', 'prepare'):
    put(sfx, pock(1.4), wt(w, 16), .5); put(sfx, chime()[: int(.5 * SR)], wt(w, 16) + .2, .45)
# end-card logo build
put(sfx, whoosh(.5), 20.1, .6)
put(sfx, impact()[: int(.9 * SR)], 20.6, .5)
put(sfx, whoosh(.45), 20.55, .5)
put(sfx, riser(.85) * .7, 21.05, .5)
put(sfx, chime(), 21.9, .7)
put(sfx, pock(1.1), 21.6, .5)

PLACE = json.load(open('vo/place.json'))
vo = np.zeros(N)
for name, t in PLACE.items():
    a, sr = sf.read(f"vo/{name}.wav")
    put(vo, resample_poly(a, SR, sr), t, 1.0)
vo = hp(vo, 85)
vo = vo + bp(vo, 2500, 6500) * .4
vo = np.tanh(vo * 2.6) / np.tanh(2.6)

ve = np.convolve(np.abs(vo), np.ones(int(.05 * SR)) / int(.05 * SR), mode="same")
ve = np.clip(ve / (ve.max() * .25), 0, 1)
sm = np.convolve(ve, np.ones(int(.12 * SR)) / int(.12 * SR), mode="same")
duck = 1 - .42 * np.clip(sm, 0, 1)
ft = np.arange(N) / SR
fade = np.where(ft > 23.3, np.clip(1 - (ft - 23.3) / 1.2, 0, 1) ** 1.5, 1.0)
bed = (music * .44 * duck + sfx * .5) * fade
d = int(.012 * SR)
side = np.concatenate([np.zeros(d), bed[:-d]])
st = np.stack([bed + vo, bed * .85 + side * .15 + vo], 1)
st = st / np.abs(st).max() * .89
st = np.tanh(st * 1.3) / np.tanh(1.3)
sf.write("out/soundtrack.wav", st.astype(np.float32), SR)
print("ok peak", np.abs(st).max())
