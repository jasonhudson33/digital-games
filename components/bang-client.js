"use client";

import { useEffect, useState } from "react";
import { Bot, CircleHelp, Copy, Crosshair, DoorOpen, Heart, LogOut, Plus, Shield, Sparkles, Users, X } from "lucide-react";
import { BangRoomService } from "./bang-room-service";
import {
  CARD_RULES,
  MAX_PLAYERS,
  MIN_PLAYERS,
  ROLE_LABELS,
  addComputerPlayer,
  addPlayer,
  canPlayCard,
  cardSuitSymbol,
  chooseGeneralStoreCard,
  createLobby,
  currentPlayer,
  declineResponse,
  discardFromHand,
  distanceBetween,
  endTurn,
  legalTargets,
  playCard,
  removeComputerPlayer,
  respondWithCard,
  responseCards,
  runComputerStep,
  startGame,
  useSidKetchum,
  weaponRange,
} from "../lib/bang";
import { useGameRoom } from "../lib/use-game-room.js";

const playerIdKey = "bang-player-id";
const playerNameKey = "bang-player-name";
const activeRoomKey = "bang-active-room";

export default function BangClient() {
  const {
    room, setRoom, playerId, name, setName, joinCode, setJoinCode,
    busy, setBusy, error, setError, createRoom, joinRoom, update,
  } = useGameRoom({
    service: BangRoomService,
    storageKey: "bang",
    createLobby: createLobby,
    addPlayer: addPlayer,
    maxPlayers: MAX_PLAYERS,
  });
  const [selectedCardId, setSelectedCardId] = useState(null);
  const [sidCards, setSidCards] = useState([]);
  const [showRules, setShowRules] = useState(false);

  const me = room?.players.find((player) => player.id === playerId) ?? null;
  const botNeedsAction = room?.phase === "playing" && (
    room.pending
      ? room.players.find((player) => player.id === room.pending.responderId)?.isComputer
      : currentPlayer(room)?.isComputer
  );

  useEffect(() => {
    if (!room || room.hostId !== playerId || !botNeedsAction) return undefined;
    const timer = window.setTimeout(() => update((current) => runComputerStep(current)), 560);
    return () => window.clearTimeout(timer);
  }, [botNeedsAction, playerId, room?.pending?.responderId, room?.turnIndex, room?.turnPhase, room?.updatedAt]);

  function leaveRoom() {
    localStorage.removeItem(activeRoomKey);
    setSelectedCardId(null);
    setRoom(null);
  }

  if (!room || !me) return <Landing {...{ name, setName, joinCode, setJoinCode, createRoom, joinRoom, busy, error, showRules, setShowRules }} />;
  if (room.phase === "lobby") return <Lobby room={room} me={me} busy={busy} error={error} onAddComputer={() => update((game) => game.hostId === playerId ? addComputerPlayer(game) : game)} onRemoveComputer={(id) => update((game) => game.hostId === playerId ? removeComputerPlayer(game, id) : game)} onStart={() => update((game) => game.hostId === playerId ? startGame(game) : game)} onLeave={leaveRoom} setShowRules={setShowRules} />;

  const active = currentPlayer(room);
  const myTurn = room.phase === "playing" && active?.id === playerId && !room.pending;
  const selectedCard = me.hand.find((card) => card.id === selectedCardId) ?? null;
  const targets = selectedCard ? legalTargets(room, playerId, selectedCard) : [];
  const targetIds = new Set(targets.map((player) => player.id));
  const responding = room.pending?.responderId === playerId;

  async function chooseCard(card) {
    if (room.turnPhase === "discard" && myTurn) {
      await update((game) => discardFromHand(game, playerId, card.id));
      return;
    }
    if (!myTurn || responding) return;
    if (me.character?.id === "sid" && sidCards.length) {
      setSidCards((cards) => {
        const chosen = cards.filter((id) => id !== "selecting");
        if (chosen.includes(card.id)) return ["selecting", ...chosen.filter((id) => id !== card.id)];
        return chosen.length < 2 ? ["selecting", ...chosen, card.id] : cards;
      });
      return;
    }
    const legal = canPlayCard(room, playerId, card);
    if (legal && legalTargets(room, playerId, card).length === 0) {
      setSelectedCardId(null);
      await update((game) => playCard(game, playerId, card.id));
    } else setSelectedCardId((id) => id === card.id ? null : card.id);
  }

  async function chooseTarget(target, targetCardId) {
    if (!selectedCard || !targetIds.has(target.id)) return;
    setSelectedCardId(null);
    await update((game) => playCard(game, playerId, selectedCard.id, { targetId: target.id, targetCardId }));
  }

  async function sidHeal() {
    if (!sidCards.length) { setSidCards(["selecting"]); return; }
    const chosen = sidCards.filter((id) => id !== "selecting");
    if (chosen.length !== 2) { setSidCards([]); return; }
    setSidCards([]);
    await update((game) => useSidKetchum(game, playerId, chosen));
  }

  return <main className="bang-game">
    <header className="bang-game-header">
      <div><p className="bang-kicker">Room {room.roomCode}</p><h1>BANG!</h1></div>
      <div className={`bang-turn-callout ${myTurn ? "mine" : ""}`}><Crosshair />{room.phase === "finished" ? "Showdown over" : room.pending ? `${room.players.find((player) => player.id === room.pending.responderId)?.name} must respond` : myTurn ? "Your turn" : `${active?.name}'s turn`}</div>
      <button onClick={() => setShowRules(true)}><CircleHelp /> Rules</button>
      <button onClick={() => navigator.clipboard?.writeText(room.roomCode)}><Copy /> {room.roomCode}</button>
      <button onClick={leaveRoom}><LogOut /> Leave</button>
    </header>
    {error && <p className="bang-error" role="alert">{error}</p>}

    <section className="bang-status-strip">
      <div className={`bang-role-chip role-${me.role}`}><span>Your role</span><strong>{ROLE_LABELS[me.role]}</strong></div>
      <div><span>Your character</span><strong>{me.character.name}</strong><small>{me.character.ability}</small></div>
      <div><span>Weapon range</span><strong>{weaponRange(me)}</strong><small>Distance modifies legal targets</small></div>
      <div><span>Deck</span><strong>{room.deck.length}</strong><small>{room.discard.length} discarded</small></div>
    </section>

    <div className="bang-table-layout">
      <section className="bang-table" aria-label="BANG game table">
        <div className="bang-table-center"><span className="bang-star">★</span><p>High Noon Saloon</p><strong>Turn {room.turnNumber}</strong></div>
        <div className={`bang-player-grid players-${room.players.length}`}>
          {room.players.map((player) => <PlayerSeat key={player.id} player={player} me={me} room={room} active={active?.id === player.id} selectable={targetIds.has(player.id)} selectedCard={selectedCard} onTarget={chooseTarget} />)}
        </div>
      </section>
      <aside className="bang-log"><p className="bang-kicker">Latest at the table</p><h2>Game log</h2>{room.log.slice(0, 10).map((line, index) => <p key={`${line}-${index}`}>{line}</p>)}</aside>
    </div>

    <section className="bang-hand">
      <div className="bang-hand-header"><div><p className="bang-kicker">Your hand · {me.hand.length} cards</p><h2>{room.turnPhase === "discard" && myTurn ? `Discard down to ${me.lives}` : responding ? "Choose your response" : myTurn ? selectedCard ? "Choose a highlighted target" : "Play a card or end your turn" : "Watch the showdown"}</h2></div><div className="bang-hand-actions">{me.character?.id === "sid" && myTurn && me.lives < me.maxLives && me.hand.length >= 2 && <button className={sidCards.length ? "active" : ""} onClick={sidHeal}><Heart /> {!sidCards.length ? "Sid: choose 2" : sidCards.filter((id) => id !== "selecting").length === 2 ? "Heal now" : "Cancel healing"}</button>}<button className="bang-end-turn" disabled={!myTurn || busy || room.turnPhase === "discard"} onClick={() => update((game) => endTurn(game, playerId))}>End turn</button></div></div>
      <div className="bang-hand-cards">{me.hand.map((card) => <button key={card.id} className={`bang-card-button ${selectedCardId === card.id || sidCards.includes(card.id) ? "selected" : ""}`} disabled={!myTurn || busy} onClick={() => chooseCard(card)}><Card card={card} /><small>{CARD_RULES[card.name]}</small></button>)}</div>
    </section>

    {responding && <ResponseModal room={room} me={me} busy={busy} onRespond={(cardId) => update((game) => respondWithCard(game, playerId, cardId))} onDecline={() => update((game) => declineResponse(game, playerId))} onStore={(cardId) => update((game) => chooseGeneralStoreCard(game, playerId, cardId))} />}
    {showRules && <RulesModal onClose={() => setShowRules(false)} />}
    {room.phase === "finished" && <FinishedModal room={room} me={me} onLeave={leaveRoom} />}
  </main>;
}

function Landing({ name, setName, joinCode, setJoinCode, createRoom, joinRoom, busy, error, showRules, setShowRules }) {
  return <main className="bang-landing"><section className="bang-hero"><div><p className="bang-kicker">A hidden-role western showdown</p><h1>Trust no one.<br /><em>Draw fast.</em></h1><p>The Sheriff stands in the open. Deputies protect the law, Outlaws hunt it, and the Renegade waits for the final duel.</p><div className="bang-facts"><span><Users /> 4–7 players</span><span><Bot /> Computer gunslingers</span><span><Shield /> Hidden roles</span></div></div><div className="bang-hero-art"><span className="bang-sun" /><i>WANTED</i><strong>BANG!</strong><small>THE CARD GAME</small></div></section><section className="bang-entry"><div><p className="bang-kicker">Pull up a chair</p><h2>Enter the saloon</h2><p>Create a private room or join one with its five-character code.</p></div><label>Your name<input value={name} maxLength={20} autoComplete="nickname" onChange={(event) => setName(event.target.value)} placeholder="Gunslinger name" /></label><button className="bang-primary" disabled={busy} onClick={createRoom}><Plus /> Create a room</button><div className="bang-or"><span>or</span></div><div className="bang-join"><input aria-label="Room code" value={joinCode} maxLength={5} onChange={(event) => setJoinCode(event.target.value.toUpperCase())} placeholder="ROOM CODE" /><button disabled={busy} onClick={joinRoom}>Join</button></div><button className="bang-rules-link" onClick={() => setShowRules(true)}><CircleHelp /> Read the rules</button>{error && <p className="bang-error">{error}</p>}</section>{showRules && <RulesModal onClose={() => setShowRules(false)} />}</main>;
}

function Lobby({ room, me, busy, error, onAddComputer, onRemoveComputer, onStart, onLeave, setShowRules }) {
  const isHost = room.hostId === me.id;
  const canStart = room.players.length >= MIN_PLAYERS && room.players.length <= MAX_PLAYERS;
  return <main className="bang-lobby"><section className="bang-lobby-card"><div className="bang-lobby-title"><div><p className="bang-kicker">Private saloon</p><h1>Room <button onClick={() => navigator.clipboard?.writeText(room.roomCode)}>{room.roomCode} <Copy /></button></h1><p>Invite friends or fill empty chairs with computer gunslingers.</p></div><button className="bang-rules-link" onClick={() => setShowRules(true)}><CircleHelp /> Rules</button></div><div className="bang-seat-list">{room.players.map((player, index) => <article key={player.id}><span>{player.isComputer ? <Bot /> : <Users />}</span><div><strong>{player.name}{player.id === me.id ? " (you)" : ""}</strong><small>{index === 0 ? "Host · " : ""}{player.isComputer ? "Computer" : "Human"}</small></div>{player.isComputer && isHost ? <button aria-label={`Remove ${player.name}`} onClick={() => onRemoveComputer(player.id)}><X /></button> : <i>{index + 1}</i>}</article>)}</div>{isHost && room.players.length < MAX_PLAYERS && <button className="bang-add-bot" disabled={busy} onClick={onAddComputer}><Bot /> Add computer player</button>}<div className={`bang-ready ${canStart ? "yes" : ""}`}><strong>{room.players.length} / {MAX_PLAYERS} seats filled</strong><span>{canStart ? "The showdown can begin" : `Add ${MIN_PLAYERS - room.players.length} more player${MIN_PLAYERS - room.players.length === 1 ? "" : "s"}`}</span></div>{isHost ? <button className="bang-primary" disabled={busy || !canStart} onClick={onStart}><Sparkles /> Deal roles & start</button> : <p className="bang-waiting">Waiting for {room.players[0].name} to deal…</p>}<button className="bang-quiet" onClick={onLeave}><DoorOpen /> Leave room</button>{error && <p className="bang-error">{error}</p>}</section></main>;
}

function PlayerSeat({ player, me, room, active, selectable, selectedCard, onTarget }) {
  const publicRole = player.role === "sheriff" || !player.alive || player.id === me.id ? ROLE_LABELS[player.role] : "Hidden role";
  const distance = player.id === me.id || !player.alive || !me.alive ? null : distanceBetween(room, me.id, player.id);
  return <article className={`bang-player-seat ${active ? "active" : ""} ${!player.alive ? "eliminated" : ""} ${selectable ? "targetable" : ""}`}>
    <button className="bang-seat-target" disabled={!selectable} onClick={() => onTarget(player)} aria-label={selectable ? `Target ${player.name} with ${selectedCard?.name}` : player.name}>
      <div className="bang-seat-top"><span className="bang-avatar">{player.isComputer ? <Bot /> : player.name.slice(0, 1).toUpperCase()}</span><div><strong>{player.name}</strong><small>{player.character?.name}</small></div>{distance && <b>Distance {distance}</b>}</div>
      <div className="bang-bullets" aria-label={`${player.lives} of ${player.maxLives} bullets`}>{Array.from({ length: player.maxLives }, (_, index) => <i key={index} className={index < player.lives ? "loaded" : "spent"}>●</i>)}</div>
      <div className={`bang-seat-role role-${player.role}`}>{!player.alive && <Crosshair />}{publicRole}</div>
      <div className="bang-card-count"><span className="bang-mini-card" /> {player.hand.length} in hand</div>
    </button>
    <div className="bang-face-up" aria-label={`${player.name}'s face-up cards`}>{player.table.length ? player.table.map((card) => <button key={card.id} disabled={!selectable || !["Panic", "Cat Balou"].includes(selectedCard?.name)} onClick={() => onTarget(player, card.id)}><Card card={card} compact /></button>) : <span>No cards in play</span>}</div>
  </article>;
}

function Card({ card, compact = false }) {
  const red = ["hearts", "diamonds"].includes(card.suit);
  return <span className={`bang-playing-card ${card.color} ${compact ? "compact" : ""}`}><span className={`bang-card-rank ${red ? "red" : ""}`}>{card.rank}<i>{cardSuitSymbol(card)}</i></span><strong>{card.name}</strong><em>{card.color === "blue" ? "IN PLAY" : "ACTION"}</em></span>;
}

function ResponseModal({ room, me, busy, onRespond, onDecline, onStore }) {
  const pending = room.pending;
  if (pending.type === "general-store") return <div className="bang-overlay"><section className="bang-response"><p className="bang-kicker">General Store</p><h1>Choose one card</h1><p>Selections continue clockwise after you.</p><div className="bang-store-cards">{pending.cards.map((card) => <button key={card.id} disabled={busy} onClick={() => onStore(card.id)}><Card card={card} /></button>)}</div></section></div>;
  const cards = responseCards(me, pending.type);
  const action = ["bang", "gatling"].includes(pending.type) ? "Missed!" : "BANG!";
  const source = room.players.find((player) => player.id === (pending.attackerId ?? pending.lastPlayerId));
  return <div className="bang-overlay"><section className="bang-response"><span className="bang-response-icon"><Crosshair /></span><p className="bang-kicker">Your move</p><h1>{pending.type === "duel" ? "Answer the Duel" : pending.type === "indians" ? "The Indians attack" : `${source?.name ?? "A player"} attacks`}</h1><p>Play {action}{pending.type === "bang" && pending.remaining > 1 ? ` (${pending.remaining} still needed)` : ""}, or take one bullet of damage.</p><div className="bang-response-cards">{cards.map((card) => <button key={card.id} disabled={busy} onClick={() => onRespond(card.id)}><Card card={card} /></button>)}</div><button className="bang-danger" disabled={busy} onClick={onDecline}>Take the hit</button></section></div>;
}

function RulesModal({ onClose }) {
  return <div className="bang-overlay" role="dialog" aria-modal="true"><section className="bang-rules"><button className="bang-modal-close" onClick={onClose}><X /></button><p className="bang-kicker">Base-game rules</p><h1>How to play BANG!</h1><div className="bang-rules-grid"><article><b>1</b><h2>Know your goal</h2><p>The Sheriff and Deputies eliminate Outlaws and the Renegade. Outlaws eliminate the Sheriff. The Renegade must be the last survivor.</p></article><article><b>2</b><h2>Take a turn</h2><p>Resolve Dynamite and Jail, draw two cards, play any legal cards, then discard until your hand is no larger than your remaining bullets.</p></article><article><b>3</b><h2>Mind the distance</h2><p>Your weapon sets BANG! range. Alive seats determine distance; Scope, Mustang, Rose Doolan, and Paul Regret modify it.</p></article><article><b>4</b><h2>Defend yourself</h2><p>Answer BANG! and Gatling with Missed!, and Indians and Duels with BANG!. Barrels make a Heart draw! check first.</p></article></div><div className="bang-rules-notes"><p><strong>Face-up cards:</strong> Blue equipment stays visible on the table. Only one weapon is active. Jail cannot target the Sheriff.</p><p><strong>Elimination:</strong> Reveal the role. Killing an Outlaw earns three cards. A Sheriff who kills a Deputy discards everything. Vulture Sam collects the eliminated player’s cards.</p><p><strong>Characters:</strong> Every original character power is applied by the game, including draw!, range, extra-draw, defense, damage, and hand-empty effects.</p></div><button className="bang-primary" onClick={onClose}>Ready to draw</button></section></div>;
}

function FinishedModal({ room, me, onLeave }) {
  const winners = room.winner === "sheriff" ? ["sheriff", "deputy"] : [room.winner];
  const won = winners.includes(me.role);
  return <div className="bang-overlay"><section className="bang-finished"><span>★</span><p className="bang-kicker">The dust settles</p><h1>{won ? "You win the showdown" : `${room.winner === "sheriff" ? "The law" : `The ${ROLE_LABELS[room.winner]}s`} wins`}</h1><p>Every identity is now revealed.</p><div>{room.players.map((player) => <article key={player.id}><strong>{player.name}</strong><span>{player.character.name}</span><b>{ROLE_LABELS[player.role]}</b></article>)}</div><button className="bang-primary" onClick={onLeave}>Back to the saloon</button></section></div>;
}
