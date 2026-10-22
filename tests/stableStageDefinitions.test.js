const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const context = { window: {}, Math };
function run(relativePath) {
  vm.runInNewContext(
    fs.readFileSync(path.join(__dirname, "..", relativePath), "utf8"),
    context,
  );
}

run(path.join("src", "render", "stages.js"));
run(path.join("src", "modes", "registry.js"));

const stableModes = context.window.RadenModes.listModes()
  .filter((mode) => mode.status === "stable")
  .map((mode) => mode.id);

[
  "motherOfPearl",
  "bubbleFilm",
  "opalVein",
  "labradorite",
  "marbleInk",
  "agateBands",
  "malachiteFlow",
  "lichenGrowth",
  "riverDelta",
  "topography",
].forEach((file) => run(path.join("src", "modes", `${file}.js`)));

stableModes.forEach((modeId) => {
  const runtime = context.window.RadenModes.getRuntime(modeId);
  assert.ok(runtime, `${modeId} runtime is registered`);
  assert.equal(typeof runtime.describeStages, "function", `${modeId} exposes stages`);
  assert.equal(runtime.describeStages().modeId, modeId);
  const stagedControls = new Set(
    runtime.describeStages().stages.flatMap((stage) => Array.from(stage.controlIds)),
  );
  context.window.RadenModes.getMode(modeId).activeControlIds.forEach((controlId) => {
    assert.ok(stagedControls.has(controlId), `${modeId}.${controlId} belongs to a stage`);
  });
});

console.log("Stable texture stage definitions passed.");
