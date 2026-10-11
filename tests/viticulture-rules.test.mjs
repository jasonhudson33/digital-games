import assert from "node:assert/strict";
import test from "node:test";

import {
  addComputerPlayer,
  canFillOrder,
  chooseWakeUp,
  createLobby,
  bonusOpen,
  currentPlayer,
  decide,
  passSeason,
  runComputerTurn,
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

// Autumn waits for the human, so winter needs their choice too.
function intoWinter(game, colour = "winter") {
  assert.equal(game.season, "autumn");
  return decide(game, "p1", colour);
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
  game = intoWinter(game);
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
  assert.equal(game.season, "autumn");
  game = intoWinter(game);
  assert.equal(game.season, "winter");
  assert.deepEqual(game.passedSeason, []);
  assert.equal(game.players[0].cards.summer.length + game.players[0].cards.winter.length, 3);
});

test("filling an order consumes qualifying wine and awards VP and income", () => {
  let game = enterSummer(startedGame());
  game = passSeason(game, "p1");
  game = passSeason(game, "p2");
  game = intoWinter(game);
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

/* ── Phases, decisions, events (rework-viticulture-flow) ─────────────────── */

const intoAutumn = () => passSeason(passSeason(enterSummer(startedGame()), "p1"), "p2");
const eventsSince = (before, after) => after.events.filter((event) => event.seq > before.eventSeq);

test("summer ends in autumn, and autumn waits on the human but not on the computer", () => {
  const game = intoAutumn();
  assert.equal(game.season, "autumn");
  assert.deepEqual(game.pending.waitingOn, ["p1"]);
  const before = game.players[1].cards.summer.length + game.players[1].cards.winter.length;
  assert.equal(before, 3, "the computer already drew its autumn visitor");
});

test("nothing advances while a decision is pending", () => {
  const game = intoAutumn();
  assert.equal(takeAction(game, "p1", "tour"), game);
  assert.equal(passSeason(game, "p1"), game);
  assert.equal(chooseWakeUp(game, "p1", 3), game);
});

test("only the seat the decision waits on may decide, with a real choice", () => {
  const game = intoAutumn();
  assert.equal(decide(game, "p2", "winter"), game, "the computer's seat is not waiting");
  assert.equal(decide(game, "p1", "spring"), game, "not a colour");
  assert.equal(decide(game, "stranger", "winter"), game);
});

test("a player without a Cottage draws one visitor of the colour they choose", () => {
  const game = intoAutumn();
  const before = game.players[0].cards;
  const after = decide(game, "p1", "winter").players[0].cards;
  assert.equal(after.winter.length, before.winter.length + 1);
  assert.equal(after.summer.length, before.summer.length);
});

test("a Cottage owner draws one of each colour and keeps one", () => {
  let game = enterSummer(startedGame());
  game = { ...game, players: game.players.map((player) => player.id === "p1" ? { ...player, structures: ["cottage"] } : player) };
  game = passSeason(passSeason(game, "p1"), "p2");
  const held = game.players[0].cards;
  assert.ok(game.pending.stash.p1.summer && game.pending.stash.p1.winter, "both are drawn and held aside");
  const decided = decide(game, "p1", "summer");
  const after = decided.players[0].cards;
  assert.equal(after.summer.length, held.summer.length + 1);
  assert.equal(after.winter.length, held.winter.length);
  assert.equal(decided.discard.winter.length, game.discard.winter.length + 1, "the other is discarded");
  assert.equal(decided.season, "winter");
});

test("the computer decides at once, so a game of only computers never stalls in autumn", () => {
  let game = createLobby(host, "GRAPE", 1);
  game = addComputerPlayer(game, { id: "b1", name: "Luca" });
  game = addComputerPlayer(game, { id: "b2", name: "Enzo" });
  game = { ...game, players: game.players.map((player) => ({ ...player, isComputer: true })) };
  game = startGame(game, fixedRandom);
  for (let step = 0; step < 400 && game.phase === "playing"; step += 1) game = runComputerTurn(game);
  assert.equal(game.pending, null);
  assert.ok(game.year > 1 || game.phase === "finished");
});

test("every action records ordered events and writes its log line from them", () => {
  const before = enterSummer(startedGame());
  const after = takeAction(before, "p1", "tour");
  const events = eventsSince(before, after);
  assert.deepEqual(events.map((event) => event.type), ["worker-placed", "coins"]);
  assert.ok(events.every((event, index) => index === 0 || event.seq === events[index - 1].seq + 1), "sequence numbers increase by one");
  assert.equal(events[1].delta, 3);
  assert.equal(after.log[0], "Ada gained 3 coins at Give tour.");
});

test("events name no card: a draw is a deck and a count", () => {
  const before = enterSummer(startedGame());
  const after = takeAction(before, "p1", "draw-vine");
  const drawn = eventsSince(before, after).find((event) => event.type === "cards-drawn");
  assert.deepEqual({ deck: drawn.deck, count: drawn.count }, { deck: "vines", count: 2 });
  assert.equal(JSON.stringify(drawn).includes("uid"), false);
});

test("the bonus a space shows is the bonus placing a worker gives", () => {
  const game = enterSummer(startedGame());
  assert.equal(bonusOpen(game, "tour"), true);
  const placed = takeAction(game, "p1", "tour");
  assert.equal(placed.placements.tour[0].bonus, true);
  assert.equal(bonusOpen(placed, "tour"), false, "a two-player space has one worker slot");
  assert.equal(takeAction(placed, "p2", "tour").placements.tour.length, 1, "and it cannot be taken again");
});

test("year end is one step to the next spring, with a recap", () => {
  let game = intoWinter(intoAutumn());
  game = { ...game, players: game.players.map((player) => ({ ...player, residualIncome: 2, wines: { ...player.wines, red: [4] } })) };
  const coins = game.players.map((player) => player.coins);
  game = passSeason(passSeason(game, game.turnOrder[0]), game.turnOrder[1]);
  assert.equal(game.season, "spring");
  assert.equal(game.year, 2);
  assert.equal(game.pending, null);
  assert.equal(game.yearRecap.year, 1);
  game.yearRecap.players.forEach((entry, index) => {
    assert.equal(entry.income, 2);
    assert.deepEqual(entry.wines.after.red, [5]);
    assert.equal(game.players[index].coins, coins[index] + 2);
  });
  assert.ok(game.events.some((event) => event.type === "year-ended"));
});

test("reaching 20 VP at year end finishes the game instead of starting another year", () => {
  let game = intoWinter(intoAutumn());
  game = { ...game, players: game.players.map((player) => player.id === "p1" ? { ...player, score: 20 } : player) };
  game = passSeason(passSeason(game, game.turnOrder[0]), game.turnOrder[1]);
  assert.equal(game.phase, "finished");
  assert.deepEqual(game.winners, ["p1"]);
  assert.ok(game.yearRecap);
});

test("the event list is capped, and rooms saved before events existed still play", () => {
  let game = enterSummer(startedGame());
  const old = { ...game };
  delete old.events; delete old.eventSeq; delete old.pending; delete old.yearRecap; delete old.yearStartScores;
  const after = takeAction(old, "p1", "tour");
  assert.equal(after.eventSeq, 2);
  const crowded = { ...game, events: Array.from({ length: 80 }, (_, index) => ({ seq: index + 1, type: "coins" })), eventSeq: 80 };
  assert.equal(takeAction(crowded, "p1", "tour").events.length <= 60, true);
});
