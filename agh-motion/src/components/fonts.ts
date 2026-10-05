import { loadFont } from "@remotion/fonts";
import { useEffect, useState } from "react";
import { cancelRender, continueRender, delayRender, staticFile } from "remotion";
import { type } from "../content/world-of-work";

const weights = [600, 700, 800] as const;

let fontsPromise: Promise<void> | null = null;

const loadBrandFonts = (): Promise<void> => {
  fontsPromise ??= Promise.all(
    weights.map((weight) =>
      loadFont({
        family: type.family,
        url: staticFile(`fonts/montserrat-latin-${weight}-normal.woff2`),
        weight: String(weight),
      }),
    ),
  ).then(() => undefined);
  return fontsPromise;
};

/** Blocks frame capture until the bundled fonts are ready, so text is never measured or drawn in a fallback face. */
export const useFontsReady = (): boolean => {
  const [ready, setReady] = useState(false);
  const [handle] = useState(() => delayRender("Loading brand fonts"));

  useEffect(() => {
    loadBrandFonts()
      .then(() => {
        setReady(true);
        continueRender(handle);
      })
      .catch((err: unknown) => cancelRender(err instanceof Error ? err : new Error(String(err))));
  }, [handle]);

  return ready;
};
