import assert from "node:assert/strict";
import test from "node:test";

import {
  canPlayHandFootCards,
  createHandFootMatch,
  discardHandFootCard,
  drawHandFootCards,
  handFootMeldBonus,
  playHandFootCards,
  scoreHandFootTeam,
  startNextHandFootRound,
} from "../lib/hand-and-foot.js";

const card = (id, suit, rank, copy = 0) => ({ id, suit, rank, copy });

test("deals a 13-card hand and hidden 13-card foot from one deck per player", () => {
  for (const playerCount of [4, 6, 8]) {
    const game = createHandFootMatch({ playerCount, random: () => 0.42 });
    assert.ok(game.players.every((player) => player.hand.length === 13));
    assert.ok(game.players.every((player) => player.foot.length === 13));
    assert.ok(game.players.every((player) => player.usingFoot === false));
    assert.equal(game.drawPile.length, playerCount * 54 - playerCount * 26);
  }
});

test("selected partners sit opposite and every team contains two players", () => {
  const game = createHandFootMatch({ playerName: "Sam", playerCount: 6, teammateName: "Rowan" });

  assert.equal(game.players[0].name, "Sam");
  assert.equal(game.players[3].name, "Rowan");
  assert.equal(game.players[0].teamId, game.players[3].teamId);
  assert.ok(game.teams.every((team) => team.memberIds.length === 2));
  assert.deepEqual(game.teams.map((team) => team.memberIds), [[0, 3], [1, 4], [2, 5]]);
});

test("a turn starts by drawing exactly two cards and ends with one discard", () => {
  let game = createHandFootMatch({ playerCount: 4 });
  const startingDrawCount = game.drawPile.length;
  game = drawHandFootCards(game, 0);

  assert.equal(game.players[0].hand.length, 15);
  assert.equal(game.drawPile.length, startingDrawCount - 2);
  assert.equal(game.turnStage, "play");

  const discarded = game.players[0].hand[0];
  game = discardHandFootCard(game, 0, discarded.id);
  assert.equal(game.players[0].hand.length, 14);
  assert.equal(game.discardPile.at(-1).id, discarded.id);
  assert.equal(game.currentPlayerIndex, 1);
  assert.equal(game.turnStage, "draw");
});

test("the complete first lay-down may contain several melds and must meet the round threshold", () => {
  let game = createHandFootMatch({ playerCount: 4 });
  const opening = [
    card("8a", "clubs", 8), card("8b", "diamonds", 8), card("8c", "spades", 8),
    card("4a", "clubs", 4), card("4b", "diamonds", 4), card("4c", "spades", 4), card("4d", "hearts", 4),
  ];
  game = {
    ...game,
    turnStage: "play",
    players: game.players.map((player, index) => index === 0 ? { ...player, hand: opening } : player),
  };

  game = playHandFootCards(game, 0, opening.map((candidate) => candidate.id));
  assert.equal(game.teams[0].opened, true);
  assert.equal(game.teams[0].melds[8].length, 3);
  assert.equal(game.teams[0].melds[4].length, 4);
  assert.equal(game.players[0].usingFoot, true);
});

test("selected cards report whether they can legally be played", () => {
  let game = createHandFootMatch({ playerCount: 4 });
  const single = card("single-nine", "clubs", 9);
  const opening = [
    card("8a", "clubs", 8), card("8b", "diamonds", 8), card("8c", "spades", 8),
    card("8d", "hearts", 8), card("joker", null, "joker"),
  ];
  game = {
    ...game,
    turnStage: "play",
    players: game.players.map((player, index) => index === 0
      ? { ...player, hand: [single, ...opening] }
      : player),
  };

  assert.equal(canPlayHandFootCards(game, 0, [single.id]), false);
  assert.equal(canPlayHandFootCards(game, 0, opening.map((candidate) => candidate.id)), true);
});

test("opening requirements rise to 90, 120, and 150 in later rounds", () => {
  let game = createHandFootMatch({ playerCount: 4 });
  for (const expected of [90, 120, 150]) {
    game = { ...game, phase: "round-over" };
    game = startNextHandFootRound(game, () => 0.33);
    assert.equal(game.roundRequirement, expected);
  }
});

test("regular melds allow no more than two wilds and never more wilds than naturals", () => {
  let game = createHandFootMatch({ playerCount: 4 });
  const selected = [
    card("9a", "clubs", 9), card("9b", "diamonds", 9), card("9c", "spades", 9),
    card("two-a", "clubs", 2), card("joker-a", null, "joker"), card("two-b", "hearts", 2),
  ];
  game = {
    ...game,
    turnStage: "play",
    teams: game.teams.map((team, index) => index === 0 ? { ...team, opened: true } : team),
    players: game.players.map((player, index) => index === 0 ? { ...player, hand: selected } : player),
  };

  assert.throws(() => playHandFootCards(game, 0, selected.map((candidate) => candidate.id)), /more than two wild/i);
});

test("threes cannot be melded and the last foot card cannot be discarded", () => {
  let game = createHandFootMatch({ playerCount: 4 });
  const three = card("three", "clubs", 3);
  game = {
    ...game,
    turnStage: "play",
    players: game.players.map((player, index) => index === 0 ? { ...player, hand: [three] } : player),
  };
  assert.throws(() => playHandFootCards(game, 0, [three.id]), /Threes cannot be melded/);

  game.players[0] = { ...game.players[0], usingFoot: true, hand: [], foot: [three] };
  assert.throws(() => discardHandFootCard(game, 0, three.id), /last card in your foot/i);
});

test("a player cannot go out while their teammate still holds a three", () => {
  let game = createHandFootMatch({ playerCount: 4 });
  const sevens = [card("7a", "clubs", 7), card("7b", "diamonds", 7), card("7c", "spades", 7)];
  game = {
    ...game,
    turnStage: "play",
    teams: game.teams.map((team, index) => index === 0 ? { ...team, opened: true } : team),
    players: game.players.map((player, index) => {
      if (index === 0) return { ...player, hand: [], foot: sevens, usingFoot: true };
      if (index === 2) return { ...player, hand: [card("blocker", "hearts", 3)] };
      return player;
    }),
  };

  assert.throws(() => playHandFootCards(game, 0, sevens.map((candidate) => candidate.id)), /teammate still holds a 3/i);
});

test("seven-card meld bonuses distinguish clean, dirty, wild, and seven books", () => {
  const naturals = Array.from({ length: 7 }, (_, index) => card(`n-${index}`, "clubs", 8, index));
  const dirty = [...naturals.slice(0, 6), card("wild", "hearts", 2)];
  const wilds = Array.from({ length: 7 }, (_, index) => card(`w-${index}`, index % 2 ? null : "hearts", index % 2 ? "joker" : 2, index));

  assert.equal(handFootMeldBonus("8", naturals), 500);
  assert.equal(handFootMeldBonus("8", dirty), 300);
  assert.equal(handFootMeldBonus("wild", wilds), 2500);
  assert.equal(handFootMeldBonus("7", naturals.map((candidate) => ({ ...candidate, rank: 7 }))), 3000);
});

test("round scoring adds laid cards and books, then subtracts both players' leftovers", () => {
  const team = {
    id: 0,
    memberIds: [0, 2],
    melds: {
      8: Array.from({ length: 7 }, (_, index) => card(`8-${index}`, "clubs", 8, index)),
    },
  };
  const players = [
    { hand: [card("ace", "spades", 14), card("red-three", "hearts", 3)], foot: [] },
    { hand: [], foot: [] },
    { hand: [card("black-three", "clubs", 3)], foot: [] },
  ];

  assert.deepEqual(scoreHandFootTeam(team, players), {
    laidPoints: 70,
    bookBonus: 500,
    leftoverPoints: -420,
    total: 150,
  });
});
