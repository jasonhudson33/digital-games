import assert from 'node:assert/strict';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';

const root = fileURLToPath(new URL('..', import.meta.url));
const vite = await createServer({
  root,
  appType: 'custom',
  logLevel: 'silent',
  server: { middlewareMode: true }
});

const {
  acknowledgeCard,
  addLocalPlayer,
  computerPropertyValue,
  makeInitialState,
  rollDice,
  setHouseRules,
  startGame
} = await vite.ssrLoadModule('/src/game.ts');
const { migrateMonopolyRoomState } = await vite.ssrLoadModule('/src/stateMigrations.ts');

const makeGameAt = (position, ownedByOtherPlayer = []) => {
  const started = startGame(addLocalPlayer(makeInitialState('host', 'Host', 'TEST', 'car')), () => 0);
  return {
    ...started,
    players: started.players.map((player, index) => ({
      ...player,
      position: index === 0 ? position : player.position,
      properties: index === 1 ? ownedByOtherPlayer : player.properties
    }))
  };
};

const rollSevenAndDrawBackThree = (state) => {
  const originalRandom = Math.random;
  const originalNow = Date.now;
  const rolls = [0.34, 0.51];
  Math.random = () => rolls.shift() ?? 0;
  Date.now = () => 8;
  try {
    return rollDice(state);
  } finally {
    Math.random = originalRandom;
    Date.now = originalNow;
  }
};

test('going back three to Community Chest draws and queues its card without passing GO', () => {
  const result = rollSevenAndDrawBackThree(makeGameAt(29));

  assert.equal(result.players[0].position, 33);
  assert.equal(result.players[0].money, 1520);
  assert.match(result.pendingCard?.id ?? '', /^chance-back-three-/);
  assert.equal(result.pendingCardQueue?.[0]?.deck, 'community');

  const acknowledgedChance = acknowledgeCard(result);
  assert.equal(acknowledgedChance.pendingCard?.deck, 'community');
});

test('going back three to an unowned property offers it for purchase without passing GO', () => {
  const result = rollSevenAndDrawBackThree(makeGameAt(15));

  assert.equal(result.players[0].position, 19);
  assert.equal(result.players[0].money, 1500);
  assert.equal(result.pendingPurchase?.spaceId, 19);
  assert.equal(acknowledgeCard(result).pendingPurchase?.spaceId, 19);
});

test('going back three to an owned property charges rent without passing GO', () => {
  const result = rollSevenAndDrawBackThree(makeGameAt(15, [19]));

  assert.equal(result.players[0].position, 19);
  assert.equal(result.players[0].money, 1484);
  assert.equal(result.players[1].money, 1516);
  assert.equal(result.pendingRent?.spaceId, 19);
  assert.equal(acknowledgeCard(result).pendingRent?.spaceId, 19);
});

test('older Monopoly rooms migrate to the current turn stage without losing players', () => {
  const oldRoom = makeInitialState('host', 'Host', 'OLD01', 'car');
  oldRoom.turnStage = 'manage';
  oldRoom.turnStageVersion = 1;
  const migrated = migrateMonopolyRoomState(oldRoom);
  assert.equal(migrated.roomStateVersion, 2);
  assert.equal(migrated.turnStageVersion, 2);
  assert.equal(migrated.turnStage, 'roll');
  assert.equal(migrated.houseRules, false);
  assert.equal(migrated.freeParkingPot, 0);
  assert.deepEqual(migrated.players.map((player) => player.id), ['host']);
});

test('Monopoly randomly selects the opening player', () => {
  const game = startGame(addLocalPlayer(makeInitialState('host', 'Host', 'FIRST', 'car')), () => 0.99);
  assert.equal(game.currentPlayerIndex, 1);
  assert.match(game.log[0].text, /Player 2 starts/);
});

test('a Monopoly computer values a property that completes its color group', () => {
  const game = makeGameAt(0);
  const player = { ...game.players[0], properties: [1] };
  assert.ok(computerPropertyValue(game, player, 3) > computerPropertyValue(game, player, 6));
});

test('house rules send bank card payments to Free Parking', () => {
  const game = startGame(addLocalPlayer(setHouseRules(makeInitialState('host', 'Host', 'HOUSE', 'car'), true)), () => 0);
  const originalRandom = Math.random;
  const originalNow = Date.now;
  const rolls = [0.34, 0.51];
  Math.random = () => rolls.shift() ?? 0;
  Date.now = () => 2;
  try {
    const result = rollDice(game);
    assert.equal(result.players[0].position, 7);
    assert.equal(result.players[0].money, 1485);
    assert.equal(result.freeParkingPot, 15);
  } finally {
    Math.random = originalRandom;
    Date.now = originalNow;
  }
});

test('house rules send property repair card payments to Free Parking', () => {
  const game = startGame(addLocalPlayer(setHouseRules(makeInitialState('host', 'Host', 'REPAIR', 'car'), true)), () => 0);
  const prepared = {
    ...game,
    improvements: { 1: 1 },
    players: game.players.map((player, index) => ({
      ...player,
      properties: index === 0 ? [1] : player.properties
    }))
  };
  const originalRandom = Math.random;
  const originalNow = Date.now;
  const rolls = [0.34, 0.51];
  Math.random = () => rolls.shift() ?? 0;
  Date.now = () => 7;
  try {
    const result = rollDice(prepared);
    assert.equal(result.players[0].money, 1475);
    assert.equal(result.freeParkingPot, 25);
  } finally {
    Math.random = originalRandom;
    Date.now = originalNow;
  }
});

test('landing on Free Parking collects and clears the house-rules jackpot', () => {
  const game = startGame(addLocalPlayer(setHouseRules(makeInitialState('host', 'Host', 'PARK', 'car'), true)), () => 0);
  const prepared = {
    ...game,
    freeParkingPot: 165,
    players: game.players.map((player, index) => ({ ...player, position: index === 0 ? 13 : player.position }))
  };
  const originalRandom = Math.random;
  const rolls = [0.34, 0.51];
  Math.random = () => rolls.shift() ?? 0;
  try {
    const result = rollDice(prepared);
    assert.equal(result.players[0].position, 20);
    assert.equal(result.players[0].money, 1665);
    assert.equal(result.freeParkingPot, 0);
  } finally {
    Math.random = originalRandom;
  }
});

await vite.close();
