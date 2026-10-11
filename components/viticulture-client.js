"use client";

import { useEffect, useRef, useState } from "react";
import { Bot, ScrollText, Users, Wine, X } from "lucide-react";

import { useEngineRoom } from "../lib/use-engine-room.js";
import { GameHeader, Hero, Landing as SharedLanding, Lobby as SharedLobby, Results as SharedResults } from "./ui/table-shell";
import { canUseAction, currentPlayer } from "../lib/viticulture.js";
import { ViticultureRoomService } from "./viticulture-room-service";
import ActionPanel, { payloadValid } from "./viticulture/action-panel.js";
import AutumnPanel from "./viticulture/autumn.js";
import { ActionSpaces, DeckRow, PassControl, WakeChart } from "./viticulture/board.js";
import Dock from "./viticulture/dock.js";
import { MotionLayer, useFreshCards, useReplay } from "./viticulture/motion.js";
import { NEEDS_CHOICE, SEASONS, handCards } from "./viticulture/pieces.js";
import RecapSheet from "./viticulture/recap.js";
import RulesDrawer from "./viticulture/rules.js";
import PlayerStrip from "./viticulture/strip.js";

const THEME = "tbl-light viticulture-theme";

/** The card you have picked decides which action it belongs to. */
function preselect(actionId, selected) {
  if (!selected || selected.kind.actionId !== actionId) return {};
  return selected.kind.id === "orders" ? { orderId: selected.card.uid } : { cardId: selected.card.uid };
}

/** A computer is due when it is a computer's turn and nobody owes an autumn choice. */
const computerIsDue = (room) => room.phase === "playing" && !room.pending && Boolean(currentPlayer(room)?.isComputer);

export default function ViticultureClient() {
  const {
    room, playerId, name, setName, joinCode, setJoinCode,
    busy, error, setError, createRoom, joinRoom, act, computerSpeed, computerWaiting, leaveRoom: leaveEngineRoom,
  } = useEngineRoom({ service: ViticultureRoomService, storageKey: "viticulture", computerDue: computerIsDue });
  const [pick, setPick] = useState(null);
  const [selected, setSelected] = useState(null);
  const [showRules, setShowRules] = useState(false);
  const [showLog, setShowLog] = useState(false);
  const [showRecap, setShowRecap] = useState(false);
  const seenRecap = useRef({ code: null, year: 0 });

  const me = room?.players.find((player) => player.id === playerId) ?? null;
  const actor = room && room.phase === "playing" ? currentPlayer(room) : null;
  const myTurn = Boolean(room && room.phase === "playing" && !room.pending && actor?.id === playerId);

  const motion = useReplay(room);
  const freshCards = useFreshCards(me);

  useEffect(() => setPick(null), [room?.season, room?.turnCursor, room?.year]);
  useEffect(() => setSelected(null), [room?.season, room?.year]);

  // Year end is one step with no pause, so it shows as a sheet: opened when a
  // new recap appears, never when you arrive in a game that already has one.
  useEffect(() => {
    if (!room) return;
    const year = room.yearRecap?.year ?? 0;
    const seen = seenRecap.current;
    seenRecap.current = { code: room.roomCode, year };
    if (seen.code !== room.roomCode) return; // arriving: show the present, not last year
    if (year > seen.year && room.phase !== "finished") setShowRecap(true);
  }, [room?.roomCode, room?.yearRecap?.year]);

  // A tab you are not looking at can still say it is your turn.
  useEffect(() => {
    if (!myTurn && !(room?.pending?.waitingOn ?? []).includes(playerId)) return undefined;
    const before = document.title;
    document.title = `● Your move · ${before.replace(/^● Your move · /, "")}`;
    return () => { document.title = before; };
  }, [myTurn, room?.pending, playerId]);

  function leaveRoom() {
    if (room?.phase !== "lobby" && !window.confirm("Leave this vineyard? You can return later with the room code.")) return;
    leaveEngineRoom();
    setPick(null);
    setSelected(null);
    setError("");
  }

  if (!room || !me) {
    return <SharedLanding
      gameName="Viticulture"
      theme={THEME}
      hero={<Hero
        kicker="A Tuscan worker-placement game"
        title={<>Grow a legacy,<br /><em>one vintage at a time.</em></>}
        copy="Plant your fields, welcome visitors, age remarkable wines, and build the most celebrated estate in the valley."
        badges={[{ icon: Users, label: "2-6 vintners" }, { icon: Bot, label: "Computer rivals" }, { icon: Wine, label: "Race to 20 VP" }]}
        backdrop={<><div className="viti-hero-sun" /><div className="viti-hills viti-hill-one" /><div className="viti-hills viti-hill-two" /><div className="viti-vine-lines">{Array.from({ length: 8 }, (_, index) => <i key={index} />)}</div></>}
      />}
      entry={{ name, setName, joinCode, setJoinCode, createRoom, joinRoom, busy, error }}
      onRules={() => setShowRules(true)}
      dialogs={showRules && <RulesDrawer onClose={() => setShowRules(false)} />}
    />;
  }
  if (room.phase === "lobby") {
    return <SharedLobby
      gameName="Viticulture"
      theme={THEME}
      room={room}
      me={me}
      busy={busy}
      error={error}
      min={2}
      max={6}
      computerSpeed={computerSpeed}
      onAdd={() => act("addComputer")}
      onRemove={(id) => act("removeComputer", { playerId: id })}
      onStart={() => act("start")}
      onLeave={leaveRoom}
      onRules={() => setShowRules(true)}
      rules={showRules && <RulesDrawer onClose={() => setShowRules(false)} />}
    />;
  }

  const season = SEASONS[room.season];
  const SeasonIcon = season.icon;
  const waitingOn = room.pending?.waitingOn ?? [];
  const live = selected && handCards(me).find(({ card }) => card.uid === selected.card.uid) ? selected : null;
  const suggestedId = myTurn && live && live.kind.season === room.season && canUseAction(room, playerId, live.kind.actionId, "regular") ? live.kind.actionId : null;

  const status = room.phase === "finished" ? "Vintage complete"
    : room.pending ? `Autumn · ${waitingOn.includes(playerId) ? "Choose a visitor" : `waiting on ${room.players.filter((player) => waitingOn.includes(player.id)).map((player) => player.name).join(", ")}`}`
    : `${season.label} · ${myTurn ? "Your move" : computerWaiting && actor?.isComputer ? `${actor.name} is planning...` : `${actor?.name}'s move`}`;

  function submit(actionId, payload, workerType) {
    act("action", { actionId, payload, workerType });
    setPick(null);
    setSelected(null);
  }

  function onSpace(space, workerType) {
    if (!NEEDS_CHOICE.has(space.id)) { submit(space.id, {}, workerType); return; }
    const payload = preselect(space.id, live);
    if (payloadValid(space.id, payload) && space.id !== "plant") { submit(space.id, payload, workerType); return; }
    setPick({ action: space, workerType, payload });
  }

  return <main className={`viti-shell ${THEME} season-${room.season}`}>
    <GameHeader
      title="Viticulture"
      room={room}
      subtitle={`Room ${room.roomCode} · Vintage ${room.year}`}
      status={status}
      computerSpeed={computerSpeed}
      onRules={() => setShowRules(true)}
      onLeave={leaveRoom}
    />

    {error && <div className="viti-error" role="alert">{error}<button type="button" aria-label="Dismiss" onClick={() => setError("")}><X aria-hidden="true" /></button></div>}

    <div className="viti-table">
      <PlayerStrip room={room} playerId={playerId} actorId={actor?.id} />

      <section className="viti-stage" aria-label="Shared board">
        <header className="viti-stage-head">
          <span className="viti-season"><SeasonIcon aria-hidden="true" /><span><small>Year {room.year}</small><strong>{season.label}</strong></span></span>
          <p>{season.note}</p>
          <span className="viti-stage-tools">
            {(room.season === "summer" || room.season === "winter") && !room.pending && <PassControl room={room} me={me} myTurn={myTurn} busy={busy} onPass={() => act("pass")} />}
            <button type="button" className="viti-tool" aria-expanded={showLog} onClick={() => setShowLog((open) => !open)}><ScrollText aria-hidden="true" /> Log</button>
          </span>
        </header>

        {showLog && <div className="viti-log" role="log" aria-label="Recent moves">
          {room.log.slice(0, 9).map((line, index) => <p key={`${line}-${index}`}>{line}</p>)}
          {room.yearRecap && <button type="button" className="viti-tool" onClick={() => setShowRecap(true)}>Last year&rsquo;s recap</button>}
        </div>}

        {room.season === "spring" && <WakeChart room={room} myTurn={myTurn} busy={busy} onChoose={(row) => act("wakeUp", { row })} />}
        {room.season === "autumn" && <AutumnPanel room={room} me={me} busy={busy} onDecide={(choice) => act("decide", { choice })} />}
        {(room.season === "summer" || room.season === "winter") && <ActionSpaces room={room} playerId={playerId} myTurn={myTurn} busy={busy} suggestedId={suggestedId} onSpace={onSpace} />}

        {pick && <ActionPanel room={room} player={me} pick={pick} busy={busy} onChange={setPick} onCancel={() => setPick(null)} onSubmit={() => submit(pick.action.id, pick.payload, pick.workerType)} />}

        <DeckRow room={room} />
      </section>

      <Dock room={room} player={me} selected={live} onSelect={setSelected} freshUids={freshCards} />
    </div>

    <MotionLayer banner={motion.banner} floaters={motion.floaters} />
    {showRules && <RulesDrawer onClose={() => setShowRules(false)} />}
    {showRecap && <RecapSheet room={room} playerId={playerId} onClose={() => setShowRecap(false)} />}
    {room.phase === "finished" && <Results room={room} playerId={playerId} onLeave={leaveRoom} />}
  </main>;
}

function Results({ room, playerId, onLeave }) {
  const wineValue = (player) => Object.values(player.wines).flat().reduce((sum, value) => sum + value, 0);
  const ranked = [...room.players].sort((a, b) => b.score - a.score || b.coins - a.coins || wineValue(b) - wineValue(a));
  const won = room.winners.includes(playerId);
  return <SharedResults
    title={won ? "Your estate is legendary" : `${ranked[0].name} wins the valley`}
    text="Victory points decide the winner, followed by coins and wine value."
    rows={ranked.map((player) => ({ id: player.id, name: `${player.name}${player.id === playerId ? " (you)" : ""}`, value: `${player.score} VP`, note: `${player.coins} coins · ${wineValue(player)} wine value` }))}
  >
    <button type="button" className="tbl-primary" onClick={onLeave}>Return to the estate gates</button>
  </SharedResults>;
}
