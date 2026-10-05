"""Voiceover + captions for the Anaya's Way showreel.

Synthesizes the narration with Kokoro (open-weight neural TTS, runs offline),
places every line on the showreel's timeline, and writes:
  out/voiceover.wav   48 kHz stereo narration track (silence between lines)
  out/captions.srt    caption file (works for both the 16:9 and 9:16 cuts)

  pip install kokoro-onnx soundfile
  # model files: github.com/thewh1teagle/kokoro-onnx/releases (model-files-v1.0)
  python3 voiceover.py --model kokoro-v1.0.int8.onnx --voices voices-v1.0.bin [--voice af_heart]

All narration copy comes from anayaswayimmigration.org.
"""
import argparse, json, os, re
import numpy as np
import soundfile as sf
from kokoro_onnx import Kokoro

SR_OUT, DUR = 48000, 32.0

# (start, latest end, text). Short lines land exactly on their visual beat.
SCRIPT = [
    (0.35, 4.55, "Serious cases. Structured strategy. Nationwide representation."),
    (4.80, 8.75, "Everyone deserves safety, dignity, and a fair chance to present their case."),
    (9.25, 14.95, "We represent asylum, U and T visa, VAWA, J-1 waiver, and family immigration cases."),
    (15.30, 21.15, "Based in Arkansas, serving clients nationwide. Distance is not a barrier to quality representation."),
    (21.30, 22.15, "Attorney-led."),
    (22.65, 23.70, "Mission-driven."),
    (23.85, 24.90, "Trauma-informed."),
    (25.00, 26.00, "Nationwide."),
    (27.40, 28.80, "Anaya's Way Immigration."),
    (29.00, 29.95, "Free case review."),
    (30.05, 31.90, "No obligation. No pressure."),
]
# Pronunciation overrides (IPA as used by Kokoro / misaki).
OVERRIDES = {"ˈæneɪəz": "ɐnˈɑːjəz",            # Anaya's → "ah-NAH-yuhz"
             "ɐtˈɜːnilˈɛd": "ɐtˈɜːni lˈɛd"}     # keep "attorney" + "led" as two words


def phonemes(k, text):
    ph = k.tokenizer.phonemize(text, "en-us")
    for a, b in OVERRIDES.items():
        ph = ph.replace(a, b)
    return ph


def trim(x, sr, db=-42):
    """Drop leading/trailing silence so lines sit exactly on their cue."""
    env = np.convolve(np.abs(x), np.ones(int(sr * .01)) / int(sr * .01), "same")
    on = np.where(env > 10 ** (db / 20) * np.abs(x).max())[0]
    if not len(on):
        return x
    a, b = max(0, on[0] - int(sr * .02)), min(len(x), on[-1] + int(sr * .06))
    return x[a:b]


def synth(k, text, voice, speed):
    audio, sr = k.create(phonemes(k, text), voice=voice, speed=speed, is_phonemes=True, sentence_pause=.14, clause_pause=.05)
    return trim(audio.astype(np.float32), sr), sr


def resample(x, sr_in, sr_out):
    n = int(round(len(x) * sr_out / sr_in))
    return np.interp(np.linspace(0, len(x) - 1, n), np.arange(len(x)), x).astype(np.float32)


def caption_chunks(text, limit=42):
    """Readable caption phrases: whole sentences when short, else comma-groups packed up to `limit` chars."""
    out = []
    for sent in [x.strip() for x in re.split(r"(?<=[.])\s+", text) if x.strip()]:
        if len(sent) <= limit:
            out.append(sent); continue
        cur = ""
        for part in [x.strip() for x in re.split(r"(?<=,)\s+", sent)]:
            if cur and len(cur) + 1 + len(part) > limit:
                out.append(cur); cur = part
            else:
                cur = (cur + " " + part).strip()
            while len(cur) > limit:                   # long clause: split at the space nearest the middle
                mid = len(cur) // 2
                cut = min((i for i, ch in enumerate(cur) if ch == " "), key=lambda i: abs(i - mid))
                out.append(cur[:cut]); cur = cur[cut + 1:]
        if cur:
            out.append(cur)
    return out


def srt_time(s):
    ms = int(round(s * 1000)); h, ms = divmod(ms, 3600000); m, ms = divmod(ms, 60000); sec, ms = divmod(ms, 1000)
    return f"{h:02}:{m:02}:{sec:02},{ms:03}"


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--model", required=True); ap.add_argument("--voices", required=True)
    ap.add_argument("--voice", default="af_heart"); ap.add_argument("--out", default=os.path.join(os.path.dirname(__file__), "out"))
    a = ap.parse_args()
    os.makedirs(a.out, exist_ok=True)
    k = Kokoro(a.model, a.voices)
    track = np.zeros(int(DUR * SR_OUT), np.float32)
    cues, timeline = [], []
    for start, end, text in SCRIPT:
        speed = 1.0
        audio, sr = synth(k, text, a.voice, speed)
        dur = len(audio) / sr
        if dur > end - start:                        # tighten delivery to fit the scene
            speed = min(1.15, dur / (end - start) * 1.02)
            audio, sr = synth(k, text, a.voice, speed); dur = len(audio) / sr
        y = resample(audio, sr, SR_OUT)
        i0 = int(start * SR_OUT); track[i0:i0 + len(y)] += y[: len(track) - i0]
        timeline.append({"start": start, "end": round(start + dur, 3), "speed": round(speed, 3), "text": text})
        # caption cues: time each phrase proportionally to its length within the spoken line
        chunks = caption_chunks(text); total = sum(len(c) for c in chunks); t = start
        for c in chunks:
            d = dur * len(c) / total
            cues.append((t, t + d, c)); t += d
    # gentle broadcast-style polish: normalize to -1 dBFS peak
    track *= 10 ** (-1 / 20) / max(1e-6, np.abs(track).max())
    sf.write(os.path.join(a.out, "voiceover.wav"), np.stack([track, track], 1), SR_OUT, subtype="PCM_16")
    with open(os.path.join(a.out, "captions.srt"), "w") as f:
        for n, (s, e, c) in enumerate(cues, 1):
            nxt = cues[n][0] if n < len(cues) else DUR
            e = min(max(e + .3, s + 1.0), nxt - .04, DUR)   # linger a beat, never overlap the next cue
            f.write(f"{n}\n{srt_time(s)} --> {srt_time(e)}\n{c}\n\n")
    json.dump(timeline, open(os.path.join(a.out, "voiceover-timeline.json"), "w"), indent=2)
    for row in timeline:
        print(f"{row['start']:6.2f}–{row['end']:6.2f}  x{row['speed']:.2f}  {row['text']}")


if __name__ == "__main__":
    main()
