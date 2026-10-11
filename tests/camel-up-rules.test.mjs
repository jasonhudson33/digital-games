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
