/**
 * Compare two sets of track stacks (`{ [space]: bottomToTop camel ids }`).
 *
 * Used only for presentation: marking the camel unit that moved last and deciding
 * which camels to animate. The server stays the authority on where camels are.
 *
 * @param {Record<string, string[]> | null | undefined} prevStacks
 * @param {Record<string, string[]> | null | undefined} nextStacks
 * @returns {{
 *   changes: Record<string, { from: number, to: number }>,
 *   moved: string[],
 *   units: { from: number, to: number, camels: string[] }[],
 * }} `moved` lists camels that changed space; `units` groups them by journey,
 *   each unit ordered bottom to top as it now sits.
 */
export function diffCamelPositions(prevStacks, nextStacks) {
  const empty = { changes: {}, moved: [], units: [] };
  if (!prevStacks || !nextStacks) return empty;
  const before = positions(prevStacks);
  const changes = {};
  const units = new Map();
  for (const [space, stack] of Object.entries(nextStacks)) {
    for (const camelId of stack) {
      const from = before[camelId];
      const to = Number(space);
      if (from === undefined || from === to) continue;
      changes[camelId] = { from, to };
      const key = `${from}>${to}`;
      if (!units.has(key)) units.set(key, { from, to, camels: [] });
      units.get(key).camels.push(camelId);
    }
  }
  return { changes, moved: Object.keys(changes), units: [...units.values()] };
}

function positions(stacks) {
  const found = {};
  for (const [space, stack] of Object.entries(stacks)) for (const camelId of stack) found[camelId] = Number(space);
  return found;
}
