const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const context = { window: {} };
const source = fs.readFileSync(
  path.join(__dirname, "..", "src", "ui", "canvasViewport.js"),
  "utf8",
);
vm.runInNewContext(source, context);
const viewport = context.window.RadenCanvasViewport;

assert.equal(viewport.getFitScale(50, 100, 1000, 800), 1);
assert.ok(viewport.getFitScale(4096, 4096, 1000, 800) < 0.2);

const viewportRect = { left: 100, top: 50, width: 1000, height: 800 };
const pan = { x: 85.5, y: -42.25 };
const zoomRatio = 2.35;
for (const pointer of [
  { x: 640, y: 260 },
  { x: 110, y: 60 },
  { x: 1080, y: 700 },
]) {
  const zoomedPan = viewport.zoomPanAroundWorkspacePoint(
    pan,
    pointer,
    viewportRect,
    zoomRatio,
  );
  const cursorX = pointer.x - (viewportRect.left + viewportRect.width * 0.5);
  const cursorY = pointer.y - (viewportRect.top + viewportRect.height * 0.5);
  assert.equal((cursorX - zoomedPan.x) / zoomRatio, cursorX - pan.x);
  assert.equal((cursorY - zoomedPan.y) / zoomRatio, cursorY - pan.y);
}

console.log("Canvas viewport geometry passed.");
