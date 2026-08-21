import { shuffled } from "./shuffle.js";

export const MAX_PLAYERS = 6;
export const PLAYER_COLORS = ["#b66a3c", "#3e7184", "#7b5d8e", "#667640", "#a48332", "#555f91"];

const COMPUTER_NAMES = ["Lady Rowan", "Cedric", "Mira", "The Chancellor", "Lord Ash", "Beatrix"];

export const CARD_DEFINITIONS = {
  copper: card("copper", "Copper", 0, ["treasure"], "Worth 1 coin.", { treasure: 1 }),
  silver: card("silver", "Silver", 3, ["treasure"], "Worth 2 coins.", { treasure: 2 }),
  gold: card("gold", "Gold", 6, ["treasure"], "Worth 3 coins.", { treasure: 3 }),
  estate: card("estate", "Estate", 2, ["victory"], "Worth 1 victory point.", { victory: 1 }),
  duchy: card("duchy", "Duchy", 5, ["victory"], "Worth 3 victory points.", { victory: 3 }),
  province: card("province", "Province", 8, ["victory"], "Worth 6 victory points.", { victory: 6 }),
  curse: card("curse", "Curse", 0, ["curse"], "Worth -1 victory point.", { victory: -1 }),
  cellar: card("cellar", "Cellar", 2, ["action"], "+1 Action. Discard any number of cards, then draw that many.", { actions: 1, choice: "cellar" }),
  market: card("market", "Market", 5, ["action"], "+1 Card, +1 Action, +1 Buy, +1 coin.", { cards: 1, actions: 1, buys: 1, coins: 1 }),
  merchant: card("merchant", "Merchant", 3, ["action"], "+1 Card, +1 Action. Your first Silver this turn is worth +1 coin.", { cards: 1, actions: 1, merchant: 1 }),
  militia: card("militia", "Militia", 4, ["action", "attack"], "+2 coins. Other players discard down to 3 cards; Moat blocks this.", { coins: 2, choice: "militia" }),
  mine: card("mine", "Mine", 5, ["action"], "Trash a Treasure. Gain a Treasure costing up to 3 more to your hand.", { choice: "mine" }),
  moat: card("moat", "Moat", 2, ["action", "reaction"], "+2 Cards. Reveal from your hand to block an Attack.", { cards: 2 }),
  remodel: card("remodel", "Remodel", 4, ["action"], "Trash a card. Gain a card costing up to 2 more.", { choice: "remodel" }),
  smithy: card("smithy", "Smithy", 4, ["action"], "+3 Cards.", { cards: 3 }),
  village: card("village", "Village", 3, ["action"], "+1 Card, +2 Actions.", { cards: 1, actions: 2 }),
  workshop: card("workshop", "Workshop", 3, ["action"], "Gain a card costing up to 4 coins.", { choice: "workshop" }),
};

export const BASE_CARD_IDS = ["copper", "silver", "gold", "estate", "duchy", "province", "curse"];
export const KINGDOM_CARD_IDS = ["cellar", "market", "merchant", "militia", "mine", "moat", "remodel", "smithy", "village", "workshop"];

function card(id, name, cost, types, text, effect = {}) {
  return Object.freeze({ id, name, cost, types, text, ...effect });
}

export { shuffled };

function makePlayer(player, color, isComputer = false) {
  return {
    id: player.id,
    name: String(player.name || (isComputer ? "Computer" : "Monarch")).trim().slice(0, 24) || "Monarch",
    color,
    isComputer,
    deck: [],
    hand: [],
    discard: [],
    inPlay: [],
    actions: 0,
    buys: 0,
    coins: 0,
    merchantBonus: 0,
    turnsTaken: 0,
  };
}

export function createLobby(host, roomCode, now = Date.now()) {
  const first = makePlayer(host, PLAYER_COLORS[0]);
  return {
    game: "dominion",
    roomCode: String(roomCode || "").toUpperCase(),
    hostId: first.id,
    phase: "lobby",
    turnPhase: "action",
    players: [first],
    supply: {},
    kingdom: [...KINGDOM_CARD_IDS],
    trash: [],
    currentPlayerIndex: 0,
    startingPlayerIndex: 0,
    turnNumber: 0,
    pendingChoice: null,
    winners: [],
    scores: {},
    log: [`${first.name} founded a new realm.`],
    updatedAt: now,
  };
}

export function addPlayer(game, player) {
  if (game.phase !== "lobby" || game.players.length >= MAX_PLAYERS || game.players.some((item) => item.id === player.id)) return game;
  const next = makePlayer(player, PLAYER_COLORS[game.players.length]);
  return { ...game, players: [...game.players, next], log: [`${next.name} entered the great hall.`, ...game.log] };
}

export function addComputerPlayer(game, overrides = {}) {
  if (game.phase !== "lobby" || game.players.length >= MAX_PLAYERS) return game;
  const used = new Set(game.players.map((player) => player.name));
  const name = overrides.name || COMPUTER_NAMES.find((candidate) => !used.has(candidate)) || `Computer ${game.players.length}`;
  const id = overrides.id || `bot-${Date.now()}-${game.players.length}`;
  const bot = makePlayer({ id, name }, PLAYER_COLORS[game.players.length], true);
  return { ...game, players: [...game.players, bot], log: [`${bot.name} answers the summons.`, ...game.log] };
}

export function removeComputerPlayer(game, computerId) {
  if (game.phase !== "lobby") return game;
  const computer = game.players.find((player) => player.id === computerId && player.isComputer);
  if (!computer) return game;
  const players = game.players.filter((player) => player.id !== computerId).map((player, index) => ({ ...player, color: PLAYER_COLORS[index] }));
  return { ...game, players, log: [`${computer.name} departed the realm.`, ...game.log] };
}

function initialSupply(playerCount) {
  const expanded = playerCount >= 5;
  const victoryCount = playerCount === 2 ? 8 : 12;
  const provinceCount = playerCount === 5 ? 15 : playerCount === 6 ? 18 : victoryCount;
  return {
    copper: (expanded ? 120 : 60) - playerCount * 7,
    silver: expanded ? 80 : 40,
    gold: expanded ? 60 : 30,
    estate: victoryCount,
    duchy: victoryCount,
    province: provinceCount,
    curse: (playerCount - 1) * 10,
    ...Object.fromEntries(KINGDOM_CARD_IDS.map((id) => [id, 10])),
  };
}

function drawCards(player, count, rng = Math.random) {
  let deck = [...player.deck];
  let discard = [...player.discard];
  const hand = [...player.hand];
  for (let drawn = 0; drawn < count; drawn += 1) {
    if (!deck.length && discard.length) {
      deck = shuffled(discard, rng);
      discard = [];
    }
    if (!deck.length) break;
    hand.push(deck.shift());
  }
  return { ...player, deck, discard, hand };
}

export function startGame(game, rng = Math.random) {
  if (game.phase !== "lobby" || game.players.length < 2 || game.players.length > MAX_PLAYERS) return game;
  const startingPlayerIndex = Math.floor(rng() * game.players.length);
  const players = game.players.map((player) => {
    const fresh = makePlayer(player, player.color, player.isComputer);
    const prepared = { ...fresh, deck: shuffled([...Array(7).fill("copper"), ...Array(3).fill("estate")], rng), actions: 1, buys: 1 };
    return drawCards(prepared, 5, rng);
  });
  return {
    ...game,
    phase: "playing",
    turnPhase: "action",
    players,
    supply: initialSupply(players.length),
    trash: [],
    currentPlayerIndex: startingPlayerIndex,
    startingPlayerIndex,
    turnNumber: 1,
    pendingChoice: null,
    winners: [],
    scores: {},
    log: [`The first council convenes. ${players[startingPlayerIndex].name} begins.`, ...game.log],
  };
}

export function currentPlayer(game) {
  return game.players[game.currentPlayerIndex] ?? null;
}

export function allPlayerCards(player) {
  return [...player.deck, ...player.hand, ...player.discard, ...player.inPlay];
}

export function scorePlayer(player) {
  return allPlayerCards(player).reduce((score, id) => score + Number(CARD_DEFINITIONS[id]?.victory || 0), 0);
}

export function supplyEmptyCount(game) {
  return Object.values(game.supply).filter((count) => count === 0).length;
}

export function emptyPileLimit(game) {
  return game.players.length >= 5 ? 4 : 3;
}

function updatePlayer(game, playerId, updater) {
  return { ...game, players: game.players.map((player) => player.id === playerId ? updater(player) : player) };
}

function canTakeTurnAction(game, playerId) {
  return game.phase === "playing" && currentPlayer(game)?.id === playerId && !game.pendingChoice;
}

function addLog(game, message) {
  return { ...game, log: [message, ...game.log].slice(0, 80) };
}

function applyDraw(game, playerId, count, rng) {
  return updatePlayer(game, playerId, (player) => drawCards(player, count, rng));
}

export function playAction(game, playerId, handIndex, rng = Math.random) {
  if (!canTakeTurnAction(game, playerId) || game.turnPhase !== "action") return game;
  const player = currentPlayer(game);
  const index = Number(handIndex);
  const cardId = player.hand[index];
  const definition = CARD_DEFINITIONS[cardId];
  if (!definition?.types.includes("action") || player.actions < 1) return game;

  let next = updatePlayer(game, playerId, (item) => ({
    ...item,
    hand: item.hand.filter((_, itemIndex) => itemIndex !== index),
    inPlay: [...item.inPlay, cardId],
    actions: item.actions - 1 + Number(definition.actions || 0),
    buys: item.buys + Number(definition.buys || 0),
    coins: item.coins + Number(definition.coins || 0),
    merchantBonus: item.merchantBonus + Number(definition.merchant || 0),
  }));
  if (definition.cards) next = applyDraw(next, playerId, definition.cards, rng);
  next = addLog(next, `${player.name} played ${definition.name}.`);

  if (definition.choice === "cellar") return { ...next, pendingChoice: { type: "cellar", playerId } };
  if (definition.choice === "workshop") return beginGainChoice(next, playerId, 4, "Workshop", "discard");
  if (definition.choice === "remodel") {
    const updatedPlayer = next.players.find((item) => item.id === playerId);
    return updatedPlayer.hand.length ? { ...next, pendingChoice: { type: "remodel-trash", playerId } } : next;
  }
  if (definition.choice === "mine") return { ...next, pendingChoice: { type: "mine-trash", playerId } };
  if (definition.choice === "militia") return beginMilitia(next, playerId);
  return next;
}

function beginGainChoice(game, playerId, maxCost, source, destination, optional = false) {
  const available = Object.keys(game.supply).some((id) => game.supply[id] > 0 && CARD_DEFINITIONS[id].cost <= maxCost);
  if (!available) return { ...game, pendingChoice: null };
  return { ...game, pendingChoice: { type: "gain", playerId, maxCost, source, destination, optional } };
}

function beginMilitia(game, attackerId) {
  const attackerIndex = game.players.findIndex((player) => player.id === attackerId);
  const ordered = Array.from({ length: game.players.length - 1 }, (_, offset) => game.players[(attackerIndex + offset + 1) % game.players.length]);
  const blocked = ordered.filter((player) => player.hand.includes("moat"));
  const targets = ordered.filter((player) => !player.hand.includes("moat") && player.hand.length > 3).map((player) => player.id);
  let next = game;
  if (blocked.length) next = addLog(next, `${blocked.map((player) => player.name).join(" and ")} revealed Moat and ignored Militia.`);
  if (!targets.length) return next;
  const target = next.players.find((player) => player.id === targets[0]);
  return { ...next, pendingChoice: { type: "militia-discard", playerId: target.id, attackerId, targets, targetIndex: 0, count: target.hand.length - 3 } };
}

function normalizedIndices(indices, handLength) {
  if (!Array.isArray(indices)) return [];
  return [...new Set(indices.map(Number))].filter((index) => Number.isInteger(index) && index >= 0 && index < handLength).sort((a, b) => a - b);
}

function removeHandIndices(player, indices, destination = "discard") {
  const selected = new Set(indices);
  const cards = player.hand.filter((_, index) => selected.has(index));
  return { ...player, hand: player.hand.filter((_, index) => !selected.has(index)), [destination]: [...player[destination], ...cards] };
}

function gainCard(game, playerId, cardId, destination = "discard") {
  if (!CARD_DEFINITIONS[cardId] || game.supply[cardId] <= 0) return game;
  const supply = { ...game.supply, [cardId]: game.supply[cardId] - 1 };
  return updatePlayer({ ...game, supply }, playerId, (player) => ({ ...player, [destination]: [...player[destination], cardId] }));
}

export function resolveChoice(game, playerId, payload = {}, rng = Math.random) {
  const choice = game.pendingChoice;
  if (game.phase !== "playing" || choice?.playerId !== playerId) return game;
  const player = game.players.find((item) => item.id === playerId);

  if (choice.type === "cellar") {
    const indices = normalizedIndices(payload.indices, player.hand.length);
    let next = updatePlayer(game, playerId, (item) => removeHandIndices(item, indices));
    next = applyDraw(next, playerId, indices.length, rng);
    return addLog({ ...next, pendingChoice: null }, `${player.name} cycled ${indices.length} card${indices.length === 1 ? "" : "s"} through the Cellar.`);
  }

  if (choice.type === "militia-discard") {
    const indices = normalizedIndices(payload.indices, player.hand.length);
    if (indices.length !== choice.count) return game;
    let next = updatePlayer(game, playerId, (item) => removeHandIndices(item, indices));
    next = addLog(next, `${player.name} discarded ${indices.length} card${indices.length === 1 ? "" : "s"} to Militia.`);
    const nextIndex = choice.targetIndex + 1;
    if (nextIndex >= choice.targets.length) return { ...next, pendingChoice: null };
    const target = next.players.find((item) => item.id === choice.targets[nextIndex]);
    return { ...next, pendingChoice: { ...choice, playerId: target.id, targetIndex: nextIndex, count: Math.max(0, target.hand.length - 3) } };
  }

  if (choice.type === "remodel-trash" || choice.type === "mine-trash") {
    if (payload.cancel && choice.type === "mine-trash") return { ...game, pendingChoice: null };
    const index = Number(payload.index);
    const trashedId = player.hand[index];
    if (!CARD_DEFINITIONS[trashedId]) return game;
    if (choice.type === "mine-trash" && !CARD_DEFINITIONS[trashedId].types.includes("treasure")) return game;
    let next = updatePlayer(game, playerId, (item) => ({ ...item, hand: item.hand.filter((_, itemIndex) => itemIndex !== index) }));
    next = { ...next, trash: [...next.trash, trashedId] };
    const bonus = choice.type === "mine-trash" ? 3 : 2;
    const source = choice.type === "mine-trash" ? "Mine" : "Remodel";
    const destination = choice.type === "mine-trash" ? "hand" : "discard";
    const maxCost = CARD_DEFINITIONS[trashedId].cost + bonus;
    const treasureOnly = choice.type === "mine-trash";
    const available = Object.keys(next.supply).some((id) => next.supply[id] > 0 && CARD_DEFINITIONS[id].cost <= maxCost && (!treasureOnly || CARD_DEFINITIONS[id].types.includes("treasure")));
    next = addLog(next, `${player.name} trashed ${CARD_DEFINITIONS[trashedId].name} with ${source}.`);
    return available ? { ...next, pendingChoice: { type: "gain", playerId, maxCost, source, destination, treasureOnly } } : { ...next, pendingChoice: null };
  }

  if (choice.type === "gain") {
    const cardId = String(payload.cardId || "");
    const definition = CARD_DEFINITIONS[cardId];
    if (!definition || game.supply[cardId] <= 0 || definition.cost > choice.maxCost || (choice.treasureOnly && !definition.types.includes("treasure"))) return game;
    const next = gainCard(game, playerId, cardId, choice.destination);
    return addLog({ ...next, pendingChoice: null }, `${player.name} gained ${definition.name} with ${choice.source}.`);
  }

  return game;
}

export function advanceToBuy(game, playerId) {
  if (!canTakeTurnAction(game, playerId) || game.turnPhase !== "action") return game;
  const player = currentPlayer(game);
  const treasures = player.hand.filter((id) => CARD_DEFINITIONS[id].types.includes("treasure"));
  const remainingHand = player.hand.filter((id) => !CARD_DEFINITIONS[id].types.includes("treasure"));
  const treasureCoins = treasures.reduce((total, id) => total + CARD_DEFINITIONS[id].treasure, 0);
  const merchantCoins = treasures.includes("silver") ? player.merchantBonus : 0;
  const next = updatePlayer(game, playerId, (item) => ({ ...item, hand: remainingHand, inPlay: [...item.inPlay, ...treasures], coins: item.coins + treasureCoins + merchantCoins }));
  return addLog({ ...next, turnPhase: "buy" }, `${player.name} entered the Buy phase with ${treasureCoins + merchantCoins + player.coins} coin${treasureCoins + merchantCoins + player.coins === 1 ? "" : "s"}.`);
}

export function buyCard(game, playerId, cardId) {
  if (!canTakeTurnAction(game, playerId) || game.turnPhase !== "buy") return game;
  const player = currentPlayer(game);
  const definition = CARD_DEFINITIONS[cardId];
  if (!definition || game.supply[cardId] <= 0 || player.buys < 1 || player.coins < definition.cost) return game;
  let next = gainCard(game, playerId, cardId);
  next = updatePlayer(next, playerId, (item) => ({ ...item, buys: item.buys - 1, coins: item.coins - definition.cost }));
  return addLog(next, `${player.name} bought ${definition.name} for ${definition.cost} coin${definition.cost === 1 ? "" : "s"}.`);
}

function shouldEnd(game) {
  return game.supply.province === 0 || supplyEmptyCount(game) >= emptyPileLimit(game);
}

export function endTurn(game, playerId, rng = Math.random) {
  if (!canTakeTurnAction(game, playerId)) return game;
  const player = currentPlayer(game);
  let next = updatePlayer(game, playerId, (item) => drawCards({
    ...item,
    hand: [],
    inPlay: [],
    discard: [...item.discard, ...item.hand, ...item.inPlay],
    actions: 0,
    buys: 0,
    coins: 0,
    merchantBonus: 0,
    turnsTaken: item.turnsTaken + 1,
  }, 5, rng));
  if (shouldEnd(next)) return finishGame(next);
  const nextIndex = (game.currentPlayerIndex + 1) % game.players.length;
  next = updatePlayer(next, game.players[nextIndex].id, (item) => ({ ...item, actions: 1, buys: 1, coins: 0, merchantBonus: 0 }));
  return { ...next, currentPlayerIndex: nextIndex, turnPhase: "action", turnNumber: game.turnNumber + 1 };
}

export function finishGame(game) {
  const scores = Object.fromEntries(game.players.map((player) => [player.id, scorePlayer(player)]));
  const ranked = [...game.players].sort((a, b) => scores[b.id] - scores[a.id] || a.turnsTaken - b.turnsTaken);
  const best = ranked[0];
  const winners = ranked.filter((player) => scores[player.id] === scores[best.id] && player.turnsTaken === best.turnsTaken).map((player) => player.id);
  return {
    ...game,
    phase: "finished",
    pendingChoice: null,
    scores,
    winners,
    log: [`The realm is complete. ${ranked.filter((player) => winners.includes(player.id)).map((player) => player.name).join(" and ")} ${winners.length === 1 ? "wins" : "share the victory"}!`, ...game.log],
  };
}

function cardPriority(id, game, player) {
  const score = scorePlayer(player);
  const totalCards = allPlayerCards(player).length;
  const emptying = game.supply.province <= 4 || supplyEmptyCount(game) >= emptyPileLimit(game) - 1;
  const values = { province: 100, gold: 68, duchy: emptying ? 62 : score > 12 ? 48 : 8, silver: 35, village: 32, market: 38, smithy: 34, militia: 31, merchant: 27, mine: 26, remodel: 23, workshop: 21, cellar: 18, moat: 15, estate: emptying ? 20 : 1, copper: -5, curse: -20 };
  return (values[id] ?? 0) + (id === "province" && totalCards < 12 ? -8 : 0);
}

function bestGain(game, player, maxCost, treasureOnly = false) {
  return Object.keys(game.supply)
    .filter((id) => game.supply[id] > 0 && CARD_DEFINITIONS[id].cost <= maxCost && (!treasureOnly || CARD_DEFINITIONS[id].types.includes("treasure")))
    .sort((a, b) => cardPriority(b, game, player) - cardPriority(a, game, player) || CARD_DEFINITIONS[b].cost - CARD_DEFINITIONS[a].cost)[0] || null;
}

function worstHandIndices(player, count) {
  return player.hand.map((id, index) => ({ id, index })).sort((a, b) => {
    const waste = { curse: 0, estate: 1, copper: 2, duchy: 3, province: 4 };
    return (waste[a.id] ?? 10) - (waste[b.id] ?? 10);
  }).slice(0, count).map((item) => item.index);
}

function resolveComputerChoice(game, bot, rng) {
  const choice = game.pendingChoice;
  if (choice.type === "cellar") return resolveChoice(game, bot.id, { indices: bot.hand.map((id, index) => ({ id, index })).filter((item) => ["curse", "estate"].includes(item.id)).map((item) => item.index) }, rng);
  if (choice.type === "militia-discard") return resolveChoice(game, bot.id, { indices: worstHandIndices(bot, choice.count) }, rng);
  if (choice.type === "mine-trash") {
    const index = bot.hand.findIndex((id) => id === "copper" || id === "silver");
    return resolveChoice(game, bot.id, index >= 0 ? { index } : { cancel: true }, rng);
  }
  if (choice.type === "remodel-trash") {
    const [index] = worstHandIndices(bot, 1);
    return index == null ? { ...game, pendingChoice: null } : resolveChoice(game, bot.id, { index }, rng);
  }
  if (choice.type === "gain") {
    const cardId = bestGain(game, bot, choice.maxCost, choice.treasureOnly);
    return cardId ? resolveChoice(game, bot.id, { cardId }, rng) : { ...game, pendingChoice: null };
  }
  return game;
}

export function computerPlayerToAct(game) {
  if (game.phase !== "playing") return null;
  if (game.pendingChoice) return game.players.find((player) => player.id === game.pendingChoice.playerId && player.isComputer) || null;
  const player = currentPlayer(game);
  return player?.isComputer ? player : null;
}

export function runComputerTurn(game, rng = Math.random) {
  let next = game;
  for (let guard = 0; guard < 80; guard += 1) {
    const bot = computerPlayerToAct(next);
    if (!bot) return next;
    if (next.pendingChoice) {
      next = resolveComputerChoice(next, bot, rng);
      continue;
    }
    if (next.turnPhase === "action") {
      const actionOrder = ["village", "market", "merchant", "smithy", "militia", "mine", "remodel", "workshop", "cellar", "moat"];
      const index = actionOrder.map((id) => bot.hand.indexOf(id)).find((item) => item >= 0);
      if (bot.actions > 0 && index != null) next = playAction(next, bot.id, index, rng);
      else next = advanceToBuy(next, bot.id);
      continue;
    }
    if (next.turnPhase === "buy" && bot.buys > 0) {
      const cardId = bestGain(next, bot, bot.coins);
      if (cardId && cardPriority(cardId, next, bot) > 0) {
        next = buyCard(next, bot.id, cardId);
        continue;
      }
    }
    return endTurn(next, bot.id, rng);
  }
  return next;
}
