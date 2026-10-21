const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const context = { window: {} };
const source = fs.readFileSync(
  path.join(__dirname, "..", "src", "core", "status.js"),
  "utf8",
);
vm.runInNewContext(source, context);

const attributes = {};
const statusEl = { dataset: {}, textContent: "" };
const progressEl = {
  style: {},
  setAttribute(name, value) {
    attributes[name] = value;
  },
};
const controller = context.window.RadenCoreStatus.createStatusController({
  statusEl,
  progressEl,
});

controller.setStatus("rendering", "Rendering...");
controller.setProgressPercent(42.6);
assert.equal(statusEl.dataset.state, "rendering");
assert.equal(statusEl.textContent, "Rendering...");
assert.equal(progressEl.style.width, "42.6%");
assert.equal(attributes["aria-valuenow"], "43");

controller.setProgressPercent(240);
assert.equal(progressEl.style.width, "100%");
assert.equal(attributes["aria-valuenow"], "100");

console.log("Status feedback passed.");
