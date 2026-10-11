import {
  CATAN_RULESETS,
  cardTypesFor,
  getPortTradeRate,
  hasSeafarers,
  playProgressCard,
  pillageChosenCity,
  reconcileCatanAwards,
  resolveProgressCardChoice,
  resolveTradeResponse,
  usesDevelopmentCards,
} from "../components/catan-rules.js";
import { createCatanRuntime } from "../components/catan-runtime.js";
import {
  PLAYER_STYLES,
  COSTS,
  RESOURCES,
  boardForGame,
  canAfford,
  emptyResources,
  isSettlementLegal,
  isTransportLegal,
  totalResources,
} from "./catan-board.js";
import {
  activateKnightAt,
  advanceGameTurn,
  buildCityWall,
  buildKnight,
  buyDevelopmentCardFor,
  completeBuild,
  completeFreeTransport,
  computerHasAction,
  createGame,
  createLobby as createCatanLobby,
  discardProgressCardFor,
  improveCityTrack,
  isShipMovable,
  moveShip,
  placeStartingRoad,
  placeStartingSettlement,
  playDevelopmentCardFor,
  promoteKnightAt,
  resolveDevelopmentResourceChoice,
  resolveDiceRoll,
  resolveGoldChoice,
  resolvePirateMove,
  resolveRobberMove,
  resolveRobberSteal,
  selectRobberVictim,
  takeComputerAction,
} from "./catan-engine.js";

/**
 * Catan on the server.
 *
 * The rules in catan-engine.js and catan-rules.js used to run in the browser,
 * which also held the whole game: every hand, both card decks and the dice.
 * The engine functions check most of their own preconditions, but they never
 * asked *who* was acting, so this adapter adds the part the browser used to
 * do: the acting seat must hold the turn (or be the player a pending choice is
 * waiting on), no other choice may be pending, and a placement must be legal.
 *
 * Hidden from other seats: resource, development and progress cards, and
 * hidden victory points until the game is won. Hidden from everyone: both card
 * decks. Dice and the robber's steal are chosen here.
 */

export const CATAN_MAX_PLAYERS = 6;
export const CATAN_MIN_PLAYERS = 2;

const MAX_LOG = 24;

/** @param {unknown} name */
const cleanName = (name) => String(name || "").trim().replace(/\s+/g, " ").slice(0, 18) || "Player";

/** @param {any[]} players */
function freeStyle(players) {
  const used = new Set(players.map((player) => player.color));
  return PLAYER_STYLES.find((style) => !used.has(style.color)) ?? PLAYER_STYLES[0];
}

/**
 * @param {{ id: string, name?: string }} host
 * @param {string} roomCode
 */
export function createLobby(host, roomCode) {
  return createCatanLobby(roomCode, host.id, cleanName(host.name));
}

/**
 * @param {any} game
 * @param {{ id: string, name?: string }} player
 */
export function addPlayer(game, player) {
  if (game.phase !== "lobby" || game.players.length >= CATAN_MAX_PLAYERS || game.players.some((/** @type {any} */ item) => item.id === player.id)) return game;
  const name = cleanName(player.name);
  const next = { id: player.id, name, ...freeStyle(game.players), resources: emptyResources(), points: 0 };
  return { ...game, players: [...game.players, next], log: [`${name} joined the room.`, ...game.log].slice(0, MAX_LOG) };
}

/**
 * The payload for one seat. Other seats' cards and both decks come back as
 * counts; the stored game is untouched.
 * @param {any} game
 * @param {string} viewerId
 */
export function catanView(game, viewerId) {
  const view = {
    ...game,
    developmentDeck: [],
    developmentDeckCount: (game.developmentDeck || []).length,
    players: game.players.map((/** @type {any} */ player) => {
      if (player.id === viewerId) return player;
      return {
        ...player,
        resources: emptyResources(),
        resourceCount: totalResources(player.resources || {}),
        developmentCards: [],
        developmentCardCount: (player.developmentCards || []).length,
        progressCards: [],
        progressCardCount: (player.progressCards || []).length,
        hiddenVictoryPoints: game.winnerId ? player.hiddenVictoryPoints : 0,
      };
    }),
  };
  if (game.citiesKnights?.progressDecks) {
    view.citiesKnights = {
      ...game.citiesKnights,
      progressDecks: Object.fromEntries(Object.keys(game.citiesKnights.progressDecks).map((color) => [color, []])),
      progressDeckCounts: Object.fromEntries(Object.entries(game.citiesKnights.progressDecks).map(([color, deck]) => [color, /** @type {any[]} */ (deck).length])),
    };
  }
  return view;
}

const ANY_PENDING = ["pendingSeven", "pendingGold", "pendingTrade", "pendingDevelopment", "pendingProgress", "pendingCityLoss", "pendingProgressDiscard"];

/** @param {any} game @param {string[]} [except] */
const nothingPending = (game, except = []) => ANY_PENDING.every((key) => except.includes(key) || !game[key]);

/** @param {any} game @param {string} playerId */
const holdsTurn = (game, playerId) => game.phase === "playing" && !game.winnerId && game.players[game.currentPlayerIndex]?.id === playerId;

/** A normal turn action: the seat holds the turn, the dice are down, nothing is pending. */
/** @param {any} game @param {string} playerId */
const mainPhase = (game, playerId) => holdsTurn(game, playerId) && !game.setup && game.rolled && nothingPending(game);

/** @param {any} game @param {string} playerId */
const player = (game, playerId) => game.players.find((/** @type {any} */ item) => item.id === playerId);

/** @param {any} game @param {string} playerId @param {string} mode */
export function legalVertexIds(game, playerId, mode) {
  const board = boardForGame(game);
  if (mode === "knight") {
    return new Set(board.vertices.filter((/** @type {any} */ vertex) =>
      !game.settlements[vertex.id]
      && !game.citiesKnights?.knights?.[vertex.id]
      && board.vertexEdges[vertex.id].some((/** @type {string} */ edgeId) => game.roads[edgeId] === playerId || game.ships[edgeId] === playerId),
    ).map((/** @type {any} */ vertex) => vertex.id));
  }
  if (mode === "cityWall") {
    return new Set(Object.entries(game.settlements).filter(([vertexId, building]) =>
      /** @type {any} */ (building).playerId === playerId && /** @type {any} */ (building).type === "city" && !game.citiesKnights?.cityWalls?.[vertexId],
    ).map(([vertexId]) => vertexId));
  }
  if (mode !== "settlement") return new Set();
  const starting = Boolean(game.setup);
  return new Set(board.vertices
    .filter((/** @type {any} */ vertex) =>
      isSettlementLegal(board, vertex.id, game.settlements, !starting, playerId, game.roads, game.ships)
      && (!starting || !hasSeafarers(game) || vertex.tileIds.some((/** @type {number} */ tileId) => game.tiles[tileId]?.islandId === "main")))
    .map((/** @type {any} */ vertex) => vertex.id));
}

/** @param {any} game @param {string} playerId @param {string} kind @param {string} edgeId */
export function edgeIsLegal(game, playerId, kind, edgeId) {
  const board = boardForGame(game);
  const edge = board.edges.find((/** @type {any} */ candidate) => candidate.id === edgeId);
  if (!edge || !["road", "ship"].includes(kind)) return false;
  if (kind === "ship" && !hasSeafarers(game)) return false;
  if (game.setup && ![edge.from, edge.to].includes(game.setup.settlementVertexId)) return false;
  return isTransportLegal(board, edge, playerId, game.roads, game.ships, game.settlements, kind, game.tiles, game.pirateTileId, game.citiesKnights?.knights);
}

/** @param {any} game */
const withAwards = (game) => (game.phase === "playing" && game.board ? reconcileCatanAwards(game, boardForGame(game)) : game);

/**
 * Wrap an action so that anything that changed the game is run through the
 * award check, as the browser did after every update.
 * @param {(game: any, context: any) => any} act
 */
const settled = (act) => (/** @type {any} */ game, /** @type {any} */ context) => {
  const next = act(game, context);
  return next === game ? game : withAwards(next);
};

/** @param {unknown} value */
const text = (value) => String(value ?? "");

/** @param {any} game @param {string} playerId @param {string} resource */
function bankRate(game, playerId, resource) {
  const port = getPortTradeRate(game.ports, game.settlements, playerId, resource);
  const merchant = (game.citiesKnights?.merchant?.playerId === playerId && game.citiesKnights.merchant.resource === resource)
    || (game.citiesKnights?.merchantFleet?.playerId === playerId && game.citiesKnights.merchantFleet.cardType === resource);
  return Math.min(port, merchant ? 2 : 4);
}

/** @param {any} game @param {unknown} bundle */
function cleanBundle(game, bundle) {
  const out = emptyResources();
  const source = bundle && typeof bundle === "object" ? /** @type {any} */ (bundle) : {};
  for (const resource of cardTypesFor(game)) {
    const count = Number(source[resource] ?? 0);
    if (!Number.isInteger(count) || count < 0 || count > 19) return null;
    out[resource] = count;
  }
  return out;
}

/** @param {(game: any, context: any) => any} act */
const onMainPhase = (act) => settled((/** @type {any} */ game, /** @type {any} */ context) => (mainPhase(game, context.playerId) ? act(game, context) : game));

export const catanAdapter = {
  label: "Catan",
  createLobby,
  addPlayer,
  view: catanView,
  computerStep: (/** @type {any} */ game) => {
    if (game.phase !== "playing" || game.winnerId || !computerHasAction(game)) return game;
    const next = takeComputerAction(game);
    return next === game ? game : withAwards(next);
  },
  actions: {
    addComputer: {
      host: true,
      run: (/** @type {any} */ game) => {
        if (game.phase !== "lobby" || game.players.length >= CATAN_MAX_PLAYERS) return game;
        const number = game.players.filter((/** @type {any} */ item) => item.isComputer).length + 1;
        const computer = {
          id: `computer-${Date.now()}-${number}`,
          name: `Computer ${number}`,
          isComputer: true,
          ...freeStyle(game.players),
          resources: emptyResources(),
          points: 0,
        };
        return { ...game, players: [...game.players, computer], log: [`${computer.name} joined the room.`, ...game.log].slice(0, MAX_LOG) };
      },
    },
    removeComputer: {
      host: true,
      run: (/** @type {any} */ game, /** @type {any} */ { args }) => {
        const computer = game.players.find((/** @type {any} */ item) => item.id === text(args.playerId) && item.isComputer);
        if (game.phase !== "lobby" || !computer) return game;
        return { ...game, players: game.players.filter((/** @type {any} */ item) => item.id !== computer.id), log: [`${computer.name} left the room.`, ...game.log].slice(0, MAX_LOG) };
      },
    },
    color: {
      run: (/** @type {any} */ game, /** @type {any} */ { playerId, args }) => {
        const style = PLAYER_STYLES.find((candidate) => candidate.color === text(args.color));
        if (game.phase !== "lobby" || !style || game.players.some((/** @type {any} */ item) => item.id !== playerId && item.color === style.color)) return game;
        return { ...game, players: game.players.map((/** @type {any} */ item) => (item.id === playerId ? { ...item, ...style } : item)) };
      },
    },
    setRuleset: {
      host: true,
      run: (/** @type {any} */ game, /** @type {any} */ { args }) => {
        const ruleset = text(args.ruleset);
        if (game.phase !== "lobby" || !Object.hasOwn(CATAN_RULESETS, ruleset) || game.ruleset === ruleset) return game;
        return { ...game, ruleset, log: [`${CATAN_RULESETS[ruleset].label} selected.`, ...game.log].slice(0, MAX_LOG) };
      },
    },
    start: {
      host: true,
      run: (/** @type {any} */ game) => (game.phase === "lobby" && game.players.length >= CATAN_MIN_PLAYERS ? createGame(game) : game),
    },
    restart: {
      host: true,
      run: (/** @type {any} */ game) => {
        if (game.phase === "lobby") return game;
        const lobby = createCatanLobby(game.roomCode, game.hostId, game.players[0].name);
        return {
          ...lobby,
          ruleset: game.ruleset,
          players: game.players.map((/** @type {any} */ item, /** @type {number} */ index) => ({
            id: item.id,
            name: item.name,
            isComputer: Boolean(item.isComputer),
            ...(PLAYER_STYLES.find((style) => style.color === item.color) ?? PLAYER_STYLES[index]),
            resources: emptyResources(),
            points: 0,
          })),
          createdAt: game.createdAt,
          log: ["The room is ready for another game."],
        };
      },
    },

    roll: {
      run: settled((/** @type {any} */ game, /** @type {any} */ { playerId, rng }) => {
        if (!holdsTurn(game, playerId) || game.setup || game.rolled || game.pairedTurn?.stage === "secondary" || !nothingPending(game)) return game;
        const { dieOne, dieTwo, eventDie } = createCatanRuntime(rng).rollDice(game);
        return resolveDiceRoll(game, dieOne, dieTwo, eventDie);
      }),
    },
    place: {
      run: settled((/** @type {any} */ game, /** @type {any} */ { playerId, args }) => {
        const kind = text(args.kind);
        const target = text(args.targetId);
        if (!holdsTurn(game, playerId)) return game;
        if (game.setup) {
          if (!nothingPending(game)) return game;
          if (game.setup.step === "settlement" && kind === "settlement") {
            return legalVertexIds(game, playerId, "settlement").has(target) ? placeStartingSettlement(game, playerId, target) : game;
          }
          if (game.setup.step === "road" && (kind === "road" || kind === "ship")) {
            return edgeIsLegal(game, playerId, kind, target) ? placeStartingRoad(game, playerId, target, kind) : game;
          }
          return game;
        }
        const me = player(game, playerId);
        if (game.pendingDevelopment?.type === "roadBuilding") {
          if (!nothingPending(game, ["pendingDevelopment"]) || !edgeIsLegal(game, playerId, kind, target)) return game;
          return completeFreeTransport(game, playerId, target, kind);
        }
        if (!game.rolled || !nothingPending(game) || !me) return game;
        if (kind === "settlement") {
          return canAfford(me, COSTS.settlement) && legalVertexIds(game, playerId, "settlement").has(target) ? completeBuild(game, playerId, "settlement", target) : game;
        }
        if (kind === "city") {
          const building = game.settlements[target];
          return building?.playerId === playerId && building.type === "settlement" && canAfford(me, COSTS.city) ? completeBuild(game, playerId, "city", target) : game;
        }
        if (kind === "road" || kind === "ship") {
          return canAfford(me, COSTS[kind]) && edgeIsLegal(game, playerId, kind, target) ? completeBuild(game, playerId, kind, target) : game;
        }
        if (kind === "knight") {
          return canAfford(me, COSTS.knight) && legalVertexIds(game, playerId, "knight").has(target) ? buildKnight(game, playerId, target) : game;
        }
        if (kind === "cityWall") {
          return canAfford(me, COSTS.cityWall) && legalVertexIds(game, playerId, "cityWall").has(target) ? buildCityWall(game, playerId, target) : game;
        }
        return game;
      }),
    },
    moveShip: {
      run: onMainPhase((/** @type {any} */ game, /** @type {any} */ { playerId, args }) =>
        hasSeafarers(game) ? moveShip(game, playerId, text(args.from), text(args.to)) : game),
    },
    chooseCity: {
      run: settled((/** @type {any} */ game, /** @type {any} */ { playerId, args }) => pillageChosenCity(game, playerId, text(args.vertexId))),
    },
    bankTrade: {
      run: onMainPhase((/** @type {any} */ game, /** @type {any} */ { playerId, args }) => {
        const give = text(args.give);
        const get = text(args.get);
        const me = player(game, playerId);
        const types = cardTypesFor(game);
        if (!me || give === get || !types.includes(give) || !types.includes(get)) return game;
        const rate = bankRate(game, playerId, give);
        if (me.resources[give] < rate) return game;
        const label = (/** @type {string} */ resource) => resource;
        return {
          ...game,
          players: game.players.map((/** @type {any} */ item) => item.id !== playerId ? item : {
            ...item,
            resources: { ...item.resources, [give]: item.resources[give] - rate, [get]: item.resources[get] + 1 },
          }),
          log: [`${me.name} used a ${rate}:1 ${rate < 4 ? "port" : "bank"} trade: ${label(give)} for ${label(get)}.`, ...game.log].slice(0, MAX_LOG),
        };
      }),
    },
    proposeTrade: {
      run: onMainPhase((/** @type {any} */ game, /** @type {any} */ { playerId, args }) => {
        if (game.pairedTurn?.stage === "secondary") return game;
        const me = player(game, playerId);
        const offer = cleanBundle(game, args.offer);
        const request = cleanBundle(game, args.request);
        if (!me || !offer || !request || totalResources(offer) === 0 || totalResources(request) === 0) return game;
        if (!cardTypesFor(game).every((resource) => offer[resource] <= me.resources[resource])) return game;
        const partnerId = args.partnerId ? text(args.partnerId) : null;
        const partner = partnerId ? player(game, partnerId) : null;
        if (partnerId && (!partner || partner.id === playerId)) return game;
        return {
          ...game,
          pendingTrade: { fromPlayerId: playerId, toPlayerId: partner ? partner.id : null, offer, request, declinedPlayerIds: [] },
          log: [`${me.name} offered ${partner ? partner.name : "any player"} a trade.`, ...game.log].slice(0, MAX_LOG),
        };
      }),
    },
    respondTrade: {
      run: settled((/** @type {any} */ game, /** @type {any} */ { playerId, args }) =>
        game.phase === "playing" && !game.winnerId && game.pendingTrade ? resolveTradeResponse(game, Boolean(args.accepted), playerId) : game),
    },
    buyDevelopment: {
      run: onMainPhase((/** @type {any} */ game, /** @type {any} */ { playerId }) =>
        usesDevelopmentCards(game) ? buyDevelopmentCardFor(game, playerId) : game),
    },
    playDevelopment: {
      run: settled((/** @type {any} */ game, /** @type {any} */ { playerId, args }) =>
        holdsTurn(game, playerId) && !game.setup && game.pairedTurn?.stage !== "secondary" && nothingPending(game)
          ? playDevelopmentCardFor(game, playerId, text(args.cardId))
          : game),
    },
    playProgress: {
      run: settled((/** @type {any} */ game, /** @type {any} */ { playerId, args }) =>
        holdsTurn(game, playerId) && !game.setup && game.pairedTurn?.stage !== "secondary" && nothingPending(game)
          ? playProgressCard(game, playerId, text(args.cardId), boardForGame(game))
          : game),
    },
    chooseProgress: {
      run: settled((/** @type {any} */ game, /** @type {any} */ { playerId, args }) =>
        game.phase === "playing" && !game.winnerId ? resolveProgressCardChoice(game, playerId, args.choice, boardForGame(game)) : game),
    },
    chooseDevelopmentResource: {
      run: settled((/** @type {any} */ game, /** @type {any} */ { playerId, args }) =>
        holdsTurn(game, playerId) ? resolveDevelopmentResourceChoice(game, playerId, text(args.resource)) : game),
    },
    endTurn: {
      run: settled((/** @type {any} */ game, /** @type {any} */ { playerId }) =>
        holdsTurn(game, playerId) && !game.setup && game.rolled && nothingPending(game) ? advanceGameTurn(game) : game),
    },
    discard: {
      run: settled((/** @type {any} */ game, /** @type {any} */ { playerId, args }) => {
        const pending = game.pendingSeven;
        if (game.phase !== "playing" || game.winnerId || pending?.phase !== "discard" || pending.remainingDiscardPlayerIds[0] !== playerId) return game;
        const me = player(game, playerId);
        const selection = cleanBundle(game, args.resources);
        const required = pending.discardCounts[playerId];
        if (!me || !selection || totalResources(selection) !== required) return game;
        if (!cardTypesFor(game).every((resource) => selection[resource] <= me.resources[resource])) return game;
        const remaining = pending.remainingDiscardPlayerIds.slice(1);
        const phase = remaining.length ? "discard" : pending.afterDiscardPhase;
        const roller = game.players[game.currentPlayerIndex];
        return {
          ...game,
          players: game.players.map((/** @type {any} */ item) => {
            if (item.id !== playerId) return item;
            const resources = { ...item.resources };
            cardTypesFor(game).forEach((resource) => { resources[resource] -= selection[resource]; });
            return { ...item, resources };
          }),
          pendingSeven: phase ? { ...pending, phase, remainingDiscardPlayerIds: remaining } : null,
          log: [
            `${me.name} discarded ${required} card${required === 1 ? "" : "s"}.${phase && phase !== "discard" ? ` ${roller.name} must now move the ${phase === "chooseToken" ? "robber or pirate" : "robber"}.` : ""}`,
            ...game.log,
          ].slice(0, MAX_LOG),
        };
      }),
    },
    moveRobber: {
      run: settled((/** @type {any} */ game, /** @type {any} */ { playerId, args }) => {
        const tileId = Number(args.tileId);
        return holdsTurn(game, playerId) && game.pendingSeven?.phase === "moveRobber" && Number.isInteger(tileId) && game.tiles[tileId] && tileId !== game.robberTileId
          ? resolveRobberMove(game, tileId)
          : game;
      }),
    },
    chooseToken: {
      run: settled((/** @type {any} */ game, /** @type {any} */ { playerId, args }) => {
        const token = text(args.token);
        if (!holdsTurn(game, playerId) || game.pendingSeven?.phase !== "chooseToken" || !["robber", "pirate"].includes(token)) return game;
        return { ...game, pendingSeven: { ...game.pendingSeven, phase: token === "pirate" ? "movePirate" : "moveRobber" } };
      }),
    },
    movePirate: {
      run: settled((/** @type {any} */ game, /** @type {any} */ { playerId, args }) => {
        const tileId = Number(args.tileId);
        return holdsTurn(game, playerId) && game.pendingSeven?.phase === "movePirate" && Number.isInteger(tileId) && game.tiles[tileId] && tileId !== game.pirateTileId
          ? resolvePirateMove(game, tileId)
          : game;
      }),
    },
    chooseVictim: {
      run: settled((/** @type {any} */ game, /** @type {any} */ { playerId, args }) =>
        holdsTurn(game, playerId) && game.pendingSeven?.phase === "chooseVictim" ? selectRobberVictim(game, text(args.playerId)) : game),
    },
    steal: {
      // The thief picks a face-down card; the server decides which one it is.
      run: settled((/** @type {any} */ game, /** @type {any} */ { playerId }) =>
        holdsTurn(game, playerId) && game.pendingSeven?.phase === "chooseCard" ? resolveRobberSteal(game, 0) : game),
    },
    chooseGold: {
      run: settled((/** @type {any} */ game, /** @type {any} */ { playerId, args }) =>
        game.phase === "playing" && !game.winnerId && RESOURCES.includes(text(args.resource)) ? resolveGoldChoice(game, playerId, text(args.resource)) : game),
    },
    activateKnight: {
      run: onMainPhase((/** @type {any} */ game, /** @type {any} */ { playerId, args }) => activateKnightAt(game, playerId, text(args.vertexId))),
    },
    promoteKnight: {
      run: onMainPhase((/** @type {any} */ game, /** @type {any} */ { playerId, args }) => promoteKnightAt(game, playerId, text(args.vertexId))),
    },
    discardProgress: {
      run: settled((/** @type {any} */ game, /** @type {any} */ { playerId, args }) =>
        game.phase === "playing" && !game.winnerId ? discardProgressCardFor(game, playerId, text(args.cardId)) : game),
    },
    improveCity: {
      run: onMainPhase((/** @type {any} */ game, /** @type {any} */ { playerId, args }) => improveCityTrack(game, playerId, text(args.track))),
    },
  },
};
