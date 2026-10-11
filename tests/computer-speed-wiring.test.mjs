import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import test from "node:test";

// Wiring checks for the room computer speed (platform/computer-pacing). They exist because the
// failure they guard against compiles, typechecks and passes the file-wide "orphaned identifier"
// check, then throws when the game renders: a client passes `computerSpeed` to the shared game
// bar from a sub-component that never received it.

const clients = (await readdir(new URL("../components/", import.meta.url)))
  .filter((file) => file.endsWith("-client.js"))
  .map((file) => `components/${file}`)
  .concat(["monopoly/src/main.tsx"]);
const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

/** Top-level function starts (column 0), in order. */
function functionStarts(lines) {
  return lines.flatMap((line, index) => (/^(export default )?(async )?function [A-Za-z_]\w*\s*\(/.test(line) ? [index] : []));
}

/** The header of the function that starts at `start`: everything up to the opening brace of its body. */
function headerOf(lines, start) {
  const head = [];
  for (let i = start; i < lines.length; i += 1) {
    head.push(lines[i]);
    if (/\)\s*\{\s*$/.test(lines[i]) || lines[i].trimEnd().endsWith("{")) break;
  }
  return head.join("\n");
}

for (const path of clients) {
  test(`${path}: every use of computerSpeed is in a function that has it`, async () => {
    const lines = (await read(path)).split("\n");
    const starts = functionStarts(lines);
    const problems = [];
    lines.forEach((line, index) => {
      if (!line.includes("computerSpeed={computerSpeed}")) return;
      const owner = [...starts].reverse().find((start) => start <= index);
      if (owner === undefined) { problems.push(`line ${index + 1} is outside any component`); return; }
      const body = lines.slice(owner, index).join("\n");
      const defined = headerOf(lines, owner).includes("computerSpeed")
        || /const\s+computerSpeed\s*=/.test(body)
        || /const\s*\{[^}]*\bcomputerSpeed\b[^}]*\}\s*=/.test(body);
      if (!defined) problems.push(`line ${index + 1} uses computerSpeed inside "${lines[owner].slice(0, 60)}" where it is not defined`);
    });
    assert.deepEqual(problems, []);
  });
}

test("no client keeps its own computer delay or a private timer that steps computers", async () => {
  const offenders = [];
  for (const path of clients) {
    const source = await read(path);
    if (/\bcomputerDelay\s*:/.test(source)) offenders.push(`${path}: passes computerDelay`);
    if (/setTimeout\([^)]*(stepComputer|computerStep)/.test(source)) offenders.push(`${path}: a timer calls the computer step`);
  }
  assert.deepEqual(offenders, []);
});

test("every game that can seat computers paces them through the shared hook", async () => {
  const missing = [];
  for (const path of clients) {
    const source = await read(path);
    if (!/computerSpeed=\{computerSpeed\}/.test(source)) continue; // a game with no computers (Mafia)
    if (!/computerDue:|useComputerPacer\(/.test(source)) missing.push(path);
  }
  assert.deepEqual(missing, []);
});
