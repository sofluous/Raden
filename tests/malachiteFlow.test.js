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
assert.match(html, /getRowsPerFrame\("malachiteflow", config\.preview\)/);
assert.match(html, /completeMessage:\s*"Malachite flow rendered"/);

const legacySource = html.match(
  /function renderMalachiteFlowPixel[\s\S]*?(?=\n      function pointSegmentDistance)/,
)[0];
vm.runInNewContext(legacySource, context);

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
assert.equal(zeroConfig.naturalScale, 0.008);
assert.equal(zeroConfig.warp, 0.35);
assert.equal(zeroConfig.turbulence, 0.62);
assert.equal(zeroConfig.anisotropy, 0.25);
assert.equal(zeroConfig.swirl, 0.58);
assert.equal(zeroConfig.ringTightness, 1.16);
assert.equal(zeroConfig.ringVariance, 0.36);
assert.equal(zeroConfig.contrast, 1.08);

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
  },
]) {
  const normalized = context.window.RadenMalachiteFlow.normalizeMalachiteConfig(
    testCase.config,
  );
  const legacyRuntime = Object.assign({}, runtime, {
    naturalScale: normalized.naturalScale,
    warp: normalized.warp,
    turbulence: normalized.turbulence,
    anisotropy: normalized.anisotropy,
  });
  const expected = context.renderMalachiteFlowPixel(
    testCase.config,
    profile,
    legacyRuntime,
    testCase.nx,
    testCase.ny,
  );
  const renderer = context.window.RadenMalachiteFlow.createMalachiteRenderer(
    testCase.config,
    runtime,
  );
  const actual = renderer.renderPixel({ nx: testCase.nx, ny: testCase.ny });
  assert.deepEqual(
    [actual.r, actual.g, actual.b, actual.a],
    JSON.parse(JSON.stringify(expected)),
  );
}

const registered = context.window.RadenModes.getRuntime("malachiteflow");
assert.equal(typeof registered.normalizeConfig, "function");
assert.equal(typeof registered.createRenderer, "function");
assert.throws(
  () => context.window.RadenMalachiteFlow.createMalachiteRenderer({}, {}),
  /three simplex samplers/,
);

console.log("Malachite Flow extraction parity passed.");
