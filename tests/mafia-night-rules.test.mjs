import assert from 'node:assert/strict';
import test from 'node:test';

import {
  canSelectNightTarget,
  detectiveAckRound,
  nightActorsForRole,
  pendingDetectiveAcks,
  nightSelectionsByTarget,
  resolveNight,
} from '../mafia-main/services/NightRules.ts';

const players = [
  { id: 'king', name: 'King', cardCode: 'KS', isAlive: true, voteCount: 0 },
  { id: 'target', name: 'Target', cardCode: '2S', isAlive: true, voteCount: 0 },
];

test('an unprotected killer target is no longer alive', () => {
  const result = resolveNight(players, 'target', null);

  assert.equal(result.players.find((player) => player.id === 'target')?.isAlive, false);
  assert.equal(result.eliminatedPlayerId, 'target');
  assert.deepEqual(result.results, ['Target was eliminated in the night.']);
});

test('the Ace prevents the selected player from being eliminated', () => {
  const result = resolveNight(players, 'target', 'target');

  assert.equal(result.players.find((player) => player.id === 'target')?.isAlive, true);
  assert.equal(result.eliminatedPlayerId, null);
  assert.deepEqual(result.results, ['Target was attacked in the night but was spared.']);
});

test('a spared attack with an unknown target id falls back to the generic message', () => {
  const result = resolveNight(players, 'ghost', 'ghost');

  assert.equal(result.eliminatedPlayerId, null);
  assert.deepEqual(result.results, ['A life was spared in the night.']);
  assert.ok(result.players.every((player) => player.isAlive));
});

test('an Ace can save themselves but cannot repeat the previous save', () => {
  assert.equal(canSelectNightTarget(players, 'Ace', 'target', 'target', null), true);
  assert.equal(canSelectNightTarget(players, 'Ace', 'target', 'target', 'target'), false);
  assert.equal(canSelectNightTarget(players, 'Ace', 'target', 'king', 'target'), true);
});

test('Kings and Jacks can identify every teammate acting in their phase', () => {
  const teamPlayers = [
    ...players,
    { id: 'king-2', name: 'Other King', cardCode: 'KH', isAlive: true, voteCount: 0 },
    { id: 'jack', name: 'Jack', cardCode: 'JS', isAlive: true, voteCount: 0 },
  ];
  const roles = { king: 'King', 'king-2': 'King', target: 'Citizen', jack: 'Jack' };

  assert.deepEqual(nightActorsForRole(teamPlayers, 'King', roles).map((player) => player.id), ['king', 'king-2']);
  assert.deepEqual(nightActorsForRole(teamPlayers, 'Jack', roles).map((player) => player.id), ['jack']);
  assert.equal(canSelectNightTarget(teamPlayers, 'King', 'king', 'king-2', null, ['king', 'king-2']), false);
});

test('night selections are grouped by target with the selecting teammates attached', () => {
  assert.deepEqual(
    nightSelectionsByTarget({ king: 'target', 'king-2': 'king' }, ['king', 'king-2']),
    { target: ['king'], king: ['king-2'] },
  );
});

const seat = (id, overrides = {}) => ({ id, name: id, cardCode: '', isAlive: true, voteCount: 0, ...overrides });

test('detective acknowledgements wait only on living human detectives', () => {
  const table = [seat('a'), seat('b'), seat('bot', { isComputer: true }), seat('gone', { isAlive: false })];
  const detectives = ['a', 'b', 'bot', 'gone'];

  assert.deepEqual(pendingDetectiveAcks(table, detectives, []), ['a', 'b']);
  assert.deepEqual(pendingDetectiveAcks(table, detectives, ['a']), ['b']);
  assert.deepEqual(pendingDetectiveAcks(table, detectives, ['a', 'b']), []);
  assert.deepEqual(pendingDetectiveAcks(table, ['bot'], []), []);
  assert.deepEqual(pendingDetectiveAcks(table, ['missing'], []), []);
});

test('detective acknowledgements use a round key apart from role-reveal readiness', () => {
  assert.notEqual(detectiveAckRound(1), 1);
  assert.notEqual(detectiveAckRound(1), detectiveAckRound(2));
});
