"use client";

import { useMemo, useState } from "react";
import { Bot, Coins, Dices, Flag, Handshake, Trophy, Users } from "lucide-react";
import { CamelUpRoomService } from "./camel-up-room-service.js";
import {
  MAX_PLAYERS,
  MIN_PLAYERS,
  RACING_CAMELS,
  TRACK_SPACES,
  currentPlayer,
  legalSpectatorSpace,
  partnerRewardOptions,
  raceRanking,
} from "../lib/camel-up.js";
import { useEngineRoom } from "../lib/use-engine-room.js";
import { ChoiceModal, GameHeader, Hero, Landing, Lobby, Results } from "./ui/table-shell";

const CAMEL_LABELS = { blue: "Blue", green: "Green", purple: "Purple", red: "Red", yellow: "Yellow", black: "Black", white: "White" };

export default function CamelUpClient() {
  const {
    room, playerId, name, setName, joinCode, setJoinCode, busy, error,
    createRoom, joinRoom, act, leaveRoom: leaveEngineRoom,
  } = useEngineRoom({
    service: CamelUpRoomService,
    storageKey: "camel-up",
    computerDelay: 760,
    computerDue: (state) => Boolean(currentPlayer(state)?.isComputer),
  });
  const [showRules, setShowRules] = useState(false);
  const [spectatorSpace, setSpectatorSpace] = useState(2);
  const [spectatorSide, setSpectatorSide] = useState("cheer");
  const [finishCamel, setFinishCamel] = useState("blue");
  const [finishType, setFinishType] = useState("winner");
  const [partnerId, setPartnerId] = useState("");

  const me = room?.players?.find((player) => player.id === playerId) ?? null;

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
    return <Lobby
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
  const legalSpaces = Array.from({ length: TRACK_SPACES - 1 }, (_, index) => index + 2).filter((space) => legalSpectatorSpace(room, playerId, space));
  const availablePartners = room.players.filter((player) => player.id !== playerId && !player.partnerId);
  const status = room.phase === "finished"
    ? "Race finished"
    : room.phase === "partnership-scoring"
      ? `${active?.name} is choosing a partner ticket`
      : myTurn ? "Your turn — choose one action" : `${active?.name}'s turn`;

  return <main className="camel-game camel-up-theme">
    <GameHeader title="Camel Up" room={room} subtitle={`Leg ${room.leg} · private room`} status={status} onRules={() => setShowRules(true)} onLeave={leaveRoom} />
    {error && <p className="camel-error" role="alert">{error}</p>}

    <section className="camel-scoreboard" aria-label="Bettors">
      {room.players.map((player) => <article className={`camel-player ${player.id === playerId ? "mine" : ""} ${active?.id === player.id ? "active" : ""}`} key={player.id}>
        <span className="camel-avatar">{player.isComputer ? <Bot /> : player.name.slice(0, 1).toUpperCase()}</span>
        <div><strong>{player.name}{player.id === playerId ? " (you)" : ""}</strong><small>{player.partnerId ? `Partnered with ${room.players.find((item) => item.id === player.partnerId)?.name}` : `${player.legTickets.length} leg bet${player.legTickets.length === 1 ? "" : "s"}`}</small></div>
        <b><Coins /> {player.money}</b>
      </article>)}
    </section>

    <section className="camel-table">
      <div className="camel-track" aria-label="Sixteen-space camel racetrack">
        {Array.from({ length: TRACK_SPACES }, (_, index) => index + 1).map((space) => <TrackSpace key={space} space={space} stack={room.stacks[String(space)] || []} tile={room.players.find((player) => player.spectator?.space === space)} />)}
        <div className="camel-center">
          <div className="camel-pyramid"><Dices /><strong>{room.remainingDice.length}</strong><span>dice inside</span></div>
          <ol className="camel-ranking" aria-label="Current racing order">
            {ranking.map((camelId, index) => <li key={camelId}><b>{index + 1}</b><Camel camelId={camelId} /> {CAMEL_LABELS[camelId]}</li>)}
          </ol>
          {room.lastRoll && <p className="camel-last" role="status">Last roll: {CAMEL_LABELS[room.lastRoll.camelId]} moved {room.lastRoll.value}</p>}
        </div>
      </div>

      <aside className="camel-bets">
        <header><span><Flag /> Leg bets</span><small>First / second / other</small></header>
        <div className="camel-ticket-grid">
          {RACING_CAMELS.map((camelId) => {
            const stack = room.legBetStacks[camelId] || [];
            return <button key={camelId} disabled={!myTurn || busy || !stack.length} onClick={() => act("takeLegTicket", { camelId })}>
              <Camel camelId={camelId} /><span>{CAMEL_LABELS[camelId]}</span><b>{stack.at(-1) ?? "—"}</b><small>{stack.length} left</small>
            </button>;
          })}
        </div>
        <div className="camel-overall">
          {(["winner", "loser"]).map((type) => <div key={type}><strong>Overall {type}</strong><span>{room.finishBets[type].map((bet, index) => <i key={`${bet.playerId}-${index}`} title={bet.camelId ? CAMEL_LABELS[bet.camelId] : "Hidden camel"}>{bet.camelId ? bet.camelId.slice(0, 1).toUpperCase() : "?"}</i>)}</span></div>)}
        </div>
        <div className="camel-log">{room.log.slice(0, 7).map((line, index) => <p key={`${line}-${index}`}>{line}</p>)}</div>
      </aside>
    </section>

    {room.phase === "playing" && <section className={`camel-actions ${myTurn ? "ready" : ""}`} aria-label="Turn actions">
      <div><strong>{myTurn ? "Choose one action" : `Waiting for ${active?.name}`}</strong><small>Every bet, tile, or pyramid roll uses your whole turn.</small></div>
      <button className="camel-roll" disabled={!myTurn || busy || room.pyramidTicketsTaken >= 5} onClick={() => act("rollPyramid")}><Dices /> Roll pyramid <small>{5 - room.pyramidTicketsTaken} ticket{5 - room.pyramidTicketsTaken === 1 ? "" : "s"} left</small></button>
      <fieldset disabled={!myTurn || busy || !legalSpaces.length}>
        <legend>Spectator tile</legend>
        <select aria-label="Spectator space" value={legalSpaces.includes(spectatorSpace) ? spectatorSpace : legalSpaces[0] ?? 2} onChange={(event) => setSpectatorSpace(Number(event.target.value))}>{legalSpaces.map((space) => <option key={space} value={space}>Space {space}</option>)}</select>
        <select aria-label="Spectator side" value={spectatorSide} onChange={(event) => setSpectatorSide(event.target.value)}><option value="cheer">Cheer +1</option><option value="boo">Boo −1</option></select>
        <button type="button" onClick={() => act("placeSpectator", { space: legalSpaces.includes(spectatorSpace) ? spectatorSpace : legalSpaces[0], side: spectatorSide })}>Place tile</button>
      </fieldset>
      <fieldset disabled={!myTurn || busy || !me.finishCards.length}>
        <legend>Secret finish bet</legend>
        <select aria-label="Finish camel" value={me.finishCards.includes(finishCamel) ? finishCamel : me.finishCards[0] ?? "blue"} onChange={(event) => setFinishCamel(event.target.value)}>{me.finishCards.map((camelId) => <option key={camelId} value={camelId}>{CAMEL_LABELS[camelId]}</option>)}</select>
        <select aria-label="Finish bet type" value={finishType} onChange={(event) => setFinishType(event.target.value)}><option value="winner">Winner</option><option value="loser">Loser</option></select>
        <button type="button" onClick={() => act("placeFinishBet", { bet: finishType, camelId: me.finishCards.includes(finishCamel) ? finishCamel : me.finishCards[0] })}>Place secret bet</button>
      </fieldset>
      {room.players.length >= 6 && !me.partnerId && <fieldset disabled={!myTurn || busy || !availablePartners.length}>
        <legend>Betting partnership</legend>
        <select aria-label="Betting partner" value={availablePartners.some((player) => player.id === partnerId) ? partnerId : availablePartners[0]?.id ?? ""} onChange={(event) => setPartnerId(event.target.value)}>{availablePartners.map((player) => <option key={player.id} value={player.id}>{player.name}</option>)}</select>
        <button type="button" onClick={() => act("formPartnership", { partnerId: availablePartners.some((player) => player.id === partnerId) ? partnerId : availablePartners[0]?.id })}><Handshake /> Partner</button>
      </fieldset>}
    </section>}

    {showRules && <RulesModal onClose={() => setShowRules(false)} />}
    {myScoringChoice && <PartnershipModal room={room} me={me} busy={busy} choose={(choiceId) => act("choosePartnerTicket", { choiceId })} />}
    {room.phase === "finished" && <RaceResults room={room} me={me} onLeave={leaveRoom} />}
  </main>;
}

function TrackSpace({ space, stack, tile }) {
  return <div className={`camel-space space-${space}`} aria-label={`Space ${space}: ${stack.length ? stack.map((id) => CAMEL_LABELS[id]).join(", ") : "empty"}`}>
    <small>{space}{space === 16 ? " · finish" : ""}</small>
    <div className="camel-stack">{stack.map((camelId, index) => <Camel camelId={camelId} key={`${camelId}-${index}`} />)}</div>
    {tile && <span className={`camel-spectator ${tile.spectator.side}`}>{tile.spectator.side === "cheer" ? "+1" : "−1"}</span>}
  </div>;
}

function Camel({ camelId }) {
  return <span className={`camel-piece camel-${camelId}`} title={`${CAMEL_LABELS[camelId]} camel`} aria-label={`${CAMEL_LABELS[camelId]} camel`}><i /><i /></span>;
}

function HeroCamels() {
  return <div className="camel-hero-art">{["purple", "yellow", "red", "blue"].map((id) => <Camel key={id} camelId={id} />)}<span className="camel-hero-sun" /></div>;
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
