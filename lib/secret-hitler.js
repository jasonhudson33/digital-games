export const SECRET_HITLER_MIN_PLAYERS = 5;
export const SECRET_HITLER_MAX_PLAYERS = 10;

const ROLE_COUNTS = {
  5: { liberal: 3, fascist: 1 },
  6: { liberal: 4, fascist: 1 },
  7: { liberal: 4, fascist: 2 },
  8: { liberal: 5, fascist: 2 },
  9: { liberal: 5, fascist: 3 },
  10: { liberal: 6, fascist: 3 },
};

export function shuffleSecretHitler(items, random = Math.random) {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const target = Math.floor(random() * (index + 1));
    [result[index], result[target]] = [result[target], result[index]];
  }
  return result;
}

export function createSecretHitlerGame({ playerSeeds, random = Math.random }) {
  if (!Array.isArray(playerSeeds) || playerSeeds.length < SECRET_HITLER_MIN_PLAYERS || playerSeeds.length > SECRET_HITLER_MAX_PLAYERS) {
    throw new Error("Secret Hitler needs 5–10 players.");
  }
  const counts = ROLE_COUNTS[playerSeeds.length];
  const roles = shuffleSecretHitler([
    "hitler",
    ...Array(counts.fascist).fill("fascist"),
    ...Array(counts.liberal).fill("liberal"),
  ], random);
  const deck = shuffleSecretHitler([
    ...Array(6).fill("liberal"),
    ...Array(11).fill("fascist"),
  ], random);
  const players = playerSeeds.map((seed, index) => ({
    playerId: seed.playerId ?? String(index),
    name: String(seed.name || `Player ${index + 1}`),
    isComputer: Boolean(seed.isComputer),
    role: roles[index],
    party: roles[index] === "liberal" ? "liberal" : "fascist",
    alive: true,
    roleAcknowledged: Boolean(seed.isComputer),
  }));
  const startingPresidentIndex = Math.floor(random() * players.length);

  return {
    players,
    phase: players.every((player) => player.roleAcknowledged) ? "nomination" : "role_reveal",
    presidentIndex: startingPresidentIndex,
    nominatedIndex: null,
    lastPresidentIndex: null,
    lastChancellorIndex: null,
    votes: {},
    electionTracker: 0,
    liberalPolicies: 0,
    fascistPolicies: 0,
    policyDeck: deck,
    discardPile: [],
    legislativeHand: [],
    executiveAction: null,
    vetoRequested: false,
    specialElectionReturnIndex: null,
    winner: null,
    winReason: null,
    turnNumber: 1,
    message: "Secret roles have been assigned. Acknowledge your role when you are ready.",
    history: ["The table is seated and secret roles have been dealt."],
  };
}

export function acknowledgeSecretRole(state, playerIndex) {
  if (state.phase !== "role_reveal" || !state.players[playerIndex] || state.players[playerIndex].roleAcknowledged) return state;
  const players = state.players.map((player, index) => index === playerIndex ? { ...player, roleAcknowledged: true } : player);
  const ready = players.every((player) => player.roleAcknowledged);
  return {
    ...state,
    players,
    phase: ready ? "nomination" : state.phase,
    message: ready
      ? `${players[state.presidentIndex].name} is the first Presidential Candidate.`
      : "Waiting for every player to acknowledge their secret role.",
  };
}

export function eligibleChancellorIndices(state) {
  if (state.phase !== "nomination") return [];
  return state.players.flatMap((player, index) => {
    if (!player.alive || index === state.presidentIndex) return [];
    if (index === state.lastChancellorIndex) return [];
    if (state.players.filter((candidate) => candidate.alive).length > 5 && index === state.lastPresidentIndex) return [];
    return [index];
  });
}

export function nominateSecretHitlerChancellor(state, presidentIndex, nomineeIndex) {
  if (state.phase !== "nomination" || state.presidentIndex !== presidentIndex || !eligibleChancellorIndices(state).includes(nomineeIndex)) return state;
  return {
    ...state,
    phase: "election",
    nominatedIndex: nomineeIndex,
    votes: {},
    message: `${state.players[presidentIndex].name} nominated ${state.players[nomineeIndex].name} for Chancellor. Cast your ballots.`,
    history: appendHistory(state, `${state.players[presidentIndex].name} nominated ${state.players[nomineeIndex].name}.`),
  };
}

export function castSecretHitlerVote(state, playerIndex, vote, random = Math.random) {
  if (state.phase !== "election" || !state.players[playerIndex]?.alive || state.votes[playerIndex] || !["ja", "nein"].includes(vote)) return state;
  const votes = { ...state.votes, [playerIndex]: vote };
  const living = state.players.flatMap((player, index) => player.alive ? [index] : []);
  if (!living.every((index) => votes[index])) {
    return { ...state, votes, message: `Ballots cast: ${Object.keys(votes).length} of ${living.length}.` };
  }

  const ja = living.filter((index) => votes[index] === "ja").length;
  const nein = living.length - ja;
  const voteLine = `Election result: ${ja} Ja, ${nein} Nein.`;
  if (ja <= nein) {
    return failElection({ ...state, votes }, voteLine, random);
  }

  const chancellor = state.players[state.nominatedIndex];
  if (state.fascistPolicies >= 3 && chancellor.role === "hitler") {
    return finishGame(
      { ...state, votes },
      "fascist",
      "Hitler was elected Chancellor after three Fascist policies.",
      voteLine,
    );
  }

  const prepared = ensurePolicyCards(state, 3, random);
  return {
    ...prepared,
    votes,
    phase: "president_discard",
    electionTracker: 0,
    lastPresidentIndex: state.presidentIndex,
    lastChancellorIndex: state.nominatedIndex,
    legislativeHand: prepared.policyDeck.slice(0, 3),
    policyDeck: prepared.policyDeck.slice(3),
    message: `${voteLine} The government was elected. The President is reviewing three policies.`,
    history: appendHistory(state, `${voteLine} The government was elected.`),
  };
}

export function presidentDiscardsPolicy(state, playerIndex, cardIndex) {
  if (state.phase !== "president_discard" || state.presidentIndex !== playerIndex || ![0, 1, 2].includes(cardIndex)) return state;
  const discarded = state.legislativeHand[cardIndex];
  const hand = state.legislativeHand.filter((_, index) => index !== cardIndex);
  return {
    ...state,
    phase: "chancellor_discard",
    legislativeHand: hand,
    discardPile: [...state.discardPile, discarded],
    message: `${state.players[state.nominatedIndex].name} is reviewing the two remaining policies.`,
  };
}

export function chancellorDiscardsPolicy(state, playerIndex, cardIndex, random = Math.random) {
  if (state.phase !== "chancellor_discard" || state.nominatedIndex !== playerIndex || ![0, 1].includes(cardIndex)) return state;
  const discarded = state.legislativeHand[cardIndex];
  const enacted = state.legislativeHand[cardIndex === 0 ? 1 : 0];
  return enactPolicy({
    ...state,
    legislativeHand: [],
    discardPile: [...state.discardPile, discarded],
    vetoRequested: false,
  }, enacted, false, random);
}

export function requestSecretHitlerVeto(state, playerIndex) {
  if (state.phase !== "chancellor_discard" || state.nominatedIndex !== playerIndex || state.fascistPolicies < 5 || state.vetoRequested) return state;
  return { ...state, vetoRequested: true, message: `${state.players[playerIndex].name} requested a veto. The President must decide.` };
}

export function answerSecretHitlerVeto(state, playerIndex, accept, random = Math.random) {
  if (state.phase !== "chancellor_discard" || state.presidentIndex !== playerIndex || !state.vetoRequested) return state;
  if (!accept) return { ...state, vetoRequested: false, message: "The President rejected the veto. The Chancellor must enact a policy." };
  const discarded = [...state.discardPile, ...state.legislativeHand];
  const tracker = state.electionTracker + 1;
  const base = { ...state, discardPile: discarded, legislativeHand: [], vetoRequested: false, electionTracker: tracker };
  if (tracker >= 3) return enactChaosPolicy(base, "The government vetoed both policies. The election tracker reached three.", random);
  return advancePresidency(base, `The government vetoed both policies. Election tracker: ${tracker}/3.`);
}

export function resolveSecretHitlerPower(state, playerIndex, targetIndex) {
  if (state.phase !== "executive_action" || state.presidentIndex !== playerIndex || !state.executiveAction) return state;
  const action = state.executiveAction;
  if (action.result) return state;
  const target = state.players[targetIndex];
  if (!target?.alive || targetIndex === playerIndex) return state;

  if (action.type === "investigate") {
    return {
      ...state,
      executiveAction: { ...action, targetIndex, result: target.party },
      message: `${state.players[playerIndex].name} completed a party membership investigation.`,
    };
  }
  if (action.type === "special-election") {
    return beginSpecialElection(state, targetIndex);
  }
  if (action.type === "execution") {
    const players = state.players.map((player, index) => index === targetIndex ? { ...player, alive: false } : player);
    if (target.role === "hitler") {
      return finishGame({ ...state, players }, "liberal", "Hitler was executed.", `${target.name} was executed.`);
    }
    return advancePresidency(
      { ...state, players, executiveAction: null },
      `${target.name} was executed. They were not Hitler.`,
    );
  }
  return state;
}

export function finishSecretHitlerPower(state, playerIndex) {
  if (state.phase !== "executive_action" || state.presidentIndex !== playerIndex || !state.executiveAction?.result) return state;
  if (!["investigate", "policy-peek"].includes(state.executiveAction.type)) return state;
  return advancePresidency({ ...state, executiveAction: null }, "The Presidential power is complete.");
}

export function getSecretHitlerPower(playerCount, fascistPolicies) {
  if (fascistPolicies < 1 || fascistPolicies > 5) return null;
  if (fascistPolicies === 5) return "execution";
  if (playerCount <= 6) return { 3: "policy-peek", 4: "execution" }[fascistPolicies] || null;
  if (playerCount <= 8) return { 2: "investigate", 3: "special-election", 4: "execution" }[fascistPolicies] || null;
  return { 1: "investigate", 2: "investigate", 3: "special-election", 4: "execution" }[fascistPolicies] || null;
}

export function chooseSecretHitlerBotAction(state, playerIndex, random = Math.random) {
  const player = state.players[playerIndex];
  if (!player?.isComputer || !player.alive) return null;
  if (state.phase === "nomination" && state.presidentIndex === playerIndex) {
    const options = eligibleChancellorIndices(state);
    return options.length ? { type: "nominate", targetIndex: options[Math.floor(random() * options.length)] } : null;
  }
  if (state.phase === "election" && !state.votes[playerIndex]) {
    const nominee = state.players[state.nominatedIndex];
    const allied = player.party === "fascist" && nominee.party === "fascist";
    return { type: "vote", vote: allied || random() > 0.32 ? "ja" : "nein" };
  }
  if (state.phase === "president_discard" && state.presidentIndex === playerIndex) {
    return { type: "discard-president", cardIndex: botDiscardIndex(state.legislativeHand, player.party, random) };
  }
  if (state.phase === "chancellor_discard" && state.nominatedIndex === playerIndex && !state.vetoRequested) {
    return { type: "discard-chancellor", cardIndex: botDiscardIndex(state.legislativeHand, player.party, random) };
  }
  if (state.phase === "chancellor_discard" && state.vetoRequested && state.presidentIndex === playerIndex) {
    return { type: "answer-veto", accept: random() > 0.45 };
  }
  if (state.phase === "executive_action" && state.presidentIndex === playerIndex) {
    if (state.executiveAction.result) return { type: "finish-power" };
    const options = state.players.flatMap((candidate, index) => candidate.alive && index !== playerIndex ? [index] : []);
    return options.length ? { type: "power", targetIndex: options[Math.floor(random() * options.length)] } : null;
  }
  return null;
}

function botDiscardIndex(hand, party, random) {
  const preferredDiscard = party === "fascist" ? "liberal" : "fascist";
  const options = hand.flatMap((policy, index) => policy === preferredDiscard ? [index] : []);
  return options.length ? options[Math.floor(random() * options.length)] : Math.floor(random() * hand.length);
}

function failElection(state, voteLine, random) {
  const tracker = state.electionTracker + 1;
  const next = { ...state, electionTracker: tracker };
  if (tracker >= 3) return enactChaosPolicy(next, `${voteLine} Three governments have failed.`, random);
  return advancePresidency(next, `${voteLine} The government failed. Election tracker: ${tracker}/3.`);
}

function enactChaosPolicy(state, lead, random) {
  const prepared = ensurePolicyCards(state, 1, random);
  const policy = prepared.policyDeck[0];
  return enactPolicy({
    ...prepared,
    policyDeck: prepared.policyDeck.slice(1),
    electionTracker: 0,
    lastPresidentIndex: null,
    lastChancellorIndex: null,
    nominatedIndex: null,
    votes: {},
  }, policy, true, random, lead);
}

function enactPolicy(state, policy, chaos, random, lead = "") {
  const liberalPolicies = state.liberalPolicies + (policy === "liberal" ? 1 : 0);
  const fascistPolicies = state.fascistPolicies + (policy === "fascist" ? 1 : 0);
  const line = `${lead ? `${lead} ` : ""}A ${policy === "liberal" ? "Liberal" : "Fascist"} policy was enacted.`;
  const next = {
    ...state,
    liberalPolicies,
    fascistPolicies,
    message: line,
    history: appendHistory(state, line),
  };
  if (liberalPolicies >= 5) return finishGame(next, "liberal", "Five Liberal policies were enacted.");
  if (fascistPolicies >= 6) return finishGame(next, "fascist", "Six Fascist policies were enacted.");

  if (!chaos && policy === "fascist") {
    const power = getSecretHitlerPower(state.players.length, fascistPolicies);
    if (power) {
      const powerReadyState = power === "policy-peek" ? ensurePolicyCards(next, 3, random) : next;
      const executiveAction = power === "policy-peek"
        ? { type: power, result: powerReadyState.policyDeck.slice(0, 3) }
        : { type: power, result: null };
      return {
        ...powerReadyState,
        phase: "executive_action",
        executiveAction,
        message: executivePowerMessage(power, state.players[state.presidentIndex].name),
      };
    }
  }
  return advancePresidency(next, line);
}

function beginSpecialElection(state, targetIndex) {
  const regularReturn = nextAliveIndex(state.players, state.presidentIndex);
  return {
    ...state,
    phase: "nomination",
    presidentIndex: targetIndex,
    nominatedIndex: null,
    votes: {},
    executiveAction: null,
    specialElectionReturnIndex: regularReturn,
    turnNumber: state.turnNumber + 1,
    message: `${state.players[targetIndex].name} is the Presidential Candidate in a special election.`,
    history: appendHistory(state, `${state.players[state.presidentIndex].name} called a special election for ${state.players[targetIndex].name}.`),
  };
}

function advancePresidency(state, message) {
  const currentPresident = state.presidentIndex;
  const nextPresident = state.specialElectionReturnIndex ?? nextAliveIndex(state.players, currentPresident);
  return {
    ...state,
    phase: "nomination",
    presidentIndex: nextPresident,
    nominatedIndex: null,
    lastPresidentIndex: state.lastPresidentIndex,
    lastChancellorIndex: state.lastChancellorIndex,
    votes: {},
    legislativeHand: [],
    vetoRequested: false,
    executiveAction: null,
    specialElectionReturnIndex: null,
    turnNumber: state.turnNumber + 1,
    message: `${message} ${state.players[nextPresident].name} is the next Presidential Candidate.`,
  };
}

function nextAliveIndex(players, fromIndex) {
  for (let offset = 1; offset <= players.length; offset += 1) {
    const index = (fromIndex + offset) % players.length;
    if (players[index].alive) return index;
  }
  return fromIndex;
}

function ensurePolicyCards(state, count, random) {
  if (state.policyDeck.length >= count) return state;
  return { ...state, policyDeck: shuffleSecretHitler([...state.policyDeck, ...state.discardPile], random), discardPile: [] };
}

function executivePowerMessage(power, presidentName) {
  return {
    "policy-peek": `${presidentName} may secretly inspect the next three policies.`,
    investigate: `${presidentName} must investigate a player's party membership.`,
    "special-election": `${presidentName} must choose the next Presidential Candidate.`,
    execution: `${presidentName} must execute a player.`,
  }[power];
}

function finishGame(state, winner, reason, publicLine = "") {
  const line = publicLine ? `${publicLine} ${reason}` : reason;
  return {
    ...state,
    phase: "game_over",
    winner,
    winReason: reason,
    message: line,
    history: appendHistory(state, `${winner === "liberal" ? "Liberals" : "Fascists"} win — ${reason}`),
  };
}

function appendHistory(state, line) {
  return [line, ...(state.history || [])].slice(0, 16);
}
