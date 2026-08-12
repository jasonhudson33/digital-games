"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, Copy, Crown, Eye, EyeOff, Map as MapIcon, Plus, Ticket, TrainFront, Users } from "lucide-react";
import { TicketToRideRoomService } from "./ticket-to-ride-room-service";
import {
  CITIES,
  PLAYER_COLORS,
  ROUTES,
  ROUTE_POINTS,
  TRAIN_COLOR_INFO,
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
  startGame,
  validPaymentColors,
} from "../lib/ticket-to-ride";

const playerIdKey = "ticket-to-ride-player-id";
const playerNameKey = "ticket-to-ride-player-name";
const activeRoomKey = "ticket-to-ride-active-room";

const pairKey = (first, second) => [first, second].sort().join(":");
const ROUTE_BENDS = new Map([
  [pairKey("seattle", "calgary"), -10],
  [pairKey("seattle", "helena"), 13],
  [pairKey("portland", "saltLakeCity"), -13],
  [pairKey("sanFrancisco", "saltLakeCity"), 14],
  [pairKey("losAngeles", "elPaso"), 14],
  [pairKey("phoenix", "elPaso"), 10],
  [pairKey("calgary", "winnipeg"), -10],
  [pairKey("helena", "winnipeg"), -9],
  [pairKey("helena", "duluth"), 13],
  [pairKey("helena", "omaha"), 9],
  [pairKey("winnipeg", "saultSteMarie"), -14],
  [pairKey("winnipeg", "duluth"), 9],
  [pairKey("denver", "omaha"), -8],
  [pairKey("denver", "kansasCity"), 10],
  [pairKey("denver", "oklahomaCity"), 16],
  [pairKey("elPaso", "houston"), 15],
  [pairKey("duluth", "toronto"), -15],
  [pairKey("omaha", "chicago"), -8],
  [pairKey("kansasCity", "nashville"), -13],
  [pairKey("oklahomaCity", "nashville"), -10],
  [pairKey("newOrleans", "miami"), 15],
  [pairKey("chicago", "toronto"), -12],
  [pairKey("chicago", "pittsburgh"), 10],
  [pairKey("chicago", "nashville"), 15],
  [pairKey("saultSteMarie", "montreal"), -12],
  [pairKey("toronto", "montreal"), -9],
  [pairKey("montreal", "newYork"), 10],
  [pairKey("pittsburgh", "nashville"), -13],
  [pairKey("atlanta", "washington"), -11],
  [pairKey("washington", "miami"), 17],
]);

export default function TicketToRideClient() {
  const [room, setRoom] = useState(null);
  const [playerId, setPlayerId] = useState("");
  const [name, setName] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [selectedRouteId, setSelectedRouteId] = useState(null);
  const [openingSelection, setOpeningSelection] = useState([]);
  const [ticketSelection, setTicketSelection] = useState([]);
  const [showTickets, setShowTickets] = useState(true);

  useEffect(() => {
    const storedId = localStorage.getItem(playerIdKey) || crypto.randomUUID();
    localStorage.setItem(playerIdKey, storedId);
    setPlayerId(storedId);
    setName(localStorage.getItem(playerNameKey) || "");
    const activeCode = localStorage.getItem(activeRoomKey);
    if (!activeCode) return;
    TicketToRideRoomService.load(activeCode).then((loaded) => {
      if (loaded?.players.some((player) => player.id === storedId)) setRoom(loaded);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!room?.roomCode) return undefined;
    return TicketToRideRoomService.subscribe(room.roomCode, (next) => {
      setRoom((current) => !current || Number(next.updatedAt || 0) >= Number(current.updatedAt || 0) ? next : current);
    });
  }, [room?.roomCode]);

  const me = room?.players.find((player) => player.id === playerId) ?? null;

  async function createRoom() {
    if (!name.trim()) { setError("Enter your name first."); return; }
    setBusy(true); setError("");
    try {
      const roomCode = await TicketToRideRoomService.createCode();
      const next = createLobby({ id: playerId, name: name.trim(), color: PLAYER_COLORS[0] }, roomCode);
      const saved = await TicketToRideRoomService.save(next);
      rememberRoom(saved);
    } catch (caught) { setError(caught.message); } finally { setBusy(false); }
  }

  async function joinRoom() {
    if (!name.trim() || !joinCode.trim()) { setError("Enter your name and a room code."); return; }
    setBusy(true); setError("");
    try {
      const code = joinCode.trim().toUpperCase();
      const loaded = await TicketToRideRoomService.load(code);
      if (!loaded) throw new Error("That room could not be found.");
      if (!loaded.players.some((player) => player.id === playerId)) {
        if (loaded.phase !== "lobby") throw new Error("That game has already started.");
        if (loaded.players.length >= 5) throw new Error("That room is full.");
        const joined = await TicketToRideRoomService.update(code, (current) => addPlayer(current, { id: playerId, name: name.trim() }));
        rememberRoom(joined);
      } else rememberRoom(loaded);
    } catch (caught) { setError(caught.message); } finally { setBusy(false); }
  }

  function rememberRoom(next) {
    localStorage.setItem(playerNameKey, name.trim());
    localStorage.setItem(activeRoomKey, next.roomCode);
    setRoom(next);
  }

  async function update(action) {
    if (!room) return;
    setBusy(true); setError("");
    try {
      const next = await TicketToRideRoomService.update(room.roomCode, action);
      if (next) setRoom(next);
    } catch (caught) { setError(caught.message); } finally { setBusy(false); }
  }

  if (!room || !me) {
    return <StationLanding name={name} setName={setName} joinCode={joinCode} setJoinCode={setJoinCode} createRoom={createRoom} joinRoom={joinRoom} busy={busy} error={error} />;
  }

  if (room.phase === "lobby") {
    return <Lobby room={room} me={me} busy={busy} error={error} onStart={() => update((current) => current.hostId === playerId ? startGame(current) : current)} onLeave={() => { localStorage.removeItem(activeRoomKey); setRoom(null); }} />;
  }

  if (room.phase === "choosing-destinations" && me.pendingDestinations.length) {
    return <DestinationChoice title="Choose your opening journeys" subtitle="Keep at least two. Unfinished journeys lose points at the end of the game." choices={me.pendingDestinations} selected={openingSelection} setSelected={setOpeningSelection} minimum={2} busy={busy} onConfirm={() => update((current) => chooseOpeningDestinations(current, playerId, openingSelection))} />;
  }

  if (room.phase === "choosing-destinations") {
    return <WaitingRoom room={room} me={me} />;
  }

  const myTurn = room.phase === "playing" && currentPlayer(room)?.id === playerId;
  const selectedRoute = ROUTES.find((route) => route.id === selectedRouteId);
  const paymentColors = selectedRoute ? validPaymentColors(room, playerId, selectedRoute.id) : [];
  const pendingChoices = room.pendingDestinationChoice?.playerId === playerId ? room.pendingDestinationChoice.choices : null;

  return (
    <main className="ttr-game-shell">
      <header className="ttr-table-header">
        <div><p className="ttr-kicker">Room {room.roomCode}</p><h1>Ticket to Ride</h1></div>
        <div className={`ttr-turn-pill ${myTurn ? "mine" : ""}`}><span style={{ background: currentPlayer(room)?.color }} />{room.phase === "finished" ? "Journey complete" : myTurn ? "Your turn" : `${currentPlayer(room)?.name}'s turn`}</div>
        <button className="ttr-room-code" onClick={() => navigator.clipboard?.writeText(room.roomCode)}><Copy size={15} /> {room.roomCode}</button>
      </header>

      {error && <div className="ttr-error" role="alert">{error}</div>}
      {room.lastRoundTriggeredBy && room.phase !== "finished" && <div className="ttr-final-round">Final round · {room.finalTurnsRemaining} turns remain</div>}

      <div className="ttr-table-grid">
        <aside className="ttr-players-panel">
          <h2><Users size={18} /> Travelers</h2>
          {room.players.map((player, index) => {
            const final = room.finalScores?.find((score) => score.playerId === player.id);
            return <div className={`ttr-player-row ${currentPlayer(room)?.id === player.id && room.phase !== "finished" ? "active" : ""}`} key={player.id}>
              <span className="ttr-player-train" style={{ color: player.color }}><TrainFront size={24} /></span>
              <div><strong>{player.name}{player.id === playerId ? " (you)" : ""}</strong><small>{player.trains} trains · {player.cards.length} cards</small></div>
              <b>{final?.total ?? player.score}</b>
              {index === 0 && <Crown size={13} className="ttr-host-crown" />}
            </div>;
          })}
          <div className="ttr-action-help"><strong>{myTurn ? room.drawsThisTurn === 1 ? "Draw one more card" : "Choose one action" : "Watch the rails"}</strong><p>{myTurn ? room.drawsThisTurn === 1 ? "Take a face-up color or draw blind. A locomotive cannot be your second card." : "Claim a route, draw two train cards, or take new destinations." : "The board updates when another traveler finishes their move."}</p></div>
        </aside>

        <section className="ttr-board-card" aria-label="Rail map of North America">
          <GameBoard room={room} myTurn={myTurn && room.drawsThisTurn === 0 && !pendingChoices} selectedRouteId={selectedRouteId} onSelectRoute={setSelectedRouteId} />
          <div className="ttr-map-legend"><span><i className="open" /> Open route</span><span><i className="owned" /> Claimed route</span><span>Number = cards needed</span><a href="https://commons.wikimedia.org/wiki/File:BlankMap-USA-states-Canada-provinces.svg" target="_blank" rel="noreferrer">Map: Lokal Profil / public domain</a></div>
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
      {pendingChoices && <DestinationChoice modal title="Choose new journeys" subtitle="Keep at least one. This ends your turn." choices={pendingChoices} selected={ticketSelection} setSelected={setTicketSelection} minimum={1} busy={busy} onConfirm={() => { update((current) => chooseDrawnDestinations(current, playerId, ticketSelection)); setTicketSelection([]); }} />}
      {room.phase === "finished" && <FinalScores room={room} playerId={playerId} />}
    </main>
  );
}

function StationLanding({ name, setName, joinCode, setJoinCode, createRoom, joinRoom, busy, error }) {
  return <main className="ttr-landing"><section className="ttr-hero"><div className="ttr-hero-copy"><p className="ttr-kicker">A cross-country railway adventure</p><h1>Ticket<br /><em>to Ride</em></h1><p>Collect colorful train cards. Claim routes between cities. Complete secret destinations—and build the longest line across the continent.</p><div className="ttr-feature-row"><span><TrainFront /> 2–5 players</span><span><MapIcon /> Shared board</span><span><Ticket /> Secret tickets</span></div></div><div className="ttr-hero-art"><div className="ttr-sun" /><div className="ttr-mountain one" /><div className="ttr-mountain two" /><div className="ttr-rail-line" /><TrainFront className="ttr-big-train" /></div></section><section className="ttr-station-card"><div><p className="ttr-kicker">Grand Central</p><h2>Meet at the station</h2><p>Create a private room or enter a friend's five-character code.</p></div><label>Your name<input value={name} maxLength={20} autoComplete="nickname" onChange={(event) => setName(event.target.value)} placeholder="Conductor name" /></label><button className="ttr-primary" disabled={busy} onClick={createRoom}><Plus size={19} /> Create a room</button><div className="ttr-or"><span>or join a room</span></div><div className="ttr-join-row"><input aria-label="Room code" value={joinCode} maxLength={5} onChange={(event) => setJoinCode(event.target.value.toUpperCase())} placeholder="ROOM CODE" /><button disabled={busy} onClick={joinRoom}>Join</button></div>{error && <p className="ttr-form-error">{error}</p>}</section></main>;
}

function Lobby({ room, me, busy, error, onStart, onLeave }) {
  const isHost = room.hostId === me.id;
  return <main className="ttr-lobby-shell"><section className="ttr-lobby-card"><p className="ttr-kicker">All aboard</p><h1>Your room is ready</h1><button className="ttr-code-display" onClick={() => navigator.clipboard?.writeText(room.roomCode)}><span>{room.roomCode}</span><small><Copy size={14} /> Copy room code</small></button><div className="ttr-lobby-players">{room.players.map((player, index) => <div key={player.id}><TrainFront style={{ color: player.color }} /><span><strong>{player.name}</strong><small>{index === 0 ? "Host" : "Ready to ride"}</small></span><Check /></div>)}{Array.from({ length: Math.max(0, 5 - room.players.length) }, (_, index) => <div className="empty" key={index}><Users /><span><strong>Open seat</strong><small>Waiting for a traveler</small></span></div>)}</div>{isHost ? <button className="ttr-primary ttr-start" disabled={busy || room.players.length < 2} onClick={onStart}><TrainFront size={20} /> Start journey</button> : <p className="ttr-waiting-copy">Waiting for {room.players[0].name} to start the journey…</p>}<button className="ttr-quiet" onClick={onLeave}>Leave room</button>{room.players.length < 2 && isHost && <p className="ttr-waiting-copy">At least two players are needed.</p>}{error && <p className="ttr-form-error">{error}</p>}</section></main>;
}

function WaitingRoom({ room, me }) {
  return <main className="ttr-lobby-shell"><section className="ttr-lobby-card"><TrainFront className="ttr-waiting-train" /><p className="ttr-kicker">Tickets, please</p><h1>Your choices are locked in</h1><p className="ttr-waiting-copy">Waiting for the other travelers to choose their destinations.</p><div className="ttr-ready-list">{room.players.map((player) => <span key={player.id} className={!player.pendingDestinations.length ? "ready" : ""}><i style={{ background: player.color }} />{player.name}{player.id === me.id ? " (you)" : ""}<b>{!player.pendingDestinations.length ? "Ready" : "Choosing…"}</b></span>)}</div></section></main>;
}

function DestinationChoice({ title, subtitle, choices, selected, setSelected, minimum, busy, onConfirm, modal = false }) {
  const content = <section className="ttr-choice-card"><p className="ttr-kicker">Private destinations</p><h1>{title}</h1><p>{subtitle}</p><div className="ttr-choice-grid">{choices.map((destination) => { const active = selected.includes(destination.id); return <button key={destination.id} className={active ? "selected" : ""} onClick={() => setSelected((current) => active ? current.filter((id) => id !== destination.id) : [...current, destination.id])}><span className="ttr-ticket-points">{destination.points}<small>points</small></span><Ticket /><strong>{CITIES[destination.from].name}</strong><i>to</i><strong>{CITIES[destination.to].name}</strong><span className="ttr-checkmark"><Check /></span></button>; })}</div><button className="ttr-primary ttr-confirm" disabled={busy || selected.length < minimum} onClick={onConfirm}>Keep {selected.length} {selected.length === 1 ? "destination" : "destinations"}</button><small className="ttr-minimum">Choose at least {minimum}</small></section>;
  return modal ? <div className="ttr-overlay">{content}</div> : <main className="ttr-choice-shell">{content}</main>;
}

function GameBoard({ room, myTurn, selectedRouteId, onSelectRoute }) {
  return <svg className="ttr-map" viewBox="0 0 1000 610" role="img" aria-label="Cities and train routes across North America">
    <defs>
      <linearGradient id="ttr-paper" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#aac9cc" /><stop offset="1" stopColor="#789fa6" /></linearGradient>
      <filter id="ttr-shadow"><feDropShadow dx="0" dy="2" stdDeviation="2" floodOpacity=".26" /></filter>
    </defs>
    <rect width="1000" height="610" rx="26" fill="url(#ttr-paper)" />
    <svg className="ttr-real-geography" x="0" y="0" width="1000" height="610" viewBox="900 700 1340 1044" preserveAspectRatio="none">
      <image className="ttr-real-map-image" x="0" y="0" width="2289" height="1744" href="https://upload.wikimedia.org/wikipedia/commons/d/d4/BlankMap-USA-states-Canada-provinces.svg" />
    </svg>
    <rect className="ttr-map-wash" x="0" y="0" width="1000" height="610" rx="26" />
    <text className="ttr-country-label canada-label" x="490" y="92">CANADA</text>
    <text className="ttr-country-label usa-label" x="455" y="345">UNITED STATES</text>
    {ROUTES.map((route) => {
      const available = isRouteAvailable(room, currentPlayer(room)?.id, route.id);
      return <RouteGraphic key={route.id} route={route} owner={room.claimedRoutes[route.id] ? room.players.find((player) => player.id === room.claimedRoutes[route.id]) : null} selected={selectedRouteId === route.id} interactive={myTurn && available} blocked={!available && !room.claimedRoutes[route.id]} onClick={() => myTurn && available && onSelectRoute(route.id)} />;
    })}
    {Object.entries(CITIES).map(([id, city]) => <g className="ttr-city" key={id} transform={`translate(${city.x * 10} ${city.y * 6})`}><circle r="7" /><circle r="3" /><text y={city.y > 80 ? -13 : 20} textAnchor="middle">{city.name}</text></g>)}
  </svg>;
}

function RouteGraphic({ route, owner, selected, interactive, blocked, onClick }) {
  const from = CITIES[route.from]; const to = CITIES[route.to];
  const baseStart = { x: from.x * 10, y: from.y * 6 };
  const baseEnd = { x: to.x * 10, y: to.y * 6 };
  const dx = baseEnd.x - baseStart.x; const dy = baseEnd.y - baseStart.y; const length = Math.hypot(dx, dy);
  const normal = { x: -dy / length, y: dx / length };
  const laneOffset = (route.lane ?? 0) * 11;
  const start = { x: baseStart.x + normal.x * laneOffset, y: baseStart.y + normal.y * laneOffset };
  const end = { x: baseEnd.x + normal.x * laneOffset, y: baseEnd.y + normal.y * laneOffset };
  const bend = ROUTE_BENDS.get(route.parallelGroup) ?? 0;
  const control = {
    x: (start.x + end.x) / 2 + normal.x * bend * 2,
    y: (start.y + end.y) / 2 + normal.y * bend * 2,
  };
  const path = `M ${start.x.toFixed(1)} ${start.y.toFixed(1)} Q ${control.x.toFixed(1)} ${control.y.toFixed(1)} ${end.x.toFixed(1)} ${end.y.toFixed(1)}`;
  const trackStart = .075; const trackEnd = .925; const slot = (trackEnd - trackStart) / route.length;
  const stroke = owner?.color ?? TRAIN_COLOR_INFO[route.color].hex;
  const badgeT = .5 + (route.lane ?? 0) * .035;
  const badge = quadraticPoint(start, control, end, badgeT);
  return <g className={`ttr-route ${interactive ? "interactive" : ""} ${owner ? "claimed" : ""} ${selected ? "selected" : ""} ${blocked ? "blocked" : ""}`} onClick={onClick} role={interactive ? "button" : undefined} aria-label={`${CITIES[route.from].name} to ${CITIES[route.to].name}, ${route.length} ${route.color}`}>
    <path className="route-hit" d={path} fill="none" />
    {Array.from({ length: route.length }, (_, index) => {
      const inset = Math.min(.026, slot * .14);
      const segmentStart = trackStart + index * slot + inset;
      const segmentEnd = trackStart + (index + 1) * slot - inset;
      const segmentPath = quadraticSubpath(start, control, end, segmentStart, segmentEnd);
      return <g key={index}><path className="route-segment-underlay" d={segmentPath} fill="none" /><path className="route-segment" d={segmentPath} fill="none" stroke={stroke} /></g>;
    })}
    <circle className="route-count" cx={badge.x} cy={badge.y} r="8" /><text className="route-count-label" x={badge.x} y={badge.y + 3.5} textAnchor="middle">{route.length}</text>
  </g>;
}

function quadraticPoint(start, control, end, t) {
  const inverse = 1 - t;
  return {
    x: inverse * inverse * start.x + 2 * inverse * t * control.x + t * t * end.x,
    y: inverse * inverse * start.y + 2 * inverse * t * control.y + t * t * end.y,
  };
}

function quadraticSubpath(start, control, end, fromT, toT) {
  const segmentStart = quadraticPoint(start, control, end, fromT);
  const segmentEnd = quadraticPoint(start, control, end, toT);
  const derivative = {
    x: 2 * (1 - fromT) * (control.x - start.x) + 2 * fromT * (end.x - control.x),
    y: 2 * (1 - fromT) * (control.y - start.y) + 2 * fromT * (end.y - control.y),
  };
  const segmentControl = {
    x: segmentStart.x + derivative.x * (toT - fromT) / 2,
    y: segmentStart.y + derivative.y * (toT - fromT) / 2,
  };
  return `M ${segmentStart.x.toFixed(1)} ${segmentStart.y.toFixed(1)} Q ${segmentControl.x.toFixed(1)} ${segmentControl.y.toFixed(1)} ${segmentEnd.x.toFixed(1)} ${segmentEnd.y.toFixed(1)}`;
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

function FinalScores({ room, playerId }) {
  return <div className="ttr-overlay"><section className="ttr-final-card"><Crown /><p className="ttr-kicker">Journey complete</p><h1>{room.winnerIds.includes(playerId) ? "You won the railway race!" : `${room.players.find((player) => room.winnerIds.includes(player.id))?.name} wins!`}</h1><div className="ttr-score-table"><div className="heading"><span>Traveler</span><span>Routes</span><span>Tickets</span><span>Longest</span><span>Total</span></div>{[...room.finalScores].sort((a, b) => b.total - a.total).map((score) => { const player = room.players.find((item) => item.id === score.playerId); return <div key={player.id} className={room.winnerIds.includes(player.id) ? "winner" : ""}><span><i style={{ background: player.color }} />{player.name}</span><span>{score.routeScore}</span><span>{score.ticketScore > 0 ? "+" : ""}{score.ticketScore}</span><span>{score.longestBonus ? `+10 (${score.longestRoute})` : score.longestRoute}</span><strong>{score.total}</strong></div>; })}</div><p className="ttr-final-note">Completed destinations add points; unfinished ones subtract them. The longest continuous railway earns 10 bonus points.</p></section></div>;
}
