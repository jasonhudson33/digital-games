import assert from "node:assert/strict";
import test from "node:test";

import {
  canPlayHandFootCards,
  chooseHandFootBotDiscard,
  chooseHandFootBotPlay,
  createHandFootMatch,
  discardHandFootCard,
  drawHandFootCards,
  getHandFootGoOutBlockReason,
  handFootMeldBonus,
  playHandFootCards,
  scoreHandFootTeam,
  startNextHandFootRound,
  toggleHandFootCardSelection,
} from "../lib/hand-and-foot.js";

const card = (id, suit, rank, copy = 0) => ({ id, suit, rank, copy });

test("deals a 13-card hand and hidden 13-card foot from one deck per player", () => {
  for (const playerCount of [4, 6, 8, 16]) {
    const game = createHandFootMatch({ playerCount, random: () => 0.42 });
    assert.ok(game.players.every((player) => player.hand.length === 13));
    assert.ok(game.players.every((player) => player.foot.length === 13));
    assert.ok(game.players.every((player) => player.usingFoot === false));
    assert.equal(game.drawPile.length, playerCount * 54 - playerCount * 26);
    assert.ok(game.drawPiles.every((pile) => pile.length <= 65));
    assert.equal(game.drawPiles.flat().length, game.drawPile.length);
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

test("a Hand and Foot computer completes a nearby book before starting another meld", () => {
  const base = createHandFootMatch({ playerCount: 4 });
  const nines = [card("nine-a", "clubs", 9), card("nine-b", "hearts", 9)];
  const fours = [card("four-a", "clubs", 4), card("four-b", "hearts", 4), card("four-c", "spades", 4)];
  const game = {
    ...base,
    phase: "playing",
    currentPlayerIndex: 0,
    turnStage: "play",
    players: base.players.map((player, index) => index === 0 ? { ...player, hand: [...nines, ...fours] } : player),
    teams: base.teams.map((team) => team.id === base.players[0].teamId ? {
      ...team,
      opened: true,
      melds: { 9: Array.from({ length: 5 }, (_, index) => card(`laid-nine-${index}`, "diamonds", 9)) },
    } : team),
  };
  assert.deepEqual(new Set(chooseHandFootBotPlay(game, 0)), new Set(nines.map((candidate) => candidate.id)));
});

test("a Hand and Foot computer never adds a wild to a completed clean seven book", () => {
  const base = createHandFootMatch({ playerCount: 4 });
  const naturalSeven = card("hand-seven", "hearts", 7);
  const wild = card("held-wild", "clubs", 2);
  const cleanSevenBook = Array.from({ length: 7 }, (_, index) => card(`laid-seven-${index}`, "diamonds", 7, index));
  const game = {
    ...base,
    phase: "playing",
    currentPlayerIndex: 0,
    turnStage: "play",
    players: base.players.map((player, index) => index === 0 ? { ...player, hand: [naturalSeven, wild, card("discard", "clubs", 4)] } : player),
    teams: base.teams.map((team) => team.id === base.players[0].teamId
      ? { ...team, opened: true, melds: { 7: cleanSevenBook } }
      : team),
  };

  assert.deepEqual(chooseHandFootBotPlay(game, 0), [naturalSeven.id]);
});

test("a Hand and Foot computer saves a wild when it would not finish a book", () => {
  const base = createHandFootMatch({ playerCount: 4 });
  const naturalNine = card("hand-nine", "hearts", 9);
  const wild = card("held-wild", "clubs", 2);
  const game = {
    ...base,
    phase: "playing",
    currentPlayerIndex: 0,
    turnStage: "play",
    players: base.players.map((player, index) => index === 0 ? { ...player, hand: [naturalNine, wild, card("discard", "clubs", 4)] } : player),
    teams: base.teams.map((team) => team.id === base.players[0].teamId
      ? { ...team, opened: true, melds: { 9: Array.from({ length: 4 }, (_, index) => card(`laid-nine-${index}`, "diamonds", 9, index)) } }
      : team),
  };

  assert.deepEqual(chooseHandFootBotPlay(game, 0), [naturalNine.id]);
});

test("a Hand and Foot computer uses a wild to finish a book when needed to reach its foot", () => {
  const base = createHandFootMatch({ playerCount: 4 });
  const naturalNine = card("hand-nine", "hearts", 9);
  const wild = card("held-wild", "clubs", 2);
  const discard = card("last-discard", "diamonds", 3);
  const game = {
    ...base,
    phase: "playing",
    currentPlayerIndex: 0,
    turnStage: "play",
    players: base.players.map((player, index) => index === 0 ? { ...player, hand: [naturalNine, wild, discard] } : player),
    teams: base.teams.map((team) => team.id === base.players[0].teamId
      ? { ...team, opened: true, melds: { 9: Array.from({ length: 5 }, (_, index) => card(`laid-nine-${index}`, "diamonds", 9, index)) } }
      : team),
  };

  assert.deepEqual(new Set(chooseHandFootBotPlay(game, 0)), new Set([naturalNine.id, wild.id]));
});

test("a Hand and Foot computer keeps a seven book clean when naturals can finish it", () => {
  const base = createHandFootMatch({ playerCount: 4 });
  const naturalSevens = [card("hand-seven-a", "hearts", 7), card("hand-seven-b", "spades", 7)];
  const wild = card("held-wild", "clubs", 2);
  const game = {
    ...base,
    phase: "playing",
    currentPlayerIndex: 0,
    turnStage: "play",
    players: base.players.map((player, index) => index === 0 ? { ...player, hand: [...naturalSevens, wild] } : player),
    teams: base.teams.map((team) => team.id === base.players[0].teamId
      ? { ...team, opened: true, melds: { 7: Array.from({ length: 5 }, (_, index) => card(`laid-seven-${index}`, "diamonds", 7, index)) } }
      : team),
  };

  assert.deepEqual(new Set(chooseHandFootBotPlay(game, 0)), new Set(naturalSevens.map((candidate) => candidate.id)));
});

test("a Hand and Foot computer dirties sevens only when it completes the book to finish the round", () => {
  const base = createHandFootMatch({ playerCount: 4 });
  const naturalSeven = card("foot-seven", "hearts", 7);
  const wild = card("foot-wild", "clubs", 2);
  const discard = card("foot-discard", "clubs", 4);
  const teammateId = base.teams[base.players[0].teamId].memberIds.find((id) => id !== 0);
  let game = {
    ...base,
    phase: "playing",
    currentPlayerIndex: 0,
    turnStage: "play",
    players: base.players.map((player, index) => {
      if (index === 0) return { ...player, hand: [], foot: [naturalSeven, wild, discard], usingFoot: true };
      if (index === teammateId) return { ...player, hand: [], foot: [card("teammate-four", "diamonds", 4)], usingFoot: true };
      return player;
    }),
    teams: base.teams.map((team) => team.id === base.players[0].teamId
      ? { ...team, opened: true, melds: { 7: Array.from({ length: 5 }, (_, index) => card(`laid-seven-${index}`, "diamonds", 7, index)) } }
      : team),
  };

  const playIds = chooseHandFootBotPlay(game, 0);
  assert.deepEqual(new Set(playIds), new Set([naturalSeven.id, wild.id]));
  game = playHandFootCards(game, 0, playIds);
  assert.equal(game.players[0].foot.length, 1);
  game = discardHandFootCard(game, 0, discard.id);
  assert.equal(game.phase, "round-over");
});

test("a Hand and Foot computer discards an isolated card instead of breaking a pair", () => {
  const base = createHandFootMatch({ playerCount: 4 });
  const game = {
    ...base,
    players: base.players.map((player, index) => index === 0 ? {
      ...player,
      hand: [card("eight-a", "clubs", 8), card("eight-b", "hearts", 8), card("four", "clubs", 4)],
    } : player),
  };
  assert.equal(chooseHandFootBotDiscard(game, 0).id, "four");
});

test("draw piles can be clicked one card at a time and drawing stops after two", () => {
  let game = createHandFootMatch({ playerCount: 4 });
  assert.equal(game.drawPiles.length, 2);
  const firstPileCount = game.drawPiles[0].length;
  const secondPileCount = game.drawPiles[1].length;

  game = drawHandFootCards(game, 0, 0, 1);
  assert.equal(game.players[0].hand.length, 14);
  assert.equal(game.drawPiles[0].length, firstPileCount - 1);
  assert.equal(game.drawPiles[1].length, secondPileCount);
  assert.equal(game.cardsDrawnThisTurn, 1);
  assert.equal(game.turnStage, "draw");

  game = drawHandFootCards(game, 0, 1, 1);
  assert.equal(game.players[0].hand.length, 15);
  assert.equal(game.drawPiles[1].length, secondPileCount - 1);
  assert.equal(game.cardsDrawnThisTurn, 2);
  assert.equal(game.turnStage, "play");
  assert.throws(() => drawHandFootCards(game, 0, 0, 1), /already drawn two|Draw before playing/i);
});

test("clicking a natural rank selects all matches while twos, jokers, and threes toggle alone", () => {
  const cards = [
    card("nine-clubs", "clubs", 9),
    card("nine-hearts", "hearts", 9),
    card("nine-spades", "spades", 9),
    card("five", "spades", 5),
    card("two-one", "clubs", 2),
    card("two-two", "hearts", 2),
    card("joker-one", null, "joker"),
    card("joker-two", null, "joker"),
    card("three-one", "clubs", 3),
    card("three-two", "diamonds", 3),
  ];

  let selected = toggleHandFootCardSelection(cards, [], "nine-clubs");
  assert.deepEqual(new Set(selected), new Set(["nine-clubs", "nine-hearts", "nine-spades"]));
  selected = toggleHandFootCardSelection(cards, selected, "nine-hearts");
  assert.deepEqual(selected, ["nine-hearts"]);
  selected = toggleHandFootCardSelection(cards, selected, "nine-hearts");
  assert.deepEqual(selected, []);

  selected = toggleHandFootCardSelection(cards, selected, "two-one");
  selected = toggleHandFootCardSelection(cards, selected, "joker-one");
  selected = toggleHandFootCardSelection(cards, selected, "three-one");
  assert.deepEqual(new Set(selected), new Set(["two-one", "joker-one", "three-one"]));
  assert.ok(!selected.includes("two-two"));
  assert.ok(!selected.includes("joker-two"));
  assert.ok(!selected.includes("three-two"));
});

test("an unplayed natural pair selects one card, but a laid pair selects together", () => {
  const cards = [card("eight-clubs", "clubs", 8), card("eight-hearts", "hearts", 8)];

  let selected = toggleHandFootCardSelection(cards, [], "eight-clubs", {});
  assert.deepEqual(selected, ["eight-clubs"]);
  selected = toggleHandFootCardSelection(cards, selected, "eight-hearts", {});
  assert.deepEqual(new Set(selected), new Set(["eight-clubs", "eight-hearts"]));

  selected = toggleHandFootCardSelection(cards, [], "eight-clubs", {
    8: [card("laid-eight-1", "diamonds", 8), card("laid-eight-2", "spades", 8), card("laid-eight-3", "clubs", 8)],
  });
  assert.deepEqual(new Set(selected), new Set(["eight-clubs", "eight-hearts"]));
});

test("an exhausted draw pile ends and scores the round without reshuffling discards", () => {
  let game = createHandFootMatch({ playerCount: 4 });
  const finalDrawCard = card("final-draw", "clubs", 5);
  const discards = [card("old-discard", "diamonds", 8), card("top-discard", "hearts", 10)];
  const expectedScores = game.teams.map((team) => scoreHandFootTeam(team, game.players));
  game = { ...game, drawPile: [finalDrawCard], discardPile: discards };

  const ended = drawHandFootCards(game, 0);

  assert.equal(ended.phase, "round-over");
  assert.equal(ended.roundSummary.endReason, "draw-pile-empty");
  assert.equal(ended.roundSummary.wentOutPlayerId, null);
  assert.deepEqual(ended.drawPile, [finalDrawCard]);
  assert.deepEqual(ended.discardPile, discards);
  assert.deepEqual(
    ended.roundSummary.breakdowns.map(({ teamId, ...breakdown }) => breakdown),
    expectedScores,
  );
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

test("a player can choose which existing pile receives a selected wild card", () => {
  let game = createHandFootMatch({ playerCount: 4 });
  const wild = card("chosen-wild", "clubs", 2);
  const eights = [card("8a", "clubs", 8), card("8b", "diamonds", 8), card("8c", "spades", 8)];
  const nines = [card("9a", "clubs", 9), card("9b", "diamonds", 9), card("9c", "spades", 9), card("9d", "hearts", 9)];
  game = {
    ...game,
    turnStage: "play",
    teams: game.teams.map((team, index) => index === 0
      ? { ...team, opened: true, melds: { 8: eights, 9: nines } }
      : team),
    players: game.players.map((player, index) => index === 0 ? { ...player, hand: [wild] } : player),
  };

  game = playHandFootCards(game, 0, [wild.id], "9");
  assert.equal(game.teams[0].melds[8].length, 3);
  assert.equal(game.teams[0].melds[9].length, 5);
  assert.equal(game.teams[0].melds[9].filter((candidate) => candidate.rank === 2).length, 1);
});

test("a target pile must retain more natural cards than wild cards", () => {
  let game = createHandFootMatch({ playerCount: 4 });
  const nextWild = card("next-wild", null, "joker");
  const existing = [card("8a", "clubs", 8), card("8b", "diamonds", 8), card("old-wild", "hearts", 2)];
  game = {
    ...game,
    turnStage: "play",
    teams: game.teams.map((team, index) => index === 0
      ? { ...team, opened: true, melds: { 8: existing } }
      : team),
    players: game.players.map((player, index) => index === 0 ? { ...player, hand: [nextWild] } : player),
  };

  assert.equal(canPlayHandFootCards(game, 0, [nextWild.id], "8"), false);
  assert.throws(() => playHandFootCards(game, 0, [nextWild.id], "8"), /more natural cards than wild cards/i);
});

test("threes cannot be melded and the last foot card may be discarded to go out", () => {
  let game = createHandFootMatch({ playerCount: 4 });
  const three = card("three", "clubs", 3);
  game = {
    ...game,
    turnStage: "play",
    players: game.players.map((player, index) => index === 0 ? { ...player, hand: [three] } : player),
  };
  assert.throws(() => playHandFootCards(game, 0, [three.id]), /Threes cannot be melded/);

  game.players[0] = { ...game.players[0], usingFoot: true, hand: [], foot: [three] };
  game.players[2] = { ...game.players[2], hand: [], foot: [card("safe", "clubs", 4)], usingFoot: true };
  game = discardHandFootCard(game, 0, three.id);
  assert.equal(game.phase, "round-over");
  assert.equal(game.players[0].foot.length, 0);
  assert.equal(game.discardPile.at(-1).id, three.id);
  assert.equal(game.roundSummary.wentOutPlayerId, 0);
});

test("a last-foot discard cannot bypass the teammate-three restriction", () => {
  let game = createHandFootMatch({ playerCount: 4 });
  const lastCard = card("last", "clubs", 9);
  game = {
    ...game,
    turnStage: "play",
    players: game.players.map((player, index) => {
      if (index === 0) return { ...player, hand: [], foot: [lastCard], usingFoot: true };
      if (index === 2) return { ...player, hand: [], foot: [card("blocker", "spades", 3)], usingFoot: true };
      return player;
    }),
  };

  assert.throws(() => discardHandFootCard(game, 0, lastCard.id), /teammate still holds a 3/i);
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
      if (index === 2) return { ...player, hand: [], foot: [card("blocker", "hearts", 3)], usingFoot: true };
      return player;
    }),
  };

  assert.throws(() => playHandFootCards(game, 0, sevens.map((candidate) => candidate.id)), /teammate still holds a 3/i);
});

test("a player cannot go out before their teammate reaches their foot", () => {
  let game = createHandFootMatch({ playerCount: 4 });
  const lastCard = card("last-card", "clubs", 9);
  game = {
    ...game,
    turnStage: "play",
    players: game.players.map((player, index) => {
      if (index === 0) return { ...player, hand: [], foot: [lastCard], usingFoot: true };
      if (index === 2) return { ...player, hand: [card("safe", "clubs", 4)], usingFoot: false };
      return player;
    }),
  };

  assert.throws(() => discardHandFootCard(game, 0, lastCard.id), /teammate has not reached their foot/i);
  game.teams[0] = {
    ...game.teams[0],
    opened: true,
    melds: { 9: [card("9a", "diamonds", 9), card("9b", "hearts", 9), card("9c", "spades", 9)] },
  };
  assert.throws(() => playHandFootCards(game, 0, [lastCard.id]), /teammate has not reached their foot/i);
});

test("a blocked player must keep two foot cards before discarding down to one", () => {
  let game = createHandFootMatch({ playerCount: 4 });
  const foot = [
    card("9-one", "clubs", 9),
    card("9-two", "diamonds", 9),
    card("9-three", "hearts", 9),
    card("discard", "spades", 6),
  ];
  game = {
    ...game,
    turnStage: "play",
    teams: game.teams.map((team, index) => index === 0
      ? { ...team, opened: true, melds: { 9: [card("laid-9a", "clubs", 9), card("laid-9b", "diamonds", 9), card("laid-9c", "spades", 9)] } }
      : team),
    players: game.players.map((player, index) => {
      if (index === 0) return { ...player, hand: [], foot, usingFoot: true };
      if (index === 2) return { ...player, usingFoot: false };
      return player;
    }),
  };

  const leavesOne = foot.slice(0, 3).map((candidate) => candidate.id);
  const leavesTwo = foot.slice(0, 2).map((candidate) => candidate.id);
  assert.equal(getHandFootGoOutBlockReason(game, 0), "your teammate has not reached their foot");
  assert.equal(canPlayHandFootCards(game, 0, leavesOne), false);
  assert.throws(() => playHandFootCards(game, 0, leavesOne), /Keep at least two cards in your foot/i);

  game = playHandFootCards(game, 0, leavesTwo);
  assert.equal(game.players[0].foot.length, 2);
  game = discardHandFootCard(game, 0, "discard");
  assert.equal(game.phase, "playing");
  assert.equal(game.players[0].foot.length, 1);
  assert.equal(game.currentPlayerIndex, 1);
});

test("a player's foot is sorted when their hand becomes empty", () => {
  let game = createHandFootMatch({ playerCount: 4 });
  const discard = card("discard", "clubs", 5);
  const unsortedFoot = [
    card("king", "spades", 13),
    card("four-hearts", "hearts", 4),
    card("four-clubs", "clubs", 4),
    card("ace", "diamonds", 14),
    card("nine", "clubs", 9),
  ];
  game = {
    ...game,
    turnStage: "play",
    players: game.players.map((player, index) => index === 0
      ? { ...player, hand: [discard], foot: unsortedFoot, usingFoot: false }
      : player),
  };

  game = discardHandFootCard(game, 0, discard.id);
  assert.equal(game.players[0].usingFoot, true);
  assert.deepEqual(game.players[0].foot.map((candidate) => candidate.id), ["four-clubs", "four-hearts", "nine", "king", "ace"]);
});

test("seven-card meld bonuses distinguish clean, dirty, wild, and seven books", () => {
  const naturals = Array.from({ length: 7 }, (_, index) => card(`n-${index}`, "clubs", 8, index));
  const dirty = [...naturals.slice(0, 6), card("wild", "hearts", 2)];
  const wilds = Array.from({ length: 7 }, (_, index) => card(`w-${index}`, index % 2 ? null : "hearts", index % 2 ? "joker" : 2, index));

  assert.equal(handFootMeldBonus("8", naturals), 500);
  assert.equal(handFootMeldBonus("8", dirty), 300);
  assert.equal(handFootMeldBonus("wild", wilds), 2500);
  const cleanSevens = naturals.map((candidate) => ({ ...candidate, rank: 7 }));
  assert.equal(handFootMeldBonus("7", cleanSevens), 3000);
  assert.equal(handFootMeldBonus("7", [...cleanSevens.slice(0, 6), card("seven-wild", "clubs", 2)]), 300);
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
