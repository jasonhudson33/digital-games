import { shuffled } from "./shuffle.js";
import { COMPUTER_IFS, COMPUTER_THENS } from "./what-if-lines.js";

/**
 * What If (games/what-if), in three steps:
 *
 *   1. ifs      everyone privately writes a "What if…"
 *   2. thens    each writer draws one of those IFs at random (it may be their
 *               own) and writes a "Then…" for it
 *   3. reveal   the THENs are dealt out to the IFs at random and the host steps
 *               the table through every pair
 *
 * Pure rules. Privacy lives in the room adapter's view: what others wrote, who
 * drew what, and the unrevealed pairs never leave the server.
 *
 * Computer players draw their lines from a bank (what-if-lines.js), one
 * computer per step, so the host's browser paces them like computers in the
 * other games.
 */

export const MIN_PLAYERS = 3;
export const MAX_PLAYERS = 20;
export const MAX_TEXT = 200;
const MAX_NAME = 20;
const COMPUTER_NAMES = ["Wren", "Juno", "Pip", "Moss", "Ziggy", "Hazel", "Bix", "Olive", "Rook", "Tansy", "Fig", "Comet", "Nell", "Dash", "Sable", "Kip", "Lark", "Miso", "Quill"];

export function createLobby(host, roomCode, now = Date.now()) {
  const player = makePlayer(host);
  return {
    roomCode,
    hostId: player.id,
    phase: "lobby",
    round: 0,
    players: [player],
    ifs: {},
    draws: {},
    thens: {},
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

export function addComputerPlayer(game) {
  if (game.phase !== "lobby" || game.players.length >= MAX_PLAYERS) return game;
  const used = new Set(game.players.map((player) => player.name));
  const ids = new Set(game.players.map((player) => player.id));
  const name = COMPUTER_NAMES.find((candidate) => !used.has(candidate)) || `Computer ${game.players.length}`;
  let number = game.players.length;
  while (ids.has(`what-if-computer-${number}`)) number += 1;
  return { ...game, players: [...game.players, { id: `what-if-computer-${number}`, name, isComputer: true }] };
}

export function removeComputerPlayer(game, playerId) {
  if (game.phase !== "lobby") return game;
  if (!game.players.some((player) => player.id === playerId && player.isComputer)) return game;
  return { ...game, players: game.players.filter((player) => player.id !== playerId) };
}

export function startGame(game) {
  if (game.phase !== "lobby") return game;
  if (game.players.length < MIN_PLAYERS) {
    throw new Error(`What If needs at least ${MIN_PLAYERS} players.`);
  }
  return beginRound(game);
}

/**
 * Save (or replace) the player's text for the current step: their IF while
 * IFs are being written, or their THEN once they have drawn an IF. When the
 * last expected player is in, the game moves on by itself.
 */
export function submitText(game, playerId, text, rng = Math.random) {
  const clean = cleanText(text);
  if (game.phase === "ifs") {
    if (!game.players.some((player) => player.id === playerId)) return game;
    if (!clean) throw new Error("Write your What if first.");
    const next = { ...game, ifs: { ...game.ifs, [playerId]: clean } };
    return game.players.every((player) => next.ifs[player.id]) ? dealIfs(next, rng) : next;
  }
  if (game.phase === "thens") {
    if (!game.draws[playerId]) return game;
    if (!clean) throw new Error("Write your Then first.");
    const next = { ...game, thens: { ...game.thens, [playerId]: clean } };
    return Object.keys(next.draws).every((id) => next.thens[id]) ? matchPairs(next, rng) : next;
  }
  return game;
}

/**
 * Host: move on without the stragglers, once at least three are done. Anyone
 * without an IF sits the round out; an IF drawn by someone who wrote no THEN
 * is dropped.
 */
export function continueNow(game, rng = Math.random) {
  if (game.phase === "ifs") {
    if (Object.keys(game.ifs).length < MIN_PLAYERS) {
      throw new Error(`At least ${MIN_PLAYERS} players need to write a What if first.`);
    }
    return dealIfs(game, rng);
  }
  if (game.phase === "thens") {
    if (Object.keys(game.thens).length < MIN_PLAYERS) {
      throw new Error(`At least ${MIN_PLAYERS} players need to write a Then first.`);
    }
    return matchPairs(game, rng);
  }
  return game;
}

/** Everyone who wrote an IF draws one of the IFs at random; their own is allowed. */
export function dealIfs(game, rng = Math.random) {
  const writers = game.players.map((player) => player.id).filter((id) => game.ifs[id]);
  const authors = shuffled(writers, rng);
  const draws = Object.fromEntries(writers.map((id, index) => [id, authors[index]]));
  return { ...game, phase: "thens", draws, thens: {} };
}

/** Deal the THENs out to the answered IFs at random, in a random reading order. */
export function matchPairs(game, rng = Math.random) {
  const thenWriters = Object.keys(game.draws).filter((id) => game.thens[id]);
  const ifAuthors = thenWriters.map((id) => game.draws[id]);
  const thenOrder = shuffled(thenWriters, rng);
  const pairs = ifAuthors.map((ifBy, index) => ({
    ifText: game.ifs[ifBy],
    ifBy,
    thenText: game.thens[thenOrder[index]],
    thenBy: thenOrder[index],
  }));
  return { ...game, phase: "reveal", pairs: shuffled(pairs, rng), revealIndex: 0 };
}

/** Host: show the next pair, or finish after the last one. */
export function nextPair(game) {
  if (game.phase !== "reveal") return game;
  if (game.revealIndex >= game.pairs.length - 1) return { ...game, phase: "done" };
  return { ...game, revealIndex: game.revealIndex + 1 };
}

/** Host: a fresh round in the same room. */
export function playAgain(game) {
  if (game.phase !== "done") return game;
  return beginRound(game);
}

/** The computer that still has to write in this step, or null. */
export function computerToWrite(game) {
  if (game.phase === "ifs") return game.players.find((player) => player.isComputer && !game.ifs[player.id]) ?? null;
  if (game.phase === "thens") return game.players.find((player) => player.isComputer && game.draws[player.id] && !game.thens[player.id]) ?? null;
  return null;
}

/** One computer writes its IF or THEN from the bank, avoiding lines already used this round. */
export function runComputerStep(game, rng = Math.random) {
  const computer = computerToWrite(game);
  if (!computer) return game;
  const bank = game.phase === "ifs" ? COMPUTER_IFS : COMPUTER_THENS;
  const used = new Set(Object.values(game.phase === "ifs" ? game.ifs : game.thens));
  const fresh = bank.filter((line) => !used.has(line));
  const pool = fresh.length ? fresh : bank;
  return submitText(game, computer.id, pool[Math.floor(rng() * pool.length) % pool.length], rng);
}

function beginRound(game) {
  return { ...game, phase: "ifs", round: (game.round || 0) + 1, ifs: {}, draws: {}, thens: {}, pairs: [], revealIndex: 0 };
}

function cleanText(text) {
  return String(text ?? "").replace(/\s+/g, " ").trim().slice(0, MAX_TEXT);
}

function makePlayer(player) {
  return {
    id: player.id,
    name: String(player.name || "Player").trim().slice(0, MAX_NAME) || "Player",
    isComputer: Boolean(player.isComputer),
  };
}
