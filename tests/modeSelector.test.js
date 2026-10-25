const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const context = { window: {}, document: {} };
vm.runInNewContext(
  fs.readFileSync(path.join(__dirname, "..", "src", "ui", "controls.js"), "utf8"),
  context,
);
const controls = context.window.RadenUiControls;
const modes = [
  { id: "motherofpearl", label: "Mother of Pearl", status: "stable" },
  { id: "icebloom", label: "Ice Crystal Bloom", status: "deferred" },
  { id: "topography", label: "Topography", status: "stable" },
];
assert.deepEqual(
  JSON.parse(JSON.stringify(controls.getModeOptionModels(modes))),
  [
    { value: "motherofpearl", label: "Mother of Pearl" },
    { value: "icebloom", label: "Ice Crystal Bloom (Deferred)" },
    { value: "topography", label: "Topography" },
  ],
);

function createSelect(value) {
  return {
    value,
    options: [],
    ownerDocument: {
      createElement() { return { value: "", textContent: "" }; },
    },
    replaceChildren(...options) {
      this.options = options;
      this.value = "";
    },
  };
}

const preserved = createSelect("topography");
assert.equal(controls.syncModeSelector(preserved, modes, "motherofpearl"), "topography");
assert.equal(preserved.value, "topography");
assert.equal(preserved.options.length, 3);

const fallback = createSelect("retired-mode");
assert.equal(controls.syncModeSelector(fallback, modes, "motherofpearl"), "motherofpearl");
assert.equal(fallback.options[1].textContent, "Ice Crystal Bloom (Deferred)");

const randomization = {
  controls: [
    { controlId: "scale", type: "number", min: 2, max: 6, decimals: 2 },
    { controlId: "layers", type: "integer", min: 2, max: 6, decimals: 0 },
    { controlId: "family", type: "choice", values: ["a", "b"] },
  ],
};
const units = [0.25, 0.999, 0.5];
assert.deepEqual(
  JSON.parse(JSON.stringify(controls.createRandomizedControlValues(
    randomization,
    () => units.shift(),
  ))),
  [
    { controlId: "scale", value: 3, decimals: 2 },
    { controlId: "layers", value: 5, decimals: 0 },
    { controlId: "family", value: "b" },
  ],
);

const html = fs.readFileSync(path.join(__dirname, "..", "index.html"), "utf8");
assert.match(html, /<select id="modeSelector" aria-label="Texture type"><\/select>/);
assert.doesNotMatch(html, /<option value="motherofpearl">/);

console.log("Registry-driven texture selector passed.");
