import assert from 'node:assert/strict';
import test from 'node:test';

import { chooseComputerDayTarget, chooseComputerNightTarget } from '../mafia-main/services/ComputerStrategy.ts';

const player = (id, overrides = {}) => ({
  id,
  name: id,
  cardCode: '',
  isAlive: true,
  voteCount: 0,
  ...overrides,
});

const state = (players) => ({
  roomCode: 'SMART', players, phase: 'NIGHT_DETECTIVE', round: 2, trialLimit: 2,
  killerTargetId: null, detectiveCheckId: null, angelSaveId: null, lastAngelSavedId: null,
  nightResults: [], phaseResult: null, nightActions: {}, nightSelectionHistory: {},
  nominations: {}, seconds: {}, dayVotes: {}, winner: null, lastUpdated: 1,
});

test('a computer detective checks someone new before repeating a target', () => {
  const game = state([player('detective', { isComputer: true }), player('old'), player('new')]);
  game.nightSelectionHistory = { DETECTIVE: { detective: 'old' } };
  const target = chooseComputerNightTarget(game, 'Jack', ['detective'], { detective: 'Jack' });
  assert.equal(target.id, 'new');
});

test('a computer killer does not nominate or vote for a known teammate', () => {
  const killer = player('killer', { isComputer: true });
  const teammate = player('teammate');
  const citizen = player('citizen');
  const game = state([killer, teammate, citizen]);
  const target = chooseComputerDayTarget(
    game,
    killer,
    [teammate, citizen],
    { killer: 'King', teammate: 'King', citizen: 'Citizen' },
    'vote',
  );
  assert.equal(target.id, 'citizen');
});
