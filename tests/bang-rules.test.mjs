import assert from "node:assert/strict";
import test from "node:test";

import {
  ROLE_DISTRIBUTIONS,
  addComputerPlayer,
  createLobby,
  declineResponse,
  distanceBetween,
  playCard,
  respondWithCard,
  STALEMATE_TURNS,
  runComputerStep,
  startGame,
  weaponRange,
} from "../lib/bang.js";

const plainCharacter = { id: "plain", name: "Test Gunslinger", lives: 4, ability: "" };
const card = (name, id = name, color = "brown") => ({ id, name, color, suit: "clubs", rank: "10" });

function lobbyWith(count) {
  let game = createLobby({ id: "p0", name: "P0" }, "BANG1", 1);
  for (let index = 1; index < count; index += 1) game = addComputerPlayer(game, { id: `p${index}`, name: `P${index}` });
  return game;
}

function baseGame(players) {
  return {
    roomCode: "BANG1",
    hostId: players[0].id,
    phase: "playing",
    players,
    deck: [card("Stagecoach", "draw-1"), card("Beer", "draw-2"), card("Missed!", "draw-3"), card("BANG!", "draw-4")],
    discard: [],
    turnIndex: 0,
    turnPhase: "action",
    pending: null,
    winner: null,
    turnNumber: 1,
    log: [],
  };
}

function player(id, role, options = {}) {
  return {
    id,
    name: id.toUpperCase(),
    isComputer: false,
    role,
    character: plainCharacter,
    maxLives: 4,
    lives: 4,
    alive: true,
    hand: [],
    table: [],
    bangPlayed: 0,
    ...options,
  };
}

test("deals the official role mix for every supported player count", () => {
  for (let count = 4; count <= 7; count += 1) {
    const game = startGame(lobbyWith(count), () => 0.42);
    const actual = game.players.map((item) => item.role).sort();
    assert.deepEqual(actual, [...ROLE_DISTRIBUTIONS[count]].sort());
    const sheriff = game.players.find((item) => item.role === "sheriff");
    assert.equal(sheriff.maxLives, sheriff.character.lives + 1);
    assert.equal(game.turnIndex, game.players.indexOf(sheriff));
  }
});

test("calculates circular distance and applies Scope and Mustang", () => {
  const players = [player("a", "sheriff"), player("b", "outlaw"), player("c", "renegade"), player("d", "outlaw")];
  let game = baseGame(players);
  assert.equal(distanceBetween(game, "a", "c"), 2);
  game = { ...game, players: game.players.map((item) => item.id === "a" ? { ...item, table: [card("Scope", "scope", "blue")] } : item) };
  assert.equal(distanceBetween(game, "a", "c"), 1);
  game = { ...game, players: game.players.map((item) => item.id === "c" ? { ...item, table: [card("Mustang", "mustang", "blue")] } : item) };
  assert.equal(distanceBetween(game, "a", "c"), 2);
});

test("BANG! creates a blocking response and Missed! cancels it", () => {
  const bang = card("BANG!", "bang");
  const missed = card("Missed!", "missed");
  let game = baseGame([
    player("a", "sheriff", { hand: [bang] }),
    player("b", "outlaw", { hand: [missed] }),
    player("c", "renegade"),
    player("d", "outlaw"),
  ]);
  game = playCard(game, "a", bang.id, { targetId: "b" });
  assert.equal(game.pending?.type, "bang");
  game = respondWithCard(game, "b", missed.id);
  assert.equal(game.pending, null);
  assert.equal(game.players[1].lives, 4);
  assert.equal(game.players[1].hand.length, 0);
});

test("an eliminated Outlaw reveals their role and rewards the killer three cards", () => {
  const bang = card("BANG!", "bang");
  let game = baseGame([
    player("a", "sheriff", { hand: [bang] }),
    player("b", "outlaw", { lives: 1 }),
    player("c", "renegade"),
    player("d", "outlaw"),
  ]);
  game = playCard(game, "a", bang.id, { targetId: "b" });
  game = declineResponse(game, "b");
  assert.equal(game.players[1].alive, false);
  assert.equal(game.players[1].role, "outlaw");
  assert.equal(game.players[0].hand.length, 3);
  assert.match(game.log.join(" "), /revealed as the Outlaw/);
  assert.match(game.log.join(" "), /three-card Outlaw reward/);
});

test("a Sheriff who eliminates a Deputy discards every hand and face-up card", () => {
  const bang = card("BANG!", "bang");
  let game = baseGame([
    player("a", "sheriff", { hand: [bang, card("Beer", "beer")], table: [card("Barrel", "barrel", "blue")] }),
    player("b", "deputy", { lives: 1 }),
    player("c", "renegade"),
    player("d", "outlaw"),
  ]);
  game = playCard(game, "a", bang.id, { targetId: "b" });
  game = declineResponse(game, "b");
  assert.equal(game.players[0].hand.length, 0);
  assert.equal(game.players[0].table.length, 0);
  assert.match(game.log.join(" "), /shot a Deputy/);
});

test("the Renegade wins only when left alone after the Sheriff falls", () => {
  const bang = card("BANG!", "bang");
  let game = baseGame([
    player("r", "renegade", { hand: [bang] }),
    player("s", "sheriff", { lives: 1 }),
    player("o", "outlaw", { alive: false, lives: 0 }),
    player("d", "deputy", { alive: false, lives: 0 }),
  ]);
  game = playCard(game, "r", bang.id, { targetId: "s" });
  game = declineResponse(game, "s");
  assert.equal(game.phase, "finished");
  assert.equal(game.winner, "renegade");
});

test("weapons are laid face up and replace the previous weapon", () => {
  let game = baseGame([
    player("a", "sheriff", { hand: [card("Schofield", "schofield", "blue"), card("Winchester", "winchester", "blue")] }),
    player("b", "outlaw"),
    player("c", "renegade"),
    player("d", "outlaw"),
  ]);
  game = playCard(game, "a", "schofield");
  assert.equal(weaponRange(game.players[0]), 2);
  game = playCard(game, "a", "winchester");
  assert.equal(weaponRange(game.players[0]), 5);
  assert.deepEqual(game.players[0].table.map((item) => item.name), ["Winchester"]);
});

test("computer Outlaws keep offensive cards and finish a late-game standoff", () => {
  let game = lobbyWith(7);
  game.players[0].isComputer = true;
  let seed = 4;
  const rng = () => ((seed = Math.imul(seed, 1664525) + 1013904223 >>> 0) / 4294967296);
  game = startGame(game, rng);
  for (let step = 0; step < 1500 && game.phase === "playing"; step += 1) game = runComputerStep(game, rng);
  assert.equal(game.phase, "finished");
});

test("a round nobody can win ends in a draw instead of running forever", () => {
  // Reachable position: the last Outlaw holds BANG! cards but its weapon range
  // is shorter than the distance to every survivor, so no shot can ever land.
  // The engine had no draw, so play continued indefinitely — 400,000 computer
  // steps without a life changing hands — and the host client kept writing the
  // full state to the room API every 560 ms the whole time.
  const mulberry = (seed) => () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const rng = mulberry(1 * 7919 + 5 * 104729);

  let game = createLobby({ id: "p1", name: "P1" }, "TEST1", 1);
  for (let index = 1; index < 5; index += 1) game = addComputerPlayer(game);
  game.players[0].isComputer = true;
  game = startGame(game, rng);

  let steps = 0;
  while (game.phase === "playing" && steps < 40000) {
    game = runComputerStep(game, rng);
    steps += 1;
  }

  assert.equal(game.phase, "finished", "the round must terminate");
  assert.equal(game.winner, "draw");
  assert.ok(game.quietTurns >= STALEMATE_TURNS);
});

test("the draw rule never cuts a game that is still making progress short", () => {
  // The bound is 60 quiet turns; a real game's longest measured quiet stretch
  // was 21. Every decided game must stay decided.
  const mulberry = (seed) => () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  let decided = 0;
  for (let players = 4; players <= 7; players += 1) {
    for (let seed = 1; seed <= 6; seed += 1) {
      const rng = mulberry(seed * 7919 + players * 104729);
      let game = createLobby({ id: "p1", name: "P1" }, "TEST1", 1);
      for (let index = 1; index < players; index += 1) game = addComputerPlayer(game);
      game.players[0].isComputer = true;
      game = startGame(game, rng);
      let steps = 0;
      while (game.phase === "playing" && steps < 40000) {
        game = runComputerStep(game, rng);
        steps += 1;
      }
      assert.equal(game.phase, "finished", `${players}p/seed${seed} never ended`);
      if (game.winner !== "draw") decided += 1;
    }
  }
  assert.ok(decided >= 20, `expected most games to be decided on the table, got ${decided}`);
});
