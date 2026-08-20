"use client";

import { useEffect, useMemo, useState } from "react";
import { Bot, Check, CircleHelp, Copy, Crown, LogOut, Plus, RotateCcw, Sparkles, Users, X } from "lucide-react";
import { SequenceRoomService } from "./sequence-room-service";
import {
  BOARD,
  TEAM_COLORS,
  VALID_PLAYER_COUNTS,
  addComputerPlayer,
  addPlayer,
  cardLabel,
  compatibleTeamCounts,
  completedForTeam,
  createLobby,
  currentPlayer,
  exchangeDeadCard,
  isDeadCard,
  isOneEyedJack,
  isProtectedChip,
  isTwoEyedJack,
  legalTargetsForCard,
  playCard,
  positionKey,
  removeComputerPlayer,
  runComputerTurn,
  sequencesRequired,
  setTeamCount,
  startGame,
  teamPlayers,
} from "../lib/sequence";
import { useGameRoom } from "../lib/use-game-room.js";

const playerIdKey = "sequence-player-id";
const playerNameKey = "sequence-player-name";
const activeRoomKey = "sequence-active-room";

export default function SequenceClient() {
  const {
    room, setRoom, playerId, name, setName, joinCode, setJoinCode,
    busy, setBusy, error, setError, createRoom, joinRoom, update,
  } = useGameRoom({
    service: SequenceRoomService,
    storageKey: "sequence",
    createLobby: createLobby,
    addPlayer: addPlayer,
    maxPlayers: 12,
  });
  const [selectedCardId, setSelectedCardId] = useState(null);
  const [computerThinking, setComputerThinking] = useState(false);
  const [showRules, setShowRules] = useState(false);

  const me = room?.players.find((player) => player.id === playerId) ?? null;
  const computerToAct = room?.phase === "playing" && currentPlayer(room)?.isComputer ? currentPlayer(room) : null;

  useEffect(() => {
    if (!room || room.hostId !== playerId || !computerToAct) {
      setComputerThinking(false);
      return undefined;
    }
    let cancelled = false;
    setComputerThinking(true);
    const timer = window.setTimeout(async () => {
      try { await update((current) => runComputerTurn(current)); }
      finally { if (!cancelled) setComputerThinking(false); }
    }, 650);
    return () => { cancelled = true; window.clearTimeout(timer); };
  }, [computerToAct?.id, playerId, room?.phase, room?.updatedAt]);

  function leaveRoom() {
    if (room?.phase === "playing" && !window.confirm("Leave the table? You can rejoin with the room code.")) return;
    localStorage.removeItem(activeRoomKey);
    setSelectedCardId(null);
    setRoom(null);
  }

  if (!room || !me) return <Landing {...{ name, setName, joinCode, setJoinCode, createRoom, joinRoom, busy, error, showRules, setShowRules }} />;
  if (room.phase === "lobby") return <Lobby room={room} me={me} busy={busy} error={error} onAddComputer={() => update((current) => current.hostId === playerId ? addComputerPlayer(current) : current)} onRemoveComputer={(id) => update((current) => current.hostId === playerId ? removeComputerPlayer(current, id) : current)} onTeamCount={(count) => update((current) => current.hostId === playerId ? setTeamCount(current, count) : current)} onStart={() => update((current) => current.hostId === playerId ? startGame(current) : current)} onLeave={leaveRoom} setShowRules={setShowRules} />;

  const activePlayer = currentPlayer(room);
  const myTurn = room.phase === "playing" && activePlayer?.id === playerId;
  const selectedCard = me.hand.find((card) => card.id === selectedCardId) ?? null;
  const targets = selectedCard && myTurn ? legalTargetsForCard(room, selectedCard, playerId) : [];
  const targetKeys = new Set(targets.map(({ row, column }) => positionKey(row, column)));

  async function chooseSpace(row, column) {
    if (!selectedCard || !targetKeys.has(positionKey(row, column))) return;
    setSelectedCardId(null);
    await update((current) => playCard(current, playerId, selectedCard.id, row, column));
  }

  return <main className="sequence-game-shell">
    <header className="sequence-table-header">
      <div><p className="sequence-kicker">Room {room.roomCode}</p><h1>Sequence</h1></div>
      <div className={`sequence-turn ${myTurn ? "mine" : ""}`}>{activePlayer?.isComputer ? <Bot /> : <span style={{ background: TEAM_COLORS[activePlayer?.teamIndex ?? 0].color }} />}{room.phase === "finished" ? "Game complete" : myTurn ? "Your turn" : computerThinking ? `${activePlayer?.name} is thinking…` : `${activePlayer?.name}'s turn`}</div>
      <button className="sequence-header-button" onClick={() => setShowRules(true)}><CircleHelp /> Rules</button>
      <button className="sequence-header-button" onClick={() => navigator.clipboard?.writeText(room.roomCode)}><Copy /> {room.roomCode}</button>
      <button className="sequence-header-button" onClick={leaveRoom}><LogOut /> Leave</button>
    </header>
    {error && <p className="sequence-error" role="alert">{error}</p>}
    <div className="sequence-table-layout">
      <aside className="sequence-sidebar">
        <p className="sequence-kicker">Score</p><h2>Teams</h2>
        {Array.from({ length: room.teamCount }, (_, teamIndex) => <TeamPanel key={teamIndex} room={room} teamIndex={teamIndex} playerId={playerId} />)}
        <div className="sequence-deck-status"><CardFace back /><div><strong>{room.deck.length}</strong><small>cards left</small></div></div>
        <section className="sequence-log"><h3>Table talk</h3>{room.log.slice(0, 6).map((line, index) => <p key={`${line}-${index}`}>{line}</p>)}</section>
      </aside>
      <section className="sequence-board-wrap">
        <div className="sequence-board" aria-label="Sequence board">
          {BOARD.flatMap((row, rowIndex) => row.map((code, columnIndex) => {
            const key = positionKey(rowIndex, columnIndex);
            const chip = room.chips[key];
            const eligible = targetKeys.has(key);
            const matchingTarget = eligible && selectedCard && !isOneEyedJack(selectedCard.code) && !isTwoEyedJack(selectedCard.code);
            const free = code === "FREE";
            return <button key={key} className={`sequence-space ${free ? "free" : "sequence-board-card"} ${eligible ? "eligible" : ""} ${matchingTarget ? "matching-target" : ""} ${chip ? "occupied" : ""}`} disabled={!eligible} onClick={() => chooseSpace(rowIndex, columnIndex)} aria-label={`${free ? "Free corner" : cardLabel(code)}${chip ? `, ${TEAM_COLORS[chip.teamIndex].name} chip` : ""}`}>
              {free ? <span className="sequence-free-card"><Sparkles /><small>FREE</small></span> : <CardFace code={code} />}
              {chip && <i className={`sequence-chip ${isProtectedChip(room, rowIndex, columnIndex) ? "protected" : ""}`} style={{ "--chip": TEAM_COLORS[chip.teamIndex].color }}><span>{isProtectedChip(room, rowIndex, columnIndex) ? "★" : ""}</span></i>}
            </button>;
          }))}
        </div>
        <p className="sequence-board-hint">{!myTurn ? "Watch the board while the next player chooses." : selectedCard ? isOneEyedJack(selectedCard.code) ? "Choose a black-outlined opponent chip to remove." : "Choose a black-outlined space for this card." : "Choose a card from your hand, then choose its board space."}</p>
      </section>
    </div>
    <HandPanel room={room} me={me} myTurn={myTurn} selectedCardId={selectedCardId} setSelectedCardId={setSelectedCardId} busy={busy} onExchange={(cardId) => update((current) => exchangeDeadCard(current, playerId, cardId))} />
    {showRules && <RulesModal onClose={() => setShowRules(false)} />}
    {room.phase === "finished" && <FinishedModal room={room} me={me} onLeave={leaveRoom} />}
  </main>;
}

function Landing({ name, setName, joinCode, setJoinCode, createRoom, joinRoom, busy, error, showRules, setShowRules }) {
  return <main className="sequence-landing">
    <section className="sequence-hero">
      <div className="sequence-hero-board">{Array.from({ length: 25 }, (_, index) => <span key={index} className={[6, 7, 8, 12, 16, 20, 24].includes(index) ? "marked" : ""} />)}</div>
      <div><p className="sequence-kicker">Cards meet strategy</p><h1>Build the line.<br /><em>Block the table.</em></h1><p>Play a card, claim its space, and connect five chips before the other teams do.</p><div className="sequence-facts"><span><Users /> 2–12 players</span><span><Bot /> Computer seats</span><span><Sparkles /> Up to 3 teams</span></div></div>
    </section>
    <section className="sequence-entry-card"><div><p className="sequence-kicker">Pull up a chair</p><h2>Join the table</h2><p>Create a private room or enter a five-character room code.</p></div><label>Your name<input value={name} maxLength={20} autoComplete="nickname" onChange={(event) => setName(event.target.value)} placeholder="Player name" /></label><button className="sequence-primary" disabled={busy} onClick={createRoom}><Plus /> Create a room</button><div className="sequence-or"><span>or</span></div><div className="sequence-join"><input aria-label="Room code" value={joinCode} maxLength={5} onChange={(event) => setJoinCode(event.target.value.toUpperCase())} placeholder="ROOM CODE" /><button disabled={busy} onClick={joinRoom}>Join</button></div><button className="sequence-rules-link" onClick={() => setShowRules(true)}><CircleHelp /> How to play</button>{error && <p className="sequence-form-error">{error}</p>}</section>
    {showRules && <RulesModal onClose={() => setShowRules(false)} />}
  </main>;
}

function Lobby({ room, me, busy, error, onAddComputer, onRemoveComputer, onTeamCount, onStart, onLeave, setShowRules }) {
  const isHost = room.hostId === me.id;
  const teamOptions = compatibleTeamCounts(room.players.length);
  const canStart = VALID_PLAYER_COUNTS.includes(room.players.length) && teamOptions.includes(room.teamCount);
  return <main className="sequence-lobby"><section className="sequence-lobby-card">
    <div className="sequence-lobby-heading"><div><p className="sequence-kicker">Your table is ready</p><h1>Room <button onClick={() => navigator.clipboard?.writeText(room.roomCode)}>{room.roomCode} <Copy /></button></h1><p>Invite friends, add computer players, then divide the seats evenly.</p></div><button className="sequence-rules-link" onClick={() => setShowRules(true)}><CircleHelp /> Rules</button></div>
    <div className="sequence-team-choice"><span>Teams</span>{[2, 3].map((count) => <button key={count} className={room.teamCount === count ? "active" : ""} disabled={!isHost || busy} onClick={() => onTeamCount(count)}>{count} teams</button>)}</div>
    <div className="sequence-seat-grid">{room.players.map((player, index) => { const team = TEAM_COLORS[index % room.teamCount]; return <div key={player.id} className="sequence-seat" style={{ "--team": team.color }}><span className="sequence-seat-icon">{player.isComputer ? <Bot /> : <Users />}</span><div><strong>{player.name}{player.id === me.id ? " (you)" : ""}</strong><small>{index === 0 ? "Host · " : ""}{player.isComputer ? "Computer" : "Human"} · Team {team.name}</small></div>{player.isComputer && isHost ? <button aria-label={`Remove ${player.name}`} onClick={() => onRemoveComputer(player.id)}><X /></button> : <Check />}</div>; })}</div>
    {isHost && room.players.length < 12 && <button className="sequence-add-computer" disabled={busy} onClick={onAddComputer}><Bot /> Add computer</button>}
    <div className={`sequence-format-note ${canStart ? "ready" : ""}`}><strong>{room.players.length} {room.players.length === 1 ? "player" : "players"}</strong><span>{canStart ? `${room.teamCount} evenly divided teams · ready to play` : `Official table sizes: ${VALID_PLAYER_COUNTS.join(", ")}`}</span></div>
    {isHost ? <button className="sequence-primary sequence-start" disabled={busy || !canStart} onClick={onStart}><Sparkles /> Start game</button> : <p className="sequence-waiting">Waiting for {room.players[0].name} to start…</p>}
    <button className="sequence-quiet" onClick={onLeave}>Leave room</button>{error && <p className="sequence-form-error">{error}</p>}
  </section></main>;
}

function TeamPanel({ room, teamIndex, playerId }) {
  const team = TEAM_COLORS[teamIndex];
  const sequences = completedForTeam(room, teamIndex).length;
  return <section className="sequence-team-panel" style={{ "--team": team.color, "--team-light": team.light }}><div><span className="sequence-score-chip" /><strong>Team {team.name}</strong><b>{sequences}/{sequencesRequired(room)}</b></div>{teamPlayers(room, teamIndex).map((player) => <p className={currentPlayer(room)?.id === player.id ? "active" : ""} key={player.id}>{player.isComputer ? <Bot /> : <Users />}<span>{player.name}{player.id === playerId ? " (you)" : ""}</span><small>{player.hand.length} cards</small></p>)}</section>;
}

function HandPanel({ room, me, myTurn, selectedCardId, setSelectedCardId, busy, onExchange }) {
  return <section className="sequence-hand"><div className="sequence-hand-heading"><div><p className="sequence-kicker">Your hand</p><h2>{myTurn ? "Choose your play" : "Waiting for your turn"}</h2></div><span>{me.hand.length} cards</span></div><div className="sequence-cards">{me.hand.map((card) => { const dead = room.phase === "playing" && isDeadCard(room, card); const jackType = isTwoEyedJack(card.code) ? "Wild" : isOneEyedJack(card.code) ? "Remove" : null; return <div className="sequence-hand-card-wrap" key={card.id}><button aria-label={`${cardLabel(card.code)}${jackType ? `, ${jackType}` : ""}`} className={`sequence-playing-card ${selectedCardId === card.id ? "selected" : ""}`} disabled={!myTurn || busy || dead} onClick={() => setSelectedCardId((selected) => selected === card.id ? null : card.id)}><CardFace code={card.code} />{jackType && <span className="sequence-card-action">{jackType}</span>}</button>{dead && <button className="sequence-dead-card" disabled={busy || room.deadCardExchanged || !myTurn} onClick={() => onExchange(card.id)}><RotateCcw /> Exchange dead card</button>}</div>; })}</div></section>;
}

function CardFace({ code, back = false }) {
  if (back) return <playing-card className="sequence-card-art sequence-card-back" cid="0" backcolor="#174f40" backtext="S" backtextcolor="#f0c66d" bordercolor="#f8f2df" shadow="1,2,2" />;
  return <playing-card className="sequence-card-art" cid={code} bordercolor="#5b4630" shadow="1,2,2" />;
}

function RulesModal({ onClose }) {
  return <div className="sequence-overlay" role="dialog" aria-modal="true"><section className="sequence-rules-modal"><button className="sequence-modal-close" onClick={onClose}><X /></button><p className="sequence-kicker">Official classic rules</p><h1>How to play Sequence</h1><div className="sequence-rules-grid"><article><b>1</b><h2>Play a card</h2><p>Choose a card and place a chip on either matching open board space. Draw a replacement automatically.</p></article><article><b>2</b><h2>Use the Jacks</h2><p>Two-eyed Jacks place anywhere. One-eyed Jacks remove an opponent chip—unless it belongs to a completed sequence.</p></article><article><b>3</b><h2>Connect five</h2><p>Five chips in a row horizontally, vertically, or diagonally make a sequence. Free corners count for every team.</p></article><article><b>4</b><h2>Win together</h2><p>Two teams need two sequences; three teams need one. A second sequence may share one chip with the first.</p></article></div><div className="sequence-rules-notes"><p><strong>Dead card:</strong> If both matching spaces are occupied, exchange that card once at the start of your turn, then play normally.</p><p><strong>Official formats:</strong> 2, 3, 4, 6, 8, 9, 10, or 12 players. More than three players divide evenly into two or three teams. No table talk about cards.</p></div><div className="sequence-rule-sources"><a href="https://www.goliathgames.us/product/sequence/" target="_blank" rel="noreferrer">Publisher overview</a><a href="https://manuals.plus/m/6e6294d9d90207e6fd58f0021a4063515fe9066cf138cd0de821d2c3b6a9e979.pdf" target="_blank" rel="noreferrer">JAX game instructions</a></div><button className="sequence-primary" onClick={onClose}>Got it</button></section></div>;
}

function FinishedModal({ room, me, onLeave }) {
  const team = room.winnerTeamIndex == null ? null : TEAM_COLORS[room.winnerTeamIndex];
  const won = me.teamIndex === room.winnerTeamIndex;
  return <div className="sequence-overlay"><section className="sequence-finished"><span className="sequence-winner-chip" style={{ "--team": team?.color ?? "#777" }}><Crown /></span><p className="sequence-kicker">Game complete</p><h1>{team ? won ? "Your team wins!" : `Team ${team.name} wins` : "The board is locked"}</h1><p>{team ? `Team ${team.name} completed ${sequencesRequired(room)} ${sequencesRequired(room) === 1 ? "sequence" : "sequences"}.` : "No legal moves remain."}</p><button className="sequence-primary" onClick={onLeave}>Back to Sequence</button></section></div>;
}
