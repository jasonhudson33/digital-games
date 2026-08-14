import test from "node:test";
import assert from "node:assert/strict";
import {
  addComputerPlayer,
  cardScore,
  createDeck,
  createLobby,
  finalScore,
  groupRuns,
  passCard,
  runComputerStep,
  startGame,
  startingChips,
  takeCard,
} from "../lib/no-thanks.js";

const highRandom = () => 0.999999;

function playing(overrides = {}) {
  return {
    roomCode: "NOPE5",
    hostId: "p1",
    phase: "playing",
    players: [
      { id: "p1", name: "Avery", isComputer: false, chips: 11, cards: [] },
      { id: "p2", name: "Blake", isComputer: false, chips: 11, cards: [] },
      { id: "p3", name: "Casey", isComputer: false, chips: 11, cards: [] },
    ],
    deck: [14, 21],
    activeCard: 8,
    centerChips: 0,
    currentPlayerIndex: 0,
    winnerIds: [],
    log: [],
    ...overrides,
  };
}

test("the deck contains every number from 3 through 35 exactly once", () => {
  const deck = createDeck(highRandom);
  assert.equal(deck.length, 33);
  assert.deepEqual([...deck].sort((a, b) => a - b), Array.from({ length: 33 }, (_, index) => index + 3));
});

test("official starting chip counts change for six and seven players", () => {
  assert.equal(startingChips(3), 11);
  assert.equal(startingChips(5), 11);
  assert.equal(startingChips(6), 9);
  assert.equal(startingChips(7), 7);
  assert.throws(() => startingChips(2), /3–7/);
});

test("nine unseen cards are removed and one of the remaining 24 is revealed", () => {
  let lobby = createLobby({ id: "p1", name: "Avery" }, "NOPE5", 1);
  lobby = addComputerPlayer(lobby);
  lobby = addComputerPlayer(lobby);
  const game = startGame(lobby, highRandom);
  assert.equal(game.phase, "playing");
  assert.equal(game.deck.length, 23);
  assert.equal(typeof game.activeCard, "number");
  assert.ok(game.players.every((player) => player.chips === 11));
});

test("passing spends one chip and moves play to the left", () => {
  const next = passCard(playing(), "p1");
  assert.equal(next.players[0].chips, 10);
  assert.equal(next.centerChips, 1);
  assert.equal(next.currentPlayerIndex, 1);
  assert.equal(next.activeCard, 8);
});

test("a player with no chips cannot pass", () => {
  const game = playing({ players: [
    { id: "p1", name: "Avery", isComputer: false, chips: 0, cards: [] },
    { id: "p2", name: "Blake", isComputer: false, chips: 11, cards: [] },
    { id: "p3", name: "Casey", isComputer: false, chips: 11, cards: [] },
  ] });
  assert.equal(passCard(game, "p1"), game);
});

test("taking collects the card and its chips, reveals the next card, and keeps the turn", () => {
  const next = takeCard(playing({ centerChips: 4 }), "p1");
  assert.deepEqual(next.players[0].cards, [8]);
  assert.equal(next.players[0].chips, 15);
  assert.equal(next.activeCard, 14);
  assert.equal(next.deck.length, 1);
  assert.equal(next.currentPlayerIndex, 0);
  assert.equal(next.centerChips, 0);
});

test("only the lowest card in each consecutive run scores", () => {
  assert.equal(cardScore([8, 13, 14, 15, 17]), 38);
  assert.equal(cardScore([8, 13, 14, 15, 16, 17]), 21);
  assert.deepEqual(groupRuns([17, 14, 8, 15, 13]), [[8], [13, 14, 15], [17]]);
  assert.equal(finalScore({ cards: [8, 13, 14, 15, 17], chips: 13 }), 25);
});

test("taking the last card ends the game and lowest score wins", () => {
  const game = playing({
    deck: [],
    activeCard: 5,
    players: [
      { id: "p1", name: "Avery", isComputer: false, chips: 11, cards: [] },
      { id: "p2", name: "Blake", isComputer: false, chips: 2, cards: [20] },
      { id: "p3", name: "Casey", isComputer: false, chips: 4, cards: [10] },
    ],
  });
  const next = takeCard(game, "p1");
  assert.equal(next.phase, "finished");
  assert.deepEqual(next.winnerIds, ["p1"]);
});

test("computer players always make one legal choice", () => {
  const game = playing({
    players: [
      { id: "bot", name: "Moxie", isComputer: true, chips: 0, cards: [] },
      { id: "p2", name: "Blake", isComputer: false, chips: 11, cards: [] },
      { id: "p3", name: "Casey", isComputer: false, chips: 11, cards: [] },
    ],
  });
  const next = runComputerStep(game, highRandom);
  assert.deepEqual(next.players[0].cards, [8]);
  assert.equal(next.activeCard, 14);
});
