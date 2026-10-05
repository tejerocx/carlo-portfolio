import type { IconName } from "../content/world-of-work";
import { brand } from "../content/world-of-work";

const circle = (cx: number, cy: number, r: number) =>
  `M${cx - r} ${cy}a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 ${-2 * r} 0`;

/** Line-art paths on a 100×100 grid. Each entry is drawn as one stroke. */
const ICONS: Record<IconName, { strokes: string[]; accent: string[] }> = {
  circuit: {
    strokes: [
      "M34 30h32a4 4 0 0 1 4 4v32a4 4 0 0 1 -4 4h-32a4 4 0 0 1 -4 -4v-32a4 4 0 0 1 4 -4Z",
      "M42 30V16",
      "M58 30V22L68 12",
      "M42 70V82L32 92",
      "M58 70V88",
      "M30 44H14",
      "M30 56H22L12 66",
      "M70 44H82L90 36",
      "M70 56H88",
      ...[[42, 13], [70, 10], [30, 94], [58, 91], [11, 44], [10, 68], [92, 34], [91, 56]].map(([x, y]) => circle(x, y, 3)),
    ],
    accent: ["M43 43h14v14h-14Z"],
  },
  tool: {
    // Open-end wrench, drawn upright then rotated 45°.
    strokes: [
      "M43 5.27V22H57V5.27A20 20 0 0 1 57 42.73V86A7 7 0 0 1 43 86V42.73A20 20 0 0 1 43 5.27Z",
    ],
    accent: [circle(50, 76, 3.5)],
  },
  medical: {
    strokes: [circle(50, 50, 46)],
    accent: ["M39 20H61V39H80V61H61V80H39V61H20V39H39Z"],
  },
};

type Props = { name: IconName; size: number; draw: number };

/** Restrained line drawing: white structure, one yellow accent element. */
export const FieldIcon = ({ name, size, draw }: Props) => {
  const icon = ICONS[name];
  const rotate = name === "tool" ? "rotate(45 50 50)" : undefined;
  const ringOpacity = name === "medical" ? 0.35 : 1;

  return (
    <svg width={size} height={size} viewBox="-4 -4 108 108" style={{ overflow: "visible" }}>
      <g transform={rotate} fill="none" strokeLinecap="round" strokeLinejoin="round">
        {icon.strokes.map((d, i) => (
          <path
            key={`s${i}`}
            d={d}
            stroke={brand.white}
            strokeOpacity={ringOpacity}
            strokeWidth={3.4}
            pathLength={1}
            strokeDasharray="1 1"
            strokeDashoffset={1 - draw}
          />
        ))}
        {icon.accent.map((d, i) => (
          <path
            key={`a${i}`}
            d={d}
            stroke={brand.yellow}
            strokeWidth={3.4}
            pathLength={1}
            strokeDasharray="1 1"
            strokeDashoffset={1 - Math.max(0, Math.min(1, draw * 1.4 - 0.4))}
          />
        ))}
      </g>
    </svg>
  );
};
