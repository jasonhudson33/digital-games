export const MIN_PLAYERS = 3;
export const MAX_PLAYERS = 8;
export const TRACK_SPACES = 16;
export const RACING_CAMELS = ["blue", "green", "purple", "red", "yellow"];
export const CRAZY_CAMELS = ["black", "white"];
export const ALL_CAMELS = [...RACING_CAMELS, ...CRAZY_CAMELS];
export const PYRAMID_DICE = [...RACING_CAMELS, "grey"];

const BOT_NAMES = ["Dune", "Saffron", "Oasis", "Mira", "Dusty", "Nile", "Cairo"];
let computerCounter = 0;

const rollThree = (rng) => Math.floor(rng() * 3) + 1;
const pickIndex = (length, rng) => Math.min(length - 1, Math.floor(rng() * length));

function shuffled(values, rng) {
  const copy = [...values];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const target = pickIndex(index + 1, rng);
    [copy[index], copy[target]] = [copy[target], copy[index]];
  }
  return copy;
}

function playerFrom(input) {
  return {
    id: input.id,
    name: String(input.name || "Player").trim().slice(0, 20) || "Player",
    isComputer: Boolean(input.isComputer),
    money: 0,
    legTickets: [],
    pyramidTickets: 0,
    finishCards: [],
    spectator: null,
    partnerId: null,
    copyChoice: undefined,
  };
}

export function createLobby(host, roomCode, now = Date.now()) {
  const player = playerFrom(host);
  return {
    roomCode,
    hostId: player.id,
    phase: "lobby",
    players: [player],
    stacks: {},
    legBetStacks: emptyLegBetStacks(),
    remainingDice: [],
    pyramidTicketsTaken: 0,
    finishBets: { winner: [], loser: [] },
    currentPlayerIndex: 0,
    leg: 0,
    raceFinished: false,
    counterclockwiseFinish: false,
    partnershipQueue: [],
    partnershipIndex: 0,
    winnerIds: [],
    lastRoll: null,
    legRolls: [],
    legRecap: null,
    log: [`${player.name} opened a Camel Up room.`],
    updatedAt: now,
  };
}

export function addPlayer(game, input) {
  if (game.phase !== "lobby" || game.players.length >= MAX_PLAYERS || game.players.some((player) => player.id === input.id)) return game;
  const player = playerFrom(input);
  return withLog({ ...game, players: [...game.players, player] }, `${player.name} joined the race.`);
}

export function addComputerPlayer(game) {
  if (game.phase !== "lobby" || game.players.length >= MAX_PLAYERS) return game;
  computerCounter += 1;
  const used = new Set(game.players.map((player) => player.name));
  const name = BOT_NAMES.find((candidate) => !used.has(candidate)) || `Computer ${computerCounter}`;
  return addPlayer(game, { id: `camel-up-computer-${Date.now()}-${computerCounter}`, name, isComputer: true });
}

export function removeComputerPlayer(game, playerId) {
  if (game.phase !== "lobby") return game;
  const player = game.players.find((candidate) => candidate.id === playerId && candidate.isComputer);
  if (!player) return game;
  return withLog({ ...game, players: game.players.filter((candidate) => candidate.id !== playerId) }, `${player.name} left the race.`);
}

export function startGame(game, rng = Math.random) {
  if (game.phase !== "lobby" || game.players.length < MIN_PLAYERS || game.players.length > MAX_PLAYERS) return game;
  const stacks = {};
  for (const camelId of RACING_CAMELS) addToSetupStack(stacks, rollThree(rng), camelId);
  for (const camelId of CRAZY_CAMELS) addToSetupStack(stacks, TRACK_SPACES + 1 - rollThree(rng), camelId);
  for (const [position, stack] of Object.entries(stacks)) stacks[position] = shuffled(stack, rng);
  const currentPlayerIndex = pickIndex(game.players.length, rng);
  const players = game.players.map((player) => ({
    ...player,
    money: 3,
    moneyAtLegStart: 3,
    legTickets: [],
    pyramidTickets: 0,
    finishCards: [...RACING_CAMELS],
    spectator: null,
    partnerId: null,
    copyChoice: undefined,
  }));
  return withLog({
    ...game,
    phase: "playing",
    players,
    stacks,
    legBetStacks: emptyLegBetStacks(),
    remainingDice: [...PYRAMID_DICE],
    pyramidTicketsTaken: 0,
    currentPlayerIndex,
    leg: 1,
    legRolls: [],
    legRecap: null,
  }, `${players[currentPlayerIndex].name} begins the race.`);
}

function addToSetupStack(stacks, position, camelId) {
  const key = String(position);
  stacks[key] = [...(stacks[key] || []), camelId];
}

function emptyLegBetStacks() {
  return Object.fromEntries(RACING_CAMELS.map((camelId) => [camelId, [2, 2, 3, 5]]));
}

export function currentPlayer(game) {
  if (game.phase === "partnership-scoring") {
    const id = game.partnershipQueue[game.partnershipIndex];
    return game.players.find((player) => player.id === id) || null;
  }
  return game.players[game.currentPlayerIndex] || null;
}

export function camelLocation(game, camelId) {
  for (const [position, stack] of Object.entries(game.stacks || {})) {
    const height = stack.indexOf(camelId);
    if (height >= 0) return { position: Number(position), height, stack };
  }
  return null;
}

export function raceRanking(game) {
  return [...RACING_CAMELS].sort((left, right) => {
    const a = camelLocation(game, left);
    const b = camelLocation(game, right);
    if (!a || !b) return left.localeCompare(right);
    return b.position - a.position || b.height - a.height;
  });
}

/** Move one camel and everything above it. Exported for table-driven rules tests. */
export function moveCamel(game, camelId, steps, options = {}) {
  const location = camelLocation(game, camelId);
  if (!location || steps < 1) return game;
  const direction = options.direction ?? (CRAZY_CAMELS.includes(camelId) ? -1 : 1);
  const stacks = cloneStacks(game.stacks);
  const source = stacks[String(location.position)];
  const unit = source.splice(location.height);
  if (!source.length) delete stacks[String(location.position)];
  let destination = location.position + direction * steps;
  placeUnit(stacks, destination, unit, false);
  let next = { ...game, stacks };
  if (crossedFinish(destination, direction)) return markRaceFinished(next, direction);

  const tileOwner = next.players.find((player) => player.spectator?.space === destination);
  if (!tileOwner) return next;
  next = { ...next, players: updatePlayer(next.players, tileOwner.id, (player) => ({ ...player, money: player.money + 1 })) };
  const extraDirection = tileOwner.spectator.side === "cheer" ? direction : -direction;
  const extraUnder = tileOwner.spectator.side === "boo";
  const tileHit = { ownerId: tileOwner.id, side: tileOwner.spectator.side, from: destination };
  const afterTile = cloneStacks(next.stacks);
  const landedStack = afterTile[String(destination)] || [];
  const moved = landedStack.splice(extraUnder ? 0 : landedStack.length - unit.length, unit.length);
  if (!landedStack.length) delete afterTile[String(destination)];
  destination += extraDirection;
  placeUnit(afterTile, destination, moved, extraUnder);
  next = { ...next, stacks: afterTile, moveEvent: { ...tileHit, to: destination } };
  return crossedFinish(destination, direction) ? markRaceFinished(next, direction) : next;
}

function placeUnit(stacks, position, unit, under) {
  const key = String(position);
  const destination = stacks[key] || [];
  stacks[key] = under ? [...unit, ...destination] : [...destination, ...unit];
}

function crossedFinish(position, direction) {
  return direction > 0 ? position > TRACK_SPACES : position < 1;
}

function markRaceFinished(game, direction) {
  return { ...game, raceFinished: true, counterclockwiseFinish: direction < 0 };
}

function cloneStacks(stacks) {
  return Object.fromEntries(Object.entries(stacks || {}).map(([position, stack]) => [position, [...stack]]));
}

function canNormalAct(game, playerId) {
  return game.phase === "playing" && currentPlayer(game)?.id === playerId;
}

function advanceTurn(game) {
  return { ...game, currentPlayerIndex: (game.currentPlayerIndex + 1) % game.players.length };
}

export function takeLegTicket(game, playerId, camelId) {
  if (!canNormalAct(game, playerId) || !RACING_CAMELS.includes(camelId) || !game.legBetStacks[camelId]?.length) return game;
  const stacks = Object.fromEntries(Object.entries(game.legBetStacks).map(([id, values]) => [id, [...values]]));
  const value = stacks[camelId].pop();
  const ticket = { id: `${camelId}-${game.leg}-${stacks[camelId].length}`, camelId, value };
  const players = updatePlayer(game.players, playerId, (player) => ({ ...player, legTickets: [...player.legTickets, ticket] }));
  return advanceTurn(withLog({ ...game, players, legBetStacks: stacks }, `${currentPlayer(game).name} backed ${camelId}.`));
}

export function placeSpectator(game, playerId, space, side) {
  if (!canNormalAct(game, playerId) || !["cheer", "boo"].includes(side) || !legalSpectatorSpace(game, playerId, space)) return game;
  const players = updatePlayer(game.players, playerId, (player) => ({ ...player, spectator: { space, side } }));
  return advanceTurn(withLog({ ...game, players }, `${currentPlayer(game).name} placed a ${side === "cheer" ? "cheering" : "booing"} tile.`));
}

export function legalSpectatorSpace(game, playerId, space) {
  if (!Number.isInteger(space) || space < 2 || space > TRACK_SPACES || (game.stacks[String(space)] || []).length) return false;
  const tiles = game.players.filter((player) => player.id !== playerId && player.spectator).map((player) => player.spectator.space);
  return !tiles.some((occupied) => occupied === space || circularDistance(occupied, space) === 1);
}

function circularDistance(a, b) {
  const direct = Math.abs(a - b);
  return Math.min(direct, TRACK_SPACES - direct);
}

export function rollPyramid(game, playerId, rng = Math.random) {
  if (!canNormalAct(game, playerId) || game.pyramidTicketsTaken >= 5 || game.remainingDice.length <= 1) return game;
  const dieIndex = pickIndex(game.remainingDice.length, rng);
  const remainingDice = [...game.remainingDice];
  const dieId = remainingDice.splice(dieIndex, 1)[0];
  let camelId = dieId;
  let value;
  let face = dieId;
  if (dieId === "grey") {
    const faceIndex = Math.min(5, Math.floor(rng() * 6));
    face = faceIndex < 3 ? "white" : "black";
    value = (faceIndex % 3) + 1;
    camelId = crazyCamelToMove(game, face);
  } else value = rollThree(rng);
  const roller = currentPlayer(game);
  const { moveEvent, ...moved } = moveCamel({ ...game, moveEvent: null }, camelId, value);
  const tileOwner = moveEvent && game.players.find((player) => player.id === moveEvent.ownerId);
  const entry = {
    n: (game.legRolls || []).length + 1,
    playerId: roller.id,
    playerName: roller.name,
    dieId,
    face,
    camelId,
    value,
    tile: tileOwner ? { ownerId: tileOwner.id, ownerName: tileOwner.name, side: moveEvent.side, from: moveEvent.from, to: moveEvent.to } : null,
  };
  const players = updatePlayer(moved.players, playerId, (player) => ({ ...player, pyramidTickets: player.pyramidTickets + 1 }));
  let next = advanceTurn(withLog({
    ...moved,
    players,
    remainingDice,
    pyramidTicketsTaken: game.pyramidTicketsTaken + 1,
    lastRoll: { dieId, face, camelId, value },
    legRolls: [...(game.legRolls || []), entry],
  }, `${roller.name} moved ${camelId} ${value}.`));
  if (next.raceFinished || next.pyramidTicketsTaken === 5) return beginLegScoring(next);
  return next;
}

export function crazyCamelToMove(game, rolledColor) {
  const carriers = CRAZY_CAMELS.filter((camelId) => {
    const location = camelLocation(game, camelId);
    return location && location.stack.slice(location.height + 1).some((id) => RACING_CAMELS.includes(id));
  });
  if (carriers.length === 1) return carriers[0];
  const black = camelLocation(game, "black");
  const white = camelLocation(game, "white");
  if (black && white && black.position === white.position && Math.abs(black.height - white.height) === 1) {
    return black.height > white.height ? "black" : "white";
  }
  return rolledColor;
}

export function placeFinishBet(game, playerId, bet, camelId) {
  if (!canNormalAct(game, playerId) || !["winner", "loser"].includes(bet) || !RACING_CAMELS.includes(camelId)) return game;
  const player = currentPlayer(game);
  if (!player.finishCards.includes(camelId)) return game;
  const players = updatePlayer(game.players, playerId, (item) => ({ ...item, finishCards: item.finishCards.filter((id) => id !== camelId) }));
  const finishBets = { ...game.finishBets, [bet]: [...game.finishBets[bet], { playerId, camelId }] };
  return advanceTurn(withLog({ ...game, players, finishBets }, `${player.name} placed an overall ${bet} bet.`));
}

export function formPartnership(game, playerId, partnerId) {
  if (!canNormalAct(game, playerId) || game.players.length < 6 || playerId === partnerId) return game;
  const player = game.players.find((item) => item.id === playerId);
  const partner = game.players.find((item) => item.id === partnerId);
  if (!player || !partner || player.partnerId || partner.partnerId) return game;
  const players = game.players.map((item) => item.id === playerId
    ? { ...item, partnerId }
    : item.id === partnerId ? { ...item, partnerId: playerId } : item);
  return advanceTurn(withLog({ ...game, players }, `${player.name} partnered with ${partner.name}.`));
}

export function ticketReward(ticket, ranking) {
  const place = ranking.indexOf(ticket.camelId);
  return place === 0 ? ticket.value : place === 1 ? 1 : -1;
}

export function partnerRewardOptions(game, playerId) {
  const player = game.players.find((item) => item.id === playerId);
  const partner = game.players.find((item) => item.id === player?.partnerId);
  if (!partner) return [];
  const ranking = raceRanking(game);
  const tickets = partner.legTickets.map((ticket) => ({ kind: "leg", id: ticket.id, label: `${ticket.camelId} ${ticket.value}`, reward: ticketReward(ticket, ranking) }));
  if (partner.pyramidTickets) tickets.push({ kind: "pyramid", id: "pyramid", label: "Pyramid ticket", reward: 1 });
  return tickets;
}

function beginLegScoring(game) {
  const partnershipQueue = game.players.filter((player) => player.partnerId).map((player) => player.id);
  if (partnershipQueue.length) {
    return { ...game, phase: "partnership-scoring", partnershipQueue, partnershipIndex: 0 };
  }
  return finishLegScoring(game);
}

export function choosePartnerTicket(game, playerId, choiceId = null) {
  if (game.phase !== "partnership-scoring" || currentPlayer(game)?.id !== playerId) return game;
  const options = partnerRewardOptions(game, playerId);
  if (choiceId !== null && !options.some((option) => option.id === choiceId)) return game;
  const players = updatePlayer(game.players, playerId, (player) => ({ ...player, copyChoice: choiceId }));
  const nextIndex = game.partnershipIndex + 1;
  const next = { ...game, players, partnershipIndex: nextIndex };
  return nextIndex >= game.partnershipQueue.length ? finishLegScoring(next) : next;
}

export function finishLegScoring(game) {
  const ranking = raceRanking(game);
  const rolls = game.legRolls || [];
  const rows = [];
  let players = game.players.map((player) => {
    const tickets = player.legTickets.map((ticket) => ({ camelId: ticket.camelId, value: ticket.value, reward: ticketReward(ticket, ranking) }));
    const base = tickets.reduce((sum, ticket) => sum + ticket.reward, 0) + player.pyramidTickets;
    const option = player.copyChoice === null || player.copyChoice === undefined
      ? null
      : partnerRewardOptions(game, player.id).find((candidate) => candidate.id === player.copyChoice) || null;
    const copied = option?.reward || 0;
    const unfloored = player.money + base + copied;
    const money = Math.max(0, unfloored);
    rows.push({
      playerId: player.id,
      name: player.name,
      tickets,
      pyramid: player.pyramidTickets,
      tileIncome: rolls.filter((roll) => roll.tile?.ownerId === player.id).length,
      copied: option ? { label: option.label, reward: option.reward } : null,
      before: player.moneyAtLegStart ?? player.money,
      legAfter: money,
      after: money,
      floored: unfloored < 0,
    });
    return { ...player, money };
  });
  const legRecap = { leg: game.leg, final: Boolean(game.raceFinished), ranking, rolls, rows, finish: null };
  if (game.raceFinished) return finishRace({ ...game, players, phase: "scoring", legRecap });
  players = players.map((player) => ({
    ...player,
    moneyAtLegStart: player.money,
    legTickets: [],
    pyramidTickets: 0,
    spectator: null,
    partnerId: null,
    copyChoice: undefined,
  }));
  return withLog({
    ...game,
    phase: "playing",
    players,
    leg: game.leg + 1,
    legBetStacks: emptyLegBetStacks(),
    remainingDice: [...PYRAMID_DICE],
    pyramidTicketsTaken: 0,
    partnershipQueue: [],
    partnershipIndex: 0,
    lastRoll: null,
    legRolls: [],
    legRecap,
  }, `Leg ${game.leg} was scored.`);
}

function finishRace(game) {
  const ranking = raceRanking(game);
  const outcomes = [["winner", ranking[0]], ["loser", ranking.at(-1)]];
  let players = game.players.map((player) => ({ ...player }));
  const finish = {};
  for (const [bet, target] of outcomes) {
    let correctIndex = 0;
    finish[bet] = { camelId: target, cards: [] };
    for (const card of game.finishBets[bet]) {
      const player = players.find((item) => item.id === card.playerId);
      if (!player) continue;
      const before = player.money;
      const correct = card.camelId === target;
      if (correct) {
        player.money += [8, 5, 3, 2][correctIndex] ?? 1;
        correctIndex += 1;
      } else player.money = Math.max(0, player.money - 1);
      finish[bet].cards.push({ playerId: player.id, playerName: player.name, camelId: card.camelId, correct, delta: player.money - before });
    }
  }
  const legRecap = game.legRecap && {
    ...game.legRecap,
    rows: game.legRecap.rows.map((row) => ({ ...row, after: players.find((player) => player.id === row.playerId)?.money ?? row.after })),
    finish,
  };
  const richest = Math.max(...players.map((player) => player.money));
  const winnerIds = players.filter((player) => player.money === richest).map((player) => player.id);
  return withLog({ ...game, players, legRecap, phase: "finished", winnerIds, partnershipQueue: [], partnershipIndex: 0 }, `${players.filter((player) => winnerIds.includes(player.id)).map((player) => player.name).join(" and ")} won the race.`);
}

export function runComputerTurn(game, rng = Math.random) {
  const player = currentPlayer(game);
  if (!player?.isComputer) return game;
  if (game.phase === "partnership-scoring") {
    const best = [...partnerRewardOptions(game, player.id)].sort((a, b) => b.reward - a.reward)[0];
    return choosePartnerTicket(game, player.id, best && best.reward >= 0 ? best.id : null);
  }
  if (game.phase !== "playing") return game;
  if (game.players.length >= 6 && !player.partnerId) {
    const available = game.players.find((candidate) => candidate.id !== player.id && !candidate.partnerId);
    if (available && rng() < 0.18) return formPartnership(game, player.id, available.id);
  }
  const ranking = raceRanking(game);
  const leader = ranking[0];
  if (game.legBetStacks[leader]?.length && rng() < 0.48) return takeLegTicket(game, player.id, leader);
  if (player.finishCards.includes(leader) && rng() < 0.22) return placeFinishBet(game, player.id, "winner", leader);
  return rollPyramid(game, player.id, rng);
}

function updatePlayer(players, playerId, update) {
  return players.map((player) => player.id === playerId ? update(player) : player);
}

function withLog(game, message) {
  return { ...game, log: [message, ...(game.log || [])].slice(0, 100) };
}
