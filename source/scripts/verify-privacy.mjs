import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { dirname, extname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const sourceRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const repositoryRoot = resolve(sourceRoot, "..");
const textExtensions = new Set([
  ".cjs",
  ".css",
  ".html",
  ".js",
  ".json",
  ".md",
  ".mjs",
  ".webmanifest",
  ".yaml",
  ".yml",
]);
const forbidden = [
  ["qozm", "5"].join(""),
  ["git", "chatgpt-team", "site"].join("."),
  ["appg", "prj_"].join(""),
];

async function collect(directory, files = []) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if ([".git", "build", "node_modules"].includes(entry.name)) continue;
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) await collect(path, files);
    else if (textExtensions.has(extname(entry.name).toLowerCase())) files.push(path);
  }
  return files;
}

const files = await collect(repositoryRoot);
for (const path of files) {
  const text = (await readFile(path, "utf8")).toLowerCase();
  for (const value of forbidden) {
    assert.equal(text.includes(value), false, `private build metadata found in ${path}`);
  }
}

console.log(JSON.stringify({ passed: true, scannedTextFiles: files.length }, null, 2));
