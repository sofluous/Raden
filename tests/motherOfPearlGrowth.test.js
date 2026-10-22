const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const clamp01 = (value) => Math.max(0, Math.min(1, value));
const smoothstep = (edge0, edge1, value) => {
  const amount = clamp01((value - edge0) / Math.max(1e-6, edge1 - edge0));
  return amount * amount * (3 - 2 * amount);
};
const context = {
  window: { RadenShared: { clamp01, smoothstep } },
  Math,
};
const plain = (value) => JSON.parse(JSON.stringify(value));
const registrySource = fs.readFileSync(
  path.join(__dirname, "..", "src", "modes", "registry.js"),
  "utf8",
);
vm.runInNewContext(registrySource, context);
const stagesSource = fs.readFileSync(
  path.join(__dirname, "..", "src", "render", "stages.js"),
  "utf8",
);
vm.runInNewContext(stagesSource, context);
const source = fs.readFileSync(
  path.join(__dirname, "..", "src", "modes", "motherOfPearl.js"),
  "utf8",
);
vm.runInNewContext(source, context);

const registeredRuntime = context.window.RadenModes.getRuntime("motherofpearl");
assert.equal(typeof registeredRuntime.normalizeConfig, "function");
assert.equal(typeof registeredRuntime.createRenderer, "function");
assert.equal(Object.isFrozen(registeredRuntime), true);
assert.throws(
  () => context.window.RadenModes.registerRuntime("missing-mode", registeredRuntime),
  /unknown mode/,
);

function legacySamplingFields(input) {
  const radial = Math.hypot(input.nx, input.ny);
  const curvedNx = input.nx + input.nx * radial * input.lightCurvature * 1.2;
  const curvedNy = input.ny + input.ny * radial * input.lightCurvature * 1.2;
  const angleInfluence = curvedNx * input.lightVec.x + curvedNy * input.lightVec.y;
  const bandFreq = 4 + (1 - input.lightSpread) * 18;
  const band = Math.sin(
    (curvedNx * input.lightVec.y - curvedNy * input.lightVec.x) * bandFreq * Math.PI,
  );
  const spreadDamp = Math.max(
    0.25,
    1 - radial * (0.35 + input.lightSpread * 0.45),
  );
  const highlightBoost = band * input.highlightStrength * spreadDamp;
  let px = input.x;
  let py = input.y;
  if (input.flowMode === "circular") {
    const theta = Math.atan2(input.y - input.cy, input.x - input.cx);
    px += Math.cos(theta) * input.layerLength * 40;
    py += Math.sin(theta) * input.layerLength * 40;
  } else if (input.flowMode === "linear") {
    px += input.layerLength * 40;
  }
  return { angleInfluence, highlightBoost, px, py };
}

function legacyGrowthFields(input) {
  const growthAxis =
    input.flowMode === "circular"
      ? Math.hypot(input.nx, input.ny) * 2.2
      : (input.nx * 0.72 + input.ny * 0.28) * input.layerLength * 1.4;
  const structureDrift =
    input.noise * (0.12 + input.ringJitter * 1.05) +
    input.angleInfluence * (0.02 + input.highlightStrength * 0.08);
  const ringPhase =
    (growthAxis + structureDrift) * (10 + input.ringSpacing * 26);
  const ringWave = Math.sin(ringPhase * Math.PI);
  const seamMask = smoothstep(
    1 - input.seamThickness * 1.3,
    1,
    Math.abs(ringWave),
  );
  const seamFeather = smoothstep(
    0.32,
    0.96,
    Math.abs(
      Math.sin(
        (ringPhase * (0.56 + input.ringJitter * 0.42) + input.noise * 0.9) *
          Math.PI,
      ),
    ),
  );
  const geometricField = clamp01(
    (input.noise * (0.56 + input.ringJitter * 0.12) +
      ringWave * (0.5 + input.ringSpacing * 0.06) +
      1) /
      2,
  );
  const lightingField =
    input.angleInfluence * (0.24 + input.lightSpread * 0.22) +
    input.highlightBoost * (0.2 + input.highlightStrength * 0.12);
  const bandingField = clamp01(
    (Math.sin(
      (ringPhase + input.noise * (1.2 + input.ringJitter * 1.2)) * Math.PI,
    ) +
      1) /
      2,
  );

  return {
    growthAxis,
    structureDrift,
    ringPhase,
    ringWave,
    seamMask,
    seamFeather,
    geometricField,
    lightingField,
    bandingField,
  };
}

function legacyFamilyFields(input) {
  let familyBanding = input.bandingField;
  let familySeam = clamp01(input.seamMask * 0.72 + input.seamFeather * 0.28);
  let familyBrillianceMul = 1;
  let familyChromaticMul = 1;
  let substrateCoverageBias = 0;
  if (input.textureFamily === "opal") {
    const cellField = clamp01(
      (Math.sin((input.noise * 4.2 + input.nx * 3.1 - input.ny * 2.7) * Math.PI) + 1) / 2,
    );
    familyBanding = clamp01(input.bandingField * 0.58 + cellField * 0.42);
    familySeam = clamp01(
      input.seamMask * 0.52 + smoothstep(0.72, 1, cellField) * 0.48,
    );
    familyBrillianceMul = 1.08;
    familyChromaticMul = 1.12;
    substrateCoverageBias = -0.06;
  } else if (input.textureFamily === "labradorite") {
    const flash = Math.pow(clamp01((input.angleInfluence + 1) / 2), 2.7);
    familyBanding = clamp01(input.bandingField * 0.7 + flash * 0.3);
    familySeam = clamp01(input.seamMask * 1.18);
    familyBrillianceMul = 1.04;
    familyChromaticMul = 1.28;
    substrateCoverageBias = 0.08;
  }
  return {
    familyBanding,
    familySeam,
    familyBrillianceMul,
    familyChromaticMul,
    substrateCoverageBias,
  };
}

function legacyPaletteColor(input) {
  const nacreField = clamp01(
    input.geometricField * 0.52 +
      input.familyBanding * 0.34 +
      input.familySeam * 0.14,
  );
  const value = clamp01(
    nacreField * (0.78 + input.surfacePolish * 0.08) +
      input.lightingField * (0.14 + input.highlightStrength * 0.06),
  );
  const valueClamped = Math.min(1, Math.max(0, value)) * input.colorRange;
  const scaled = valueClamped * 4;
  const index = Math.max(
    0,
    Math.min(Math.floor(scaled), input.palette.length - 2),
  );
  const frac = Math.pow(scaled - index, input.blendSharpness);
  const c1 = input.palette[index];
  const c2 = input.palette[index + 1];
  const h = c1.h + (c2.h - c1.h) * frac;
  let s =
    (c1.s + (c2.s - c1.s) * frac) * (input.colorIntensity / 100);
  let l = c1.l + (c2.l - c1.l) * frac;
  s = Math.min(100, s * input.nacreBrilliance * input.familyBrillianceMul);
  l = Math.min(
    97,
    l + (input.nacreBrilliance * input.familyBrillianceMul - 1) * 6,
  );
  if (input.textureFamily === "labradorite") {
    l = Math.max(10, l - 8);
  }
  const structureHueShift =
    (input.familyBanding - 0.5) *
      (44 * input.nacreChromatic * input.familyChromaticMul) *
      input.colorRange +
    input.familySeam *
      (14 * input.nacreChromatic * input.familyChromaticMul) -
    (nacreField - 0.5) * 12;
  const directionalHueShift =
    (input.angleInfluence * 9 + input.highlightBoost * 4) *
    (0.35 + 0.45 * input.nacreChromatic * input.familyChromaticMul);
  const shiftedHue =
    (h + structureHueShift + directionalHueShift + 360) % 360;
  return {
    nacreField,
    value,
    h,
    s,
    l,
    structureHueShift,
    directionalHueShift,
    shiftedHue,
  };
}

function legacySurfaceAndScratches(input) {
  let { r, g, b } = input;
  const seamStrength = input.familySeam * input.seamContrast;
  const seamDark = 1 - seamStrength * 0.68;
  const seamWarm = seamStrength * 95;
  r = r * seamDark + seamWarm * 0.42;
  g = g * seamDark + seamWarm * 0.28;
  b = b * (1 - seamStrength * 0.34);
  const geometryLift = input.nacreField * (12 + 20 * input.surfacePolish);
  r += geometryLift * 0.55;
  g += geometryLift * 0.62;
  b += geometryLift * 0.78;
  const scratchFreq = 60 + input.scratchDensity * 320;
  const scratchPhase =
    (input.nx * input.scratchDir.x + input.ny * input.scratchDir.y) *
      scratchFreq +
    input.noise * 6;
  const scratchLine = Math.pow(
    Math.abs(Math.sin(scratchPhase * Math.PI)),
    24,
  );
  const scratchAmount =
    scratchLine * input.scratchDensity * (1 - input.surfacePolish) * 45;
  r += scratchAmount;
  g += scratchAmount * 0.88;
  b += scratchAmount * 0.75;
  return {
    r,
    g,
    b,
    seamStrength,
    geometryLift,
    scratchFreq,
    scratchPhase,
    scratchLine,
    scratchAmount,
  };
}

function legacySubstrateComposite(input) {
  const coverage = clamp01(
    (0.28 +
      input.nacreField * 0.64 +
      input.highlightBoost * (0.1 + input.highlightStrength * 0.08) +
      input.substrateCoverageBias) *
      (1 - input.substrateMix) +
      input.substrateMix * (0.18 + input.familySeam * 0.3),
  );
  return {
    coverage,
    r: input.substrate.r * (1 - coverage) + input.r * coverage,
    g: input.substrate.g * (1 - coverage) + input.g * coverage,
    b: input.substrate.b * (1 - coverage) + input.b * coverage,
  };
}

const cases = [
  {
    nx: -0.45, ny: 0.31, noise: -0.72, flowMode: "circular",
    layerLength: 1.4, ringSpacing: 0.36, ringJitter: 0.83,
    seamThickness: 0.22, angleInfluence: -0.18,
    highlightStrength: 0.64, lightSpread: 0.48, highlightBoost: 0.41,
  },
  {
    nx: 0.76, ny: -0.58, noise: 0.93, flowMode: "linear",
    layerLength: 2.1, ringSpacing: 0.91, ringJitter: 0.07,
    seamThickness: 0.76, angleInfluence: 0.82,
    highlightStrength: 0.15, lightSpread: 0.95, highlightBoost: 0.68,
  },
];

const normalized = context.window.RadenNacre.normalizeNacreConfig({
  layers: "4.9",
  flowMode: "unknown",
  textureFamily: "opal",
  substrateTone: "unknown",
  customRuntimeValue: 17,
});
assert.equal(normalized.layers, 4);
assert.equal(normalized.flowMode, "circular");
assert.equal(normalized.textureFamily, "opal");
assert.equal(normalized.substrateTone, "light");
assert.equal(normalized.scale, 0.006);
assert.equal(normalized.customRuntimeValue, 17);

assert.throws(
  () => context.window.RadenNacre.createNacreRenderer({}, {}),
  /sampleNoise/,
);

const rendererConfig = {
  layers: 3,
  scale: 0.007,
  blend: 1.4,
  layerLength: 1.2,
  ringSpacing: 0.42,
  ringJitter: 0.61,
  seamThickness: 0.27,
  seamContrast: 0.68,
  scratchDensity: 0.33,
  scratchAngle: 0.18,
  surfacePolish: 0.57,
  colorIntensity: 108,
  colorRange: 0.9,
  nacreBrilliance: 1.13,
  nacreChromatic: 0.92,
  textureFamily: "classic",
  substrateMix: 0.38,
  flowMode: "linear",
  highlightStrength: 0.71,
  lightAngle: 0.36,
  lightCurvature: 0.29,
  lightSpread: 0.52,
};
const rendererRuntime = {
  palette: [
    { h: 286, s: 26, l: 83 },
    { h: 192, s: 28, l: 85 },
    { h: 148, s: 24, l: 84 },
    { h: 330, s: 20, l: 88 },
    { h: 28, s: 12, l: 93 },
  ],
  substrate: { r: 232, g: 228, b: 218 },
  sampleNoise: (px, py, layers, scale) =>
    Math.sin(px * scale) * 0.6 + Math.cos(py * scale) * 0.4 + layers * 0.001,
  hslToRgb: (h, s, l) => [h, s, l],
};
const nacreRenderer = context.window.RadenNacre.createNacreRenderer(
  rendererConfig,
  rendererRuntime,
);
const stageDescription = nacreRenderer.describeStages();
assert.equal(stageDescription.modeId, "motherofpearl");
assert.deepEqual(
  plain(stageDescription.stages.map((stage) => stage.id)),
  ["sampling", "noise", "growth", "family", "palette", "surface", "substrate"],
);
assert.equal(
  stageDescription.stages.find((stage) => stage.id === "palette").interfaceId,
  "materialSource",
);
for (const id of ["surface", "substrate"]) {
  const stage = stageDescription.stages.find((item) => item.id === id);
  assert.equal(stage.interfaceId, "colorTransform");
  assert.equal(stage.bypass.type, "identity-color");
}
const stagedControlIds = new Set(
  stageDescription.stages.flatMap((stage) => Array.from(stage.controlIds)),
);
context.window.RadenModes.getMode("motherofpearl").activeControlIds.forEach((id) => {
  assert.ok(stagedControlIds.has(id), `active control ${id} belongs to a declared stage`);
});
const pixelPoint = { x: 31, y: 74, nx: -0.42, ny: 0.67, cx: 50, cy: 50 };
const firstPixel = nacreRenderer.renderPixel(pixelPoint);
const secondPixel = nacreRenderer.renderPixel(pixelPoint);
assert.deepEqual(plain(firstPixel), plain(secondPixel));
assert.ok(Number.isFinite(firstPixel.r));
assert.ok(Number.isFinite(firstPixel.g));
assert.ok(Number.isFinite(firstPixel.b));
const bypassRenderer = context.window.RadenNacre.createNacreRenderer(
  rendererConfig,
  Object.assign({}, rendererRuntime, {
    disabledStageIds: ["family", "surface", "substrate"],
  }),
);
const bypassPixel = bypassRenderer.renderPixel(pixelPoint);
assert.equal(bypassPixel.a, 255);
assert.ok(Number.isFinite(bypassPixel.r));
assert.ok(Number.isFinite(bypassPixel.g));
assert.ok(Number.isFinite(bypassPixel.b));
assert.notDeepEqual(plain(bypassPixel), plain(firstPixel));
assert.throws(
  () => context.window.RadenNacre.createNacreRenderer(
    rendererConfig,
    Object.assign({}, rendererRuntime, { disabledStageIds: ["growth"] }),
  ),
  /Cannot disable required stage: growth/,
);

for (const flowMode of ["circular", "linear"]) {
  const input = {
    nx: -0.42,
    ny: 0.67,
    x: 31,
    y: 74,
    cx: 50,
    cy: 50,
    flowMode,
    layerLength: 1.35,
    lightVec: { x: 0.6, y: -0.8 },
    highlightStrength: 0.72,
    lightSpread: 0.48,
    lightCurvature: 0.31,
  };
  const actual = context.window.RadenNacre.computeNacreSamplingFields(input);
  const expected = legacySamplingFields(input);
  for (const key of Object.keys(expected)) {
    assert.equal(actual[key], expected[key], `${flowMode} sampling ${key} should preserve its value`);
  }
}

for (const input of cases) {
  const actual = context.window.RadenNacre.computeNacreGrowthFields(input);
  const expected = legacyGrowthFields(input);
  for (const key of Object.keys(expected)) {
    assert.equal(actual[key], expected[key], `${key} should preserve its value`);
  }
}

for (const textureFamily of ["classic", "opal", "labradorite"]) {
  const input = {
    textureFamily,
    bandingField: 0.42,
    seamMask: 0.73,
    seamFeather: 0.28,
    noise: -0.16,
    nx: 0.37,
    ny: -0.61,
    angleInfluence: 0.54,
  };
  const actual = context.window.RadenNacre.computeNacreFamilyFields(input);
  const expected = legacyFamilyFields(input);
  for (const key of Object.keys(expected)) {
    assert.equal(actual[key], expected[key], `${textureFamily} ${key} should preserve its value`);
  }
}

const palette = [
  { h: 205, s: 28, l: 22 },
  { h: 178, s: 44, l: 48 },
  { h: 282, s: 38, l: 66 },
  { h: 42, s: 34, l: 82 },
  { h: 328, s: 24, l: 94 },
];
for (const textureFamily of ["classic", "labradorite"]) {
  const input = {
    geometricField: 0.63,
    familyBanding: 0.27,
    familySeam: 0.78,
    surfacePolish: 0.46,
    lightingField: -0.12,
    highlightStrength: 0.72,
    blendSharpness: 1.35,
    colorRange: 0.84,
    colorIntensity: 118,
    palette,
    nacreBrilliance: 1.16,
    familyBrillianceMul: textureFamily === "labradorite" ? 1.04 : 1,
    textureFamily,
    nacreChromatic: 0.88,
    familyChromaticMul: textureFamily === "labradorite" ? 1.28 : 1,
    angleInfluence: -0.31,
    highlightBoost: 0.57,
  };
  const actual = context.window.RadenNacre.computeNacrePaletteColor(input);
  const expected = legacyPaletteColor(input);
  for (const key of Object.keys(expected)) {
    assert.equal(actual[key], expected[key], `${textureFamily} palette ${key} should preserve its value`);
  }
}

for (const scratchDensity of [0, 0.67]) {
  const input = {
    r: 142,
    g: 188,
    b: 214,
    familySeam: 0.54,
    seamContrast: 0.82,
    nacreField: 0.61,
    surfacePolish: 0.38,
    nx: -0.43,
    ny: 0.29,
    scratchDir: { x: 0.76, y: -0.65 },
    scratchDensity,
    noise: -0.22,
  };
  const actual = context.window.RadenNacre.applyNacreSurfaceAndScratches(input);
  const expected = legacySurfaceAndScratches(input);
  for (const key of Object.keys(expected)) {
    assert.equal(actual[key], expected[key], `surface ${key} should preserve its value`);
  }
}

for (const substrateMix of [0.08, 0.92]) {
  const input = {
    r: 176.4,
    g: 201.8,
    b: 228.2,
    substrate: substrateMix > 0.5
      ? { r: 22, g: 26, b: 31 }
      : { r: 232, g: 228, b: 218 },
    nacreField: 0.64,
    highlightBoost: 0.37,
    highlightStrength: 0.81,
    substrateCoverageBias: -0.06,
    substrateMix,
    familySeam: 0.48,
  };
  const actual = context.window.RadenNacre.compositeNacreSubstrate(input);
  const expected = legacySubstrateComposite(input);
  for (const key of Object.keys(expected)) {
    assert.equal(actual[key], expected[key], `substrate ${key} should preserve its value`);
  }
}

console.log("Mother of Pearl per-pixel pipeline parity passed.");
