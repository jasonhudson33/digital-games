// Extensions on these two: `from "./game"` resolves under webpack but not under
// plain Node ESM, which is why this module — the one behind /api/create-room,
// /api/join-room, /api/play-card and /api/pass-turn — could not be imported by
// `node --test` and was the only game with no room-level test coverage.
import { SevenUpGame, chooseComputerMove } from "./game.js";
import { randomRoomCode, randomToken } from "./random.js";
import { loadRoom, roomExists, saveRoom } from "./room-store.js";

export const MAX_DISPLAY_NAME = 40;

const PLAYER_TYPES = new Set(["human", "computer"]);

/**
 * Seats as submitted by the client, checked before anything is persisted.
 *
 * This used to map straight over `body.players` with no checks at all, so the
 * API accepted a 2-seat room and a 30-seat room alike (both failing only later,
 * at start), and accepted a seat whose playerType was neither "human" nor
 * "computer" — which starts fine and then deadlocks forever, because
 * runComputers stops at it, playCard has no token holder for it, and joinRoom
 * refuses it as non-human.
 */
function validatePlayers(players) {
  if (!Array.isArray(players) || players.length === 0) {
    throw new Error("Tell us who is playing.");
  }
  if (players.length < SevenUpGame.MIN_PLAYERS || players.length > SevenUpGame.MAX_PLAYERS) {
    throw new Error(
      `7-Up needs ${SevenUpGame.MIN_PLAYERS}–${SevenUpGame.MAX_PLAYERS} players. You sent ${players.length}.`,
    );
  }
  for (const player of players) {
    if (!player || !PLAYER_TYPES.has(player.playerType)) {
      throw new Error('Every seat must be "human" or "computer".');
    }
  }
  if (!players.some((player) => player.playerType === "human")) {
    throw new Error("At least one seat has to be human.");
  }
}

function cleanName(value, fallback) {
  const trimmed = String(value ?? "").trim().replace(/\s+/g, " ");
  return (trimmed || fallback).slice(0, MAX_DISPLAY_NAME);
}

/**
 * SevenUpGame keys hand state by display name, so two seats sharing a name
 * collapse into one and are dealt one shared hand. Names are what the log and
 * the scoreboard show, so rather than reject a duplicate outright we suffix it.
 */
function distinctName(candidate, taken) {
  if (!taken.has(candidate)) return candidate;
  for (let suffix = 2; ; suffix += 1) {
    const next = `${candidate} (${suffix})`.slice(0, MAX_DISPLAY_NAME + 4);
    if (!taken.has(next)) return next;
  }
}

export async function createRoom({ players, name, random = Math.random }) {
  validatePlayers(players);
  const roomCode = await uniqueRoomCode();
  const hostToken = randomToken();
  let hostSeatId = "";
  const taken = new Set();
  const roomPlayers = players.map((player, index) => {
    const seatId = `seat-${index + 1}`;
    const defaultLabel = cleanName(player.name, `Player ${index + 1}`);
    const isHost = player.playerType === "human" && !hostSeatId;
    const wanted = isHost ? cleanName(name, defaultLabel) : defaultLabel;
    const displayName = distinctName(wanted, taken);
    taken.add(displayName);
    const roomPlayer = {
      seatId,
      label: defaultLabel,
      displayName,
      playerType: player.playerType,
      token: null,
      claimed: player.playerType === "computer",
    };
    if (isHost) {
      roomPlayer.token = hostToken;
      roomPlayer.claimed = true;
      hostSeatId = seatId;
    }
    return roomPlayer;
  });
  const room = {
    roomCode,
    hostToken,
    dealerIndex: Math.floor(random(roomPlayers.length) * roomPlayers.length),
    status: "waiting",
    players: roomPlayers,
    gameSnapshot: null,
    log: [],
  };
  await saveRoom(room);
  return {
    roomCode,
    playerToken: hostToken,
    viewerSeatId: hostSeatId,
    roomState: serializeRoomState(room, hostToken),
  };
}

export async function joinRoom({ roomCode, seatId, name }) {
  const room = await requireRoom(roomCode);
  if (room.status !== "waiting") {
    throw new Error("This room has already started.");
  }
  const seat = requireSeat(room, seatId);
  if (seat.playerType !== "human") {
    throw new Error("Only human seats can be joined.");
  }
  if (seat.token) {
    throw new Error("That seat is already taken.");
  }
  seat.token = randomToken();
  seat.displayName = distinctName(
    cleanName(name, seat.label),
    new Set(room.players.filter((player) => player.seatId !== seat.seatId).map((player) => player.displayName)),
  );
  seat.claimed = true;
  await saveRoom(room);
  return {
    playerToken: seat.token,
    viewerSeatId: seat.seatId,
    roomState: serializeRoomState(room, seat.token),
  };
}

export async function getRoomState({ roomCode, token = null }) {
  const room = await requireRoom(roomCode);
  return serializeRoomState(room, token);
}

export async function startRoom({ roomCode, token }) {
  const room = await requireRoom(roomCode);
  if (room.hostToken !== token) {
    throw new Error("Only the host can start the room.");
  }
  const missingHumans = room.players.filter(
    (player) => player.playerType === "human" && !player.token
  );
  if (missingHumans.length > 0) {
    throw new Error("Every human seat must be claimed before starting.");
  }
  const game = new SevenUpGame(
    room.players.map((player) => player.displayName),
    room.dealerIndex
  );
  room.gameSnapshot = game.snapshot();
  room.status = "active";
  room.log = [`${game.currentPlayer} goes first because play starts to the dealer's left.`];
  runComputers(room);
  await saveRoom(room);
  return serializeRoomState(room, token);
}

export async function playCard({ roomCode, token, card }) {
  const room = await requireRoom(roomCode);
  const game = requireActiveGame(room);
  const viewerSeat = requireSeatForToken(room, token);
  const currentSeat = room.players[game.currentPlayerIndex];
  if (viewerSeat.seatId !== currentSeat.seatId) {
    throw new Error("It is not your turn.");
  }
  if (viewerSeat.playerType !== "human") {
    throw new Error("Computer turns are handled automatically.");
  }
  const result = game.playTurn(card);
  room.log.unshift(result);
  room.gameSnapshot = game.snapshot();
  runComputers(room);
  await saveRoom(room);
  return serializeRoomState(room, token);
}

export async function passTurn({ roomCode, token }) {
  const room = await requireRoom(roomCode);
  const game = requireActiveGame(room);
  const viewerSeat = requireSeatForToken(room, token);
  const currentSeat = room.players[game.currentPlayerIndex];
  if (viewerSeat.seatId !== currentSeat.seatId) {
    throw new Error("It is not your turn.");
  }
  if (viewerSeat.playerType !== "human") {
    throw new Error("Computer turns are handled automatically.");
  }
  const result = game.playTurn();
  room.log.unshift(result);
  room.gameSnapshot = game.snapshot();
  runComputers(room);
  await saveRoom(room);
  return serializeRoomState(room, token);
}

function runComputers(room) {
  const game = requireActiveGame(room);
  while (room.status === "active") {
    if (game.winner) {
      room.status = "finished";
      room.gameSnapshot = game.snapshot();
      return;
    }
    const currentSeat = room.players[game.currentPlayerIndex];
    if (currentSeat.playerType !== "computer") {
      room.gameSnapshot = game.snapshot();
      return;
    }
    const legalMoves = game.legalMoves();
    const result = legalMoves.length
      ? game.playTurn(chooseComputerMove(legalMoves, game.handFor(game.currentPlayer)))
      : game.playTurn();
    room.log.unshift(result);
    if (game.winner) {
      room.status = "finished";
      room.gameSnapshot = game.snapshot();
      return;
    }
  }
}

function serializeRoomState(room, token) {
  const viewerSeat = token
    ? room.players.find((player) => player.token === token) || null
    : null;
  const viewerSeatId = viewerSeat?.seatId || null;
  const game = room.gameSnapshot ? SevenUpGame.fromSnapshot(room.gameSnapshot) : null;
  const currentSeat = game ? room.players[game.currentPlayerIndex] : null;
  const viewerLegalMoves =
    game && viewerSeatId && currentSeat?.seatId === viewerSeatId
      ? game.legalMoves(game.currentPlayer)
      : [];
  return {
    roomCode: room.roomCode,
    status: room.status,
    dealerIndex: room.dealerIndex,
    hostControls: token === room.hostToken,
    viewerSeatId,
    players: room.players.map((player) => ({
      seatId: player.seatId,
      label: player.label,
      displayName: player.displayName,
      playerType: player.playerType,
      claimed: player.claimed,
      isViewer: Boolean(token && player.token === token),
      hand: viewerSeat?.seatId === player.seatId && game ? game.handFor(player.displayName) : null,
      handCount: game ? game.handFor(player.displayName).length : 0,
      passedLastTurn: game ? game.stateFor(player.displayName).passedLastTurn : false,
    })),
    game: game
      ? {
          currentSeatId: currentSeat?.seatId || null,
          turnCount: game.turnsTaken + 1,
          winnerSeatId: room.players.find((player) => player.displayName === game.winner)?.seatId || null,
          tableau: game.tableau,
          log: [...room.log],
          viewerLegalMoves,
        }
      : null,
  };
}

function requireActiveGame(room) {
  if (!room.gameSnapshot) {
    throw new Error("This room has not started yet.");
  }
  return SevenUpGame.fromSnapshot(room.gameSnapshot);
}

async function uniqueRoomCode() {
  // Bounded: an unbounded `while (true)` spins forever if the store is
  // unreachable and every existence check comes back true.
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const candidate = randomRoomCode(6);
    if (!(await roomExists(candidate))) return candidate;
  }
  throw new Error("Could not reserve a room code. Please try again.");
}

async function requireRoom(roomCode) {
  const room = await loadRoom(roomCode);
  if (!room) {
    throw new Error("Room not found.");
  }
  return room;
}

function requireSeat(room, seatId) {
  const seat = room.players.find((player) => player.seatId === seatId);
  if (!seat) {
    throw new Error("Seat not found.");
  }
  return seat;
}

function requireSeatForToken(room, token) {
  const seat = room.players.find((player) => player.token === token);
  if (!seat) {
    throw new Error("Join the room before taking actions.");
  }
  return seat;
}


