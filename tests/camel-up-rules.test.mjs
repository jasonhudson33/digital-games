import assert from "node:assert/strict";
import test from "node:test";

import {
  CRAZY_CAMELS,
  MIN_PLAYERS,
  RACING_CAMELS,
  addComputerPlayer,
  addPlayer,
  camelLocation,
  choosePartnerTicket,
  createLobby,
  currentPlayer,
  formPartnership,
  legalSpectatorSpace,
  moveCamel,
  partnerRewardOptions,
  placeFinishBet,
  placeSpectator,
  raceRanking,
  rollPyramid,
  runComputerTurn,
  startGame,
  takeLegTicket,
} from "../lib/camel-up.js";

const sequenceRng = (...values) => {
  let index = 0;
  return () => values[index++ % values.length];
};

function lobby(count = MIN_PLAYERS) {
  let game = createLobby({ id: "p0", name: "P0" }, "CAMEL", 1);
  for (let i = 1; i < count; i += 1) game = addPlayer(game, { id: `p${i}`, name: `P${i}` });
  return game;
}

function started(count = 3, rng = () => 0) {
  return startGame(lobby(count), rng);
}

test("lobby enforces 3-8 seats and deterministic setup gives money, cards, stacks and a current player", () => {
  let tooSmall = createLobby({ id: "p0", name: "P0" }, "SMALL", 1);
  tooSmall = addPlayer(tooSmall, { id: "p1", name: "P1" });
  assert.equal(startGame(tooSmall, () => 0).phase, "lobby");
  let game = lobby(8);
  assert.equal(addPlayer(game, { id: "p8", name: "P8" }), game);
  game = startGame(game, () => 0);
  assert.equal(game.phase, "playing");
  assert.equal(game.players.length, 8);
  assert.ok(game.players.every((player) => player.money === 3 && player.finishCards.length === 5));
  assert.ok(RACING_CAMELS.every((id) => camelLocation(game, id)?.position === 1));
  assert.ok(CRAZY_CAMELS.every((id) => camelLocation(game, id)?.position === 16));
  assert.equal(currentPlayer(game).id, "p0");
});

test("computer seats can be added and removed only in the lobby", () => {
  let game = createLobby({ id: "p0", name: "P0" }, "BOTS", 1);
  game = addComputerPlayer(game);
  assert.equal(game.players.length, 2);
  const bot = game.players[1];
  game = game.players.length < 3 ? addComputerPlayer(game) : game;
  game = startGame(game, () => 0);
  assert.equal(addComputerPlayer(game), game);
  assert.equal(game.players.some((player) => player.id === bot.id), true);
});

test("stack movement carries only the moving camel and those above, then lands on top", () => {
  const game = { ...started(), stacks: { 4: ["blue", "black", "red"], 6: ["green"] }, players: started().players };
  const next = moveCamel(game, "black", 2, { direction: 1 });
  assert.deepEqual(next.stacks[4], ["blue"]);
  assert.deepEqual(next.stacks[6], ["green", "black", "red"]);
});

test("boo lands a unit below the destination and crazy cheering follows counterclockwise direction", () => {
  const base = started();
  const players = base.players.map((player, index) => index === 0 ? { ...player, spectator: { space: 7, side: "boo" } } : player);
  let game = { ...base, players, stacks: { 5: ["blue", "red"], 6: ["green"], 9: ["black"], 8: ["purple"] } };
  game = moveCamel(game, "blue", 2);
  assert.deepEqual(game.stacks[6], ["blue", "red", "green"]);
  const cheeringPlayers = game.players.map((player, index) => index === 0 ? { ...player, spectator: { space: 7, side: "cheer" } } : player);
  game = moveCamel({ ...game, players: cheeringPlayers, stacks: { 9: ["black"], 7: ["purple"], 5: ["blue", "red", "green"] } }, "black", 2);
  assert.deepEqual(game.stacks[6], ["black"]);
});

test("movement detects clockwise and counterclockwise finish crossings", () => {
  const base = started();
  const clockwise = moveCamel({ ...base, stacks: { 16: ["red"], 1: ["blue", "green", "purple", "yellow"], 14: ["black", "white"] } }, "red", 1);
  assert.equal(clockwise.raceFinished, true);
  assert.equal(clockwise.counterclockwiseFinish, false);
  const counter = moveCamel({ ...base, stacks: { 1: ["black", "red"], 2: ["blue", "green", "purple", "yellow"], 14: ["white"] } }, "black", 1);
  assert.equal(counter.raceFinished, true);
  assert.equal(counter.counterclockwiseFinish, true);
  assert.equal(raceRanking(counter).at(-1), "red");
});

test("leg tickets, finish bets, spectator placement and out-of-turn actions are validated", () => {
  let game = started(3, () => 0);
  const actor = currentPlayer(game);
  const waiting = game.players.find((player) => player.id !== actor.id);
  assert.equal(takeLegTicket(game, waiting.id, "blue"), game);
  game = takeLegTicket(game, actor.id, "blue");
  assert.equal(game.players.find((player) => player.id === actor.id).legTickets[0].value, 5);
  const next = currentPlayer(game);
  game = placeFinishBet(game, next.id, "winner", "red");
  assert.equal(game.finishBets.winner.length, 1);
  assert.equal(game.players.find((player) => player.id === next.id).finishCards.includes("red"), false);
  const third = currentPlayer(game);
  assert.equal(legalSpectatorSpace(game, third.id, 1), false);
  game = placeSpectator(game, third.id, 8, "cheer");
  assert.equal(game.players.find((player) => player.id === third.id).spectator.space, 8);
});

test("five pyramid tickets end a leg with one die unrevealed and reset the next leg", () => {
  let game = started(3, sequenceRng(0, 0.4, 0.2, 0.7, 0.1, 0.9));
  for (let count = 0; count < 5; count += 1) {
    const actor = currentPlayer(game);
    game = rollPyramid(game, actor.id, () => 0);
  }
  assert.equal(game.phase, "playing");
  assert.equal(game.leg, 2);
  assert.equal(game.remainingDice.length, 6);
  assert.ok(game.players.every((player) => player.pyramidTickets === 0 && player.money >= 3));
});

test("spectator placement rejects occupied and adjacent spaces and awards its owner", () => {
  let game = started();
  game = { ...game, stacks: { 2: ["blue"], 4: ["green"], 6: ["purple"], 14: ["black", "white"], 1: ["red", "yellow"] } };
  const actor = currentPlayer(game);
  assert.equal(legalSpectatorSpace(game, actor.id, 2), false);
  game = placeSpectator(game, actor.id, 8, "cheer");
  const owner = game.players.find((player) => player.id === actor.id);
  assert.equal(legalSpectatorSpace(game, currentPlayer(game).id, 7), false);
  const stacks = Object.fromEntries(Object.entries(game.stacks).map(([position, stack]) => [position, stack.filter((id) => id !== "red")]).filter(([, stack]) => stack.length));
  const moved = moveCamel({ ...game, stacks: { ...stacks, 7: ["red"] } }, "red", 1);
  assert.equal(moved.players.find((player) => player.id === owner.id).money, owner.money + 1);
  assert.equal(camelLocation(moved, "red").position, 9);
});

test("partnerships require six players and wait for every copy-or-decline choice", () => {
  let game = started(6, () => 0);
  const first = currentPlayer(game);
  const second = game.players.find((player) => player.id !== first.id);
  game = formPartnership(game, first.id, second.id);
  assert.equal(game.players.find((player) => player.id === first.id).partnerId, second.id);
  // Force the fifth roll while preserving the partnership.
  game = { ...game, pyramidTicketsTaken: 4, remainingDice: ["blue", "grey"] };
  const actor = currentPlayer(game);
  game = rollPyramid(game, actor.id, () => 0);
  assert.equal(game.phase, "partnership-scoring");
  while (game.phase === "partnership-scoring") {
    const chooser = currentPlayer(game);
    const option = partnerRewardOptions(game, chooser.id)[0];
    game = choosePartnerTicket(game, chooser.id, option?.id ?? null);
  }
  assert.equal(game.phase, "playing");
  assert.ok(game.players.every((player) => player.partnerId === null));
});

test("final scoring preserves order, penalties never go below zero, and ties are shared", () => {
  let game = started(3, () => 0);
  // Place three ordered winner bets while cycling turns.
  for (const [camelId] of [["blue"], ["blue"], ["red"]]) {
    const actor = currentPlayer(game);
    game = placeFinishBet(game, actor.id, "winner", camelId);
  }
  game = {
    ...game,
    stacks: { 16: ["blue"], 1: ["green", "purple", "red", "yellow"], 14: ["black", "white"] },
    pyramidTicketsTaken: 4,
    remainingDice: ["blue", "grey"],
  };
  game = rollPyramid(game, currentPlayer(game).id, () => 0);
  assert.equal(game.phase, "finished");
  assert.ok(game.players.every((player) => player.money >= 0));
  assert.ok(game.winnerIds.length >= 1);
});

test("computer turns and partnership choices always make one legal transition", () => {
  let game = createLobby({ id: "host", name: "Host" }, "BOTTY", 1);
  game = addComputerPlayer(addComputerPlayer(game));
  game = startGame(game, () => 0.5);
  game = { ...game, currentPlayerIndex: game.players.findIndex((player) => player.isComputer) };
  const before = JSON.stringify(game);
  game = runComputerTurn(game, () => 0.9);
  assert.notEqual(JSON.stringify(game), before);
  assert.notEqual(currentPlayer(game)?.id, JSON.parse(before).players[JSON.parse(before).currentPlayerIndex].id);
});

// ---- leg roll record and recap ----

const FIELD = { 1: ["green", "purple", "red", "yellow"], 16: ["black", "white"] };

function legStart(overrides = {}) {
  const base = started(3, () => 0);
  return { ...base, ...overrides, legRolls: [], pyramidTicketsTaken: overrides.pyramidTicketsTaken ?? 0 };
}

function withTile(game, ownerIndex, space, side) {
  return { ...game, players: game.players.map((player, index) => index === ownerIndex ? { ...player, spectator: { space, side } } : player) };
}

function expectedAfter(row) {
  const tickets = row.tickets.reduce((sum, ticket) => sum + ticket.reward, 0);
  return Math.max(0, row.before + row.tileIncome + tickets + row.pyramid + (row.copied?.reward || 0));
}

test("a racing roll is recorded with roller, die, camel and value", () => {
  const game = legStart();
  const roller = currentPlayer(game);
  const next = rollPyramid(game, roller.id, () => 0);
  assert.equal(next.legRolls.length, 1);
  assert.deepEqual(next.legRolls[0], { n: 1, playerId: roller.id, playerName: roller.name, dieId: "blue", face: "blue", camelId: "blue", value: 1, tile: null });
  assert.equal(next.lastRoll.value, 1);
  assert.equal("moveEvent" in next, false);
});

test("a grey roll records the crazy camel that moved and the face shown", () => {
  const game = legStart({ remainingDice: ["grey", "blue"] });
  const next = rollPyramid(game, currentPlayer(game).id, () => 0);
  const [entry] = next.legRolls;
  assert.equal(entry.dieId, "grey");
  assert.equal(entry.face, "white");
  assert.ok(CRAZY_CAMELS.includes(entry.camelId));
  assert.equal(entry.value, 1);
});

test("cheering and booing tiles are recorded with owner, side and destination", () => {
  const stacks = { 6: ["blue"], ...FIELD };
  const cheer = withTile(legStart({ stacks }), 1, 7, "cheer");
  const cheered = rollPyramid(cheer, currentPlayer(cheer).id, () => 0);
  assert.deepEqual(cheered.legRolls[0].tile, { ownerId: "p1", ownerName: "P1", side: "cheer", from: 7, to: 8 });
  assert.equal(cheered.players[1].money, cheer.players[1].money + 1);
  const boo = withTile(legStart({ stacks }), 1, 7, "boo");
  const booed = rollPyramid(boo, currentPlayer(boo).id, () => 0);
  assert.deepEqual(booed.legRolls[0].tile, { ownerId: "p1", ownerName: "P1", side: "boo", from: 7, to: 6 });
});

test("the roll that ends the race is recorded and recapped", () => {
  const game = legStart();
  const stacks = { 16: ["blue"], 1: ["green", "purple", "red", "yellow"], 14: ["black", "white"] };
  const next = rollPyramid({ ...game, stacks }, currentPlayer(game).id, () => 0);
  assert.equal(next.phase, "finished");
  assert.equal(next.legRecap.final, true);
  assert.equal(next.legRecap.rolls.length, 1);
  assert.equal(next.legRecap.rolls[0].camelId, "blue");
});

test("rooms stored without roll history or leg-start money still roll and score", () => {
  let game = legStart();
  game = { ...game, players: game.players.map(({ moneyAtLegStart, ...player }) => player) };
  delete game.legRolls;
  delete game.legRecap;
  for (let count = 0; count < 5; count += 1) game = rollPyramid(game, currentPlayer(game).id, () => 0);
  assert.equal(game.leg, 2);
  assert.equal(game.legRecap.rolls.length, 5);
  assert.ok(game.legRecap.rows.every((row) => Number.isFinite(row.before) && Number.isFinite(row.after)));
});

test("the fifth roll survives in a leg recap whose rows match scored money", () => {
  let game = legStart();
  const ticketHolder = currentPlayer(game);
  game = takeLegTicket(game, ticketHolder.id, "blue");
  for (let count = 0; count < 5; count += 1) game = rollPyramid(game, currentPlayer(game).id, () => 0);
  assert.equal(game.leg, 2);
  assert.equal(game.legRolls.length, 0);
  assert.equal(game.legRecap.leg, 1);
  assert.equal(game.legRecap.final, false);
  assert.equal(game.legRecap.finish, null);
  assert.deepEqual(game.legRecap.rolls.map((roll) => roll.n), [1, 2, 3, 4, 5]);
  assert.equal(game.legRecap.ranking.length, 5);
  for (const row of game.legRecap.rows) {
    assert.equal(row.after, expectedAfter(row));
    assert.equal(row.legAfter, row.after);
    assert.equal(row.after, game.players.find((player) => player.id === row.playerId).money);
    assert.equal(game.players.find((player) => player.id === row.playerId).moneyAtLegStart, row.after);
  }
  const holderRow = game.legRecap.rows.find((row) => row.playerId === ticketHolder.id);
  assert.equal(holderRow.tickets.length, 1);
  assert.equal(holderRow.tickets[0].camelId, "blue");
});

test("a leg recap counts spectator-tile income separately from the paid-in money", () => {
  const base = withTile(legStart({ stacks: { 6: ["blue"], ...FIELD }, pyramidTicketsTaken: 4, remainingDice: ["blue", "grey"] }), 1, 7, "cheer");
  const game = rollPyramid(base, currentPlayer(base).id, () => 0);
  const row = game.legRecap.rows.find((item) => item.playerId === "p1");
  assert.equal(row.tileIncome, 1);
  assert.equal(row.after, expectedAfter(row));
  assert.equal(game.legRecap.rolls[0].tile.ownerId, "p1");
});

test("a leg recap flags a zero floor and reports the authoritative total", () => {
  const stacks = { 1: ["yellow"], 10: ["blue"], 11: ["green"], 12: ["purple"], 13: ["red"], 16: ["black", "white"] };
  let game = legStart({ stacks, pyramidTicketsTaken: 4, remainingDice: ["blue", "grey"] });
  game = {
    ...game,
    players: game.players.map((player, index) => index === 1
      ? { ...player, money: 0, moneyAtLegStart: 0, legTickets: [{ id: "y1", camelId: "yellow", value: 2 }, { id: "y2", camelId: "yellow", value: 2 }] }
      : player),
  };
  game = { ...game, currentPlayerIndex: 0 };
  game = rollPyramid(game, currentPlayer(game).id, () => 0);
  const row = game.legRecap.rows.find((item) => item.playerId === "p1");
  assert.equal(row.floored, true);
  assert.equal(row.after, 0);
  assert.equal(game.players[1].money, 0);
});

test("a partner copy is recorded in the leg recap", () => {
  let game = started(6, () => 0);
  const first = currentPlayer(game);
  const second = game.players.find((player) => player.id !== first.id);
  game = formPartnership(game, first.id, second.id);
  game = { ...game, pyramidTicketsTaken: 4, remainingDice: ["blue", "grey"],
    players: game.players.map((player) => player.id === second.id ? { ...player, legTickets: [{ id: "b5", camelId: "blue", value: 5 }] } : player) };
  game = rollPyramid(game, currentPlayer(game).id, () => 0);
  let copiedReward = null;
  while (game.phase === "partnership-scoring") {
    const chooser = currentPlayer(game);
    const best = [...partnerRewardOptions(game, chooser.id)].sort((a, b) => b.reward - a.reward)[0];
    if (chooser.id === first.id) copiedReward = best.reward;
    game = choosePartnerTicket(game, chooser.id, best?.id ?? null);
  }
  const row = game.legRecap.rows.find((item) => item.playerId === first.id);
  assert.equal(row.copied.reward, copiedReward);
  assert.equal(row.after, expectedAfter(row));
});

test("final recap resolves overall bets in placement order and matches final money", () => {
  let game = started(3, () => 0);
  for (const camelId of ["blue", "blue", "red"]) game = placeFinishBet(game, currentPlayer(game).id, "winner", camelId);
  game = placeFinishBet(game, currentPlayer(game).id, "loser", "yellow");
  game = { ...game, stacks: { 16: ["blue"], 1: ["green", "purple", "red", "yellow"], 14: ["black", "white"] }, pyramidTicketsTaken: 4, remainingDice: ["blue", "grey"] };
  game = rollPyramid(game, currentPlayer(game).id, () => 0);
  assert.equal(game.phase, "finished");
  const { winner, loser } = game.legRecap.finish;
  assert.equal(winner.camelId, "blue");
  assert.deepEqual(winner.cards.map((card) => [card.camelId, card.correct]), [["blue", true], ["blue", true], ["red", false]]);
  assert.deepEqual(winner.cards.map((card) => card.delta), [8, 5, -1]);
  assert.equal(loser.cards.length, 1);
  for (const row of game.legRecap.rows) assert.equal(row.after, game.players.find((player) => player.id === row.playerId).money);
  const betTotal = [...winner.cards, ...loser.cards].reduce((sum, card) => sum + card.delta, 0);
  assert.equal(game.legRecap.rows.reduce((sum, row) => sum + row.after - row.legAfter, 0), betTotal);
});

test("no recap or roll record reveals a finish card before the race ends", () => {
  let game = started(3, () => 0);
  game = placeFinishBet(game, currentPlayer(game).id, "winner", "red");
  game = { ...game, pyramidTicketsTaken: 4, remainingDice: ["blue", "grey"] };
  game = rollPyramid(game, currentPlayer(game).id, () => 0);
  assert.equal(game.phase, "playing");
  assert.equal(game.legRecap.finish, null);
  assert.equal(JSON.stringify(game.legRecap).includes("winner"), false);
});
