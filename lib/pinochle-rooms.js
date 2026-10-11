import { randomString as randomValue } from "./random.js";
import { chooseComputerSpeed, computerView } from "./room-computer-speed.js";
import {
  acknowledgePinochleExchange,
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

export async function acknowledgePinochleRoomExchange({ roomCode, token }) {
  return updateGame(roomCode, token, (game, playerIndex) => acknowledgePinochleExchange(game, playerIndex));
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
  await touchAndSave(room);
  return { state: serializeRoom(room, token) };
}

async function updateGame(roomCode, token, updater) {
  const room = await requireRoom(roomCode);
  const human = requireHuman(room, token);
  if (!room.game) throw new Error("The host has not started the game.");
  const playerIndex = room.game.players.findIndex((player) => player.playerId === human.playerId);
  room.game = updater(room.game, playerIndex);
  await touchAndSave(room);
  return { state: serializeRoom(room, token) };
}

/**
 * The next computer move, or the same game when no computer is due. One move
 * per call: the host's browser asks for each one, at the room's speed.
 */
export function pinochleComputerMove(game) {
  const playerIndex = game.currentPlayerIndex;
  const player = game.players[playerIndex];
  if (!player?.isComputer) return game;
  if (game.phase === "bidding") {
    const bid = choosePinochleBotBid(game, playerIndex);
    return bid === null ? passPinochleBid(game, playerIndex) : placePinochleBid(game, playerIndex, bid);
  }
  if (game.phase === "choosing-trump") {
    return choosePinochleTrump(game, playerIndex, choosePinochleBotTrump(game, playerIndex));
  }
  if (game.phase === "discarding-kitty") {
    return discardPinochleKitty(game, playerIndex, choosePinochleBotDiscard(game, playerIndex));
  }
  if (game.phase === "partner-passing") {
    return passPinochlePartnerCards(game, playerIndex, choosePinochleBotPartnerPass(game, playerIndex));
  }
  if (game.phase === "bidder-returning") {
    return returnPinochlePartnerCards(game, playerIndex, choosePinochleBotPartnerReturn(game, playerIndex));
  }
  if (game.phase === "acknowledging-exchange") {
    return acknowledgePinochleExchange(game, playerIndex);
  }
  if (game.phase === "two-player-melding") {
    const meld = [...getAvailableTwoPlayerMelds(game, playerIndex)].sort((left, right) => right.points - left.points)[0];
    return meld
      ? declareTwoPlayerPinochleMeld(game, playerIndex, meld.key)
      : skipTwoPlayerPinochleMeld(game, playerIndex);
  }
  if (game.phase === "playing") {
    if (canTakeRestOfPinochleTricks(game, playerIndex)) return takeRestOfPinochleTricks(game, playerIndex);
    const card = choosePinochleBotCard(game, playerIndex);
    if (!card) throw new Error("A computer player could not choose a card.");
    return playPinochleCard(game, playerIndex, card.id);
  }
  return game;
}

/** Host only: one computer move, saved. Nothing due changes nothing. */
export async function stepPinochleComputer({ roomCode, token }) {
  const room = await requireRoom(roomCode);
  requireHost(room, token);
  if (!room.game) return { state: serializeRoom(room, token) };
  const next = pinochleComputerMove(room.game);
  if (next === room.game) return { state: serializeRoom(room, token) };
  room.game = next;
  await touchAndSave(room);
  return { state: serializeRoom(room, token) };
}

/** Any seated human: the room's computer speed. */
export async function setPinochleComputerSpeed({ roomCode, token, ms }) {
  const room = await requireRoom(roomCode);
  requireHuman(room, token);
  const speed = chooseComputerSpeed(ms);
  if (room.computerDelayMs === speed) return { state: serializeRoom(room, token) };
  room.computerDelayMs = speed;
  await touchAndSave(room);
  return { state: serializeRoom(room, token) };
}

function serializeRoom(room, token) {
  const viewer = requireHuman(room, token);
  if (!room.game) {
    return {
      roomCode: room.roomCode,
      phase: "lobby",
      hostControls: room.hostToken === token,
      updatedAt: room.updatedAt,
      ...computerView(room, null, pinochleComputerMove),
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
    ...computerView(room, room.game, pinochleComputerMove),
    kitty: [],
    stock: [],
    stockCount: (room.game.stock?.length || 0) + (room.game.stockTrumpCard ? 1 : 0),
    canTakeRest: canTakeRestOfPinochleTricks(room.game, viewerPlayerIndex),
    contractPlayerIndexes: room.game.playerCount === 5
      ? [...visibleContractPlayerIndexes].filter((index) => Number.isInteger(index)).sort((left, right) => left - right)
      : room.game.contractPlayerIndexes,
    partnerPasses: Object.fromEntries(Object.keys(room.game.partnerPasses || {}).map((playerIndex) => [playerIndex, true])),
    exchangeAcknowledgment: room.game.exchangeAcknowledgment ? {
      senderIndex: room.game.exchangeAcknowledgment.senderIndex,
      recipientIndex: room.game.exchangeAcknowledgment.recipientIndex,
      cardCount: room.game.exchangeAcknowledgment.cards.length,
      cards: room.game.exchangeAcknowledgment.recipientIndex === viewerPlayerIndex
        ? room.game.exchangeAcknowledgment.cards
        : [],
    } : null,
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

