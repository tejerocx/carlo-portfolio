import { Composition, Freeze } from "remotion";
import { cover, totalFrames, video } from "./content/world-of-work";
import { WorldOfWorkVideo } from "./Video";

const CoverStill = () => (
  <Freeze frame={cover.frame}>
    <WorldOfWorkVideo />
  </Freeze>
);

export const RemotionRoot = () => (
  <>
    <Composition
      id={video.id}
      component={WorldOfWorkVideo}
      durationInFrames={totalFrames}
      fps={video.fps}
      width={video.width}
      height={video.height}
    />
    {/* Full-length so the frozen frame (cover.frame) lies inside the composition; render with `npm run cover`. */}
    <Composition
      id={video.coverId}
      component={CoverStill}
      durationInFrames={totalFrames}
      fps={video.fps}
      width={video.width}
      height={video.height}
    />
  </>
);
