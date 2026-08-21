import { shuffled } from "./shuffle.js";

export const PLAYER_COLORS = ["#ef476f", "#06a6a6", "#f4a261", "#7257d4", "#2f80ed", "#8b5e3c"];

export const CAREERS = [
  { id: "doctor", name: "Doctor", salary: 100000, degree: true, icon: "🩺" },
  { id: "lawyer", name: "Lawyer", salary: 90000, degree: true, icon: "⚖️" },
  { id: "engineer", name: "Engineer", salary: 80000, degree: true, icon: "⚙️" },
  { id: "teacher", name: "Teacher", salary: 70000, degree: true, icon: "📚" },
  { id: "chef", name: "Chef", salary: 60000, degree: false, icon: "🍳" },
  { id: "athlete", name: "Athlete", salary: 70000, degree: false, icon: "🏅" },
  { id: "designer", name: "Designer", salary: 60000, degree: false, icon: "✏️" },
  { id: "police", name: "Police Officer", salary: 50000, degree: false, icon: "🛡️" },
  { id: "mechanic", name: "Mechanic", salary: 50000, degree: false, icon: "🔧" },
];

export const HOUSES = [
  { name: "Cozy Cottage", price: 100000, value: 120000, icon: "🏡" },
  { name: "Townhouse", price: 140000, value: 165000, icon: "🏘️" },
  { name: "Ranch House", price: 180000, value: 210000, icon: "🏠" },
  { name: "Victorian", price: 220000, value: 260000, icon: "🏛️" },
  { name: "Dream Home", price: 300000, value: 360000, icon: "🏰" },
];

const LIFE_TILES = [10000, 20000, 20000, 30000, 30000, 40000, 40000, 50000, 50000, 60000, 70000, 80000];

const blueprint = [
  ["start", "Start your journey", "🚗"],
  ["payday", "Payday", "💵"],
  ["action", "Buy books and supplies", "📚", -20000],
  ["life", "Help your community", "🤝"],
  ["action", "Graduation present", "🎁", 20000],
  ["payday", "Payday", "💵"],
  ["action", "Dean's list award", "🏅", 20000],
  ["job", "Career choice", "💼"],
  ["action", "Big Bucks", "💰", 50000],
  ["action", "Wedding plans", "💐", -20000],
  ["payday", "Payday", "💵"],
  ["career", "Career event", "🧾"],
  ["action", "Buy a big-screen TV", "📺", -50000],
  ["life", "Good deed", "💛"],
  ["payday", "Payday", "💵"],
  ["action", "Mountain vacation", "🏔️", -25000],
  ["marriage", "Get married", "💍"],
  ["action", "Wedding gifts", "🥂", 100000],
  ["payday", "Payday", "💵"],
  ["tax", "Taxes due", "🧮"],
  ["life", "Family reunion", "🌳"],
  ["action", "Family portrait", "📸", -35000],
  ["payday", "Payday", "💵"],
  ["night-school", "Night school", "🎓"],
  ["action", "TV game show winner", "📺", 95000],
  ["baby", "Baby!", "🍼"],
  ["life", "A proud moment", "⭐"],
  ["payday", "Payday", "💵"],
  ["house", "Buy a house", "🏠"],
  ["action", "Home improvements", "🪴", -40000],
  ["career", "Career event", "💼"],
  ["payday", "Payday", "💵"],
  ["life", "Give back", "🎁"],
  ["action", "Write a bestseller", "📖", 80000],
  ["twins", "Twins!", "👶"],
  ["payday", "Payday", "💵"],
  ["action", "Find buried treasure", "💎", 80000],
  ["career-change", "Mid-life career change", "🔄"],
  ["life", "Milestone moment", "🏆"],
  ["payday", "Payday", "💵"],
  ["career", "Career event", "🧾"],
  ["action", "Sponsor a golf tournament", "⛳", -35000],
  ["baby", "Baby!", "🍼"],
  ["life", "Community hero", "🦸"],
  ["payday", "Payday", "💵"],
  ["action", "Buy a yacht", "⛵", -30000],
  ["tax", "Taxes due", "🧮"],
  ["life", "Dream achieved", "🌟"],
  ["payday", "Payday", "💵"],
  ["action", "Car stolen", "🚘", -15000],
  ["career", "Career event", "💼"],
  ["life", "Leave a legacy", "🌈"],
  ["payday", "Final payday", "💵"],
  ["retire", "Retirement", "🌴"],
];

const BOARD_ROUTE_ANCHORS = [
  [0, 49.2, 17.5],
  [3, 31.5, 8.2],
  [6, 13.5, 13.5],
  [7, 29.5, 25.5],
  [10, 14.5, 29.5],
  [13, 8.1, 39.2],
  [16, 28.5, 47.5],
  [20, 20.5, 58.5],
  [24, 9.2, 71.6],
  [28, 27.2, 73.2],
  [31, 45.5, 73.4],
  [34, 24.2, 86.2],
  [37, 49.5, 93.2],
  [41, 78.2, 92.3],
  [44, 91.3, 80.2],
  [47, 91.4, 55.2],
  [50, 80.5, 43.2],
  [53, 68.5, 31.4],
];

const boardLayout = buildLifeBoardLayout();
export const BOARD = blueprint.map(([type, label, icon, amount], index) => ({
  index,
  type,
  label,
  icon,
  ...(Number.isFinite(amount) ? { amount } : {}),
  ...boardLayout[index],
}));
export const STOP_TYPES = new Set(["job", "marriage", "house", "career-change", "retire"]);

const COMPUTER_NAMES = ["Sunny", "Milo", "Bea", "Rory", "Poppy"];

export function createLifeLobby(host, roomCode) {
  return {
    version: 1,
    roomCode,
    hostId: host.id,
    phase: "lobby",
    players: [makePlayer(host, 0)],
    currentPlayerIndex: 0,
    lastSpin: null,
    pending: null,
    winnerIds: [],
    lifeTilePool: shuffled([...LIFE_TILES, ...LIFE_TILES]),
    millionaireBonus: shuffled([...LIFE_TILES]).slice(0, 4),
    log: [`${host.name} opened the road.`],
    updatedAt: Date.now(),
  };
}

export function addLifePlayer(state, player) {
  if (state.phase !== "lobby" || state.players.length >= 6) return state;
  if (state.players.some((entry) => entry.id === player.id)) return state;
  return logState({ ...state, players: [...state.players, makePlayer(player, state.players.length)] }, `${player.name} joined the road trip.`);
}

export function addLifeComputer(state) {
  if (state.phase !== "lobby" || state.players.length >= 6) return state;
  const used = new Set(state.players.map((player) => player.name));
  const name = COMPUTER_NAMES.find((candidate) => !used.has(candidate)) || `Driver ${state.players.length + 1}`;
  return addLifePlayer(state, { id: `computer-${Date.now()}-${state.players.length}`, name, isComputer: true });
}

export function removeLifeComputer(state, playerId) {
  if (state.phase !== "lobby") return state;
  const player = state.players.find((entry) => entry.id === playerId);
  if (!player?.isComputer) return state;
  const players = state.players.filter((entry) => entry.id !== playerId).map((entry, index) => ({ ...entry, color: PLAYER_COLORS[index] }));
  return logState({ ...state, players }, `${player.name} left the road trip.`);
}

export function startLifeGame(state) {
  if (state.phase !== "lobby" || state.players.length < 2) return state;
  const players = state.players.map((player) => ({ ...player, status: "choosing-path" }));
  return logState({ ...state, phase: "playing", players, currentPlayerIndex: 0, pending: { type: "path", playerId: players[0].id } }, `${players[0].name} chooses a path first.`);
}

export function currentLifePlayer(state) {
  return state.players[state.currentPlayerIndex] || null;
}

export function chooseLifePath(state, playerId, path) {
  const player = currentLifePlayer(state);
  if (state.phase !== "playing" || player?.id !== playerId || state.pending?.type !== "path") return state;
  const players = updatePlayer(state.players, playerId, (current) => {
    if (path === "college") return { ...current, path, cash: current.cash + 40000, loans: current.loans + 2, position: 0, status: "playing", college: true };
    const options = randomCareers(false, 3);
    return { ...current, path: "career", position: 7, status: "playing", college: false, careerOptions: options };
  });
  if (path === "career") {
    return logState({ ...state, players, pending: { type: "career", playerId, options: players.find((entry) => entry.id === playerId).careerOptions, reason: "Start your career" } }, `${player.name} skips college and starts earning sooner.`);
  }
  return logState({ ...state, players, pending: null }, `${player.name} takes $40,000 in tuition loans and heads to college.`);
}

export function chooseCareer(state, playerId, careerId) {
  if (state.pending?.type !== "career" || state.pending.playerId !== playerId) return state;
  const career = state.pending.options.find((option) => option.id === careerId);
  if (!career) return state;
  const players = updatePlayer(state.players, playerId, (player) => ({ ...player, career, careerOptions: undefined }));
  return logState({ ...state, players, pending: null }, `${state.players.find((player) => player.id === playerId).name} becomes a ${career.name} earning ${money(career.salary)}.`);
}

export function chooseRetirement(state, playerId, destination) {
  if (state.pending?.type !== "retirement" || state.pending.playerId !== playerId) return state;
  let next = { ...state, players: updatePlayer(state.players, playerId, (player) => ({ ...player, retirement: destination, status: "retired" })), pending: null };
  if (destination === "countryside") next = awardLifeTile(next, playerId, "for choosing Countryside Acres");
  next = logState(next, `${next.players.find((player) => player.id === playerId).name} retires at ${destination === "millionaire" ? "Millionaire Estates" : "Countryside Acres"}.`);
  if (next.players.every((player) => player.status === "retired")) return finishGame(next);
  return advanceTurn(next);
}

export function buyInvestment(state, playerId, number) {
  const player = currentLifePlayer(state);
  const value = Number(number);
  if (state.phase !== "playing" || state.pending || player?.id !== playerId || player.investment || value < 1 || value > 10 || player.status === "retired") return state;
  let players = updatePlayer(state.players, playerId, (current) => ({ ...current, investment: value, cash: current.cash - 50000 }));
  players = coverDebt(players, playerId);
  return logState({ ...state, players }, `${player.name} invests in spin ${value}.`);
}

export function spinLife(state, playerId, forcedSpin) {
  const player = currentLifePlayer(state);
  if (state.phase !== "playing" || state.pending || player?.id !== playerId || player.status !== "playing") return state;
  const spin = forcedSpin == null ? Math.floor(Math.random() * 10) + 1 : Math.max(1, Math.min(10, Number(forcedSpin)));
  let next = { ...state, lastSpin: { number: spin, playerId, at: Date.now() } };
  next = payInvestments(next, spin);
  next = policeFine(next, playerId, spin);
  const from = player.position;
  const naturalTarget = Math.min(BOARD.length - 1, from + spin);
  const stopIndex = BOARD.findIndex((space) => space.index > from && space.index <= naturalTarget && STOP_TYPES.has(space.type));
  const target = stopIndex >= 0 ? stopIndex : naturalTarget;
  next = {
    ...next,
    lastSpin: {
      ...next.lastSpin,
      moved: target - from,
      remaining: Math.max(0, spin - (target - from)),
      stoppedAtMandatory: stopIndex >= 0,
      target,
    },
  };
  next = collectPassedPaydays(next, playerId, from, target);
  next = { ...next, players: updatePlayer(next.players, playerId, (current) => ({ ...current, position: target })) };
  next = logState(next, `${player.name} spun ${spin}, moved ${target - from} space${target - from === 1 ? "" : "s"}, and ${stopIndex >= 0 ? "stopped at" : "landed on"} ${BOARD[target].label}.`);
  return resolveSpace(next, playerId, BOARD[target]);
}

export function runLifeComputerTurn(state) {
  const player = currentLifePlayer(state);
  if (!player?.isComputer || state.phase !== "playing") return state;
  if (state.pending?.playerId === player.id) {
    if (state.pending.type === "path") return chooseLifePath(state, player.id, Math.random() < 0.55 ? "college" : "career");
    if (state.pending.type === "career") return chooseCareer(state, player.id, [...state.pending.options].sort((a, b) => b.salary - a.salary)[0].id);
    if (state.pending.type === "retirement") return chooseRetirement(state, player.id, player.cash >= 450000 ? "millionaire" : "countryside");
  }
  if (!state.pending && !player.investment && player.cash >= 90000 && Math.random() < 0.35) return buyInvestment(state, player.id, Math.floor(Math.random() * 10) + 1);
  return spinLife(state, player.id);
}

export function playerNetWorth(player) {
  return player.cash + (player.house?.value || 0) + player.lifeTiles.reduce((sum, value) => sum + value, 0) - player.loans * 25000;
}

function resolveSpace(state, playerId, space) {
  const player = state.players.find((entry) => entry.id === playerId);
  if (space.type === "job") {
    if (player.career) return advanceTurn(state);
    const options = randomCareers(true, 3);
    return { ...logState(state, `${player.name} graduates and begins a job search.`), pending: { type: "career", playerId, options, reason: "Choose your college career" } };
  }
  if (space.type === "payday") return advanceTurn(state);
  if (space.type === "action") {
    const { label, amount, icon } = space;
    let players = updatePlayer(state.players, playerId, (current) => ({ ...current, cash: current.cash + amount }));
    players = coverDebt(players, playerId);
    return advanceTurn(logState({ ...state, players, lastEvent: { label, amount, icon, playerId, at: Date.now() } }, `${player.name}: ${label} ${amount >= 0 ? "+" : ""}${money(amount)}.`));
  }
  if (space.type === "life") return advanceTurn(awardLifeTile(state, playerId, space.label));
  if (space.type === "career") {
    const amount = 20000;
    let recipient = state.players.find((entry) => entry.id !== playerId && entry.career?.id === player.career?.id && entry.status !== "retired");
    let players = updatePlayer(state.players, playerId, (current) => ({ ...current, cash: current.cash - amount }));
    if (recipient) players = updatePlayer(players, recipient.id, (current) => ({ ...current, cash: current.cash + amount }));
    players = coverDebt(players, playerId);
    return advanceTurn(logState({ ...state, players }, `${player.name} pays ${money(amount)} in career costs${recipient ? ` to ${recipient.name}` : ""}.`));
  }
  if (space.type === "tax") {
    const tax = Math.round((player.career?.salary || 50000) * 0.2 / 10000) * 10000;
    let players = updatePlayer(state.players, playerId, (current) => ({ ...current, cash: current.cash - tax }));
    players = coverDebt(players, playerId);
    return advanceTurn(logState({ ...state, players }, `${player.name} pays ${money(tax)} in taxes.`));
  }
  if (space.type === "marriage") {
    let next = { ...state, players: updatePlayer(state.players, playerId, (current) => ({ ...current, spouse: true })) };
    next = awardLifeTile(next, playerId, "for getting married");
    return logState(next, `${player.name} gets married and spins again!`);
  }
  if (space.type === "baby" || space.type === "twins") {
    const babies = space.type === "twins" ? 2 : 1;
    let next = { ...state, players: updatePlayer(state.players, playerId, (current) => ({ ...current, children: current.children + babies })) };
    next = awardLifeTile(next, playerId, space.type === "twins" ? "for welcoming twins" : "for welcoming a baby");
    return advanceTurn(logState(next, `${player.name} welcomes ${babies === 2 ? "twins" : "a baby"}!`));
  }
  if (space.type === "house") {
    const house = HOUSES[Math.floor(Math.random() * HOUSES.length)];
    let players = updatePlayer(state.players, playerId, (current) => ({ ...current, house, cash: current.cash - house.price }));
    players = coverDebt(players, playerId);
    return logState({ ...state, players, lastEvent: { label: `Bought the ${house.name}`, amount: -house.price, icon: house.icon, playerId, at: Date.now() } }, `${player.name} buys the ${house.name} for ${money(house.price)} and spins again.`);
  }
  if (space.type === "night-school" || space.type === "career-change") {
    const options = randomCareers(player.college, 2);
    return { ...logState(state, `${player.name} explores a new career.`), pending: { type: "career", playerId, options, reason: "Choose a new career" } };
  }
  if (space.type === "retire") {
    let players = updatePlayer(state.players, playerId, (current) => ({ ...current, cash: current.cash - current.loans * 25000, loans: 0 }));
    return { ...logState({ ...state, players }, `${player.name} reaches retirement and repays all loans.`), pending: { type: "retirement", playerId } };
  }
  return advanceTurn(state);
}

function collectPassedPaydays(state, playerId, from, to) {
  const count = BOARD.filter((space) => space.index > from && space.index <= to && space.type === "payday").length;
  if (!count) return state;
  const player = state.players.find((entry) => entry.id === playerId);
  const salary = player.career?.salary || (player.path === "college" ? 0 : 50000);
  if (!salary) return state;
  return logState({ ...state, players: updatePlayer(state.players, playerId, (current) => ({ ...current, cash: current.cash + salary * count })) }, `${player.name} collects ${count > 1 ? `${count} paydays: ` : "a payday: "}${money(salary * count)}.`);
}

function payInvestments(state, spin) {
  const winners = state.players.filter((player) => player.investment === spin);
  if (!winners.length) return state;
  const players = state.players.map((player) => winners.some((winner) => winner.id === player.id) ? { ...player, cash: player.cash + 10000 } : player);
  return logState({ ...state, players }, `${winners.map((player) => player.name).join(" and ")} collect ${money(10000)} from investment ${spin}.`);
}

function policeFine(state, playerId, spin) {
  if (spin !== 10) return state;
  const officer = state.players.find((player) => player.id !== playerId && player.career?.id === "police" && player.status !== "retired");
  if (!officer) return state;
  let players = updatePlayer(state.players, playerId, (player) => ({ ...player, cash: player.cash - 5000 }));
  players = updatePlayer(players, officer.id, (player) => ({ ...player, cash: player.cash + 5000 }));
  players = coverDebt(players, playerId);
  return logState({ ...state, players }, `${officer.name} catches a speeder and collects ${money(5000)}.`);
}

function awardLifeTile(state, playerId, reason) {
  let pool = [...state.lifeTilePool];
  let value = pool.shift();
  if (value == null) {
    const donor = state.players.find((player) => player.id !== playerId && player.lifeTiles.length && player.retirement !== "countryside");
    if (donor) {
      value = donor.lifeTiles[donor.lifeTiles.length - 1];
      state = { ...state, players: updatePlayer(state.players, donor.id, (player) => ({ ...player, lifeTiles: player.lifeTiles.slice(0, -1) })) };
    }
  }
  if (value == null) return state;
  return logState({ ...state, lifeTilePool: pool, players: updatePlayer(state.players, playerId, (player) => ({ ...player, lifeTiles: [...player.lifeTiles, value] })) }, `${state.players.find((player) => player.id === playerId).name} earns a LIFE tile ${reason}.`);
}

function advanceTurn(state) {
  if (state.phase !== "playing" || state.pending) return state;
  let index = state.currentPlayerIndex;
  for (let count = 0; count < state.players.length; count += 1) {
    index = (index + 1) % state.players.length;
    if (state.players[index].status !== "retired") break;
  }
  const nextPlayer = state.players[index];
  if (nextPlayer.status === "choosing-path") {
    return { ...state, currentPlayerIndex: index, pending: { type: "path", playerId: nextPlayer.id } };
  }
  return { ...state, currentPlayerIndex: index, pending: null };
}

function finishGame(state) {
  let players = state.players;
  const millionaires = players.filter((player) => player.retirement === "millionaire");
  if (millionaires.length) {
    const richest = Math.max(...millionaires.map((player) => player.cash + (player.house?.value || 0)));
    const bonusWinners = millionaires.filter((player) => player.cash + (player.house?.value || 0) === richest);
    const bonuses = [...state.millionaireBonus];
    players = players.map((player) => {
      const winnerIndex = bonusWinners.findIndex((winner) => winner.id === player.id);
      if (winnerIndex < 0) return player;
      const tiles = bonuses.filter((_, index) => index % bonusWinners.length === winnerIndex);
      return { ...player, lifeTiles: [...player.lifeTiles, ...tiles] };
    });
  }
  const totals = players.map(playerNetWorth);
  const best = Math.max(...totals);
  const winnerIds = players.filter((player, index) => totals[index] === best).map((player) => player.id);
  return logState({ ...state, players, phase: "finished", winnerIds, pending: null }, `${players.filter((player) => winnerIds.includes(player.id)).map((player) => player.name).join(" and ")} win the game!`);
}

function buildLifeBoardLayout() {
  const points = Array.from({ length: blueprint.length });
  for (let anchorIndex = 0; anchorIndex < BOARD_ROUTE_ANCHORS.length - 1; anchorIndex += 1) {
    const [fromIndex, fromX, fromY] = BOARD_ROUTE_ANCHORS[anchorIndex];
    const [toIndex, toX, toY] = BOARD_ROUTE_ANCHORS[anchorIndex + 1];
    for (let index = fromIndex; index <= toIndex; index += 1) {
      const progress = (index - fromIndex) / (toIndex - fromIndex);
      points[index] = {
        x: fromX + (toX - fromX) * progress,
        y: fromY + (toY - fromY) * progress,
      };
    }
  }
  return points.map((point, index) => {
    const before = points[Math.max(0, index - 1)];
    const after = points[Math.min(points.length - 1, index + 1)];
    return { ...point, tilt: Math.atan2(after.y - before.y, after.x - before.x) * 180 / Math.PI };
  });
}

function makePlayer(player, index) {
  return { id: player.id, name: player.name, isComputer: Boolean(player.isComputer), color: PLAYER_COLORS[index], cash: 10000, loans: 0, position: 0, path: null, college: false, career: null, house: null, investment: null, spouse: false, children: 0, lifeTiles: [], retirement: null, status: "lobby" };
}

function randomCareers(allowDegree, count) {
  return shuffled(CAREERS.filter((career) => allowDegree || !career.degree)).slice(0, count);
}

function coverDebt(players, playerId) {
  return updatePlayer(players, playerId, (player) => {
    if (player.cash >= 0) return player;
    const loans = Math.ceil(Math.abs(player.cash) / 20000);
    return { ...player, cash: player.cash + loans * 20000, loans: player.loans + loans };
  });
}

function updatePlayer(players, playerId, updater) {
  return players.map((player) => player.id === playerId ? updater(player) : player);
}

function logState(state, line) {
  return { ...state, log: [line, ...(state.log || [])].slice(0, 60) };
}


export function money(value) {
  const sign = value < 0 ? "−" : "";
  return `${sign}$${Math.abs(value / 1000).toLocaleString()}K`;
}
