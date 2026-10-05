# Anaya's Way Immigration: Motion Showreel

A 32-second motion piece for **Anaya's Way Immigration** in two formats, both 60 fps with motion blur:

| Format | File | Use |
|--------|------|-----|
| Landscape 16:9, 1920×1080 | [`anayas-way-showreel-16x9.mp4`](anayas-way-showreel-16x9.mp4) | Website hero, YouTube, LinkedIn, presentations |
| Vertical 9:16, 1080×1920 | [`anayas-way-showreel-9x16.mp4`](anayas-way-showreel-9x16.mp4) | Instagram Reels / Stories, TikTok, YouTube Shorts |

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

## Files

- `index.html` + `showreel.js`: the animation. Serve the folder and open `index.html` (landscape) or
  `index.html?v=1` (vertical). Click to restart; `?t=27.6` freezes a frame.
- `audio.cjs`: the procedural soundtrack. It writes `out/soundtrack.wav`, which both cuts share.
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
