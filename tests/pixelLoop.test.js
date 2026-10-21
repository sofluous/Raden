const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const context = { window: {} };
const source = fs.readFileSync(
  path.join(__dirname, "..", "src", "render", "pixelLoop.js"),
  "utf8",
);
vm.runInNewContext(source, context);

const { createPixelLoop } = context.window.RadenPixelLoop;
const frames = [];
const progress = [];
const buffer = new Uint8ClampedArray(2 * 3 * 4);
let task = null;
let clears = 0;
let completions = 0;
const loop = createPixelLoop({
  width: 2,
  height: 3,
  rowsPerFrame: 2,
  buffer,
  isCurrent: () => true,
  setTask: (next) => {
    task = next;
  },
  clearTask: () => {
    task = null;
    clears += 1;
  },
  requestFrame: (next) => frames.push(next),
  onProgress: (percent) => progress.push(percent),
  onComplete: () => {
    completions += 1;
  },
  renderPixel: (x, y) => ({ r: x * 300, g: y * 40, b: -12 }),
});

loop.start();
assert.equal(typeof task, "function");
while (frames.length) frames.shift()();
assert.deepEqual(progress, [(2 / 3) * 100, 100]);
assert.equal(completions, 1);
assert.equal(clears, 1);
assert.equal(task, null);
assert.deepEqual(Array.from(buffer.slice(0, 8)), [0, 0, 0, 255, 255, 0, 0, 255]);
assert.equal(loop.getState().row, 3);
assert.equal(loop.getState().finished, true);

const cancelledFrames = [];
let current = true;
let cancelledRows = 0;
let cancelledComplete = false;
let cancelledClears = 0;
const cancelled = createPixelLoop({
  width: 1,
  height: 3,
  rowsPerFrame: 1,
  buffer: new Uint8ClampedArray(12),
  isCurrent: () => current,
  requestFrame: (next) => cancelledFrames.push(next),
  clearTask: () => {
    cancelledClears += 1;
  },
  renderPixel: () => {
    cancelledRows += 1;
    return { r: 1, g: 2, b: 3 };
  },
  onComplete: () => {
    cancelledComplete = true;
  },
});
cancelled.start();
cancelledFrames.shift()();
current = false;
cancelledFrames.shift()();
assert.equal(cancelledRows, 1);
assert.equal(cancelledComplete, false);
assert.equal(cancelledClears, 1);
assert.equal(cancelled.getState().row, 1);
assert.equal(cancelled.getState().finished, true);

assert.throws(
  () =>
    createPixelLoop({
      width: 2,
      height: 2,
      rowsPerFrame: 1,
      buffer: new Uint8ClampedArray(4),
      renderPixel: () => ({ r: 0, g: 0, b: 0 }),
      requestFrame: () => {},
    }),
  /RGBA buffer/,
);

console.log("Pixel loop orchestration passed.");
