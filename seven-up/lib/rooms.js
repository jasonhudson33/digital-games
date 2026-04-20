import { SevenUpGame, chooseComputerMove } from "./game";
import { loadRoom, roomExists, saveRoom } from "./room-store";

export async function createRoom({ dealerIndex, players }) {
  const roomCode = await uniqueRoomCode();
  const hostToken = randomToken(24);
  let hostSeatId = "";
  const roomPlayers = players.map((player, index) => {
    const seatId = `seat-${index + 1}`;
    const roomPlayer = {
      seatId,
      label: (player.name || `Player ${index + 1}`).trim(),
      displayName: (player.name || `Player ${index + 1}`).trim(),
      playerType: player.playerType,
      token: null,
      claimed: player.playerType === "computer",
    };
    if (player.playerType === "human" && !hostSeatId) {
      roomPlayer.token = hostToken;
      roomPlayer.claimed = true;
      hostSeatId = seatId;
    }
    return roomPlayer;
  });
  const room = {
    roomCode,
    hostToken,
    dealerIndex,
    status: "waiting",
    players: roomPlayers,
    gameSnapshot: null,
    log: [],
  };
  await saveRoom(room);
  return { roomCode, playerToken: hostToken, viewerSeatId: hostSeatId };
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
  seat.token = randomToken(24);
  seat.displayName = name?.trim() || seat.label;
  seat.claimed = true;
  await saveRoom(room);
  return { playerToken: seat.token, viewerSeatId: seat.seatId };
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
      ? game.playTurn(chooseComputerMove(legalMoves))
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
  while (true) {
    const candidate = randomCode(6);
    if (!(await roomExists(candidate))) {
      return candidate;
    }
  }
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

function randomCode(length) {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let value = "";
  for (let index = 0; index < length; index += 1) {
    value += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return value;
}

function randomToken(length) {
  const alphabet = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let value = "";
  for (let index = 0; index < length; index += 1) {
    value += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return value;
}
