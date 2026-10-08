# /// script
# requires-python = ">=3.10"
# dependencies = ["librosa>=0.10", "numpy", "scipy", "soundfile"]
# ///
"""AVC Dubai: U.S. Pathways. Bespoke score: energetic premium house, F minor.

    MOTION_REEL_SKILL=<skill> uv run avc-reel/audio/score.py

124.8 BPM, 4/4, 52 beats = 25.0 s.
  bars 0-1  (b 0-8)    hook: kick from frame 0, filtered supersaw, rising arp, riser + snare roll
  bar  2    (b 8)      DROP: impact, full groove (4otf, claps, rolling offbeat bass, stabs, arp)
  bars 2-9  (b 8-38)   main groove; lead top-line from b 24; the four pathways ride on it
  b 38-40              two-beat break + snare roll into the recap
  bars 10-11 (b 40-48) recap + CTA, full groove, riser into the end card
  bar  12   (b 48-52)  end card: big resolve chord, crash, sub, ring-out
Writes audio/music.wav and beats.json (grid measured on the drum stem).
"""
import json
import os
import sys
from pathlib import Path

import numpy as np
import soundfile as sf


def _skill_dir():
    if os.environ.get("MOTION_REEL_SKILL"):
        return Path(os.environ["MOTION_REEL_SKILL"])
    found = sorted((Path.home() / ".claude/plugins").glob("**/skills/motion-reel/scripts/dsp.py"))
    if found:
        return found[-1].parent.parent
    sys.exit("set MOTION_REEL_SKILL to the folder that holds the motion-reel SKILL.md")


sys.path.insert(0, str(_skill_dir() / "scripts"))
from dsp import *  # noqa: E402,F403

HERE = Path(__file__).resolve().parent
FILM = HERE.parent
BPM = 124.8
BEAT = 60 / BPM
DUR = 25.0
NB = 52
DROP, BREAK, RECAP, END = 8, 38, 40, 48
seed(20261008)

# i - VI - III - VII in F minor: Fm, Db, Ab, Eb
PROG = [
    (["F3", "C4", "Ab4", "C5", "F5"], "F1"),
    (["Db3", "Ab3", "F4", "Ab4", "Db5"], "Db2"),
    (["Ab2", "Eb3", "C4", "Eb4", "Ab4"], "Ab1"),
    (["Eb3", "Bb3", "G4", "Bb4", "Eb5"], "Eb2"),
]
ARP = [  # 16th-note arp per chord, up an octave
    ["F5", "Ab5", "C6", "Ab5"], ["F5", "Ab5", "Db6", "Ab5"], ["Eb5", "Ab5", "C6", "Ab5"], ["Eb5", "G5", "Bb5", "G5"]]
LEAD = {  # top-line from b 24: (beat offset in bar, note, length in beats)
    0: [(0, "C6", 1.5), (1.5, "Ab5", 0.5), (2, "F5", 0.75), (3, "G5", 0.5), (3.5, "Ab5", 0.5)],
    1: [(0, "F6", 1.0), (1, "Eb6", 0.5), (1.5, "Db6", 1.0), (3, "C6", 1.0)],
    2: [(0, "C6", 1.5), (1.5, "Eb6", 0.5), (2, "C6", 0.75), (3, "Bb5", 0.5), (3.5, "Ab5", 0.5)],
    3: [(0, "G5", 1.0), (1, "Bb5", 1.0), (2, "Eb6", 1.5), (3.5, "G5", 0.5)],
}


def snare():
    n = int(0.25 * SR)
    t = tvec(n)
    body = np.sin(2 * np.pi * 190 * t * (1 + 0.4 * np.exp(-t / 0.01))) * np.exp(-t / 0.05)
    nz = filt(rng.standard_normal(n), "bandpass", [1500, 8000]) * np.exp(-t / 0.07)
    return np.tanh(1.5 * (body * 0.6 + nz)) * (1 - np.exp(-t / 0.0005))


def lead(note, length):
    n = int(length * SR)
    t = tvec(n)
    f = hz(note) * (1 + 0.004 * np.sin(2 * np.pi * 5.5 * np.maximum(t - 0.12, 0)))
    x = saw(f, n) + saw(f * 1.006, n) * 0.7 + np.sin(2 * np.pi * np.cumsum(f / 2) / SR) * 0.5
    x = sweep_filter(x, 900 + 3800 * np.exp(-t / 0.18), "lowpass", 1.2)
    return x * adsr(n, 0.006, 0.2, 0.6, 0.06) * 0.5


def stab(notes, length, cutoff=5200):
    return pad_chord(notes, length, (cutoff, cutoff * 0.35), attack=0.003, release=0.05, voices=5, detune=0.16)


def main():
    drums, bass, music, fx = (Bus(DUR, BPM) for _ in range(4))
    kicks = []

    for b in range(NB):
        bar = b // 4
        chord, root = PROG[bar % 4]
        intro, main_ = b < DROP, DROP <= b < END
        brk = BREAK <= b < RECAP
        # ---------------- drums
        if b < END and not brk:
            drums.add(kick(), b, 0.85 if intro else 1.0)
            kicks.append(b * BEAT)
        if b == BREAK:
            drums.add(kick(), b, 1.0)
            kicks.append(b * BEAT)
        if main_ and not brk:
            if b % 2 == 1:
                drums.add(clap(), b, 0.55, pan=0.04)
                drums.add(snare(), b, 0.25, pan=-0.04)
            drums.add(hat(open_=True), b + 0.5, 0.2, pan=0.2)
            for s in (0.25, 0.75):
                drums.add(hat(), b + s, 0.09, pan=-0.3)
            drums.add(hat(), b, 0.06, pan=0.35)
        elif intro:
            drums.add(hat(), b + 0.5, 0.14 + 0.02 * b, pan=0.25)
            if b >= 4:
                drums.add(hat(), b + 0.25, 0.06, pan=-0.3)
                drums.add(hat(), b + 0.75, 0.06, pan=-0.3)
        # ---------------- harmony
        if b % 4 == 0 and b < END:
            L = 4 * BEAT + 0.05
            if intro:
                # filtered supersaw bed opening up into the drop
                lo, hi = (380, 1100) if b == 0 else (1100, 4200)
                music.add(pad_chord(chord, L, (lo, hi), attack=0.02, voices=5, detune=0.14), b, 0.45)
            else:
                music.add(pad_chord(chord, L, 1800, attack=0.04, voices=5, detune=0.1), b, 0.18)
        if main_ and not brk:
            # off-beat stabs (the energetic 'house piano' push)
            pos = b % 4
            if pos in (0, 2):
                music.add(stab(chord[1:], BEAT * 0.45), b + (0 if pos == 0 else 0.5), 0.34, pan=-0.1)
            if pos == 1:
                music.add(stab(chord[1:], BEAT * 0.3), b + 0.5, 0.26, pan=0.12)
            # rolling bass: root on 1/8 offbeats + octave pickup
            for h, g, up in ((0.5, 0.72, 0), (0.75, 0.42, 12)):
                nt = note_name(midi(root) + 12 + up)
                bass.add(bass_note(nt, BEAT * 0.24, 1300), b + h, g)
            bass.add(bass_note(note_name(midi(root) + 12), BEAT * 0.2, 700), b, 0.32)
        # ---------------- arp (intro rises in, main sits back)
        if b < END and not brk:
            pat = ARP[bar % 4]
            for k in range(4):
                g = (0.06 + 0.16 * (b / DROP)) if intro else 0.13
                fx_cut = 1400 + 3000 * (b / DROP) if intro else 3600
                music.add(pluck([pat[k]], 0.16, fx_cut), b + k * 0.25, g, pan=0.25 * (1 if k % 2 else -1))
        # ---------------- lead
        if 24 <= b < BREAK and b % 4 == 0:
            for off, nt, ln in LEAD[bar % 4]:
                music.add(lead(nt, ln * BEAT * 0.95), b + off, 0.22, pan=0.05)
        if RECAP <= b < END and b % 4 == 0:
            for off, nt, ln in LEAD[(bar + 2) % 4]:
                music.add(lead(nt, ln * BEAT * 0.95), b + off, 0.2, pan=0.05)

    # ---------------- transitions
    fx.add(riser(4 * BEAT), DROP - 4, 0.34)
    for k in range(16):  # accelerating snare roll into the drop (b 6-8)
        p = k / 15
        drums.add(snare(), DROP - 2 + 2 * (1 - (1 - p) ** 1.6), 0.08 + 0.3 * p, pan=0.1 * (k % 2 * 2 - 1))
    fx.add(crash(1.8), DROP, 0.32)
    fx.add(sub_drop(1.2, 80, 30), DROP, 0.65)
    rev = crash(1.2)[::-1]
    fx.add(rev, DROP - 1.2 / BEAT, 0.22)
    # break into the recap: filtered pad swell + roll
    fx.add(riser(2 * BEAT), BREAK, 0.28)
    for k in range(8):
        p = k / 7
        drums.add(snare(), BREAK + 1 + (1 - (1 - p) ** 1.5), 0.1 + 0.28 * p)
    fx.add(crash(1.6), RECAP, 0.3)
    fx.add(sub_drop(1.0, 75, 32), RECAP, 0.5)
    # riser + reverse cymbal into the end card
    fx.add(riser(4 * BEAT), END - 4, 0.3)
    fx.add(rev, END - 1.2 / BEAT, 0.25)
    # ---------------- the end: big resolve
    final, froot = PROG[0]
    music.add(pad_chord(final + ["C6"], 4 * BEAT + 1.2, (6000, 1200), attack=0.004, release=0.9, voices=5, detune=0.15), END, 0.6)
    music.add(stab(final[1:], BEAT * 0.6, 7000), END, 0.4)
    bass.add(bass_note(note_name(midi(froot) + 12), 3 * BEAT, 600), END, 0.6)
    drums.add(kick(), END, 1.1)
    kicks.append(END * BEAT)
    fx.add(crash(2.6), END, 0.36)
    fx.add(sub_drop(1.6, 70, 28), END, 0.6)
    for k, nt in enumerate(["C6", "F6", "Ab6", "C7"]):  # sparkle on the logo
        music.add(pluck([nt], 0.5, 6000), END + 0.5 + k * 0.25, 0.14 - 0.02 * k, pan=0.3 * (k % 2 * 2 - 1))

    n = drums.n
    duck = sidechain(kicks, drums.x.shape[1], 0.55, 0.11)
    mix = drums.x + fx.x + (bass.x + reverb(music.x, 0.32)) * duck
    mix = mix[:, :n]
    fade = int(0.6 * SR)
    mix[:, -fade:] *= np.linspace(1, 0, fade) ** 2
    mix *= 10 ** (-3 / 20) / (np.abs(mix).max() + 1e-9)
    sf.write(HERE / "music.wav", mix.T, SR, subtype="PCM_24")

    grid = measure_beats(drums.x[:, :n].mean(axis=0).astype(np.float32), SR, BPM, n_beats=NB + 1)
    grid["beats"] = [x for x in grid["beats"] if x < DUR + 0.5]
    grid["downbeats"] = grid["beats"][::4]
    grid["sections"] = [{"name": "intro", "beat": 0}, {"name": "main", "beat": DROP},
                        {"name": "break", "beat": BREAK}, {"name": "recap", "beat": RECAP}, {"name": "end", "beat": END}]
    mono = mix.mean(axis=0)
    bs = grid["period"] * 4
    grid["bar_energy"] = [round(float(np.sqrt(np.mean(mono[int((grid["offset"] + i * bs) * SR):int((grid["offset"] + (i + 1) * bs) * SR)] ** 2) + 1e-12)), 4)
                          for i in range(int(DUR / bs))]
    grid["duration"] = DUR
    grid["source"] = f"bespoke score.py, F minor house {BPM} bpm, grid measured on the drum stem"
    (FILM / "beats.json").write_text(json.dumps(grid, indent=1))
    print(grid["source"])
    print(f"grid: {grid['bpm']} bpm, offset {grid['offset'] * 1000:.1f} ms, {len(grid['beats'])} beats, "
          f"fit {grid['fit_inliers']} inliers, rms {grid['fit_residual_ms']} ms")


if __name__ == "__main__":
    main()
