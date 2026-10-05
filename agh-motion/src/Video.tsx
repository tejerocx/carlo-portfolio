import { useMemo } from "react";
import { AbsoluteFill, Sequence } from "remotion";
import { timeline } from "./content/world-of-work";
import { Background } from "./components/Background";
import { useFontsReady } from "./components/fonts";
import { KickerRule } from "./components/KickerRule";
import { LogoBadge } from "./components/LogoBadge";
import { ProgressLine } from "./components/ProgressLine";
import { Skyline } from "./components/Skyline";
import { computeTypeScale } from "./components/typeScale";
import { ActionScene } from "./scenes/ActionScene";
import { ChecklistDocument } from "./scenes/ChecklistDocument";
import { CtaScene } from "./scenes/CtaScene";
import { HookScene } from "./scenes/HookScene";
import { PreparationScene } from "./scenes/PreparationScene";
import { SettingsScene } from "./scenes/SettingsScene";

export const WorldOfWorkVideo = () => {
  const fontsReady = useFontsReady();
  const scale = useMemo(() => (fontsReady ? computeTypeScale() : null), [fontsReady]);

  return (
    <AbsoluteFill>
      <Background />
      <Skyline />
      {scale ? (
        <>
          <Sequence name="Hook" from={timeline.hook.from} durationInFrames={timeline.hook.duration} layout="none">
            <HookScene scale={scale} />
          </Sequence>
          <Sequence name="Settings" from={timeline.settings.from} durationInFrames={timeline.settings.duration} layout="none">
            <SettingsScene scale={scale} />
          </Sequence>
          <Sequence
            name="Checklist document"
            from={timeline.preparation.from}
            durationInFrames={timeline.preparation.duration + timeline.action.duration}
            layout="none"
          >
            <ChecklistDocument />
          </Sequence>
          <Sequence name="Preparation" from={timeline.preparation.from} durationInFrames={timeline.preparation.duration} layout="none">
            <PreparationScene scale={scale} />
          </Sequence>
          <Sequence name="Action" from={timeline.action.from} durationInFrames={timeline.action.duration} layout="none">
            <ActionScene scale={scale} />
          </Sequence>
          <Sequence name="CTA" from={timeline.cta.from} durationInFrames={timeline.cta.duration} layout="none">
            <CtaScene scale={scale} />
          </Sequence>
        </>
      ) : null}
      <KickerRule />
      <ProgressLine />
      <LogoBadge />
    </AbsoluteFill>
  );
};
