const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const context = { window: {} };
const source = fs.readFileSync(
  path.join(__dirname, "..", "src", "render", "pipeline.js"),
  "utf8",
);
vm.runInNewContext(source, context);
const { finalizeCanvasRender, renderMode } = context.window.RadenRenderPipeline;

const runtime = { id: "registered" };
const registeredCalls = [];
const registeredResult = renderMode("motherofpearl", {
  force: true,
  renderOptions: { preview: true },
  getRuntime: () => runtime,
  registeredHandlers: {
    motherofpearl: (...args) => {
      registeredCalls.push(args);
      return "registered-result";
    },
  },
  renderLegacy: () => "legacy-result",
});
assert.equal(registeredResult, "registered-result");
assert.equal(registeredCalls[0][0], runtime);
assert.equal(registeredCalls[0][1], true);
assert.equal(registeredCalls[0][2].preview, true);

const legacyCalls = [];
const legacyResult = renderMode("bubblefilm", {
  force: false,
  renderOptions: { preview: false },
  getRuntime: () => null,
  registeredHandlers: {},
  renderLegacy: (...args) => {
    legacyCalls.push(args);
    return "legacy-result";
  },
});
assert.equal(legacyResult, "legacy-result");
assert.deepEqual(legacyCalls[0], ["bubblefilm", false, { preview: false }]);

const registeredWithoutHandler = renderMode("bubblefilm", {
  getRuntime: () => ({ id: "bubble-runtime" }),
  registeredHandlers: {},
  renderLegacy: () => "runtime-fallback",
});
assert.equal(registeredWithoutHandler, "runtime-fallback");
assert.equal(renderMode("unknown"), undefined);

function createHarness(preview) {
  const events = [];
  const scheduled = [];
  const targetCanvas = { width: 0, height: 0 };
  const targetContext = {
    globalAlpha: 1,
    filter: "none",
    drawImage(sourceCanvas, x, y) {
      events.push([
        "draw",
        sourceCanvas.id,
        x,
        y,
        this.globalAlpha,
        this.filter,
      ]);
    },
  };
  const offscreenCanvas = { id: "offscreen" };
  const imageData = { id: "pixels" };
  finalizeCanvasRender({
    config: { width: 80, height: 40, preview },
    imageData,
    offscreenCanvas,
    offscreenContext: {
      putImageData(data, x, y) {
        events.push(["put", data.id, x, y]);
      },
    },
    targetCanvas,
    targetContext,
    drawPasses: [
      { alpha: 1, filter: "none" },
      { alpha: 0.2, filter: "blur(8px)" },
    ],
    commit: () => events.push(["commit"]),
    setStatus: (state, message) => events.push(["status", state, message]),
    markApplied: () => events.push(["applied"]),
    onReady: () => events.push(["ready"]),
    schedule: (callback, delay) => scheduled.push({ callback, delay }),
  });
  return { events, scheduled, targetCanvas, targetContext };
}

const finalRender = createHarness(false);
assert.deepEqual(finalRender.events, [
  ["put", "pixels", 0, 0],
  ["draw", "offscreen", 0, 0, 1, "none"],
  ["draw", "offscreen", 0, 0, 0.2, "blur(8px)"],
  ["commit"],
  ["status", "complete", "Complete"],
  ["applied"],
]);
assert.equal(finalRender.targetCanvas.width, 80);
assert.equal(finalRender.targetCanvas.height, 40);
assert.equal(finalRender.targetContext.globalAlpha, 1);
assert.equal(finalRender.targetContext.filter, "none");
assert.equal(finalRender.scheduled[0].delay, 500);
finalRender.scheduled[0].callback();
assert.deepEqual(finalRender.events.slice(-2), [
  ["status", "idle", "Idle"],
  ["ready"],
]);

const preview = createHarness(true);
assert.deepEqual(preview.events.slice(-2), [
  ["commit"],
  ["status", "idle", "Preview ready"],
]);
assert.equal(preview.scheduled.length, 0);
assert.equal(preview.events.some(([event]) => event === "applied"), false);

console.log("Render pipeline finalization passed.");
