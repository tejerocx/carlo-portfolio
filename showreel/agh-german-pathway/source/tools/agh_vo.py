"""Phrase-by-phrase VO with per-word timings (phoneme-proportional inside each trimmed phrase)."""
import json, numpy as np, soundfile as sf
from kokoro_onnx import Kokoro
k = Kokoro("voices/kokoro-v1.0.onnx", "voices/voices-v1.0.bin")
VOICE, SPEED = "am_fenrir", 1.22
# (id, spoken text, caption text)
PH = [
 ("p1", "Germany is calling!", "Germany is calling!"),
 ("p2", "Waiting for a job offer before planning your move?", "Waiting for a job offer before planning your move?"),
 ("p3", "Start with your goal!", "Start with your goal!"),
 ("p4", "Explore routes that fit your qualifications and plans.", "Explore routes that fit your qualifications and plans."),
 ("p5", "No offer yet?", "No offer yet?"),
 ("p6", "The Opportunity Card is a job-search route for eligible applicants.", "The Opportunity Card is a job-search route for eligible applicants."),
 ("p7", "Your next chapter starts now!", "Your next chapter starts now!"),
 ("p8", "Check your route, and prepare your next step.", "Check your route, and prepare your next step."),
 ("p9", "Message A G H German Pathway today!", "Message AGH German Pathway today!"),
]
out = {}
for pid, spoken, cap in PH:
    a, sr = k.create(spoken, voice=VOICE, speed=SPEED, lang="en-us")
    env = np.convolve(np.abs(a), np.ones(240) / 240, "same")
    idx = np.where(env > 0.012)[0]
    a = a[max(0, idx[0] - 240): idx[-1] + 480]
    sf.write(f"agh/vo/{pid}.wav", a, sr)
    dur = len(a) / sr
    words = cap.split()
    spoken_words = spoken.replace("A G H", "AGH").split()
    weights = []
    for w in spoken_words:
        ph = k.tokenizer.phonemize("A G H" if w == "AGH" else w, "en-us")
        weights.append(len(ph.replace(" ", "")) + 1.5)
    weights = np.array(weights) / sum(weights)
    lead = 0.01; speech = dur - lead - 0.02
    starts = lead + np.concatenate([[0], np.cumsum(weights)[:-1]]) * speech
    out[pid] = {"dur": round(dur, 3), "words": [[w, round(float(s), 3)] for w, s in zip(words, starts)]}
    print(pid, round(dur, 2))
json.dump(out, open("agh/vo/timing.json", "w"), indent=1)
