import assert from 'node:assert/strict';
import test from 'node:test';

import { prepareReplayPlayers } from '../mafia-main/services/ReplayRules.ts';

test('replay keeps seats while resetting game-specific player state', () => {
  const players = prepareReplayPlayers([
    { id: 'one', name: 'One', cardCode: 'KH', isAlive: false, isReady: true, voteCount: 3, isHost: true },
    { id: 'two', name: 'Two', cardCode: 'AS', isAlive: true, voteCount: 1, isComputer: true },
  ]);

  assert.deepEqual(players.map((player) => player.id), ['one', 'two']);
  assert.ok(players.every((player) => player.isAlive && !player.isReady && player.cardCode === '' && player.voteCount === 0));
  assert.equal(players[0].isHost, true);
  assert.equal(players[1].isComputer, true);
});
