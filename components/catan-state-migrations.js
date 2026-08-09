import { PROGRESS_DECKS } from "./catan-rules.js";

export const CATAN_ROOM_STATE_VERSION = 1;

export function migrateCatanRoomState(state, now = Date.now()) {
  const board = state.board
    ? {
        ...state.board,
        viewBoxHeight: state.boardVariant === "expanded"
          ? Math.max(780, Number(state.board.viewBoxHeight) || 0)
          : Number(state.board.viewBoxHeight) || 680,
      }
    : null;
  return {
    ...state,
    roomStateVersion: CATAN_ROOM_STATE_VERSION,
    cardAcquisitionVersion: 2,
    phase: state.phase ?? "lobby",
    ruleset: state.ruleset ?? "original",
    victoryTarget: state.victoryTarget ?? (state.ruleset === "cities-knights" ? 13 : state.ruleset === "seafarers" ? 14 : state.ruleset === "combined" ? 16 : 10),
    updatedAt: Number(state.updatedAt) || now,
    pendingSeven: state.pendingSeven ?? null,
    pendingGold: state.pendingGold ?? null,
    pendingTrade: state.pendingTrade
      ? { ...state.pendingTrade, declinedPlayerIds: state.pendingTrade.declinedPlayerIds ?? [] }
      : null,
    pendingDevelopment: state.pendingDevelopment ?? null,
    pendingProgress: state.pendingProgress ?? null,
    pendingCityLoss: state.pendingCityLoss ?? null,
    pendingProgressDiscard: state.pendingProgressDiscard ?? null,
    pairedTurn: state.pairedTurn ?? null,
    ports: state.ports ?? [],
    ships: state.ships ?? {},
    pirateTileId: state.pirateTileId ?? null,
    movedShipThisTurn: state.movedShipThisTurn ?? false,
    builtShipsThisTurn: state.builtShipsThisTurn ?? [],
    developmentDeck: state.developmentDeck ?? [],
    developmentCardPlayedThisTurn: state.developmentCardPlayedThisTurn ?? false,
    longestRoadPlayerId: state.longestRoadPlayerId ?? null,
    longestRouteLengths: state.longestRouteLengths ?? {},
    largestArmyPlayerId: state.largestArmyPlayerId ?? null,
    barbarianAlert: state.barbarianAlert ?? null,
    robberInactiveTileId: state.robberInactiveTileId ?? null,
    citiesKnights: state.citiesKnights
      ? {
          ...state.citiesKnights,
          attacks: state.citiesKnights.attacks ?? 0,
          knights: state.citiesKnights.knights ?? {},
          cityWalls: state.citiesKnights.cityWalls ?? {},
          promotedKnightIdsThisTurn: state.citiesKnights.promotedKnightIdsThisTurn ?? [],
          progressDecks: Object.fromEntries(Object.entries(PROGRESS_DECKS).map(([color, deck]) => [color, state.citiesKnights.progressDecks?.[color] ?? [...deck]])),
          cranePlayerIds: state.citiesKnights.cranePlayerIds ?? [],
          merchant: state.citiesKnights.merchant ?? null,
          merchantFleet: state.citiesKnights.merchantFleet ?? null,
          alchemyDice: state.citiesKnights.alchemyDice ?? null,
          improvements: Object.fromEntries((state.players ?? []).map((player) => [player.id, { trade: 0, politics: 0, science: 0, ...(state.citiesKnights.improvements?.[player.id] ?? {}) }])),
          metropolises: { trade: null, politics: null, science: null, ...(state.citiesKnights.metropolises ?? {}) },
        }
      : null,
    board,
    boardVariant: state.boardVariant ?? null,
    players: (state.players ?? []).map((player) => {
      const developmentCards = player.developmentCards ?? [];
      const legacyHeldVictoryPoints = developmentCards.filter((card) => card.type === "victoryPoint").length;
      return {
        ...player,
        isComputer: Boolean(player.isComputer),
        resources: { wood: 0, brick: 0, sheep: 0, wheat: 0, ore: 0, paper: 0, cloth: 0, coin: 0, ...(player.resources ?? {}) },
        settledIslandIds: player.settledIslandIds ?? [],
        defenderPoints: player.defenderPoints ?? 0,
        hiddenVictoryPoints: state.cardAcquisitionVersion >= 2
          ? player.hiddenVictoryPoints ?? 0
          : Math.max(0, (player.hiddenVictoryPoints ?? 0) - legacyHeldVictoryPoints),
        developmentCards,
        playedKnights: player.playedKnights ?? 0,
        progressCards: (player.progressCards ?? []).map((card) => ({ ...card, drawnTurn: card.drawnTurn ?? -1 })),
        progressVictoryPoints: player.progressVictoryPoints ?? 0,
      };
    }),
  };
}
