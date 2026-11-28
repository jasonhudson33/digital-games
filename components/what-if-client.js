"use client";

import { useEffect, useState } from "react";
import { Check, ChevronRight, PenLine, Shuffle, Sparkles, Users } from "lucide-react";
import { WhatIfRoomService } from "./what-if-room-service";
import { MAX_PLAYERS, MAX_TEXT, MIN_PLAYERS } from "../lib/what-if";
import { useEngineRoom } from "../lib/use-engine-room.js";
import { ChoiceModal, GameHeader, Hero, Landing, Lobby } from "./ui/table-shell";

/**
 * What If (games/what-if). Everyone writes a "What if…" and a "Then…", the
 * server mixes the halves so nobody gets their own THEN back, and the host
 * steps the table through the results. The server never sends anyone else's
 * words before the reveal reaches them.
 */
export default function WhatIfClient() {
  const {
    room, playerId, name, setName, joinCode, setJoinCode,
    busy, error, createRoom, joinRoom, act, leaveRoom: leaveEngineRoom,
  } = useEngineRoom({ service: WhatIfRoomService, storageKey: "what-if" });
  const [showRules, setShowRules] = useState(false);
  const [ifText, setIfText] = useState("");
  const [thenText, setThenText] = useState("");
  const [editing, setEditing] = useState(false);

  // A new round starts with empty boxes; a reload refills them from the server.
  const round = room?.round ?? 0;
  const savedIf = room?.myEntry?.if ?? "";
  const savedThen = room?.myEntry?.then ?? "";
  useEffect(() => {
    setIfText(savedIf);
    setThenText(savedThen);
    setEditing(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [round]);
  useEffect(() => {
    if (!editing && savedIf) {
      setIfText(savedIf);
      setThenText(savedThen);
    }
  }, [editing, savedIf, savedThen]);

  const rulesDialog = showRules && <RulesModal onClose={() => setShowRules(false)} />;

  function leaveRoom() {
    if (room?.phase === "writing" && ifText.trim() && !room?.myEntry
      && !window.confirm("Leave the table? What you've written will be lost.")) return;
    leaveEngineRoom();
  }

  const me = room?.players.find((player) => player.id === playerId) ?? null;

  if (!room || !me) {
    return <Landing
      gameName="What If"
      theme="tbl-light what-if-theme"
      hero={<Hero
        kicker="The mix-and-match party game"
        title={<>What if…<br /><em>then what?</em></>}
        copy="Everyone secretly writes a What if and a Then. We shuffle the halves and read out the gloriously wrong results."
        badges={[
          { icon: Users, label: `${MIN_PLAYERS}–${MAX_PLAYERS} people` },
          { icon: PenLine, label: "Write your own" },
          { icon: Shuffle, label: "Mixed by the table" },
        ]}
        art={[
          <SlipCard key="a" kind="if" text="the moon were made of cheese" />,
          <SlipCard key="b" kind="then" text="my cat would finally respect me" />,
        ]}
      />}
      entry={{ name, setName, joinCode, setJoinCode, createRoom, joinRoom, busy, error }}
      onRules={() => setShowRules(true)}
      dialogs={rulesDialog}
    />;
  }

  if (room.phase === "lobby") {
    return <Lobby
      gameName="What If"
      theme="tbl-light what-if-theme"
      room={room}
      me={me}
      busy={busy}
      error={error}
      min={MIN_PLAYERS}
      max={MAX_PLAYERS}
      onStart={() => act("start")}
      onLeave={leaveRoom}
      onRules={() => setShowRules(true)}
      rules={rulesDialog}
    />;
  }

  const isHost = room.hostId === playerId;
  const submitted = new Set(room.submitted || []);
  const nameOf = (id) => room.players.find((player) => player.id === id)?.name ?? "Someone";
  const status = room.phase === "writing"
    ? `${submitted.size} of ${room.players.length} written`
    : room.phase === "reveal"
      ? `Pair ${room.revealIndex + 1} of ${room.pairCount}`
      : "All revealed";

  return <main className="wi-game-shell tbl-light what-if-theme">
    <GameHeader title="What If" room={room} subtitle={`Round ${room.round}`} status={status} onRules={() => setShowRules(true)} onLeave={leaveRoom} />
    {error && <p className="wi-error" role="alert">{error}</p>}

    {room.phase === "writing" && <WritingStage
      room={room}
      me={me}
      isHost={isHost}
      busy={busy}
      submitted={submitted}
      ifText={ifText}
      thenText={thenText}
      setIfText={setIfText}
      setThenText={setThenText}
      editing={editing || !room.myEntry}
      onEdit={() => setEditing(true)}
      onSubmit={async () => {
        const saved = await act("submit", { if: ifText, then: thenText });
        if (saved) setEditing(false);
      }}
      onMix={() => act("mixNow")}
    />}

    {room.phase === "reveal" && <RevealStage room={room} isHost={isHost} busy={busy} nameOf={nameOf} onNext={() => act("next")} />}

    {room.phase === "done" && <DoneStage room={room} isHost={isHost} busy={busy} nameOf={nameOf} onAgain={() => act("playAgain")} />}

    {rulesDialog}
  </main>;
}

function WritingStage({ room, me, isHost, busy, submitted, ifText, thenText, setIfText, setThenText, editing, onEdit, onSubmit, onMix }) {
  const ready = ifText.trim() && thenText.trim();
  const mySubmitted = submitted.has(me.id);
  const canMix = isHost && submitted.size >= MIN_PLAYERS && submitted.size < room.players.length;
  return <section className="wi-stage">
    {editing ? <form className="wi-write" onSubmit={(event) => { event.preventDefault(); if (ready) onSubmit(); }}>
      <label className="wi-slip if">
        <span>What if…</span>
        <textarea
          value={ifText}
          maxLength={MAX_TEXT}
          rows={3}
          placeholder="…dogs could talk"
          onChange={(event) => setIfText(event.target.value)}
        />
        <small>{ifText.length} / {MAX_TEXT}</small>
      </label>
      <label className="wi-slip then">
        <span>Then…</span>
        <textarea
          value={thenText}
          maxLength={MAX_TEXT}
          rows={3}
          placeholder="…the mail carrier would need a lawyer"
          onChange={(event) => setThenText(event.target.value)}
        />
        <small>{thenText.length} / {MAX_TEXT}</small>
      </label>
      <button type="submit" className="tbl-primary wi-submit" disabled={busy || !ready}>
        {mySubmitted ? "Update" : "Submit"} <ChevronRight aria-hidden="true" />
      </button>
    </form> : <div className="wi-write wi-sent">
      <p className="wi-kicker"><Check aria-hidden="true" /> Submitted</p>
      <SlipCard kind="if" text={room.myEntry.if} />
      <SlipCard kind="then" text={room.myEntry.then} />
      <button type="button" className="tbl-link" onClick={onEdit}>Edit until everyone's in</button>
    </div>}

    <aside className="wi-table" aria-label="Who has written">
      <p className="wi-kicker">At the table</p>
      <ul>
        {room.players.map((player) => <li key={player.id} className={submitted.has(player.id) ? "done" : ""}>
          <span>{player.name}{player.id === me.id ? " (you)" : ""}</span>
          {submitted.has(player.id) ? <Check aria-label="written" /> : <small>writing…</small>}
        </li>)}
      </ul>
      <p className="wi-hint">The mix happens as soon as everyone has written.</p>
      {canMix && <button type="button" className="tbl-secondary wi-mix" disabled={busy} onClick={onMix}>
        <Shuffle aria-hidden="true" /> Mix now with {submitted.size}
      </button>}
    </aside>
  </section>;
}

function RevealStage({ room, isHost, busy, nameOf, onNext }) {
  const pair = room.pairs[room.revealIndex];
  const last = room.revealIndex >= room.pairCount - 1;
  if (!pair) return null;
  return <section className="wi-stage wi-reveal">
    <article className="wi-pair" key={room.revealIndex}>
      <p className="wi-count">Pair {room.revealIndex + 1} of {room.pairCount}</p>
      <p className="wi-line if"><b>What if</b> {pair.ifText}</p>
      <p className="wi-line then"><b>Then</b> {pair.thenText}</p>
      <p className="wi-byline">if by {nameOf(pair.ifBy)} · then by {nameOf(pair.thenBy)}</p>
    </article>
    {isHost
      ? <button type="button" className="tbl-primary wi-next" disabled={busy} onClick={onNext}>{last ? "Finish" : "Next"} <ChevronRight aria-hidden="true" /></button>
      : <p className="wi-hint">The host reveals the next one.</p>}
  </section>;
}

function DoneStage({ room, isHost, busy, nameOf, onAgain }) {
  return <section className="wi-stage wi-done">
    <p className="wi-kicker"><Sparkles aria-hidden="true" /> Round {room.round}, every pair</p>
    <ol className="wi-pairs">
      {room.pairs.map((pair, index) => <li key={index}>
        <p><b>What if</b> {pair.ifText}</p>
        <p><b>Then</b> {pair.thenText}</p>
        <small>if by {nameOf(pair.ifBy)} · then by {nameOf(pair.thenBy)}</small>
      </li>)}
    </ol>
    {isHost
      ? <button type="button" className="tbl-primary wi-next" disabled={busy} onClick={onAgain}>Play again <ChevronRight aria-hidden="true" /></button>
      : <p className="wi-hint">Waiting for the host to start another round.</p>}
  </section>;
}

function SlipCard({ kind, text }) {
  return <div className={`wi-slip-card ${kind}`}>
    <b>{kind === "if" ? "What if" : "Then"}</b>
    <span>{text}</span>
  </div>;
}

function RulesModal({ onClose }) {
  return <ChoiceModal wide title="Write it. Mix it. Read it." text={`A party game for ${MIN_PLAYERS}–${MAX_PLAYERS} people.`} onClose={onClose}>
    <div className="tbl-rule-grid">
      <article><b>Write two halves</b><p>Everyone secretly writes a “What if…” and a “Then…” that follows from it. Nobody sees anyone else’s.</p></article>
      <article><b>The mix</b><p>Once everyone has written, the halves are shuffled so every What if meets a Then written by someone else.</p></article>
      <article><b>The reveal</b><p>The host shows the pairs one at a time. Read them out loud — then see who wrote each half.</p></article>
      <article><b>Again!</b><p>No points, no winners. When the last pair is read, the host can start a fresh round.</p></article>
    </div>
  </ChoiceModal>;
}
