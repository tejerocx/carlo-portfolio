# /// script
# dependencies = ["kokoro-onnx>=0.4", "soundfile", "numpy", "scipy"]
# ///
"""Voice-over takes (Kokoro, af_heart) + word timings -> audio/vo/<id>.wav, takes.json

    uv run agh-reel-2/audio/vo_takes.py <kokoro-dir>

Each sentence is synthesized on its own (exact sentence boundaries), trimmed, and joined with a short
breath. Inside a sentence, word timing comes from phoneme weight, each boundary snapped to the
nearest RMS dip (+-80 ms, >= 70 ms per word). Kokoro's ONNX graph exposes no durations.
"""
import json, re, sys
from pathlib import Path
import numpy as np, soundfile as sf
from scipy.signal import resample_poly
from kokoro_onnx import Kokoro

HERE = Path(__file__).resolve().parent
KD = Path(sys.argv[1])
VOICE, SPEED, SR_OUT = "af_heart", 1.08, 48000
LINES = [
    ("a", "Your skills. A new chapter? Start planning your career in Germany."),
    ("b", "Know your starting point. Your qualifications. Your experience. Your goal."),
    ("c", "Prepare for your profession. Research the language and qualification requirements."),
    ("d", "Make your next step count. Start the conversation with AGH."),
    ("e", "Message AGH German Pathway today."),
]
BREATH = {".": 0.17, "?": 0.22, "!": 0.2}
FIX = {"ɹˈaʊt": "ɹˈuːt"}
VOWELS = set("aeiouɑɐɒæəɘɚɛɜɝɞɤɨɪʊʌɔøœɯɵʉʏyᵻ")
k = Kokoro(str(KD / "kokoro-v1.0.onnx"), str(KD / "voices-v1.0.bin"))

def weight(ph):
    return max(1.0, sum(1.6 if (c in VOWELS or c == "ː") else 1.0 for c in ph if c not in "ˈˌ.,?!"))

def env_db(x, hop=0.005, win=0.02):
    h, n = int(SR_OUT * hop), int(SR_OUT * win); p = np.pad(x, (n // 2, n // 2))
    e = np.array([np.sqrt(np.mean(p[i:i + n] ** 2) + 1e-12) for i in range(0, len(x), h)])
    return e, 20 * np.log10(e / e.max()), hop

def sentence(text):
    ph = k.tokenizer.phonemize(text, "en-us")
    for a, b in FIX.items(): ph = ph.replace(a, b)
    a, sr = k.create(ph, voice=VOICE, speed=SPEED, is_phonemes=True)
    a = resample_poly(a, SR_OUT, sr).astype(np.float32)
    e, db, hop = env_db(a); idx = np.where(db > -38)[0]
    a = a[max(0, int((idx[0] * hop - 0.02) * SR_OUT)): int((idx[-1] * hop + 0.06) * SR_OUT)]
    e, db, hop = env_db(a); idx = np.where(db > -38)[0]; b0, b1 = idx[0], idx[-1]
    words, phw = text.split(), ph.split(); assert len(words) == len(phw), (words, phw)
    ws = np.array([weight(p) for p in phw]); cum = np.concatenate([[0], np.cumsum(ws)]) / ws.sum()
    bounds = b0 + cum * (b1 - b0); prior = bounds.copy(); mn = 0.07 / hop; r = int(0.08 / hop)
    for j in range(1, len(bounds) - 1):
        c = int(round(bounds[j]))
        lo = int(max(b0 + 1, c - r, bounds[j - 1] + mn)); hi = int(min(b1 - 1, c + r, prior[j + 1] - mn))
        bounds[j] = lo + int(np.argmin(e[lo:hi])) if hi > lo else max(prior[j], bounds[j - 1] + mn)
    return a, [(w, bounds[j] * hop, bounds[j + 1] * hop) for j, w in enumerate(words)]

out = {}
for lid, text in LINES:
    sents = re.findall(r"[^.?!]+[.?!]", text)
    audio, wl, t = [], [], 0.0
    for i, s in enumerate(sents):
        a, ws = sentence(s.strip())
        wl += [{"w": w, "t0": round(t + t0, 3), "t1": round(t + t1, 3)} for w, t0, t1 in ws]
        audio.append(a); t += len(a) / SR_OUT
        if i < len(sents) - 1:
            gap = BREATH[s.strip()[-1]]; audio.append(np.zeros(int(gap * SR_OUT), np.float32)); t += gap
    audio = np.concatenate(audio)
    sf.write(HERE / "vo" / f"{lid}.wav", audio, SR_OUT)
    out[lid] = {"text": text, "dur": round(len(audio) / SR_OUT, 3), "words": wl}
    print(f"{lid}: {len(audio)/SR_OUT:.2f}s  " + " ".join(f"{w['w']}@{w['t0']:.2f}" for w in wl))
json.dump(out, open(HERE / "vo" / "takes.json", "w"), indent=1)
