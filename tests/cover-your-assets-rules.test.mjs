import test from "node:test";
import assert from "node:assert/strict";
import {
  addComputerPlayer,
  canChallenge,
  createDeck,
  createLobby,
  discardCard,
  makePairFromDiscard,
  makePairFromHand,
  playChallengeCard,
  runComputerStep,
  setValue,
  startChallenge,
  startGame,
  topSet,
  yieldChallenge,
} from "../lib/cover-your-assets.js";

const noShuffle = () => 0.999999;
const card = (id, asset, value = 10_000) => ({ id, type: "asset", asset, value });
const wild = (id, type = "silver") => ({ id, type: "wild", asset: null, wild: type, value: type === "gold" ? 50_000 : 25_000 });
const set = (id, asset, cards) => ({ id, asset, cards });

function playing(overrides = {}) {
  return {
    roomCode: "RICH5",
    hostId: "p1",
    phase: "playing",
    players: [
      { id: "p1", name: "Avery", isComputer: false, score: 0, hand: [card("a", "cash")], stack: [] },
      { id: "p2", name: "Blake", isComputer: false, score: 0, hand: [card("b", "piggy")], stack: [] },
    ],
    currentPlayerIndex: 0,
    dealerIndex: 0,
    startingHandSize: 1,
    round: 1,
    deck: [],
    discard: [],
    pendingChallenge: null,
    roundScores: {},
    winnerId: null,
    targetScore: 1_000_000,
    log: [],
    ...overrides,
  };
}

test("classic deck has the official 104 cards and printed values", () => {
  const deck = createDeck(noShuffle);
  assert.equal(deck.length, 104);
  assert.equal(deck.filter((item) => item.asset === "comics").length, 10);
  assert.equal(deck.find((item) => item.asset === "comics").value, 5_000);
  assert.equal(deck.find((item) => item.asset === "cabin").value, 20_000);
  assert.equal(deck.filter((item) => item.wild === "silver").length, 8);
  assert.equal(deck.find((item) => item.wild === "gold").value, 50_000);
});

test("two to three players receive five cards and larger rooms receive four", () => {
  let small = createLobby({ id: "p1", name: "Avery" }, "SMALL", 1);
  small = addComputerPlayer(small);
  const smallGame = startGame(small, noShuffle);
  assert.ok(smallGame.players.every((player) => player.hand.length === 5));

  let large = createLobby({ id: "p1", name: "Avery" }, "LARGE", 1);
  large = addComputerPlayer(addComputerPlayer(addComputerPlayer(large)));
  const largeGame = startGame(large, noShuffle);
  assert.ok(largeGame.players.every((player) => player.hand.length === 4));
});

test("the opening player is selected randomly and the dealer sits immediately before them", () => {
  let lobby = createLobby({ id: "p1", name: "Avery" }, "FIRST", 1);
  lobby = addComputerPlayer(addComputerPlayer(addComputerPlayer(lobby)));
  const game = startGame(lobby, () => 0.6);
  assert.equal(game.currentPlayerIndex, 2);
  assert.equal(game.dealerIndex, 1);
});

test("a matching pair and an asset plus a wild form valid sets", () => {
  const matching = playing({
    players: [
      { id: "p1", name: "Avery", isComputer: false, score: 0, hand: [card("a1", "cash"), card("a2", "cash")], stack: [] },
      { id: "p2", name: "Blake", isComputer: false, score: 0, hand: [card("b", "piggy")], stack: [] },
    ],
    startingHandSize: 2,
  });
  const paired = makePairFromHand(matching, "p1", ["a1", "a2"]);
  assert.equal(paired.players[0].stack.length, 1);
  assert.equal(topSet(paired.players[0]).asset, "cash");

  const withWild = playing({
    players: [
      { id: "p1", name: "Avery", isComputer: false, score: 0, hand: [card("a1", "cash"), wild("w")], stack: [] },
      { id: "p2", name: "Blake", isComputer: false, score: 0, hand: [card("b", "piggy")], stack: [] },
    ],
    startingHandSize: 2,
  });
  assert.equal(makePairFromHand(withWild, "p1", ["a1", "w"]).players[0].stack[0].cards.length, 2);
  assert.equal(makePairFromHand(withWild, "p1", ["w", "missing"]), withWild);
});

test("the top discard can only pair with its matching asset from hand", () => {
  const game = playing({ discard: [card("discard", "cash")] });
  const next = makePairFromDiscard(game, "p1", "a");
  assert.equal(next.players[0].stack[0].cards.length, 2);
  assert.equal(next.discard.length, 0);

  const withWild = playing({
    discard: [card("discard", "cash")],
    players: [
      { id: "p1", name: "Avery", isComputer: false, score: 0, hand: [wild("w")], stack: [] },
      { id: "p2", name: "Blake", isComputer: false, score: 0, hand: [card("b", "piggy")], stack: [] },
    ],
  });
  assert.equal(makePairFromDiscard(withWild, "p1", "w"), withWild);
});

test("the nest egg is protected and only an exposed top set can be challenged", () => {
  const attackerStack = [set("nest-a", "piggy", [card("p1", "piggy"), card("p2", "piggy")])];
  const defenderNest = set("nest-b", "cash", [card("c1", "cash"), card("c2", "cash")]);
  const firstOnly = playing({ players: [
    { id: "p1", name: "Avery", isComputer: false, score: 0, hand: [card("attack", "cash")], stack: attackerStack },
    { id: "p2", name: "Blake", isComputer: false, score: 0, hand: [card("defend", "cash")], stack: [defenderNest] },
  ] });
  assert.equal(canChallenge(firstOnly, "p1", "p2"), false);

  const exposed = { ...firstOnly, players: [firstOnly.players[0], { ...firstOnly.players[1], stack: [defenderNest, set("top", "cash", [card("t1", "cash"), card("t2", "cash")])] }] };
  assert.equal(canChallenge(exposed, "p1", "p2"), true);
});

test("challenge cards alternate and the last player to reveal takes the growing set", () => {
  const game = playing({
    players: [
      { id: "p1", name: "Avery", isComputer: false, score: 0, hand: [card("attack", "cash")], stack: [set("nest-a", "piggy", [card("p1", "piggy"), card("p2", "piggy")])] },
      { id: "p2", name: "Blake", isComputer: false, score: 0, hand: [wild("defend")], stack: [set("nest-b", "train", [card("n1", "train", 5_000), card("n2", "train", 5_000)]), set("top", "cash", [card("t1", "cash"), card("t2", "cash")])] },
    ],
  });
  const challenged = startChallenge(game, "p1", "p2", "attack");
  assert.equal(challenged.pendingChallenge.turnPlayerId, "p2");
  const defended = playChallengeCard(challenged, "p2", "defend");
  assert.equal(defended.pendingChallenge.turnPlayerId, "p1");
  const resolved = yieldChallenge(defended, "p1");
  assert.equal(resolved.players[1].stack.length, 2);
  assert.equal(topSet(resolved.players[1]).cards.length, 4);
  assert.equal(setValue(topSet(resolved.players[1])), 55_000);
});

test("when every last card is played the round scores all banked assets", () => {
  const game = playing({
    players: [
      { id: "p1", name: "Avery", isComputer: false, score: 900_000, hand: [card("last", "cash")], stack: [set("fortune", "cabin", [card("c1", "cabin", 20_000), wild("gold", "gold")])] },
      { id: "p2", name: "Blake", isComputer: false, score: 0, hand: [], stack: [] },
    ],
  });
  const next = discardCard(game, "p1", "last");
  assert.equal(next.phase, "roundEnd");
  assert.equal(next.roundScores.p1, 70_000);
  assert.equal(next.players[0].score, 970_000);
});

test("computer players choose and complete a legal normal turn", () => {
  const game = playing({
    players: [
      { id: "p1", name: "Penny", isComputer: true, score: 0, hand: [card("a1", "cash"), card("a2", "cash")], stack: [] },
      { id: "p2", name: "Blake", isComputer: false, score: 0, hand: [card("b", "piggy")], stack: [] },
    ],
    startingHandSize: 2,
  });
  const next = runComputerStep(game, noShuffle);
  assert.equal(next.players[0].stack.length, 1);
  assert.equal(next.currentPlayerIndex, 1);
});
