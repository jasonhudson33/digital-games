"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Bot,
  Check,
  CircleHelp,
  Coins,
  Copy,
  Crown,
  HandCoins,
  Landmark,
  LogOut,
  Plus,
  ShieldCheck,
  Sparkles,
  Swords,
  Users,
  X,
} from "lucide-react";
import { CoverYourAssetsRoomService } from "./cover-your-assets-room-service";
import {
  MAX_PLAYERS,
  MIN_PLAYERS,
  addComputerPlayer,
  addPlayer,
  canChallenge,
  cardDefinition,
  cardName,
  createLobby,
  currentPlayer,
  discardCard,
  eligibleTurnActions,
  formatMoney,
  makePairFromDiscard,
  makePairFromHand,
  matchingChallengeCards,
  playChallengeCard,
  removeComputerPlayer,
  runComputerStep,
  setValue,
  stackValue,
  startChallenge,
  startGame,
  startNextRound,
  topDiscard,
  topSet,
  yieldChallenge,
} from "../lib/cover-your-assets";
import { useGameRoom } from "../lib/use-game-room.js";

const playerIdKey = "cover-your-assets-player-id";
const playerNameKey = "cover-your-assets-player-name";
const activeRoomKey = "cover-your-assets-active-room";

export default function CoverYourAssetsClient() {
  const {
    room, setRoom, playerId, name, setName, joinCode, setJoinCode,
    busy, setBusy, error, setError, createRoom, joinRoom, update,
  } = useGameRoom({
    service: CoverYourAssetsRoomService,
    storageKey: "cover-your-assets",
    createLobby: createLobby,
    addPlayer: addPlayer,
    maxPlayers: MAX_PLAYERS,
  });
  const [selected, setSelected] = useState([]);
  const [showRules, setShowRules] = useState(false);
  const [computerThinking, setComputerThinking] = useState(false);

  // A completed move can remove selected cards from the hand. Keeping those
  // stale IDs makes every action look illegal when this player's next turn
  // arrives, even though the room state itself is current.
  useEffect(() => {
    setSelected([]);
  }, [room?.updatedAt]);

  const computerToAct = useMemo(() => {
    if (room?.phase !== "playing") return null;
    if (room.pendingChallenge) return room.players.find((player) => player.id === room.pendingChallenge.turnPlayerId && player.isComputer) ?? null;
    const active = currentPlayer(room);
    return active?.isComputer ? active : null;
  }, [room]);

  useEffect(() => {
    if (!room || room.hostId !== playerId || !computerToAct) {
      setComputerThinking(false);
      return undefined;
    }
    let cancelled = false;
    setComputerThinking(true);
    const timer = window.setTimeout(async () => {
      try {
        await update((current) => runComputerStep(current));
      } finally {
        if (!cancelled) setComputerThinking(false);
      }
    }, 720);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [computerToAct?.id, room?.updatedAt, room?.pendingChallenge?.played?.length, playerId]);

  function leaveRoom() {
    if (room?.phase === "playing" && !window.confirm("Leave the table? You can rejoin with the room code.")) return;
    localStorage.removeItem(activeRoomKey);
    setSelected([]);
    setRoom(null);
  }

  const me = room?.players.find((player) => player.id === playerId) ?? null;

  if (!room || !me) {
    return <Landing {...{ name, setName, joinCode, setJoinCode, createRoom, joinRoom, busy, error, showRules, setShowRules }} />;
  }

  if (room.phase === "lobby") {
    return <Lobby
      room={room}
      me={me}
      busy={busy}
      error={error}
      onAddComputer={() => update((current) => current.hostId === playerId ? addComputerPlayer(current) : current)}
      onRemoveComputer={(id) => update((current) => current.hostId === playerId ? removeComputerPlayer(current, id) : current)}
      onStart={() => update((current) => current.hostId === playerId ? startGame(current) : current)}
      onLeave={leaveRoom}
      setShowRules={setShowRules}
    />;
  }

  const active = currentPlayer(room);
  const myTurn = room.phase === "playing" && !room.pendingChallenge && active?.id === playerId;
  const myChallengeTurn = room.pendingChallenge?.turnPlayerId === playerId;
  const actions = eligibleTurnActions(room, playerId);
  const selectedCards = selected.map((id) => me.hand.find((card) => card.id === id)).filter(Boolean);
  const canPair = selected.length === 2 && actions.pairs.some((pair) => selected.every((id) => pair.includes(id)));
  const canLiftDiscard = selected.length === 1 && actions.discardMatches.includes(selected[0]);

  function toggleCard(cardId) {
    setSelected((current) => current.includes(cardId)
      ? current.filter((id) => id !== cardId)
      : current.length < 2 ? [...current, cardId] : [cardId]);
  }

  return <main className="cya-game-shell">
    <header className="cya-table-header">
      <div><p className="cya-kicker">Private room · round {room.round}</p><h1>Cover Your Assets</h1></div>
      <div className={`cya-turn-pill ${myTurn || myChallengeTurn ? "mine" : ""}`}>
        {computerThinking ? <><Bot /> {computerToAct?.name} is thinking…</> : myChallengeTurn ? <><Swords /> Your counter</> : myTurn ? <><HandCoins /> Your turn</> : <><Coins /> {active?.name}&apos;s turn</>}
      </div>
      <button className="cya-icon-button" onClick={() => setShowRules(true)}><CircleHelp /> Rules</button>
      <button className="cya-icon-button" onClick={() => navigator.clipboard?.writeText(room.roomCode)}><Copy /> {room.roomCode}</button>
      <button className="cya-icon-button" onClick={leaveRoom}><LogOut /> Leave</button>
    </header>

    {error && <p className="cya-error" role="alert">{error}</p>}
    {room.pendingChallenge && <ChallengeBanner room={room} me={me} busy={busy} selected={selected} toggleCard={toggleCard} onPlay={(cardId) => update((current) => playChallengeCard(current, playerId, cardId))} onYield={() => update((current) => yieldChallenge(current, playerId))} />}

    <div className="cya-table-grid">
      <aside className="cya-bank-panel">
        <div className="cya-bank-heading"><Landmark /><div><p className="cya-kicker">The bank</p><strong>{formatMoney(me.score)}</strong><small>Your match total</small></div></div>
        <div className="cya-score-track"><span style={{ width: `${Math.min(100, me.score / room.targetScore * 100)}%` }} /></div>
        <p className="cya-million-note">{formatMoney(Math.max(0, room.targetScore - me.score))} to millionaire</p>
        <div className="cya-deck-row">
          <CardFace back />
          <div><strong>{room.deck.length}</strong><small>cards in draw pile</small></div>
        </div>
        <div className="cya-discard-area">
          <span>Discard pile</span>
          {topDiscard(room) ? <CardFace card={topDiscard(room)} compact /> : <div className="cya-empty-card">Empty</div>}
          {myTurn && canLiftDiscard && <button className="cya-small-action" disabled={busy} onClick={() => update((current) => makePairFromDiscard(current, playerId, selected[0]))}>Pair with discard</button>}
        </div>
        <section className="cya-log"><h2>Vault chatter</h2>{room.log.slice(0, 7).map((line, index) => <p key={`${line}-${index}`}>{line}</p>)}</section>
      </aside>

      <section className="cya-player-field">
        {room.players.map((player) => <PlayerVault
          key={player.id}
          room={room}
          player={player}
          isMe={player.id === playerId}
          active={active?.id === player.id}
          canAttack={myTurn && canChallenge(room, playerId, player.id)}
          attackCard={selectedCards.length === 1 && matchingChallengeCards(me, topSet(player)?.asset).some((card) => card.id === selected[0]) ? selected[0] : null}
          onAttack={(cardId) => update((current) => startChallenge(current, playerId, player.id, cardId))}
        />)}
      </section>
    </div>

    <section className="cya-hand-panel">
      <div className="cya-hand-heading"><div><p className="cya-kicker">Your hand</p><h2>{myChallengeTurn ? "Defend it or let it go" : myTurn ? "Make one move" : "Keep your cards close"}</h2></div><span>{me.hand.length} cards</span></div>
      <div className="cya-hand-cards">
        {me.hand.map((card) => {
          const eligibleInChallenge = myChallengeTurn && matchingChallengeCards(me, room.pendingChallenge.asset).some((option) => option.id === card.id);
          return <button key={card.id} className={`cya-hand-card ${selected.includes(card.id) ? "selected" : ""}`} disabled={busy || (!myTurn && !eligibleInChallenge)} onClick={() => toggleCard(card.id)}><CardFace card={card} /></button>;
        })}
      </div>
      {myTurn && <div className="cya-hand-actions">
        <button className="cya-primary" disabled={busy || !canPair} onClick={() => update((current) => makePairFromHand(current, playerId, selected))}><HandCoins /> Bank selected pair</button>
        <button className="cya-secondary" disabled={busy || selected.length !== 1} onClick={() => update((current) => discardCard(current, playerId, selected[0]))}>Discard selected</button>
        <p>{selected.length === 0 ? "Choose two matching assets, or one asset and a Wild." : selected.length === 1 ? "Choose a match, pair with the discard, challenge a top set, or discard." : canPair ? "This pair is ready to bank." : "Those cards do not make a pair."}</p>
      </div>}
    </section>

    {showRules && <RulesModal onClose={() => setShowRules(false)} />}
    {(room.phase === "roundEnd" || room.phase === "finished") && <RoundModal room={room} me={me} busy={busy} onNext={() => update((current) => startNextRound(current, playerId))} onLeave={leaveRoom} />}
  </main>;
}

function Landing({ name, setName, joinCode, setJoinCode, createRoom, joinRoom, busy, error, showRules, setShowRules }) {
  return <main className="cya-landing">
    <section className="cya-hero">
      <div className="cya-hero-copy"><p className="cya-kicker">A game of fortunes & friendly theft</p><h1>Build your fortune.<br /><em>Then cover it.</em></h1><p>Pair valuable assets, stack them high, and swipe the exposed fortunes your rivals forgot to protect.</p><div className="cya-facts"><span><Users /> 2–6 players</span><span><Bot /> Computer seats</span><span><Crown /> First to $1M</span></div></div>
      <div className="cya-hero-stack" aria-hidden="true"><div /><div /><div /><span><ShieldCheck /> COVERED</span></div>
    </section>
    <section className="cya-entry-card">
      <div><p className="cya-kicker">Open the vault</p><h2>Join a private table</h2><p>Create a room for friends, then fill any open chairs with computer players.</p></div>
      <label>Your name<input value={name} maxLength={20} autoComplete="nickname" onChange={(event) => setName(event.target.value)} placeholder="Player name" /></label>
      <button className="cya-primary" disabled={busy} onClick={createRoom}><Plus /> Create a room</button>
      <div className="cya-or"><span>or join a game</span></div>
      <div className="cya-join">
        <label htmlFor="cya-room-code">Room code</label>
        <input id="cya-room-code" aria-label="Room code" value={joinCode} maxLength={5} onChange={(event) => setJoinCode(event.target.value.toUpperCase())} onKeyDown={(event) => event.key === "Enter" && joinRoom()} placeholder="ROOM CODE" />
        <button type="button" disabled={busy} onClick={joinRoom}>Join game</button>
      </div>
      <button className="cya-rules-link" onClick={() => setShowRules(true)}><CircleHelp /> Read the rules</button>
      {error && <p className="cya-form-error">{error}</p>}
    </section>
    {showRules && <RulesModal onClose={() => setShowRules(false)} />}
  </main>;
}

function Lobby({ room, me, busy, error, onAddComputer, onRemoveComputer, onStart, onLeave, setShowRules }) {
  const isHost = room.hostId === me.id;
  const canStart = room.players.length >= MIN_PLAYERS && room.players.length <= MAX_PLAYERS;
  return <main className="cya-lobby"><section className="cya-lobby-card">
    <div className="cya-lobby-heading"><div><p className="cya-kicker">Your vault is ready</p><h1>Room <button onClick={() => navigator.clipboard?.writeText(room.roomCode)}>{room.roomCode} <Copy /></button></h1><p>Share the code, add computer rivals, then start when everyone is seated.</p></div><button className="cya-rules-link" onClick={() => setShowRules(true)}><CircleHelp /> Rules</button></div>
    <div className="cya-seat-grid">{room.players.map((player, index) => <div className="cya-seat" key={player.id}><span>{player.isComputer ? <Bot /> : <Users />}</span><div><strong>{player.name}{player.id === me.id ? " (you)" : ""}</strong><small>{index === 0 ? "Host · " : ""}{player.isComputer ? "Computer rival" : "Human player"}</small></div>{player.isComputer && isHost ? <button aria-label={`Remove ${player.name}`} onClick={() => onRemoveComputer(player.id)}><X /></button> : <Check />}</div>)}</div>
    {isHost && room.players.length < MAX_PLAYERS && <button className="cya-add-computer" disabled={busy} onClick={onAddComputer}><Bot /> Add computer rival</button>}
    <div className={`cya-ready-note ${canStart ? "ready" : ""}`}><strong>{room.players.length} / {MAX_PLAYERS} seats</strong><span>{canStart ? "The table is ready to play" : "Add at least one rival"}</span></div>
    {isHost ? <button className="cya-primary cya-start" disabled={busy || !canStart} onClick={onStart}><Sparkles /> Start game</button> : <p className="cya-waiting">Waiting for {room.players[0].name} to deal…</p>}
    <button className="cya-quiet" onClick={onLeave}>Leave room</button>{error && <p className="cya-form-error">{error}</p>}
  </section></main>;
}

function PlayerVault({ room, player, isMe, active, canAttack, attackCard, onAttack }) {
  const exposed = topSet(player);
  const visibleSets = player.stack.slice(-2);
  const firstVisibleIndex = player.stack.length - visibleSets.length;
  return <article className={`cya-vault ${isMe ? "mine" : ""} ${active ? "active" : ""}`}>
    <header><span className="cya-player-avatar">{player.isComputer ? <Bot /> : player.name.slice(0, 1).toUpperCase()}</span><div><strong>{player.name}{isMe ? " (you)" : ""}</strong><small>{formatMoney(player.score)} total · {player.hand.length} cards</small></div><b>{formatMoney(stackValue(player))}</b></header>
    <div className="cya-stack-view">
      {!player.stack.length && <div className="cya-empty-vault"><Coins /><span>No assets yet</span></div>}
      {visibleSets.map((set, visibleIndex) => {
        const stackIndex = firstVisibleIndex + visibleIndex;
        const isTop = stackIndex === player.stack.length - 1;
        const isNestEgg = stackIndex === 0;
        return <div key={set.id} className={`cya-asset-set ${isTop ? "top" : "covered"}`} style={{ "--set-color": cardDefinition(set.cards.find((card) => card.type === "asset"))?.color }}><div><span>{isTop && !isNestEgg ? <Swords /> : <ShieldCheck />}</span><div><strong>{cardName(set.cards.find((card) => card.type === "asset"))}</strong><small>{set.cards.length} cards · {formatMoney(setValue(set))}</small></div></div><em>{isNestEgg ? "Nest egg · safe" : isTop ? "Exposed" : "Covered"}</em></div>;
      })}
    </div>
    {canAttack && <button className="cya-challenge-button" disabled={!attackCard} onClick={() => onAttack(attackCard)}><Swords /> {attackCard ? `Challenge for ${cardName(exposed.cards[0])}` : `Select a ${cardName(exposed.cards[0])} or Wild`}</button>}
  </article>;
}

function ChallengeBanner({ room, me, busy, selected, toggleCard, onPlay, onYield }) {
  const challenge = room.pendingChallenge;
  const challenger = room.players.find((player) => player.id === challenge.challengerId);
  const defender = room.players.find((player) => player.id === challenge.defenderId);
  const responder = room.players.find((player) => player.id === challenge.turnPlayerId);
  const myResponse = responder.id === me.id;
  const options = myResponse ? matchingChallengeCards(me, challenge.asset) : [];
  const chosen = options.find((card) => selected.includes(card.id));
  return <section className="cya-challenge-banner"><span className="cya-clash-icon"><Swords /></span><div><p className="cya-kicker">Asset challenge</p><h2>{challenger.name} vs. {defender.name}</h2><p>{myResponse ? options.length ? `Play another ${cardName(challenge.played[0].card)} or Wild to stay in the fight.` : "You have no matching card. Yield the set to continue." : `${responder.name} must counter or yield.`}</p></div><div className="cya-challenge-pot"><strong>{challenge.played.length}</strong><small>challenge cards</small></div>{myResponse && <div className="cya-challenge-actions">{options.length > 0 && <button className="cya-primary" disabled={busy || !chosen} onClick={() => onPlay(chosen.id)}>Counter</button>}<button className="cya-secondary" disabled={busy} onClick={onYield}>Yield</button></div>}</section>;
}

function CardFace({ card, back = false, compact = false }) {
  if (back) return <div className={`cya-card cya-card-back ${compact ? "compact" : ""}`}><span>CY<span>A</span></span><small>Private assets</small></div>;
  const definition = cardDefinition(card);
  return <div className={`cya-card ${card.type === "wild" ? `wild ${card.wild}` : ""} ${compact ? "compact" : ""}`} style={{ "--card-color": definition?.color }}><span className="cya-card-value">{formatMoney(card.value).replace(",000", "K")}</span><span className="cya-card-icon">{definition?.icon}</span><strong>{definition?.name}</strong><small>{card.type === "wild" ? "Pairs with any asset" : "ASSET"}</small></div>;
}

function RulesModal({ onClose }) {
  return <div className="cya-overlay" role="dialog" aria-modal="true"><section className="cya-rules-modal"><button className="cya-modal-close" onClick={onClose}><X /></button><p className="cya-kicker">Classic rules</p><h1>How to cover your assets</h1><div className="cya-rules-grid"><article><b>1</b><h2>Make a pair</h2><p>Bank two matching assets, or one asset plus a Silver or Gold Wild. You may also pair the top discard with its match from your hand.</p></article><article><b>2</b><h2>Cover the stack</h2><p>Every new set goes on top. Your first “nest egg” is always safe; only an exposed top set above it can be stolen.</p></article><article><b>3</b><h2>Challenge</h2><p>Play a matching asset or Wild against a rival&apos;s exposed set. Take turns countering. The last player to play a card wins the growing set.</p></article><article><b>4</b><h2>Make a million</h2><p>All players refill their hands after each turn. Score every banked card when the deck and hands run out. First past $1,000,000 wins.</p></article></div><div className="cya-rules-notes"><p><strong>On your turn:</strong> bank a pair, take the top discard with a matching hand card, challenge, or discard one card.</p><p><strong>Challenges:</strong> you need a nest egg; your rival needs at least two sets. Discard-pile cards cannot start a challenge.</p><p><strong>Table size:</strong> 2–3 players receive five cards; 4–6 players receive four.</p></div><a className="cya-official-link" href="https://www.grandpabecksgames.com/pages/cover-your-assets-24" target="_blank" rel="noreferrer">Read the publisher&apos;s rulebook</a><button className="cya-primary" onClick={onClose}>Ready to play</button></section></div>;
}

function RoundModal({ room, me, busy, onNext, onLeave }) {
  const ranked = [...room.players].sort((a, b) => (room.roundScores[b.id] || 0) - (room.roundScores[a.id] || 0));
  const winner = room.players.find((player) => player.id === room.winnerId);
  const isHost = room.hostId === me.id;
  return <div className="cya-overlay"><section className="cya-round-modal"><span className="cya-winner-mark">{winner ? <Crown /> : <Coins />}</span><p className="cya-kicker">{winner ? "Match complete" : `Round ${room.round} complete`}</p><h1>{winner ? winner.id === me.id ? "You made your million!" : `${winner.name} made a million` : `${ranked[0].name} won the round`}</h1><div className="cya-round-scores">{ranked.map((player, index) => <div key={player.id}><span>{index + 1}</span><strong>{player.name}{player.id === me.id ? " (you)" : ""}</strong><b>+{formatMoney(room.roundScores[player.id])}</b><small>{formatMoney(player.score)} total</small></div>)}</div>{!winner && isHost && <button className="cya-primary" disabled={busy} onClick={onNext}><Sparkles /> Deal round {room.round + 1}</button>}{!winner && !isHost && <p className="cya-waiting">Waiting for {room.players[0].name} to deal the next round…</p>}<button className="cya-quiet" onClick={onLeave}>{winner ? "Back to Cover Your Assets" : "Leave table"}</button></section></div>;
}
