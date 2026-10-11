import assert from 'node:assert/strict';
import test from 'node:test';

import { createCatanRuntime } from '../components/catan-runtime.js';

test('Catan dice use an injected random source', () => {
  const values = [0, 0.999];
  const runtime = createCatanRuntime(() => values.shift());
  const roll = runtime.rollDice({
    ruleset: 'original',
    currentPlayerIndex: 0,
    players: [{ id: 'p1' }],
  });
  assert.deepEqual(roll, { dieOne: 1, dieTwo: 6, eventDie: null });
});
