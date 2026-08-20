"use client";

import { useEffect, useMemo, useState } from "react";
import { Bot, Check, Copy, Crown, Eye, EyeOff, LogOut, Map as MapIcon, Plus, Ticket, TrainFront, Users, X } from "lucide-react";
import { TicketToRideRoomService } from "./ticket-to-ride-room-service";
import {
  CITIES,
  PLAYER_COLORS,
  ROUTES,
  ROUTE_POINTS,
  TRAIN_COLOR_INFO,
  addComputerPlayer,
  addPlayer,
  chooseDrawnDestinations,
  chooseOpeningDestinations,
  claimRoute,
  createLobby,
  currentPlayer,
  destinationLabel,
  drawDestinations,
  drawTrainCard,
  hasConnection,
  isRouteAvailable,
  removeComputerPlayer,
  runComputerTurn,
  startGame,
  validPaymentColors,
} from "../lib/ticket-to-ride";
import { useGameRoom } from "../lib/use-game-room.js";

const playerIdKey = "ticket-to-ride-player-id";
const playerNameKey = "ticket-to-ride-player-name";
const activeRoomKey = "ticket-to-ride-active-room";

const pairKey = (first, second) => [first, second].sort().join(":");
const ROUTE_BENDS = new Map([
  [pairKey("seattle", "calgary"), -5],
  [pairKey("seattle", "helena"), 4],
  [pairKey("portland", "saltLakeCity"), -4],
  [pairKey("sanFrancisco", "saltLakeCity"), -3],
  [pairKey("losAngeles", "elPaso"), 4],
  [pairKey("calgary", "winnipeg"), -4],
  [pairKey("winnipeg", "saultSteMarie"), -7],
  [pairKey("duluth", "toronto"), -5],
  [pairKey("newOrleans", "miami"), 7],
  [pairKey("saultSteMarie", "montreal"), -5],
  [pairKey("montreal", "newYork"), 3],
  [pairKey("charleston", "miami"), 3],
]);

export default function TicketToRideClient() {
  const {
    room, setRoom, playerId, name, setName, joinCode, setJoinCode,
    busy, setBusy, error, setError, createRoom, joinRoom, update,
  } = useGameRoom({
    service: TicketToRideRoomService,
    storageKey: "ticket-to-ride",
    createLobby: createLobby,
    addPlayer: addPlayer,
    maxPlayers: 5,
  });
  const [selectedRouteId, setSelectedRouteId] = useState(null);
  const [openingSelection, setOpeningSelection] = useState([]);
  const [ticketSelection, setTicketSelection] = useState([]);
  const [showTickets, setShowTickets] = useState(true);
  const [computerThinking, setComputerThinking] = useState(false);

  const me = room?.players.find((player) => player.id === playerId) ?? null;
  const computerToAct = room?.phase === "choosing-destinations"
    ? room.players.find((player) => player.isComputer && player.pendingDestinations?.length)
    : room?.phase === "playing" && currentPlayer(room)?.isComputer
      ? currentPlayer(room)
      : null;

  useEffect(() => {
    if (!room || room.hostId !== playerId || !computerToAct) {
      setComputerThinking(false);
      return undefined;
    }
    let cancelled = false;
    setComputerThinking(true);
    const timer = window.setTimeout(async () => {
      try {
        await update((current) => runComputerTurn(current));
      } finally {
        if (!cancelled) setComputerThinking(false);
      }
    }, 700);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [computerToAct?.id, playerId, room?.phase, room?.updatedAt]);

  function leaveRoom() {
    if (room?.phase !== "lobby" && !window.confirm("Leave this room and return to the Ticket to Ride home screen? You can rejoin with the room code.")) return;
    localStorage.removeItem(activeRoomKey);
    setSelectedRouteId(null);
    setOpeningSelection([]);
    setTicketSelection([]);
    setRoom(null);
  }

  if (!room || !me) {
    return <StationLanding name={name} setName={setName} joinCode={joinCode} setJoinCode={setJoinCode} createRoom={createRoom} joinRoom={joinRoom} busy={busy} error={error} />;
  }

  if (room.phase === "lobby") {
    return <Lobby room={room} me={me} busy={busy} error={error} onAddComputer={() => update((current) => current.hostId === playerId ? addComputerPlayer(current) : current)} onRemoveComputer={(computerId) => update((current) => current.hostId === playerId ? removeComputerPlayer(current, computerId) : current)} onStart={() => update((current) => current.hostId === playerId ? startGame(current) : current)} onLeave={leaveRoom} />;
  }

  if (room.phase === "choosing-destinations" && me.pendingDestinations.length) {
    return <DestinationChoice title="Choose your opening journeys" subtitle="Keep at least two. Unfinished journeys lose points at the end of the game." choices={me.pendingDestinations} selected={openingSelection} setSelected={setOpeningSelection} minimum={2} busy={busy} onConfirm={() => update((current) => chooseOpeningDestinations(current, playerId, openingSelection))} onLeave={leaveRoom} />;
  }

  if (room.phase === "choosing-destinations") {
    return <WaitingRoom room={room} me={me} onLeave={leaveRoom} />;
  }

  const myTurn = room.phase === "playing" && currentPlayer(room)?.id === playerId;
  const selectedRoute = ROUTES.find((route) => route.id === selectedRouteId);
  const paymentColors = selectedRoute ? validPaymentColors(room, playerId, selectedRoute.id) : [];
  const pendingChoices = room.pendingDestinationChoice?.playerId === playerId ? room.pendingDestinationChoice.choices : null;

  return (
    <main className="ttr-game-shell">
      <header className="ttr-table-header">
        <div><p className="ttr-kicker">Room {room.roomCode}</p><h1>Ticket to Ride</h1></div>
        <div className={`ttr-turn-pill ${myTurn ? "mine" : ""}`}>{currentPlayer(room)?.isComputer ? <Bot size={15} /> : <span style={{ background: currentPlayer(room)?.color }} />}{room.phase === "finished" ? "Journey complete" : myTurn ? "Your turn" : currentPlayer(room)?.isComputer && computerThinking ? `${currentPlayer(room)?.name} is planning…` : `${currentPlayer(room)?.name}'s turn`}</div>
        <button className="ttr-room-code" onClick={() => navigator.clipboard?.writeText(room.roomCode)}><Copy size={15} /> {room.roomCode}</button>
        <button className="ttr-leave-room" type="button" onClick={leaveRoom}><LogOut size={15} /> Leave room</button>
      </header>

      {error && <div className="ttr-error" role="alert">{error}</div>}
      {room.lastRoundTriggeredBy && room.phase !== "finished" && <div className="ttr-final-round">Final round · {room.finalTurnsRemaining} turns remain</div>}

      <div className="ttr-table-grid">
        <aside className="ttr-players-panel">
          <h2><Users size={18} /> Travelers</h2>
          {room.players.map((player, index) => {
            const final = room.finalScores?.find((score) => score.playerId === player.id);
            return <div className={`ttr-player-row ${currentPlayer(room)?.id === player.id && room.phase !== "finished" ? "active" : ""}`} key={player.id}>
              <span className="ttr-player-train" style={{ color: player.color }}>{player.isComputer ? <Bot size={24} /> : <TrainFront size={24} />}</span>
              <div><strong>{player.name}{player.id === playerId ? " (you)" : ""}</strong><small>{player.isComputer ? "Computer · " : ""}{player.trains} trains · {player.cards.length} cards</small></div>
              <b>{final?.total ?? player.score}</b>
              {index === 0 && <Crown size={13} className="ttr-host-crown" />}
            </div>;
          })}
          <div className="ttr-action-help"><strong>{myTurn ? room.drawsThisTurn === 1 ? "Draw one more card" : "Choose one action" : currentPlayer(room)?.isComputer ? `${currentPlayer(room).name} is planning` : "Watch the rails"}</strong><p>{myTurn ? room.drawsThisTurn === 1 ? "Take a face-up color or draw blind. A locomotive cannot be your second card." : "Claim a route, draw two train cards, or take new destinations." : currentPlayer(room)?.isComputer ? "The computer will draw cards or claim a route automatically." : "The board updates when another traveler finishes their move."}</p></div>
        </aside>

        <section className="ttr-board-card" aria-label="Rail map of North America">
          <GameBoard room={room} myTurn={myTurn && room.drawsThisTurn === 0 && !pendingChoices} selectedRouteId={selectedRouteId} onSelectRoute={setSelectedRouteId} />
          <div className="ttr-map-legend"><span><i className="open" /> Open route</span><span><i className="owned" /> Claimed route</span><span>Each railway box = 1 card</span><a href="https://commons.wikimedia.org/wiki/File:BlankMap-USA-states-Canada-provinces.svg" target="_blank" rel="noreferrer">Map: Lokal Profil / public domain</a></div>
        </section>

        <aside className="ttr-market-panel">
          <div className="ttr-panel-heading"><div><p className="ttr-kicker">Train cards</p><h2>Station market</h2></div><span>{room.trainDeck.length} left</span></div>
          <div className="ttr-face-up">
            {room.faceUp.map((card, index) => <TrainCard key={card.id} card={card} compact disabled={!myTurn || busy || (room.drawsThisTurn === 1 && card.color === "locomotive")} onClick={() => update((current) => drawTrainCard(current, playerId, index))} />)}
          </div>
          <div className="ttr-draw-piles">
            <DrawDeck type="train" count={room.trainDeck.length} disabled={!myTurn || busy} onClick={() => update((current) => drawTrainCard(current, playerId, "deck"))} />
            <DrawDeck type="destination" count={room.destinationDeck.length} disabled={!myTurn || busy || room.drawsThisTurn > 0} onClick={() => update((current) => drawDestinations(current, playerId))} />
          </div>
          <div className="ttr-log"><h3>Travel log</h3>{room.log.slice(0, 5).map((line, index) => <p key={`${line}-${index}`}>{line}</p>)}</div>
        </aside>
      </div>

      <section className="ttr-hand-panel">
        <div className="ttr-hand-heading"><div><p className="ttr-kicker">Your conductor's case</p><h2>Train cards</h2></div><span>{me.cards.length} cards</span></div>
        <GroupedHand cards={me.cards} />
        <div className="ttr-destination-header"><h2><Ticket size={18} /> Your destinations</h2><button onClick={() => setShowTickets((shown) => !shown)}>{showTickets ? <EyeOff size={16} /> : <Eye size={16} />}{showTickets ? "Hide" : "Show"}</button></div>
        {showTickets && <div className="ttr-ticket-list">{me.destinations.map((item) => <DestinationCard key={item.id} destination={item} completed={hasConnection(room, playerId, item.from, item.to)} />)}</div>}
      </section>

      {selectedRoute && !room.claimedRoutes[selectedRoute.id] && <ClaimPanel route={selectedRoute} colors={paymentColors} busy={busy} onClose={() => setSelectedRouteId(null)} onClaim={(color) => { update((current) => claimRoute(current, playerId, selectedRoute.id, color)); setSelectedRouteId(null); }} />}
      {pendingChoices && <DestinationChoice modal title="Choose new journeys" subtitle="Keep at least one. This ends your turn." choices={pendingChoices} selected={ticketSelection} setSelected={setTicketSelection} minimum={1} busy={busy} onConfirm={() => { update((current) => chooseDrawnDestinations(current, playerId, ticketSelection)); setTicketSelection([]); }} onLeave={leaveRoom} />}
      {room.phase === "finished" && <FinalScores room={room} playerId={playerId} onLeave={leaveRoom} />}
    </main>
  );
}

function StationLanding({ name, setName, joinCode, setJoinCode, createRoom, joinRoom, busy, error }) {
  return <main className="ttr-landing"><section className="ttr-hero"><div className="ttr-hero-copy"><p className="ttr-kicker">A cross-country railway adventure</p><h1>Ticket<br /><em>to Ride</em></h1><p>Collect colorful train cards. Claim routes between cities. Complete secret destinations—and build the longest line across the continent.</p><div className="ttr-feature-row"><span><TrainFront /> 2–5 players</span><span><MapIcon /> Shared board</span><span><Ticket /> Secret tickets</span></div></div><div className="ttr-hero-art"><div className="ttr-sun" /><div className="ttr-mountain one" /><div className="ttr-mountain two" /><div className="ttr-rail-line" /><TrainFront className="ttr-big-train" /></div></section><section className="ttr-station-card"><div><p className="ttr-kicker">Grand Central</p><h2>Meet at the station</h2><p>Create a private room or enter a friend's five-character code.</p></div><label>Your name<input value={name} maxLength={20} autoComplete="nickname" onChange={(event) => setName(event.target.value)} placeholder="Conductor name" /></label><button className="ttr-primary" disabled={busy} onClick={createRoom}><Plus size={19} /> Create a room</button><div className="ttr-or"><span>or join a room</span></div><div className="ttr-join-row"><input aria-label="Room code" value={joinCode} maxLength={5} onChange={(event) => setJoinCode(event.target.value.toUpperCase())} placeholder="ROOM CODE" /><button disabled={busy} onClick={joinRoom}>Join</button></div>{error && <p className="ttr-form-error">{error}</p>}</section></main>;
}

function Lobby({ room, me, busy, error, onAddComputer, onRemoveComputer, onStart, onLeave }) {
  const isHost = room.hostId === me.id;
  return <main className="ttr-lobby-shell"><section className="ttr-lobby-card"><p className="ttr-kicker">All aboard</p><h1>Your room is ready</h1><button className="ttr-code-display" onClick={() => navigator.clipboard?.writeText(room.roomCode)}><span>{room.roomCode}</span><small><Copy size={14} /> Copy room code</small></button><div className="ttr-lobby-players">{room.players.map((player, index) => <div key={player.id}>{player.isComputer ? <Bot style={{ color: player.color }} /> : <TrainFront style={{ color: player.color }} />}<span><strong>{player.name}</strong><small>{index === 0 ? "Host" : player.isComputer ? "Computer player" : "Ready to ride"}</small></span>{player.isComputer && isHost ? <button className="ttr-remove-computer" aria-label={`Remove ${player.name}`} disabled={busy} onClick={() => onRemoveComputer(player.id)}><X /></button> : <Check />}</div>)}{Array.from({ length: Math.max(0, 5 - room.players.length) }, (_, index) => <div className="empty" key={index}><Users /><span><strong>Open seat</strong><small>Waiting for a traveler</small></span></div>)}</div>{isHost && room.players.length < 5 && <button className="ttr-add-computer" disabled={busy} onClick={onAddComputer}><Bot size={19} /> Add computer</button>}{isHost ? <button className="ttr-primary ttr-start" disabled={busy || room.players.length < 2} onClick={onStart}><TrainFront size={20} /> Start journey</button> : <p className="ttr-waiting-copy">Waiting for {room.players[0].name} to start the journey…</p>}<button className="ttr-quiet" onClick={onLeave}>Leave room</button>{room.players.length < 2 && isHost && <p className="ttr-waiting-copy">Add a computer or invite another traveler to begin.</p>}{error && <p className="ttr-form-error">{error}</p>}</section></main>;
}

function WaitingRoom({ room, me, onLeave }) {
  return <main className="ttr-lobby-shell"><section className="ttr-lobby-card"><TrainFront className="ttr-waiting-train" /><p className="ttr-kicker">Tickets, please</p><h1>Your choices are locked in</h1><p className="ttr-waiting-copy">Waiting for the other travelers to choose their destinations.</p><div className="ttr-ready-list">{room.players.map((player) => <span key={player.id} className={!player.pendingDestinations.length ? "ready" : ""}><i style={{ background: player.color }} />{player.name}{player.id === me.id ? " (you)" : ""}{player.isComputer ? " · Computer" : ""}<b>{!player.pendingDestinations.length ? "Ready" : "Choosing…"}</b></span>)}</div><button className="ttr-quiet" type="button" onClick={onLeave}>Leave room</button></section></main>;
}

function DestinationChoice({ title, subtitle, choices, selected, setSelected, minimum, busy, onConfirm, onLeave, modal = false }) {
  const content = <section className="ttr-choice-card"><p className="ttr-kicker">Private destinations</p><h1>{title}</h1><p>{subtitle}</p><div className="ttr-choice-grid">{choices.map((destination) => { const active = selected.includes(destination.id); return <button key={destination.id} className={active ? "selected" : ""} onClick={() => setSelected((current) => active ? current.filter((id) => id !== destination.id) : [...current, destination.id])}><span className="ttr-ticket-points">{destination.points}<small>points</small></span><Ticket /><strong>{CITIES[destination.from].name}</strong><i>to</i><strong>{CITIES[destination.to].name}</strong><span className="ttr-checkmark"><Check /></span></button>; })}</div><button className="ttr-primary ttr-confirm" disabled={busy || selected.length < minimum} onClick={onConfirm}>Keep {selected.length} {selected.length === 1 ? "destination" : "destinations"}</button><small className="ttr-minimum">Choose at least {minimum}</small>{onLeave && <button className="ttr-quiet" type="button" onClick={onLeave}><LogOut size={15} /> Leave room</button>}</section>;
  return modal ? <div className="ttr-overlay">{content}</div> : <main className="ttr-choice-shell">{content}</main>;
}

function GameBoard({ room, myTurn, selectedRouteId, onSelectRoute }) {
  return <svg className="ttr-map" viewBox="0 0 1000 610" role="img" aria-label="Cities and train routes across North America">
    <defs>
      <linearGradient id="ttr-paper" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#aac9cc" /><stop offset="1" stopColor="#789fa6" /></linearGradient>
      <filter id="ttr-shadow"><feDropShadow dx="0" dy="2" stdDeviation="2" floodOpacity=".26" /></filter>
      <filter id="ttr-grain"><feTurbulence type="fractalNoise" baseFrequency=".7" numOctaves="3" seed="12" /><feColorMatrix type="saturate" values="0" /></filter>
    </defs>
    <rect width="1000" height="610" rx="26" fill="url(#ttr-paper)" />
    <svg className="ttr-real-geography" x="0" y="0" width="1000" height="610" viewBox="900 700 1340 1044" preserveAspectRatio="none">
      <image className="ttr-real-map-image" x="0" y="0" width="2289" height="1744" href="https://upload.wikimedia.org/wikipedia/commons/d/d4/BlankMap-USA-states-Canada-provinces.svg" />
    </svg>
    <rect className="ttr-map-wash" x="0" y="0" width="1000" height="610" rx="26" />
    <g className="ttr-terrain-art" aria-hidden="true">
      <path d="M80 102 C145 96 181 150 224 202 C258 242 282 282 315 330 C278 366 227 397 165 417 C128 350 96 280 80 102Z" />
      <path d="M742 245 C785 264 812 305 845 353 C817 379 788 396 759 410 C731 354 717 304 742 245Z" />
      <path className="plains" d="M370 136 C485 120 622 148 694 229 C678 316 636 397 562 459 C469 445 390 382 348 296Z" />
    </g>
    <rect className="ttr-paper-grain" x="0" y="0" width="1000" height="610" rx="26" filter="url(#ttr-grain)" />
    <rect className="ttr-board-frame" x="7" y="7" width="986" height="596" rx="21" />
    {ROUTES.map((route) => {
      const available = isRouteAvailable(room, currentPlayer(room)?.id, route.id);
      return <RouteGraphic key={route.id} route={route} owner={room.claimedRoutes[route.id] ? room.players.find((player) => player.id === room.claimedRoutes[route.id]) : null} selected={selectedRouteId === route.id} interactive={myTurn && available} blocked={!available && !room.claimedRoutes[route.id]} onClick={() => myTurn && available && onSelectRoute(route.id)} />;
    })}
    {Object.entries(CITIES).map(([id, city]) => <g className="ttr-city" key={id} transform={`translate(${city.x * 10} ${city.y * 6})`}><circle r="7" /><circle r="3" /><text x={city.labelX ?? 0} y={city.labelY ?? 20} textAnchor={city.labelAnchor ?? "middle"}>{city.name}</text></g>)}
  </svg>;
}

function RouteGraphic({ route, owner, selected, interactive, blocked, onClick }) {
  const from = CITIES[route.from]; const to = CITIES[route.to];
  const baseStart = { x: from.x * 10, y: from.y * 6 };
  const baseEnd = { x: to.x * 10, y: to.y * 6 };
  const dx = baseEnd.x - baseStart.x; const dy = baseEnd.y - baseStart.y; const length = Math.hypot(dx, dy);
  const normal = { x: -dy / length, y: dx / length };
  const laneOffset = (route.lane ?? 0) * 9.5;
  const start = { x: baseStart.x + normal.x * laneOffset, y: baseStart.y + normal.y * laneOffset };
  const end = { x: baseEnd.x + normal.x * laneOffset, y: baseEnd.y + normal.y * laneOffset };
  const bend = ROUTE_BENDS.get(route.parallelGroup) ?? 0;
  const control = {
    x: (start.x + end.x) / 2 + normal.x * bend * 2,
    y: (start.y + end.y) / 2 + normal.y * bend * 2,
  };
  const path = `M ${start.x.toFixed(1)} ${start.y.toFixed(1)} Q ${control.x.toFixed(1)} ${control.y.toFixed(1)} ${end.x.toFixed(1)} ${end.y.toFixed(1)}`;
  const trackStart = .18; const trackEnd = .82;
  const stroke = owner?.color ?? TRAIN_COLOR_INFO[route.color].hex;
  return <g className={`ttr-route ${interactive ? "interactive" : ""} ${owner ? "claimed" : ""} ${selected ? "selected" : ""} ${blocked ? "blocked" : ""}`} onClick={onClick} role={interactive ? "button" : undefined} aria-label={`${CITIES[route.from].name} to ${CITIES[route.to].name}, ${route.length} ${route.color}`}>
    <path className="route-hit" d={path} fill="none" />
    {Array.from({ length: route.length }, (_, index) => {
      const position = route.length === 1
        ? .5
        : trackStart + index * ((trackEnd - trackStart) / (route.length - 1));
      const section = fixedRouteSection(start, control, end, position);
      return <g key={index} transform={`translate(${section.x} ${section.y}) rotate(${section.angle})`}>
        {owner ? <ClaimedTrainPiece color={stroke} /> : <>
          <line className="route-segment-shadow" x1="-10" y1="0" x2="10" y2="0" />
          <line className="route-segment-underlay" x1="-10" y1="0" x2="10" y2="0" />
          <line className="route-segment" x1="-10" y1="0" x2="10" y2="0" stroke={stroke} />
          <line className="route-segment-highlight" x1="-10" y1="0" x2="10" y2="0" />
        </>}
      </g>;
    })}
  </g>;
}

function ClaimedTrainPiece({ color }) {
  return <g className="ttr-played-train">
    <path className="ttr-played-train-shadow" d="M-8 2.5V-2.5H2V-4H6L8-1.5V2.5Z" />
    <path className="ttr-played-train-body" fill={color} d="M-8 2.5V-2.5H2V-4H6L8-1.5V2.5Z" />
    <rect className="ttr-played-train-window" x="3.2" y="-3" width="2.2" height="1.7" rx=".35" />
    <path className="ttr-played-train-detail" d="M-6-1.2H.4M-5.5.6H2.2" />
    <circle className="ttr-played-train-wheel" cx="-4.5" cy="2.6" r="1.4" />
    <circle className="ttr-played-train-wheel" cx="4.8" cy="2.6" r="1.4" />
  </g>;
}

function quadraticPoint(start, control, end, t) {
  const inverse = 1 - t;
  return {
    x: inverse * inverse * start.x + 2 * inverse * t * control.x + t * t * end.x,
    y: inverse * inverse * start.y + 2 * inverse * t * control.y + t * t * end.y,
  };
}

function fixedRouteSection(start, control, end, position) {
  const center = quadraticPoint(start, control, end, position);
  const derivative = {
    x: 2 * (1 - position) * (control.x - start.x) + 2 * position * (end.x - control.x),
    y: 2 * (1 - position) * (control.y - start.y) + 2 * position * (end.y - control.y),
  };
  return {
    x: center.x,
    y: center.y,
    angle: Math.atan2(derivative.y, derivative.x) * 180 / Math.PI,
  };
}

function TrainCard({ card, compact = false, disabled, onClick }) {
  const info = TRAIN_COLOR_INFO[card.color];
  return <button className={`ttr-train-card ${compact ? "compact" : ""}`} style={{ "--card-color": info.hex, "--card-ink": info.ink }} disabled={disabled} onClick={onClick}><span className="ttr-card-stripes" /><small>{info.label}</small><TrainFront /><b>{card.color === "locomotive" ? "WILD" : "RAIL"}</b></button>;
}

function DrawDeck({ type, count, disabled, onClick }) {
  const trainDeck = type === "train";
  return <button className={`ttr-draw-stack ${type}`} disabled={disabled || count === 0} onClick={onClick} aria-label={trainDeck ? `Draw blind from ${count} train cards` : `Draw from ${count} destination cards`}>
    <span className="ttr-deck-layer layer-three" />
    <span className="ttr-deck-layer layer-two" />
    <span className="ttr-deck-layer card-back">
      <span className="ttr-back-emblem">{trainDeck ? <TrainFront /> : <Ticket />}</span>
      <b>{trainDeck ? "TRAIN" : "ROUTES"}</b>
      <small>{trainDeck ? "Railway cards" : "Destination tickets"}</small>
    </span>
    <strong>{trainDeck ? "Draw blind" : "New tickets"}<small>{count} cards</small></strong>
  </button>;
}

function GroupedHand({ cards }) {
  const grouped = useMemo(() => Object.values(cards.reduce((result, card) => { (result[card.color] ??= { color: card.color, count: 0 }).count += 1; return result; }, {})), [cards]);
  return <div className="ttr-grouped-hand">{grouped.length ? grouped.map((group) => <div key={group.color} className="ttr-hand-stack"><TrainCard card={{ id: group.color, color: group.color }} disabled /><span>{group.count}</span></div>) : <p className="ttr-empty-hand">No train cards in hand.</p>}</div>;
}

function DestinationCard({ destination, completed }) {
  return <article className={`ttr-destination-card ${completed ? "complete" : ""}`}><div><Ticket /><span><strong>{destinationLabel(destination)}</strong><small>{completed ? "Route connected" : "Not connected yet"}</small></span></div><b>{destination.points}<small>pts</small></b>{completed && <Check className="ttr-done" />}</article>;
}

function ClaimPanel({ route, colors, busy, onClose, onClaim }) {
  return <div className="ttr-claim-panel"><button className="ttr-close" onClick={onClose}>×</button><p className="ttr-kicker">Claim this route</p><h2>{CITIES[route.from].name} → {CITIES[route.to].name}</h2><div className="ttr-claim-facts"><span><TrainFront /> {route.length} trains</span><span>{ROUTE_POINTS[route.length]} points</span><span>{TRAIN_COLOR_INFO[route.color].label}</span></div>{colors.length ? <><p>Choose cards to spend. Locomotives fill any missing cards.</p><div className="ttr-payment-options">{colors.map((color) => <button key={color} disabled={busy} style={{ "--pay-color": TRAIN_COLOR_INFO[color].hex }} onClick={() => onClaim(color)}><i />{TRAIN_COLOR_INFO[color].label}</button>)}</div></> : <p className="ttr-cannot-claim">You do not have enough matching cards yet.</p>}</div>;
}

function FinalScores({ room, playerId, onLeave }) {
  return <div className="ttr-overlay"><section className="ttr-final-card"><Crown /><p className="ttr-kicker">Journey complete</p><h1>{room.winnerIds.includes(playerId) ? "You won the railway race!" : `${room.players.find((player) => room.winnerIds.includes(player.id))?.name} wins!`}</h1><div className="ttr-score-table"><div className="heading"><span>Traveler</span><span>Routes</span><span>Tickets</span><span>Longest</span><span>Total</span></div>{[...room.finalScores].sort((a, b) => b.total - a.total).map((score) => { const player = room.players.find((item) => item.id === score.playerId); return <div key={player.id} className={room.winnerIds.includes(player.id) ? "winner" : ""}><span><i style={{ background: player.color }} />{player.name}</span><span>{score.routeScore}</span><span>{score.ticketScore > 0 ? "+" : ""}{score.ticketScore}</span><span>{score.longestBonus ? `+10 (${score.longestRoute})` : score.longestRoute}</span><strong>{score.total}</strong></div>; })}</div><p className="ttr-final-note">Completed destinations add points; unfinished ones subtract them. The longest continuous railway earns 10 bonus points.</p><button className="ttr-final-leave" type="button" onClick={onLeave}><LogOut size={16} /> Leave room</button></section></div>;
}
