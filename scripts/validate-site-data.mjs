#!/usr/bin/env node
import fs from "node:fs";
import vm from "node:vm";

const root = new URL("../", import.meta.url);
const dataPath = new URL("data.js", root);
const indexPath = new URL("index.html", root);
const filesToScan = ["index.html", "data.js", "README.md", "app.js"];

const sandbox = { window: {} };
vm.runInNewContext(fs.readFileSync(dataPath, "utf8"), sandbox, { filename: "data.js" });

const data = sandbox.window.AMW_DATA;
if (!data || !Array.isArray(data.sources)) {
  throw new Error("window.AMW_DATA.sources was not found.");
}

const sourceIds = new Set();
const duplicateSourceIds = [];
for (const source of data.sources) {
  if (!source.id) throw new Error("Source without id found.");
  if (sourceIds.has(source.id)) duplicateSourceIds.push(source.id);
  sourceIds.add(source.id);
}
if (duplicateSourceIds.length > 0) {
  throw new Error(`Duplicate source ids: ${duplicateSourceIds.join(", ")}`);
}

const missing = [];
for (const section of ["briefItems", "promises", "funding", "reactions"]) {
  for (const [index, item] of (data[section] || []).entries()) {
    for (const id of item.sourceIds || []) {
      if (!sourceIds.has(id)) missing.push(`${section}[${index}] -> ${id}`);
    }
  }
}
for (const [briefIndex, brief] of (data.briefArchive || []).entries()) {
  for (const [itemIndex, item] of (brief.items || []).entries()) {
    for (const id of item.sourceIds || []) {
      if (!sourceIds.has(id)) missing.push(`briefArchive[${briefIndex}].items[${itemIndex}] -> ${id}`);
    }
  }
}
if (missing.length > 0) {
  throw new Error(`Missing source references:\n${missing.join("\n")}`);
}

const indexHtml = fs.readFileSync(indexPath, "utf8");
const sourceCountMatch = indexHtml.match(/<strong>(\d+) sources<\/strong>/);
if (!sourceCountMatch) {
  throw new Error("Could not find static evidence-base source count in index.html.");
}
const staticSourceCount = Number(sourceCountMatch[1]);
if (staticSourceCount !== data.sources.length) {
  throw new Error(`Static source count ${staticSourceCount} does not match data source count ${data.sources.length}.`);
}

const forbiddenPatterns = [
  /mailto:/i,
  /team@/i,
  /hurryautomusic\.com/i,
  /\b[a-f0-9]{64}\b/i
];
const forbiddenHits = [];
for (const file of filesToScan) {
  const text = fs.readFileSync(new URL(file, root), "utf8");
  for (const pattern of forbiddenPatterns) {
    if (pattern.test(text)) forbiddenHits.push(`${file}: ${pattern}`);
  }
}
if (forbiddenHits.length > 0) {
  throw new Error(`Forbidden tracked text found:\n${forbiddenHits.join("\n")}`);
}

console.log(`Site data validation passed: ${data.sources.length} sources, ${missing.length} missing source references.`);
