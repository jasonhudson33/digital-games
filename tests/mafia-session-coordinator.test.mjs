import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createInitialGameState,
  playersFromJoinRequests,
  selectActingHostId,
  shouldApplyRemoteState,
} from '../mafia-main/services/SessionCoordinator.ts';

const player = (id, overrides = {}) => ({
  id,
  name: id,
  cardCode: '',
  isAlive: true,
  voteCount: 0,
  ...overrides,
});

test('the session coordinator creates a complete landing state', () => {
  const state = createInitialGameState();
  assert.equal(state.phase, 'LANDING');
  assert.deepEqual(state.nominations, {});
  assert.deepEqual(state.nightSelectionHistory, {});
});

test('remote state ordering accepts newer updates and equal-time phase transitions', () => {
  const local = { ...createInitialGameState(), phase: 'LOBBY', lastUpdated: 10 };
  assert.equal(shouldApplyRemoteState({ ...local, lastUpdated: 11 }, local), true);
  assert.equal(shouldApplyRemoteState({ ...local, phase: 'SETUP' }, local), true);
  assert.equal(shouldApplyRemoteState({ ...local, lastUpdated: 9 }, local), false);
});

test('host selection fails over only to a recently present living player', () => {
  const now = 1_000_000;
  const players = [player('host', { isHost: true }), player('backup'), player('dead', { isAlive: false })];
  assert.equal(selectActingHostId(players, { host: 1, backup: now }, true, now), 'backup');
  assert.equal(selectActingHostId(players, {}, false, now), 'host');
});

test('join reconciliation adds only players not already seated', () => {
  const additions = playersFromJoinRequests(
    [player('existing')],
    { existing: { name: 'Changed', ts: 1 }, newPlayer: { name: 'New player', ts: 2 } },
  );
  assert.deepEqual(additions.map(({ id, name }) => ({ id, name })), [
    { id: 'newPlayer', name: 'New player' },
  ]);
});
