"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Bot,
  Check,
  CircleHelp,
  Copy,
  Crown,
  DoorOpen,
  Flame,
  Hand,
  LogOut,
  Plus,
  ShieldCheck,
  Snowflake,
  Sparkles,
  Trophy,
  Users,
  X,
  Zap,
} from "lucide-react";
import { Flip7RoomService } from "./flip-7-room-service";
import {
  MAX_PLAYERS,
  MIN_PLAYERS,
  addComputerPlayer,
  addPlayer,
  calculateRoundScore,
  chooseActionTarget,
  createLobby,
  currentPlayer,
  flipCard,
  hasSecondChance,
  numberCards,
  removeComputerPlayer,
  riskPercent,
  runComputerStep,
  startGame,
  startNextRound,
  stay,
  targetOptions,
} from "../lib/flip-7";

const playerIdKey = "flip-7-player-id";
const playerNameKey = "flip-7-player-name";
const activeRoomKey = "flip-7-active-room";

export default function Flip7Client() {
  const [room, setRoom] = useState(null);
  const [playerId, setPlayerId] = useState("");
  const [name, setName] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [showRules, setShowRules] = useState(false);
  const [computerThinking, setComputerThinking] = useState(false);

  useEffect(() => {
    const storedId = localStorage.getItem(playerIdKey) || crypto.randomUUID();
    localStorage.setItem(playerIdKey, storedId);
    setPlayerId(storedId);
    setName(localStorage.getItem(playerNameKey) || "");
    const activeCode = localStorage.getItem(activeRoomKey);
    if (!activeCode) return;
    Flip7RoomService.load(activeCode).then((loaded) => {
      if (loaded?.players.some((player) => player.id === storedId)) setRoom(loaded);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!room?.roomCode) return undefined;
    return Flip7RoomService.subscribe(room.roomCode, (next) => {
      setRoom((current) => !current || Number(next.updatedAt || 0) >= Number(current.updatedAt || 0) ? next : current);
    });
  }, [room?.roomCode]);

  const computerToAct = useMemo(() => {
    if (room?.phase !== "playing") return null;
    if (room.pendingTarget) return room.players.find((player) => player.id === room.pendingTarget.chooserId && player.isComputer) ?? null;
    const active = currentPlayer(room);
    return room.stage === "turns" && active?.isComputer ? active : null;
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
    }, 760);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [computerToAct?.id, room?.updatedAt, room?.pendingTarget?.action, playerId]);

  async function createRoom() {
    if (!name.trim()) return setError("Enter your name first.");
    setBusy(true);
    setError("");
    try {
      const roomCode = await Flip7RoomService.createCode();
      rememberRoom(await Flip7RoomService.save(createLobby({ id: playerId, name: name.trim() }, roomCode)));
    } catch (caught) {
      setError(caught.message);
    } finally {
      setBusy(false);
    }
  }

  async function joinRoom() {
    if (!name.trim() || !joinCode.trim()) return setError("Enter your name and a room code.");
    setBusy(true);
    setError("");
    try {
      const code = joinCode.trim().toUpperCase();
      const loaded = await Flip7RoomService.load(code);
      if (!loaded) throw new Error("That room could not be found.");
      if (!loaded.players.some((player) => player.id === playerId)) {
        if (loaded.phase !== "lobby") throw new Error("That game has already started.");
        if (loaded.players.length >= MAX_PLAYERS) throw new Error("That room is full.");
        rememberRoom(await Flip7RoomService.update(code, (current) => addPlayer(current, { id: playerId, name: name.trim() })));
      } else {
        rememberRoom(loaded);
      }
    } catch (caught) {
      setError(caught.message);
    } finally {
      setBusy(false);
    }
  }

  function rememberRoom(next) {
    localStorage.setItem(playerNameKey, name.trim());
    localStorage.setItem(activeRoomKey, next.roomCode);
    setRoom(next);
  }

  async function update(action) {
    if (!room) return null;
    setBusy(true);
    setError("");
    try {
      const next = await Flip7RoomService.update(room.roomCode, action);
      if (next) setRoom(next);
      return next;
    } catch (caught) {
      setError(caught.message);
      return null;
    } finally {
      setBusy(false);
    }
  }

  function leaveRoom() {
    if (room?.phase === "playing" && !window.confirm("Leave the table? You can rejoin with the room code.")) return;
    localStorage.removeItem(activeRoomKey);
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
      onRules={() => setShowRules(true)}
      showRules={showRules}
      setShowRules={setShowRules}
    />;
  }

  const active = currentPlayer(room);
  const myTurn = room.phase === "playing" && room.stage === "turns" && !room.pendingTarget && active?.id === playerId;
  const myChoice = room.phase === "playing" && room.pendingTarget?.chooserId === playerId;
  const options = targetOptions(room);
  const statusMessage = computerThinking
    ? `${computerToAct?.name} is thinking…`
    : myChoice
      ? `Choose who gets ${actionName(room.pendingTarget.action)}`
      : myTurn
        ? "Your call: flip or stay?"
        : room.pendingTarget
          ? `${room.players.find((player) => player.id === room.pendingTarget.chooserId)?.name} is choosing a target…`
          : `${active?.name}'s turn`;

  return <main className="f7-game-shell">
    <header className="f7-game-header">
      <div className="f7-brand-lockup"><span className="f7-seven">7</span><div><p>Round {room.round} · private room</p><h1>Flip 7</h1></div></div>
      <div className={`f7-turn-callout ${myTurn || myChoice ? "mine" : ""}`}><Zap />{statusMessage}</div>
      <button className="f7-header-button" onClick={() => setShowRules(true)}><CircleHelp /> Rules</button>
      <button className="f7-header-button" onClick={() => navigator.clipboard?.writeText(room.roomCode)}><Copy /> {room.roomCode}</button>
      <button className="f7-header-button" onClick={leaveRoom}><LogOut /> Leave</button>
    </header>

    {error && <p className="f7-error" role="alert">{error}</p>}

    {myChoice && <section className="f7-target-banner">
      <div><p className="f7-kicker">Action card</p><h2>{targetPrompt(room.pendingTarget.action)}</h2></div>
      <div className="f7-target-options">
        {options.map((player) => <button key={player.id} disabled={busy} onClick={() => update((current) => chooseActionTarget(current, playerId, player.id))}>
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

      <div className="f7-deck-stage" aria-label={`${room.deck.length} cards left in the deck`}>
        <div className="f7-deck-shadow shadow-two" /><div className="f7-deck-shadow shadow-one" />
        <div className="f7-card f7-card-back"><span>FLIP</span><b>7</b><small>{room.deck.length} cards</small></div>
      </div>

      <aside className="f7-table-log"><p className="f7-kicker">Table talk</p>{room.log.slice(0, 6).map((line, index) => <p key={`${line}-${index}`}>{line}</p>)}</aside>
    </section>

    {room.phase === "playing" && <section className={`f7-decision-dock ${myTurn ? "ready" : ""}`}>
      <div><p className="f7-kicker">Your line</p><strong>{calculateRoundScore(me)} points</strong><span>{numberCards(me).length}/7 unique numbers · {riskPercent(room, me)}% visible-deck bust risk</span></div>
      <div className="f7-decision-buttons">
        <button className="f7-stay-button" disabled={busy || !myTurn} onClick={() => update((current) => stay(current, playerId))}><Hand /> Stay <small>Bank {calculateRoundScore(me)}</small></button>
        <button className="f7-flip-button" disabled={busy || !myTurn} onClick={() => update((current) => flipCard(current, playerId))}><Flame /> Flip <small>Press your luck</small></button>
      </div>
    </section>}

    {showRules && <RulesModal onClose={() => setShowRules(false)} />}
    {(room.phase === "roundEnd" || room.phase === "finished") && <RoundModal room={room} me={me} busy={busy} onNext={() => update((current) => startNextRound(current, playerId))} onLeave={leaveRoom} />}
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

function Landing({ name, setName, joinCode, setJoinCode, createRoom, joinRoom, busy, error, showRules, setShowRules }) {
  return <main className="f7-landing">
    <section className="f7-hero">
      <div className="f7-hero-copy"><p className="f7-kicker">The press-your-luck card game</p><h1>Flip.<br />Don&apos;t <em>flop.</em></h1><p>Collect seven different numbers before a duplicate wipes out your round. Stay safe—or risk it all for the bonus.</p><div className="f7-facts"><span><Users /> 2–10 seats</span><span><Bot /> Computer players</span><span><Trophy /> First past 200</span></div></div>
      <div className="f7-hero-cards" aria-hidden="true"><div className="f7-card f7-number-card tone-2"><small>4</small><strong>4</strong><small>4</small></div><div className="f7-card f7-number-card tone-5"><small>11</small><strong>11</strong><small>11</small></div><div className="f7-card f7-number-card tone-0"><small>7</small><strong>7</strong><small>7</small></div></div>
    </section>
    <section className="f7-entry-card">
      <div><p className="f7-kicker">Find your table</p><h2>Start a private room</h2><p>Invite friends with a five-character code and add computer players to fill the table.</p></div>
      <label>Your name<input value={name} maxLength={20} autoComplete="nickname" onChange={(event) => setName(event.target.value)} placeholder="Player name" /></label>
      <button className="f7-primary" disabled={busy} onClick={createRoom}><Plus /> Create a room</button>
      <div className="f7-or"><span>or join one</span></div>
      <div className="f7-join"><input aria-label="Room code" value={joinCode} maxLength={5} onChange={(event) => setJoinCode(event.target.value.toUpperCase())} placeholder="ROOM CODE" /><button disabled={busy} onClick={joinRoom}>Join</button></div>
      <button className="f7-rules-link" onClick={() => setShowRules(true)}><CircleHelp /> How to play</button>
      {error && <p className="f7-form-error" role="alert">{error}</p>}
    </section>
    {showRules && <RulesModal onClose={() => setShowRules(false)} />}
  </main>;
}

function Lobby({ room, me, busy, error, onAddComputer, onRemoveComputer, onStart, onLeave, onRules, showRules, setShowRules }) {
  const isHost = room.hostId === me.id;
  const canStart = room.players.length >= MIN_PLAYERS;
  return <main className="f7-lobby"><section className="f7-lobby-card">
    <header><div><p className="f7-kicker">The table is open</p><h1>Room <button onClick={() => navigator.clipboard?.writeText(room.roomCode)}>{room.roomCode} <Copy /></button></h1><p>Share the code, add computer players, then let the flipping begin.</p></div><button className="f7-rules-link" onClick={onRules}><CircleHelp /> Rules</button></header>
    <div className="f7-seats">{room.players.map((player, index) => <div className="f7-seat" key={player.id}><span>{player.isComputer ? <Bot /> : <Users />}</span><div><strong>{player.name}{player.id === me.id ? " (you)" : ""}</strong><small>{index === 0 ? "Host · " : ""}{player.isComputer ? "Computer player" : "Human player"}</small></div>{player.isComputer && isHost ? <button aria-label={`Remove ${player.name}`} onClick={() => onRemoveComputer(player.id)}><X /></button> : <Check />}</div>)}</div>
    {isHost && room.players.length < MAX_PLAYERS && <button className="f7-add-bot" disabled={busy} onClick={onAddComputer}><Bot /> Add computer player</button>}
    <div className={`f7-ready ${canStart ? "yes" : ""}`}><span>{room.players.length} / {MAX_PLAYERS} seats</span><strong>{canStart ? "Ready to flip" : "Add at least one more player"}</strong></div>
    {isHost ? <button className="f7-primary f7-start" disabled={busy || !canStart} onClick={onStart}><Sparkles /> Start game</button> : <p className="f7-waiting">Waiting for {room.players[0].name} to start…</p>}
    <button className="f7-leave" onClick={onLeave}><DoorOpen /> Leave room</button>
    {error && <p className="f7-form-error">{error}</p>}
  </section>{showRules && <RulesModal onClose={() => setShowRules(false)} />}</main>;
}

function RulesModal({ onClose }) {
  return <div className="f7-modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}><section className="f7-rules-modal" role="dialog" aria-modal="true" aria-labelledby="flip7-rules-title">
    <button className="f7-modal-close" onClick={onClose} aria-label="Close rules"><X /></button>
    <p className="f7-kicker">Rules in a minute</p><h2 id="flip7-rules-title">Flip without matching.</h2>
    <div className="f7-rule-grid">
      <article><span>1</span><div><strong>Flip or stay</strong><p>After everyone gets one card, choose to flip another or stay and bank your round score.</p></div></article>
      <article><span>2</span><div><strong>Duplicates bust</strong><p>Flip a number already in your line and you score zero for the round—unless you have a Second Chance.</p></div></article>
      <article><span>3</span><div><strong>Flip 7 wins the round</strong><p>Collect seven unique number cards to end the round immediately and add a 15-point bonus.</p></div></article>
      <article><span>4</span><div><strong>Score to 200</strong><p>Add number cards, double them with ×2, then add + modifiers. Highest score wins once someone reaches 200.</p></div></article>
    </div>
    <div className="f7-special-rules"><h3>Special cards</h3><p><Snowflake /> <strong>Freeze</strong> — choose any active player to stay immediately.</p><p><Flame /> <strong>Flip Three</strong> — choose an active player who must take the next three cards.</p><p><ShieldCheck /> <strong>Second Chance</strong> — discards one duplicate instead of busting; you may hold only one.</p></div>
    <button className="f7-primary" onClick={onClose}>Let&apos;s flip</button>
  </section></div>;
}

function RoundModal({ room, me, busy, onNext, onLeave }) {
  const winner = room.players.find((player) => player.id === room.winnerId);
  const isHost = room.hostId === me.id;
  const ranking = [...room.players].sort((a, b) => (room.roundScores[b.id] - room.roundScores[a.id]) || (b.score - a.score));
  return <div className="f7-modal-backdrop"><section className="f7-round-modal">
    <span className="f7-modal-trophy">{winner ? <Crown /> : room.flipSevenId ? <Sparkles /> : <Trophy />}</span>
    <p className="f7-kicker">{winner ? "Game over" : `Round ${room.round} complete`}</p>
    <h2>{winner ? `${winner.name} wins!` : room.flipSevenId ? `${room.players.find((player) => player.id === room.flipSevenId)?.name} flipped 7!` : "Scores are banked."}</h2>
    <div className="f7-results">{ranking.map((player, index) => <div key={player.id}><span>{index + 1}</span><strong>{player.name}{player.id === me.id ? " (you)" : ""}</strong><b>+{room.roundScores[player.id]}</b><small>{player.score} total</small></div>)}</div>
    {!winner && isHost && <button className="f7-primary" disabled={busy} onClick={onNext}><Sparkles /> Deal round {room.round + 1}</button>}
    {!winner && !isHost && <p className="f7-waiting">Waiting for {room.players[0].name} to deal the next round…</p>}
    <button className="f7-leave" onClick={onLeave}>{winner ? "Back to Flip 7" : "Leave table"}</button>
  </section></div>;
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
