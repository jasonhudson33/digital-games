"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Bot,
  RotateCcw,
  Sparkles,
  Users,
} from "lucide-react";
import { SequenceRoomService } from "./sequence-room-service";
import {
  BOARD,
  TEAM_COLORS,
  VALID_PLAYER_COUNTS,
  cardLabel,
  compatibleTeamCounts,
  completedForTeam,
  currentPlayer,
  isDeadCard,
  isOneEyedJack,
  isProtectedChip,
  isTwoEyedJack,
  legalTargetsForCard,
  positionKey,
  sequencesRequired,
  teamPlayers,
} from "../lib/sequence";
import { useEngineRoom } from "../lib/use-engine-room.js";
import { ChoiceModal, GameHeader, Hero, Landing, Lobby, Results } from "./ui/table-shell";
import CardFan from "./card-fan";

export default function SequenceClient() {
  const {
    room, playerId, name, setName, joinCode, setJoinCode,
    busy, error, createRoom, joinRoom, act, stepComputer, leaveRoom: leaveEngineRoom,
  } = useEngineRoom({ service: SequenceRoomService, storageKey: "sequence" });
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
      try { await stepComputer(); }
      finally { if (!cancelled) setComputerThinking(false); }
    }, 650);
    return () => { cancelled = true; window.clearTimeout(timer); };
  }, [computerToAct?.id, playerId, room?.phase, room?.updatedAt]);

  function leaveRoom() {
    if (room?.phase === "playing" && !window.confirm("Leave the table? You can rejoin with the room code.")) return;
    setSelectedCardId(null);
    leaveEngineRoom();
  }

  if (!room || !me) {
    return <Landing
      gameName="Sequence"
      theme="tbl-light sequence-theme"
      hero={<Hero
        kicker="Cards meet strategy"
        title={<>Build the line.<br /><em>Block the table.</em></>}
        copy="Play a card, claim its space, and connect five chips before the other teams do."
        badges={[{ icon: Users, label: "2–12 players" }, { icon: Bot, label: "Computer seats" }, { icon: Sparkles, label: "Up to 3 teams" }]}
        artLayout="free"
        art={<div className="sequence-hero-board">{Array.from({ length: 25 }, (_, index) => <span key={index} className={[6, 7, 8, 12, 16, 20, 24].includes(index) ? "marked" : ""} />)}</div>}
      />}
      entry={{ name, setName, joinCode, setJoinCode, createRoom, joinRoom, busy, error }}
      onRules={() => setShowRules(true)}
      dialogs={showRules && <RulesModal onClose={() => setShowRules(false)} />}
    />;
  }
  if (room.phase === "lobby") {
    const isHost = room.hostId === me.id;
    const teamOptions = compatibleTeamCounts(room.players.length);
    const canStart = VALID_PLAYER_COUNTS.includes(room.players.length) && teamOptions.includes(room.teamCount);
    return <Lobby
      gameName="Sequence"
      theme="tbl-light sequence-theme"
      room={room}
      me={me}
      busy={busy}
      error={error}
      min={2}
      max={12}
      canStart={canStart}
      seatNote={canStart ? `${room.teamCount} evenly divided teams · ready to play` : `Official table sizes: ${VALID_PLAYER_COUNTS.join(", ")}`}
      options={<div className="sequence-team-choice"><span>Teams</span>{[2, 3].map((count) => <button type="button" key={count} className={room.teamCount === count ? "active" : ""} disabled={!isHost || busy} onClick={() => act("setTeamCount", { teamCount: count })}>{count} teams</button>)}</div>}
      onAdd={() => act("addComputer")}
      onRemove={(id) => act("removeComputer", { playerId: id })}
      onStart={() => act("start")}
      onLeave={leaveRoom}
      onRules={() => setShowRules(true)}
      rules={showRules && <RulesModal onClose={() => setShowRules(false)} />}
    />;
  }

  const activePlayer = currentPlayer(room);
  const myTurn = room.phase === "playing" && activePlayer?.id === playerId;
  const selectedCard = me.hand.find((card) => card.id === selectedCardId) ?? null;
  const targets = selectedCard && myTurn ? legalTargetsForCard(room, selectedCard, playerId) : [];
  const targetKeys = new Set(targets.map(({ row, column }) => positionKey(row, column)));

  async function chooseSpace(row, column) {
    if (!selectedCard || !targetKeys.has(positionKey(row, column))) return;
    setSelectedCardId(null);
    await act("play", { cardId: selectedCard.id, row, column });
  }

  return <main className="sequence-game-shell tbl-light sequence-theme">
    <GameHeader
      title="Sequence"
      room={room}
      subtitle={`Room ${room.roomCode}`}
      status={room.phase === "finished" ? "Game complete" : myTurn ? "Your turn" : computerThinking ? `${activePlayer?.name} is thinking…` : `${activePlayer?.name}'s turn`}
      onRules={() => setShowRules(true)}
      onLeave={leaveRoom}
    />
    {error && <p className="sequence-error" role="alert">{error}</p>}
    <div className="sequence-table-layout">
      <aside className="sequence-sidebar">
        <p className="sequence-kicker">Score</p><h2>Teams</h2>
        {Array.from({ length: room.teamCount }, (_, teamIndex) => <TeamPanel key={teamIndex} room={room} teamIndex={teamIndex} playerId={playerId} />)}
        <div className="sequence-deck-status"><CardFace back /><div><strong>{room.deckCount}</strong><small>cards left</small></div></div>
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
    <HandPanel room={room} me={me} myTurn={myTurn} selectedCardId={selectedCardId} setSelectedCardId={setSelectedCardId} busy={busy} onExchange={(cardId) => act("exchange", { cardId })} />
    {showRules && <RulesModal onClose={() => setShowRules(false)} />}
    {room.phase === "finished" && <FinishedModal room={room} me={me} onLeave={leaveRoom} />}
  </main>;
}

function TeamPanel({ room, teamIndex, playerId }) {
  const team = TEAM_COLORS[teamIndex];
  const sequences = completedForTeam(room, teamIndex).length;
  return <section className="sequence-team-panel" style={{ "--team": team.color, "--team-light": team.light }}><div><span className="sequence-score-chip" /><strong>Team {team.name}</strong><b>{sequences}/{sequencesRequired(room)}</b></div>{teamPlayers(room, teamIndex).map((player) => <p className={currentPlayer(room)?.id === player.id ? "active" : ""} key={player.id}>{player.isComputer ? <Bot /> : <Users />}<span>{player.name}{player.id === playerId ? " (you)" : ""}</span><small>{player.hand.length} cards</small></p>)}</section>;
}

function HandPanel({ room, me, myTurn, selectedCardId, setSelectedCardId, busy, onExchange }) {
  return <section className="sequence-hand"><div className="sequence-hand-heading"><div><p className="sequence-kicker">Your hand</p><h2>{myTurn ? "Choose your play" : "Waiting for your turn"}</h2></div><span>{me.hand.length} cards</span></div><CardFan className="sequence-cards" count={me.hand.length}>{me.hand.map((card) => { const dead = room.phase === "playing" && isDeadCard(room, card); const jackType = isTwoEyedJack(card.code) ? "Wild" : isOneEyedJack(card.code) ? "Remove" : null; return <div className="sequence-hand-card-wrap" key={card.id}><button aria-label={`${cardLabel(card.code)}${jackType ? `, ${jackType}` : ""}`} className={`sequence-playing-card ${selectedCardId === card.id ? "selected" : ""}`} disabled={!myTurn || busy || dead} onClick={() => setSelectedCardId((selected) => selected === card.id ? null : card.id)}><CardFace code={card.code} />{jackType && <span className="sequence-card-action">{jackType}</span>}</button>{dead && <button className="sequence-dead-card" disabled={busy || room.deadCardExchanged || !myTurn} onClick={() => onExchange(card.id)}><RotateCcw /> Exchange dead card</button>}</div>; })}</CardFan></section>;
}

function CardFace({ code, back = false }) {
  if (back) return <playing-card className="sequence-card-art sequence-card-back" cid="0" backcolor="#174f40" backtext="S" backtextcolor="#f0c66d" bordercolor="#f8f2df" shadow="1,2,2" />;
  return <playing-card className="sequence-card-art" cid={code} bordercolor="#5b4630" shadow="1,2,2" />;
}

function RulesModal({ onClose }) {
  return <ChoiceModal wide title="How to play Sequence" text="Official classic rules." onClose={onClose}>
    <div className="tbl-rule-grid">
      <article><b>Play a card</b><p>Choose a card and place a chip on either matching open board space. Draw a replacement automatically.</p></article>
      <article><b>Use the Jacks</b><p>Two-eyed Jacks place anywhere. One-eyed Jacks remove an opponent chip—unless it belongs to a completed sequence.</p></article>
      <article><b>Connect five</b><p>Five chips in a row horizontally, vertically, or diagonally make a sequence. Free corners count for every team.</p></article>
      <article><b>Win together</b><p>Two teams need two sequences; three teams need one. A second sequence may share one chip with the first.</p></article>
    </div>
    <p className="tbl-rule-heading">Also</p>
    <div className="tbl-rule-grid">
      <article><b>Dead card</b><p>If both matching spaces are occupied, exchange that card once at the start of your turn, then play normally.</p></article>
      <article><b>Official formats</b><p>2, 3, 4, 6, 8, 9, 10, or 12 players. More than three players divide evenly into two or three teams. No table talk about cards.</p></article>
    </div>
    <p className="tbl-modal-copy">
      <a href="https://www.goliathgames.us/product/sequence/" target="_blank" rel="noreferrer">Publisher overview</a>
      {" · "}
      <a href="https://manuals.plus/m/6e6294d9d90207e6fd58f0021a4063515fe9066cf138cd0de821d2c3b6a9e979.pdf" target="_blank" rel="noreferrer">JAX game instructions</a>
    </p>
  </ChoiceModal>;
}

function FinishedModal({ room, me, onLeave }) {
  const team = room.winnerTeamIndex == null ? null : TEAM_COLORS[room.winnerTeamIndex];
  const won = me.teamIndex === room.winnerTeamIndex;
  return <Results
    title={team ? won ? "Your team wins!" : `Team ${team.name} wins` : "The board is locked"}
    text={team ? `Team ${team.name} completed ${sequencesRequired(room)} ${sequencesRequired(room) === 1 ? "sequence" : "sequences"}.` : "No legal moves remain."}
  >
    <button type="button" className="tbl-primary" onClick={onLeave}>Back to Sequence</button>
  </Results>;
}
