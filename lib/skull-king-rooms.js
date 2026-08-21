import { randomString as randomValue } from "./random.js";
import {
  chooseBotPirateAbility,
  chooseBotBid,
  chooseBotSkullKingPlay,
  chooseBotWalkThePlank,
  collectSkullKingTrick,
  createSkullKingMatch,
  getSkullKingActingPlayerIndex,
  getSkullKingGhostControllerIndex,
  getSkullKingGhostDeclaration,
  getSkullKingGhostIndex,
  playSkullKingCard,
  resolveSkullKingPirateAbility,
  resolveWalkThePlank,
  startNextSkullKingRound,
  submitSkullKingBid,
} from "./skull-king.js";
import {
  loadSkullKingRoom,
  saveSkullKingRoom,
  skullKingRoomExists,
} from "./skull-king-room-store.js";

const MIN_PLAYERS = 2;
const MAX_PLAYERS = 9;

export async function createSkullKingRoom({ name }) {
  const roomCode = await uniqueRoomCode();
  const hostToken = randomValue(28);
  const room = {
    roomCode,
    hostToken,
    players: [createHumanPlayer(name, hostToken)],
    game: null,
    updatedAt: Date.now(),
  };
  await saveSkullKingRoom(room);
  return { token: hostToken, state: serializeRoom(room, hostToken) };
}

export async function joinSkullKingRoom({ roomCode, name }) {
  const room = await requireRoom(roomCode);
  requireLobby(room);
  if (room.players.length >= MAX_PLAYERS) throw new Error("That Skull King room already has nine captains.");
  const token = randomValue(28);
  room.players.push(createHumanPlayer(name, token));
  await touchAndSave(room);
  return { token, state: serializeRoom(room, token) };
}

export async function getSkullKingRoom({ roomCode, token }) {
  const room = await requireRoom(roomCode);
  requireHuman(room, token);
  return { state: serializeRoom(room, token) };
}

export async function addSkullKingComputer({ roomCode, token }) {
  const room = await requireRoom(roomCode);
  requireHost(room, token);
  requireLobby(room);
  if (room.players.length >= MAX_PLAYERS) throw new Error("Skull King supports at most nine captains.");
  const number = room.players.filter((player) => player.isComputer).length + 1;
  room.players.push({
    playerId: `computer-${randomValue(10)}`,
    name: `Computer ${number}`,
    isComputer: true,
    token: null,
  });
  await touchAndSave(room);
  return { state: serializeRoom(room, token) };
}

export async function removeSkullKingComputer({ roomCode, token, playerId }) {
  const room = await requireRoom(roomCode);
  requireHost(room, token);
  requireLobby(room);
  const computer = room.players.find((player) => player.playerId === playerId && player.isComputer);
  if (!computer) throw new Error("Computer captain not found.");
  room.players = room.players.filter((player) => player.playerId !== playerId);
  await touchAndSave(room);
  return { state: serializeRoom(room, token) };
}

export async function startSkullKingRoom({ roomCode, token, random = Math.random }) {
  const room = await requireRoom(roomCode);
  requireHost(room, token);
  requireLobby(room);
  if (room.players.length < MIN_PLAYERS || room.players.length > MAX_PLAYERS) {
    throw new Error("Skull King needs two to nine captains.");
  }
  room.game = createSkullKingMatch({
    playerSeeds: room.players,
    startingPlayerIndex: Math.floor(random(room.players.length) * room.players.length),
  });
  runSkullKingComputers(room);
  await touchAndSave(room);
  return { state: serializeRoom(room, token) };
}

export async function bidSkullKingRoom({ roomCode, token, bid }) {
  return updateGame(roomCode, token, (game, playerIndex) => submitSkullKingBid(game, playerIndex, bid));
}

export async function playSkullKingRoomCard({ roomCode, token, cardId, flipGhost = false, declaration = null }) {
  return updateGame(roomCode, token, (game, playerIndex) => {
    if (getSkullKingActingPlayerIndex(game) !== playerIndex) return game;
    const ghostIndex = getSkullKingGhostIndex(game);
    if (game.currentPlayerIndex === ghostIndex) {
      const ghostCard = flipGhost ? game.players[ghostIndex].hand[0] : null;
      if (!ghostCard) return game;
      return playSkullKingCard(game, ghostIndex, ghostCard.id, getSkullKingGhostDeclaration(ghostCard));
    }
    return playSkullKingCard(game, game.currentPlayerIndex, cardId, declaration);
  });
}

export async function resolveSkullKingRoomWalkThePlank({ roomCode, token, cardId }) {
  return updateGame(roomCode, token, (game, playerIndex) => {
    if (decisionControllerIndex(game, game.pendingWalkThePlank?.playerIndex) !== playerIndex) return game;
    return resolveWalkThePlank(game, cardId);
  });
}

export async function resolveSkullKingRoomPirateAbility({ roomCode, token, choice = {} }) {
  return updateGame(roomCode, token, (game, playerIndex) => {
    if (decisionControllerIndex(game, game.pendingPirateAbility?.playerIndex) !== playerIndex) return game;
    return resolveSkullKingPirateAbility(game, choice);
  });
}

export async function collectSkullKingRoomTrick({ roomCode, token }) {
  return updateGame(roomCode, token, (game) => collectSkullKingTrick(game));
}

export async function startNextSkullKingRoomRound({ roomCode, token }) {
  const room = await requireRoom(roomCode);
  requireHost(room, token);
  if (room.game?.phase !== "roundComplete") throw new Error("The current round is not complete.");
  room.game = startNextSkullKingRound(room.game);
  runSkullKingComputers(room);
  await touchAndSave(room);
  return { state: serializeRoom(room, token) };
}

export async function restartSkullKingRoom({ roomCode, token, random = Math.random }) {
  const room = await requireRoom(roomCode);
  requireHost(room, token);
  if (room.game?.phase !== "gameOver") throw new Error("The current voyage is not complete.");
  room.game = createSkullKingMatch({
    playerSeeds: room.players,
    startingPlayerIndex: Math.floor(random(room.players.length) * room.players.length),
  });
  runSkullKingComputers(room);
  await touchAndSave(room);
  return { state: serializeRoom(room, token) };
}

async function updateGame(roomCode, token, updater) {
  const room = await requireRoom(roomCode);
  const human = requireHuman(room, token);
  if (!room.game) throw new Error("The host has not started the game.");
  const playerIndex = room.game.players.findIndex((player) => player.playerId === human.playerId);
  const nextGame = updater(room.game, playerIndex);
  if (nextGame === room.game) throw new Error("That action is not available right now.");
  room.game = nextGame;
  runSkullKingComputers(room);
  await touchAndSave(room);
  return { state: serializeRoom(room, token) };
}

function runSkullKingComputers(room) {
  let steps = 0;
  while (room.game && steps < 10000) {
    const game = room.game;
    if (game.phase === "bidding") {
      const computerIndex = game.players.findIndex((player) => player.isComputer && player.bid === null);
      if (computerIndex < 0) return;
      room.game = submitSkullKingBid(
        game,
        computerIndex,
        chooseBotBid(game.players[computerIndex].hand, game.roundNumber),
      );
    } else if (["playing", "lastVolley"].includes(game.phase)) {
      const actingPlayerIndex = getSkullKingActingPlayerIndex(game);
      if (!game.players[actingPlayerIndex]?.isComputer) return;
      const ghostIndex = getSkullKingGhostIndex(game);
      if (game.currentPlayerIndex === ghostIndex) {
        const ghostHand = game.players[ghostIndex].hand;
        const ghostCard = ghostHand[0];
        if (!ghostCard) throw new Error("The Ghost Crew could not choose a card.");
        room.game = playSkullKingCard(game, ghostIndex, ghostCard.id, getSkullKingGhostDeclaration(ghostCard));
      } else {
        const play = chooseBotSkullKingPlay(game, game.currentPlayerIndex);
        if (!play) throw new Error("A computer captain could not choose a card.");
        room.game = playSkullKingCard(
          game,
          game.currentPlayerIndex,
          play.card.id,
          play.declaredSuit ?? play.declaredRole ?? play.declaredValue,
        );
      }
    } else if (game.phase === "walkThePlank") {
      const playerIndex = game.pendingWalkThePlank?.playerIndex;
      if (!game.players[decisionControllerIndex(game, playerIndex)]?.isComputer) return;
      room.game = resolveWalkThePlank(game, chooseBotWalkThePlank(game));
    } else if (game.phase === "pirateAbility") {
      const playerIndex = game.pendingPirateAbility?.playerIndex;
      const ghostIndex = getSkullKingGhostIndex(game);
      if (playerIndex !== ghostIndex && !game.players[decisionControllerIndex(game, playerIndex)]?.isComputer) return;
      room.game = resolveSkullKingPirateAbility(game, chooseBotPirateAbility(game));
    } else {
      return;
    }
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
      viewerPlayerId: viewer.playerId,
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
  const ghostIndex = getSkullKingGhostIndex(game);
  const canInspectDrawPile = game.phase === "pirateAbility"
    && game.pendingPirateAbility?.pirateKey === "juanita"
    && game.pendingPirateAbility.playerIndex === viewerPlayerIndex;
  const pendingPirateAbility = game.pendingPirateAbility
    ? {
      ...game.pendingPirateAbility,
      drawnCardIds: game.pendingPirateAbility.playerIndex === viewerPlayerIndex
        ? game.pendingPirateAbility.drawnCardIds
        : [],
    }
    : null;

  return {
    ...game,
    roomCode: room.roomCode,
    hostControls: room.hostToken === token,
    viewerPlayerIndex,
    updatedAt: room.updatedAt,
    drawPile: canInspectDrawPile ? game.drawPile : [],
    pendingPirateAbility,
    forcedPlay: game.forcedPlay?.playerIndex === viewerPlayerIndex
      ? game.forcedPlay
      : game.forcedPlay ? { playerIndex: game.forcedPlay.playerIndex, chosenByPlayerIndex: game.forcedPlay.chosenByPlayerIndex } : null,
    players: game.players.map((player, index) => ({
      ...player,
      bid: game.phase === "bidding" && index !== viewerPlayerIndex && !player.isGhost ? null : player.bid,
      handCount: player.hand.length,
      hand: index === viewerPlayerIndex ? player.hand : [],
      isViewer: index === viewerPlayerIndex,
    })),
  };
}

function decisionControllerIndex(game, decisionPlayerIndex) {
  const ghostIndex = getSkullKingGhostIndex(game);
  return decisionPlayerIndex === ghostIndex
    ? getSkullKingGhostControllerIndex(game)
    : decisionPlayerIndex;
}

function createHumanPlayer(name, token) {
  return {
    playerId: `player-${randomValue(12)}`,
    name: String(name || "").trim().slice(0, 18) || "Player",
    isComputer: false,
    token,
  };
}

function requireLobby(room) {
  if (room.game) throw new Error("The game has already started.");
}

async function requireRoom(roomCode) {
  const room = await loadSkullKingRoom(String(roomCode || "").trim().toUpperCase());
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
  await saveSkullKingRoom(room);
}

async function uniqueRoomCode() {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    const code = randomValue(5, "ABCDEFGHJKLMNPQRSTUVWXYZ23456789");
    if (!(await skullKingRoomExists(code))) return code;
  }
  throw new Error("Could not create a unique room code. Try again.");
}

