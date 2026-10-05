import { interpolate, useCurrentFrame } from "remotion";
import { brand, layout, scenes, timeline, type } from "../content/world-of-work";
import { FieldIcon } from "../components/FieldIcon";
import { MaskedLine } from "../components/MaskedLine";
import { easeIn, easeOut, progress } from "../components/motion";
import { HEADLINE_TRACKING, SETTINGS_TEXT_X, type TypeScale } from "../components/typeScale";

const ROW_TOP = 500;
const ROW_HEIGHT = 236;
const ICON_SIZE = 132;
const REVEAL_GAP = 30; // one field per second
const FIRST_REVEAL = 4;

/** 0:04–0:09 — one field at a time, each with its line drawing; all three then hold together. */
export const SettingsScene = ({ scale }: { scale: TypeScale }) => {
  const frame = useCurrentFrame();
  const exitAt = timeline.settings.duration - 16;
  const lineHeightPx = Math.round(scale.settingsLabel * 1.1);

  return (
    <>
      {scenes.settings.items.map((item, i) => {
        const start = FIRST_REVEAL + i * REVEAL_GAP;
        const rowExit = exitAt + i * 2;
        const draw = progress(frame, start, 26);
        const iconLeave = progress(frame, rowExit, 11, easeIn);
        const divider = progress(frame, start + 6, 22, easeOut) * (1 - progress(frame, rowExit, 12, easeIn));
        const centerY = ROW_TOP + i * ROW_HEIGHT + ROW_HEIGHT / 2;

        return (
          <div key={item.label}>
            <div
              style={{
                position: "absolute",
                left: layout.marginX,
                top: centerY - ICON_SIZE / 2,
                opacity: 1 - iconLeave,
                transform: `translateY(${interpolate(iconLeave, [0, 1], [0, -24])}px)`,
              }}
            >
              <FieldIcon name={item.icon} size={ICON_SIZE} draw={draw} />
            </div>
            <div style={{ position: "absolute", left: SETTINGS_TEXT_X, top: centerY - lineHeightPx / 2 }}>
              <MaskedLine
                enterAt={start + 6}
                exitAt={rowExit}
                lineHeightPx={lineHeightPx}
                style={{
                  color: brand.yellow,
                  fontFamily: type.family,
                  fontWeight: type.headlineWeight,
                  fontSize: scale.settingsLabel,
                  letterSpacing: `${HEADLINE_TRACKING}em`,
                }}
              >
                {item.label}
              </MaskedLine>
            </div>
            <div
              style={{
                position: "absolute",
                left: layout.marginX,
                top: ROW_TOP + (i + 1) * ROW_HEIGHT,
                width: (layout.frameRight - layout.marginX) * divider,
                height: 2,
                backgroundColor: "rgba(255,255,255,0.18)",
              }}
            />
          </div>
        );
      })}
    </>
  );
};
