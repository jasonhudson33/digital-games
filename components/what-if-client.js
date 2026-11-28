"use client";

import { useEffect, useState } from "react";
import { Bot, Check, ChevronRight, PenLine, Shuffle, Sparkles, Users } from "lucide-react";
import { WhatIfRoomService } from "./what-if-room-service";
import { MAX_PLAYERS, MAX_TEXT, MIN_PLAYERS } from "../lib/what-if";
import { useEngineRoom } from "../lib/use-engine-room.js";
import { ChoiceModal, GameHeader, Hero, Landing, Lobby } from "./ui/table-shell";

const WRITING = new Set(["ifs", "thens"]);

/** A computer still has to write in this step; the view lists who is writing and who is done. */
function computerWriting(room) {
  if (!WRITING.has(room?.phase)) return null;
  const writers = new Set(room.writers || []);
  const submitted = new Set(room.submitted || []);
  return room.players.find((player) => player.isComputer && writers.has(player.id) && !submitted.has(player.id)) ?? null;
}

/**
 * What If (games/what-if). Everyone writes a "What if…"; each player then draws
 * one at random (maybe their own) and writes a "Then…" for it; finally the
 * THENs are dealt to the IFs at random and the host reads them out one by one.
 * The server never sends anyone else's words before the rules reveal them.
 */
export default function WhatIfClient() {
  const {
    room, playerId, name, setName, joinCode, setJoinCode,
    busy, error, createRoom, joinRoom, act, leaveRoom: leaveEngineRoom, computerSpeed,
  } = useEngineRoom({ service: WhatIfRoomService, storageKey: "what-if", computerDue: (current) => Boolean(computerWriting(current)) });
  const [showRules, setShowRules] = useState(false);
  const [text, setText] = useState("");
  const [editing, setEditing] = useState(false);

  // Each writing step starts with an empty box; a reload refills it from the server.
  const step = `${room?.round ?? 0}:${room?.phase ?? ""}`;
  const saved = room?.myText ?? "";
  useEffect(() => {
    setText(saved);
    setEditing(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);
  useEffect(() => {
    if (!editing && saved) setText(saved);
  }, [editing, saved]);

  const rulesDialog = showRules && <RulesModal onClose={() => setShowRules(false)} />;

  function leaveRoom() {
    if (WRITING.has(room?.phase) && text.trim() && !room?.myText
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
        copy="Everyone writes a What if. Draw one and answer it with a Then. We shuffle the Thens and read out the gloriously wrong results."
        badges={[
          { icon: Users, label: `${MIN_PLAYERS}–${MAX_PLAYERS} players` },
          { icon: PenLine, label: "Write your own" },
          { icon: Bot, label: "Computer players" },
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
    return <Lobby computerSpeed={computerSpeed}
      gameName="What If"
      theme="tbl-light what-if-theme"
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
      rules={rulesDialog}
    />;
  }

  const isHost = room.hostId === playerId;
  const nameOf = (id) => room.players.find((player) => player.id === id)?.name ?? "Someone";
  const writingComputer = computerWriting(room);
  const submittedCount = (room.submitted || []).length;
  const writerCount = (room.writers || []).length;
  const status = room.phase === "ifs"
    ? writingComputer && room.myText ? `${writingComputer.name} is writing…` : `What ifs: ${submittedCount} of ${writerCount}`
    : room.phase === "thens"
      ? writingComputer && room.myText ? `${writingComputer.name} is writing…` : `Thens: ${submittedCount} of ${writerCount}`
      : room.phase === "reveal"
        ? `Pair ${room.revealIndex + 1} of ${room.pairCount}`
        : "All read";

  return <main className="wi-game-shell tbl-light what-if-theme">
    <GameHeader computerSpeed={computerSpeed} title="What If" room={room} subtitle={`Round ${room.round}`} status={status} onRules={() => setShowRules(true)} onLeave={leaveRoom} />
    {error && <p className="wi-error" role="alert">{error}</p>}

    {WRITING.has(room.phase) && <WritingStage
      room={room}
      me={me}
      isHost={isHost}
      busy={busy}
      text={text}
      setText={setText}
      editing={editing || !room.myText}
      onEdit={() => setEditing(true)}
      onSubmit={async () => {
        const savedState = await act("submit", { text });
        if (savedState) setEditing(false);
      }}
      onContinue={() => act("continueNow")}
    />}

    {room.phase === "reveal" && <RevealStage room={room} isHost={isHost} busy={busy} nameOf={nameOf} onNext={() => act("next")} />}

    {room.phase === "done" && <DoneStage room={room} isHost={isHost} busy={busy} nameOf={nameOf} onAgain={() => act("playAgain")} />}

    {rulesDialog}
  </main>;
}

function WritingStage({ room, me, isHost, busy, text, setText, editing, onEdit, onSubmit, onContinue }) {
  const thenStep = room.phase === "thens";
  const writers = new Set(room.writers || []);
  const submitted = new Set(room.submitted || []);
  const writing = writers.has(me.id);
  const label = thenStep ? "Then…" : "What if…";
  const canContinue = isHost && submitted.size >= MIN_PLAYERS && submitted.size < writers.size;

  let panel;
  if (!writing) {
    panel = <div className="wi-write wi-sent">
      <p className="wi-kicker">Sitting this round out</p>
      <p className="wi-hint">The table moved on before your What if was in. You'll be dealt in next round.</p>
    </div>;
  } else if (!editing) {
    panel = <div className="wi-write wi-sent">
      <p className="wi-kicker"><Check aria-hidden="true" /> Submitted</p>
      {thenStep && room.myDraw && <SlipCard kind="if" text={room.myDraw.ifText} />}
      <SlipCard kind={thenStep ? "then" : "if"} text={room.myText} />
      <button type="button" className="tbl-link" onClick={onEdit}>Edit until everyone's in</button>
    </div>;
  } else {
    panel = <form className="wi-write" onSubmit={(event) => { event.preventDefault(); if (text.trim()) onSubmit(); }}>
      {thenStep && room.myDraw && <>
        <p className="wi-kicker"><Shuffle aria-hidden="true" /> You drew</p>
        <SlipCard kind="if" text={room.myDraw.ifText} />
      </>}
      <label className={`wi-slip ${thenStep ? "then" : "if"}`}>
        <span>{label}</span>
        <textarea
          value={text}
          maxLength={MAX_TEXT}
          rows={3}
          placeholder={thenStep ? "…what happens next?" : "…dogs could talk"}
          onChange={(event) => setText(event.target.value)}
        />
        <small>{text.length} / {MAX_TEXT}</small>
      </label>
      <button type="submit" className="tbl-primary wi-submit" disabled={busy || !text.trim()}>
        {room.myText ? "Update" : "Submit"} <ChevronRight aria-hidden="true" />
      </button>
    </form>;
  }

  return <section className="wi-stage">
    {panel}
    <aside className="wi-table" aria-label="Who has written">
      <p className="wi-kicker">{thenStep ? "Writing Thens" : "Writing What ifs"}</p>
      <ul>
        {room.players.filter((player) => writers.has(player.id)).map((player) => <li key={player.id} className={submitted.has(player.id) ? "done" : ""}>
          <span>{player.isComputer && <Bot aria-hidden="true" className="wi-bot" />}{player.name}{player.id === me.id ? " (you)" : ""}</span>
          {submitted.has(player.id) ? <Check aria-label="written" /> : <small>writing…</small>}
        </li>)}
      </ul>
      <p className="wi-hint">{thenStep
        ? "When every Then is in, they're shuffled onto the What ifs."
        : "When every What if is in, each player draws one at random."}</p>
      {canContinue && <button type="button" className="tbl-secondary wi-mix" disabled={busy} onClick={onContinue}>
        <Shuffle aria-hidden="true" /> Continue with {submitted.size}
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
  return <ChoiceModal wide title="Ask it. Answer it. Mix it." text={`A party game for ${MIN_PLAYERS}–${MAX_PLAYERS} players.`} onClose={onClose}>
    <div className="tbl-rule-grid">
      <article><b>Write a What if</b><p>Everyone secretly writes a “What if…”. Nobody sees anyone else’s.</p></article>
      <article><b>Draw and answer</b><p>Each player draws one of the What ifs at random — it might be their own — and writes a “Then…” for it.</p></article>
      <article><b>The mix</b><p>The Thens are shuffled and dealt back onto the What ifs at random, so most answers land on the wrong question.</p></article>
      <article><b>Read them all</b><p>The host shows the pairs one at a time until every one has been read. Then go again!</p></article>
    </div>
  </ChoiceModal>;
}
