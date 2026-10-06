"""Voiceover + captions for the Anaya's Way showreel.

Synthesizes the narration, places every line on the showreel's timeline, and writes:
  out/voiceover.wav            48 kHz stereo narration track (silence between lines)
  out/captions.srt             caption file (works for both the 16:9 and 9:16 cuts)
  out/voiceover-timeline.json  where each line landed and at what speed

Two engines:

  ElevenLabs (cloud): set ELEVENLABS_API_KEY in the environment, then
    python3 voiceover.py --engine elevenlabs --list-voices          # find a voice_id
    python3 voiceover.py --engine elevenlabs --voice-id <voice_id>  [--el-model eleven_multilingual_v2]
  Captions use ElevenLabs' character timestamps, so they are word-accurate.
  Every line is cached in out/tts-cache/, so re-runs don't spend credits.

  Kokoro (offline, open-weight):
    pip install kokoro-onnx soundfile
    # model files: github.com/thewh1teagle/kokoro-onnx/releases (model-files-v1.0)
    python3 voiceover.py --model kokoro-v1.0.int8.onnx --voices voices-v1.0.bin [--voice af_heart]

Afterwards run ./mix-voiceover.sh to duck the music and mux both cuts.
All narration copy comes from anayaswayimmigration.org.
"""
import argparse, base64, hashlib, json, os, re, subprocess, sys, urllib.error, urllib.request
import numpy as np
import soundfile as sf

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
MAX_SPEED = 1.15

# Kokoro pronunciation overrides (IPA as used by Kokoro / misaki).
OVERRIDES = {"ˈæneɪəz": "ɐnˈɑːjəz",            # Anaya's → "ah-NAH-yuhz"
             "ɐtˈɜːnilˈɛd": "ɐtˈɜːni lˈɛd"}     # keep "attorney" + "led" as two words
# ElevenLabs respellings: text sent to the API in place of a word (captions keep the original).
# Each respelling must stay ONE word so caption timing can map word-for-word. Example:
#   RESPELL = {"Anaya's": "Ah-NAH-yuhz"}
RESPELL = {}


# ------------------------------------------------------------------ shared helpers
def trim(x, sr, db=-42):
    """Drop leading/trailing silence so lines sit exactly on their cue. Returns (audio, seconds trimmed at head)."""
    w = max(1, int(sr * .01))
    env = np.convolve(np.abs(x), np.ones(w) / w, "same")
    on = np.where(env > 10 ** (db / 20) * max(1e-9, np.abs(x).max()))[0]
    if not len(on):
        return x, 0.0
    a, b = max(0, on[0] - int(sr * .02)), min(len(x), on[-1] + int(sr * .06))
    return x[a:b], a / sr


def resample(x, sr_in, sr_out):
    n = int(round(len(x) * sr_out / sr_in))
    return np.interp(np.linspace(0, len(x) - 1, n), np.arange(len(x)), x).astype(np.float32)


def proportional_words(text, dur):
    """Estimate per-word (start, end) by character length — used when the engine gives no timestamps."""
    words = text.split(); total = sum(len(w) + 1 for w in words); t, out = 0.0, []
    for w in words:
        d = dur * (len(w) + 1) / total; out.append((t, t + d)); t += d
    return out


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


# ------------------------------------------------------------------ Kokoro engine
class KokoroEngine:
    def __init__(self, a):
        from kokoro_onnx import Kokoro
        if not (a.model and a.voices):
            sys.exit("Kokoro needs --model and --voices (see the docstring).")
        self.k, self.voice = Kokoro(a.model, a.voices), a.voice

    def phonemes(self, text):
        ph = self.k.tokenizer.phonemize(text, "en-us")
        for x, y in OVERRIDES.items():
            ph = ph.replace(x, y)
        return ph

    def synth(self, text, speed, context=None):
        audio, sr = self.k.create(self.phonemes(text), voice=self.voice, speed=speed, is_phonemes=True,
                                  sentence_pause=.14, clause_pause=.05)
        audio, _ = trim(audio.astype(np.float32), sr)
        return audio, sr, proportional_words(text, len(audio) / sr)


# ------------------------------------------------------------------ ElevenLabs engine
API = "https://api.elevenlabs.io/v1"


def eleven_request(path, key, body=None):
    req = urllib.request.Request(API + path, data=json.dumps(body).encode() if body is not None else None,
                                 headers={"xi-api-key": key, "Content-Type": "application/json", "Accept": "application/json"},
                                 method="POST" if body is not None else "GET")
    try:
        with urllib.request.urlopen(req, timeout=120) as r:
            return json.loads(r.read())
    except urllib.error.HTTPError as e:
        detail = e.read().decode(errors="replace")[:400]
        hint = {401: "the API key was rejected: check ELEVENLABS_API_KEY.",
                403: "access denied. If this runs in a sandbox, allow api.elevenlabs.io in its network settings."}.get(e.code, "")
        sys.exit(f"ElevenLabs HTTP {e.code}: {detail}\n{hint}")
    except urllib.error.URLError as e:
        sys.exit(f"Could not reach api.elevenlabs.io ({e.reason}). Allow the host in this environment's network settings.")


def decode_mp3(data):
    """MP3 bytes → mono float32 at 44.1 kHz via ffmpeg."""
    p = subprocess.run(["ffmpeg", "-loglevel", "error", "-i", "pipe:0", "-f", "f32le", "-ac", "1", "-ar", "44100", "pipe:1"],
                       input=data, capture_output=True, check=True)
    return np.frombuffer(p.stdout, np.float32).copy(), 44100


def word_times_from_alignment(text, al, offset):
    """Character timestamps → per-word (start, end), shifted by the trimmed head `offset`."""
    chars, st, en = al["characters"], al["character_start_times_seconds"], al["character_end_times_seconds"]
    spoken = "".join(chars)
    words, pos = [], 0
    for w in text.split():
        i = spoken.find(w, pos)
        if i < 0:                                   # fall back gracefully if the API normalized the text
            i = pos
        j = min(len(chars) - 1, i + len(w) - 1)
        words.append((max(0.0, st[min(i, len(st) - 1)] - offset), max(0.0, en[j] - offset)))
        pos = i + len(w)
    return words


class ElevenLabsEngine:
    def __init__(self, a):
        self.key = os.environ.get("ELEVENLABS_API_KEY")
        if not self.key:
            sys.exit("Set ELEVENLABS_API_KEY in the environment (never paste keys into code or chat).")
        if not a.voice_id and not a.list_voices:
            sys.exit("Pass --voice-id (run with --list-voices to see the voices on your account).")
        self.voice_id, self.model, self.cache = a.voice_id, a.el_model, os.path.join(a.out, "tts-cache")
        self.settings = {"stability": a.stability, "similarity_boost": .75, "style": a.style, "use_speaker_boost": True}
        os.makedirs(self.cache, exist_ok=True)

    def list_voices(self):
        for v in eleven_request("/voices", self.key)["voices"]:
            labels = ", ".join(f"{k}: {x}" for k, x in (v.get("labels") or {}).items())
            print(f"{v['voice_id']}  {v['name']:<22} {labels}")

    def synth(self, text, speed, context=None):
        sent = " ".join(RESPELL.get(w, w) for w in text.split())
        body = {"text": sent, "model_id": self.model, "voice_settings": {**self.settings, "speed": round(speed, 3)}}
        if context:                                  # neighbouring lines keep intonation consistent across clips
            body.update({k: v for k, v in context.items() if v})
        h = hashlib.sha256(json.dumps([self.voice_id, body], sort_keys=True).encode()).hexdigest()[:20]
        path = os.path.join(self.cache, h + ".json")
        if os.path.exists(path):
            res = json.load(open(path))
        else:
            res = eleven_request(f"/text-to-speech/{self.voice_id}/with-timestamps?output_format=mp3_44100_128", self.key, body)
            json.dump(res, open(path, "w"))
        audio, sr = decode_mp3(base64.b64decode(res["audio_base64"]))
        audio, head = trim(audio, sr)
        al = res.get("alignment") or res.get("normalized_alignment")
        words = word_times_from_alignment(sent, al, head) if al else proportional_words(text, len(audio) / sr)
        return audio, sr, words


# ------------------------------------------------------------------ main
def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--engine", choices=["kokoro", "elevenlabs"], default="kokoro")
    ap.add_argument("--out", default=os.path.join(os.path.dirname(os.path.abspath(__file__)), "out"))
    ap.add_argument("--model"); ap.add_argument("--voices"); ap.add_argument("--voice", default="af_heart")
    ap.add_argument("--voice-id", help="ElevenLabs voice_id"); ap.add_argument("--list-voices", action="store_true")
    ap.add_argument("--el-model", default="eleven_multilingual_v2")
    ap.add_argument("--stability", type=float, default=.5); ap.add_argument("--style", type=float, default=.15)
    a = ap.parse_args()
    os.makedirs(a.out, exist_ok=True)
    eng = ElevenLabsEngine(a) if a.engine == "elevenlabs" else KokoroEngine(a)
    if a.list_voices:
        return eng.list_voices() if a.engine == "elevenlabs" else print("--list-voices is for --engine elevenlabs")

    track = np.zeros(int(DUR * SR_OUT), np.float32)
    cues, timeline = [], []
    for n, (start, end, text) in enumerate(SCRIPT):
        context = {"previous_text": SCRIPT[n - 1][2] if n else None, "next_text": SCRIPT[n + 1][2] if n + 1 < len(SCRIPT) else None}
        speed = 1.0
        audio, sr, words = eng.synth(text, speed, context)
        dur = len(audio) / sr
        if dur > end - start:                        # tighten delivery to fit the scene
            speed = min(MAX_SPEED, dur / (end - start) * 1.02)
            audio, sr, words = eng.synth(text, speed, context); dur = len(audio) / sr
        y = resample(audio, sr, SR_OUT)
        i0 = int(start * SR_OUT); track[i0:i0 + len(y)] += y[: len(track) - i0]
        nxt = SCRIPT[n + 1][0] if n + 1 < len(SCRIPT) else DUR
        timeline.append({"start": start, "end": round(start + dur, 3), "speed": round(speed, 3), "text": text,
                         "fits": start + dur <= nxt - .01})      # only flag real collisions with the next line
        # caption cues from per-word timings (exact for ElevenLabs, estimated for Kokoro)
        wi = 0
        for c in caption_chunks(text):
            k = len(c.split())
            cues.append((start + words[wi][0], start + words[wi + k - 1][1], c)); wi += k
    track *= 10 ** (-1 / 20) / max(1e-6, np.abs(track).max())     # normalize to -1 dBFS peak
    sf.write(os.path.join(a.out, "voiceover.wav"), np.stack([track, track], 1), SR_OUT, subtype="PCM_16")
    with open(os.path.join(a.out, "captions.srt"), "w") as f:
        for n, (s, e, c) in enumerate(cues, 1):
            nxt = cues[n][0] if n < len(cues) else DUR
            e = min(max(e + .3, s + 1.0), nxt - .04, DUR)            # linger a beat, never overlap the next cue
            f.write(f"{n}\n{srt_time(s)} --> {srt_time(e)}\n{c}\n\n")
    json.dump(timeline, open(os.path.join(a.out, "voiceover-timeline.json"), "w"), indent=2)
    for row in timeline:
        flag = "" if row["fits"] else "   ⚠ overlaps the next line: shorten it or adjust SCRIPT timing"
        print(f"{row['start']:6.2f}–{row['end']:6.2f}  x{row['speed']:.2f}  {row['text']}{flag}")


if __name__ == "__main__":
    main()
