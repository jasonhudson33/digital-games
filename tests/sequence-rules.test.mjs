import test from "node:test";
import assert from "node:assert/strict";
import {
  BOARD,
  addComputerPlayer,
  boardPositionsForCard,
  compatibleTeamCounts,
  createDeck,
  createLobby,
  exchangeDeadCard,
  handSizeFor,
  isProtectedChip,
  legalTargetsForCard,
  playCard,
  runComputerTurn,
  setTeamCount,
  startGame,
} from "../lib/sequence.js";

const noShuffle = () => 0.999999;

const EXPECTED_LANDSCAPE_BOARD = [
  ["FREE", "10S", "QS", "KS", "AS", "2D", "3D", "4D", "5D", "FREE"],
  ["9S", "10H", "9H", "8H", "7H", "6H", "5H", "4H", "3H", "6D"],
  ["8S", "QH", "7D", "8D", "9D", "10D", "QD", "KD", "2H", "7D"],
  ["7S", "KH", "6D", "2C", "AH", "KH", "QH", "AD", "2S", "8D"],
  ["6S", "AH", "5D", "3C", "4H", "3H", "10H", "AC", "3S", "9D"],
  ["5S", "2C", "4D", "4C", "5H", "2H", "9H", "KC", "4S", "10D"],
  ["4S", "3C", "3D", "5C", "6H", "7H", "8H", "QC", "5S", "QD"],
  ["3S", "4C", "2D", "6C", "7C", "8C", "9C", "10C", "6S", "KD"],
  ["2S", "5C", "AS", "KS", "QS", "10S", "9S", "8S", "7S", "AD"],
  ["FREE", "6C", "7C", "8C", "9C", "10C", "QC", "KC", "AC", "FREE"],
];

function lobbyWithPlayers(count, teamCount = 2) {
  let lobby = createLobby({ id: "p0", name: "Player 1" }, "ABCDE", 1);
  for (let index = 1; index < count; index += 1) {
    lobby = addComputerPlayer(lobby, { id: `p${index}`, name: `Player ${index + 1}` });
  }
  return setTeamCount(lobby, teamCount);
}

function playingFixture(overrides = {}) {
  return {
    ...startGame(lobbyWithPlayers(2), noShuffle),
    deck: [{ id: "draw", code: "2C" }],
    discard: [],
    chips: {},
    completedSequences: [],
    currentPlayerIndex: 0,
    players: [
      { id: "p0", name: "Player 1", isComputer: false, teamIndex: 0, hand: [{ id: "play", code: "6D" }] },
      { id: "p1", name: "Player 2", isComputer: true, teamIndex: 1, hand: [{ id: "other", code: "7D" }] },
    ],
    ...overrides,
  };
}

test("the board has two spaces for every non-Jack card and four wild corners", () => {
  assert.equal(BOARD.flat().filter((card) => card === "FREE").length, 4);
  for (const card of createDeck(noShuffle).map((item) => item.code)) {
    if (card.startsWith("J")) assert.equal(boardPositionsForCard(card).length, 0);
    else assert.equal(boardPositionsForCard(card).length, 2, card);
  }
});

test("the complete classic board is rotated clockwise for the landscape table", () => {
  assert.deepEqual(BOARD, EXPECTED_LANDSCAPE_BOARD);
  assert.deepEqual(BOARD.map((row) => row[0]), ["FREE", "9S", "8S", "7S", "6S", "5S", "4S", "3S", "2S", "FREE"]);
  assert.deepEqual(BOARD.map((row) => row[9]), ["FREE", "6D", "7D", "8D", "9D", "10D", "QD", "KD", "AD", "FREE"]);
});

test("official player counts map to the official hand and team options", () => {
  assert.deepEqual([2, 3, 4, 6, 8, 9, 10, 12].map(handSizeFor), [7, 6, 6, 5, 4, 4, 3, 3]);
  assert.deepEqual(compatibleTeamCounts(2), [2]);
  assert.deepEqual(compatibleTeamCounts(3), [3]);
  assert.deepEqual(compatibleTeamCounts(6), [2, 3]);
  assert.deepEqual(compatibleTeamCounts(9), [3]);
  assert.deepEqual(compatibleTeamCounts(10), [2]);
});

test("start deals cards and alternates team seats", () => {
  const game = startGame(lobbyWithPlayers(6, 3), noShuffle);
  assert.equal(game.teamCount, 3);
  assert.deepEqual(game.players.map((player) => player.teamIndex), [0, 1, 2, 0, 1, 2]);
  assert.ok(game.players.every((player) => player.hand.length === 5));
});

test("the opening player is selected randomly", () => {
  const game = startGame(lobbyWithPlayers(6, 3), () => 0.51);
  assert.equal(game.currentPlayerIndex, 3);
  assert.match(game.log[0], /Player 4 plays first/);
});

test("invalid player totals cannot start", () => {
  assert.throws(() => startGame(lobbyWithPlayers(5), noShuffle), /supports 2, 3, 4, 6, 8, 9, 10, or 12/);
});

test("a matching card places a chip and draws automatically", () => {
  const game = playingFixture();
  const next = playCard(game, "p0", "play", 1, 9, noShuffle);
  assert.equal(next.chips["1:9"].teamIndex, 0);
  assert.deepEqual(next.players[0].hand.map((card) => card.id), ["draw"]);
  assert.equal(next.currentPlayerIndex, 1);
});

test("two-eyed Jacks place anywhere and one-eyed Jacks remove unprotected opponents", () => {
  const wild = playingFixture({ players: [
    { id: "p0", name: "P1", isComputer: false, teamIndex: 0, hand: [{ id: "wild", code: "JC" }] },
    { id: "p1", name: "P2", isComputer: true, teamIndex: 1, hand: [] },
  ] });
  assert.equal(legalTargetsForCard(wild, wild.players[0].hand[0]).length, 96);
  const placed = playCard(wild, "p0", "wild", 4, 4, noShuffle);
  assert.equal(placed.chips["4:4"].teamIndex, 0);

  const remove = playingFixture({
    chips: { "3:3": { teamIndex: 1, playerId: "p1" }, "3:4": { teamIndex: 1, playerId: "p1" } },
    completedSequences: [{ id: "locked", teamIndex: 1, positions: ["3:4", "3:5", "3:6", "3:7", "3:8"] }],
    players: [
      { id: "p0", name: "P1", isComputer: false, teamIndex: 0, hand: [{ id: "remove", code: "JS" }] },
      { id: "p1", name: "P2", isComputer: true, teamIndex: 1, hand: [] },
    ],
  });
  assert.deepEqual(legalTargetsForCard(remove, remove.players[0].hand[0]), [{ row: 3, column: 3 }]);
  assert.equal(playCard(remove, "p0", "remove", 3, 4, noShuffle), remove);
  assert.equal(playCard(remove, "p0", "remove", 3, 3, noShuffle).chips["3:3"], undefined);
});

test("dead cards can be replaced once without ending the turn", () => {
  const game = playingFixture({
    chips: { "1:9": { teamIndex: 0, playerId: "p0" }, "3:2": { teamIndex: 1, playerId: "p1" } },
    players: [
      { id: "p0", name: "P1", isComputer: false, teamIndex: 0, hand: [{ id: "dead", code: "6D" }] },
      { id: "p1", name: "P2", isComputer: true, teamIndex: 1, hand: [] },
    ],
  });
  const next = exchangeDeadCard(game, "p0", "dead", noShuffle);
  assert.equal(next.players[0].hand[0].id, "draw");
  assert.equal(next.currentPlayerIndex, 0);
  assert.equal(next.deadCardExchanged, true);
  assert.equal(exchangeDeadCard(next, "p0", "draw", noShuffle), next);
});

test("completed sequences are protected and two sequences win a two-team game", () => {
  const game = playingFixture({
    chips: {
      "1:1": { teamIndex: 0, playerId: "p0" }, "1:2": { teamIndex: 0, playerId: "p0" },
      "1:3": { teamIndex: 0, playerId: "p0" }, "1:4": { teamIndex: 0, playerId: "p0" },
      "2:1": { teamIndex: 0, playerId: "p0" }, "2:2": { teamIndex: 0, playerId: "p0" },
      "2:3": { teamIndex: 0, playerId: "p0" }, "2:4": { teamIndex: 0, playerId: "p0" },
    },
    completedSequences: [{ id: "first", teamIndex: 0, positions: ["1:1", "1:2", "1:3", "1:4", "1:5"] }],
    players: [
      { id: "p0", name: "P1", isComputer: false, teamIndex: 0, hand: [{ id: "wild", code: "JC" }] },
      { id: "p1", name: "P2", isComputer: true, teamIndex: 1, hand: [] },
    ],
  });
  const next = playCard(game, "p0", "wild", 2, 5, noShuffle);
  assert.equal(next.phase, "finished");
  assert.equal(next.winnerTeamIndex, 0);
  assert.equal(next.completedSequences.length, 2);
  assert.equal(isProtectedChip(next, 2, 5), true);
});

test("computer players make a legal turn", () => {
  const game = playingFixture({
    currentPlayerIndex: 1,
    players: [
      { id: "p0", name: "P1", isComputer: false, teamIndex: 0, hand: [] },
      { id: "p1", name: "CPU", isComputer: true, teamIndex: 1, hand: [{ id: "cpu", code: "7D" }] },
    ],
  });
  const next = runComputerTurn(game, noShuffle);
  assert.equal(next.currentPlayerIndex, 0);
  assert.equal(Object.keys(next.chips).length, 1);
});
