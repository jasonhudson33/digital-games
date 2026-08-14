import {
  acknowledgeSecretRole,
  answerSecretHitlerVeto,
  castSecretHitlerVote,
  chancellorDiscardsPolicy,
  chooseSecretHitlerBotAction,
  createSecretHitlerGame,
  finishSecretHitlerPower,
  nominateSecretHitlerChancellor,
  presidentDiscardsPolicy,
  requestSecretHitlerVeto,
  resolveSecretHitlerPower,
} from "./secret-hitler.js";
import {
  loadSecretHitlerRoom,
  saveSecretHitlerRoom,
  secretHitlerRoomExists,
} from "./secret-hitler-room-store.js";

const BOT_NAMES = ["Ada", "Otto", "Greta", "Felix", "Marta", "Bruno", "Clara", "Hugo", "Ingrid"];

export async function createSecretHitlerRoom({ name }) {
  const roomCode = await uniqueRoomCode();
  const hostToken = randomValue(28);
  const room = {
    roomCode,
    hostToken,
    players: [createHumanPlayer(name, hostToken)],
    game: null,
    updatedAt: Date.now(),
  };
  await saveSecretHitlerRoom(room);
  return { token: hostToken, state: serializeRoom(room, hostToken) };
}

export async function joinSecretHitlerRoom({ roomCode, name }) {
  const room = await requireRoom(roomCode);
  if (room.game) throw new Error("That game has already started.");
  if (room.players.length >= 10) throw new Error("That room is full.");
  const token = randomValue(28);
  room.players.push(createHumanPlayer(name, token));
  await touchAndSave(room);
  return { token, state: serializeRoom(room, token) };
}

export async function getSecretHitlerRoom({ roomCode, token }) {
  const room = await requireRoom(roomCode);
  requireHuman(room, token);
  return { state: serializeRoom(room, token) };
}

export async function addSecretHitlerComputer({ roomCode, token }) {
  const room = await requireRoom(roomCode);
  requireHost(room, token);
  if (room.game) throw new Error("The game has already started.");
  if (room.players.length >= 10) throw new Error("Secret Hitler supports up to 10 players.");
  const usedNames = new Set(room.players.map((player) => player.name));
  const name = BOT_NAMES.find((candidate) => !usedNames.has(candidate)) || `Computer ${room.players.length}`;
  room.players.push({
    playerId: `computer-${randomValue(10)}`,
    name,
    isComputer: true,
    token: null,
  });
  await touchAndSave(room);
  return { state: serializeRoom(room, token) };
}

export async function removeSecretHitlerComputer({ roomCode, token, playerId }) {
  const room = await requireRoom(roomCode);
  requireHost(room, token);
  if (room.game) throw new Error("The game has already started.");
  if (!room.players.some((player) => player.playerId === playerId && player.isComputer)) throw new Error("Computer player not found.");
  room.players = room.players.filter((player) => player.playerId !== playerId);
  await touchAndSave(room);
  return { state: serializeRoom(room, token) };
}

export async function startSecretHitlerRoom({ roomCode, token }) {
  const room = await requireRoom(roomCode);
  requireHost(room, token);
  if (room.game) throw new Error("The game has already started.");
  if (room.players.length < 5) throw new Error("Add at least five players or computers.");
  room.game = createSecretHitlerGame({ playerSeeds: room.players });
  await touchAndSave(room);
  return { state: serializeRoom(room, token) };
}

export async function acknowledgeSecretHitlerRoomRole(values) {
  return updateGame(values, (game, playerIndex) => acknowledgeSecretRole(game, playerIndex));
}

export async function nominateSecretHitlerRoomChancellor({ targetIndex, ...values }) {
  return updateGame(values, (game, playerIndex) => nominateSecretHitlerChancellor(game, playerIndex, Number(targetIndex)));
}

export async function voteSecretHitlerRoom({ vote, ...values }) {
  return updateGame(values, (game, playerIndex) => castSecretHitlerVote(game, playerIndex, vote));
}

export async function discardSecretHitlerPresidentPolicy({ cardIndex, ...values }) {
  return updateGame(values, (game, playerIndex) => presidentDiscardsPolicy(game, playerIndex, Number(cardIndex)));
}

export async function discardSecretHitlerChancellorPolicy({ cardIndex, ...values }) {
  return updateGame(values, (game, playerIndex) => chancellorDiscardsPolicy(game, playerIndex, Number(cardIndex)));
}

export async function requestSecretHitlerRoomVeto(values) {
  return updateGame(values, (game, playerIndex) => requestSecretHitlerVeto(game, playerIndex));
}

export async function answerSecretHitlerRoomVeto({ accept, ...values }) {
  return updateGame(values, (game, playerIndex) => answerSecretHitlerVeto(game, playerIndex, Boolean(accept)));
}

export async function useSecretHitlerRoomPower({ targetIndex, ...values }) {
  return updateGame(values, (game, playerIndex) => resolveSecretHitlerPower(game, playerIndex, Number(targetIndex)));
}

export async function finishSecretHitlerRoomPower(values) {
  return updateGame(values, (game, playerIndex) => finishSecretHitlerPower(game, playerIndex));
}

export async function resetSecretHitlerRoom({ roomCode, token }) {
  const room = await requireRoom(roomCode);
  requireHost(room, token);
  if (room.game?.phase !== "game_over") throw new Error("The current game is not over.");
  room.game = null;
  await touchAndSave(room);
  return { state: serializeRoom(room, token) };
}

async function updateGame({ roomCode, token }, updater) {
  const room = await requireRoom(roomCode);
  const human = requireHuman(room, token);
  if (!room.game) throw new Error("The host has not started the game.");
  const playerIndex = room.game.players.findIndex((player) => player.playerId === human.playerId);
  const next = updater(room.game, playerIndex);
  if (next === room.game) throw new Error("That action is not available right now.");
  room.game = next;
  runSecretHitlerComputers(room);
  await touchAndSave(room);
  return { state: serializeRoom(room, token) };
}

function runSecretHitlerComputers(room) {
  let steps = 0;
  while (room.game && steps < 100) {
    const game = room.game;
    if (["role_reveal", "game_over"].includes(game.phase)) return;
    const computerIndex = findReadyComputer(game);
    if (computerIndex === -1) return;
    const action = chooseSecretHitlerBotAction(game, computerIndex);
    if (!action) return;
    if (action.type === "nominate") room.game = nominateSecretHitlerChancellor(game, computerIndex, action.targetIndex);
    if (action.type === "vote") room.game = castSecretHitlerVote(game, computerIndex, action.vote);
    if (action.type === "discard-president") room.game = presidentDiscardsPolicy(game, computerIndex, action.cardIndex);
    if (action.type === "discard-chancellor") room.game = chancellorDiscardsPolicy(game, computerIndex, action.cardIndex);
    if (action.type === "answer-veto") room.game = answerSecretHitlerVeto(game, computerIndex, action.accept);
    if (action.type === "power") room.game = resolveSecretHitlerPower(game, computerIndex, action.targetIndex);
    if (action.type === "finish-power") room.game = finishSecretHitlerPower(game, computerIndex);
    if (room.game === game) return;
    steps += 1;
  }
  if (steps >= 100) throw new Error("Computer turns did not settle.");
}

function findReadyComputer(game) {
  if (game.phase === "nomination") return game.players[game.presidentIndex]?.isComputer ? game.presidentIndex : -1;
  if (game.phase === "election") return game.players.findIndex((player, index) => player.alive && player.isComputer && !game.votes[index]);
  if (game.phase === "president_discard") return game.players[game.presidentIndex]?.isComputer ? game.presidentIndex : -1;
  if (game.phase === "chancellor_discard") {
    if (game.vetoRequested) return game.players[game.presidentIndex]?.isComputer ? game.presidentIndex : -1;
    return game.players[game.nominatedIndex]?.isComputer ? game.nominatedIndex : -1;
  }
  if (game.phase === "executive_action") return game.players[game.presidentIndex]?.isComputer ? game.presidentIndex : -1;
  return -1;
}

function serializeRoom(room, token) {
  const viewer = requireHuman(room, token);
  if (!room.game) {
    return {
      roomCode: room.roomCode,
      phase: "lobby",
      hostControls: room.hostToken === token,
      updatedAt: room.updatedAt,
      players: room.players.map((player) => ({
        playerId: player.playerId,
        name: player.name,
        isComputer: player.isComputer,
        isViewer: player.playerId === viewer.playerId,
      })),
    };
  }

  const game = room.game;
  const viewerPlayerIndex = game.players.findIndex((player) => player.playerId === viewer.playerId);
  const viewerPlayer = game.players[viewerPlayerIndex];
  const fascistKnowledge = viewerPlayer.role === "fascist" || (viewerPlayer.role === "hitler" && game.players.length <= 6);
  const knownTeam = fascistKnowledge
    ? game.players.flatMap((player, index) => player.party === "fascist" && index !== viewerPlayerIndex
      ? [{ index, name: player.name, role: player.role }]
      : [])
    : [];
  const canSeeLegislativeHand =
    (game.phase === "president_discard" && game.presidentIndex === viewerPlayerIndex) ||
    (game.phase === "chancellor_discard" && game.nominatedIndex === viewerPlayerIndex);
  const canSeePowerResult = game.phase === "executive_action" && game.presidentIndex === viewerPlayerIndex;

  return {
    ...game,
    roomCode: room.roomCode,
    hostControls: room.hostToken === token,
    viewerPlayerIndex,
    updatedAt: room.updatedAt,
    privateRole: {
      role: viewerPlayer.role,
      party: viewerPlayer.party,
      acknowledged: viewerPlayer.roleAcknowledged,
      knownTeam,
    },
    votes: Object.fromEntries(Object.keys(game.votes).map((index) => [index, index === String(viewerPlayerIndex) || game.phase !== "election" ? game.votes[index] : true])),
    legislativeHand: canSeeLegislativeHand ? game.legislativeHand : game.legislativeHand.map(() => "hidden"),
    executiveAction: game.executiveAction
      ? { ...game.executiveAction, result: canSeePowerResult ? game.executiveAction.result : game.executiveAction.result ? true : null }
      : null,
    policyDeck: Array(game.policyDeck.length).fill("hidden"),
    discardPile: Array(game.discardPile.length).fill("hidden"),
    players: game.players.map((player, index) => ({
      playerId: player.playerId,
      name: player.name,
      isComputer: player.isComputer,
      alive: player.alive,
      roleAcknowledged: player.roleAcknowledged,
      isViewer: index === viewerPlayerIndex,
      ...(game.phase === "game_over" ? { role: player.role, party: player.party } : {}),
    })),
  };
}

function createHumanPlayer(name, token) {
  return {
    playerId: `player-${randomValue(12)}`,
    name: String(name || "").trim() || "Player",
    isComputer: false,
    token,
  };
}

async function requireRoom(roomCode) {
  const room = await loadSecretHitlerRoom(String(roomCode || "").trim().toUpperCase());
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
  await saveSecretHitlerRoom(room);
}

async function uniqueRoomCode() {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    const code = randomValue(5, "ABCDEFGHJKLMNPQRSTUVWXYZ23456789");
    if (!(await secretHitlerRoomExists(code))) return code;
  }
  throw new Error("Could not create a unique room code. Try again.");
}

function randomValue(length, alphabet = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789") {
  return Array.from({ length }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join("");
}
