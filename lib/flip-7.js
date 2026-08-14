export const MIN_PLAYERS = 2;
export const MAX_PLAYERS = 10;
export const TARGET_SCORE = 200;

const BOT_NAMES = ["Lucky", "Pip", "Seven", "Jinx", "Dot", "Ace", "Moxie", "Scout", "Flip"];
let computerCounter = 0;

export function createDeck(rng = Math.random) {
  const cards = [{ id: "number-0-0", type: "number", value: 0 }];
  for (let value = 1; value <= 12; value += 1) {
    for (let copy = 0; copy < value; copy += 1) {
      cards.push({ id: `number-${value}-${copy}`, type: "number", value });
    }
  }
  for (const value of [2, 4, 6, 8, 10]) {
    cards.push({ id: `modifier-plus-${value}`, type: "modifier", modifier: "plus", value });
  }
  cards.push({ id: "modifier-x2", type: "modifier", modifier: "multiply", value: 2 });
  for (const action of ["freeze", "flip3", "secondChance"]) {
    for (let copy = 0; copy < 3; copy += 1) {
      cards.push({ id: `action-${action}-${copy}`, type: "action", action });
    }
  }
  return shuffled(cards, rng);
}

export function createLobby(host, roomCode, now = Date.now()) {
  const player = makePlayer(host);
  return {
    roomCode,
    hostId: player.id,
    phase: "lobby",
    stage: null,
    players: [player],
    deck: [],
    discard: [],
    dealerIndex: 0,
    currentPlayerIndex: 0,
    initialQueue: [],
    pendingTarget: null,
    forced: null,
    round: 0,
    roundScores: {},
    flipSevenId: null,
    winnerId: null,
    targetScore: TARGET_SCORE,
    log: [`${player.name} opened a Flip 7 room.`],
    updatedAt: now,
  };
}

export function addPlayer(game, player) {
  if (game.phase !== "lobby" || game.players.length >= MAX_PLAYERS || game.players.some((item) => item.id === player.id)) return game;
  const nextPlayer = makePlayer(player);
  return withLog({ ...game, players: [...game.players, nextPlayer] }, `${nextPlayer.name} joined the table.`);
}

export function addComputerPlayer(game) {
  if (game.phase !== "lobby" || game.players.length >= MAX_PLAYERS) return game;
  computerCounter += 1;
  const usedNames = new Set(game.players.map((player) => player.name));
  const name = BOT_NAMES.find((candidate) => !usedNames.has(candidate)) || `Computer ${computerCounter}`;
  const player = makePlayer({ id: `flip7-computer-${Date.now()}-${computerCounter}`, name, isComputer: true });
  return withLog({ ...game, players: [...game.players, player] }, `${name} took a computer seat.`);
}

export function removeComputerPlayer(game, playerId) {
  if (game.phase !== "lobby") return game;
  const player = game.players.find((item) => item.id === playerId && item.isComputer);
  if (!player) return game;
  return withLog({ ...game, players: game.players.filter((item) => item.id !== playerId) }, `${player.name} left the table.`);
}

export function startGame(game, rng = Math.random) {
  if (game.phase !== "lobby") return game;
  if (game.players.length < MIN_PLAYERS || game.players.length > MAX_PLAYERS) {
    throw new Error("Flip 7 needs 2–10 players in this digital room.");
  }
  const dealerIndex = Math.floor(rng() * game.players.length);
  return dealRound({ ...game, dealerIndex, round: 1, deck: createDeck(rng) }, rng);
}

export function startNextRound(game, playerId, rng = Math.random) {
  if (game.phase !== "roundEnd" || game.hostId !== playerId) return game;
  const roundCards = game.players.flatMap((player) => player.cards);
  return dealRound({
    ...game,
    round: game.round + 1,
    dealerIndex: (game.dealerIndex + 1) % game.players.length,
    discard: [...game.discard, ...roundCards],
  }, rng);
}

export function flipCard(game, playerId, rng = Math.random) {
  if (!canChooseTurn(game, playerId)) return game;
  return drawFor(game, playerId, { kind: "advance", fromIndex: game.currentPlayerIndex }, rng);
}

export function stay(game, playerId) {
  if (!canChooseTurn(game, playerId)) return game;
  const player = playerById(game, playerId);
  const next = updatePlayer(game, playerId, (current) => ({ ...current, status: "stayed" }));
  return advanceTurn(withLog(next, `${player.name} stayed with ${calculateRoundScore(player)} points.`), game.currentPlayerIndex);
}

export function chooseActionTarget(game, chooserId, targetId, rng = Math.random) {
  const pending = game.pendingTarget;
  if (!pending || pending.chooserId !== chooserId || !validTargets(game, pending.action, chooserId).some((player) => player.id === targetId)) return game;
  const chooser = playerById(game, chooserId);
  const target = playerById(game, targetId);
  let next = { ...game, pendingTarget: null };

  if (pending.action === "freeze") {
    next = updatePlayer(next, targetId, (player) => ({ ...player, status: "stayed" }));
    next = withLog(next, `${chooser.name} froze ${target.name} at ${calculateRoundScore(target)} points.`);
    return resumeFlow(next, pending.resume, rng);
  }
  if (pending.action === "secondChance") {
    const card = pending.card;
    next = updatePlayer(next, targetId, (player) => ({ ...player, cards: [...player.cards, card] }));
    next = withLog(next, `${chooser.name} passed a Second Chance to ${target.name}.`);
    return resumeFlow(next, pending.resume, rng);
  }

  next = withLog(next, `${chooser.name} sent ${target.name} on a Flip Three.`);
  return beginForced(next, targetId, pending.resume, rng);
}

export function currentPlayer(game) {
  return game.players[game.currentPlayerIndex] ?? null;
}

export function targetOptions(game) {
  if (!game.pendingTarget) return [];
  return validTargets(game, game.pendingTarget.action, game.pendingTarget.chooserId);
}

export function numberCards(player) {
  return player?.cards.filter((card) => card.type === "number") ?? [];
}

export function hasSecondChance(player) {
  return player?.cards.some((card) => card.type === "action" && card.action === "secondChance") ?? false;
}

export function calculateRoundScore(player, includeFlipSevenBonus = false) {
  if (!player || player.status === "busted") return 0;
  const numberTotal = numberCards(player).reduce((sum, card) => sum + card.value, 0);
  const hasDouble = player.cards.some((card) => card.type === "modifier" && card.modifier === "multiply");
  const plusTotal = player.cards
    .filter((card) => card.type === "modifier" && card.modifier === "plus")
    .reduce((sum, card) => sum + card.value, 0);
  return numberTotal * (hasDouble ? 2 : 1) + plusTotal + (includeFlipSevenBonus ? 15 : 0);
}

export function riskPercent(game, player) {
  const held = new Set(numberCards(player).map((card) => card.value));
  if (!game.deck.length) return 0;
  const dangerous = game.deck.filter((card) => card.type === "number" && held.has(card.value)).length;
  return Math.round((dangerous / game.deck.length) * 100);
}

export function runComputerStep(game, rng = Math.random) {
  if (game.phase !== "playing") return game;
  if (game.pendingTarget) {
    const chooser = playerById(game, game.pendingTarget.chooserId);
    if (!chooser?.isComputer) return game;
    const options = targetOptions(game);
    if (!options.length) return resumeFlow({ ...game, pendingTarget: null }, game.pendingTarget.resume, rng);
    let target;
    if (game.pendingTarget.action === "secondChance") {
      target = [...options].sort((a, b) => calculateRoundScore(b) - calculateRoundScore(a))[0];
    } else if (game.pendingTarget.action === "freeze") {
      const ownScore = calculateRoundScore(chooser);
      target = ownScore >= 24 && rng() > 0.45
        ? options.find((player) => player.id === chooser.id)
        : [...options].filter((player) => player.id !== chooser.id).sort((a, b) => calculateRoundScore(b) - calculateRoundScore(a))[0];
    } else {
      target = [...options].filter((player) => player.id !== chooser.id).sort((a, b) => calculateRoundScore(b) - calculateRoundScore(a))[0];
    }
    return chooseActionTarget(game, chooser.id, (target || options[0]).id, rng);
  }

  const player = currentPlayer(game);
  if (!canChooseTurn(game, player?.id) || !player.isComputer) return game;
  const unique = numberCards(player).length;
  const score = calculateRoundScore(player);
  const risk = riskPercent(game, player);
  const shouldStay = unique >= 4 && (
    (score >= 42 && risk >= 10) ||
    (score >= 30 && risk >= 18) ||
    (score >= 20 && risk >= 30) ||
    (unique >= 6 && risk >= 42)
  );
  return shouldStay ? stay(game, player.id) : flipCard(game, player.id, rng);
}

function dealRound(game, rng) {
  const players = game.players.map((player) => ({ ...player, cards: [], status: "active" }));
  const firstPlayerIndex = (game.dealerIndex + 1) % players.length;
  const initialQueue = Array.from({ length: players.length }, (_, offset) => players[(firstPlayerIndex + offset) % players.length].id);
  const next = {
    ...game,
    phase: "playing",
    stage: "initial",
    players,
    currentPlayerIndex: firstPlayerIndex,
    initialQueue,
    pendingTarget: null,
    forced: null,
    roundScores: {},
    flipSevenId: null,
    winnerId: null,
    log: [`Round ${game.round} begins. ${players[game.dealerIndex].name} deals.`, ...game.log].slice(0, 80),
  };
  return continueInitial(next, rng);
}

function continueInitial(game, rng) {
  let next = game;
  while (next.phase === "playing" && !next.pendingTarget && next.stage === "initial") {
    if (!next.initialQueue.length) {
      next = { ...next, stage: "turns" };
      return advanceTurn(next, next.dealerIndex);
    }
    const [targetId, ...rest] = next.initialQueue;
    if (playerById(next, targetId)?.status !== "active") {
      next = { ...next, initialQueue: rest };
      continue;
    }
    next = drawFor({ ...next, initialQueue: rest }, targetId, { kind: "initial" }, rng);
    if (next.pendingTarget || next.phase !== "playing") return next;
  }
  return next;
}

function drawFor(game, targetId, resume, rng) {
  let next = ensureDeck(game, rng);
  if (!next.deck.length) return resumeFlow(next, resume, rng);
  const [card, ...deck] = next.deck;
  next = { ...next, deck };
  const player = playerById(next, targetId);

  if (card.type === "number") {
    const duplicate = numberCards(player).some((held) => held.value === card.value);
    if (duplicate && hasSecondChance(player)) {
      const secondChance = player.cards.find((held) => held.type === "action" && held.action === "secondChance");
      next = updatePlayer(next, targetId, (current) => ({ ...current, cards: current.cards.filter((held) => held.id !== secondChance.id) }));
      next = withLog({ ...next, discard: [...next.discard, secondChance, card] }, `${player.name}'s Second Chance stopped a duplicate ${card.value}.`);
      return resumeFlow(next, resume, rng);
    }
    next = updatePlayer(next, targetId, (current) => ({ ...current, cards: [...current.cards, card], status: duplicate ? "busted" : current.status }));
    if (duplicate) {
      next = withLog(next, `${player.name} flipped another ${card.value} and busted.`);
      return resumeFlow(next, resume, rng);
    }
    next = withLog(next, `${player.name} flipped a ${card.value}.`);
    if (numberCards(playerById(next, targetId)).length === 7) return finishRound(next, targetId);
    return resumeFlow(next, resume, rng);
  }

  if (card.type === "modifier") {
    next = updatePlayer(next, targetId, (current) => ({ ...current, cards: [...current.cards, card] }));
    next = withLog(next, `${player.name} found ${card.modifier === "multiply" ? "an ×2" : `a +${card.value}`} modifier.`);
    return resumeFlow(next, resume, rng);
  }

  if (card.action === "secondChance" && !hasSecondChance(player)) {
    next = updatePlayer(next, targetId, (current) => ({ ...current, cards: [...current.cards, card] }));
    next = withLog(next, `${player.name} gained a Second Chance.`);
    return resumeFlow(next, resume, rng);
  }

  if (resume.kind === "forced" && (card.action === "freeze" || card.action === "flip3")) {
    next = { ...next, discard: [...next.discard, card], forced: { ...next.forced, deferred: [...next.forced.deferred, { action: card.action, chooserId: targetId }] } };
    next = withLog(next, `${player.name} set aside ${card.action === "freeze" ? "Freeze" : "Flip Three"} until the forced flips finish.`);
    return resumeFlow(next, resume, rng);
  }

  if (card.action === "secondChance") {
    const options = validTargets(next, "secondChance", targetId);
    if (!options.length) {
      next = withLog({ ...next, discard: [...next.discard, card] }, `${player.name} had no one to pass the extra Second Chance to.`);
      return resumeFlow(next, resume, rng);
    }
    return { ...next, pendingTarget: { action: "secondChance", chooserId: targetId, card, resume } };
  }

  next = { ...next, discard: [...next.discard, card] };
  return requestTarget(next, card.action, targetId, resume, rng);
}

function requestTarget(game, action, chooserId, resume, rng) {
  const options = validTargets(game, action, chooserId);
  if (!options.length) return resumeFlow(game, resume, rng);
  const pending = { action, chooserId, card: null, resume };
  const next = { ...game, pendingTarget: pending };
  if (options.length === 1) return chooseActionTarget(next, chooserId, options[0].id, rng);
  return next;
}

function beginForced(game, targetId, resume, rng) {
  let forcedResume = resume;
  if (resume.kind === "forced") {
    forcedResume = { kind: "restoreForced", forced: game.forced };
  }
  return continueForced({ ...game, forced: { targetId, remaining: 3, deferred: [], resume: forcedResume } }, rng);
}

function continueForced(game, rng) {
  let next = game;
  while (next.phase === "playing" && next.forced && !next.pendingTarget) {
    const forced = next.forced;
    const target = playerById(next, forced.targetId);
    if (target.status === "busted" || numberCards(target).length >= 7) {
      const abandoned = forced.deferred.length;
      next = { ...next, forced: null };
      if (abandoned) next = withLog(next, `${abandoned} set-aside action ${abandoned === 1 ? "was" : "cards were"} discarded.`);
      return resumeFlow(next, forced.resume, rng);
    }
    if (forced.remaining > 0) {
      next = { ...next, forced: { ...forced, remaining: forced.remaining - 1 } };
      next = drawFor(next, forced.targetId, { kind: "forced" }, rng);
      continue;
    }
    if (forced.deferred.length) {
      const [action, ...deferred] = forced.deferred;
      next = { ...next, forced: { ...forced, deferred } };
      return requestTarget(next, action.action, action.chooserId, { kind: "forced" }, rng);
    }
    next = { ...next, forced: null };
    return resumeFlow(next, forced.resume, rng);
  }
  return next;
}

function resumeFlow(game, resume, rng) {
  if (game.phase !== "playing") return game;
  if (resume.kind === "initial") return continueInitial(game, rng);
  if (resume.kind === "advance") return advanceTurn(game, resume.fromIndex);
  if (resume.kind === "forced") return continueForced(game, rng);
  if (resume.kind === "restoreForced") return continueForced({ ...game, forced: resume.forced }, rng);
  return game;
}

function advanceTurn(game, fromIndex) {
  if (game.phase !== "playing" || game.pendingTarget || game.forced) return game;
  for (let offset = 1; offset <= game.players.length; offset += 1) {
    const index = (fromIndex + offset) % game.players.length;
    if (game.players[index].status === "active") return { ...game, currentPlayerIndex: index };
  }
  return finishRound(game, null);
}

function finishRound(game, flipSevenId = null) {
  const roundScores = Object.fromEntries(game.players.map((player) => [
    player.id,
    calculateRoundScore(player, player.id === flipSevenId),
  ]));
  const players = game.players.map((player) => ({ ...player, score: player.score + roundScores[player.id] }));
  const highScore = Math.max(...players.map((player) => player.score));
  const leaders = players.filter((player) => player.score === highScore);
  const winner = highScore >= game.targetScore && leaders.length === 1 ? leaders[0] : null;
  const reason = flipSevenId
    ? `${playerById(game, flipSevenId).name} flipped seven unique numbers!`
    : "Everyone has stayed or busted.";
  return withLog({
    ...game,
    phase: winner ? "finished" : "roundEnd",
    stage: null,
    players,
    roundScores,
    flipSevenId,
    winnerId: winner?.id ?? null,
    pendingTarget: null,
    forced: null,
  }, winner ? `${reason} ${winner.name} wins with ${winner.score} points.` : `${reason} Round ${game.round} is complete.`);
}

function validTargets(game, action, chooserId) {
  const active = game.players.filter((player) => player.status === "active");
  if (action === "secondChance") return active.filter((player) => player.id !== chooserId && !hasSecondChance(player));
  return active;
}

function ensureDeck(game, rng) {
  if (game.deck.length || !game.discard.length) return game;
  return withLog({ ...game, deck: shuffled(game.discard, rng), discard: [] }, "The discard pile was shuffled into a fresh deck.");
}

function canChooseTurn(game, playerId) {
  return Boolean(
    playerId &&
    game.phase === "playing" &&
    game.stage === "turns" &&
    !game.pendingTarget &&
    !game.forced &&
    currentPlayer(game)?.id === playerId &&
    currentPlayer(game)?.status === "active"
  );
}

function updatePlayer(game, playerId, updater) {
  return { ...game, players: game.players.map((player) => player.id === playerId ? updater(player) : player) };
}

function playerById(game, playerId) {
  return game.players.find((player) => player.id === playerId) ?? null;
}

function makePlayer(player) {
  return {
    id: player.id,
    name: cleanName(player.name),
    isComputer: Boolean(player.isComputer),
    cards: [],
    status: "active",
    score: 0,
  };
}

function cleanName(name) {
  return String(name || "Player").trim().slice(0, 20) || "Player";
}

function withLog(game, message) {
  return { ...game, log: [message, ...(game.log || [])].slice(0, 80) };
}

function shuffled(cards, rng) {
  const result = [...cards];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(rng() * (index + 1));
    [result[index], result[swapIndex]] = [result[swapIndex], result[index]];
  }
  return result;
}
