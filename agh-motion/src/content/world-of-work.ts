/**
 * AGH German Pathway — "Germany's World of Work"
 *
 * Everything a future AGH topic needs to change lives in this one file:
 * copy, scene timing, brand colours, type and the logo placement.
 * Scene components only read from here — edit the strings and timings,
 * re-render, and the layout auto-fits the new headlines.
 *
 * Rules for future copy (from the brief):
 *  - Fields are shown as examples, never as advertised vacancies.
 *  - No salary figures, shortage claims or guaranteed outcomes.
 */

export const video = {
  id: "WorldOfWork",
  coverId: "Cover",
  width: 1080,
  height: 1920,
  fps: 30,
  durationInSeconds: 24,
} as const;

export const brand = {
  navy: "#061B32",
  /** Slightly lifted navy used only for background depth (glow, doc fill). */
  navyLift: "#0D2C4F",
  yellow: "#FFCD00",
  white: "#FFFFFF",
  /** Exact background colour of the supplied logo file (sampled: rgb 253,253,253). */
  logoPlate: "#FDFDFD",
} as const;

export const type = {
  /** Visby CF Extra Bold was not available; Montserrat is the bundled substitute. */
  family: "Montserrat",
  headlineWeight: 800,
  supportWeight: 600,
  headlineMaxSize: 92,
  settingsMaxSize: 78,
  supportSize: 46,
  checklistSize: 54,
  websiteSize: 44,
} as const;

/** Safe area for essential text (brief: x 90–900, y 260–1500). */
export const layout = {
  marginX: 90,
  safeRight: 900,
  /** Right edge for decorative lines (rules, dividers). */
  frameRight: 990,
  logo: {
    src: "brand/agh-logo.png",
    /** Pixel size of the cropped file; used to keep the aspect ratio exact. */
    naturalWidth: 706,
    naturalHeight: 848,
    displayHeight: 260,
    x: 90,
    y: 140,
  },
  kickerRuleY: 462,
  headlineTop: 500,
  skylineGround: 1480,
} as const;

export type IconName = "circuit" | "tool" | "medical";

export const scenes = {
  hook: {
    seconds: 4,
    headline: ["WHERE COULD", "YOUR SKILLS FIT", "IN GERMANY?"],
  },
  settings: {
    seconds: 5,
    items: [
      { label: "TECHNOLOGY.", icon: "circuit" as IconName },
      { label: "SKILLED TRADES.", icon: "tool" as IconName },
      { label: "HEALTHCARE.", icon: "medical" as IconName },
    ],
  },
  preparation: {
    seconds: 5,
    headline: ["START WITH", "YOUR OCCUPATION."],
    support: "Research the role and its requirements.",
  },
  action: {
    seconds: 5,
    headline: ["BUILD YOUR", "READINESS."],
    items: ["German.", "Qualifications.", "Documents."],
  },
  cta: {
    seconds: 5,
    headline: ["YOUR NEXT CHAPTER", "STARTS WITH", "PREPARATION."],
    support: "Follow AGH German Pathway.",
    website: "aghgermanpathway.com",
  },
} as const;

/** Frame of the main composition used for the still cover image. */
export const cover = { frame: 84 } as const;

// ---------------------------------------------------------------------------
// Derived timing (frames). Do not edit — change `seconds` above instead.
// ---------------------------------------------------------------------------

const order = ["hook", "settings", "preparation", "action", "cta"] as const;
export type SceneKey = (typeof order)[number];

export const timeline = (() => {
  let from = 0;
  const out = {} as Record<SceneKey, { from: number; duration: number }>;
  for (const key of order) {
    const duration = Math.round(scenes[key].seconds * video.fps);
    out[key] = { from, duration };
    from += duration;
  }
  return out;
})();

export const totalFrames = Math.round(video.durationInSeconds * video.fps);

/** Frames at which one scene hands over to the next. */
export const sceneBoundaries = order.slice(1).map((key) => timeline[key].from);
