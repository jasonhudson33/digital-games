import assert from "node:assert/strict";
import test from "node:test";

import {
  addComputerPlayer,
  canFillOrder,
  chooseWakeUp,
  createLobby,
  currentPlayer,
  passSeason,
  startGame,
  takeAction,
  wineOptions,
} from "../lib/viticulture.js";

const host = { id: "p1", name: "Ada" };
const fixedRandom = () => 0;

function startedGame() {
  let game = createLobby(host, "GRAPE", 1);
  game = addComputerPlayer(game, { id: "p2", name: "Luca" });
  return startGame(game, fixedRandom);
}

function enterSummer(game) {
  game = chooseWakeUp(game, "p1", 1);
  game = chooseWakeUp(game, "p2", 2);
  return game;
}

test("creates a serializable two-player room and deals private cards", () => {
  const game = startedGame();
  assert.equal(game.phase, "playing");
  assert.equal(game.season, "spring");
  assert.equal(game.players.length, 2);
  assert.equal(game.players[0].cards.vines.length, 3);
  assert.doesNotThrow(() => JSON.stringify(game));
});

test("wake-up rows are unique and define summer order", () => {
  let game = startedGame();
  game = chooseWakeUp(game, "p1", 4);
  const unchanged = chooseWakeUp(game, "p2", 4);
  assert.equal(unchanged, game);
  game = chooseWakeUp(game, "p2", 2);
  assert.equal(game.season, "summer");
  assert.deepEqual(game.turnOrder, ["p2", "p1"]);
  assert.equal(currentPlayer(game).id, "p2");
});

test("placing a worker resolves an action and advances turn", () => {
  let game = enterSummer(startedGame());
  const before = game.players[0].coins;
  game = takeAction(game, "p1", "tour");
  assert.equal(game.players[0].coins, before + 3);
  assert.equal(game.players[0].regularAvailable, 1);
  assert.equal(currentPlayer(game).id, "p2");
  assert.equal(game.placements.tour.length, 1);
});

test("a grande worker may use a full action", () => {
  let game = enterSummer(startedGame());
  game = takeAction(game, "p1", "tour");
  game = takeAction(game, "p2", "draw-vine");
  assert.equal(currentPlayer(game).id, "p1");
  game = takeAction(game, "p1", "tour", {}, "grande");
  assert.equal(game.placements.tour.length, 2);
  assert.equal(game.players[0].grandeAvailable, false);
});

test("plant, harvest, make wine, and fill an order", () => {
  let game = enterSummer(startedGame());
  const player = game.players[0];
  const vine = player.cards.vines.find((card) => !card.requirement);
  game = takeAction(game, "p1", "plant", { cardId: vine.uid, fieldId: "field-5" });
  game = passSeason(game, "p2");
  game = passSeason(game, "p1");
  assert.equal(game.season, "winter");
  game = takeAction(game, "p1", "harvest", { fieldId: "field-5" }, "grande");
  const vintner = game.players[0];
  assert.ok(vintner.grapes.red.length + vintner.grapes.white.length > 0);

  const option = wineOptions(vintner)[0];
  game = { ...game, turnCursor: game.turnOrder.indexOf("p1"), players: game.players.map((item) => item.id === "p1" ? { ...item, regularAvailable: 1 } : item) };
  game = takeAction(game, "p1", "make-wine", { optionId: option.id });
  assert.ok(Object.values(game.players[0].wines).flat().length > 0);

  const made = game.players[0];
  const matchingOrder = made.cards.orders.find((card) => canFillOrder(made, card));
  if (matchingOrder) {
    game = { ...game, turnCursor: game.turnOrder.indexOf("p1"), players: game.players.map((item) => item.id === "p1" ? { ...item, regularAvailable: 1 } : item) };
    const score = game.players[0].score;
    game = takeAction(game, "p1", "fill-order", { orderId: matchingOrder.uid });
    assert.ok(game.players[0].score > score);
  }
});

test("passing moves summer through autumn into winter", () => {
  let game = enterSummer(startedGame());
  game = passSeason(game, "p1");
  game = passSeason(game, "p2");
  assert.equal(game.season, "winter");
  assert.deepEqual(game.passedSeason, []);
  assert.equal(game.players[0].cards.summer.length + game.players[0].cards.winter.length, 3);
});

test("filling an order consumes qualifying wine and awards VP and income", () => {
  let game = enterSummer(startedGame());
  game = passSeason(game, "p1");
  game = passSeason(game, "p2");
  const order = game.players[0].cards.orders[0];
  const wines = { red: [], white: [], rose: [], sparkling: [] };
  for (const requirement of order.requirements) wines[requirement.type] = [requirement.min];
  game = {
    ...game,
    turnCursor: game.turnOrder.indexOf("p1"),
    players: game.players.map((player) => player.id === "p1" ? { ...player, wines } : player),
  };
  const before = game.players[0];
  game = takeAction(game, "p1", "fill-order", { orderId: order.uid });
  const after = game.players[0];
  assert.equal(after.score, before.score + order.vp + 1);
  assert.equal(after.residualIncome, order.income);
  assert.equal(after.cards.orders.length, before.cards.orders.length - 1);
});
