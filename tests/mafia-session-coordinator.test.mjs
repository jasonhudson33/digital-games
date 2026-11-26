import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createInitialGameState,
  migrateGameState,
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
  assert.equal(state.voteReveal, null);
});

test('migrating an older room state defaults the vote reveal to none', () => {
  const { voteReveal, ...older } = createInitialGameState();
  assert.equal(migrateGameState(older).voteReveal, null);
});

test('remote state ordering accepts newer updates and equal-time phase transitions', () => {
  const local = { ...createInitialGameState(), phase: 'LOBBY', lastUpdated: 10 };
  assert.equal(shouldApplyRemoteState({ ...local, lastUpdated: 11 }, local), true);
  assert.equal(shouldApplyRemoteState({ ...local, phase: 'SETUP' }, local), true);
  assert.equal(shouldApplyRemoteState({ ...local, lastUpdated: 9 }, local), false);
});

test('the first player stays acting host even when eliminated', () => {
  const now = 1_000_000;
  const players = [player('host', { isHost: true, isAlive: false }), player('two'), player('three')];
  assert.equal(selectActingHostId(players, { host: now, two: now, three: now }, true, now), 'host');
});

test('host duty falls back to the next present player in seat order', () => {
  const now = 1_000_000;
  const players = [player('host', { isHost: true }), player('two'), player('three')];
  assert.equal(selectActingHostId(players, { host: 1, two: now, three: now }, true, now), 'two');
  assert.equal(selectActingHostId(players, { host: 1, two: 1, three: now }, true, now), 'three');
  assert.equal(selectActingHostId(players, { host: now, two: now, three: now }, true, now), 'host');
});

test('a dead player two can take over from an absent host', () => {
  const now = 1_000_000;
  const players = [player('host', { isHost: true }), player('two', { isAlive: false }), player('three')];
  assert.equal(selectActingHostId(players, { host: 1, two: now, three: now }, true, now), 'two');
});

test('players who left never host, and an empty room has no host', () => {
  const now = 1_000_000;
  const players = [player('host', { isHost: true, hasLeft: true }), player('two')];
  assert.equal(selectActingHostId(players, { two: now }, true, now), 'two');
  assert.equal(selectActingHostId([], {}, true, now), null);
});

test('with nobody present, or presence not ready, the first candidate hosts', () => {
  const players = [player('host', { isHost: true }), player('two')];
  assert.equal(selectActingHostId(players, {}, true, 1_000_000), 'host');
  assert.equal(selectActingHostId(players, {}, false, 1_000_000), 'host');
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
