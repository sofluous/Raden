const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const context = { window: {}, Math, Float32Array };
const run = (relativePath) => {
  const source = fs.readFileSync(path.join(__dirname, "..", relativePath), "utf8");
  vm.runInNewContext(source, context);
};
run(path.join("src", "shared", "math_color_palette.js"));
run(path.join("src", "render", "stages.js"));
run(path.join("src", "modes", "registry.js"));
run(path.join("src", "modes", "topography.js"));

const { clamp01 } = context.window.RadenShared;
const plain = (value) => Array.from(value);
const baseNoise = (x, y) => Math.sin(x * 0.731 + y * 1.173 + 0.17);
const getPoint = (x, y, config) => ({
  nx: (x + 0.5) / config.width,
  ny: (y + 0.5) / config.height,
});

function createLegacyResult(config) {
  const effectiveScale = 620 * config.scale;
  const noiseFunc = (x, y) => {
    let total = 0;
    let amplitude = 1;
    let frequency = 1;
    let maximum = 0;
    for (let layer = 0; layer < config.layers; layer++) {
      total +=
        baseNoise(x * frequency * effectiveScale, y * frequency * effectiveScale) *
        amplitude;
      maximum += amplitude;
      amplitude *= 0.5;
      frequency *= 2;
    }
    return total / maximum;
  };
  const terrainNoise = (nx, ny) => {
    const warpAmplitude = 0.18 * config.topoWarp;
    const wx = nx + noiseFunc(nx + 7.91, ny - 4.28) * warpAmplitude;
    const wy = ny + noiseFunc(nx - 5.73, ny + 9.16) * warpAmplitude;
    const noise = noiseFunc(wx, wy);
    const ridgedSigned = (1 - Math.abs(noise)) * 2 - 1;
    return noise * (1 - config.topoRidge) + ridgedSigned * config.topoRidge;
  };
  const heights = new Float32Array(config.width * config.height);
  for (let y = 0; y < config.height; y++) {
    for (let x = 0; x < config.width; x++) {
      const point = getPoint(x, y, config);
      heights[y * config.width + x] = clamp01(
        (terrainNoise(point.nx, point.ny) + 1) / 2,
      );
    }
  }
  const erosionSteps = config.preview
    ? Math.floor(config.topoErosion * 2)
    : Math.floor(config.topoErosion * 4);
  for (let step = 0; step < erosionSteps; step++) {
    const smoothed = new Float32Array(heights.length);
    for (let y = 0; y < config.height; y++) {
      for (let x = 0; x < config.width; x++) {
        const index = y * config.width + x;
        const left = heights[y * config.width + Math.max(0, x - 1)];
        const right =
          heights[y * config.width + Math.min(config.width - 1, x + 1)];
        const up = heights[Math.max(0, y - 1) * config.width + x];
        const down =
          heights[Math.min(config.height - 1, y + 1) * config.width + x];
        const average = (left + right + up + down + heights[index]) / 5;
        smoothed[index] =
          heights[index] +
          (average - heights[index]) * (0.3 + config.topoErosion * 0.45);
      }
    }
    heights.set(smoothed);
  }
  return heights;
}

const zeroConfig = context.window.RadenTopography.normalizeTopographyConfig({
  scale: 0,
  topoRidge: 0,
  topoWarp: 0,
  topoErosion: 0,
  topoBandCount: 0,
});
assert.equal(zeroConfig.effectiveScale, 0);
assert.equal(zeroConfig.ridgeStrength, 0);
assert.equal(zeroConfig.warpStrength, 0);
assert.equal(zeroConfig.erosionStrength, 0);
assert.equal(zeroConfig.bandCount, 1);

for (const testCase of [
  {
    width: 7,
    height: 5,
    layers: 2,
    scale: 0.004,
    topoRidge: 0.18,
    topoWarp: 0.12,
    topoErosion: 0.2,
    topoBandCount: 7,
    topoRenderMode: "lines",
    topoNoiseType: "simplex",
    preview: true,
  },
  {
    width: 6,
    height: 8,
    layers: 4,
    scale: 0.013,
    topoRidge: 0.86,
    topoWarp: 0.78,
    topoErosion: 0.92,
    topoBandCount: 18,
    topoRenderMode: "fill",
    topoNoiseType: "value",
    preview: false,
  },
  {
    width: 5,
    height: 4,
    layers: 3,
    scale: 0.008,
    topoRidge: 0.5,
    topoWarp: 0.42,
    topoErosion: 0.55,
    topoBandCount: 12,
    topoRenderMode: "gradient",
    topoNoiseType: "perlin",
    preview: false,
  },
]) {
  const renderer = context.window.RadenTopography.createTopographyRenderer(
    testCase,
    { baseNoise },
  );
  const heights = renderer.createHeightField((x, y) =>
    getPoint(x, y, testCase),
  );
  renderer.erodeHeightField(heights);
  const expected = createLegacyResult(testCase);
  assert.deepEqual(plain(heights), plain(expected));

  for (let y = 0; y < testCase.height; y++) {
    for (let x = 0; x < testCase.width; x++) {
      const actual = renderer.renderPixel(x, y, heights);
      const value = expected[y * testCase.width + x];
      const band = Math.floor(value * testCase.topoBandCount);
      let color = 255;
      if (testCase.topoRenderMode === "lines") {
        const right = expected[
          y * testCase.width + Math.min(testCase.width - 1, x + 1)
        ];
        const down = expected[
          Math.min(testCase.height - 1, y + 1) * testCase.width + x
        ];
        color =
          band !== Math.floor(right * testCase.topoBandCount) ||
          band !== Math.floor(down * testCase.topoBandCount)
            ? 0
            : 255;
      } else if (testCase.topoRenderMode === "fill") {
        color = Math.floor(
          (band / Math.max(1, testCase.topoBandCount - 1)) * 255,
        );
      } else {
        color = Math.floor(value * 255);
      }
      assert.deepEqual(
        [actual.r, actual.g, actual.b, actual.a],
        [color, color, color, 255],
      );
    }
  }
}

assert.throws(
  () => context.window.RadenTopography.createTopographyRenderer({}, {}),
  /base-noise function/,
);
const registered = context.window.RadenModes.getRuntime("topography");
assert.equal(typeof registered.normalizeConfig, "function");
assert.equal(typeof registered.createRenderer, "function");
assert.equal(registered.ownsAuthoredPalette, true);
const stages = registered.describeStages().stages;
assert.deepEqual(Array.from(stages, (stage) => stage.id), ["terrain", "erosion", "contours", "authoredPalette"]);
assert.equal(stages.find((stage) => stage.id === "contours").interfaceId, "materialSource");
assert.equal(stages.find((stage) => stage.id === "authoredPalette").interfaceId, "colorTransform");

const bypassConfig = {
  width: 3,
  height: 2,
  layers: 2,
  scale: 0.006,
  topoRidge: 0.4,
  topoWarp: 0.3,
  topoErosion: 1,
  topoBandCount: 6,
  topoRenderMode: "gradient",
};
const noErosion = context.window.RadenTopography.createTopographyRenderer(bypassConfig, {
  baseNoise,
  disabledStageIds: ["erosion", "authoredPalette"],
  mapAuthoredPalette: () => { throw new Error("Disabled palette stage must not run."); },
});
const untouched = noErosion.createHeightField((x, y) => getPoint(x, y, bypassConfig));
const beforeErosion = plain(untouched);
assert.equal(noErosion.erodeHeightField(untouched), untouched);
assert.deepEqual(plain(untouched), beforeErosion);
const bypassInspection = noErosion.inspectPixel(0, 0, untouched);
assert.deepEqual(bypassInspection.pixel, bypassInspection.stages.contours);

let paletteCalls = 0;
const paletteRenderer = context.window.RadenTopography.createTopographyRenderer(bypassConfig, {
  baseNoise,
  mapAuthoredPalette: (pixel) => {
    paletteCalls += 1;
    return { ...pixel, r: pixel.r + 1 };
  },
});
const paletteHeights = paletteRenderer.createHeightField((x, y) => getPoint(x, y, bypassConfig));
paletteRenderer.erodeHeightField(paletteHeights);
const renderedPixel = paletteRenderer.renderPixel(0, 0, paletteHeights);
assert.equal(paletteCalls, 1);
assert.deepEqual(paletteRenderer.inspectPixel(0, 0, paletteHeights).pixel, renderedPixel);
assert.equal(paletteCalls, 2);
assert.throws(
  () => context.window.RadenTopography.createTopographyRenderer(bypassConfig, { baseNoise, disabledStageIds: ["terrain"] }),
  /Cannot disable required stage: terrain/,
);

const html = fs.readFileSync(path.join(__dirname, "..", "index.html"), "utf8");
assert.match(
  html,
  /topography:\s*\(runtime, nextForce, nextOptions\)\s*=>\s*generateTopography/,
);
assert.doesNotMatch(html, /function generateTopographyLegacy\(/);
assert.match(html, /getRowsPerFrame\("topography", config\.preview\)/);
assert.match(html, /completeDelayMs:\s*800/);

console.log("Topography extraction parity passed.");
