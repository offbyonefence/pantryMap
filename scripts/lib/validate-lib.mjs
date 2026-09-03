// Minimal JSON Schema validator covering the subset used by foodbank.schema.json.
// Zero dependencies so contributors and CI never need `npm install`.
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const SCHEMA_PATH = path.join(ROOT, "data", "schema", "foodbank.schema.json");
const DATA_DIR = path.join(ROOT, "data", "foodbanks");

function typeOf(v) {
  if (v === null) return "null";
  if (Array.isArray(v)) return "array";
  return typeof v;
}

function checkNode(schema, value, where, errors) {
  const types = Array.isArray(schema.type) ? schema.type : schema.type ? [schema.type] : null;
  if (types && !types.includes(typeOf(value))) {
    errors.push(`${where}: expected ${types.join(" or ")}, got ${typeOf(value)}`);
    return;
  }
  if (schema.enum && !schema.enum.includes(value)) {
    errors.push(`${where}: "${value}" is not one of ${schema.enum.join(", ")}`);
  }
  if (typeOf(value) === "string") {
    if (schema.pattern && !new RegExp(schema.pattern).test(value)) {
      errors.push(`${where}: "${value}" does not match required format (${schema.pattern})`);
    }
    if (schema.minLength !== undefined && value.length < schema.minLength) {
      errors.push(`${where}: too short (min ${schema.minLength} characters)`);
    }
    if (schema.maxLength !== undefined && value.length > schema.maxLength) {
      errors.push(`${where}: too long (max ${schema.maxLength} characters)`);
    }
  }
  if (typeOf(value) === "number") {
    if (schema.minimum !== undefined && value < schema.minimum) {
      errors.push(`${where}: ${value} is below minimum ${schema.minimum}`);
    }
    if (schema.maximum !== undefined && value > schema.maximum) {
      errors.push(`${where}: ${value} is above maximum ${schema.maximum}`);
    }
  }
  if (typeOf(value) === "array") {
    if (schema.minItems !== undefined && value.length < schema.minItems) {
      errors.push(`${where}: needs at least ${schema.minItems} item(s)`);
    }
    if (schema.uniqueItems && new Set(value.map((v) => JSON.stringify(v))).size !== value.length) {
      errors.push(`${where}: contains duplicate entries`);
    }
    if (schema.items) {
      value.forEach((item, i) => checkNode(schema.items, item, `${where}[${i}]`, errors));
    }
  }
  if (typeOf(value) === "object") {
    for (const key of schema.required ?? []) {
      if (!(key in value)) errors.push(`${where}: missing required field "${key}"`);
    }
    for (const [key, v] of Object.entries(value)) {
      const propSchema = schema.properties?.[key];
      if (propSchema) {
        checkNode(propSchema, v, `${where}.${key}`, errors);
      } else if (schema.additionalProperties === false) {
        errors.push(`${where}: unknown field "${key}" (typo? see data/schema/foodbank.schema.json)`);
      }
    }
  }
}

export async function loadSchema() {
  return JSON.parse(await readFile(SCHEMA_PATH, "utf8"));
}

// Validates every file in data/foodbanks/. Returns { entries, errors }.
export async function validateAll() {
  const schema = await loadSchema();
  const files = (await readdir(DATA_DIR)).filter((f) => f.endsWith(".json")).sort();
  const entries = [];
  const errors = [];
  const seenIds = new Set();

  for (const file of files) {
    const where = `data/foodbanks/${file}`;
    let entry;
    try {
      entry = JSON.parse(await readFile(path.join(DATA_DIR, file), "utf8"));
    } catch (e) {
      errors.push(`${where}: not valid JSON — ${e.message}`);
      continue;
    }
    const fileErrors = [];
    checkNode(schema, entry, where, fileErrors);
    if (entry.id !== undefined) {
      if (entry.id !== path.basename(file, ".json")) {
        fileErrors.push(`${where}: id "${entry.id}" must match the filename "${path.basename(file, ".json")}"`);
      }
      if (seenIds.has(entry.id)) fileErrors.push(`${where}: duplicate id "${entry.id}"`);
      seenIds.add(entry.id);
    }
    for (const h of entry.hours ?? []) {
      if (h?.open && h?.close && h.open >= h.close) {
        fileErrors.push(`${where}: hours for ${h.day} — open time ${h.open} must be before close time ${h.close}`);
      }
    }
    errors.push(...fileErrors);
    if (fileErrors.length === 0) entries.push(entry);
  }
  return { entries, errors, fileCount: files.length };
}
