import test from "node:test";
import assert from "node:assert/strict";
import {
  cardFace, cardPoints, catchUno, createDeck, createFlipDeck, createLobby, drawCard, isPlayable,
  passAfterDraw, playCard, resolveDrawFour, runComputerStep, setRuleset, topDiscard,
} from "../lib/uno.js";

const noShuffle = () => 0.999999;
const number = (id, color, value) => ({ id, color, type: "number", value });
const action = (id, color, type) => ({ id, color, type, value: null });
const paired = (id, light, dark) => ({ id, light, dark });

function player(id, cards, overrides = {}) { return { id, name: id, isComputer: false, cards, score: 0, ...overrides }; }
function playing(overrides = {}) {
  return {
    roomCode: "UNOOO", hostId: "p1", phase: "playing", round: 1, targetScore: 500,
    players: [player("p1", [number("r5", "red", 5)]), player("p2", [number("b7", "blue", 7)])],
    deck: [number("g3", "green", 3), number("y8", "yellow", 8)],
    discard: [number("r7", "red", 7)], activeColor: "red", dealerIndex: 1,
    currentPlayerIndex: 0, direction: 1, drawnCardId: null, pendingOpeningWild: null,
    pendingDrawFour: null, pendingWinnerId: null, missedUnoPlayerId: null, winnerId: null,
    roundWinnerId: null, log: [], ...overrides,
  };
}

test("classic UNO deck has the official 108-card distribution", () => {
  const deck = createDeck(noShuffle);
  assert.equal(deck.length, 108);
  assert.equal(deck.filter((card) => card.type === "number").length, 76);
  assert.equal(deck.filter((card) => card.type === "skip").length, 8);
  assert.equal(deck.filter((card) => card.type === "reverse").length, 8);
  assert.equal(deck.filter((card) => card.type === "draw2").length, 8);
  assert.equal(deck.filter((card) => card.type === "wild").length, 4);
  assert.equal(deck.filter((card) => card.type === "wild4").length, 4);
});

test("cards match color, number, or action", () => {
  const game = playing();
  assert.equal(isPlayable(game, number("r1", "red", 1), game.players[0]), true);
  assert.equal(isPlayable(game, number("g7", "green", 7), game.players[0]), true);
  assert.equal(isPlayable(game, number("g1", "green", 1), game.players[0]), false);
  assert.equal(isPlayable({ ...game, discard: [action("rs", "red", "skip")] }, action("bs", "blue", "skip"), game.players[0]), true);
});

test("Draw Two adds cards and skips the victim", () => {
  const game = playing({ players: [player("p1", [action("d2", "red", "draw2"), number("x", "blue", 4)]), player("p2", [number("b7", "blue", 7)])] });
  const next = playCard(game, "p1", "d2");
  assert.equal(next.players[1].cards.length, 3);
  assert.equal(next.currentPlayerIndex, 0);
});

test("Reverse acts as a skip with two players", () => {
  const game = playing({ players: [player("p1", [action("rev", "red", "reverse"), number("x", "blue", 4)]), player("p2", [number("b7", "blue", 7)])] });
  const next = playCard(game, "p1", "rev");
  assert.equal(next.direction, -1);
  assert.equal(next.currentPlayerIndex, 0);
});

test("only the drawn card may be played after choosing to draw", () => {
  const game = playing({ deck: [number("drawn", "red", 2)] });
  const next = drawCard(game, "p1", noShuffle);
  assert.equal(next.drawnCardId, "drawn");
  assert.equal(playCard(next, "p1", "r5"), next);
  assert.equal(playCard(next, "p1", "drawn").discard.at(-1).id, "drawn");
  assert.equal(passAfterDraw(next, "p1").currentPlayerIndex, 1);
});

test("Wild Draw Four challenges punish the illegal player or failed challenger", () => {
  const illegal = playing({ players: [player("p1", [action("w4", null, "wild4"), number("red-card", "red", 9)]), player("p2", [number("b7", "blue", 7)])], deck: createDeck(noShuffle) });
  const pending = playCard(illegal, "p1", "w4", { color: "blue" });
  assert.equal(pending.pendingDrawFour.wasLegal, false);
  const caught = resolveDrawFour(pending, "p2", true, noShuffle);
  assert.equal(caught.players[0].cards.length, 5);
  assert.equal(caught.currentPlayerIndex, 1);

  const legal = playing({ players: [player("p1", [action("w4", null, "wild4"), number("green-card", "green", 9)]), player("p2", [number("b7", "blue", 7)])], deck: createDeck(noShuffle) });
  const failed = resolveDrawFour(playCard(legal, "p1", "w4", { color: "blue" }), "p2", true, noShuffle);
  assert.equal(failed.players[1].cards.length, 7);
});

test("a missed UNO call can be caught for two cards", () => {
  const game = playing({ players: [player("p1", [number("r5", "red", 5), number("g1", "green", 1)]), player("p2", [number("b7", "blue", 7)])], deck: [number("a", "green", 3), number("b", "yellow", 8)] });
  const missed = playCard(game, "p1", "r5", { calledUno: false });
  assert.equal(missed.missedUnoPlayerId, "p1");
  const caught = catchUno(missed, "p2", noShuffle);
  assert.equal(caught.players[0].cards.length, 3);
});

test("official scoring values action and wild cards", () => {
  assert.equal(cardPoints(number("n", "red", 8)), 8);
  assert.equal(cardPoints(action("s", "red", "skip")), 20);
  assert.equal(cardPoints(action("w", null, "wild")), 50);
});

test("computer players make a legal move", () => {
  const game = playing({ players: [player("bot", [number("r5", "red", 5)], { isComputer: true }), player("p2", [number("b7", "blue", 7)])] });
  const next = runComputerStep(game, noShuffle);
  assert.equal(next.phase, "roundEnd");
  assert.equal(next.roundWinnerId, "bot");
});

test("UNO Flip deck has 112 physical cards with the official distribution on both sides", () => {
  const deck = createFlipDeck(noShuffle);
  assert.equal(deck.length, 112);
  const light = deck.map((card) => card.light);
  const dark = deck.map((card) => card.dark);
  assert.equal(light.filter((face) => face.type === "number").length, 72);
  assert.equal(light.filter((face) => face.type === "draw1").length, 8);
  assert.equal(light.filter((face) => face.type === "flip").length, 8);
  assert.equal(light.filter((face) => face.type === "wildDraw2").length, 4);
  assert.equal(dark.filter((face) => face.type === "number").length, 72);
  assert.equal(dark.filter((face) => face.type === "draw5").length, 8);
  assert.equal(dark.filter((face) => face.type === "skipEveryone").length, 8);
  assert.equal(dark.filter((face) => face.type === "wildDrawColor").length, 4);
});

test("the host can select UNO Flip only while the room is in the lobby", () => {
  const lobby = createLobby({ id: "p1", name: "Avery" }, "FLIPP", 1);
  assert.equal(setRuleset(lobby, "flip").ruleset, "flip");
  assert.equal(setRuleset({ ...lobby, phase: "playing" }, "flip").ruleset, "classic");
});

function flipPlaying(overrides = {}) {
  const discardBottom = paired("bottom", number("l1", "red", 1), number("d1", "pink", 1));
  const discardTop = paired("top", number("l7", "red", 7), number("d7", "pink", 7));
  const flip = paired("flip", action("lf", "red", "flip"), action("df", "pink", "flip"));
  const spare = paired("spare", number("ls", "blue", 4), number("ds", "teal", 4));
  return playing({
    ruleset: "flip", side: "light", activeColor: "red", discard: [discardBottom, discardTop],
    deck: [paired("deck-a", number("la", "yellow", 2), number("da", "orange", 2)), paired("deck-b", number("lb", "green", 3), number("db", "purple", 3))],
    players: [player("p1", [flip, spare]), player("p2", [paired("p2", number("lp", "yellow", 8), number("dp", "orange", 8))])],
    ...overrides,
  });
}

test("playing FLIP reverses both piles and exposes every dark face", () => {
  const next = playCard(flipPlaying(), "p1", "flip");
  assert.equal(next.side, "dark");
  assert.deepEqual(next.deck.map((card) => card.id), ["deck-b", "deck-a"]);
  assert.deepEqual(next.discard.map((card) => card.id), ["flip", "top", "bottom"]);
  assert.equal(topDiscard(next).id, "bottom");
  assert.equal(cardFace(next, next.players[0].cards[0]).color, "teal");
  assert.equal(next.activeColor, "pink");
  assert.equal(next.currentPlayerIndex, 1);
});

test("Dark Side Draw Five adds five cards and skips the next player", () => {
  const drawFive = paired("draw5", action("l-draw", "yellow", "draw1"), action("d-draw", "purple", "draw5"));
  const top = paired("dark-top", number("lt", "yellow", 5), number("dt", "purple", 5));
  const deck = createFlipDeck(noShuffle).slice(0, 8);
  const game = flipPlaying({ side: "dark", activeColor: "purple", discard: [top], deck, players: [player("p1", [drawFive, paired("keep", number("lk", "red", 1), number("dk", "pink", 1))]), player("p2", [paired("held", number("lh", "blue", 1), number("dh", "teal", 1))])] });
  const next = playCard(game, "p1", "draw5");
  assert.equal(next.players[1].cards.length, 6);
  assert.equal(next.currentPlayerIndex, 0);
});

test("Dark Side Skip Everyone returns play to the same player", () => {
  const skipAll = paired("skip-all", action("ls", "red", "skip"), action("ds", "pink", "skipEveryone"));
  const top = paired("dark-top", number("lt", "red", 5), number("dt", "pink", 5));
  const game = flipPlaying({ side: "dark", activeColor: "pink", discard: [top], players: [player("p1", [skipAll, paired("keep", number("lk", "red", 1), number("dk", "teal", 1))]), player("p2", [paired("held", number("lh", "blue", 1), number("dh", "teal", 1))])] });
  assert.equal(playCard(game, "p1", "skip-all").currentPlayerIndex, 0);
});

test("Light Wild Draw Two uses the official challenge outcomes", () => {
  const wild = paired("wild-two", action("lw", null, "wildDraw2"), action("dw", null, "wildDrawColor"));
  const red = paired("red", number("lr", "red", 3), number("dr", "pink", 3));
  const deck = createFlipDeck(noShuffle).slice(0, 8);
  const pending = playCard(flipPlaying({ deck, players: [player("p1", [wild, red]), player("p2", [paired("held", number("lh", "blue", 1), number("dh", "teal", 1))])] }), "p1", "wild-two", { color: "blue" });
  assert.equal(pending.pendingDrawFour.amount, 2);
  assert.equal(pending.pendingDrawFour.wasLegal, false);
  const caught = resolveDrawFour(pending, "p2", true, noShuffle);
  assert.equal(caught.players[0].cards.length, 3);
  assert.equal(caught.currentPlayerIndex, 1);
});

test("Dark Wild Draw Color draws through the chosen color and failed challenges add two", () => {
  const wild = paired("wild-color", action("lw", null, "wildDraw2"), action("dw", null, "wildDrawColor"));
  const keep = paired("keep", number("lk", "blue", 4), number("dk", "orange", 4));
  const darkTop = paired("dark-top", number("lt", "red", 7), number("dt", "pink", 7));
  const deck = [
    paired("orange", number("lo", "red", 1), number("do", "orange", 1)),
    paired("purple", number("lp", "red", 2), number("dp", "purple", 2)),
    paired("teal", number("lt2", "red", 3), number("dt2", "teal", 3)),
    paired("extra-a", number("lea", "red", 4), number("dea", "pink", 4)),
    paired("extra-b", number("leb", "red", 5), number("deb", "orange", 5)),
  ];
  const game = flipPlaying({ side: "dark", activeColor: "pink", discard: [darkTop], deck, players: [player("p1", [wild, keep]), player("p2", [paired("held", number("lh", "blue", 1), number("dh", "teal", 1))])] });
  const pending = playCard(game, "p1", "wild-color", { color: "teal" });
  assert.equal(pending.pendingDrawFour.kind, "color");
  assert.equal(pending.pendingDrawFour.wasLegal, true);
  const failed = resolveDrawFour(pending, "p2", true, noShuffle);
  assert.equal(failed.players[1].cards.length, 6);
  assert.equal(cardFace(failed, failed.players[1].cards.at(-3)).color, "teal");
});

test("UNO Flip scoring uses whichever side ends the round", () => {
  const drawPair = paired("penalty", action("light-draw", "red", "draw1"), action("dark-draw", "pink", "draw5"));
  const skipPair = paired("skip", action("light-skip", "red", "skip"), action("dark-skip", "pink", "skipEveryone"));
  const wildPair = paired("wild", action("light-wild", null, "wild"), action("dark-wild", null, "wildDrawColor"));
  assert.equal(cardPoints(drawPair, "light"), 10);
  assert.equal(cardPoints(drawPair, "dark"), 20);
  assert.equal(cardPoints(skipPair, "dark"), 30);
  assert.equal(cardPoints(wildPair, "dark"), 60);
});
