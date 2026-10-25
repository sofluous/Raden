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
[
  "agateBands.js",
  "malachiteFlow.js",
  "lichenGrowth.js",
  "riverDelta.js",
  "bubbleFilm.js",
].forEach((file) => run(path.join("src", "modes", file)));
run(path.join("src", "ui", "help.js"));

const help = context.window.RadenUiHelp;
const expectedStarts = {
  agateband: "Agate Bands builds",
  malachiteflow: "Malachite Flow builds",
  lichengrowth: "Lichen Growth builds",
  riverdelta: "River Delta builds",
  bubblefilm: "Bubble Film builds",
};
Object.entries(expectedStarts).forEach(([modeId, prefix]) => {
  const definition = context.window.RadenModes.getHelpDefinition(modeId);
  assert.ok(Object.isFrozen(definition));
  assert.ok(Object.isFrozen(definition.sectionIntros));
  assert.equal(help.getSectionIntro("natural geometry", modeId), definition.sectionIntros.natural);
  assert.match(definition.sectionIntros.natural, new RegExp(`^${prefix}`));
});

assert.match(help.getSectionIntro("natural detail", "icebloom"), /^Ice Crystal Bloom builds/);
assert.equal(help.getSectionIntro("unrelated", "agateband"), "");

const helpSource = fs.readFileSync(path.join(root, "src", "ui", "help.js"), "utf8");
Object.keys(expectedStarts).forEach((modeId) => {
  assert.doesNotMatch(helpSource, new RegExp(`activeMode === ["']${modeId}["']`));
});

console.log("Module-owned help metadata passed.");
