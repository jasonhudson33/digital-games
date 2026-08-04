"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowRightLeft,
  Castle,
  Check,
  Copy,
  Crown,
  Dice5,
  DoorOpen,
  Home,
  Map as MapIcon,
  Play,
  RefreshCcw,
  Route,
  Sparkles,
  Trophy,
  Users,
  X,
} from "lucide-react";
import { CatanRoomService, isCatanOnlineSyncEnabled } from "./catan-room-service";

const playerIdStorageKey = "catan-player-id";
const playerNameStorageKey = "catan-player-name";

const SQRT3 = Math.sqrt(3);
const BOARD_CENTER = { x: 430, y: 340 };
const HEX_SIZE = 67;

const RESOURCE_INFO = {
  wood: { label: "Lumber", short: "Wood", icon: "♣", terrain: "forest" },
  brick: { label: "Brick", short: "Brick", icon: "▰", terrain: "hills" },
  sheep: { label: "Wool", short: "Wool", icon: "●", terrain: "pasture" },
  wheat: { label: "Grain", short: "Grain", icon: "✦", terrain: "fields" },
  ore: { label: "Ore", short: "Ore", icon: "◆", terrain: "mountains" },
};

const RESOURCES = Object.keys(RESOURCE_INFO);
const TERRAIN_DECK = [
  "wood", "wood", "wood", "wood",
  "sheep", "sheep", "sheep", "sheep",
  "wheat", "wheat", "wheat", "wheat",
  "brick", "brick", "brick",
  "ore", "ore", "ore",
  "desert",
];
const NUMBER_DECK = [5, 2, 6, 3, 8, 10, 9, 12, 11, 4, 8, 10, 9, 4, 5, 6, 3, 11];
const PLAYER_STYLES = [
  { color: "red", hex: "#bd3437" },
  { color: "gold", hex: "#e6aa24" },
  { color: "teal", hex: "#217c76" },
  { color: "navy", hex: "#385377" },
];
const COSTS = {
  road: { wood: 1, brick: 1 },
  settlement: { wood: 1, brick: 1, sheep: 1, wheat: 1 },
  city: { wheat: 2, ore: 3 },
};

const axialTiles = [];
for (let q = -2; q <= 2; q += 1) {
  for (let r = Math.max(-2, -q - 2); r <= Math.min(2, -q + 2); r += 1) {
    axialTiles.push({ q, r });
  }
}
axialTiles.sort((a, b) => {
  const ay = a.r + a.q / 2;
  const by = b.r + b.q / 2;
  return ay === by ? a.q - b.q : ay - by;
});

function centerFor(q, r) {
  return {
    x: BOARD_CENTER.x + HEX_SIZE * 1.5 * q,
    y: BOARD_CENTER.y + HEX_SIZE * SQRT3 * (r + q / 2),
  };
}

function cornersFor(center) {
  return Array.from({ length: 6 }, (_, index) => {
    const angle = (Math.PI / 180) * (60 * index);
    return {
      x: center.x + HEX_SIZE * Math.cos(angle),
      y: center.y + HEX_SIZE * Math.sin(angle),
    };
  });
}

function geometry() {
  const vertexMap = new Map();
  const vertices = [];
  const edgeMap = new Map();
  const edges = [];
  const tiles = axialTiles.map((axial, tileIndex) => {
    const center = centerFor(axial.q, axial.r);
    const vertexIds = cornersFor(center).map((point) => {
      const key = `${point.x.toFixed(2)}:${point.y.toFixed(2)}`;
      if (!vertexMap.has(key)) {
        const id = `v${vertices.length}`;
        vertexMap.set(key, id);
        vertices.push({ id, ...point, tileIds: [] });
      }
      return vertexMap.get(key);
    });
    vertexIds.forEach((vertexId) => vertices.find((vertex) => vertex.id === vertexId).tileIds.push(tileIndex));
    vertexIds.forEach((from, index) => {
      const to = vertexIds[(index + 1) % 6];
      const key = [from, to].sort().join(":");
      if (!edgeMap.has(key)) {
        const id = `e${edges.length}`;
        edgeMap.set(key, id);
        edges.push({ id, from, to });
      }
    });
    return { id: tileIndex, center, vertexIds, axial };
  });

  const vertexEdges = Object.fromEntries(vertices.map((vertex) => [vertex.id, []]));
  const neighbors = Object.fromEntries(vertices.map((vertex) => [vertex.id, []]));
  edges.forEach((edge) => {
    vertexEdges[edge.from].push(edge.id);
    vertexEdges[edge.to].push(edge.id);
    neighbors[edge.from].push(edge.to);
    neighbors[edge.to].push(edge.from);
  });
  return { tiles, vertices, edges, vertexEdges, neighbors };
}

const BOARD = geometry();

function shuffled(items) {
  const next = [...items];
  for (let index = next.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(Math.random() * (index + 1));
    [next[index], next[swap]] = [next[swap], next[index]];
  }
  return next;
}

function emptyResources() {
  return { wood: 0, brick: 0, sheep: 0, wheat: 0, ore: 0 };
}

function totalResources(resources) {
  return RESOURCES.reduce((sum, resource) => sum + resources[resource], 0);
}

function canAfford(player, cost) {
  return Object.entries(cost).every(([resource, count]) => player.resources[resource] >= count);
}

function payCost(player, cost) {
  const resources = { ...player.resources };
  Object.entries(cost).forEach(([resource, count]) => {
    resources[resource] -= count;
  });
  return { ...player, resources };
}

function isSettlementLegal(vertexId, settlements, requireConnection, playerId, roads) {
  if (settlements[vertexId]) return false;
  if (BOARD.neighbors[vertexId].some((neighbor) => settlements[neighbor])) return false;
  if (!requireConnection) return true;
  return BOARD.vertexEdges[vertexId].some((edgeId) => roads[edgeId] === playerId);
}

function isRoadLegal(edge, playerId, roads, settlements) {
  if (roads[edge.id]) return false;
  return [edge.from, edge.to].some((vertexId) => {
    const building = settlements[vertexId];
    if (building?.playerId === playerId) return true;
    if (building && building.playerId !== playerId) return false;
    return BOARD.vertexEdges[vertexId].some((edgeId) => roads[edgeId] === playerId);
  });
}

function createGame(lobby) {
  const terrainOrder = shuffled(TERRAIN_DECK);
  const numberOrder = shuffled(NUMBER_DECK);
  let numberIndex = 0;
  const tiles = BOARD.tiles.map((tile, index) => {
    const resource = terrainOrder[index];
    return {
      ...tile,
      resource,
      number: resource === "desert" ? null : numberOrder[numberIndex++],
    };
  });
  const players = lobby.players.map((player, index) => ({
    id: player.id,
    name: player.name,
    ...PLAYER_STYLES[index],
    resources: emptyResources(),
    points: 0,
  }));
  const desert = tiles.find((tile) => tile.resource === "desert");
  const setupOrder = [
    ...players.map((player) => player.id),
    ...[...players].reverse().map((player) => player.id),
  ];
  return {
    roomCode: lobby.roomCode,
    hostId: lobby.hostId,
    phase: "playing",
    createdAt: lobby.createdAt,
    updatedAt: Date.now(),
    tiles,
    players,
    settlements: {},
    roads: {},
    currentPlayerIndex: 0,
    turn: 1,
    rolled: false,
    dice: [1, 1],
    robberTileId: desert.id,
    winnerId: null,
    pendingSeven: null,
    pendingTrade: null,
    setup: {
      order: setupOrder,
      index: 0,
      step: "settlement",
      settlementVertexId: null,
    },
    log: [
      `${players[0].name} chooses the first settlement location.`,
      "Starting placement begins. Choose a settlement, then place a road beside it.",
    ],
  };
}

function createLobby(roomCode, playerId, name) {
  const now = Date.now();
  return {
    roomCode,
    hostId: playerId,
    phase: "lobby",
    players: [{ id: playerId, name, ...PLAYER_STYLES[0], resources: emptyResources(), points: 0 }],
    tiles: [],
    settlements: {},
    roads: {},
    currentPlayerIndex: 0,
    turn: 1,
    rolled: false,
    dice: [1, 1],
    robberTileId: null,
    winnerId: null,
    pendingSeven: null,
    pendingTrade: null,
    setup: null,
    log: [`${name} created room ${roomCode}.`],
    createdAt: now,
    updatedAt: now,
  };
}

export default function CatanClient() {
  const [isReady, setIsReady] = useState(false);
  const [playerId, setPlayerId] = useState("");
  const [name, setName] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [game, setGame] = useState(null);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [isRolling, setIsRolling] = useState(false);
  const [buildMode, setBuildMode] = useState(null);
  const [tradeGive, setTradeGive] = useState("wood");
  const [tradeGet, setTradeGet] = useState("brick");
  const [discardSelection, setDiscardSelection] = useState(emptyResources);
  const [tradePartnerId, setTradePartnerId] = useState("");
  const [playerTradeOffer, setPlayerTradeOffer] = useState(emptyResources);
  const [playerTradeRequest, setPlayerTradeRequest] = useState(emptyResources);
  const latestGame = useRef(null);

  useEffect(() => {
    let storedId = localStorage.getItem(playerIdStorageKey);
    if (!storedId) {
      storedId = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
      localStorage.setItem(playerIdStorageKey, storedId);
    }
    setPlayerId(storedId);
    setName(localStorage.getItem(playerNameStorageKey) || "");
    setJoinCode(new URLSearchParams(window.location.search).get("room")?.toUpperCase() || "");
    setIsReady(true);
  }, []);

  useEffect(() => {
    latestGame.current = game;
  }, [game]);

  useEffect(() => {
    const code = joinCode.trim().toUpperCase();
    if (!isReady || !playerId || !code || game) return;
    let cancelled = false;
    void CatanRoomService.load(code).then((existing) => {
      if (cancelled || !existing?.players.some((player) => player.id === playerId)) return;
      setGame(existing);
      latestGame.current = existing;
      const me = existing.players.find((player) => player.id === playerId);
      if (me) setName(me.name);
      window.history.replaceState(null, "", `?room=${existing.roomCode}`);
    }).catch(() => undefined);
    return () => { cancelled = true; };
  }, [game, isReady, joinCode, playerId]);

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
  const discardingPlayerId = game?.pendingSeven?.phase === "discard"
    ? game.pendingSeven.remainingDiscardPlayerIds[0]
    : null;
  const discardingPlayer = game?.players.find((player) => player.id === discardingPlayerId);
  const viewerPlayer = game?.players.find((player) => player.id === playerId);
  const tradePartners = game?.players.filter((player) => player.id !== activePlayer?.id) ?? [];
  const tradePartner = tradePartners.find((player) => player.id === tradePartnerId) ?? tradePartners[0];
  const placementMode = game?.setup?.step ?? buildMode;
  const isHost = game?.hostId === playerId;
  const isMyTurn = activePlayer?.id === playerId;
  const legalVertices = useMemo(() => {
    if (!game || !activePlayer || !isMyTurn || placementMode !== "settlement") return new Set();
    const startingPlacement = Boolean(game.setup);
    return new Set(
      BOARD.vertices
        .filter((vertex) =>
          isSettlementLegal(vertex.id, game.settlements, !startingPlacement, activePlayer.id, game.roads),
        )
        .map((vertex) => vertex.id),
    );
  }, [activePlayer, game, isMyTurn, placementMode]);
  const legalEdges = useMemo(() => {
    if (!game || !activePlayer || !isMyTurn || placementMode !== "road") return new Set();
    if (game.setup) {
      return new Set(
        BOARD.edges
          .filter((edge) =>
            !game.roads[edge.id] &&
            [edge.from, edge.to].includes(game.setup.settlementVertexId),
          )
          .map((edge) => edge.id),
      );
    }
    return new Set(
      BOARD.edges
        .filter((edge) => isRoadLegal(edge, activePlayer.id, game.roads, game.settlements))
        .map((edge) => edge.id),
    );
  }, [activePlayer, game, isMyTurn, placementMode]);

  const resetLocalControls = () => {
    setBuildMode(null);
    setDiscardSelection(emptyResources());
    setPlayerTradeOffer(emptyResources());
    setPlayerTradeRequest(emptyResources());
    setTradePartnerId("");
  };

  const usePlayerName = () => {
    const cleanName = name.trim() || "Player";
    localStorage.setItem(playerNameStorageKey, cleanName);
    setName(cleanName);
    return cleanName;
  };

  const persist = async (next) => {
    const saved = await CatanRoomService.save(next);
    setGame(saved);
    latestGame.current = saved;
    window.history.replaceState(null, "", `?room=${saved.roomCode}`);
  };

  const updateGame = async (updater) => {
    const current = latestGame.current;
    if (!current) return;
    try {
      const next = await CatanRoomService.update(current.roomCode, updater);
      if (!next) return;
      setGame(next);
      latestGame.current = next;
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : "Could not save that action.");
    }
  };

  const createRoom = async () => {
    setError("");
    try {
      const roomCode = await CatanRoomService.createCode();
      await persist(createLobby(roomCode, playerId, usePlayerName()));
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "Could not create a room.");
    }
  };

  const joinRoom = async () => {
    setError("");
    const code = joinCode.trim().toUpperCase();
    if (!code) return setError("Enter a room code first.");
    try {
      const existing = await CatanRoomService.load(code);
      if (!existing) return setError(`Room ${code} was not found.`);
      const returning = existing.players.find((player) => player.id === playerId);
      if (returning) {
        setGame(existing);
        latestGame.current = existing;
        setName(returning.name);
        window.history.replaceState(null, "", `?room=${code}`);
        return;
      }
      if (existing.phase !== "lobby") return setError("That game has already started.");
      if (existing.players.length >= 4) return setError("That room already has four players.");
      const cleanName = usePlayerName();
      const next = await CatanRoomService.update(code, (state) => ({
        ...state,
        players: [...state.players, {
          id: playerId,
          name: cleanName,
          ...PLAYER_STYLES[state.players.length],
          resources: emptyResources(),
          points: 0,
        }],
        log: [`${cleanName} joined the room.`, ...state.log].slice(0, 24),
      }));
      if (next) {
        setGame(next);
        latestGame.current = next;
        window.history.replaceState(null, "", `?room=${code}`);
      }
    } catch (joinError) {
      setError(joinError instanceof Error ? joinError.message : "Could not join the room.");
    }
  };

  const startGame = () => {
    if (!game || !isHost || game.players.length < 2) return;
    void updateGame((state) => createGame(state));
    resetLocalControls();
    window.scrollTo(0, 0);
  };

  const leaveRoom = () => {
    setGame(null);
    latestGame.current = null;
    resetLocalControls();
    window.history.replaceState(null, "", "/catan");
  };

  const restartRoom = () => {
    if (!game || !isHost) return;
    void updateGame((current) => ({
      ...createLobby(current.roomCode, current.hostId, current.players[0].name),
      players: current.players.map((player, index) => ({
        id: player.id,
        name: player.name,
        ...PLAYER_STYLES[index],
        resources: emptyResources(),
        points: 0,
      })),
      createdAt: current.createdAt,
      log: ["The room is ready for another game."],
    }));
    resetLocalControls();
  };

  const rollDice = () => {
    if (!game || !isMyTurn || game.setup || game.pendingSeven || game.rolled || game.winnerId || isRolling) return;
    setIsRolling(true);
    setBuildMode(null);
    window.setTimeout(() => {
      const dieOne = Math.floor(Math.random() * 6) + 1;
      const dieTwo = Math.floor(Math.random() * 6) + 1;
      const total = dieOne + dieTwo;
      void updateGame((current) => {
        if (!current || current.rolled) return current;
        const players = current.players.map((player) => ({
          ...player,
          resources: { ...player.resources },
        }));
        const entries = [`${players[current.currentPlayerIndex].name} rolled ${dieOne} + ${dieTwo} = ${total}.`];
        let robberTileId = current.robberTileId;
        let pendingSeven = null;

        if (total === 7) {
          const discarders = players.filter((player) => totalResources(player.resources) >= 8);
          pendingSeven = {
            phase: discarders.length ? "discard" : "moveRobber",
            remainingDiscardPlayerIds: discarders.map((player) => player.id),
            discardCounts: Object.fromEntries(
              discarders.map((player) => [player.id, Math.floor(totalResources(player.resources) / 2)]),
            ),
          };
          entries.push(
            discarders.length
              ? `${discarders.map((player) => player.name).join(", ")} must discard half their resource cards.`
              : `${players[current.currentPlayerIndex].name} must move the robber to a different tile.`,
          );
        } else {
          const gains = Object.fromEntries(players.map((player) => [player.id, emptyResources()]));
          current.tiles.forEach((tile) => {
            if (tile.number !== total || tile.id === current.robberTileId || tile.resource === "desert") return;
            tile.vertexIds.forEach((vertexId) => {
              const building = current.settlements[vertexId];
              if (!building) return;
              const amount = building.type === "city" ? 2 : 1;
              gains[building.playerId][tile.resource] += amount;
              const player = players.find((candidate) => candidate.id === building.playerId);
              player.resources[tile.resource] += amount;
            });
          });
          const gainLines = players
            .map((player) => {
              const gain = gains[player.id];
              const text = RESOURCES.filter((resource) => gain[resource] > 0)
                .map((resource) => `${gain[resource]} ${RESOURCE_INFO[resource].short.toLowerCase()}`)
                .join(", ");
              return text ? `${player.name}: ${text}` : null;
            })
            .filter(Boolean);
          entries.push(gainLines.length ? `Production — ${gainLines.join(" · ")}.` : "No settlements produced resources.");
        }

        return {
          ...current,
          players,
          dice: [dieOne, dieTwo],
          robberTileId,
          pendingSeven,
          rolled: true,
          log: [...entries, ...current.log].slice(0, 24),
        };
      });
      setIsRolling(false);
    }, 950);
  };

  const buildAtVertex = (vertexId) => {
    if (!game || !activePlayer || game.pendingSeven || game.pendingTrade || game.winnerId) return;
    if (game.setup?.step === "settlement") {
      if (!legalVertices.has(vertexId)) return;
      if (!isMyTurn) return;
      void updateGame((current) => placeStartingSettlement(current, activePlayer.id, vertexId));
      return;
    }
    if (!game.rolled) return;
    if (buildMode === "settlement") {
      if (!legalVertices.has(vertexId) || !canAfford(activePlayer, COSTS.settlement)) return;
      if (!isMyTurn) return;
      void updateGame((current) => completeBuild(current, activePlayer.id, "settlement", vertexId));
      setBuildMode(null);
      return;
    }
    if (buildMode === "city") {
      const building = game.settlements[vertexId];
      if (building?.playerId !== activePlayer.id || building.type !== "settlement" || !canAfford(activePlayer, COSTS.city)) return;
      if (!isMyTurn) return;
      void updateGame((current) => completeBuild(current, activePlayer.id, "city", vertexId));
      setBuildMode(null);
    }
  };

  const buildRoad = (edgeId) => {
    if (!game || !activePlayer || game.pendingSeven || game.pendingTrade || game.winnerId || !legalEdges.has(edgeId)) return;
    if (game.setup?.step === "road") {
      if (!isMyTurn) return;
      void updateGame((current) => placeStartingRoad(current, activePlayer.id, edgeId));
      return;
    }
    if (buildMode !== "road" || !game.rolled) return;
    if (!canAfford(activePlayer, COSTS.road)) return;
    if (!isMyTurn) return;
    void updateGame((current) => completeBuild(current, activePlayer.id, "road", edgeId));
    setBuildMode(null);
  };

  const bankTrade = () => {
    if (!game || !activePlayer || game.pendingSeven || game.pendingTrade || !game.rolled || tradeGive === tradeGet || activePlayer.resources[tradeGive] < 4) return;
    if (!isMyTurn) return;
    void updateGame((current) => {
      const players = current.players.map((player) => {
        if (player.id !== activePlayer.id) return player;
        return {
          ...player,
          resources: {
            ...player.resources,
            [tradeGive]: player.resources[tradeGive] - 4,
            [tradeGet]: player.resources[tradeGet] + 1,
          },
        };
      });
      return {
        ...current,
        players,
        log: [
          `${activePlayer.name} traded 4 ${RESOURCE_INFO[tradeGive].short.toLowerCase()} for 1 ${RESOURCE_INFO[tradeGet].short.toLowerCase()}.`,
          ...current.log,
        ].slice(0, 24),
      };
    });
  };

  const adjustPlayerTrade = (side, resource, change) => {
    if (!game || !activePlayer || !tradePartner || game.pendingTrade || !isMyTurn) return;
    const setter = side === "offer" ? setPlayerTradeOffer : setPlayerTradeRequest;
    setter((current) => {
      const nextValue = current[resource] + change;
      const maximum = side === "offer" ? activePlayer.resources[resource] : 19;
      if (nextValue < 0 || nextValue > maximum) return current;
      return { ...current, [resource]: nextValue };
    });
  };

  const proposePlayerTrade = () => {
    if (!game?.rolled || game.pendingSeven || game.pendingTrade || !activePlayer || !tradePartner) return;
    if (totalResources(playerTradeOffer) === 0 || totalResources(playerTradeRequest) === 0) return;
    const validOffer = RESOURCES.every((resource) => playerTradeOffer[resource] <= activePlayer.resources[resource]);
    if (!validOffer) return;
    if (!isMyTurn) return;
    void updateGame((current) => ({
      ...current,
      pendingTrade: {
        fromPlayerId: activePlayer.id,
        toPlayerId: tradePartner.id,
        offer: { ...playerTradeOffer },
        request: { ...playerTradeRequest },
      },
      log: [`${activePlayer.name} offered ${tradePartner.name} a trade.`, ...current.log].slice(0, 24),
    }));
  };

  const respondToPlayerTrade = (accepted) => {
    if (!game?.pendingTrade) return;
    const targetPlayerId = game.pendingTrade.toPlayerId;
    const proposerPlayerId = game.pendingTrade.fromPlayerId;
    if (accepted && targetPlayerId !== playerId) return;
    if (!accepted && targetPlayerId !== playerId && proposerPlayerId !== playerId) return;
    void updateGame((current) => resolvePlayerTrade(current, accepted));
    setPlayerTradeOffer(emptyResources());
    setPlayerTradeRequest(emptyResources());
  };

  const endTurn = () => {
    if (!game?.rolled || game.pendingSeven || game.pendingTrade || game.winnerId) return;
    const nextIndex = (game.currentPlayerIndex + 1) % game.players.length;
    const turn = nextIndex === 0 ? game.turn + 1 : game.turn;
    if (!isMyTurn) return;
    void updateGame((current) => ({
      ...current,
      currentPlayerIndex: nextIndex,
      turn,
      rolled: false,
      log: [`${current.players[nextIndex].name} is up next.`, ...current.log].slice(0, 24),
    }));
    setBuildMode(null);
    setPlayerTradeOffer(emptyResources());
    setPlayerTradeRequest(emptyResources());
    setTradePartnerId("");
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
    void updateGame((current) => {
      if (!current?.pendingSeven || current.pendingSeven.phase !== "discard") return current;
      const players = current.players.map((player) => {
        if (player.id !== discardingPlayer.id) return player;
        const resources = { ...player.resources };
        RESOURCES.forEach((resource) => {
          resources[resource] -= discardSelection[resource];
        });
        return { ...player, resources };
      });
      const remainingDiscardPlayerIds = current.pendingSeven.remainingDiscardPlayerIds.slice(1);
      const phase = remainingDiscardPlayerIds.length ? "discard" : "moveRobber";
      return {
        ...current,
        players,
        pendingSeven: {
          ...current.pendingSeven,
          phase,
          remainingDiscardPlayerIds,
        },
        log: [
          `${discardingPlayer.name} discarded ${required} resource card${required === 1 ? "" : "s"}.${phase === "moveRobber" ? ` ${current.players[current.currentPlayerIndex].name} must now move the robber.` : ""}`,
          ...current.log,
        ].slice(0, 24),
      };
    });
    setDiscardSelection(emptyResources());
  };

  const moveRobber = (tileId) => {
    if (!game?.pendingSeven || game.pendingSeven.phase !== "moveRobber" || tileId === game.robberTileId) return;
    if (!isMyTurn) return;
    void updateGame((current) => resolveRobberMove(current, tileId));
  };

  const chooseRobberVictim = (playerId) => {
    if (!game?.pendingSeven || game.pendingSeven.phase !== "chooseVictim") return;
    if (!isMyTurn) return;
    void updateGame((current) => selectRobberVictim(current, playerId));
  };

  const stealRobberCard = (cardIndex) => {
    if (!game?.pendingSeven || game.pendingSeven.phase !== "chooseCard") return;
    if (!isMyTurn) return;
    void updateGame((current) => resolveRobberSteal(current, cardIndex));
  };

  if (!isReady) {
    return <main className="catan-page catan-setup-page"><section className="catan-setup-card"><p>Loading Catan…</p></section></main>;
  }

  if (!game) {
    return (
      <main className="catan-page catan-setup-page">
        <section className="catan-setup-card">
          <div className="catan-mark" aria-hidden="true"><span /><span /><span /></div>
          <p className="catan-kicker">The island awaits</p>
          <h1>CATAN</h1>
          <p className="catan-intro">Create a shared room, invite up to three other settlers, and play together from different devices.</p>

          <label className="catan-entry-field">
            <span>Your name</span>
            <input value={name} maxLength={18} placeholder="Enter your name" onChange={(event) => setName(event.target.value)} />
          </label>

          <button className="catan-primary catan-start" onClick={createRoom}>
            <MapIcon size={19} /> Create room
          </button>

          <div className="entry-divider"><span>or join a room</span></div>
          <div className="join-room-row">
            <input value={joinCode} maxLength={5} placeholder="ROOM CODE" aria-label="Room code" onChange={(event) => setJoinCode(event.target.value.toUpperCase())} />
            <button onClick={joinRoom}><DoorOpen size={18} /> Join</button>
          </div>
          {error && <p className="catan-room-error">{error}</p>}
          <p className="setup-note">2–4 players · Live room sync {isCatanOnlineSyncEnabled ? "enabled" : "uses this game server"}</p>
        </section>
      </main>
    );
  }

  if (game.phase === "lobby") {
    const roomLink = typeof window === "undefined" ? "" : `${window.location.origin}/catan?room=${game.roomCode}`;
    return (
      <main className="catan-page catan-setup-page">
        <section className="catan-setup-card catan-lobby-card">
          <p className="catan-kicker">Gather your settlers</p>
          <h1>CATAN</h1>
          <div className="room-code-panel">
            <span>Room code</span>
            <strong>{game.roomCode}</strong>
            <button onClick={() => {
              void navigator.clipboard.writeText(roomLink);
              setCopied(true);
              window.setTimeout(() => setCopied(false), 1600);
            }}><Copy size={16} /> {copied ? "Copied" : "Copy invite"}</button>
          </div>
          <div className="lobby-player-list">
            {game.players.map((player) => (
              <div key={player.id}>
                <span className={`player-swatch ${player.color}`} />
                <strong>{player.name}</strong>
                <small>{player.id === game.hostId ? "Host" : player.id === playerId ? "You" : "Ready"}</small>
              </div>
            ))}
            {Array.from({ length: 4 - game.players.length }, (_, index) => <div key={`empty-${index}`} className="empty"><span /> Waiting for player…</div>)}
          </div>
          {isHost ? (
            <button className="catan-primary catan-start" disabled={game.players.length < 2} onClick={startGame}>
              <Play size={18} /> Start game
            </button>
          ) : <p className="lobby-waiting">Waiting for the host to start the game…</p>}
          {isHost && game.players.length < 2 && <p className="setup-note">At least two players are needed.</p>}
          {error && <p className="catan-room-error">{error}</p>}
          <button className="leave-room-button" onClick={leaveRoom}>Leave room</button>
        </section>
      </main>
    );
  }

  const winner = game.players.find((player) => player.id === game.winnerId);

  return (
    <main className="catan-page">
      {winner && <Winner player={winner} canRestart={isHost} onRestart={restartRoom} onLeave={leaveRoom} />}
      <header className="catan-game-header">
        <div>
          <p className="catan-kicker">{game.setup ? `Setup round ${game.setup.index < game.players.length ? 1 : 2}` : `Turn ${game.turn}`}</p>
          <h1>CATAN</h1>
        </div>
        <div className="turn-banner">
          <span className={`player-swatch ${activePlayer.color}`} />
          <div><small>{game.setup ? "Now placing" : "Current turn"}</small><strong>{activePlayer.name}</strong></div>
        </div>
        <button className="icon-button" aria-label="Leave room" title="Leave room" onClick={() => window.confirm("Leave this room and return to Catan home?") && leaveRoom()}>
          <DoorOpen size={18} />
        </button>
      </header>

      <section className="catan-layout">
        <section className="board-panel">
          <div className="board-instruction">
            <span>{game.setup
              ? `Choose where ${activePlayer.name} will place a starting ${game.setup.step}`
              : game.pendingSeven?.phase === "discard"
                ? `${discardingPlayer.name} must choose half their cards to discard`
                : game.pendingSeven?.phase === "moveRobber"
                  ? `${activePlayer.name}, choose a different tile for the robber`
                  : game.pendingSeven?.phase === "chooseVictim"
                    ? `${activePlayer.name}, choose an adjacent player to steal from`
                    : game.pendingSeven?.phase === "chooseCard"
                      ? `${activePlayer.name}, pick one face-down card to steal`
                    : game.pendingTrade
                      ? `${game.players.find((player) => player.id === game.pendingTrade.toPlayerId)?.name} must answer the trade offer`
                  : buildMode
                    ? `Choose a place for your ${buildMode}`
                    : game.rolled
                      ? "Build, trade, or end your turn"
                      : "Roll to begin your turn"}</span>
            {!game.setup && buildMode && <button onClick={() => setBuildMode(null)}><X size={15} /> Cancel</button>}
          </div>
          <CatanBoard
            game={game}
            buildMode={placementMode}
            legalVertices={legalVertices}
            legalEdges={legalEdges}
            onVertex={buildAtVertex}
            onEdge={buildRoad}
            robberMoveMode={game.pendingSeven?.phase === "moveRobber" && isMyTurn}
            onTile={moveRobber}
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
                <p className="panel-kicker">{game.setup ? "Starting placement" : isMyTurn ? "Your turn" : "Current turn"}</p>
                <h2>{activePlayer.name}</h2>
              </div>
              <span className={`victory-chip ${activePlayer.color}`}><Crown size={16} /> {activePlayer.points}/10</span>
            </div>

            {game.setup ? (
              <div className="setup-placement-panel">
                <span className={`setup-piece-icon ${game.setup.step}`}>
                  {game.setup.step === "settlement" ? <Home size={25} /> : <Route size={25} />}
                </span>
                <div>
                  <strong>{isMyTurn ? `Place your ${game.setup.step}` : `Waiting for ${activePlayer.name}`}</strong>
                  <p>{isMyTurn ? (game.setup.step === "settlement" ? "Choose any highlighted corner. Settlements cannot be adjacent." : "Choose a highlighted edge touching your new settlement.") : `${activePlayer.name} is choosing a starting ${game.setup.step} on their device.`}</p>
                </div>
                <small>{game.setup.index + 1} of {game.setup.order.length}</small>
              </div>
            ) : <>
              <DiceTray dice={game.dice} rolling={isRolling} />
              {game.pendingSeven || game.pendingTrade ? (
                <p className="seven-turn-note">{game.pendingSeven ? "Resolve the seven" : "Resolve the trade offer"} before continuing your turn.</p>
              ) : !game.rolled ? (
              <button className="catan-primary roll-button" disabled={isRolling || !isMyTurn} onClick={rollDice}>
                {isRolling ? <RefreshCcw className="spin" size={19} /> : <Dice5 size={20} />}
                {isRolling ? "Rolling…" : isMyTurn ? "Roll dice" : `Waiting for ${activePlayer.name}`}
              </button>
            ) : (
              <button className="catan-primary end-button" disabled={!isMyTurn} onClick={endTurn}>
                {isMyTurn ? "End turn" : `Waiting for ${activePlayer.name}`} <ArrowRightLeft size={18} />
              </button>
              )}
            </>}
          </section>

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
              viewerPlayerId={playerId}
            />
          )}

          {viewerPlayer && <ResourceHand player={viewerPlayer} title="Your resource hand" />}

          {game.pendingTrade && (
            <TradeDecision game={game} viewerPlayerId={playerId} onRespond={respondToPlayerTrade} />
          )}

          {isMyTurn && !game.setup && !game.pendingSeven && !game.pendingTrade && <section className="action-card">
            <div className="section-title"><h2>Build</h2><span>Click the board to place</span></div>
            <div className="build-list">
              <BuildButton icon={Route} label="Road" cost={COSTS.road} disabled={!game.rolled || !canAfford(activePlayer, COSTS.road)} active={buildMode === "road"} onClick={() => setBuildMode(buildMode === "road" ? null : "road")} />
              <BuildButton icon={Home} label="Settlement" cost={COSTS.settlement} disabled={!game.rolled || !canAfford(activePlayer, COSTS.settlement)} active={buildMode === "settlement"} onClick={() => setBuildMode(buildMode === "settlement" ? null : "settlement")} />
              <BuildButton icon={Castle} label="City" cost={COSTS.city} disabled={!game.rolled || !canAfford(activePlayer, COSTS.city)} active={buildMode === "city"} onClick={() => setBuildMode(buildMode === "city" ? null : "city")} />
            </div>
          </section>}

          {isMyTurn && !game.setup && !game.pendingSeven && !game.pendingTrade && game.rolled && (
            <PlayerTradeBuilder
              activePlayer={activePlayer}
              partners={tradePartners}
              partner={tradePartner}
              partnerId={tradePartner?.id ?? ""}
              onPartnerChange={setTradePartnerId}
              offer={playerTradeOffer}
              request={playerTradeRequest}
              onAdjust={adjustPlayerTrade}
              onPropose={proposePlayerTrade}
            />
          )}

          {isMyTurn && !game.setup && !game.pendingSeven && !game.pendingTrade && <section className="trade-card">
            <div className="section-title"><h2>Bank trade</h2><span>Give 4 · Get 1</span></div>
            <div className="trade-row">
              <ResourceSelect value={tradeGive} onChange={setTradeGive} label="Give" />
              <ArrowRightLeft size={17} />
              <ResourceSelect value={tradeGet} onChange={setTradeGet} label="Get" />
              <button className="trade-button" disabled={!game.rolled || tradeGive === tradeGet || activePlayer.resources[tradeGive] < 4} onClick={bankTrade}>Trade</button>
            </div>
          </section>}
        </aside>
      </section>

      <section className="game-footer-grid">
        <section className="score-card">
          <div className="section-title"><h2>Settlers</h2><span>First to 10 points wins</span></div>
          <div className="score-list">
            {[...game.players].sort((a, b) => b.points - a.points).map((player) => (
              <div key={player.id} className={player.id === activePlayer.id ? "active" : ""}>
                <span className={`player-swatch ${player.color}`} />
                <strong>{player.name}</strong>
                <small>{totalResources(player.resources)} {totalResources(player.resources) === 1 ? "card" : "cards"}</small>
                <b>{player.points} VP</b>
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

function placeStartingSettlement(game, playerId, vertexId) {
  if (!game.setup || game.setup.step !== "settlement") return game;
  const isSecondRound = game.setup.index >= game.players.length;
  const players = game.players.map((player) => {
    if (player.id !== playerId) return player;
    const resources = { ...player.resources };
    if (isSecondRound) {
      const vertex = BOARD.vertices.find((candidate) => candidate.id === vertexId);
      vertex.tileIds.forEach((tileId) => {
        const resource = game.tiles[tileId].resource;
        if (resource !== "desert") resources[resource] += 1;
      });
    }
    return { ...player, resources, points: player.points + 1 };
  });
  return {
    ...game,
    players,
    settlements: {
      ...game.settlements,
      [vertexId]: { playerId, type: "settlement" },
    },
    setup: {
      ...game.setup,
      step: "road",
      settlementVertexId: vertexId,
    },
    log: [`${players.find((player) => player.id === playerId).name} placed a starting settlement. Choose its road.`, ...game.log].slice(0, 24),
  };
}

function placeStartingRoad(game, playerId, edgeId) {
  if (!game.setup || game.setup.step !== "road") return game;
  const roads = { ...game.roads, [edgeId]: playerId };
  const nextSetupIndex = game.setup.index + 1;
  const player = game.players.find((candidate) => candidate.id === playerId);
  if (nextSetupIndex >= game.setup.order.length) {
    return {
      ...game,
      roads,
      setup: null,
      currentPlayerIndex: 0,
      log: [
        `${player.name} placed the final starting road. ${game.players[0].name} takes the first turn.`,
        ...game.log,
      ].slice(0, 24),
    };
  }
  const nextPlayerId = game.setup.order[nextSetupIndex];
  const nextPlayerIndex = game.players.findIndex((candidate) => candidate.id === nextPlayerId);
  return {
    ...game,
    roads,
    currentPlayerIndex: nextPlayerIndex,
    setup: {
      ...game.setup,
      index: nextSetupIndex,
      step: "settlement",
      settlementVertexId: null,
    },
    log: [
      `${player.name} placed a starting road. ${game.players[nextPlayerIndex].name} chooses next.`,
      ...game.log,
    ].slice(0, 24),
  };
}

function resolvePlayerTrade(game, accepted) {
  const trade = game.pendingTrade;
  if (!trade) return game;
  const fromPlayer = game.players.find((player) => player.id === trade.fromPlayerId);
  const toPlayer = game.players.find((player) => player.id === trade.toPlayerId);
  if (!fromPlayer || !toPlayer) return { ...game, pendingTrade: null };
  if (!accepted) {
    return {
      ...game,
      pendingTrade: null,
      log: [`${toPlayer.name} declined ${fromPlayer.name}'s trade.`, ...game.log].slice(0, 24),
    };
  }
  const canComplete = RESOURCES.every((resource) =>
    fromPlayer.resources[resource] >= trade.offer[resource] &&
    toPlayer.resources[resource] >= trade.request[resource],
  );
  if (!canComplete) {
    return {
      ...game,
      pendingTrade: null,
      log: ["The trade expired because the required cards were no longer available.", ...game.log].slice(0, 24),
    };
  }
  const players = game.players.map((player) => {
    if (player.id !== fromPlayer.id && player.id !== toPlayer.id) return player;
    const resources = { ...player.resources };
    RESOURCES.forEach((resource) => {
      if (player.id === fromPlayer.id) {
        resources[resource] += trade.request[resource] - trade.offer[resource];
      } else {
        resources[resource] += trade.offer[resource] - trade.request[resource];
      }
    });
    return { ...player, resources };
  });
  return {
    ...game,
    players,
    pendingTrade: null,
    log: [`${fromPlayer.name} and ${toPlayer.name} completed a trade.`, ...game.log].slice(0, 24),
  };
}

function completeBuild(game, playerId, kind, targetId) {
  const cost = COSTS[kind];
  const players = game.players.map((player) => {
    if (player.id !== playerId) return player;
    const paid = payCost(player, cost);
    return { ...paid, points: paid.points + (kind === "road" ? 0 : 1) };
  });
  const player = players.find((candidate) => candidate.id === playerId);
  const settlements = { ...game.settlements };
  const roads = { ...game.roads };
  if (kind === "road") roads[targetId] = playerId;
  if (kind === "settlement") settlements[targetId] = { playerId, type: "settlement" };
  if (kind === "city") settlements[targetId] = { playerId, type: "city" };
  const winnerId = player.points >= 10 ? playerId : null;
  return {
    ...game,
    players,
    settlements,
    roads,
    winnerId,
    log: [`${player.name} built a ${kind}${winnerId ? " and reached 10 victory points!" : "."}`, ...game.log].slice(0, 24),
  };
}

function resolveRobberMove(game, tileId) {
  if (!game.pendingSeven || game.pendingSeven.phase !== "moveRobber" || tileId === game.robberTileId) return game;
  const tile = game.tiles.find((candidate) => candidate.id === tileId);
  if (!tile) return game;
  const activePlayer = game.players[game.currentPlayerIndex];
  const victimIds = [...new Set(
    tile.vertexIds
      .map((vertexId) => game.settlements[vertexId]?.playerId)
      .filter((playerId) => playerId && playerId !== activePlayer.id),
  )];
  const eligibleVictimIds = victimIds.filter((playerId) => {
    const player = game.players.find((candidate) => candidate.id === playerId);
    return player && totalResources(player.resources) > 0;
  });
  const needsVictimChoice = eligibleVictimIds.length > 0;
  return {
    ...game,
    robberTileId: tileId,
    pendingSeven: needsVictimChoice
      ? { ...game.pendingSeven, phase: "chooseVictim", eligibleVictimIds }
      : null,
    log: [
      needsVictimChoice
        ? `${activePlayer.name} moved the robber and must choose an adjacent player to steal from.`
        : `${activePlayer.name} moved the robber. No adjacent player had a card to steal.`,
      ...game.log,
    ].slice(0, 24),
  };
}

function selectRobberVictim(game, victimId) {
  const pending = game.pendingSeven;
  if (!pending || pending.phase !== "chooseVictim" || !pending.eligibleVictimIds.includes(victimId)) return game;
  const victim = game.players.find((player) => player.id === victimId);
  if (!victim || totalResources(victim.resources) === 0) {
    return { ...game, pendingSeven: null };
  }
  return {
    ...game,
    pendingSeven: { ...pending, phase: "chooseCard", victimId },
    log: [`${game.players[game.currentPlayerIndex].name} chose to steal from ${victim.name}.`, ...game.log].slice(0, 24),
  };
}

function resolveRobberSteal(game, cardIndex) {
  const pending = game.pendingSeven;
  if (!pending || pending.phase !== "chooseCard" || !Number.isInteger(cardIndex)) return game;
  const players = game.players.map((player) => ({ ...player, resources: { ...player.resources } }));
  const roller = players[game.currentPlayerIndex];
  const victim = players.find((player) => player.id === pending.victimId);
  if (!victim || cardIndex < 0 || cardIndex >= totalResources(victim.resources)) return game;
  const availableResources = RESOURCES.filter((resource) => victim.resources[resource] > 0);
  const stolenResource = availableResources[Math.floor(Math.random() * availableResources.length)];
  victim.resources[stolenResource] -= 1;
  roller.resources[stolenResource] += 1;
  return {
    ...game,
    players,
    pendingSeven: null,
    log: [`${roller.name} picked a face-down card from ${victim.name}.`, ...game.log].slice(0, 24),
  };
}

function CatanBoard({ game, buildMode, legalVertices, legalEdges, onVertex, onEdge, robberMoveMode, onTile }) {
  const vertexById = Object.fromEntries(BOARD.vertices.map((vertex) => [vertex.id, vertex]));
  return (
    <div className="board-wrap">
      <svg className="catan-board" viewBox="0 0 860 680" role="img" aria-label="Interactive Catan island board">
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
        <rect width="860" height="680" rx="28" fill="url(#sea)" />
        <rect width="860" height="680" rx="28" fill="url(#waves)" />
        <path className="island-halo" d="M119 339C119 172 266 63 430 63S741 172 741 339 597 617 430 617 119 506 119 339Z" />

        {game.tiles.map((tile) => {
          const robberTarget = robberMoveMode && tile.id !== game.robberTileId;
          const terrainLabel = tile.resource === "desert" ? "desert" : RESOURCE_INFO[tile.resource].label.toLowerCase();
          return (
          <g
            key={tile.id}
            className={`terrain-tile ${tile.resource} ${robberTarget ? "robber-target" : ""}`}
            filter="url(#tile-shadow)"
            role={robberTarget ? "button" : undefined}
            tabIndex={robberTarget ? 0 : undefined}
            aria-label={robberTarget ? `Move robber to ${terrainLabel} tile${tile.number ? ` number ${tile.number}` : ""}` : undefined}
            onClick={() => robberTarget && onTile(tile.id)}
            onKeyDown={(event) => {
              if (robberTarget && (event.key === "Enter" || event.key === " ")) onTile(tile.id);
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
            {game.robberTileId === tile.id && <g className="robber" transform={`translate(${tile.center.x + 31} ${tile.center.y - 30})`}><circle r="17" /><text y="6">♟</text></g>}
          </g>
          );
        })}

        {BOARD.edges.map((edge) => {
          const from = vertexById[edge.from];
          const to = vertexById[edge.to];
          const ownerId = game.roads[edge.id];
          const owner = game.players.find((player) => player.id === ownerId);
          const legal = legalEdges.has(edge.id);
          return (
            <g key={edge.id} className={`board-edge ${legal ? "legal" : ""}`} onClick={() => legal && onEdge(edge.id)}>
              {owner && <line className="road-outline" x1={from.x} y1={from.y} x2={to.x} y2={to.y} />}
              {owner && <line className="road-piece" style={{ "--piece-color": owner.hex }} x1={from.x} y1={from.y} x2={to.x} y2={to.y} />}
              {legal && <line className="road-preview" x1={from.x} y1={from.y} x2={to.x} y2={to.y} />}
              <line className="edge-hit" x1={from.x} y1={from.y} x2={to.x} y2={to.y} />
            </g>
          );
        })}

        {BOARD.vertices.map((vertex) => {
          const building = game.settlements[vertex.id];
          const owner = game.players.find((player) => player.id === building?.playerId);
          const legal = legalVertices.has(vertex.id);
          const canUpgrade = buildMode === "city" && building?.type === "settlement" && building.playerId === game.players[game.currentPlayerIndex].id;
          return (
            <g key={vertex.id} className={`board-vertex ${legal || canUpgrade ? "legal" : ""}`} transform={`translate(${vertex.x} ${vertex.y})`} onClick={() => (legal || canUpgrade) && onVertex(vertex.id)}>
              {(legal || canUpgrade) && <circle className="build-target" r="12" />}
              {building?.type === "settlement" && <Settlement color={owner.hex} />}
              {building?.type === "city" && <City color={owner.hex} />}
              <circle className="vertex-hit" r="15" />
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function TerrainArt({ resource, x, y }) {
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

function DiceTray({ dice, rolling }) {
  return (
    <div className="catan-dice-tray" aria-label={`Dice showing ${dice[0]} and ${dice[1]}`}>
      <Die value={rolling ? 6 : dice[0]} rolling={rolling} tone="red" />
      <Die value={rolling ? 5 : dice[1]} rolling={rolling} tone="yellow" delay />
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

function SevenResolution({ pendingSeven, activePlayer, discardingPlayer, selection, onAdjust, onConfirm, players, onVictimChoice, onCardChoice, viewerPlayerId }) {
  const isRobberController = activePlayer.id === viewerPlayerId;
  if (pendingSeven.phase === "moveRobber") {
    return (
      <section className="seven-card robber-choice-card">
        <div className="seven-badge">7</div>
        <div>
          <p className="panel-kicker">Move the robber</p>
          <h2>{activePlayer.name}, choose a new tile</h2>
          <p>{isRobberController ? "Every available tile is highlighted. The robber cannot stay on its previous tile." : `Waiting for ${activePlayer.name} to choose on their device.`}</p>
        </div>
      </section>
    );
  }
  if (pendingSeven.phase === "chooseVictim") {
    const victims = players.filter((player) => pendingSeven.eligibleVictimIds.includes(player.id));
    return (
      <section className="seven-card victim-choice-card">
        <div className="section-title">
          <div><p className="panel-kicker">Robber placed</p><h2>Choose who to steal from</h2></div>
          <span>Adjacent players only</span>
        </div>
        <div className="victim-list">
          {victims.map((player) => (
            <button key={player.id} disabled={!isRobberController} onClick={() => onVictimChoice(player.id)}>
              <span className={`player-swatch ${player.color}`} />
              <strong>{player.name}</strong>
              <small>{totalResources(player.resources)} cards</small>
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
          <div><p className="panel-kicker">Choose a card</p><h2>Take one from {victim.name}</h2></div>
          <span>{totalResources(victim.resources)} cards available</span>
        </div>
        <p className="hidden-card-copy">{isRobberController ? "The cards are face down. Pick one without seeing its resource." : `Waiting for ${activePlayer.name} to pick a face-down card.`}</p>
        <div className="robber-card-options">
          {Array.from({ length: totalResources(victim.resources) }, (_, index) => (
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
          <div><p className="panel-kicker">Seven rolled</p><h2>Waiting for {discardingPlayer.name}</h2></div>
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
        <div><p className="panel-kicker">Seven rolled</p><h2>{discardingPlayer.name} discards</h2></div>
        <span>{selected} of {required} selected</span>
      </div>
      <p className="discard-copy">Choose exactly {required} of your {totalResources(discardingPlayer.resources)} cards.</p>
      <div className="discard-grid">
        {RESOURCES.map((resource) => (
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

function PlayerTradeBuilder({ activePlayer, partners, partner, partnerId, onPartnerChange, offer, request, onAdjust, onPropose }) {
  const canPropose = partner && totalResources(offer) > 0 && totalResources(request) > 0;
  return (
    <section className="player-trade-card">
      <div className="section-title"><h2>Player trade</h2><span>Negotiate resources</span></div>
      <label className="trade-partner-select">
        <span>Trade with</span>
        <select value={partnerId} onChange={(event) => onPartnerChange(event.target.value)}>
          {partners.map((player) => <option key={player.id} value={player.id}>{player.name}</option>)}
        </select>
      </label>
      <div className="player-trade-columns">
        <TradeResourceEditor title={`${activePlayer.name} offers`} values={offer} owner={activePlayer} side="offer" onAdjust={onAdjust} />
        <TradeResourceEditor title={`${partner?.name ?? "Player"} gives`} values={request} owner={partner} side="request" hideInventory onAdjust={onAdjust} />
      </div>
      <button className="catan-primary propose-trade" disabled={!canPropose} onClick={onPropose}>
        <ArrowRightLeft size={17} /> Propose trade
      </button>
    </section>
  );
}

function TradeResourceEditor({ title, values, owner, side, hideInventory = false, onAdjust }) {
  return (
    <div className="trade-editor">
      <strong>{title}</strong>
      {RESOURCES.map((resource) => (
        <div key={resource}>
          <span>{RESOURCE_INFO[resource].short}</span>
          <small>{hideInventory ? "?" : owner?.resources[resource] ?? 0}</small>
          <button aria-label={`Remove ${RESOURCE_INFO[resource].short} from ${side}`} disabled={values[resource] === 0} onClick={() => onAdjust(side, resource, -1)}>−</button>
          <b>{values[resource]}</b>
          <button aria-label={`Add ${RESOURCE_INFO[resource].short} to ${side}`} disabled={!owner || values[resource] >= (hideInventory ? 19 : owner.resources[resource])} onClick={() => onAdjust(side, resource, 1)}>+</button>
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
  const isTarget = viewerPlayerId === trade.toPlayerId;
  const isProposer = viewerPlayerId === trade.fromPlayerId;
  return (
    <section className="player-trade-card trade-decision-card">
      <p className="panel-kicker">Trade offer for {toPlayer?.name}</p>
      <h2>{fromPlayer?.name} proposes a trade</h2>
      <div className="trade-summary">
        <div><span>{toPlayer?.name} receives</span><strong>{formatResourceBundle(trade.offer)}</strong></div>
        <ArrowRightLeft size={18} />
        <div><span>{toPlayer?.name} gives</span><strong>{formatResourceBundle(trade.request)}</strong></div>
      </div>
      {isTarget && <div className="trade-response-actions">
          <button className="catan-primary" onClick={() => onRespond(true)}><Check size={17} /> Accept</button>
          <button onClick={() => onRespond(false)}><X size={17} /> Decline</button>
        </div>}
      {isProposer && <div className="trade-response-actions single"><button onClick={() => onRespond(false)}><X size={17} /> Cancel offer</button></div>}
      {!isTarget && !isProposer && <p className="trade-waiting-copy">Waiting for {toPlayer?.name} to answer on their device.</p>}
    </section>
  );
}

function formatResourceBundle(resources) {
  return RESOURCES
    .filter((resource) => resources[resource] > 0)
    .map((resource) => `${resources[resource]} ${RESOURCE_INFO[resource].short}`)
    .join(" · ");
}

function ResourceHand({ player, title = "Resource hand" }) {
  return (
    <section className="resource-card">
      <div className="section-title"><h2>{title}</h2><span>{totalResources(player.resources)} cards</span></div>
      <div className="resource-grid">
        {RESOURCES.map((resource) => (
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

function ResourceSelect({ value, onChange, label }) {
  return (
    <label className="resource-select">
      <span>{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        {RESOURCES.map((resource) => <option key={resource} value={resource}>{RESOURCE_INFO[resource].short}</option>)}
      </select>
    </label>
  );
}

function Winner({ player, canRestart, onRestart, onLeave }) {
  return (
    <div className="catan-winner" role="dialog" aria-modal="true" aria-label={`${player.name} won`}>
      <section>
        <div className="winner-rays"><Trophy size={64} /></div>
        <p className="catan-kicker">The island has a new ruler</p>
        <h2>{player.name} wins!</h2>
        <p>Ten victory points and a settlement worthy of legend.</p>
        {canRestart
          ? <button className="catan-primary" onClick={onRestart}><Users size={18} /> Return room to lobby</button>
          : <p className="winner-waiting">Waiting for the host to start another game.</p>}
        <button className="leave-room-button" onClick={onLeave}>Leave room</button>
      </section>
    </div>
  );
}
