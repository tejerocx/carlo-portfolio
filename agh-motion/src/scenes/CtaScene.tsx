import { useCurrentFrame } from "remotion";
import { brand, layout, scenes, type } from "../content/world-of-work";
import { Headline, headlineHeight } from "../components/Headline";
import { progress } from "../components/motion";
import { SupportText } from "../components/SupportText";
import type { TypeScale } from "../components/typeScale";

const PILL_HEIGHT = 104;

/** 0:19–0:24 — everything is on screen by ~0:20.5 and then holds, untouched, to the end. */
export const CtaScene = ({ scale }: { scale: TypeScale }) => {
  const frame = useCurrentFrame();
  const { headline, support, website } = scenes.cta;
  const supportTop = layout.headlineTop + headlineHeight(headline.length, scale.cta) + 40;
  const pillTop = supportTop + Math.round(type.supportSize * 1.3) + 40;
  const pill = progress(frame, 26, 20);
  const label = progress(frame, 32, 14);

  return (
    <>
      <Headline lines={headline} size={scale.cta} enterAt={[2, 7, 12]} />
      <SupportText text={support} top={supportTop} enterAt={20} />
      <div
        style={{
          position: "absolute",
          left: layout.marginX,
          top: pillTop,
          height: PILL_HEIGHT,
          paddingInline: 46,
          borderRadius: PILL_HEIGHT / 2,
          backgroundColor: brand.yellow,
          display: "flex",
          alignItems: "center",
          clipPath: `inset(0 ${(1 - pill) * 100}% 0 0 round ${PILL_HEIGHT / 2}px)`,
          boxShadow: "0 18px 40px rgba(0, 8, 20, 0.35)",
        }}
      >
        <span
          style={{
            color: brand.navy,
            fontFamily: type.family,
            fontWeight: 800,
            fontSize: type.websiteSize,
            letterSpacing: "0.005em",
            opacity: label,
            transform: `translateX(${(1 - label) * 14}px)`,
          }}
        >
          {website}
        </span>
      </div>
    </>
  );
};
