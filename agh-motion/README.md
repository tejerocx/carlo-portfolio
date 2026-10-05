# AGH German Pathway — motion template

The 24-second 9:16 video **"Germany's World of Work"**, built in [Remotion](https://www.remotion.dev).
The project is set up so that future AGH topics are made by editing one file.

## Deliverables (`exports/`)

| File | Spec |
| --- | --- |
| `agh-world-of-work.mp4` | H.264, 1080 × 1920 (9:16), 30 fps, 720 frames, exactly 24.000 s, yuv420p, **no audio track** |
| `agh-world-of-work-cover.png` | 1080 × 1920 still (completed hook frame) |

## Edit copy / timing

All copy, scene durations, colours, type sizes and logo placement live in
**`src/content/world-of-work.ts`**. Headlines auto-fit the safe area
(x 90–900) when the text changes, so new copy does not need manual resizing.
The cover frame is `cover.frame` in the same file.

## Commands

```bash
npm install
npm run studio      # live preview / timeline scrubbing
npm run render      # → exports/agh-world-of-work.mp4
npm run cover       # → exports/agh-world-of-work-cover.png
npm run frames      # QC stills at every scene + transition → qc/
npm run typecheck
```

If Remotion cannot download its own headless Chrome (e.g. a locked-down
network), point it at a local Chromium:
`npm run render -- --browser-executable=/path/to/headless_shell`
(for `npm run frames`, set `REMOTION_BROWSER=/path/to/headless_shell`).

## Scene map

| Time | Scene | Component |
| --- | --- | --- |
| 0:00–0:04 | Hook over a line-drawn streetscape | `scenes/HookScene.tsx` |
| 0:04–0:09 | Technology / Skilled trades / Healthcare, one per second | `scenes/SettingsScene.tsx` |
| 0:09–0:14 | Start with your occupation, document motif | `scenes/PreparationScene.tsx` + `scenes/ChecklistDocument.tsx` |
| 0:14–0:19 | Build your readiness, the document becomes the checklist | `scenes/ActionScene.tsx` + `scenes/ChecklistDocument.tsx` |
| 0:19–0:24 | CTA, fully on screen by ~0:20.5 and held to the end | `scenes/CtaScene.tsx` |

Persistent system: logo badge (top-left), a yellow rule above each headline
that sweeps across the frame at every hand-over, a progress line echoing the
logo's underline, and a slowly panning city silhouette.

## Substitutions and notes

- **Font:** Visby CF Extra Bold was not installed or supplied. The project
  uses **Montserrat** (800 headlines, 600–700 supporting), a geometric sans
  with similar wide, round capitals, bundled locally in `public/fonts`
  (SIL Open Font License). To switch to Visby CF, add the licensed `.woff2`
  files to `public/fonts`, update `components/fonts.ts` and `type.family`.
- **Logo:** `public/brand/agh-logo.png` is a straight crop of the supplied
  file (`agh-logo-original.webp`). It is not redrawn, recoloured or
  resampled. The navy wordmark would disappear on the navy background, so
  the logo sits on a plate in the file's own background colour (#FDFDFD).
  The aspect ratio is locked to the file's pixel size.
- **Architecture:** the skyline is an invented, generic streetscape
  (gabled and stepped townhouses, office blocks, a spire, a crane). It is
  not meant to be any real landmark and is not labelled as one.
- **Audio:** no commercially licensed track with documentable source was
  available, so the export is silent (no audio stream). Add music in your
  editor or via a Remotion `<Audio>` element.
- **Licensing:** Remotion is free for individuals and companies with up to
  3 employees. Larger organisations need a company licence
  (https://remotion.dev/license).
