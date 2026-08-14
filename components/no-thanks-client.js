"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Ban,
  Bot,
  CircleHelp,
  Coins,
  Copy,
  DoorOpen,
  Hand,
  LogOut,
  Plus,
  Sparkles,
  Trophy,
  Users,
  X,
} from "lucide-react";
import { NoThanksRoomService } from "./no-thanks-room-service";
import {
  MAX_PLAYERS,
  MIN_PLAYERS,
  addComputerPlayer,
  addPlayer,
  cardScore,
  createLobby,
  currentPlayer,
  finalScore,
  groupRuns,
  passCard,
  removeComputerPlayer,
  runComputerStep,
  startGame,
  takeCard,
} from "../lib/no-thanks";

const playerIdKey = "no-thanks-player-id";
const playerNameKey = "no-thanks-player-name";
const activeRoomKey = "no-thanks-active-room";

export default function NoThanksClient() {
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
    NoThanksRoomService.load(activeCode)
      .then((loaded) => {
        if (loaded?.players.some((player) => player.id === storedId)) setRoom(loaded);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!room?.roomCode) return undefined;
    return NoThanksRoomService.subscribe(room.roomCode, (next) => {
      setRoom((current) =>
        !current || Number(next.updatedAt || 0) >= Number(current.updatedAt || 0)
          ? next
          : current,
      );
    });
  }, [room?.roomCode]);

  const computerToAct = useMemo(() => {
    if (room?.phase !== "playing") return null;
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
  }, [computerToAct?.id, room?.updatedAt, playerId]);

  async function createRoom() {
    if (!name.trim()) return setError("Enter your name first.");
    setBusy(true);
    setError("");
    try {
      const roomCode = await NoThanksRoomService.createCode();
      rememberRoom(
        await NoThanksRoomService.save(
          createLobby({ id: playerId, name: name.trim() }, roomCode),
        ),
      );
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
      const loaded = await NoThanksRoomService.load(code);
      if (!loaded) throw new Error("That room could not be found.");
      if (!loaded.players.some((player) => player.id === playerId)) {
        if (loaded.phase !== "lobby") throw new Error("That game has already started.");
        if (loaded.players.length >= MAX_PLAYERS) throw new Error("That room is full.");
        rememberRoom(
          await NoThanksRoomService.update(code, (current) =>
            addPlayer(current, { id: playerId, name: name.trim() }),
          ),
        );
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
    if (!next) return;
    localStorage.setItem(playerNameKey, name.trim());
    localStorage.setItem(activeRoomKey, next.roomCode);
    setRoom(next);
  }

  async function update(action) {
    if (!room) return null;
    setBusy(true);
    setError("");
    try {
      const next = await NoThanksRoomService.update(room.roomCode, action);
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
    if (
      room?.phase === "playing" &&
      !window.confirm("Leave the table? You can rejoin with the room code.")
    ) return;
    localStorage.removeItem(activeRoomKey);
    setRoom(null);
  }

  const me = room?.players.find((player) => player.id === playerId) ?? null;

  if (!room || !me) {
    return <Landing {...{
      name,
      setName,
      joinCode,
      setJoinCode,
      createRoom,
      joinRoom,
      busy,
      error,
      showRules,
      setShowRules,
    }} />;
  }

  if (room.phase === "lobby") {
    return <Lobby
      room={room}
      me={me}
      busy={busy}
      error={error}
      onAddComputer={() => update((current) =>
        current.hostId === playerId ? addComputerPlayer(current) : current
      )}
      onRemoveComputer={(id) => update((current) =>
        current.hostId === playerId ? removeComputerPlayer(current, id) : current
      )}
      onStart={() => update((current) =>
        current.hostId === playerId ? startGame(current) : current
      )}
      onLeave={leaveRoom}
      onRules={() => setShowRules(true)}
      showRules={showRules}
      setShowRules={setShowRules}
    />;
  }

  const active = currentPlayer(room);
  const myTurn = room.phase === "playing" && active?.id === playerId;
  const statusMessage = computerThinking
    ? `${computerToAct?.name} is deciding…`
    : myTurn
      ? room.players.find((player) => player.id === playerId)?.chips
        ? "Your choice: take it or pay a chip?"
        : "No chips left—you must take the card."
      : `${active?.name}'s choice`;

  return <main className="nt-game-shell">
    <header className="nt-game-header">
      <div className="nt-brand-lockup"><span>NO</span><div><p>Single-round game</p><h1>Thanks!</h1></div></div>
      {room.phase === "playing" && <div className={`nt-turn-callout ${myTurn ? "mine" : ""}`}><Hand /> {statusMessage}</div>}
      <button className="nt-header-button" onClick={() => setShowRules(true)}><CircleHelp /> Rules</button>
      <button className="nt-header-button" onClick={() => navigator.clipboard?.writeText(room.roomCode)}><Copy /> {room.roomCode}</button>
      <button className="nt-header-button" onClick={leaveRoom}><LogOut /> Leave</button>
    </header>

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
        <div className="nt-mini-deck"><span>NO</span><strong>{room.deck.length}</strong><small>after this one</small></div>
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
        <button
          className="nt-pass-button"
          disabled={busy || !myTurn || me.chips <= 0}
          onClick={() => update((current) => passCard(current, playerId))}
        ><Ban /> No thanks <small>Pay 1 of {me.chips}</small></button>
        <button
          className="nt-take-button"
          disabled={busy || !myTurn}
          onClick={() => update((current) => takeCard(current, playerId))}
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
    <footer><span><Coins /> {isMe || finished ? `${player.chips} chips` : "chips hidden"}</span><span>{player.cards.length} card{player.cards.length === 1 ? "" : "s"}</span></footer>
  </article>;
}

function NumberCard({ value, large = false, tucked = false }) {
  const tone = value < 10 ? "mint" : value < 20 ? "sky" : value < 30 ? "gold" : "rose";
  return <div className={`nt-number-card ${tone} ${large ? "large" : ""} ${tucked ? "tucked" : ""}`}>
    <small>{value}</small><strong>{value}</strong><small>{value}</small>
  </div>;
}

function Landing({ name, setName, joinCode, setJoinCode, createRoom, joinRoom, busy, error, showRules, setShowRules }) {
  return <main className="nt-landing">
    <section className="nt-hero">
      <div className="nt-hero-copy"><p className="nt-kicker">The delightfully mean card game</p><h1>No.<br /><em>Thanks!</em></h1><p>Cards are points. Points are bad. Pay a chip to pass—or take the number and every chip piled on it.</p><div className="nt-facts"><span><Users /> 3–7 seats</span><span><Bot /> Computer players</span><span><Trophy /> Lowest score wins</span></div></div>
      <div className="nt-hero-art" aria-hidden="true"><NumberCard value={35} /><span className="nt-hero-chip">☺</span><NumberCard value={8} /></div>
    </section>
    <section className="nt-entry-card">
      <div><p className="nt-kicker">Find your table</p><h2>Start a private room</h2><p>Invite friends with a five-character code and add computer players whenever you need them.</p></div>
      <label>Your name<input value={name} maxLength={20} autoComplete="nickname" onChange={(event) => setName(event.target.value)} placeholder="Player name" /></label>
      <button className="nt-primary" disabled={busy} onClick={createRoom}><Plus /> Create a room</button>
      <div className="nt-or"><span>or join one</span></div>
      <div className="nt-join"><input aria-label="Room code" value={joinCode} maxLength={5} onChange={(event) => setJoinCode(event.target.value.toUpperCase())} placeholder="ROOM CODE" /><button disabled={busy} onClick={joinRoom}>Join</button></div>
      <button className="nt-rules-link" onClick={() => setShowRules(true)}><CircleHelp /> How to play</button>
      {error && <p className="nt-form-error" role="alert">{error}</p>}
    </section>
    {showRules && <RulesModal onClose={() => setShowRules(false)} />}
  </main>;
}

function Lobby({ room, me, busy, error, onAddComputer, onRemoveComputer, onStart, onLeave, onRules, showRules, setShowRules }) {
  const isHost = room.hostId === me.id;
  const canStart = room.players.length >= MIN_PLAYERS;
  return <main className="nt-lobby"><section className="nt-lobby-card">
    <header><div><p className="nt-kicker">The table is open</p><h1>Room <button onClick={() => navigator.clipboard?.writeText(room.roomCode)}>{room.roomCode} <Copy /></button></h1><p>Share the code, add computer players, then start with 3–7 seats.</p></div><button className="nt-rules-link" onClick={onRules}><CircleHelp /> Rules</button></header>
    <div className="nt-seats">{room.players.map((player, index) => <div className="nt-seat" key={player.id}><span>{player.isComputer ? <Bot /> : <Users />}</span><div><strong>{player.name}{player.id === me.id ? " (you)" : ""}</strong><small>{index === 0 ? "Host · " : ""}{player.isComputer ? "Computer player" : "Human player"}</small></div>{player.isComputer && isHost ? <button aria-label={`Remove ${player.name}`} onClick={() => onRemoveComputer(player.id)}><X /></button> : <Sparkles />}</div>)}</div>
    {isHost && room.players.length < MAX_PLAYERS && <button className="nt-add-bot" disabled={busy} onClick={onAddComputer}><Bot /> Add computer player</button>}
    <div className={`nt-ready ${canStart ? "yes" : ""}`}><span>{room.players.length} / {MAX_PLAYERS} seats</span><strong>{canStart ? "Ready to decline" : `Add ${MIN_PLAYERS - room.players.length} more player${MIN_PLAYERS - room.players.length === 1 ? "" : "s"}`}</strong></div>
    {isHost ? <button className="nt-primary nt-start" disabled={busy || !canStart} onClick={onStart}><Sparkles /> Deal the cards</button> : <p className="nt-waiting">Waiting for {room.players[0].name} to start…</p>}
    <button className="nt-leave" onClick={onLeave}><DoorOpen /> Leave room</button>
    {error && <p className="nt-form-error">{error}</p>}
  </section>{showRules && <RulesModal onClose={() => setShowRules(false)} />}</main>;
}

function RulesModal({ onClose }) {
  return <div className="nt-modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}><section className="nt-rules-modal" role="dialog" aria-modal="true" aria-labelledby="no-thanks-rules-title">
    <button className="nt-modal-close" onClick={onClose} aria-label="Close rules"><X /></button>
    <p className="nt-kicker">Official rules, one digital round</p><h2 id="no-thanks-rules-title">Points are bad. Chips are good.</h2>
    <div className="nt-rule-grid">
      <article><span>1</span><div><strong>Nine cards disappear</strong><p>Cards 3–35 are shuffled and nine are removed unseen. The other 24 make the draw pile.</p></div></article>
      <article><span>2</span><div><strong>Take it or pass</strong><p>Take the face-up card and its chips, or pay one chip to pass the choice left. With no chips, you must take.</p></div></article>
      <article><span>3</span><div><strong>Taking keeps your turn</strong><p>Reveal the next card and choose again. Your collected cards stay face-up; your chip count stays secret.</p></div></article>
      <article><span>4</span><div><strong>Lowest score wins</strong><p>Count only the lowest card in each consecutive run, then subtract one point for every chip you hold.</p></div></article>
    </div>
    <div className="nt-score-example"><strong>Example</strong><span>8</span><span>13–14–15</span><span>17</span><b>= 38 card points</b><p>With 13 chips left: 38 − 13 = <strong>25 points</strong>.</p></div>
    <button className="nt-primary" onClick={onClose}>No more questions</button>
  </section></div>;
}

function ResultsModal({ room, me, onLeave }) {
  const ranking = [...room.players].sort((left, right) => finalScore(left) - finalScore(right));
  const winners = ranking.filter((player) => room.winnerIds.includes(player.id));
  return <div className="nt-modal-backdrop"><section className="nt-results-modal">
    <span className="nt-modal-trophy"><Trophy /></span>
    <p className="nt-kicker">Game over</p>
    <h2>{winners.length === 1 ? `${winners[0].name} wins!` : `${winners.map((player) => player.name).join(" & ")} tie!`}</h2>
    <p>Fewest points takes the table.</p>
    <div className="nt-results">{ranking.map((player, index) => <div key={player.id}><span>{index + 1}</span><strong>{player.name}{player.id === me.id ? " (you)" : ""}</strong><b>{finalScore(player)} pts</b><small>{cardScore(player.cards)} cards − {player.chips} chips</small></div>)}</div>
    <button className="nt-primary" onClick={onLeave}>Back to No Thanks!</button>
  </section></div>;
}
