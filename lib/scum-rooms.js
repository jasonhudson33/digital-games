import { randomString as randomValue } from "./random.js";
import {
  chooseScumBotPlay,
  createScumGame,
  moveOnScumPile,
  passScumTurn,
  playScumCards,
  startNextScumRound,
  submitScumTrade,
} from "./scum.js";
import { loadScumRoom, saveScumRoom, scumRoomExists } from "./scum-room-store.js";

/*
 * Scum is genuinely an any-size game, but "any size" was taken literally: join
 * checked only that the game had not started, and adding computers checked
 * nothing at all. A room seated 40 players and dealt them in without complaint,
 * against a catalogue that advertises 3-10 and a table layout that cannot draw
 * more than ten seats.
 */
export const SCUM_MIN_PLAYERS = 3;
export const SCUM_MAX_PLAYERS = 10;
export const SCUM_MAX_NAME = 24;

export async function createScumRoom({ name }) {
  const roomCode = await uniqueRoomCode();
  const hostToken = randomValue(28);
  const host = createHumanPlayer(name, hostToken);
  const room = {
    roomCode,
    hostToken,
    passGroupCount: 1,
    players: [host],
    game: null,
    updatedAt: Date.now(),
  };
  await saveScumRoom(room);
  return { token: hostToken, state: serializeRoom(room, hostToken) };
}

export async function joinScumRoom({ roomCode, name }) {
  const room = await requireRoom(roomCode);
  if (room.game) throw new Error("That game has already started.");
  if (room.players.length >= SCUM_MAX_PLAYERS) {
    throw new Error(`That room is full. Scum seats up to ${SCUM_MAX_PLAYERS} players.`);
  }
  const token = randomValue(28);
  room.players.push(createHumanPlayer(name, token));
  await touchAndSave(room);
  return { token, state: serializeRoom(room, token) };
}

export async function getScumRoom({ roomCode, token }) {
  const room = await requireRoom(roomCode);
  requireHuman(room, token);
  return { state: serializeRoom(room, token) };
}

export async function addScumComputer({ roomCode, token }) {
  const room = await requireRoom(roomCode);
  requireHost(room, token);
  if (room.game) throw new Error("The game has already started.");
  if (room.players.length >= SCUM_MAX_PLAYERS) {
    throw new Error(`That room is full. Scum seats up to ${SCUM_MAX_PLAYERS} players.`);
  }
  const computerNumber = room.players.filter((player) => player.isComputer).length + 1;
  room.players.push({
    playerId: `computer-${randomValue(10)}`,
    name: `Computer ${computerNumber}`,
    isComputer: true,
    token: null,
  });
  room.passGroupCount = Math.min(room.passGroupCount, Math.floor(room.players.length / 2));
  await touchAndSave(room);
  return { state: serializeRoom(room, token) };
}

export async function removeScumComputer({ roomCode, token, playerId }) {
  const room = await requireRoom(roomCode);
  requireHost(room, token);
  if (room.game) throw new Error("The game has already started.");
  const computer = room.players.find((player) => player.playerId === playerId && player.isComputer);
  if (!computer) throw new Error("Computer player not found.");
  room.players = room.players.filter((player) => player.playerId !== playerId);
  room.passGroupCount = Math.min(room.passGroupCount, Math.floor(room.players.length / 2));
  await touchAndSave(room);
  return { state: serializeRoom(room, token) };
}

export async function setScumRoomOptions({ roomCode, token, passGroupCount }) {
  const room = await requireRoom(roomCode);
  requireHost(room, token);
  if (room.game) throw new Error("The game has already started.");
  room.passGroupCount = Math.min(
    Math.floor(room.players.length / 2),
    Math.max(0, Math.floor(Number(passGroupCount) || 0))
  );
  await touchAndSave(room);
  return { state: serializeRoom(room, token) };
}

export async function startScumRoom({ roomCode, token, random = Math.random }) {
  const room = await requireRoom(roomCode);
  requireHost(room, token);
  if (room.game) throw new Error("The game has already started.");
  if (room.players.length < SCUM_MIN_PLAYERS || room.players.length > SCUM_MAX_PLAYERS) {
    throw new Error(`Scum needs ${SCUM_MIN_PLAYERS}-${SCUM_MAX_PLAYERS} players. This room has ${room.players.length}.`);
  }
  room.game = createScumGame({
    playerSeeds: room.players,
    passGroupCount: room.passGroupCount,
    startingPlayerIndex: Math.floor(random(room.players.length) * room.players.length),
  });
  runScumComputers(room);
  await touchAndSave(room);
  return { state: serializeRoom(room, token) };
}

export async function playScumRoomCards({ roomCode, token, cardIds }) {
  return updateGame(roomCode, token, (game, playerIndex) => playScumCards(game, playerIndex, cardIds));
}

export async function passScumRoomTurn({ roomCode, token }) {
  return updateGame(roomCode, token, (game, playerIndex) => passScumTurn(game, playerIndex));
}

export async function moveOnScumRoomPile({ roomCode, token }) {
  return updateGame(roomCode, token, (game, playerIndex) => moveOnScumPile(game, playerIndex));
}

export async function submitScumRoomTrade({ roomCode, token, cardIds }) {
  return updateGame(roomCode, token, (game, playerIndex) => submitScumTrade(game, playerIndex, cardIds));
}

export async function startNextScumRoomRound({ roomCode, token }) {
  const room = await requireRoom(roomCode);
  requireHost(room, token);
  if (room.game?.phase !== "finished") throw new Error("The round is not finished yet.");
  room.game = startNextScumRound(room.game);
  runScumComputers(room);
  await touchAndSave(room);
  return { state: serializeRoom(room, token) };
}

async function updateGame(roomCode, token, updater) {
  const room = await requireRoom(roomCode);
  const human = requireHuman(room, token);
  if (!room.game) throw new Error("The host has not started the game.");
  const playerIndex = room.game.players.findIndex((player) => player.playerId === human.playerId);
  const next = updater(room.game, playerIndex);
  if (next === room.game) throw new Error("That action is not available right now.");
  room.game = next;
  runScumComputers(room);
  await touchAndSave(room);
  return { state: serializeRoom(room, token) };
}

function runScumComputers(room) {
  let steps = 0;
  while (room.game && steps < 10000) {
    const game = room.game;
    if (game.phase === "trading") {
      const computerTrade = (game.pendingTrades || []).find((trade) =>
        game.players[trade.upperPlayerIndex].isComputer && !game.tradeSelections?.[trade.upperPlayerIndex]
      );
      if (!computerTrade) return;
      const cards = game.players[computerTrade.upperPlayerIndex].hand.slice(0, computerTrade.count);
      room.game = submitScumTrade(game, computerTrade.upperPlayerIndex, cards.map((card) => card.id));
      steps += 1;
      continue;
    }
    if (game.phase !== "playing") return;
    const player = game.players[game.currentPlayerIndex];
    if (!player?.isComputer) return;
    const play = chooseScumBotPlay(game, game.currentPlayerIndex);
    room.game = play
      ? playScumCards(game, game.currentPlayerIndex, play.map((card) => card.id))
      : passScumTurn(game, game.currentPlayerIndex);
    steps += 1;
  }
  if (steps >= 10000) throw new Error("Computer turns did not finish.");
}

function serializeRoom(room, token) {
  const viewer = requireHuman(room, token);
  if (!room.game) {
    return {
      roomCode: room.roomCode,
      phase: "lobby",
      hostControls: room.hostToken === token,
      passGroupCount: room.passGroupCount,
      updatedAt: room.updatedAt,
      players: room.players.map((player) => ({
        playerId: player.playerId,
        name: player.name,
        isComputer: player.isComputer,
        isViewer: player.playerId === viewer.playerId,
      })),
    };
  }

  const viewerPlayerIndex = room.game.players.findIndex((player) => player.playerId === viewer.playerId);
  return {
    ...room.game,
    roomCode: room.roomCode,
    hostControls: room.hostToken === token,
    viewerPlayerIndex,
    updatedAt: room.updatedAt,
    tradeSelections: Object.fromEntries(
      Object.keys(room.game.tradeSelections || {}).map((playerIndex) => [playerIndex, true])
    ),
    players: room.game.players.map((player, index) => ({
      ...player,
      handCount: player.hand.length,
      hand: index === viewerPlayerIndex ? player.hand : [],
      isViewer: index === viewerPlayerIndex,
    })),
  };
}

function createHumanPlayer(name, token) {
  return {
    playerId: `player-${randomValue(12)}`,
    name: String(name || "").trim().replace(/\s+/g, " ").slice(0, SCUM_MAX_NAME) || "Player",
    isComputer: false,
    token,
  };
}

async function requireRoom(roomCode) {
  const room = await loadScumRoom(String(roomCode || "").trim().toUpperCase());
  if (!room) throw new Error("Room not found.");
  return room;
}

function requireHuman(room, token) {
  const player = room.players.find((candidate) => !candidate.isComputer && candidate.token === token);
  if (!player) throw new Error("Join the room before taking actions.");
  return player;
}

function requireHost(room, token) {
  if (room.hostToken !== token) throw new Error("Only the host can do that.");
}

async function touchAndSave(room) {
  room.updatedAt = Math.max(Date.now(), (room.updatedAt || 0) + 1);
  await saveScumRoom(room);
}

async function uniqueRoomCode() {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    const code = randomValue(5, "ABCDEFGHJKLMNPQRSTUVWXYZ23456789");
    if (!(await scumRoomExists(code))) return code;
  }
  throw new Error("Could not create a unique room code. Try again.");
}

