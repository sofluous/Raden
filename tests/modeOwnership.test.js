const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.join(__dirname, "..");
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
const visibility = fs.readFileSync(path.join(root, "src", "ui", "visibility.js"), "utf8");

assert.doesNotMatch(html, /NATURAL_SHARED_CONTROL_VISIBILITY/);
assert.doesNotMatch(visibility, /naturalSharedControlVisibility|updateNaturalSharedControlVisibility/);

const context = { window: { RadenShared: {} }, Math };
function run(relativePath) {
  vm.runInNewContext(
    fs.readFileSync(path.join(root, relativePath), "utf8"),
    context,
  );
}

run(path.join("src", "render", "stages.js"));
run(path.join("src", "modes", "registry.js"));
[
  "motherOfPearl.js",
  "bubbleFilm.js",
  "opalVein.js",
  "labradorite.js",
  "marbleInk.js",
  "agateBands.js",
  "malachiteFlow.js",
  "lichenGrowth.js",
  "riverDelta.js",
  "topography.js",
].forEach((file) => run(path.join("src", "modes", file)));

const activeControlMap = context.window.RadenModes.getActiveControlIdMap();
const expectedNaturalControls = {
  agateband: ["naturalScale", "naturalWarp"],
  malachiteflow: ["naturalScale", "naturalWarp", "naturalTurbulence", "naturalAnisotropy"],
  lichengrowth: ["naturalScale", "naturalWarp"],
  icebloom: ["naturalScale", "naturalWarp"],
  riverdelta: ["naturalScale", "naturalWarp", "naturalTurbulence", "naturalAnisotropy"],
  bubblefilm: ["naturalScale", "naturalWarp", "naturalTurbulence"],
};

Object.entries(expectedNaturalControls).forEach(([modeId, controlIds]) => {
  controlIds.forEach((controlId) => {
    assert.equal(
      activeControlMap[modeId]?.has(controlId),
      true,
      `${modeId} registry metadata owns ${controlId} visibility`,
    );
  });
});

console.log("Module-owned control visibility passed.");
