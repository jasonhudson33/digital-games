import test from "node:test";
import assert from "node:assert/strict";
import {
  LAKE_KEYS,
  STRATEGO_ARMY_SIZE,
  STRATEGO_PIECE_TYPES,
  addStrategoComputer,
  addStrategoPlayer,
  autoPlaceStrategoArmy,
  createStrategoLobby,
  deploymentCount,
  legalStrategoMoves,
  moveStrategoPiece,
  pieceAt,
  placeStrategoPiece,
  resolveStrategoCombat,
  runStrategoComputerTurn,
  setStrategoReady,
  visibleStrategoPiece,
} from "../lib/stratego.js";

function setupRoom() {
  return addStrategoPlayer(createStrategoLobby({ id: "red", name: "Red" }, "WAR42"), { id: "blue", name: "Blue" });
}

function readyRoom() {
  let room = setupRoom();
  room = autoPlaceStrategoArmy(room, "red", () => 0.25);
  room = autoPlaceStrategoArmy(room, "blue", () => 0.75);
  room = setStrategoReady(room, "blue");
  return setStrategoReady(room, "red");
}

function battlePiece(kind) {
  const type = STRATEGO_PIECE_TYPES.find((entry) => entry.kind === kind);
  return { ...type, label: type.label };
}

test("a room holds exactly two 40-piece armies and begins secret setup", () => {
  const lobby = createStrategoLobby({ id: "red", name: "Red" }, "WAR42");
  assert.equal(lobby.phase, "lobby");
  assert.equal(Object.keys(lobby.pieces).length, STRATEGO_ARMY_SIZE);
  const room = addStrategoPlayer(lobby, { id: "blue", name: "Blue" });
  assert.equal(room.phase, "setup");
  assert.equal(room.players.length, 2);
  assert.equal(Object.keys(room.pieces).length, 80);
  assert.equal(addStrategoPlayer(room, { id: "third", name: "Third" }), room);
});

test("the host may fill the only opponent seat with a ready computer army", () => {
  const lobby = createStrategoLobby({ id: "red", name: "Red" }, "WAR42");
  const room = addStrategoComputer(lobby, { id: "bot", name: "Iron Fox", rng: () => 0.4 });
  assert.equal(room.players.length, 2);
  assert.equal(room.players[1].isComputer, true);
  assert.equal(room.players[1].ready, true);
  assert.equal(deploymentCount(room, "bot"), 40);
  assert.equal(room.phase, "setup");
  assert.equal(addStrategoPlayer(room, { id: "third", name: "Third" }), room);
});

test("the board has the two official 2 by 2 lakes", () => {
  assert.deepEqual([...LAKE_KEYS].sort(), ["4:2", "4:3", "4:6", "4:7", "5:2", "5:3", "5:6", "5:7"]);
});

test("players deploy only inside their four home rows and need all 40 pieces to ready", () => {
  let room = setupRoom();
  const marshal = room.pieces["red-marshal-1"];
  assert.equal(placeStrategoPiece(room, "red", marshal.id, 5, 0), room);
  room = placeStrategoPiece(room, "red", marshal.id, 9, 0);
  assert.equal(pieceAt(room, 9, 0).kind, "marshal");
  assert.equal(setStrategoReady(room, "red"), room);
  room = autoPlaceStrategoArmy(room, "red", () => 0.5);
  assert.equal(deploymentCount(room, "red"), 40);
  room = setStrategoReady(room, "red");
  assert.equal(room.players[0].ready, true);
  assert.equal(room.phase, "setup");
});

test("both ready armies start with Red and keep enemy identities hidden", () => {
  const room = readyRoom();
  assert.equal(room.phase, "playing");
  assert.equal(room.players[room.currentPlayerIndex].color, "red");
  const redPiece = room.pieces["red-marshal-1"];
  assert.equal(visibleStrategoPiece(redPiece, "red").mark, "1");
  assert.deepEqual(
    { hidden: visibleStrategoPiece(redPiece, "blue").hidden, mark: visibleStrategoPiece(redPiece, "blue").mark },
    { hidden: true, mark: "?" },
  );
});

test("ordinary pieces move one orthogonal square while Bombs and Flags never move", () => {
  const room = readyRoom();
  const movable = Object.values(room.pieces).find((piece) => piece.ownerId === "red" && !piece.immobile && legalStrategoMoves(room, "red", piece.id).length);
  assert.ok(movable);
  assert.ok(legalStrategoMoves(room, "red", movable.id).every((move) => {
    const from = Object.entries(room.board).find(([, id]) => id === movable.id)[0].split(":").map(Number);
    return Math.abs(move.row - from[0]) + Math.abs(move.column - from[1]) === 1;
  }));
  assert.deepEqual(legalStrategoMoves(room, "red", "red-bomb-1"), []);
  assert.deepEqual(legalStrategoMoves(room, "red", "red-flag-1"), []);
});

test("Scouts travel in straight open lines but cannot cross lakes or pieces", () => {
  let room = readyRoom();
  room = { ...room, board: { "6:2": "red-scout-1", "3:2": "blue-sergeant-1", "6:5": "red-bomb-1" } };
  const moves = legalStrategoMoves(room, "red", "red-scout-1");
  assert.ok(moves.some((move) => move.row === 6 && move.column === 4));
  assert.ok(!moves.some((move) => move.row === 6 && move.column >= 5));
  assert.ok(!moves.some((move) => move.row <= 5 && move.column === 2));
});

test("the two-square rule stops a fourth consecutive shuttle over one boundary", () => {
  let room = readyRoom();
  room = {
    ...room,
    board: { "5:0": "red-sergeant-1", "0:0": "blue-scout-1" },
    moveHistory: [
      { playerId: "red", pieceId: "red-sergeant-1", from: "6:0", to: "5:0" },
      { playerId: "red", pieceId: "red-sergeant-1", from: "5:0", to: "6:0" },
      { playerId: "red", pieceId: "red-sergeant-1", from: "6:0", to: "5:0" },
    ],
  };
  const moves = legalStrategoMoves(room, "red", "red-sergeant-1");
  assert.ok(!moves.some((move) => move.row === 6 && move.column === 0));
  assert.ok(moves.some((move) => move.row === 5 && move.column === 1));
});

test("combat uses classic rank order and equal ranks remove both pieces", () => {
  assert.equal(resolveStrategoCombat(battlePiece("marshal"), battlePiece("general")).attackerSurvives, true);
  assert.equal(resolveStrategoCombat(battlePiece("general"), battlePiece("marshal")).defenderSurvives, true);
  assert.deepEqual(resolveStrategoCombat(battlePiece("captain"), battlePiece("captain")), {
    attackerSurvives: false,
    defenderSurvives: false,
    result: "tied the Captain; both were removed",
  });
});

test("only a Miner defuses a Bomb and an attacking Spy defeats the Marshal", () => {
  assert.equal(resolveStrategoCombat(battlePiece("miner"), battlePiece("bomb")).attackerSurvives, true);
  assert.equal(resolveStrategoCombat(battlePiece("captain"), battlePiece("bomb")).defenderSurvives, true);
  assert.equal(resolveStrategoCombat(battlePiece("spy"), battlePiece("marshal")).attackerSurvives, true);
  assert.equal(resolveStrategoCombat(battlePiece("marshal"), battlePiece("spy")).attackerSurvives, true);
});

test("capturing the Flag immediately wins the game", () => {
  let room = readyRoom();
  room = { ...room, board: { "4:0": "red-scout-1", "3:0": "blue-flag-1", "0:0": "blue-scout-1" } };
  room = moveStrategoPiece(room, "red", "red-scout-1", 3, 0);
  assert.equal(room.phase, "finished");
  assert.equal(room.winnerId, "red");
  assert.equal(room.winReason, "captured the enemy Flag");
});

test("a legal move alternates the turn and records a revealed battle", () => {
  let room = readyRoom();
  room = { ...room, board: { "4:0": "red-captain-1", "3:0": "blue-sergeant-1", "0:0": "blue-scout-1" } };
  room = moveStrategoPiece(room, "red", "red-captain-1", 3, 0);
  assert.equal(room.players[room.currentPlayerIndex].id, "blue");
  assert.equal(room.lastBattle.attacker.label, "Captain");
  assert.equal(room.lastBattle.defender.label, "Sergeant");
  assert.deepEqual({
    attackerPlayerId: room.lastBattle.attackerPlayerId,
    attackerName: room.lastBattle.attackerName,
    attackerSurvives: room.lastBattle.attackerSurvives,
    defenderPlayerId: room.lastBattle.defenderPlayerId,
    defenderName: room.lastBattle.defenderName,
    defenderSurvives: room.lastBattle.defenderSurvives,
  }, {
    attackerPlayerId: "red",
    attackerName: "Red",
    attackerSurvives: true,
    defenderPlayerId: "blue",
    defenderName: "Blue",
    defenderSurvives: false,
  });
  assert.equal(pieceAt(room, 3, 0).kind, "captain");
});

test("a revealed battle remains available after a later non-combat move", () => {
  let room = readyRoom();
  room = { ...room, board: { "4:0": "red-captain-1", "3:0": "blue-sergeant-1", "0:0": "blue-scout-1" } };
  room = moveStrategoPiece(room, "red", "red-captain-1", 3, 0);
  const revealedBattleAt = room.lastBattle.at;

  room = moveStrategoPiece(room, "blue", "blue-scout-1", 1, 0);

  assert.equal(room.lastBattle.at, revealedBattleAt);
  assert.equal(room.lastBattle.attacker.mark, "5");
  assert.equal(room.lastBattle.defender.mark, "7");
});

test("a computer chooses a legal move and returns the turn to the human", () => {
  let room = addStrategoComputer(createStrategoLobby({ id: "red", name: "Red" }, "WAR42"), { id: "bot", rng: () => 0.4 });
  room = autoPlaceStrategoArmy(room, "red", () => 0.6);
  room = setStrategoReady(room, "red");
  const redMove = Object.values(room.pieces).flatMap((piece) => piece.ownerId === "red" ? legalStrategoMoves(room, "red", piece.id).map((move) => ({ piece, move })) : [])[0];
  room = moveStrategoPiece(room, "red", redMove.piece.id, redMove.move.row, redMove.move.column);
  assert.equal(room.players[room.currentPlayerIndex].id, "bot");
  room = runStrategoComputerTurn(room, () => 0.5);
  assert.equal(room.players[room.currentPlayerIndex].id, "red");
  assert.equal(room.moveHistory.at(-1).playerId, "bot");
});
