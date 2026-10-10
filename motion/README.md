# AGH German Pathway showreels: render on your own computer

Two 9:16 showreels live here. Each is a web page whose canvas draws one frame of the video for
any moment in time. The render script opens that page in a hidden browser, captures every frame
and encodes the MP4 with the finished audio. Running it on your own machine costs no cloud credits.

| Folder | Video | Length |
|---|---|---|
| `agh-reel/` | Showreel I: Berlin, Hamburg, Heidelberg, Bavaria | 34 s |
| `agh-reel-2/` | Showreel II: Cologne, Dresden, Munich, Frankfurt | 33.75 s |

Finished videos are already in `out/agh-reel/` and `out/agh-reel-2/`. You only need to render
again after you change something.

## One-time setup

1. Install **Node.js 20 or newer**: https://nodejs.org (the LTS installer is fine).
2. Install **ffmpeg** and make sure the `ffmpeg` command works in a terminal:
   - Mac: `brew install ffmpeg`
   - Windows: `winget install ffmpeg` (then open a new terminal)
   - Linux: `sudo apt install ffmpeg`
3. Get this repository and open a terminal in the `motion` folder:
   ```
   git clone https://github.com/tejerocx/carlo-portfolio.git
   cd carlo-portfolio
   git checkout claude/compassionate-brahmagupta-mpgtwz
   cd motion
   ```
4. Install the tools (downloads a browser of about 150 MB once):
   ```
   npm install
   npm run setup
   ```

## Everyday commands (run inside `motion/`)

| What you want | Command | Time on a typical laptop |
|---|---|---|
| Watch it live in your browser, no rendering | `npm run preview:2` then open the printed link | instant |
| Check a few frames as images | `npm run still:2` | under a minute |
| Quick draft video (30 fps, no motion blur) | `npm run draft:2` | about 3-8 minutes |
| Final full-quality video (60 fps, motion blur) | `npm run render:2` | about 15-40 minutes |

Use `:1` instead of `:2` for Showreel I (`npm run render:1`, `npm run preview:1` and so on).

Each render writes `out/<film>/<film>_9x16.mp4` with the audio already mixed in. A draft and a
final render use the same file name, so rename a file you want to keep. Stills go to
`out/<film>/stills/`.

In the preview, Space plays and pauses, the arrow keys step one frame, and clicking scrubs the timeline.

### Make it faster or lighter
- `--workers 2` uses fewer CPU cores so the computer stays responsive. The default is 6.
  Example: `node tools/render.mjs --film agh-reel-2 --format 9x16 --workers 2`
- `--noblur` turns off motion blur, which is the slowest part. At phone size the difference is hard to see.

## Making changes

- **Text, timing, animation:** edit `<film>/film.js`. Every scene is a function, and its timing
  is in beats. Showreel I runs at 120 BPM (1 beat = 0.5 s); Showreel II runs at 128 BPM
  (1 beat = 0.469 s). Save, refresh the preview, and render once you're happy.
- **Captions** follow `<film>/words.json`, the spoken words with their times.
- **Audio** (`<film>/audio/mix.wav`) is final and mastered. Changing the voice-over or music
  needs the audio tools (`audio/score.py`, `audio/vo_takes.py`), which need Python and `uv`.
  Ask for help with that. Picture-only changes don't touch the audio.

## Files
- `tools/render.mjs`, `tools/pw.mjs`: the frame-exact renderer. `tools/preview.mjs`: the local preview server.
- `<film>/assets/plates/`: the city photos with the poster text removed. `<film>/assets/logo/`: the logo split into animatable layers.
- `<film>/docs/`: the shot list and the review notes for each film.
