"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Ban,
  Bot,
  Coins,
  Hand,
  Trophy,
  Users,
} from "lucide-react";
import { NoThanksRoomService } from "./no-thanks-room-service";
import {
  MAX_PLAYERS,
  MIN_PLAYERS,
  canPassCard,
  cardScore,
  currentPlayer,
  finalScore,
  groupRuns,
} from "../lib/no-thanks";
import { useEngineRoom } from "../lib/use-engine-room.js";
import { ChoiceModal, GameHeader, Hero, Landing, Lobby, Results } from "./ui/table-shell";

/** The computer that is due to act in this room, or null. Shared by the pacing hook and the labels. */
function computerToActIn(room) {
  if (room?.phase !== "playing") return null;
  const active = currentPlayer(room);
  return active?.isComputer ? active : null;
}

export default function NoThanksClient() {
  const {
    room, playerId, name, setName, joinCode, setJoinCode,
    busy, error, createRoom, joinRoom, act, leaveRoom: leaveEngineRoom, computerWaiting, computerSpeed,
  } = useEngineRoom({ service: NoThanksRoomService, storageKey: "no-thanks", computerDue: (current) => Boolean(computerToActIn(current)) });
  const [showRules, setShowRules] = useState(false);

  const computerToAct = room ? computerToActIn(room) : null;


  function leaveRoom() {
    if (
      room?.phase === "playing" &&
      !window.confirm("Leave the table? You can rejoin with the room code.")
    ) return;
    leaveEngineRoom();
  }

  const me = room?.players.find((player) => player.id === playerId) ?? null;

  if (!room || !me) {
    return <Landing
      gameName="No Thanks!"
      theme="tbl-light no-thanks-theme"
      hero={<Hero
        kicker="The delightfully mean card game"
        title={<>No.<br /><em>Thanks!</em></>}
        copy="Cards are points. Points are bad. Pay a chip to pass—or take the number and every chip piled on it."
        badges={[
          { icon: Users, label: `${MIN_PLAYERS}–${MAX_PLAYERS} seats` },
          { icon: Bot, label: "Computer players" },
          { icon: Trophy, label: "Lowest score wins" },
        ]}
        art={[<NumberCard key="a" value={35} />, <span key="b" className="nt-hero-chip">☺</span>, <NumberCard key="c" value={8} />]}
      />}
      entry={{ name, setName, joinCode, setJoinCode, createRoom, joinRoom, busy, error }}
      onRules={() => setShowRules(true)}
      dialogs={showRules && <RulesModal onClose={() => setShowRules(false)} />}
    />;
  }

  if (room.phase === "lobby") {
    return <Lobby computerSpeed={computerSpeed}
      gameName="No Thanks!"
      theme="tbl-light no-thanks-theme"
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
  const myTurn = room.phase === "playing" && active?.id === playerId;
  const canPass = canPassCard(room, playerId);
  const statusMessage = computerWaiting
    ? `${computerToAct?.name} is deciding…`
    : myTurn
      ? room.players.find((player) => player.id === playerId)?.chips
        ? "Your choice: take it or pay a chip?"
        : "No chips left—you must take the card."
      : `${active?.name}'s choice`;

  return <main className="nt-game-shell tbl-light no-thanks-theme">
    <GameHeader computerSpeed={computerSpeed} title="No Thanks!" room={room} subtitle="Single-round game" status={room.phase === "playing" ? statusMessage : "Game over"} onRules={() => setShowRules(true)} onLeave={leaveRoom} />

    {error && <p className="nt-error" role="alert">{error}</p>}

    <section className="nt-scoreboard" aria-label="Players">
      {room.players.map((player) => <PlayerBoard
        key={player.id}
        player={player}
        isMe={player.id === playerId}
        isTurn={active?.id === player.id && room.phase === "playing"}
        finished={room.phase === "finished"}
      />)}
    </section>

    <section className="nt-table">
      <aside className="nt-deck-panel">
        <p className="nt-kicker">Cards remaining</p>
        <div className="nt-mini-deck"><span>NO</span><strong>{room.deckCount}</strong><small>after this one</small></div>
        <p>Nine cards were removed unseen, so every run has a little uncertainty.</p>
      </aside>

      <div className="nt-offer-stage">
        <div className="nt-offer-glow" />
        {room.activeCard !== null && <NumberCard value={room.activeCard} large />}
        <div className="nt-pot" aria-label={`${room.centerChips} chips on the card`}>
          <div className="nt-chip-stack" aria-hidden="true">
            {Array.from({ length: Math.min(room.centerChips, 7) }, (_, index) => <i key={index} style={{ transform: `translate(${index * 3}px, ${-index * 3}px)` }}>☺</i>)}
            {!room.centerChips && <i>☺</i>}
          </div>
          <strong>{room.centerChips}</strong><span>chips on card</span>
        </div>
      </div>

      <aside className="nt-table-log">
        <p className="nt-kicker">At the table</p>
        {room.log.slice(0, 7).map((line, index) => <p key={`${line}-${index}`}>{line}</p>)}
      </aside>
    </section>

    {room.phase === "playing" && <section className={`nt-decision-dock ${myTurn ? "ready" : ""}`}>
      <div><p className="nt-kicker">The offer</p><strong>{room.activeCard} points · {room.centerChips} chips</strong><span>Taking keeps the turn and reveals the next card.</span></div>
      <div className="nt-decision-buttons">
        {me.chips > 0 ? <button
          className="nt-pass-button"
          disabled={busy || !canPass}
          onClick={() => act("pass")}
        ><Ban /> No thanks <small>Pay 1 of {me.chips}</small></button> : <div className="nt-must-take" aria-live="polite">
          <Coins /><span><strong>No chips left</strong><small>Take is required</small></span>
        </div>}
        <button
          className="nt-take-button"
          disabled={busy || !myTurn}
          onClick={() => act("take")}
        ><Hand /> Take it <small>Collect {room.centerChips} chip{room.centerChips === 1 ? "" : "s"}</small></button>
      </div>
    </section>}

    {showRules && <RulesModal onClose={() => setShowRules(false)} />}
    {room.phase === "finished" && <ResultsModal room={room} me={me} onLeave={leaveRoom} />}
  </main>;
}

function PlayerBoard({ player, isMe, isTurn, finished }) {
  const runs = groupRuns(player.cards);
  const cardsOnly = cardScore(player.cards);
  return <article className={`nt-player-board ${isMe ? "mine" : ""} ${isTurn ? "active" : ""}`}>
    <header>
      <span className="nt-avatar">{player.isComputer ? <Bot /> : player.name.slice(0, 1).toUpperCase()}</span>
      <div><strong>{player.name}{isMe ? " (you)" : ""}</strong><small>{player.isComputer ? "Computer player" : isTurn ? "Choosing now" : "At the table"}</small></div>
      <b>{finished || isMe ? `${finalScore(player)} pts` : `${cardsOnly} cards`}</b>
    </header>
    <div className="nt-run-line">
      {runs.map((run) => <div className="nt-run" key={run.join("-")}>
        {run.map((card, index) => <NumberCard key={card} value={card} tucked={index > 0} />)}
        {run.length > 1 && <span className="nt-run-score">scores {run[0]}</span>}
      </div>)}
      {!runs.length && <div className="nt-empty-line">No cards collected</div>}
    </div>
    <footer><span><Coins /> {player.chips} chip{player.chips === 1 ? "" : "s"}</span><span>{player.cards.length} card{player.cards.length === 1 ? "" : "s"}</span></footer>
  </article>;
}

function NumberCard({ value, large = false, tucked = false }) {
  const tone = value < 10 ? "mint" : value < 20 ? "sky" : value < 30 ? "gold" : "rose";
  return <div className={`nt-number-card ${tone} ${large ? "large" : ""} ${tucked ? "tucked" : ""}`}>
    <small>{value}</small><strong>{value}</strong><small>{value}</small>
  </div>;
}

function RulesModal({ onClose }) {
  return <ChoiceModal wide title="Points are bad. Chips are good." text="Official rules, one digital round." onClose={onClose}>
    <div className="tbl-rule-grid">
      <article><b>Nine cards disappear</b><p>Cards 3–35 are shuffled and nine are removed unseen. The other 24 make the draw pile.</p></article>
      <article><b>Take it or pass</b><p>Take the face-up card and its chips, or pay one chip to pass the choice left. With no chips, you must take.</p></article>
      <article><b>Taking keeps your turn</b><p>Reveal the next card and choose again. Your collected cards stay face-up; your chip count stays secret.</p></article>
      <article><b>Lowest score wins</b><p>Count only the lowest card in each consecutive run, then subtract one point for every chip you hold.</p></article>
    </div>
    <p className="tbl-rule-heading">Example</p>
    <p className="tbl-modal-copy">Cards 8, 13–14–15 and 17 are 38 card points. With 13 chips left: 38 − 13 = 25 points.</p>
  </ChoiceModal>;
}

function ResultsModal({ room, me, onLeave }) {
  const ranking = [...room.players].sort((left, right) => finalScore(left) - finalScore(right));
  const winners = ranking.filter((player) => room.winnerIds.includes(player.id));
  return <Results
    title={winners.length === 1 ? `${winners[0].name} wins!` : `${winners.map((player) => player.name).join(" & ")} tie!`}
    text="Fewest points takes the table."
    rows={ranking.map((player) => ({
      id: player.id,
      name: `${player.name}${player.id === me.id ? " (you)" : ""}`,
      value: `${finalScore(player)} pts`,
      note: `${cardScore(player.cards)} cards − ${player.chips} chips`,
    }))}
  >
    <button type="button" className="tbl-primary" onClick={onLeave}>Back to No Thanks!</button>
  </Results>;
}
