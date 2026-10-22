const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const context = {
  window: { addEventListener() {} },
  document: { addEventListener() {} },
  localStorage: {},
  CustomEvent: class CustomEvent {},
  console,
  Set,
};
vm.runInNewContext(
  fs.readFileSync(path.join(__dirname, "..", "src", "ui", "locks.js"), "utf8"),
  context,
);

const attributes = {};
const button = {
  classList: { toggle() {} },
  setAttribute(name, value) {
    attributes[name] = value;
  },
  title: "",
  innerHTML: "",
};

context.window.RadenUiLocks.updateControlLockButton(button, false);
assert.equal(attributes["aria-label"], "Lock this control from randomize");
assert.equal(attributes["aria-pressed"], "false");

context.window.RadenUiLocks.updateControlLockButton(button, true);
assert.equal(attributes["aria-label"], "Unlock randomize for this control");
assert.equal(attributes["aria-pressed"], "true");

console.log("Lock control accessibility passed.");
