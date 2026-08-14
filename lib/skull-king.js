export const SKULL_KING_SUITS = ["green", "yellow", "purple", "black"];

export const SKULL_KING_SUIT_DETAILS = {
  green: { label: "Parrot", symbol: "✶" },
  yellow: { label: "Treasure", symbol: "◆" },
  purple: { label: "Map", symbol: "◈" },
  black: { label: "Jolly Roger", symbol: "☠" },
};

export const SKULL_KING_SPECIALS = {
  escape: { label: "Escape", symbol: "⚑", description: "Loses unless every ranking card is an Escape." },
  doubloon: { label: "Doubloons", symbol: "◉", description: "An Escape that can form a 20-point alliance." },
  mermaid: { label: "Mermaid", symbol: "♆", description: "Beats numbers and the Skull King, but loses to Pirates." },
  pirate: { label: "Pirate", symbol: "☠", description: "Beats every numbered card." },
  tigress: { label: "Tigress", symbol: "◐", description: "Choose whether she plays as a Pirate or an Escape." },
  skullKing: { label: "Skull King", symbol: "♛", description: "Beats numbers and Pirates, but loses to Mermaids." },
  firstMate: { label: "First Mate Con", symbol: "⚔", description: "Beats Pirates and can use the powers of Pirates he captures." },
  kraken: { label: "Kraken", symbol: "⌘", description: "Destroys the trick. No one wins it." },
  whiteWhale: { label: "White Whale", symbol: "○", description: "Only the highest numbered card can win." },
  spottedStingray: { label: "Spotted Stingray", symbol: "≋", description: "Only the lowest numbered card can win." },
  walkThePlank: { label: "Walk the Plank", symbol: "⟿", description: "Removes one Pirate from the trick." },
  lastVolley: { label: "The Last Volley", symbol: "✹", description: "Play a second card, then skip the final trick." },
  davyJones: { label: "Davy Jones’ Locker", symbol: "▣", description: "Destroys every Sea Monster in the trick." },
};

export const SKULL_KING_PIRATES = [
  {
    key: "rosie",
    name: "Rosie D’ Laney",
    ability: "Choose any player, including yourself, to lead the next trick.",
    abilityShort: "Choose the next lead",
  },
  {
    key: "bendt",
    name: "Bendt the Bandit",
    ability: "Draw two cards from the undealt deck, then discard any two cards.",
    abilityShort: "Draw 2, discard 2",
  },
  {
    key: "rascal",
    name: "Rascal of Roatan",
    ability: "Wager 0, 10, or 20 points on making your bid this round.",
    abilityShort: "Wager on your bid",
  },
  {
    key: "juanita",
    name: "Juanita Jade",
    ability: "Privately inspect the cards that were not dealt this round.",
    abilityShort: "Inspect the undealt deck",
  },
  {
    key: "harry",
    name: "Harry the Giant",
    ability: "Change your bid by minus one, leave it unchanged, or add one.",
    abilityShort: "Adjust your bid",
  },
  {
    key: "mary",
    name: "Mary Thorne",
    ability: "Choose a player. One random card from their hand must be played in the next trick.",
    abilityShort: "Force a random card",
  },
];

const SEA_MONSTERS = ["kraken", "whiteWhale", "spottedStingray"];
const BOT_NAMES = ["You", "Barnacle Bea", "Red Roger", "Calico", "Marlow", "Inky", "Finn", "Nova", "Reef"];

export function createSkullKingDeck() {
  const suitedCards = SKULL_KING_SUITS.flatMap((suit) => [
    ...Array.from({ length: 14 }, (_, index) => ({
      id: `${suit}-${index + 1}`,
      type: "number",
      suit,
      rank: index + 1,
      bonus: index + 1 === 14 ? (suit === "black" ? 20 : 10) : 0,
    })),
    { id: `${suit}-7-expansion`, type: "number", suit, rank: 7, bonus: -5, expansion: true },
    { id: `${suit}-8-expansion`, type: "number", suit, rank: 8, bonus: 5, expansion: true },
    { id: `${suit}-choice`, type: "choice", suit, rank: null, bonus: 0, expansion: true },
  ]);

  return [
    ...suitedCards,
    { id: "wild-monkey-15", type: "wild15", suit: null, rank: 15, bonus: 0, expansion: true },
    ...Array.from({ length: 5 }, (_, index) => specialCard("escape", index)),
    ...Array.from({ length: 2 }, (_, index) => specialCard("doubloon", index)),
    ...Array.from({ length: 2 }, (_, index) => specialCard("mermaid", index)),
    ...SKULL_KING_PIRATES.map((pirate) => specialCard("pirate", pirate.key, {
      pirateKey: pirate.key,
      name: pirate.name,
      ability: pirate.ability,
      abilityShort: pirate.abilityShort,
      expansion: pirate.key === "mary",
    })),
    specialCard("tigress", 0),
    specialCard("skullKing", 0),
    specialCard("firstMate", 0, { expansion: true }),
    specialCard("kraken", 0),
    specialCard("whiteWhale", 0),
    specialCard("spottedStingray", 0, { expansion: true }),
    specialCard("walkThePlank", 0, { expansion: true }),
    specialCard("lastVolley", 0, { expansion: true }),
    specialCard("davyJones", 0, { expansion: true }),
  ];
}

function specialCard(kind, index, details = {}) {
  return { id: `${kind}-${index}`, type: "special", kind, suit: null, rank: null, bonus: 0, ...details };
}

export function shuffleSkullKingDeck(deck, random = Math.random) {
  const result = [...deck];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const target = Math.floor(random() * (index + 1));
    [result[index], result[target]] = [result[target], result[index]];
  }
  return result;
}

export function sortSkullKingHand(hand) {
  return [...hand].sort((a, b) => {
    if (a.type === "special" && b.type !== "special") return 1;
    if (a.type !== "special" && b.type === "special") return -1;
    if (a.type === "special" && b.type === "special") {
      return Object.keys(SKULL_KING_SPECIALS).indexOf(a.kind) - Object.keys(SKULL_KING_SPECIALS).indexOf(b.kind);
    }
    const suitDifference = cardSuitIndex(a) - cardSuitIndex(b);
    return suitDifference || cardValue(a) - cardValue(b) || a.id.localeCompare(b.id);
  });
}

function cardSuitIndex(card) {
  if (card.type === "wild15") return SKULL_KING_SUITS.length;
  return SKULL_KING_SUITS.indexOf(card.suit);
}

export function createSkullKingMatch({ playerName = "You", playerCount = 4, playerSeeds = null, startingPlayerIndex = 0, random = Math.random } = {}) {
  const seeds = Array.isArray(playerSeeds) && playerSeeds.length
    ? playerSeeds
    : BOT_NAMES.slice(0, playerCount).map((name, index) => ({
      playerId: `local-${index}`,
      name: index === 0 ? playerName.trim() || "You" : name,
      isComputer: index !== 0,
    }));
  const captainCount = seeds.length;
  if (captainCount < 2 || captainCount > 9) {
    throw new Error("Skull King supports two to nine players with the expansion deck.");
  }
  const gameplaySeeds = captainCount === 2
    ? [...seeds, { playerId: "ghost", name: "Ghost Crew", isComputer: false, isGhost: true }]
    : seeds;
  const resolvedPlayerCount = gameplaySeeds.length;

  const players = gameplaySeeds.map((seed, index) => ({
    id: index,
    playerId: seed.playerId || `player-${index}`,
    name: String(seed.name || `Player ${index + 1}`).trim().slice(0, 18) || `Player ${index + 1}`,
    isComputer: Boolean(seed.isComputer),
    isGhost: Boolean(seed.isGhost),
    hand: [],
    bid: null,
    tricks: 0,
    score: 0,
    roundBonus: 0,
    wager: 0,
  }));
  const normalizedStartingPlayerIndex = ((startingPlayerIndex % captainCount) + captainCount) % captainCount;

  return dealSkullKingRound({
    playerCount: resolvedPlayerCount,
    captainCount,
    players,
    roundNumber: 1,
    startingPlayerIndex: normalizedStartingPlayerIndex,
    dealerIndex: (normalizedStartingPlayerIndex - 1 + captainCount) % captainCount,
    history: [],
  }, random);
}

export function dealSkullKingRound(match, random = Math.random) {
  const availableDeck = match.captainCount === 2
    ? createSkullKingDeck().filter((card) => (
      card.type !== "choice"
      && card.type !== "wild15"
      && card.kind !== "walkThePlank"
      && card.kind !== "doubloon"
    ))
    : createSkullKingDeck();
  const deck = shuffleSkullKingDeck(availableDeck, random);
  const cardsNeeded = match.playerCount * match.roundNumber;
  const dealt = deck.slice(0, cardsNeeded);
  const players = match.players.map((player, playerIndex) => ({
    ...player,
    hand: player.isGhost
      ? dealt.filter((_, cardIndex) => cardIndex % match.playerCount === playerIndex)
      : sortSkullKingHand(dealt.filter((_, cardIndex) => cardIndex % match.playerCount === playerIndex)),
    bid: player.isGhost ? 0 : null,
    tricks: 0,
    roundBonus: 0,
    wager: 0,
  }));

  const roundState = {
    ...match,
    players,
    deckCount: deck.length - cardsNeeded,
    drawPile: deck.slice(cardsNeeded),
    phase: "bidding",
    trick: [],
    trickNumber: 1,
    currentPlayerIndex: null,
    lastTrick: null,
    roundSummary: null,
    doubloonAlliances: [],
    pendingPirateAbility: null,
    pendingWalkThePlank: null,
    forcedPlay: null,
    skipFinalTrickPlayerIndex: null,
    message: `Round ${match.roundNumber}: choose how many tricks you will take.`,
  };
  if (getSkullKingGhostIndex(roundState) < 0) {
    return { ...roundState, trickOrder: null, twoPlayerHumanLeaderIndex: null };
  }
  const humanLeaderIndex = nextRealPlayerIndex(roundState, roundState.dealerIndex);
  return {
    ...roundState,
    trickOrder: twoPlayerTrickOrder(roundState, humanLeaderIndex, humanLeaderIndex, 1),
    twoPlayerHumanLeaderIndex: humanLeaderIndex,
  };
}

export function submitSkullKingBid(state, playerIndex, bid, random = Math.random) {
  const requestedBid = Number(bid);
  if (
    state.phase !== "bidding"
    || !Number.isInteger(playerIndex)
    || !state.players[playerIndex]
    || state.players[playerIndex].isGhost
    || state.players[playerIndex].bid !== null
    || !Number.isInteger(requestedBid)
    || requestedBid < 0
    || requestedBid > state.roundNumber
  ) return state;
  const players = state.players
    .map((player, index) => index === playerIndex ? { ...player, bid: requestedBid } : player)
    .map((player) => player.isComputer && player.bid === null
      ? { ...player, bid: chooseBotBid(player.hand, state.roundNumber, random) }
      : player);
  const bidsComplete = players.every((player) => player.bid !== null);
  if (!bidsComplete) {
    const bidsPlaced = players.filter((player) => player.bid !== null).length;
    return {
      ...state,
      players,
      message: `${bidsPlaced} of ${state.playerCount} captains have locked their bids.`,
    };
  }
  const leaderIndex = state.trickOrder?.[0] ?? (state.dealerIndex + 1) % state.playerCount;
  return {
    ...state,
    players,
    phase: "playing",
    currentPlayerIndex: leaderIndex,
    message: `${players[leaderIndex].name} leads the first trick.`,
  };
}

export function chooseBotBid(hand, roundNumber, random = Math.random) {
  let strength = 0;
  for (const card of hand) {
    if (card.kind === "skullKing") strength += 1;
    else if (["pirate", "firstMate"].includes(card.kind)) strength += 0.82;
    else if (card.kind === "tigress") strength += 0.48;
    else if (card.kind === "mermaid") strength += 0.66;
    else if (["whiteWhale", "spottedStingray"].includes(card.kind)) strength += 0.2;
    else if (card.kind === "kraken" || isEscapeLike(card) || isNonWinning(card)) strength -= 0.08;
    else if (effectiveSuit(card) === "black") strength += Math.max(0, cardValue(card) - 7) / 10;
    else strength += Math.max(0, cardValue(card) - 10) / 15;
  }
  const wobble = random() * 0.8 - 0.4;
  return Math.max(0, Math.min(roundNumber, Math.round(strength + wobble)));
}

export function getSkullKingLeadSuit(trick) {
  for (const play of trick) {
    const card = play.card;
    if (isNumbered(card)) return effectiveSuit(card);
    if (defersLead(card)) continue;
    return null;
  }
  return null;
}

export function getLegalSkullKingCards(state, playerIndex) {
  const player = state.players[playerIndex];
  if (!player || !["playing", "lastVolley"].includes(state.phase) || state.currentPlayerIndex !== playerIndex) return [];

  if (state.forcedPlay?.playerIndex === playerIndex) {
    const forcedCard = player.hand.find((card) => card.id === state.forcedPlay.cardId);
    return forcedCard ? [forcedCard] : [];
  }

  if (player.isGhost) return player.hand;

  const leadSuit = getSkullKingLeadSuit(state.trick);
  if (!leadSuit) return player.hand;
  const followsLead = (card) => isNumbered(card) && (
    effectiveSuit(card) === leadSuit || (card.type === "wild15" && leadSuit !== "black")
  );
  const suited = player.hand.filter(followsLead);
  if (!suited.length) return player.hand;
  return player.hand.filter((card) => card.type === "special" || followsLead(card));
}

export function getSkullKingGhostIndex(state) {
  return state.players.findIndex((player) => player.isGhost);
}

export function getSkullKingGhostControllerIndex(state) {
  const ghostIndex = getSkullKingGhostIndex(state);
  if (ghostIndex < 0) return null;
  const storedLeader = state.players[state.twoPlayerHumanLeaderIndex]?.isGhost === false
    ? state.twoPlayerHumanLeaderIndex
    : state.trickOrder?.find((playerIndex) => playerIndex !== ghostIndex);
  if (storedLeader !== undefined && storedLeader !== state.skipFinalTrickPlayerIndex) return storedLeader;
  return state.players.findIndex((player, playerIndex) => !player.isGhost && playerIndex !== state.skipFinalTrickPlayerIndex);
}

export function getSkullKingActingPlayerIndex(state) {
  const ghostIndex = getSkullKingGhostIndex(state);
  return state.currentPlayerIndex === ghostIndex
    ? getSkullKingGhostControllerIndex(state)
    : state.currentPlayerIndex;
}

export function getSkullKingGhostDeclaration(card) {
  if (card?.kind === "tigress") return "escape";
  return null;
}

export function playSkullKingCard(state, playerIndex, cardId, declaration = null) {
  const legalCards = getLegalSkullKingCards(state, playerIndex);
  const legalCard = legalCards.find((card) => card.id === cardId);
  if (!legalCard) return state;

  const leadSuit = getSkullKingLeadSuit(state.trick);
  if (legalCard.type === "choice" && ![0, 14].includes(declaration)) return state;
  if (legalCard.kind === "tigress" && !["pirate", "escape"].includes(declaration)) return state;
  if (legalCard.type === "wild15" && !leadSuit && !SKULL_KING_SUITS.slice(0, 3).includes(declaration)) return state;

  const card = declareCard(legalCard, declaration, leadSuit);
  const players = state.players.map((player, index) => index === playerIndex
    ? { ...player, hand: player.hand.filter((candidate) => candidate.id !== cardId) }
    : player);
  const wasLastVolleyExtra = state.phase === "lastVolley";
  const trick = [...state.trick, { playerIndex, card, isLastVolleyExtra: wasLastVolleyExtra }];
  const forcedPlay = state.forcedPlay?.playerIndex === playerIndex && state.forcedPlay.cardId === cardId
    ? null
    : state.forcedPlay;

  if (wasLastVolleyExtra) {
    return finalizePlayedTrick({ ...state, players, trick, forcedPlay, phase: "playing" });
  }

  const expectedPlays = expectedRegularPlays(state);
  if (trick.length < expectedPlays) {
    const nextPlayerIndex = state.trickOrder?.[trick.length] ?? nextActivePlayer(state, playerIndex, state.trickNumber);
    return {
      ...state,
      players,
      trick,
      forcedPlay,
      currentPlayerIndex: nextPlayerIndex,
      message: `${players[nextPlayerIndex].name}'s turn.`,
    };
  }

  const volleyPlay = trick.find((play) => play.card.kind === "lastVolley");
  if (volleyPlay && state.trickNumber < state.roundNumber) {
    return {
      ...state,
      players,
      trick,
      forcedPlay,
      phase: "lastVolley",
      currentPlayerIndex: volleyPlay.playerIndex,
      skipFinalTrickPlayerIndex: volleyPlay.playerIndex,
      message: `${players[volleyPlay.playerIndex].name} fires the Last Volley and plays one more card.`,
    };
  }

  return finalizePlayedTrick({ ...state, players, trick, forcedPlay });
}

function declareCard(card, declaration, leadSuit) {
  if (card.type === "choice") return { ...card, declaredValue: declaration };
  if (card.kind === "tigress") return { ...card, declaredRole: declaration };
  if (card.type === "wild15") {
    return { ...card, declaredSuit: leadSuit && leadSuit !== "black" ? leadSuit : declaration };
  }
  return card;
}

function expectedRegularPlays(state) {
  const skipped = state.trickNumber === state.roundNumber && state.skipFinalTrickPlayerIndex !== null;
  return state.playerCount - (skipped ? 1 : 0);
}

function nextActivePlayer(state, playerIndex, trickNumber) {
  let next = (playerIndex + 1) % state.playerCount;
  if (trickNumber === state.roundNumber && next === state.skipFinalTrickPlayerIndex) {
    next = (next + 1) % state.playerCount;
  }
  return next;
}

function finalizePlayedTrick(state) {
  const walkPlay = state.trick.find((play) => play.card.kind === "walkThePlank");
  const removablePirates = state.trick.filter((play) => effectiveCardKind(play.card) === "pirate");
  if (walkPlay && removablePirates.length) {
    return {
      ...state,
      phase: "walkThePlank",
      currentPlayerIndex: walkPlay.playerIndex,
      pendingWalkThePlank: {
        playerIndex: walkPlay.playerIndex,
        pirateCardIds: removablePirates.map((play) => play.card.id),
      },
      message: `${state.players[walkPlay.playerIndex].name} must send a Pirate overboard.`,
    };
  }
  return completeTrickResolution(state, state.trick);
}

export function resolveWalkThePlank(state, pirateCardId) {
  if (state.phase !== "walkThePlank" || !state.pendingWalkThePlank?.pirateCardIds.includes(pirateCardId)) return state;
  const originalLeaderIndex = state.trick[0]?.playerIndex ?? 0;
  const trick = state.trick.filter((play) => play.card.id !== pirateCardId);
  return completeTrickResolution({ ...state, trick, pendingWalkThePlank: null }, trick, originalLeaderIndex);
}

export function chooseBotWalkThePlank(state) {
  const eligible = state.trick.filter((play) => state.pendingWalkThePlank?.pirateCardIds.includes(play.card.id));
  const skullKingPresent = state.trick.some((play) => effectiveCardKind(play.card) === "skullKing");
  const preferred = skullKingPresent
    ? eligible.find((play) => play.playerIndex !== state.pendingWalkThePlank.playerIndex)
    : eligible.find((play) => play.playerIndex === state.pendingWalkThePlank.playerIndex);
  return (preferred || eligible[0])?.card.id ?? null;
}

function completeTrickResolution(state, resolvedTrick, originalLeaderIndex = state.trick[0]?.playerIndex ?? 0) {
  const result = resolveSkullKingTrick(resolvedTrick, originalLeaderIndex, state.playerCount);
  const roundEnded = state.players.every((player) => player.hand.length === 0);
  const abilityQueue = getPirateAbilityQueue(result, resolvedTrick, roundEnded);
  let nextState = {
    ...state,
    phase: "collecting",
    currentPlayerIndex: result.nextLeaderIndex,
    lastTrick: result,
    pendingWalkThePlank: null,
    message: result.winnerIndex === null
      ? result.reason
      : `${state.players[result.winnerIndex].name} wins the trick${result.bonus ? ` with ${signedPoints(result.bonus)} potential bonus points` : ""}.`,
  };
  if (abilityQueue.length) nextState = preparePirateAbility(nextState, abilityQueue);
  return nextState;
}

function getPirateAbilityQueue(result, trick, roundEnded) {
  if (result.winnerIndex === null) return [];
  const abilities = [];
  if (result.winningCard?.pirateKey) {
    abilities.push(abilityEntry(result.winningCard, result.winnerIndex));
  } else if (result.winningCard?.kind === "firstMate") {
    for (const play of trick.filter((candidate) => candidate.card.pirateKey)) {
      abilities.push(abilityEntry(play.card, result.winnerIndex));
    }
  }
  return roundEnded ? abilities.filter((ability) => ability.pirateKey === "harry") : abilities;
}

function abilityEntry(card, playerIndex) {
  return {
    playerIndex,
    pirateKey: card.pirateKey,
    pirateName: card.name,
    ability: card.ability,
    drawnCardIds: [],
  };
}

function preparePirateAbility(state, queue) {
  if (!queue.length) return { ...state, phase: "collecting", pendingPirateAbility: null };
  const [current, ...remainingAbilities] = queue;
  let nextState = {
    ...state,
    phase: "pirateAbility",
    pendingPirateAbility: { ...current, remainingAbilities },
    message: `${state.players[current.playerIndex].name} may use ${current.pirateName}.`,
  };
  if (current.pirateKey === "bendt") nextState = drawForBendt(nextState);
  return nextState;
}

export function resolveSkullKingTrick(
  trick,
  originalLeaderIndex = trick[0]?.playerIndex ?? 0,
  playerCount = Math.max(1, ...trick.map((play) => play.playerIndex + 1)),
) {
  const davyPlay = trick.find((play) => play.card.kind === "davyJones");
  if (davyPlay) {
    const monsters = trick.filter((play) => SEA_MONSTERS.includes(play.card.kind));
    const remaining = trick.filter((play) => play !== davyPlay && !SEA_MONSTERS.includes(play.card.kind));
    const result = resolveStandardTrick(remaining, originalLeaderIndex);
    const davyBonus = monsters.length * 20;
    return {
      ...result,
      davyJonesPlayerIndex: davyPlay.playerIndex,
      destroyedMonsterCount: monsters.length,
      bonusAwards: [
        ...(result.bonusAwards || []),
        ...(davyBonus ? [{ playerIndex: davyPlay.playerIndex, points: davyBonus }] : []),
      ],
      reason: result.winnerIndex === null
        ? "Davy Jones destroys the Sea Monsters, but no ranking card remains."
        : result.reason,
    };
  }

  const monsters = trick.filter((play) => SEA_MONSTERS.includes(play.card.kind));
  const activeMonster = monsters.at(-1);
  if (activeMonster?.card.kind === "kraken") {
    return noWinnerResult(
      (activeMonster.playerIndex + 1) % playerCount,
      "The Kraken destroys the trick. No one wins it.",
      "kraken",
    );
  }

  if (["whiteWhale", "spottedStingray"].includes(activeMonster?.card.kind)) {
    const numbered = trick.filter((play) => isNumbered(play.card));
    if (!numbered.length) {
      return noWinnerResult(originalLeaderIndex, "Only non-winning special cards were played, so no one wins the trick.", activeMonster.card.kind);
    }
    const lowestWins = activeMonster.card.kind === "spottedStingray";
    const winner = [...numbered].sort((a, b) => lowestWins
      ? cardValue(a.card) - cardValue(b.card)
      : cardValue(b.card) - cardValue(a.card))[0];
    return winnerResult(winner.playerIndex, trick, activeMonster.card.kind);
  }

  return resolveStandardTrick(trick, originalLeaderIndex);
}

function resolveStandardTrick(trick, originalLeaderIndex) {
  const skullKing = trick.find((play) => effectiveCardKind(play.card) === "skullKing");
  const firstMate = trick.find((play) => effectiveCardKind(play.card) === "firstMate");
  const mermaids = trick.filter((play) => effectiveCardKind(play.card) === "mermaid");
  const pirates = trick.filter((play) => effectiveCardKind(play.card) === "pirate");
  if ((skullKing || firstMate) && mermaids.length) return winnerResult(mermaids[0].playerIndex, trick, null);
  if (skullKing) return winnerResult(skullKing.playerIndex, trick, null);
  if (firstMate) return winnerResult(firstMate.playerIndex, trick, null);
  if (pirates.length) return winnerResult(pirates[0].playerIndex, trick, null);
  if (mermaids.length) return winnerResult(mermaids[0].playerIndex, trick, null);

  const numbered = trick.filter((play) => isNumbered(play.card));
  if (!numbered.length) {
    const firstEscape = trick.find((play) => isEscapeLike(play.card));
    return firstEscape
      ? winnerResult(firstEscape.playerIndex, trick, null)
      : noWinnerResult(originalLeaderIndex, "Only non-winning special cards were played, so the trick is discarded.", null);
  }

  const blackCards = numbered.filter((play) => effectiveSuit(play.card) === "black");
  const leadSuit = getSkullKingLeadSuit(trick);
  const candidates = blackCards.length
    ? blackCards
    : numbered.filter((play) => effectiveSuit(play.card) === leadSuit);
  const winner = [...(candidates.length ? candidates : numbered)].sort((a, b) => cardValue(b.card) - cardValue(a.card))[0];
  return winnerResult(winner.playerIndex, trick, null);
}

function noWinnerResult(nextLeaderIndex, reason, activeMonster) {
  return {
    winnerIndex: null,
    winningCard: null,
    nextLeaderIndex,
    bonus: 0,
    bonusAwards: [],
    doubloonPlayerIndexes: [],
    activeMonster,
    reason,
  };
}

function winnerResult(winnerIndex, trick, activeMonster) {
  const winningCard = trick.find((play) => play.playerIndex === winnerIndex && !isNonWinning(play.card))?.card
    || trick.find((play) => play.playerIndex === winnerIndex)?.card;
  const suitedBonus = trick.reduce((sum, play) => sum + (play.card.bonus || 0), 0);
  const characterBonus = activeMonster ? 0 : getCharacterBonus(winningCard, trick);
  const bonus = suitedBonus + characterBonus;
  return {
    winnerIndex,
    winningCard,
    nextLeaderIndex: winnerIndex,
    bonus,
    bonusAwards: bonus ? [{ playerIndex: winnerIndex, points: bonus }] : [],
    doubloonPlayerIndexes: activeMonster
      ? []
      : trick
        .filter((play) => play.card.kind === "doubloon" && play.playerIndex !== winnerIndex)
        .map((play) => play.playerIndex),
    activeMonster,
    reason: null,
  };
}

function getCharacterBonus(winningCard, trick) {
  const winningKind = effectiveCardKind(winningCard);
  const firstMateCount = trick.filter((play) => effectiveCardKind(play.card) === "firstMate").length;
  if (winningKind === "mermaid") {
    return (trick.some((play) => effectiveCardKind(play.card) === "skullKing") ? 40 : 0) + firstMateCount * 30;
  }
  if (winningKind === "skullKing") {
    return 30 * trick.filter((play) => effectiveCardKind(play.card) === "pirate").length + firstMateCount * 30;
  }
  if (winningKind === "pirate") {
    return 20 * trick.filter((play) => effectiveCardKind(play.card) === "mermaid").length;
  }
  return 0;
}

function drawForBendt(state) {
  const drawCount = Math.min(2, state.drawPile.length);
  const drawnCards = state.drawPile.slice(0, drawCount);
  const playerIndex = state.pendingPirateAbility.playerIndex;
  return {
    ...state,
    drawPile: state.drawPile.slice(drawCount),
    deckCount: state.deckCount - drawCount,
    players: state.players.map((player, index) => index === playerIndex
      ? { ...player, hand: sortSkullKingHand([...player.hand, ...drawnCards]) }
      : player),
    pendingPirateAbility: {
      ...state.pendingPirateAbility,
      drawnCardIds: drawnCards.map((card) => card.id),
    },
    message: `${state.players[playerIndex].name} draws ${drawCount} cards with Bendt the Bandit.`,
  };
}

export function resolveSkullKingPirateAbility(state, choice = {}, random = Math.random) {
  if (state.phase !== "pirateAbility" || !state.pendingPirateAbility) return state;
  const pending = state.pendingPirateAbility;
  let players = state.players;
  let lastTrick = state.lastTrick;
  let forcedPlay = state.forcedPlay;

  if (pending.pirateKey === "rosie") {
    const leaderIndex = Number(choice.leaderIndex);
    if (!validPlayerIndex(state, leaderIndex)) return state;
    lastTrick = { ...lastTrick, nextLeaderIndex: leaderIndex };
  }

  if (pending.pirateKey === "bendt") {
    const discardCardIds = [...new Set(choice.discardCardIds || [])];
    const discardCount = pending.drawnCardIds.length;
    const player = players[pending.playerIndex];
    if (discardCardIds.length !== discardCount || discardCardIds.some((id) => !player.hand.some((card) => card.id === id))) return state;
    players = players.map((candidate, index) => index === pending.playerIndex
      ? { ...candidate, hand: candidate.hand.filter((card) => !discardCardIds.includes(card.id)) }
      : candidate);
  }

  if (pending.pirateKey === "rascal") {
    const wager = Number(choice.wager);
    if (![0, 10, 20].includes(wager)) return state;
    players = players.map((player, index) => index === pending.playerIndex ? { ...player, wager } : player);
  }

  if (pending.pirateKey === "harry") {
    const bid = Number(choice.bid);
    if (!Number.isInteger(bid) || bid < 0 || bid > state.roundNumber) return state;
    if (Math.abs(bid - players[pending.playerIndex].bid) > 1) return state;
    players = players.map((player, index) => index === pending.playerIndex ? { ...player, bid } : player);
  }

  if (pending.pirateKey === "mary") {
    const targetPlayerIndex = Number(choice.targetPlayerIndex);
    if (!validPlayerIndex(state, targetPlayerIndex) || players[targetPlayerIndex].isGhost || !players[targetPlayerIndex].hand.length) return state;
    const hand = players[targetPlayerIndex].hand;
    const selected = hand[Math.floor(random() * hand.length)];
    forcedPlay = { playerIndex: targetPlayerIndex, cardId: selected.id, chosenByPlayerIndex: pending.playerIndex };
  }

  const base = {
    ...state,
    players,
    lastTrick,
    forcedPlay,
    phase: "collecting",
    pendingPirateAbility: null,
    message: `${pending.pirateName} uses ${pending.ability.toLowerCase()}`,
  };
  return preparePirateAbility(base, pending.remainingAbilities || []);
}

function validPlayerIndex(state, playerIndex) {
  return Number.isInteger(playerIndex) && playerIndex >= 0 && playerIndex < state.playerCount;
}

export function chooseBotPirateAbility(state, random = Math.random) {
  const pending = state.pendingPirateAbility;
  if (!pending) return {};
  const player = state.players[pending.playerIndex];
  const needsTricks = player.tricks + 1 < player.bid;

  if (pending.pirateKey === "rosie") {
    return { leaderIndex: needsTricks ? pending.playerIndex : Math.floor(random() * state.playerCount) };
  }
  if (pending.pirateKey === "bendt") {
    const ranked = [...player.hand].sort((a, b) => {
      const difference = botCardStrength(a, needsTricks) - botCardStrength(b, needsTricks);
      return needsTricks ? difference : -difference;
    });
    return { discardCardIds: ranked.slice(0, pending.drawnCardIds.length).map((card) => card.id) };
  }
  if (pending.pirateKey === "rascal") {
    const projectedTricks = player.tricks + 1;
    const distance = Math.abs(player.bid - projectedTricks);
    return { wager: distance === 0 && player.hand.length === 0 ? 20 : distance <= 1 ? 10 : 0 };
  }
  if (pending.pirateKey === "harry") {
    const projectedTricks = player.tricks + 1;
    const remainingTricks = player.hand.length;
    const target = Math.max(projectedTricks, Math.min(projectedTricks + remainingTricks, player.bid));
    const choices = [player.bid - 1, player.bid, player.bid + 1].filter((bid) => bid >= 0 && bid <= state.roundNumber);
    return { bid: [...choices].sort((a, b) => Math.abs(a - target) - Math.abs(b - target))[0] };
  }
  if (pending.pirateKey === "mary") {
    const candidates = state.players.filter((candidate) => !candidate.isGhost && candidate.hand.length);
    const target = candidates[Math.floor(random() * candidates.length)];
    return { targetPlayerIndex: target?.id ?? pending.playerIndex };
  }
  return {};
}

export function collectSkullKingTrick(state) {
  if (state.phase !== "collecting" || !state.lastTrick) return state;
  const awardTotals = (state.lastTrick.bonusAwards || []).reduce((totals, award) => ({
    ...totals,
    [award.playerIndex]: (totals[award.playerIndex] || 0) + award.points,
  }), {});
  const players = state.players.map((player, index) => ({
    ...player,
    tricks: player.tricks + (index === state.lastTrick.winnerIndex ? 1 : 0),
    roundBonus: player.roundBonus + (awardTotals[index] || 0),
  }));
  const doubloonAlliances = state.lastTrick.winnerIndex === null
    ? state.doubloonAlliances
    : [
      ...state.doubloonAlliances,
      ...(state.lastTrick.doubloonPlayerIndexes || []).map((doubloonPlayerIndex) => ({
        doubloonPlayerIndex,
        winnerIndex: state.lastTrick.winnerIndex,
      })),
    ];
  const roundFinished = players.every((player) => player.hand.length === 0);

  if (roundFinished) return finishSkullKingRound({ ...state, players, doubloonAlliances, trick: [] });

  const trickNumber = state.trickNumber + 1;
  const ghostIndex = getSkullKingGhostIndex(state);
  const requestedLeaderIndex = state.lastTrick.nextLeaderIndex;
  const previousHumanLeaderIndex = getSkullKingGhostControllerIndex(state);
  const humanLeaderIndex = requestedLeaderIndex === ghostIndex
    ? previousHumanLeaderIndex
    : requestedLeaderIndex;
  const trickOrder = ghostIndex >= 0
    ? twoPlayerTrickOrder({ ...state, players }, requestedLeaderIndex, humanLeaderIndex, trickNumber)
    : null;
  let leaderIndex = trickOrder?.[0] ?? state.lastTrick.nextLeaderIndex;
  if (!trickOrder && trickNumber === state.roundNumber && leaderIndex === state.skipFinalTrickPlayerIndex) {
    leaderIndex = nextActivePlayer(state, leaderIndex, trickNumber);
  }
  return {
    ...state,
    players,
    doubloonAlliances,
    phase: "playing",
    trick: [],
    trickNumber,
    trickOrder,
    twoPlayerHumanLeaderIndex: trickOrder?.find((playerIndex) => playerIndex !== ghostIndex) ?? null,
    currentPlayerIndex: leaderIndex,
    lastTrick: null,
    message: `${players[leaderIndex].name} leads the next trick.`,
  };
}

export function scoreSkullKingRound(player, roundNumber) {
  const exact = player.bid === player.tricks;
  const wagerPoints = exact ? (player.wager || 0) : -(player.wager || 0);
  if (player.bid === 0) return (exact ? roundNumber * 10 + player.roundBonus : roundNumber * -10) + wagerPoints;
  return (exact ? player.bid * 20 + player.roundBonus : -10 * Math.abs(player.bid - player.tricks)) + wagerPoints;
}

function finishSkullKingRound(state) {
  const exactBids = state.players.map((player) => player.bid === player.tricks);
  const doubloonBonuses = state.players.map(() => 0);
  for (const alliance of state.doubloonAlliances) {
    if (
      !state.players[alliance.doubloonPlayerIndex].isGhost
      && !state.players[alliance.winnerIndex].isGhost
      && exactBids[alliance.doubloonPlayerIndex]
      && exactBids[alliance.winnerIndex]
    ) {
      doubloonBonuses[alliance.doubloonPlayerIndex] += 20;
      doubloonBonuses[alliance.winnerIndex] += 20;
    }
  }
  const playersWithBonuses = state.players.map((player, index) => ({
    ...player,
    roundBonus: player.roundBonus + doubloonBonuses[index],
  }));
  const points = playersWithBonuses.map((player) => player.isGhost ? 0 : scoreSkullKingRound(player, state.roundNumber));
  const players = playersWithBonuses.map((player, index) => ({ ...player, score: player.score + points[index] }));
  const historyEntry = {
    roundNumber: state.roundNumber,
    points,
    bids: players.map((player) => player.bid),
    tricks: players.map((player) => player.tricks),
  };
  const gameOver = state.roundNumber === 10;
  const highScore = Math.max(...players.filter((player) => !player.isGhost).map((player) => player.score));

  return {
    ...state,
    players,
    phase: gameOver ? "gameOver" : "roundComplete",
    currentPlayerIndex: null,
    history: [...state.history, historyEntry],
    roundSummary: {
      points,
      doubloonBonuses,
      winnerIndexes: gameOver
        ? players.map((player, index) => !player.isGhost && player.score === highScore ? index : -1).filter((index) => index >= 0)
        : [],
    },
    message: gameOver ? "The voyage is complete." : `Round ${state.roundNumber} is complete.`,
  };
}

export function startNextSkullKingRound(state, random = Math.random) {
  if (state.phase !== "roundComplete" || state.roundNumber >= 10) return state;
  return dealSkullKingRound({
    ...state,
    roundNumber: state.roundNumber + 1,
    dealerIndex: nextRealPlayerIndex(state, state.dealerIndex),
  }, random);
}

function nextRealPlayerIndex(state, playerIndex) {
  let next = (playerIndex + 1) % state.playerCount;
  while (state.players[next]?.isGhost) next = (next + 1) % state.playerCount;
  return next;
}

function twoPlayerTrickOrder(state, leaderIndex, humanLeaderIndex, trickNumber) {
  const ghostIndex = getSkullKingGhostIndex(state);
  const resolvedHumanLeaderIndex = state.players[humanLeaderIndex]?.isGhost === false
    ? humanLeaderIndex
    : nextRealPlayerIndex(state, state.dealerIndex);
  const otherHumanIndex = nextRealPlayerIndex(state, resolvedHumanLeaderIndex);
  const order = leaderIndex === ghostIndex
    ? [ghostIndex, resolvedHumanLeaderIndex, otherHumanIndex]
    : [leaderIndex, ghostIndex, otherHumanIndex];
  return trickNumber === state.roundNumber && state.skipFinalTrickPlayerIndex !== null
    ? order.filter((playerIndex) => playerIndex !== state.skipFinalTrickPlayerIndex)
    : order;
}

export function chooseBotSkullKingPlay(state, playerIndex, random = Math.random) {
  const legal = getLegalSkullKingCards(state, playerIndex);
  if (!legal.length) return null;
  const player = state.players[playerIndex];
  const needsTricks = player.tricks < player.bid;
  const valued = legal.map((card) => ({ card, strength: botCardStrength(card, needsTricks) }));
  valued.sort((a, b) => needsTricks ? b.strength - a.strength : a.strength - b.strength);
  const pool = valued.slice(0, Math.min(2, valued.length));
  const chosen = pool[Math.floor(random() * pool.length)].card;
  const leadSuit = getSkullKingLeadSuit(state.trick);
  return {
    card: chosen,
    declaredValue: chosen.type === "choice" ? (needsTricks ? 14 : 0) : null,
    declaredRole: chosen.kind === "tigress" ? (needsTricks ? "pirate" : "escape") : null,
    declaredSuit: chosen.type === "wild15" && !leadSuit
      ? SKULL_KING_SUITS.slice(0, 3)[Math.floor(random() * 3)]
      : null,
  };
}

function botCardStrength(card, needsTricks) {
  if (card.kind === "skullKing") return 95;
  if (card.kind === "firstMate") return 88;
  if (card.kind === "pirate") return 80;
  if (card.kind === "tigress") return needsTricks ? 78 : 0;
  if (card.kind === "mermaid") return 70;
  if (card.kind === "kraken") return needsTricks ? -5 : 90;
  if (card.kind === "whiteWhale") return 48;
  if (card.kind === "spottedStingray") return needsTricks ? 42 : 70;
  if (isEscapeLike(card) || isNonWinning(card)) return 0;
  return cardValue(card) + (effectiveSuit(card) === "black" ? 25 : 0);
}

function isNumbered(card) {
  return card?.type === "number" || card?.type === "choice" || card?.type === "wild15";
}

function isEscapeLike(card) {
  const kind = effectiveCardKind(card);
  return kind === "escape" || kind === "doubloon";
}

function isNonWinning(card) {
  return ["walkThePlank", "lastVolley", "davyJones", "kraken", "whiteWhale", "spottedStingray"].includes(card?.kind);
}

function defersLead(card) {
  return isEscapeLike(card) || ["walkThePlank", "lastVolley", "davyJones", "spottedStingray"].includes(card?.kind);
}

function effectiveCardKind(card) {
  return card?.kind === "tigress" ? card.declaredRole : card?.kind;
}

function effectiveSuit(card) {
  return card?.type === "wild15" ? card.declaredSuit : card?.suit;
}

export function cardValue(card) {
  return card?.type === "choice" ? (card.declaredValue ?? 7) : (card?.rank ?? -1);
}

function signedPoints(points) {
  return `${points >= 0 ? "+" : ""}${points}`;
}

export function formatSkullKingCard(card) {
  if (card.type === "special") {
    if (card.kind === "pirate") return card.name || "Pirate";
    if (card.kind === "tigress" && card.declaredRole) return `Tigress as ${card.declaredRole === "pirate" ? "Pirate" : "Escape"}`;
    return SKULL_KING_SPECIALS[card.kind].label;
  }
  if (card.type === "wild15") {
    return `Wild Monkey 15${card.declaredSuit ? ` as ${SKULL_KING_SUIT_DETAILS[card.declaredSuit].label}` : ""}`;
  }
  const rank = card.type === "choice" ? (card.declaredValue ?? "0/14") : card.rank;
  return `${rank} ${SKULL_KING_SUIT_DETAILS[card.suit].label}${card.expansion && [7, 8].includes(card.rank) ? " (Expansion)" : ""}`;
}
