export const MIN_PLAYERS = 4;
export const MAX_PLAYERS = 7;

export const ROLE_LABELS = {
  sheriff: "Sheriff",
  deputy: "Deputy",
  outlaw: "Outlaw",
  renegade: "Renegade",
};

export const ROLE_DISTRIBUTIONS = {
  4: ["sheriff", "renegade", "outlaw", "outlaw"],
  5: ["sheriff", "renegade", "deputy", "outlaw", "outlaw"],
  6: ["sheriff", "renegade", "deputy", "outlaw", "outlaw", "outlaw"],
  7: ["sheriff", "renegade", "deputy", "deputy", "outlaw", "outlaw", "outlaw"],
};

export const CHARACTERS = [
  { id: "bart", name: "Bart Cassidy", lives: 4, ability: "Draw a card whenever you lose a bullet." },
  { id: "black-jack", name: "Black Jack", lives: 4, ability: "Reveal the second drawn card; if red, draw a third." },
  { id: "calamity", name: "Calamity Janet", lives: 4, ability: "Play BANG! as Missed! and Missed! as BANG!." },
  { id: "el-gringo", name: "El Gringo", lives: 3, ability: "When hit by a player, take a random card from their hand." },
  { id: "jesse", name: "Jesse Jones", lives: 4, ability: "Take the first draw from another player's hand when possible." },
  { id: "jourdonnais", name: "Jourdonnais", lives: 4, ability: "Has a permanent Barrel." },
  { id: "kit", name: "Kit Carlson", lives: 4, ability: "Look at three cards, keep two, and return one to the deck." },
  { id: "lucky", name: "Lucky Duke", lives: 4, ability: "Draw two cards for every draw! check and choose the result." },
  { id: "paul", name: "Paul Regret", lives: 3, ability: "Other players see him at +1 distance." },
  { id: "pedro", name: "Pedro Ramirez", lives: 4, ability: "May take his first draw from the discard pile." },
  { id: "rose", name: "Rose Doolan", lives: 4, ability: "Sees every other player at -1 distance." },
  { id: "sid", name: "Sid Ketchum", lives: 4, ability: "Discard any two cards to regain one bullet." },
  { id: "slab", name: "Slab the Killer", lives: 4, ability: "Targets need two Missed! cards against his BANG!." },
  { id: "suzy", name: "Suzy Lafayette", lives: 4, ability: "Draw a card whenever her hand becomes empty." },
  { id: "vulture", name: "Vulture Sam", lives: 4, ability: "Take every card from an eliminated player." },
  { id: "willy", name: "Willy the Kid", lives: 4, ability: "May play any number of BANG! cards each turn." },
];

const CARD_COUNTS = {
  "BANG!": 25,
  "Missed!": 12,
  Beer: 6,
  "Cat Balou": 4,
  Panic: 4,
  Duel: 3,
  Gatling: 1,
  Indians: 2,
  Saloon: 1,
  Stagecoach: 2,
  "Wells Fargo": 1,
  "General Store": 2,
  Barrel: 2,
  Dynamite: 1,
  Jail: 3,
  Mustang: 2,
  Scope: 1,
  Volcanic: 2,
  Schofield: 3,
  Remington: 1,
  "Rev. Carabine": 1,
  Winchester: 1,
};

export const CARD_RULES = {
  "BANG!": "Shoot one player in range. Normally, play only one per turn.",
  "Missed!": "Cancel one required hit from a BANG! or Gatling.",
  Beer: "Regain one bullet. It cannot save you when only two players remain.",
  "Cat Balou": "Discard one card belonging to any other player.",
  Panic: "Take one card from a player at distance 1.",
  Duel: "Trade BANG! cards with a target until one player fails and loses a bullet.",
  Gatling: "Every other player must play Missed! or lose a bullet.",
  Indians: "Every other player must play BANG! or lose a bullet.",
  Saloon: "Every living player regains one bullet.",
  Stagecoach: "Draw two cards.",
  "Wells Fargo": "Draw three cards.",
  "General Store": "Reveal one card per player; take turns choosing one.",
  Barrel: "Draw! before a BANG!; a Heart counts as Missed!.",
  Dynamite: "At turn start, draw! Spades 2–9 explode for three bullets; otherwise pass it left.",
  Jail: "At turn start, draw! A Heart frees you; otherwise skip your turn. The Sheriff cannot be jailed.",
  Mustang: "Other players see you at +1 distance.",
  Scope: "You see other players at -1 distance.",
  Volcanic: "Range 1. Play unlimited BANG! cards.",
  Schofield: "Weapon range 2.",
  Remington: "Weapon range 3.",
  "Rev. Carabine": "Weapon range 4.",
  Winchester: "Weapon range 5.",
};

const BLUE_CARDS = new Set(["Barrel", "Dynamite", "Jail", "Mustang", "Scope", "Volcanic", "Schofield", "Remington", "Rev. Carabine", "Winchester"]);
const WEAPONS = { Volcanic: 1, Schofield: 2, Remington: 3, "Rev. Carabine": 4, Winchester: 5 };
const TARGETED_CARDS = new Set(["BANG!", "Panic", "Cat Balou", "Duel", "Jail"]);
const SUITS = ["hearts", "clubs", "diamonds", "spades"];
const RANKS = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];

export function shuffled(items, rng = Math.random) {
  const next = [...items];
  for (let index = next.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(rng() * (index + 1));
    [next[index], next[swap]] = [next[swap], next[index]];
  }
  return next;
}

export function createDeck(rng = Math.random) {
  let index = 0;
  const cards = Object.entries(CARD_COUNTS).flatMap(([name, count]) =>
    Array.from({ length: count }, (_, copy) => {
      const card = {
        id: `card-${index}-${copy}`,
        name,
        suit: SUITS[index % SUITS.length],
        rank: RANKS[index % RANKS.length],
        color: BLUE_CARDS.has(name) ? "blue" : "brown",
      };
      index += 1;
      return card;
    }),
  );
  return shuffled(cards, rng);
}

export function createLobby(host, roomCode, now = Date.now()) {
  return {
    roomCode,
    hostId: host.id,
    phase: "lobby",
    players: [createPlayer(host)],
    createdAt: now,
    updatedAt: now,
    log: [`${safeName(host.name)} opened the saloon.`],
  };
}

function createPlayer(player, isComputer = false) {
  return {
    id: player.id,
    name: safeName(player.name),
    isComputer,
    role: null,
    character: null,
    maxLives: 0,
    lives: 0,
    alive: true,
    hand: [],
    table: [],
    bangPlayed: 0,
  };
}

function safeName(name) {
  return String(name || "Player").trim().slice(0, 20) || "Player";
}

export function addPlayer(game, player) {
  if (game.phase !== "lobby" || game.players.length >= MAX_PLAYERS || game.players.some((item) => item.id === player.id)) return game;
  const next = createPlayer(player);
  return { ...game, players: [...game.players, next], log: [`${next.name} joined the saloon.`, ...game.log].slice(0, 60) };
}

export function addComputerPlayer(game, options = {}) {
  if (game.phase !== "lobby" || game.players.length >= MAX_PLAYERS) return game;
  let number = 1;
  while (game.players.some((player) => player.name === `Bot ${number}`)) number += 1;
  const computer = createPlayer({
    id: options.id ?? `bang-bot-${Date.now()}-${number}`,
    name: options.name ?? `Bot ${number}`,
  }, true);
  return { ...game, players: [...game.players, computer], log: [`${computer.name} swaggered in.`, ...game.log].slice(0, 60) };
}

export function removeComputerPlayer(game, playerId) {
  if (game.phase !== "lobby") return game;
  const player = game.players.find((item) => item.id === playerId && item.isComputer);
  if (!player) return game;
  return { ...game, players: game.players.filter((item) => item.id !== playerId), log: [`${player.name} left the saloon.`, ...game.log].slice(0, 60) };
}

export function startGame(lobby, rng = Math.random) {
  if (lobby.players.length < MIN_PLAYERS || lobby.players.length > MAX_PLAYERS) throw new Error("BANG! supports 4–7 players.");
  const shuffledRoles = shuffled(ROLE_DISTRIBUTIONS[lobby.players.length].filter((role) => role !== "sheriff"), rng);
  const sheriffSeat = Math.floor(rng() * lobby.players.length);
  const roles = lobby.players.map((_, index) => index === sheriffSeat ? "sheriff" : shuffledRoles.shift());
  const characters = shuffled(CHARACTERS, rng).slice(0, lobby.players.length);
  let deck = createDeck(rng);
  const players = lobby.players.map((player, index) => {
    const character = characters[index];
    const maxLives = character.lives + (roles[index] === "sheriff" ? 1 : 0);
    const hand = deck.slice(0, maxLives);
    deck = deck.slice(maxLives);
    return { ...player, role: roles[index], character, maxLives, lives: maxLives, alive: true, hand, table: [], bangPlayed: 0 };
  });
  const game = {
    ...lobby,
    phase: "playing",
    players,
    deck,
    discard: [],
    turnIndex: sheriffSeat,
    turnPhase: "action",
    pending: null,
    winner: null,
    turnNumber: 1,
    log: [`${players[sheriffSeat].name} is the Sheriff and takes the first turn.`, ...lobby.log].slice(0, 60),
  };
  return drawTurnCards(game, sheriffSeat, rng);
}

export function currentPlayer(game) {
  return game.players[game.turnIndex] ?? null;
}

export function livingPlayers(game) {
  return game.players.filter((player) => player.alive);
}

export function cardSuitSymbol(card) {
  return { hearts: "♥", diamonds: "♦", clubs: "♣", spades: "♠" }[card.suit] ?? "";
}

export function weaponRange(player) {
  const weapon = player.table.find((card) => WEAPONS[card.name]);
  return weapon ? WEAPONS[weapon.name] : 1;
}

export function distanceBetween(game, fromId, toId) {
  const alive = livingPlayers(game);
  const from = alive.findIndex((player) => player.id === fromId);
  const to = alive.findIndex((player) => player.id === toId);
  if (from < 0 || to < 0 || from === to) return 0;
  const clockwise = (to - from + alive.length) % alive.length;
  let distance = Math.min(clockwise, alive.length - clockwise);
  const attacker = alive[from];
  const target = alive[to];
  if (attacker.character?.id === "rose" || hasTableCard(attacker, "Scope")) distance -= 1;
  if (target.character?.id === "paul" || hasTableCard(target, "Mustang")) distance += 1;
  return Math.max(1, distance);
}

export function legalTargets(game, playerId, card) {
  const player = game.players.find((item) => item.id === playerId);
  if (!player || !player.alive) return [];
  const others = livingPlayers(game).filter((item) => item.id !== playerId);
  if (card.name === "BANG!" || (card.name === "Missed!" && player.character?.id === "calamity")) {
    return others.filter((target) => distanceBetween(game, playerId, target.id) <= weaponRange(player));
  }
  if (card.name === "Panic") return others.filter((target) => distanceBetween(game, playerId, target.id) <= 1 && target.hand.length + target.table.length > 0);
  if (card.name === "Cat Balou") return others.filter((target) => target.hand.length + target.table.length > 0);
  if (card.name === "Duel") return others;
  if (card.name === "Jail") return others.filter((target) => target.role !== "sheriff" && !hasTableCard(target, "Jail"));
  return [];
}

export function canPlayCard(game, playerId, card, targetId = null) {
  const player = game.players.find((item) => item.id === playerId);
  if (game.phase !== "playing" || game.pending || game.turnPhase !== "action" || currentPlayer(game)?.id !== playerId || !player?.alive) return false;
  const targets = legalTargets(game, playerId, card);
  const bangLike = card.name === "BANG!" || (card.name === "Missed!" && player.character?.id === "calamity");
  if ((TARGETED_CARDS.has(card.name) || bangLike) && !targets.some((target) => target.id === targetId)) return false;
  if (["BANG!", "Missed!"].includes(card.name) && (card.name === "BANG!" || player.character?.id === "calamity")) {
    if (player.bangPlayed >= 1 && player.character?.id !== "willy" && !hasTableCard(player, "Volcanic")) return false;
  }
  if (card.name === "Beer" && (player.lives >= player.maxLives || livingPlayers(game).length <= 2)) return false;
  if (BLUE_CARDS.has(card.name)) {
    const target = card.name === "Jail" ? game.players.find((item) => item.id === targetId) : player;
    if (!target) return false;
    if (WEAPONS[card.name]) return true;
    if (target.table.some((laid) => laid.name === card.name)) return false;
  }
  if (["Missed!"].includes(card.name) && player.character?.id !== "calamity") return false;
  return true;
}

export function playCard(game, playerId, cardId, options = {}, rng = Math.random) {
  const player = game.players.find((item) => item.id === playerId);
  const card = player?.hand.find((item) => item.id === cardId);
  if (!card || !canPlayCard(game, playerId, card, options.targetId)) return game;
  let next = refillSuzy(removeHandCard(game, playerId, cardId), playerId, rng);
  const acting = next.players.find((item) => item.id === playerId);
  const target = next.players.find((item) => item.id === options.targetId);
  const bangLike = card.name === "BANG!" || (card.name === "Missed!" && acting.character?.id === "calamity");

  if (bangLike) {
    next = updatePlayer(next, playerId, (item) => ({ ...item, bangPlayed: item.bangPlayed + 1 }));
    next = discardCardToPile(next, card);
    const required = acting.character?.id === "slab" ? 2 : 1;
    next = { ...next, pending: { type: "bang", attackerId: playerId, targetId: target.id, responderId: target.id, remaining: required } };
    next = addLog(next, `${acting.name} fires at ${target.name}.`);
    return attemptBarrel(next, rng);
  }

  if (card.name === "Beer") {
    next = discardCardToPile(next, card);
    next = heal(next, playerId, 1);
    return refillSuzy(addLog(next, `${acting.name} drinks a Beer and regains a bullet.`), playerId, rng);
  }
  if (card.name === "Saloon") {
    next = discardCardToPile(next, card);
    for (const alive of livingPlayers(next)) next = heal(next, alive.id, 1);
    return refillSuzy(addLog(next, `${acting.name} buys a round for the whole saloon.`), playerId, rng);
  }
  if (card.name === "Stagecoach" || card.name === "Wells Fargo") {
    next = discardCardToPile(next, card);
    next = drawCards(next, playerId, card.name === "Stagecoach" ? 2 : 3, rng);
    return addLog(next, `${acting.name} draws ${card.name === "Stagecoach" ? "two" : "three"} cards with ${card.name}.`);
  }
  if (card.name === "General Store") {
    next = discardCardToPile(next, card);
    const count = livingPlayers(next).length;
    const drawn = takeDeck(next, count, rng);
    const order = livingOrderFrom(next, next.turnIndex);
    return addLog({ ...drawn.game, pending: { type: "general-store", responderId: order[0], order, cards: drawn.cards } }, `${acting.name} opens the General Store.`);
  }
  if (card.name === "Gatling" || card.name === "Indians") {
    next = discardCardToPile(next, card);
    const order = livingOrderFrom(next, next.turnIndex).filter((id) => id !== playerId);
    const pending = { type: card.name === "Gatling" ? "gatling" : "indians", attackerId: playerId, responderId: order[0], order, position: 0 };
    return addLog({ ...next, pending }, `${acting.name} plays ${card.name}.`);
  }
  if (card.name === "Duel") {
    next = discardCardToPile(next, card);
    return addLog({ ...next, pending: { type: "duel", attackerId: playerId, targetId: target.id, responderId: target.id, lastPlayerId: playerId } }, `${acting.name} challenges ${target.name} to a Duel.`);
  }
  if (card.name === "Panic" || card.name === "Cat Balou") {
    const take = card.name === "Panic";
    next = discardCardToPile(next, card);
    next = transferOrDiscardTargetCard(next, playerId, target.id, options.targetCardId, take, rng);
    next = refillSuzy(next, target.id, rng);
    return addLog(next, `${acting.name} ${take ? "takes" : "discards"} one of ${target.name}'s cards with ${card.name}.`);
  }
  if (card.name === "Jail") {
    next = updatePlayer(next, target.id, (item) => ({ ...item, table: [...item.table, card] }));
    return addLog(next, `${acting.name} puts ${target.name} in Jail.`);
  }
  if (BLUE_CARDS.has(card.name)) {
    if (WEAPONS[card.name]) {
      const oldWeapon = acting.table.find((item) => WEAPONS[item.name]);
      if (oldWeapon) {
        next = updatePlayer(next, playerId, (item) => ({ ...item, table: item.table.filter((laid) => laid.id !== oldWeapon.id) }));
        next = discardCardToPile(next, oldWeapon);
      }
    }
    next = updatePlayer(next, playerId, (item) => ({ ...item, table: [...item.table, card] }));
    return addLog(next, `${acting.name} places ${card.name} face up.`);
  }
  return game;
}

export function respondWithCard(game, playerId, cardId, rng = Math.random) {
  const pending = game.pending;
  const player = game.players.find((item) => item.id === playerId);
  const card = player?.hand.find((item) => item.id === cardId);
  if (!pending || pending.responderId !== playerId || !card) return game;
  const missedLike = card.name === "Missed!" || (card.name === "BANG!" && player.character?.id === "calamity");
  const bangLike = card.name === "BANG!" || (card.name === "Missed!" && player.character?.id === "calamity");
  if (["bang", "gatling"].includes(pending.type) && !missedLike) return game;
  if (["indians", "duel"].includes(pending.type) && !bangLike) return game;
  let next = discardCardToPile(removeHandCard(game, playerId, cardId), card);
  next = refillSuzy(next, playerId, rng);

  if (pending.type === "bang") {
    if (pending.remaining > 1) return { ...next, pending: { ...pending, remaining: pending.remaining - 1 } };
    return addLog({ ...next, pending: null }, `${player.name} dodges the shot.`);
  }
  if (pending.type === "duel") {
    const responderId = pending.lastPlayerId;
    return { ...next, pending: { ...pending, responderId, lastPlayerId: playerId } };
  }
  return advanceGroupPending(addLog(next, `${player.name} answers ${pending.type === "gatling" ? "with Missed!" : "with BANG!"}.`), rng);
}

export function declineResponse(game, playerId, rng = Math.random) {
  const pending = game.pending;
  if (!pending || pending.responderId !== playerId || pending.type === "general-store") return game;
  let next = game;
  if (pending.type === "bang") {
    next = { ...next, pending: null };
    return damage(next, playerId, 1, pending.attackerId, rng, "The shot lands.");
  }
  if (pending.type === "duel") {
    next = { ...next, pending: null };
    return damage(next, playerId, 1, pending.lastPlayerId, rng, `${game.players.find((item) => item.id === playerId)?.name} loses the Duel.`);
  }
  next = damage(next, playerId, 1, pending.attackerId, rng, `${game.players.find((item) => item.id === playerId)?.name} takes the hit.`);
  if (next.phase !== "playing") return next;
  return advanceGroupPending({ ...next, pending }, rng);
}

export function chooseGeneralStoreCard(game, playerId, cardId) {
  const pending = game.pending;
  if (pending?.type !== "general-store" || pending.responderId !== playerId) return game;
  const card = pending.cards.find((item) => item.id === cardId);
  if (!card) return game;
  let next = updatePlayer(game, playerId, (player) => ({ ...player, hand: [...player.hand, card] }));
  const cards = pending.cards.filter((item) => item.id !== cardId);
  const order = pending.order.filter((id) => id !== playerId && next.players.find((player) => player.id === id)?.alive);
  return { ...next, pending: order.length ? { ...pending, cards, order, responderId: order[0] } : null };
}

export function useSidKetchum(game, playerId, cardIds, rng = Math.random) {
  const player = game.players.find((item) => item.id === playerId);
  if (game.phase !== "playing" || game.pending || currentPlayer(game)?.id !== playerId || player?.character?.id !== "sid" || player.lives >= player.maxLives) return game;
  const unique = [...new Set(cardIds)].filter((id) => player.hand.some((card) => card.id === id));
  if (unique.length !== 2) return game;
  const cards = player.hand.filter((card) => unique.includes(card.id));
  let next = updatePlayer(game, playerId, (item) => ({ ...item, hand: item.hand.filter((card) => !unique.includes(card.id)), lives: item.lives + 1 }));
  next = { ...next, discard: [...next.discard, ...cards] };
  return refillSuzy(addLog(next, `${player.name} discards two cards and regains a bullet.`), playerId, rng);
}

export function discardFromHand(game, playerId, cardId, rng = Math.random) {
  const player = game.players.find((item) => item.id === playerId);
  const card = player?.hand.find((item) => item.id === cardId);
  if (game.phase !== "playing" || game.pending || currentPlayer(game)?.id !== playerId || !card || player.hand.length <= player.lives) return game;
  let next = discardCardToPile(removeHandCard(game, playerId, cardId), card);
  next = refillSuzy(next, playerId, rng);
  if (next.players.find((item) => item.id === playerId).hand.length <= player.lives) next = { ...next, turnPhase: "action" };
  return next;
}

export function endTurn(game, playerId, rng = Math.random) {
  const player = game.players.find((item) => item.id === playerId);
  if (game.phase !== "playing" || game.pending || currentPlayer(game)?.id !== playerId) return game;
  if (player.hand.length > player.lives) return { ...game, turnPhase: "discard" };
  return beginNextTurn(game, rng);
}

function beginNextTurn(game, rng) {
  let index = game.turnIndex;
  do index = (index + 1) % game.players.length; while (!game.players[index].alive);
  let next = updatePlayer({ ...game, turnIndex: index, turnNumber: game.turnNumber + 1, turnPhase: "action" }, game.players[index].id, (player) => ({ ...player, bangPlayed: 0 }));
  return resolveStartOfTurn(next, rng);
}

function resolveStartOfTurn(game, rng) {
  const player = currentPlayer(game);
  const dynamite = player.table.find((card) => card.name === "Dynamite");
  if (dynamite) {
    let checked = drawCheck(game, player, (card) => card.suit === "spades" && ["2", "3", "4", "5", "6", "7", "8", "9"].includes(card.rank), rng);
    checked.game = updatePlayer(checked.game, player.id, (item) => ({ ...item, table: item.table.filter((card) => card.id !== dynamite.id) }));
    if (checked.success) {
      checked.game = discardCardToPile(checked.game, dynamite);
      const damaged = damage(addLog(checked.game, `${player.name}'s Dynamite explodes!`), player.id, 3, null, rng);
      if (damaged.phase !== "playing" || !damaged.players.find((item) => item.id === player.id)?.alive) return damaged.phase === "playing" ? beginNextTurn(damaged, rng) : damaged;
      game = damaged;
    } else {
      const nextIndex = nextLivingIndex(checked.game, checked.game.turnIndex);
      game = updatePlayer(checked.game, checked.game.players[nextIndex].id, (item) => ({ ...item, table: [...item.table, dynamite] }));
      game = addLog(game, `${player.name}'s Dynamite passes to ${game.players[nextIndex].name}.`);
    }
  }
  const active = currentPlayer(game);
  const jail = active.table.find((card) => card.name === "Jail");
  if (jail) {
    const checked = drawCheck(game, active, (card) => card.suit === "hearts", rng);
    let next = updatePlayer(checked.game, active.id, (item) => ({ ...item, table: item.table.filter((card) => card.id !== jail.id) }));
    next = discardCardToPile(next, jail);
    if (!checked.success) return beginNextTurn(addLog(next, `${active.name} stays in Jail and loses the turn.`), rng);
    game = addLog(next, `${active.name} escapes Jail.`);
  }
  return drawTurnCards(game, game.turnIndex, rng);
}

function drawTurnCards(game, playerIndex, rng) {
  const player = game.players[playerIndex];
  let next = game;
  if (player.character?.id === "jesse") {
    const victim = livingPlayers(next).find((item) => item.id !== player.id && item.hand.length);
    if (victim) {
      const card = victim.hand[0];
      next = updatePlayer(next, victim.id, (item) => ({ ...item, hand: item.hand.slice(1) }));
      next = updatePlayer(next, player.id, (item) => ({ ...item, hand: [...item.hand, card] }));
      next = drawCards(next, player.id, 1, rng);
      return addLog(next, `${player.name} draws one card from ${victim.name} and one from the deck.`);
    }
  }
  if (player.character?.id === "pedro" && next.discard.length) {
    const card = next.discard[next.discard.length - 1];
    next = { ...next, discard: next.discard.slice(0, -1) };
    next = updatePlayer(next, player.id, (item) => ({ ...item, hand: [...item.hand, card] }));
    next = drawCards(next, player.id, 1, rng);
    return addLog(next, `${player.name} takes the top discard and draws one card.`);
  }
  if (player.character?.id === "kit") {
    const drawn = takeDeck(next, 3, rng);
    next = updatePlayer(drawn.game, player.id, (item) => ({ ...item, hand: [...item.hand, ...drawn.cards.slice(0, 2)] }));
    if (drawn.cards[2]) next = { ...next, deck: [drawn.cards[2], ...next.deck] };
    return addLog(next, `${player.name} looks at three cards and keeps two.`);
  }
  if (player.character?.id === "black-jack") {
    const drawn = takeDeck(next, 2, rng);
    const bonus = drawn.cards[1] && ["hearts", "diamonds"].includes(drawn.cards[1].suit) ? 1 : 0;
    next = updatePlayer(drawn.game, player.id, (item) => ({ ...item, hand: [...item.hand, ...drawn.cards] }));
    if (bonus) next = drawCards(next, player.id, 1, rng);
    return addLog(next, `${player.name} reveals ${drawn.cards[1] ? `${cardSuitSymbol(drawn.cards[1])}${drawn.cards[1].rank}` : "the deck"}${bonus ? " and draws a bonus card." : "."}`);
  }
  return drawCards(next, player.id, 2, rng);
}

function attemptBarrel(game, rng) {
  const pending = game.pending;
  if (!pending || pending.type !== "bang") return game;
  const target = game.players.find((item) => item.id === pending.responderId);
  if (!target?.alive || (!hasTableCard(target, "Barrel") && target.character?.id !== "jourdonnais")) return game;
  const checked = drawCheck(game, target, (card) => card.suit === "hearts", rng);
  if (!checked.success) return addLog(checked.game, `${target.name}'s Barrel misses.`);
  if (pending.remaining > 1) return addLog({ ...checked.game, pending: { ...pending, remaining: pending.remaining - 1 } }, `${target.name}'s Barrel cancels one hit.`);
  return addLog({ ...checked.game, pending: null }, `${target.name}'s Barrel stops the shot.`);
}

function drawCheck(game, player, predicate, rng) {
  const count = player.character?.id === "lucky" ? 2 : 1;
  const drawn = takeDeck(game, count, rng);
  const selected = drawn.cards.find(predicate) ?? drawn.cards[0];
  return { game: { ...drawn.game, discard: [...drawn.game.discard, ...drawn.cards] }, card: selected, success: Boolean(selected && predicate(selected)) };
}

function advanceGroupPending(game, rng) {
  const pending = game.pending;
  if (!pending || !["gatling", "indians"].includes(pending.type)) return game;
  let position = pending.position + 1;
  while (position < pending.order.length && !game.players.find((player) => player.id === pending.order[position])?.alive) position += 1;
  if (position >= pending.order.length) return { ...game, pending: null };
  const next = { ...game, pending: { ...pending, position, responderId: pending.order[position] } };
  return pending.type === "gatling" ? attemptBarrel(next, rng) : next;
}

function damage(game, playerId, amount, attackerId, rng, message) {
  const before = game.players.find((item) => item.id === playerId);
  if (!before?.alive) return game;
  let next = updatePlayer(game, playerId, (player) => ({ ...player, lives: player.lives - amount }));
  let player = next.players.find((item) => item.id === playerId);
  if (player.character?.id === "bart") next = drawCards(next, playerId, amount, rng);
  if (player.character?.id === "el-gringo" && attackerId) {
    const attacker = next.players.find((item) => item.id === attackerId);
    if (attacker?.hand.length) {
      const stolen = attacker.hand[Math.floor(rng() * attacker.hand.length)];
      next = updatePlayer(next, attackerId, (item) => ({ ...item, hand: item.hand.filter((card) => card.id !== stolen.id) }));
      next = updatePlayer(next, playerId, (item) => ({ ...item, hand: [...item.hand, stolen] }));
      next = refillSuzy(next, attackerId, rng);
    }
  }
  player = next.players.find((item) => item.id === playerId);
  while (player.lives <= 0) {
    const beer = livingPlayers(next).length > 2 ? player.hand.find((card) => card.name === "Beer") : null;
    const sidCards = player.character?.id === "sid" ? player.hand.slice(0, 2) : [];
    if (!beer && sidCards.length < 2) break;
    if (beer) next = discardCardToPile(removeHandCard(next, playerId, beer.id), beer);
    else {
      next = updatePlayer(next, playerId, (item) => ({ ...item, hand: item.hand.filter((card) => !sidCards.some((discarded) => discarded.id === card.id)) }));
      next = { ...next, discard: [...next.discard, ...sidCards] };
    }
    next = updatePlayer(next, playerId, (item) => ({ ...item, lives: item.lives + 1 }));
    player = next.players.find((item) => item.id === playerId);
    next = addLog(next, `${player.name} ${beer ? "uses a Beer" : "discards two cards"} to stay alive.`);
  }
  next = addLog(next, message || `${before.name} loses ${amount} bullet${amount === 1 ? "" : "s"}.`);
  if (next.players.find((item) => item.id === playerId).lives <= 0) next = eliminate(next, playerId, attackerId, rng);
  return next;
}

function eliminate(game, playerId, killerId, rng) {
  const eliminated = game.players.find((item) => item.id === playerId);
  const looseCards = [...eliminated.hand, ...eliminated.table];
  let next = updatePlayer(game, playerId, (item) => ({ ...item, alive: false, lives: 0, hand: [], table: [] }));
  const vulture = next.players.find((item) => item.alive && item.character?.id === "vulture");
  if (vulture && vulture.id !== playerId) {
    next = updatePlayer(next, vulture.id, (item) => ({ ...item, hand: [...item.hand, ...looseCards] }));
    next = addLog(next, `${vulture.name} collects every card left by ${eliminated.name}.`);
  } else next = { ...next, discard: [...next.discard, ...looseCards] };
  next = addLog(next, `${eliminated.name} is eliminated and revealed as the ${ROLE_LABELS[eliminated.role]}.`);

  const killer = next.players.find((item) => item.id === killerId);
  if (killer?.alive && eliminated.role === "outlaw") {
    next = drawCards(next, killer.id, 3, rng);
    next = addLog(next, `${killer.name} collects the three-card Outlaw reward.`);
  }
  if (killer?.alive && killer.role === "sheriff" && eliminated.role === "deputy") {
    next = { ...next, discard: [...next.discard, ...killer.hand, ...killer.table] };
    next = updatePlayer(next, killer.id, (item) => ({ ...item, hand: [], table: [] }));
    next = refillSuzy(next, killer.id, rng);
    next = addLog(next, `${killer.name} shot a Deputy and discards every card as the penalty.`);
  }
  return checkWinner(next);
}

function checkWinner(game) {
  const alive = livingPlayers(game);
  const sheriff = game.players.find((player) => player.role === "sheriff");
  if (!sheriff.alive) {
    const renegadeAlone = alive.length === 1 && alive[0].role === "renegade";
    return { ...game, phase: "finished", pending: null, winner: renegadeAlone ? "renegade" : "outlaw", log: [`${renegadeAlone ? "The Renegade" : "The Outlaws"} win!`, ...game.log].slice(0, 60) };
  }
  if (alive.every((player) => !["outlaw", "renegade"].includes(player.role))) {
    return { ...game, phase: "finished", pending: null, winner: "sheriff", log: ["The Sheriff and Deputies win!", ...game.log].slice(0, 60) };
  }
  return game;
}

export function runComputerStep(game, rng = Math.random) {
  if (game.phase !== "playing") return game;
  if (game.pending) {
    const responder = game.players.find((item) => item.id === game.pending.responderId);
    if (!responder?.isComputer) return game;
    if (game.pending.type === "general-store") return chooseGeneralStoreCard(game, responder.id, bestGeneralStoreCard(game.pending.cards).id);
    const valid = responseCards(responder, game.pending.type);
    return valid.length ? respondWithCard(game, responder.id, valid[0].id, rng) : declineResponse(game, responder.id, rng);
  }
  const player = currentPlayer(game);
  if (!player?.isComputer) return game;
  if (game.turnPhase === "discard" || player.hand.length > player.lives) {
    const card = [...player.hand].sort((a, b) => aiCardValue(a, player) - aiCardValue(b, player))[0];
    return card ? discardFromHand(game, player.id, card.id, rng) : endTurn(game, player.id, rng);
  }
  if (player.character?.id === "sid" && player.lives < player.maxLives && player.hand.length > player.lives + 1) {
    const cards = [...player.hand].sort((a, b) => aiCardValue(a) - aiCardValue(b)).slice(0, 2);
    return useSidKetchum(game, player.id, cards.map((card) => card.id), rng);
  }
  const ordered = [...player.hand].sort((a, b) => aiPlayPriority(b, player) - aiPlayPriority(a, player));
  for (const card of ordered) {
    const target = chooseAiTarget(game, player, card);
    if (canPlayCard(game, player.id, card, target?.id ?? null)) {
      return playCard(game, player.id, card.id, { targetId: target?.id, targetCardId: target?.table[0]?.id }, rng);
    }
  }
  return endTurn(game, player.id, rng);
}

export function responseCards(player, pendingType) {
  if (["bang", "gatling"].includes(pendingType)) return player.hand.filter((card) => card.name === "Missed!" || (player.character?.id === "calamity" && card.name === "BANG!"));
  if (["indians", "duel"].includes(pendingType)) return player.hand.filter((card) => card.name === "BANG!" || (player.character?.id === "calamity" && card.name === "Missed!"));
  return [];
}

function chooseAiTarget(game, player, card) {
  const targets = legalTargets(game, player.id, card);
  if (!targets.length) return null;
  const knownEnemies = targets.filter((target) => target.role === "sheriff" || !target.alive);
  if (player.role === "outlaw") return targets.find((target) => target.role === "sheriff") ?? targets[0];
  if (player.role === "sheriff" || player.role === "deputy") {
    const revealedOutlaw = targets.find((target) => !target.alive && target.role === "outlaw");
    return revealedOutlaw ?? targets.find((target) => target.id !== game.players.find((item) => item.role === "sheriff")?.id) ?? targets[0];
  }
  if (player.role === "renegade" && livingPlayers(game).length <= 2) return targets.find((target) => target.role === "sheriff") ?? targets[0];
  return knownEnemies[0] ?? targets.find((target) => target.role !== "sheriff") ?? targets[0];
}

function aiPlayPriority(card, player) {
  if (card.name === "Beer" && player.lives < player.maxLives) return 100;
  if (["Wells Fargo", "Stagecoach", "General Store"].includes(card.name)) return 90;
  if (card.color === "blue") return 80;
  if (["BANG!", "Duel", "Indians", "Gatling"].includes(card.name)) return 60;
  if (["Panic", "Cat Balou"].includes(card.name)) return 50;
  if (card.name === "Saloon") return player.lives < player.maxLives ? 70 : 5;
  return 0;
}

function aiCardValue(card, player = null) {
  if (card.name === "BANG!") return player?.role === "outlaw" ? 96 : player?.role === "sheriff" || player?.role === "deputy" ? 68 : 80;
  if (card.name === "Missed!") return player?.character?.id === "calamity" && player?.role === "outlaw" ? 96 : player?.role === "outlaw" ? 62 : 90;
  return ({ Beer: 85, Barrel: 65, Mustang: 60, Scope: 55 }[card.name] ?? (WEAPONS[card.name] ? 50 : 30));
}

function bestGeneralStoreCard(cards) {
  return [...cards].sort((a, b) => aiCardValue(b) - aiCardValue(a))[0];
}

function transferOrDiscardTargetCard(game, playerId, targetId, targetCardId, take, rng) {
  const target = game.players.find((item) => item.id === targetId);
  let selected = target.table.find((card) => card.id === targetCardId);
  let source = "table";
  if (!selected) {
    source = target.hand.length ? "hand" : "table";
    const cards = source === "hand" ? target.hand : target.table;
    selected = cards[Math.floor(rng() * cards.length)];
  }
  if (!selected) return game;
  let next = updatePlayer(game, targetId, (item) => ({ ...item, [source]: item[source].filter((card) => card.id !== selected.id) }));
  if (take) next = updatePlayer(next, playerId, (item) => ({ ...item, hand: [...item.hand, selected] }));
  else next = discardCardToPile(next, selected);
  return next;
}

function drawCards(game, playerId, count, rng) {
  const taken = takeDeck(game, count, rng);
  return updatePlayer(taken.game, playerId, (player) => ({ ...player, hand: [...player.hand, ...taken.cards] }));
}

function takeDeck(game, count, rng) {
  let next = game;
  const cards = [];
  for (let index = 0; index < count; index += 1) {
    if (!next.deck.length && next.discard.length) next = { ...next, deck: shuffled(next.discard, rng), discard: [] };
    const card = next.deck[0];
    if (!card) break;
    cards.push(card);
    next = { ...next, deck: next.deck.slice(1) };
  }
  return { game: next, cards };
}

function refillSuzy(game, playerId, rng) {
  const player = game.players.find((item) => item.id === playerId);
  return player?.alive && player.character?.id === "suzy" && player.hand.length === 0 ? drawCards(game, playerId, 1, rng) : game;
}

function heal(game, playerId, amount) {
  return updatePlayer(game, playerId, (player) => ({ ...player, lives: Math.min(player.maxLives, player.lives + amount) }));
}

function hasTableCard(player, name) {
  return player.table.some((card) => card.name === name);
}

function removeHandCard(game, playerId, cardId) {
  return updatePlayer(game, playerId, (player) => ({ ...player, hand: player.hand.filter((card) => card.id !== cardId) }));
}

function discardCardToPile(game, card) {
  return { ...game, discard: [...game.discard, card] };
}

function updatePlayer(game, playerId, updater) {
  return { ...game, players: game.players.map((player) => player.id === playerId ? updater(player) : player) };
}

function addLog(game, message) {
  return { ...game, log: [message, ...game.log].slice(0, 60) };
}

function livingOrderFrom(game, startIndex) {
  const order = [];
  for (let offset = 0; offset < game.players.length; offset += 1) {
    const player = game.players[(startIndex + offset) % game.players.length];
    if (player.alive) order.push(player.id);
  }
  return order;
}

function nextLivingIndex(game, startIndex) {
  let index = startIndex;
  do index = (index + 1) % game.players.length; while (!game.players[index].alive);
  return index;
}
