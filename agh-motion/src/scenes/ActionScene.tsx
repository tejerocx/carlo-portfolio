import { scenes, timeline } from "../content/world-of-work";
import { Headline } from "../components/Headline";
import type { TypeScale } from "../components/typeScale";

/** 0:14–0:19 — headline; the three preparation areas are checked off inside ChecklistDocument. */
export const ActionScene = ({ scale }: { scale: TypeScale }) => (
  <Headline lines={scenes.action.headline} size={scale.action} enterAt={[2, 9]} exitAt={timeline.action.duration - 16} />
);
