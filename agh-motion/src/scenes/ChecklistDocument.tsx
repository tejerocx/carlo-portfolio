import { useCurrentFrame } from "remotion";
import { brand, scenes, timeline, type, video } from "../content/world-of-work";
import { MaskedLine } from "../components/MaskedLine";
import { easeIn, mix, progress } from "../components/motion";

const DOC = { x1: 150, y1: 880, x2: 930, y2: 1440, r: 34, fold: 84 };
const ROW_Y = [1072, 1206, 1340];
const BAR_LENGTH = [400, 320, 370];
const BOX = 58;
const BOX_X = 210;
const TEXT_X = 310;

/** Frames into the action scene at which each preparation area is checked off. */
const ITEM_START = 16;
const ITEM_GAP = 30;

/**
 * One document carries both the preparation and action scenes: it is drawn
 * while the viewer researches the role, then its rows become the checklist.
 * Placeholder rows are plain bars — no filler text.
 */
export const ChecklistDocument = () => {
  const frame = useCurrentFrame();
  const actionStart = timeline.action.from - timeline.preparation.from;
  const exit = progress(frame, actionStart + timeline.action.duration - 18, 15, easeIn);

  const outline = progress(frame, 16, 36);
  const fold = progress(frame, 40, 16);
  const header = progress(frame, 44, 18);
  const lensIn = progress(frame, 60, 22);
  const lensOut = progress(frame, actionStart - 26, 14, easeIn);
  const lens = lensIn * (1 - lensOut);
  const drift = { x: Math.sin(frame / 22) * 10, y: Math.cos(frame / 27) * 7 };

  const { x1, y1, x2, y2, r, fold: f } = DOC;
  const body = `M${x1 + r} ${y1}H${x2 - f}L${x2} ${y1 + f}V${y2 - r}Q${x2} ${y2} ${x2 - r} ${y2}H${x1 + r}Q${x1} ${y2} ${x1} ${y2 - r}V${y1 + r}Q${x1} ${y1} ${x1 + r} ${y1}Z`;
  const foldPath = `M${x2 - f} ${y1}V${y1 + f - 18}Q${x2 - f} ${y1 + f} ${x2 - f + 18} ${y1 + f}H${x2}`;

  return (
    <div style={{ position: "absolute", inset: 0, opacity: 1 - exit, transform: `translateY(${exit * -28}px)` }}>
      <svg width={video.width} height={video.height} style={{ position: "absolute", inset: 0 }}>
        <defs>
          <filter id="docShadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="24" stdDeviation="26" floodColor="#000814" floodOpacity="0.55" />
          </filter>
        </defs>
        <path d={body} fill={brand.navyLift} fillOpacity={0.55 * outline} filter="url(#docShadow)" />
        <path
          d={body}
          fill="none"
          stroke={brand.white}
          strokeOpacity={0.9}
          strokeWidth={4}
          strokeLinejoin="round"
          pathLength={1}
          strokeDasharray="1 1"
          strokeDashoffset={1 - outline}
        />
        <path d={foldPath} fill="none" stroke={brand.white} strokeOpacity={0.9} strokeWidth={4} strokeLinejoin="round" pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - fold} />
        <line x1={BOX_X} y1={958} x2={BOX_X + 190 * header} y2={958} stroke={brand.yellow} strokeWidth={14} strokeLinecap="round" opacity={header > 0.01 ? 1 : 0} />

        {ROW_Y.map((y, i) => {
          const rowIn = progress(frame, 50 + i * 7, 20);
          const itemStart = actionStart + ITEM_START + i * ITEM_GAP;
          const barOut = progress(frame, itemStart, 10, easeIn);
          const fill = progress(frame, itemStart + 4, 10);
          const tick = progress(frame, itemStart + 8, 14);
          const barEnd = TEXT_X + BAR_LENGTH[i] * rowIn * (1 - barOut);
          return (
            <g key={y}>
              <rect
                x={BOX_X}
                y={y - BOX / 2}
                width={BOX}
                height={BOX}
                rx={12}
                fill={brand.yellow}
                fillOpacity={fill}
                stroke={fill > 0.5 ? brand.yellow : brand.white}
                strokeWidth={3.5}
                pathLength={1}
                strokeDasharray="1 1"
                strokeDashoffset={1 - rowIn}
              />
              <path
                d={`M${BOX_X + 14} ${y + 1}L${BOX_X + 25} ${y + 12}L${BOX_X + 45} ${y - 12}`}
                fill="none"
                stroke={brand.navy}
                strokeWidth={7}
                strokeLinecap="round"
                strokeLinejoin="round"
                pathLength={1}
                strokeDasharray="1 1"
                strokeDashoffset={1 - tick}
              />
              {barEnd - TEXT_X > 1 ? (
                <line x1={TEXT_X} y1={y} x2={barEnd} y2={y} stroke={brand.white} strokeOpacity={0.24} strokeWidth={16} strokeLinecap="round" />
              ) : null}
            </g>
          );
        })}

        <g
          opacity={lens}
          transform={`translate(${790 + drift.x} ${1150 + drift.y}) scale(${mix(0.92, 1, lensIn)})`}
          fill="none"
          stroke={brand.yellow}
          strokeWidth={6}
          strokeLinecap="round"
        >
          <circle r={64} pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - lensIn} />
          <line x1={46} y1={46} x2={46 + 58 * lensIn} y2={46 + 58 * lensIn} strokeWidth={12} />
        </g>
      </svg>

      {scenes.action.items.map((item, i) => {
        const y = ROW_Y[i];
        const lineHeightPx = Math.round(type.checklistSize * 1.2);
        return (
          <div key={item} style={{ position: "absolute", left: TEXT_X - 4, top: y - lineHeightPx / 2 }}>
            <MaskedLine
              enterAt={actionStart + ITEM_START + i * ITEM_GAP + 6}
              lineHeightPx={lineHeightPx}
              style={{ color: brand.white, fontFamily: type.family, fontWeight: 700, fontSize: type.checklistSize }}
            >
              {item}
            </MaskedLine>
          </div>
        );
      })}
    </div>
  );
};
