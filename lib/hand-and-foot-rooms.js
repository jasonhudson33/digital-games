import {
  activeCardsFor,
  chooseHandFootBotDiscard,
  chooseHandFootBotPlay,
  createHandFootRoomMatch,
  discardHandFootCard,
  drawHandFootCards,
  isThree,
  playHandFootCards,
  startNextHandFootRound,
} from "./hand-and-foot.js";
import {
  handFootRoomExists,
  loadHandFootRoom,
  saveHandFootRoom,
} from "./hand-and-foot-room-store.js";

export async function createHandFootRoom({ name }) {
  const roomCode = await uniqueRoomCode();
  const hostToken = randomValue(28);
  const host = createHumanPlayer(name, hostToken);
  const room = {
    roomCode,
    hostToken,
    players: [host],
    teammatePreferences: {},
    game: null,
    updatedAt: Date.now(),
  };
  await saveHandFootRoom(room);
  return { token: hostToken, state: serializeRoom(room, hostToken) };
}

export async function joinHandFootRoom({ roomCode, name }) {
  const room = await requireRoom(roomCode);
  if (room.game) throw new Error("That game has already started.");
  if (room.players.length >= 8) throw new Error("That room already has eight players.");
  const token = randomValue(28);
  room.players.push(createHumanPlayer(name, token));
  await touchAndSave(room);
  return { token, state: serializeRoom(room, token) };
}

export async function getHandFootRoom({ roomCode, token }) {
  const room = await requireRoom(roomCode);
  requireHuman(room, token);
  return { state: serializeRoom(room, token) };
}

export async function addHandFootComputer({ roomCode, token }) {
  const room = await requireRoom(roomCode);
  requireHost(room, token);
  requireLobby(room);
  if (room.players.length >= 8) throw new Error("Hand and Foot supports at most eight players.");
  const computerNumber = room.players.filter((player) => player.isComputer).length + 1;
  room.players.push({
    playerId: `computer-${randomValue(10)}`,
    name: `Computer ${computerNumber}`,
    isComputer: true,
    token: null,
  });
  await touchAndSave(room);
  return { state: serializeRoom(room, token) };
}

export async function removeHandFootComputer({ roomCode, token, playerId }) {
  const room = await requireRoom(roomCode);
  requireHost(room, token);
  requireLobby(room);
  const computer = room.players.find((player) => player.playerId === playerId && player.isComputer);
  if (!computer) throw new Error("Computer player not found.");
  room.players = room.players.filter((player) => player.playerId !== playerId);
  delete room.teammatePreferences[playerId];
  for (const [chooserId, teammateId] of Object.entries(room.teammatePreferences)) {
    if (teammateId === playerId) delete room.teammatePreferences[chooserId];
  }
  await touchAndSave(room);
  return { state: serializeRoom(room, token) };
}

export async function chooseHandFootTeammate({ roomCode, token, teammateId }) {
  const room = await requireRoom(roomCode);
  requireLobby(room);
  const human = requireHuman(room, token);
  const teammate = room.players.find((player) => player.playerId === teammateId);
  if (!teammate || teammate.playerId === human.playerId) throw new Error("Choose another player as your teammate.");
  room.teammatePreferences[human.playerId] = teammate.playerId;
  await touchAndSave(room);
  return { state: serializeRoom(room, token) };
}

export async function startHandFootRoom({ roomCode, token }) {
  const room = await requireRoom(roomCode);
  requireHost(room, token);
  requireLobby(room);
  if (room.players.length < 4 || room.players.length % 2 !== 0) {
    throw new Error("Hand and Foot needs an even number of players and at least four.");
  }
  room.game = createHandFootRoomMatch({
    teamPairs: buildHandFootTeamPairs(room.players, room.teammatePreferences),
  });
  runHandFootComputers(room);
  await touchAndSave(room);
  return { state: serializeRoom(room, token) };
}

export async function drawHandFootRoomCards({ roomCode, token }) {
  return updateGame(roomCode, token, (game, playerIndex) => drawHandFootCards(game, playerIndex));
}

export async function playHandFootRoomCards({ roomCode, token, cardIds }) {
  return updateGame(roomCode, token, (game, playerIndex) => playHandFootCards(game, playerIndex, cardIds));
}

export async function discardHandFootRoomCard({ roomCode, token, cardId }) {
  return updateGame(roomCode, token, (game, playerIndex) => discardHandFootCard(game, playerIndex, cardId));
}

export async function startNextHandFootRoomRound({ roomCode, token }) {
  const room = await requireRoom(roomCode);
  requireHost(room, token);
  if (room.game?.phase !== "round-over") throw new Error("The current round is not over.");
  room.game = startNextHandFootRound(room.game);
  runHandFootComputers(room);
  await touchAndSave(room);
  return { state: serializeRoom(room, token) };
}

export function buildHandFootTeamPairs(players, teammatePreferences = {}) {
  if (players.length < 4 || players.length % 2 !== 0 || players.length > 8) {
    throw new Error("Hand and Foot requires an even number of players from 4 to 8.");
  }
  const byId = new Map(players.map((player) => [player.playerId, player]));
  const unpaired = new Set(byId.keys());
  const pairs = [];
  const pair = (leftId, rightId) => {
    if (leftId === rightId || !unpaired.has(leftId) || !unpaired.has(rightId)) return false;
    pairs.push([byId.get(leftId), byId.get(rightId)]);
    unpaired.delete(leftId);
    unpaired.delete(rightId);
    return true;
  };

  for (const player of players) {
    const preferredId = teammatePreferences[player.playerId];
    if (preferredId && teammatePreferences[preferredId] === player.playerId) pair(player.playerId, preferredId);
  }
  for (const player of players) {
    const preferredId = teammatePreferences[player.playerId];
    if (preferredId) pair(player.playerId, preferredId);
  }
  const remaining = players.filter((player) => unpaired.has(player.playerId));
  for (let index = 0; index < remaining.length; index += 2) pair(remaining[index].playerId, remaining[index + 1].playerId);
  return pairs;
}

async function updateGame(roomCode, token, updater) {
  const room = await requireRoom(roomCode);
  const human = requireHuman(room, token);
  if (!room.game) throw new Error("The host has not started the game.");
  const playerIndex = room.game.players.findIndex((player) => player.playerId === human.playerId);
  room.game = updater(room.game, playerIndex);
  runHandFootComputers(room);
  await touchAndSave(room);
  return { state: serializeRoom(room, token) };
}

function runHandFootComputers(room) {
  let turns = 0;
  while (room.game?.phase === "playing" && turns < 1000) {
    const playerIndex = room.game.currentPlayerIndex;
    const player = room.game.players[playerIndex];
    if (!player?.isComputer) return;
    let next = room.game;
    if (next.turnStage === "draw") next = drawHandFootCards(next, playerIndex);
    let meldAttempts = 0;
    while (next.phase === "playing" && meldAttempts < 12) {
      meldAttempts += 1;
      const cardIds = chooseHandFootBotPlay(next, playerIndex);
      const activeCount = activeCardsFor(next, playerIndex).length;
      if (!cardIds.length || activeCount - cardIds.length === 1) break;
      try {
        next = playHandFootCards(next, playerIndex, cardIds);
      } catch {
        break;
      }
    }
    if (next.phase !== "playing") {
      room.game = next;
      return;
    }
    const discard = chooseHandFootBotDiscard(next, playerIndex);
    if (!discard) throw new Error("A computer player could not discard.");
    room.game = discardHandFootCard(next, playerIndex, discard.id);
    turns += 1;
  }
  if (turns >= 1000) throw new Error("Computer turns did not finish.");
}

function serializeRoom(room, token) {
  const viewer = requireHuman(room, token);
  if (!room.game) {
    return {
      roomCode: room.roomCode,
      phase: "lobby",
      hostControls: room.hostToken === token,
      viewerPlayerId: viewer.playerId,
      viewerTeammateId: room.teammatePreferences[viewer.playerId] || "",
      teammatePreferences: { ...room.teammatePreferences },
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
  const viewerTeam = game.teams[viewerPlayer.teamId];
  const teammateIndex = viewerTeam.memberIds.find((id) => id !== viewerPlayerIndex);
  const viewerTeammateHasThree = activeCardsFor(game, teammateIndex).some(isThree);
  return {
    ...game,
    roomCode: room.roomCode,
    hostControls: room.hostToken === token,
    viewerPlayerIndex,
    viewerTeammateHasThree,
    updatedAt: room.updatedAt,
    drawPile: Array(game.drawPile.length).fill(null),
    players: game.players.map((player, index) => ({
      ...player,
      handCount: player.hand.length,
      footCount: player.foot.length,
      hand: index === viewerPlayerIndex ? player.hand : [],
      foot: index === viewerPlayerIndex && player.usingFoot ? player.foot : [],
      isViewer: index === viewerPlayerIndex,
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

function requireLobby(room) {
  if (room.game) throw new Error("The game has already started.");
}

async function requireRoom(roomCode) {
  const room = await loadHandFootRoom(String(roomCode || "").trim().toUpperCase());
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
  await saveHandFootRoom(room);
}

async function uniqueRoomCode() {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    const code = randomValue(5, "ABCDEFGHJKLMNPQRSTUVWXYZ23456789");
    if (!(await handFootRoomExists(code))) return code;
  }
  throw new Error("Could not create a unique room code. Try again.");
}

function randomValue(length, alphabet = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789") {
  return Array.from({ length }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join("");
}
