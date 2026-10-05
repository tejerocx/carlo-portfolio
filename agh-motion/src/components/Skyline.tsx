import { interpolate, useCurrentFrame } from "remotion";
import { brand, layout, sceneBoundaries, timeline, totalFrames, video } from "../content/world-of-work";
import { progress } from "./motion";

/*
 * A generic, invented streetscape — gabled townhouses, office blocks, a church
 * spire and a construction crane. It suggests German city life without
 * depicting (or naming) any real landmark.
 */

const G = layout.skylineGround;

type Element = { outline: string; details: string; lit?: string; x: number };

const rect = (x: number, y: number, w: number, h: number) => `M${x} ${y}h${w}v${h}h${-w}Z`;

const windowsGrid = (x: number, w: number, top: number, floors: number, cols: number, ww = 16, wh = 26, gap = 78) => {
  let d = "";
  for (let f = 0; f < floors; f++) {
    for (let c = 0; c < cols; c++) {
      const cx = x + (w * (c + 1)) / (cols + 1);
      d += rect(cx - ww / 2, top + f * gap, ww, wh);
    }
  }
  return d;
};

const gable = (x: number, w: number, h: number, lit?: [number, number]): Element => {
  const peak = G - h - w * 0.62;
  const floors = Math.floor((h - 50) / 78);
  return {
    x,
    outline: `M${x} ${G}V${G - h}L${x + w / 2} ${peak}L${x + w} ${G - h}V${G}`,
    details: windowsGrid(x, w, G - h + 34, floors, 2) + rect(x + w / 2 - 9, G - h - 44, 18, 22),
    lit: lit ? rect(x + (w * lit[0]) / 3 - 8, G - h + 34 + lit[1] * 78, 16, 26) : undefined,
  };
};

const stepped = (x: number, w: number, h: number, lit?: [number, number]): Element => {
  const steps = 3;
  const stepW = (w * 0.4) / steps;
  const stepH = 32;
  let d = `M${x} ${G}V${G - h}`;
  for (let i = 0; i < steps; i++) d += `h${stepW}v${-stepH}`;
  d += `h${w - 2 * steps * stepW}`;
  for (let i = 0; i < steps; i++) d += `v${stepH}h${stepW}`;
  d += `V${G}`;
  const floors = Math.floor((h - 50) / 78);
  return {
    x,
    outline: d,
    details: windowsGrid(x, w, G - h + 34, floors, 3, 14),
    lit: lit ? rect(x + (w * lit[0]) / 4 - 7, G - h + 34 + lit[1] * 78, 14, 26) : undefined,
  };
};

const flat = (x: number, w: number, h: number): Element => ({
  x,
  outline: `M${x} ${G}V${G - h}H${x + w}V${G}`,
  details: `M${x - 8} ${G - h + 14}H${x + w + 8}` + windowsGrid(x, w, G - h + 44, Math.floor((h - 70) / 78), 3, 14),
});

const mansard = (x: number, w: number, h: number): Element => ({
  x,
  outline: `M${x} ${G}V${G - h}L${x + 18} ${G - h - 56}H${x + w - 18}L${x + w} ${G - h}V${G}`,
  details:
    `M${x - 6} ${G - h}H${x + w + 6}` +
    rect(x + w * 0.3 - 9, G - h - 40, 18, 24) +
    rect(x + w * 0.7 - 9, G - h - 40, 18, 24) +
    windowsGrid(x, w, G - h + 34, Math.floor((h - 50) / 78), 3, 14),
});

const block = (x: number, w: number, h: number): Element => {
  let floors = "";
  for (let y = G - h + 40; y < G - 20; y += 44) floors += `M${x + 12} ${y}H${x + w - 12}`;
  return { x, outline: `M${x} ${G}V${G - h}H${x + w}V${G}`, details: floors };
};

const spire = (x: number, w: number, h: number): Element => ({
  x,
  outline: `M${x} ${G}V${G - h}L${x + w / 2} ${G - h - 240}L${x + w} ${G - h}V${G}`,
  details: `M${x - 6} ${G - h}H${x + w + 6}M${x + w / 2 + 14} ${G - h + 60}a14 14 0 1 1 -28 0a14 14 0 1 1 28 0` + rect(x + w / 2 - 8, G - h + 110, 16, 40),
});

const crane = (mastX: number): Element => {
  const top = G - 600;
  const jib = G - 560;
  return {
    x: mastX,
    outline: `M${mastX - 9} ${G}V${jib}M${mastX + 9} ${G}V${jib}M${mastX - 80} ${jib}H${mastX + 280}M${mastX - 80} ${jib + 16}H${mastX + 280}`,
    details:
      `M${mastX} ${top}L${mastX - 80} ${jib}M${mastX} ${top}L${mastX + 280} ${jib}M${mastX - 9} ${jib}L${mastX} ${top}L${mastX + 9} ${jib}` +
      `M${mastX + 220} ${jib + 16}V${jib + 150}` +
      rect(mastX - 74, jib + 16, 34, 30),
  };
};

const front: Element[] = [
  gable(-60, 120, 250),
  stepped(60, 130, 290, [2, 1]),
  flat(190, 150, 330),
  gable(340, 110, 270),
  mansard(450, 140, 300),
  stepped(590, 120, 260),
  gable(710, 130, 310, [2, 2]),
  flat(840, 120, 280),
  gable(960, 110, 250, [1, 0]),
  stepped(1070, 130, 300),
  gable(1200, 120, 270),
];

const back: Element[] = [
  block(-40, 160, 460),
  spire(150, 70, 380),
  block(300, 140, 420),
  crane(540),
  block(650, 170, 540),
  block(850, 120, 440),
  block(990, 150, 500),
  block(1160, 130, 460),
];

/** How present the skyline is: full in the hook and CTA, quiet behind content scenes. */
const usePresence = (frame: number) => {
  const firstHandOver = sceneBoundaries[0];
  const ctaStart = timeline.cta.from;
  return interpolate(
    frame,
    [firstHandOver - 12, firstHandOver + 12, ctaStart - 14, ctaStart + 20],
    [1, 0.2, 0.2, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );
};

const Layer = ({
  elements,
  frame,
  stroke,
  fill,
  strokeWidth,
  panPx,
  drawDelay,
}: {
  elements: Element[];
  frame: number;
  stroke: string;
  fill: string;
  strokeWidth: number;
  panPx: number;
  drawDelay: number;
}) => {
  const pan = -panPx * (frame / totalFrames);
  return (
    <g transform={`translate(${pan} 0)`}>
      {elements.map((el, i) => {
        const delay = drawDelay + ((el.x + 100) / 1400) * 22;
        const draw = progress(frame, delay, 30);
        const detail = progress(frame, delay + 16, 18);
        return (
          <g key={i}>
            <path
              d={el.outline}
              fill={fill}
              stroke={stroke}
              strokeWidth={strokeWidth}
              strokeLinejoin="round"
              strokeLinecap="round"
              pathLength={1}
              strokeDasharray="1 1"
              strokeDashoffset={1 - draw}
            />
            <path d={el.details} fill="none" stroke={stroke} strokeWidth={strokeWidth * 0.7} opacity={detail * 0.45} />
            {el.lit ? <path d={el.lit} fill={brand.yellow} opacity={detail * 0.7} /> : null}
          </g>
        );
      })}
    </g>
  );
};

export const Skyline = () => {
  const frame = useCurrentFrame();
  const presence = usePresence(frame);
  const groundDraw = progress(frame, 0, 34);

  return (
    <svg
      width={video.width}
      height={video.height}
      viewBox={`0 0 ${video.width} ${video.height}`}
      style={{ position: "absolute", inset: 0, opacity: presence }}
    >
      <defs>
        <linearGradient id="street" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={brand.navyLift} stopOpacity={0.55} />
          <stop offset="1" stopColor={brand.navy} stopOpacity={0} />
        </linearGradient>
      </defs>
      <Layer elements={back} frame={frame} stroke="rgba(255,255,255,0.26)" fill="#0A2342" strokeWidth={2.5} panPx={30} drawDelay={4} />
      <Layer elements={front} frame={frame} stroke="rgba(255,255,255,0.55)" fill={brand.navy} strokeWidth={3} panPx={72} drawDelay={0} />
      <rect x={0} y={G} width={video.width} height={240} fill="url(#street)" />
      <rect x={0} y={G - 1.5} width={video.width * groundDraw} height={3} fill={brand.yellow} opacity={0.9} />
    </svg>
  );
};
