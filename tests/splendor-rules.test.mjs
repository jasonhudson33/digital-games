import test from "node:test";
import assert from "node:assert/strict";
import {
  GEM_COLORS,
  NOBLES,
  addComputerPlayer,
  addPlayer,
  canPurchase,
  chooseNoble,
  createDevelopmentDecks,
  createLobby,
  currentPlayer,
  paymentForCard,
  purchaseCard,
  reserveCard,
  returnTokens,
  runComputerTurn,
  startGame,
  takeDifferentTokens,
  takePairTokens,
  tokenCount,
} from "../lib/splendor.js";

const person = (id, name) => ({ id, name });

function lobbyWith(count = 2) {
  let room = createLobby(person("p1", "Avery"), "GEMS", 1);
  for (let index = 2; index <= count; index += 1) room = addPlayer(room, person(`p${index}`, `Player ${index}`));
  return room;
}

function gameWith(count = 2) {
  return startGame(lobbyWith(count), () => 0.42);
}

test("the development decks contain 40, 30, and 20 cards", () => {
  const decks = createDevelopmentDecks(() => 0.3);
  assert.equal(decks[1].length, 40);
  assert.equal(decks[2].length, 30);
  assert.equal(decks[3].length, 20);
  for (const color of GEM_COLORS) {
    assert.equal(decks[1].filter((card) => card.bonus === color).length, 8);
    assert.equal(decks[2].filter((card) => card.bonus === color).length, 6);
    assert.equal(decks[3].filter((card) => card.bonus === color).length, 4);
  }
});

test("rooms seat two to four players and support computer merchants", () => {
  let lobby = lobbyWith(4);
  assert.equal(lobby.players.length, 4);
  assert.equal(addPlayer(lobby, person("p5", "Five")), lobby);
  const solo = createLobby(person("p1", "Solo"), "SOLO", 1);
  assert.equal(startGame(solo), solo);

  const withBot = addComputerPlayer(createLobby(person("p1", "Host"), "BOTS", 1), { id: "bot-1", name: "Ada" });
  assert.equal(withBot.players[1].isComputer, true);
  assert.equal(startGame(withBot, () => 0.2).phase, "playing");
});

test("setup scales gems and nobles with player count", () => {
  const two = gameWith(2);
  const three = gameWith(3);
  const four = gameWith(4);
  assert.ok(GEM_COLORS.every((color) => two.bank[color] === 4));
  assert.ok(GEM_COLORS.every((color) => three.bank[color] === 5));
  assert.ok(GEM_COLORS.every((color) => four.bank[color] === 7));
  assert.equal(two.bank.gold, 5);
  assert.equal(two.nobles.length, 3);
  assert.equal(three.nobles.length, 4);
  assert.equal(four.nobles.length, 5);
  assert.deepEqual([two.market[1].length, two.market[2].length, two.market[3].length], [4, 4, 4]);
});

test("the opening merchant is selected randomly", () => {
  const game = startGame(lobbyWith(4), () => 0.74);
  assert.equal(game.startingPlayerIndex, 2);
  assert.equal(currentPlayer(game).id, "p3");
});

test("taking three different gems advances the turn", () => {
  const game = gameWith(2);
  const next = takeDifferentTokens(game, "p1", ["white", "blue", "green"]);
  assert.equal(next.players[0].tokens.white, 1);
  assert.equal(next.players[0].tokens.blue, 1);
  assert.equal(next.players[0].tokens.green, 1);
  assert.equal(next.bank.white, 3);
  assert.equal(currentPlayer(next).id, "p2");
  assert.equal(takeDifferentTokens(game, "p1", ["white", "blue"]), game);
});

test("taking a pair requires four tokens in the bank before the action", () => {
  const game = gameWith(2);
  const next = takePairTokens(game, "p1", "red");
  assert.equal(next.players[0].tokens.red, 2);
  assert.equal(next.bank.red, 2);
  const blocked = { ...game, bank: { ...game.bank, red: 3 } };
  assert.equal(takePairTokens(blocked, "p1", "red"), blocked);
});

test("when fewer than three gem colors remain, a player takes all available colors", () => {
  const game = gameWith(2);
  const scarce = { ...game, bank: { ...game.bank, white: 1, blue: 0, green: 0, red: 1, black: 0 } };
  const next = takeDifferentTokens(scarce, "p1", ["white", "red"]);
  assert.equal(tokenCount(next.players[0]), 2);
  assert.equal(currentPlayer(next).id, "p2");
});

test("players above ten tokens must return the exact excess before play advances", () => {
  const base = gameWith(2);
  const loaded = {
    ...base,
    players: base.players.map((player) => player.id === "p1" ? { ...player, tokens: { white: 2, blue: 2, green: 2, red: 1, black: 1, gold: 0 } } : player),
  };
  const taken = takeDifferentTokens(loaded, "p1", ["white", "blue", "green"]);
  assert.equal(tokenCount(taken.players[0]), 11);
  assert.deepEqual(taken.pendingReturn, { playerId: "p1", count: 1 });
  assert.equal(currentPlayer(taken).id, "p1");
  const invalid = returnTokens(taken, "p1", { white: 2 });
  assert.equal(invalid, taken);
  const returned = returnTokens(taken, "p1", { white: 1 });
  assert.equal(tokenCount(returned.players[0]), 10);
  assert.equal(currentPlayer(returned).id, "p2");
});

test("reserving takes gold, caps the hand at three, and refills the market", () => {
  const game = gameWith(2);
  const card = game.market[3][0];
  const next = reserveCard(game, "p1", { kind: "market", level: 3, index: 0 });
  assert.equal(next.players[0].reserved[0].id, card.id);
  assert.equal(next.players[0].tokens.gold, 1);
  assert.equal(next.bank.gold, 4);
  assert.equal(next.market[3].length, 4);
  assert.equal(next.decks[3].length, game.decks[3].length - 1);

  const fullHand = { ...game, players: game.players.map((player) => player.id === "p1" ? { ...player, reserved: [card, card, card] } : player) };
  assert.equal(reserveCard(fullHand, "p1", { kind: "deck", level: 1 }), fullHand);
});

test("bonuses reduce costs and gold covers the remaining colors", () => {
  const card = { id: "test", level: 2, bonus: "red", points: 2, cost: { white: 3, blue: 2, green: 1 } };
  const player = {
    tokens: { white: 1, blue: 0, green: 0, red: 0, black: 0, gold: 2 },
    bonuses: { white: 2, blue: 1, green: 1, red: 0, black: 0 },
  };
  const payment = paymentForCard(player, card);
  assert.deepEqual(payment.colored, { white: 1, blue: 0, green: 0, red: 0, black: 0 });
  assert.equal(payment.gold, 1);
  assert.equal(canPurchase(player, card), true);
});

test("purchasing spends tokens, keeps bonuses, scores, and refills the row", () => {
  const base = gameWith(2);
  const card = base.market[1][0];
  const stocked = {
    ...base,
    players: base.players.map((player) => player.id === "p1" ? { ...player, tokens: { white: 7, blue: 7, green: 7, red: 7, black: 7, gold: 5 } } : player),
  };
  const next = purchaseCard(stocked, "p1", { kind: "market", level: 1, index: 0 });
  assert.equal(next.players[0].developments[0].id, card.id);
  assert.equal(next.players[0].bonuses[card.bonus], 1);
  assert.equal(next.players[0].score, card.points);
  assert.equal(next.market[1].length, 4);
  assert.equal(currentPlayer(next).id, "p2");
});

test("a qualifying player chooses one noble when several are available", () => {
  const base = gameWith(2);
  const selected = NOBLES.slice(0, 2);
  const bonuses = { white: 5, blue: 5, green: 5, red: 5, black: 5 };
  const freeCard = { id: "free", level: 1, bonus: "white", points: 0, cost: {} };
  const game = {
    ...base,
    nobles: selected,
    market: { ...base.market, 1: [freeCard, ...base.market[1].slice(1)] },
    players: base.players.map((player) => player.id === "p1" ? { ...player, bonuses } : player),
  };
  const bought = purchaseCard(game, "p1", { kind: "market", level: 1, index: 0 });
  assert.equal(bought.pendingNoble.playerId, "p1");
  assert.equal(currentPlayer(bought).id, "p1");
  const chosen = chooseNoble(bought, "p1", selected[1].id);
  assert.equal(chosen.players[0].nobles.length, 1);
  assert.equal(chosen.players[0].score, 3);
  assert.equal(currentPlayer(chosen).id, "p2");
});

test("reaching fifteen completes the round and ties favor fewer developments", () => {
  const base = gameWith(3);
  const pointCard = { id: "point", level: 1, bonus: "white", points: 1, cost: {} };
  const game = {
    ...base,
    startingPlayerIndex: 0,
    currentPlayerIndex: 0,
    market: { ...base.market, 1: [pointCard, ...base.market[1].slice(1)] },
    players: base.players.map((player, index) => ({ ...player, score: index === 0 ? 14 : index === 2 ? 15 : 10, developments: index === 2 ? [{ id: "a" }] : [] })),
  };
  const triggered = purchaseCard(game, "p1", { kind: "market", level: 1, index: 0 });
  assert.equal(triggered.phase, "playing");
  assert.equal(triggered.finalRoundTriggeredBy, "p1");
  const secondCard = { id: "free-two", level: 1, bonus: "blue", points: 0, cost: {} };
  const afterSecond = purchaseCard({ ...triggered, market: { ...triggered.market, 1: [secondCard, ...triggered.market[1].slice(1)] } }, "p2", { kind: "market", level: 1, index: 0 });
  const afterThird = purchaseCard({ ...afterSecond, market: { ...afterSecond.market, 1: [secondCard, ...afterSecond.market[1].slice(1)] } }, "p3", { kind: "market", level: 1, index: 0 });
  assert.equal(afterThird.phase, "finished");
  assert.deepEqual(afterThird.winners, ["p1"]);
});

test("a computer player completes a legal turn", () => {
  const lobby = addComputerPlayer(createLobby(person("p1", "Host"), "BOTTY", 1), { id: "bot-1", name: "Ada" });
  const base = startGame(lobby, () => 0.3);
  const game = { ...base, currentPlayerIndex: 1 };
  const next = runComputerTurn(game, () => 0.2);
  assert.notEqual(next, game);
  assert.ok(currentPlayer(next).id === "p1" || next.pendingReturn?.playerId === "bot-1" || next.pendingNoble?.playerId === "bot-1");
});
