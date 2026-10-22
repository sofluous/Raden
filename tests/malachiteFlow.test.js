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
run(path.join("src", "modes", "malachiteFlow.js"));

const { clamp01, lerp } = context.window.RadenShared;
Object.assign(context, { clamp01, lerp });
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
  /malachiteflow:\s*\(runtime, nextForce, nextOptions\)\s*=>\s*generateMalachiteFlow/,
);
assert.match(html, /function generateMalachiteFlow\(/);
assert.match(html, /function generateRegisteredNaturalMode\(/);
assert.match(html, /RadenRenderPipeline\.runPixelRenderer/);

const zeroConfig = context.window.RadenMalachiteFlow.normalizeMalachiteConfig({
  naturalScale: 0,
  naturalWarp: 0,
  naturalTurbulence: 0,
  naturalAnisotropy: 0,
  malachiteSwirl: 0,
  malachiteRingTightness: 0,
  malachiteRingVariance: 0,
  malachiteContrast: 0,
});
assert.equal(zeroConfig.naturalScale, 0.0005);
assert.equal(zeroConfig.warp, 0);
assert.equal(zeroConfig.turbulence, 0);
assert.equal(zeroConfig.anisotropy, 0);
assert.equal(zeroConfig.swirl, 0);
assert.equal(zeroConfig.ringTightness, 0.2);
assert.equal(zeroConfig.ringVariance, 0);
assert.equal(zeroConfig.contrast, 0.2);

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
    [8, 49, 38],
    [22, 98, 74],
    [58, 161, 120],
    [171, 221, 192],
  ],
  seamColor: [7, 37, 29],
};

for (const testCase of [
  {
    config: {
      naturalScale: 0.003,
      naturalWarp: 0.12,
      naturalTurbulence: 0.08,
      naturalAnisotropy: 0.04,
      malachiteSwirl: 0.09,
      malachiteRingTightness: 0.45,
      malachiteRingVariance: 0.11,
      malachiteContrast: 0.42,
    },
    nx: -0.44,
    ny: 0.21,
    expected: [36, 114, 86, 255],
  },
  {
    config: {
      naturalScale: 0.019,
      naturalWarp: 0.88,
      naturalTurbulence: 1.28,
      naturalAnisotropy: 0.91,
      malachiteSwirl: 0.94,
      malachiteRingTightness: 2.08,
      malachiteRingVariance: 0.89,
      malachiteContrast: 1.86,
    },
    nx: 0.73,
    ny: -0.58,
    expected: [142, 204, 171, 255],
  },
]) {
  const normalized = context.window.RadenMalachiteFlow.normalizeMalachiteConfig(
    testCase.config,
  );
  const renderer = context.window.RadenMalachiteFlow.createMalachiteRenderer(
    testCase.config,
    runtime,
  );
  const actual = renderer.renderPixel({ nx: testCase.nx, ny: testCase.ny });
  assert.deepEqual(
    [actual.r, actual.g, actual.b, actual.a],
    testCase.expected,
  );
}

const registered = context.window.RadenModes.getRuntime("malachiteflow");
assert.equal(typeof registered.normalizeConfig, "function");
assert.equal(typeof registered.createRenderer, "function");
assert.equal(registered.ownsAuthoredPalette, true);
const stages = registered.describeStages().stages;
assert.deepEqual(Array.from(stages, (stage) => stage.id), [
  "stoneField",
  "rings",
  "stone",
  "authoredPalette",
]);
assert.equal(stages.find((stage) => stage.id === "stone").interfaceId, "materialSource");
assert.equal(stages.find((stage) => stage.id === "authoredPalette").interfaceId, "colorTransform");

let paletteCalls = 0;
const paletteRenderer = context.window.RadenMalachiteFlow.createMalachiteRenderer(
  {},
  {
    ...runtime,
    mapAuthoredPalette: (pixel) => {
      paletteCalls += 1;
      return { ...pixel, g: pixel.g + 1 };
    },
  },
);
const point = { nx: 0.28, ny: -0.39 };
const rendered = paletteRenderer.renderPixel(point);
assert.equal(paletteCalls, 1);
const inspected = paletteRenderer.inspectPixel(point);
assert.equal(paletteCalls, 2);
assert.deepEqual(inspected.pixel, rendered);
assert.deepEqual(Object.keys(inspected.stages), [
  "stoneField",
  "rings",
  "stone",
  "authoredPalette",
]);

const bypassRenderer = context.window.RadenMalachiteFlow.createMalachiteRenderer(
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
  () => context.window.RadenMalachiteFlow.createMalachiteRenderer({}, { ...runtime, disabledStageIds: ["rings"] }),
  /Cannot disable required stage: rings/,
);
assert.throws(
  () => context.window.RadenMalachiteFlow.createMalachiteRenderer({}, {}),
  /three simplex samplers/,
);

console.log("Malachite Flow extraction parity passed.");
