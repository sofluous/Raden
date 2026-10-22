const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const context = { window: { RadenShared: {} }, Math };
function run(relativePath) {
  vm.runInNewContext(
    fs.readFileSync(path.join(__dirname, "..", relativePath), "utf8"),
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
run(path.join("src", "ui", "stageInspector.js"));

const runtime = context.window.RadenModes.getRuntime("motherofpearl");
const stages = runtime.describeStages().stages;
const groups = context.window.RadenStageInspector.MOTHER_OF_PEARL_GROUPS;
assert.deepEqual(
  Array.from(groups, (group) => group.id),
  ["palette", "iridescence", "family", "noise", "growth", "substrate", "surface", "direction"],
);
assert.equal(groups.find((group) => group.id === "direction").graphStageId, "sampling");
assert.notDeepEqual(
  Array.from(groups, (group) => group.id),
  Array.from(stages, (stage) => stage.id),
);

const stagedControlIds = new Set(stages.flatMap((stage) => Array.from(stage.controlIds)));
const inspectorControlIds = groups.flatMap((group) => Array.from(group.controlIds));
assert.equal(new Set(inspectorControlIds).size, inspectorControlIds.length);
assert.deepEqual(Array.from(new Set(inspectorControlIds)).sort(), Array.from(stagedControlIds).sort());
assert.deepEqual(
  Array.from(groups.filter((group) => group.toggleable), (group) => group.id),
  ["substrate", "surface"],
);
groups.filter((group) => group.toggleable).forEach((group) => {
  assert.equal(stages.find((stage) => stage.id === group.id).optional, true);
});

const bubbleRuntime = context.window.RadenModes.getRuntime("bubblefilm");
const bubbleStages = bubbleRuntime.describeStages().stages;
const bubbleGroups = context.window.RadenStageInspector.BUBBLE_FILM_GROUPS;
assert.deepEqual(
  Array.from(bubbleGroups, (group) => group.id),
  ["palette", "base", "flow"],
);
assert.deepEqual(
  Array.from(bubbleGroups, (group) => group.graphStageId),
  ["authoredPalette", "pressureWarp", "pressureWarp"],
);
assert.equal(bubbleGroups.some((group) => group.toggleable), false);
const bubbleStagedControlIds = new Set(
  bubbleStages.flatMap((stage) => Array.from(stage.controlIds)),
);
const bubbleInspectorControlIds = bubbleGroups.flatMap((group) =>
  Array.from(group.controlIds),
);
assert.equal(
  new Set(bubbleInspectorControlIds).size,
  bubbleInspectorControlIds.length,
);
assert.deepEqual(
  Array.from(new Set(bubbleInspectorControlIds)).sort(),
  Array.from(bubbleStagedControlIds).sort(),
);

const opalRuntime = context.window.RadenModes.getRuntime("opalvein");
const opalStages = opalRuntime.describeStages().stages;
const opalGroups = context.window.RadenStageInspector.OPAL_VEIN_GROUPS;
assert.deepEqual(
  Array.from(opalGroups, (group) => group.id),
  ["palette", "base", "flow", "material", "mapping"],
);
assert.deepEqual(
  Array.from(opalGroups, (group) => group.graphStageId),
  ["authoredPalette", "cellField", "cellField", "fire", "matrix"],
);
assert.equal(opalGroups.some((group) => group.toggleable), false);
const opalStagedControlIds = new Set(
  opalStages.flatMap((stage) => Array.from(stage.controlIds)),
);
const opalInspectorControlIds = opalGroups.flatMap((group) =>
  Array.from(group.controlIds),
);
assert.equal(new Set(opalInspectorControlIds).size, opalInspectorControlIds.length);
assert.deepEqual(
  Array.from(new Set(opalInspectorControlIds)).sort(),
  Array.from(opalStagedControlIds).sort(),
);

const labradoriteRuntime = context.window.RadenModes.getRuntime("labradorite");
const labradoriteStages = labradoriteRuntime.describeStages().stages;
const labradoriteGroups = context.window.RadenStageInspector.LABRADORITE_GROUPS;
assert.deepEqual(
  Array.from(labradoriteGroups, (group) => group.id),
  ["palette", "base", "flow", "material", "mapping"],
);
assert.deepEqual(
  Array.from(labradoriteGroups, (group) => group.graphStageId),
  ["authoredPalette", "stoneField", "directionalBands", "flash", "matrix"],
);
assert.equal(labradoriteGroups.some((group) => group.toggleable), false);
const labradoriteStagedControlIds = new Set(
  labradoriteStages.flatMap((stage) => Array.from(stage.controlIds)),
);
const labradoriteInspectorControlIds = labradoriteGroups.flatMap((group) =>
  Array.from(group.controlIds),
);
assert.equal(
  new Set(labradoriteInspectorControlIds).size,
  labradoriteInspectorControlIds.length,
);
assert.deepEqual(
  Array.from(new Set(labradoriteInspectorControlIds)).sort(),
  Array.from(labradoriteStagedControlIds).sort(),
);

const marbleRuntime = context.window.RadenModes.getRuntime("marbleink");
const marbleStages = marbleRuntime.describeStages().stages;
const marbleGroups = context.window.RadenStageInspector.MARBLE_INK_GROUPS;
assert.deepEqual(
  Array.from(marbleGroups, (group) => group.id),
  ["palette", "base", "flow", "veins", "material"],
);
assert.deepEqual(
  Array.from(marbleGroups, (group) => group.graphStageId || group.id),
  ["authoredPalette", "flowField", "flowField", "veins", "stone"],
);
assert.equal(marbleGroups.some((group) => group.toggleable), false);
const marbleStagedControlIds = new Set(
  marbleStages.flatMap((stage) => Array.from(stage.controlIds)),
);
const marbleInspectorControlIds = marbleGroups.flatMap((group) =>
  Array.from(group.controlIds),
);
assert.equal(new Set(marbleInspectorControlIds).size, marbleInspectorControlIds.length);
assert.deepEqual(
  Array.from(new Set(marbleInspectorControlIds)).sort(),
  Array.from(marbleStagedControlIds).sort(),
);

const agateRuntime = context.window.RadenModes.getRuntime("agateband");
const agateStages = agateRuntime.describeStages().stages;
const agateGroups = context.window.RadenStageInspector.AGATE_BANDS_GROUPS;
assert.deepEqual(
  Array.from(agateGroups, (group) => group.id),
  ["palette", "base", "flow", "veins", "material"],
);
assert.deepEqual(
  Array.from(agateGroups, (group) => group.graphStageId || group.id),
  ["authoredPalette", "stoneField", "bands", "veins", "stone"],
);
assert.equal(agateGroups.some((group) => group.toggleable), false);
const agateStagedControlIds = new Set(
  agateStages.flatMap((stage) => Array.from(stage.controlIds)),
);
const agateInspectorControlIds = agateGroups.flatMap((group) =>
  Array.from(group.controlIds),
);
assert.equal(new Set(agateInspectorControlIds).size, agateInspectorControlIds.length);
assert.deepEqual(
  Array.from(new Set(agateInspectorControlIds)).sort(),
  Array.from(agateStagedControlIds).sort(),
);

const malachiteRuntime = context.window.RadenModes.getRuntime("malachiteflow");
const malachiteStages = malachiteRuntime.describeStages().stages;
const malachiteGroups = context.window.RadenStageInspector.MALACHITE_FLOW_GROUPS;
assert.deepEqual(
  Array.from(malachiteGroups, (group) => group.id),
  ["palette", "base", "flow", "rings", "material"],
);
assert.deepEqual(
  Array.from(malachiteGroups, (group) => group.graphStageId || group.id),
  ["authoredPalette", "stoneField", "stoneField", "rings", "stone"],
);
assert.equal(malachiteGroups.some((group) => group.toggleable), false);
const malachiteStagedControlIds = new Set(
  malachiteStages.flatMap((stage) => Array.from(stage.controlIds)),
);
const malachiteInspectorControlIds = malachiteGroups.flatMap((group) =>
  Array.from(group.controlIds),
);
assert.equal(
  new Set(malachiteInspectorControlIds).size,
  malachiteInspectorControlIds.length,
);
assert.deepEqual(
  Array.from(new Set(malachiteInspectorControlIds)).sort(),
  Array.from(malachiteStagedControlIds).sort(),
);

const lichenRuntime = context.window.RadenModes.getRuntime("lichengrowth");
const lichenStages = lichenRuntime.describeStages().stages;
const lichenGroups = context.window.RadenStageInspector.LICHEN_GROWTH_GROUPS;
assert.deepEqual(
  Array.from(lichenGroups, (group) => group.id),
  ["palette", "base", "flow", "growth", "edges", "material"],
);
assert.deepEqual(
  Array.from(lichenGroups, (group) => group.graphStageId || group.id),
  ["authoredPalette", "colonyField", "colonyField", "growth", "edges", "moisture"],
);
assert.equal(lichenGroups.some((group) => group.toggleable), false);
const lichenStagedControlIds = new Set(
  lichenStages.flatMap((stage) => Array.from(stage.controlIds)),
);
const lichenInspectorControlIds = lichenGroups.flatMap((group) =>
  Array.from(group.controlIds),
);
assert.equal(new Set(lichenInspectorControlIds).size, lichenInspectorControlIds.length);
assert.deepEqual(
  Array.from(new Set(lichenInspectorControlIds)).sort(),
  Array.from(lichenStagedControlIds).sort(),
);

const riverRuntime = context.window.RadenModes.getRuntime("riverdelta");
const riverStages = riverRuntime.describeStages().stages;
const riverGroups = context.window.RadenStageInspector.RIVER_DELTA_GROUPS;
assert.deepEqual(
  Array.from(riverGroups, (group) => group.id),
  ["palette", "base", "flow", "channels", "material", "erosion"],
);
assert.deepEqual(
  Array.from(riverGroups, (group) => group.graphStageId || group.id),
  ["authoredPalette", "flowField", "flowField", "channels", "floodplain", "erosion"],
);
assert.equal(riverGroups.some((group) => group.toggleable), false);
const riverStagedControlIds = new Set(
  riverStages.flatMap((stage) => Array.from(stage.controlIds)),
);
const riverInspectorControlIds = riverGroups.flatMap((group) =>
  Array.from(group.controlIds),
);
assert.equal(new Set(riverInspectorControlIds).size, riverInspectorControlIds.length);
assert.deepEqual(
  Array.from(new Set(riverInspectorControlIds)).sort(),
  Array.from(riverStagedControlIds).sort(),
);

const topographyRuntime = context.window.RadenModes.getRuntime("topography");
const topographyStages = topographyRuntime.describeStages().stages;
const topographyGroups = context.window.RadenStageInspector.TOPOGRAPHY_GROUPS;
assert.deepEqual(
  Array.from(topographyGroups, (group) => group.id),
  ["palette", "base", "flow", "erosion", "contours"],
);
assert.deepEqual(
  Array.from(topographyGroups, (group) => group.graphStageId || group.id),
  ["authoredPalette", "terrain", "terrain", "erosion", "contours"],
);
assert.equal(topographyGroups.some((group) => group.toggleable), false);
const topographyStagedControlIds = new Set(
  topographyStages.flatMap((stage) => Array.from(stage.controlIds)),
);
const topographyInspectorControlIds = topographyGroups.flatMap((group) =>
  Array.from(group.controlIds),
);
assert.equal(
  new Set(topographyInspectorControlIds).size,
  topographyInspectorControlIds.length,
);
assert.deepEqual(
  Array.from(new Set(topographyInspectorControlIds)).sort(),
  Array.from(topographyStagedControlIds).sort(),
);

const html = fs.readFileSync(path.join(__dirname, "..", "index.html"), "utf8");
assert.match(html, /src\/ui\/stageInspector\.js/);
assert.match(html, /onSetStageEnabled: setSourceStageEnabledWithHistory/);
assert.match(html, /stageInspectorController\?\.isControlEnabled/);
assert.match(html, /stageInspectorController\?\.sync\?\.\(\)/);
assert.ok(html.indexOf('id="textureContext"') < html.indexOf('id="control-scroll"'));
assert.match(html, /\.texture-context\s*\{[\s\S]*grid-area:\s*context;/);
assert.match(html, /compactContextSectionHeaders/);
assert.match(html, /"nacrePalette",\s*"palette-preset-row"/);
assert.match(html, /"seed",\s*"seed-header-row"/);

console.log("Mother of Pearl stage inspector contract passed.");
