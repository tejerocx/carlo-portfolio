# /// script
# requires-python = ">=3.10"
# dependencies = ["librosa>=0.10", "numpy", "scipy", "soundfile"]
# ///
"""AGH German Pathway showreel II score: 128 BPM, 72 beats = 33.75 s, C major (vi-IV-I-V: Am F C G).
Driving future-pop: riser into the text punch-in (b4), groove through Cologne/Dresden, breakdown under
Munich, snare build, peak drop on Frankfurt (b50), impact + resolve on the end card (b62).

    MOTION_REEL_SKILL=<skill> uv run agh-reel-2/audio/score.py
"""
import json, os, sys
from pathlib import Path
import numpy as np
import soundfile as sf

sys.path.insert(0, str(Path(os.environ["MOTION_REEL_SKILL"]) / "scripts"))
from dsp import *  # noqa: E402,F403

HERE = Path(__file__).resolve().parent
FILM = HERE.parent
BPM, NB = 128, 72
BEAT = 60 / BPM
DUR = NB * BEAT  # 33.75
seed(20261009)

VO = [("a", 1), ("b", 18.5), ("c", 35), ("d", 51), ("e", 63)]
HOOK, MAIN, GROOVE, BREAK, BUILD, PEAK, END = 0, 4, 18, 34, 42, 50, 62

PROG = [  # vi IV I V in C
    (["A3", "C4", "E4", "G4"], "A1", ["A4", "C5", "E5", "C5"]),
    (["F3", "A3", "C4", "E4"], "F1", ["F4", "A4", "C5", "A4"]),
    (["C4", "E4", "G4", "B4"], "C2", ["G4", "C5", "E5", "C5"]),
    (["G3", "B3", "D4", "G4"], "G1", ["G4", "B4", "D5", "B4"]),
]
LEAD = {0: "E5", 0.75: "D5", 1.5: "C5", 2: "E5", 3: "G5", 4: "A5", 5.5: "G5", 6: "E5", 7: "C5",
        8: "E5", 8.75: "D5", 9.5: "C5", 10: "G5", 11: "A5", 12: "B5", 13.5: "A5", 14: "G5", 15: "D5"}

def bell_tone(note, length=1.2):
    n = int(length * SR); t = tvec(n); f = hz(note)
    return np.sin(2 * np.pi * f * t + 2.2 * np.exp(-t / 0.4) * np.sin(2 * np.pi * f * 3.5 * t)) * np.exp(-t / 0.5) * (1 - np.exp(-t / 0.002))

def snare_roll(length, n_hits):
    out = np.zeros(int((length + 0.4) * SR))
    for k in range(n_hits):
        p = k / (n_hits - 1); tt = length * (1 - (1 - p) ** 1.6)
        s = clap(tight=True) * (0.12 + 0.65 * p); i = int(tt * SR); out[i:i + len(s)] += s[:len(out) - i]
    return out

drums, bass, music, lead, fx = (Bus(DUR, BPM) for _ in range(5))
kicks = []
for b in range(NB):
    pad, broot, arp = PROG[(b // 4) % 4]
    full = (MAIN <= b < BREAK) or (PEAK <= b < END)
    brk, build, peak = BREAK <= b < BUILD, BUILD <= b < PEAK, PEAK <= b < END
    # drums
    if b < END and not brk:
        if b >= MAIN or b == 0:
            drums.add(kick(), b, 1.0 if peak else 0.9); kicks.append(b * BEAT)
        drums.add(hat(), b + 0.5, 0.22, pan=0.25)
        if full or build:
            for s in (0.25, 0.75): drums.add(hat(), b + s, 0.08 if not peak else 0.1, pan=-0.3)
        if (full or build) and b % 2 == 1: drums.add(clap(), b, 0.45, pan=0.05)
        if peak: drums.add(hat(open_=True), b + 0.5, 0.1, pan=0.2)
    if brk and b % 4 == 0: drums.add(kick(soft=True), b, 0.5)
    # harmony
    if b % 4 == 0 and b < END:
        L = 4 * BEAT + 0.1
        if brk: music.add(pad_chord(pad, L, (600, 2600), attack=0.25), b, 0.45)
        elif build: music.add(pad_chord(pad, L, (900, 4200), attack=0.05), b, 0.32)
        else: music.add(pad_chord(pad, L, 2600 if full else 1500, attack=0.02), b, 0.3)
    # 16th pluck arp (8ths in the hook/breakdown)
    if b < END:
        steps = (0, 0.5) if (b < MAIN or brk) else (0, 0.25, 0.5, 0.75)
        for i, h in enumerate(steps):
            nt = arp[(int(b * len(steps)) + i) % 4]
            cut = 1600 if b < MAIN else (2200 if brk else 3400)
            music.add(pluck([nt], 0.18, cut), b + h, 0.13 if len(steps) == 4 else 0.17, pan=0.25 if i % 2 else -0.25)
    # bass
    if full or build or (GROOVE <= b < BREAK):
        for h in (0, 0.5):
            nt = broot[:-1] + str(int(broot[-1]) + (1 if h else 0))
            bass.add(bass_note(nt, BEAT / 2 * 0.9, 1100), b + h, 0.55 if h == 0 else 0.45)
    # supersaw stabs on the offbeats in the peak
    if peak and b % 2 == 0:
        music.add(pad_chord([n[:-1] + str(int(n[-1]) + 1) for n in pad[1:]], BEAT * 0.4, 5200, attack=0.003, release=0.05), b + 0.5, 0.22)
    # lead in groove (soft) and peak (full)
    if (GROOVE <= b < BREAK) or peak:
        base = GROOVE if b < BREAK else PEAK
        for off, nt in LEAD.items():
            if int(off) == (b - base) % 16:
                lead.add(pluck([nt, nt[:-1] + str(int(nt[-1]) - 1)], 0.3, 4400), b + (off - int(off)), 0.12 if b < BREAK else 0.2, pan=0.1)

# transitions + landings
fx.add(riser(1.6), 0, 0.0)  # placeholder keeps the bus shape
fx.add(riser(3 * BEAT), MAIN - 3, 0.35); drums.add(sub_drop(1.0, 80, 30), MAIN, 0.6); drums.add(crash(1.8), MAIN, 0.26)
for tb in (GROOVE, BREAK, END):
    fx.add(riser(2 * BEAT), tb - 2, 0.3); drums.add(crash(1.6), tb, 0.22); drums.add(sub_drop(1.0, 76, 30), tb, 0.45)
fx.add(riser(8 * BEAT), PEAK - 8, 0.38); fx.add(snare_roll(4 * BEAT, 24), PEAK - 4, 0.6)
drums.add(sub_drop(1.2, 84, 28), PEAK, 0.7); drums.add(crash(2.0), PEAK, 0.3)
drums.add(kick(), END, 1.0); drums.add(sub_drop(1.4, 70, 28), END, 0.6); drums.add(crash(2.6), END, 0.3)
music.add(pad_chord(["C3", "G3", "C4", "E4", "G4", "D5"], 10 * BEAT, (5200, 900), attack=0.01, release=1.2), END, 0.5)
bass.add(bass_note("C1", 4 * BEAT, 500), END, 0.5)
for i, nt in enumerate(["G5", "C6", "E6"]):
    fx.add(bell_tone(nt, 1.6), END + 1.5 + i * 0.5, 0.15, pan=-0.2 + 0.2 * i)
for b in range(END + 4, NB - 1):
    for h in (0, 0.5):
        nt = ["C5", "E5", "G5", "E5"][int((b % 2) * 2 + h * 2)]
        music.add(pluck([nt], 0.25, 1400), b + h, 0.09 * (1 - (b - END - 4) / (NB - END - 4)), pan=-0.2 if h else 0.2)

N = drums.n
duck = sidechain(kicks, drums.x.shape[1], 0.5, 0.1)
mix = drums.x + (bass.x + reverb(music.x, 0.32) + reverb(lead.x, 0.3)) * duck + reverb(fx.x, 0.2)
mix = mix[:, :N]; fade = int(0.6 * SR); mix[:, -fade:] *= np.linspace(1, 0, fade) ** 2
mix *= 10 ** (-3 / 20) / (np.abs(mix).max() + 1e-9)
sf.write(FILM / "audio" / "music.wav", mix.T, SR, subtype="PCM_24")

takes = json.load(open(HERE / "vo" / "takes.json"))
vo = np.zeros(N); words, prev_end = [], -1
for lid, onb in VO:
    tk = takes[lid]; x, sr = sf.read(HERE / "vo" / f"{lid}.wav"); assert sr == SR
    start = onb * BEAT - tk["words"][0]["t0"]; i = int(round(start * SR)); vo[i:i + len(x)] += x[:N - i]
    if start < prev_end: print(f"OVERLAP at {lid}")
    print(f"{lid}: onset b{onb} ({onb*BEAT:.2f}s) .. {start + tk['dur']:.2f}s (b{(start + tk['dur'])/BEAT:.1f})")
    prev_end = start + tk["dur"]
    words += [{"w": w["w"], "t0": round(start + w["t0"], 3), "t1": round(start + w["t1"], 3), "line": lid} for w in tk["words"]]
vo = vo / (np.abs(vo).max() + 1e-9) * 10 ** (-1.5 / 20)
sf.write(FILM / "audio" / "vo.wav", np.stack([vo, vo]).T, SR, subtype="PCM_24")
json.dump({"words": words}, open(FILM / "words.json", "w"), indent=1)

grid = measure_beats(drums.x[:, :N].mean(axis=0).astype(np.float32), SR, BPM, n_beats=NB + 1)
grid["beats"] = [b for b in grid["beats"] if b < DUR + 0.5]; grid["downbeats"] = grid["beats"][::4]
grid["sections"] = [{"name": n, "beat": b} for n, b in [("hook", HOOK), ("main", MAIN), ("groove", GROOVE), ("break", BREAK), ("build", BUILD), ("peak", PEAK), ("end", END)]]
mono = mix.mean(axis=0); bar_s = grid["period"] * 4
grid["bar_energy"] = [round(float(np.sqrt(np.mean(mono[int(i * bar_s * SR):int((i + 1) * bar_s * SR)] ** 2))), 4) for i in range(NB // 4)]
grid["duration"] = DUR; grid["source"] = "bespoke score.py, grid measured on the drum stem"
(FILM / "beats.json").write_text(json.dumps(grid, indent=1))
print(f"grid: {grid['bpm']} bpm offset {grid['offset']*1000:.1f} ms, inliers {grid['fit_inliers']}, rms {grid['fit_residual_ms']} ms")
