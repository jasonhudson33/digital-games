import test from "node:test";
import assert from "node:assert/strict";
import {
  BASE_CARD_IDS,
  KINGDOM_CARD_IDS,
  MAX_PLAYERS,
  addComputerPlayer,
  addPlayer,
  advanceToBuy,
  buyCard,
  computerPlayerToAct,
  createLobby,
  currentPlayer,
  endTurn,
  emptyPileLimit,
  playAction,
  resolveChoice,
  runComputerTurn,
  scorePlayer,
  startGame,
} from "../lib/dominion.js";

const person = (id, name) => ({ id, name });

function lobbyWith(count = 2) {
  let room = createLobby(person("p1", "Avery"), "REALM", 1);
  for (let index = 2; index <= count; index += 1) room = addPlayer(room, person(`p${index}`, `Player ${index}`));
  return room;
}

function gameWith(count = 2) {
  return startGame(lobbyWith(count), () => 0);
}

function activeAs(game, playerIndex = 0) {
  return { ...game, currentPlayerIndex: playerIndex, players: game.players.map((player, index) => ({ ...player, actions: index === playerIndex ? 1 : 0, buys: index === playerIndex ? 1 : 0 })) };
}

test("rooms seat up to six monarchs and support computer players", () => {
  let lobby = lobbyWith(MAX_PLAYERS);
  assert.equal(lobby.players.length, 6);
  assert.equal(addPlayer(lobby, person("p7", "Seven")), lobby);
  const solo = createLobby(person("solo", "Solo"), "ONE");
  assert.equal(startGame(solo), solo);
  let bots = createLobby(person("host", "Host"), "BOTS");
  for (let index = 1; index < MAX_PLAYERS; index += 1) bots = addComputerPlayer(bots, { id: `bot-${index}`, name: `Bot ${index}` });
  assert.equal(bots.players.length, 6);
  assert.ok(bots.players.slice(1).every((player) => player.isComputer));
  assert.equal(addComputerPlayer(bots), bots);
  assert.equal(startGame(bots, () => 0).phase, "playing");
});

test("setup deals seven Coppers, three Estates, and the official first-game supply", () => {
  const game = gameWith(2);
  assert.deepEqual(game.kingdom, KINGDOM_CARD_IDS);
  assert.deepEqual(Object.keys(game.supply), [...BASE_CARD_IDS, ...KINGDOM_CARD_IDS]);
  for (const player of game.players) {
    const cards = [...player.hand, ...player.deck];
    assert.equal(cards.filter((id) => id === "copper").length, 7);
    assert.equal(cards.filter((id) => id === "estate").length, 3);
    assert.equal(player.hand.length, 5);
  }
  assert.equal(game.supply.province, 8);
  assert.equal(game.supply.curse, 10);
  assert.ok(KINGDOM_CARD_IDS.every((id) => game.supply[id] === 10));
});

test("the Base Cards expansion provides the official five- and six-player supplies", () => {
  const fivePlayer = gameWith(5);
  assert.deepEqual(
    Object.fromEntries(BASE_CARD_IDS.map((id) => [id, fivePlayer.supply[id]])),
    { copper: 85, silver: 80, gold: 60, estate: 12, duchy: 12, province: 15, curse: 40 },
  );
  assert.equal(emptyPileLimit(fivePlayer), 4);

  const sixPlayer = gameWith(6);
  assert.deepEqual(
    Object.fromEntries(BASE_CARD_IDS.map((id) => [id, sixPlayer.supply[id]])),
    { copper: 78, silver: 80, gold: 60, estate: 12, duchy: 12, province: 18, curse: 50 },
  );
  assert.equal(emptyPileLimit(sixPlayer), 4);
});

test("Village draws a card and leaves two actions after being played", () => {
  const base = activeAs(gameWith(2));
  const game = { ...base, players: base.players.map((player, index) => index === 0 ? { ...player, hand: ["village"], deck: ["copper"] } : player) };
  const next = playAction(game, "p1", 0, () => 0);
  assert.deepEqual(next.players[0].hand, ["copper"]);
  assert.deepEqual(next.players[0].inPlay, ["village"]);
  assert.equal(next.players[0].actions, 2);
});

test("Cellar discards selected cards and draws the same number", () => {
  const base = activeAs(gameWith(2));
  const game = { ...base, players: base.players.map((player, index) => index === 0 ? { ...player, hand: ["cellar", "estate", "copper"], deck: ["silver"] } : player) };
  const played = playAction(game, "p1", 0, () => 0);
  assert.equal(played.pendingChoice.type, "cellar");
  const resolved = resolveChoice(played, "p1", { indices: [0] }, () => 0);
  assert.deepEqual(resolved.players[0].hand, ["copper", "silver"]);
  assert.ok(resolved.players[0].discard.includes("estate"));
  assert.equal(resolved.pendingChoice, null);
});

test("Workshop gains a card costing up to four", () => {
  const base = activeAs(gameWith(2));
  const game = { ...base, players: base.players.map((player, index) => index === 0 ? { ...player, hand: ["workshop"] } : player) };
  const played = playAction(game, "p1", 0);
  const gained = resolveChoice(played, "p1", { cardId: "smithy" });
  assert.equal(gained.supply.smithy, 9);
  assert.ok(gained.players[0].discard.includes("smithy"));
  assert.equal(resolveChoice(played, "p1", { cardId: "gold" }), played);
});

test("Mine trashes a Copper and gains Silver directly to hand", () => {
  const base = activeAs(gameWith(2));
  const game = { ...base, players: base.players.map((player, index) => index === 0 ? { ...player, hand: ["mine", "copper"] } : player) };
  const played = playAction(game, "p1", 0);
  const trashed = resolveChoice(played, "p1", { index: 0 });
  assert.deepEqual(trashed.trash, ["copper"]);
  const gained = resolveChoice(trashed, "p1", { cardId: "silver" });
  assert.deepEqual(gained.players[0].hand, ["silver"]);
  assert.equal(gained.supply.silver, 39);
});

test("Remodel with no card left to trash resolves without blocking the turn", () => {
  const base = activeAs(gameWith(2));
  const game = { ...base, players: base.players.map((player, index) => index === 0 ? { ...player, hand: ["remodel"], deck: [], discard: [] } : player) };
  const played = playAction(game, "p1", 0);
  assert.equal(played.pendingChoice, null);
  assert.deepEqual(played.players[0].inPlay, ["remodel"]);
});

test("Militia is blocked by Moat and makes other players discard to three", () => {
  const base = activeAs(gameWith(3));
  const game = {
    ...base,
    players: base.players.map((player, index) => index === 0
      ? { ...player, hand: ["militia"] }
      : index === 1
        ? { ...player, hand: ["moat", "copper", "copper", "estate", "estate"] }
        : { ...player, hand: ["copper", "copper", "copper", "estate", "estate"] }),
  };
  const attacked = playAction(game, "p1", 0);
  assert.equal(attacked.players[0].coins, 2);
  assert.equal(attacked.pendingChoice.playerId, "p3");
  const resolved = resolveChoice(attacked, "p3", { indices: [3, 4] });
  assert.equal(resolved.players[1].hand.length, 5);
  assert.equal(resolved.players[2].hand.length, 3);
  assert.equal(resolved.pendingChoice, null);
});

test("Merchant adds one coin when the first Silver is auto-played", () => {
  const base = activeAs(gameWith(2));
  const game = { ...base, players: base.players.map((player, index) => index === 0 ? { ...player, hand: ["merchant", "silver", "copper"], deck: [], discard: [] } : player) };
  const played = playAction(game, "p1", 0, () => 0);
  const buying = advanceToBuy(played, "p1");
  assert.equal(buying.players[0].coins, 4);
  assert.equal(buying.turnPhase, "buy");
});

test("buying gains to discard and cleanup draws a fresh hand", () => {
  const base = activeAs(gameWith(2));
  const game = { ...base, turnPhase: "buy", players: base.players.map((player, index) => index === 0 ? { ...player, hand: [], deck: ["copper", "copper", "estate", "estate", "silver"], coins: 6, buys: 1 } : player) };
  const bought = buyCard(game, "p1", "gold");
  assert.equal(bought.supply.gold, 29);
  assert.ok(bought.players[0].discard.includes("gold"));
  const ended = endTurn(bought, "p1", () => 0);
  assert.equal(ended.players[0].hand.length, 5);
  assert.equal(currentPlayer(ended).id, "p2");
  assert.equal(ended.turnPhase, "action");
});

test("empty Provinces end the game and score every owned card", () => {
  const base = activeAs(gameWith(2));
  const game = {
    ...base,
    turnPhase: "buy",
    supply: { ...base.supply, province: 1 },
    players: base.players.map((player, index) => index === 0 ? { ...player, coins: 8, buys: 1, hand: [], deck: [], discard: ["estate"] } : player),
  };
  const bought = buyCard(game, "p1", "province");
  const finished = endTurn(bought, "p1", () => 0);
  assert.equal(finished.phase, "finished");
  assert.equal(finished.scores.p1, 7);
  assert.ok(finished.winners.includes("p1"));
  assert.equal(scorePlayer({ deck: ["province"], hand: ["curse"], discard: ["duchy"], inPlay: [] }), 8);
});

test("expanded games end on four empty Supply piles rather than three", () => {
  const base = activeAs(gameWith(5));
  const threeEmpty = {
    ...base,
    turnPhase: "buy",
    supply: { ...base.supply, cellar: 0, moat: 0, workshop: 0 },
  };
  const continued = endTurn(threeEmpty, "p1", () => 0);
  assert.equal(continued.phase, "playing");

  const activePlayer = currentPlayer(continued);
  const fourEmpty = {
    ...continued,
    turnPhase: "buy",
    supply: { ...continued.supply, village: 0 },
  };
  const finished = endTurn(fourEmpty, activePlayer.id, () => 0);
  assert.equal(finished.phase, "finished");
});

test("computer players resolve choices and complete legal turns", () => {
  const lobby = addComputerPlayer(createLobby(person("p1", "Host"), "BOTTY", 1), { id: "bot-1", name: "Rowan" });
  const base = startGame(lobby, () => 0);
  const game = activeAs(base, 1);
  assert.equal(computerPlayerToAct(game).id, "bot-1");
  const next = runComputerTurn(game, () => 0);
  assert.notEqual(next, game);
  assert.ok(currentPlayer(next).id === "p1" || next.pendingChoice?.playerId === "p1" || next.phase === "finished");
});

test("a computer-only realm reaches a scored ending without deadlocking", () => {
  let game = addComputerPlayer(createLobby(person("p1", "A"), "SIM", 1), { id: "bot-1", name: "B" });
  game = startGame(game, () => 0.37);
  game = { ...game, players: game.players.map((player) => ({ ...player, isComputer: true })) };
  for (let guard = 0; guard < 200 && game.phase === "playing"; guard += 1) game = runComputerTurn(game, () => 0.37);
  assert.equal(game.phase, "finished");
  assert.ok(game.winners.length >= 1);
  assert.ok(game.players.every((player) => Number.isFinite(game.scores[player.id])));
});
