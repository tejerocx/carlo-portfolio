import { brand, layout, type } from "../content/world-of-work";
import { MaskedLine } from "./MaskedLine";
import { HEADLINE_LINE_HEIGHT, HEADLINE_TRACKING } from "./typeScale";

type Props = {
  lines: readonly string[];
  size: number;
  /** Local frame each line starts entering. */
  enterAt: readonly number[];
  exitAt?: number;
  top?: number;
};

/** Yellow, left-aligned headline; lines enter as readable groups and exit together with a slight stagger. */
export const Headline = ({ lines, size, enterAt, exitAt, top = layout.headlineTop }: Props) => {
  const lineHeightPx = Math.round(size * HEADLINE_LINE_HEIGHT);
  return (
    <div style={{ position: "absolute", left: layout.marginX, top }}>
      {lines.map((line, i) => (
        <MaskedLine
          key={line}
          enterAt={enterAt[i] ?? enterAt[enterAt.length - 1]}
          exitAt={exitAt === undefined ? undefined : exitAt + i * 2}
          lineHeightPx={lineHeightPx}
          style={{
            color: brand.yellow,
            fontFamily: type.family,
            fontWeight: type.headlineWeight,
            fontSize: size,
            letterSpacing: `${HEADLINE_TRACKING}em`,
          }}
        >
          {line}
        </MaskedLine>
      ))}
    </div>
  );
};

export const headlineHeight = (lineCount: number, size: number) => lineCount * Math.round(size * HEADLINE_LINE_HEIGHT);
