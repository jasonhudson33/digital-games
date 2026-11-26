import assert from 'node:assert/strict';
import test from 'node:test';

import { canParticipateInDay, createVoteReveal, dayBallotRound, groupBallotsByCandidate, mergeDayActions, resolveDayVote } from '../mafia-main/services/DayRules.ts';

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

test('a tied vote returns only the runoff candidates', () => {
  const result = resolveDayVote(['a', 'b', 'c'], { one: 'a', two: 'b', three: 'c', four: 'a', five: 'b' });
  assert.deepEqual(result.top, ['a', 'b']);
});

test('a decisive runoff returns one player', () => {
  const result = resolveDayVote(['a', 'b'], { one: 'a', two: 'a', three: 'b' });
  assert.deepEqual(result.top, ['a']);
});

test('a runoff uses a separate intent round from the first ballot', () => {
  assert.notEqual(dayBallotRound(3, false), dayBallotRound(3, true));
});

test('later seconds do not erase earlier nominations', () => {
  const nominated = mergeDayActions({}, {}, [
    ['one', { kind: 'NOMINATE', targetId: 'a', ts: 1 }],
    ['two', { kind: 'NOMINATE', targetId: 'b', ts: 2 }],
    ['three', { kind: 'NOMINATE', targetId: 'c', ts: 3 }],
  ]);
  const seconded = mergeDayActions(nominated.nominations, nominated.seconds, [
    ['one', { kind: 'SECOND', targetId: 'b', ts: 4 }],
    ['two', { kind: 'SECOND', targetId: 'c', ts: 5 }],
    ['three', { kind: 'SECOND', targetId: 'a', ts: 6 }],
  ]);
  const candidates = Object.values(seconded.nominations).filter(
    (targetId) => seconded.seconds[targetId]?.length
  );

  assert.deepEqual(candidates.sort(), ['a', 'b', 'c']);
});

test('ballots are grouped by candidate, including candidates with no votes', () => {
  const grouped = groupBallotsByCandidate(['a', 'b', 'c'], { one: 'a', two: 'a', three: 'b', four: 'ghost' });
  assert.deepEqual(grouped, { a: ['one', 'two'], b: ['three'], c: [] });
});

test('a vote reveal copies the ballots', () => {
  const ballots = { one: 'a' };
  const reveal = createVoteReveal(ballots, true);
  ballots.two = 'b';
  assert.deepEqual(reveal, { ballots: { one: 'a' }, isRunoff: true });
});
