const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const context = {
  window: {},
  Date,
  Math,
  document: { getElementById: () => null },
};
const run = (relativePath) => {
  const source = fs.readFileSync(path.join(__dirname, "..", relativePath), "utf8");
  vm.runInNewContext(source, context);
};
run(path.join("src", "state", "palettes.js"));
run(path.join("src", "state", "layers.js"));
run(path.join("src", "ui", "palettes.js"));

const palettes = context.window.RadenPalettes;
const paletteUi = context.window.RadenUiPalettes;
const plain = (value) => JSON.parse(JSON.stringify(value));
assert.equal(paletteUi.getAdjacentIndex(0, 5, -1), 4);
assert.equal(paletteUi.getAdjacentIndex(4, 5, 1), 0);
assert.equal(paletteUi.getAdjacentIndex(2, 5, 1), 3);
assert.equal(paletteUi.getAdjacentIndex(2, 0, -1), 0);
const classic = palettes.getPreset("motherofpearl", "classic");
assert.equal(classic.colors.length, 5);
assert.deepEqual(plain(classic.colors[0]), { h: 286, s: 26, l: 83 });

[
  "motherofpearl", "opalvein", "labradorite", "marbleink", "agateband",
  "malachiteflow", "lichengrowth", "icebloom", "riverdelta", "bubblefilm",
  "topography",
].forEach((modeId) => {
  assert.ok(palettes.listPresets(modeId).length >= 3, `${modeId} has palette choices`);
  assert.equal(palettes.getPreset(modeId, "classic").colors.length, 5);
});

classic.colors[0].h = 0;
assert.equal(
  palettes.getPreset("motherofpearl", "classic").colors[0].h,
  286,
  "preset callers receive clones",
);
assert.equal(palettes.hslToHex({ h: 0, s: 100, l: 50 }), "#ff0000");
assert.equal(palettes.hslToHex({ h: 120, s: 100, l: 50 }), "#00ff00");

assert.equal(
  palettes.normalizePaletteState(null, {
    modeId: "motherofpearl",
    allowNull: true,
  }),
  null,
);

const custom = palettes.normalizePaletteState(
  {
    modeId: "motherofpearl",
    source: "custom",
    locked: false,
    stops: [
      { id: "tone", color: { h: -20, s: 125, l: 40 } },
      { id: "tone", color: { h: 420, s: 32, l: -8 } },
    ],
  },
  { modeId: "motherofpearl" },
);
assert.deepEqual(plain(custom.stops[0]), {
  id: "tone",
  color: { h: 0, s: 100, l: 40 },
});
assert.equal(custom.stops[1].id, "tone-2");
assert.deepEqual(plain(custom.stops[1].color), { h: 360, s: 32, l: 0 });

const colors = palettes.resolveColors({
  modeId: "motherofpearl",
  presetId: "silver",
  palette: custom,
});
assert.deepEqual(plain(colors), plain(custom.stops.map((stop) => stop.color)));

const randomized = palettes.randomizePaletteState(custom, {
  modeId: "motherofpearl",
  random: () => 0.5,
});
assert.deepEqual(plain(randomized.stops[0].color), { h: 180, s: 60, l: 57 });
assert.deepEqual(plain(randomized.stops[1].color), { h: 180, s: 60, l: 57 });
assert.equal(randomized.source, "custom");
assert.equal(randomized.presetId, null);

const layerState = context.window.RadenLayers.buildLayerStateFromFlatState(
  { modeSelector: "motherofpearl", nacrePalette: "classic" },
  { modeId: "motherofpearl" },
);
assert.equal(context.window.RadenLayers.getActiveLayer(layerState).palette, null);
const withPalette = context.window.RadenLayers.setLayerPalette(layerState, custom);
assert.deepEqual(
  plain(context.window.RadenLayers.getActiveLayer(withPalette).palette.stops),
  plain(custom.stops),
);
assert.equal(context.window.RadenLayers.getActiveLayer(layerState).palette, null);
assert.equal(context.window.RadenLayers.validateLayerState(withPalette).length, 0);

console.log("Authored palette state passed.");
