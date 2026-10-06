# Anaya's Way Immigration: Motion Showreel

A 32-second motion piece for **Anaya's Way Immigration** in two formats, both 60 fps with motion blur:

| Format | File | Use |
|--------|------|-----|
| Landscape 16:9, 1920×1080 | [`anayas-way-showreel-16x9.mp4`](anayas-way-showreel-16x9.mp4) | Website hero, YouTube, LinkedIn, presentations |
| Vertical 9:16, 1080×1920 | [`anayas-way-showreel-9x16.mp4`](anayas-way-showreel-9x16.mp4) | Instagram Reels / Stories, TikTok, YouTube Shorts |
| **Landscape + voiceover** | [`anayas-way-showreel-16x9-voiceover.mp4`](anayas-way-showreel-16x9-voiceover.mp4) | Same picture, narrated, with an embedded English subtitle track |
| **Vertical + voiceover** | [`anayas-way-showreel-9x16-voiceover.mp4`](anayas-way-showreel-9x16-voiceover.mp4) | Same picture, narrated, with an embedded English subtitle track |
| Captions | [`anayas-way-showreel.en.srt`](anayas-way-showreel.en.srt) | Upload as closed captions (YouTube, LinkedIn, Facebook, etc.); fits both cuts |

Everything is built in code from one responsive engine. The type, iconography, US map, logo and soundtrack
(warm D-major piano that builds into a driving beat) are all procedural, so both cuts stay in sync frame for frame.
All copy comes from the organization's own website.

## Storyboard (120 BPM)

The visual thread is **"the Way"**: one amber line that draws the path through the whole film. It's the
opening line, the brush wipe, the underline under SAFETY, the flight paths across the map, the values rail,
and finally the swoosh under the wordmark.

| Time | Chapter | What happens |
|------|---------|--------------|
| 0:00–0:04 | **01 Precision** | *IMMIGRATION, DONE WITH PRECISION.* decodes in, then *SERIOUS CASES. / STRUCTURED STRATEGY. / NATIONWIDE REPRESENTATION.* stack in on the beat. |
| 0:04 | Brush wipe | An amber-edged brush stroke paints in the next scene. |
| 0:04–0:09 | **02 Mission** | *Everyone deserves SAFETY. DIGNITY. AND A FAIR CHANCE to present their case.* with a hand-drawn underline and a marker highlight. |
| 0:09 | Whip pan | Motion-blurred whip into the services scene. |
| 0:09–0:15 | **03 Services** | *WE REPRESENT* slot-machine: Asylum · U Visa · T Visa · VAWA · SIJS · TPS · J-1 Waivers · Family cases. Then three practice-area cards. |
| 0:15–0:21 | **04 Nationwide** | Dots on the US map ripple out from Arkansas, which lights up as home base. Flight paths reach across the country. *Distance is not a barrier to quality representation.* |
| 0:21–0:26 | **05 Values** | Attorney-Led · Mission-Driven · Trauma-Informed · Nationwide, each with a drawn-on icon, on a progress rail. *501(c)(3) nonprofit.* |
| 0:26–0:32 | **Identity + CTA** | The emblem builds (ring, globe, Liberty rising, torch igniting) and the wordmark lands. A cursor clicks **Free Case Review**. *No obligation. No pressure.* Then the URL and the attorney-advertising disclaimer. |

## Voiceover

Narration uses the voice `af_heart` from [Kokoro](https://github.com/thewh1teagle/kokoro-onnx), an open-weight
neural text-to-speech model that runs offline. The script uses only copy from the website:

| Time | Line |
|------|------|
| 0:00 | Serious cases. Structured strategy. Nationwide representation. |
| 0:04 | Everyone deserves safety, dignity, and a fair chance to present their case. |
| 0:09 | We represent asylum, U and T visa, VAWA, J-1 waiver, and family immigration cases. |
| 0:15 | Based in Arkansas, serving clients nationwide. Distance is not a barrier to quality representation. |
| 0:21 | Attorney-led. · Mission-driven. · Trauma-informed. · Nationwide. *(each on its value's beat)* |
| 0:27 | Anaya's Way Immigration. |
| 0:29 | Free case review. *(as the cursor clicks the button)* · No obligation. No pressure. |

- **Pronunciation:** *Anaya's* is set to **ah-NAH-yuhz** with a phoneme override in `voiceover.py` (`OVERRIDES`).
  Edit that line if the organization says it differently.
- **Mix:** the voice gets a high-pass, light compression and a little presence. The music is side-chain ducked
  under it, and the master is set to -14 LUFS / -1.5 dBTP, the usual target for social and web platforms.
- **Checked by machine:** the final mix was transcribed back with Whisper (base.en). Every line came back
  as scripted.

Rebuild: `python3 voiceover.py --model kokoro-v1.0.int8.onnx --voices voices-v1.0.bin [--voice af_heart]`,
then `./mix-voiceover.sh`. Other voices to try: `af_bella`, `af_nicole`, `am_michael`, `bf_emma`.

### Using an ElevenLabs voice instead

`voiceover.py` has an ElevenLabs engine. It uses the same script and timing, and the same mix and mux step.

1. Put your API key in the environment as `ELEVENLABS_API_KEY`. Keep it out of the code and the chat.
   A key restricted to *Text to Speech* (plus *Voices: read* for `--list-voices`) is enough.
2. If you run this in a sandbox with restricted networking, allow `api.elevenlabs.io`.
3. Run:

```bash
python3 voiceover.py --engine elevenlabs --list-voices              # pick a voice_id
python3 voiceover.py --engine elevenlabs --voice-id <voice_id>      # → out/voiceover.wav + out/captions.srt
./mix-voiceover.sh                                                  # → out/*-voiceover.mp4 (both cuts)
```

- Uses the `with-timestamps` endpoint, so the captions are **word-accurate** (from ElevenLabs' character timings).
- Each line is generated with its neighbours as `previous_text`/`next_text`, so the intonation flows across clips.
- Responses are cached in `out/tts-cache/`. Re-running costs nothing unless the text, voice or settings change.
- If a line runs long, it's regenerated faster (up to 1.15×). The run prints a ⚠ for any line that would still
  overlap the next one; shorten that line or adjust its window in `SCRIPT`.
- Options: `--el-model` (default `eleven_multilingual_v2`), `--stability` (0.5), `--style` (0.15).
- Pronunciation: if the voice says *Anaya's* wrong, add a one-word respelling to `RESPELL`
  (for example `{"Anaya's": "Ah-NAH-yuhz"}`). Captions still show the real spelling.
- Cost: the full script is about 600 characters per take, plus any speed retries.

## Files

- `index.html` + `showreel.js`: the animation. Serve the folder and open `index.html` (landscape) or
  `index.html?v=1` (vertical). Click to restart; `?t=27.6` freezes a frame.
- `audio.cjs`: the procedural soundtrack. It writes `out/soundtrack.wav`, which both cuts share.
- `voiceover.py` + `mix-voiceover.sh`: narration, captions, ducked mix and muxing.
- `render.cjs`: the headless Chromium (Playwright) to ffmpeg renderer.
- `us-map.js`: US states (us-atlas / Census, Albers USA) as dots and borders, with Arkansas flagged.
- `fonts/`: Inter Tight, Inter, Instrument Serif (SIL OFL).

## Re-render

```bash
node audio.cjs
NODE_PATH=$(npm root -g) node render.cjs               # → out/anayas-way-showreel-16x9.mp4
NODE_PATH=$(npm root -g) node render.cjs --vertical    # → out/anayas-way-showreel-9x16.mp4
NODE_PATH=$(npm root -g) node render.cjs --vertical --stills 6,27.6   # quick PNG checks
```

The disclaimer on the end card (*"Attorney advertising. Prior results do not guarantee similar outcomes."*)
is the one shown on the website. Keep it in any edit used as advertising.
