import assert from 'node:assert/strict';
import test from 'node:test';

import {
  MAX_MAFIA_PLAYERS,
  addComputerPlayer,
  removeComputerPlayer,
} from '../mafia-main/services/LobbyRules.ts';

const human = {
  id: 'human',
  name: 'Human',
  cardCode: '',
  isAlive: true,
  voteCount: 0,
  isHost: true,
};

test('the host can add persistent computer seats with unique names', () => {
  const withFirst = addComputerPlayer([human], 'bot-1');
  const withSecond = addComputerPlayer(withFirst, 'bot-2');

  assert.deepEqual(withSecond.slice(1).map(({ id, name, isComputer, isBot }) => ({ id, name, isComputer, isBot })), [
    { id: 'bot-1', name: 'Computer 1', isComputer: true, isBot: true },
    { id: 'bot-2', name: 'Computer 2', isComputer: true, isBot: true },
  ]);
});

test('only host-added computer seats can be removed with the lobby control', () => {
  const players = addComputerPlayer([human], 'bot-1');

  assert.equal(removeComputerPlayer(players, 'human'), players);
  assert.deepEqual(removeComputerPlayer(players, 'bot-1'), [human]);
});

test('the lobby enforces its maximum player count', () => {
  const players = Array.from({ length: MAX_MAFIA_PLAYERS }, (_, index) => ({
    ...human,
    id: `player-${index}`,
    name: `Player ${index}`,
  }));

  assert.equal(addComputerPlayer(players, 'extra'), players);
});
