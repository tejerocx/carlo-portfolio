# /// script
# requires-python = ">=3.10"
# dependencies = ["librosa>=0.10", "numpy", "scipy", "soundfile"]
# ///
"""AGH German Pathway showreel score: 120 BPM, 68 beats = 34.0 s, D major (vi-IV-I-V: Bm G D A).
Future-pop house: a plucked hook from frame 0, full groove under Hamburg, a breakdown on
"No offer yet?", the lift into Bavaria, an impact + resolve under the end card.

    MOTION_REEL_SKILL=<skill> uv run agh-reel/audio/score.py

Reads  audio/vo/<id>.wav + takes.json (vo_takes.py)
Writes audio/music.wav, audio/vo.wav, beats.json, words.json (captions, film time)
"""
import json, os, sys
from pathlib import Path
import numpy as np
import soundfile as sf

SKILL = Path(os.environ["MOTION_REEL_SKILL"])
sys.path.insert(0, str(SKILL / "scripts"))
from dsp import *  # noqa: E402,F403

HERE = Path(__file__).resolve().parent
FILM = HERE.parent
BPM, DUR = 120, 34.0
BEAT = 60 / BPM
NB = int(DUR / BEAT)  # 68
seed(20261006)

# VO lines: (take id, beat its speech onset lands on)
VO = [("a", 1), ("b", 13), ("c", 29), ("d", 45), ("e", 57.5)]
# sections (beats)
HOOK, MAIN, BREAK, GROOVE2, PEAK, END = 0, 12, 28, 32, 44, 56

PROG = [  # vi IV I V in D: (pad voicing, bass root, arp notes)
    (["B3", "D4", "F#4", "A4"], "B1", ["B4", "D5", "F#5", "D5"]),
    (["G3", "B3", "D4", "F#4"], "G1", ["G4", "B4", "D5", "B4"]),
    (["D4", "F#4", "A4", "C#5"], "D2", ["A4", "D5", "F#5", "D5"]),
    (["A3", "C#4", "E4", "A4"], "A1", ["A4", "C#5", "E5", "C#5"]),
]
LEAD = {  # beat offset within a 16-beat cycle -> note (simple hook for the peak)
    0: "F#5", 1.5: "E5", 2: "D5", 3: "B4", 4: "D5", 5.5: "E5", 6: "F#5", 7: "A5",
    8: "F#5", 9.5: "E5", 10: "D5", 11: "E5", 12: "C#5", 13.5: "E5", 14: "A5", 15: "E5",
}

def bell_tone(note, length=1.2):
    n = int(length * SR); t = tvec(n); f = hz(note)
    x = np.sin(2 * np.pi * f * t + 2.2 * np.exp(-t / 0.4) * np.sin(2 * np.pi * f * 3.5 * t))
    return x * np.exp(-t / 0.5) * (1 - np.exp(-t / 0.002))

def snare_roll(length, n_hits):
    out = np.zeros(int((length + 0.4) * SR))
    for k in range(n_hits):
        p = k / (n_hits - 1); tt = length * (1 - (1 - p) ** 1.7)
        s = clap(tight=True) * (0.15 + 0.6 * p); i = int(tt * SR)
        out[i:i + len(s)] += s[:len(out) - i]
    return out

drums, bass, music, lead, fx = (Bus(DUR, BPM) for _ in range(5))
kicks = []
for b in range(NB):
    bar = b // 4
    pad, broot, arp = PROG[bar % 4]
    sec_break = BREAK <= b < GROOVE2
    full = (MAIN <= b < BREAK) or (GROOVE2 <= b < END)
    # ---- drums
    if b < END and not sec_break:
        drums.add(kick(), b, 0.95 if b >= MAIN else 0.8); kicks.append(b * BEAT)
        drums.add(hat(), b + 0.5, 0.22, pan=0.25)
        if full:
            for s in (0.25, 0.75): drums.add(hat(), b + s, 0.07, pan=-0.3)
            if b % 2 == 1: drums.add(clap(), b, 0.42, pan=0.05)
        elif b >= 4 and b % 2 == 1:
            drums.add(clap(tight=True), b, 0.25, pan=0.05)
    if b >= PEAK and b < END and b % 4 == 3:
        drums.add(hat(open_=True), b + 0.5, 0.12, pan=0.2)
    # ---- harmony, once a bar
    if b % 4 == 0 and b < END:
        L = 4 * BEAT + 0.1
        if sec_break:
            music.add(pad_chord(pad, L, (700, 2400), attack=0.2), b, 0.42)
        else:
            music.add(pad_chord(pad, L, 2400 if full else 1500, attack=0.02), b, 0.30)
    # ---- pluck arp (8ths), filtered in the hook
    if b < END:
        for h in (0, 0.5):
            nt = arp[int((b % 2) * 2 + h * 2)]
            g = 0.16 if b < MAIN else (0.2 if not sec_break else 0.22)
            music.add(pluck([nt], 0.2, 1800 if b < MAIN else 3200), b + h, g, pan=-0.2 if h else 0.2)
    # ---- bass (offbeat pump in full sections)
    if full or (b >= 8 and b < MAIN):
        for h in (0, 0.5):
            up = h == 0.5
            nt = broot[:-1] + str(int(broot[-1]) + (1 if up else 0))
            bass.add(bass_note(nt, BEAT / 2 * 0.9, 1000), b + h, 0.55 if h == 0 else 0.45)
    # ---- lead in the peak
    if PEAK <= b < END:
        for off, nt in LEAD.items():
            if int(off) == (b - PEAK) % 16:
                lead.add(pluck([nt, nt[:-1] + str(int(nt[-1]) - 1)], 0.35, 4200), b + (off - int(off)), 0.2, pan=0.1)

# ---- transitions + landings
drums.add(sub_drop(1.0, 80, 32), 0, 0.55); drums.add(crash(1.6), 0, 0.22)
for tb in (MAIN, BREAK, PEAK):
    fx.add(riser(2 * BEAT), tb - 2, 0.32)
    drums.add(crash(1.6), tb, 0.24); drums.add(sub_drop(1.0, 76, 30), tb, 0.5)
fx.add(snare_roll(2 * BEAT, 14), PEAK - 2, 0.55)
fx.add(crash(0.9)[::-1] * 0.7, GROOVE2 - 0.9 / BEAT, 0.2)
# end card: impact, resolve chord, bell motif, sparse arp tail
drums.add(kick(), END, 1.0); drums.add(sub_drop(1.4, 70, 28), END, 0.6); drums.add(crash(2.4), END, 0.3)
fx.add(riser(2 * BEAT), END - 2, 0.3)
music.add(pad_chord(["D3", "A3", "D4", "F#4", "A4", "E5"], 12 * BEAT, (5000, 900), attack=0.01, release=1.2), END, 0.5)
bass.add(bass_note("D1", 4 * BEAT, 500), END, 0.5)
for i, nt in enumerate(["A5", "D6", "F#6"]):
    fx.add(bell_tone(nt, 1.6), END + 2 + i * 0.5, 0.16, pan=-0.2 + 0.2 * i)
for b in range(END + 4, NB - 1):
    for h in (0, 0.5):
        nt = ["D5", "F#5", "A5", "F#5"][int((b % 2) * 2 + h * 2)]
        music.add(pluck([nt], 0.25, 1400), b + h, 0.1 * (1 - (b - END - 4) / (NB - END - 4)), pan=-0.2 if h else 0.2)

N = drums.n
duck = sidechain(kicks, drums.x.shape[1], 0.45, 0.11)
mix = drums.x + (bass.x + reverb(music.x, 0.35) + reverb(lead.x, 0.3)) * duck + reverb(fx.x, 0.2)
mix = mix[:, :N]
fade = int(0.6 * SR); mix[:, -fade:] *= np.linspace(1, 0, fade) ** 2
mix *= 10 ** (-3 / 20) / (np.abs(mix).max() + 1e-9)
sf.write(FILM / "audio" / "music.wav", mix.T, SR, subtype="PCM_24")

# ---- VO edit: speech onset on the beat
takes = json.load(open(HERE / "vo" / "takes.json"))
vo = np.zeros(N); words, phrases, prev_end = [], [], -1
for lid, onb in VO:
    tk = takes[lid]
    x, sr = sf.read(HERE / "vo" / f"{lid}.wav"); assert sr == SR
    on0 = tk["words"][0]["t0"]
    start = onb * BEAT - on0
    i = int(round(start * SR)); vo[i:i + len(x)] += x[:N - i]
    if start < prev_end: print(f"OVERLAP at {lid}")
    print(f"{lid}: onset beat {onb} ({onb*BEAT:.2f}s) .. {start + tk['dur']:.2f}s  gap {start - prev_end:.2f}s")
    prev_end = start + tk["dur"]
    ws = [{"w": w["w"], "t0": round(start + w["t0"], 3), "t1": round(start + w["t1"], 3), "line": lid} for w in tk["words"]]
    words += ws
vo = vo / (np.abs(vo).max() + 1e-9) * 10 ** (-1.5 / 20)
sf.write(FILM / "audio" / "vo.wav", np.stack([vo, vo]).T, SR, subtype="PCM_24")
json.dump({"words": words}, open(FILM / "words.json", "w"), indent=1)

grid_src = (drums.x[:, :N]).mean(axis=0)
grid = measure_beats(grid_src.astype(np.float32), SR, BPM, n_beats=NB + 1)
grid["beats"] = [b for b in grid["beats"] if b < DUR + 0.5]; grid["downbeats"] = grid["beats"][::4]
grid["sections"] = [{"name": n, "beat": b} for n, b in
                    [("hook", HOOK), ("main", MAIN), ("break", BREAK), ("groove", GROOVE2), ("peak", PEAK), ("end", END)]]
mono = mix.mean(axis=0); bar_s = grid["period"] * 4
grid["bar_energy"] = [round(float(np.sqrt(np.mean(mono[int(i * bar_s * SR):int((i + 1) * bar_s * SR)] ** 2))), 4) for i in range(NB // 4)]
grid["duration"] = DUR; grid["source"] = "bespoke score.py, grid measured on the drum stem"
(FILM / "beats.json").write_text(json.dumps(grid, indent=1))
print(f"grid: {grid['bpm']} bpm offset {grid['offset']*1000:.1f} ms, inliers {grid['fit_inliers']}, rms {grid['fit_residual_ms']} ms")
