"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { shuffled } from "../lib/shuffle.js";
import { ChoiceModal, GameHeader, Hero, Landing, Lobby, Results } from "./ui/table-shell";
import {
  ArrowRightLeft,
  Anchor,
  Castle,
  Check,
  Crown,
  Dice5,
  Home,
  Map as MapIcon,
  Shield,
  Play,
  RefreshCcw,
  Route,
  Sparkles,
  Trophy,
  Users,
  X,
} from "lucide-react";
import { RESOURCE_INFO, SQRT3, BOARD_CENTER, HEX_SIZE, RESOURCES, PLAYER_STYLES, COSTS, axialTiles, centerFor, cornersFor, geometry, baseTileSpecs, expandedCenter, expandedHexSize, expandedTileSpecs, BASE_BOARD, EXPANDED_BOARD, seafarersAxials, seafarersCenter, seafarersHexSize, SEAFARERS_BOARD, axialDistance, FOREIGN_ISLANDS, boardForPlayerCount, boardForGame, createPorts, createSeafarersPorts, midpointForEdge, emptyResources, totalResources, canAfford, payCost, isSettlementLegal, edgeTouchesTerrain, isTransportLegal } from "../lib/catan-board.js";
import { createGame, createLobby, placeStartingSettlement, placeStartingRoad, isShipMovable, moveShip, resolveDiceRoll, advanceGameTurn, buyDevelopmentCardFor, playDevelopmentCardFor, completeFreeTransport, resolveDevelopmentResourceChoice, completeBuild, resolveRobberMove, selectRobberVictim, resolveRobberSteal, resolvePirateMove, resolveGoldChoice, awardProgressCards, discardProgressCardFor, computerHasAction, discardForComputer, bestComputerRobberTile, takeComputerAction, advanceBarbarians, buildKnight, promoteKnightAt, activateKnightAt, buildCityWall, improveCityTrack } from "../lib/catan-engine.js";
import { CatanRoomService } from "./catan-room-service";
import { catanRuntime } from "./catan-runtime";
import {
  chooseBestCatanEdge,
  chooseBestCatanVertex,
  chooseCatanDiscards,
  chooseCatanPirateTile,
  chooseCatanResource,
  chooseCatanRobberTile,
  computerAcceptsCatanTrade,
  scoreCatanVertex,
} from "./catan-computer-strategy";
import {
  ALL_CARD_TYPES,
  advancePairedTurn,
  cardTypesFor,
  CATAN_RULESETS,
  canProvideTradeResources,
  canPromoteKnight,
  cityProduction,
  COMMODITY_TYPES,
  createCitiesKnightsState,
  createPairedTurn,
  DEVELOPMENT_CARD_INFO,
  DEVELOPMENT_DECK,
  eligiblePirateVictimIds,
  getPortTradeRate,
  handLimitFor,
  hasCitiesKnights,
  hasSeafarers,
  numberDeckForPlayers,
  normalizeRuleset,
  portTypesForPlayers,
  pillageChosenCity,
  playProgressCard,
  PROGRESS_CARD_INFO,
  PROGRESS_DECKS,
  progressCardEligible,
  reconcileCatanAwards,
  RESOURCE_TYPES,
  resolveBarbarianAttack,
  resolveProgressCardChoice,
  resolveTradeResponse,
  SEAFARERS_FOREIGN_TERRAIN_DECK,
  startingBuildingType,
  terrainDeckForPlayers,
  totalVictoryPoints,
  usesExpandedBoard,
  usesDevelopmentCards,
  victoryTargetFor,
} from "./catan-rules";

const playerNameStorageKey = "catan-player-name";

export default function CatanClient() {
  const [isReady, setIsReady] = useState(false);
  const [name, setName] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [game, setGame] = useState(null);
  const [error, setError] = useState("");
  const [showRules, setShowRules] = useState(false);
  const [isRolling, setIsRolling] = useState(false);
  const [buildMode, setBuildMode] = useState(null);
  const [tradeGive, setTradeGive] = useState("wood");
  const [tradeGet, setTradeGet] = useState("brick");
  const [discardSelection, setDiscardSelection] = useState(emptyResources);
  const [tradePartnerId, setTradePartnerId] = useState("any");
  const [playerTradeOffer, setPlayerTradeOffer] = useState(emptyResources);
  const [playerTradeRequest, setPlayerTradeRequest] = useState(emptyResources);
  const [shipMoveSource, setShipMoveSource] = useState(null);
  const [barbarianNotice, setBarbarianNotice] = useState(null);
  const latestGame = useRef(null);
  // The server tells each browser which seat it holds.
  const playerId = game?.viewerId || "";

  useEffect(() => {
    setName(localStorage.getItem(playerNameStorageKey) || "");
    setJoinCode(new URLSearchParams(window.location.search).get("room")?.toUpperCase() || "");
    setIsReady(true);
  }, []);

  useEffect(() => {
    latestGame.current = game;
  }, [game]);

  useEffect(() => {
    if (!game?.barbarianAlert?.id) return undefined;
    const age = Date.now() - (game.barbarianAlert.createdAt ?? Date.now());
    if (age >= 3000) {
      setBarbarianNotice(null);
      return undefined;
    }
    setBarbarianNotice(game.barbarianAlert);
    const timeoutId = window.setTimeout(() => setBarbarianNotice(null), 3000);
    return () => {
      window.clearTimeout(timeoutId);
      setBarbarianNotice(null);
    };
  }, [game?.barbarianAlert?.id]);

  useEffect(() => {
    const code = joinCode.trim().toUpperCase();
    if (!isReady || !code || game || !CatanRoomService.hasSeat(code)) return undefined;
    let cancelled = false;
    void CatanRoomService.load(code).then((existing) => {
      if (cancelled || !existing) return;
      setGame(existing);
      latestGame.current = existing;
      const me = existing.players.find((player) => player.id === existing.viewerId);
      if (me) setName(me.name);
      window.history.replaceState(null, "", `?room=${existing.roomCode}`);
    }).catch(() => undefined);
    return () => { cancelled = true; };
  }, [game, isReady, joinCode]);

  useEffect(() => {
    if (!game?.roomCode) return undefined;
    return CatanRoomService.subscribe(game.roomCode, (remote) => {
      setGame((current) => {
        const next = !current || remote.updatedAt >= current.updatedAt ? remote : current;
        latestGame.current = next;
        return next;
      });
    });
  }, [game?.roomCode]);

  const activePlayer = game?.players[game.currentPlayerIndex];
  const board = boardForGame(game);
  const discardingPlayerId = game?.pendingSeven?.phase === "discard"
    ? game.pendingSeven.remainingDiscardPlayerIds[0]
    : null;
  const discardingPlayer = game?.players.find((player) => player.id === discardingPlayerId);
  const viewerPlayer = game?.players.find((player) => player.id === playerId);
  const cityLossPlayer = game?.players.find((player) => player.id === game?.pendingCityLoss?.currentPlayerId);
  const progressDiscardPlayer = game?.players.find((player) => player.id === game?.pendingProgressDiscard?.currentPlayerId);
  const tradePartners = game?.players.filter((player) => player.id !== activePlayer?.id) ?? [];
  const tradePartner = tradePartnerId === "any"
    ? null
    : tradePartners.find((player) => player.id === tradePartnerId) ?? tradePartners[0];
  const placementMode = game?.pendingDevelopment?.fixedKind
    ?? (game?.setup?.step === "road" && hasSeafarers(game)
      ? buildMode ?? "road"
      : game?.setup?.step ?? buildMode);
  const isHost = game?.hostId === playerId;
  const isMyTurn = activePlayer?.id === playerId;
  const isPairedSecondary = game?.pairedTurn?.stage === "secondary";
  const portTradeRate = game && activePlayer
    ? getPortTradeRate(game.ports, game.settlements, activePlayer.id, tradeGive)
    : 4;
  const progressTradeRate = game && activePlayer && (
    (game.citiesKnights?.merchant?.playerId === activePlayer.id && game.citiesKnights.merchant.resource === tradeGive)
    || (game.citiesKnights?.merchantFleet?.playerId === activePlayer.id && game.citiesKnights.merchantFleet.cardType === tradeGive)
  ) ? 2 : 4;
  const bankTradeRate = Math.min(portTradeRate, progressTradeRate);
  const activePlayerPorts = game?.ports?.filter((port) =>
    [port.from, port.to].some((vertexId) => game.settlements[vertexId]?.playerId === activePlayer?.id),
  ) ?? [];
  const canPlaceStartingShip = Boolean(game?.setup?.settlementVertexId && hasSeafarers(game) && board.vertexEdges[game.setup.settlementVertexId].some((edgeId) => {
    const edge = board.edges.find((candidate) => candidate.id === edgeId);
    return isTransportLegal(board, edge, activePlayer?.id, game.roads, game.ships, game.settlements, "ship", game.tiles, game.pirateTileId, game.citiesKnights?.knights);
  }));
  const legalVertices = useMemo(() => {
    if (game?.pendingCityLoss?.currentPlayerId === playerId) return new Set(game.pendingCityLoss.eligibleVertexIds);
    if (!game || !activePlayer || !isMyTurn) return new Set();
    if (placementMode === "knight") {
      return new Set(board.vertices.filter((vertex) =>
        !game.settlements[vertex.id]
        && !game.citiesKnights?.knights?.[vertex.id]
        && board.vertexEdges[vertex.id].some((edgeId) => game.roads[edgeId] === activePlayer.id || game.ships[edgeId] === activePlayer.id),
      ).map((vertex) => vertex.id));
    }
    if (placementMode === "cityWall") {
      return new Set(Object.entries(game.settlements).filter(([vertexId, building]) =>
        building.playerId === activePlayer.id && building.type === "city" && !game.citiesKnights?.cityWalls?.[vertexId],
      ).map(([vertexId]) => vertexId));
    }
    if (placementMode !== "settlement") return new Set();
    const startingPlacement = Boolean(game.setup);
    return new Set(
      board.vertices
        .filter((vertex) =>
          isSettlementLegal(board, vertex.id, game.settlements, !startingPlacement, activePlayer.id, game.roads, game.ships)
          && (!startingPlacement || !hasSeafarers(game) || vertex.tileIds.some((tileId) => game.tiles[tileId]?.islandId === "main")),
        )
        .map((vertex) => vertex.id),
    );
  }, [activePlayer, board, game, isMyTurn, placementMode]);
  const legalEdges = useMemo(() => {
    if (!game || !activePlayer || !isMyTurn) return new Set();
    if (placementMode === "moveShipSource") {
      return new Set(board.edges.filter((edge) => isShipMovable(game, edge, activePlayer.id)).map((edge) => edge.id));
    }
    if (placementMode === "moveShip" && shipMoveSource) {
      const ships = { ...game.ships };
      delete ships[shipMoveSource];
      return new Set(board.edges.filter((edge) => isTransportLegal(board, edge, activePlayer.id, game.roads, ships, game.settlements, "ship", game.tiles, game.pirateTileId, game.citiesKnights?.knights)).map((edge) => edge.id));
    }
    if (!["road", "ship"].includes(placementMode)) return new Set();
    if (game.setup) {
      return new Set(
        board.edges
          .filter((edge) =>
            [edge.from, edge.to].includes(game.setup.settlementVertexId)
            && isTransportLegal(board, edge, activePlayer.id, game.roads, game.ships, game.settlements, placementMode, game.tiles, game.pirateTileId, game.citiesKnights?.knights),
          )
          .map((edge) => edge.id),
      );
    }
    return new Set(
      board.edges
        .filter((edge) => isTransportLegal(board, edge, activePlayer.id, game.roads, game.ships, game.settlements, placementMode, game.tiles, game.pirateTileId, game.citiesKnights?.knights))
        .map((edge) => edge.id),
    );
  }, [activePlayer, board, game, isMyTurn, placementMode, shipMoveSource]);

  const resetLocalControls = () => {
    setBuildMode(null);
    setDiscardSelection(emptyResources());
    setPlayerTradeOffer(emptyResources());
    setPlayerTradeRequest(emptyResources());
    setTradePartnerId("any");
    setShipMoveSource(null);
  };

  const usePlayerName = () => {
    const cleanName = name.trim() || "Player";
    localStorage.setItem(playerNameStorageKey, cleanName);
    setName(cleanName);
    return cleanName;
  };

  const adopt = (state) => {
    setGame(state);
    latestGame.current = state;
    window.history.replaceState(null, "", `?room=${state.roomCode}`);
    return state;
  };

  const act = async (action, args) => {
    const current = latestGame.current;
    if (!current) return null;
    try {
      const next = await CatanRoomService.action(current.roomCode, action, args);
      if (!next) return null;
      setGame(next);
      latestGame.current = next;
      return next;
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : "Could not save that action.");
      return null;
    }
  };

  const stepComputer = async () => {
    const current = latestGame.current;
    if (!current) return null;
    try {
      const next = await CatanRoomService.computerStep(current.roomCode);
      if (next) {
        setGame(next);
        latestGame.current = next;
      }
      return next;
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : "Could not advance the computer.");
      return null;
    }
  };

  const createRoom = async () => {
    setError("");
    try {
      adopt((await CatanRoomService.create(usePlayerName())).state);
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "Could not create a room.");
    }
  };

  const joinRoom = async () => {
    setError("");
    const code = joinCode.trim().toUpperCase();
    if (!code) return setError("Enter a room code first.");
    try {
      if (CatanRoomService.hasSeat(code)) {
        const existing = await CatanRoomService.load(code);
        if (!existing) return setError(`Room ${code} was not found.`);
        const returning = existing.players.find((player) => player.id === existing.viewerId);
        if (returning) setName(returning.name);
        adopt(existing);
        return;
      }
      adopt((await CatanRoomService.join(code, usePlayerName())).state);
    } catch (joinError) {
      setError(joinError instanceof Error ? joinError.message : "Could not join the room.");
    }
  };

  const startGame = () => {
    if (!game || !isHost || game.players.length < 2) return;
    void act("start");
    resetLocalControls();
    window.scrollTo(0, 0);
  };

  const selectPlayerColor = (color) => {
    if (!game || game.phase !== "lobby") return;
    void act("color", { color });
  };

  const selectRuleset = (ruleset) => {
    if (!game || !isHost || game.phase !== "lobby" || !CATAN_RULESETS[ruleset]) return;
    void act("setRuleset", { ruleset });
  };

  const addComputer = () => {
    if (!game || !isHost || game.phase !== "lobby" || game.players.length >= 6) return;
    void act("addComputer");
  };

  const removeComputer = (computerId) => {
    if (!game || !isHost || game.phase !== "lobby") return;
    void act("removeComputer", { playerId: computerId });
  };

  useEffect(() => {
    if (!isHost || !game || game.phase !== "playing" || game.winnerId || !computerHasAction(game)) return undefined;
    const timeoutId = window.setTimeout(() => {
      void stepComputer();
    }, 700);
    return () => window.clearTimeout(timeoutId);
  }, [game?.updatedAt, game?.phase, game?.winnerId, isHost]);

  const leaveRoom = () => {
    setGame(null);
    setJoinCode("");
    latestGame.current = null;
    resetLocalControls();
    window.history.replaceState(null, "", "/catan");
  };

  const restartRoom = () => {
    if (!game || !isHost) return;
    void act("restart");
    resetLocalControls();
  };

  const rollDice = () => {
    if (!game || !isMyTurn || isPairedSecondary || game.setup || game.pendingSeven || game.pendingGold || game.pendingDevelopment || game.pendingProgress || game.pendingCityLoss || game.pendingProgressDiscard || game.rolled || game.winnerId || isRolling) return;
    setIsRolling(true);
    setBuildMode(null);
    window.setTimeout(() => {
      void act("roll").finally(() => setIsRolling(false));
    }, 950);
  };

  const buildAtVertex = (vertexId) => {
    if (game?.pendingCityLoss?.currentPlayerId === playerId && legalVertices.has(vertexId)) {
      void act("chooseCity", { vertexId });
      return;
    }
    if (!game || !activePlayer || game.pendingSeven || game.pendingGold || game.pendingTrade || game.pendingDevelopment || game.pendingProgress || game.pendingCityLoss || game.pendingProgressDiscard || game.winnerId) return;
    if (game.setup?.step === "settlement") {
      if (!legalVertices.has(vertexId)) return;
      if (!isMyTurn) return;
      void act("place", { kind: "settlement", targetId: vertexId });
      return;
    }
    if (!game.rolled) return;
    if (buildMode === "settlement") {
      if (!legalVertices.has(vertexId) || !canAfford(activePlayer, COSTS.settlement)) return;
      if (!isMyTurn) return;
      void act("place", { kind: "settlement", targetId: vertexId });
      setBuildMode(null);
      return;
    }
    if (buildMode === "city") {
      const building = game.settlements[vertexId];
      if (building?.playerId !== activePlayer.id || building.type !== "settlement" || !canAfford(activePlayer, COSTS.city)) return;
      if (!isMyTurn) return;
      void act("place", { kind: "city", targetId: vertexId });
      setBuildMode(null);
      return;
    }
    if (buildMode === "knight" && legalVertices.has(vertexId) && canAfford(activePlayer, COSTS.knight)) {
      void act("place", { kind: "knight", targetId: vertexId });
      setBuildMode(null);
      return;
    }
    if (buildMode === "cityWall" && legalVertices.has(vertexId) && canAfford(activePlayer, COSTS.cityWall)) {
      void act("place", { kind: "cityWall", targetId: vertexId });
      setBuildMode(null);
    }
  };

  const buildRoad = (edgeId) => {
    const resolvingRoadBuilding = game?.pendingDevelopment?.type === "roadBuilding";
    if (!game || !activePlayer || game.pendingSeven || game.pendingGold || game.pendingTrade || game.pendingProgress || (game.pendingDevelopment && !resolvingRoadBuilding) || game.winnerId || !legalEdges.has(edgeId)) return;
    if (game.setup?.step === "road") {
      if (!isMyTurn) return;
      void act("place", { kind: placementMode, targetId: edgeId });
      return;
    }
    if (buildMode === "moveShipSource") {
      if (!isShipMovable(game, board.edges.find((edge) => edge.id === edgeId), activePlayer.id)) return;
      setShipMoveSource(edgeId);
      setBuildMode("moveShip");
      return;
    }
    if (buildMode === "moveShip" && shipMoveSource) {
      void act("moveShip", { from: shipMoveSource, to: edgeId });
      setShipMoveSource(null);
      setBuildMode(null);
      return;
    }
    if (resolvingRoadBuilding && ["road", "ship"].includes(buildMode)) {
      void act("place", { kind: buildMode, targetId: edgeId });
      if (game.pendingDevelopment.remaining === 1) setBuildMode(null);
      return;
    }
    if (!["road", "ship"].includes(buildMode) || !game.rolled) return;
    if (!canAfford(activePlayer, COSTS[buildMode])) return;
    if (!isMyTurn) return;
    void act("place", { kind: buildMode, targetId: edgeId });
    setBuildMode(null);
  };

  const bankTrade = () => {
    if (!game || !activePlayer || game.pendingSeven || game.pendingGold || game.pendingTrade || game.pendingDevelopment || game.pendingProgress || !game.rolled || tradeGive === tradeGet || activePlayer.resources[tradeGive] < bankTradeRate) return;
    if (!isMyTurn) return;
    void act("bankTrade", { give: tradeGive, get: tradeGet });
  };

  const adjustPlayerTrade = (side, resource, change) => {
    if (!game || !activePlayer || game.pendingTrade || game.pendingDevelopment || game.pendingProgress || !isMyTurn || isPairedSecondary) return;
    const setter = side === "offer" ? setPlayerTradeOffer : setPlayerTradeRequest;
    setter((current) => {
      const nextValue = current[resource] + change;
      const maximum = side === "offer" ? activePlayer.resources[resource] : 19;
      if (nextValue < 0 || nextValue > maximum) return current;
      return { ...current, [resource]: nextValue };
    });
  };

  const proposePlayerTrade = () => {
    if (!game?.rolled || game.pendingSeven || game.pendingGold || game.pendingTrade || game.pendingDevelopment || game.pendingProgress || !activePlayer || isPairedSecondary) return;
    const openOffer = tradePartnerId === "any";
    if (!openOffer && !tradePartner) return;
    if (totalResources(playerTradeOffer) === 0 || totalResources(playerTradeRequest) === 0) return;
    const validOffer = cardTypesFor(game).every((resource) => playerTradeOffer[resource] <= activePlayer.resources[resource]);
    if (!validOffer) return;
    if (!isMyTurn) return;
    void act("proposeTrade", {
      partnerId: openOffer ? null : tradePartner.id,
      offer: playerTradeOffer,
      request: playerTradeRequest,
    });
  };

  const respondToPlayerTrade = (accepted) => {
    if (!game?.pendingTrade) return;
    void act("respondTrade", { accepted });
    setPlayerTradeOffer(emptyResources());
    setPlayerTradeRequest(emptyResources());
  };

  const buyDevelopmentCard = () => {
    if (!game || !isMyTurn || !game.rolled || game.pendingSeven || game.pendingGold || game.pendingTrade || game.pendingDevelopment || game.pendingProgress || !usesDevelopmentCards(game) || !canAfford(activePlayer, COSTS.development) || !game.developmentDeck.length) return;
    void act("buyDevelopment");
  };

  const playDevelopmentCard = (cardId) => {
    if (!game || !isMyTurn || isPairedSecondary || game.setup || game.pendingSeven || game.pendingGold || game.pendingTrade || game.pendingDevelopment || game.pendingProgress || game.developmentCardPlayedThisTurn) return;
    const card = activePlayer.developmentCards.find((candidate) => candidate.id === cardId);
    if (!card || card.boughtTurn === game.turn) return;
    void act("playDevelopment", { cardId });
    if (card.type === "roadBuilding") setBuildMode("road");
  };

  const playColoredCard = (cardId) => {
    if (!game || !isMyTurn || isPairedSecondary || game.setup || game.pendingSeven || game.pendingGold || game.pendingTrade || game.pendingDevelopment || game.pendingProgress || game.pendingCityLoss || game.pendingProgressDiscard) return;
    const card = activePlayer.progressCards.find((candidate) => candidate.id === cardId);
    if (!card || (Number.isInteger(card.drawnTurn) && card.drawnTurn === game.turn)) return;
    void act("playProgress", { cardId });
    if (card.type === "roadBuildingProgress") setBuildMode("road");
  };

  const chooseProgressCardOption = (choice) => {
    if (!game?.pendingProgress || game.pendingProgress.chooserId !== playerId) return;
    if (game.pendingProgress.type === "diplomacy" && game.pendingProgress.playerId === playerId) {
      const ownerId = game.roads?.[choice] ?? game.ships?.[choice];
      if (ownerId === playerId) setBuildMode(game.roads?.[choice] ? "road" : "ship");
    }
    void act("chooseProgress", { choice });
  };

  const chooseDevelopmentResource = (resource) => {
    if (!game?.pendingDevelopment || !RESOURCES.includes(resource) || !isMyTurn) return;
    void act("chooseDevelopmentResource", { resource });
  };

  const endTurn = () => {
    if (!game?.rolled || game.pendingSeven || game.pendingGold || game.pendingTrade || game.pendingDevelopment || game.pendingProgress || game.pendingCityLoss || game.pendingProgressDiscard || game.winnerId) return;
    if (!isMyTurn) return;
    void act("endTurn");
    setBuildMode(null);
    setPlayerTradeOffer(emptyResources());
    setPlayerTradeRequest(emptyResources());
    setTradePartnerId("any");
    setShipMoveSource(null);
  };

  const adjustDiscard = (resource, change) => {
    if (!discardingPlayer || !game?.pendingSeven || game.pendingSeven.phase !== "discard") return;
    if (discardingPlayer.id !== playerId) return;
    const required = game.pendingSeven.discardCounts[discardingPlayer.id];
    setDiscardSelection((current) => {
      const selected = totalResources(current);
      const nextValue = current[resource] + change;
      if (nextValue < 0 || nextValue > discardingPlayer.resources[resource]) return current;
      if (change > 0 && selected >= required) return current;
      return { ...current, [resource]: nextValue };
    });
  };

  const confirmDiscard = () => {
    if (!discardingPlayer || !game?.pendingSeven || game.pendingSeven.phase !== "discard") return;
    const required = game.pendingSeven.discardCounts[discardingPlayer.id];
    if (totalResources(discardSelection) !== required) return;
    if (discardingPlayer.id !== playerId) return;
    void act("discard", { resources: discardSelection });
    setDiscardSelection(emptyResources());
  };

  const moveRobber = (tileId) => {
    if (!game?.pendingSeven || game.pendingSeven.phase !== "moveRobber" || tileId === game.robberTileId) return;
    if (!isMyTurn) return;
    void act("moveRobber", { tileId });
  };

  const chooseSevenToken = (token) => {
    if (!game?.pendingSeven || game.pendingSeven.phase !== "chooseToken" || !isMyTurn) return;
    void act("chooseToken", { token });
  };

  const movePirate = (tileId) => {
    if (!game?.pendingSeven || game.pendingSeven.phase !== "movePirate" || tileId === game.pirateTileId || !isMyTurn) return;
    void act("movePirate", { tileId });
  };

  const chooseRobberVictim = (playerId) => {
    if (!game?.pendingSeven || game.pendingSeven.phase !== "chooseVictim") return;
    if (!isMyTurn) return;
    void act("chooseVictim", { playerId });
  };

  const stealRobberCard = (cardIndex) => {
    if (!game?.pendingSeven || game.pendingSeven.phase !== "chooseCard") return;
    if (!isMyTurn) return;
    void act("steal");
  };

  const chooseGoldResource = (resource) => {
    if (!game?.pendingGold || !RESOURCES.includes(resource)) return;
    const claim = game.pendingGold.claims[0];
    if (claim?.playerId !== playerId) return;
    void act("chooseGold", { resource });
  };

  const activateKnight = (vertexId) => {
    if (!isMyTurn || !game?.rolled || game.pendingSeven || game.pendingGold || game.pendingTrade || game.pendingDevelopment || game.pendingProgress) return;
    void act("activateKnight", { vertexId });
  };

  const promoteKnight = (vertexId) => {
    if (!isMyTurn || !game?.rolled || game.pendingSeven || game.pendingGold || game.pendingTrade || game.pendingDevelopment || game.pendingProgress || game.pendingCityLoss || game.pendingProgressDiscard) return;
    void act("promoteKnight", { vertexId });
  };

  const discardProgressCard = (cardId) => {
    if (game?.pendingProgressDiscard?.currentPlayerId !== playerId) return;
    void act("discardProgress", { cardId });
  };

  const improveCity = (track) => {
    if (!isMyTurn || !game?.rolled || game.pendingSeven || game.pendingGold || game.pendingTrade || game.pendingDevelopment || game.pendingProgress) return;
    void act("improveCity", { track });
  };


  const rulesDialog = showRules && <RulesModal onClose={() => setShowRules(false)} />;

  if (!game) {
    return <Landing
      gameName="Catan"
      theme="tbl-light catan-theme"
      hero={<Hero
        kicker="The island awaits"
        title="CATAN"
        copy="Create a shared room for up to six settlers. Five- and six-player rooms use the expanded island and paired-player turns."
        badges={[{ icon: Users, label: "2–6 players" }, { icon: MapIcon, label: "Original, Seafarers, Cities & Knights" }, { icon: Crown, label: "Shared rooms" }]}
        artLayout="free"
        art={<div className="catan-mark"><span /><span /><span /></div>}
      />}
      entry={{ name, setName, joinCode, setJoinCode, createRoom, joinRoom, busy: false, error }}
      onRules={() => setShowRules(true)}
      dialogs={rulesDialog}
    />;
  }

  if (game.phase === "lobby") {
    return <Lobby
      gameName="Catan"
      theme="tbl-light catan-theme"
      room={game}
      me={{ id: playerId }}
      busy={false}
      error={error}
      min={2}
      max={6}
      seatNote={`${CATAN_RULESETS[game.ruleset ?? "original"].label} · ${CATAN_RULESETS[game.ruleset ?? "original"].victoryPoints} VP${game.players.length >= 5 ? " · 5–6 player paired turns" : ""}`}
      options={<>
        <div className="lobby-color-picker">
          <strong>Choose your color</strong>
          <div>
            {PLAYER_STYLES.map((style) => {
              const takenByAnother = game.players.some((player) => player.id !== playerId && player.color === style.color);
              const selected = viewerPlayer?.color === style.color;
              return (
                <button
                  type="button"
                  key={style.color}
                  className={`${style.color} ${selected ? "selected" : ""}`}
                  disabled={takenByAnother}
                  aria-label={`Choose ${style.color}`}
                  aria-pressed={selected}
                  onClick={() => selectPlayerColor(style.color)}
                >
                  <span style={{ background: style.hex }} />
                  {style.color}
                </button>
              );
            })}
          </div>
        </div>
        <div className="ruleset-picker">
          <div>
            <strong>Game rules</strong>
            <span>Host chooses · applies to every device</span>
          </div>
          <div className="ruleset-options">
            {Object.entries(CATAN_RULESETS).map(([ruleset, info]) => (
              <button
                type="button"
                key={ruleset}
                className={game.ruleset === ruleset ? "selected" : ""}
                disabled={!isHost}
                onClick={() => selectRuleset(ruleset)}
              >
                <span>{hasSeafarers(ruleset) ? <Anchor size={17} /> : <MapIcon size={17} />}</span>
                <strong>{info.shortLabel}</strong>
                <small>{info.description}</small>
                <b>{info.victoryPoints} VP</b>
              </button>
            ))}
          </div>
        </div>
      </>}
      onAdd={addComputer}
      onRemove={removeComputer}
      onStart={startGame}
      onLeave={leaveRoom}
      onRules={() => setShowRules(true)}
      rules={rulesDialog}
    />;
  }

  const winner = game.players.find((player) => player.id === game.winnerId);
  const longestRouteHolder = game.players.find((player) => player.id === game.longestRoadPlayerId);
  const largestArmyHolder = game.players.find((player) => player.id === game.largestArmyPlayerId);
  const longestRouteLabel = hasSeafarers(game) ? "Longest Route" : "Longest Road";
  const bestRouteLength = Math.max(0, ...Object.values(game.longestRouteLengths ?? {}));
  const bestArmySize = Math.max(0, ...game.players.map((player) => player.playedKnights ?? 0));

  return (
    <main className="catan-page tbl-light catan-theme">
      {rulesDialog}
      {winner && <Winner player={winner} target={game.victoryTarget} canRestart={isHost} onRestart={restartRoom} onLeave={leaveRoom} />}
      {barbarianNotice && <div className={`barbarian-notice ${barbarianNotice.kind}`} role="alert"><Shield size={28} /><div><strong>{barbarianNotice.kind === "warning" ? "Prepare your knights" : "Barbarian attack"}</strong><span>{barbarianNotice.message}</span></div></div>}
      <GameHeader
        title="CATAN"
        room={game}
        subtitle={`${CATAN_RULESETS[game.ruleset].shortLabel} · ${game.setup ? `Setup round ${game.setup.index < game.players.length ? 1 : 2}` : `Turn ${game.turn}`}`}
        status={winner ? "Game over" : `${game.setup ? "Now placing" : isPairedSecondary ? "Paired player 2" : game.pairedTurn ? "Paired player 1" : "Current turn"}: ${activePlayer.name}`}
        onRules={() => setShowRules(true)}
        onLeave={() => window.confirm("Leave this room and return to Catan home?") && leaveRoom()}
      />

      <section className="catan-layout">
        <section className="board-panel">
          <div className="board-instruction">
            <span>{game.setup
              ? `Choose where ${activePlayer.name} will place a starting ${game.setup.step === "settlement" && hasCitiesKnights(game) && game.setup.index >= game.players.length ? "city" : game.setup.step}`
              : game.pendingCityLoss
                ? `${cityLossPlayer.name}, choose which highlighted city the barbarians pillage`
              : game.pendingProgressDiscard
                ? `${progressDiscardPlayer.name} must return ${game.pendingProgressDiscard.required} progress card${game.pendingProgressDiscard.required === 1 ? "" : "s"}`
              : game.pendingProgress
                ? `${game.players.find((player) => player.id === game.pendingProgress.chooserId)?.name} must resolve ${PROGRESS_CARD_INFO[game.pendingProgress.type].label}`
              : game.pendingSeven?.phase === "discard"
                ? `${discardingPlayer.name} must choose half their cards to discard`
                : game.pendingSeven?.phase === "moveRobber"
                  ? `${activePlayer.name}, choose a different tile for the robber`
                : game.pendingSeven?.phase === "chooseToken"
                  ? `${activePlayer.name}, choose the robber or pirate`
                : game.pendingSeven?.phase === "movePirate"
                  ? `${activePlayer.name}, choose a different sea tile for the pirate`
                  : game.pendingSeven?.phase === "chooseVictim"
                    ? `${activePlayer.name}, choose an adjacent player to steal from`
                    : game.pendingSeven?.phase === "chooseCard"
                      ? `${activePlayer.name}, pick one face-down card to steal`
                    : game.pendingTrade
                      ? game.pendingTrade.toPlayerId
                        ? `${game.players.find((player) => player.id === game.pendingTrade.toPlayerId)?.name} must answer the trade offer`
                        : "Open trade: the first eligible player to accept gets it"
                  : game.pendingGold
                    ? `${game.players.find((player) => player.id === game.pendingGold.claims[0]?.playerId)?.name} chooses a gold-field resource`
                  : game.pendingDevelopment?.type === "roadBuilding"
                    ? `${activePlayer.name}, place ${game.pendingDevelopment.remaining} free route piece${game.pendingDevelopment.remaining === 1 ? "" : "s"}`
                  : game.pendingDevelopment?.type === "yearOfPlenty"
                    ? `${activePlayer.name}, choose ${game.pendingDevelopment.remaining} resource${game.pendingDevelopment.remaining === 1 ? "" : "s"}`
                  : game.pendingDevelopment?.type === "monopoly"
                    ? `${activePlayer.name}, choose a resource to monopolize`
                  : buildMode
                    ? `Choose a place for your ${buildMode}`
                    : game.rolled
                      ? isPairedSecondary ? "Player 2 may build or trade with the bank" : "Build, trade, or end your turn"
                      : "Roll to begin your turn"}</span>
            {!game.setup && buildMode && !game.pendingDevelopment && !game.pendingProgress && <button onClick={() => setBuildMode(null)}><X size={15} /> Cancel</button>}
          </div>
          <CatanBoard
            game={game}
            buildMode={placementMode}
            legalVertices={legalVertices}
            legalEdges={legalEdges}
            onVertex={buildAtVertex}
            onEdge={buildRoad}
            robberMoveMode={game.pendingSeven?.phase === "moveRobber" && isMyTurn}
            pirateMoveMode={game.pendingSeven?.phase === "movePirate" && isMyTurn}
            onTile={game.pendingSeven?.phase === "movePirate" ? movePirate : moveRobber}
          />
          <div className="board-legend">
            <span><i className="number-hot">6</i> High production</span>
            <span><i className="robber-mini">♟</i> Robber blocks production</span>
          </div>
        </section>

        <aside className="catan-sidebar">
          <section className="turn-card">
            <div className="turn-card-head">
              <div>
                <p className="catan-panel-kicker">{game.setup ? "Starting placement" : isMyTurn ? "Your turn" : "Current turn"}</p>
                <h2>{activePlayer.name}</h2>
              </div>
              <span className={`victory-chip ${activePlayer.color}`}><Crown size={16} /> {activePlayer.id === playerId ? totalVictoryPoints(activePlayer) : activePlayer.points}/{game.victoryTarget}</span>
            </div>

            {game.setup ? (
              <div className="setup-placement-panel">
                <span className={`setup-piece-icon ${game.setup.step}`}>
                  {game.setup.step === "settlement" ? (hasCitiesKnights(game) && game.setup.index >= game.players.length ? <Castle size={25} /> : <Home size={25} />) : <Route size={25} />}
                </span>
                <div>
                  <strong>{isMyTurn ? `Place your ${game.setup.step === "settlement" && hasCitiesKnights(game) && game.setup.index >= game.players.length ? "city" : game.setup.step}` : `Waiting for ${activePlayer.name}`}</strong>
                  <p>{isMyTurn ? (game.setup.step === "settlement" ? `Choose a highlighted corner${hasSeafarers(game) ? " on the main island" : ""}. Buildings cannot be adjacent.` : `Choose a highlighted ${placementMode} touching your new building.`) : `${activePlayer.name} is choosing a starting ${game.setup.step} on their device.`}</p>
                  {isMyTurn && game.setup.step === "road" && hasSeafarers(game) && <div className="setup-route-choice"><button className={placementMode === "road" ? "active" : ""} onClick={() => setBuildMode("road")}>Road</button><button className={placementMode === "ship" ? "active" : ""} disabled={!canPlaceStartingShip} title={canPlaceStartingShip ? "Place a coastal ship" : "Ships require a coastal building"} onClick={() => setBuildMode("ship")}>Ship</button></div>}
                </div>
                <small>{game.setup.index + 1} of {game.setup.order.length}</small>
              </div>
            ) : <>
              <DiceTray dice={game.dice} rolling={isRolling} eventDie={game.eventDie} />
              {game.pendingSeven || game.pendingGold || game.pendingTrade || game.pendingDevelopment || game.pendingProgress || game.pendingCityLoss || game.pendingProgressDiscard ? (
                <p className="seven-turn-note">{game.pendingCityLoss ? "Resolve the barbarian city loss" : game.pendingProgressDiscard ? "Return excess progress cards" : game.pendingProgress ? "Resolve the progress card" : game.pendingSeven ? (game.pendingSeven.source === "knight" ? "Resolve the knight" : "Resolve the seven") : game.pendingGold ? "Resolve gold production" : game.pendingDevelopment ? "Resolve the development card" : "Resolve the trade offer"} before continuing the turn.</p>
              ) : !game.rolled ? (
              <button className="catan-primary roll-button" disabled={isRolling || !isMyTurn} onClick={rollDice}>
                {isRolling ? <RefreshCcw className="spin" size={19} /> : <Dice5 size={20} />}
                {isRolling ? "Rolling…" : isMyTurn ? "Roll dice" : `Waiting for ${activePlayer.name}`}
              </button>
            ) : (
              <button className="catan-primary end-button" disabled={!isMyTurn} onClick={endTurn}>
                {isMyTurn ? (isPairedSecondary ? "Finish paired turn" : game.pairedTurn ? "Pass to player 2" : "End turn") : `Waiting for ${activePlayer.name}`} <ArrowRightLeft size={18} />
              </button>
              )}
            </>}
          </section>

          {game.pendingCityLoss && <CityLossChoice pending={game.pendingCityLoss} player={cityLossPlayer} viewerPlayerId={playerId} />}

          {game.pendingProgressDiscard && <ProgressDiscardChoice pending={game.pendingProgressDiscard} player={progressDiscardPlayer} viewerPlayerId={playerId} onDiscard={discardProgressCard} />}

          {game.pendingProgress && <ProgressResolution pending={game.pendingProgress} players={game.players} viewerPlayerId={playerId} onChoose={chooseProgressCardOption} />}

          {game.pendingSeven && (
            <SevenResolution
              pendingSeven={game.pendingSeven}
              activePlayer={activePlayer}
              discardingPlayer={discardingPlayer}
              selection={discardSelection}
              onAdjust={adjustDiscard}
              onConfirm={confirmDiscard}
              players={game.players}
              onVictimChoice={chooseRobberVictim}
              onCardChoice={stealRobberCard}
              onTokenChoice={chooseSevenToken}
              viewerPlayerId={playerId}
              ruleset={game.ruleset}
            />
          )}

          {game.pendingGold && <GoldChoice pendingGold={game.pendingGold} players={game.players} viewerPlayerId={playerId} onChoose={chooseGoldResource} />}

          {game.pendingDevelopment && <DevelopmentResolution pending={game.pendingDevelopment} activePlayer={activePlayer} viewerPlayerId={playerId} onChooseResource={chooseDevelopmentResource} hasShips={hasSeafarers(game)} transportKind={buildMode} onTransportChange={setBuildMode} />}

          {viewerPlayer && <ResourceHand player={viewerPlayer} title="Your resource hand" cardTypes={cardTypesFor(game)} />}

          {viewerPlayer && hasCitiesKnights(game) && <ProgressCards
            player={viewerPlayer}
            game={game}
            canPlayCards={isMyTurn && !isPairedSecondary && !game.setup && !game.pendingSeven && !game.pendingGold && !game.pendingTrade && !game.pendingDevelopment && !game.pendingProgress && !game.pendingCityLoss && !game.pendingProgressDiscard}
            onPlay={playColoredCard}
          />}

          {viewerPlayer && usesDevelopmentCards(game) && <DevelopmentCards
            player={viewerPlayer}
            isActivePlayer={isMyTurn}
            canPlayCards={isMyTurn && !isPairedSecondary && !game.setup && !game.pendingSeven && !game.pendingGold && !game.pendingTrade && !game.pendingDevelopment && !game.pendingProgress}
            currentTurn={game.turn}
            canBuy={isMyTurn && game.rolled && !game.pendingSeven && !game.pendingGold && !game.pendingTrade && !game.pendingDevelopment && !game.pendingProgress && canAfford(activePlayer, COSTS.development) && game.developmentDeck.length > 0}
            deckCount={game.developmentDeckCount ?? game.developmentDeck.length}
            cardPlayedThisTurn={game.developmentCardPlayedThisTurn}
            onBuy={buyDevelopmentCard}
            onPlay={playDevelopmentCard}
          />}

          {game.pendingTrade && (
            <TradeDecision game={game} viewerPlayerId={playerId} onRespond={respondToPlayerTrade} />
          )}

          {isMyTurn && !game.setup && !game.pendingSeven && !game.pendingGold && !game.pendingTrade && !game.pendingDevelopment && !game.pendingProgress && !game.pendingCityLoss && !game.pendingProgressDiscard && <section className="action-card">
            <div className="section-title"><h2>Build</h2><span>Click the board to place</span></div>
            <div className="build-list">
              <BuildButton icon={Route} label="Road" cost={COSTS.road} disabled={!game.rolled || !canAfford(activePlayer, COSTS.road)} active={buildMode === "road"} onClick={() => setBuildMode(buildMode === "road" ? null : "road")} />
              {hasSeafarers(game) && <BuildButton icon={Anchor} label="Ship" cost={COSTS.ship} disabled={!game.rolled || !canAfford(activePlayer, COSTS.ship)} active={buildMode === "ship"} onClick={() => setBuildMode(buildMode === "ship" ? null : "ship")} />}
              {hasSeafarers(game) && <button className={buildMode?.startsWith("moveShip") ? "build-button active" : "build-button"} disabled={!game.rolled || game.movedShipThisTurn} onClick={() => { setShipMoveSource(null); setBuildMode(buildMode?.startsWith("moveShip") ? null : "moveShipSource"); }}><span className="build-icon"><Anchor size={20} /></span><span><strong>Move ship</strong><small>One open ship per turn</small></span><ArrowRightLeft size={16} /></button>}
              <BuildButton icon={Home} label="Settlement" cost={COSTS.settlement} disabled={!game.rolled || !canAfford(activePlayer, COSTS.settlement)} active={buildMode === "settlement"} onClick={() => setBuildMode(buildMode === "settlement" ? null : "settlement")} />
              <BuildButton icon={Castle} label="City" cost={COSTS.city} disabled={!game.rolled || !canAfford(activePlayer, COSTS.city)} active={buildMode === "city"} onClick={() => setBuildMode(buildMode === "city" ? null : "city")} />
              {hasCitiesKnights(game) && <BuildButton icon={Shield} label="Knight" cost={COSTS.knight} disabled={!game.rolled || !canAfford(activePlayer, COSTS.knight)} active={buildMode === "knight"} onClick={() => setBuildMode(buildMode === "knight" ? null : "knight")} />}
              {hasCitiesKnights(game) && <BuildButton icon={Castle} label="City wall" cost={COSTS.cityWall} disabled={!game.rolled || !canAfford(activePlayer, COSTS.cityWall)} active={buildMode === "cityWall"} onClick={() => setBuildMode(buildMode === "cityWall" ? null : "cityWall")} />}
            </div>
          </section>}

          {isMyTurn && hasCitiesKnights(game) && !game.setup && !game.pendingSeven && !game.pendingGold && !game.pendingTrade && !game.pendingDevelopment && !game.pendingProgress && !game.pendingCityLoss && !game.pendingProgressDiscard && game.rolled && <CitiesKnightsActions game={game} player={activePlayer} onActivateKnight={activateKnight} onPromoteKnight={promoteKnight} onImprove={improveCity} />}

          {isMyTurn && !isPairedSecondary && !game.setup && !game.pendingSeven && !game.pendingGold && !game.pendingTrade && !game.pendingDevelopment && !game.pendingProgress && game.rolled && (
            <PlayerTradeBuilder
              activePlayer={activePlayer}
              partners={tradePartners}
              partner={tradePartner}
              partnerId={tradePartnerId}
              onPartnerChange={setTradePartnerId}
              offer={playerTradeOffer}
              request={playerTradeRequest}
              onAdjust={adjustPlayerTrade}
              onPropose={proposePlayerTrade}
              cardTypes={cardTypesFor(game)}
            />
          )}

          {isMyTurn && !game.setup && !game.pendingSeven && !game.pendingGold && !game.pendingTrade && !game.pendingDevelopment && !game.pendingProgress && <section className="trade-card">
            <div className="section-title"><h2>Maritime trade</h2><span>Give {bankTradeRate} · Get 1</span></div>
            <PortPrivileges ports={activePlayerPorts} />
            <div className="trade-row">
              <ResourceSelect value={tradeGive} onChange={setTradeGive} label="Give" cardTypes={cardTypesFor(game)} />
              <ArrowRightLeft size={17} />
              <ResourceSelect value={tradeGet} onChange={setTradeGet} label="Get" cardTypes={cardTypesFor(game)} />
              <button className="trade-button" disabled={!game.rolled || tradeGive === tradeGet || activePlayer.resources[tradeGive] < bankTradeRate} onClick={bankTrade}>Trade</button>
            </div>
          </section>}
        </aside>
      </section>

      <section className="game-footer-grid">
        <section className="score-card">
          <div className="section-title"><h2>Settlers</h2><span>First to {game.victoryTarget} points wins</span></div>
          <div className="catan-awards" aria-label="Catan special awards">
            <div className={longestRouteHolder ? "claimed" : ""}><Route size={17} /><span><strong>{longestRouteLabel}</strong><small>{longestRouteHolder ? `${longestRouteHolder.name} · ${game.longestRouteLengths?.[longestRouteHolder.id] ?? 0} pieces · 2 VP` : `Unclaimed · best route ${bestRouteLength}/5`}</small></span></div>
            {usesDevelopmentCards(game) && <div className={largestArmyHolder ? "claimed" : ""}><Shield size={17} /><span><strong>Largest Army</strong><small>{largestArmyHolder ? `${largestArmyHolder.name} · ${largestArmyHolder.playedKnights} knights · 2 VP` : `Unclaimed · best army ${bestArmySize}/3`}</small></span></div>}
          </div>
          <div className="score-list">
            {[...game.players].sort((a, b) => b.points - a.points).map((player) => (
              <div key={player.id} className={player.id === activePlayer.id ? "active" : ""}>
                <span className={`player-swatch ${player.color}`} />
                <strong>{player.name}</strong>
                <small>{cardCount(player)} {cardCount(player) === 1 ? "card" : "cards"}{player.defenderPoints ? ` · Defender of Catan ×${player.defenderPoints}` : ""}{game.longestRoadPlayerId === player.id ? ` · ${longestRouteLabel}` : ""}{game.largestArmyPlayerId === player.id ? " · Largest Army" : ""}</small>
                <b>{player.id === playerId ? totalVictoryPoints(player) : player.points} VP{player.id === playerId && player.hiddenVictoryPoints ? " (includes hidden)" : ""}</b>
              </div>
            ))}
          </div>
        </section>
        <section className="log-card">
          <div className="section-title"><h2>Island chronicle</h2><span>Latest first</span></div>
          <div className="catan-log">
            {game.log.map((entry, index) => <p key={`${entry}-${index}`}>{entry}</p>)}
          </div>
        </section>
      </section>
    </main>
  );
}

/** Other seats arrive with a count instead of their cards. */
function cardCount(player) {
  return player.resourceCount ?? totalResources(player.resources);
}

function CatanBoard({ game, buildMode, legalVertices, legalEdges, onVertex, onEdge, robberMoveMode, pirateMoveMode, onTile }) {
  const board = boardForGame(game);
  const vertexById = Object.fromEntries(board.vertices.map((vertex) => [vertex.id, vertex]));
  const robberTile = game.tiles.find((tile) => tile.id === game.robberTileId);
  const expanded = game.boardVariant !== "base";
  return (
    <div className={`board-wrap ${expanded ? "expanded" : ""}`}>
      <svg className="catan-board" viewBox={`0 0 860 ${board.viewBoxHeight}`} role="img" aria-label={`Interactive Catan ${expanded ? "expanded " : ""}island board`}>
        <defs>
          <filter id="tile-shadow" x="-20%" y="-20%" width="140%" height="150%">
            <feDropShadow dx="0" dy="5" stdDeviation="4" floodColor="#12364a" floodOpacity=".24" />
          </filter>
          <radialGradient id="sea" cx="48%" cy="40%" r="65%">
            <stop offset="0" stopColor="#5cb9c4" /><stop offset="1" stopColor="#16728b" />
          </radialGradient>
          <pattern id="waves" width="32" height="18" patternUnits="userSpaceOnUse">
            <path d="M0 9 Q8 2 16 9 T32 9" fill="none" stroke="rgba(255,255,255,.16)" strokeWidth="1.5" />
          </pattern>
        </defs>
        <rect width="860" height={board.viewBoxHeight} rx="28" fill="url(#sea)" />
        <rect width="860" height={board.viewBoxHeight} rx="28" fill="url(#waves)" />
        <ellipse className="island-halo" cx={board.center.x} cy={board.center.y} rx={expanded ? 370 : 311} ry={expanded ? 340 : 277} />

        {game.tiles.map((tile) => {
          const robberTarget = robberMoveMode && tile.id !== game.robberTileId && !["sea"].includes(tile.resource);
          const pirateTarget = pirateMoveMode && tile.resource === "sea" && tile.id !== game.pirateTileId;
          const tokenTarget = robberTarget || pirateTarget;
          const terrainLabel = tile.resource === "desert" ? "desert" : tile.resource === "sea" ? "sea" : tile.resource === "gold" ? "gold field" : RESOURCE_INFO[tile.resource].label.toLowerCase();
          return (
          <g
            key={tile.id}
            className={`terrain-tile ${tile.resource} ${tokenTarget ? "robber-target" : ""}`}
            filter="url(#tile-shadow)"
            role={tokenTarget ? "button" : undefined}
            tabIndex={tokenTarget ? 0 : undefined}
            aria-label={tokenTarget ? `Move ${pirateTarget ? "pirate" : "robber"} to ${terrainLabel} tile${tile.number ? ` number ${tile.number}` : ""}` : undefined}
            onClick={() => tokenTarget && onTile(tile.id)}
            onKeyDown={(event) => {
              if (tokenTarget && (event.key === "Enter" || event.key === " ")) onTile(tile.id);
            }}
          >
            <polygon points={tile.vertexIds.map((id) => `${vertexById[id].x},${vertexById[id].y}`).join(" ")} />
            <TerrainArt resource={tile.resource} x={tile.center.x} y={tile.center.y} />
            {tile.number && (
              <g className={`number-token ${tile.number === 6 || tile.number === 8 ? "hot" : ""}`} transform={`translate(${tile.center.x} ${tile.center.y + 7})`}>
                <circle r="25" />
                <text y="2">{tile.number}</text>
                <g className="probability-dots" transform="translate(0 13)">
                  {Array.from({ length: 6 - Math.abs(7 - tile.number) }, (_, index) => <circle key={index} cx={(index - (5 - Math.abs(7 - tile.number)) / 2) * 4} r="1.25" />)}
                </g>
              </g>
            )}
            {game.pirateTileId === tile.id && <g className="pirate" transform={`translate(${tile.center.x} ${tile.center.y - 3})`}><circle r="17" /><text y="6">☠</text></g>}
          </g>
          );
        })}

        {game.ports?.map((port) => {
          const edge = board.edges.find((candidate) => candidate.id === port.edgeId);
          if (!edge) return null;
          const from = vertexById[edge.from];
          const to = vertexById[edge.to];
          const midpoint = midpointForEdge(board, edge);
          const vectorX = midpoint.x - board.center.x;
          const vectorY = midpoint.y - board.center.y;
          const magnitude = Math.hypot(vectorX, vectorY) || 1;
          const markerX = midpoint.x + vectorX / magnitude * 35;
          const markerY = midpoint.y + vectorY / magnitude * 35;
          const resource = port.type === "generic" ? null : RESOURCE_INFO[port.type];
          return (
            <g key={port.id} className={`port-marker ${resource?.terrain ?? "generic"}`} aria-label={`${port.type === "generic" ? "Three to one" : `Two to one ${resource.label}`} port`}>
              <line className="port-coast" x1={from.x} y1={from.y} x2={to.x} y2={to.y} />
              <line className="port-pier" x1={midpoint.x} y1={midpoint.y} x2={markerX} y2={markerY} />
              <circle cx={markerX} cy={markerY} r="22" />
              <text className="port-rate" x={markerX} y={markerY + 4}>{port.type === "generic" ? "3:1" : "2:1"}</text>
              <text className="port-kind" x={markerX} y={markerY + 35}>{resource?.short ?? "Any"}</text>
            </g>
          );
        })}

        {board.edges.map((edge) => {
          const from = vertexById[edge.from];
          const to = vertexById[edge.to];
          const shipOwnerId = game.ships?.[edge.id];
          const ownerId = game.roads[edge.id] ?? shipOwnerId;
          const owner = game.players.find((player) => player.id === ownerId);
          const legal = legalEdges.has(edge.id);
          return (
            <g key={edge.id} className={`board-edge ${legal ? "legal" : ""}`} onClick={() => legal && onEdge(edge.id)}>
              {owner && <line className="road-outline" x1={from.x} y1={from.y} x2={to.x} y2={to.y} />}
              {owner && <line className={shipOwnerId ? "ship-piece" : "road-piece"} style={{ "--piece-color": owner.hex }} x1={from.x} y1={from.y} x2={to.x} y2={to.y} />}
              {legal && <line className="road-preview" x1={from.x} y1={from.y} x2={to.x} y2={to.y} />}
              <line className="edge-hit" x1={from.x} y1={from.y} x2={to.x} y2={to.y} />
            </g>
          );
        })}

        {board.vertices.map((vertex) => {
          const building = game.settlements[vertex.id];
          const owner = game.players.find((player) => player.id === building?.playerId);
          const legal = legalVertices.has(vertex.id);
          const knight = game.citiesKnights?.knights?.[vertex.id];
          const knightOwner = game.players.find((player) => player.id === knight?.playerId);
          const canUpgrade = buildMode === "city" && building?.type === "settlement" && building.playerId === game.players[game.currentPlayerIndex].id;
          return (
            <g key={vertex.id} className={`board-vertex ${legal || canUpgrade ? "legal" : ""}`} transform={`translate(${vertex.x} ${vertex.y})`} onClick={() => (legal || canUpgrade) && onVertex(vertex.id)}>
              {(legal || canUpgrade) && <circle className="build-target" r="12" />}
              {building?.type === "settlement" && <Settlement color={owner.hex} />}
              {building?.type === "city" && <City color={owner.hex} />}
              {game.citiesKnights?.cityWalls?.[vertex.id] && <circle className="city-wall" r="18" />}
              {knight && <g className={`knight-piece level-${knight.level} ${knight.active ? "active" : ""}`} style={{ "--piece-color": knightOwner.hex }}><circle r={10 + knight.level} /><text y="5">{knight.level}</text></g>}
              <circle className="vertex-hit" r="15" />
            </g>
          );
        })}

        {robberTile && (
          <g className="robber" transform={`translate(${robberTile.center.x + 25} ${robberTile.center.y - 27})`} aria-label="Robber">
            <circle className="robber-halo" r="20" />
            <circle className="robber-token" r="15" />
            <text y="6">♟</text>
          </g>
        )}
      </svg>
    </div>
  );
}

function TerrainArt({ resource, x, y }) {
  if (resource === "sea") return <g className="terrain-art sea-art" transform={`translate(${x} ${y})`}><path d="M-27 0q9-8 18 0t18 0t18 0M-20 13q8-7 16 0t16 0" /></g>;
  if (resource === "gold") return <g className="terrain-art gold-art" transform={`translate(${x} ${y - 11})`}><circle r="20" /><text y="7">★</text></g>;
  if (resource === "wood") return <g className="terrain-art trees" transform={`translate(${x} ${y - 15})`}><text x="-21">▲</text><text x="2" y="8">▲</text><text x="18" y="-3">▲</text></g>;
  if (resource === "sheep") return <g className="terrain-art sheep" transform={`translate(${x} ${y - 18})`}><text>●</text><text x="-15" y="9">●</text><text x="15" y="9">●</text></g>;
  if (resource === "wheat") return <g className="terrain-art wheat" transform={`translate(${x} ${y - 16})`}><path d="M-18 14V-10M0 14V-16M18 14V-9M-18-5l-7-6m7 13l8-7M0-10l-8-7m8 14l8-7M18-4l-7-7m7 14l7-7" /></g>;
  if (resource === "brick") return <g className="terrain-art bricks" transform={`translate(${x} ${y - 19})`}><rect x="-27" width="26" height="13" /><rect x="2" width="26" height="13" /><rect x="-14" y="16" width="26" height="13" /></g>;
  if (resource === "ore") return <g className="terrain-art ore" transform={`translate(${x} ${y - 16})`}><path d="M-34 24L-13-16 3 7 18-12 36 24Z" /></g>;
  return <g className="terrain-art desert-art" transform={`translate(${x} ${y})`}><path d="M-38 13q18-24 38 0t38 0" /><circle cx="20" cy="-29" r="10" /></g>;
}

function Settlement({ color }) {
  return <g className="settlement-piece" style={{ "--piece-color": color }}><path d="M-11 3V12H11V3L0-7Z" /><path d="M-12 2L0-10 12 2" /></g>;
}

function City({ color }) {
  return <g className="city-piece" style={{ "--piece-color": color }}><path d="M-15-2V12H15V-8H5V-14H-5V-2Z" /><path d="M-17-3L-7-12 2-3M4-9L10-15 17-9" /></g>;
}

function DiceTray({ dice, rolling, eventDie }) {
  return (
    <div className="catan-dice-tray" aria-label={`Dice showing ${dice[0]} and ${dice[1]}`}>
      <Die value={rolling ? 6 : dice[0]} rolling={rolling} tone="red" />
      <Die value={rolling ? 5 : dice[1]} rolling={rolling} tone="yellow" delay />
      {eventDie && <div className={`event-die ${eventDie}`} aria-label={`Event die showing ${eventDie}`}>{eventDie === "barbarian" ? "⛵" : eventDie === "trade" ? "▧" : eventDie === "politics" ? "◆" : "▤"}</div>}
      <span className="dice-total">{rolling ? "…" : dice[0] + dice[1]}</span>
    </div>
  );
}

function Die({ value, rolling, tone, delay }) {
  return (
    <div className={`catan-die value-${value} ${tone} ${rolling ? "rolling" : ""} ${delay ? "delay" : ""}`} aria-label={`Die showing ${value}`}>
      <div className="die-shadow" />
      <div className="die-cube">
        {[1, 2, 3, 4, 5, 6].map((faceValue) => (
          <div key={faceValue} className={`die-face face-${faceValue}`}>
            {Array.from({ length: 9 }, (_, index) => (
              <span key={index} className={pipIsVisible(faceValue, index) ? "pip visible" : "pip"} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function pipIsVisible(value, index) {
  const pips = {
    1: [4], 2: [0, 8], 3: [0, 4, 8], 4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8], 6: [0, 2, 3, 5, 6, 8],
  };
  return pips[value].includes(index);
}

function SevenResolution({ pendingSeven, activePlayer, discardingPlayer, selection, onAdjust, onConfirm, players, onVictimChoice, onCardChoice, onTokenChoice, viewerPlayerId, ruleset }) {
  const isRobberController = activePlayer.id === viewerPlayerId;
  if (pendingSeven.phase === "chooseToken") {
    return <section className="seven-card token-choice-card"><p className="catan-panel-kicker">Seven rolled</p><h2>Move the robber or pirate?</h2><p>The robber targets a land hex and adjacent buildings. The pirate targets a sea hex and adjacent ships.</p><div className="token-choice-buttons"><button disabled={!isRobberController} onClick={() => onTokenChoice("robber")}>♟ Robber</button><button disabled={!isRobberController} onClick={() => onTokenChoice("pirate")}>☠ Pirate</button></div></section>;
  }
  if (pendingSeven.phase === "moveRobber") {
    return (
      <section className="seven-card robber-choice-card">
        <div className="seven-badge">7</div>
        <div>
          <p className="catan-panel-kicker">Move the robber</p>
          <h2>{activePlayer.name}, choose a new tile</h2>
          <p>{isRobberController ? "Every available tile is highlighted. The robber cannot stay on its previous tile." : `Waiting for ${activePlayer.name} to choose on their device.`}</p>
        </div>
      </section>
    );
  }
  if (pendingSeven.phase === "movePirate") {
    return <section className="seven-card robber-choice-card"><div className="seven-badge">☠</div><div><p className="catan-panel-kicker">Move the pirate</p><h2>{activePlayer.name}, choose a new sea tile</h2><p>{isRobberController ? "Available sea tiles are highlighted. After placing it, choose a player with a ship on that hex and steal one hidden card. The pirate cannot stay in its previous location." : `Waiting for ${activePlayer.name} to choose on their device.`}</p></div></section>;
  }
  if (pendingSeven.phase === "chooseVictim") {
    const victims = players.filter((player) => pendingSeven.eligibleVictimIds.includes(player.id));
    return (
      <section className="seven-card victim-choice-card">
        <div className="section-title">
          <div><p className="catan-panel-kicker">{pendingSeven.stealSource === "pirate" ? "Pirate placed" : "Robber placed"}</p><h2>Choose who to steal from</h2></div>
          <span>{pendingSeven.stealSource === "pirate" ? "Ship owners on this sea hex" : "Adjacent players only"}</span>
        </div>
        <div className="victim-list">
          {victims.map((player) => (
            <button key={player.id} disabled={!isRobberController} onClick={() => onVictimChoice(player.id)}>
              <span className={`player-swatch ${player.color}`} />
              <strong>{player.name}</strong>
              <small>{cardCount(player)} cards</small>
              <span>Steal 1</span>
            </button>
          ))}
        </div>
      </section>
    );
  }
  if (pendingSeven.phase === "chooseCard") {
    const victim = players.find((player) => player.id === pendingSeven.victimId);
    if (!victim) return null;
    return (
      <section className="seven-card card-choice-card">
        <div className="section-title">
          <div><p className="catan-panel-kicker">Choose a card</p><h2>Take one from {victim.name}</h2></div>
          <span>{cardCount(victim)} cards available</span>
        </div>
        <p className="hidden-card-copy">{isRobberController ? "The cards are face down. Pick one without seeing its resource." : `Waiting for ${activePlayer.name} to pick a face-down card.`}</p>
        <div className="robber-card-options">
          {Array.from({ length: cardCount(victim) }, (_, index) => (
            <button key={index} disabled={!isRobberController} onClick={() => onCardChoice(index)} aria-label={`Pick face-down card ${index + 1}`}>
              <span>?</span>
              <strong>Card {index + 1}</strong>
              <small>Face down</small>
            </button>
          ))}
        </div>
      </section>
    );
  }
  if (!discardingPlayer) return null;
  const required = pendingSeven.discardCounts[discardingPlayer.id];
  if (discardingPlayer.id !== viewerPlayerId) {
    return (
      <section className="seven-card discard-card waiting-discard-card">
        <div className="section-title">
          <div><p className="catan-panel-kicker">Seven rolled</p><h2>Waiting for {discardingPlayer.name}</h2></div>
          <span>{required} cards</span>
        </div>
        <p className="discard-copy">They are choosing cards privately on their device.</p>
      </section>
    );
  }
  const selected = totalResources(selection);
  return (
    <section className="seven-card discard-card">
      <div className="section-title">
        <div><p className="catan-panel-kicker">Seven rolled</p><h2>{discardingPlayer.name} discards</h2></div>
        <span>{selected} of {required} selected</span>
      </div>
      <p className="discard-copy">Choose exactly {required} of your {totalResources(discardingPlayer.resources)} cards.</p>
      <div className="discard-grid">
        {cardTypesFor(ruleset).map((resource) => (
          <div key={resource} className={`discard-resource ${RESOURCE_INFO[resource].terrain}`}>
            <span>{RESOURCE_INFO[resource].short}</span>
            <small>{discardingPlayer.resources[resource]} owned</small>
            <div>
              <button aria-label={`Remove one ${RESOURCE_INFO[resource].short} from discard`} disabled={selection[resource] === 0} onClick={() => onAdjust(resource, -1)}>−</button>
              <strong>{selection[resource]}</strong>
              <button aria-label={`Add one ${RESOURCE_INFO[resource].short} to discard`} disabled={selection[resource] >= discardingPlayer.resources[resource] || selected >= required} onClick={() => onAdjust(resource, 1)}>+</button>
            </div>
          </div>
        ))}
      </div>
      <button className="catan-primary confirm-discard" disabled={selected !== required} onClick={onConfirm}>
        <Check size={18} /> Discard {required} card{required === 1 ? "" : "s"}
      </button>
    </section>
  );
}

function GoldChoice({ pendingGold, players, viewerPlayerId, onChoose }) {
  const claim = pendingGold.claims[0];
  const player = players.find((candidate) => candidate.id === claim?.playerId);
  if (!claim || !player) return null;
  const isChooser = player.id === viewerPlayerId;
  return (
    <section className="seven-card gold-choice-card">
      <p className="catan-panel-kicker">Gold field production</p>
      <h2>{player.name} chooses {claim.count} resource{claim.count === 1 ? "" : "s"}</h2>
      <p>{isChooser ? "Choose one resource at a time. Gold itself is not a resource card." : `Waiting for ${player.name} to choose privately.`}</p>
      <div className="gold-resource-buttons">
        {RESOURCES.map((resource) => <button key={resource} disabled={!isChooser} className={RESOURCE_INFO[resource].terrain} onClick={() => onChoose(resource)}>{RESOURCE_INFO[resource].icon}<span>{RESOURCE_INFO[resource].short}</span></button>)}
      </div>
    </section>
  );
}

function DevelopmentResolution({ pending, activePlayer, viewerPlayerId, onChooseResource, hasShips, transportKind, onTransportChange }) {
  const isChooser = pending.playerId === viewerPlayerId;
  if (pending.type === "roadBuilding") {
    return <section className="development-card development-resolution"><p className="catan-panel-kicker">Road Building</p><h2>Place {pending.remaining} free route piece{pending.remaining === 1 ? "" : "s"}</h2><p>{isChooser ? "Choose a highlighted board edge. The card pays the building cost." : `Waiting for ${activePlayer.name} to place free routes.`}</p>{isChooser && hasShips && <div className="setup-route-choice"><button className={transportKind === "road" ? "active" : ""} onClick={() => onTransportChange("road")}>Road</button><button className={transportKind === "ship" ? "active" : ""} onClick={() => onTransportChange("ship")}>Ship</button></div>}</section>;
  }
  const title = pending.type === "monopoly" ? "Choose a monopoly resource" : `Choose ${pending.remaining} resource${pending.remaining === 1 ? "" : "s"}`;
  return (
    <section className="development-card development-resolution">
      <p className="catan-panel-kicker">{DEVELOPMENT_CARD_INFO[pending.type].label}</p>
      <h2>{title}</h2>
      <p>{isChooser ? (pending.type === "monopoly" ? "All other players will give you every card of the chosen resource." : "Choose one resource at a time from the supply.") : `Waiting for ${activePlayer.name} to choose.`}</p>
      <div className="development-resource-buttons">
        {RESOURCES.map((resource) => <button key={resource} disabled={!isChooser} className={RESOURCE_INFO[resource].terrain} onClick={() => onChooseResource(resource)}><span>{RESOURCE_INFO[resource].icon}</span><strong>{RESOURCE_INFO[resource].short}</strong></button>)}
      </div>
    </section>
  );
}

function DevelopmentCards({ player, isActivePlayer, canPlayCards, currentTurn, canBuy, deckCount, cardPlayedThisTurn, onBuy, onPlay }) {
  return (
    <section className="development-card">
      <div className="section-title"><h2>Development cards</h2><span>{deckCount} in deck</span></div>
      <button className="buy-development" disabled={!canBuy} onClick={onBuy}><Sparkles size={17} /><span><strong>Buy development card</strong><small>1 Wool · 1 Grain · 1 Ore</small></span></button>
      {player.developmentCards.length === 0 ? <p className="empty-development">You do not have any development cards.</p> : <div className="development-hand">
        {player.developmentCards.map((card) => {
          const info = DEVELOPMENT_CARD_INFO[card.type];
          const boughtThisTurn = card.boughtTurn === currentTurn;
          const playable = isActivePlayer && canPlayCards && !boughtThisTurn && !cardPlayedThisTurn;
          return <div key={card.id}><span className="development-symbol">{card.type === "knight" ? "♞" : card.type === "victoryPoint" ? "★" : "✦"}</span><span><strong>{info.label}</strong><small>{boughtThisTurn ? "Playable next turn" : info.description}</small></span><button disabled={!playable} onClick={() => onPlay(card.id)}>Play</button></div>;
        })}
      </div>}
    </section>
  );
}

function CityLossChoice({ pending, player, viewerPlayerId }) {
  const isChooser = pending.currentPlayerId === viewerPlayerId;
  return (
    <section className="seven-card city-loss-card">
      <div className="section-title"><div><p className="catan-panel-kicker">Barbarian pillage</p><h2>{player.name} chooses the city</h2></div><Shield size={23} /></div>
      <p>{isChooser ? "Choose one of your highlighted cities on the board. It becomes a settlement, costs 1 victory point, and its city wall is removed." : `Waiting for ${player.name} to choose on their device.`}</p>
    </section>
  );
}

function ProgressDiscardChoice({ pending, player, viewerPlayerId, onDiscard }) {
  const isChooser = pending.currentPlayerId === viewerPlayerId;
  return (
    <section className="progress-card-panel progress-discard-card">
      <div className="section-title"><div><p className="catan-panel-kicker">Progress hand limit</p><h2>Return {pending.required} card{pending.required === 1 ? "" : "s"}</h2></div><span>Maximum 4</span></div>
      <p>{isChooser ? "Choose which card to return face-down to the bottom of its matching deck." : `Waiting for ${player.name} to choose privately.`}</p>
      {isChooser && <div className="progress-hand">{player.progressCards.map((card) => <button key={card.id} className={card.color} onClick={() => onDiscard(card.id)}><strong>{PROGRESS_CARD_INFO[card.type].label}</strong><small>{PROGRESS_CARD_INFO[card.type].description}</small></button>)}</div>}
    </section>
  );
}

function ProgressResolution({ pending, players, viewerPlayerId, onChoose }) {
  const chooser = players.find((player) => player.id === pending.chooserId);
  const owner = players.find((player) => player.id === pending.playerId);
  const info = PROGRESS_CARD_INFO[pending.type];
  const isChooser = pending.chooserId === viewerPlayerId;
  const stageCopy = {
    firstDie: "Choose the first production die.",
    secondDie: "Choose the second production die.",
    firstTile: "Choose the first number token.",
    secondTile: "Choose the number token to swap with it.",
    city: "Choose the city that receives a free wall.",
    settlement: "Choose the settlement to upgrade.",
    knight: "Choose a knight.",
    target: "Choose a player.",
    resource: "Choose the resource to offer.",
    commodity: "Choose the commodity to return.",
    card: "Choose a card.",
    cardType: "Choose a card type.",
    tile: "Choose a terrain tile.",
    route: "Choose an open road or ship.",
    opponentKnight: "Choose one of your knights to remove.",
    relocateKnight: "Choose a connected intersection for your displaced knight.",
    placeKnight: "Choose where to place the replacement knight.",
  };
  return (
    <section className="progress-card-panel progress-resolution-card">
      <div className="section-title"><div><p className="catan-panel-kicker">{info.label}</p><h2>{isChooser ? stageCopy[pending.stage] ?? "Resolve the card" : `Waiting for ${chooser?.name ?? owner.name}`}</h2></div><span>{info.color} card</span></div>
      <p>{isChooser ? info.description : `${chooser?.name ?? owner.name} must make this private choice on their device.`}</p>
      {isChooser && <div className="progress-choice-grid">{pending.options.map((option) => <button key={option.id} className={info.color} onClick={() => onChoose(option.id)}><strong>{option.label}</strong>{option.detail && <small>{option.detail}</small>}</button>)}</div>}
    </section>
  );
}

function ProgressCards({ player, game, canPlayCards, onPlay }) {
  const improvements = game.citiesKnights.improvements[player.id] ?? { science: 0, trade: 0, politics: 0 };
  const colors = [
    { key: "science", label: "Green · Science" },
    { key: "trade", label: "Yellow · Trade" },
    { key: "politics", label: "Blue · Politics" },
  ];
  return (
    <section className="progress-card-panel">
      <div className="section-title"><h2>Progress cards</h2><span>{player.progressCards.length}/4 held secretly</span></div>
      <div className="progress-eligibility">
        {colors.map(({ key, label }) => {
          const level = improvements[key] ?? 0;
          return <div key={key} className={key}><strong>{label}</strong><small>{level ? `Draw when its event icon appears and the red die is 1–${Math.min(6, level + 1)}` : "Build level 1 to qualify"}</small><b>{game.citiesKnights.progressDecks?.[key]?.length ?? 0} cards</b></div>;
        })}
      </div>
      {player.progressVictoryPoints > 0 && <p className="progress-vp"><Trophy size={15} /> {player.progressVictoryPoints} revealed progress-card victory point{player.progressVictoryPoints === 1 ? "" : "s"}</p>}
      {player.progressCards.length === 0 ? <p className="empty-development">No progress cards yet. Improve a city track, then match its colored event icon and red-die range.</p> : <div className="progress-hand">{player.progressCards.map((card) => {
        const info = PROGRESS_CARD_INFO[card.type];
        const drawnThisTurn = Number.isInteger(card.drawnTurn) && card.drawnTurn === game.turn;
        return <div key={card.id} className={card.color}><strong>{info.label}</strong><small>{drawnThisTurn ? "Playable next turn" : info.description}</small><button disabled={!canPlayCards || drawnThisTurn} onClick={() => onPlay(card.id)}>Play</button></div>;
      })}</div>}
    </section>
  );
}

function CitiesKnightsActions({ game, player, onActivateKnight, onPromoteKnight, onImprove }) {
  const state = game.citiesKnights;
  const improvements = state.improvements[player.id];
  const commodityForTrack = { trade: "cloth", politics: "coin", science: "paper" };
  const activeStrength = Object.values(state.knights).filter((knight) => knight.playerId === player.id && knight.active).reduce((sum, knight) => sum + knight.level, 0);
  return (
    <section className="action-card cities-knights-card">
      <div className="section-title"><h2>Cities & Knights</h2><span>Barbarians: {state.barbarianDistance} away</span></div>
      <div className="barbarian-track" aria-label={`${state.barbarianDistance} spaces until barbarian attack`}><span style={{ width: `${(8 - state.barbarianDistance) / 7 * 100}%` }} /></div>
      <p className="knight-strength"><Shield size={15} /> Your active strength: <strong>{activeStrength}</strong></p>
      <div className="knight-action-list">
        {Object.entries(state.knights).filter(([, knight]) => knight.playerId === player.id).map(([vertexId, knight], index) => {
          const promotable = canPromoteKnight(game, player.id, vertexId);
          const politicsLocked = knight.level === 2 && (state.improvements[player.id]?.politics ?? 0) < 3;
          return <div key={vertexId}><span><strong>Knight {index + 1}</strong><small>Level {knight.level} · {knight.active ? "Active" : "Inactive"}</small></span><div>{!knight.active && <button disabled={!canAfford(player, COSTS.activateKnight)} onClick={() => onActivateKnight(vertexId)}>Activate · 1 Grain</button>}<button disabled={!promotable || !canAfford(player, COSTS.promoteKnight)} title={politicsLocked ? "Politics level 3 is required for a mighty knight" : "Promote one level; active status stays the same"} onClick={() => onPromoteKnight(vertexId)}>Promote · 1 Wool + 1 Ore</button></div></div>;
        })}
      </div>
      <div className="improvement-grid">
        {Object.entries(commodityForTrack).map(([track, commodity]) => {
          const level = improvements[track];
          const cost = Math.max(0, level + 1 - (state.cranePlayerIds?.includes(player.id) ? 1 : 0));
          return <button key={track} disabled={level >= 5 || player.resources[commodity] < cost} onClick={() => onImprove(track)}><span>{RESOURCE_INFO[commodity].icon}</span><strong>{track}</strong><small>Level {level} · {level >= 5 ? "Complete" : `${cost} ${RESOURCE_INFO[commodity].short}`}</small>{state.metropolises[track] === player.id && <b>Metropolis</b>}</button>;
        })}
      </div>
    </section>
  );
}

function PlayerTradeBuilder({ activePlayer, partners, partner, partnerId, onPartnerChange, offer, request, onAdjust, onPropose, cardTypes }) {
  const canPropose = totalResources(offer) > 0 && totalResources(request) > 0;
  return (
    <section className="player-trade-card">
      <div className="section-title"><h2>Player trade</h2><span>Negotiate resources</span></div>
      <label className="trade-partner-select">
        <span>Trade with</span>
        <select value={partnerId} onChange={(event) => onPartnerChange(event.target.value)}>
          <option value="any">Anyone — first to accept</option>
          {partners.map((player) => <option key={player.id} value={player.id}>{player.name}</option>)}
        </select>
      </label>
      <div className="player-trade-columns">
        <TradeResourceEditor title={`${activePlayer.name} offers`} values={offer} owner={activePlayer} side="offer" onAdjust={onAdjust} cardTypes={cardTypes} />
        <TradeResourceEditor title={`${partner?.name ?? "Accepting player"} gives`} values={request} owner={partner} side="request" hideInventory onAdjust={onAdjust} cardTypes={cardTypes} />
      </div>
      <button className="catan-primary propose-trade" disabled={!canPropose} onClick={onPropose}>
        <ArrowRightLeft size={17} /> Propose trade
      </button>
    </section>
  );
}

function TradeResourceEditor({ title, values, owner, side, hideInventory = false, onAdjust, cardTypes = RESOURCES }) {
  return (
    <div className="trade-editor">
      <strong>{title}</strong>
      {cardTypes.map((resource) => (
        <div key={resource}>
          <span>{RESOURCE_INFO[resource].short}</span>
          <small>{hideInventory ? "?" : owner?.resources[resource] ?? 0}</small>
          <button aria-label={`Remove ${RESOURCE_INFO[resource].short} from ${side}`} disabled={values[resource] === 0} onClick={() => onAdjust(side, resource, -1)}>−</button>
          <b>{values[resource]}</b>
          <button aria-label={`Add ${RESOURCE_INFO[resource].short} to ${side}`} disabled={(!owner && !hideInventory) || values[resource] >= (hideInventory ? 19 : owner.resources[resource])} onClick={() => onAdjust(side, resource, 1)}>+</button>
        </div>
      ))}
    </div>
  );
}

function TradeDecision({ game, viewerPlayerId, onRespond }) {
  const trade = game.pendingTrade;
  if (!trade) return null;
  const fromPlayer = game.players.find((player) => player.id === trade.fromPlayerId);
  const toPlayer = game.players.find((player) => player.id === trade.toPlayerId);
  const viewerPlayer = game.players.find((player) => player.id === viewerPlayerId);
  const isOpenOffer = !trade.toPlayerId;
  const isTarget = viewerPlayerId === trade.toPlayerId;
  const isProposer = viewerPlayerId === trade.fromPlayerId;
  const alreadyDeclined = trade.declinedPlayerIds?.includes(viewerPlayerId);
  const canRespond = !isProposer && !alreadyDeclined && (isOpenOffer || isTarget);
  const hasRequestedCards = canProvideTradeResources(viewerPlayer, trade.request);
  const offerStillAvailable = canProvideTradeResources(fromPlayer, trade.offer);
  const canAccept = canRespond && hasRequestedCards && offerStillAvailable;
  const recipientName = toPlayer?.name ?? "Accepting player";
  return (
    <section className="player-trade-card trade-decision-card">
      <p className="catan-panel-kicker">{isOpenOffer ? "Open trade offer" : `Trade offer for ${toPlayer?.name}`}</p>
      <h2>{fromPlayer?.name} proposes a trade</h2>
      <div className="trade-summary">
        <div><span>{recipientName} receives</span><strong>{formatResourceBundle(trade.offer)}</strong></div>
        <ArrowRightLeft size={18} />
        <div><span>{recipientName} gives</span><strong>{formatResourceBundle(trade.request)}</strong></div>
      </div>
      {canRespond && !hasRequestedCards && <p className="trade-unavailable-copy">You do not have the requested cards, so you can only decline.</p>}
      {canRespond && !offerStillAvailable && <p className="trade-unavailable-copy">The offered cards are no longer available. Decline this expired offer.</p>}
      {canRespond && <div className={`trade-response-actions ${canAccept ? "" : "single"}`}>
          {canAccept && <button className="catan-primary" onClick={() => onRespond(true)}><Check size={17} /> Accept</button>}
          <button onClick={() => onRespond(false)}><X size={17} /> Decline</button>
        </div>}
      {isProposer && <div className="trade-response-actions single"><button onClick={() => onRespond(false)}><X size={17} /> Cancel offer</button></div>}
      {alreadyDeclined && <p className="trade-waiting-copy">You declined this open offer. Other players may still accept it.</p>}
      {!canRespond && !alreadyDeclined && !isProposer && <p className="trade-waiting-copy">Waiting for {toPlayer?.name} to answer on their device.</p>}
    </section>
  );
}

function formatResourceBundle(resources) {
  return ALL_CARD_TYPES
    .filter((resource) => resources[resource] > 0)
    .map((resource) => `${resources[resource]} ${RESOURCE_INFO[resource].short}`)
    .join(" · ");
}

function ResourceHand({ player, title = "Resource hand", cardTypes = RESOURCES }) {
  return (
    <section className="resource-card">
      <div className="section-title"><h2>{title}</h2><span>{cardCount(player)} cards</span></div>
      <div className="resource-grid">
        {cardTypes.map((resource) => (
          <div key={resource} className={`resource-tile ${RESOURCE_INFO[resource].terrain}`}>
            <span>{RESOURCE_INFO[resource].icon}</span>
            <small>{RESOURCE_INFO[resource].short}</small>
            <strong>{player.resources[resource]}</strong>
          </div>
        ))}
      </div>
    </section>
  );
}

function BuildButton({ icon: Icon, label, cost, disabled, active, onClick }) {
  return (
    <button className={active ? "build-button active" : "build-button"} disabled={disabled} onClick={onClick}>
      <span className="build-icon"><Icon size={20} /></span>
      <span><strong>{label}</strong><small>{Object.entries(cost).map(([resource, count]) => `${count} ${RESOURCE_INFO[resource].short}`).join(" · ")}</small></span>
      {active ? <Check size={17} /> : <Sparkles size={16} />}
    </button>
  );
}

function ResourceSelect({ value, onChange, label, cardTypes = RESOURCES }) {
  return (
    <label className="resource-select">
      <span>{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        {cardTypes.map((resource) => <option key={resource} value={resource}>{RESOURCE_INFO[resource].short}</option>)}
      </select>
    </label>
  );
}

function PortPrivileges({ ports }) {
  if (!ports.length) return <p className="port-privileges empty">No port settlement yet · Standard rate 4:1</p>;
  const labels = [...new Set(ports.map((port) =>
    port.type === "generic" ? "Any resource 3:1" : `${RESOURCE_INFO[port.type].short} 2:1`,
  ))];
  return (
    <div className="port-privileges" aria-label="Controlled ports">
      {labels.map((label) => <span key={label}>{label}</span>)}
    </div>
  );
}

function RulesModal({ onClose }) {
  return <ChoiceModal wide title="How to play Catan" text="Build settlements, cities and roads, trade resources, and be first to reach the victory-point target." onClose={onClose}>
    <div className="tbl-rule-grid">
      <article><b>Roll and collect</b><p>Each turn starts with a dice roll. Every settlement or city next to a tile showing that number collects its resource: one for a settlement, two for a city.</p></article>
      <article><b>Trade</b><p>Trade with other players on your turn, or with the bank at 4:1, or better through a harbor you have built on.</p></article>
      <article><b>Build</b><p>Road: brick and lumber. Settlement: brick, lumber, wool and grain. City: three ore and two grain. Development card: ore, wool and grain.</p></article>
      <article><b>Rolling a 7</b><p>Players holding more than seven cards discard half. The roller moves the robber and steals a card from a neighbouring player.</p></article>
    </div>
    <p className="tbl-rule-heading">Victory points</p>
    <div className="tbl-rule-grid">
      <article><b>Buildings</b><p>A settlement is worth 1 point and a city 2.</p></article>
      <article><b>Longest Road</b><p>The longest road of five or more segments is worth 2 points.</p></article>
      <article><b>Largest Army</b><p>The first player to play three Knights, then anyone with more, holds 2 points.</p></article>
      <article><b>Development cards</b><p>Victory Point cards stay hidden until they win you the game.</p></article>
    </div>
    <p className="tbl-rule-heading">Variants</p>
    <p className="tbl-modal-copy">The host picks the ruleset in the lobby: the original game, Seafarers (ships, new islands and gold), Cities &amp; Knights (commodities, knights and barbarians), or both expansions. Rooms of five or six players use the larger island and paired-player turns.</p>
  </ChoiceModal>;
}

function Winner({ player, target, canRestart, onRestart, onLeave }) {
  return <Results
    title={`${player.name} wins!`}
    text={`The island has a new ruler: ${target} victory points and a settlement worthy of legend.`}
  >
    {canRestart
      ? <button type="button" className="tbl-primary" onClick={onRestart}><Users size={18} /> Return room to lobby</button>
      : <p className="tbl-wait">Waiting for the host to start another game.</p>}
    <button type="button" className="tbl-link" onClick={onLeave}>Leave room</button>
  </Results>;
}
