export const ASSET_TYPES = [
  { key: "comics", name: "Comic Books", value: 5_000, icon: "POW", color: "#ec6b42", copies: 10 },
  { key: "piano", name: "Grand Piano", value: 5_000, icon: "♫", color: "#446a63", copies: 10 },
  { key: "train", name: "Toy Train", value: 5_000, icon: "🚂", color: "#3f7b95", copies: 10 },
  { key: "jewels", name: "Jewels", value: 10_000, icon: "◆", color: "#8f5da7", copies: 9 },
  { key: "cash", name: "Cash Stash", value: 10_000, icon: "$", color: "#4c8a55", copies: 9 },
  { key: "piggy", name: "Piggy Bank", value: 10_000, icon: "¢", color: "#dc6e83", copies: 9 },
  { key: "scooter", name: "Scooter", value: 15_000, icon: "➜", color: "#da8b35", copies: 9 },
  { key: "plane", name: "Sport Plane", value: 15_000, icon: "✈", color: "#39818b", copies: 9 },
  { key: "auto", name: "Classic Auto", value: 15_000, icon: "●", color: "#b4433f", copies: 9 },
  { key: "cabin", name: "Mountain Cabin", value: 20_000, icon: "⌂", color: "#70513d", copies: 8 },
];

export const WILD_TYPES = [
  { key: "silver", name: "Silver Wild", value: 25_000, icon: "S", color: "#71808a", copies: 8 },
  { key: "gold", name: "Gold Wild", value: 50_000, icon: "G", color: "#b68120", copies: 4 },
];

export const TARGET_SCORE = 1_000_000;
export const MIN_PLAYERS = 2;
export const MAX_PLAYERS = 6;

const assetByKey = new Map(ASSET_TYPES.map((asset) => [asset.key, asset]));
let computerCounter = 0;

export function createDeck(rng = Math.random) {
  const cards = [];
  for (const asset of ASSET_TYPES) {
    for (let copy = 0; copy < asset.copies; copy += 1) {
      cards.push({ id: `${asset.key}-${copy}`, type: "asset", asset: asset.key, value: asset.value });
    }
  }
  for (const wild of WILD_TYPES) {
    for (let copy = 0; copy < wild.copies; copy += 1) {
      cards.push({ id: `${wild.key}-${copy}`, type: "wild", asset: null, value: wild.value, wild: wild.key });
    }
  }
  return shuffled(cards, rng);
}

export function createLobby(host, roomCode, now = Date.now()) {
  return {
    roomCode,
    hostId: host.id,
    phase: "lobby",
    players: [{ ...host, name: cleanName(host.name), isComputer: false, hand: [], stack: [], score: 0 }],
    currentPlayerIndex: 0,
    dealerIndex: 0,
    startingHandSize: 0,
    round: 0,
    deck: [],
    discard: [],
    pendingChallenge: null,
    roundScores: {},
    winnerId: null,
    targetScore: TARGET_SCORE,
    log: [`${cleanName(host.name)} opened the vault.`],
    updatedAt: now,
  };
}

export function addPlayer(game, player) {
  if (game.phase !== "lobby" || game.players.length >= MAX_PLAYERS || game.players.some((item) => item.id === player.id)) return game;
  return {
    ...game,
    players: [...game.players, { ...player, name: cleanName(player.name), isComputer: false, hand: [], stack: [], score: 0 }],
    log: [`${cleanName(player.name)} joined the table.`, ...game.log].slice(0, 60),
  };
}

export function addComputerPlayer(game) {
  if (game.phase !== "lobby" || game.players.length >= MAX_PLAYERS) return game;
  computerCounter += 1;
  const usedNames = new Set(game.players.map((player) => player.name));
  const names = ["Penny", "Buck", "Goldie", "Chip", "Sterling"];
  const name = names.find((candidate) => !usedNames.has(candidate)) || `Computer ${computerCounter}`;
  return {
    ...game,
    players: [...game.players, { id: `computer-${computerCounter}-${Date.now()}`, name, isComputer: true, hand: [], stack: [], score: 0 }],
    log: [`${name} pulled up a chair.`, ...game.log].slice(0, 60),
  };
}

export function removeComputerPlayer(game, playerId) {
  if (game.phase !== "lobby") return game;
  const player = game.players.find((item) => item.id === playerId && item.isComputer);
  if (!player) return game;
  return {
    ...game,
    players: game.players.filter((item) => item.id !== playerId),
    log: [`${player.name} left the table.`, ...game.log].slice(0, 60),
  };
}

export function startGame(game, rng = Math.random) {
  if (game.phase !== "lobby") return game;
  if (game.players.length < MIN_PLAYERS || game.players.length > MAX_PLAYERS) throw new Error("Cover Your Assets needs 2–6 players.");
  const startingPlayerIndex = Math.floor(rng() * game.players.length);
  const dealerIndex = (startingPlayerIndex - 1 + game.players.length) % game.players.length;
  return dealRound({ ...game, round: 1, dealerIndex, startingPlayerIndex }, rng);
}

export function startNextRound(game, playerId, rng = Math.random) {
  if (game.phase !== "roundEnd" || game.hostId !== playerId) return game;
  return dealRound({ ...game, round: game.round + 1, dealerIndex: (game.dealerIndex + 1) % game.players.length }, rng);
}

function dealRound(game, rng) {
  const startingHandSize = game.players.length <= 3 ? 5 : 4;
  const deck = createDeck(rng);
  const players = game.players.map((player) => ({ ...player, hand: [], stack: [] }));
  for (let cardIndex = 0; cardIndex < startingHandSize; cardIndex += 1) {
    for (const player of players) player.hand.push(deck.shift());
  }
  const firstDiscard = deck.shift();
  const currentPlayerIndex = (game.dealerIndex + 1) % players.length;
  return {
    ...game,
    phase: "playing",
    players,
    deck,
    discard: firstDiscard ? [firstDiscard] : [],
    pendingChallenge: null,
    roundScores: {},
    winnerId: null,
    startingHandSize,
    currentPlayerIndex,
    log: [`Round ${game.round} begins. ${players[currentPlayerIndex].name} goes first.`, ...game.log].slice(0, 60),
  };
}

export function currentPlayer(game) {
  return game.players[game.currentPlayerIndex] ?? null;
}

export function topDiscard(game) {
  return game.discard.at(-1) ?? null;
}

export function topSet(player) {
  return player?.stack.at(-1) ?? null;
}

export function cardDefinition(card) {
  if (!card) return null;
  if (card.type === "wild") return WILD_TYPES.find((item) => item.key === card.wild) ?? null;
  return assetByKey.get(card.asset) ?? null;
}

export function cardName(card) {
  return cardDefinition(card)?.name ?? "Asset";
}

export function formatMoney(value) {
  return `$${Number(value || 0).toLocaleString("en-US")}`;
}

export function setValue(set) {
  return set?.cards.reduce((total, card) => total + card.value, 0) ?? 0;
}

export function stackValue(player) {
  return player.stack.reduce((total, set) => total + setValue(set), 0);
}

export function matchingChallengeCards(player, asset) {
  return player?.hand.filter((card) => card.type === "wild" || card.asset === asset) ?? [];
}

export function canChallenge(game, challengerId, defenderId) {
  const challenger = game.players.find((player) => player.id === challengerId);
  const defender = game.players.find((player) => player.id === defenderId);
  const asset = topSet(defender)?.asset;
  return Boolean(
    game.phase === "playing" &&
    !game.pendingChallenge &&
    currentPlayer(game)?.id === challengerId &&
    challengerId !== defenderId &&
    challenger?.stack.length >= 1 &&
    defender?.stack.length >= 2 &&
    matchingChallengeCards(challenger, asset).length,
  );
}

export function makePairFromHand(game, playerId, cardIds) {
  if (!isNormalTurn(game, playerId) || cardIds.length !== 2) return game;
  const player = playerById(game, playerId);
  const cards = cardIds.map((id) => player.hand.find((card) => card.id === id));
  if (cards.some((card) => !card)) return game;
  const assetCards = cards.filter((card) => card.type === "asset");
  if (assetCards.length === 0 || (assetCards.length === 2 && assetCards[0].asset !== assetCards[1].asset)) return game;
  return finishTurn(
    addSet(removeCards(game, playerId, cardIds), playerId, assetCards[0].asset, cards),
    `${player.name} banked a pair of ${assetByKey.get(assetCards[0].asset).name}.`,
  );
}

export function makePairFromDiscard(game, playerId, handCardId) {
  if (!isNormalTurn(game, playerId)) return game;
  const discard = topDiscard(game);
  const player = playerById(game, playerId);
  const handCard = player.hand.find((card) => card.id === handCardId);
  if (!discard || discard.type !== "asset" || !handCard || handCard.type !== "asset" || handCard.asset !== discard.asset) return game;
  let next = removeCards(game, playerId, [handCardId]);
  next = { ...next, discard: next.discard.slice(0, -1) };
  next = addSet(next, playerId, discard.asset, [handCard, discard]);
  return finishTurn(next, `${player.name} rescued ${cardName(discard)} from the discard pile.`);
}

export function discardCard(game, playerId, cardId) {
  if (!isNormalTurn(game, playerId)) return game;
  const player = playerById(game, playerId);
  const card = player.hand.find((item) => item.id === cardId);
  if (!card) return game;
  const next = removeCards(game, playerId, [cardId]);
  return finishTurn({ ...next, discard: [...next.discard, card] }, `${player.name} discarded ${cardName(card)}.`);
}

export function startChallenge(game, challengerId, defenderId, cardId) {
  if (!canChallenge(game, challengerId, defenderId)) return game;
  const challenger = playerById(game, challengerId);
  const defender = playerById(game, defenderId);
  const card = challenger.hand.find((item) => item.id === cardId);
  const target = topSet(defender);
  if (!card || (card.type !== "wild" && card.asset !== target.asset)) return game;
  const next = removeCards(game, challengerId, [cardId]);
  return {
    ...next,
    pendingChallenge: {
      challengerId,
      defenderId,
      asset: target.asset,
      targetSetId: target.id,
      turnPlayerId: defenderId,
      played: [{ playerId: challengerId, card }],
    },
    log: [`${challenger.name} challenged ${defender.name} for ${assetByKey.get(target.asset).name}!`, ...game.log].slice(0, 60),
  };
}

export function playChallengeCard(game, playerId, cardId) {
  const challenge = game.pendingChallenge;
  if (game.phase !== "playing" || challenge?.turnPlayerId !== playerId) return game;
  const player = playerById(game, playerId);
  const card = player.hand.find((item) => item.id === cardId);
  if (!card || (card.type !== "wild" && card.asset !== challenge.asset)) return game;
  const next = removeCards(game, playerId, [cardId]);
  const otherId = playerId === challenge.challengerId ? challenge.defenderId : challenge.challengerId;
  return {
    ...next,
    pendingChallenge: {
      ...challenge,
      turnPlayerId: otherId,
      played: [...challenge.played, { playerId, card }],
    },
    log: [`${player.name} countered with ${cardName(card)}.`, ...game.log].slice(0, 60),
  };
}

export function yieldChallenge(game, playerId) {
  const challenge = game.pendingChallenge;
  if (game.phase !== "playing" || challenge?.turnPlayerId !== playerId) return game;
  const winnerId = challenge.played.at(-1).playerId;
  const winner = playerById(game, winnerId);
  const defender = playerById(game, challenge.defenderId);
  const target = defender.stack.find((set) => set.id === challenge.targetSetId);
  if (!target) return { ...game, pendingChallenge: null };
  const playedCards = challenge.played.map((entry) => entry.card);
  const players = game.players.map((player) => {
    const withoutTarget = player.id === defender.id
      ? { ...player, stack: player.stack.filter((set) => set.id !== target.id) }
      : player;
    if (withoutTarget.id !== winnerId) return withoutTarget;
    return {
      ...withoutTarget,
      stack: [...withoutTarget.stack, { ...target, cards: [...target.cards, ...playedCards] }],
    };
  });
  return finishTurn(
    { ...game, players, pendingChallenge: null },
    `${winner.name} won ${cardName(target.cards.find((card) => card.type === "asset"))} worth ${formatMoney(setValue(target) + playedCards.reduce((sum, card) => sum + card.value, 0))}.`,
  );
}

export function eligibleTurnActions(game, playerId) {
  const player = playerById(game, playerId);
  if (!player) return { pairs: [], discardMatches: [], challenges: [] };
  const pairs = [];
  for (let first = 0; first < player.hand.length; first += 1) {
    for (let second = first + 1; second < player.hand.length; second += 1) {
      const cards = [player.hand[first], player.hand[second]];
      const assets = cards.filter((card) => card.type === "asset");
      if (assets.length && (assets.length === 1 || assets[0].asset === assets[1].asset)) pairs.push(cards.map((card) => card.id));
    }
  }
  const discard = topDiscard(game);
  const discardMatches = discard?.type === "asset"
    ? player.hand.filter((card) => card.type === "asset" && card.asset === discard.asset).map((card) => card.id)
    : [];
  const challenges = game.players.filter((target) => canChallenge(game, playerId, target.id)).map((target) => target.id);
  return { pairs, discardMatches, challenges };
}

export function runComputerStep(game, rng = Math.random) {
  if (game.phase !== "playing") return game;
  if (game.pendingChallenge) {
    const responder = playerById(game, game.pendingChallenge.turnPlayerId);
    if (!responder?.isComputer) return game;
    const options = matchingChallengeCards(responder, game.pendingChallenge.asset).sort(compareCardCost);
    if (!options.length) return yieldChallenge(game, responder.id);
    const contested = challengePotValue(game);
    const isDefender = responder.id === game.pendingChallenge.defenderId;
    const shouldContinue = isDefender || contested >= options[0].value * 1.35 || rng() > 0.72;
    return shouldContinue ? playChallengeCard(game, responder.id, options[0].id) : yieldChallenge(game, responder.id);
  }

  const player = currentPlayer(game);
  if (!player?.isComputer) return game;
  const actions = eligibleTurnActions(game, player.id);
  const attacks = actions.challenges.flatMap((defenderId) => {
    const defender = playerById(game, defenderId);
    const target = topSet(defender);
    return matchingChallengeCards(player, target.asset).map((card) => ({ defenderId, card, score: setValue(target) - card.value * 0.55 }));
  }).sort((a, b) => b.score - a.score);
  if (attacks[0]?.score > 0) return startChallenge(game, player.id, attacks[0].defenderId, attacks[0].card.id);

  if (actions.discardMatches.length) {
    const best = actions.discardMatches.map((id) => player.hand.find((card) => card.id === id)).sort((a, b) => b.value - a.value)[0];
    return makePairFromDiscard(game, player.id, best.id);
  }

  if (actions.pairs.length) {
    const scored = actions.pairs.map((ids) => ({ ids, score: ids.reduce((sum, id) => sum + player.hand.find((card) => card.id === id).value, 0) - ids.reduce((penalty, id) => penalty + (player.hand.find((card) => card.id === id).type === "wild" ? 20_000 : 0), 0) }));
    scored.sort((a, b) => b.score - a.score);
    return makePairFromHand(game, player.id, scored[0].ids);
  }

  const discard = [...player.hand].sort((a, b) => discardPriority(a, player.hand) - discardPriority(b, player.hand))[0];
  return discard ? discardCard(game, player.id, discard.id) : game;
}

function addSet(game, playerId, asset, cards) {
  return {
    ...game,
    players: game.players.map((player) => player.id === playerId
      ? { ...player, stack: [...player.stack, { id: `set-${cards.map((card) => card.id).join("-")}`, asset, cards }] }
      : player),
  };
}

function removeCards(game, playerId, cardIds) {
  const removed = new Set(cardIds);
  return {
    ...game,
    players: game.players.map((player) => player.id === playerId
      ? { ...player, hand: player.hand.filter((card) => !removed.has(card.id)) }
      : player),
  };
}

function finishTurn(game, message) {
  let deck = [...game.deck];
  const players = game.players.map((player) => ({ ...player, hand: [...player.hand] }));
  const order = Array.from({ length: players.length }, (_, offset) => (game.currentPlayerIndex + offset) % players.length);
  for (const index of order) {
    while (players[index].hand.length < game.startingHandSize && deck.length) players[index].hand.push(deck.shift());
  }
  let next = { ...game, players, deck, log: [message, ...game.log].slice(0, 60) };
  if (!deck.length && players.every((player) => player.hand.length === 0)) return finishRound(next);
  for (let offset = 1; offset <= players.length; offset += 1) {
    const candidate = (game.currentPlayerIndex + offset) % players.length;
    if (players[candidate].hand.length) return { ...next, currentPlayerIndex: candidate };
  }
  return finishRound(next);
}

function finishRound(game) {
  const roundScores = Object.fromEntries(game.players.map((player) => [player.id, stackValue(player)]));
  const players = game.players.map((player) => ({ ...player, score: player.score + roundScores[player.id] }));
  const highScore = Math.max(...players.map((player) => player.score));
  const leaders = players.filter((player) => player.score === highScore);
  const winner = highScore >= game.targetScore && leaders.length === 1 ? leaders[0] : null;
  return {
    ...game,
    phase: winner ? "finished" : "roundEnd",
    players,
    roundScores,
    winnerId: winner?.id ?? null,
    pendingChallenge: null,
    log: [winner ? `${winner.name} is the first millionaire!` : `Round ${game.round} is in the books.`, ...game.log].slice(0, 60),
  };
}

function challengePotValue(game) {
  const challenge = game.pendingChallenge;
  const defender = playerById(game, challenge.defenderId);
  const target = defender.stack.find((set) => set.id === challenge.targetSetId);
  return setValue(target) + challenge.played.reduce((sum, entry) => sum + entry.card.value, 0);
}

function isNormalTurn(game, playerId) {
  return game.phase === "playing" && !game.pendingChallenge && currentPlayer(game)?.id === playerId;
}

function playerById(game, playerId) {
  return game.players.find((player) => player.id === playerId) ?? null;
}

function discardPriority(card, hand) {
  if (card.type === "wild") return 1_000_000 + card.value;
  const matches = hand.filter((held) => held.id !== card.id && held.asset === card.asset).length;
  return matches * 500_000 + card.value;
}

function compareCardCost(first, second) {
  if (first.type !== second.type) return first.type === "asset" ? -1 : 1;
  return first.value - second.value;
}

function cleanName(name) {
  return String(name || "Player").trim().slice(0, 20) || "Player";
}

function shuffled(cards, rng) {
  const result = [...cards];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(rng() * (index + 1));
    [result[index], result[swapIndex]] = [result[swapIndex], result[index]];
  }
  return result;
}
