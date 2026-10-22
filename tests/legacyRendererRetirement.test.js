const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const html = fs.readFileSync(path.join(__dirname, "..", "index.html"), "utf8");

for (const retiredName of [
  "renderAgateBandPixel",
  "renderMalachiteFlowPixel",
  "renderLichenGrowthPixel",
  "renderBubbleFilmPixel",
  "renderRiverDeltaPixel",
  "generatePhase4ModePlaceholder",
  "generateOpalVeinLegacy",
  "generateLabradoriteFlashLegacy",
  "generateMarbleInkLegacy",
  "generateTopographyLegacy",
]) {
  assert.doesNotMatch(html, new RegExp(`function\\s+${retiredName}\\b`));
}

assert.match(html, /function generateIceBloomLegacy\(/);
assert.match(
  html,
  /case "icebloom":\s*generateIceBloomLegacy\(force, renderOptions\)/,
);
assert.match(html, /setStatus\("error", `Renderer unavailable: \$\{mode\}`\)/);

console.log("Legacy renderer retirement guard passed.");
