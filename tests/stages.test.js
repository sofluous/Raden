const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const context = { window: {} };
vm.runInNewContext(
  fs.readFileSync(path.join(__dirname, "..", "src", "render", "stages.js"), "utf8"),
  context,
);
const stages = context.window.RadenStages;
assert.deepEqual(
  JSON.parse(JSON.stringify(stages.listInterfaces().map((item) => item.id))),
  ["materialSource", "colorTransform"],
);
assert.equal(stages.getInterface("colorTransform").bypassType, "identity-color");
assert.equal(
  stages.getInterface("materialSource").bindings.outputColor.direction,
  "output",
);
const pipeline = stages.createStagePipeline({
  modeId: "test",
  stages: [
    { id: "source", kind: "field", outputs: ["field"], controlIds: ["scale"] },
    { id: "color", kind: "material", inputs: ["field"], outputs: ["pixel"] },
  ],
  execute: (input) => ({ value: input.value * 2 }),
});

assert.deepEqual(JSON.parse(JSON.stringify(pipeline.run({ value: 3 }))), { value: 6 });
assert.deepEqual(
  JSON.parse(JSON.stringify(pipeline.describe().stages.map((stage) => stage.id))),
  ["source", "color"],
);
assert.equal(pipeline.supportsDiagnostics, false);
assert.equal(pipeline.inspect, null);
const diagnosticPipeline = stages.createStagePipeline({
  modeId: "diagnostic",
  stages: [{ id: "source", kind: "field", outputs: ["field"] }],
  execute: (input) => input,
  inspect: (input) => ({ input, stages: { source: { field: input } } }),
});
assert.equal(diagnosticPipeline.supportsDiagnostics, true);
assert.deepEqual(
  JSON.parse(JSON.stringify(diagnosticPipeline.inspect(4))),
  { input: 4, stages: { source: { field: 4 } } },
);
assert.throws(
  () => stages.createStagePipeline({
    modeId: "missing-material-binding",
    stages: [{ id: "material", kind: "material", outputs: ["color"], interfaceId: "materialSource" }],
    execute() {},
  }),
  /requires materialSource.outputColor binding/,
);
assert.throws(
  () => stages.createStagePipeline({
    modeId: "invalid-material-binding",
    stages: [{ id: "material", kind: "material", outputs: ["color"], interfaceId: "materialSource", interfaceBindings: { outputColor: "missing" } }],
    execute() {},
  }),
  /is not a declared output/,
);
assert.throws(
  () => stages.createStagePipeline({
    modeId: "unknown-material-binding",
    stages: [{ id: "material", kind: "material", outputs: ["color"], interfaceId: "materialSource", interfaceBindings: { outputColor: "color", alpha: "color" } }],
    execute() {},
  }),
  /unknown materialSource binding: alpha/,
);
assert.throws(
  () => stages.createStagePipeline({ modeId: "bad", stages: [], execute() {} }),
  /has no stages/,
);
assert.throws(
  () => stages.createStagePipeline({
    modeId: "bad",
    stages: [
      { id: "same", kind: "field", outputs: ["one"] },
      { id: "same", kind: "material", outputs: ["two"] },
    ],
    execute() {},
  }),
  /Duplicate stage id/,
);
assert.throws(
  () => stages.createStagePipeline({
    modeId: "bad",
    stages: [{ id: "source", kind: "unknown", outputs: ["field"] }],
    execute() {},
  }),
  /unsupported kind/,
);
assert.throws(
  () => stages.createStagePipeline({
    modeId: "bad-order",
    stages: [{ id: "color", kind: "material", inputs: ["field"], outputs: ["pixel"] }],
    execute() {},
  }),
  /unavailable inputs: field/,
);
const bypassPipeline = stages.createStagePipeline({
  modeId: "bypass",
  disabledStageIds: ["surface"],
  stages: [
    { id: "source", kind: "field", outputs: ["field"] },
    {
      id: "surface",
      kind: "surface",
      inputs: ["field"],
      outputs: ["pixel"],
      optional: true,
      bypass: "Forward the field.",
    },
  ],
  execute: (input, state) => ({ value: input, surfaceEnabled: state.isEnabled("surface") }),
});
assert.deepEqual(JSON.parse(JSON.stringify(bypassPipeline.disabledStageIds)), ["surface"]);
assert.equal(bypassPipeline.run(3).surfaceEnabled, false);
assert.throws(
  () => stages.createStagePipeline({
    modeId: "required",
    disabledStageIds: ["source"],
    stages: [{ id: "source", kind: "field", outputs: ["field"] }],
    execute() {},
  }),
  /Cannot disable required stage: source/,
);
assert.throws(
  () => stages.createStagePipeline({
    modeId: "missing-bypass",
    stages: [{ id: "surface", kind: "surface", outputs: ["pixel"], optional: true }],
    execute() {},
  }),
  /requires a bypass description/,
);
assert.throws(
  () => stages.createStagePipeline({
    modeId: "wrong-interface-kind",
    stages: [{ id: "surface", kind: "geometry", outputs: ["pixel"], interfaceId: "colorTransform", optional: true, bypass: { type: "identity-color", input: "color", output: "pixel", description: "Forward color." }, inputs: ["color"] }],
    externalInputs: ["color"],
    execute() {},
  }),
  /incompatible with colorTransform/,
);
assert.throws(
  () => stages.createStagePipeline({
    modeId: "wrong-bypass",
    stages: [{ id: "surface", kind: "surface", outputs: ["pixel"], interfaceId: "colorTransform", optional: true, bypass: "Forward color.", inputs: ["color"] }],
    externalInputs: ["color"],
    execute() {},
  }),
  /requires identity-color bypass/,
);
assert.throws(
  () => stages.createStagePipeline({
    modeId: "missing-color-port",
    stages: [{ id: "surface", kind: "surface", outputs: ["pixel"], interfaceId: "colorTransform", optional: true, bypass: { type: "identity-color", input: "missing", output: "pixel", description: "Forward color." }, inputs: ["color"] }],
    externalInputs: ["color"],
    execute() {},
  }),
  /identity bypass input is unavailable/,
);

let diagnosticCalls = 0;
const pixelRenderer = stages.createPixelStageRenderer({
  modeId: "pixel-adapter",
  config: { seed: 7 },
  runtime: { disabledStageIds: ["palette"] },
  externalInputs: ["point"],
  stages: [
    { id: "source", kind: "material", inputs: ["point"], outputs: ["nativeColor"], interfaceId: "materialSource", interfaceBindings: { outputColor: "nativeColor" } },
    { id: "palette", kind: "material", inputs: ["nativeColor"], outputs: ["pixel"], interfaceId: "colorTransform", optional: true, bypass: { type: "identity-color", input: "nativeColor", output: "pixel", description: "Forward native color." } },
  ],
  execute(point, state, diagnostics) {
    if (diagnostics) diagnosticCalls += 1;
    const nativeColor = { r: point.x, g: 2, b: 3, a: 255 };
    const pixel = stages.applyOptionalColorTransform(
      state,
      "palette",
      (color) => ({ ...color, r: color.r + 10 }),
      nativeColor,
    );
    return diagnostics ? { pixel, stages: { source: nativeColor, palette: pixel } } : pixel;
  },
});
assert.equal(pixelRenderer.config.seed, 7);
assert.equal(pixelRenderer.renderPixel({ x: 4 }).r, 4);
assert.equal(pixelRenderer.inspectPixel({ x: 5 }).pixel.r, 5);
assert.equal(diagnosticCalls, 1);
assert.equal(pixelRenderer.describeStages().modeId, "pixel-adapter");
assert.deepEqual(
  JSON.parse(JSON.stringify(pixelRenderer.describeStages().stages[0].interfaceBindings)),
  { outputColor: "nativeColor" },
);
assert.deepEqual(
  JSON.parse(JSON.stringify(pixelRenderer.describeStages().stages[1].interfaceBindings)),
  { inputColor: "nativeColor", outputColor: "pixel" },
);
assert.throws(
  () => stages.createPixelStageRenderer({ modeId: "missing-executor", stages: [] }),
  /requires execute/,
);

console.log("Procedural stage contract passed.");
