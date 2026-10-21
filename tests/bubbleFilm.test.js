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
run(path.join("src", "modes", "bubbleFilm.js"));

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
  /bubblefilm:\s*\(runtime, nextForce, nextOptions\)\s*=>\s*generateBubbleFilm/,
);
assert.match(html, /function generateBubbleFilm\(/);
assert.match(html, /getRowsPerFrame\("bubblefilm", config\.preview\)/);
assert.match(html, /RadenPixelLoop\.createPixelLoop/);
assert.match(html, /completeMessage:\s*"Bubble film rendered"/);
const legacySource = html.match(
  /function renderBubbleFilmPixel[\s\S]*?(?=\n      function renderRiverDeltaPixel)/,
)[0];
vm.runInNewContext(legacySource, context);

function legacyCellular(x, y, cellScale, seed) {
  const hash2 = (hx, hy, hs) => {
    const n = Math.sin(hx * 127.1 + hy * 311.7 + hs * 0.0001) * 43758.5453123;
    return n - Math.floor(n);
  };
  const px = x * cellScale;
  const py = y * cellScale;
  const cx = Math.floor(px);
  const cy = Math.floor(py);
  let nearest = Infinity;
  let second = Infinity;
  let nearestX = 0;
  let nearestY = 0;
  let nearestId = 0;
  for (let oy = -1; oy <= 1; oy++) {
    for (let ox = -1; ox <= 1; ox++) {
      const gx = cx + ox;
      const gy = cy + oy;
      const fx = gx + 0.5 + (hash2(gx, gy, seed) - 0.5) * 0.82;
      const fy = gy + 0.5 + (hash2(gx + 13.2, gy - 8.4, seed + 17) - 0.5) * 0.82;
      const dist = Math.hypot(px - fx, py - fy);
      if (dist < nearest) {
        second = nearest;
        nearest = dist;
        nearestX = fx;
        nearestY = fy;
        nearestId = hash2(gx - 4.1, gy + 6.7, seed + 31);
      } else if (dist < second) {
        second = dist;
      }
    }
  }
  return {
    nearest,
    second,
    edge: Math.max(0, second - nearest),
    cellX: nearestX,
    cellY: nearestY,
    cellId: nearestId,
  };
}

const plain = (value) => JSON.parse(JSON.stringify(value));
for (const point of [
  { x: -0.42, y: 0.17, scale: 6.016, seed: 12031 },
  { x: 1.28, y: -0.93, scale: 9.4, seed: 9001 },
]) {
  assert.deepEqual(
    plain(context.window.RadenCellular.sampleCellularField(
      point.x,
      point.y,
      point.scale,
      point.seed,
    )),
    legacyCellular(point.x, point.y, point.scale, point.seed),
  );
}

const zeroConfig = context.window.RadenBubbleFilm.normalizeBubbleFilmConfig({
  naturalScale: 0,
  naturalWarp: 0,
  naturalTurbulence: 0,
});
assert.equal(zeroConfig.naturalScale, 0.008);
assert.equal(zeroConfig.warp, 0.35);
assert.equal(zeroConfig.turbulence, 0.62);
assert.equal(zeroConfig.cellScale, 1.06);

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
    [78, 50, 97],
    [77, 146, 181],
    [154, 223, 209],
    [249, 227, 255],
  ],
  seamColor: [55, 35, 69],
};

for (const testCase of [
  { config: { naturalScale: 0.004, naturalWarp: 0.2, naturalTurbulence: 0.1 }, nx: -0.44, ny: 0.21 },
  { config: { naturalScale: 0.011, naturalWarp: 0.62, naturalTurbulence: 0.68 }, nx: 0.73, ny: -0.58 },
]) {
  const normalized = context.window.RadenBubbleFilm.normalizeBubbleFilmConfig(
    testCase.config,
  );
  const legacyRuntime = Object.assign({}, runtime, {
    naturalScale: normalized.naturalScale,
    warp: normalized.warp,
    turbulence: normalized.turbulence,
  });
  const expected = context.renderBubbleFilmPixel(
    testCase.config,
    profile,
    legacyRuntime,
    testCase.nx,
    testCase.ny,
  );
  const renderer = context.window.RadenBubbleFilm.createBubbleFilmRenderer(
    testCase.config,
    runtime,
  );
  const actual = renderer.renderPixel({ nx: testCase.nx, ny: testCase.ny });
  assert.deepEqual(
    [actual.r, actual.g, actual.b, actual.a],
    plain(expected),
  );
}

const registered = context.window.RadenModes.getRuntime("bubblefilm");
assert.equal(typeof registered.normalizeConfig, "function");
assert.equal(typeof registered.createRenderer, "function");
assert.throws(
  () => context.window.RadenBubbleFilm.createBubbleFilmRenderer({}, {}),
  /simplex samplers/,
);

console.log("Bubble Film extraction parity passed.");
