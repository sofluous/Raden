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
run(path.join("src", "shared", "cellular.js"));
run(path.join("src", "render", "stages.js"));
run(path.join("src", "modes", "registry.js"));
run(path.join("src", "modes", "lichenGrowth.js"));

const { clamp01, lerp, smoothstep } = context.window.RadenShared;
Object.assign(context, { clamp01, lerp, smoothstep });
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
  /lichengrowth:\s*\(runtime, nextForce, nextOptions\)\s*=>\s*generateLichenGrowth/,
);
assert.match(html, /function generateLichenGrowth\(/);
assert.match(html, /function generateRegisteredNaturalMode\(/);
assert.match(html, /RadenRenderPipeline\.runPixelRenderer/);

const zeroConfig = context.window.RadenLichenGrowth.normalizeLichenConfig({
  naturalScale: 0,
  naturalWarp: 0,
  lichenPatchScale: 0,
  lichenBranching: 0,
  lichenEdgeRoughness: 0,
  lichenCoverage: 0,
  lichenMoistureTone: 0,
});
assert.equal(zeroConfig.naturalScale, 0.0005);
assert.equal(zeroConfig.warp, 0);
assert.equal(zeroConfig.patchScale, 0.2);
assert.equal(zeroConfig.branching, 0);
assert.equal(zeroConfig.edgeRoughness, 0);
assert.equal(zeroConfig.coverage, 0);
assert.equal(zeroConfig.moisture, 0);

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
    [38, 48, 32],
    [88, 110, 68],
    [150, 167, 106],
    [213, 221, 180],
  ],
  seamColor: [30, 39, 26],
};

for (const testCase of [
  {
    config: {
      naturalScale: 0.003,
      naturalWarp: 0.1,
      lichenPatchScale: 0.24,
      lichenBranching: 0.07,
      lichenEdgeRoughness: 0.12,
      lichenCoverage: 0.05,
      lichenMoistureTone: 0.09,
    },
    nx: -0.44,
    ny: 0.21,
    expected: [64, 69, 56, 255],
  },
  {
    config: {
      naturalScale: 0.019,
      naturalWarp: 0.88,
      lichenPatchScale: 2.08,
      lichenBranching: 0.94,
      lichenEdgeRoughness: 0.89,
      lichenCoverage: 0.93,
      lichenMoistureTone: 0.87,
    },
    nx: 0.73,
    ny: -0.58,
    expected: [72, 87, 56, 255],
  },
]) {
  const normalized = context.window.RadenLichenGrowth.normalizeLichenConfig(
    testCase.config,
  );
  const renderer = context.window.RadenLichenGrowth.createLichenRenderer(
    testCase.config,
    runtime,
  );
  const actual = renderer.renderPixel({ nx: testCase.nx, ny: testCase.ny });
  assert.deepEqual(
    [actual.r, actual.g, actual.b, actual.a],
    testCase.expected,
  );
}

const registered = context.window.RadenModes.getRuntime("lichengrowth");
assert.equal(typeof registered.normalizeConfig, "function");
assert.equal(typeof registered.createRenderer, "function");
assert.equal(registered.ownsAuthoredPalette, true);
const stages = registered.describeStages().stages;
assert.deepEqual(Array.from(stages, (stage) => stage.id), ["colonyField", "growth", "edges", "moisture", "authoredPalette"]);
assert.equal(stages.find((stage) => stage.id === "moisture").interfaceId, "materialSource");
assert.equal(stages.find((stage) => stage.id === "authoredPalette").interfaceId, "colorTransform");

let paletteCalls = 0;
const point = { nx: 0.22, ny: -0.41 };
const paletteRenderer = context.window.RadenLichenGrowth.createLichenRenderer({}, {
  ...runtime,
  mapAuthoredPalette: (pixel) => {
    paletteCalls += 1;
    return { ...pixel, b: pixel.b + 1 };
  },
});
const rendered = paletteRenderer.renderPixel(point);
assert.equal(paletteCalls, 1);
const inspected = paletteRenderer.inspectPixel(point);
assert.equal(paletteCalls, 2);
assert.deepEqual(inspected.pixel, rendered);
assert.deepEqual(Object.keys(inspected.stages), ["colonyField", "growth", "edges", "moisture", "authoredPalette"]);

const bypassRenderer = context.window.RadenLichenGrowth.createLichenRenderer({}, {
  ...runtime,
  disabledStageIds: ["authoredPalette"],
  mapAuthoredPalette: () => { throw new Error("Disabled palette stage must not run."); },
});
const bypassInspection = bypassRenderer.inspectPixel(point);
assert.deepEqual(bypassInspection.pixel, bypassInspection.stages.moisture);
assert.throws(
  () => context.window.RadenLichenGrowth.createLichenRenderer({}, { ...runtime, disabledStageIds: ["growth"] }),
  /Cannot disable required stage: growth/,
);
assert.throws(
  () => context.window.RadenLichenGrowth.createLichenRenderer({}, {}),
  /three simplex samplers/,
);

console.log("Lichen Growth extraction parity passed.");
