import { shuffled } from "./shuffle.js";

/**
 * What If (games/what-if): everyone privately writes a "What if…" and a
 * "Then…", the server mixes them so every IF meets a THEN written by someone
 * else, and the host steps the table through the results one pair at a time.
 *
 * Pure rules. Privacy lives in the room adapter's view: `entries` and the
 * unrevealed `pairs` never leave the server.
 */

export const MIN_PLAYERS = 3;
export const MAX_PLAYERS = 20;
export const MAX_TEXT = 200;
const MAX_NAME = 20;

export function createLobby(host, roomCode, now = Date.now()) {
  const player = makePlayer(host);
  return {
    roomCode,
    hostId: player.id,
    phase: "lobby",
    round: 0,
    players: [player],
    entries: {},
    pairs: [],
    revealIndex: 0,
    updatedAt: now,
  };
}

export function addPlayer(game, player) {
  if (
    game.phase !== "lobby"
    || game.players.length >= MAX_PLAYERS
    || game.players.some((item) => item.id === player.id)
  ) return game;
  return { ...game, players: [...game.players, makePlayer(player)] };
}

export function startGame(game) {
  if (game.phase !== "lobby") return game;
  if (game.players.length < MIN_PLAYERS) {
    throw new Error(`What If needs at least ${MIN_PLAYERS} players.`);
  }
  return beginWriting(game);
}

/**
 * Save (or replace) a player's IF and THEN. When every seated player has
 * written, the round mixes itself.
 */
export function submitEntry(game, playerId, { ifText, thenText } = {}, rng = Math.random) {
  if (game.phase !== "writing" || !game.players.some((player) => player.id === playerId)) return game;
  const entry = { if: cleanText(ifText), then: cleanText(thenText) };
  if (!entry.if || !entry.then) throw new Error("Fill in both the What if and the Then.");
  const next = { ...game, entries: { ...game.entries, [playerId]: entry } };
  return game.players.every((player) => next.entries[player.id]) ? mix(next, rng) : next;
}

/** Host: mix with whoever has written, as long as there are at least three. */
export function mixNow(game, rng = Math.random) {
  if (game.phase !== "writing") return game;
  if (writersOf(game).length < MIN_PLAYERS) {
    throw new Error(`At least ${MIN_PLAYERS} players need to submit before mixing.`);
  }
  return mix(game, rng);
}

/**
 * Pair every IF with a THEN from a different writer. Shuffling the writers and
 * giving each one the THEN of the next writer round the shuffled circle uses
 * every THEN once and, with three or more writers, never hands anyone their own.
 */
export function mix(game, rng = Math.random) {
  const writers = shuffled(writersOf(game), rng);
  if (writers.length < MIN_PLAYERS) return game;
  const pairs = writers.map((ifBy, index) => {
    const thenBy = writers[(index + 1) % writers.length];
    return {
      ifText: game.entries[ifBy].if,
      ifBy,
      thenText: game.entries[thenBy].then,
      thenBy,
    };
  });
  return { ...game, phase: "reveal", pairs: shuffled(pairs, rng), revealIndex: 0 };
}

/** Host: show the next pair, or finish after the last one. */
export function nextPair(game) {
  if (game.phase !== "reveal") return game;
  if (game.revealIndex >= game.pairs.length - 1) return { ...game, phase: "done" };
  return { ...game, revealIndex: game.revealIndex + 1 };
}

/** Host: a fresh writing round in the same room. */
export function playAgain(game) {
  if (game.phase !== "done") return game;
  return beginWriting(game);
}

function beginWriting(game) {
  return { ...game, phase: "writing", round: (game.round || 0) + 1, entries: {}, pairs: [], revealIndex: 0 };
}

function writersOf(game) {
  return game.players.map((player) => player.id).filter((id) => game.entries[id]);
}

function cleanText(text) {
  return String(text ?? "").replace(/\s+/g, " ").trim().slice(0, MAX_TEXT);
}

function makePlayer(player) {
  return {
    id: player.id,
    name: String(player.name || "Player").trim().slice(0, MAX_NAME) || "Player",
  };
}
