"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Bot,
  Flame,
  Hand,
  ShieldCheck,
  Snowflake,
  Sparkles,
  Trophy,
  Users,
} from "lucide-react";
import { Flip7RoomService } from "./flip-7-room-service";
import {
  MAX_PLAYERS,
  MIN_PLAYERS,
  calculateRoundScore,
  currentPlayer,
  hasSecondChance,
  numberCards,
  targetOptions,
} from "../lib/flip-7";
import { useEngineRoom } from "../lib/use-engine-room.js";
import { ChoiceModal, GameHeader, Hero, Landing, Lobby, Results } from "./ui/table-shell";

const activeRoomKey = "flip-7-active-room";

/** The computer that is due to act in this room, or null. Shared by the pacing hook and the labels. */
function computerToActIn(room) {
  if (room?.phase !== "playing") return null;
  if (room.pendingTarget) return room.players.find((player) => player.id === room.pendingTarget.chooserId && player.isComputer) ?? null;
  const active = currentPlayer(room);
  return room.stage === "turns" && active?.isComputer ? active : null;
}

export default function Flip7Client() {
  const {
    room, setRoom, playerId, name, setName, joinCode, setJoinCode,
    busy, error, createRoom, joinRoom, act, computerWaiting, computerSpeed,
  } = useEngineRoom({ service: Flip7RoomService, storageKey: "flip-7", computerDue: (current) => Boolean(computerToActIn(current)) });
  const [showRules, setShowRules] = useState(false);

  const computerToAct = room ? computerToActIn(room) : null;


  function leaveRoom() {
    if (room?.phase === "playing" && !window.confirm("Leave the table? You can rejoin with the room code.")) return;
    localStorage.removeItem(activeRoomKey);
    setRoom(null);
  }

  const me = room?.players.find((player) => player.id === playerId) ?? null;

  if (!room || !me) {
    return <Landing
      gameName="Flip 7"
      theme="tbl-light flip-7-theme"
      hero={<Hero
        kicker="The press-your-luck card game"
        title={<>Flip.<br />Don&apos;t <em>flop.</em></>}
        copy="Collect seven different numbers before a duplicate wipes out your round. Stay safe—or risk it all for the bonus."
        badges={[
          { icon: Users, label: `${MIN_PLAYERS}–${MAX_PLAYERS} players` },
          { icon: Bot, label: "Computer seats" },
          { icon: Trophy, label: "Race to 200" },
        ]}
        art={[4, 11, 7].map((value) => <HeroCard key={value} value={value} />)}
      />}
      entry={{ name, setName, joinCode, setJoinCode, createRoom, joinRoom, busy, error }}
      onRules={() => setShowRules(true)}
      dialogs={showRules && <RulesModal onClose={() => setShowRules(false)} />}
    />;
  }

  if (room.phase === "lobby") {
    return <Lobby computerSpeed={computerSpeed}
      gameName="Flip 7"
      theme="tbl-light flip-7-theme"
      room={room}
      me={me}
      busy={busy}
      error={error}
      min={MIN_PLAYERS}
      max={MAX_PLAYERS}
      onAdd={() => act("addComputer")}
      onRemove={(id) => act("removeComputer", { playerId: id })}
      onStart={() => act("start")}
      onLeave={leaveRoom}
      onRules={() => setShowRules(true)}
      rules={showRules && <RulesModal onClose={() => setShowRules(false)} />}
    />;
  }

  const active = currentPlayer(room);
  const myTurn = room.phase === "playing" && room.stage === "turns" && !room.pendingTarget && active?.id === playerId;
  const myChoice = room.phase === "playing" && room.pendingTarget?.chooserId === playerId;
  const options = targetOptions(room);
  const statusMessage = computerWaiting
    ? `${computerToAct?.name} is thinking…`
    : myChoice
      ? `Choose who gets ${actionName(room.pendingTarget.action)}`
      : myTurn
        ? "Your call: flip or stay?"
        : room.pendingTarget
          ? `${room.players.find((player) => player.id === room.pendingTarget.chooserId)?.name} is choosing a target…`
          : `${active?.name}'s turn`;

  return <main className="f7-game-shell tbl-light flip-7-theme">
    <GameHeader computerSpeed={computerSpeed} title="Flip 7" room={room} status={statusMessage} onRules={() => setShowRules(true)} onLeave={leaveRoom} />

    {error && <p className="f7-error" role="alert">{error}</p>}

    {myChoice && <section className="f7-target-banner">
      <div><p className="f7-kicker">Action card</p><h2>{targetPrompt(room.pendingTarget.action)}</h2></div>
      <div className="f7-target-options">
        {options.map((player) => <button key={player.id} disabled={busy} onClick={() => act("chooseTarget", { targetId: player.id })}>
          {player.isComputer ? <Bot /> : <Users />}<span>{player.name}{player.id === playerId ? " (you)" : ""}<small>{calculateRoundScore(player)} showing</small></span>
        </button>)}
      </div>
    </section>}

    <section className="f7-scoreboard" aria-label="Players">
      {room.players.map((player) => <PlayerBoard key={player.id} player={player} isMe={player.id === playerId} isTurn={active?.id === player.id && room.phase === "playing"} room={room} />)}
    </section>

    <section className="f7-table-center">
      <aside className="f7-round-meter">
        <p className="f7-kicker">Race to 200</p>
        <strong>{me.score}</strong><span>total points</span>
        <div className="f7-progress"><i style={{ width: `${Math.min(100, (me.score / room.targetScore) * 100)}%` }} /></div>
        <small>{Math.max(0, room.targetScore - me.score)} to the finish</small>
      </aside>

      <div className="f7-deck-stage" aria-label={`${room.deckCount} cards left in the deck`}>
        <div className="f7-deck-shadow shadow-two" /><div className="f7-deck-shadow shadow-one" />
        <div className="f7-card f7-card-back"><span>FLIP</span><b>7</b><small>{room.deckCount} cards</small></div>
      </div>

      <aside className="f7-table-log"><p className="f7-kicker">Table talk</p>{room.log.slice(0, 6).map((line, index) => <p key={`${line}-${index}`}>{line}</p>)}</aside>
    </section>

    {room.phase === "playing" && <section className={`f7-decision-dock ${myTurn ? "ready" : ""}`}>
      <div><p className="f7-kicker">Your line</p><strong>{calculateRoundScore(me)} points</strong><span>{numberCards(me).length}/7 unique numbers · {room.riskPercent}% visible-deck bust risk</span></div>
      <div className="f7-decision-buttons">
        <button className="f7-stay-button" disabled={busy || !myTurn} onClick={() => act("stay")}><Hand /> Stay <small>Bank {calculateRoundScore(me)}</small></button>
        <button className="f7-flip-button" disabled={busy || !myTurn} onClick={() => act("flip")}><Flame /> Flip <small>Press your luck</small></button>
      </div>
    </section>}

    {showRules && <RulesModal onClose={() => setShowRules(false)} />}
    {(room.phase === "roundEnd" || room.phase === "finished") && <RoundModal room={room} me={me} busy={busy} onNext={() => act("nextRound")} onLeave={leaveRoom} />}
  </main>;
}

function PlayerBoard({ player, isMe, isTurn, room }) {
  const roundScore = calculateRoundScore(player);
  return <article className={`f7-player-board ${isMe ? "mine" : ""} ${isTurn ? "active" : ""} ${player.status}`}>
    <header>
      <span className="f7-avatar">{player.isComputer ? <Bot /> : player.name.slice(0, 1).toUpperCase()}</span>
      <div><strong>{player.name}{isMe ? " (you)" : ""}</strong><small>{player.score} total points</small></div>
      <b>{player.status === "busted" ? "BUST" : player.status === "stayed" ? "STAY" : `${roundScore} pts`}</b>
    </header>
    <div className="f7-card-line">
      {player.cards.map((card) => <CardFace key={card.id} card={card} />)}
      {!player.cards.length && <div className="f7-empty-line">Waiting for a card</div>}
    </div>
    <footer>
      <span>{numberCards(player).length}/7 numbers</span>
      {hasSecondChance(player) && <span className="protected"><ShieldCheck /> protected</span>}
      {room.flipSevenId === player.id && <span className="flipped"><Sparkles /> Flip 7 +15</span>}
    </footer>
  </article>;
}

function CardFace({ card }) {
  if (card.type === "number") return <div className={`f7-card f7-number-card tone-${card.value % 6}`}><small>{card.value}</small><strong>{card.value}</strong><small>{card.value}</small></div>;
  if (card.type === "modifier") {
    const label = card.modifier === "multiply" ? "×2" : `+${card.value}`;
    return <div className="f7-card f7-modifier-card"><small>BONUS</small><strong>{label}</strong><span>number score</span></div>;
  }
  return <div className="f7-card f7-chance-card"><ShieldCheck /><strong>SECOND</strong><span>CHANCE</span></div>;
}

function HeroCard({ value }) {
  return <div className={`f7-card f7-number-card tone-${value % 6}`}><small>{value}</small><strong>{value}</strong><small>{value}</small></div>;
}

function RulesModal({ onClose }) {
  return <ChoiceModal wide title="Flip without matching." text="Rules in a minute." onClose={onClose}>
    <div className="tbl-rule-grid">
      <article><b>Flip or stay</b><p>After everyone gets one card, choose to flip another or stay and bank your round score.</p></article>
      <article><b>Duplicates bust</b><p>Flip a number already in your line and you score zero for the round—unless you have a Second Chance.</p></article>
      <article><b>Flip 7 wins the round</b><p>Collect seven unique number cards to end the round immediately and add a 15-point bonus.</p></article>
      <article><b>Score to 200</b><p>Add number cards, double them with ×2, then add + modifiers. Highest score wins once someone reaches 200.</p></article>
    </div>
    <p className="tbl-rule-heading">Special cards</p>
    <div className="tbl-rule-grid">
      <article><b><Snowflake aria-hidden="true" /> Freeze</b><p>Choose any active player to stay immediately.</p></article>
      <article><b><Flame aria-hidden="true" /> Flip Three</b><p>Choose an active player who must take the next three cards.</p></article>
      <article><b><ShieldCheck aria-hidden="true" /> Second Chance</b><p>Discards one duplicate instead of busting; you may hold only one.</p></article>
    </div>
  </ChoiceModal>;
}

function RoundModal({ room, me, busy, onNext, onLeave }) {
  const winner = room.players.find((player) => player.id === room.winnerId);
  const isHost = room.hostId === me.id;
  const ranking = [...room.players].sort((a, b) => (room.roundScores[b.id] - room.roundScores[a.id]) || (b.score - a.score));
  const flipSevenName = room.players.find((player) => player.id === room.flipSevenId)?.name;
  return <Results
    title={winner ? `${winner.name} wins!` : flipSevenName ? `${flipSevenName} flipped 7!` : "Scores are banked."}
    text={winner ? "Game over" : `Round ${room.round} complete`}
    rows={ranking.map((player) => ({
      id: player.id,
      name: `${player.name}${player.id === me.id ? " (you)" : ""}`,
      value: `+${room.roundScores[player.id]}`,
      note: `${player.score} total`,
    }))}
  >
    {!winner && isHost && <button type="button" className="tbl-primary" disabled={busy} onClick={onNext}><Sparkles aria-hidden="true" /> Deal round {room.round + 1}</button>}
    {!winner && !isHost && <p className="tbl-wait">Waiting for {room.players[0].name} to deal the next round…</p>}
    <button type="button" className="tbl-link" onClick={onLeave}>{winner ? "Back to Flip 7" : "Leave table"}</button>
  </Results>;
}

function actionName(action) {
  if (action === "freeze") return "Freeze";
  if (action === "flip3") return "Flip Three";
  return "Second Chance";
}

function targetPrompt(action) {
  if (action === "freeze") return "Who has to stay right now?";
  if (action === "flip3") return "Who must take the next three cards?";
  return "Who gets your extra Second Chance?";
}
