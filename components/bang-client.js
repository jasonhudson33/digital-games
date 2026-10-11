"use client";

import { useState } from "react";
import {
  Bot,
  Crosshair,
  Heart,
  Shield,
  Users,
} from "lucide-react";
import { BangRoomService } from "./bang-room-service";
import {
  CARD_RULES,
  MAX_PLAYERS,
  MIN_PLAYERS,
  ROLE_LABELS,
  canPlayCard,
  cardSuitSymbol,
  currentPlayer,
  distanceBetween,
  legalTargets,
  responseCards,
  weaponRange,
} from "../lib/bang";
import { useEngineRoom } from "../lib/use-engine-room.js";
import { ChoiceModal, GameHeader, Hero, Landing as SharedLanding, Lobby as SharedLobby, Results } from "./ui/table-shell";

/** Whether a computer is due to act: it holds the pending response, or it is its turn. */
function computerIsDue(room) {
  if (room.phase !== "playing") return false;
  return room.pending
    ? Boolean(room.players.find((player) => player.id === room.pending.responderId)?.isComputer)
    : Boolean(currentPlayer(room)?.isComputer);
}

export default function BangClient() {
  const {
    room, setRoom, playerId, name, setName, joinCode, setJoinCode,
    busy, error, createRoom, joinRoom, act, leaveRoom: leaveEngineRoom, computerSpeed,
  } = useEngineRoom({ service: BangRoomService, storageKey: "bang", computerDue: computerIsDue });
  const [selectedCardId, setSelectedCardId] = useState(null);
  const [sidCards, setSidCards] = useState([]);
  const [showRules, setShowRules] = useState(false);

  const me = room?.players.find((player) => player.id === playerId) ?? null;

  function leaveRoom() {
    setSelectedCardId(null);
    leaveEngineRoom();
  }

  if (!room || !me) {
    return <SharedLanding
      gameName="BANG!"
      theme="tbl-light bang-theme"
      hero={<Hero
        kicker="A hidden-role western showdown"
        title={<>Trust no one.<br /><em>Draw fast.</em></>}
        copy="The Sheriff stands in the open. Deputies protect the law, Outlaws hunt it, and the Renegade waits for the final duel."
        badges={[{ icon: Users, label: `${MIN_PLAYERS}–${MAX_PLAYERS} players` }, { icon: Bot, label: "Computer gunslingers" }, { icon: Shield, label: "Hidden roles" }]}
        artLayout="free"
        art={<div className="bang-hero-art"><span className="bang-sun" /><i>WANTED</i><strong>BANG!</strong><small>THE CARD GAME</small></div>}
      />}
      entry={{ name, setName, joinCode, setJoinCode, createRoom, joinRoom, busy, error }}
      onRules={() => setShowRules(true)}
      dialogs={showRules && <RulesModal onClose={() => setShowRules(false)} />}
    />;
  }
  if (room.phase === "lobby") {
    return <SharedLobby computerSpeed={computerSpeed}
      gameName="BANG!"
      theme="tbl-light bang-theme"
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
  const myTurn = room.phase === "playing" && active?.id === playerId && !room.pending;
  const selectedCard = me.hand.find((card) => card.id === selectedCardId) ?? null;
  const targets = selectedCard ? legalTargets(room, playerId, selectedCard) : [];
  const targetIds = new Set(targets.map((player) => player.id));
  const responding = room.pending?.responderId === playerId;

  async function chooseCard(card) {
    if (room.turnPhase === "discard" && myTurn) {
      await act("discard", { cardId: card.id });
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
      await act("play", { cardId: card.id });
    } else setSelectedCardId((id) => id === card.id ? null : card.id);
  }

  async function chooseTarget(target, targetCardId) {
    if (!selectedCard || !targetIds.has(target.id)) return;
    setSelectedCardId(null);
    await act("play", { cardId: selectedCard.id, targetId: target.id, targetCardId });
  }

  async function sidHeal() {
    if (!sidCards.length) { setSidCards(["selecting"]); return; }
    const chosen = sidCards.filter((id) => id !== "selecting");
    if (chosen.length !== 2) { setSidCards([]); return; }
    setSidCards([]);
    await act("sid", { cardIds: chosen });
  }

  return <main className="bang-game tbl-light bang-theme">
    <GameHeader computerSpeed={computerSpeed}
      title="BANG!"
      room={room}
      subtitle={`Room ${room.roomCode}`}
      status={room.phase === "finished" ? "Showdown over" : room.pending ? `${room.players.find((player) => player.id === room.pending.responderId)?.name} must respond` : myTurn ? "Your turn" : `${active?.name}'s turn`}
      onRules={() => setShowRules(true)}
      onLeave={leaveRoom}
    />
    {error && <p className="bang-error" role="alert">{error}</p>}

    <section className="bang-status-strip">
      <div className={`bang-role-chip role-${me.role}`}><span>Your role</span><strong>{ROLE_LABELS[me.role]}</strong></div>
      <div><span>Your character</span><strong>{me.character.name}</strong><small>{me.character.ability}</small></div>
      <div><span>Weapon range</span><strong>{weaponRange(me)}</strong><small>Distance modifies legal targets</small></div>
      <div><span>Deck</span><strong>{room.deckCount}</strong><small>{room.discard.length} discarded</small></div>
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
      <div className="bang-hand-header"><div><p className="bang-kicker">Your hand · {me.hand.length} cards</p><h2>{room.turnPhase === "discard" && myTurn ? `Discard down to ${me.lives}` : responding ? "Choose your response" : myTurn ? selectedCard ? "Choose a highlighted target" : "Play a card or end your turn" : "Watch the showdown"}</h2></div><div className="bang-hand-actions">{me.character?.id === "sid" && myTurn && me.lives < me.maxLives && me.hand.length >= 2 && <button className={sidCards.length ? "active" : ""} onClick={sidHeal}><Heart /> {!sidCards.length ? "Sid: choose 2" : sidCards.filter((id) => id !== "selecting").length === 2 ? "Heal now" : "Cancel healing"}</button>}<button className="bang-end-turn" disabled={!myTurn || busy || room.turnPhase === "discard"} onClick={() => act("endTurn")}>End turn</button></div></div>
      <div className="bang-hand-cards">{me.hand.map((card) => <button key={card.id} className={`bang-card-button ${selectedCardId === card.id || sidCards.includes(card.id) ? "selected" : ""}`} disabled={!myTurn || busy} onClick={() => chooseCard(card)}><Card card={card} /><small>{CARD_RULES[card.name]}</small></button>)}</div>
    </section>

    {responding && <ResponseModal room={room} me={me} busy={busy} onRespond={(cardId) => act("respond", { cardId })} onDecline={() => act("decline")} onStore={(cardId) => act("generalStore", { cardId })} />}
    {showRules && <RulesModal onClose={() => setShowRules(false)} />}
    {room.phase === "finished" && <FinishedModal room={room} me={me} onLeave={leaveRoom} />}
  </main>;
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
  if (pending.type === "general-store") {
    return <ChoiceModal wide title="Choose one card" text="General Store. Selections continue clockwise after you.">
      <div className="bang-store-cards">{pending.cards.map((card) => <button type="button" key={card.id} disabled={busy} onClick={() => onStore(card.id)}><Card card={card} /></button>)}</div>
    </ChoiceModal>;
  }
  const cards = responseCards(me, pending.type);
  const action = ["bang", "gatling"].includes(pending.type) ? "Missed!" : "BANG!";
  const source = room.players.find((player) => player.id === (pending.attackerId ?? pending.lastPlayerId));
  return <ChoiceModal
    wide
    title={pending.type === "duel" ? "Answer the Duel" : pending.type === "indians" ? "The Indians attack" : `${source?.name ?? "A player"} attacks`}
    text={`Play ${action}${pending.type === "bang" && pending.remaining > 1 ? ` (${pending.remaining} still needed)` : ""}, or take one bullet of damage.`}
    actions={<button type="button" className="bang-danger" disabled={busy} onClick={onDecline}>Take the hit</button>}
  >
    <div className="bang-response-cards">{cards.map((card) => <button type="button" key={card.id} disabled={busy} onClick={() => onRespond(card.id)}><Card card={card} /></button>)}</div>
  </ChoiceModal>;
}

function RulesModal({ onClose }) {
  return <ChoiceModal wide title="How to play BANG!" text="Base-game rules." onClose={onClose}>
    <div className="tbl-rule-grid">
      <article><b>Know your goal</b><p>The Sheriff and Deputies eliminate Outlaws and the Renegade. Outlaws eliminate the Sheriff. The Renegade must be the last survivor.</p></article>
      <article><b>Take a turn</b><p>Resolve Dynamite and Jail, draw two cards, play any legal cards, then discard until your hand is no larger than your remaining bullets.</p></article>
      <article><b>Mind the distance</b><p>Your weapon sets BANG! range. Alive seats determine distance; Scope, Mustang, Rose Doolan, and Paul Regret modify it.</p></article>
      <article><b>Defend yourself</b><p>Answer BANG! and Gatling with Missed!, and Indians and Duels with BANG!. Barrels make a Heart draw! check first.</p></article>
    </div>
    <p className="tbl-rule-heading">Also</p>
    <div className="tbl-rule-grid">
      <article><b>Face-up cards</b><p>Blue equipment stays visible on the table. Only one weapon is active. Jail cannot target the Sheriff.</p></article>
      <article><b>Elimination</b><p>Reveal the role. Killing an Outlaw earns three cards. A Sheriff who kills a Deputy discards everything. Vulture Sam collects the eliminated player’s cards.</p></article>
      <article><b>Characters</b><p>Every original character power is applied by the game, including draw!, range, extra-draw, defense, damage, and hand-empty effects.</p></article>
    </div>
  </ChoiceModal>;
}

function FinishedModal({ room, me, onLeave }) {
  const isDraw = room.winner === "draw";
  const winners = room.winner === "sheriff" ? ["sheriff", "deputy"] : [room.winner];
  const won = !isDraw && winners.includes(me.role);
  // A stalemated round ends with winner "draw"; without this branch the heading
  // read "The undefineds wins".
  const heading = isDraw
    ? "The standoff ends in a draw"
    : won
      ? "You win the showdown"
      : `${room.winner === "sheriff" ? "The law" : `The ${ROLE_LABELS[room.winner]}s`} wins`;
  return <Results
    title={heading}
    text={isDraw ? "Nobody could land a shot. Every identity is now revealed." : "The dust settles. Every identity is now revealed."}
    rows={room.players.map((player) => ({ id: player.id, name: player.name, value: ROLE_LABELS[player.role], note: player.character.name }))}
  >
    <button type="button" className="tbl-primary" onClick={onLeave}>Back to the saloon</button>
  </Results>;
}
