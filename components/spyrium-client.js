"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Bot,
  Check,
  ChevronRight,
  Coins,
  Crown,
  Factory,
  FlaskConical,
  Gem,
  History,
  House,
  Plus,
  ScrollText,
  Sparkles,
  UserRound,
  Users,
  Wrench,
  X,
  Zap,
} from "lucide-react";
import { SpyriumRoomService } from "./spyrium-room-service";
import {
  RESIDENCE_VALUES,
  activationCost,
  canUseBuilding,
  currentPlayer,
  marketSlots,
  playerMarketWorkers,
  projectedFinalScore,
  techniqueEndScore,
  workerAdjacentCardIndexes,
} from "../lib/spyrium";
import { useEngineRoom } from "../lib/use-engine-room.js";
import { ChoiceModal, GameHeader, Hero, Landing as SharedLanding, Lobby as SharedLobby, Results as SharedResults } from "./ui/table-shell";

const playerIdKey = "spyrium-player-id";
const playerNameKey = "spyrium-player-name";

export default function SpyriumClient() {
  const {
    room, playerId, name, setName, joinCode, setJoinCode,
    busy, error, setError, createRoom, joinRoom, act, stepComputer, leaveRoom: leaveEngineRoom,
  } = useEngineRoom({ service: SpyriumRoomService, storageKey: "spyrium" });
  const [showRules, setShowRules] = useState(false);
  const [selectedWorker, setSelectedWorker] = useState(null);
  const [selectedCard, setSelectedCard] = useState(null);
  const [actionCard, setActionCard] = useState(null);
  const [computerThinking, setComputerThinking] = useState(false);

  const me = room?.players.find((player) => player.id === playerId) ?? null;
  const actor = room ? currentPlayer(room) : null;
  const botNeedsAction = room?.phase === "playing" && actor?.isComputer;

  useEffect(() => {
    if (!room || room.hostId !== playerId || !botNeedsAction) { setComputerThinking(false); return undefined; }
    let cancelled = false;
    setComputerThinking(true);
    const timer = window.setTimeout(async () => {
      try { await stepComputer(); }
      finally { if (!cancelled) setComputerThinking(false); }
    }, 620);
    return () => { cancelled = true; window.clearTimeout(timer); };
  }, [botNeedsAction, actor?.id, playerId, room?.updatedAt]);

  useEffect(() => { setSelectedWorker(null); setSelectedCard(null); setActionCard(null); }, [room?.currentPlayerIndex, room?.round]);

  function leaveRoom() {
    if (room?.phase !== "lobby" && !window.confirm("Leave this industrial concern? You can return later with the same room code.")) return;
    leaveEngineRoom(); setError(""); setSelectedWorker(null); setSelectedCard(null);
  }

  if (!room || !me) {
    return <SharedLanding
      gameName="Spyrium"
      theme="tbl-light spyrium-theme"
      hero={<Hero
        kicker="A Victorian worker-placement game"
        title={<>SPYR<em>IUM</em></>}
        copy="Mine a miraculous crystal. Recruit brilliant minds. Build an industrial empire in the smoke and splendor of an alternate London."
        badges={[{ icon: Users, label: "2–5 players" }, { icon: Bot, label: "Computer rivals" }, { icon: History, label: "Six rounds" }]}
        artLayout="free"
        art={<div className="spyrium-machine"><div className="spyrium-orbit spy-orbit-one" /><div className="spyrium-orbit spy-orbit-two" /><div className="spyrium-core"><Gem /></div><Factory className="spyrium-skyline" /><i /><i /><i /></div>}
      />}
      entry={{ name, setName, joinCode, setJoinCode, createRoom, joinRoom, busy, error }}
      onRules={() => setShowRules(true)}
      dialogs={showRules && <RulesDrawer onClose={() => setShowRules(false)} />}
    />;
  }
  if (room.phase === "lobby") {
    return <SharedLobby
      gameName="Spyrium"
      theme="tbl-light spyrium-theme"
      room={room}
      me={me}
      busy={busy}
      error={error}
      min={2}
      max={5}
      onAdd={() => act("addComputer")}
      onRemove={(id) => act("removeComputer", { playerId: id })}
      onStart={() => act("start")}
      onLeave={leaveRoom}
      onRules={() => setShowRules(true)}
      rules={showRules && <RulesDrawer onClose={() => setShowRules(false)} />}
    />;
  }

  const myTurn = room.phase === "playing" && actor?.id === playerId;
  const activation = myTurn && me.phase === "activation";

  function selectWorker(worker, slotId) {
    if (!activation || worker.playerId !== playerId) return;
    setSelectedWorker(selectedWorker?.id === worker.id ? null : { ...worker, slotId });
    setSelectedCard(null);
  }

  function selectCard(index) {
    if (!selectedWorker || !workerAdjacentCardIndexes(room, selectedWorker.slotId, selectedWorker).includes(index)) return;
    setSelectedCard(selectedCard === index ? null : index);
  }

  function activate(options = {}) {
    if (!selectedWorker || selectedCard == null) return;
    act("activate", { workerId: selectedWorker.id, cardIndex: selectedCard, options });
  }

  return <main className="spyrium-game-shell tbl-light spyrium-theme">
    <GameHeader
      title="Spyrium"
      room={room}
      subtitle={`Round ${room.round} / 6 · Period ${room.period}`}
      status={room.phase === "finished" ? "Industry closes" : myTurn ? `Your ${me.phase} phase` : computerThinking && actor?.isComputer ? `${actor.name} is calculating…` : `${actor?.name}'s turn`}
      onRules={() => setShowRules(true)}
      onLeave={leaveRoom}
    />

    {error && <div className="spyrium-error" role="alert">{error}<button aria-label="Dismiss" onClick={() => setError("")}><X /></button></div>}

    <div className="spyrium-layout">
      <aside className="spyrium-sidebar">
        <PanelTitle icon={<Users />} eyebrow="The consortium" title="Industrialists" />
        <div className="spyrium-player-list">{room.players.map((player, index) => <PlayerSummary key={player.id} player={player} active={actor?.id === player.id && room.phase !== "finished"} isMe={player.id === playerId} isFirst={index === room.firstPlayerIndex} winner={room.winners.includes(player.id)} />)}</div>
        <div className="spyrium-track"><div><House /><span><small>Residence income</small><b>£{RESIDENCE_VALUES[me.residence]}</b></span></div><div className="spyrium-track-steps">{RESIDENCE_VALUES.map((value, index) => <i className={index === me.residence ? "active" : index < me.residence ? "passed" : ""} key={value}>{value}</i>)}</div></div>
        <div className="spyrium-log"><PanelTitle icon={<History />} eyebrow="Latest moves" title="Chronicle" />{room.log.slice(0, 7).map((line, index) => <p key={`${line}-${index}`}>{line}</p>)}</div>
      </aside>

      <section className="spyrium-board">
        <div className="spyrium-event-row">
          <EventCard event={room.currentEvent} current used={me.eventUsed} disabled={!myTurn || busy} onUse={() => setActionCard({ kind: "event", event: room.currentEvent })} />
          <div className="spyrium-event-arrow"><ChevronRight /></div>
          <EventCard event={room.futureEvent} />
        </div>

        <div className="spyrium-market-heading"><div><p className="spyrium-kicker">Period {room.period} market</p><h2>The London Exchange</h2></div><p>{myTurn ? me.phase === "placement" ? "Place an active worker between two cards, or enter activation." : selectedWorker ? "Choose an adjacent card to activate—or withdraw for money." : "Select one of your green workers in the market." : "Watch the active industrialist shape the market."}</p></div>
        <Market room={room} me={me} myTurn={myTurn} busy={busy} selectedWorker={selectedWorker} selectedCard={selectedCard} onPlace={(slotId) => act("place", { slotId })} onWorker={selectWorker} onCard={selectCard} />

        {myTurn && <div className="spyrium-action-bar">
          {me.phase === "placement" ? <>
            <span><UserRound /> {me.activeWorkers} active worker{me.activeWorkers === 1 ? "" : "s"}</span>
            <button className="spyrium-primary" disabled={busy} onClick={() => act("beginActivation")}><Zap /> Begin activation</button>
          </> : <>
            <span>{selectedWorker ? <><Check /> Worker selected</> : <><UserRound /> {playerMarketWorkers(room, playerId)} in market</>}</span>
            {selectedWorker && selectedCard != null && <>
              <button onClick={() => act("gainMoney", { workerId: selectedWorker.id, cardIndex: selectedCard })}><Coins /> Withdraw for £{Math.max(0, activationCost(room, playerId, selectedWorker.id, selectedCard)?.congestion || 0) + (me.techniques.some((card) => card.slug === "capitalization") ? 2 : 0)}</button>
              <button className="spyrium-primary" onClick={() => setActionCard({ kind: "market", card: room.market[selectedCard] })}><Wrench /> Activate card</button>
            </>}
            {!playerMarketWorkers(room, playerId) && <button className="spyrium-pass" onClick={() => act("pass")}>Pass round <ChevronRight /></button>}
          </>}
        </div>}
      </section>

      <aside className="spyrium-neighborhood">
        <PanelTitle icon={<Factory />} eyebrow="Your company" title="Neighborhood" />
        <div className="spyrium-resource-bank"><Resource icon={<Coins />} value={`£${me.money}`} label="Capital" /><Resource icon={<Gem />} value={me.spyrium} label="Spyrium" /><Resource icon={<Crown />} value={me.score} label="Victory" /><Resource icon={<UserRound />} value={`${me.activeWorkers}/${me.totalWorkers}`} label="Workers" /></div>
        <div className="spyrium-estate-section"><h3>Buildings <small>{me.buildings.length}</small></h3>{me.buildings.length ? <div className="spyrium-building-list">{me.buildings.map((building) => <OwnedBuilding key={building.id} building={building} player={me} disabled={!activation || busy} onUse={(actionIndex, options) => act("useBuilding", { buildingId: building.id, actionIndex, options })} />)}</div> : <EmptyState icon={<Factory />} text="Construct market buildings to grow your neighborhood." />}</div>
        <div className="spyrium-estate-section"><h3>Techniques <small>{me.techniques.length}</small></h3>{me.techniques.length ? <div className="spyrium-technique-list">{me.techniques.map((technique) => <article key={technique.id}><FlaskConical /><div><strong>{technique.name}</strong><small>{technique.description}</small></div><b>+{techniqueEndScore(me, technique)}</b></article>)}</div> : <EmptyState icon={<FlaskConical />} text="Patent techniques for lasting advantages and end-game points." />}</div>
        <div className="spyrium-projection"><span>Projected final score</span><strong>{projectedFinalScore(me)} VP</strong></div>
      </aside>
    </div>

    {actionCard?.kind === "market" && <MarketActionModal room={room} player={me} worker={selectedWorker} cardIndex={selectedCard} card={actionCard.card} busy={busy} onClose={() => setActionCard(null)} onActivate={(options) => { activate(options); setActionCard(null); }} />}
    {actionCard?.kind === "event" && <EventModal event={actionCard.event} player={me} slots={marketSlots()} onClose={() => setActionCard(null)} onUse={(options) => { act("useEvent", { options }); setActionCard(null); }} />}
    {room.pendingBonus?.playerId === playerId && <BonusModal player={me} onChoose={(choice) => act("bonus", { choice })} />}
    {showRules && <RulesDrawer onClose={() => setShowRules(false)} />}
    {room.phase === "finished" && <Results room={room} playerId={playerId} onLeave={leaveRoom} />}
  </main>;
}

function PanelTitle({ icon, eyebrow, title }) { return <div className="spyrium-panel-title">{icon}<span><small>{eyebrow}</small><strong>{title}</strong></span></div>; }
function Resource({ icon, value, label }) { return <div>{icon}<strong>{value}</strong><small>{label}</small></div>; }
function EmptyState({ icon, text }) { return <div className="spyrium-empty">{icon}<p>{text}</p></div>; }

function PlayerSummary({ player, active, isMe, isFirst, winner }) {
  return <article className={`spyrium-player ${active ? "active" : ""} ${winner ? "winner" : ""}`}><span className="spyrium-avatar" style={{ "--player": player.color }}>{player.isComputer ? <Bot /> : player.name[0]}</span><div><strong>{player.name}{isMe ? " (you)" : ""}</strong><small>{player.isComputer ? "Automaton · " : ""}£{player.money} · {player.spyrium} crystal{player.spyrium === 1 ? "" : "s"}</small><span><i>{player.buildings.length} B</i><i>{player.techniques.length} T</i><i>{player.totalWorkers} W</i></span></div><b>{player.finalScore ?? player.score}<small>VP</small></b>{isFirst && <Crown className="spyrium-first" />}</article>;
}

function EventCard({ event, current, used, disabled, onUse }) {
  if (!event) return <article className="spyrium-event future empty"><small>No future event</small></article>;
  return <article className={`spyrium-event ${current ? "current" : "future"} ${used ? "used" : ""}`}><div><Sparkles /><span><small>{current ? "This round" : "Future event"}</small><strong>{event.name}</strong></span>{event.value && <b>{event.value}</b>}</div><p>{event.description}</p>{current && <button disabled={disabled || used} onClick={onUse}>{used ? <><Check /> Used this round</> : <>Use event <ChevronRight /></>}</button>}</article>;
}

function Market({ room, me, myTurn, busy, selectedWorker, selectedCard, onPlace, onWorker, onCard }) {
  const slots = useMemo(() => marketSlots(), []);
  const position = (slot) => {
    const [, row, column] = slot.id.split("-").map((value, index) => index ? Number(value) : value);
    if (slot.id.startsWith("h")) return { gridRow: row * 2 + 1, gridColumn: column * 2 + 2 };
    return { gridRow: row * 2 + 2, gridColumn: column * 2 + 1 };
  };
  return <div className="spyrium-market-grid">{room.market.map((card, index) => <MarketCard key={card?.id || `empty-${index}`} card={card} index={index} selected={selectedCard === index} adjacent={Boolean(selectedWorker && workerAdjacentCardIndexes(room, selectedWorker.slotId, selectedWorker).includes(index))} onClick={() => onCard(index)} />)}{slots.map((slot) => <WorkerSlot key={slot.id} slot={slot} workers={room.workerSlots[slot.id]} players={room.players} style={position(slot)} disabled={!myTurn || busy || me.phase !== "placement" || me.activeWorkers < 1 || !slot.cards.some((index) => room.market[index])} onPlace={() => onPlace(slot.id)} onWorker={(worker) => onWorker(worker, slot.id)} selectedWorker={selectedWorker} />)}</div>;
}

function CardIcon({ type }) { return type === "building" ? <Factory /> : type === "technique" ? <FlaskConical /> : <UserRound />; }
function Symbol({ name }) { return <i title={name}>{name === "mine" ? <Gem /> : name === "factory" ? <Factory /> : name === "research" ? <FlaskConical /> : <House />}</i>; }

function MarketCard({ card, index, selected, adjacent, onClick }) {
  if (!card) return <div className="spyrium-market-card empty" style={{ gridArea: `${Math.floor(index / 3) * 2 + 1} / ${(index % 3) * 2 + 1}` }}><span>Sold</span></div>;
  const art = card.art || `/spyrium/cards/${card.period.toLowerCase()}-${card.slug}.png`;
  return <button className={`spyrium-market-card ${card.type} ${selected ? "selected" : ""} ${adjacent ? "adjacent" : ""}`} style={{ gridArea: `${Math.floor(index / 3) * 2 + 1} / ${(index % 3) * 2 + 1}` }} onClick={onClick}><div className="spyrium-card-top"><span><CardIcon type={card.type} /><small>{card.type}</small></span><b>£{card.price}</b></div><div className="spyrium-card-art"><img src={art} alt="" draggable="false" /></div><h3>{card.name}</h3><p>{card.description}</p><footer>{card.symbols?.length ? <span>{card.symbols.map((symbol) => <Symbol key={symbol} name={symbol} />)}</span> : <span />}{card.points > 0 && <b><Crown /> {card.points}</b>}{card.tokens?.length > 0 && <em>{card.tokens.map((token, tokenIndex) => <i key={tokenIndex}>{token}</i>)}</em>}</footer></button>;
}

function WorkerSlot({ slot, workers, players, style, disabled, onPlace, onWorker, selectedWorker }) {
  return <div className={`spyrium-worker-slot ${slot.id.startsWith("v") ? "vertical" : "horizontal"}`} style={style}><div className="spyrium-worker-pile">{workers.map((worker) => { const player = players.find((item) => item.id === worker.playerId); return <button className={`spyrium-worker ${selectedWorker?.id === worker.id ? "selected" : ""}`} style={{ "--worker": player?.color }} title={`${player?.name}'s worker`} key={worker.id} onClick={() => onWorker(worker)}><UserRound /></button>; })}</div><button className="spyrium-place-worker" disabled={disabled} onClick={onPlace} aria-label={workers.length ? "Place another worker here" : "Place worker here"}><Plus /></button></div>;
}

function OwnedBuilding({ building, player, disabled, onUse }) {
  const mayTaylor = building.used && player.techniques.some((card) => card.slug === "taylorism") && !player.techniqueUsed?.taylorism;
  return <article className={building.used && !mayTaylor ? "used" : ""}><header><span>{building.symbols?.map((symbol) => <Symbol name={symbol} key={symbol} />)}</span><b>{building.points} VP</b></header><strong>{building.name}</strong><small>{building.description}</small>{building.actions?.length > 0 && <div>{building.actions.map((action, index) => <button key={index} disabled={disabled || !canUseBuilding(player, building, index, mayTaylor)} onClick={() => onUse(index, mayTaylor ? { useTaylorism: true } : {})}><Zap /> {mayTaylor ? "Taylorism: " : ""}{action.gainScore ? `${action.gainScore} VP` : `+${action.gainSpyrium} Spyrium`}<small>{action.workers ? `${action.workers}W ` : ""}{action.spyrium ? `${action.spyrium}S` : ""}</small></button>)}</div>} {building.used && <em>{mayTaylor ? "Taylorism can run this again" : "Used this round"}</em>}</article>;
}

function MarketActionModal({ room, player, worker, cardIndex, card, busy, onClose, onActivate }) {
  const [replacementId, setReplacementId] = useState("");
  const [tokenValue, setTokenValue] = useState(card.tokens?.[0] || 1);
  const [residenceChoice, setResidenceChoice] = useState("advance");
  const [useLobbying, setUseLobbying] = useState(false);
  const options = { replacementId: replacementId || undefined, tokenValue, residenceChoice, useLobbying };
  const cost = activationCost(room, player.id, worker.id, cardIndex, options);
  const tokenPayment = ["banker", "financier", "architect"].includes(card.slug) ? Number(tokenValue) : 0;
  const spyriumPayment = ["apprentice", "engineer"].includes(card.slug) ? 1 : 0;
  const canAfford = cost && player.money >= cost.total + tokenPayment && player.spyrium >= spyriumPayment && (!card.token || card.tokens.length);
  return <div className="spyrium-overlay" onMouseDown={(event) => event.target === event.currentTarget && onClose()}><section className="spyrium-modal spyrium-market-modal"><button className="spyrium-modal-close" onClick={onClose}><X /></button><CardIcon type={card.type} /><p className="spyrium-kicker">Activate {card.type}</p><h2>{card.name}</h2><p>{card.description}</p>{card.tokens?.length > 0 && <Choice label="Choose a numbered token">{card.tokens.map((value, index) => <button className={Number(tokenValue) === value ? "selected" : ""} key={`${value}-${index}`} onClick={() => setTokenValue(value)}>{value}</button>)}</Choice>}{["architect"].includes(card.slug) || card.residence ? <Choice label="Residence benefit"><button className={residenceChoice === "advance" ? "selected" : ""} onClick={() => setResidenceChoice("advance")}>Advance track</button><button className={residenceChoice === "score" ? "selected" : ""} onClick={() => setResidenceChoice("score")}>Score {RESIDENCE_VALUES[player.residence]} VP</button></Choice> : null}{card.type === "building" && player.buildings.length > 0 && <label className="spyrium-select-label">Building space<select value={replacementId} onChange={(event) => setReplacementId(event.target.value)}><option value="">Build in new space (+£{Math.max(0, player.buildings.length - (player.techniques.some((item) => item.slug === "crane") ? 3 : 0))})</option>{player.buildings.map((building) => <option key={building.id} value={building.id}>Replace {building.name}</option>)}</select></label>}{player.techniques.some((item) => item.slug === "lobbying") && !player.techniqueUsed?.lobbying && <label className="spyrium-check"><input type="checkbox" checked={useLobbying} onChange={(event) => setUseLobbying(event.target.checked)} /><span><strong>Use Lobbying</strong><small>Ignore congestion for this activation.</small></span></label>}<div className="spyrium-cost-breakdown"><span>Card £{cost?.printed}</span><span>Congestion £{cost?.congestion}</span>{cost?.space > 0 && <span>Space £{cost.space}</span>}<strong>Total £{cost?.total}{tokenPayment ? ` + £${tokenPayment} effect` : ""}{spyriumPayment ? ` + ${spyriumPayment} Spyrium` : ""}</strong></div><button className="spyrium-primary" disabled={busy || !canAfford} onClick={() => onActivate(options)}><Wrench /> {canAfford ? `Activate for £${cost.total}` : "Cannot afford"}</button></section></div>;
}

function Choice({ label, children }) { return <div className="spyrium-choice"><label>{label}</label><div>{children}</div></div>; }

function EventModal({ event, player, slots, onClose, onUse }) {
  const [resource, setResource] = useState("money");
  const [residenceChoice, setResidenceChoice] = useState("advance");
  const [spend, setSpend] = useState(event.id === "investment" ? 3 : 1);
  const [buildingId, setBuildingId] = useState(player.buildings.find((building) => building.used)?.id || "");
  const [actionIndex, setActionIndex] = useState(0);
  const [slotId, setSlotId] = useState(slots[0].id);
  const eventBuilding = player.buildings.find((building) => building.id === buildingId);
  const disabled = (event.id === "estate" && player.spyrium < 1) || (event.id === "investment" && player.money < spend) || (event.id === "exchange" && player.spyrium < spend) || (event.id === "maintenance" && (!buildingId || player.money < 1 || !canUseBuilding(player, eventBuilding, actionIndex, true))) || (event.id === "recruitment" && (player.totalWorkers >= 7 || player.money < player.totalWorkers)) || (event.id === "late-shift" && player.activeWorkers < 1);
  return <div className="spyrium-overlay" onMouseDown={(event) => event.target === event.currentTarget && onClose()}><section className="spyrium-modal"><button className="spyrium-modal-close" onClick={onClose}><X /></button><Sparkles /><p className="spyrium-kicker">This round's event</p><h2>{event.name}</h2><p>{event.description}</p>{event.id === "windfall" && <Choice label={`Take ${event.value}`}><button className={resource === "money" ? "selected" : ""} onClick={() => setResource("money")}>Pounds</button><button className={resource === "spyrium" ? "selected" : ""} onClick={() => setResource("spyrium")}>Spyrium</button><button className={resource === "score" ? "selected" : ""} onClick={() => setResource("score")}>Victory points</button></Choice>}{event.id === "estate" && <Choice label="Choose benefit"><button className={residenceChoice === "advance" ? "selected" : ""} onClick={() => setResidenceChoice("advance")}>Advance track</button><button className={residenceChoice === "score" ? "selected" : ""} onClick={() => setResidenceChoice("score")}>Score {RESIDENCE_VALUES[player.residence]} VP</button></Choice>}{event.id === "investment" && <Choice label="Investment"><button className={spend === 3 ? "selected" : ""} onClick={() => setSpend(3)}>£3 → 3 VP</button><button className={spend === 6 ? "selected" : ""} onClick={() => setSpend(6)}>£6 → 5 VP</button></Choice>}{event.id === "exchange" && <Choice label="Exchange"><button className={spend === 1 ? "selected" : ""} onClick={() => setSpend(1)}>1 crystal → £3</button><button className={spend === 3 ? "selected" : ""} onClick={() => setSpend(3)}>3 crystals → £6</button></Choice>}{event.id === "maintenance" && <><label className="spyrium-select-label">Ready and use building<select value={buildingId} onChange={(event_) => { setBuildingId(event_.target.value); setActionIndex(0); }}><option value="">Choose a used building</option>{player.buildings.filter((building) => building.used).map((building) => <option key={building.id} value={building.id}>{building.name}</option>)}</select></label>{eventBuilding?.actions?.length > 1 && <Choice label="Building action">{eventBuilding.actions.map((action, index) => <button className={actionIndex === index ? "selected" : ""} key={index} onClick={() => setActionIndex(index)}>{action.gainScore ? `${action.gainScore} VP` : `+${action.gainSpyrium} Spyrium`}</button>)}</Choice>}</>}{event.id === "late-shift" && <label className="spyrium-select-label">Market position<select value={slotId} onChange={(event_) => setSlotId(event_.target.value)}>{slots.map((slot) => <option key={slot.id} value={slot.id}>{slot.id.toUpperCase()}</option>)}</select></label>}<button className="spyrium-primary" disabled={disabled} onClick={() => onUse({ resource, residenceChoice, spend, buildingId, actionIndex, slotId })}><Sparkles /> Use event</button></section></div>;
}

function BonusModal({ player, onChoose }) { return <div className="spyrium-overlay"><section className="spyrium-modal spyrium-bonus-modal"><Crown /><p className="spyrium-kicker">Milestone reached</p><h2>Choose your industrial bonus</h2><p>Your reputation has opened doors. Claim one benefit now; the other arrives when you reach 20 VP.</p><div><button disabled={player.totalWorkers >= 7} onClick={() => onChoose("worker")}><UserRound /><strong>Recruit a worker</strong><small>Add one active worker immediately.</small></button><button onClick={() => onChoose("money")}><Coins /><strong>Take £5</strong><small>Expand your available capital.</small></button></div></section></div>; }

function RulesDrawer({ onClose }) {
  return <ChoiceModal wide title="Power the British Empire" text="Spyrium lasts six rounds across periods A, B, and C. Each round has two personal phases; different players may be in different phases." onClose={onClose}>
    <div className="tbl-rule-grid">
      <article><b>1. Placement</b><p>On your turn, place one active worker between two adjacent market cards, use the event, or switch permanently to Activation.</p></article>
      <article><b>2. Activation</b><p>Choose one of your market workers. You may withdraw it to earn £1 for each other worker beside one adjacent card, or pay to activate an adjacent card. Activation costs the printed price plus £1 for every other adjacent worker.</p></article>
      <article><b>Characters</b><p>Grant an immediate effect and stay in the market.</p></article>
      <article><b>Buildings</b><p>Join your neighborhood. New spaces become increasingly expensive; replacing a building is free, with a £3 discount when symbols match.</p></article>
      <article><b>Techniques</b><p>Grant lasting powers and end-game points.</p></article>
      <article><b>Passing</b><p>You may also use one ready building or the round event as an action. You can pass only after removing every worker you placed in the market.</p></article>
    </div>
    <p className="tbl-rule-heading">Victory</p>
    <p className="tbl-modal-copy">After round six, add printed building points and up to 7 points from each technique. Most VP wins; tied players share victory.</p>
    <a className="tbl-link" href="https://cdn.1j1ju.com/medias/be/9c/01-spyrium-rulebook.pdf" target="_blank" rel="noreferrer"><ScrollText aria-hidden="true" /> Full rulebook</a>
  </ChoiceModal>;
}

function Results({ room, playerId, onLeave }) {
  const ranked = [...room.players].sort((a, b) => b.finalScore - a.finalScore);
  return <SharedResults
    title={room.winners.includes(playerId) ? "Your empire triumphs" : `${ranked[0].name} leads the age`}
    text="Final points include your score track, neighborhood buildings, and patented techniques."
    rows={ranked.map((player) => ({
      id: player.id,
      name: `${player.name}${player.id === playerId ? " (you)" : ""}`,
      value: `${player.finalScore} VP`,
      note: `${player.score} track · ${player.buildings.reduce((sum, building) => sum + building.points, 0)} buildings · ${player.techniques.reduce((sum, technique) => sum + techniqueEndScore(player, technique), 0)} techniques`,
    }))}
  >
    <button type="button" className="tbl-primary" onClick={onLeave}>Return to the Royal Exchange</button>
  </SharedResults>;
}
