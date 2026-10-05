import { useCurrentFrame } from "remotion";
import { brand, layout, totalFrames } from "../content/world-of-work";
import { logoBadgeWidth } from "./LogoBadge";

/** A quiet echo of the progress bar beneath the logo wordmark, aligned to the badge's base. */
export const ProgressLine = () => {
  const frame = useCurrentFrame();
  const left = layout.logo.x + logoBadgeWidth + 36;
  const width = layout.frameRight - left;
  const fill = Math.min(1, frame / (totalFrames - 1));
  const top = layout.logo.y + layout.logo.displayHeight - 4;

  return (
    <div style={{ position: "absolute", left, top, width, height: 4, borderRadius: 2, backgroundColor: "rgba(255,255,255,0.13)" }}>
      <div style={{ width: width * fill, height: 4, borderRadius: 2, backgroundColor: brand.yellow }} />
    </div>
  );
};
