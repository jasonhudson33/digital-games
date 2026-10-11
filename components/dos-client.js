"use client";

import { useEffect, useMemo, useState } from "react";
import { Bot, Trophy, Users } from "lucide-react";

import { CardBack, ColorGameCard, cardName } from "./color-game-card";
import { Seat, SeatedTable } from "./ui/seated-table";
import { DosRoomService } from "./dos-room-service";
import { ChoiceModal, GameHeader, Hero, Landing as SharedLanding, Lobby, RoundModal } from "./ui/table-shell";
import { MAX_PLAYERS, MIN_PLAYERS, currentPlayer, matchOptions } from "../lib/dos";
import CardFan from "./card-fan";
import { computerDelayOf, computerSpeedProp } from "../lib/computer-speed.js";
import { useComputerPacer } from "../lib/use-computer-pacer.js";

const keys = { name: "dos-player-name", room: "dos-active-room" };

/** Opponents' hands are not sent, only a count. */
const handSize = (player) => player.cardCount ?? player.cards.length;

export default function DosClient() {
  const [room, setRoom] = useState(null);
  const [name, setName] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [showRules, setShowRules] = useState(false);
  const [selectedCenter, setSelectedCenter] = useState(null);
  const [selectedHand, setSelectedHand] = useState([]);

  useEffect(() => {
    setName(localStorage.getItem(keys.name) || "");
    const activeCode = localStorage.getItem(keys.room);
    if (activeCode) DosRoomService.load(activeCode).then((loaded) => {
      if (loaded) setRoom(loaded);
    }).catch(() => localStorage.removeItem(keys.room));
  }, []);

  const playerId = room?.viewerId || "";

  useEffect(() => room?.roomCode ? DosRoomService.subscribe(room.roomCode, (next) => setRoom((current) => !current || Number(next.updatedAt || 0) >= Number(current.updatedAt || 0) ? next : current)) : undefined, [room?.roomCode]);
  useEffect(() => { setSelectedCenter(null); setSelectedHand([]); }, [room?.currentPlayerIndex, room?.turn?.matchedCount, room?.turn?.placementRemaining]);

  const computerToAct = useMemo(() => {
    if (room?.phase !== "playing") return null;
    if (room.missedDosPlayerId) return room.players.find((player) => player.isComputer && player.id !== room.missedDosPlayerId) || null;
    const active = currentPlayer(room);
    return active?.isComputer ? active : null;
  }, [room]);

  // The host's browser paces the computers by the room's speed (platform/computer-pacing).
  useComputerPacer({
    enabled: Boolean(room && room.hostId === playerId),
    due: Boolean(computerToAct),
    delayMs: computerDelayOf(room),
    step: stepComputer,
    key: room?.updatedAt,
  });
  // Props for the speed control in the bar and lobby (null when no computer is seated).
  const computerSpeed = computerSpeedProp({ players: room?.players, delayMs: room?.computerDelayMs, onChange: (ms) => act("setComputerSpeed", { ms }) });

  async function withBusy(action) {
    setBusy(true); setError("");
    try { return await action(); } catch (caught) { setError(caught.message); return null; } finally { setBusy(false); }
  }

  async function createRoom() {
    if (!name.trim()) return setError("Enter your name first.");
    await withBusy(async () => {
      remember((await DosRoomService.create(name.trim())).state);
    });
  }

  async function joinRoom() {
    if (!name.trim() || !joinCode.trim()) return setError("Enter your name and a room code.");
    await withBusy(async () => {
      const code = joinCode.trim().toUpperCase();
      if (DosRoomService.hasSeat(code)) {
        const loaded = await DosRoomService.load(code);
        if (!loaded) throw new Error("That room could not be found.");
        remember(loaded);
      } else {
        remember((await DosRoomService.join(code, name.trim())).state);
      }
    });
  }

  async function act(action, args) {
    if (!room) return null;
    return withBusy(async () => {
      const next = await DosRoomService.action(room.roomCode, action, args);
      if (next) setRoom(next);
      return next;
    });
  }

  async function stepComputer() {
    if (!room) return null;
    return withBusy(async () => {
      const next = await DosRoomService.computerStep(room.roomCode);
      if (next) setRoom(next);
      return next;
    });
  }

  function remember(next) { localStorage.setItem(keys.name, name.trim()); localStorage.setItem(keys.room, next.roomCode); setRoom(next); }
  function leaveRoom() { localStorage.removeItem(keys.room); setRoom(null); }

  const me = room?.players.find((player) => player.id === playerId) || null;
  if (!room || !me) return <Landing {...{ name, setName, joinCode, setJoinCode, createRoom, joinRoom, busy, error, showRules, setShowRules }} />;
  if (room.phase === "lobby") return <Lobby computerSpeed={computerSpeed} gameName="DOS" room={room} me={me} busy={busy} error={error} max={MAX_PLAYERS} min={MIN_PLAYERS} onAdd={() => act("addComputer")} onRemove={(id) => act("removeComputer", { playerId: id })} onStart={() => act("start")} onLeave={leaveRoom} onRules={() => setShowRules(true)} rules={showRules && <RulesModal onClose={() => setShowRules(false)} />} />;

  const active = currentPlayer(room);
  const myTurn = room.phase === "playing" && active?.id === playerId;
  const options = myTurn ? matchOptions(room, playerId) : [];
  const selectedOption = options.find((option) => option.centerCardId === selectedCenter && sameIds(option.handCardIds, selectedHand));
  const mustPlace = myTurn && room.turn.placementRemaining > 0;
  const canCatch = room.missedDosPlayerId && room.missedDosPlayerId !== playerId;
  const canEnd = myTurn && !mustPlace && (room.turn.matchedCount > 0 || room.turn.drawn);
  const status = mustPlace ? `Place ${room.turn.placementRemaining} bonus card${room.turn.placementRemaining === 1 ? "" : "s"} in the center` : myTurn ? "Your turn: match or draw" : `${active?.name}'s turn`;

  function toggleHand(cardId) {
    setSelectedHand((current) => current.includes(cardId) ? current.filter((id) => id !== cardId) : current.length < 2 ? [...current, cardId] : [current[1], cardId]);
  }

  return (
    <main className="tbl-game dos-theme tbl-felt-shell">
      <GameHeader computerSpeed={computerSpeed} title="DOS" room={room} status={status} onRules={() => setShowRules(true)} onLeave={leaveRoom} />
      {error && <p className="tbl-error" role="alert">{error}</p>}

      <section className="dos-felt-wrap tbl-felt-fit" aria-label="DOS table">
        <DosTable room={room} viewerId={playerId} active={active} />
      </section>

      <div className="dos-center-zone" aria-label="Center row">
        <header className="dos-center-head">
          <p>Center row</p>
          <span>Select one center card, then one matching card or two cards whose values add up to it.</span>
        </header>
        <div className="dos-center-row">
          {room.centerRow.map((center) => (
            <ColorGameCard key={center.id} card={center} selected={selectedCenter === center.id} disabled={!myTurn || mustPlace} onClick={myTurn && !mustPlace ? () => setSelectedCenter(center.id) : undefined} />
          ))}
        </div>
      </div>

      <aside className="tbl-side tbl-log dos-log">
        <p>Table talk</p>
        {room.log.slice(0, 5).map((line, index) => <span className="tbl-log-line" key={`${line}-${index}`}>{line}</span>)}
      </aside>

      {canCatch && <button type="button" className="tbl-catch" onClick={() => act("catchDos")}>Catch missed DOS — make them draw 2</button>}

      <section className="tbl-hand-zone">
        <header className="tbl-hand-header">
          <div>
            <p>Your hand</p>
            <strong>{me.cards.length} cards · {me.score} points</strong>
          </div>
          <button type="button" className={`tbl-call${me.dosSafe ? " is-armed" : ""}`} disabled={me.cards.length !== 2 || me.dosSafe} onClick={() => act("callDos")}>
            DOS{me.dosSafe ? " called!" : "!"}
          </button>
        </header>

        <CardFan className="tbl-hand" count={me.cards.length}>
          {me.cards.map((held) => (
            <ColorGameCard key={held.id} card={held} selected={selectedHand.includes(held.id)} disabled={busy || !myTurn} onClick={myTurn ? () => mustPlace ? act("placeCenterCard", { cardId: held.id }) : toggleHand(held.id) : undefined} label={`${cardName(held)}${mustPlace ? ", place in center" : ""}`} />
          ))}
        </CardFan>

        {myTurn && (
          <div className="dos-action-panel">
            {mustPlace ? (
              <p>Choose {room.turn.placementRemaining} card{room.turn.placementRemaining === 1 ? "" : "s"} from your hand to add to the center row.</p>
            ) : (
              <>
                <div className="dos-action-status">
                  {selectedOption ? (
                    <p><b>Valid {selectedOption.handCardIds.length === 2 ? "double" : "single"} match.</b>{selectedOption.colorBonus ? ` ${selectedOption.colorBonus === "double" ? "Every opponent draws 1, and you place a bonus card." : "You place a bonus card."}` : ""}</p>
                  ) : (
                    <p>{selectedHand.length && selectedCenter ? "Those cards do not match. Try another combination." : "Select cards to build a match, or draw if you want to pass."}</p>
                  )}
                </div>
                <button type="button" className="tbl-primary" disabled={busy || !selectedOption} onClick={() => act("playMatch", { optionId: selectedOption.id })}>Play match</button>
                <button type="button" className="tbl-secondary" disabled={busy || room.turn.drawn || room.turn.matchedCount > 0} onClick={() => act("draw")}>Draw one</button>
                {canEnd && <button type="button" className="tbl-secondary" disabled={busy} onClick={() => act("endTurn")}>{room.turn.matchedCount ? "End turn" : "Add a card & end"}</button>}
              </>
            )}
          </div>
        )}
      </section>

      {showRules && <RulesModal onClose={() => setShowRules(false)} />}
      {(room.phase === "roundEnd" || room.phase === "finished") && <RoundModal room={room} me={me} onNext={() => act("nextRound")} onLeave={leaveRoom} />}
    </main>
  );
}

function DosTable({ room, viewerId, active }) {
  const viewerIndex = room.players.findIndex((player) => player.id === viewerId);

  return (
    <SeatedTable
      count={room.players.length}
      viewerIndex={viewerIndex < 0 ? 0 : viewerIndex}
      className="dos-felt"
      middle={(
        <b className="tbl-felt-mark" title={`${room.deckCount} left in the draw pile`}>
          {room.deckCount}
        </b>
      )}
      foot={(
        <small className="tbl-felt-meta">
          {`Round ${room.round} · Target ${room.targetScore} · ${room.centerRow.length} in the center`}
        </small>
      )}
    >
      {({ layout, seatStyle }) => (
        <>
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
                hand={handSize(player)}
                tone={active?.id === player.id ? "turn" : ""}
                marks={[
                  spot.index === room.dealerIndex && { key: "deal", label: "D", title: "Dealer", tone: "deal" },
                  player.dosSafe && { key: "dos", label: "DOS", title: `${player.name} called DOS`, tone: "lead" },
                  room.missedDosPlayerId === player.id && { key: "miss", label: "!", title: `${player.name} missed DOS`, tone: "out" },
                ].filter(Boolean)}
              >
                <span className="tbl-chair-pill">{handSize(player)} {handSize(player) === 1 ? "card" : "cards"}</span>
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
    <SharedLanding
      gameName="DOS"
      theme="dos-theme"
      hero={<Hero
        kicker="Two piles. Two-card sums. Twice the strategy."
        title={<>Make a match.<br /><em>Call DOS.</em></>}
        copy="Match center numbers singly or with two-card sums, then turn color matches into table-changing bonuses."
        badges={[{ icon: Users, label: "2–4 players" }, { icon: Bot, label: "Computer seats" }, { icon: Trophy, label: "Race to 200" }]}
        art={<>
          <ColorGameCard card={{ type: "number", color: "blue", value: 3 }} />
          <ColorGameCard card={{ type: "number", color: "yellow", value: 7 }} />
          <ColorGameCard card={{ type: "wildDos", color: null, value: 2 }} />
        </>}
      />}
      entry={{ name, setName, joinCode, setJoinCode, createRoom, joinRoom, busy, error }}
      onRules={() => setShowRules(true)}
      dialogs={showRules && <RulesModal onClose={() => setShowRules(false)} />}
    />
  );
}

function RulesModal({ onClose }) {
  return (
    <ChoiceModal wide title="How to play DOS" onClose={onClose} text="On your turn, match any or all center-row cards once each—or draw. A single card may match a center number, or two cards may add up to it.">
      <div className="tbl-rule-grid">
        <article><b>Color bonuses</b><p>A number-and-color single match lets you place one card in the center. If both cards in a double match share the center color, every opponent also draws 1.</p></article>
        <article><b>Ending a turn</b><p>Matched center cards and played cards are discarded, the row refills to at least two, then earned bonus cards are placed into the row.</p></article>
        <article><b>Wilds + DOS</b><p>Wild DOS is a 2 of any color. A colored Wild # is any number 1–10. Call DOS whenever you hold exactly two cards or draw 2 if caught.</p></article>
        <article><b>Scoring</b><p>Numbers score face value, Wild DOS scores 20, and Wild # scores 40. The first player to 200 points wins.</p></article>
      </div>
    </ChoiceModal>
  );
}

function sameIds(left, right) { return left.length === right.length && left.every((id) => right.includes(id)); }
