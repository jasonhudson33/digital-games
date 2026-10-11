/**
 * Renders a React component to static HTML inside a node test.
 *
 * The components are JSX and import CSS-free modules only, so esbuild bundles
 * one to a temp module (react and friends stay external, resolved from the
 * repo's node_modules) and react-dom/server renders it. No DOM, no browser.
 */
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { build } from "esbuild";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

/**
 * @param {string} file  repo-relative component module
 * @returns {Promise<Record<string, any>>} its exports
 */
export async function loadComponents(file) {
  const result = await build({
    entryPoints: [path.join(root, file)],
    bundle: true,
    write: false,
    format: "esm",
    platform: "node",
    jsx: "automatic",
    loader: { ".js": "jsx" },
    packages: "external",
  });
  const dir = await mkdtemp(path.join(root, "tests", ".render-"));
  try {
    const out = path.join(dir, "component.mjs");
    await writeFile(out, result.outputFiles[0].text);
    return await import(pathToFileURL(out).href);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

export function render(component, props = {}) {
  return renderToStaticMarkup(createElement(component, props));
}
