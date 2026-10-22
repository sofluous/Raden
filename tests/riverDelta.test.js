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
run(path.join("src", "modes", "riverDelta.js"));

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
  /riverdelta:\s*\(runtime, nextForce, nextOptions\)\s*=>\s*generateRiverDelta/,
);
assert.match(html, /function generateRiverDelta\(/);
assert.match(html, /function generateRegisteredNaturalMode\(/);
assert.match(html, /RadenRenderPipeline\.runPixelRenderer/);

const zeroConfig = context.window.RadenRiverDelta.normalizeRiverDeltaConfig({
  naturalScale: 0,
  naturalWarp: 0,
  naturalTurbulence: 0,
  naturalAnisotropy: 0,
  deltaChannelWidth: 0,
  deltaBranchRate: 0,
  deltaSedimentMix: 0,
  deltaFloodplainSoftness: 0,
  deltaErosion: 0,
});
assert.equal(zeroConfig.naturalScale, 0.0005);
assert.equal(zeroConfig.warp, 0);
assert.equal(zeroConfig.turbulence, 0);
assert.equal(zeroConfig.anisotropy, 0);
assert.equal(zeroConfig.channelWidth, 0.05);
assert.equal(zeroConfig.branchRate, 0);
assert.equal(zeroConfig.sedimentMix, 0);
assert.equal(zeroConfig.floodplainSoftness, 0);
assert.equal(zeroConfig.erosion, 0);

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
    [43, 57, 74],
    [88, 121, 133],
    [157, 169, 132],
    [218, 208, 170],
  ],
  seamColor: [35, 48, 61],
};

for (const testCase of [
  {
    config: {
      naturalScale: 0.003,
      naturalWarp: 0.1,
      naturalTurbulence: 0.08,
      naturalAnisotropy: 0.04,
      deltaChannelWidth: 0.11,
      deltaBranchRate: 0.07,
      deltaSedimentMix: 0.09,
      deltaFloodplainSoftness: 0.12,
      deltaErosion: 0.06,
    },
    nx: -0.44,
    ny: 0.21,
    expected: [57, 77, 92, 255],
  },
  {
    config: {
      naturalScale: 0.019,
      naturalWarp: 0.88,
      naturalTurbulence: 1.28,
      naturalAnisotropy: 0.91,
      deltaChannelWidth: 1.18,
      deltaBranchRate: 0.94,
      deltaSedimentMix: 0.93,
      deltaFloodplainSoftness: 0.89,
      deltaErosion: 0.87,
    },
    nx: 0.73,
    ny: -0.58,
    expected: [124, 143, 132, 255],
  },
]) {
  const normalized = context.window.RadenRiverDelta.normalizeRiverDeltaConfig(
    testCase.config,
  );
  const renderer = context.window.RadenRiverDelta.createRiverDeltaRenderer(
    testCase.config,
    runtime,
  );
  const actual = renderer.renderPixel({ nx: testCase.nx, ny: testCase.ny });
  assert.deepEqual(
    [actual.r, actual.g, actual.b, actual.a],
    testCase.expected,
  );
}

const registered = context.window.RadenModes.getRuntime("riverdelta");
assert.equal(typeof registered.normalizeConfig, "function");
assert.equal(typeof registered.createRenderer, "function");
assert.equal(registered.ownsAuthoredPalette, true);
const stages = registered.describeStages().stages;
assert.deepEqual(Array.from(stages, (stage) => stage.id), ["flowField", "channels", "floodplain", "erosion", "authoredPalette"]);
assert.equal(stages.find((stage) => stage.id === "floodplain").interfaceId, "materialSource");
assert.equal(stages.find((stage) => stage.id === "erosion").interfaceId, "colorTransform");
assert.equal(stages.find((stage) => stage.id === "authoredPalette").interfaceId, "colorTransform");

let paletteCalls = 0;
const point = { nx: 0.19, ny: -0.36 };
const paletteRenderer = context.window.RadenRiverDelta.createRiverDeltaRenderer({}, {
  ...runtime,
  mapAuthoredPalette: (pixel) => {
    paletteCalls += 1;
    return { ...pixel, r: pixel.r + 1 };
  },
});
const rendered = paletteRenderer.renderPixel(point);
assert.equal(paletteCalls, 1);
const inspected = paletteRenderer.inspectPixel(point);
assert.equal(paletteCalls, 2);
assert.deepEqual(inspected.pixel, rendered);
assert.deepEqual(Object.keys(inspected.stages), ["flowField", "channels", "floodplain", "erosion", "authoredPalette"]);

const bypassRenderer = context.window.RadenRiverDelta.createRiverDeltaRenderer({}, {
  ...runtime,
  disabledStageIds: ["erosion", "authoredPalette"],
  mapAuthoredPalette: () => { throw new Error("Disabled palette stage must not run."); },
});
const bypassInspection = bypassRenderer.inspectPixel(point);
assert.equal(bypassInspection.pixel.r, bypassInspection.stages.floodplain.r);
assert.equal(bypassInspection.pixel.g, bypassInspection.stages.floodplain.g);
assert.equal(bypassInspection.pixel.b, bypassInspection.stages.floodplain.b);
assert.throws(
  () => context.window.RadenRiverDelta.createRiverDeltaRenderer({}, { ...runtime, disabledStageIds: ["channels"] }),
  /Cannot disable required stage: channels/,
);
assert.throws(
  () => context.window.RadenRiverDelta.createRiverDeltaRenderer({}, {}),
  /three simplex samplers/,
);

console.log("River Delta extraction parity passed.");
