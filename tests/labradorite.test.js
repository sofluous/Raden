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
run(path.join("src", "modes", "labradorite.js"));

const { clamp01, hslToRgb } = context.window.RadenShared;
function legacyPixel(config, simplex, nx, ny) {
  const scale = config.labradoriteScale || 0.008;
  const bandSharpness = config.labradoriteBanding || 1.6;
  const flashStrength = config.labradoriteFlash || 1.35;
  const baseDarkness = clamp01(config.labradoriteDarkness || 0.68);
  const direction = (config.labradoriteDirection || 0.33) * Math.PI * 2;
  const dirX = Math.cos(direction);
  const dirY = Math.sin(direction);
  const nBase = simplex.noise2D(
    (nx + 0.5) * 680 * scale,
    (ny + 0.5) * 680 * scale,
  );
  const nDetail =
    simplex.noise2D(
      (nx + 1.8) * 1400 * scale,
      (ny - 2.4) * 1400 * scale,
    ) * 0.45;
  const field = nBase * 0.75 + nDetail * 0.25;
  const directionBand = nx * dirX + ny * dirY;
  const band = Math.pow(
    Math.abs(
      Math.sin(
        (directionBand * (36 + bandSharpness * 22) + field * 2.1) * Math.PI,
      ),
    ),
    1.2 + bandSharpness,
  );
  const flashMask = clamp01(
    band * (0.4 + flashStrength * 0.42) + clamp01((field + 1) / 2) * 0.16,
  );
  const base = 8 + (1 - baseDarkness) * 24;
  let r = base;
  let g = base + 2;
  let b = base + 5;
  const hue = (178 + field * 48 + directionBand * 90 + 360) % 360;
  const sat = Math.min(100, 42 + flashStrength * 28 + flashMask * 20);
  const lum = Math.min(88, 18 + flashMask * 52);
  const [fr, fg, fb] = hslToRgb(hue, sat, lum);
  r = r * (1 - flashMask) + fr * flashMask;
  g = g * (1 - flashMask) + fg * flashMask;
  b = b * (1 - flashMask) + fb * flashMask;
  const spark =
    Math.pow(
      clamp01((simplex.noise2D((nx + 4.2) * 2600, (ny - 1.3) * 2600) + 1) / 2),
      18,
    ) *
    flashStrength *
    170;
  return { r: r + spark * 0.45, g: g + spark * 0.8, b: b + spark };
}

const zero = context.window.RadenLabradorite.normalizeLabradoriteConfig({
  labradoriteScale: 0,
  labradoriteDirection: 0,
  labradoriteBanding: 0,
  labradoriteFlash: 0,
  labradoriteDarkness: 0,
});
assert.equal(zero.scale, 0.008);
assert.equal(zero.direction, 0.33 * Math.PI * 2);
assert.equal(zero.bandSharpness, 1.6);
assert.equal(zero.flashStrength, 1.35);
assert.equal(zero.baseDarkness, 0.68);

const simplex = {
  noise2D: (x, y) => Math.sin(x * 0.619 + y * 1.271 - 0.28),
};
for (const testCase of [
  {
    config: {
      labradoriteScale: 0.003,
      labradoriteDirection: 0.12,
      labradoriteBanding: 0.7,
      labradoriteFlash: 0.7,
      labradoriteDarkness: 0.45,
    },
    nx: -0.38,
    ny: 0.26,
  },
  {
    config: {
      labradoriteScale: 0.016,
      labradoriteDirection: 0.91,
      labradoriteBanding: 2.6,
      labradoriteFlash: 2.2,
      labradoriteDarkness: 0.92,
    },
    nx: 0.82,
    ny: -0.64,
  },
]) {
  const renderer = context.window.RadenLabradorite.createLabradoriteRenderer(
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

const runtime = context.window.RadenModes.getRuntime("labradorite");
assert.equal(typeof runtime.normalizeConfig, "function");
assert.equal(typeof runtime.createRenderer, "function");
assert.throws(
  () => context.window.RadenLabradorite.createLabradoriteRenderer({}, {}),
  /simplex sampler/,
);

const html = fs.readFileSync(path.join(__dirname, "..", "index.html"), "utf8");
assert.match(
  html,
  /labradorite:\s*\(runtime, nextForce, nextOptions\)\s*=>\s*generateLabradoriteFlash/,
);
assert.match(html, /function generateLabradoriteFlashLegacy\(/);
assert.match(html, /completeMessage:\s*"Labradorite rendered"/);
assert.match(html, /filter:\s*"blur\(9px\)"/);

console.log("Labradorite extraction parity passed.");
