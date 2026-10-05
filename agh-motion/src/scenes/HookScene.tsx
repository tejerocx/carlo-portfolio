import { scenes, timeline } from "../content/world-of-work";
import { Headline } from "../components/Headline";
import type { TypeScale } from "../components/typeScale";

/** 0:00–0:04 — the question is on screen from the first frame; the rest follows in readable groups. */
export const HookScene = ({ scale }: { scale: TypeScale }) => (
  <Headline
    lines={scenes.hook.headline}
    size={scale.hook}
    enterAt={[-18, 8, 18]}
    exitAt={timeline.hook.duration - 15}
  />
);
