"use client";

import { useEffect, useState } from "react";
import {
  Bot,
  Check,
  ChevronRight,
  Coins,
  Droplets,
  Grape,
  House,
  Landmark,
  Leaf,
  ScrollText,
  Sparkles,
  Sun,
  Sunset,
  ThermometerSnowflake,
  Trophy,
  Users,
  Warehouse,
  Wine,
  X,
} from "lucide-react";

import { useEngineRoom } from "../lib/use-engine-room.js";
import { ChoiceModal, GameHeader, Hero, Landing as SharedLanding, Lobby as SharedLobby, Results as SharedResults } from "./ui/table-shell";
import {
  ACTION_SPACES, BUILDINGS, canFillOrder, canPlant,
  actionCapacity, canUseAction, currentPlayer, wineOptions,
} from "../lib/viticulture.js";
import { ViticultureRoomService } from "./viticulture-room-service";

const CARD_ART = {
  vine: "/viticulture/vine-card-art.png",
  order: "/viticulture/order-card-art.png",
  summer: "/viticulture/summer-card-art.png",
  winter: "/viticulture/winter-card-art.png",
};
const SEASONS = {
  spring: { label: "Spring", icon: Sun, note: "Choose when your day begins" },
  summer: { label: "Summer", icon: Sun, note: "Plant, build, and host visitors" },
  winter: { label: "Winter", icon: ThermometerSnowflake, note: "Harvest, make wine, and fill orders" },
};

export default function ViticultureClient() {
  const {
    room, playerId, name, setName, joinCode, setJoinCode,
    busy, error, setError, createRoom, joinRoom, act, stepComputer, leaveRoom: leaveEngineRoom,
  } = useEngineRoom({ service: ViticultureRoomService, storageKey: "viticulture" });
  const [selectedAction, setSelectedAction] = useState(null);
  const [showRules, setShowRules] = useState(false);
  const [computerThinking, setComputerThinking] = useState(false);

  const me = room?.players.find((player) => player.id === playerId) ?? null;
  const actor = room ? currentPlayer(room) : null;
  const botNeedsAction = room?.phase === "playing" && actor?.isComputer;

  useEffect(() => {
    if (!room || room.hostId !== playerId || !botNeedsAction) {
      setComputerThinking(false);
      return undefined;
    }
    let cancelled = false;
    setComputerThinking(true);
    const timer = window.setTimeout(async () => {
      try { await stepComputer(); }
      finally { if (!cancelled) setComputerThinking(false); }
    }, 680);
    return () => { cancelled = true; window.clearTimeout(timer); };
  }, [botNeedsAction, actor?.id, playerId, room?.updatedAt]);

  useEffect(() => setSelectedAction(null), [room?.season, room?.turnCursor, room?.year]);

  function leaveRoom() {
    if (room?.phase !== "lobby" && !window.confirm("Leave this vineyard? You can return later with the room code.")) return;
    leaveEngineRoom();
    setSelectedAction(null);
    setError("");
  }

  if (!room || !me) {
    return <SharedLanding
      gameName="Viticulture"
      theme="tbl-light viticulture-theme"
      hero={<Hero
        kicker="A Tuscan worker-placement game"
        title={<>Grow a legacy,<br /><em>one vintage at a time.</em></>}
        copy="Plant your fields, welcome visitors, age remarkable wines, and build the most celebrated estate in the valley."
        badges={[{ icon: Users, label: "2-6 vintners" }, { icon: Bot, label: "Computer rivals" }, { icon: Wine, label: "Race to 20 VP" }]}
        backdrop={<><div className="viti-hero-sun" /><div className="viti-hills hill-one" /><div className="viti-hills hill-two" /><div className="viti-vine-lines">{Array.from({ length: 8 }, (_, index) => <i key={index} />)}</div></>}
      />}
      entry={{ name, setName, joinCode, setJoinCode, createRoom, joinRoom, busy, error }}
      onRules={() => setShowRules(true)}
      dialogs={showRules && <RulesDrawer onClose={() => setShowRules(false)} />}
    />;
  }
  if (room.phase === "lobby") {
    return <SharedLobby
      gameName="Viticulture"
      theme="tbl-light viticulture-theme"
      room={room}
      me={me}
      busy={busy}
      error={error}
      min={2}
      max={6}
      onAdd={() => act("addComputer")}
      onRemove={(id) => act("removeComputer", { playerId: id })}
      onStart={() => act("start")}
      onLeave={leaveRoom}
      onRules={() => setShowRules(true)}
      rules={showRules && <RulesDrawer onClose={() => setShowRules(false)} />}
    />;
  }

  const myTurn = room.phase === "playing" && actor?.id === playerId;
  const season = SEASONS[room.season];
  const SeasonIcon = season.icon;

  return <main className={`viti-shell tbl-light viticulture-theme season-${room.season}`}>
    <GameHeader
      title="Viticulture"
      room={room}
      subtitle={`Room ${room.roomCode} · Vintage ${room.year}`}
      status={room.phase === "finished" ? "Vintage complete" : `${season.label} · ${myTurn ? "Your move" : computerThinking && actor?.isComputer ? `${actor.name} is planning...` : `${actor?.name}'s move`}`}
      onRules={() => setShowRules(true)}
      onLeave={leaveRoom}
    />

    {error && <div className="viti-error" role="alert">{error}<button aria-label="Dismiss" onClick={() => setError("")}><X /></button></div>}

    <div className="viti-game-grid">
      <aside className="viti-scoreboard">
        <PanelHeading icon={Users} eyebrow="Wake-up order" title="Vintners" />
        <div className="viti-player-list">{[...room.players].sort((a, b) => (a.wakeRow ?? 99) - (b.wakeRow ?? 99)).map((player) => <PlayerRow key={player.id} player={player} active={actor?.id === player.id && room.phase !== "finished"} isMe={player.id === playerId} winner={room.winners.includes(player.id)} />)}</div>
        <div className="viti-goal"><Trophy /><span><strong>Race to 20 VP</strong><small>Finish the year, then highest score wins.</small></span></div>
      </aside>

      <section className="viti-board" aria-label="Shared action board">
        <div className="viti-season-banner">
          <div><SeasonIcon /><span><small>Year {room.year}</small><strong>{season.label}</strong></span></div>
          <p>{season.note}</p>
          {room.season !== "spring" && <button disabled={!myTurn || busy} onClick={() => act("pass")}>Pass to {room.season === "summer" ? "winter" : "year end"}<ChevronRight /></button>}
        </div>

        <BoardDecks room={room} />

        {room.season === "spring"
          ? <WakeUpChart room={room} myTurn={myTurn} busy={busy} onChoose={(row) => act("wakeUp", { row })} />
          : <ActionBoard room={room} playerId={playerId} myTurn={myTurn} busy={busy} onSelect={setSelectedAction} />}

        <VictoryTrack room={room} />
      </section>

      <aside className="viti-ledger">
        <GuidancePanel room={room} player={me} myTurn={myTurn} busy={busy} onAction={setSelectedAction} />
        <PanelHeading icon={ScrollText} eyebrow="Latest moves" title="Estate ledger" />
        <div className="viti-log">{room.log.slice(0, 9).map((line, index) => <p key={`${line}-${index}`}><span>{index + 1}</span>{line}</p>)}</div>
      </aside>
    </div>

    <Estate player={me} year={room.year} />

    {selectedAction && <ActionResolver room={room} player={me} action={selectedAction} busy={busy} onClose={() => setSelectedAction(null)} onResolve={(payload, workerType) => { act("action", { actionId: selectedAction.id, payload, workerType }); setSelectedAction(null); }} />}
    {showRules && <RulesDrawer onClose={() => setShowRules(false)} />}
    {room.phase === "finished" && <Results room={room} playerId={playerId} onLeave={leaveRoom} />}
  </main>;
}

function PanelHeading({ icon: Icon, eyebrow, title }) { return <div className="viti-panel-heading"><Icon /><span><small>{eyebrow}</small><strong>{title}</strong></span></div>; }

function PlayerRow({ player, active, isMe, winner }) {
  const workers = player.regularAvailable + Number(player.grandeAvailable);
  return <article className={`viti-player-row ${active ? "active" : ""} ${winner ? "winner" : ""}`}>
    <span className="viti-avatar" style={{ "--player": player.color }}>{player.isComputer ? <Bot /> : player.name[0]}</span>
    <span><strong>{player.name}{isMe ? " (you)" : ""}</strong><small>{player.wakeRow ? <><GamePiece type="rooster" color={player.color} /> Row {player.wakeRow}</> : "Wake-up pending"} · {workers} workers</small></span>
    <b><GamePiece type="cork" color={player.color} />{player.score}<small>VP</small></b>
  </article>;
}

function GuidancePanel({ room, player, myTurn, busy, onAction }) {
  const guidance = getGuidance(room, player);
  const action = guidance.actionId ? ACTION_SPACES.find((item) => item.id === guidance.actionId) : null;
  const canAct = action && myTurn && (canUseAction(room, player.id, action.id, "regular") || canUseAction(room, player.id, action.id, "grande"));
  return <section className="viti-coach">
    <div className="viti-coach-head"><span><Sparkles /></span><div><small>{myTurn ? "Recommended now" : "Plan your next move"}</small><strong>{guidance.title}</strong></div></div>
    <p>{guidance.body}</p>
    {canAct && <button disabled={busy} onClick={() => onAction(action)}>Open {action.name}<ChevronRight /></button>}
    {!myTurn && <small className="viti-coach-wait">Watch the board while {currentPlayer(room)?.name} acts.</small>}
  </section>;
}

function getGuidance(room, player) {
  if (room.season === "spring") return { title: "Choose your wake-up row", body: "Earlier means first choice of actions. Later rows trade tempo for cards, coins, a worker, or VP." };
  if (player.regularAvailable + Number(player.grandeAvailable) === 0) return { title: `Pass ${room.season}`, body: "Every worker is committed. Pass and wait for the next season or year." };
  if (room.season === "summer") {
    const planted = player.fields.some((field) => field.vines.length);
    const plantable = player.cards.vines.some((card) => player.fields.some((field) => canPlant(player, card, field)));
    if (!planted && plantable) return { title: "Plant your first vine", body: "Choose a green vine card, then a field with enough capacity. That field can produce grapes every year.", actionId: "plant" };
    if (!plantable && player.cards.vines.length) return { title: "Unlock your vine cards", body: "Your vines need a trellis or irrigation, or your fields need more room. Build the required structure.", actionId: "build" };
    if (!player.cards.vines.length) return { title: "Find a vine to plant", body: "Draw a green vine card. Its red and white circles show the grapes it will produce when harvested.", actionId: "draw-vine" };
    if (player.coins < 3) return { title: "Fund the estate", body: "Give a vineyard tour for coins. Coins pay for structures and new workers.", actionId: "tour" };
    return { title: "Prepare for winter", body: "Plant another vine, improve your estate, or pass while keeping at least one worker for harvesting and winemaking.", actionId: "plant" };
  }
  const fillable = player.cards.orders.some((card) => canFillOrder(player, card));
  const hasGrapes = player.grapes.red.length + player.grapes.white.length > 0;
  const hasPlantedField = player.fields.some((field) => field.vines.length);
  if (fillable) return { title: "Ship a wine order", body: "You already have the required wine. Filling the purple order earns VP and recurring income.", actionId: "fill-order" };
  if (!hasGrapes && hasPlantedField) return { title: "Harvest a planted field", body: "Harvest converts each field's red and white vine totals into glass grape tokens on your crush pad.", actionId: "harvest" };
  if (hasGrapes && wineOptions(player).length) return { title: "Turn grapes into wine", body: "Make wine now. Wine keeps aging and can satisfy the purple order cards in your hand.", actionId: "make-wine" };
  if (!player.cards.orders.length) return { title: "Learn what buyers want", body: "Draw a purple wine order so you know which wine types and values to produce.", actionId: "draw-order" };
  return { title: "Build next year's capacity", body: "Train another worker, welcome a winter visitor, or draw an order before passing the season.", actionId: "train-worker" };
}

function WakeUpChart({ room, myTurn, busy, onChoose }) {
  const choices = Object.values(room.wakeChoices);
  const rewards = ["First to act", "Draw a vine", "+1 coin", "Draw an order", "Temporary worker", "+1 VP", "+1 coin & first player"];
  return <div className="viti-wake-wrap"><div className="viti-wake-copy"><Sunset /><h2>Choose your morning</h2><p>Earlier rows act first in summer and winter. Sleeping later earns a stronger start-of-year reward.</p></div><div className="viti-wake-chart">{rewards.map((reward, index) => {
    const row = index + 1; const ownerId = Object.entries(room.wakeChoices).find(([, value]) => value === row)?.[0]; const owner = room.players.find((player) => player.id === ownerId);
    return <button key={row} disabled={!myTurn || busy || choices.includes(row)} onClick={() => onChoose(row)}><b>{row}</b><span><strong>{reward}</strong><small>{owner ? `${owner.name} is here` : row < 3 ? "Early riser" : "Sleep in"}</small></span>{owner ? <GamePiece type="rooster" color={owner.color} label={`${owner.name}'s rooster`} /> : <Sun />}</button>;
  })}</div></div>;
}

function BoardDecks({ room }) {
  const decks = [
    { id: "vines", label: "Vine cards", type: "vine", season: "summer" },
    { id: "summer", label: "Summer visitors", type: "summer", season: "summer" },
    { id: "orders", label: "Wine orders", type: "order", season: "winter" },
    { id: "winter", label: "Winter visitors", type: "winter", season: "winter" },
  ];
  return <div className="viti-board-decks" aria-label="Card decks">
    {decks.map((deck) => <div className={`viti-board-deck deck-${deck.type} ${room.season === deck.season ? "in-season" : ""}`} key={deck.id}>
      <span className="viti-board-card" style={{ backgroundImage: `url(${CARD_ART[deck.type]})` }} />
      <span><strong>{deck.label}</strong><small>{room.deckCounts?.[deck.id] ?? 0} draw · {room.discardCounts?.[deck.id] ?? 0} discard</small></span>
    </div>)}
  </div>;
}

function ActionBoard({ room, playerId, myTurn, busy, onSelect }) {
  const actions = ACTION_SPACES.filter((action) => action.season === room.season);
  const nextSeason = room.season === "summer" ? "winter" : "summer";
  const nextActions = ACTION_SPACES.filter((action) => action.season === nextSeason);
  return <div className={`viti-action-map map-${room.season}`}>
    <div className="viti-map-heading"><span><Landmark /><small>Place a worker on the board</small><strong>Choose one estate action</strong></span><div><i className="open" /> Open worker space <i className="bonus"><Sparkles /></i> First-worker bonus</div></div>
    <div className="viti-map-player-key">{room.players.map((player) => {
      const placed = actions.reduce((total, action) => total + (room.placements[action.id] || []).filter((placement) => placement.playerId === player.id).length, 0);
      return <span key={player.id}><i style={{ background: player.color }} />{player.name}<b>{placed} placed</b></span>;
    })}<small>Swipe the estate to explore</small></div>
    <div className="viti-map-landscape" aria-label={`${SEASONS[room.season].label} action spaces`}>
      {actions.map((action, index) => {
    const placements = room.placements[action.id] || [];
    const regularPlacements = placements.filter((placement) => placement.workerType !== "grande");
    const grandePlacements = placements.filter((placement) => placement.workerType === "grande");
    const canRegular = canUseAction(room, playerId, action.id, "regular");
    const canGrande = canUseAction(room, playerId, action.id, "grande");
    const available = myTurn && !busy && (canRegular || canGrande);
    const Icon = actionIcon(action.id);
    const status = !myTurn ? "Wait for your turn" : canRegular ? "Place a worker" : canGrande ? "Grande worker can fit" : "No worker available";
    return <button key={action.id} className={`viti-action-space action-${action.id} spot-${index} tone-${index % 3} ${available ? "available" : ""}`} disabled={!available} onClick={() => onSelect(action)}>
      <span className="viti-action-landmark"><Icon /></span>
      <span className="viti-action-copy"><small>{String(index + 1).padStart(2, "0")} · {room.season}</small><strong>{action.name}</strong><em>{action.detail}</em></span>
      <span className="viti-printed-spaces" aria-label={`${action.name} worker spaces`}>
        {Array.from({ length: actionCapacity(room.players.length) }, (_, slot) => {
          const placement = regularPlacements[slot];
          const player = placement && room.players.find((item) => item.id === placement.playerId);
          return <span className={`viti-worker-space ${placement ? "occupied" : "open"} ${slot === 0 ? "has-bonus" : ""}`} key={slot}>{placement ? <GamePiece type="regular" color={player?.color} label={`${player?.name}'s worker`} /> : <i />}{slot === 0 && <b title={action.bonus}><Sparkles /></b>}</span>;
        })}
        {grandePlacements.map((placement, slot) => { const player = room.players.find((item) => item.id === placement.playerId); return <span className="viti-worker-space grande-occupied" key={`${placement.playerId}-${slot}`}><GamePiece type="grande" color={player?.color} label={`${player?.name}'s grande worker`} /></span>; })}
      </span>
      <span className="viti-action-bonus"><Sparkles /><b>{action.bonus}</b></span>
      <span className="viti-action-status">{status}<ChevronRight /></span>
    </button>;
      })}
    </div>
    <div className="viti-next-season"><span><strong>{nextSeason === "winter" ? "Winter cellar ahead" : "Next year: summer"}</strong><small>{nextSeason === "winter" ? "Save workers now if you want to produce and ship wine." : "Workers return after winter and the next vintage begins."}</small></span><div>{nextActions.map((action) => <span key={action.id}>{action.name}</span>)}</div></div>
  </div>;
}

function VictoryTrack({ room }) {
  const track = Array.from({ length: 21 }, (_, score) => score);
  return <section className="viti-victory-track" aria-label="Victory point track">
    <header><span><Trophy /> Victory track</span><small>First to 20 triggers the final year</small></header>
    <div>{track.map((score) => {
      const players = room.players.filter((player) => Math.max(0, Math.min(20, player.score)) === score);
      return <span className={score % 5 === 0 ? "milestone" : ""} key={score}><b>{score}</b><i>{players.map((player) => <GamePiece key={player.id} type="cork" color={player.color} label={`${player.name}: ${player.score} victory points`} />)}</i></span>;
    })}</div>
  </section>;
}

function actionIcon(id) {
  if (["draw-vine", "plant", "harvest"].includes(id)) return Leaf;
  if (id === "tour") return Coins;
  if (id === "build" || id === "train-worker") return Landmark;
  if (id === "sell-grape") return Grape;
  if (id.includes("visitor")) return Users;
  if (id === "draw-order") return ScrollText;
  if (id === "make-wine" || id === "fill-order") return Wine;
  return Sparkles;
}

function Estate({ player, year }) {
  const allWines = Object.entries(player.wines).flatMap(([type, values]) => values.map((value) => ({ type, value })));
  return <section className="viti-estate">
    <div className="viti-estate-head"><div><p className="viti-kicker">Your private estate</p><h2>{player.name}&rsquo;s vineyard</h2></div><div className="viti-estate-stats"><span><GamePiece type="coin" /> <b>{player.coins}</b> coins</span><span><GamePiece type="bottle" color={player.color} /> <b>+{player.residualIncome}</b> income</span><span><GamePiece type="worker" color={player.color} /> <b>{player.regularWorkers + 1}</b> workers</span></div></div>
    <ProductionFlow />
    <div className="viti-estate-grid">
      <div className="viti-fields"><PanelHeading icon={Leaf} eyebrow="Planted capacity" title="Fields" /><div>{player.fields.map((field) => <article key={field.id}><header><span>Field {field.capacity}</span><b>{field.vines.reduce((sum, vine) => sum + vine.red + vine.white, 0)} / {field.capacity}</b></header>{field.vines.length ? field.vines.map((vine) => <div className="viti-planted-vine" key={vine.uid}><Grape /><span><strong>{vine.name}</strong><small>{vine.red ? `${vine.red} red` : ""}{vine.red && vine.white ? " · " : ""}{vine.white ? `${vine.white} white` : ""}</small></span></div>) : <p>Unplanted Tuscan soil</p>}<div className="viti-field-rows">{Array.from({ length: 5 }, (_, index) => <i key={index} />)}</div></article>)}</div></div>
      <div className="viti-cellar"><PanelHeading icon={Warehouse} eyebrow="Grape & wine tracks" title="Cellar" /><Track label="Red grapes" type="red" values={player.grapes.red} /><Track label="White grapes" type="white" values={player.grapes.white} /><Track label="Red wine" type="red-wine" values={player.wines.red} /><Track label="White wine" type="white-wine" values={player.wines.white} /><Track label="Rosé" type="rose" values={player.wines.rose} /><Track label="Sparkling" type="sparkling" values={player.wines.sparkling} />{!allWines.length && <p className="viti-cellar-empty">Harvest grapes in winter, then make wine. Everything ages at year end.</p>}</div>
      <div className="viti-buildings"><PanelHeading icon={House} eyebrow="Estate improvements" title="Structures" /><div>{Object.values(BUILDINGS).map((building) => <article className={player.structures.includes(building.id) ? "built" : ""} key={building.id}><span>{player.structures.includes(building.id) ? <StructurePiece buildingId={building.id} /> : building.cost}</span><p><strong>{building.name}</strong><small>{building.note}</small></p></article>)}</div></div>
    </div>
    <div className="viti-hand"><PanelHeading icon={ScrollText} eyebrow={`Vintage ${year} resources`} title="Your hand" /><div className="viti-hand-groups"><HandGroup title="Vines" cards={player.cards.vines} type="vine" /><HandGroup title="Orders" cards={player.cards.orders} type="order" /><HandGroup title="Summer visitors" cards={player.cards.summer} type="summer" /><HandGroup title="Winter visitors" cards={player.cards.winter} type="winter" /></div></div>
  </section>;
}

function ProductionFlow() {
  return <div className="viti-production-flow" aria-label="How wine becomes victory points">
    <div><span className="viti-flow-card flow-vine" /><p><strong>1. Plant</strong><small>Green vine card</small></p></div><ChevronRight />
    <div><span className="viti-flow-field"><Leaf /></span><p><strong>2. Harvest</strong><small>Field makes grapes</small></p></div><ChevronRight />
    <div><GamePiece type="grape-token" /><p><strong>3. Make wine</strong><small>Glass grape token</small></p></div><ChevronRight />
    <div><GamePiece type="wine-token" /><p><strong>4. Fill order</strong><small>Wine meets purple card</small></p></div><ChevronRight />
    <div><GamePiece type="cork" color="#733a36" /><p><strong>Score VP</strong><small>Race to 20</small></p></div>
  </div>;
}

function Track({ label, type, values }) { return <div className={`viti-track track-${type}`}><span>{label}</span><div>{Array.from({ length: 9 }, (_, index) => <i className={values.includes(index + 1) ? "filled" : ""} key={index}><span>{index + 1}</span></i>)}</div></div>; }

function HandGroup({ title, cards, type }) {
  return <section className={`viti-hand-group hand-${type}`}><header><span>{title}</span><b>{cards.length}</b></header><div>{cards.length ? cards.map((card) => <article key={card.uid}><span className="viti-card-thumb" style={{ backgroundImage: `url(${CARD_ART[type]})` }} /><span className="viti-card-body"><strong>{card.name}</strong>{type === "vine" && <small>{card.red ? `${card.red} red` : ""}{card.red && card.white ? " · " : ""}{card.white ? `${card.white} white` : ""}{card.requirement ? ` · needs ${BUILDINGS[card.requirement].name}` : ""}</small>}{type === "order" && <small>{card.requirements.map((item) => `${item.type} ${item.min}+`).join(" · ")} · {card.vp} VP / +{card.income}</small>}{["summer", "winter"].includes(type) && <small>{card.text}</small>}</span></article>) : <p>No cards</p>}</div></section>;
}

function GamePiece({ type, color = "#805246", label }) {
  return <span className={`viti-piece piece-${type}`} style={{ "--piece": color }} role={label ? "img" : undefined} aria-label={label}><i /><b>{type === "grande" ? "G" : ""}</b></span>;
}

function StructurePiece({ buildingId }) {
  const Icon = buildingId === "irrigation" ? Droplets : buildingId === "tastingRoom" ? Wine : buildingId.includes("cellar") ? Warehouse : buildingId === "cottage" ? House : buildingId === "windmill" ? Sparkles : buildingId === "trellis" ? Landmark : Grape;
  return <span className={`viti-structure-piece structure-${buildingId}`} title={BUILDINGS[buildingId].name}><Icon /></span>;
}

function ActionResolver({ room, player, action, busy, onClose, onResolve }) {
  const canRegular = canUseAction(room, player.id, action.id, "regular");
  const canGrande = canUseAction(room, player.id, action.id, "grande");
  const [workerType, setWorkerType] = useState(canRegular ? "regular" : "grande");
  const [payload, setPayload] = useState({});
  const needsChoice = ["build", "plant", "sell-grape", "play-summer", "harvest", "make-wine", "fill-order", "play-winter"].includes(action.id);
  const valid = !needsChoice || actionPayloadValid(action.id, payload);
  const placements = room.placements[action.id] || [];
  const earnsBonus = placements.length === 0;
  return <div className="viti-overlay" onMouseDown={(event) => event.target === event.currentTarget && onClose()}><section className="viti-resolver" role="dialog" aria-modal="true" aria-labelledby="viti-action-title">
    <button className="viti-modal-close" aria-label="Close" onClick={onClose}><X /></button><p className="viti-kicker">{SEASONS[room.season].label} action</p><h2 id="viti-action-title">{action.name}</h2><p>{action.detail}. The first regular worker here receives: <strong>{action.bonus}</strong>.</p>
    <div className="viti-worker-choice"><span>Place</span><button className={workerType === "regular" ? "selected" : ""} disabled={!canRegular} onClick={() => setWorkerType("regular")}><GamePiece type="regular" color={player.color} /> Regular <small>{player.regularAvailable} ready</small></button><button className={workerType === "grande" ? "selected" : ""} disabled={!canGrande} onClick={() => setWorkerType("grande")}><GamePiece type="grande" color={player.color} /> Grande <small>{placements.length ? "ignores occupancy" : "available"}</small></button></div>
    <ActionChoices action={action} player={player} payload={payload} setPayload={setPayload} earnsBonus={earnsBonus} />
    <button className="viti-primary" disabled={busy || !valid} onClick={() => onResolve(payload, workerType)}><Check /> Confirm action</button>
  </section></div>;
}

function actionPayloadValid(actionId, payload) {
  if (actionId === "build") return Boolean(payload.buildingId);
  if (actionId === "plant") return Boolean(payload.cardId && payload.fieldId);
  if (actionId === "sell-grape") return Boolean(payload.grapeType);
  if (actionId.includes("summer") || actionId.includes("winter")) return Boolean(payload.cardId);
  if (actionId === "harvest") return Boolean(payload.fieldId);
  if (actionId === "make-wine") return Boolean(payload.optionId);
  if (actionId === "fill-order") return Boolean(payload.orderId);
  return true;
}

function ActionChoices({ action, player, payload, setPayload, earnsBonus }) {
  if (action.id === "build") return <ChoiceGrid>{Object.values(BUILDINGS).map((building) => { const cost = Math.max(0, building.cost - (earnsBonus ? 1 : 0)); const blocked = player.structures.includes(building.id) || player.coins < cost || (building.id === "largeCellar" && !player.structures.includes("cellar")); return <ChoiceButton key={building.id} selected={payload.buildingId === building.id} disabled={blocked} title={building.name} meta={`${cost} coins${earnsBonus ? " with bonus" : ""}`} note={building.note} onClick={() => setPayload({ buildingId: building.id })} />; })}</ChoiceGrid>;
  if (action.id === "plant") return <><h3 className="viti-choice-title">Choose a vine</h3><ChoiceGrid>{player.cards.vines.map((card) => <ChoiceButton key={card.uid} selected={payload.cardId === card.uid} title={card.name} meta={`${card.red} red · ${card.white} white`} note={card.requirement ? `Needs ${BUILDINGS[card.requirement].name}` : "No structure required"} onClick={() => setPayload((current) => ({ ...current, cardId: card.uid }))} />)}</ChoiceGrid><h3 className="viti-choice-title">Choose a field</h3><ChoiceGrid>{player.fields.map((field) => { const card = player.cards.vines.find((item) => item.uid === payload.cardId); return <ChoiceButton key={field.id} selected={payload.fieldId === field.id} disabled={!canPlant(player, card, field)} title={`Field ${field.capacity}`} meta={`${field.vines.reduce((sum, vine) => sum + vine.red + vine.white, 0)} / ${field.capacity} planted`} note="Vines stay planted after harvest" onClick={() => setPayload((current) => ({ ...current, fieldId: field.id }))} />; })}</ChoiceGrid></>;
  if (action.id === "sell-grape") return <ChoiceGrid>{["red", "white"].map((type) => <ChoiceButton key={type} selected={payload.grapeType === type} disabled={!player.grapes[type].length} title={`${type[0].toUpperCase() + type.slice(1)} grape`} meta={player.grapes[type].length ? `Sell value ${Math.min(...player.grapes[type])}` : "None available"} note="Gain up to 4 coins" onClick={() => setPayload({ grapeType: type })} />)}</ChoiceGrid>;
  if (action.id === "harvest") return <ChoiceGrid>{player.fields.map((field) => <ChoiceButton key={field.id} selected={payload.fieldId === field.id} disabled={!field.vines.length} title={`Field ${field.capacity}`} meta={`${field.vines.length} planted vine${field.vines.length === 1 ? "" : "s"}`} note="Creates red and white grapes" onClick={() => setPayload({ fieldId: field.id })} />)}</ChoiceGrid>;
  if (action.id === "make-wine") return <ChoiceGrid>{wineOptions(player).map((option) => <ChoiceButton key={option.id} selected={payload.optionId === option.id} title={option.label} meta={option.grapes.map((grape) => `${grape.type} ${grape.value}`).join(" + ")} note="Uses these grape tokens" onClick={() => setPayload({ optionId: option.id })} />)}</ChoiceGrid>;
  if (action.id === "fill-order") return <ChoiceGrid>{player.cards.orders.map((card) => <ChoiceButton key={card.uid} selected={payload.orderId === card.uid} disabled={!canFillOrder(player, card)} title={card.name} meta={`${card.vp} VP · +${card.income} income`} note={card.requirements.map((item) => `${item.type} ${item.min}+`).join(" · ")} onClick={() => setPayload({ orderId: card.uid })} />)}</ChoiceGrid>;
  if (["play-summer", "play-winter"].includes(action.id)) { const season = action.id === "play-summer" ? "summer" : "winter"; return <ChoiceGrid>{player.cards[season].map((card) => <ChoiceButton key={card.uid} selected={payload.cardId === card.uid} title={card.name} meta={`${season} visitor`} note={card.text} onClick={() => setPayload({ cardId: card.uid })} />)}</ChoiceGrid>; }
  return <div className="viti-immediate"><Sparkles /><span><strong>Ready to resolve</strong><small>No additional choice is needed.</small></span></div>;
}

function ChoiceGrid({ children }) { return <div className="viti-choice-grid">{children}</div>; }
function ChoiceButton({ selected, disabled, title, meta, note, onClick }) { return <button className={selected ? "selected" : ""} disabled={disabled} onClick={onClick}><span><strong>{title}</strong><b>{meta}</b></span><small>{note}</small>{selected && <Check />}</button>; }

function ComponentLegend() {
  return <section className="viti-component-legend"><h3>What the pieces mean</h3><div>
    <article><GamePiece type="regular" color="#2f6f70" /><p><strong>Worker meeple</strong><small>Place one to take an action once this year.</small></p></article>
    <article><GamePiece type="grande" color="#2f6f70" /><p><strong>Grande meeple</strong><small>Larger worker that can use a full action.</small></p></article>
    <article><GamePiece type="rooster" color="#a84d3f" /><p><strong>Rooster</strong><small>Marks wake-up order and your spring bonus.</small></p></article>
    <article><GamePiece type="cork" color="#a84d3f" /><p><strong>Cork</strong><small>Your victory-point marker. Reach 20 VP.</small></p></article>
    <article><GamePiece type="bottle" color="#a84d3f" /><p><strong>Wine bottle</strong><small>Tracks income paid at every year end.</small></p></article>
    <article><GamePiece type="grape-token" /><p><strong>Glass token</strong><small>Grape on the crush pad or wine in the cellar.</small></p></article>
  </div><div className="viti-deck-legend">
    <span className="legend-vine"><i style={{ backgroundImage: `url(${CARD_ART.vine})` }} /><b>Green</b><small>Vine</small></span>
    <span className="legend-order"><i style={{ backgroundImage: `url(${CARD_ART.order})` }} /><b>Purple</b><small>Order</small></span>
    <span className="legend-summer"><i style={{ backgroundImage: `url(${CARD_ART.summer})` }} /><b>Yellow</b><small>Summer visitor</small></span>
    <span className="legend-winter"><i style={{ backgroundImage: `url(${CARD_ART.winter})` }} /><b>Blue</b><small>Winter visitor</small></span>
  </div></section>;
}

function RulesDrawer({ onClose }) {
  return <ChoiceModal wide title="From vine to vintage" text="Pieces & game guide. Build the first estate to reach 20 victory points. Each year flows through four seasons." onClose={onClose}>
    <ComponentLegend />
    <p className="tbl-rule-heading">The production loop</p>
    <ProductionFlow />
    <p className="tbl-rule-heading">One year at a glance</p>
    <div className="tbl-rule-grid">
      <article><b>Spring</b><p>Place your rooster on an unoccupied wake-up row. Early rows act sooner; later rows grant better rewards.</p></article>
      <article><b>Summer</b><p>Place meeples to draw or plant green vines, give tours, build structures, sell grapes, or play yellow visitors. Pass when you want to save workers for winter.</p></article>
      <article><b>Autumn</b><p>Every estate automatically welcomes a new visitor.</p></article>
      <article><b>Winter</b><p>Harvest fields, make wine, fill purple orders, train workers, draw orders, or play blue visitors.</p></article>
    </div>
    <p className="tbl-rule-heading">Workers and spaces</p>
    <p className="tbl-modal-copy">Regular meeples need an open oval. Your larger grande meeple can always use a full action. The first worker on an action receives its printed bonus. Workers used in summer remain there, so keep some for winter.</p>
    <p className="tbl-rule-heading">Wine and victory</p>
    <p className="tbl-modal-copy">Harvesting creates glass grape tokens equal to each field&apos;s red and white vine totals. Make wine from those grapes; rosé needs a medium cellar and sparkling needs a large cellar. Fill orders with wine at or above each required value to move your cork toward 20 VP and move your bottle up the income track.</p>
    <p className="tbl-modal-copy">At year end, grapes and wine age, workers return, and residual income is paid. If anyone has at least 20 VP, the highest score wins; coins and total wine value break ties.</p>
    <a className="tbl-link" href="https://store.stonemaiergames.com/products/viticulture-essential-edition" target="_blank" rel="noreferrer"><ScrollText aria-hidden="true" /> Visit the official game page</a>
  </ChoiceModal>;
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
