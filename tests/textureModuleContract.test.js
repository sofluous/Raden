const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const context = { window: {} };
const run = (relativePath) => vm.runInNewContext(
  fs.readFileSync(path.join(__dirname, "..", relativePath), "utf8"),
  context,
);
run(path.join("src", "render", "stages.js"));
run(path.join("src", "modes", "registry.js"));

const stages = context.window.RadenStages;
const description = stages.createStagePipeline({
  modeId: "example",
  stages: [
    { id: "field", kind: "field", outputs: ["field"], controlIds: ["scale"] },
    {
      id: "material",
      kind: "material",
      inputs: ["field"],
      outputs: ["nativeColor"],
      interfaceId: "materialSource",
      interfaceBindings: { outputColor: "nativeColor" },
    },
    {
      id: "authoredPalette",
      kind: "material",
      inputs: ["nativeColor"],
      outputs: ["pixel"],
      controlIds: ["palette"],
      interfaceId: "colorTransform",
      optional: true,
      bypass: {
        type: "identity-color",
        input: "nativeColor",
        output: "pixel",
        description: "Return native color.",
      },
    },
  ],
  execute(value) { return value; },
}).describe();

assert.deepEqual(
  Array.from(stages.validateTextureStageDescription(description, {
    activeControlIds: ["scale", "palette"],
    paletteControlId: "palette",
  })),
  [],
);
assert.match(
  stages.validateTextureStageDescription(
    { modeId: "missing-material", stages: [description.stages[0], description.stages[2]] },
    { activeControlIds: ["scale", "palette"], paletteControlId: "palette" },
  ).join(" "),
  /exactly one materialSource/,
);
assert.match(
  stages.validateTextureStageDescription(description, {
    activeControlIds: ["scale", "palette", "ghostControl"],
    paletteControlId: "palette",
  }).join(" "),
  /active control has no stage owner: ghostControl/,
);
assert.match(
  stages.validateTextureStageDescription(
    { modeId: "wrong-order", stages: [description.stages[0], description.stages[2], description.stages[1]] },
    { activeControlIds: ["scale", "palette"], paletteControlId: "palette" },
  ).join(" "),
  /palette colorTransform must be the terminal stage/,
);

const invalidManifest = {
  id: "invalid-stable",
  order: 20,
  label: "Invalid stable texture",
  status: "stable",
  family: "procedural",
  activeControlIds: ["ghostControl"],
};
assert.throws(
  () => context.window.RadenModes.registerTextureModule(invalidManifest, {
    normalizeConfig(value) { return value; },
    createRenderer() { return {}; },
    stages: description.stages,
  }),
  /active control has no stage owner/,
  "stable runtime registration applies the texture authoring contract",
);
assert.equal(context.window.RadenModes.getMode("invalid-stable"), null);
assert.equal(context.window.RadenModes.getRuntime("invalid-stable"), null);

const invalidInspectorManifest = {
  id: "invalid-inspector",
  order: 21,
  label: "Invalid inspector texture",
  status: "stable",
  family: "procedural",
  activeControlIds: ["scale", "nacrePalette"],
};
const invalidInspectorStages = description.stages.map((stage) => Object.assign({}, stage, {
  controlIds: Array.from(stage.controlIds, (id) => id === "palette" ? "nacrePalette" : id),
}));
assert.throws(
  () => context.window.RadenModes.registerTextureModule(invalidInspectorManifest, {
    normalizeConfig(value) { return value; },
    createRenderer() { return {}; },
    stages: invalidInspectorStages,
    inspector: {
      rootId: "invalidInspector",
      groups: [
        { id: "field", label: "Field", controlIds: ["scale"] },
        { id: "material", label: "Material", controlIds: ["nacrePalette"], toggleable: true },
      ],
    },
  }),
  /cannot toggle required stage material/,
  "inspector validation completes before atomic module registration",
);
assert.equal(context.window.RadenModes.getMode("invalid-inspector"), null);
assert.equal(context.window.RadenModes.getRuntime("invalid-inspector"), null);

const missingInspectorManifest = {
  id: "missing-inspector",
  order: 22,
  label: "Missing inspector texture",
  status: "stable",
  family: "procedural",
  activeControlIds: ["scale", "nacrePalette"],
};
assert.throws(
  () => context.window.RadenModes.registerTextureModule(missingInspectorManifest, {
    normalizeConfig(value) { return value; },
    createRenderer() { return {}; },
    stages: invalidInspectorStages,
  }),
  /requires an inspector definition/,
);
assert.equal(context.window.RadenModes.getMode("missing-inspector"), null);
assert.equal(context.window.RadenModes.getRuntime("missing-inspector"), null);

assert.throws(
  () => context.window.RadenModes.registerTextureModule({
    id: "invalid-randomization",
    order: 23,
    label: "Invalid randomization texture",
    status: "stable",
    family: "procedural",
    activeControlIds: ["scale", "nacrePalette"],
  }, {
    normalizeConfig(value) { return value; },
    createRenderer() { return {}; },
    stages: invalidInspectorStages,
    inspector: {
      rootId: "invalidRandomizationInspector",
      groups: [
        { id: "field", label: "Field", controlIds: ["scale"] },
        { id: "authoredPalette", label: "Palette", controlIds: ["nacrePalette"] },
      ],
    },
    randomization: {
      controls: [{ controlId: "ghostControl", min: 0, max: 1 }],
    },
  }),
  /references inactive control: ghostControl/,
);
assert.equal(context.window.RadenModes.getMode("invalid-randomization"), null);
assert.equal(context.window.RadenModes.getRuntime("invalid-randomization"), null);

assert.throws(
  () => context.window.RadenModes.registerTextureModule({
    id: "missing-randomization",
    order: 24,
    label: "Missing randomization texture",
    status: "stable",
    family: "procedural",
    activeControlIds: ["scale", "nacrePalette"],
  }, {
    normalizeConfig(value) { return value; },
    createRenderer() { return {}; },
    stages: invalidInspectorStages,
    inspector: {
      rootId: "missingRandomizationInspector",
      groups: [
        { id: "field", label: "Field", controlIds: ["scale"] },
        { id: "authoredPalette", label: "Palette", controlIds: ["nacrePalette"] },
      ],
    },
  }),
  /requires a randomization definition/,
);
assert.equal(context.window.RadenModes.getMode("missing-randomization"), null);
assert.equal(context.window.RadenModes.getRuntime("missing-randomization"), null);

assert.throws(
  () => context.window.RadenModes.registerTextureModule({
    id: "invalid-help",
    order: 25,
    label: "Invalid help texture",
    status: "stable",
    family: "procedural",
    activeControlIds: ["scale", "nacrePalette"],
  }, {
    normalizeConfig(value) { return value; },
    createRenderer() { return {}; },
    stages: invalidInspectorStages,
    inspector: {
      rootId: "invalidHelpInspector",
      groups: [
        { id: "field", label: "Field", controlIds: ["scale"] },
        { id: "authoredPalette", label: "Palette", controlIds: ["nacrePalette"] },
      ],
    },
    randomization: {
      controls: [{ controlId: "scale", min: 0, max: 1 }],
    },
    help: { sectionIntros: { natural: "" } },
  }),
  /help has an empty section introduction/,
);
assert.equal(context.window.RadenModes.getMode("invalid-help"), null);
assert.equal(context.window.RadenModes.getRuntime("invalid-help"), null);

console.log("Texture module authoring contract passed.");
