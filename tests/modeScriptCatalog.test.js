const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
const catalogPaths = Array.from(
  html.matchAll(/<script data-raden-mode src="\.\/src\/modes\/([^"]+\.js)"><\/script>/g),
  (match) => match[1],
);
const moduleFiles = fs.readdirSync(path.join(root, "src", "modes"))
  .filter((file) => file.endsWith(".js") && file !== "registry.js")
  .sort();

assert.equal(new Set(catalogPaths).size, catalogPaths.length, "mode scripts are unique");
assert.deepEqual(
  [...catalogPaths].sort(),
  moduleFiles,
  "the static catalog includes every mode module exactly once",
);

const registryIndex = html.indexOf('<script src="./src/modes/registry.js"></script>');
const firstModeIndex = html.indexOf("<script data-raden-mode");
const controlsIndex = html.indexOf('<script src="./src/ui/controls.js"></script>');
assert.ok(registryIndex >= 0 && registryIndex < firstModeIndex, "registry loads first");
assert.ok(firstModeIndex < controlsIndex, "mode catalog loads before UI initialization");

catalogPaths.forEach((file) => {
  const source = fs.readFileSync(path.join(root, "src", "modes", file), "utf8");
  assert.match(source, /registerTextureModule\?\.\(MODE_MANIFEST,/);
});

console.log("Static mode script catalog passed.");
