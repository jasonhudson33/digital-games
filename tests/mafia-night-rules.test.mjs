import assert from 'node:assert/strict';
import test from 'node:test';

import { resolveNight } from '../mafia-main/services/NightRules.ts';

const players = [
  { id: 'king', name: 'King', cardCode: 'KS', isAlive: true, voteCount: 0 },
  { id: 'target', name: 'Target', cardCode: '2S', isAlive: true, voteCount: 0 },
];

test('an unprotected killer target is no longer alive', () => {
  const result = resolveNight(players, 'target', null);

  assert.equal(result.players.find((player) => player.id === 'target')?.isAlive, false);
  assert.deepEqual(result.results, ['Target was eliminated in the night.']);
});

test('the Ace prevents the selected player from being eliminated', () => {
  const result = resolveNight(players, 'target', 'target');

  assert.equal(result.players.find((player) => player.id === 'target')?.isAlive, true);
  assert.deepEqual(result.results, ['A life was spared in the night.']);
});
