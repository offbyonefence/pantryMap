// Regenerates data/zips.json (ZIP code -> [lat, lng] centroid) from the
// GeoNames US postal-code dataset (https://download.geonames.org/export/zip/,
// licensed CC-BY 4.0 — attribution lives in the site footer and README).
// Run: mise run zips:generate
import path from "node:path";
import { ROOT } from "./lib/validate-lib.mjs";

const SOURCE = "https://download.geonames.org/export/zip/US.zip";
const OUT = path.join(ROOT, "data", "zips.json");

console.log(`Downloading ${SOURCE} ...`);
const res = await fetch(SOURCE);
if (!res.ok) {
  console.error(`Download failed: HTTP ${res.status}`);
  process.exit(1);
}
const zipPath = path.join(ROOT, "data", ".US.zip.tmp");
await Bun.write(zipPath, await res.arrayBuffer());

// GeoNames ships a plain zip archive; extract US.txt with the system unzip.
const proc = Bun.spawn(["unzip", "-p", zipPath, "US.txt"], { stdout: "pipe" });
const text = await new Response(proc.stdout).text();
if ((await proc.exited) !== 0) {
  console.error("unzip failed");
  process.exit(1);
}

// US.txt columns (tab-separated): country, postal code, place name, state,
// state code, county, county code, _, _, lat, lng, accuracy
const zips = {};
for (const line of text.split("\n")) {
  const cols = line.split("\t");
  if (cols.length < 11) continue;
  const [_, zip, , , , , , , , lat, lng] = cols;
  if (!/^[0-9]{5}$/.test(zip)) continue;
  zips[zip] = [Number(Number(lat).toFixed(4)), Number(Number(lng).toFixed(4))];
}

await Bun.write(OUT, JSON.stringify(zips));
await Bun.file(zipPath).delete();
console.log(`✓ Wrote ${Object.keys(zips).length} ZIP centroids to data/zips.json`);
