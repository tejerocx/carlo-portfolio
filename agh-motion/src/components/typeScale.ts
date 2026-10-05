import { measureText } from "@remotion/layout-utils";
import { layout, scenes, type } from "../content/world-of-work";

export type TypeScale = {
  hook: number;
  preparation: number;
  action: number;
  cta: number;
  settingsLabel: number;
};

const widthAt = (text: string, fontSize: number, fontWeight: number, letterSpacingEm: number): number =>
  measureText({
    text,
    fontFamily: type.family,
    fontWeight,
    fontSize,
    letterSpacing: `${letterSpacingEm * fontSize}px`,
    validateFontIsLoaded: true,
  }).width;

/** Largest size (≤ max) at which every line fits `maxWidth`. */
const fitLines = (lines: readonly string[], maxWidth: number, max: number): number => {
  const probe = 100;
  const widest = Math.max(...lines.map((line) => widthAt(line, probe, type.headlineWeight, HEADLINE_TRACKING)));
  return Math.min(max, Math.floor((probe * maxWidth) / widest));
};

export const HEADLINE_TRACKING = -0.01;
export const HEADLINE_LINE_HEIGHT = 1.06;
export const SETTINGS_TEXT_X = 270;

/**
 * Each headline is set as large as its longest line allows inside the safe
 * area (capped at `type.headlineMaxSize`), so new copy re-fits automatically.
 */
export const computeTypeScale = (): TypeScale => {
  const safeWidth = layout.safeRight - layout.marginX;
  const fit = (lines: readonly string[]) => fitLines(lines, safeWidth, type.headlineMaxSize);
  return {
    hook: fit(scenes.hook.headline),
    preparation: fit(scenes.preparation.headline),
    action: fit(scenes.action.headline),
    cta: fit(scenes.cta.headline),
    settingsLabel: fitLines(
      scenes.settings.items.map((item) => item.label),
      layout.safeRight - SETTINGS_TEXT_X,
      type.settingsMaxSize,
    ),
  };
};
