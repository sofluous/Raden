const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const clamp01 = (value) => Math.max(0, Math.min(1, value));
const smoothstep = (edge0, edge1, value) => {
  const amount = clamp01((value - edge0) / Math.max(1e-6, edge1 - edge0));
  return amount * amount * (3 - 2 * amount);
};
const context = { window: { RadenShared: { clamp01, smoothstep } }, Math };
const run = (relativePath) => vm.runInNewContext(
  fs.readFileSync(path.join(__dirname, "..", relativePath), "utf8"),
  context,
);
run(path.join("src", "render", "stages.js"));
run(path.join("src", "modes", "registry.js"));
run(path.join("src", "modes", "motherOfPearl.js"));
run(path.join("src", "state", "graphs.js"));
run(path.join("src", "state", "layers.js"));

const plain = (value) => JSON.parse(JSON.stringify(value));
const runtime = context.window.RadenModes.getRuntime("motherofpearl");
const disabledStageIds = ["family", "surface"];
const controlState = { scale: 0.006, layers: 4, flowMode: "circular" };
const graph = context.window.RadenGraphs.createGraphFromStageDescription(
  runtime.describeStages(),
  { disabledStageIds, controlState },
);
assert.equal(graph.version, 1);
assert.equal(graph.modeId, "motherofpearl");
assert.equal(graph.nodes.length, 7);
assert.deepEqual(
  plain(graph.nodes.find((node) => node.id === "palette").interfaceBindings),
  { outputColor: "baseColor" },
);
assert.deepEqual(
  plain(graph.nodes.find((node) => node.id === "surface").interfaceBindings),
  { inputColor: "baseColor", outputColor: "surfaceColor" },
);
assert.equal(graph.nodes.find((node) => node.id === "family").enabled, false);
assert.deepEqual(plain(graph.nodes.find((node) => node.id === "sampling").parameters), {
  flowMode: "circular",
});
assert.deepEqual(plain(graph.nodes.find((node) => node.id === "noise").parameters), {
  scale: 0.006,
  layers: 4,
});
assert.ok(graph.connections.some((connection) => connection.from.nodeId === "growth" && connection.to.nodeId === "family"));

const serialized = context.window.RadenGraphs.serializeGraph(graph);
const restored = context.window.RadenGraphs.deserializeGraph(serialized);
assert.deepEqual(plain(restored), plain(graph));
assert.deepEqual(Array.from(context.window.RadenGraphs.getDisabledStageIds(restored)), disabledStageIds);

const rendererRuntime = {
  palette: [{ h: 286, s: 26, l: 83 }, { h: 192, s: 28, l: 85 }],
  substrate: { r: 232, g: 228, b: 218 },
  sampleNoise: (px, py, layers, scale) => Math.sin(px * scale) * 0.6 + Math.cos(py * scale) * 0.4 + layers * 0.001,
  hslToRgb: (h, s, l) => [h, s, l],
};
const direct = runtime.createRenderer(controlState, { ...rendererRuntime, disabledStageIds });
const reconstructed = runtime.createRenderer(controlState, {
  ...rendererRuntime,
  disabledStageIds: context.window.RadenGraphs.getDisabledStageIds(restored),
});
const point = { x: 12, y: 18, nx: -0.2, ny: 0.4, cx: 20, cy: 20 };
assert.deepEqual(plain(reconstructed.renderPixel(point)), plain(direct.renderPixel(point)));

const malformed = plain(graph);
malformed.connections.shift();
assert.match(context.window.RadenGraphs.validateGraph(malformed).join(" "), /unconnected/);
const requiredDisabled = plain(graph);
requiredDisabled.nodes.find((node) => node.id === "growth").enabled = false;
assert.match(context.window.RadenGraphs.validateGraph(requiredDisabled).join(" "), /Required graph node/);
const invalidBinding = plain(graph);
invalidBinding.nodes.find((node) => node.id === "palette").interfaceBindings.outputColor = "missing";
assert.match(context.window.RadenGraphs.validateGraph(invalidBinding).join(" "), /invalid outputColor binding/);
const wrongDirectionBinding = plain(graph);
wrongDirectionBinding.nodes.find((node) => node.id === "surface").interfaceBindings.outputColor = "baseColor";
assert.match(context.window.RadenGraphs.validateGraph(wrongDirectionBinding).join(" "), /invalid outputColor binding/);
assert.throws(() => context.window.RadenGraphs.deserializeGraph("{"), /valid JSON/);

const layerState = context.window.RadenLayers.buildLayerStateFromFlatState(
  { modeSelector: "motherofpearl", scale: 0.006, layers: 4, flowMode: "circular" },
  { modeId: "motherofpearl", width: 64, height: 64 },
);
const sourceLayer = context.window.RadenLayers.getActiveLayer(layerState);
assert.equal(sourceLayer.graph.modeId, "motherofpearl");
assert.equal(context.window.RadenLayers.validateLayerState(layerState).length, 0);

const syncedState = context.window.RadenLayers.syncSourceState(layerState, {
  modeSelector: "motherofpearl",
  scale: 0.012,
  layers: 6,
  flowMode: "linear",
});
const syncedGraph = context.window.RadenLayers.getActiveLayer(syncedState).graph;
assert.equal(syncedGraph.nodes.find((node) => node.id === "sampling").parameters.flowMode, "linear");
assert.equal(syncedGraph.nodes.find((node) => node.id === "noise").parameters.scale, 0.012);
assert.equal(sourceLayer.graph.nodes.find((node) => node.id === "noise").parameters.scale, 0.006);

const snapshot = {
  version: context.window.RadenLayers.LAYER_STATE_VERSION,
  state: plain(syncedState),
  legacySettings: plain(syncedState.legacySettings),
};
const recalled = context.window.RadenLayers.normalizeGalleryItem(
  JSON.parse(JSON.stringify(snapshot)),
);
assert.deepEqual(
  plain(context.window.RadenLayers.getActiveLayer(recalled.state).graph),
  plain(syncedGraph),
);

const legacyState = plain(layerState);
delete legacyState.layers[0].graph;
const normalizedLegacy = context.window.RadenLayers.normalizeGalleryItem({
  version: context.window.RadenLayers.LAYER_STATE_VERSION,
  state: legacyState,
  legacySettings: legacyState.legacySettings,
});
assert.equal(
  context.window.RadenLayers.getActiveLayer(normalizedLegacy.state).graph.modeId,
  "motherofpearl",
);

const invalidLayerState = plain(layerState);
invalidLayerState.layers[0].graph.nodes[0].enabled = false;
assert.match(
  context.window.RadenLayers.validateLayerState(invalidLayerState).join(" "),
  /Required graph node cannot be disabled/,
);
const repairedSnapshot = context.window.RadenLayers.normalizeGalleryItem({
  version: context.window.RadenLayers.LAYER_STATE_VERSION,
  state: invalidLayerState,
  legacySettings: invalidLayerState.legacySettings,
});
assert.equal(context.window.RadenLayers.validateLayerState(repairedSnapshot.state).length, 0);

const optionalStageState = plain(layerState);
optionalStageState.layers[0].graph.nodes.find((node) => node.id === "family").enabled = false;
const refreshedState = context.window.RadenLayers.updateSourceFromFlatState(
  optionalStageState,
  { modeSelector: "motherofpearl", scale: 0.02, layers: 3, flowMode: "radial" },
  { modeId: "motherofpearl" },
);
assert.equal(
  context.window.RadenLayers.getActiveLayer(refreshedState).graph.nodes.find(
    (node) => node.id === "family",
  ).enabled,
  false,
);

const historyBefore = JSON.parse(JSON.stringify(refreshedState));
const disabledState = context.window.RadenLayers.setSourceStageEnabled(
  refreshedState,
  "surface",
  false,
);
assert.deepEqual(
  Array.from(
    context.window.RadenGraphs.getDisabledStageIds(
      context.window.RadenLayers.getActiveLayer(disabledState).graph,
    ),
  ),
  ["family", "surface"],
);
assert.equal(
  context.window.RadenLayers.getActiveLayer(refreshedState).graph.nodes.find(
    (node) => node.id === "surface",
  ).enabled,
  true,
);
const historyRestored = JSON.parse(JSON.stringify(historyBefore));
assert.deepEqual(plain(historyRestored), plain(refreshedState));
assert.throws(
  () => context.window.RadenLayers.setSourceStageEnabled(disabledState, "growth", false),
  /Required graph node cannot be disabled/,
);
assert.throws(
  () => context.window.RadenLayers.setSourceStageEnabled(disabledState, "missing", false),
  /Unknown graph node/,
);

const html = fs.readFileSync(path.join(__dirname, "..", "index.html"), "utf8");
[
  "modeId",
  '"motherofpearl"',
  '"opalvein"',
  '"labradorite"',
  '"marbleink"',
  '"topography"',
].forEach((modeExpression) => {
  assert.match(html, new RegExp(`disabledStageIds: getDisabledSourceStageIds\\(${modeExpression}\\)`));
});
assert.match(
  html,
  /function setSourceStageEnabledWithHistory[\s\S]*commitLayerStateWithHistory[\s\S]*scheduleFinalRender/,
);
assert.match(html, /RadenGraphCommands[\s\S]*setStageEnabled: setSourceStageEnabledWithHistory/);

console.log("Procedural graph state round trip passed.");
