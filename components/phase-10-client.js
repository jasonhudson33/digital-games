"use client";

import { useEffect, useState } from "react";
import { Bot, Check, CircleHelp, Crown, Layers3, Plus, Sparkles, Target, Users, X } from "lucide-react";

import {
  MAX_PLAYERS, MIN_PLAYERS, PHASES, addComputerPlayer, addPlayer, canHitGroup, currentPlayer,
  createLobby, discardCard, drawCard, eligibleSkipTargets, findPhaseLayout, hitCard, layPhase,
  removeComputerPlayer, runComputerTurn, startGame, startNextRound, takeDiscard,
} from "../lib/phase-10";
import { useGameRoom } from "../lib/use-game-room.js";
import { ChoiceModal, EntryCard, GameHeader, Lobby } from "./ui/table-shell";
import { Phase10Card, Phase10CardBack } from "./phase-10-card";
import { Phase10RoomService } from "./phase-10-room-service";

export default function Phase10Client() {
  const {
    room, playerId, name, setName, joinCode, setJoinCode, busy, error,
    createRoom, joinRoom, update, leaveRoom,
  } = useGameRoom({ service: Phase10RoomService, storageKey: "phase-10", createLobby, addPlayer, maxPlayers: MAX_PLAYERS });
  const [rulesOpen, setRulesOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);

  const me = room?.players.find((player) => player.id === playerId) ?? null;
  const actor = room ? currentPlayer(room) : null;
  const myTurn = room?.phase === "playing" && actor?.id === playerId;

  useEffect(() => { setSelectedIds([]); }, [room?.currentPlayerIndex, room?.round]);
  useEffect(() => {
    if (room?.phase !== "playing" || room.hostId !== playerId || !actor?.isComputer) return undefined;
    const timer = window.setTimeout(() => update((current) => runComputerTurn(current)), 480);
    return () => window.clearTimeout(timer);
  }, [room?.updatedAt, room?.phase, actor?.id, actor?.isComputer, playerId]);

  if (!room || !me) return <Landing {...{ name, setName, joinCode, setJoinCode, createRoom, joinRoom, busy, error, rulesOpen, setRulesOpen }} />;
  if (room.phase === "lobby") return (
    <div className="p10-theme">
      <Lobby
        gameName="Phase 10" room={room} me={me} busy={busy} error={error} min={MIN_PLAYERS} max={MAX_PLAYERS}
        onAdd={() => update(addComputerPlayer)} onRemove={(id) => update((game) => removeComputerPlayer(game, id))}
        onStart={() => update(startGame)} onLeave={leaveRoom} onRules={() => setRulesOpen(true)}
        rules={rulesOpen ? <Rules onClose={() => setRulesOpen(false)} /> : null}
      />
    </div>
  );

  const selectedCards = selectedIds.map((id) => me.hand.find((card) => card.id === id)).filter(Boolean);
  const phaseSize = PHASES[me.phaseNumber - 1]?.groups.reduce((sum, group) => sum + group.size, 0) || 0;
  const validPhase = !me.phaseLaid && selectedCards.length === phaseSize && Boolean(findPhaseLayout(me.phaseNumber, selectedCards));
  const selectedCard = selectedCards.length === 1 ? selectedCards[0] : null;
  const skipTargets = selectedCard?.type === "skip" ? eligibleSkipTargets(room, playerId) : [];

  function toggle(cardId) {
    if (!myTurn || !room.turnDrawn) return;
    setSelectedIds((current) => current.includes(cardId) ? current.filter((id) => id !== cardId) : [...current, cardId]);
  }

  function discard(cardId, skipId = null) {
    update((game) => discardCard(game, playerId, cardId, skipId));
    setSelectedIds([]);
  }

  return (
    <main className="p10-game p10-theme">
      <GameHeader
        title="Phase 10" room={room}
        status={room.phase === "finished" ? "Game complete" : myTurn ? (room.turnDrawn ? "Build, hit, or discard" : "Draw a card") : `${actor?.name}'s turn`}
        onRules={() => setRulesOpen(true)} onLeave={leaveRoom}
      />

      <section className="p10-race" aria-label="Phase progress">
        {room.players.map((player) => <PlayerProgress key={player.id} player={player} active={actor?.id === player.id} mine={player.id === playerId} />)}
      </section>

      <div className="p10-layout">
        <aside className="p10-phase-map">
          <p className="p10-kicker">Your assignment</p>
          <h2>Phase {me.phaseNumber}</h2>
          <strong>{PHASES[me.phaseNumber - 1]?.label}</strong>
          <div className="p10-phase-list">
            {PHASES.map((phase) => <span className={phase.number < me.phaseNumber ? "done" : phase.number === me.phaseNumber ? "current" : ""} key={phase.number}><b>{phase.number}</b>{phase.label}{phase.number < me.phaseNumber && <Check />}</span>)}
          </div>
        </aside>

        <section className="p10-table">
          <div className="p10-table-glow" aria-hidden="true" />
          <div className="p10-piles">
            <button type="button" disabled={!myTurn || room.turnDrawn || busy} onClick={() => update((game) => drawCard(game, playerId))}>
              <Phase10CardBack /><strong>Draw pile</strong><small>{room.deck.length} cards</small>
            </button>
            <button type="button" disabled={!myTurn || room.turnDrawn || busy || room.discard.at(-1)?.type === "skip"} onClick={() => update((game) => takeDiscard(game, playerId))}>
              <Phase10Card card={room.discard.at(-1)} /><strong>Discard</strong><small>{room.discard.at(-1)?.type === "skip" ? "Skip cannot be picked up" : "Take top card"}</small>
            </button>
          </div>
          <p className="p10-message">{room.log[0]}</p>

          <div className="p10-laid-board">
            {room.players.map((player) => (
              <article className={`p10-laid-player ${player.phaseLaid ? "is-laid" : ""}`} key={player.id}>
                <header><span>{player.isComputer ? <Bot /> : player.name[0]}</span><strong>{player.name}{player.id === playerId ? " (you)" : ""}</strong><small>{player.phaseLaid ? `Phase ${player.phaseNumber} complete` : `Building Phase ${player.phaseNumber}`}</small></header>
                {player.phaseLaid ? <div className="p10-groups">{player.laidGroups.map((group, index) => (
                  <PhaseGroup
                    key={`${player.id}-${index}`} group={group}
                    selectedCard={myTurn && me.phaseLaid ? selectedCard : null}
                    onHit={(side) => { update((game) => hitCard(game, playerId, selectedCard.id, player.id, index, side)); setSelectedIds([]); }}
                  />
                ))}</div> : <div className="p10-awaiting"><Layers3 /> No phase laid yet</div>}
              </article>
            ))}
          </div>
        </section>
      </div>

      <section className="p10-hand-panel">
        <header><div><p className="p10-kicker">Your hand</p><h2>{me.hand.length} card{me.hand.length === 1 ? "" : "s"}</h2></div><p>{!myTurn ? `Waiting for ${actor?.name}` : !room.turnDrawn ? "Choose a pile to draw from." : !me.phaseLaid ? `Select ${phaseSize} cards that make ${PHASES[me.phaseNumber - 1].label}.` : "Select one card to hit or discard."}</p></header>
        <div className="p10-hand">
          {[...me.hand].sort(cardOrder).map((card) => <button type="button" className={selectedIds.includes(card.id) ? "selected" : ""} disabled={!myTurn || !room.turnDrawn || busy} onClick={() => toggle(card.id)} key={card.id}><Phase10Card card={card} /></button>)}
        </div>
        {myTurn && room.turnDrawn && (
          <div className="p10-actions">
            {!me.phaseLaid && <button type="button" className="p10-primary" disabled={!validPhase || busy} onClick={() => { update((game) => layPhase(game, playerId, selectedIds)); setSelectedIds([]); }}><Sparkles /> Lay down Phase {me.phaseNumber}</button>}
            {me.phaseLaid && selectedCard && selectedCard.type !== "skip" && <span><Target /> Choose a highlighted phase group above to hit.</span>}
            {selectedCard?.type !== "skip" && <button type="button" className="p10-discard" disabled={!selectedCard || busy} onClick={() => discard(selectedCard.id)}>Discard selected</button>}
            {selectedCard?.type === "skip" && <div className="p10-skip-targets"><strong>Who loses a turn?</strong>{skipTargets.map((player) => <button type="button" disabled={busy} onClick={() => discard(selectedCard.id, player.id)} key={player.id}>{player.name}</button>)}</div>}
          </div>
        )}
      </section>

      {rulesOpen && <Rules onClose={() => setRulesOpen(false)} />}
      {(room.phase === "roundEnd" || room.phase === "finished") && <Results room={room} me={me} busy={busy} onNext={() => update((game) => startNextRound(game, playerId))} onLeave={leaveRoom} />}
    </main>
  );
}

function PlayerProgress({ player, active, mine }) {
  return <article className={`${active ? "active" : ""} ${mine ? "mine" : ""}`}><span>{player.isComputer ? <Bot /> : player.name[0]}</span><div><strong>{player.name}{mine ? " (you)" : ""}</strong><small>{player.hand.length} cards · {player.score} pts</small></div><b>{player.phaseNumber}<small>/10</small></b></article>;
}

function PhaseGroup({ group, selectedCard, onHit }) {
  const normalHit = selectedCard && canHitGroup(group, selectedCard);
  const startHit = selectedCard?.type === "wild" && group.kind === "run" && canHitGroup(group, selectedCard, "start");
  const endHit = selectedCard?.type === "wild" && group.kind === "run" && canHitGroup(group, selectedCard, "end");
  const label = group.kind === "set" ? `Set of ${group.rank}s` : group.kind === "color" ? `${group.color} cards` : `Run ${group.start}-${group.end}`;
  return <div className={`p10-group ${(normalHit || startHit || endHit) ? "can-hit" : ""}`}><small>{label}</small><div>{group.cards.map((card) => <Phase10Card card={card} compact key={card.id} />)}</div>{selectedCard && group.kind === "run" && selectedCard.type === "wild" ? <span className="p10-run-hits">{startHit && <button onClick={() => onHit("start")}>Add before</button>}{endHit && <button onClick={() => onHit("end")}>Add after</button>}</span> : normalHit ? <button className="p10-hit-button" onClick={() => onHit(null)}>Hit here</button> : null}</div>;
}

function Landing({ name, setName, joinCode, setJoinCode, createRoom, joinRoom, busy, error, rulesOpen, setRulesOpen }) {
  return <main className="p10-landing p10-theme"><section className="p10-hero"><p className="p10-kicker">Ten challenges. One race.</p><h1><span>PHASE</span><b>10</b></h1><p>Build sets, connect runs, lock in colors, and leave every rival holding points.</p><div><span><Users /> 2-6 players</span><span><Bot /> Computer rivals</span><span><Layers3 /> 108-card deck</span></div><div className="p10-hero-cards" aria-hidden="true"><Phase10Card card={{ type: "number", number: 7, color: "red" }} /><Phase10Card card={{ type: "wild" }} /><Phase10Card card={{ type: "number", number: 10, color: "blue" }} /></div></section><EntryCard gameName="Phase 10" {...{ name, setName, joinCode, setJoinCode, createRoom, joinRoom, busy, error }} onRules={() => setRulesOpen(true)} />{rulesOpen && <Rules onClose={() => setRulesOpen(false)} />}</main>;
}

function Rules({ onClose }) {
  return <ChoiceModal title="How to play Phase 10" onClose={onClose} wide><div className="p10-rules"><p>Draw one card, optionally lay your complete current phase, hit any laid phases after yours is down, then discard one card.</p><h3>The ten phases</h3><ol>{PHASES.map((phase) => <li key={phase.number}><b>{phase.number}</b>{phase.label}</li>)}</ol><h3>Special cards</h3><p><strong>Wild:</strong> substitutes for any number or color. A phase must contain at least one numbered card.</p><p><strong>Skip:</strong> discard it and choose a player to miss a turn. It cannot be picked up or used in a phase.</p><h3>Scoring</h3><p>Only cards left in hand score against you: 1-9 are 5 points, 10-12 are 10, Skip is 15, and Wild is 25. Complete Phase 10 first; tied finishers compare lowest total score. If both are still tied, they replay Phase 10 and the first player out wins.</p><a href="https://service.mattel.com/instruction_sheets/GKD74-Eng.pdf" target="_blank" rel="noreferrer">Read Mattel's official rules</a></div></ChoiceModal>;
}

function Results({ room, me, busy, onNext, onLeave }) {
  const finished = room.phase === "finished";
  const winner = room.players.find((player) => player.id === (finished ? room.winners[0] : room.roundWinnerId));
  return <ChoiceModal title={finished ? `${winner?.name} completes Phase 10!` : `${winner?.name} went out`} text={finished ? "Lowest score breaks a same-round Phase 10 tie." : room.tieBreakerIds.length ? "The tied leaders will replay Phase 10." : "Completed phases advance; unfinished phases repeat."} wide><div className="p10-results">{[...room.players].sort((a, b) => b.phaseNumber - a.phaseNumber || a.score - b.score).map((player) => <article className={room.winners.includes(player.id) ? "winner" : ""} key={player.id}><span>{player.isComputer ? <Bot /> : player.name[0]}</span><div><strong>{player.name}{player.id === me.id ? " (you)" : ""}</strong><small>{player.phaseLaid ? "Phase completed" : "Phase not completed"}</small></div><b>Phase {player.phaseNumber}</b><em>+{room.roundScores[player.id] ?? 0} · {player.score} pts</em>{room.winners.includes(player.id) && <Crown />}</article>)}</div>{room.phase === "roundEnd" && room.hostId === me.id ? <button className="tbl-primary" disabled={busy} onClick={onNext}>Deal next round</button> : room.phase === "roundEnd" ? <p className="tbl-wait">Waiting for the host to deal…</p> : null}<button className="tbl-link" onClick={onLeave}>Leave table</button></ChoiceModal>;
}

function cardOrder(a, b) {
  const type = { number: 0, wild: 1, skip: 2 };
  return type[a.type] - type[b.type] || (a.number || 0) - (b.number || 0) || String(a.color).localeCompare(String(b.color));
}
