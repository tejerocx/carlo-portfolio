import type { CSSProperties, ReactNode } from "react";
import { useCurrentFrame } from "remotion";
import { easeIn, progress } from "./motion";

type Props = {
  children: ReactNode;
  /** Local frame the line starts rising into its mask. Negative = already settled at frame 0. */
  enterAt: number;
  /** Local frame the line starts leaving upward. Omit to hold. */
  exitAt?: number;
  lineHeightPx: number;
  style?: CSSProperties;
  enterDuration?: number;
  exitDuration?: number;
};

/**
 * A single line of type revealed through a mask: it slides up into a clipped
 * box and later slides up out of it. Text never scales, fades in place or bounces.
 */
export const MaskedLine = ({
  children,
  enterAt,
  exitAt,
  lineHeightPx,
  style,
  enterDuration = 18,
  exitDuration = 11,
}: Props) => {
  const frame = useCurrentFrame();
  const enter = progress(frame, enterAt, enterDuration);
  const exit = exitAt === undefined ? 0 : progress(frame, exitAt, exitDuration, easeIn);
  const offset = (1 - enter) * 105 - exit * 105;

  return (
    <div
      style={{
        overflow: "hidden",
        height: lineHeightPx,
        // A little room so glyph edges are never shaved by the mask.
        paddingInline: 6,
        marginInline: -6,
      }}
    >
      <div
        style={{
          transform: `translateY(${offset}%)`,
          lineHeight: `${lineHeightPx}px`,
          whiteSpace: "nowrap",
          ...style,
        }}
      >
        {children}
      </div>
    </div>
  );
};
