import { randomString as randomValue } from "./random.js";
import {
  buyKillerBunniesShopItem,
  chooseKillerBunniesCarrot,
  chooseKillerBunniesDefectorTarget,
  chooseKillerBunniesMisfortuneTarget,
  chooseKillerBunniesModifierTarget,
  chooseKillerBunniesTarget,
  chooseInitialKillerBunniesRun,
  createKillerBunniesGame,
  KILLER_BUNNIES_CARD_COUNTS,
  drawKillerBunniesPile,
  discardKillerBunniesDefectorDetector,
  discardExtraKillerBunniesCard,
  playSavedKillerBunniesSpecial,
  playTopRun,
  replaceBottomRun,
  resolveKillerBunniesDefense,
  resolveKillerBunniesDefectorRoll,
  resolveKillerBunniesImmediateCard,
  resolveKillerBunniesManualCard,
  resolveKillerBunniesSpecialChoice,
  runKillerBunniesComputers,
} from "./killer-bunnies.js";
import {
  killerBunniesRoomExists,
  loadKillerBunniesRoom,
  saveKillerBunniesRoom,
} from "./killer-bunnies-room-store.js";
import {
  KILLER_BUNNIES_EXPANSIONS,
  getKillerBunniesExpansionSummary,
  normalizeKillerBunniesExpansionIds,
} from "./killer-bunnies-expansions.js";

const MIN_PLAYERS = 2;
const MAX_PLAYERS = 8;

export async function createKillerBunniesRoom({ name }) {
  const roomCode = await uniqueRoomCode();
  const hostToken = randomValue(28);
  const room = {
    roomCode,
    hostToken,
    players: [createHumanPlayer(name, hostToken)],
    expansionIds: [],
    game: null,
    updatedAt: Date.now(),
  };
  await saveKillerBunniesRoom(room);
  return { token: hostToken, state: serializeRoom(room, hostToken) };
}

export async function joinKillerBunniesRoom({ roomCode, name }) {
  const room = await requireRoom(roomCode);
  requireLobby(room);
  if (room.players.length >= MAX_PLAYERS) throw new Error("That room already has eight players.");
  const token = randomValue(28);
  room.players.push(createHumanPlayer(name, token));
  await touchAndSave(room);
  return { token, state: serializeRoom(room, token) };
}

export async function getKillerBunniesRoom({ roomCode, token }) {
  const room = await requireRoom(roomCode);
  requireHuman(room, token);
  return { state: serializeRoom(room, token) };
}

export async function addKillerBunniesComputer({ roomCode, token }) {
  const room = await requireRoom(roomCode);
  requireHost(room, token);
  requireLobby(room);
  if (room.players.length >= MAX_PLAYERS) throw new Error("Killer Bunnies supports at most eight players.");
  const number = room.players.filter((player) => player.isComputer).length + 1;
  room.players.push({
    playerId: `computer-${randomValue(10)}`,
    name: `Bunny Bot ${number}`,
    isComputer: true,
    token: null,
  });
  await touchAndSave(room);
  return { state: serializeRoom(room, token) };
}

export async function removeKillerBunniesComputer({ roomCode, token, playerId }) {
  const room = await requireRoom(roomCode);
  requireHost(room, token);
  requireLobby(room);
  const computer = room.players.find((player) => player.playerId === playerId && player.isComputer);
  if (!computer) throw new Error("Computer player not found.");
  room.players = room.players.filter((player) => player.playerId !== playerId);
  await touchAndSave(room);
  return { state: serializeRoom(room, token) };
}

export async function setKillerBunniesExpansions({ roomCode, token, expansionIds }) {
  const room = await requireRoom(roomCode);
  requireHost(room, token);
  requireLobby(room);
  room.expansionIds = normalizeKillerBunniesExpansionIds(expansionIds);
  await touchAndSave(room);
  return { state: serializeRoom(room, token) };
}

export async function startKillerBunniesRoom({ roomCode, token, random = Math.random }) {
  const room = await requireRoom(roomCode);
  requireHost(room, token);
  requireLobby(room);
  if (room.players.length < MIN_PLAYERS || room.players.length > MAX_PLAYERS) {
    throw new Error("Killer Bunnies needs two to eight players.");
  }
  room.game = runKillerBunniesComputers(createKillerBunniesGame({
    playerSeeds: room.players,
    expansionIds: room.expansionIds,
    random,
  }));
  await touchAndSave(room);
  return { state: serializeRoom(room, token) };
}

export async function playKillerBunniesTopRun({ roomCode, token }) {
  return updateGame(roomCode, token, (game, playerIndex) => playTopRun(game, playerIndex));
}

export async function chooseInitialKillerBunniesRoomRun({ roomCode, token, topCardId, bottomCardId }) {
  return updateGame(roomCode, token, (game, playerIndex) =>
    chooseInitialKillerBunniesRun(game, playerIndex, topCardId, bottomCardId));
}

export async function chooseKillerBunniesSpecialRoom({ roomCode, token, choice }) {
  return updateGame(roomCode, token, (game, playerIndex) =>
    resolveKillerBunniesSpecialChoice(game, playerIndex, choice));
}

export async function playSavedKillerBunniesRoomSpecial({ roomCode, token, cardId }) {
  return updateGame(roomCode, token, (game, playerIndex) =>
    playSavedKillerBunniesSpecial(game, playerIndex, cardId));
}

export async function targetKillerBunniesBunny({ roomCode, token, targetPlayerIndex, bunnyId }) {
  return updateGame(roomCode, token, (game, playerIndex) =>
    chooseKillerBunniesTarget(game, playerIndex, Number(targetPlayerIndex), bunnyId));
}

export async function resolveKillerBunniesRoomDefense({ roomCode, token, choice }) {
  return updateGame(roomCode, token, (game, playerIndex) =>
    resolveKillerBunniesDefense(game, playerIndex, choice));
}

export async function resolveKillerBunniesRoomManualCard({ roomCode, token }) {
  return updateGame(roomCode, token, (game, playerIndex) => resolveKillerBunniesManualCard(game, playerIndex));
}

export async function resolveKillerBunniesRoomImmediateCard({ roomCode, token }) {
  return updateGame(roomCode, token, (game, playerIndex) => resolveKillerBunniesImmediateCard(game, playerIndex));
}

export async function chooseKillerBunniesRoomMisfortuneTarget({ roomCode, token, bunnyId }) {
  return updateGame(roomCode, token, (game, playerIndex) => chooseKillerBunniesMisfortuneTarget(game, playerIndex, bunnyId));
}

export async function chooseKillerBunniesRoomModifierTarget({ roomCode, token, targetPlayerIndex, bunnyId }) {
  return updateGame(roomCode, token, (game, playerIndex) =>
    chooseKillerBunniesModifierTarget(game, playerIndex, Number(targetPlayerIndex), bunnyId));
}

export async function chooseKillerBunniesRoomDefectorTarget({ roomCode, token, targetPlayerIndex, bunnyId }) {
  return updateGame(roomCode, token, (game, playerIndex) =>
    chooseKillerBunniesDefectorTarget(game, playerIndex, Number(targetPlayerIndex), bunnyId));
}

export async function discardKillerBunniesRoomDefectorDetector({ roomCode, token }) {
  return updateGame(roomCode, token, (game, playerIndex) => discardKillerBunniesDefectorDetector(game, playerIndex));
}

export async function resolveKillerBunniesRoomDefectorRoll({ roomCode, token, choice }) {
  return updateGame(roomCode, token, (game, playerIndex) =>
    resolveKillerBunniesDefectorRoll(game, playerIndex, choice));
}

export async function chooseKillerBunniesRoomCarrot({ roomCode, token, carrotId }) {
  return updateGame(roomCode, token, (game, playerIndex) => chooseKillerBunniesCarrot(game, playerIndex, carrotId));
}

export async function drawKillerBunniesRoomPile({ roomCode, token, pile, cardId }) {
  return updateGame(roomCode, token, (game, playerIndex) =>
    drawKillerBunniesPile(game, playerIndex, pile, { cardId }));
}

export async function buyKillerBunniesRoomShopItem({ roomCode, token, shop, item, cardId }) {
  return updateGame(roomCode, token, (game, playerIndex) =>
    buyKillerBunniesShopItem(game, playerIndex, shop, item, cardId));
}

export async function discardExtraKillerBunniesRoomCard({ roomCode, token, cardId }) {
  return updateGame(roomCode, token, (game, playerIndex) => discardExtraKillerBunniesCard(game, playerIndex, cardId));
}

export async function replaceKillerBunniesRoomRun({ roomCode, token, cardId }) {
  return updateGame(roomCode, token, (game, playerIndex) => replaceBottomRun(game, playerIndex, cardId));
}

async function updateGame(roomCode, token, updater) {
  const room = await requireRoom(roomCode);
  const human = requireHuman(room, token);
  if (!room.game) throw new Error("The host has not started the game.");
  const playerIndex = room.game.players.findIndex((player) => player.playerId === human.playerId);
  room.game = runKillerBunniesComputers(updater(room.game, playerIndex));
  await touchAndSave(room);
  return { state: serializeRoom(room, token) };
}

function serializeRoom(room, token) {
  const viewer = requireHuman(room, token);
  if (!room.game) {
    const expansionIds = normalizeKillerBunniesExpansionIds(room.expansionIds);
    const expansionSummary = getKillerBunniesExpansionSummary(expansionIds);
    return {
      roomCode: room.roomCode,
      phase: "lobby",
      hostControls: room.hostToken === token,
      viewerPlayerId: viewer.playerId,
      updatedAt: room.updatedAt,
      expansionIds,
      expansionSummary: {
        ...expansionSummary,
        totalCards: KILLER_BUNNIES_CARD_COUNTS.numbered + expansionSummary.addedCards,
      },
      expansionCatalog: KILLER_BUNNIES_EXPANSIONS,
      players: room.players.map((player) => ({
        playerId: player.playerId,
        name: player.name,
        isComputer: player.isComputer,
        isViewer: player.playerId === viewer.playerId,
      })),
    };
  }

  const game = structuredClone(room.game);
  const viewerPlayerIndex = game.players.findIndex((player) => player.playerId === viewer.playerId);
  game.players = game.players.map((player, index) => ({
    ...player,
    savedSpecials: player.savedSpecials || [],
    feedingObligations: player.feedingObligations || [],
    handCount: player.hand.length,
    hand: index === viewerPlayerIndex ? player.hand : [],
    topRun: index === viewerPlayerIndex ? player.topRun : player.topRun ? { hidden: true, id: `hidden-top-${index}` } : null,
    bottomRun: index === viewerPlayerIndex ? player.bottomRun : player.bottomRun ? { hidden: true, id: `hidden-bottom-${index}` } : null,
    isViewer: index === viewerPlayerIndex,
  }));
  return {
    ...game,
    roomCode: room.roomCode,
    hostControls: room.hostToken === token,
    viewerPlayerIndex,
    updatedAt: room.updatedAt,
    magicCarrotDeck: game.magicCarrotDeck.map((card) => ({ id: card.id, hidden: true })),
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
  const room = await loadKillerBunniesRoom(String(roomCode || "").trim().toUpperCase());
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
  await saveKillerBunniesRoom(room);
}

async function uniqueRoomCode() {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    const code = randomValue(5, "ABCDEFGHJKLMNPQRSTUVWXYZ23456789");
    if (!(await killerBunniesRoomExists(code))) return code;
  }
  throw new Error("Could not create a unique room code. Try again.");
}

