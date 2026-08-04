"use client";

import { useMemo, useState } from "react";
import {
  ArrowRightLeft,
  Castle,
  Check,
  Crown,
  Dice5,
  Home,
  Map as MapIcon,
  RefreshCcw,
  Route,
  Sparkles,
  Trophy,
  Users,
  X,
} from "lucide-react";

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
  if ([edge.from, edge.to].some((vertexId) => settlements[vertexId]?.playerId === playerId)) return true;
  return [edge.from, edge.to].some((vertexId) =>
    BOARD.vertexEdges[vertexId].some((edgeId) => roads[edgeId] === playerId),
  );
}

function createGame(names) {
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
  const players = names.map((name, index) => ({
    id: `p${index}`,
    name: name.trim() || `Player ${index + 1}`,
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

export default function CatanClient() {
  const [playerCount, setPlayerCount] = useState(3);
  const [names, setNames] = useState(["Player 1", "Player 2", "Player 3", "Player 4"]);
  const [game, setGame] = useState(null);
  const [isRolling, setIsRolling] = useState(false);
  const [buildMode, setBuildMode] = useState(null);
  const [tradeGive, setTradeGive] = useState("wood");
  const [tradeGet, setTradeGet] = useState("brick");

  const activePlayer = game?.players[game.currentPlayerIndex];
  const placementMode = game?.setup?.step ?? buildMode;
  const legalVertices = useMemo(() => {
    if (!game || !activePlayer || placementMode !== "settlement") return new Set();
    const startingPlacement = Boolean(game.setup);
    return new Set(
      BOARD.vertices
        .filter((vertex) =>
          isSettlementLegal(vertex.id, game.settlements, !startingPlacement, activePlayer.id, game.roads),
        )
        .map((vertex) => vertex.id),
    );
  }, [activePlayer, game, placementMode]);
  const legalEdges = useMemo(() => {
    if (!game || !activePlayer || placementMode !== "road") return new Set();
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
  }, [activePlayer, game, placementMode]);

  const startGame = () => {
    setGame(createGame(names.slice(0, playerCount)));
    setBuildMode(null);
    window.scrollTo(0, 0);
  };

  const rollDice = () => {
    if (!game || game.setup || game.rolled || game.winnerId || isRolling) return;
    setIsRolling(true);
    setBuildMode(null);
    window.setTimeout(() => {
      const dieOne = Math.floor(Math.random() * 6) + 1;
      const dieTwo = Math.floor(Math.random() * 6) + 1;
      const total = dieOne + dieTwo;
      setGame((current) => {
        if (!current || current.rolled) return current;
        const players = current.players.map((player) => ({
          ...player,
          resources: { ...player.resources },
        }));
        const entries = [`${players[current.currentPlayerIndex].name} rolled ${dieOne} + ${dieTwo} = ${total}.`];
        let robberTileId = current.robberTileId;

        if (total === 7) {
          const candidates = current.tiles.filter((tile) => tile.id !== current.robberTileId && tile.resource !== "desert");
          const target = candidates.sort((a, b) => {
            const score = (tile) => tile.vertexIds.reduce((sum, vertexId) => {
              const building = current.settlements[vertexId];
              return sum + (building ? (building.type === "city" ? 2 : 1) : 0);
            }, 0);
            return score(b) - score(a);
          })[0];
          robberTileId = target?.id ?? robberTileId;
          const currentPlayer = players[current.currentPlayerIndex];
          const victims = players
            .filter((player) => player.id !== currentPlayer.id && totalResources(player.resources) > 0)
            .sort((a, b) => totalResources(b.resources) - totalResources(a.resources));
          const victim = victims[0];
          if (victim) {
            const available = RESOURCES.filter((resource) => victim.resources[resource] > 0);
            const stolen = available[Math.floor(Math.random() * available.length)];
            victim.resources[stolen] -= 1;
            currentPlayer.resources[stolen] += 1;
            entries.push(`The robber moved and ${currentPlayer.name} stole one card from ${victim.name}.`);
          } else {
            entries.push("The robber moved, but there were no resource cards to steal.");
          }
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
          rolled: true,
          log: [...entries, ...current.log].slice(0, 24),
        };
      });
      setIsRolling(false);
    }, 950);
  };

  const buildAtVertex = (vertexId) => {
    if (!game || !activePlayer || game.winnerId) return;
    if (game.setup?.step === "settlement") {
      if (!legalVertices.has(vertexId)) return;
      setGame((current) => placeStartingSettlement(current, activePlayer.id, vertexId));
      return;
    }
    if (!game.rolled) return;
    if (buildMode === "settlement") {
      if (!legalVertices.has(vertexId) || !canAfford(activePlayer, COSTS.settlement)) return;
      setGame((current) => completeBuild(current, activePlayer.id, "settlement", vertexId));
      setBuildMode(null);
      return;
    }
    if (buildMode === "city") {
      const building = game.settlements[vertexId];
      if (building?.playerId !== activePlayer.id || building.type !== "settlement" || !canAfford(activePlayer, COSTS.city)) return;
      setGame((current) => completeBuild(current, activePlayer.id, "city", vertexId));
      setBuildMode(null);
    }
  };

  const buildRoad = (edgeId) => {
    if (!game || !activePlayer || game.winnerId || !legalEdges.has(edgeId)) return;
    if (game.setup?.step === "road") {
      setGame((current) => placeStartingRoad(current, activePlayer.id, edgeId));
      return;
    }
    if (buildMode !== "road" || !game.rolled) return;
    if (!canAfford(activePlayer, COSTS.road)) return;
    setGame((current) => completeBuild(current, activePlayer.id, "road", edgeId));
    setBuildMode(null);
  };

  const bankTrade = () => {
    if (!game || !activePlayer || !game.rolled || tradeGive === tradeGet || activePlayer.resources[tradeGive] < 4) return;
    setGame((current) => {
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

  const endTurn = () => {
    if (!game?.rolled || game.winnerId) return;
    const nextIndex = (game.currentPlayerIndex + 1) % game.players.length;
    const turn = nextIndex === 0 ? game.turn + 1 : game.turn;
    setGame((current) => ({
      ...current,
      currentPlayerIndex: nextIndex,
      turn,
      rolled: false,
      log: [`${current.players[nextIndex].name} is up next.`, ...current.log].slice(0, 24),
    }));
    setBuildMode(null);
  };

  if (!game) {
    return (
      <main className="catan-page catan-setup-page">
        <section className="catan-setup-card">
          <div className="catan-mark" aria-hidden="true"><span /><span /><span /></div>
          <p className="catan-kicker">The island awaits</p>
          <h1>CATAN</h1>
          <p className="catan-intro">Build roads, raise settlements, and trade your way to ten victory points.</p>

          <div className="setup-field">
            <span>Players</span>
            <div className="player-count" role="group" aria-label="Number of players">
              {[2, 3, 4].map((count) => (
                <button key={count} className={playerCount === count ? "selected" : ""} onClick={() => setPlayerCount(count)}>
                  {count}
                </button>
              ))}
            </div>
          </div>

          <div className="catan-name-list">
            {names.slice(0, playerCount).map((name, index) => (
              <label key={index}>
                <span className={`player-swatch ${PLAYER_STYLES[index].color}`} />
                <input
                  value={name}
                  maxLength={18}
                  aria-label={`Player ${index + 1} name`}
                  onChange={(event) => setNames((current) => current.map((value, nameIndex) => nameIndex === index ? event.target.value : value))}
                />
              </label>
            ))}
          </div>

          <button className="catan-primary catan-start" onClick={startGame}>
            <MapIcon size={19} /> Settle the island
          </button>
          <p className="setup-note">Local pass-and-play · 2–4 players · Choose your own starting positions</p>
        </section>
      </main>
    );
  }

  const winner = game.players.find((player) => player.id === game.winnerId);

  return (
    <main className="catan-page">
      {winner && <Winner player={winner} onNewGame={() => setGame(null)} />}
      <header className="catan-game-header">
        <div>
          <p className="catan-kicker">{game.setup ? `Setup round ${game.setup.index < game.players.length ? 1 : 2}` : `Turn ${game.turn}`}</p>
          <h1>CATAN</h1>
        </div>
        <div className="turn-banner">
          <span className={`player-swatch ${activePlayer.color}`} />
          <div><small>{game.setup ? "Now placing" : "Current turn"}</small><strong>{activePlayer.name}</strong></div>
        </div>
        <button className="icon-button" aria-label="Start a new game" title="Start a new game" onClick={() => window.confirm("Leave this game and return to setup?") && setGame(null)}>
          <RefreshCcw size={18} />
        </button>
      </header>

      <section className="catan-layout">
        <section className="board-panel">
          <div className="board-instruction">
            <span>{game.setup ? `Choose where ${activePlayer.name} will place a starting ${game.setup.step}` : buildMode ? `Choose a place for your ${buildMode}` : game.rolled ? "Build, trade, or end your turn" : "Roll to begin your turn"}</span>
            {!game.setup && buildMode && <button onClick={() => setBuildMode(null)}><X size={15} /> Cancel</button>}
          </div>
          <CatanBoard
            game={game}
            buildMode={placementMode}
            legalVertices={legalVertices}
            legalEdges={legalEdges}
            onVertex={buildAtVertex}
            onEdge={buildRoad}
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
                <p className="panel-kicker">{game.setup ? "Starting placement" : "Your turn"}</p>
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
                  <strong>Place your {game.setup.step}</strong>
                  <p>{game.setup.step === "settlement" ? "Choose any highlighted corner. Settlements cannot be adjacent." : "Choose a highlighted edge touching your new settlement."}</p>
                </div>
                <small>{game.setup.index + 1} of {game.setup.order.length}</small>
              </div>
            ) : <>
              <DiceTray dice={game.dice} rolling={isRolling} />
              {!game.rolled ? (
              <button className="catan-primary roll-button" disabled={isRolling} onClick={rollDice}>
                {isRolling ? <RefreshCcw className="spin" size={19} /> : <Dice5 size={20} />}
                {isRolling ? "Rolling…" : "Roll dice"}
              </button>
            ) : (
              <button className="catan-primary end-button" onClick={endTurn}>
                End turn <ArrowRightLeft size={18} />
              </button>
              )}
            </>}
          </section>

          <ResourceHand player={activePlayer} />

          {!game.setup && <section className="action-card">
            <div className="section-title"><h2>Build</h2><span>Click the board to place</span></div>
            <div className="build-list">
              <BuildButton icon={Route} label="Road" cost={COSTS.road} disabled={!game.rolled || !canAfford(activePlayer, COSTS.road)} active={buildMode === "road"} onClick={() => setBuildMode(buildMode === "road" ? null : "road")} />
              <BuildButton icon={Home} label="Settlement" cost={COSTS.settlement} disabled={!game.rolled || !canAfford(activePlayer, COSTS.settlement)} active={buildMode === "settlement"} onClick={() => setBuildMode(buildMode === "settlement" ? null : "settlement")} />
              <BuildButton icon={Castle} label="City" cost={COSTS.city} disabled={!game.rolled || !canAfford(activePlayer, COSTS.city)} active={buildMode === "city"} onClick={() => setBuildMode(buildMode === "city" ? null : "city")} />
            </div>
          </section>}

          {!game.setup && <section className="trade-card">
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

function CatanBoard({ game, buildMode, legalVertices, legalEdges, onVertex, onEdge }) {
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

        {game.tiles.map((tile) => (
          <g key={tile.id} className={`terrain-tile ${tile.resource}`} filter="url(#tile-shadow)">
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
        ))}

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
    <div className={`catan-die ${tone} ${rolling ? "rolling" : ""} ${delay ? "delay" : ""}`}>
      <div className="die-shadow" />
      <div className="die-face">
        {Array.from({ length: 9 }, (_, index) => <span key={index} className={pipIsVisible(value, index) ? "pip visible" : "pip"} />)}
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

function ResourceHand({ player }) {
  return (
    <section className="resource-card">
      <div className="section-title"><h2>Resource hand</h2><span>{totalResources(player.resources)} cards</span></div>
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

function Winner({ player, onNewGame }) {
  return (
    <div className="catan-winner" role="dialog" aria-modal="true" aria-label={`${player.name} won`}>
      <section>
        <div className="winner-rays"><Trophy size={64} /></div>
        <p className="catan-kicker">The island has a new ruler</p>
        <h2>{player.name} wins!</h2>
        <p>Ten victory points and a settlement worthy of legend.</p>
        <button className="catan-primary" onClick={onNewGame}><Users size={18} /> Play again</button>
      </section>
    </div>
  );
}
