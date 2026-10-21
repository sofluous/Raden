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
assert.match(html, /getRowsPerFrame\("agateband", config\.preview\)/);
assert.match(html, /completeMessage:\s*"Agate bands rendered"/);

const legacySource = html.match(
  /function renderAgateBandPixel[\s\S]*?(?=\n      function renderMalachiteFlowPixel)/,
)[0];
vm.runInNewContext(legacySource, context);

const zeroConfig = context.window.RadenAgateBands.normalizeAgateConfig({
  naturalScale: 0,
  naturalWarp: 0,
  agateBandFreq: 0,
  agateBandJitter: 0,
  agateVeinDensity: 0,
  agateTranslucency: 0,
  agateEdgeDarken: 0,
});
assert.equal(zeroConfig.naturalScale, 0.008);
assert.equal(zeroConfig.warp, 0.35);
assert.equal(zeroConfig.bandFreq, 1.18);
assert.equal(zeroConfig.bandJitter, 0.34);
assert.equal(zeroConfig.veinDensity, 0.74);
assert.equal(zeroConfig.translucency, 0.58);
assert.equal(zeroConfig.edgeDarken, 0.52);

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
  },
]) {
  const normalized = context.window.RadenAgateBands.normalizeAgateConfig(
    testCase.config,
  );
  const legacyRuntime = Object.assign({}, runtime, {
    naturalScale: normalized.naturalScale,
    warp: normalized.warp,
  });
  const expected = context.renderAgateBandPixel(
    testCase.config,
    profile,
    legacyRuntime,
    testCase.nx,
    testCase.ny,
  );
  const renderer = context.window.RadenAgateBands.createAgateRenderer(
    testCase.config,
    runtime,
  );
  const actual = renderer.renderPixel({ nx: testCase.nx, ny: testCase.ny });
  assert.deepEqual(
    [actual.r, actual.g, actual.b, actual.a],
    JSON.parse(JSON.stringify(expected)),
  );
}

const registered = context.window.RadenModes.getRuntime("agateband");
assert.equal(typeof registered.normalizeConfig, "function");
assert.equal(typeof registered.createRenderer, "function");
assert.throws(
  () => context.window.RadenAgateBands.createAgateRenderer({}, {}),
  /three simplex samplers/,
);

console.log("Agate Bands extraction parity passed.");
