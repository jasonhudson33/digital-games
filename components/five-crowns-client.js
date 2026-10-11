"use client";

import { useEffect, useState } from "react";
import {
  Bot,
  Crown,
  Hand,
  Users,
} from "lucide-react";
import { FiveCrownsRoomService } from "./five-crowns-room-service";
import { MAX_PLAYERS, MIN_PLAYERS, canGoOutWithDiscard, currentPlayer, isValidMeld, isWild, wildLabel } from "../lib/five-crowns";
import { useEngineRoom } from "../lib/use-engine-room.js";
import { ChoiceModal, GameHeader, Hero, Landing, Lobby, Results as ResultsDialog } from "./ui/table-shell";

/** Opponents' hands are not sent, only a count. */
const handSize = (player) => player.handCount ?? player.hand.length;

const computerIsDue = (room) => room.phase === "playing" && Boolean(currentPlayer(room)?.isComputer) && (room.outPlayerId ? room.finalTurnIds.includes(currentPlayer(room).id) : true);
import { FiveCrownsCard, FiveCrownsCardBack } from "./five-crowns-card";
import { orderHand } from "../lib/hand-order";
import CardFan from "./card-fan";

export default function FiveCrownsClient() {
  const { room, playerId, name, setName, joinCode, setJoinCode, busy, error, createRoom, joinRoom, act, leaveRoom, computerSpeed, } = useEngineRoom({ service: FiveCrownsRoomService, storageKey: "five-crowns", computerDue: computerIsDue });
  const [selectedIds, setSelectedIds] = useState([]);
  const [showRules, setShowRules] = useState(false);
  const me = room?.players.find((player) => player.id === playerId);
  const computerTurn = room ? computerIsDue(room) : false;

  useEffect(() => {
    setSelectedIds([]);
  }, [room?.updatedAt]);

  function leave() { setSelectedIds([]); leaveRoom(); }
  const rulesDialog = showRules && <RulesModal onClose={() => setShowRules(false)} />;
  if (!room || !me) {
    return <Landing
      gameName="Five Crowns"
      theme="tbl-light five-crowns-theme"
      hero={<Hero
        kicker="Five-suited rummy"
        title={<>Make your<br /><em>run.</em></>}
        copy="Build books and runs, use the rotating wild rank, and finish with the lowest score across eleven hands."
        badges={[{ icon: Users, label: "2–7 players" }, { icon: Crown, label: "11 rounds" }, { icon: Bot, label: "Computer seats" }]}
      />}
      entry={{ name, setName, joinCode, setJoinCode, createRoom, joinRoom, busy, error }}
      onRules={() => setShowRules(true)}
      dialogs={rulesDialog}
    />;
  }
  if (room.phase === "lobby") {
    return <Lobby computerSpeed={computerSpeed}
      gameName="Five Crowns"
      theme="tbl-light five-crowns-theme"
      room={room}
      me={me}
      busy={busy}
      error={error}
      min={MIN_PLAYERS}
      max={MAX_PLAYERS}
      onAdd={() => act("addComputer")}
      onRemove={(id) => act("removeComputer", { playerId: id })}
      onStart={() => act("start")}
      onLeave={leave}
      onRules={() => setShowRules(true)}
      rules={rulesDialog}
    />;
  }

  const active = currentPlayer(room);
  const myTurn = active?.id === playerId && (!room.outPlayerId || room.finalTurnIds.includes(playerId));
  const selectedCards = me.hand.filter((card) => selectedIds.includes(card.id));
  const finalTurn = room.outPlayerId && room.finalTurnIds.includes(playerId);
  const draw = () => act("draw");
  const take = () => act("takeDiscard");
  const discard = () => selectedCards.length === 1 && act("discard", { cardId: selectedCards[0].id });
  const layDown = () => selectedCards.length >= 3 && act("layDown", { cardIds: selectedIds });
  const canGoOutNow = selectedCards.length === 1 && canGoOutWithDiscard(room, playerId, selectedCards[0].id);
  return <main className="fc-shell tbl-light five-crowns-theme">
    <GameHeader computerSpeed={computerSpeed}
      title="Five Crowns"
      room={room}
      subtitle={`Round ${room.round} of 11`}
      status={room.phase !== "playing" ? (room.phase === "finished" ? "Game complete" : "Hand scored") : computerTurn ? `${active.name} is thinking…` : myTurn ? finalTurn ? "Your final turn" : "Your turn" : `${active?.name}'s turn`}
      onRules={() => setShowRules(true)}
      onLeave={leave}
    />
    <section className="fc-round"><div><small>Round {room.round} of 11</small><strong>{wildLabel(room.wildRank)} wild</strong></div><div className="fc-progress"><i style={{ width: `${room.round / 11 * 100}%` }} /></div><span>Lowest score wins</span></section>
    {room.outPlayerId && <div className="fc-alert"><Crown /> {room.players.find((player) => player.id === room.outPlayerId)?.name} went out. Each remaining player gets one final turn.</div>}
    <section className="fc-table"><aside className="fc-scoreboard"><h2>Scores</h2>{room.players.map((player) => <div className={player.id === playerId ? "mine" : ""} key={player.id}><span>{player.isComputer ? <Bot /> : player.name[0]}</span><strong>{player.name}</strong><b>{room.totalScores[player.id] || 0}</b><small>{handSize(player)} cards · {(player.melds || []).length} melds down</small></div>)}</aside><section className="fc-center"><div className="fc-piles"><button className="fc-pile" disabled={!myTurn || room.turnDrawn || me.hand.length >= room.wildRank + 1 || (!room.deckCount && room.discardCount <= 1) || busy} onClick={draw}><FiveCrownsCardBack /><strong>{room.deckCount}</strong><small>{room.turnDrawn ? "Already drawn" : room.deckCount ? "Draw pile" : "Shuffle discards"}</small></button><button className="fc-pile discard" disabled={!myTurn || room.turnDrawn || me.hand.length >= room.wildRank + 1 || !room.discard.length || busy} onClick={take}><FiveCrownsCard card={room.discard.at(-1)} wild={isWild(room, room.discard.at(-1))} /><small>{room.turnDrawn ? "Already drawn" : "Take discard"}</small></button></div><p className="fc-message">{room.log[0]}</p></section></section>
    <section className="fc-hand-panel"><div className="fc-hand-title"><div><small>{finalTurn ? "Final turn" : myTurn ? "Your hand" : "Your cards"}</small><h2>{canGoOutNow ? "You can go out" : myTurn && !room.turnDrawn ? "Draw one card" : myTurn ? finalTurn ? "Lay down or discard" : "Choose a discard" : "Watch the table"}</h2></div><span>{me.hand.length} cards · max {room.wildRank + 1}</span></div><CardFan className="fc-hand" count={me.hand.length}>{orderHand("five-crowns", me.hand).map((card) => <button key={card.id} className={selectedIds.includes(card.id) ? "selected" : ""} disabled={!myTurn || busy} onClick={() => setSelectedIds((current) => current.includes(card.id) ? current.filter((id) => id !== card.id) : [...current, card.id])}><FiveCrownsCard card={card} wild={isWild(room, card)} /></button>)}</CardFan>{myTurn && <div className="fc-actions">{finalTurn && <button className="fc-secondary" disabled={busy || !room.turnDrawn || !isValidMeld(room, selectedCards)} onClick={layDown}>Lay down meld</button>}<button className="fc-primary" disabled={busy || !room.turnDrawn || selectedCards.length !== 1} onClick={discard}><Hand /> {canGoOutNow ? "Go out" : "Discard selected"}</button>{canGoOutNow && <span className="fc-go-out">Your remaining cards form complete books or runs.</span>}</div>}</section>
    <section className="fc-rules"><span><strong>Books</strong> 3+ cards of the same rank</span><span><strong>Runs</strong> 3+ consecutive cards in one suit</span><span><strong>Wild</strong> {wildLabel(room.wildRank)} and Jokers</span></section>
    {rulesDialog}
    {(room.phase === "roundEnd" || room.phase === "finished") && <Results room={room} me={me} busy={busy} onNext={() => act("nextRound")} onLeave={leave} />}
  </main>;
}

function RulesModal({ onClose }) {
  return <ChoiceModal wide title="How to play Five Crowns" text="Eleven hands of rummy in five suits. The lowest total score wins." onClose={onClose}>
    <div className="tbl-rule-grid">
      <article><b>Draw, then discard</b><p>Each turn, draw the top card of the pile or take the discard, then discard one card. Hand sizes grow from 3 cards in round one to 13 in round eleven.</p></article>
      <article><b>Books</b><p>Three or more cards of the same rank.</p></article>
      <article><b>Runs</b><p>Three or more consecutive cards in one suit.</p></article>
      <article><b>Wild cards</b><p>Jokers and every card of the round&apos;s rank are wild. The wild rank rises each round.</p></article>
      <article><b>Going out</b><p>Go out when every card in your hand forms books or runs. Each other player then gets one final turn and may lay down melds.</p></article>
      <article><b>Scoring</b><p>Cards left outside books and runs count against you. Lowest total after eleven rounds wins.</p></article>
    </div>
  </ChoiceModal>;
}

function Results({ room, me, busy, onNext, onLeave }) {
  const sorted = [...room.players].sort((a, b) => (room.totalScores[a.id] || 0) - (room.totalScores[b.id] || 0));
  const finished = room.phase === "finished";
  return <ResultsDialog
    title={finished ? `${sorted[0].name} wins!` : "Hand scored"}
    text={finished ? "Game complete. Lowest score wins." : `Round ${room.round} complete`}
    rows={sorted.map((player) => ({
      id: player.id,
      name: `${player.name}${player.id === me.id ? " (you)" : ""}`,
      value: `${room.totalScores[player.id] || 0} total`,
      note: finished ? undefined : `+${room.roundScores[player.id] || 0}`,
    }))}
  >
    {!finished && room.hostId === me.id && <button type="button" className="tbl-primary" disabled={busy} onClick={onNext}>Deal next hand</button>}
    {!finished && room.hostId !== me.id && <p className="tbl-wait">Waiting for the host to deal…</p>}
    <button type="button" className="tbl-link" onClick={onLeave}>Back to Five Crowns</button>
  </ResultsDialog>;
}
