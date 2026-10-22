const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const context = { window: {} };
const source = fs.readFileSync(
  path.join(__dirname, "..", "src", "shared", "math_color_palette.js"),
  "utf8",
);
vm.runInNewContext(source, context);

const { finiteOr } = context.window.RadenShared;
assert.equal(finiteOr(0, 12), 0);
assert.equal(finiteOr("0", 12), 0);
assert.equal(finiteOr("2.5", 12), 2.5);
assert.equal(finiteOr(undefined, 12), 12);
assert.equal(finiteOr(null, 12), 12);
assert.equal(finiteOr("", 12), 12);
assert.equal(finiteOr("not-a-number", 12), 12);
assert.equal(finiteOr(Infinity, 12), 12);
assert.equal(finiteOr(-Infinity, 12), 12);

console.log("Shared finite-number normalization passed.");
