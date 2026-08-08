import assert from 'node:assert/strict';
import test from 'node:test';

import {
  acknowledgePhaseResult,
  createNightPhaseResult,
  createVotePhaseResult,
} from '../mafia-main/services/ResultRules.ts';

test('night deaths wait for acknowledgment before daytime deliberation', () => {
  const result = createNightPhaseResult('victim', 'Citizen', 3, null);

  assert.deepEqual(result, {
    eliminatedPlayerId: 'victim',
    eliminatedRole: 'Citizen',
    source: 'NIGHT',
    nextPhase: 'DAY_DELIBERATION',
    nextRound: 3,
  });
  assert.deepEqual(acknowledgePhaseResult(result), {
    phase: 'DAY_DELIBERATION',
    round: 3,
    phaseResult: null,
  });
});

test('vote deaths wait for acknowledgment before the next night', () => {
  const result = createVotePhaseResult('victim', 'King', 3, null);

  assert.equal(result.nextPhase, 'NIGHT_TRANSITION');
  assert.equal(result.nextRound, 4);
});

test('a game-ending death waits for acknowledgment before game over', () => {
  const result = createVotePhaseResult('victim', 'King', 3, 'CITIZENS');

  assert.equal(result.nextPhase, 'GAME_OVER');
  assert.equal(result.nextRound, 3);
});
