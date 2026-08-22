"use client";

import { useEffect, useMemo, useState } from "react";
import { Bot, Trophy, Users } from "lucide-react";

import { ColorGameCard, CardBack, cardName } from "./color-game-card";
import { PlayedCard, Seat, SeatedTable } from "./ui/seated-table";
import { UnoRoomService } from "./uno-room-service";
import { ChoiceModal, EntryCard, GameHeader, Lobby, RoundModal } from "./ui/table-shell";
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
    const settings = (
      <section className="tbl-ruleset">
        <div>
          <p className="tbl-kicker">Choose your deck</p>
          <strong>{ruleset === "flip" ? "UNO Flip" : "Classic UNO"}</strong>
        </div>
        <div className="tbl-ruleset-options">
          <button type="button" className={ruleset === "classic" ? "is-selected" : ""} disabled={!isHost || busy} onClick={() => update((current) => setRuleset(current, "classic"))}>
            Classic<small>One side · familiar actions</small>
          </button>
          <button type="button" className={ruleset === "flip" ? "is-selected" : ""} disabled={!isHost || busy} onClick={() => update((current) => setRuleset(current, "flip"))}>
            UNO Flip<small>Light + dark double-sided deck</small>
          </button>
        </div>
      </section>
    );
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

  return (
    <main className="tbl-game uno-theme tbl-felt-shell">
      <GameHeader title={flipMode ? "UNO FLIP" : "UNO"} room={room} status={status} onRules={() => setShowRules(true)} onLeave={leaveRoom} />
      {error && <p className="tbl-error" role="alert">{error}</p>}

      <section className="uno-table tbl-felt-fit" aria-label="UNO table">
        <UnoTable room={room} viewerId={playerId} active={active} darkSide={darkSide} flipMode={flipMode} />
      </section>

      {canCatch && <button type="button" className="tbl-catch" onClick={() => update((current) => catchUno(current, playerId))}>Catch missed UNO — make them draw 2</button>}

      <section className="tbl-hand-zone">
        <header className="tbl-hand-header">
          <div>
            <p>Your hand</p>
            <strong>{me.cards.length} cards · {me.score} points</strong>
          </div>
          <button type="button" className={`tbl-call${unoArmed ? " is-armed" : ""}`} disabled={me.cards.length !== 2} onClick={() => setUnoArmed((armed) => !armed)}>
            UNO{unoArmed ? " armed!" : "!"}
          </button>
        </header>

        <div className="tbl-hand">
          {me.cards.map((held) => {
            const playable = myTurn && (!room.drawnCardId || room.drawnCardId === held.id) && isPlayable(room, held, me);
            const face = cardFace(room, held);
            const wild = ["wild", "wild4", "wildDraw2", "wildDrawColor"].includes(face.type);
            return <ColorGameCard key={held.id} card={face} dark={darkSide} disabled={busy || !playable} onClick={playable ? () => wild ? setWildCardId(held.id) : play(held) : undefined} label={`${cardName(face)}${playable ? ", play card" : ""}`} />;
          })}
        </div>

        {myTurn && (
          <div className="tbl-actions">
            <button type="button" className="tbl-secondary" disabled={busy || Boolean(room.drawnCardId)} onClick={() => update((current) => drawCard(current, playerId))}>Draw one</button>
            {room.drawnCardId && <button type="button" className="tbl-secondary" disabled={busy} onClick={() => update((current) => passAfterDraw(current, playerId))}>{drawn && isPlayable(room, drawn, me) ? "Keep card & pass" : "Pass turn"}</button>}
          </div>
        )}
      </section>

      <aside className="tbl-side tbl-log uno-log">
        <p>Table talk</p>
        {room.log.slice(0, 5).map((line, index) => <span className="tbl-log-line" key={`${line}-${index}`}>{line}</span>)}
      </aside>

      {(wildCardId || mustChooseOpening) && <ColorChooser colors={colorsForGame(room)} onChoose={(color) => mustChooseOpening ? update((current) => chooseOpeningColor(current, playerId, color)) : play(me.cards.find((held) => held.id === wildCardId), color)} onClose={mustChooseOpening ? null : () => setWildCardId(null)} />}
      {mustResolveFour && <ChoiceModal title={penaltyTitle(room.pendingDrawFour)} text={penaltyExplanation(room.pendingDrawFour)} actions={<><button type="button" className="tbl-primary" onClick={() => update((current) => resolveDrawFour(current, playerId, false))}>{penaltyAcceptLabel(room.pendingDrawFour)}</button><button type="button" className="tbl-secondary" onClick={() => update((current) => resolveDrawFour(current, playerId, true))}>Challenge</button></>} />}
      {showRules && <RulesModal onClose={() => setShowRules(false)} />}
      {(room.phase === "roundEnd" || room.phase === "finished") && <RoundModal room={room} me={me} onNext={() => update((current) => startNextRound(current, playerId))} onLeave={leaveRoom} />}
    </main>
  );
}

/*
 * The players, sitting round the felt.
 *
 * UNO has no per-round trick — one shared discard pile grows the whole game —
 * so a seat cannot show "what that player played this hand" the way a
 * trick-taking game can. It can still show the one thing a shared pile loses:
 * who put the top card down. `lastPlayerId` tracks that, and the card sits in
 * front of their chair until somebody else plays.
 */
function UnoTable({ room, viewerId, active, darkSide, flipMode }) {
  const viewerIndex = room.players.findIndex((player) => player.id === viewerId);
  const lastPlayerIndex = room.lastPlayerId ? room.players.findIndex((player) => player.id === room.lastPlayerId) : -1;
  const top = topDiscard(room);

  return (
    <SeatedTable
      count={room.players.length}
      viewerIndex={viewerIndex < 0 ? 0 : viewerIndex}
      className="uno-felt"
      middle={(
        <b className={`tbl-felt-mark uno-mid is-${room.activeColor || "wild"}`} title={`${room.deck.length} left in the draw pile`}>
          {room.deck.length}
        </b>
      )}
      foot={(
        <small className="tbl-felt-meta">
          {`Round ${room.round} · ${room.direction === 1 ? "Clockwise" : "Counter-clockwise"} · Active `}
          <b className={`tbl-color-dot ${room.activeColor}`} />
          {` ${room.activeColor}`}
        </small>
      )}
    >
      {({ layout, seatStyle, cardStyle }) => (
        <>
          {lastPlayerIndex >= 0 && top && (
            <PlayedCard style={cardStyle(lastPlayerIndex)}>
              <ColorGameCard card={cardFace(room, top)} dark={darkSide} small />
            </PlayedCard>
          )}

          {layout.map((spot) => {
            const player = room.players[spot.index];
            return (
              <Seat
                key={player.id}
                spot={spot}
                style={seatStyle(spot.index)}
                name={player.name}
                avatar={player.isComputer ? <Bot size={14} /> : player.name.slice(0, 1).toUpperCase()}
                note={`${player.score} pts`}
                hand={player.cards.length}
                tone={active?.id === player.id ? "turn" : ""}
                marks={[
                  spot.index === room.dealerIndex && { key: "deal", label: "D", title: "Dealer", tone: "deal" },
                  flipMode && player.id === room.lastPlayerId && { key: "side", label: room.side === "dark" ? "●" : "○", title: `${room.side} side`, tone: "lead" },
                ].filter(Boolean)}
              >
                <span className="tbl-chair-pill">{player.cards.length} {player.cards.length === 1 ? "card" : "cards"}</span>
              </Seat>
            );
          })}
        </>
      )}
    </SeatedTable>
  );
}

function Landing({ name, setName, joinCode, setJoinCode, createRoom, joinRoom, busy, error, showRules, setShowRules }) {
  return (
    <main className="tbl-landing uno-theme">
      <section className="tbl-hero">
        <p className="tbl-kicker">Classic on one side. Chaos on the other.</p>
        <h1>ONE card.<br /><em>Two ways.</em></h1>
        <p className="tbl-hero-copy">Choose Classic UNO or flip the whole table between light and dark sides in UNO Flip.</p>
        <div className="tbl-hero-badges">
          <span><Users aria-hidden="true" /> 2–10 players</span>
          <span><Bot aria-hidden="true" /> Computer seats</span>
          <span><Trophy aria-hidden="true" /> Classic + Flip</span>
        </div>
        <div className="tbl-hero-fan" aria-hidden="true">
          <ColorGameCard card={{ type: "number", color: "red", value: 7 }} />
          <ColorGameCard card={{ type: "flip", color: "yellow" }} />
          <ColorGameCard card={{ type: "draw5", color: "purple" }} dark />
        </div>
      </section>
      <EntryCard gameName="UNO" {...{ name, setName, joinCode, setJoinCode, createRoom, joinRoom, busy, error }} onRules={() => setShowRules(true)} />
      {showRules && <RulesModal onClose={() => setShowRules(false)} />}
    </main>
  );
}

function RulesModal({ onClose }) {
  return (
    <ChoiceModal wide title="How to play UNO" onClose={onClose} text="Choose Classic UNO or UNO Flip in the lobby. Both games match by color, number, or action and require an UNO call when playing down to one card.">
      <p className="tbl-rule-heading">Classic UNO</p>
      <div className="tbl-rule-grid">
        <article><b>Action cards</b><p>Skip loses the next turn, Reverse changes direction, and Draw Two makes the next player draw 2 and miss their turn.</p></article>
        <article><b>Wild Draw Four</b><p>Choose a color and make the next player draw 4. It may be challenged if you held the active color.</p></article>
      </div>
      <p className="tbl-rule-heading dark">UNO Flip</p>
      <div className="tbl-rule-grid">
        <article><b>FLIP the table</b><p>Everyone starts on the Light Side. A FLIP card reverses the discard and draw piles and exposes the other face of every hand.</p></article>
        <article><b>Light Side</b><p>Draw One, Skip, Reverse, FLIP, Wild, and challengeable Wild Draw Two cards.</p></article>
        <article><b>Dark Side</b><p>Draw Five, Skip Everyone, Reverse, FLIP, Wild, and Wild Draw Color—which draws until the chosen color appears.</p></article>
        <article><b>Side-specific scoring</b><p>Score the face showing when the round ends. Wild Draw Color is 60, Skip Everyone 30, and first to 500 wins.</p></article>
      </div>
    </ChoiceModal>
  );
}

function ColorChooser({ colors, onChoose, onClose }) {
  return (
    <ChoiceModal
      title="Choose a color"
      text="This color stays active until another color, Wild, or FLIP changes it."
      onClose={onClose}
      actions={<div className="tbl-colors">{colors.map((color) => <button type="button" key={color} className={color} onClick={() => onChoose(color)}>{color}</button>)}</div>}
    />
  );
}

function penaltyTitle(pending) { return pending?.type === "wildDraw2" ? "Wild Draw Two" : pending?.type === "wildDrawColor" ? "Wild Draw Color" : "Wild Draw Four"; }
function penaltyPrompt(pending) { return pending?.kind === "color" ? `Draw until ${pending.color} or challenge?` : `Draw ${pending?.amount || 4} or challenge?`; }
function penaltyAcceptLabel(pending) { return pending?.kind === "color" ? `Draw until ${pending.color}` : `Draw ${pending?.amount || 4}`; }
function penaltyExplanation(pending) { return pending?.kind === "color" ? `Draw until you reveal a ${pending.color} card, or challenge if you think the previous player held the active color.` : `Accept the penalty and draw ${pending?.amount || 4}, or challenge if you think the previous player held the active color.`; }
