/**
 * One Fisher-Yates, for every deck in the building.
 *
 * There were twenty-five copies of this loop across lib/ and components/, under
 * a dozen names — `shuffled`, `shuffle`, `shuffleScumDeck`, `shufflePinochleDeck`,
 * `shuffleHeartDeck`, `shuffleSkullKingDeck`, `shuffleSecretHitler`,
 * `shuffleHandFootDeck`. Every one of them was correct, which is the point: the
 * cost was never a bug, it was that changing how a deck gets shuffled — seeding
 * it for replay, swapping the generator — meant twenty-five identical edits, and
 * that two of the copies had quietly drifted into shuffling *in place* while the
 * other twenty-three returned a copy.
 *
 * `rng` stays injectable because that is how the rules tests deal a known hand.
 *
 * @template T
 * @param {readonly T[]} items
 * @param {() => number} [rng]
 * @returns {T[]}
 */
export function shuffled(items, rng = Math.random) {
  const next = [...items];
  for (let index = next.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(rng() * (index + 1));
    [next[index], next[swap]] = [next[swap], next[index]];
  }
  return next;
}

/**
 * In-place variant, for the two callers that relied on mutating the array they
 * were handed. Prefer `shuffled`.
 *
 * @template T
 * @param {T[]} items
 * @param {() => number} [rng]
 * @returns {T[]}
 */
export function shuffleInPlace(items, rng = Math.random) {
  for (let index = items.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(rng() * (index + 1));
    [items[index], items[swap]] = [items[swap], items[index]];
  }
  return items;
}
