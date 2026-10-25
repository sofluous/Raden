const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.join(__dirname, "..");
const context = { window: { RadenShared: {} }, document: {}, Math };
function run(relativePath) {
  vm.runInNewContext(
    fs.readFileSync(path.join(root, relativePath), "utf8"),
    context,
  );
}

run(path.join("src", "render", "stages.js"));
run(path.join("src", "modes", "registry.js"));
run(path.join("src", "modes", "motherOfPearl.js"));
run(path.join("src", "modes", "bubbleFilm.js"));
run(path.join("src", "modes", "opalVein.js"));
run(path.join("src", "modes", "labradorite.js"));
run(path.join("src", "modes", "marbleInk.js"));
run(path.join("src", "modes", "agateBands.js"));
run(path.join("src", "modes", "malachiteFlow.js"));
run(path.join("src", "modes", "lichenGrowth.js"));
run(path.join("src", "modes", "riverDelta.js"));
run(path.join("src", "modes", "topography.js"));
run(path.join("src", "ui", "controls.js"));

const definition = context.window.RadenModes.getRandomizationDefinition("bubblefilm");
assert.deepEqual(
  Array.from(definition.controls, (rule) => rule.controlId),
  ["naturalScale", "naturalWarp", "naturalTurbulence"],
);

const expectedControlIds = {
  motherofpearl: ["flowMode", "ringSpacing", "ringJitter", "seamThickness", "seamContrast", "highlightStrength", "lightAngle", "lightCurvature", "lightSpread", "scratchDensity", "scratchAngle", "surfacePolish", "nacreBrilliance", "nacreChromatic", "textureFamily", "substrateTone", "substrateMix"],
  opalvein: ["opalCellScale", "opalVeinDensity", "opalFire", "opalMatrix"],
  labradorite: ["labradoriteScale", "labradoriteDirection", "labradoriteBanding", "labradoriteFlash", "labradoriteDarkness"],
  marbleink: ["marbleFlowScale", "marbleVeinFreq", "marbleContrast", "marbleInkDrift", "marbleLightness"],
  agateband: ["naturalScale", "naturalWarp", "agateBandFreq", "agateBandJitter", "agateVeinDensity", "agateTranslucency", "agateEdgeDarken"],
  malachiteflow: ["naturalScale", "naturalWarp", "naturalTurbulence", "naturalAnisotropy", "malachiteSwirl", "malachiteRingTightness", "malachiteRingVariance", "malachiteContrast"],
  lichengrowth: ["naturalScale", "naturalWarp", "lichenPatchScale", "lichenBranching", "lichenEdgeRoughness", "lichenCoverage", "lichenMoistureTone"],
  riverdelta: ["naturalScale", "naturalWarp", "naturalTurbulence", "naturalAnisotropy", "deltaChannelWidth", "deltaBranchRate", "deltaSedimentMix", "deltaFloodplainSoftness", "deltaErosion"],
  topography: ["topoPreset", "topoNoiseType", "topoBandCount", "topoRenderMode", "topoRidge", "topoWarp", "topoErosion"],
};
Object.entries(expectedControlIds).forEach(([modeId, controlIds]) => {
  const modeDefinition = context.window.RadenModes.getRandomizationDefinition(modeId);
  assert.deepEqual(
    Array.from(modeDefinition.controls, (rule) => rule.controlId),
    controlIds,
  );
  const generated = context.window.RadenUiControls.createRandomizedControlValues(
    modeDefinition,
    () => 0.5,
  );
  generated.forEach((item, index) => {
    const rule = modeDefinition.controls[index];
    if (rule.type === "choice") {
      assert.ok(rule.values.includes(item.value));
    } else {
      assert.ok(item.value >= rule.min && item.value < rule.max);
      assert.equal(item.decimals, rule.decimals);
    }
  });
});
const values = context.window.RadenUiControls.createRandomizedControlValues(
  definition,
  () => 0.5,
);
assert.deepEqual(
  JSON.parse(JSON.stringify(values.map((item) => Object.assign({}, item, {
    value: typeof item.value === "number" ? item.value.toFixed(item.decimals) : item.value,
  })))),
  [
    { controlId: "naturalScale", value: "0.006", decimals: 3 },
    { controlId: "naturalWarp", value: "0.35", decimals: 2 },
    { controlId: "naturalTurbulence", value: "0.36", decimals: 2 },
  ],
);

const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
assert.doesNotMatch(html, /mode === "bubblefilm"[\s\S]{0,300}naturalScale/);
assert.doesNotMatch(html, /mode === "opalvein"[\s\S]{0,300}opalCellScale/);
assert.doesNotMatch(html, /mode === "labradorite"[\s\S]{0,300}labradoriteScale/);
assert.doesNotMatch(html, /mode === "marbleink"[\s\S]{0,300}marbleFlowScale/);
assert.doesNotMatch(html, /mode === "agateband"[\s\S]{0,400}agateBandFreq/);
assert.doesNotMatch(html, /mode === "malachiteflow"[\s\S]{0,500}malachiteSwirl/);
assert.doesNotMatch(html, /mode === "lichengrowth"[\s\S]{0,500}lichenPatchScale/);
assert.doesNotMatch(html, /mode === "riverdelta"[\s\S]{0,600}deltaChannelWidth/);
assert.doesNotMatch(html, /mode === "motherofpearl"[\s\S]{0,900}ringSpacing/);
assert.doesNotMatch(html, /mode === "topography"[\s\S]{0,900}topoBandCount/);
assert.match(
  html,
  /mode === "topography" && controlId === "topoPreset"[\s\S]{0,120}applyTopoPreset\(value, \{ respectLocks: true \}\)/,
);
assert.match(html, /getRandomizationDefinition\?\.\(mode\)/);
assert.match(html, /createRandomizedControlValues\?\.\(randomizationDefinition\)/);

console.log("Module-owned randomization contracts passed.");
