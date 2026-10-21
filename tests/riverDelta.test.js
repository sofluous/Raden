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
assert.match(html, /getRowsPerFrame\("riverdelta", config\.preview\)/);
assert.match(html, /completeMessage:\s*"River delta rendered"/);

const legacySource = html.match(
  /function renderRiverDeltaPixel[\s\S]*?(?=\n      function generatePhase4ModePlaceholder)/,
)[0];
vm.runInNewContext(legacySource, context);

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
assert.equal(zeroConfig.naturalScale, 0.008);
assert.equal(zeroConfig.warp, 0.35);
assert.equal(zeroConfig.turbulence, 0.62);
assert.equal(zeroConfig.anisotropy, 0.25);
assert.equal(zeroConfig.channelWidth, 0.48);
assert.equal(zeroConfig.branchRate, 0.52);
assert.equal(zeroConfig.sedimentMix, 0.46);
assert.equal(zeroConfig.floodplainSoftness, 0.56);
assert.equal(zeroConfig.erosion, 0.38);

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
  },
]) {
  const normalized = context.window.RadenRiverDelta.normalizeRiverDeltaConfig(
    testCase.config,
  );
  const legacyRuntime = Object.assign({}, runtime, {
    naturalScale: normalized.naturalScale,
    warp: normalized.warp,
    turbulence: normalized.turbulence,
    anisotropy: normalized.anisotropy,
  });
  const expected = context.renderRiverDeltaPixel(
    testCase.config,
    profile,
    legacyRuntime,
    testCase.nx,
    testCase.ny,
  );
  const renderer = context.window.RadenRiverDelta.createRiverDeltaRenderer(
    testCase.config,
    runtime,
  );
  const actual = renderer.renderPixel({ nx: testCase.nx, ny: testCase.ny });
  assert.deepEqual(
    [actual.r, actual.g, actual.b, actual.a],
    JSON.parse(JSON.stringify(expected)),
  );
}

const registered = context.window.RadenModes.getRuntime("riverdelta");
assert.equal(typeof registered.normalizeConfig, "function");
assert.equal(typeof registered.createRenderer, "function");
assert.throws(
  () => context.window.RadenRiverDelta.createRiverDeltaRenderer({}, {}),
  /three simplex samplers/,
);

console.log("River Delta extraction parity passed.");
