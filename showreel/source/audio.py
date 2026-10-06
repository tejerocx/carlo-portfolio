"""Procedural soundtrack for the Smash Grove showreel: 120 BPM beat, sound design, ducked voiceover."""
import numpy as np
import soundfile as sf
from scipy.signal import butter, sosfilt, resample_poly

SR = 48000
DUR = 33.0
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


# ---------- music ----------
music = np.zeros(N)
K, C, H, HO = kick(), clap(), hat(), hat(True)
# progression (A minor energy): Am F C G, one chord per bar
ROOTS = [55.0, 43.65, 65.41, 49.0]
CHORDS = [[220, 261.6, 329.6], [174.6, 220, 261.6], [261.6, 329.6, 392], [196, 246.9, 293.7]]


def section_density(t):
    if t < 4.0:
        return "hook"
    if t < 8.0:
        return "build"
    if t < 24.0:
        return "full"
    if t < 26.2:
        return "chop"
    if t < 28.0:
        return "full"
    if t < 31.5:
        return "full"
    return "out"


steps = int(DUR / (BEAT / 4))
for s in range(steps):
    t = s * BEAT / 4
    sec = section_density(t)
    beat_pos = s % 4 == 0
    bar = int(t // 2) % 4
    b_in_bar = int((t % 2) // BEAT)
    if sec == "hook":
        continue  # hook is driven by hits only
    if sec == "out" and t > 32.0:
        continue
    if beat_pos and sec != "chop":
        put(music, K, t, .95)
    if sec == "chop" and beat_pos and b_in_bar in (0, 2):
        put(music, K, t, .95)
    if beat_pos and b_in_bar in (1, 3) and sec in ("full", "out"):
        put(music, C, t, .55)
    if sec in ("full", "build", "out"):
        if s % 2 == 0:
            put(music, H, t, .5 if s % 4 == 2 else .25)
        elif sec == "full":
            put(music, H, t, .15)
        if s % 8 == 6 and sec == "full":
            put(music, HO, t, .3)
    # offbeat bass pumps
    if s % 2 == 1 and sec in ("full", "out", "chop"):
        put(music, bass_note(ROOTS[bar] * 2, BEAT / 2.2), t, .5)
    if sec == "build" and s % 4 == 2:
        put(music, bass_note(ROOTS[bar] * 2, BEAT / 2.2), t, .35)
    # chord stabs on the "and" of 2 and 4, plus pushes
    if sec in ("full", "out") and s % 16 in (6, 14, 3):
        put(music, stab(CHORDS[bar], .3), t, .35)

# hook hits: each word slams with a kick + stab
for t, ch in ((.3, 0), (1.25, 3), (2.25, 1)):
    put(music, K, t, 1.0)
    put(music, stab([f * 2 for f in CHORDS[ch]], .5), t, .45)
    put(music, C, t, .35)
put(music, riser(1.3), 2.7, .8)
put(music, riser(1.0), 27.0, .6)
put(music, riser(.9), 21.4, .45)

# ---------- sound design ----------
sfx = np.zeros(N)
put(sfx, whoosh(.32), 0.0, .7)          # ball flying in
put(sfx, pock(), .29, 1.0)
for t in (.3, 4.0, 28.0):
    put(sfx, impact(), t, .85)
put(sfx, impact(), 22.31, .7)
for t in (1.12, 2.1):
    put(sfx, whoosh(.25), t, .6)
put(sfx, whoosh(.7), 3.3, .8)           # zoom through the ball
for t in (4.05, 4.3, 4.5):              # badge assembling
    put(sfx, pock(1.1), t, .5)
for i in range(10):                     # logo letters landing
    put(sfx, tick(), 5.05 + i * .045 + .25, .5)
put(sfx, whoosh(.55), 7.55, .7)         # iris into the app
put(sfx, whoosh(.5, up=False), 7.85, .5)
for t in (11.75, 15.75, 19.75):         # step-to-step swipes
    put(sfx, whoosh(.45), t, .55)
for t in (10.0, 11.3, 13.4, 13.85, 15.3, 19.3, 21.55):  # finger taps
    put(sfx, tick(), t, 1.0)
    put(sfx, pock(1.6), t, .25)
for i in range(12):                      # slot grid populating
    put(sfx, tick(), 12.05 + i * .035, .25)
for a, b, n in ((16.35, 16.8, 8), (16.9, 17.5, 13), (17.6, 18.25, 17)):  # typing
    for i in range(n):
        put(sfx, tick(), a + (b - a) * i / n, .3)
put(sfx, chime(), 22.31, .9)
put(sfx, chime(), 22.9, .35)            # email notification
put(sfx, whoosh(.5), 23.9, .7)
for t in (24.28, 25.08, 25.88):
    put(sfx, impact()[: int(.5 * SR)], t, .45)
put(sfx, whoosh(.35), 26.1, .6)
for i, t in enumerate((26.45, 26.75, 27.05, 27.35)):  # ball hops on PLAY.
    put(sfx, pock(1 + i * .06), t, .9)
put(sfx, whoosh(.65), 27.35, .8)
for t in (28.0, 28.35, 28.7):
    put(sfx, pock(.9), t, .6)
for i in range(14):                      # URL typing
    put(sfx, tick(), 29.65 + i * .6 / 14, .3)
put(sfx, whoosh(1.0, up=False), 29.7, .25)  # scan laser
put(sfx, chime(), 30.4, .5)
put(sfx, K, 31.0, .8)

# ---------- voiceover ----------
VO = [("l1", .30), ("l2", 1.28), ("l3", 2.26), ("l4", 3.75), ("l5", 8.30), ("l6", 12.30), ("l7", 16.30),
      ("l8a", 20.10), ("l8b", 22.15), ("l9a", 24.25), ("l9b", 25.05), ("l9c", 25.85), ("l10", 28.30)]
vo = np.zeros(N)
for name, t in VO:
    a, sr = sf.read(f"../vo/{name}.wav")
    a = resample_poly(a, SR, sr)
    put(vo, a, t, 1.0)
# voice polish: low cut, presence lift, gentle saturation for punch
vo = hp(vo, 90)
vo = vo + bp(vo, 2500, 6000) * .35
vo = np.tanh(vo * 2.2) / np.tanh(2.2)

# duck music under voice
ve = np.abs(vo)
win = int(.05 * SR)
ve = np.convolve(ve, np.ones(win) / win, mode="same")
ve = np.clip(ve / (ve.max() * .25), 0, 1)
sm = np.convolve(ve, np.ones(int(.12 * SR)) / int(.12 * SR), mode="same")
duck = 1 - .45 * np.clip(sm, 0, 1)

# master fade tail
fade = np.ones(N)
ft = np.arange(N) / SR
fade[ft > 31.6] = np.clip(1 - (ft[ft > 31.6] - 31.6) / 1.4, 0, 1) ** 1.5

mix_l = (music * .42 * duck + sfx * .5) * fade + vo * .95
# slight stereo width on music/sfx via short delay
d = int(.012 * SR)
side = np.concatenate([np.zeros(d), (music * .42 * duck + sfx * .5)[:-d]]) * fade
L = mix_l
Rr = (music * .42 * duck + sfx * .5) * fade * .85 + side * .15 + vo * .95
st = np.stack([L, Rr], 1)
st = st / np.abs(st).max() * .89
st = np.tanh(st * 1.3) / np.tanh(1.3)
sf.write("out/soundtrack.wav", st.astype(np.float32), SR)
print("peak", np.abs(st).max(), "rms", np.sqrt((st ** 2).mean()))
