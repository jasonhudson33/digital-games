import test from "node:test";
import assert from "node:assert/strict";
import {
  addComputerPlayer,
  addPlayer,
  createLobby,
  createTileBag,
  currentPlayer,
  exchangeTiles,
  isValidLine,
  openingGroups,
  playTiles,
  runComputerTurn,
  scoreMove,
  startGame,
  validateMove,
} from "../lib/qwirkle.js";

const person = (id, name) => ({ id, name });

function fixedGame() {
  let lobby = createLobby(person("p1", "Avery"), "TILES", 1);
  lobby = addPlayer(lobby, person("p2", "Blair"));
  const game = startGame(lobby, () => 0.42);
  return { ...game, currentPlayerIndex: 0, openingRequiredCount: 1 };
}

function tile(id, color, shape) { return { id, color, shape }; }

test("the bag has three copies of all 36 color and shape combinations", () => {
  const bag = createTileBag(() => 0.5);
  assert.equal(bag.length, 108);
  assert.equal(new Set(bag.map(({ color, shape }) => `${color}-${shape}`)).size, 36);
  assert.ok([...new Set(bag.map(({ color, shape }) => `${color}-${shape}`))].every((combo) => bag.filter(({ color, shape }) => `${color}-${shape}` === combo).length === 3));
});

test("rooms seat two to four people and computers", () => {
  let room = createLobby(person("p1", "Host"), "ROOM", 1);
  room = addComputerPlayer(room, { id: "bot-1", name: "Dot" });
  room = addPlayer(room, person("p3", "Three"));
  room = addPlayer(room, person("p4", "Four"));
  assert.equal(room.players.length, 4);
  assert.equal(room.players[1].isComputer, true);
  assert.equal(addPlayer(room, person("p5", "Five")), room);
  const solo = createLobby(person("solo", "Solo"), "NOPE", 1);
  assert.equal(startGame(solo), solo);
});

test("line rules require one shared attribute, no duplicates, and at most six tiles", () => {
  assert.equal(isValidLine([tile("1", "red", "circle"), tile("2", "red", "star")]), true);
  assert.equal(isValidLine([tile("1", "red", "circle"), tile("2", "blue", "circle")]), true);
  assert.equal(isValidLine([tile("1", "red", "circle"), tile("2", "red", "circle")]), false);
  assert.equal(isValidLine([tile("1", "red", "circle"), tile("2", "blue", "star")]), false);
  assert.equal(isValidLine(Array.from({ length: 7 }, (_, index) => tile(String(index), "red", `shape-${index}`))), false);
});

test("opening groups only count distinct legal matches", () => {
  const hand = [
    tile("1", "red", "circle"), tile("2", "red", "square"), tile("3", "red", "star"),
    tile("4", "blue", "circle"), tile("5", "red", "circle"), tile("6", "green", "diamond"),
  ];
  assert.equal(openingGroups(hand)[0].length, 3);
});

test("the largest legal opening group determines the first player", () => {
  let lobby = createLobby(person("p1", "First"), "OPEN", 1);
  lobby = addPlayer(lobby, person("p2", "Second"));
  const started = startGame(lobby, () => 0);
  assert.equal(started.players.every((player) => player.hand.length === 6), true);
  assert.equal(started.bag.length, 96);
  assert.equal(currentPlayer(started).id, started.players[0].id);
  assert.equal(started.openingRequiredCount, openingGroups(started.players[0].hand)[0].length);
});

test("multi-tile turns must align and connect to the board", () => {
  const base = fixedGame();
  const hand = [tile("r1", "red", "circle"), tile("r2", "red", "square"), tile("b1", "blue", "circle")];
  const game = { ...base, players: base.players.map((player, index) => index === 0 ? { ...player, hand } : player) };
  assert.equal(validateMove(game, "p1", [{ tileId: "r1", x: 0, y: 0 }, { tileId: "r2", x: 1, y: 0 }]).valid, false, "opening count still applies");
  const opening = { ...game, openingRequiredCount: 2 };
  assert.equal(validateMove(opening, "p1", [{ tileId: "r1", x: 0, y: 0 }, { tileId: "r2", x: 1, y: 0 }]).valid, true);
  assert.equal(validateMove(opening, "p1", [{ tileId: "r1", x: 0, y: 0 }, { tileId: "r2", x: 1, y: 1 }]).valid, false);
  assert.equal(validateMove(opening, "p1", [{ tileId: "r1", x: 0, y: 0 }, { tileId: "b1", x: 1, y: 0 }]).valid, true);
});

test("all tiles played together belong to one continuous final line", () => {
  const base = fixedGame();
  const first = tile("first", "red", "circle");
  const second = tile("second", "red", "star");
  const board = {
    "0,1": tile("anchor-1", "blue", "circle"),
    "1,1": tile("bridge", "blue", "square"),
    "2,1": tile("anchor-2", "blue", "star"),
  };
  const game = { ...base, board, players: base.players.map((player, index) => index === 0 ? { ...player, hand: [first, second] } : player) };
  const disconnectedPrimaryLine = [{ tileId: first.id, x: 0, y: 0 }, { tileId: second.id, x: 2, y: 0 }];
  assert.equal(validateMove(game, "p1", disconnectedPrimaryLine).valid, false);
});

test("scoring counts the main line, cross lines, and Qwirkle bonuses", () => {
  const base = fixedGame();
  const colors = ["red", "orange", "yellow", "green", "blue"];
  const board = Object.fromEntries(colors.map((color, index) => [`${index},0`, tile(`old-${color}`, color, "circle")]));
  board["5,-1"] = tile("cross", "purple", "square");
  const finishing = tile("finish", "purple", "circle");
  const game = { ...base, board, players: base.players.map((player, index) => index === 0 ? { ...player, hand: [finishing] } : player) };
  const placements = [{ tileId: "finish", x: 5, y: 0 }];
  assert.equal(validateMove(game, "p1", placements).valid, true);
  assert.deepEqual({ score: scoreMove(game, placements).score, qwirkles: scoreMove(game, placements).qwirkles }, { score: 14, qwirkles: 1 });
});

test("placing refills the rack, scores, advances, and ending earns six", () => {
  const base = fixedGame();
  const placed = tile("placed", "red", "circle");
  const draw = tile("draw", "blue", "square");
  const game = { ...base, bag: [draw], players: base.players.map((player, index) => index === 0 ? { ...player, hand: [placed] } : player) };
  const next = playTiles(game, "p1", [{ tileId: placed.id, x: 0, y: 0 }]);
  assert.equal(next.players[0].hand[0].id, "draw");
  assert.equal(next.players[0].score, 1);
  assert.equal(currentPlayer(next).id, "p2");

  const endGame = { ...game, bag: [] };
  const ended = playTiles(endGame, "p1", [{ tileId: placed.id, x: 0, y: 0 }]);
  assert.equal(ended.phase, "finished");
  assert.equal(ended.players[0].score, 7);
});

test("exchanging draws before returned tiles re-enter the bag", () => {
  const base = fixedGame();
  const old = tile("old", "red", "circle");
  const fresh = tile("fresh", "blue", "square");
  const game = { ...base, bag: [fresh], players: base.players.map((player, index) => index === 0 ? { ...player, hand: [old] } : player) };
  const next = exchangeTiles(game, "p1", [old.id], () => 0.5);
  assert.equal(next.players[0].hand[0].id, fresh.id);
  assert.equal(next.bag[0].id, old.id);
  assert.equal(currentPlayer(next).id, "p2");
});

test("a computer makes a legal opening and a legal later turn", () => {
  let lobby = createLobby(person("p1", "Host"), "BOTS", 1);
  lobby = addComputerPlayer(lobby, { id: "bot-1", name: "Dot" });
  let game = startGame(lobby, () => 0.3);
  game = { ...game, currentPlayerIndex: 1, openingRequiredCount: openingGroups(game.players[1].hand)[0].length };
  const opened = runComputerTurn(game, () => 0.2);
  assert.ok(Object.keys(opened.board).length >= 1);
  assert.equal(currentPlayer(opened).id, "p1");

  const botTurn = { ...opened, currentPlayerIndex: 1 };
  const next = runComputerTurn(botTurn, () => 0.2);
  assert.notEqual(next, botTurn);
});
