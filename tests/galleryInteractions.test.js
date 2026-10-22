const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const source = fs.readFileSync(
  path.join(__dirname, "..", "src", "ui", "gallery.js"),
  "utf8",
);
assert.doesNotMatch(source, /gallery-open-btn/);
assert.match(source, /<i class="iconoir-folder"><\/i><span>Open<\/span>/);
assert.match(source, /addEventListener\("dblclick"/);
assert.match(source, /addEventListener\("contextmenu"/);
assert.match(source, /menu\.open = true/);

console.log("Gallery open interactions passed.");
