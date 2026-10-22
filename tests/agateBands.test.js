const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const context = { window: {}, Math };
const run = (relativePath) => {
  const source = fs.readFileSync(path.join(__dirname, "..", relativePath), "utf8");
  vm.runInNewContext(source, context);
};
run(path.join("src", "shared", "math_color_palette.js"));
run(path.join("src", "render", "stages.js"));
run(path.join("src", "modes", "registry.js"));
run(path.join("src", "modes", "agateBands.js"));

const { clamp01, lerp, hslToRgb } = context.window.RadenShared;
Object.assign(context, { clamp01, lerp, hslToRgb });
context.sampleNaturalPalette = (palette, value) => {
  const scaled = clamp01(value) * (palette.length - 1);
  const index = Math.floor(scaled);
  const next = Math.min(palette.length - 1, index + 1);
  const mix = scaled - index;
  return palette[index].map((channel, channelIndex) =>
    Math.round(lerp(channel, palette[next][channelIndex], mix)),
  );
};

const html = fs.readFileSync(path.join(__dirname, "..", "index.html"), "utf8");
assert.match(
  html,
  /agateband:\s*\(runtime, nextForce, nextOptions\)\s*=>\s*generateAgateBands/,
);
assert.match(html, /function generateAgateBands\(/);
assert.match(html, /function generateRegisteredNaturalMode\(/);
assert.match(html, /RadenRenderPipeline\.runPixelRenderer/);

const zeroConfig = context.window.RadenAgateBands.normalizeAgateConfig({
  naturalScale: 0,
  naturalWarp: 0,
  agateBandFreq: 0,
  agateBandJitter: 0,
  agateVeinDensity: 0,
  agateTranslucency: 0,
  agateEdgeDarken: 0,
});
assert.equal(zeroConfig.naturalScale, 0.0005);
assert.equal(zeroConfig.warp, 0);
assert.equal(zeroConfig.bandFreq, 0.2);
assert.equal(zeroConfig.bandJitter, 0);
assert.equal(zeroConfig.veinDensity, 0);
assert.equal(zeroConfig.translucency, 0);
assert.equal(zeroConfig.edgeDarken, 0);

const makeSimplex = (offset) => ({
  noise2D: (x, y) => Math.sin(x * 0.731 + y * 1.173 + offset),
});
const runtime = {
  simplexBase: makeSimplex(0.17),
  simplexWarp: makeSimplex(1.31),
  simplexDetail: makeSimplex(-0.83),
};
const profile = {
  palette: [
    [64, 40, 30],
    [139, 92, 67],
    [214, 170, 129],
    [238, 225, 205],
  ],
  seamColor: [89, 48, 36],
};

for (const testCase of [
  {
    config: {
      naturalScale: 0.003,
      naturalWarp: 0.12,
      agateBandFreq: 0.35,
      agateBandJitter: 0.08,
      agateVeinDensity: 0.2,
      agateTranslucency: 0.18,
      agateEdgeDarken: 0.22,
    },
    nx: -0.44,
    ny: 0.21,
    expected: [212, 169, 128, 255],
  },
  {
    config: {
      naturalScale: 0.012,
      naturalWarp: 0.82,
      agateBandFreq: 2.3,
      agateBandJitter: 0.91,
      agateVeinDensity: 1.4,
      agateTranslucency: 0.87,
      agateEdgeDarken: 0.96,
    },
    nx: 0.73,
    ny: -0.58,
    expected: [114, 72, 52, 255],
  },
]) {
  const normalized = context.window.RadenAgateBands.normalizeAgateConfig(
    testCase.config,
  );
  const renderer = context.window.RadenAgateBands.createAgateRenderer(
    testCase.config,
    runtime,
  );
  const actual = renderer.renderPixel({ nx: testCase.nx, ny: testCase.ny });
  assert.deepEqual(
    [actual.r, actual.g, actual.b, actual.a],
    testCase.expected,
  );
}

const registered = context.window.RadenModes.getRuntime("agateband");
assert.equal(typeof registered.normalizeConfig, "function");
assert.equal(typeof registered.createRenderer, "function");
assert.equal(registered.ownsAuthoredPalette, true);
const stages = registered.describeStages().stages;
assert.deepEqual(Array.from(stages, (stage) => stage.id), [
  "stoneField",
  "bands",
  "veins",
  "stone",
  "authoredPalette",
]);
assert.equal(stages.find((stage) => stage.id === "stone").interfaceId, "materialSource");
assert.equal(stages.find((stage) => stage.id === "authoredPalette").interfaceId, "colorTransform");

let paletteCalls = 0;
const paletteRenderer = context.window.RadenAgateBands.createAgateRenderer(
  {},
  {
    ...runtime,
    mapAuthoredPalette: (pixel) => {
      paletteCalls += 1;
      return { ...pixel, r: pixel.r + 1 };
    },
  },
);
const point = { nx: 0.24, ny: -0.35 };
const rendered = paletteRenderer.renderPixel(point);
assert.equal(paletteCalls, 1);
const inspected = paletteRenderer.inspectPixel(point);
assert.equal(paletteCalls, 2);
assert.deepEqual(inspected.pixel, rendered);
assert.deepEqual(Object.keys(inspected.stages), [
  "stoneField",
  "bands",
  "veins",
  "stone",
  "authoredPalette",
]);

const bypassRenderer = context.window.RadenAgateBands.createAgateRenderer(
  {},
  {
    ...runtime,
    disabledStageIds: ["authoredPalette"],
    mapAuthoredPalette: () => {
      throw new Error("Disabled palette stage must not run.");
    },
  },
);
const bypassInspection = bypassRenderer.inspectPixel(point);
assert.deepEqual(bypassInspection.pixel, bypassInspection.stages.stone);
assert.throws(
  () => context.window.RadenAgateBands.createAgateRenderer({}, { ...runtime, disabledStageIds: ["bands"] }),
  /Cannot disable required stage: bands/,
);
assert.throws(
  () => context.window.RadenAgateBands.createAgateRenderer({}, {}),
  /three simplex samplers/,
);

console.log("Agate Bands extraction parity passed.");
