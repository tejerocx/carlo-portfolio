import { scenes, timeline } from "../content/world-of-work";
import { Headline, headlineHeight } from "../components/Headline";
import { SupportText } from "../components/SupportText";
import type { TypeScale } from "../components/typeScale";
import { layout } from "../content/world-of-work";

/** 0:09–0:14 — headline and guidance; the document motif is drawn by ChecklistDocument. */
export const PreparationScene = ({ scale }: { scale: TypeScale }) => {
  const exitAt = timeline.preparation.duration - 16;
  const { headline, support } = scenes.preparation;
  return (
    <>
      <Headline lines={headline} size={scale.preparation} enterAt={[2, 9]} exitAt={exitAt} />
      <SupportText
        text={support}
        top={layout.headlineTop + headlineHeight(headline.length, scale.preparation) + 34}
        enterAt={20}
        exitAt={exitAt - 2}
        maxWidth={760}
      />
    </>
  );
};
