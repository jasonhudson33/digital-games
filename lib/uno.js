export const MIN_PLAYERS = 2;
export const MAX_PLAYERS = 10;
export const TARGET_SCORE = 500;

export const UNO_COLORS = ["red", "yellow", "green", "blue"];
export const UNO_DARK_COLORS = ["pink", "teal", "orange", "purple"];
export const UNO_RULESETS = ["classic", "flip"];

const BOT_NAMES = ["Moxie", "Pip", "Ace", "Dot", "Scout", "Jinx", "Nova", "Lucky", "Rio"];
let computerCounter = 0;

export function createDeck(rng = Math.random) {
  const cards = [];
  for (const color of UNO_COLORS) {
    cards.push(card(`${color}-0`, color, "number", 0));
    for (let value = 1; value <= 9; value += 1) {
      for (let copy = 0; copy < 2; copy += 1) cards.push(card(`${color}-${value}-${copy}`, color, "number", value));
    }
    for (const type of ["skip", "reverse", "draw2"]) {
      for (let copy = 0; copy < 2; copy += 1) cards.push(card(`${color}-${type}-${copy}`, color, type));
    }
  }
  for (let copy = 0; copy < 4; copy += 1) {
    cards.push(card(`wild-${copy}`, null, "wild"));
    cards.push(card(`wild4-${copy}`, null, "wild4"));
  }
  return shuffled(cards, rng);
}

export function createFlipDeck(rng = Math.random) {
  const lightFaces = createFlipFaces(UNO_COLORS, ["draw1", "reverse", "skip", "flip"], "wildDraw2");
  const darkFaces = createFlipFaces(UNO_DARK_COLORS, ["draw5", "reverse", "skipEveryone", "flip"], "wildDrawColor");
  const cards = lightFaces.map((light, index) => ({ id: `flip-card-${index}`, light, dark: darkFaces[index] }));
  return shuffled(cards, rng);
}

export function createLobby(host, roomCode, now = Date.now()) {
  const player = makePlayer(host);
  return {
    game: "uno",
    ruleset: "classic",
    side: null,
    roomCode,
    hostId: player.id,
    phase: "lobby",
    players: [player],
    deck: [],
    discard: [],
    activeColor: null,
    dealerIndex: 0,
    currentPlayerIndex: 0,
    direction: 1,
    round: 0,
    winnerId: null,
    roundWinnerId: null,
    targetScore: TARGET_SCORE,
    drawnCardId: null,
    pendingOpeningWild: null,
    pendingDrawFour: null,
    pendingWinnerId: null,
    missedUnoPlayerId: null,
    log: [`${player.name} opened an UNO room.`],
    updatedAt: now,
  };
}

export function setRuleset(game, ruleset) {
  if (game.phase !== "lobby" || !UNO_RULESETS.includes(ruleset)) return game;
  return withLog({ ...game, ruleset }, `${ruleset === "flip" ? "UNO Flip" : "Classic UNO"} selected.`);
}

export function addPlayer(game, player) {
  if (game.phase !== "lobby" || game.players.length >= MAX_PLAYERS || game.players.some((item) => item.id === player.id)) return game;
  const nextPlayer = makePlayer(player);
  return withLog({ ...game, players: [...game.players, nextPlayer] }, `${nextPlayer.name} joined the table.`);
}

export function addComputerPlayer(game) {
  if (game.phase !== "lobby" || game.players.length >= MAX_PLAYERS) return game;
  computerCounter += 1;
  const used = new Set(game.players.map((player) => player.name));
  const name = BOT_NAMES.find((candidate) => !used.has(candidate)) || `Computer ${computerCounter}`;
  const player = makePlayer({ id: `uno-computer-${Date.now()}-${computerCounter}`, name, isComputer: true });
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
  if (game.players.length < MIN_PLAYERS || game.players.length > MAX_PLAYERS) throw new Error("UNO needs 2–10 players.");
  return dealRound({ ...game, ruleset: normalizedRuleset(game), round: 1, dealerIndex: Math.floor(rng() * game.players.length) }, rng);
}

export function startNextRound(game, playerId, rng = Math.random) {
  if (game.phase !== "roundEnd" || game.hostId !== playerId) return game;
  return dealRound({ ...game, round: game.round + 1, dealerIndex: (game.dealerIndex + 1) % game.players.length }, rng);
}

export function currentPlayer(game) {
  return game.players[game.currentPlayerIndex] ?? null;
}

export function topDiscard(game) {
  return game.discard.at(-1) ?? null;
}

export function cardFace(gameOrSide, physicalCard) {
  if (!physicalCard) return null;
  if (!physicalCard.light || !physicalCard.dark) return physicalCard;
  const side = typeof gameOrSide === "string" ? gameOrSide : gameOrSide?.side;
  return physicalCard[side === "dark" ? "dark" : "light"];
}

export function colorsForGame(game) {
  return normalizedRuleset(game) === "flip" && game.side === "dark" ? UNO_DARK_COLORS : UNO_COLORS;
}

export function isPlayable(game, candidate, player = null) {
  const top = cardFace(game, topDiscard(game));
  const face = cardFace(game, candidate);
  if (!face || !top) return false;
  if (["wild", "wild4", "wildDraw2", "wildDrawColor"].includes(face.type)) return true;
  if (face.color === game.activeColor) return true;
  if (face.type === "number" && top.type === "number") return face.value === top.value;
  return face.type !== "number" && face.type === top.type;
}

export function playableCards(game, playerId) {
  const player = playerById(game, playerId);
  return player?.cards.filter((candidate) => isPlayable(game, candidate, player)) ?? [];
}

export function playCard(game, playerId, cardId, options = {}) {
  if (!canAct(game, playerId)) return game;
  const player = playerById(game, playerId);
  const played = player.cards.find((candidate) => candidate.id === cardId);
  const face = cardFace(game, played);
  if (!played || !face || (game.drawnCardId && game.drawnCardId !== cardId) || !isPlayable(game, played, player)) return game;
  const isWild = ["wild", "wild4", "wildDraw2", "wildDrawColor"].includes(face.type);
  if (isWild && !colorsForGame(game).includes(options.color)) return game;

  const isWildPenalty = ["wild4", "wildDraw2", "wildDrawColor"].includes(face.type);
  const hadMatchingColor = isWildPenalty && player.cards.some((held) => held.id !== played.id && cardFace(game, held).color === game.activeColor);
  const cards = player.cards.filter((candidate) => candidate.id !== cardId);
  let next = updatePlayer(clearMissedWindow(game), playerId, (current) => ({ ...current, cards }));
  next = {
    ...next,
    discard: [...next.discard, played],
    activeColor: face.color || options.color,
    drawnCardId: null,
    missedUnoPlayerId: cards.length === 1 && !options.calledUno ? playerId : null,
  };
  next = withLog(next, `${player.name} played ${cardLabel(face)}${face.color ? "" : ` and chose ${options.color}`}.${cards.length === 1 && options.calledUno ? " UNO!" : ""}`);
  const pendingWinnerId = cards.length === 0 ? playerId : null;

  if (isWildPenalty) {
    const victimIndex = nextIndex(next, game.currentPlayerIndex, 1);
    return {
      ...next,
      pendingDrawFour: makeWildPenalty(face.type, playerId, next.players[victimIndex].id, !hadMatchingColor, options.color),
      pendingWinnerId,
    };
  }

  if (["draw1", "draw2", "draw5"].includes(face.type)) {
    const amount = face.type === "draw1" ? 1 : face.type === "draw5" ? 5 : 2;
    const victimIndex = nextIndex(next, game.currentPlayerIndex, 1);
    next = withLog(drawMany(next, next.players[victimIndex].id, amount), `${next.players[victimIndex].name} drew ${amount} and was skipped.`);
    if (pendingWinnerId) return finishRound(next, pendingWinnerId);
    return { ...next, currentPlayerIndex: nextIndex(next, game.currentPlayerIndex, 2) };
  }

  if (face.type === "flip") {
    next = flipAllCards(next, playerId);
    if (pendingWinnerId) return finishRound(next, pendingWinnerId);
    return { ...next, currentPlayerIndex: nextIndex(next, game.currentPlayerIndex, 1) };
  }

  if (pendingWinnerId) return finishRound(next, pendingWinnerId);
  if (face.type === "skip") return { ...next, currentPlayerIndex: nextIndex(next, game.currentPlayerIndex, 2) };
  if (face.type === "skipEveryone") return { ...next, currentPlayerIndex: game.currentPlayerIndex };
  if (face.type === "reverse") {
    const reversed = { ...next, direction: next.direction * -1 };
    return { ...reversed, currentPlayerIndex: nextIndex(reversed, game.currentPlayerIndex, next.players.length === 2 ? 2 : 1) };
  }
  return { ...next, currentPlayerIndex: nextIndex(next, game.currentPlayerIndex, 1) };
}

export function drawCard(game, playerId, rng = Math.random) {
  if (!canAct(game, playerId) || game.drawnCardId) return game;
  let next = clearMissedWindow(ensureDeck(game, rng));
  if (!next.deck.length) return { ...next, currentPlayerIndex: nextIndex(next, next.currentPlayerIndex, 1) };
  const [drawn, ...deck] = next.deck;
  next = updatePlayer({ ...next, deck }, playerId, (player) => ({ ...player, cards: [...player.cards, drawn] }));
  next = withLog(next, `${playerById(next, playerId).name} drew a card.`);
  return { ...next, drawnCardId: drawn.id };
}

export function passAfterDraw(game, playerId) {
  if (!canAct(game, playerId) || !game.drawnCardId) return game;
  return { ...clearMissedWindow(game), drawnCardId: null, currentPlayerIndex: nextIndex(game, game.currentPlayerIndex, 1) };
}

export function chooseOpeningColor(game, playerId, color) {
  if (game.phase !== "playing" || game.pendingOpeningWild !== playerId || !colorsForGame(game).includes(color)) return game;
  return withLog({ ...game, activeColor: color, pendingOpeningWild: null }, `${playerById(game, playerId).name} chose ${color}.`);
}

export function resolveDrawFour(game, playerId, challenge, rng = Math.random) {
  const pending = game.pendingDrawFour;
  if (!pending || pending.victimId !== playerId) return game;
  let next = { ...game, pendingDrawFour: null };
  const penaltyName = pending.kind === "color" ? `until drawing ${pending.color}` : `${pending.amount}`;
  if (!challenge) {
    next = applyWildPenalty(next, pending.victimId, pending, false, rng);
    next = withLog(next, `${playerById(next, pending.victimId).name} drew ${penaltyName} and was skipped.`);
    if (game.pendingWinnerId) return finishRound({ ...next, pendingWinnerId: null }, game.pendingWinnerId);
    return { ...next, pendingWinnerId: null, currentPlayerIndex: nextIndex(next, game.currentPlayerIndex, 2) };
  }
  if (!pending.wasLegal) {
    next = applyWildPenalty(next, pending.offenderId, pending, false, rng);
    next = withLog(next, `Challenge successful—${playerById(next, pending.offenderId).name} drew ${penaltyName}.`);
    return { ...next, pendingWinnerId: null, currentPlayerIndex: nextIndex(next, game.currentPlayerIndex, 1) };
  }
  next = applyWildPenalty(next, pending.victimId, pending, true, rng);
  next = withLog(next, `Challenge failed—${playerById(next, pending.victimId).name} took the penalty plus 2 and was skipped.`);
  if (game.pendingWinnerId) return finishRound({ ...next, pendingWinnerId: null }, game.pendingWinnerId);
  return { ...next, pendingWinnerId: null, currentPlayerIndex: nextIndex(next, game.currentPlayerIndex, 2) };
}

export function catchUno(game, callerId, rng = Math.random) {
  const targetId = game.missedUnoPlayerId;
  if (!targetId || callerId === targetId || !playerById(game, callerId)) return game;
  const target = playerById(game, targetId);
  if (!target || target.cards.length !== 1) return { ...game, missedUnoPlayerId: null };
  return withLog({ ...drawMany(game, targetId, 2, rng), missedUnoPlayerId: null }, `${playerById(game, callerId).name} caught ${target.name}—draw 2!`);
}

export function cardPoints(physicalCard, gameOrSide = null) {
  const face = cardFace(gameOrSide, physicalCard);
  if (!face) return 0;
  if (face.type === "number") return face.value;
  if (face.type === "draw1") return 10;
  if (["draw2", "draw5", "reverse", "skip", "flip"].includes(face.type)) return 20;
  if (face.type === "skipEveryone") return 30;
  if (face.type === "wild") return normalizedRuleset(typeof gameOrSide === "object" ? gameOrSide : {}) === "flip" || physicalCard?.light ? 40 : 50;
  if (face.type === "wildDraw2") return 50;
  if (face.type === "wildDrawColor") return 60;
  return 50;
}

export function runComputerStep(game, rng = Math.random) {
  if (game.phase !== "playing") return game;
  if (game.missedUnoPlayerId) {
    const catcher = game.players.find((player) => player.isComputer && player.id !== game.missedUnoPlayerId);
    if (catcher) return catchUno(game, catcher.id, rng);
  }
  if (game.pendingOpeningWild) {
    const chooser = playerById(game, game.pendingOpeningWild);
    return chooser?.isComputer ? chooseOpeningColor(game, chooser.id, bestColor(game, chooser.cards)) : game;
  }
  if (game.pendingDrawFour) {
    const victim = playerById(game, game.pendingDrawFour.victimId);
    return victim?.isComputer ? resolveDrawFour(game, victim.id, !game.pendingDrawFour.wasLegal || rng() < 0.18, rng) : game;
  }
  const player = currentPlayer(game);
  if (!player?.isComputer) return game;
  const legal = playableCards(game, player.id);
  if (legal.length) {
    const chosen = [...legal].sort((left, right) => cardPoints(right, game) - cardPoints(left, game))[0];
    return playCard(game, player.id, chosen.id, { color: bestColor(game, player.cards.filter((held) => held.id !== chosen.id)), calledUno: player.cards.length === 2 });
  }
  if (!game.drawnCardId) return drawCard(game, player.id, rng);
  const drawn = player.cards.find((held) => held.id === game.drawnCardId);
  if (isPlayable(game, drawn, player)) return playCard(game, player.id, drawn.id, { color: bestColor(game, player.cards.filter((held) => held.id !== drawn.id)), calledUno: player.cards.length === 2 });
  return passAfterDraw(game, player.id);
}

function dealRound(game, rng) {
  const isFlip = normalizedRuleset(game) === "flip";
  let deck = isFlip ? createFlipDeck(rng) : createDeck(rng);
  let players = game.players.map((player) => ({ ...player, cards: [] }));
  for (let deal = 0; deal < 7; deal += 1) players = players.map((player) => ({ ...player, cards: [...player.cards, deck.shift()] }));
  let opening = deck.shift();
  while (["wild4", "wildDraw2"].includes(cardFace("light", opening).type)) {
    deck.push(opening);
    deck = shuffled(deck, rng);
    opening = deck.shift();
  }
  let next = {
    ...game,
    ruleset: isFlip ? "flip" : "classic",
    side: isFlip ? "light" : null,
    phase: "playing",
    players,
    deck,
    discard: [opening],
    activeColor: cardFace("light", opening).color,
    currentPlayerIndex: nextIndex({ ...game, players, direction: 1 }, game.dealerIndex, 1),
    direction: 1,
    winnerId: null,
    roundWinnerId: null,
    drawnCardId: null,
    pendingOpeningWild: null,
    pendingDrawFour: null,
    pendingWinnerId: null,
    missedUnoPlayerId: null,
    log: [`Round ${game.round} of ${isFlip ? "UNO Flip" : "Classic UNO"} begins. ${players[game.dealerIndex].name} deals.`, ...game.log].slice(0, 80),
  };
  const face = cardFace(next, opening);
  if (face.type === "wild") next.pendingOpeningWild = next.players[next.currentPlayerIndex].id;
  if (face.type === "skip") next.currentPlayerIndex = nextIndex(next, next.currentPlayerIndex, 1);
  if (["draw1", "draw2"].includes(face.type)) {
    const amount = face.type === "draw1" ? 1 : 2;
    const victim = next.players[next.currentPlayerIndex];
    next = withLog(drawMany(next, victim.id, amount, rng), `${victim.name} drew ${amount} and was skipped.`);
    next.currentPlayerIndex = nextIndex(next, next.currentPlayerIndex, 1);
  }
  if (face.type === "reverse") {
    next.direction = -1;
    next.currentPlayerIndex = game.dealerIndex;
  }
  if (face.type === "flip") next = flipAllCards(next, next.players[next.currentPlayerIndex].id);
  return next;
}

function finishRound(game, winnerId) {
  const points = game.players.filter((player) => player.id !== winnerId).flatMap((player) => player.cards).reduce((sum, held) => sum + cardPoints(held, game), 0);
  const players = game.players.map((player) => player.id === winnerId ? { ...player, score: player.score + points } : player);
  const winner = players.find((player) => player.id === winnerId);
  return withLog({
    ...game,
    phase: winner.score >= game.targetScore ? "finished" : "roundEnd",
    players,
    roundWinnerId: winnerId,
    winnerId: winner.score >= game.targetScore ? winnerId : null,
    missedUnoPlayerId: null,
  }, `${winner.name} went out and scored ${points} point${points === 1 ? "" : "s"}${normalizedRuleset(game) === "flip" ? ` on the ${game.side} side` : ""}.`);
}

function flipAllCards(game, chooserId) {
  const side = game.side === "dark" ? "light" : "dark";
  const next = { ...game, side, deck: [...game.deck].reverse(), discard: [...game.discard].reverse() };
  const top = cardFace(next, topDiscard(next));
  next.activeColor = top.color;
  if (!top.color) next.pendingOpeningWild = chooserId;
  return withLog(next, `Everything flipped to the ${side} side!`);
}

function makeWildPenalty(type, offenderId, victimId, wasLegal, color) {
  if (type === "wildDrawColor") return { offenderId, victimId, wasLegal, kind: "color", color, amount: null, extra: 2, type };
  const amount = type === "wildDraw2" ? 2 : 4;
  return { offenderId, victimId, wasLegal, kind: "cards", color, amount, extra: 2, type };
}

function applyWildPenalty(game, playerId, pending, addChallengeExtra, rng) {
  let next = pending.kind === "color" ? drawUntilColor(game, playerId, pending.color, rng) : drawMany(game, playerId, pending.amount, rng);
  if (addChallengeExtra) next = drawMany(next, playerId, pending.extra, rng);
  return next;
}

function drawUntilColor(game, playerId, color, rng) {
  let next = game;
  const maximum = totalCardsInGame(game) + 1;
  for (let count = 0; count < maximum; count += 1) {
    next = ensureDeck(next, rng);
    if (!next.deck.length) break;
    const [drawn, ...deck] = next.deck;
    next = updatePlayer({ ...next, deck }, playerId, (player) => ({ ...player, cards: [...player.cards, drawn] }));
    if (cardFace(next, drawn).color === color) break;
  }
  return next;
}

function drawMany(game, playerId, count, rng = Math.random) {
  let next = game;
  for (let index = 0; index < count; index += 1) {
    next = ensureDeck(next, rng);
    if (!next.deck.length) break;
    const [drawn, ...deck] = next.deck;
    next = updatePlayer({ ...next, deck }, playerId, (player) => ({ ...player, cards: [...player.cards, drawn] }));
  }
  return next;
}

function ensureDeck(game, rng) {
  if (game.deck.length || game.discard.length <= 1) return game;
  return { ...game, deck: shuffled(game.discard.slice(0, -1), rng), discard: [game.discard.at(-1)] };
}

function canAct(game, playerId) {
  return game.phase === "playing" && !game.pendingOpeningWild && !game.pendingDrawFour && currentPlayer(game)?.id === playerId;
}

function clearMissedWindow(game) {
  return game.missedUnoPlayerId && game.missedUnoPlayerId !== currentPlayer(game)?.id ? { ...game, missedUnoPlayerId: null } : game;
}

function nextIndex(game, fromIndex, distance) {
  const length = game.players.length;
  return (fromIndex + game.direction * distance % length + length) % length;
}

function updatePlayer(game, playerId, updater) {
  return { ...game, players: game.players.map((player) => player.id === playerId ? updater(player) : player) };
}

function playerById(game, playerId) {
  return game.players.find((player) => player.id === playerId) ?? null;
}

function makePlayer(player) {
  return { id: player.id, name: cleanName(player.name), isComputer: Boolean(player.isComputer), cards: [], score: 0 };
}

function bestColor(game, cards) {
  const colors = colorsForGame(game);
  return colors.map((color) => ({ color, count: cards.filter((held) => cardFace(game, held).color === color).length })).sort((left, right) => right.count - left.count)[0].color;
}

function createFlipFaces(colors, actions, wildPenalty) {
  const faces = [];
  for (const color of colors) {
    for (let value = 1; value <= 9; value += 1) {
      for (let copy = 0; copy < 2; copy += 1) faces.push(card(`${color}-${value}-${copy}`, color, "number", value));
    }
    for (const type of actions) {
      for (let copy = 0; copy < 2; copy += 1) faces.push(card(`${color}-${type}-${copy}`, color, type));
    }
  }
  for (let copy = 0; copy < 4; copy += 1) faces.push(card(`wild-${copy}`, null, "wild"));
  for (let copy = 0; copy < 4; copy += 1) faces.push(card(`${wildPenalty}-${copy}`, null, wildPenalty));
  return faces;
}

function card(id, color, type, value = null) {
  return { id, color, type, value };
}

function cardLabel(face) {
  const names = {
    draw1: "Draw One", draw2: "Draw Two", draw5: "Draw Five", wild4: "Wild Draw Four",
    wildDraw2: "Wild Draw Two", wildDrawColor: "Wild Draw Color", skipEveryone: "Skip Everyone",
    reverse: "Reverse", skip: "Skip", flip: "FLIP", wild: "Wild",
  };
  if (face.type === "number") return `${face.color} ${face.value}`;
  return `${face.color ? `${face.color} ` : ""}${names[face.type] || face.type}`;
}

function normalizedRuleset(game) {
  return game?.ruleset === "flip" ? "flip" : "classic";
}

function totalCardsInGame(game) {
  return game.deck.length + game.discard.length + game.players.reduce((sum, player) => sum + player.cards.length, 0);
}

function cleanName(name) {
  return String(name || "Player").trim().slice(0, 20) || "Player";
}

function withLog(game, line) {
  return { ...game, log: [line, ...(game.log || [])].slice(0, 80) };
}

function shuffled(items, rng) {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const other = Math.floor(rng() * (index + 1));
    [copy[index], copy[other]] = [copy[other], copy[index]];
  }
  return copy;
}
