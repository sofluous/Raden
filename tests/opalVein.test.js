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
run(path.join("src", "modes", "opalVein.js"));

const { clamp01, smoothstep, hslToRgb } = context.window.RadenShared;
function legacyPixel(config, simplex, nx, ny) {
  const cellScale = config.opalCellScale || 0.009;
  const veinDensity = config.opalVeinDensity || 0.85;
  const fireIntensity = config.opalFire || 1.2;
  const matrix = clamp01(config.opalMatrix || 0.52);
  const n1 = simplex.noise2D(nx * 420 * cellScale, ny * 420 * cellScale);
  const n2 =
    simplex.noise2D(
      (nx + 12.37) * 820 * cellScale,
      (ny - 5.91) * 820 * cellScale,
    ) * 0.5;
  const cells = clamp01((n1 * 0.75 + n2 * 0.25 + 1) / 2);
  const veins = Math.pow(
    Math.abs(Math.sin((cells * 10 + n1 * 3.5) * Math.PI)),
    1.6 + veinDensity * 1.4,
  );
  const edge = smoothstep(0.62 - veinDensity * 0.18, 0.92, veins);
  const darkBase = 14 + matrix * 24;
  let r = darkBase;
  let g = darkBase + 2;
  let b = darkBase + 5;
  const fireHue = (cells * 360 + n2 * 120 + 360) % 360;
  const fireSat = Math.min(100, 45 + fireIntensity * 34 + edge * 14);
  const fireLum = Math.min(90, 26 + edge * 42 + fireIntensity * 8);
  const [fr, fg, fb] = hslToRgb(fireHue, fireSat, fireLum);
  const fireMask = clamp01(edge * (0.58 + fireIntensity * 0.25));
  r = r * (1 - fireMask) + fr * fireMask;
  g = g * (1 - fireMask) + fg * fireMask;
  b = b * (1 - fireMask) + fb * fireMask;
  const sparkle =
    Math.pow(clamp01((simplex.noise2D(nx * 1800, ny * 1800) + 1) / 2), 16) *
    fireIntensity *
    140;
  return { r: r + sparkle * 0.65, g: g + sparkle * 0.92, b: b + sparkle };
}

const zero = context.window.RadenOpalVein.normalizeOpalConfig({
  opalCellScale: 0,
  opalVeinDensity: 0,
  opalFire: 0,
  opalMatrix: 0,
});
assert.equal(zero.cellScale, 0.009);
assert.equal(zero.veinDensity, 0.85);
assert.equal(zero.fireIntensity, 1.2);
assert.equal(zero.matrix, 0.52);

const simplex = {
  noise2D: (x, y) => Math.sin(x * 0.713 + y * 1.119 + 0.37),
};
for (const testCase of [
  {
    config: { opalCellScale: 0.004, opalVeinDensity: 0.35, opalFire: 0.65, opalMatrix: 0.25 },
    nx: -0.23,
    ny: 0.71,
  },
  {
    config: { opalCellScale: 0.018, opalVeinDensity: 1.6, opalFire: 2.1, opalMatrix: 0.85 },
    nx: 1.14,
    ny: -0.42,
  },
]) {
  const renderer = context.window.RadenOpalVein.createOpalRenderer(
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

const runtime = context.window.RadenModes.getRuntime("opalvein");
assert.equal(typeof runtime.normalizeConfig, "function");
assert.equal(typeof runtime.createRenderer, "function");
assert.throws(
  () => context.window.RadenOpalVein.createOpalRenderer({}, {}),
  /simplex sampler/,
);

const html = fs.readFileSync(path.join(__dirname, "..", "index.html"), "utf8");
assert.match(
  html,
  /opalvein:\s*\(runtime, nextForce, nextOptions\)\s*=>\s*generateOpalVein/,
);
assert.match(html, /function generateOpalVeinLegacy\(/);
assert.match(html, /completeMessage:\s*"Opal rendered"/);
assert.match(html, /filter:\s*"blur\(7px\)"/);

console.log("Opal Vein extraction parity passed.");
