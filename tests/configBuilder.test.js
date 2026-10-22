const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const values = new Proxy(
  {
    modeSelector: "agateband",
    renderWidth: "64",
    renderHeight: "32",
    seed: "42",
    agateBandFreq: "1.73",
    agateBandJitter: "0.61",
    agateVeinDensity: "1.12",
    agateTranslucency: "0.77",
    agateEdgeDarken: "0.68",
    malachiteSwirl: "0.81",
    malachiteRingTightness: "1.91",
    malachiteRingVariance: "0.72",
    malachiteContrast: "1.66",
    lichenPatchScale: "1.52",
    lichenBranching: "0.69",
    lichenEdgeRoughness: "0.83",
    lichenCoverage: "0.74",
    lichenMoistureTone: "0.63",
    deltaChannelWidth: "0.88",
    deltaBranchRate: "0.79",
    deltaSedimentMix: "0.67",
    deltaFloodplainSoftness: "0.71",
    deltaErosion: "0.59",
  },
  { get: (target, key) => (key in target ? target[key] : "0") },
);
const document = {
  getElementById(id) {
    return { value: values[id], checked: false };
  },
};
const context = { window: { innerWidth: 800, innerHeight: 600 }, document, Math };
const source = fs.readFileSync(
  path.join(__dirname, "..", "src", "state", "configBuilder.js"),
  "utf8",
);
vm.runInNewContext(source, context);

const config = context.window.RadenState.buildRenderConfig(
  {},
  {
    canvas: { parentElement: { clientWidth: 800, clientHeight: 600 } },
    getPreviewScaleForMode: () => 1,
    getInput: (id, integer) => integer ? parseInt(values[id], 10) : parseFloat(values[id]),
    resolveSeed: () => 42,
  },
);

[
  ["agateBandFreq", 1.73], ["agateBandJitter", 0.61],
  ["agateVeinDensity", 1.12], ["agateTranslucency", 0.77],
  ["agateEdgeDarken", 0.68], ["malachiteSwirl", 0.81],
  ["malachiteRingTightness", 1.91], ["malachiteRingVariance", 0.72],
  ["malachiteContrast", 1.66], ["lichenPatchScale", 1.52],
  ["lichenBranching", 0.69], ["lichenEdgeRoughness", 0.83],
  ["lichenCoverage", 0.74], ["lichenMoistureTone", 0.63],
  ["deltaChannelWidth", 0.88], ["deltaBranchRate", 0.79],
  ["deltaSedimentMix", 0.67], ["deltaFloodplainSoftness", 0.71],
  ["deltaErosion", 0.59],
].forEach(([key, expected]) => assert.equal(config[key], expected, key));

console.log("Natural mode config forwarding passed.");
