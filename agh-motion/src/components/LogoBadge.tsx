import { Img, staticFile } from "remotion";
import { brand, layout } from "../content/world-of-work";

/**
 * The supplied AGH logo, unaltered. Its navy artwork needs its own light
 * background on a navy canvas, so it sits on a plate matching the file's
 * own background colour (#FDFDFD). Width is derived from the file's
 * aspect ratio so it is never stretched.
 */
export const LogoBadge = () => {
  const { displayHeight, naturalWidth, naturalHeight, x, y, src } = layout.logo;
  const width = (displayHeight * naturalWidth) / naturalHeight;

  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        width,
        height: displayHeight,
        borderRadius: 18,
        overflow: "hidden",
        backgroundColor: brand.logoPlate,
        boxShadow: "0 22px 48px rgba(0, 8, 20, 0.45), 0 2px 6px rgba(0, 8, 20, 0.3)",
      }}
    >
      <Img src={staticFile(src)} style={{ width, height: displayHeight, display: "block" }} />
    </div>
  );
};

export const logoBadgeWidth = (layout.logo.displayHeight * layout.logo.naturalWidth) / layout.logo.naturalHeight;
