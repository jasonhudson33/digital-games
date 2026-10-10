"use client";

import { useEffect, useState } from "react";
import { Bot, Check, ChevronDown, Copy, Crown, DoorOpen, Hand, Plus, Sparkles, Users, X } from "lucide-react";
import { FiveCrownsRoomService } from "./five-crowns-room-service";
import { MAX_PLAYERS, MIN_PLAYERS, canGoOutWithDiscard, currentPlayer, isValidMeld, isWild, wildLabel } from "../lib/five-crowns";
import { useEngineRoom } from "../lib/use-engine-room.js";

/** Opponents' hands are not sent, only a count. */
const handSize = (player) => player.handCount ?? player.hand.length;

const computerIsDue = (room) => room.phase === "playing" && Boolean(currentPlayer(room)?.isComputer) && (room.outPlayerId ? room.finalTurnIds.includes(currentPlayer(room).id) : true);
import { FiveCrownsCard, FiveCrownsCardBack } from "./five-crowns-card";

export default function FiveCrownsClient() {
  const { room, playerId, name, setName, joinCode, setJoinCode, busy, error, createRoom, joinRoom, act, leaveRoom } = useEngineRoom({ service: FiveCrownsRoomService, storageKey: "five-crowns", computerDelay: 650, computerDue: computerIsDue });
  const [selectedIds, setSelectedIds] = useState([]);
  const me = room?.players.find((player) => player.id === playerId);
  const computerTurn = room ? computerIsDue(room) : false;

  useEffect(() => {
    setSelectedIds([]);
  }, [room?.updatedAt]);

  function leave() { setSelectedIds([]); leaveRoom(); }
  if (!room || !me) return <Landing {...{ name, setName, joinCode, setJoinCode, createRoom, joinRoom, busy, error }} />;
  if (room.phase === "lobby") return <Lobby room={room} me={me} busy={busy} onAdd={() => act("addComputer")} onRemove={(id) => act("removeComputer", { playerId: id })} onStart={() => act("start")} onLeave={leave} />;
  if (room.phase === "roundEnd" || room.phase === "finished") return <Results room={room} me={me} busy={busy} onNext={() => act("nextRound")} onLeave={leave} />;

  const active = currentPlayer(room);
  const myTurn = active?.id === playerId && (!room.outPlayerId || room.finalTurnIds.includes(playerId));
  const selectedCards = me.hand.filter((card) => selectedIds.includes(card.id));
  const finalTurn = room.outPlayerId && room.finalTurnIds.includes(playerId);
  const draw = () => act("draw");
  const take = () => act("takeDiscard");
  const discard = () => selectedCards.length === 1 && act("discard", { cardId: selectedCards[0].id });
  const layDown = () => selectedCards.length >= 3 && act("layDown", { cardIds: selectedIds });
  const canGoOutNow = selectedCards.length === 1 && canGoOutWithDiscard(room, playerId, selectedCards[0].id);
  return <main className="fc-shell">
    <header className="fc-header"><div><span className="fc-mark">5</span><div><small>Five Crowns · room {room.roomCode}</small><h1>Five Crowns</h1></div></div><span className={`fc-turn ${myTurn ? "mine" : ""}`}>{computerTurn ? `${active.name} is thinking…` : myTurn ? finalTurn ? "Your final turn" : "Your turn" : `${active?.name}'s turn`}</span><button onClick={() => navigator.clipboard?.writeText(room.roomCode)}><Copy /> {room.roomCode}</button><button onClick={leave}><DoorOpen /> Leave</button></header>
    <section className="fc-round"><div><small>Round {room.round} of 11</small><strong>{wildLabel(room.wildRank)} wild</strong></div><div className="fc-progress"><i style={{ width: `${room.round / 11 * 100}%` }} /></div><span>Lowest score wins</span></section>
    {room.outPlayerId && <div className="fc-alert"><Crown /> {room.players.find((player) => player.id === room.outPlayerId)?.name} went out. Each remaining player gets one final turn.</div>}
    <section className="fc-table"><aside className="fc-scoreboard"><h2>Scores</h2>{room.players.map((player) => <div className={player.id === playerId ? "mine" : ""} key={player.id}><span>{player.isComputer ? <Bot /> : player.name[0]}</span><strong>{player.name}</strong><b>{room.totalScores[player.id] || 0}</b><small>{handSize(player)} cards · {(player.melds || []).length} melds down</small></div>)}</aside><section className="fc-center"><div className="fc-piles"><button className="fc-pile" disabled={!myTurn || room.turnDrawn || me.hand.length >= room.wildRank + 1 || (!room.deckCount && room.discardCount <= 1) || busy} onClick={draw}><FiveCrownsCardBack /><strong>{room.deckCount}</strong><small>{room.turnDrawn ? "Already drawn" : room.deckCount ? "Draw pile" : "Shuffle discards"}</small></button><button className="fc-pile discard" disabled={!myTurn || room.turnDrawn || me.hand.length >= room.wildRank + 1 || !room.discard.length || busy} onClick={take}><FiveCrownsCard card={room.discard.at(-1)} wild={isWild(room, room.discard.at(-1))} /><small>{room.turnDrawn ? "Already drawn" : "Take discard"}</small></button></div><p className="fc-message">{room.log[0]}</p></section></section>
    <section className="fc-hand-panel"><div className="fc-hand-title"><div><small>{finalTurn ? "Final turn" : myTurn ? "Your hand" : "Your cards"}</small><h2>{canGoOutNow ? "You can go out" : myTurn && !room.turnDrawn ? "Draw one card" : myTurn ? finalTurn ? "Lay down or discard" : "Choose a discard" : "Watch the table"}</h2></div><span>{me.hand.length} cards · max {room.wildRank + 1}</span></div><div className="fc-hand">{me.hand.map((card) => <button key={card.id} className={selectedIds.includes(card.id) ? "selected" : ""} disabled={!myTurn || busy} onClick={() => setSelectedIds((current) => current.includes(card.id) ? current.filter((id) => id !== card.id) : [...current, card.id])}><FiveCrownsCard card={card} wild={isWild(room, card)} /></button>)}</div>{myTurn && <div className="fc-actions">{finalTurn && <button className="fc-secondary" disabled={busy || !room.turnDrawn || !isValidMeld(room, selectedCards)} onClick={layDown}>Lay down meld</button>}<button className="fc-primary" disabled={busy || !room.turnDrawn || selectedCards.length !== 1} onClick={discard}><Hand /> {canGoOutNow ? "Go out" : "Discard selected"}</button>{canGoOutNow && <span className="fc-go-out">Your remaining cards form complete books or runs.</span>}</div>}</section>
    <section className="fc-rules"><span><strong>Books</strong> 3+ cards of the same rank</span><span><strong>Runs</strong> 3+ consecutive cards in one suit</span><span><strong>Wild</strong> {wildLabel(room.wildRank)} and Jokers</span></section>
  </main>;
}

function Landing({ name, setName, joinCode, setJoinCode, createRoom, joinRoom, busy, error }) { return <main className="fc-landing"><section className="fc-hero"><small>Five-suited rummy</small><h1>Make your<br /><em>run.</em></h1><p>Build books and runs, use the rotating wild rank, and finish with the lowest score across eleven hands.</p><div><span>2–7 players</span><span>11 rounds</span><span>Room based</span></div></section><section className="fc-entry"><small>Open a table</small><h2>Play Five Crowns</h2><label>Your name<input value={name} onChange={(event) => setName(event.target.value)} placeholder="Player name" maxLength={18} /></label><button className="fc-primary" disabled={busy} onClick={createRoom}><Plus /> Create room</button><div className="fc-or">or join a room</div><div className="fc-join"><input aria-label="Room code" value={joinCode} onChange={(event) => setJoinCode(event.target.value.toUpperCase())} onKeyDown={(event) => event.key === "Enter" && joinRoom()} placeholder="ROOM CODE" maxLength={5} /><button disabled={busy} onClick={joinRoom}>Join</button></div>{error && <p className="fc-error">{error}</p>}</section></main>; }

function Lobby({ room, me, busy, onAdd, onRemove, onStart, onLeave }) { const host = room.hostId === me.id; return <main className="fc-lobby"><section><small>Room {room.roomCode}</small><h1>Seat the table</h1><p>Share the room code with friends, or add computer players before dealing.</p><div className="fc-seats">{room.players.map((player) => <div key={player.id}><span>{player.isComputer ? <Bot /> : player.name[0]}</span><strong>{player.name}{player.id === me.id ? " (you)" : ""}</strong><small>{player.isComputer ? "Computer" : "Human player"}</small>{host && player.isComputer ? <button onClick={() => onRemove(player.id)}><X /></button> : <Check />}</div>)}</div>{host && room.players.length < MAX_PLAYERS && <button className="fc-add" disabled={busy} onClick={onAdd}><Bot /> Add computer</button>}{host ? <button className="fc-primary fc-start" disabled={busy || room.players.length < MIN_PLAYERS} onClick={onStart}><Sparkles /> Deal round one</button> : <p className="fc-waiting">Waiting for {room.players[0].name} to deal…</p>}<button className="fc-leave" onClick={onLeave}>Leave room</button></section></main>; }

function Results({ room, me, busy, onNext, onLeave }) { const sorted = [...room.players].sort((a, b) => (room.totalScores[a.id] || 0) - (room.totalScores[b.id] || 0)); return <main className="fc-results"><section><Crown /><small>{room.phase === "finished" ? "Game complete" : `Round ${room.round} complete`}</small><h1>{room.phase === "finished" ? `${sorted[0].name} wins!` : "Hand scored"}</h1>{room.phase === "roundEnd" && <div>{sorted.map((player) => <p key={player.id}><strong>{player.name}</strong><span>+{room.roundScores[player.id] || 0}</span><b>{room.totalScores[player.id] || 0} total</b></p>)}</div>}{room.phase === "roundEnd" && room.hostId === me.id && <button className="fc-primary" disabled={busy} onClick={onNext}>Deal next hand</button>}<button className="fc-leave" onClick={onLeave}>Back to Five Crowns</button></section></main>; }
