const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const context = { window: {} };
const source = fs.readFileSync(
  path.join(__dirname, "..", "src", "render", "coordinates.js"),
  "utf8",
);
vm.runInNewContext(source, context);
const { getCropSpacePoint } = context.window.RadenRenderCoordinates;

const landscapeCenter = getCropSpacePoint({ width: 100, height: 50 }, 50, 25);
assert.equal(landscapeCenter.cx, 0);
assert.equal(landscapeCenter.cy, 0);
assert.equal(landscapeCenter.ux, 0.5);
assert.equal(landscapeCenter.uy, 0.5);

const landscapeCorner = getCropSpacePoint({ width: 100, height: 50 }, 0, 0);
assert.equal(landscapeCorner.cx, -1);
assert.equal(landscapeCorner.cy, -0.5);
assert.equal(landscapeCorner.ux, -0.5);
assert.equal(landscapeCorner.uy, 0);

const portraitCorner = getCropSpacePoint({ width: 50, height: 100 }, 0, 0);
assert.equal(portraitCorner.cx, -0.5);
assert.equal(portraitCorner.cy, -1);
assert.equal(portraitCorner.ux, 0);
assert.equal(portraitCorner.uy, -0.5);

const minimum = getCropSpacePoint({ width: 0, height: 0 }, 0, 0);
assert.equal(minimum.cx, -0.5);
assert.equal(minimum.cy, -0.5);

console.log("Render coordinate mapping passed.");
