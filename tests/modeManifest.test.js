const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const context = { window: {}, Math };
const stableModuleFiles = [
  "motherOfPearl",
  "opalVein",
  "labradorite",
  "marbleInk",
  "agateBands",
  "malachiteFlow",
  "lichenGrowth",
  "riverDelta",
  "bubbleFilm",
  "topography",
];
const run = (relativePath) => vm.runInNewContext(
  fs.readFileSync(path.join(__dirname, "..", relativePath), "utf8"),
  context,
);
run(path.join("src", "render", "stages.js"));
run(path.join("src", "modes", "registry.js"));

assert.deepEqual(
  JSON.parse(JSON.stringify(context.window.RadenModes.listModes().map((mode) => mode.id))),
  ["icebloom"],
  "only the deferred mode remains centrally defined",
);

[
  "motherofpearl",
  "opalvein",
  "labradorite",
  "marbleink",
  "agateband",
  "malachiteflow",
  "lichengrowth",
  "riverdelta",
  "bubblefilm",
  "topography",
].forEach((modeId) => assert.equal(context.window.RadenModes.getMode(modeId), null));
assert.throws(
  () => context.window.RadenModes.registerMode({ id: "missing-fields" }),
  /requires a label/,
);
assert.throws(
  () => context.window.RadenModes.registerMode({
    id: "bad-order",
    label: "Bad order",
    status: "stable",
    order: "later",
    activeControlIds: [],
  }),
  /requires a finite order/,
);
assert.throws(
  () => context.window.RadenModes.registerMode({
    id: "duplicate-order",
    label: "Duplicate order",
    status: "experimental",
    order: 7,
    activeControlIds: [],
  }),
  /duplicate mode order/,
);

stableModuleFiles.forEach((file) => {
  const relativePath = path.join("src", "modes", `${file}.js`);
  const source = fs.readFileSync(path.join(__dirname, "..", relativePath), "utf8");
  assert.match(source, /registerTextureModule\?\.\(MODE_MANIFEST,/);
  assert.doesNotMatch(source, /registerMode\?\.\(/);
  assert.doesNotMatch(source, /registerRuntime\?\.\(/);
  run(relativePath);
});
const bubble = context.window.RadenModes.getMode("bubblefilm");
assert.equal(bubble.label, "Bubble Film");
assert.equal(bubble.status, "stable");
assert.deepEqual(Array.from(bubble.activeControlIds), [
  "naturalScale",
  "naturalWarp",
  "naturalTurbulence",
  "nacrePalette",
]);
const orderedIds = context.window.RadenModes.listModes().map((mode) => mode.id);
assert.deepEqual(JSON.parse(JSON.stringify(orderedIds)), [
  "motherofpearl",
  "opalvein",
  "labradorite",
  "marbleink",
  "agateband",
  "malachiteflow",
  "lichengrowth",
  "icebloom",
  "riverdelta",
  "bubblefilm",
  "topography",
]);
assert.ok(orderedIds.indexOf("riverdelta") < orderedIds.indexOf("bubblefilm"));
assert.ok(orderedIds.indexOf("bubblefilm") < orderedIds.indexOf("topography"));
assert.throws(
  () => context.window.RadenModes.registerMode(bubble),
  /duplicate mode/,
);
assert.ok(context.window.RadenModes.getRuntime("bubblefilm"));
[
  ["motherofpearl", "Mother of Pearl"],
  ["opalvein", "Opal Vein"],
  ["labradorite", "Labradorite Flash"],
  ["marbleink", "Marble Ink"],
  ["agateband", "Agate Bands"],
  ["malachiteflow", "Malachite Flow"],
  ["lichengrowth", "Lichen Growth"],
  ["riverdelta", "River Delta"],
  ["topography", "Topography"],
].forEach(([modeId, label]) => {
  assert.equal(context.window.RadenModes.getMode(modeId).label, label);
  assert.ok(context.window.RadenModes.getRuntime(modeId));
});

console.log("Colocated mode manifest passed.");
