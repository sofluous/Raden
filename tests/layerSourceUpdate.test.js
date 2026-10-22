const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const context = { window: {} };
const run = (relativePath) => {
  const source = fs.readFileSync(path.join(__dirname, "..", relativePath), "utf8");
  vm.runInNewContext(source, context);
};
run(path.join("src", "state", "effects.js"));
run(path.join("src", "modes", "registry.js"));
run(path.join("src", "state", "layers.js"));

const layers = context.window.RadenLayers;
let state = layers.buildLayerStateFromFlatState(
  { modeSelector: "motherofpearl", seed: 12, nacrePalette: "classic" },
  { modeId: "motherofpearl" },
);
state = layers.addEffect(state, "grain", { config: { grainAmount: 0.44 } });
state = layers.addEffect(state, "invert");
const before = layers.getActiveLayer(state);
const effectIds = Array.from(before.effects, (effect) => effect.id);
const activeEffectId = state.activeEffectId;

const updated = layers.updateSourceFromFlatState(
  state,
  { modeSelector: "opalvein", seed: 99, nacrePalette: "fire" },
  { modeId: "opalvein" },
);
const source = layers.getActiveLayer(updated);
assert.equal(source.modeId, "opalvein");
assert.equal(source.config.seed, 99);
assert.deepEqual(Array.from(source.effects, (effect) => effect.id), effectIds);
assert.equal(source.effects[0].config.grainAmount, 0.44);
assert.equal(updated.activeEffectId, activeEffectId);
assert.equal(layers.getActiveLayer(state).modeId, "motherofpearl");

console.log("Layer source replacement preserves effects.");
