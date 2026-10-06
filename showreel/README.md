# Smash Grove — Motion Showreel

`smash-grove-showreel.mp4`: 1080×1920 (9:16), 33 s, 30 fps (rendered at 60 fps and frame-blended for motion blur), H.264 + AAC with voiceover.

| Time | Scene |
|---|---|
| 0–4 s | Hook: "Your court. Your time. Zero hassle." Kinetic type; the ball in "ZERO" zooms into the next scene |
| 4–8 s | Brand reveal: bamboo grows in, badge assembles, SMASH GROVE logo drops in |
| 8–24 s | App walkthrough in a 3D phone: pick a court → choose a time → fill in details → pay and get confirmed (confetti and an email notification) |
| 24–28 s | "No calls. No waiting. Just play." Montage built from the campaign photos |
| 28–33 s | End card: Scan. Book. Play. with a working QR code to smashgrove.com |

## How it's built (`source/`)
- `index.html`: the whole composition. Every element is a pure function of time, `render(t)`, so each frame is deterministic.
- `render.js`: Playwright drives headless Chromium frame by frame and pipes the frames to ffmpeg.
- `audio.py`: a procedural 120 BPM track (scene cuts land on bar lines), sound design, and a voiceover mix with ducking.
- `tools/vo.py`: generates the voiceover with Kokoro TTS (`af_bella` voice).

Rebuild: `npm i`, run `tools/vo.py` (writes `../vo/`), `node render.js`, `python3 audio.py`, then concat `out/seg*.mp4` and mux it with `out/soundtrack.wav`. The ffmpeg command is in the commit message.
