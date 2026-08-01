import assert from 'node:assert/strict';
import test from 'node:test';

import { canParticipateInDay } from '../mafia-main/services/DayRules.ts';

const player = (overrides = {}) => ({
  id: 'player-1',
  name: 'Player One',
  cardCode: '2S',
  isAlive: true,
  voteCount: 0,
  ...overrides,
});

test('only active living players can participate in daytime actions', () => {
  assert.equal(canParticipateInDay([player()], 'player-1'), true);
  assert.equal(canParticipateInDay([player({ isAlive: false })], 'player-1'), false);
  assert.equal(canParticipateInDay([player({ hasLeft: true })], 'player-1'), false);
  assert.equal(canParticipateInDay([player()], 'missing-player'), false);
});
