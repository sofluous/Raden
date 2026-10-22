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

const focus = { x: 821.25, y: 614.5 };
let cumulativePan = { x: -34.75, y: 18.5 };
let zoom = 1;
const focusX = focus.x - (viewportRect.left + viewportRect.width * 0.5);
const focusY = focus.y - (viewportRect.top + viewportRect.height * 0.5);
const originalWorldPoint = {
  x: (focusX - cumulativePan.x) / zoom,
  y: (focusY - cumulativePan.y) / zoom,
};
for (const nextZoom of [1.18, 1.319, 1.321, 1.76, 0.84, 2.4, 1]) {
  cumulativePan = viewport.zoomPanAroundWorkspacePoint(
    cumulativePan,
    focus,
    viewportRect,
    nextZoom / zoom,
  );
  zoom = nextZoom;
  assert.ok(Math.abs(originalWorldPoint.x - (focusX - cumulativePan.x) / zoom) < 1e-9);
  assert.ok(Math.abs(originalWorldPoint.y - (focusY - cumulativePan.y) / zoom) < 1e-9);
}

console.log("Canvas viewport geometry passed.");
