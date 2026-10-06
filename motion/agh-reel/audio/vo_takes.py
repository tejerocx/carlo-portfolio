# /// script
# dependencies = ["kokoro-onnx>=0.4", "soundfile", "numpy", "scipy"]
# ///
"""Voice-over takes (Kokoro, af_heart) + estimated word timings -> audio/vo/<id>.wav, takes.json

    uv run agh-reel/audio/vo_takes.py <kokoro-dir>

Word timing: Kokoro's ONNX graph exposes no durations, so each word's share of a pause-free span is
estimated from its phoneme weight, then each boundary snaps to the nearest RMS dip (+-80 ms).
"""
import json, re, sys
from pathlib import Path
import numpy as np, soundfile as sf
from scipy.signal import resample_poly
from kokoro_onnx import Kokoro

HERE = Path(__file__).resolve().parent
KD = Path(sys.argv[1])
VOICE, SPEED = "af_heart", 1.04
LINES = [
    ("a", "Dreaming of Germany? Wondering if you need a job offer first?"),
    ("b", "Start with your goal. Explore routes that fit your qualifications and plans."),
    ("c", "No offer yet? The Opportunity Card is a job-search route for eligible applicants. Requirements apply."),
    ("d", "This is your next chapter. Check your route. Prepare your next step."),
    ("e", "Message AGH German Pathway today."),
]
FIX = {"ɹˈaʊt": "ɹˈuːt"}  # 'route' as "root"
VOWELS = set("aeiouɑɐɒæəɘɚɛɜɝɞɤɨɪʊʌɔøœɯɵʉʏyᵻ")

k = Kokoro(str(KD / "kokoro-v1.0.onnx"), str(KD / "voices-v1.0.bin"))
SR_OUT = 48000

def weight(ph):
    w = 0.0
    for ch in ph:
        if ch in "ˈˌ.,?!": continue
        w += 1.6 if ch in VOWELS or ch == "ː" else 1.0
    return max(w, 1.0)

def rms_env(x, sr, hop=0.005, win=0.02):
    h, n = int(sr * hop), int(sr * win)
    pad = np.pad(x, (n // 2, n // 2))
    return np.array([np.sqrt(np.mean(pad[i:i + n] ** 2) + 1e-12) for i in range(0, len(x), h)]), hop

out = {}
for lid, text in LINES:
    ph = k.tokenizer.phonemize(text, "en-us")
    for a, b in FIX.items(): ph = ph.replace(a, b)
    audio, sr = k.create(ph, voice=VOICE, speed=SPEED, is_phonemes=True)
    audio = resample_poly(audio, SR_OUT, sr).astype(np.float32)
    env, hop = rms_env(audio, SR_OUT)
    db = 20 * np.log10(env / env.max())
    voiced = db > -38
    idx = np.where(voiced)[0]
    s0, s1 = idx[0], idx[-1]
    # trim with 30 ms head, 120 ms tail
    a0 = max(0, int((s0 * hop - 0.03) * SR_OUT)); a1 = min(len(audio), int((s1 * hop + 0.12) * SR_OUT))
    audio = audio[a0:a1]
    env, hop = rms_env(audio, SR_OUT); db = 20 * np.log10(env / env.max()); voiced = db > -38
    # spans of speech separated by >= 120 ms of silence
    spans, on, gap = [], None, 0
    for i, v in enumerate(voiced):
        if v:
            if on is None: on = i
            gap = 0; last = i
        elif on is not None:
            gap += 1
            if gap * hop >= 0.12: spans.append((on, last)); on = None
    if on is not None: spans.append((on, last))
    words = text.split(); phw = ph.split()
    assert len(words) == len(phw), (words, phw)
    # group words into chunks ending at . ? ! , (each chunk should be one span)
    chunks, cur = [], []
    for i, w in enumerate(words):
        cur.append(i)
        if re.search(r"[.?!,]$", w): chunks.append(cur); cur = []
    if cur: chunks.append(cur)
    if len(chunks) != len(spans):
        print(f"  {lid}: {len(chunks)} chunks vs {len(spans)} spans -> merging to fit")
        # fall back: map chunks proportionally onto the whole voiced range
        spans = [(spans[0][0], spans[-1][1])]; chunks = [list(range(len(words)))]
    wl = []
    for ch, (b0, b1) in zip(chunks, spans):
        ws = np.array([weight(phw[i]) for i in ch]); cum = np.concatenate([[0], np.cumsum(ws)]) / ws.sum()
        bounds = b0 + cum * (b1 - b0)
        prior = bounds.copy(); mn = 0.07 / hop
        for j in range(1, len(bounds) - 1):  # snap inner boundaries to RMS dips, keep >= 70 ms per word
            c = int(round(bounds[j])); r = int(0.08 / hop)
            lo = int(max(b0 + 1, c - r, bounds[j - 1] + mn)); hi = int(min(b1 - 1, c + r, prior[j + 1] - mn))
            if hi > lo: bounds[j] = lo + int(np.argmin(env[lo:hi]))
            else: bounds[j] = max(prior[j], bounds[j - 1] + mn)
        for j, i in enumerate(ch):
            wl.append({"w": words[i], "t0": round(bounds[j] * hop, 3), "t1": round(bounds[j + 1] * hop, 3)})
    sf.write(HERE / "vo" / f"{lid}.wav", audio, SR_OUT)
    out[lid] = {"text": text, "dur": round(len(audio) / SR_OUT, 3), "words": wl}
    print(f"{lid}: {len(audio)/SR_OUT:.2f}s  spans={[(round(a*hop,2), round(b*hop,2)) for a,b in spans]}")
json.dump(out, open(HERE / "vo" / "takes.json", "w"), indent=1)
