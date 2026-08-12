import test from "node:test";
import assert from "node:assert/strict";
import {
  DESTINATIONS,
  ROUTES,
  addComputerPlayer,
  addPlayer,
  chooseOpeningDestinations,
  claimRoute,
  createLobby,
  createTrainDeck,
  drawTrainCard,
  finishGame,
  hasConnection,
  isRouteAvailable,
  longestRouteLength,
  removeComputerPlayer,
  runComputerTurn,
  startGame,
  validPaymentColors,
} from "../lib/ticket-to-ride.js";

const player = (id, name) => ({ id, name });

function startedGame() {
  const lobby = addPlayer(createLobby(player("p1", "Avery"), "TRAIN", 1), player("p2", "Blake"));
  return startGame(lobby, () => 0.37);
}

test("train deck contains twelve of every color and fourteen locomotives", () => {
  const deck = createTrainDeck(() => 0.5);
  assert.equal(deck.length, 110);
  assert.equal(deck.filter((card) => card.color === "red").length, 12);
  assert.equal(deck.filter((card) => card.color === "locomotive").length, 14);
});

test("a room supports five travelers but no sixth", () => {
  let lobby = createLobby(player("p1", "One"), "TRAIN", 1);
  for (let index = 2; index <= 5; index += 1) lobby = addPlayer(lobby, player(`p${index}`, `Player ${index}`));
  assert.equal(lobby.players.length, 5);
  assert.equal(addPlayer(lobby, player("p6", "Six")), lobby);
});

test("the host can add and remove computer players in the lobby", () => {
  const lobby = createLobby(player("p1", "One"), "BOTS", 1);
  const withComputer = addComputerPlayer(lobby, { id: "bot-1", name: "Computer Casey" });
  assert.equal(withComputer.players.length, 2);
  assert.equal(withComputer.players[1].isComputer, true);
  assert.equal(withComputer.players[1].name, "Computer Casey");
  assert.notEqual(withComputer.players[0].color, withComputer.players[1].color);

  const withoutComputer = removeComputerPlayer(withComputer, "bot-1");
  assert.equal(withoutComputer.players.length, 1);
  assert.equal(removeComputerPlayer(withComputer, "p1"), withComputer);
});

test("computer players choose two opening destinations automatically", () => {
  const lobby = addComputerPlayer(createLobby(player("p1", "Avery"), "BOTTY", 1), { id: "bot-1" });
  const game = startGame(lobby, () => 0.37);
  const afterComputer = runComputerTurn(game, () => 0.2);
  const computer = afterComputer.players.find((item) => item.id === "bot-1");
  assert.equal(computer.pendingDestinations.length, 0);
  assert.equal(computer.destinations.length, 2);
  assert.equal(afterComputer.phase, "choosing-destinations");
});

test("every player starts with four train cards and three destination choices", () => {
  const game = startedGame();
  assert.equal(game.phase, "choosing-destinations");
  assert.ok(game.players.every((item) => item.cards.length === 4));
  assert.ok(game.players.every((item) => item.pendingDestinations.length === 3));
  assert.equal(game.faceUp.length, 5);
});

test("players must keep at least two opening destinations", () => {
  const game = startedGame();
  const first = game.players[0];
  assert.equal(chooseOpeningDestinations(game, first.id, [first.pendingDestinations[0].id]), game);
  const afterFirst = chooseOpeningDestinations(game, first.id, first.pendingDestinations.slice(0, 2).map((item) => item.id));
  assert.equal(afterFirst.players[0].destinations.length, 2);
  assert.equal(afterFirst.phase, "choosing-destinations");
  const second = afterFirst.players[1];
  const ready = chooseOpeningDestinations(afterFirst, second.id, second.pendingDestinations.slice(0, 2).map((item) => item.id));
  assert.equal(ready.phase, "playing");
});

test("claiming a route spends matching cards and locomotives, scores, and advances turn", () => {
  const base = startedGame();
  const game = {
    ...base,
    phase: "playing",
    players: base.players.map((item) => item.id === "p1" ? {
      ...item,
      cards: [{ id: "r1", color: "red" }, { id: "r2", color: "red" }, { id: "wild", color: "locomotive" }],
    } : item),
  };
  const route = ROUTES.find((item) => item.color === "red" && item.length === 3);
  assert.deepEqual(validPaymentColors(game, "p1", route.id), ["red"]);
  const next = claimRoute(game, "p1", route.id, "red");
  assert.equal(next.claimedRoutes[route.id], "p1");
  assert.equal(next.players[0].cards.length, 0);
  assert.equal(next.players[0].trains, 42);
  assert.equal(next.players[0].score, 4);
  assert.equal(next.currentPlayerIndex, 1);
});

test("parallel routes follow the two-player and four-player claiming rules", () => {
  const firstLane = ROUTES.find((item) => item.id === "vancouver-seattle");
  const secondLane = ROUTES.find((item) => item.id === "vancouver-seattle-2");
  assert.equal(firstLane.parallelGroup, secondLane.parallelGroup);
  assert.deepEqual([firstLane.lane, secondLane.lane], [-1, 1]);

  const twoPlayer = { ...startedGame(), claimedRoutes: { [firstLane.id]: "p1" } };
  assert.equal(isRouteAvailable(twoPlayer, "p2", secondLane.id), false);

  let lobby = createLobby(player("p1", "One"), "FOUR", 1);
  lobby = addPlayer(lobby, player("p2", "Two"));
  lobby = addPlayer(lobby, player("p3", "Three"));
  lobby = addPlayer(lobby, player("p4", "Four"));
  const fourPlayer = { ...startGame(lobby, () => 0.3), claimedRoutes: { [firstLane.id]: "p1" } };
  assert.equal(isRouteAvailable(fourPlayer, "p2", secondLane.id), true);
  assert.equal(isRouteAvailable(fourPlayer, "p1", secondLane.id), false);
});

test("Portland–San Francisco has two lanes but only one can be used with three players", () => {
  const greenLane = ROUTES.find((item) => item.id === "portland-san-francisco");
  const purpleLane = ROUTES.find((item) => item.id === "portland-san-francisco-purple");
  assert.deepEqual(
    [greenLane.color, greenLane.length, greenLane.lane],
    ["green", 5, -1],
  );
  assert.deepEqual(
    [purpleLane.color, purpleLane.length, purpleLane.lane],
    ["purple", 5, 1],
  );
  assert.equal(greenLane.parallelGroup, purpleLane.parallelGroup);

  let lobby = createLobby(player("p1", "One"), "THREE", 1);
  lobby = addPlayer(lobby, player("p2", "Two"));
  lobby = addPlayer(lobby, player("p3", "Three"));
  const threePlayer = {
    ...startGame(lobby, () => 0.3),
    claimedRoutes: { [greenLane.id]: "p1" },
  };
  assert.equal(isRouteAvailable(threePlayer, "p2", purpleLane.id), false);
  assert.equal(isRouteAvailable(threePlayer, "p3", purpleLane.id), false);
});

test("the board uses the classic central and southeastern junction cities", () => {
  const routeIds = new Set(ROUTES.map((item) => item.id));
  for (const id of [
    "kansas-city-saint-louis",
    "oklahoma-little-rock",
    "little-rock-new-orleans",
    "washington-raleigh",
    "raleigh-charleston",
    "charleston-miami",
  ]) assert.equal(routeIds.has(id), true, `${id} should be on the board`);

  for (const retiredId of [
    "kansas-city-nashville",
    "oklahoma-nashville",
    "atlanta-washington",
    "washington-miami",
  ]) assert.equal(routeIds.has(retiredId), false, `${retiredId} should not cut across the board`);
});

test("drawing two cards ends the turn", () => {
  const base = startedGame();
  const game = { ...base, phase: "playing" };
  const once = drawTrainCard(game, "p1", "deck", () => 0.4);
  assert.equal(once.currentPlayerIndex, 0);
  assert.equal(once.drawsThisTurn, 1);
  const twice = drawTrainCard(once, "p1", "deck", () => 0.4);
  assert.equal(twice.currentPlayerIndex, 1);
  assert.equal(twice.drawsThisTurn, 0);
  assert.equal(twice.players[0].cards.length, 6);
});

test("a computer takes legal card draws and finishes its turn", () => {
  const lobby = addComputerPlayer(createLobby(player("p1", "Avery"), "BOTTY", 1), { id: "bot-1" });
  const base = startGame(lobby, () => 0.37);
  const game = {
    ...base,
    phase: "playing",
    currentPlayerIndex: 1,
    faceUp: [
      { id: "face-red", color: "red" },
      { id: "face-blue", color: "blue" },
      { id: "face-green", color: "green" },
      { id: "face-yellow", color: "yellow" },
      { id: "face-black", color: "black" },
    ],
    players: base.players.map((item) => item.id === "bot-1" ? { ...item, cards: [], pendingDestinations: [] } : item),
  };
  const once = runComputerTurn(game, () => 0.2);
  assert.equal(once.currentPlayerIndex, 1);
  assert.equal(once.drawsThisTurn, 1);
  const twice = runComputerTurn(once, () => 0.2);
  assert.equal(twice.currentPlayerIndex, 0);
  assert.equal(twice.drawsThisTurn, 0);
  assert.equal(twice.players[1].cards.length, 2);
});

test("a computer claims an available route when it can pay", () => {
  const lobby = addComputerPlayer(createLobby(player("p1", "Avery"), "BOTTY", 1), { id: "bot-1" });
  const base = startGame(lobby, () => 0.37);
  const game = {
    ...base,
    phase: "playing",
    currentPlayerIndex: 1,
    players: base.players.map((item) => item.id === "bot-1" ? {
      ...item,
      cards: [{ id: "r1", color: "red" }, { id: "r2", color: "red" }, { id: "r3", color: "red" }],
      pendingDestinations: [],
    } : item),
  };
  const next = runComputerTurn(game, () => 0.2);
  const claimed = Object.entries(next.claimedRoutes).filter(([, owner]) => owner === "bot-1");
  assert.equal(claimed.length, 1);
  assert.equal(next.currentPlayerIndex, 0);
  assert.ok(next.players[1].cards.length < 3);
});

test("a blind draw recycles the discard pile when the train deck is empty", () => {
  const base = startedGame();
  const game = {
    ...base,
    phase: "playing",
    trainDeck: [],
    trainDiscard: [{ id: "recycled-red", color: "red" }],
  };
  const next = drawTrainCard(game, "p1", "deck", () => 0.2);
  assert.ok(next.players[0].cards.some((card) => card.id === "recycled-red"));
  assert.equal(next.trainDiscard.length, 0);
});

test("connected claimed routes complete a destination and count toward longest route", () => {
  const base = startedGame();
  const first = ROUTES.find((route) => route.id === "vancouver-seattle");
  const second = ROUTES.find((route) => route.id === "seattle-portland");
  const game = { ...base, claimedRoutes: { [first.id]: "p1", [second.id]: "p1" } };
  assert.equal(hasConnection(game, "p1", "vancouver", "portland"), true);
  assert.equal(hasConnection(game, "p2", "vancouver", "portland"), false);
  assert.equal(longestRouteLength(game, "p1"), 2);
});

test("final scoring adds completed tickets, subtracts unfinished tickets, and awards longest railway", () => {
  const base = startedGame();
  const completed = DESTINATIONS.find((item) => item.from === "denver" && item.to === "elPaso");
  const unfinished = DESTINATIONS.find((item) => item.id === "la-ny");
  const routeIds = ["denver-santa-fe", "santa-fe-el-paso"];
  const game = {
    ...base,
    phase: "playing",
    claimedRoutes: Object.fromEntries(routeIds.map((id) => [id, "p1"])),
    players: base.players.map((item) => item.id === "p1" ? { ...item, score: 3, destinations: [completed, unfinished] } : { ...item, destinations: [] }),
  };
  const finished = finishGame(game);
  const score = finished.finalScores.find((item) => item.playerId === "p1");
  assert.equal(score.ticketScore, completed.points - unfinished.points);
  assert.equal(score.longestBonus, 10);
  assert.equal(finished.phase, "finished");
});
