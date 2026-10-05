import { AbsoluteFill, useCurrentFrame } from "remotion";
import { brand } from "../content/world-of-work";

/** Deep navy field with a slow-drifting glow for depth; movement stays well below reading attention. */
export const Background = () => {
  const frame = useCurrentFrame();
  const t = frame / 30;
  const gx = 28 + 10 * Math.sin(t * 0.22);
  const gy = 30 + 6 * Math.cos(t * 0.17);
  const lx = 78 - 8 * Math.sin(t * 0.15);

  return (
    <AbsoluteFill
      style={{
        backgroundColor: brand.navy,
        backgroundImage: [
          `radial-gradient(900px 900px at ${gx}% ${gy}%, rgba(28, 74, 128, 0.32), rgba(6, 27, 50, 0) 70%)`,
          `radial-gradient(700px 700px at ${lx}% 64%, rgba(20, 60, 108, 0.22), rgba(6, 27, 50, 0) 70%)`,
          "linear-gradient(180deg, rgba(0,0,0,0) 70%, rgba(2, 12, 24, 0.45) 100%)",
        ].join(","),
      }}
    />
  );
};
