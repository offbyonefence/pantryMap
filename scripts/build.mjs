// Assembles the deployable site into dist/: validates data, merges all food
// bank entries into a single dist/data/foodbanks.json, copies static assets.
// Run: mise run build
import { cp, mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { ROOT, validateAll } from "./lib/validate-lib.mjs";

const DIST = path.join(ROOT, "dist");

const { entries, errors, fileCount } = await validateAll();
if (errors.length) {
  console.error(`✗ Refusing to build: ${errors.length} data problem(s). Run \`mise run lint:data\` for details.`);
  process.exit(1);
}

await rm(DIST, { recursive: true, force: true });
await mkdir(path.join(DIST, "data"), { recursive: true });

entries.sort((a, b) => a.id.localeCompare(b.id));
await writeFile(
  path.join(DIST, "data", "foodbanks.json"),
  JSON.stringify({ generated: new Date().toISOString().slice(0, 10), count: entries.length, foodbanks: entries })
);

for (const item of ["index.html", "css", "js", "vendor", "data/zips.json"]) {
  await cp(path.join(ROOT, item), path.join(DIST, item), { recursive: true });
}
// Tells GitHub Pages to serve files as-is (no Jekyll processing).
await writeFile(path.join(DIST, ".nojekyll"), "");

console.log(`✓ Built dist/ with ${entries.length} food bank(s) from ${fileCount} data file(s).`);
