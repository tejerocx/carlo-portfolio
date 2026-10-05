// Renders QC stills at every scene midpoint, transition and hold, into ./qc
import { execFileSync } from "node:child_process";
import { mkdirSync } from "node:fs";

const frames = process.argv.slice(2).map(Number);
const list = frames.length
  ? frames
  : [0, 10, 30, 60, 100, 112, 118, 122, 128, 140, 170, 200, 230, 255, 262, 268, 274, 290, 320, 360, 405, 414, 420, 428, 450, 480, 520, 545, 556, 566, 572, 580, 600, 615, 650, 719];
mkdirSync("qc", { recursive: true });
const browser = process.env.REMOTION_BROWSER ? ["--browser-executable", process.env.REMOTION_BROWSER] : [];
for (const f of list) {
  execFileSync("npx", ["remotion", "still", "WorldOfWork", `qc/f${String(f).padStart(3, "0")}.png`, `--frame=${f}`, "--log=error", ...browser], { stdio: "inherit" });
}
