import { Easing, interpolate } from "remotion";

/** Calm "settle" curve used for every entrance — no overshoot, no bounce. */
export const easeOut = Easing.bezier(0.16, 1, 0.3, 1);
/** Used for exits so elements accelerate away rather than drift. */
export const easeIn = Easing.bezier(0.7, 0, 0.84, 0);
export const easeInOut = Easing.bezier(0.65, 0, 0.35, 1);

/** 0→1 progress of an animation that starts at `start` and lasts `duration` frames. */
export const progress = (
  frame: number,
  start: number,
  duration: number,
  easing: (t: number) => number = easeOut,
): number =>
  interpolate(frame, [start, start + duration], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing,
  });

export const mix = (from: number, to: number, t: number): number => from + (to - from) * t;
