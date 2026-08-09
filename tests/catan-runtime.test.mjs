import assert from 'node:assert/strict';
import test from 'node:test';

import { createCatanRuntime } from '../components/catan-runtime.js';
import { migrateCatanRoomState } from '../components/catan-state-migrations.js';

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

test('Catan migration versions and fills an older active room without changing its identity', () => {
  const migrated = migrateCatanRoomState({
    roomCode: 'OLD01',
    players: [{ id: 'p1', resources: {}, developmentCards: [] }],
    phase: 'playing',
    ruleset: 'original',
    updatedAt: 42,
  });
  assert.equal(migrated.roomCode, 'OLD01');
  assert.equal(migrated.phase, 'playing');
  assert.equal(migrated.updatedAt, 42);
  assert.equal(migrated.roomStateVersion, 1);
  assert.deepEqual(migrated.players[0].progressCards, []);
});
