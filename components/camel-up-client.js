"use client";

import { useEffect, useRef, useState } from "react";
import { Bot, Trophy, Users } from "lucide-react";
import { CamelUpRoomService } from "./camel-up-room-service.js";
import {
  MAX_PLAYERS,
  MIN_PLAYERS,
  currentPlayer,
  partnerRewardOptions,
  raceRanking,
} from "../lib/camel-up.js";
import { legalSpaces } from "../lib/camel-up-actions.js";
import { useEngineRoom } from "../lib/use-engine-room.js";
import { ChoiceModal, GameHeader, Hero, Landing, Lobby, Results } from "./ui/table-shell";
import { Board, Camel, OrderList } from "./camel-up-board.js";
import { ActionPanel } from "./camel-up-actions.js";
import { BetsPanel, Scoreboard } from "./camel-up-players.js";
import { DiceTray, FinishBetsModal, LegRecapModal, pendingRecap, recapStorageKey } from "./camel-up-recap.js";

export default function CamelUpClient() {
  // Leg recaps the host has not dismissed hold the computers so they cannot run past the dialog.
  const dismissedRef = useRef(0);
  const [dismissedLeg, setDismissedLeg] = useState(0);
  const [finalStep, setFinalStep] = useState(0);
  const {
    room, playerId, name, setName, joinCode, setJoinCode, busy, error,
    createRoom, joinRoom, act, stepComputer, leaveRoom: leaveEngineRoom, computerSpeed,
  } = useEngineRoom({
    service: CamelUpRoomService,
    storageKey: "camel-up",
    computerDue: (state) => Boolean(currentPlayer(state)?.isComputer) && !pendingRecap(state, dismissedRef.current),
  });
  const [showRules, setShowRules] = useState(false);
  const [action, setAction] = useState("roll");
  const [tileSide, setTileSide] = useState("cheer");
  const [tileSpace, setTileSpace] = useState(null);

  const me = room?.players?.find((player) => player.id === playerId) ?? null;

  function computerWaiting(state) {
    return state?.hostId === playerId && state.phase === "playing" && Boolean(currentPlayer(state)?.isComputer);
  }

  // A refreshed tab remembers which leg recap it already closed for this room.
  useEffect(() => {
    if (!room?.roomCode) return;
    let stored = 0;
    try { stored = Number(sessionStorage.getItem(recapStorageKey(room.roomCode))) || 0; } catch { /* no storage: show the recap again */ }
    const previous = dismissedRef.current;
    dismissedRef.current = stored;
    setDismissedLeg(stored);
    if (stored > previous && computerWaiting(room)) void stepComputer();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room?.roomCode]);

  useEffect(() => {
    if (room?.phase !== "finished") setFinalStep(0);
  }, [room?.phase]);

  // The turn moved on (or the tab changed): drop any half-made choice.
  const turnPlayerId = room ? currentPlayer(room)?.id : null;
  useEffect(() => {
    setAction("roll");
    setTileSpace(null);
  }, [turnPlayerId, room?.phase]);

  function cancelTile() {
    setTileSpace(null);
  }

  function dismissRecap(leg) {
    dismissedRef.current = leg;
    setDismissedLeg(leg);
    try { sessionStorage.setItem(recapStorageKey(room.roomCode), String(leg)); } catch { /* the dialog just reopens after a refresh */ }
    if (computerWaiting(room)) void stepComputer();
  }

  function leaveRoom() {
    if (room?.phase !== "lobby" && !window.confirm("Leave the race? You can rejoin with the room code.")) return;
    leaveEngineRoom();
  }

  if (!room || !me) {
    return <Landing
      gameName="Camel Up"
      theme="tbl-light camel-up-theme"
      hero={<Hero
        kicker="The wonderfully unpredictable camel race"
        title={<>Camel.<br /><em>Up!</em></>}
        copy="Back the leaders, bend the track, and watch seven stackable camels turn every sure bet upside down."
        badges={[
          { icon: Users, label: `${MIN_PLAYERS}–${MAX_PLAYERS} seats` },
          { icon: Bot, label: "Computer players" },
          { icon: Trophy, label: "Richest bettor wins" },
        ]}
        art={<HeroCamels />}
        artLayout="free"
      />}
      entry={{ name, setName, joinCode, setJoinCode, createRoom, joinRoom, busy, error }}
      onRules={() => setShowRules(true)}
      dialogs={showRules && <RulesModal onClose={() => setShowRules(false)} />}
    />;
  }

  if (room.phase === "lobby") {
    return <Lobby computerSpeed={computerSpeed}
      gameName="Camel Up"
      theme="tbl-light camel-up-theme"
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
      rules={showRules && <RulesModal onClose={() => setShowRules(false)} />}
    />;
  }

  const active = currentPlayer(room);
  const myTurn = room.phase === "playing" && active?.id === playerId;
  const myScoringChoice = room.phase === "partnership-scoring" && active?.id === playerId;
  const ranking = raceRanking(room);
  const placing = myTurn && action === "tile" ? { side: tileSide, space: tileSpace } : null;
  const legalSet = new Set(placing ? legalSpaces(room, playerId) : []);
  const status = room.phase === "finished"
    ? "Race finished"
    : room.phase === "partnership-scoring"
      ? `${active?.name} is choosing a partner ticket`
      : myTurn ? "Your turn — choose one action" : `${active?.name}'s turn`;

  return <main className="camel-game camel-up-theme">
    <GameHeader computerSpeed={computerSpeed} title="Camel Up" room={room} subtitle={`Leg ${room.leg} · private room`} status={status} onRules={() => setShowRules(true)} onLeave={leaveRoom} />
    {error && <p className="camel-error" role="alert">{error}</p>}

    <Scoreboard room={room} playerId={playerId} active={active} />

    <div className="camel-layout">
      <div className="camel-main">
        <DiceTray room={room} />
        <OrderList ranking={ranking} strip />
        <Board room={room} ranking={ranking} placing={placing} legalSet={legalSet} onPickSpace={setTileSpace} />
      </div>
      <BetsPanel room={room} me={me} />
    </div>

    {room.phase === "playing" && <ActionPanel
      room={room}
      me={me}
      active={active}
      busy={busy}
      act={act}
      action={action}
      setAction={setAction}
      tileSide={tileSide}
      setTileSide={setTileSide}
      tileSpace={tileSpace}
      onCancelTile={cancelTile}
    />}

    {showRules && <RulesModal onClose={() => setShowRules(false)} />}
    {myScoringChoice && <PartnershipModal room={room} me={me} busy={busy} choose={(choiceId) => act("choosePartnerTicket", { choiceId })} />}
    {room.phase === "playing" && pendingRecap(room, dismissedLeg) && <LegRecapModal recap={room.legRecap} onClose={() => dismissRecap(room.legRecap.leg)} />}
    {room.phase === "finished" && room.legRecap && finalStep === 0 && <LegRecapModal recap={room.legRecap} final onContinue={() => setFinalStep(1)} />}
    {room.phase === "finished" && room.legRecap && finalStep === 1 && <FinishBetsModal recap={room.legRecap} onContinue={() => setFinalStep(2)} />}
    {room.phase === "finished" && (finalStep >= 2 || !room.legRecap) && <RaceResults room={room} me={me} onLeave={leaveRoom} />}
  </main>;
}

function HeroCamels() {
  return <div className="camel-hero-art">{["purple", "yellow", "red", "blue"].map((id) => <Camel key={id} camelId={id} size="hero" />)}<span className="camel-hero-sun" /></div>;
}

function PartnershipModal({ room, me, busy, choose }) {
  const options = partnerRewardOptions(room, me.id);
  const partner = room.players.find((player) => player.id === me.partnerId);
  return <ChoiceModal title="Choose a partner ticket" text={`Copy one reward from ${partner?.name}, or decline.`}>
    <div className="camel-partner-options">{options.map((option) => <button type="button" disabled={busy} key={option.id} onClick={() => choose(option.id)}><strong>{option.label}</strong><span>{option.reward >= 0 ? "+" : ""}{option.reward} EP</span></button>)}</div>
    <button type="button" className="tbl-link" disabled={busy} onClick={() => choose(null)}>Copy no ticket</button>
  </ChoiceModal>;
}

function RulesModal({ onClose }) {
  return <ChoiceModal wide title="Camel Up — second edition" text="Race camels belong to nobody. Make the smartest bets before the pyramid changes everything." onClose={onClose}>
    <div className="tbl-rule-grid">
      <article><b>Choose one action</b><p>Take the top leg ticket, place or move your spectator tile, take a pyramid ticket and roll, or secretly bet on the overall winner or loser.</p></article>
      <article><b>Camels carry camels</b><p>A moving camel takes every camel above it. A unit landing on another stack goes on top; a booing tile moves it backward and underneath.</p></article>
      <article><b>Crazy camels run backward</b><p>Black and white move counterclockwise and can carry racing camels away from the finish. They never count in the racing order.</p></article>
      <article><b>Score each leg</b><p>The leading camel pays the printed ticket value, second pays 1 EP, and every other color costs 1 EP. Pyramid tickets pay 1 EP.</p></article>
      <article><b>Finish bets reward timing</b><p>Correct cards pay 8, 5, 3, 2, then 1 EP in placement order. Every incorrect card costs 1 EP.</p></article>
      <article><b>Six-plus partnerships</b><p>Spend a turn pairing with an available player. At leg end, each partner may copy one reward from the other's tickets.</p></article>
    </div>
  </ChoiceModal>;
}

function RaceResults({ room, me, onLeave }) {
  const ranking = [...room.players].sort((a, b) => b.money - a.money);
  const winners = ranking.filter((player) => room.winnerIds.includes(player.id));
  return <Results
    title={winners.length === 1 ? `${winners[0].name} wins!` : `${winners.map((player) => player.name).join(" & ")} tie!`}
    text="The richest bettor takes the desert crown."
    rows={ranking.map((player) => ({ id: player.id, name: `${player.name}${player.id === me.id ? " (you)" : ""}`, value: `${player.money} EP` }))}
  ><button type="button" className="tbl-primary" onClick={onLeave}>Back to Camel Up</button></Results>;
}
