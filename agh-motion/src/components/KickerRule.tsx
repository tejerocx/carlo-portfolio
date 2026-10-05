import { useCurrentFrame } from "remotion";
import { brand, layout, sceneBoundaries } from "../content/world-of-work";
import { easeIn, easeInOut, easeOut, mix, progress } from "./motion";

const SHORT = 120;
const HEIGHT = 6;

/**
 * The yellow rule above each headline is the thread between scenes: at every
 * hand-over it stretches across the frame, wipes away to the right, and a new
 * short rule draws in for the next scene.
 */
export const KickerRule = () => {
  const frame = useCurrentFrame();
  const start: number = layout.marginX;
  const end: number = layout.frameRight;

  let outgoing = { x1: start, x2: start + SHORT };
  let incoming: { x1: number; x2: number } | null = null;

  for (const b of sceneBoundaries) {
    if (frame >= b - 16 && frame < b + 22) {
      const extend = progress(frame, b - 16, 16, easeInOut);
      const retract = progress(frame, b, 12, easeIn);
      outgoing = { x1: mix(start, end, retract), x2: mix(start + SHORT, end, extend) };
      incoming = { x1: start, x2: start + SHORT * progress(frame, b + 8, 14, easeOut) };
    }
  }

  const bar = ({ x1, x2 }: { x1: number; x2: number }, key: string) =>
    x2 - x1 > 0.5 ? (
      <div
        key={key}
        style={{
          position: "absolute",
          left: x1,
          top: layout.kickerRuleY,
          width: x2 - x1,
          height: HEIGHT,
          backgroundColor: brand.yellow,
        }}
      />
    ) : null;

  return (
    <>
      {bar(outgoing, "out")}
      {incoming ? bar(incoming, "in") : null}
    </>
  );
};
