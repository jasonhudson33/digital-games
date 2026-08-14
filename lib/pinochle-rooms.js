import {
  canTakeRestOfPinochleTricks,
  choosePinochleBotBid,
  choosePinochleBotCard,
  choosePinochleBotDiscard,
  choosePinochleBotPartnerPass,
  choosePinochleBotPartnerReturn,
  choosePinochleBotTrump,
  choosePinochleTrump,
  clearPinochleTrick,
  createPinochleGame,
  declareTwoPlayerPinochleMeld,
  discardPinochleKitty,
  getAvailableTwoPlayerMelds,
  migratePinochleScoring,
  passPinochleBid,
  passPinochlePartnerCards,
  placePinochleBid,
  playPinochleCard,
  returnPinochlePartnerCards,
  skipTwoPlayerPinochleMeld,
  startNextPinochleRound,
  takeRestOfPinochleTricks,
} from "./pinochle.js";
import { loadPinochleRoom, pinochleRoomExists, savePinochleRoom } from "./pinochle-room-store.js";

const MAX_PLAYERS = 6;

export async function createPinochleRoom({ name }) {
  const roomCode = await uniqueRoomCode();
  const hostToken = randomValue(28);
  const room = {
    roomCode,
    hostToken,
    players: [createHumanPlayer(name, hostToken)],
    game: null,
    updatedAt: Date.now(),
  };
  await savePinochleRoom(room);
  return { token: hostToken, state: serializeRoom(room, hostToken) };
}

export async function joinPinochleRoom({ roomCode, name }) {
  const room = await requireRoom(roomCode);
  requireLobby(room);
  if (room.players.length >= MAX_PLAYERS) throw new Error("That Pinochle table already has six players.");
  const token = randomValue(28);
  room.players.push(createHumanPlayer(name, token));
  await touchAndSave(room);
  return { token, state: serializeRoom(room, token) };
}

export async function getPinochleRoom({ roomCode, token }) {
  const room = await requireRoom(roomCode);
  requireHuman(room, token);
  return { state: serializeRoom(room, token) };
}

export async function addPinochleComputer({ roomCode, token }) {
  const room = await requireRoom(roomCode);
  requireHost(room, token);
  requireLobby(room);
  if (room.players.length >= MAX_PLAYERS) throw new Error("Pinochle supports at most six players.");
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

export async function removePinochleComputer({ roomCode, token, playerId }) {
  const room = await requireRoom(roomCode);
  requireHost(room, token);
  requireLobby(room);
  const computer = room.players.find((player) => player.playerId === playerId && player.isComputer);
  if (!computer) throw new Error("Computer player not found.");
  room.players = room.players.filter((player) => player.playerId !== playerId);
  await touchAndSave(room);
  return { state: serializeRoom(room, token) };
}

export async function startPinochleRoom({ roomCode, token, random = Math.random }) {
  const room = await requireRoom(roomCode);
  requireHost(room, token);
  requireLobby(room);
  if (room.players.length < 2 || room.players.length > MAX_PLAYERS) {
    throw new Error("Pinochle needs two to six players.");
  }
  room.game = createPinochleGame({
    playerSeeds: room.players,
    startingPlayerIndex: Math.floor(random(room.players.length) * room.players.length),
  });
  runPinochleComputers(room);
  await touchAndSave(room);
  return { state: serializeRoom(room, token) };
}

export async function bidPinochleRoom({ roomCode, token, amount }) {
  return updateGame(roomCode, token, (game, playerIndex) => placePinochleBid(game, playerIndex, amount));
}

export async function passPinochleRoom({ roomCode, token }) {
  return updateGame(roomCode, token, (game, playerIndex) => passPinochleBid(game, playerIndex));
}

export async function choosePinochleRoomTrump({ roomCode, token, trump }) {
  return updateGame(roomCode, token, (game, playerIndex) => choosePinochleTrump(game, playerIndex, trump));
}

export async function discardPinochleRoomKitty({ roomCode, token, cardIds }) {
  return updateGame(roomCode, token, (game, playerIndex) => discardPinochleKitty(game, playerIndex, cardIds));
}

export async function passPinochleRoomPartnerCards({ roomCode, token, cardIds }) {
  return updateGame(roomCode, token, (game, playerIndex) => passPinochlePartnerCards(game, playerIndex, cardIds));
}

export async function returnPinochleRoomPartnerCards({ roomCode, token, cardIds }) {
  return updateGame(roomCode, token, (game, playerIndex) => returnPinochlePartnerCards(game, playerIndex, cardIds));
}

export async function playPinochleRoomCard({ roomCode, token, cardId }) {
  return updateGame(roomCode, token, (game, playerIndex) => playPinochleCard(game, playerIndex, cardId));
}

export async function takeRestOfPinochleRoomTricks({ roomCode, token }) {
  return updateGame(roomCode, token, (game, playerIndex) => takeRestOfPinochleTricks(game, playerIndex));
}

export async function clearPinochleRoomTrick({ roomCode, token }) {
  return updateGame(roomCode, token, (game) => clearPinochleTrick(game));
}

export async function declareTwoPlayerPinochleRoomMeld({ roomCode, token, meldKey }) {
  return updateGame(roomCode, token, (game, playerIndex) => declareTwoPlayerPinochleMeld(game, playerIndex, meldKey));
}

export async function skipTwoPlayerPinochleRoomMeld({ roomCode, token }) {
  return updateGame(roomCode, token, (game, playerIndex) => skipTwoPlayerPinochleMeld(game, playerIndex));
}

export async function startNextPinochleRoomRound({ roomCode, token }) {
  const room = await requireRoom(roomCode);
  requireHost(room, token);
  if (room.game?.phase !== "round-over") throw new Error("The current round is not over.");
  room.game = startNextPinochleRound(room.game);
  runPinochleComputers(room);
  await touchAndSave(room);
  return { state: serializeRoom(room, token) };
}

async function updateGame(roomCode, token, updater) {
  const room = await requireRoom(roomCode);
  const human = requireHuman(room, token);
  if (!room.game) throw new Error("The host has not started the game.");
  const playerIndex = room.game.players.findIndex((player) => player.playerId === human.playerId);
  room.game = updater(room.game, playerIndex);
  runPinochleComputers(room);
  await touchAndSave(room);
  return { state: serializeRoom(room, token) };
}

function runPinochleComputers(room) {
  let steps = 0;
  while (room.game && steps < 10000) {
    const game = room.game;
    const playerIndex = game.currentPlayerIndex;
    const player = game.players[playerIndex];
    if (!player?.isComputer) return;
    if (game.phase === "bidding") {
      const bid = choosePinochleBotBid(game, playerIndex);
      room.game = bid === null ? passPinochleBid(game, playerIndex) : placePinochleBid(game, playerIndex, bid);
    } else if (game.phase === "choosing-trump") {
      room.game = choosePinochleTrump(game, playerIndex, choosePinochleBotTrump(game, playerIndex));
    } else if (game.phase === "discarding-kitty") {
      room.game = discardPinochleKitty(game, playerIndex, choosePinochleBotDiscard(game, playerIndex));
    } else if (game.phase === "partner-passing") {
      room.game = passPinochlePartnerCards(game, playerIndex, choosePinochleBotPartnerPass(game, playerIndex));
    } else if (game.phase === "bidder-returning") {
      room.game = returnPinochlePartnerCards(game, playerIndex, choosePinochleBotPartnerReturn(game, playerIndex));
    } else if (game.phase === "two-player-melding") {
      const meld = [...getAvailableTwoPlayerMelds(game, playerIndex)].sort((left, right) => right.points - left.points)[0];
      room.game = meld
        ? declareTwoPlayerPinochleMeld(game, playerIndex, meld.key)
        : skipTwoPlayerPinochleMeld(game, playerIndex);
    } else if (game.phase === "playing") {
      if (canTakeRestOfPinochleTricks(game, playerIndex)) {
        room.game = takeRestOfPinochleTricks(game, playerIndex);
      } else {
        const card = choosePinochleBotCard(game, playerIndex);
        if (!card) throw new Error("A computer player could not choose a card.");
        room.game = playPinochleCard(game, playerIndex, card.id);
      }
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
  const visibleContractPlayerIndexes = new Set([
    room.game.highBidderIndex,
    ...(room.game.revealedContractPlayerIndexes || []),
  ]);
  if (room.game.contractPlayerIndexes?.includes(viewerPlayerIndex)) visibleContractPlayerIndexes.add(viewerPlayerIndex);
  return {
    ...room.game,
    roomCode: room.roomCode,
    hostControls: room.hostToken === token,
    viewerPlayerIndex,
    updatedAt: room.updatedAt,
    kitty: [],
    stock: [],
    stockCount: (room.game.stock?.length || 0) + (room.game.stockTrumpCard ? 1 : 0),
    canTakeRest: canTakeRestOfPinochleTricks(room.game, viewerPlayerIndex),
    contractPlayerIndexes: room.game.playerCount === 5
      ? [...visibleContractPlayerIndexes].filter((index) => Number.isInteger(index)).sort((left, right) => left - right)
      : room.game.contractPlayerIndexes,
    partnerPasses: Object.fromEntries(Object.keys(room.game.partnerPasses || {}).map((playerIndex) => [playerIndex, true])),
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
    name: String(name || "").trim().slice(0, 18) || "Player",
    isComputer: false,
    token,
  };
}

function requireLobby(room) {
  if (room.game) throw new Error("The game has already started.");
}

async function requireRoom(roomCode) {
  const room = await loadPinochleRoom(String(roomCode || "").trim().toUpperCase());
  if (!room) throw new Error("Room not found.");
  const migratedGame = migratePinochleScoring(room.game);
  if (migratedGame !== room.game) {
    room.game = migratedGame;
    await touchAndSave(room);
  }
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
  await savePinochleRoom(room);
}

async function uniqueRoomCode() {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    const code = randomValue(5, "ABCDEFGHJKLMNPQRSTUVWXYZ23456789");
    if (!(await pinochleRoomExists(code))) return code;
  }
  throw new Error("Could not create a unique room code. Try again.");
}

function randomValue(length, alphabet = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789") {
  return Array.from({ length }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join("");
}
