"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Bot,
  ChevronRight,
  CircleHelp,
  Copy,
  Crown,
  Dice5,
  DoorOpen,
  Flag,
  Layers3,
  Minus,
  MoveRight,
  Play,
  Plus,
  RotateCcw,
  Shield,
  Swords,
  Target,
  Trophy,
  Users,
  X,
} from "lucide-react";
import {
  CARD_TYPES,
  CONTINENTS,
  MAP_CONNECTIONS,
  TERRITORIES,
  advancePhase,
  attackTerritory,
  clampArmySelection,
  controlledContinents,
  createRiskGameFromLobby,
  findTradeSet,
  fortifyTerritory,
  hasOwnedPath,
  mustTradeCards,
  placeReinforcement,
  PLAYER_STYLES,
  resolveConquestMove,
  runComputerTurn,
  tradeBonusFor,
  tradeCards,
  territoriesForPlayer,
} from "../lib/risk";
import { RISK_BORDER_REGIONS, buildRiskTerritoryBorderSegments } from "../lib/risk-map-borders";
import { RiskRoomService } from "./risk-room-service";

const playerIdStorageKey = "risk-player-id";
const playerNameStorageKey = "risk-player-name";

const PHASES = {
  reinforce: {
    label: "Reinforce",
    icon: Shield,
    copy: "Select one of your territories, then choose how many armies to deploy.",
  },
  attack: {
    label: "Attack",
    icon: Swords,
    copy: "Select one of your territories, then an adjacent rival.",
  },
  fortify: {
    label: "Fortify",
    icon: Flag,
    copy: "Move armies through your connected territory, or end your turn.",
  },
};

const DICE_PIPS = {
  1: [4],
  2: [0, 8],
  3: [0, 4, 8],
  4: [0, 2, 6, 8],
  5: [0, 2, 4, 6, 8],
  6: [0, 2, 3, 5, 6, 8],
};

const MAP_LABELS_ABOVE = new Set([
  "northwest-territory", "greenland", "ontario", "iceland", "scandinavia", "ural",
  "siberia", "yakutsk", "irkutsk", "mongolia", "japan", "new-guinea",
]);

function Dice({ value, tone, rolling = false, delay = false }) {
  return (
    <span className={`risk-die ${tone} value-${value} ${rolling ? "rolling" : ""} ${delay ? "delay" : ""}`} aria-label={rolling ? "Die rolling" : `Rolled ${value}`}>
      <i className="risk-die-shadow" />
      <span className="risk-die-cube">
        {[1, 2, 3, 4, 5, 6].map((faceValue) => (
          <span key={faceValue} className={`risk-die-face face-${faceValue}`}>
            {Array.from({ length: 9 }, (_, index) => (
              <i key={index} className={DICE_PIPS[faceValue].includes(index) ? "visible" : ""} />
            ))}
          </span>
        ))}
      </span>
    </span>
  );
}

function MapConnection({ fromId, toId, game }) {
  const from = TERRITORIES[fromId];
  const to = TERRITORIES[toId];
  const sharedOwner = game.territories[fromId].ownerId === game.territories[toId].ownerId;
  const className = sharedOwner ? "owned" : "contested";
  if ([fromId, toId].includes("alaska") && [fromId, toId].includes("kamchatka")) {
    return (
      <g className={`risk-route ${className}`}>
        <line x1={0} y1={from.y * 6.5} x2={from.x * 10} y2={from.y * 6.5} />
        <line x1={to.x * 10} y1={to.y * 6.5} x2={1000} y2={to.y * 6.5} />
      </g>
    );
  }
  return (
    <line
      className={`risk-route ${className}`}
      x1={from.x * 10}
      y1={from.y * 6.5}
      x2={to.x * 10}
      y2={to.y * 6.5}
    />
  );
}

function RiskTerritoryBorders({ className }) {
  const segments = RISK_BORDER_REGIONS.flatMap((region) =>
    buildRiskTerritoryBorderSegments(region).map((segment, index) => ({
      ...segment,
      id: `${region.id}-${index}`,
    })),
  );
  return (
    <g className={className} aria-hidden="true">
      {segments.map((segment) => (
        <line
          key={segment.id}
          x1={segment.from.x}
          y1={segment.from.y}
          x2={segment.to.x}
          y2={segment.to.y}
        />
      ))}
    </g>
  );
}

function WorldMap({ game, viewerPlayerId, selectedFrom, selectedTo, onTerritory, onTerritoryWheel }) {
  const playerId = viewerPlayerId;
  return (
    <div className="risk-map" aria-label="World territory map">
      <svg className="risk-map-art" viewBox="0 0 1000 650" role="presentation">
        <defs>
          <pattern id="ocean-lines" width="44" height="44" patternUnits="userSpaceOnUse">
            <path d="M0 22 Q11 15 22 22 T44 22" fill="none" stroke="rgba(255,255,255,.055)" strokeWidth="2" />
          </pattern>
          <mask id="risk-land-mask" maskUnits="userSpaceOnUse" x="0" y="0" width="1000" height="650" style={{ maskType: "alpha" }}>
            <image
              href="https://upload.wikimedia.org/wikipedia/commons/c/c0/Equirectangular_projection_world_map_without_borders.svg"
              x="0"
              y="12"
              width="1000"
              height="580"
              preserveAspectRatio="none"
            />
          </mask>
        </defs>
        <rect width="1000" height="650" fill="url(#ocean-lines)" />
        <image
          className="risk-real-world-outline"
          href="https://upload.wikimedia.org/wikipedia/commons/c/c0/Equirectangular_projection_world_map_without_borders.svg"
          x="0"
          y="12"
          width="1000"
          height="580"
          preserveAspectRatio="none"
        />
        <g mask="url(#risk-land-mask)">
          <RiskTerritoryBorders className="risk-territory-border-halo" />
          <RiskTerritoryBorders className="risk-territory-boundaries" />
        </g>
        <g className="risk-routes">
          {MAP_CONNECTIONS.map(([fromId, toId]) => (
            <MapConnection key={`${fromId}-${toId}`} fromId={fromId} toId={toId} game={game} />
          ))}
        </g>
        <g className="map-labels">
          <text x="170" y="108">North America</text>
          <text x="349" y="426">South America</text>
          <text x="505" y="120">Europe</text>
          <text x="545" y="362">Africa</text>
          <text x="782" y="92">Asia</text>
          <text x="915" y="535">Australia</text>
        </g>
        <g className="compass" transform="translate(925 575)">
          <circle r="34" />
          <path d="M0-27L7-5 0 0-7-5zM0 27L-7 5 0 0 7 5z" />
          <text x="0" y="-39">N</text>
        </g>
      </svg>

      {Object.entries(TERRITORIES).map(([id, territory]) => {
        const state = game.territories[id];
        const owner = game.players.find((player) => player.id === state.ownerId);
        const isOwned = state.ownerId === playerId;
        const isSelected = selectedFrom === id;
        const isTarget = selectedTo === id;
        const isAttackLocked = game.phase === "attack" && isOwned && state.armies <= 1;
        const labelEdge = territory.x < 11 ? "label-edge-left" : territory.x > 89 ? "label-edge-right" : "";
        const labelAbove = MAP_LABELS_ABOVE.has(id);
        const canBeTarget = selectedFrom
          && game.phase === "attack"
          && TERRITORIES[selectedFrom].neighbors.includes(id)
          && !isOwned;
        return (
          <button
            type="button"
            key={id}
            className={`risk-territory ${isOwned ? "player-owned" : ""} ${isSelected ? "selected" : ""} ${isTarget ? "targeted" : ""} ${canBeTarget ? "attackable" : ""} ${isAttackLocked ? "attack-locked" : ""} ${labelEdge} ${labelAbove ? "label-above" : ""}`}
            style={{ "--map-x": territory.x, "--map-y": territory.y, "--owner": owner.color }}
            onClick={() => onTerritory(id)}
            onWheel={(event) => onTerritoryWheel?.(event, id)}
            aria-label={`${territory.name}, ${state.armies} armies, controlled by ${owner.name}${isAttackLocked ? ", cannot attack without at least 2 armies" : ""}`}
            aria-pressed={isSelected || isTarget}
          >
            <span className="territory-name">{territory.name}</span>
            <strong>{state.armies}</strong>
          </button>
        );
      })}
    </div>
  );
}

function PlayerCard({ player, game, viewerPlayerId }) {
  const territories = territoriesForPlayer(game.territories, player.id);
  const armies = territories.reduce((sum, id) => sum + game.territories[id].armies, 0);
  const continents = controlledContinents(game.territories, player.id);
  const active = game.players[game.currentPlayerIndex].id === player.id;
  const defeated = territories.length === 0;
  return (
    <article className={`risk-player-card ${active ? "active" : ""} ${defeated ? "defeated" : ""}`} style={{ "--player-color": player.color }}>
      <span className="player-emblem">{player.isBot ? <Bot size={16} /> : <Crown size={16} />}</span>
      <div>
        <strong>{player.name}</strong>
        <span>{player.isBot ? "Computer" : player.id === viewerPlayerId ? "You" : "Commander"}</span>
      </div>
      <div className="player-counts">
        <b>{territories.length}</b>
        <span>territories</span>
      </div>
      <div className="player-counts">
        <b>{armies}</b>
        <span>armies</span>
      </div>
      <div className="player-counts card-count">
        <b>{player.cards?.length ?? 0}</b>
        <span>cards</span>
      </div>
      {continents.length > 0 && <span className="continent-crown" title={`${continents.length} controlled continents`}>{continents.length}</span>}
    </article>
  );
}

function createLobby(roomCode, hostId, name) {
  const now = Date.now();
  return {
    roomCode,
    hostId,
    phase: "lobby",
    cardTradeMode: "progressive",
    players: [{ id: hostId, name, color: PLAYER_STYLES[0].color, colorName: PLAYER_STYLES[0].name, isBot: false, cards: [] }],
    log: [`${name} created room ${roomCode}.`],
    createdAt: now,
    updatedAt: now,
  };
}

function Setup({ name, setName, joinCode, setJoinCode, onCreate, onJoin, error, ready }) {
  return (
    <main className="risk-page risk-setup">
      <section className="risk-setup-card">
        <div className="risk-crest" aria-hidden="true">
          <span /><Shield size={38} /><span />
        </div>
        <p className="risk-kicker">A game of global strategy</p>
        <h1>Risk</h1>
        <p className="risk-setup-copy">
          Create a shared room for 2–6 commanders, deploy across 42 territories, and conquer the world together online.
        </p>
        <label className="risk-name-field">
          <span>Your commander name</span>
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            onKeyDown={(event) => event.key === "Enter" && onCreate()}
            maxLength={22}
            placeholder="Commander"
          />
        </label>
        <button type="button" className="risk-primary risk-start" onClick={onCreate} disabled={!ready}>
          <Users size={18} /> Create a room
        </button>
        <div className="risk-entry-divider"><span>or join a campaign</span></div>
        <div className="risk-join-row">
          <input
            value={joinCode}
            maxLength={5}
            placeholder="ROOM CODE"
            aria-label="Room code"
            onChange={(event) => setJoinCode(event.target.value.toUpperCase())}
            onKeyDown={(event) => event.key === "Enter" && onJoin()}
          />
          <button type="button" onClick={onJoin} disabled={!ready}><DoorOpen size={17} /> Join</button>
        </div>
        {error && <p className="risk-room-error">{error}</p>}
        <p className="risk-local-note">2–6 players · Add computer commanders · Rooms update automatically</p>
      </section>
    </main>
  );
}

function Lobby({ game, playerId, onAddComputer, onRemoveComputer, onStart, onColor, onCardTradeMode, onCopy, copied, onLeave }) {
  const isHost = game.hostId === playerId;
  const viewer = game.players.find((player) => player.id === playerId);
  return (
    <main className="risk-page risk-setup">
      <section className="risk-setup-card risk-lobby-card">
        <button type="button" className="risk-lobby-leave" onClick={onLeave}>Leave room</button>
        <div className="risk-crest" aria-hidden="true"><span /><Shield size={34} /><span /></div>
        <p className="risk-kicker">Gather your commanders</p>
        <h1>Risk</h1>
        <div className="risk-room-code">
          <div><span>Room code</span><strong>{game.roomCode}</strong></div>
          <button type="button" onClick={onCopy}><Copy size={16} /> {copied ? "Copied" : "Copy invite"}</button>
        </div>
        <div className="risk-lobby-list">
          {game.players.map((player) => (
            <div key={player.id}>
              <i style={{ background: player.color }} />
              <strong>{player.name}</strong>
              {player.isBot && isHost
                ? <button type="button" onClick={() => onRemoveComputer(player.id)} aria-label={`Remove ${player.name}`}><X size={13} /> Remove</button>
                : <small>{player.id === game.hostId ? "Host" : player.id === playerId ? "You" : player.isBot ? "Computer" : "Ready"}</small>}
            </div>
          ))}
          {Array.from({ length: 6 - game.players.length }, (_, index) => (
            <div className="empty" key={`empty-${index}`}><i /> <span>Waiting for commander…</span></div>
          ))}
        </div>
        {isHost && (
          <button type="button" className="risk-add-computer" onClick={onAddComputer} disabled={game.players.length >= 6}>
            <Bot size={17} /> Add computer commander
          </button>
        )}
        <div className="risk-color-picker">
          <span>Choose your army color</span>
          <div>
            {PLAYER_STYLES.map((style) => {
              const taken = game.players.some((player) => player.id !== playerId && player.color === style.color);
              return (
                <button
                  type="button"
                  key={style.name}
                  aria-label={`Choose ${style.name}`}
                  aria-pressed={viewer?.color === style.color}
                  className={viewer?.color === style.color ? "selected" : ""}
                  disabled={taken}
                  onClick={() => onColor(style)}
                  style={{ "--swatch": style.color }}
                />
              );
            })}
          </div>
        </div>
        <div className="risk-card-rule-picker">
          <div>
            <span>Card trade rule</span>
            <small>{game.cardTradeMode === "normal" ? "Fixed values based on the symbols traded." : "Every traded set becomes more valuable."}</small>
          </div>
          <div>
            <button type="button" className={game.cardTradeMode === "normal" ? "selected" : ""} disabled={!isHost} onClick={() => onCardTradeMode("normal")}>
              <strong>Normal</strong><small>4 · 6 · 8 · 10</small>
            </button>
            <button type="button" className={game.cardTradeMode !== "normal" ? "selected" : ""} disabled={!isHost} onClick={() => onCardTradeMode("progressive")}>
              <strong>Progressive</strong><small>4 · 6 · 8 · 10 · 12 · 15…</small>
            </button>
          </div>
        </div>
        {isHost ? (
          <button type="button" className="risk-primary risk-start" onClick={onStart} disabled={game.players.length < 2}>
            <Play size={18} /> Start campaign
          </button>
        ) : <p className="risk-lobby-waiting">Waiting for the host to start the campaign…</p>}
      </section>
    </main>
  );
}

function RulesModal({ onClose }) {
  return (
    <div className="risk-modal" role="dialog" aria-modal="true" aria-labelledby="risk-rules-title">
      <section>
        <button type="button" className="risk-close" onClick={onClose} aria-label="Close rules"><X size={20} /></button>
        <p className="risk-kicker">Field manual</p>
        <h2 id="risk-rules-title">How to command</h2>
        <ol>
          <li><strong>Reinforce.</strong> Select a territory, then scroll over it or use the slider to choose how many armies to deploy. Whole continents earn bonuses.</li>
          <li><strong>Attack.</strong> Choose your territory, an adjacent rival, and 1–3 dice up to your legal maximum. Defenders use two dice and win ties.</li>
          <li><strong>Occupy.</strong> After a conquest, choose how many armies move in. You must move at least as many as the dice used in the final attack.</li>
          <li><strong>Fortify.</strong> Once per turn, move armies between any two of your territories connected by your own land.</li>
          <li><strong>Earn cards.</strong> If you capture one or more territories, you receive one card when your turn ends. Eliminate a commander to take every card in their hand immediately.</li>
          <li><strong>Trade sets.</strong> Trade three matching symbols or one of each. At five or more cards, trading is required before any other move. Normal rooms use fixed symbol values; Progressive rooms increase the reward after every set.</li>
          <li><strong>Conquer.</strong> Capture all 42 territories to win the campaign.</li>
        </ol>
        <div className="continent-bonus-list">
          {Object.entries(CONTINENTS).map(([id, continent]) => (
            <span key={id}><i style={{ background: continent.color }} />{continent.name}<b>+{continent.bonus}</b></span>
          ))}
        </div>
      </section>
    </div>
  );
}

function CardHand({ cards, deckCount, tradeMode }) {
  return (
    <section className="risk-panel risk-hand-panel">
      <div className="panel-title"><Layers3 size={17} /><h2>Territory cards</h2><span>{tradeMode === "normal" ? "Normal" : "Progressive"} · {deckCount} in deck</span></div>
      {cards.length > 0 ? (
        <div className="risk-card-hand">
          {cards.map((card) => (
            <article key={card.id} className={`risk-territory-card ${card.type}`}>
              <span>{CARD_TYPES[card.type].symbol}</span>
              <strong>{card.territoryId ? TERRITORIES[card.territoryId].name : "Wild"}</strong>
              <small>{CARD_TYPES[card.type].name}</small>
            </article>
          ))}
        </div>
      ) : (
        <p className="empty-hand">Conquer at least one territory, then finish your turn to draw a card.</p>
      )}
    </section>
  );
}

export default function RiskClient() {
  const [isReady, setIsReady] = useState(false);
  const [playerId, setPlayerId] = useState("");
  const [name, setName] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [game, setGame] = useState(null);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [selectedFrom, setSelectedFrom] = useState(null);
  const [selectedTo, setSelectedTo] = useState(null);
  const [reinforceCount, setReinforceCount] = useState(1);
  const [attackDiceCount, setAttackDiceCount] = useState(3);
  const [conquestMoveCount, setConquestMoveCount] = useState(1);
  const [fortifyCount, setFortifyCount] = useState(1);
  const [rulesOpen, setRulesOpen] = useState(false);
  const [botThinking, setBotThinking] = useState(false);
  const [isBattleRolling, setIsBattleRolling] = useState(false);
  const [actionNotice, setActionNotice] = useState("");
  const [confirmAction, setConfirmAction] = useState(null);
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
    if (!isReady || !playerId || !code || game) return undefined;
    let cancelled = false;
    void RiskRoomService.load(code).then((existing) => {
      if (cancelled || !existing?.players.some((player) => player.id === playerId)) return;
      setGame(existing);
      latestGame.current = existing;
      const viewer = existing.players.find((player) => player.id === playerId);
      if (viewer) setName(viewer.name);
      window.history.replaceState(null, "", `?room=${existing.roomCode}`);
    }).catch(() => undefined);
    return () => { cancelled = true; };
  }, [game, isReady, joinCode, playerId]);

  useEffect(() => {
    if (!game?.roomCode) return undefined;
    return RiskRoomService.subscribe(game.roomCode, (remote) => {
      setGame((current) => {
        const next = !current || remote.updatedAt >= current.updatedAt ? remote : current;
        latestGame.current = next;
        return next;
      });
    });
  }, [game?.roomCode]);

  const currentPlayer = game?.phase !== "lobby" ? game?.players[game.currentPlayerIndex] : null;
  const isMyTurn = currentPlayer?.id === playerId;
  const isHost = game?.hostId === playerId;
  const phase = currentPlayer ? PHASES[game.phase] : null;
  const PhaseIcon = phase?.icon ?? Shield;

  useEffect(() => {
    if (!game || !isHost || !currentPlayer?.isBot || game.winnerId) return undefined;
    setBotThinking(true);
    const timer = window.setTimeout(() => {
      void updateGame((current) => runComputerTurn(current));
      setSelectedFrom(null);
      setSelectedTo(null);
      setBotThinking(false);
    }, 950);
    return () => window.clearTimeout(timer);
  }, [game?.currentPlayerIndex, game?.winnerId, currentPlayer?.isBot, isHost]);

  const selectedSource = selectedFrom && game?.territories[selectedFrom];
  const selectedDestination = selectedTo && game?.territories[selectedTo];
  const maxFortify = Math.max(1, (selectedSource?.armies ?? 1) - 1);
  const viewerPlayer = game?.players.find((player) => player.id === playerId);
  const availableTrade = findTradeSet(viewerPlayer?.cards);
  const mandatoryTrade = Boolean(game && isMyTurn && !game.pendingConquest && mustTradeCards(game));
  const nextTradeBonus = tradeBonusFor(game?.tradesCompleted ?? 0, game?.cardTradeMode, availableTrade ?? []);

  const instruction = useMemo(() => {
    if (!game) return "";
    if (!currentPlayer || !phase) return "";
    if (!isMyTurn) return `${currentPlayer.name} is planning a move…`;
    if (actionNotice) return actionNotice;
    if (game.pendingConquest) return `Choose how many armies move into ${TERRITORIES[game.pendingConquest.toId].name}.`;
    if (mandatoryTrade) return `You have ${viewerPlayer.cards.length} cards. Trade a set before making another move.`;
    if (game.phase === "reinforce") {
      return game.reinforcements === 0 ? "Deployment complete. Begin your attack." : `${game.reinforcements} armies remain. Select your territory, then scroll or use the controls.`;
    }
    if (game.phase === "attack" && selectedFrom && selectedTo) return `Ready to attack ${TERRITORIES[selectedTo].name}.`;
    if (game.phase === "attack" && selectedFrom) return `Choose an adjacent rival from ${TERRITORIES[selectedFrom].name}.`;
    if (game.phase === "fortify" && selectedFrom && selectedTo) return `Move armies to ${TERRITORIES[selectedTo].name}, then end your turn.`;
    return phase.copy;
  }, [game, isMyTurn, currentPlayer, phase, selectedFrom, selectedTo, actionNotice, mandatoryTrade, viewerPlayer]);

  useEffect(() => {
    setActionNotice("");
    setConfirmAction(null);
  }, [game?.phase, game?.currentPlayerIndex]);

  const usePlayerName = () => {
    const cleanName = name.trim() || "Commander";
    localStorage.setItem(playerNameStorageKey, cleanName);
    setName(cleanName);
    return cleanName;
  };

  const persist = async (next) => {
    const saved = await RiskRoomService.save(next);
    setGame(saved);
    latestGame.current = saved;
    window.history.replaceState(null, "", `?room=${saved.roomCode}`);
    return saved;
  };

  const updateGame = async (updater) => {
    const current = latestGame.current;
    if (!current) return null;
    try {
      const next = await RiskRoomService.update(current.roomCode, updater);
      if (!next) return null;
      setGame(next);
      latestGame.current = next;
      return next;
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : "Could not save that action.");
      return null;
    }
  };

  const createRoom = async () => {
    setError("");
    try {
      const roomCode = await RiskRoomService.createCode();
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
      const existing = await RiskRoomService.load(code);
      if (!existing) return setError(`Room ${code} was not found.`);
      const returning = existing.players.find((player) => player.id === playerId);
      if (returning) {
        setGame(existing);
        latestGame.current = existing;
        setName(returning.name);
        window.history.replaceState(null, "", `?room=${code}`);
        return;
      }
      if (existing.phase !== "lobby") return setError("That campaign has already started.");
      if (existing.players.length >= 6) return setError("That room already has six commanders.");
      const cleanName = usePlayerName();
      const next = await RiskRoomService.update(code, (state) => {
        if (state.phase !== "lobby" || state.players.length >= 6) return state;
        const usedColors = new Set(state.players.map((player) => player.color));
        const style = PLAYER_STYLES.find((candidate) => !usedColors.has(candidate.color)) ?? PLAYER_STYLES[0];
        return {
          ...state,
          players: [...state.players, { id: playerId, name: cleanName, color: style.color, colorName: style.name, isBot: false, cards: [] }],
          log: [`${cleanName} joined the room.`, ...state.log].slice(0, 40),
        };
      });
      if (next) {
        setGame(next);
        latestGame.current = next;
        window.history.replaceState(null, "", `?room=${code}`);
      }
    } catch (joinError) {
      setError(joinError instanceof Error ? joinError.message : "Could not join the room.");
    }
  };

  const addComputer = () => {
    if (!isHost || game?.phase !== "lobby") return;
    void updateGame((current) => {
      if (current.phase !== "lobby" || current.players.length >= 6) return current;
      const usedColors = new Set(current.players.map((player) => player.color));
      const style = PLAYER_STYLES.find((candidate) => !usedColors.has(candidate.color)) ?? PLAYER_STYLES[0];
      const number = current.players.filter((player) => player.isBot).length + 1;
      const computer = { id: `computer-${Date.now()}-${number}`, name: `Computer ${number}`, color: style.color, colorName: style.name, isBot: true, cards: [] };
      return { ...current, players: [...current.players, computer], log: [`${computer.name} joined the room.`, ...current.log].slice(0, 40) };
    });
  };

  const removeComputer = (computerId) => {
    if (!isHost || game?.phase !== "lobby") return;
    void updateGame((current) => current.phase === "lobby"
      ? { ...current, players: current.players.filter((player) => player.id !== computerId) }
      : current);
  };

  const chooseColor = (style) => {
    if (game?.phase !== "lobby") return;
    void updateGame((current) => {
      if (current.phase !== "lobby" || current.players.some((player) => player.id !== playerId && player.color === style.color)) return current;
      return { ...current, players: current.players.map((player) => player.id === playerId ? { ...player, color: style.color, colorName: style.name } : player) };
    });
  };

  const chooseCardTradeMode = (cardTradeMode) => {
    if (!isHost || game?.phase !== "lobby" || !["normal", "progressive"].includes(cardTradeMode)) return;
    void updateGame((current) => current.phase === "lobby" ? { ...current, cardTradeMode } : current);
  };

  const startGame = () => {
    if (!isHost || game?.phase !== "lobby" || game.players.length < 2) return;
    void updateGame((current) => current.phase === "lobby" ? createRiskGameFromLobby(current) : current);
  };

  const leaveRoom = () => {
    setGame(null);
    latestGame.current = null;
    setJoinCode("");
    window.history.replaceState(null, "", "/risk");
  };

  const restartLobby = () => {
    if (!isHost || !game) return;
    void updateGame((current) => ({
      ...createLobby(current.roomCode, current.hostId, current.players.find((player) => player.id === current.hostId)?.name || "Host"),
      createdAt: current.createdAt,
      cardTradeMode: current.cardTradeMode ?? "progressive",
      players: current.players.map((player) => ({ ...player, cards: [] })),
      log: ["The room is ready for another campaign."],
    }));
  };

  if (!game) {
    return <Setup name={name} setName={setName} joinCode={joinCode} setJoinCode={setJoinCode} onCreate={createRoom} onJoin={joinRoom} error={error} ready={isReady && Boolean(playerId)} />;
  }

  if (game.phase === "lobby") {
    const inviteLink = typeof window === "undefined" ? "" : `${window.location.origin}/risk?room=${game.roomCode}`;
    return <Lobby
      game={game}
      playerId={playerId}
      onAddComputer={addComputer}
      onRemoveComputer={removeComputer}
      onStart={startGame}
      onColor={chooseColor}
      onCardTradeMode={chooseCardTradeMode}
      onCopy={() => {
        void navigator.clipboard.writeText(inviteLink);
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1600);
      }}
      copied={copied}
      onLeave={leaveRoom}
    />;
  }

  const chooseTerritory = (territoryId) => {
    if (!isMyTurn || game.winnerId || game.pendingConquest) return;
    if (mandatoryTrade) {
      setActionNotice("You must trade cards before making another move.");
      return;
    }
    const territory = game.territories[territoryId];
    const owned = territory.ownerId === currentPlayer.id;
    if (game.phase === "reinforce") {
      if (owned && game.reinforcements > 0) {
        setActionNotice("");
        setSelectedFrom(territoryId === selectedFrom ? null : territoryId);
        setSelectedTo(null);
        setReinforceCount(clampArmySelection(reinforceCount, game.reinforcements));
      }
      return;
    }
    if (game.phase === "attack") {
      if (owned && territory.armies <= 1) {
        setActionNotice(`${TERRITORIES[territoryId].name} cannot attack with only 1 army. An attacking territory must have at least 2.`);
        return;
      }
      if (owned && territory.armies > 1) {
        setActionNotice("");
        setSelectedFrom(territoryId === selectedFrom ? null : territoryId);
        setSelectedTo(null);
        setAttackDiceCount(Math.min(3, territory.armies - 1));
      } else if (selectedFrom && !owned && TERRITORIES[selectedFrom].neighbors.includes(territoryId)) {
        setActionNotice("");
        setSelectedTo(territoryId);
      }
      return;
    }
    if (!owned) return;
    if (!selectedFrom && territory.armies > 1) {
      setSelectedFrom(territoryId);
      setSelectedTo(null);
    } else if (territoryId === selectedFrom) {
      setSelectedFrom(null);
      setSelectedTo(null);
    } else if (selectedFrom && hasOwnedPath(game, selectedFrom, territoryId, currentPlayer.id)) {
      setSelectedTo(territoryId);
      setFortifyCount(Math.min(fortifyCount, game.territories[selectedFrom].armies - 1));
    } else if (territory.armies > 1) {
      setSelectedFrom(territoryId);
      setSelectedTo(null);
    }
  };

  const adjustArmyCountWithWheel = (event, territoryId) => {
    if (!isMyTurn) return;
    const change = event.deltaY < 0 ? 1 : -1;
    if (game.phase === "reinforce" && selectedFrom === territoryId && game.reinforcements > 0) {
      event.preventDefault();
      setReinforceCount((current) => Math.min(game.reinforcements, Math.max(1, current + change)));
      return;
    }
    if (
      game.phase === "fortify"
      && selectedFrom
      && selectedTo
      && [selectedFrom, selectedTo].includes(territoryId)
    ) {
      event.preventDefault();
      setFortifyCount((current) => Math.min(maxFortify, Math.max(1, current + change)));
    }
  };

  const confirmReinforcement = async () => {
    if (!selectedFrom || game.phase !== "reinforce") return;
    const next = await updateGame((current) => placeReinforcement(current, selectedFrom, reinforceCount));
    if (!next) return;
    setReinforceCount(clampArmySelection(reinforceCount, next.reinforcements));
    if (next.reinforcements === 0) setSelectedFrom(null);
  };

  const rollAttack = async () => {
    if (!selectedFrom || !selectedTo || isBattleRolling) return;
    setActionNotice("");
    setIsBattleRolling(true);
    try {
      await new Promise((resolve) => window.setTimeout(resolve, 700));
      const next = await updateGame((current) => attackTerritory(current, selectedFrom, selectedTo, { attackDice: attackDiceCount }));
      if (!next) return;
      if (next.pendingConquest) {
        setConquestMoveCount(next.pendingConquest.minimum);
      } else if (next.territories[selectedFrom].armies <= 1) {
        setSelectedFrom(null);
        setSelectedTo(null);
      } else {
        setAttackDiceCount(Math.min(attackDiceCount, next.territories[selectedFrom].armies - 1));
      }
    } finally {
      setIsBattleRolling(false);
    }
  };

  const confirmConquestMove = async () => {
    if (!game.pendingConquest) return;
    const destination = game.pendingConquest.toId;
    const next = await updateGame((current) => resolveConquestMove(current, conquestMoveCount));
    if (!next) return;
    setSelectedFrom(destination);
    setSelectedTo(null);
    setAttackDiceCount(Math.min(3, next.territories[destination].armies - 1));
  };

  const changePhase = async () => {
    await updateGame(advancePhase);
    setSelectedFrom(null);
    setSelectedTo(null);
  };

  const confirmFortify = async () => {
    if (!selectedFrom || !selectedTo) return;
    await updateGame((current) => fortifyTerritory(current, selectedFrom, selectedTo, fortifyCount));
    setSelectedFrom(null);
    setSelectedTo(null);
  };

  const requestPhaseChange = () => {
    if (game.phase === "reinforce") {
      void changePhase();
      return;
    }
    setConfirmAction(game.phase === "attack" ? "end-attack" : "end-turn");
  };

  const acceptConfirmation = async () => {
    const action = confirmAction;
    setConfirmAction(null);
    if (action === "fortify") {
      await confirmFortify();
      return;
    }
    await changePhase();
  };

  const rollingAttackerDice = [6, 4, 2].slice(0, attackDiceCount);
  const rollingDefenderDice = [5, 3].slice(0, Math.min(2, selectedDestination?.armies ?? 2));
  const shownAttackerDice = isBattleRolling ? rollingAttackerDice : game.lastBattle?.attackerDice ?? [];
  const shownDefenderDice = isBattleRolling ? rollingDefenderDice : game.lastBattle?.defenderDice ?? [];

  const winner = game.winnerId && game.players.find((player) => player.id === game.winnerId);

  return (
    <main className="risk-page">
      <header className="risk-game-header">
        <div className="risk-title-lockup">
          <div className="mini-crest"><Shield size={22} /></div>
          <div><span>World campaign</span><h1>Risk</h1></div>
        </div>
        <div className="risk-round"><span>Round</span><strong>{game.round}</strong></div>
        <div className="risk-header-actions">
          <button type="button" onClick={() => setRulesOpen(true)}><CircleHelp size={18} /> <span>Rules</span></button>
          <button type="button" onClick={leaveRoom}><DoorOpen size={18} /> <span>Leave room</span></button>
        </div>
      </header>

      <section className="risk-player-rail" aria-label="Commanders">
        {game.players.map((player) => <PlayerCard key={player.id} player={player} game={game} viewerPlayerId={playerId} />)}
      </section>

      <section className="risk-layout">
        <div className="risk-board-panel">
          <div className="risk-board-toolbar">
            <div className={`phase-medallion ${game.phase}`}><PhaseIcon size={20} /></div>
            <div><span>{currentPlayer.name}</span><strong>{phase.label} phase</strong></div>
            <p>{instruction}</p>
            {botThinking && <span className="thinking-dots" aria-label="Computer is thinking"><i /><i /><i /></span>}
          </div>
          <WorldMap
            game={game}
            viewerPlayerId={playerId}
            selectedFrom={selectedFrom}
            selectedTo={selectedTo}
            onTerritory={chooseTerritory}
            onTerritoryWheel={adjustArmyCountWithWheel}
          />
          <div className="risk-map-legend">
            {Object.entries(CONTINENTS).map(([id, continent]) => (
              <span key={id}><i style={{ background: continent.color }} />{continent.name}<b>+{continent.bonus}</b></span>
            ))}
            <a href="https://commons.wikimedia.org/wiki/File:Equirectangular_projection_world_map_without_borders.svg" target="_blank" rel="noreferrer">Land: Ebrahim / CC BY-SA</a>
          </div>
        </div>

        <aside className="risk-sidebar">
          <section className="risk-panel risk-command-panel">
            <p className="risk-kicker">Your command</p>
            <div className="command-heading"><PhaseIcon size={22} /><div><h2>{phase.label}</h2><span>Step {game.phase === "reinforce" ? 1 : game.phase === "attack" ? 2 : 3} of 3</span></div></div>

            {isMyTurn && availableTrade && (game.phase === "reinforce" || mandatoryTrade) && (
              <button type="button" className={`risk-trade-button ${mandatoryTrade ? "mandatory" : ""}`} onClick={() => void updateGame(tradeCards)}>
                <span>{availableTrade.map((card) => CARD_TYPES[card.type].symbol).join(" ")}</span>
                {mandatoryTrade ? "Trade required" : "Trade card set"} <b>+{nextTradeBonus}</b>
              </button>
            )}

            {game.phase === "reinforce" && (
              <>
                <div className="reinforcement-counter">
                  <strong>{game.reinforcements}</strong>
                  <span>armies<br />to deploy</span>
                </div>
                {isMyTurn && !mandatoryTrade && selectedFrom && game.reinforcements > 0 && (
                  <div className="risk-deploy-picker">
                    <div className="risk-picker-heading"><span>Deploy to</span><strong>{TERRITORIES[selectedFrom].name}</strong></div>
                    <div className="army-stepper">
                      <button type="button" onClick={() => setReinforceCount(Math.max(1, reinforceCount - 1))}><Minus size={15} /></button>
                      <div><strong>{reinforceCount}</strong><span>armies</span></div>
                      <button type="button" onClick={() => setReinforceCount(Math.min(game.reinforcements, reinforceCount + 1))}><Plus size={15} /></button>
                    </div>
                    <input type="range" min="1" max={game.reinforcements} value={reinforceCount} onChange={(event) => setReinforceCount(Number(event.target.value))} aria-label="Armies to deploy" />
                    <small>Scroll over the selected territory or use the slider.</small>
                    <button type="button" className="risk-primary" onClick={confirmReinforcement}>Deploy {reinforceCount}</button>
                  </div>
                )}
              </>
            )}

            {game.phase === "attack" && !mandatoryTrade && (
              <>
                <div className="selection-summary">
                  <div className={selectedFrom ? "filled" : ""}><Target size={16} /><span>From</span><strong>{selectedFrom ? TERRITORIES[selectedFrom].name : "Select territory"}</strong></div>
                  <MoveRight size={18} />
                  <div className={selectedTo ? "filled enemy" : ""}><Swords size={16} /><span>Target</span><strong>{selectedTo ? TERRITORIES[selectedTo].name : "Select rival"}</strong></div>
                </div>
                {selectedFrom && selectedTo && !game.pendingConquest && (
                  <div className="risk-dice-picker">
                    <span>Attack dice</span>
                    <div>
                      {Array.from({ length: Math.min(3, game.territories[selectedFrom].armies - 1) }, (_, index) => index + 1).map((count) => (
                        <button type="button" key={count} className={attackDiceCount === count ? "selected" : ""} onClick={() => setAttackDiceCount(count)}>{count}</button>
                      ))}
                    </div>
                    <small>Choose any number up to your maximum.</small>
                  </div>
                )}
              </>
            )}

            {game.phase === "fortify" && !mandatoryTrade && (
              <>
                <div className="selection-summary fortify">
                  <div className={selectedFrom ? "filled" : ""}><Flag size={16} /><span>Move from</span><strong>{selectedFrom ? TERRITORIES[selectedFrom].name : "Select source"}</strong></div>
                  <MoveRight size={18} />
                  <div className={selectedTo ? "filled" : ""}><Shield size={16} /><span>Move to</span><strong>{selectedTo ? TERRITORIES[selectedTo].name : "Select destination"}</strong></div>
                </div>
                {selectedFrom && selectedTo && (
                  <div className="risk-fortify-picker">
                    <div className="army-stepper">
                      <button type="button" onClick={() => setFortifyCount(Math.max(1, fortifyCount - 1))}><Minus size={15} /></button>
                      <div><strong>{fortifyCount}</strong><span>armies</span></div>
                      <button type="button" onClick={() => setFortifyCount(Math.min(maxFortify, fortifyCount + 1))}><Plus size={15} /></button>
                    </div>
                    <input type="range" min="1" max={maxFortify} value={fortifyCount} onChange={(event) => setFortifyCount(Number(event.target.value))} aria-label="Armies to fortify" />
                    <small>Scroll over either selected territory or use the slider.</small>
                  </div>
                )}
              </>
            )}

            <p className="command-instruction">{instruction}</p>

            {game.pendingConquest && isMyTurn && (
              <div className="risk-conquest-move">
                <strong>Territory captured</strong>
                <p>Move {game.pendingConquest.minimum}–{game.pendingConquest.maximum} armies into {TERRITORIES[game.pendingConquest.toId].name}.</p>
                <div className="army-stepper">
                  <button type="button" onClick={() => setConquestMoveCount(Math.max(game.pendingConquest.minimum, conquestMoveCount - 1))}><Minus size={15} /></button>
                  <div><strong>{conquestMoveCount}</strong><span>armies</span></div>
                  <button type="button" onClick={() => setConquestMoveCount(Math.min(game.pendingConquest.maximum, conquestMoveCount + 1))}><Plus size={15} /></button>
                </div>
                <input type="range" min={game.pendingConquest.minimum} max={game.pendingConquest.maximum} value={conquestMoveCount} onChange={(event) => setConquestMoveCount(Number(event.target.value))} aria-label="Armies to move into captured territory" />
                <button type="button" className="risk-primary" onClick={confirmConquestMove}>Move armies</button>
              </div>
            )}

            {game.phase === "attack" && !mandatoryTrade && selectedFrom && selectedTo && !game.pendingConquest && (
              <button type="button" className="risk-primary attack-button" onClick={rollAttack} disabled={isBattleRolling}>
                <Dice5 size={19} /> {isBattleRolling ? "Rolling…" : `Roll ${attackDiceCount} attack ${attackDiceCount === 1 ? "die" : "dice"}`}
              </button>
            )}
            {game.phase === "fortify" && !mandatoryTrade && selectedFrom && selectedTo && (
              <button type="button" className="risk-primary" onClick={() => setConfirmAction("fortify")}>
                <Flag size={18} /> Move & end turn
              </button>
            )}
            <button
              type="button"
              className="risk-secondary"
              onClick={requestPhaseChange}
              disabled={!isMyTurn || mandatoryTrade || isBattleRolling || Boolean(game.pendingConquest) || (game.phase === "reinforce" && game.reinforcements > 0)}
            >
              {game.phase === "reinforce" ? "Begin attack" : game.phase === "attack" ? "End attacks" : "Skip & end turn"}
              <ChevronRight size={17} />
            </button>
          </section>

          <section className="risk-panel battle-panel">
            <div className="panel-title"><Dice5 size={18} /><h2>Battle report</h2></div>
            {isBattleRolling || game.lastBattle ? (
              <>
                <div className={`dice-report ${isBattleRolling ? "rolling" : ""}`}>
                  <div><span>Attack</span><div>{shownAttackerDice.map((die, index) => <Dice key={index} value={die} tone="attack" rolling={isBattleRolling} delay={index % 2 === 1} />)}</div>{!isBattleRolling && <b>-{game.lastBattle.attackerLosses}</b>}</div>
                  <em>vs</em>
                  <div><span>Defense</span><div>{shownDefenderDice.map((die, index) => <Dice key={index} value={die} tone="defense" rolling={isBattleRolling} delay={index % 2 === 0} />)}</div>{!isBattleRolling && <b>-{game.lastBattle.defenderLosses}</b>}</div>
                </div>
                {isBattleRolling
                  ? <p>Dice are rolling…</p>
                  : <p className={game.lastBattle.conquered ? "conquered" : ""}>
                    {game.lastBattle.conquered ? `${TERRITORIES[game.lastBattle.toId].name} captured!` : "The battle line holds."}
                  </p>}
              </>
            ) : (
              <div className="empty-report"><Swords size={27} /><p>Your latest combat roll will appear here.</p></div>
            )}
          </section>

          <section className="risk-panel campaign-log-panel">
            <div className="panel-title"><Flag size={17} /><h2>Campaign log</h2></div>
            <div className="campaign-log">
              {game.log.slice(0, 7).map((entry, index) => <p key={`${entry}-${index}`} className={index === 0 ? "latest" : ""}>{entry}</p>)}
            </div>
          </section>
          <CardHand cards={viewerPlayer?.cards ?? []} deckCount={game.deck.length} tradeMode={game.cardTradeMode} />
        </aside>
      </section>

      {rulesOpen && <RulesModal onClose={() => setRulesOpen(false)} />}
      {confirmAction && (
        <div className="risk-modal" role="dialog" aria-modal="true" aria-labelledby="risk-confirm-title">
          <section className="risk-confirm-card">
            <p className="risk-kicker">Confirm command</p>
            <h2 id="risk-confirm-title">Are you sure?</h2>
            <p>
              {confirmAction === "end-attack" && "End your attack phase and move on to fortifying?"}
              {confirmAction === "end-turn" && "End your turn without moving any armies?"}
              {confirmAction === "fortify" && `Move ${fortifyCount} ${fortifyCount === 1 ? "army" : "armies"} and end your turn?`}
            </p>
            <div className="risk-confirm-actions">
              <button type="button" className="risk-secondary" onClick={() => setConfirmAction(null)}>No</button>
              <button type="button" className="risk-primary" onClick={() => void acceptConfirmation()}>Yes</button>
            </div>
          </section>
        </div>
      )}
      {winner && (
        <div className="risk-victory" role="dialog" aria-modal="true">
          <section>
            <div className="victory-icon">{winner.id === playerId ? <Trophy size={52} /> : <Crown size={52} />}</div>
            <p className="risk-kicker">Campaign complete</p>
            <h2>{winner.id === playerId ? "The world is yours." : `${winner.name} prevails.`}</h2>
            <p>{winner.id === playerId ? `Victory in ${game.round} rounds. Every border now flies your colors.` : "Your command has fallen, but the room is ready for a rematch."}</p>
            {isHost
              ? <button type="button" className="risk-primary" onClick={restartLobby}><RotateCcw size={18} /> Return to lobby</button>
              : <p>Waiting for the host to reopen the room…</p>}
          </section>
        </div>
      )}
    </main>
  );
}
