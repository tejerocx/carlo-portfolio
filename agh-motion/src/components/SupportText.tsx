import type { CSSProperties } from "react";
import { useCurrentFrame } from "remotion";
import { brand, layout, type } from "../content/world-of-work";
import { easeIn, easeOut, progress } from "./motion";

type Props = {
  text: string;
  top: number;
  enterAt: number;
  exitAt?: number;
  maxWidth?: number;
  style?: CSSProperties;
};

/** White supporting copy: a short rise with opacity; wraps naturally inside the safe area. */
export const SupportText = ({ text, top, enterAt, exitAt, maxWidth = layout.safeRight - layout.marginX, style }: Props) => {
  const frame = useCurrentFrame();
  const enter = progress(frame, enterAt, 20, easeOut);
  const exit = exitAt === undefined ? 0 : progress(frame, exitAt, 12, easeIn);
  return (
    <div
      style={{
        position: "absolute",
        left: layout.marginX,
        top,
        width: maxWidth,
        color: brand.white,
        fontFamily: type.family,
        fontWeight: type.supportWeight,
        fontSize: type.supportSize,
        lineHeight: 1.3,
        opacity: enter * (1 - exit),
        transform: `translateY(${(1 - enter) * 22 - exit * 22}px)`,
        ...style,
      }}
    >
      {text}
    </div>
  );
};
