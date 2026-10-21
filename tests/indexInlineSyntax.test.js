const fs = require("node:fs");
const path = require("node:path");

const html = fs.readFileSync(path.join(__dirname, "..", "index.html"), "utf8");
const scripts = Array.from(
  html.matchAll(/<script>([\s\S]*?)<\/script>/g),
  (match) => match[1],
);

if (scripts.length === 0) {
  throw new Error("No inline scripts found in index.html");
}

for (const source of scripts) {
  new Function(source);
}

console.log(`Inline scripts parsed: ${scripts.length}`);
