"use client";

import { useEffect, useMemo, useState } from "react";
import { Bot, CircleHelp, Copy, DoorOpen, LogOut, Plus, Sparkles, Trophy, Users, X } from "lucide-react";
import { ColorGameCard, CardBack, cardName } from "./color-game-card";
import { UnoRoomService } from "./uno-room-service";
import {
  MAX_PLAYERS, MIN_PLAYERS, addComputerPlayer, addPlayer, cardFace, catchUno, chooseOpeningColor,
  colorsForGame, createLobby, currentPlayer, drawCard, isPlayable, passAfterDraw, playCard,
  removeComputerPlayer, resolveDrawFour, runComputerStep, setRuleset, startGame, startNextRound, topDiscard,
} from "../lib/uno";

const keys = { id: "uno-player-id", name: "uno-player-name", room: "uno-active-room" };

export default function UnoClient() {
  const [room, setRoom] = useState(null);
  const [playerId, setPlayerId] = useState("");
  const [name, setName] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [showRules, setShowRules] = useState(false);
  const [wildCardId, setWildCardId] = useState(null);
  const [unoArmed, setUnoArmed] = useState(false);

  useEffect(() => {
    const storedId = localStorage.getItem(keys.id) || crypto.randomUUID();
    localStorage.setItem(keys.id, storedId);
    setPlayerId(storedId);
    setName(localStorage.getItem(keys.name) || "");
    const activeCode = localStorage.getItem(keys.room);
    if (activeCode) UnoRoomService.load(activeCode).then((loaded) => {
      if (loaded?.players.some((player) => player.id === storedId)) setRoom(loaded);
    }).catch(() => {});
  }, []);

  useEffect(() => room?.roomCode ? UnoRoomService.subscribe(room.roomCode, (next) => setRoom((current) => !current || Number(next.updatedAt || 0) >= Number(current.updatedAt || 0) ? next : current)) : undefined, [room?.roomCode]);

  const computerToAct = useMemo(() => {
    if (room?.phase !== "playing") return null;
    if (room.missedUnoPlayerId) return room.players.find((player) => player.isComputer && player.id !== room.missedUnoPlayerId) || null;
    if (room.pendingOpeningWild) return room.players.find((player) => player.id === room.pendingOpeningWild && player.isComputer) || null;
    if (room.pendingDrawFour) return room.players.find((player) => player.id === room.pendingDrawFour.victimId && player.isComputer) || null;
    const active = currentPlayer(room);
    return active?.isComputer ? active : null;
  }, [room]);

  useEffect(() => {
    if (!room || room.hostId !== playerId || !computerToAct) return undefined;
    const timer = window.setTimeout(() => update((current) => runComputerStep(current)), 680);
    return () => window.clearTimeout(timer);
  }, [room?.updatedAt, computerToAct?.id, playerId]);

  async function createRoom() {
    if (!name.trim()) return setError("Enter your name first.");
    await withBusy(async () => {
      const code = await UnoRoomService.createCode();
      remember(await UnoRoomService.save(createLobby({ id: playerId, name: name.trim() }, code)));
    });
  }

  async function joinRoom() {
    if (!name.trim() || !joinCode.trim()) return setError("Enter your name and a room code.");
    await withBusy(async () => {
      const code = joinCode.trim().toUpperCase();
      const loaded = await UnoRoomService.load(code);
      if (!loaded) throw new Error("That room could not be found.");
      if (!loaded.players.some((player) => player.id === playerId)) {
        if (loaded.phase !== "lobby") throw new Error("That game has already started.");
        if (loaded.players.length >= MAX_PLAYERS) throw new Error("That room is full.");
        remember(await UnoRoomService.update(code, (current) => addPlayer(current, { id: playerId, name: name.trim() })));
      } else remember(loaded);
    });
  }

  async function withBusy(action) {
    setBusy(true); setError("");
    try { return await action(); } catch (caught) { setError(caught.message); return null; } finally { setBusy(false); }
  }

  async function update(action) {
    if (!room) return null;
    return withBusy(async () => {
      const next = await UnoRoomService.update(room.roomCode, action);
      if (next) setRoom(next);
      return next;
    });
  }

  function remember(next) {
    localStorage.setItem(keys.name, name.trim()); localStorage.setItem(keys.room, next.roomCode); setRoom(next);
  }

  function leaveRoom() { localStorage.removeItem(keys.room); setRoom(null); }

  const me = room?.players.find((player) => player.id === playerId) || null;
  if (!room || !me) return <Landing {...{ name, setName, joinCode, setJoinCode, createRoom, joinRoom, busy, error, showRules, setShowRules }} />;
  if (room.phase === "lobby") {
    const ruleset = room.ruleset === "flip" ? "flip" : "classic";
    const isHost = room.hostId === playerId;
    const settings = <section className="cg-ruleset-picker"><div><p className="cg-kicker">Choose your deck</p><strong>{ruleset === "flip" ? "UNO Flip" : "Classic UNO"}</strong></div><div><button className={ruleset === "classic" ? "selected" : ""} disabled={!isHost || busy} onClick={() => update((current) => setRuleset(current, "classic"))}>Classic<small>One side · familiar actions</small></button><button className={ruleset === "flip" ? "selected" : ""} disabled={!isHost || busy} onClick={() => update((current) => setRuleset(current, "flip"))}>UNO Flip<small>Light + dark double-sided deck</small></button></div></section>;
    return <Lobby gameName="UNO" room={room} me={me} busy={busy} error={error} max={MAX_PLAYERS} min={MIN_PLAYERS} settings={settings} onAdd={() => update((current) => current.hostId === playerId ? addComputerPlayer(current) : current)} onRemove={(id) => update((current) => current.hostId === playerId ? removeComputerPlayer(current, id) : current)} onStart={() => update((current) => current.hostId === playerId ? startGame(current) : current)} onLeave={leaveRoom} onRules={() => setShowRules(true)} rules={showRules && <RulesModal onClose={() => setShowRules(false)} />} />;
  }

  const active = currentPlayer(room);
  const myTurn = room.phase === "playing" && active?.id === playerId && !room.pendingOpeningWild && !room.pendingDrawFour;
  const drawn = me.cards.find((card) => card.id === room.drawnCardId);
  const mustChooseOpening = room.pendingOpeningWild === playerId;
  const mustResolveFour = room.pendingDrawFour?.victimId === playerId;
  const canCatch = room.missedUnoPlayerId && room.missedUnoPlayerId !== playerId;
  const status = mustChooseOpening ? "Choose the active color" : mustResolveFour ? penaltyPrompt(room.pendingDrawFour) : myTurn ? "Your turn" : `${active?.name || "Another player"}'s turn`;
  const flipMode = room.ruleset === "flip";
  const darkSide = flipMode && room.side === "dark";

  function play(held, color) {
    update((current) => playCard(current, playerId, held.id, { color, calledUno: unoArmed }));
    setWildCardId(null); setUnoArmed(false);
  }

  return <main className="cg-game uno-theme">
    <GameHeader title={flipMode ? "UNO FLIP" : "UNO"} room={room} status={status} onRules={() => setShowRules(true)} onLeave={leaveRoom} />
    {error && <p className="cg-error">{error}</p>}
    <section className="cg-opponents">{room.players.filter((player) => player.id !== playerId).map((player) => <article key={player.id} className={active?.id === player.id ? "active" : ""}><span>{player.isComputer ? <Bot /> : player.name[0].toUpperCase()}</span><div><strong>{player.name}</strong><small>{player.cards.length} cards · {player.score} pts</small></div><div className="cg-mini-stack"><CardBack count={player.cards.length} small flipSide={flipMode ? room.side : null} /></div></article>)}</section>
    <section className="cg-table">
      <aside><p>Round {room.round}</p><strong>{room.direction === 1 ? "Clockwise" : "Counterclockwise"}</strong><span>First to {room.targetScore}</span>{flipMode && <b className={`cg-side-badge ${room.side}`}>{room.side} side</b>}</aside>
      <div className="cg-piles"><div><CardBack count={room.deck.length} flipSide={flipMode ? room.side : null} /><span>Draw pile</span></div><div><ColorGameCard card={cardFace(room, topDiscard(room))} dark={darkSide} /><span>Active color: <b className={`cg-color-dot ${room.activeColor}`} /> {room.activeColor}</span></div></div>
      <aside className="cg-log"><p>Table talk</p>{room.log.slice(0, 5).map((line, index) => <span key={`${line}-${index}`}>{line}</span>)}</aside>
    </section>
    {canCatch && <button className="cg-catch" onClick={() => update((current) => catchUno(current, playerId))}>Catch missed UNO — make them draw 2</button>}
    <section className="cg-hand-zone">
      <header><div><p>Your hand</p><strong>{me.cards.length} cards · {me.score} points</strong></div><button className={unoArmed ? "armed" : ""} disabled={me.cards.length !== 2} onClick={() => setUnoArmed((armed) => !armed)}>UNO{unoArmed ? " armed!" : "!"}</button></header>
      <div className="cg-hand">{me.cards.map((held) => {
        const playable = myTurn && (!room.drawnCardId || room.drawnCardId === held.id) && isPlayable(room, held, me);
        const face = cardFace(room, held);
        const wild = ["wild", "wild4", "wildDraw2", "wildDrawColor"].includes(face.type);
        return <ColorGameCard key={held.id} card={face} dark={darkSide} disabled={busy || !playable} onClick={playable ? () => wild ? setWildCardId(held.id) : play(held) : undefined} label={`${cardName(face)}${playable ? ", play card" : ""}`} />;
      })}</div>
      {myTurn && <div className="cg-actions"><button disabled={busy || Boolean(room.drawnCardId)} onClick={() => update((current) => drawCard(current, playerId))}>Draw one</button>{room.drawnCardId && <button className="secondary" disabled={busy} onClick={() => update((current) => passAfterDraw(current, playerId))}>{drawn && isPlayable(room, drawn, me) ? "Keep card & pass" : "Pass turn"}</button>}</div>}
    </section>
    {(wildCardId || mustChooseOpening) && <ColorChooser colors={colorsForGame(room)} onChoose={(color) => mustChooseOpening ? update((current) => chooseOpeningColor(current, playerId, color)) : play(me.cards.find((held) => held.id === wildCardId), color)} onClose={mustChooseOpening ? null : () => setWildCardId(null)} />}
    {mustResolveFour && <ChoiceModal title={penaltyTitle(room.pendingDrawFour)} text={penaltyExplanation(room.pendingDrawFour)} actions={<><button onClick={() => update((current) => resolveDrawFour(current, playerId, false))}>{penaltyAcceptLabel(room.pendingDrawFour)}</button><button className="secondary" onClick={() => update((current) => resolveDrawFour(current, playerId, true))}>Challenge</button></>} />}
    {showRules && <RulesModal onClose={() => setShowRules(false)} />}
    {(room.phase === "roundEnd" || room.phase === "finished") && <RoundModal room={room} me={me} onNext={() => update((current) => startNextRound(current, playerId))} onLeave={leaveRoom} />}
  </main>;
}

function Landing({ name, setName, joinCode, setJoinCode, createRoom, joinRoom, busy, error, showRules, setShowRules }) {
  return <main className="cg-landing uno-theme"><section className="cg-hero"><p className="cg-kicker">Classic on one side. Chaos on the other.</p><h1>ONE card.<br /><em>Two ways.</em></h1><p>Choose Classic UNO or flip the whole table between light and dark sides in UNO Flip.</p><div><span><Users /> 2–10 players</span><span><Bot /> Computer seats</span><span><Trophy /> Classic + Flip</span></div><div className="cg-hero-fan"><ColorGameCard card={{ type: "number", color: "red", value: 7 }} /><ColorGameCard card={{ type: "flip", color: "yellow" }} /><ColorGameCard card={{ type: "draw5", color: "purple" }} dark /></div></section><EntryCard gameName="UNO" {...{ name, setName, joinCode, setJoinCode, createRoom, joinRoom, busy, error }} onRules={() => setShowRules(true)} />{showRules && <RulesModal onClose={() => setShowRules(false)} />}</main>;
}

function RulesModal({ onClose }) {
  return <ChoiceModal wide title="How to play UNO" onClose={onClose} text="Choose Classic UNO or UNO Flip in the lobby. Both games match by color, number, or action and require an UNO call when playing down to one card."><div className="cg-rule-heading">Classic UNO</div><div className="cg-rule-grid"><article><b>Action cards</b><p>Skip loses the next turn, Reverse changes direction, and Draw Two makes the next player draw 2 and miss their turn.</p></article><article><b>Wild Draw Four</b><p>Choose a color and make the next player draw 4. It may be challenged if you held the active color.</p></article></div><div className="cg-rule-heading dark">UNO Flip</div><div className="cg-rule-grid"><article><b>FLIP the table</b><p>Everyone starts on the Light Side. A FLIP card reverses the discard and draw piles and exposes the other face of every hand.</p></article><article><b>Light Side</b><p>Draw One, Skip, Reverse, FLIP, Wild, and challengeable Wild Draw Two cards.</p></article><article><b>Dark Side</b><p>Draw Five, Skip Everyone, Reverse, FLIP, Wild, and Wild Draw Color—which draws until the chosen color appears.</p></article><article><b>Side-specific scoring</b><p>Score the face showing when the round ends. Wild Draw Color is 60, Skip Everyone 30, and first to 500 wins.</p></article></div></ChoiceModal>;
}

function ColorChooser({ colors, onChoose, onClose }) { return <ChoiceModal title="Choose a color" text="This color stays active until another color, Wild, or FLIP changes it." onClose={onClose} actions={<div className="cg-colors">{colors.map((color) => <button key={color} className={color} onClick={() => onChoose(color)}>{color}</button>)}</div>} />; }

export function EntryCard({ gameName, name, setName, joinCode, setJoinCode, createRoom, joinRoom, busy, error, onRules }) { return <section className="cg-entry"><p className="cg-kicker">Private online table</p><h2>Play {gameName}</h2><p>Create a room, share its five-character code, and fill open seats with computers.</p><label>Your name<input maxLength={20} value={name} onChange={(event) => setName(event.target.value)} placeholder="Player name" /></label><button className="primary" disabled={busy} onClick={createRoom}><Plus /> Create a room</button><div className="cg-or">or join a room</div><div className="cg-join"><input aria-label="Room code" maxLength={5} value={joinCode} onChange={(event) => setJoinCode(event.target.value.toUpperCase())} placeholder="ROOM CODE" /><button disabled={busy} onClick={joinRoom}>Join</button></div><button className="link" onClick={onRules}><CircleHelp /> Official rules</button>{error && <p className="cg-error">{error}</p>}</section>; }

export function Lobby({ gameName, room, me, busy, error, min, max, settings, onAdd, onRemove, onStart, onLeave, onRules, rules }) { const host = room.hostId === me.id; return <main className="cg-lobby"><section><header><div><p className="cg-kicker">{gameName} table ready</p><h1>Room <button onClick={() => navigator.clipboard?.writeText(room.roomCode)}>{room.roomCode} <Copy /></button></h1><p>Share the code, add computer players, then start when everyone is seated.</p></div><button className="link" onClick={onRules}><CircleHelp /> Rules</button></header>{settings}<div className="cg-seats">{room.players.map((player, index) => <article key={player.id}><span>{player.isComputer ? <Bot /> : <Users />}</span><div><strong>{player.name}{player.id === me.id ? " (you)" : ""}</strong><small>{index === 0 ? "Host · " : ""}{player.isComputer ? "Computer" : "Human"}</small></div>{host && player.isComputer ? <button aria-label={`Remove ${player.name}`} onClick={() => onRemove(player.id)}><X /></button> : <Sparkles />}</article>)}</div>{host && room.players.length < max && <button className="cg-add" disabled={busy} onClick={onAdd}><Bot /> Add computer player</button>}<p className="cg-ready"><b>{room.players.length} / {max} seats</b><span>{room.players.length >= min ? "Ready to play" : "Add one more player"}</span></p>{host ? <button className="primary cg-start" disabled={busy || room.players.length < min} onClick={onStart}><Sparkles /> Start game</button> : <p className="cg-wait">Waiting for the host to start…</p>}<button className="link cg-leave" onClick={onLeave}><DoorOpen /> Leave room</button>{error && <p className="cg-error">{error}</p>}</section>{rules}</main>; }

function penaltyTitle(pending) { return pending?.type === "wildDraw2" ? "Wild Draw Two" : pending?.type === "wildDrawColor" ? "Wild Draw Color" : "Wild Draw Four"; }
function penaltyPrompt(pending) { return pending?.kind === "color" ? `Draw until ${pending.color} or challenge?` : `Draw ${pending?.amount || 4} or challenge?`; }
function penaltyAcceptLabel(pending) { return pending?.kind === "color" ? `Draw until ${pending.color}` : `Draw ${pending?.amount || 4}`; }
function penaltyExplanation(pending) { return pending?.kind === "color" ? `Draw until you reveal a ${pending.color} card, or challenge if you think the previous player held the active color.` : `Accept the penalty and draw ${pending?.amount || 4}, or challenge if you think the previous player held the active color.`; }

export function GameHeader({ title, room, status, onRules, onLeave }) { return <header className="cg-game-header"><div><p>Round {room.round} · private room</p><h1>{title}</h1></div><strong>{status}</strong><button onClick={onRules}><CircleHelp /> Rules</button><button onClick={() => navigator.clipboard?.writeText(room.roomCode)}><Copy /> {room.roomCode}</button><button onClick={onLeave}><LogOut /> Leave</button></header>; }

export function ChoiceModal({ title, text, actions, children, onClose, wide = false }) { return <div className="cg-modal-backdrop"><section className={`cg-modal ${wide ? "wide" : ""}`}>{onClose && <button className="cg-close" onClick={onClose}><X /></button>}<h2>{title}</h2>{text && <p>{text}</p>}{children}{actions && <div className="cg-modal-actions">{actions}</div>}</section></div>; }

export function RoundModal({ room, me, onNext, onLeave }) { const winner = room.players.find((player) => player.id === (room.winnerId || room.roundWinnerId)); return <ChoiceModal title={room.phase === "finished" ? `${winner.name} wins!` : `${winner.name} wins the round`} text={room.phase === "finished" ? `${winner.score} points takes the game.` : `Scores carry forward. First to ${room.targetScore} wins.`}><div className="cg-results">{[...room.players].sort((a, b) => b.score - a.score).map((player) => <div key={player.id}><span>{player.name}</span><b>{player.score} pts</b></div>)}</div>{room.phase === "roundEnd" && room.hostId === me.id ? <button className="primary" onClick={onNext}>Deal next round</button> : room.phase === "roundEnd" ? <p>Waiting for the host to deal…</p> : null}<button className="link" onClick={onLeave}>Leave table</button></ChoiceModal>; }
