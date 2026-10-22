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
run(path.join("src", "modes", "marbleInk.js"));

const { clamp01, smoothstep } = context.window.RadenShared;
function legacyPixel(config, simplex, nx, ny) {
  const flowScale = config.marbleFlowScale || 0.007;
  const veinFreq = config.marbleVeinFreq || 1.2;
  const contrast = config.marbleContrast || 0.78;
  const inkDrift = clamp01(config.marbleInkDrift || 0.42);
  const stoneLightness = clamp01(config.marbleLightness || 0.72);
  const warp1 = simplex.noise2D(nx * 900 * flowScale, ny * 900 * flowScale) * inkDrift * 0.32;
  const warp2 =
    simplex.noise2D(
      (nx + 4.7) * 1600 * flowScale,
      (ny - 1.8) * 1600 * flowScale,
    ) *
    inkDrift *
    0.18;
  const px = nx + warp1;
  const py = ny + warp2;
  const n = simplex.noise2D(px * 1200 * flowScale, py * 1200 * flowScale);
  const n2 =
    simplex.noise2D(
      (px + 2.3) * 2400 * flowScale,
      (py - 2.1) * 2400 * flowScale,
    ) * 0.4;
  const flow = n * 0.7 + n2 * 0.3;
  const vein = Math.pow(
    Math.abs(Math.sin((flow * veinFreq * 4.2 + py * 3.2) * Math.PI)),
    1.4 + contrast * 1.7,
  );
  const veinMask = smoothstep(0.62 - contrast * 0.2, 0.96, vein);
  const stone = Math.round(145 + stoneLightness * 92 + flow * 9);
  let r = stone;
  let g = stone - 4;
  let b = stone - 10;
  const warmVein = 42 + contrast * 38;
  r = r * (1 - veinMask) + warmVein * veinMask;
  g = g * (1 - veinMask) + (warmVein - 10) * veinMask;
  b = b * (1 - veinMask) + (warmVein - 18) * veinMask;
  const cloud = clamp01(
    (simplex.noise2D(px * 400 * flowScale, py * 400 * flowScale) + 1) / 2,
  );
  return { r: r + cloud * 14, g: g + cloud * 11, b: b + cloud * 7 };
}

const zero = context.window.RadenMarbleInk.normalizeMarbleConfig({
  marbleFlowScale: 0,
  marbleVeinFreq: 0,
  marbleContrast: 0,
  marbleInkDrift: 0,
  marbleLightness: 0,
});
assert.equal(zero.flowScale, 0.002);
assert.equal(zero.veinFreq, 0.2);
assert.equal(zero.contrast, 0);
assert.equal(zero.inkDrift, 0);
assert.equal(zero.stoneLightness, 0);

const simplex = {
  noise2D: (x, y) => Math.sin(x * 0.811 + y * 1.037 + 0.52),
};
for (const testCase of [
  {
    config: {
      marbleFlowScale: 0.003,
      marbleVeinFreq: 0.45,
      marbleContrast: 0.25,
      marbleInkDrift: 0.08,
      marbleLightness: 0.45,
    },
    nx: 0.18,
    ny: 0.76,
  },
  {
    config: {
      marbleFlowScale: 0.014,
      marbleVeinFreq: 2.4,
      marbleContrast: 1.3,
      marbleInkDrift: 0.92,
      marbleLightness: 0.94,
    },
    nx: 1.08,
    ny: -0.37,
  },
]) {
  const renderer = context.window.RadenMarbleInk.createMarbleRenderer(
    testCase.config,
    { simplex },
  );
  const actual = renderer.renderPixel({ nx: testCase.nx, ny: testCase.ny });
  const expected = legacyPixel(testCase.config, simplex, testCase.nx, testCase.ny);
  assert.equal(actual.r, expected.r);
  assert.equal(actual.g, expected.g);
  assert.equal(actual.b, expected.b);
  assert.equal(actual.a, 255);
}

const runtime = context.window.RadenModes.getRuntime("marbleink");
assert.equal(typeof runtime.normalizeConfig, "function");
assert.equal(typeof runtime.createRenderer, "function");
const stages = runtime.describeStages().stages;
assert.deepEqual(Array.from(stages, (stage) => stage.id), [
  "flowField",
  "veins",
  "stone",
  "authoredPalette",
]);
assert.equal(stages.find((stage) => stage.id === "stone").interfaceId, "materialSource");
assert.equal(stages.find((stage) => stage.id === "authoredPalette").interfaceId, "colorTransform");

let paletteCalls = 0;
const paletteRenderer = context.window.RadenMarbleInk.createMarbleRenderer(
  {},
  {
    simplex,
    mapAuthoredPalette: (pixel) => {
      paletteCalls += 1;
      return { ...pixel, g: pixel.g + 1 };
    },
  },
);
const point = { nx: -0.31, ny: 0.47 };
const rendered = paletteRenderer.renderPixel(point);
assert.equal(paletteCalls, 1);
const inspected = paletteRenderer.inspectPixel(point);
assert.equal(paletteCalls, 2);
assert.deepEqual(inspected.pixel, rendered);
assert.deepEqual(Object.keys(inspected.stages), [
  "flowField",
  "veins",
  "stone",
  "authoredPalette",
]);

const bypassRenderer = context.window.RadenMarbleInk.createMarbleRenderer(
  {},
  {
    simplex,
    disabledStageIds: ["authoredPalette"],
    mapAuthoredPalette: () => {
      throw new Error("Disabled palette stage must not run.");
    },
  },
);
const bypassInspection = bypassRenderer.inspectPixel(point);
assert.deepEqual(bypassInspection.pixel, bypassInspection.stages.stone);
assert.throws(
  () => context.window.RadenMarbleInk.createMarbleRenderer({}, { simplex, disabledStageIds: ["stone"] }),
  /Cannot disable required stage: stone/,
);
assert.throws(
  () => context.window.RadenMarbleInk.createMarbleRenderer({}, {}),
  /simplex sampler/,
);

const html = fs.readFileSync(path.join(__dirname, "..", "index.html"), "utf8");
assert.match(
  html,
  /marbleink:\s*\(runtime, nextForce, nextOptions\)\s*=>\s*generateMarbleInk/,
);
assert.doesNotMatch(html, /function generateMarbleInkLegacy\(/);
assert.match(html, /completeMessage:\s*"Marble rendered"/);
assert.match(html, /filter:\s*"blur\(5px\)"/);

console.log("Marble Ink extraction parity passed.");
