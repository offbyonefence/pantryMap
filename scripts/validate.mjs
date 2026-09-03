// Validates every food bank data file. Run: mise run lint:data
import { validateAll } from "./lib/validate-lib.mjs";

const { errors, fileCount } = await validateAll();
if (errors.length) {
  console.error(`✗ ${errors.length} problem(s) found in ${fileCount} data file(s):\n`);
  for (const e of errors) console.error(`  • ${e}`);
  console.error("\nSee data/schema/foodbank.schema.json and CONTRIBUTING.md for the expected format.");
  process.exit(1);
}
console.log(`✓ All ${fileCount} food bank data file(s) are valid.`);
