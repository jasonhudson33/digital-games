"use client";

import { useEffect, useMemo, useState } from "react";
import { Bot, Check, Copy, Crown, Eye, EyeOff, LogOut, Map as MapIcon, Plus, Ticket, TrainFront, Users, X } from "lucide-react";
import { TicketToRideRoomService } from "./ticket-to-ride-room-service";
import { landPath, lakePaths } from "../lib/ticket-to-ride-map.js";
import { BOARD_H, BOARD_W, CAR_H, COLOR_GLYPH, carLayout, solveBends } from "../lib/ticket-to-ride-board.js";
import { useMapView } from "./ui/use-map-view";
import {
  CITIES,
  PLAYER_COLORS,
  ROUTES,
  ROUTE_POINTS,
  TRAIN_COLORS,
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

/* Bends are solved once from the static city and route tables — see solveBends.
 * Without them, routes leaving a city on close bearings share track, and
 * Los Angeles to El Paso runs through Phoenix. */
const CITY_POINTS = Object.fromEntries(
  Object.entries(CITIES).map(([id, city]) => [id, { x: city.x * 10, y: city.y * 6 }]),
);
const ROUTE_BEND = solveBends(CITY_POINTS, ROUTES);

/* A locomotive is every colour at once, and the card has to say so on sight.
 * It used to be one more shade of purple, a card apart from the purple card by
 * about as much as the purple card is from itself. Hard stops rather than a
 * blend: eight bands read as eight colours, where a smooth rainbow reads as a
 * single decorative gradient. */
/* Tickets you are being asked to choose between are drawn on the map at the same
 * time, so each one needs an identity of its own: the swatch on the card and the
 * line across the continent are the same colour. Three at a time is the most the
 * game ever deals, so three inks is the whole palette. */
const CHOICE_INKS = ["#c0392b", "#1f6f9c", "#2e7d4f"];

const wildGradientId = "ttr-wild-key";
const WILD_BANDS = TRAIN_COLORS.flatMap((color, index) => {
  const hex = TRAIN_COLOR_INFO[color].hex;
  const start = index / TRAIN_COLORS.length;
  const end = (index + 1) / TRAIN_COLORS.length;
  return [
    <stop key={`${color}-a`} offset={start} stopColor={hex} />,
    <stop key={`${color}-b`} offset={end} stopColor={hex} />,
  ];
});

/**
 * The tickets on offer, described for the map.
 *
 * Hovering (or focusing) one card fades the other lines rather than hiding them,
 * so the one you are reading stands out without the others' geography vanishing
 * from under it.
 *
 * @param {Array} choices  destination tickets being offered
 * @param {string[]} selected  ids the player has picked so far
 * @param {string|null} hovered  id of the card under the pointer, if any
 */
function choiceHighlights(choices, selected, hovered) {
  return choices.map((destination, index) => ({
    id: destination.id,
    from: destination.from,
    to: destination.to,
    points: destination.points,
    color: CHOICE_INKS[index % CHOICE_INKS.length],
    state: "candidate",
    picked: selected.includes(destination.id),
    dim: Boolean(hovered) && hovered !== destination.id,
  }));
}

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
  const [selectedDestinationId, setSelectedDestinationId] = useState(null);
  const [hoveredChoiceId, setHoveredChoiceId] = useState(null);
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
    setSelectedDestinationId(null);
    setOpeningSelection([]);
    setTicketSelection([]);
    setHoveredChoiceId(null);
    setRoom(null);
  }

  if (!room || !me) {
    return <StationLanding name={name} setName={setName} joinCode={joinCode} setJoinCode={setJoinCode} createRoom={createRoom} joinRoom={joinRoom} busy={busy} error={error} />;
  }

  if (room.phase === "lobby") {
    return <Lobby room={room} me={me} busy={busy} error={error} onAddComputer={() => update((current) => current.hostId === playerId ? addComputerPlayer(current) : current)} onRemoveComputer={(computerId) => update((current) => current.hostId === playerId ? removeComputerPlayer(current, computerId) : current)} onStart={() => update((current) => current.hostId === playerId ? startGame(current) : current)} onLeave={leaveRoom} />;
  }

  if (room.phase === "choosing-destinations" && me.pendingDestinations.length) {
    return <DestinationPicker
      room={room}
      title="Choose your opening journeys"
      subtitle="Keep at least two. Each ticket is drawn on the map in its own colour — an unfinished journey costs you its points at the end of the game."
      choices={me.pendingDestinations}
      selected={openingSelection}
      setSelected={setOpeningSelection}
      hovered={hoveredChoiceId}
      setHovered={setHoveredChoiceId}
      minimum={2}
      busy={busy}
      onConfirm={() => { setHoveredChoiceId(null); update((current) => chooseOpeningDestinations(current, playerId, openingSelection)); }}
      onLeave={leaveRoom}
    />;
  }

  if (room.phase === "choosing-destinations") {
    return <WaitingRoom room={room} me={me} onLeave={leaveRoom} />;
  }

  const myTurn = room.phase === "playing" && currentPlayer(room)?.id === playerId;
  const selectedRoute = ROUTES.find((route) => route.id === selectedRouteId);
  const paymentColors = selectedRoute ? validPaymentColors(room, playerId, selectedRoute.id) : [];
  const pendingChoices = room.pendingDestinationChoice?.playerId === playerId ? room.pendingDestinationChoice.choices : null;
  const selectedDestination = me.destinations.find((destination) => destination.id === selectedDestinationId) ?? null;
  const selectedDestinationCompleted = selectedDestination
    ? hasConnection(room, playerId, selectedDestination.from, selectedDestination.to)
    : false;
  /* Tickets being offered win the map over a ticket you are already holding:
     the offer is the decision in front of you, and it is the one that needs the
     board to answer it. */
  const boardHighlights = pendingChoices
    ? choiceHighlights(pendingChoices, ticketSelection, hoveredChoiceId)
    : selectedDestination
      ? [{
          id: selectedDestination.id,
          from: selectedDestination.from,
          to: selectedDestination.to,
          points: selectedDestination.points,
          color: selectedDestinationCompleted ? "#2f8b53" : "#cd4030",
          state: selectedDestinationCompleted ? "complete" : "incomplete",
          picked: true,
          dim: false,
        }]
      : [];

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
          <GameBoard room={room} myTurn={myTurn && room.drawsThisTurn === 0 && !pendingChoices} selectedRouteId={selectedRouteId} onSelectRoute={setSelectedRouteId} highlights={boardHighlights} />
          <div className="ttr-map-legend">
            <span><i className="open" /> Open route</span>
            <span><i className="owned" /> Claimed route</span>
            <span>Each car = 1 card</span>
            <span className="ttr-legend-key">
              {Object.entries(COLOR_GLYPH).map(([color, d]) => <i key={color} title={TRAIN_COLOR_INFO[color].label}>
                <svg viewBox="-6 -6 12 12" aria-hidden="true">
                  {color === "locomotive" && <defs><linearGradient id={wildGradientId} x1="0" y1="0" x2="1" y2="1">{WILD_BANDS}</linearGradient></defs>}
                  <rect x="-6" y="-6" width="12" height="12" rx="2.5" fill={color === "locomotive" ? `url(#${wildGradientId})` : TRAIN_COLOR_INFO[color].hex} />
                  <path d={d} />
                </svg>
                <b>{TRAIN_COLOR_INFO[color].label}</b>
              </i>)}
            </span>
          </div>
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

      {/* The player's own case is a fixed strip along the bottom of the table
          rather than a block below it, so their cards and tickets are on screen
          beside the map instead of a scroll away. */}
      <section className="ttr-hand-panel">
        <div className="ttr-hand-cards">
          <div className="ttr-hand-heading"><h2><TrainFront size={16} /> Your train cards</h2><span>{me.cards.length} in hand</span></div>
          <GroupedHand cards={me.cards} />
        </div>
        <div className="ttr-hand-tickets">
          <div className="ttr-destination-header"><h2><Ticket size={16} /> Your destinations</h2><button onClick={() => { if (showTickets) setSelectedDestinationId(null); setShowTickets((shown) => !shown); }}>{showTickets ? <EyeOff size={15} /> : <Eye size={15} />}{showTickets ? "Hide" : "Show"}</button></div>
          {showTickets && <div className="ttr-ticket-list">{me.destinations.map((item) => {
            const completed = hasConnection(room, playerId, item.from, item.to);
            return <DestinationCard key={item.id} destination={item} completed={completed} selected={item.id === selectedDestinationId} onSelect={() => setSelectedDestinationId((current) => current === item.id ? null : item.id)} />;
          })}</div>}
        </div>
      </section>

      {selectedRoute && !pendingChoices && !room.claimedRoutes[selectedRoute.id] && <ClaimPanel route={selectedRoute} colors={paymentColors} busy={busy} onClose={() => setSelectedRouteId(null)} onClaim={(color) => { update((current) => claimRoute(current, playerId, selectedRoute.id, color)); setSelectedRouteId(null); }} />}
      {/* Docked rather than a modal over the table: choosing which journeys to
          keep is a question about the board you have already built, and the old
          full-screen overlay was the one moment the map went away. */}
      {pendingChoices && <DestinationDock choices={pendingChoices} selected={ticketSelection} setSelected={setTicketSelection} hovered={hoveredChoiceId} setHovered={setHoveredChoiceId} busy={busy} onConfirm={() => { update((current) => chooseDrawnDestinations(current, playerId, ticketSelection)); setTicketSelection([]); setHoveredChoiceId(null); }} />}
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

/* The board does not go away again once it has arrived: the wait for the other
 * travelers is the first chance to plan a line between the journeys you kept, so
 * it happens on the same screen the choice did. */
function WaitingRoom({ room, me, onLeave }) {
  const highlights = me.destinations.map((destination, index) => ({
    id: destination.id,
    from: destination.from,
    to: destination.to,
    points: destination.points,
    color: CHOICE_INKS[index % CHOICE_INKS.length],
    state: "candidate",
    picked: true,
    dim: false,
  }));

  return <main className="ttr-picker-shell">
    <header className="ttr-picker-header">
      <div><p className="ttr-kicker">Tickets, please</p><h1>Your choices are locked in</h1></div>
      <p className="ttr-picker-sub">Waiting for the other travelers. Your journeys stay on the map — a good moment to work out the line that joins them.</p>
      <button className="ttr-quiet ttr-picker-leave" type="button" onClick={onLeave}><LogOut size={15} /> Leave room</button>
    </header>
    <div className="ttr-picker-grid">
      <section className="ttr-board-card" aria-label="Rail map of North America">
        <GameBoard room={room} myTurn={false} selectedRouteId={null} onSelectRoute={() => {}} highlights={highlights} />
      </section>
      <aside className="ttr-picker-side">
        <h2><Ticket size={16} /> Your journeys</h2>
        <div className="ttr-picker-tickets">
          {me.destinations.map((destination, index) => <ChoiceTicket key={destination.id} destination={destination} color={CHOICE_INKS[index % CHOICE_INKS.length]} selected />)}
        </div>
        <div className="ttr-ready-list">{room.players.map((player) => <span key={player.id} className={!player.pendingDestinations.length ? "ready" : ""}><i style={{ background: player.color }} />{player.name}{player.id === me.id ? " (you)" : ""}{player.isComputer ? " · Computer" : ""}<b>{!player.pendingDestinations.length ? "Ready" : "Choosing…"}</b></span>)}</div>
      </aside>
    </div>
  </main>;
}

/**
 * One ticket on offer. Selecting it keeps it; hovering or focusing it brings its
 * line on the map forward, which is the whole point of drawing them there.
 *
 * Without `onToggle` it is the same card with nothing left to decide — a ticket
 * you already hold — so it is drawn rather than offered.
 */
function ChoiceTicket({ destination, color, selected, onToggle, onHover }) {
  const inner = <>
    <span className="ttr-choice-swatch" aria-hidden="true" />
    <span className="ttr-choice-route">
      <strong>{CITIES[destination.from].name}</strong>
      <i>to</i>
      <strong>{CITIES[destination.to].name}</strong>
    </span>
    <b>{destination.points}<small>pts</small></b>
    <span className="ttr-pick-mark" aria-hidden="true"><Check size={13} /></span>
  </>;
  const className = `ttr-choice-ticket ${selected ? "selected" : ""}`;

  if (!onToggle) {
    return <div className={`${className} static`} style={{ "--ticket-ink": color }}>{inner}</div>;
  }

  return <button
    type="button"
    className={className}
    style={{ "--ticket-ink": color }}
    aria-pressed={selected}
    aria-label={`${destinationLabel(destination)}, ${destination.points} points. ${selected ? "Keeping" : "Not keeping"}.`}
    onClick={onToggle}
    onMouseEnter={() => onHover(destination.id)}
    onMouseLeave={() => onHover(null)}
    onFocus={() => onHover(destination.id)}
    onBlur={() => onHover(null)}
  >{inner}</button>;
}

function toggleChoice(setSelected, id) {
  setSelected((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
}

/**
 * The opening ticket deal, with the board.
 *
 * Choosing two of three journeys blind is choosing between names, and the names
 * only mean something next to the continent they cross — so the map is on screen
 * before the first choice of the game, with every ticket drawn across it.
 */
function DestinationPicker({ room, title, subtitle, choices, selected, setSelected, hovered, setHovered, minimum, busy, onConfirm, onLeave }) {
  const highlights = choiceHighlights(choices, selected, hovered);
  return <main className="ttr-picker-shell">
    <header className="ttr-picker-header">
      <div><p className="ttr-kicker">Private destinations</p><h1>{title}</h1></div>
      <p className="ttr-picker-sub">{subtitle}</p>
      <button className="ttr-quiet ttr-picker-leave" type="button" onClick={onLeave}><LogOut size={15} /> Leave room</button>
    </header>
    <div className="ttr-picker-grid">
      <section className="ttr-board-card" aria-label="Rail map of North America">
        <GameBoard room={room} myTurn={false} selectedRouteId={null} onSelectRoute={() => {}} highlights={highlights} />
      </section>
      <aside className="ttr-picker-side">
        <h2><Ticket size={16} /> Your three tickets</h2>
        <div className="ttr-picker-tickets">
          {choices.map((destination, index) => <ChoiceTicket
            key={destination.id}
            destination={destination}
            color={CHOICE_INKS[index % CHOICE_INKS.length]}
            selected={selected.includes(destination.id)}
            onToggle={() => toggleChoice(setSelected, destination.id)}
            onHover={setHovered}
          />)}
        </div>
        <p className="ttr-picker-hint">Point at a ticket to trace it on the map. Drag the map to pan, and use the zoom buttons for a closer look.</p>
        <button className="ttr-primary ttr-picker-confirm" disabled={busy || selected.length < minimum} onClick={onConfirm}>Keep {selected.length} {selected.length === 1 ? "destination" : "destinations"}</button>
        <small className="ttr-minimum">Choose at least {minimum}</small>
      </aside>
    </div>
  </main>;
}

/** Mid-game ticket draw: the same choice, docked beside the live board. */
function DestinationDock({ choices, selected, setSelected, hovered, setHovered, busy, onConfirm }) {
  return <section className="ttr-ticket-dock" aria-label="Choose new destination tickets">
    <p className="ttr-kicker">New destinations</p>
    <h2>Keep at least one</h2>
    <p className="ttr-dock-hint">Each ticket is drawn on the map beside this card. Point at one to trace it. Keeping ends your turn.</p>
    <div className="ttr-dock-tickets">
      {choices.map((destination, index) => <ChoiceTicket
        key={destination.id}
        destination={destination}
        color={CHOICE_INKS[index % CHOICE_INKS.length]}
        selected={selected.includes(destination.id)}
        onToggle={() => toggleChoice(setSelected, destination.id)}
        onHover={setHovered}
      />)}
    </div>
    <div className="ttr-dock-actions">
      <button className="ttr-primary" disabled={busy || selected.length < 1} onClick={onConfirm}>Keep {selected.length || ""} {selected.length === 1 ? "ticket" : "tickets"}</button>
      <small>{selected.length ? `Returning ${choices.length - selected.length} to the deck` : "Choose at least one"}</small>
    </div>
  </section>;
}

/**
 * @param {object[]} highlights destinations to draw over the map, each
 *   `{ id, from, to, points, color, state, picked, dim }`. More than one at a
 *   time is the case that matters: choosing between tickets means comparing them.
 */
function GameBoard({ room, myTurn, selectedRouteId, onSelectRoute, highlights = [] }) {
  const map = useMapView(BOARD_W, BOARD_H);
  const lakes = lakePaths();
  /* A city on two highlighted tickets takes the first one's colour rather than
     splitting the difference; the lines say the rest. */
  const highlightedCities = new Map();
  for (const highlight of highlights) {
    if (highlight.dim) continue;
    for (const cityId of [highlight.from, highlight.to]) {
      if (!highlightedCities.has(cityId)) highlightedCities.set(cityId, highlight);
    }
  }
  const spoken = highlights.filter((highlight) => !highlight.dim).map((highlight) => {
    const pair = `${CITIES[highlight.from].name} to ${CITIES[highlight.to].name}`;
    if (highlight.state === "complete") return `${pair}, connected`;
    if (highlight.state === "incomplete") return `${pair}, not connected yet`;
    return `${pair}, ${highlight.points} points`;
  });

  return <div className="ttr-map-frame">
    <svg
      ref={map.svgRef}
      className={`ttr-map ${map.zoomed ? "zoomed" : ""}`}
      viewBox={map.viewBox}
      role="img"
      aria-label={spoken.length
        ? `Cities and train routes across North America. Highlighted destinations: ${spoken.join("; ")}.`
        : "Cities and train routes across North America"}
      {...map.handlers}
    >
      <defs>
        <linearGradient id="ttr-sea" x1="0" y1="0" x2="0" y2="1">
          <stop stopColor="#8fb4bd" /><stop offset="1" stopColor="#6f97a3" />
        </linearGradient>
        <linearGradient id="ttr-land" x1="0" y1="0" x2=".3" y2="1">
          <stop stopColor="#e5dec0" /><stop offset="1" stopColor="#cfc59d" />
        </linearGradient>
        <filter id="ttr-shadow"><feDropShadow dx="0" dy="2" stdDeviation="2" floodOpacity=".26" /></filter>
      </defs>

      <rect className="ttr-sea" x="0" y="0" width={BOARD_W} height={BOARD_H} rx="26" fill="url(#ttr-sea)" />
      <g className="ttr-geography" aria-hidden="true">
        {/* shallow-water band, so the coast reads at a glance */}
        <path className="ttr-shelf" d={landPath()} />
        <path className="ttr-land" d={landPath()} fill="url(#ttr-land)" />
        {lakes.map((lake) => <path key={lake.name} className="ttr-lake" d={lake.d} />)}
      </g>
      <rect className="ttr-board-frame" x="7" y="7" width={BOARD_W - 14} height={BOARD_H - 14} rx="21" />

      {ROUTES.map((route) => {
        const available = isRouteAvailable(room, currentPlayer(room)?.id, route.id);
        return <RouteGraphic
          key={route.id}
          route={route}
          owner={room.claimedRoutes[route.id] ? room.players.find((player) => player.id === room.claimedRoutes[route.id]) : null}
          selected={selectedRouteId === route.id}
          interactive={myTurn && available}
          blocked={!available && !room.claimedRoutes[route.id]}
          onClick={() => { if (map.wasDragged()) return; if (myTurn && available) onSelectRoute(route.id); }}
        />;
      })}

      {highlights.map((highlight) => <DestinationLink key={highlight.id} highlight={highlight} />)}

      {Object.entries(CITIES).map(([id, city]) => {
        const highlight = highlightedCities.get(id);
        const candidate = highlight?.state === "candidate";
        return <g className={`ttr-city ${highlight ? `destination-${highlight.state}` : ""}`} data-city-id={id} data-destination-state={highlight?.state} key={id} transform={`translate(${city.x * 10} ${city.y * 6})`}>
        <circle r="7" style={candidate ? { fill: "#fff5e0", stroke: highlight.color } : undefined} />
        <circle r="3" style={candidate ? { fill: highlight.color } : undefined} />
        {highlight && <circle className="ttr-city-highlight" r="14" style={candidate ? { stroke: highlight.color } : undefined} />}
        <text x={city.labelX ?? 0} y={city.labelY ?? 20} textAnchor={city.labelAnchor ?? "middle"}>{city.name}</text>
      </g>;
      })}
    </svg>

    <div className="ttr-map-zoom" role="group" aria-label="Zoom the map">
      <button type="button" onClick={map.zoomOut} aria-label="Zoom out">&minus;</button>
      <button type="button" onClick={map.reset} aria-label="Fit the whole map">Fit</button>
      <button type="button" onClick={map.zoomIn} aria-label="Zoom in">+</button>
    </div>
  </div>;
}

/**
 * A ticket drawn across the map: its two cities joined by a bowed dashed line
 * carrying the ticket's points.
 *
 * The bow is what keeps it readable — a straight chord between two cities often
 * lies along the very routes it is asking about, and would read as track.
 */
function DestinationLink({ highlight }) {
  const from = CITY_POINTS[highlight.from];
  const to = CITY_POINTS[highlight.to];
  const span = Math.hypot(to.x - from.x, to.y - from.y) || 1;
  const bow = Math.min(34, span * 0.11);
  const control = {
    x: (from.x + to.x) / 2 - ((to.y - from.y) / span) * bow,
    y: (from.y + to.y) / 2 + ((to.x - from.x) / span) * bow,
  };
  const middle = quadraticPoint(from, control, to, 0.5);
  const outline = `M${from.x} ${from.y}Q${control.x.toFixed(1)} ${control.y.toFixed(1)} ${to.x} ${to.y}`;
  const classes = ["ttr-destination-link", highlight.dim && "dim", highlight.picked && "picked"]
    .filter(Boolean).join(" ");

  return <g className={classes} aria-hidden="true">
    <path className="ttr-destination-link-halo" d={outline} />
    <path className="ttr-destination-link-line" d={outline} style={{ stroke: highlight.color }} />
    <g transform={`translate(${middle.x.toFixed(1)} ${middle.y.toFixed(1)})`}>
      <rect className="ttr-destination-pip" x="-11" y="-8.5" width="22" height="17" rx="8.5" style={{ fill: highlight.color }} />
      <text className="ttr-destination-pip-label" y="4" textAnchor="middle">{highlight.points}</text>
    </g>
  </g>;
}

function RouteGraphic({ route, owner, selected, interactive, blocked, onClick }) {
  const from = CITIES[route.from];
  const to = CITIES[route.to];
  const cars = carLayout(
    { x: from.x * 10, y: from.y * 6 },
    { x: to.x * 10, y: to.y * 6 },
    route.length,
    route.lane ?? 0,
    ROUTE_BEND.get(route.id) ?? 0,
  );
  const stroke = owner?.color ?? TRAIN_COLOR_INFO[route.color].hex;
  const glyph = COLOR_GLYPH[route.color];
  const classes = ["ttr-route", interactive && "interactive", owner && "claimed", selected && "selected", blocked && "blocked"]
    .filter(Boolean).join(" ");

  return <g
    className={classes}
    onClick={onClick}
    role={interactive ? "button" : undefined}
    tabIndex={interactive ? 0 : undefined}
    onKeyDown={interactive ? (event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); onClick(); } } : undefined}
    aria-label={`${from.name} to ${to.name}, ${route.length} ${TRAIN_COLOR_INFO[route.color].label}${owner ? `, claimed by ${owner.name}` : ""}`}
  >
    {/* A fat invisible polyline through the cars, so the whole track is
        tappable and it follows the bend rather than cutting the corner. */}
    <polyline className="route-hit" points={cars.map((car) => `${car.x.toFixed(1)},${car.y.toFixed(1)}`).join(" ")} />
    {cars.map((car, index) => <g key={index} transform={`translate(${car.x.toFixed(1)} ${car.y.toFixed(1)}) rotate(${car.angle.toFixed(1)})`}>
      {owner
        ? <ClaimedTrainPiece color={stroke} length={car.length} />
        : <>
            <rect
              className="ttr-car"
              x={(-car.length / 2).toFixed(1)}
              y={-CAR_H / 2}
              width={car.length.toFixed(1)}
              height={CAR_H}
              rx="2.6"
              fill={stroke}
            />
            {/* Shape as well as colour: the whole mechanic is matching a route to
                cards of its colour, and colour alone excludes anyone who cannot
                separate the reds from the greens. Grey takes any card and carries
                no glyph — the absence is the information. */}
            {glyph && car.length > 13 && <path className="ttr-car-glyph" d={glyph} />}
          </>}
    </g>)}
  </g>;
}

function ClaimedTrainPiece({ color, length = 16 }) {
  /*
   * A claimed car keeps the same footprint as the open car it replaces, so a
   * route does not change shape when someone takes it. The previous version
   * scaled a fixed 16-unit locomotive drawing along the track, which stretched
   * its wheels into ovals on long routes and squashed the whole thing on short
   * ones. Here only the body is sized; the wheels are drawn at a fixed radius
   * and placed relative to the ends.
   */
  const half = length / 2;
  const wheel = Math.min(1.6, length / 9);
  const inset = Math.min(half - wheel - 0.6, 4.2);
  return <g className="ttr-played-train">
    <rect className="ttr-played-train-body" x={-half} y="-5.5" width={length} height="11" rx="2.6" fill={color} />
    <rect className="ttr-played-train-window" x={half - Math.min(5.4, length * 0.32)} y="-3.4" width={Math.min(3.4, length * 0.2)} height="2.6" rx=".5" />
    <path className="ttr-played-train-detail" d={`M${-half + 1.8} -1.1H${half - 2.2}`} />
    <circle className="ttr-played-train-wheel" cx={-inset} cy="4.4" r={wheel} />
    <circle className="ttr-played-train-wheel" cx={inset} cy="4.4" r={wheel} />
  </g>;
}

function quadraticPoint(start, control, end, t) {
  const inverse = 1 - t;
  return {
    x: inverse * inverse * start.x + 2 * inverse * t * control.x + t * t * end.x,
    y: inverse * inverse * start.y + 2 * inverse * t * control.y + t * t * end.y,
  };
}

function TrainCard({ card, compact = false, disabled, onClick }) {
  const info = TRAIN_COLOR_INFO[card.color];
  const wild = card.color === "locomotive";
  return <button className={`ttr-train-card ${compact ? "compact" : ""} ${wild ? "wild" : ""}`} style={{ "--card-color": info.hex, "--card-ink": info.ink }} disabled={disabled} onClick={onClick}><span className="ttr-card-stripes" /><small>{info.label}</small><TrainFront /><b>{wild ? "WILD" : "RAIL"}</b></button>;
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

function DestinationCard({ destination, completed, selected, onSelect }) {
  return <button type="button" className={`ttr-destination-card ${completed ? "complete" : ""} ${selected ? "selected" : ""}`} onClick={onSelect} aria-pressed={selected} aria-label={`${destinationLabel(destination)}, ${completed ? "completed" : "not completed"}. ${selected ? "Remove city highlight" : "Highlight cities on map"}.`}><div><Ticket /><span><strong>{destinationLabel(destination)}</strong><small>{completed ? "Route connected" : "Not connected yet"}</small></span></div><b>{destination.points}<small>pts</small></b>{completed && <Check className="ttr-done" />}</button>;
}

function ClaimPanel({ route, colors, busy, onClose, onClaim }) {
  return <div className="ttr-claim-panel"><button className="ttr-close" onClick={onClose}>×</button><p className="ttr-kicker">Claim this route</p><h2>{CITIES[route.from].name} → {CITIES[route.to].name}</h2><div className="ttr-claim-facts"><span><TrainFront /> {route.length} trains</span><span>{ROUTE_POINTS[route.length]} points</span><span>{TRAIN_COLOR_INFO[route.color].label}</span></div>{colors.length ? <><p>Choose cards to spend. Locomotives fill any missing cards.</p><div className="ttr-payment-options">{colors.map((color) => <button key={color} disabled={busy} style={{ "--pay-color": TRAIN_COLOR_INFO[color].hex }} onClick={() => onClaim(color)}><i />{TRAIN_COLOR_INFO[color].label}</button>)}</div></> : <p className="ttr-cannot-claim">You do not have enough matching cards yet.</p>}</div>;
}

function FinalScores({ room, playerId, onLeave }) {
  return <div className="ttr-overlay"><section className="ttr-final-card"><Crown /><p className="ttr-kicker">Journey complete</p><h1>{room.winnerIds.includes(playerId) ? "You won the railway race!" : `${room.players.find((player) => room.winnerIds.includes(player.id))?.name} wins!`}</h1><div className="ttr-score-table"><div className="heading"><span>Traveler</span><span>Routes</span><span>Tickets</span><span>Longest</span><span>Total</span></div>{[...room.finalScores].sort((a, b) => b.total - a.total).map((score) => { const player = room.players.find((item) => item.id === score.playerId); return <div key={player.id} className={room.winnerIds.includes(player.id) ? "winner" : ""}><span><i style={{ background: player.color }} />{player.name}</span><span>{score.routeScore}</span><span>{score.ticketScore > 0 ? "+" : ""}{score.ticketScore}</span><span>{score.longestBonus ? `+10 (${score.longestRoute})` : score.longestRoute}</span><strong>{score.total}</strong></div>; })}</div><p className="ttr-final-note">Completed destinations add points; unfinished ones subtract them. The longest continuous railway earns 10 bonus points.</p><button className="ttr-final-leave" type="button" onClick={onLeave}><LogOut size={16} /> Leave room</button></section></div>;
}
