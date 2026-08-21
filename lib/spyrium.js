import { shuffled } from "./shuffle.js";

export const PLAYER_COLORS = ["#d09a35", "#397d74", "#a54a3f", "#4d668c", "#76538e"];

export const RESIDENCE_VALUES = [2, 3, 4, 5, 7];

const COMPUTER_NAMES = ["Ada Steam", "Isambard", "Lady Lovelace", "Brunel", "Violet Watt"];

export const EVENTS = [
  { id: "windfall", name: "Industrial Windfall", description: "Take the token value in pounds, Spyrium, or victory points.", token: true },
  { id: "estate", name: "Country Estate", description: "Spend 1 Spyrium to advance on the residence track or score its current value." },
  { id: "investment", name: "Royal Investment", description: "Spend £3 for 3 VP, or £6 for 5 VP." },
  { id: "exchange", name: "Energy Exchange", description: "Trade 1 Spyrium for £3, or 3 Spyrium for £6." },
  { id: "maintenance", name: "Night Shift", description: "Spend £1 to ready one used building." },
  { id: "recruitment", name: "Recruitment Drive", description: "Pay £1 per worker you own to recruit one new worker." },
  { id: "late-shift", name: "Late Shift", description: "During activation, place an active worker in the market." },
];

const CARD_SPECS = [
  // Period A: 8 characters, 19 buildings, 3 techniques.
  character("A", "miner", "Miner", 0, "Take Spyrium equal to a numbered token.", 2, true),
  character("A", "geologist", "Geologist", 1, "Gain 2 Spyrium.", 2),
  character("A", "apprentice", "Apprentice", 0, "Spend 1 Spyrium to gain 3 VP.", 2),
  character("A", "bureaucrat", "Bureaucrat", 1, "Gain VP equal to a numbered token.", 1, true),
  character("A", "adviser", "Adviser", 2, "Gain 3 VP.", 1),
  building("A", "mine-small", "Coal-Shaft Mine", 2, ["mine"], 1, "Use 1 worker to gain 1 Spyrium.", 3, [{ workers: 1, spyrium: 0, gainSpyrium: 1 }]),
  building("A", "mine", "Spyrium Mine", 3, ["mine"], 2, "Gain 1 Spyrium, or use 1 worker to gain 2.", 2, [{ workers: 0, spyrium: 0, gainSpyrium: 1 }, { workers: 1, spyrium: 0, gainSpyrium: 2 }]),
  building("A", "workshop", "Workshop", 3, ["factory"], 2, "Use 1 worker and 1 Spyrium to gain 3 VP.", 3, [{ workers: 1, spyrium: 1, gainScore: 3 }]),
  building("A", "laboratory", "Laboratory", 4, ["factory", "research"], 3, "Use 1 worker and 1 Spyrium to gain 4 VP.", 2, [{ workers: 1, spyrium: 1, gainScore: 4 }]),
  building("A", "neighborhood", "Working-Class Neighborhood", 3, ["residence"], 1, "Immediately recruit 1 worker.", 2, [], { recruit: 1 }),
  building("A", "residence", "Residence", 3, ["residence"], 3, "Immediately use the residence track.", 2, [], { residence: true }),
  building("A", "university", "University", 4, ["research"], 2, "Use 1 worker to gain 2 VP. Its token scores when built.", 2, [{ workers: 1, spyrium: 0, gainScore: 2 }], { token: true }),
  building("A", "luxury-home", "Luxury Home", 5, ["residence"], 6, "Worth 6 VP at the end of the game.", 3, []),
  technique("A", "automation", "Automation", 5, "Mines no longer require workers. End: 1 VP per Spyrium."),
  technique("A", "capitalization", "Capitalization", 5, "Gain £2 extra when withdrawing for money. End: 1 VP per £2."),
  technique("A", "crane", "Crane", 4, "New building spaces cost £3 less. End: 1 VP per building."),

  // Period B: 6 characters, 11 buildings, 3 techniques.
  character("B", "engineer", "Engineer", 2, "Spend 1 Spyrium to gain 4 VP.", 2),
  character("B", "bureaucrat", "Bureaucrat", 1, "Gain VP equal to a numbered token.", 1, true),
  character("B", "banker", "Banker", 1, "Pay a numbered token to gain 4 VP.", 1, true),
  character("B", "architect", "Architect", 2, "Pay a numbered token to use the residence track.", 1, true),
  character("B", "adviser", "Adviser", 3, "Gain 3 VP.", 1),
  building("B", "mine-rich", "Deep Spyrium Mine", 5, ["mine"], 3, "Gain 1 Spyrium, or use 1 worker to gain 3. Its token pays Spyrium when built.", 2, [{ workers: 0, spyrium: 0, gainSpyrium: 1 }, { workers: 1, spyrium: 0, gainSpyrium: 3 }], { token: true }),
  building("B", "workshop-b", "Powered Workshop", 5, ["factory"], 3, "Use 1 worker and 2 Spyrium to gain 5 VP.", 2, [{ workers: 1, spyrium: 2, gainScore: 5 }]),
  building("B", "factory", "Factory", 6, ["factory"], 5, "Use 1 worker + 2 Spyrium for 6 VP, or 2 workers + 3 Spyrium for 10 VP.", 2, [{ workers: 1, spyrium: 2, gainScore: 6 }, { workers: 2, spyrium: 3, gainScore: 10 }]),
  building("B", "laboratory-b", "Advanced Laboratory", 6, ["factory", "research"], 4, "Use 1 worker and 1 Spyrium to gain 5 VP.", 2, [{ workers: 1, spyrium: 1, gainScore: 5 }]),
  building("B", "residence-b", "Grand Residence", 5, ["residence"], 4, "Immediately use the residence track.", 1, [], { residence: true }),
  building("B", "university-b", "Royal University", 6, ["research"], 4, "Use 1 worker for 3 VP, or 2 workers for 6 VP. Its token scores when built.", 1, [{ workers: 1, spyrium: 0, gainScore: 3 }, { workers: 2, spyrium: 0, gainScore: 6 }], { token: true }),
  building("B", "mansion", "Mansion", 7, ["residence"], 9, "Worth 9 VP at the end of the game.", 1, []),
  technique("B", "engineering", "Engineering", 6, "Factory buildings score 1 extra VP per worker used. End: VP equal to their printed value."),
  technique("B", "lobbying", "Lobbying", 6, "Once each round, ignore congestion when activating a market card. End: residence-track VP."),
  technique("B", "taylorism", "Taylorism", 6, "Once each round, ready and immediately reuse a building. End: 1 VP per worker."),

  // Period C: 3 characters, 5 buildings, 1 technique.
  character("C", "financier", "Financier", 2, "Pay a numbered token to gain 5 VP.", 1, true),
  character("C", "engineer", "Master Engineer", 3, "Spend 1 Spyrium to gain 4 VP.", 1),
  character("C", "architect", "Royal Architect", 3, "Pay a numbered token to use the residence track.", 1, true),
  building("C", "factory-c", "Grand Factory", 8, ["factory"], 7, "Use 2 workers + 3 Spyrium for 10 VP, or 2 workers + 5 Spyrium for 15 VP.", 2, [{ workers: 2, spyrium: 3, gainScore: 10 }, { workers: 2, spyrium: 5, gainScore: 15 }]),
  building("C", "laboratory-c", "Royal Laboratory", 7, ["factory", "research"], 5, "Use 1 worker and 2 Spyrium to gain 7 VP.", 1, [{ workers: 1, spyrium: 2, gainScore: 7 }]),
  building("C", "university-c", "Imperial University", 7, ["research"], 5, "Use 2 workers to gain 6 VP. Its token scores when built.", 1, [{ workers: 2, spyrium: 0, gainScore: 6 }], { token: true }),
  building("C", "palace", "Crystal Palace", 9, ["residence"], 12, "Worth 12 VP at the end of the game.", 1, []),
  technique("C", "commerce", "Commerce", 7, "Keep activated tokens. Once per round choose a token value. End: 1 VP per kept token."),
];

function character(period, slug, name, price, description, copies, token = false) {
  return { period, slug, name, type: "character", price, description, copies, token };
}

function building(period, slug, name, price, symbols, points, description, copies, actions, immediate = {}) {
  return { period, slug, name, type: "building", price, symbols, points, description, copies, actions, ...immediate };
}

function technique(period, slug, name, price, description) {
  return { period, slug, name, type: "technique", price, description, copies: 1 };
}

export { shuffled };

export function createPeriodDecks(rng = Math.random) {
  const decks = { A: [], B: [], C: [] };
  for (const spec of CARD_SPECS) {
    for (let copy = 1; copy <= spec.copies; copy += 1) {
      decks[spec.period].push({
        ...spec,
        id: `${spec.period}-${spec.slug}-${copy}`,
        art: `/spyrium/cards/${spec.period.toLowerCase()}-${spec.slug}.png`,
        tokens: [],
      });
    }
  }
  for (const period of ["A", "B", "C"]) decks[period] = shuffled(decks[period], rng);
  return decks;
}

export function marketSlots() {
  const slots = [];
  for (let row = 0; row < 3; row += 1) {
    for (let column = 0; column < 2; column += 1) slots.push({ id: `h-${row}-${column}`, cards: [row * 3 + column, row * 3 + column + 1] });
  }
  for (let row = 0; row < 2; row += 1) {
    for (let column = 0; column < 3; column += 1) slots.push({ id: `v-${row}-${column}`, cards: [row * 3 + column, (row + 1) * 3 + column] });
  }
  return slots;
}

function makePlayer(player, color, isComputer = false) {
  return {
    id: player.id,
    name: String(player.name || (isComputer ? "Automaton" : "Industrialist")).trim().slice(0, 24) || "Industrialist",
    color,
    isComputer,
    money: 8,
    spyrium: 2,
    score: 0,
    finalScore: null,
    residence: 0,
    totalWorkers: 3,
    activeWorkers: 3,
    phase: "placement",
    passed: false,
    eventUsed: false,
    buildings: [],
    techniques: [],
    keptTokens: 0,
    bonusChoices: [],
  };
}

export function createLobby(host, roomCode, now = Date.now()) {
  const first = makePlayer(host, PLAYER_COLORS[0]);
  return {
    game: "spyrium",
    roomCode: String(roomCode || "").toUpperCase(),
    hostId: first.id,
    phase: "lobby",
    round: 0,
    period: "A",
    players: [first],
    decks: { A: [], B: [], C: [] },
    market: Array(9).fill(null),
    workerSlots: Object.fromEntries(marketSlots().map((slot) => [slot.id, []])),
    events: [],
    currentEvent: null,
    futureEvent: null,
    firstPlayerIndex: 0,
    currentPlayerIndex: 0,
    pendingBonus: null,
    winners: [],
    log: [`${first.name} founded a new industrial concern.`],
    updatedAt: now,
  };
}

export function addPlayer(game, player) {
  if (game.phase !== "lobby" || game.players.length >= 5 || game.players.some((item) => item.id === player.id)) return game;
  const nextPlayer = makePlayer(player, PLAYER_COLORS[game.players.length]);
  return { ...game, players: [...game.players, nextPlayer], log: [`${nextPlayer.name} joined the consortium.`, ...game.log] };
}

export function addComputerPlayer(game, overrides = {}) {
  if (game.phase !== "lobby" || game.players.length >= 5) return game;
  const used = new Set(game.players.map((player) => player.name));
  const name = overrides.name || COMPUTER_NAMES.find((candidate) => !used.has(candidate)) || `Automaton ${game.players.length}`;
  const player = makePlayer({ id: overrides.id || `bot-${Date.now()}-${game.players.length}`, name }, PLAYER_COLORS[game.players.length], true);
  return { ...game, players: [...game.players, player], log: [`${player.name} whirred into the room.`, ...game.log] };
}

export function removeComputerPlayer(game, computerId) {
  if (game.phase !== "lobby") return game;
  const target = game.players.find((player) => player.id === computerId && player.isComputer);
  if (!target) return game;
  const players = game.players.filter((player) => player.id !== computerId).map((player, index) => ({ ...player, color: PLAYER_COLORS[index] }));
  return { ...game, players, log: [`${target.name} was dismissed.`, ...game.log] };
}

function periodForRound(round) { return round <= 3 ? "A" : round <= 5 ? "B" : "C"; }
function drawToken(game, rng = Math.random) { return 1 + Math.floor(rng() * 3); }

function prepareMarket(cards, playerCount, rng) {
  return cards.map((card) => {
    if (!card.token) return card;
    const count = card.type === "character" ? Math.max(1, playerCount - 1) : 1;
    return { ...card, tokens: Array.from({ length: count }, () => drawToken(null, rng)) };
  });
}

export function startGame(game, rng = Math.random) {
  if (game.phase !== "lobby" || game.players.length < 2 || game.players.length > 5) return game;
  const decks = createPeriodDecks(rng);
  const events = shuffled(EVENTS, rng).map((event) => ({ ...event, value: event.token ? drawToken(null, rng) : null }));
  const firstPlayerIndex = Math.floor(rng() * game.players.length);
  const market = prepareMarket(decks.A.slice(0, 9), game.players.length, rng);
  return {
    ...game,
    phase: "playing",
    round: 1,
    period: "A",
    players: game.players.map((player) => ({ ...makePlayer(player, player.color, player.isComputer), money: 10 })),
    decks: { ...decks, A: decks.A.slice(9) },
    market,
    workerSlots: Object.fromEntries(marketSlots().map((slot) => [slot.id, []])),
    events,
    currentEvent: events[0],
    futureEvent: events[1],
    firstPlayerIndex,
    currentPlayerIndex: firstPlayerIndex,
    log: [`Round 1 begins. ${game.players[firstPlayerIndex].name} has the first-player card.`, ...game.log],
  };
}

export function currentPlayer(game) { return game.players[game.currentPlayerIndex] ?? null; }
export function playerMarketWorkers(game, playerId) {
  return Object.values(game.workerSlots).flat().filter((worker) => worker.playerId === playerId).length;
}

export function adjacentCardIndexes(slotId) {
  return marketSlots().find((slot) => slot.id === slotId)?.cards ?? [];
}

function isCardOnSlotAxis(slotId, cardIndex) {
  const [, row, column] = slotId.split("-").map((value, index) => index ? Number(value) : value);
  return slotId.startsWith("h") ? Math.floor(cardIndex / 3) === row : cardIndex % 3 === column;
}

export function workerAdjacentCardIndexes(game, slotId, worker) {
  const attached = Array.isArray(worker?.cardIndexes) ? worker.cardIndexes : adjacentCardIndexes(slotId);
  return attached.filter((index) => isCardOnSlotAxis(slotId, index) && game.market[index]);
}

export function congestionForCard(game, cardIndex, excludedWorkerId = null) {
  return Object.entries(game.workerSlots).reduce((total, [slotId, workers]) => total + workers.filter((worker) => (
    worker.id !== excludedWorkerId && workerAdjacentCardIndexes(game, slotId, worker).includes(Number(cardIndex))
  )).length, 0);
}

function liveCardsAcrossEmptySpace(market, removedCardIndex, slotId) {
  const liveCards = [];
  const step = slotId.startsWith("h") ? 1 : 3;
  for (const direction of [-1, 1]) {
    let cardIndex = removedCardIndex + direction * step;
    while (cardIndex >= 0 && cardIndex < market.length && isCardOnSlotAxis(slotId, cardIndex)) {
      if (market[cardIndex]) {
        liveCards.push(cardIndex);
        break;
      }
      cardIndex += direction * step;
    }
  }
  return liveCards;
}

function reattachWorkersAfterCardRemoval(game, removedCardIndex) {
  return {
    ...game,
    workerSlots: Object.fromEntries(Object.entries(game.workerSlots).map(([slotId, workers]) => [
      slotId,
      workers.map((worker) => {
        const attached = Array.isArray(worker.cardIndexes) ? worker.cardIndexes : adjacentCardIndexes(slotId);
        if (!attached.includes(removedCardIndex)) return worker;
        const newlyAdjacent = liveCardsAcrossEmptySpace(game.market, removedCardIndex, slotId);
        return {
          ...worker,
          cardIndexes: [...new Set([...attached.filter((index) => index !== removedCardIndex && isCardOnSlotAxis(slotId, index)), ...newlyAdjacent])].sort((a, b) => a - b),
        };
      }),
    ])),
  };
}

function canAct(game, playerId) {
  return game.phase === "playing" && !game.pendingBonus && currentPlayer(game)?.id === playerId && !currentPlayer(game)?.passed;
}

function appendLog(game, message) { return { ...game, log: [message, ...game.log].slice(0, 80) }; }
function updatePlayer(game, playerId, updater) { return { ...game, players: game.players.map((player) => player.id === playerId ? updater(player) : player) }; }
function hasTechnique(player, slug) { return player.techniques.some((card) => card.slug === slug); }

function scorePoints(game, playerId, amount) {
  if (!amount) return game;
  let pendingBonus = game.pendingBonus;
  const players = game.players.map((player) => {
    if (player.id !== playerId) return player;
    const score = player.score + amount;
    if (player.bonusChoices.length === 0 && score >= 8) pendingBonus = { playerId, threshold: 8 };
    if (player.bonusChoices.length === 1 && score >= 20) {
      const other = player.bonusChoices[0] === "worker" || player.totalWorkers >= 7 ? "money" : "worker";
      return {
        ...player,
        score,
        money: player.money + (other === "money" ? 5 : 0),
        totalWorkers: player.totalWorkers + (other === "worker" ? 1 : 0),
        activeWorkers: player.activeWorkers + (other === "worker" ? 1 : 0),
        bonusChoices: [...player.bonusChoices, other],
      };
    }
    return { ...player, score };
  });
  return { ...game, players, pendingBonus };
}

function residenceAction(game, playerId, choice = "advance") {
  const player = game.players.find((item) => item.id === playerId);
  if (!player) return game;
  if (choice === "score") return scorePoints(game, playerId, RESIDENCE_VALUES[player.residence]);
  if (player.residence >= RESIDENCE_VALUES.length - 1) return scorePoints(game, playerId, RESIDENCE_VALUES[player.residence]);
  return updatePlayer(game, playerId, (item) => ({ ...item, residence: item.residence + 1 }));
}

export function chooseBonus(game, playerId, choice) {
  if (game.pendingBonus?.playerId !== playerId || !["worker", "money"].includes(choice)) return game;
  let next = updatePlayer(game, playerId, (player) => {
    if (choice === "worker" && player.totalWorkers >= 7) choice = "money";
    const updated = {
      ...player,
      money: player.money + (choice === "money" ? 5 : 0),
      totalWorkers: player.totalWorkers + (choice === "worker" ? 1 : 0),
      activeWorkers: player.activeWorkers + (choice === "worker" ? 1 : 0),
      bonusChoices: [...player.bonusChoices, choice],
    };
    if (updated.score >= 20 && updated.bonusChoices.length === 1) {
      const other = choice === "worker" || updated.totalWorkers >= 7 ? "money" : "worker";
      updated.money += other === "money" ? 5 : 0;
      updated.totalWorkers += other === "worker" ? 1 : 0;
      updated.activeWorkers += other === "worker" ? 1 : 0;
      updated.bonusChoices.push(other);
    }
    return updated;
  });
  next = { ...next, pendingBonus: null };
  next = appendLog(next, `${game.players.find((player) => player.id === playerId)?.name} claimed the ${choice === "worker" ? "extra worker" : "£5"} milestone bonus.`);
  return game.pendingBonus.advanceAfter ? nextTurn(next) : next;
}

function nextTurn(game) {
  if (game.pendingBonus) return { ...game, pendingBonus: { ...game.pendingBonus, advanceAfter: true } };
  if (game.phase !== "playing") return game;
  for (let step = 1; step <= game.players.length; step += 1) {
    const index = (game.currentPlayerIndex + step) % game.players.length;
    if (!game.players[index].passed) return { ...game, currentPlayerIndex: index };
  }
  return endRound(game);
}

export function placeWorker(game, playerId, slotId) {
  if (!canAct(game, playerId)) return game;
  const player = currentPlayer(game);
  if (player.phase !== "placement" || player.activeWorkers < 1 || !game.workerSlots[slotId]) return game;
  const adjacent = adjacentCardIndexes(slotId);
  if (!adjacent.some((index) => game.market[index])) return game;
  const worker = {
    id: `${playerId}-${game.round}-${player.totalWorkers - player.activeWorkers + 1}-${Date.now()}`,
    playerId,
    cardIndexes: adjacent,
  };
  const next = updatePlayer({ ...game, workerSlots: { ...game.workerSlots, [slotId]: [...game.workerSlots[slotId], worker] } }, playerId, (item) => ({ ...item, activeWorkers: item.activeWorkers - 1 }));
  return nextTurn(appendLog(next, `${player.name} placed a worker in the market.`));
}

export function beginActivation(game, playerId) {
  if (!canAct(game, playerId) || currentPlayer(game).phase !== "placement") return game;
  return appendLog(updatePlayer(game, playerId, (player) => ({ ...player, phase: "activation" })), `${currentPlayer(game).name} began activating their network.`);
}

function findWorker(game, playerId, workerId) {
  for (const [slotId, workers] of Object.entries(game.workerSlots)) {
    const worker = workers.find((item) => item.id === workerId && item.playerId === playerId);
    if (worker) return { slotId, worker };
  }
  return null;
}

function removeWorker(game, slotId, workerId) {
  return { ...game, workerSlots: { ...game.workerSlots, [slotId]: game.workerSlots[slotId].filter((worker) => worker.id !== workerId) } };
}

export function gainMoney(game, playerId, workerId, cardIndex) {
  if (!canAct(game, playerId) || currentPlayer(game).phase !== "activation") return game;
  const found = findWorker(game, playerId, workerId);
  // Withdrawing is validated against the worker's *slot*, not against the cards
  // still sitting next to it. workerAdjacentCardIndexes filters out bought
  // cards, so once both neighbours had been taken a worker could no longer be
  // withdrawn at all — and its owner could not pass either, because passing
  // requires an empty board. That stranded the seat permanently, for a human
  // just as much as for a computer. Taking your own worker back is always
  // legal; the money is what varies, and `base` already handles a missing card.
  if (!found || !adjacentCardIndexes(found.slotId).includes(Number(cardIndex))) return game;
  const player = currentPlayer(game);
  const card = game.market[cardIndex];
  const base = card ? congestionForCard(game, cardIndex, workerId) : 0;
  const amount = base + (hasTechnique(player, "capitalization") ? 2 : 0);
  let next = removeWorker(game, found.slotId, workerId);
  next = updatePlayer(next, playerId, (item) => ({ ...item, money: item.money + amount }));
  return nextTurn(appendLog(next, `${player.name} withdrew a worker for £${amount}.`));
}

function replacementDiscount(player, card, replacementId) {
  const old = player.buildings.find((building) => building.id === replacementId);
  if (!old) return 0;
  return old.symbols?.some((symbol) => card.symbols?.includes(symbol)) ? 3 : 0;
}

export function activationCost(game, playerId, workerId, cardIndex, options = {}) {
  const player = game.players.find((item) => item.id === playerId);
  const card = game.market[cardIndex];
  const found = findWorker(game, playerId, workerId);
  if (!player || !card || !found || !workerAdjacentCardIndexes(game, found.slotId, found.worker).includes(Number(cardIndex))) return null;
  const ignoreCongestion = Boolean(options.useLobbying && hasTechnique(player, "lobbying") && !player.techniqueUsed?.lobbying);
  const congestion = ignoreCongestion ? 0 : congestionForCard(game, cardIndex, workerId);
  let printed = card.price;
  let space = 0;
  if (card.type === "building") {
    if (options.replacementId) printed = Math.max(0, printed - replacementDiscount(player, card, options.replacementId));
    else space = Math.max(0, player.buildings.length - (hasTechnique(player, "crane") ? 3 : 0));
  }
  return { printed, congestion, space, total: printed + congestion + space };
}

function consumeToken(game, playerId, card, requestedValue) {
  if (!card.token) return { game, card, value: null };
  if (!card.tokens.length) return null;
  const player = game.players.find((item) => item.id === playerId);
  let value = Number(requestedValue);
  if (!card.tokens.includes(value)) value = Math.max(...card.tokens);
  const commerceAvailable = hasTechnique(player, "commerce") && !player.techniqueUsed?.commerce;
  if (commerceAvailable && requestedValue != null && [1, 2, 3].includes(Number(requestedValue))) value = Number(requestedValue);
  const removedIndex = card.tokens.indexOf(value);
  const actualIndex = removedIndex >= 0 ? removedIndex : 0;
  const actual = card.tokens[actualIndex];
  const nextCard = { ...card, tokens: card.tokens.filter((_, index) => index !== actualIndex) };
  let next = game;
  if (hasTechnique(player, "commerce")) {
    next = updatePlayer(next, playerId, (item) => ({
      ...item,
      keptTokens: Math.min(7, item.keptTokens + 1),
      techniqueUsed: commerceAvailable ? { ...item.techniqueUsed, commerce: true } : item.techniqueUsed,
    }));
  }
  return { game: next, card: nextCard, value: commerceAvailable ? value : actual };
}

function resolveCharacter(game, playerId, card, tokenValue, options) {
  const player = game.players.find((item) => item.id === playerId);
  if (["apprentice", "engineer"].includes(card.slug) && player.spyrium < 1) return null;
  if (["banker", "financier", "architect"].includes(card.slug) && player.money < tokenValue) return null;
  let next = game;
  if (card.slug === "miner") next = updatePlayer(next, playerId, (item) => ({ ...item, spyrium: item.spyrium + tokenValue }));
  if (card.slug === "geologist") next = updatePlayer(next, playerId, (item) => ({ ...item, spyrium: item.spyrium + 2 }));
  if (card.slug === "apprentice") { next = updatePlayer(next, playerId, (item) => ({ ...item, spyrium: item.spyrium - 1 })); next = scorePoints(next, playerId, 3); }
  if (card.slug === "engineer") { next = updatePlayer(next, playerId, (item) => ({ ...item, spyrium: item.spyrium - 1 })); next = scorePoints(next, playerId, 4); }
  if (card.slug === "bureaucrat") next = scorePoints(next, playerId, tokenValue);
  if (card.slug === "adviser") next = scorePoints(next, playerId, 3);
  if (["banker", "financier", "architect"].includes(card.slug)) next = updatePlayer(next, playerId, (item) => ({ ...item, money: item.money - tokenValue }));
  if (card.slug === "banker") next = scorePoints(next, playerId, 4);
  if (card.slug === "financier") next = scorePoints(next, playerId, 5);
  if (card.slug === "architect") next = residenceAction(next, playerId, options.residenceChoice);
  return next;
}

function constructBuilding(game, playerId, card, options) {
  const player = game.players.find((item) => item.id === playerId);
  let buildings = player.buildings;
  if (options.replacementId) {
    if (!buildings.some((building) => building.id === options.replacementId)) return null;
    buildings = buildings.filter((building) => building.id !== options.replacementId);
  }
  const built = { ...card, used: false, tokens: [] };
  let next = updatePlayer(game, playerId, (item) => ({ ...item, buildings: [...buildings, built] }));
  if (card.recruit) next = updatePlayer(next, playerId, (item) => {
    const recruit = Math.min(card.recruit, 7 - item.totalWorkers);
    return { ...item, totalWorkers: item.totalWorkers + recruit, activeWorkers: item.activeWorkers + recruit };
  });
  if (card.residence) next = residenceAction(next, playerId, options.residenceChoice);
  if (card.token) {
    const value = card.tokens[0] || 0;
    if (card.slug.startsWith("mine")) next = updatePlayer(next, playerId, (item) => ({ ...item, spyrium: item.spyrium + value }));
    if (card.slug.startsWith("university")) next = scorePoints(next, playerId, value);
  }
  return next;
}

export function activateMarketCard(game, playerId, workerId, cardIndex, options = {}) {
  if (!canAct(game, playerId) || currentPlayer(game).phase !== "activation") return game;
  const found = findWorker(game, playerId, workerId);
  const card = game.market[cardIndex];
  if (!found || !card || !workerAdjacentCardIndexes(game, found.slotId, found.worker).includes(Number(cardIndex))) return game;
  if (card.token && card.tokens.length === 0) return game;
  const cost = activationCost(game, playerId, workerId, cardIndex, options);
  const player = currentPlayer(game);
  if (!cost || player.money < cost.total) return game;
  const consumed = consumeToken(game, playerId, card, options.tokenValue);
  if (!consumed) return game;
  let next = consumed.game;
  if (card.type === "character") {
    next = resolveCharacter(next, playerId, card, consumed.value, options);
    if (!next) return game;
  }
  if (card.type === "building") {
    next = constructBuilding(next, playerId, card, options);
    if (!next) return game;
  }
  if (card.type === "technique") next = updatePlayer(next, playerId, (item) => ({ ...item, techniques: [...item.techniques, { ...card, tokens: [] }] }));
  next = updatePlayer(next, playerId, (item) => ({
    ...item,
    money: item.money - cost.total,
    techniqueUsed: options.useLobbying ? { ...item.techniqueUsed, lobbying: true } : item.techniqueUsed,
  }));
  next = removeWorker(next, found.slotId, workerId);
  const market = [...next.market];
  market[cardIndex] = card.type === "character" ? consumed.card : null;
  next = { ...next, market };
  if (!market[cardIndex]) next = reattachWorkersAfterCardRemoval(next, Number(cardIndex));
  return nextTurn(appendLog(next, `${player.name} ${card.type === "character" ? "called on" : card.type === "building" ? "built" : "patented"} ${card.name} for £${cost.total}.`));
}

export function canUseBuilding(player, building, actionIndex = 0, allowUsed = false) {
  const action = building?.actions?.[actionIndex];
  if (!action || (building.used && !allowUsed)) return false;
  const requiredWorkers = hasTechnique(player, "automation") && building.symbols?.includes("mine") ? 0 : action.workers;
  return player.activeWorkers >= requiredWorkers && player.spyrium >= action.spyrium;
}

export function useBuilding(game, playerId, buildingId, actionIndex = 0, options = {}) {
  if (!canAct(game, playerId) || currentPlayer(game).phase !== "activation") return game;
  const player = currentPlayer(game);
  const building = player.buildings.find((item) => item.id === buildingId);
  const useTaylorism = Boolean(options.useTaylorism && building?.used && hasTechnique(player, "taylorism") && !player.techniqueUsed?.taylorism);
  if (!building || !canUseBuilding(player, building, actionIndex, useTaylorism)) return game;
  const action = building.actions[actionIndex];
  const workers = hasTechnique(player, "automation") && building.symbols?.includes("mine") ? 0 : action.workers;
  let next = updatePlayer(game, playerId, (item) => ({
    ...item,
    activeWorkers: item.activeWorkers - workers,
    spyrium: item.spyrium - action.spyrium + Number(action.gainSpyrium || 0),
    buildings: item.buildings.map((entry) => entry.id === buildingId ? { ...entry, used: true } : entry),
  }));
  let score = Number(action.gainScore || 0);
  if (hasTechnique(player, "engineering") && building.symbols?.includes("factory")) score += workers;
  next = scorePoints(next, playerId, score);
  if (useTaylorism) next = updatePlayer(next, playerId, (item) => ({ ...item, techniqueUsed: { ...item.techniqueUsed, taylorism: true } }));
  return nextTurn(appendLog(next, `${player.name} ran ${building.name}${score ? ` for ${score} VP` : ""}.`));
}

export function useEvent(game, playerId, options = {}) {
  if (!canAct(game, playerId)) return game;
  const player = currentPlayer(game);
  const event = game.currentEvent;
  if (!event || player.eventUsed) return game;
  let next = game;
  if (event.id === "windfall") {
    const resource = ["money", "spyrium", "score"].includes(options.resource) ? options.resource : "money";
    if (resource === "score") next = scorePoints(next, playerId, event.value);
    else next = updatePlayer(next, playerId, (item) => ({ ...item, [resource]: item[resource] + event.value }));
  } else if (event.id === "estate") {
    if (player.spyrium < 1) return game;
    next = updatePlayer(next, playerId, (item) => ({ ...item, spyrium: item.spyrium - 1 }));
    next = residenceAction(next, playerId, options.residenceChoice);
  } else if (event.id === "investment") {
    const spend = Number(options.spend) === 6 ? 6 : 3;
    if (player.money < spend) return game;
    next = updatePlayer(next, playerId, (item) => ({ ...item, money: item.money - spend }));
    next = scorePoints(next, playerId, spend === 6 ? 5 : 3);
  } else if (event.id === "exchange") {
    const spend = Number(options.spend) === 3 ? 3 : 1;
    if (player.spyrium < spend) return game;
    next = updatePlayer(next, playerId, (item) => ({ ...item, spyrium: item.spyrium - spend, money: item.money + (spend === 3 ? 6 : 3) }));
  } else if (event.id === "maintenance") {
    const building = player.buildings.find((item) => item.id === options.buildingId && item.used);
    const actionIndex = Number(options.actionIndex || 0);
    if (!building || player.money < 1 || !canUseBuilding(player, building, actionIndex, true)) return game;
    const action = building.actions[actionIndex];
    const workers = hasTechnique(player, "automation") && building.symbols?.includes("mine") ? 0 : action.workers;
    next = updatePlayer(next, playerId, (item) => ({
      ...item,
      money: item.money - 1,
      activeWorkers: item.activeWorkers - workers,
      spyrium: item.spyrium - action.spyrium + Number(action.gainSpyrium || 0),
    }));
    let score = Number(action.gainScore || 0);
    if (hasTechnique(player, "engineering") && building.symbols?.includes("factory")) score += workers;
    next = scorePoints(next, playerId, score);
  } else if (event.id === "recruitment") {
    if (player.totalWorkers >= 7 || player.money < player.totalWorkers) return game;
    next = updatePlayer(next, playerId, (item) => ({ ...item, money: item.money - item.totalWorkers, totalWorkers: item.totalWorkers + 1, activeWorkers: item.activeWorkers + 1 }));
  } else if (event.id === "late-shift") {
    if (player.phase !== "activation" || player.activeWorkers < 1 || !game.workerSlots[options.slotId] || !adjacentCardIndexes(options.slotId).some((index) => game.market[index])) return game;
    const worker = {
      id: `${playerId}-${game.round}-late-${Date.now()}`,
      playerId,
      cardIndexes: adjacentCardIndexes(options.slotId),
    };
    next = { ...next, workerSlots: { ...next.workerSlots, [options.slotId]: [...next.workerSlots[options.slotId], worker] } };
    next = updatePlayer(next, playerId, (item) => ({ ...item, activeWorkers: item.activeWorkers - 1 }));
  }
  next = updatePlayer(next, playerId, (item) => ({ ...item, eventUsed: true }));
  return nextTurn(appendLog(next, `${player.name} used ${event.name}.`));
}

export function pass(game, playerId) {
  if (!canAct(game, playerId) || currentPlayer(game).phase !== "activation" || playerMarketWorkers(game, playerId) > 0) return game;
  const player = currentPlayer(game);
  const next = updatePlayer(game, playerId, (item) => ({ ...item, passed: true }));
  return nextTurn(appendLog(next, `${player.name} passed for the round.`));
}

function endRound(game, rng = Math.random) {
  if (game.round >= 6) return finishGame(game);
  const round = game.round + 1;
  const period = periodForRound(round);
  const cards = game.decks[period].slice(0, 9);
  const firstPlayerIndex = (game.firstPlayerIndex + 1) % game.players.length;
  return {
    ...game,
    round,
    period,
    decks: { ...game.decks, [period]: game.decks[period].slice(9) },
    market: prepareMarket(cards, game.players.length, rng),
    workerSlots: Object.fromEntries(marketSlots().map((slot) => [slot.id, []])),
    currentEvent: game.events[round - 1],
    futureEvent: game.events[round] ?? null,
    firstPlayerIndex,
    currentPlayerIndex: firstPlayerIndex,
    players: game.players.map((player) => ({ ...player, money: player.money + RESIDENCE_VALUES[player.residence], activeWorkers: player.totalWorkers, phase: "placement", passed: false, eventUsed: false, buildings: player.buildings.map((building) => ({ ...building, used: false })), techniqueUsed: {} })),
    log: [`Round ${round} begins. The market enters Period ${period}.`, ...game.log].slice(0, 80),
  };
}

export function techniqueEndScore(player, technique) {
  if (technique.slug === "automation") return Math.min(7, player.spyrium);
  if (technique.slug === "capitalization") return Math.min(7, Math.floor(player.money / 2));
  if (technique.slug === "engineering") return Math.min(7, player.buildings.filter((building) => building.symbols?.includes("factory")).reduce((sum, building) => sum + building.points, 0));
  if (technique.slug === "lobbying") return Math.min(7, RESIDENCE_VALUES[player.residence]);
  if (technique.slug === "crane") return Math.min(7, player.buildings.length);
  if (technique.slug === "taylorism") return Math.min(7, player.totalWorkers);
  if (technique.slug === "commerce") return Math.min(7, player.keptTokens);
  return 0;
}

export function projectedFinalScore(player) {
  return player.score + player.buildings.reduce((sum, building) => sum + Number(building.points || 0), 0) + player.techniques.reduce((sum, techniqueCard) => sum + techniqueEndScore(player, techniqueCard), 0);
}

function finishGame(game) {
  const players = game.players.map((player) => ({ ...player, finalScore: projectedFinalScore(player), passed: true }));
  const top = Math.max(...players.map((player) => player.finalScore));
  return { ...game, phase: "finished", players, winners: players.filter((player) => player.finalScore === top).map((player) => player.id), pendingBonus: null, log: [`The sixth round ends. ${players.filter((player) => player.finalScore === top).map((player) => player.name).join(" and ")} wins with ${top} VP.`, ...game.log] };
}

function firstOwnedWorker(game, playerId) {
  for (const workers of Object.values(game.workerSlots)) {
    const worker = workers.find((item) => item.playerId === playerId);
    if (worker) return worker;
  }
  return null;
}

/**
 * One computer action.
 *
 * This used to pick a move and return whatever the rules function gave back,
 * including the unchanged game. Affordability was judged on the activation cost
 * alone, never on whether the card's *effect* could be paid — so a bot holding
 * £14 and 0 Spyrium would choose the Engineer ("Spend 1 Spyrium to gain 4 VP"),
 * `resolveCharacter` would return falsy, `activateMarketCard` would hand back
 * the same object, and the choice being deterministic meant it did that
 * forever. The room could not recover: the bot still had workers on the board
 * so it could not pass, and it was not a human's turn, so nobody could act.
 *
 * Now every candidate is *attempted* and kept only if it actually moved the
 * game on, ending with a fallback that cannot fail — a player holding workers
 * can always withdraw one, and a player holding none can always pass.
 */
export function runComputerTurn(game, rng = Math.random) {
  const player = currentPlayer(game);
  if (game.phase !== "playing" || !player?.isComputer) return game;
  if (game.pendingBonus?.playerId === player.id) return chooseBonus(game, player.id, player.totalWorkers < 5 ? "worker" : "money");
  if (game.pendingBonus) return game;

  for (const attempt of computerAttempts(game, player, rng)) {
    const next = attempt();
    if (next && next !== game) return next;
  }
  return game;
}

/** Ordered candidate actions, best first, each a thunk so nothing runs early. */
function* computerAttempts(game, player, rng) {
  if (player.phase === "placement") {
    if (player.activeWorkers > 0 && rng() > 0.25) {
      const legal = marketSlots().filter((slot) => slot.cards.some((index) => game.market[index]));
      if (legal.length) {
        const pick = legal[Math.floor(rng() * legal.length)];
        yield () => placeWorker(game, player.id, pick.id);
      }
    }
    yield () => beginActivation(game, player.id);
    return;
  }

  const owned = ownedWorkers(game, player.id);

  // Activating a card is the productive move, so try each affordable one in
  // descending value — the first that resolves wins. Trying rather than
  // predicting is what keeps an unpayable effect from wedging the game.
  const activations = [];
  for (const { slotId, worker } of owned) {
    for (const index of workerAdjacentCardIndexes(game, slotId, worker)) {
      const card = game.market[index];
      if (!card) continue;
      if (card.token && !card.tokens.length) continue;
      const cost = activationCost(game, player.id, worker.id, index);
      if (!cost || cost.total > player.money) continue;
      activations.push({ worker, index, cost, points: card.points || 0, tokenValue: card.tokens?.[0] });
    }
  }
  activations.sort((a, b) => b.points - a.points || a.cost.total - b.cost.total);
  for (const choice of activations) {
    yield () => activateMarketCard(game, player.id, choice.worker.id, choice.index, {
      residenceChoice: "advance",
      tokenValue: choice.tokenValue,
    });
  }

  const usable = player.buildings.find((building) => building.actions?.some((_, index) => canUseBuilding(player, building, index)));
  if (usable && rng() > 0.35) {
    const index = usable.actions.findIndex((_, actionIndex) => canUseBuilding(player, usable, actionIndex));
    yield () => useBuilding(game, player.id, usable.id, index);
  }

  if (!player.eventUsed) {
    yield () => useEvent(game, player.id, {
      resource: "score",
      residenceChoice: "advance",
      spend: player.money >= 6 ? 6 : 3,
      slotId: marketSlots().find((slot) => slot.cards.some((index) => game.market[index]))?.id,
      buildingId: player.buildings.find((building) => building.used)?.id,
    });
  }

  // Guaranteed progress. Withdrawing takes the worker off the board and pays
  // the congestion money; gainMoney only requires the index be adjacent to the
  // worker's slot, which every one of these is by construction.
  for (const { slotId, worker } of owned) {
    for (const index of adjacentCardIndexes(slotId)) {
      yield () => gainMoney(game, player.id, worker.id, index);
    }
  }

  // With no workers left on the board, passing always succeeds.
  yield () => pass(game, player.id);
}

function ownedWorkers(game, playerId) {
  const owned = [];
  for (const [slotId, workers] of Object.entries(game.workerSlots)) {
    for (const worker of workers) {
      if (worker.playerId === playerId) owned.push({ slotId, worker });
    }
  }
  return owned;
}
