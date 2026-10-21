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
assert.match(html, /getRowsPerFrame\("lichengrowth", config\.preview\)/);
assert.match(html, /completeMessage:\s*"Lichen growth rendered"/);

const legacySource = html.match(
  /function renderLichenGrowthPixel[\s\S]*?(?=\n      function renderBubbleFilmPixel)/,
)[0];
vm.runInNewContext(legacySource, context);

const zeroConfig = context.window.RadenLichenGrowth.normalizeLichenConfig({
  naturalScale: 0,
  naturalWarp: 0,
  lichenPatchScale: 0,
  lichenBranching: 0,
  lichenEdgeRoughness: 0,
  lichenCoverage: 0,
  lichenMoistureTone: 0,
});
assert.equal(zeroConfig.naturalScale, 0.008);
assert.equal(zeroConfig.warp, 0.35);
assert.equal(zeroConfig.patchScale, 0.94);
assert.equal(zeroConfig.branching, 0.46);
assert.equal(zeroConfig.edgeRoughness, 0.58);
assert.equal(zeroConfig.coverage, 0.52);
assert.equal(zeroConfig.moisture, 0.48);

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
  },
]) {
  const normalized = context.window.RadenLichenGrowth.normalizeLichenConfig(
    testCase.config,
  );
  const legacyRuntime = Object.assign({}, runtime, {
    naturalScale: normalized.naturalScale,
    warp: normalized.warp,
  });
  const expected = context.renderLichenGrowthPixel(
    testCase.config,
    profile,
    legacyRuntime,
    testCase.nx,
    testCase.ny,
  );
  const renderer = context.window.RadenLichenGrowth.createLichenRenderer(
    testCase.config,
    runtime,
  );
  const actual = renderer.renderPixel({ nx: testCase.nx, ny: testCase.ny });
  assert.deepEqual(
    [actual.r, actual.g, actual.b, actual.a],
    JSON.parse(JSON.stringify(expected)),
  );
}

const registered = context.window.RadenModes.getRuntime("lichengrowth");
assert.equal(typeof registered.normalizeConfig, "function");
assert.equal(typeof registered.createRenderer, "function");
assert.throws(
  () => context.window.RadenLichenGrowth.createLichenRenderer({}, {}),
  /three simplex samplers/,
);

console.log("Lichen Growth extraction parity passed.");
