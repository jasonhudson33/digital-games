"use client";

import { useEffect, useState } from "react";
import {
  Bot,
  Castle,
  Check,
  Coins,
  Crown,
  Gem,
  Hammer,
  Landmark,
  ScrollText,
  Shield,
  Sparkles,
  Swords,
  Users,
  X,
} from "lucide-react";
import { DominionRoomService } from "./dominion-room-service";
import {
  BASE_CARD_IDS,
  CARD_DEFINITIONS,
  KINGDOM_CARD_IDS,
  MAX_PLAYERS,
  allPlayerCards,
  computerPlayerToAct,
  currentPlayer,
  emptyPileLimit,
} from "../lib/dominion";
import { useEngineRoom } from "../lib/use-engine-room.js";
import { ChoiceModal, GameHeader, Hero, Landing as SharedLanding, Lobby as SharedLobby, Results as SharedResults } from "./ui/table-shell";
import CardFan from "./card-fan";

/** Opponents' hands and every draw pile are not sent, only counts. */
const handSize = (player) => player.handCount ?? player.hand.length;
const cardTotal = (player) => player.cardTotal ?? allPlayerCards(player).length;

const ICONS = {
  copper: Coins, silver: Coins, gold: Coins, estate: Landmark, duchy: Castle, province: Crown,
  curse: Swords, cellar: Castle, market: Landmark, merchant: Coins, militia: Swords,
  mine: Gem, moat: Shield, remodel: Hammer, smithy: Hammer, village: Users, workshop: Hammer,
};

export default function DominionClient() {
  const {
    room, playerId, name, setName, joinCode, setJoinCode, busy, error, setError,
    createRoom, joinRoom, act, leaveRoom: leaveEngineRoom, computerWaiting, computerSpeed,
  } = useEngineRoom({ service: DominionRoomService, storageKey: "dominion", computerDue: (current) => Boolean(computerPlayerToAct(current)) });
  const [showRules, setShowRules] = useState(false);
  const [selectedIndices, setSelectedIndices] = useState([]);

  const me = room?.players.find((player) => player.id === playerId) ?? null;
  const actor = room ? currentPlayer(room) : null;
  const computer = room ? computerPlayerToAct(room) : null;


  useEffect(() => setSelectedIndices([]), [room?.pendingChoice?.type, room?.pendingChoice?.playerId]);

  function leaveRoom() {
    if (room?.phase !== "lobby" && !window.confirm("Leave this realm? You can return later with the room code.")) return;
    leaveEngineRoom();
    setError("");
  }

  if (!room || !me) {
    return <SharedLanding
      gameName="Dominion"
      theme="tbl-light dominion-theme"
      hero={<Hero
        kicker="The original deck-building game"
        title={<>Domi<em>nion</em></>}
        copy="Begin with a humble estate. Recruit villages, markets, smithies, and scheming courtiers until your deck becomes a kingdom worth ruling."
        badges={[{ icon: Users, label: "2–6 players" }, { icon: Bot, label: "Computer monarchs" }, { icon: Coins, label: "Base Cards expansion" }]}
        backdrop={<div className="dom-hero-art"><div className="dom-sun" /><Castle /><span className="dom-banner left">D</span><span className="dom-banner right">G</span></div>}
      />}
      entry={{ name, setName, joinCode, setJoinCode, createRoom, joinRoom, busy, error }}
      onRules={() => setShowRules(true)}
      dialogs={showRules && <RulesDrawer onClose={() => setShowRules(false)} />}
    />;
  }
  if (room.phase === "lobby") {
    return <SharedLobby computerSpeed={computerSpeed}
      gameName="Dominion"
      theme="tbl-light dominion-theme"
      room={room}
      me={me}
      busy={busy}
      error={error}
      min={2}
      max={MAX_PLAYERS}
      options={room.players.length >= 5 && <div className="dom-expanded-note"><Sparkles /><span><strong>Base Cards expansion active</strong><small>Expanded Treasure, Province, and Curse supplies with a four-pile ending.</small></span></div>}
      onAdd={() => act("addComputer")}
      onRemove={(id) => act("removeComputer", { playerId: id })}
      onStart={() => act("start")}
      onLeave={leaveRoom}
      onRules={() => setShowRules(true)}
      rules={showRules && <RulesDrawer onClose={() => setShowRules(false)} />}
    />;
  }

  const myTurn = room.phase === "playing" && actor?.id === playerId;
  const myChoice = room.pendingChoice?.playerId === playerId;
  const actionCards = me.hand.filter((id) => CARD_DEFINITIONS[id].types.includes("action"));

  return <main className="dom-game-shell tbl-light dominion-theme">
    <GameHeader computerSpeed={computerSpeed}
      title="Dominion"
      room={room}
      subtitle={`Room ${room.roomCode}`}
      status={room.phase === "finished" ? "Realm complete" : myChoice ? "Your response" : myTurn ? `Your ${room.turnPhase} phase` : computerWaiting && computer ? `${computer.name} is deciding...` : `${actor?.name}'s turn`}
      onRules={() => setShowRules(true)}
      onLeave={leaveRoom}
    />

    {error && <div className="dom-error" role="alert">{error}<button aria-label="Dismiss" onClick={() => setError("")}><X /></button></div>}
    {room.pendingChoice && !myChoice && <div className="dom-wait-banner"><ScrollText /> Waiting for {room.players.find((player) => player.id === room.pendingChoice.playerId)?.name} to resolve {choiceName(room.pendingChoice.type)}.</div>}

    <div className="dom-layout">
      <aside className="dom-sidebar">
        <PanelTitle icon={Users} eyebrow="The council" title="Monarchs" />
        <div className="dom-player-list">{room.players.map((player, index) => <PlayerSummary key={player.id} player={player} active={actor?.id === player.id && room.phase !== "finished"} isMe={player.id === playerId} isHost={index === 0} winner={room.winners.includes(player.id)} />)}</div>
        <div className="dom-log"><PanelTitle icon={ScrollText} eyebrow="Latest decrees" title="Chronicle" />{room.log.slice(0, 7).map((line, index) => <p key={`${line}-${index}`}>{line}</p>)}</div>
      </aside>

      <section className="dom-supply">
        <div className="dom-supply-heading"><div><p className="dom-kicker">Shared card piles</p><h2>The Supply</h2></div><span>{Object.values(room.supply).filter((count) => count === 0).length} / {emptyPileLimit(room)} piles empty</span></div>
        <div className="dom-base-row">{BASE_CARD_IDS.map((id) => <SupplyPile key={id} id={id} count={room.supply[id]} player={me} canBuy={myTurn && !room.pendingChoice && room.turnPhase === "buy"} busy={busy} onBuy={() => act("buy", { cardId: id })} />)}</div>
        <div className="dom-kingdom-label"><Sparkles /><span><small>First-game kingdom</small>Actions that shape your deck</span></div>
        <div className="dom-kingdom-grid">{KINGDOM_CARD_IDS.map((id) => <SupplyPile key={id} id={id} count={room.supply[id]} player={me} canBuy={myTurn && !room.pendingChoice && room.turnPhase === "buy"} busy={busy} onBuy={() => act("buy", { cardId: id })} />)}</div>
      </section>

      <aside className="dom-turn-panel">
        <PanelTitle icon={Crown} eyebrow={`Turn ${room.turnNumber}`} title={myTurn ? "Your council" : `${actor?.name}'s council`} />
        <div className="dom-turn-resources"><Resource value={actor?.actions ?? 0} label="Actions" /><Resource value={actor?.buys ?? 0} label="Buys" /><Resource value={actor?.coins ?? 0} label="Coins" icon /></div>
        <div className={`dom-phase-card phase-${room.turnPhase}`}><small>Current phase</small><strong>{room.turnPhase === "action" ? "A. Play actions" : "B. Buy cards"}</strong><p>{room.turnPhase === "action" ? "Play an Action from your hand, or move on. Treasures are played automatically." : "Choose an affordable Supply pile, then end your turn."}</p></div>
        {myTurn && !room.pendingChoice && room.turnPhase === "action" && <button className="dom-primary" disabled={busy} onClick={() => act("toBuy")}><Coins /> Enter Buy phase</button>}
        {myTurn && !room.pendingChoice && room.turnPhase === "buy" && <button className="dom-primary" disabled={busy} onClick={() => act("endTurn")}><Check /> End turn</button>}
        {myTurn && room.turnPhase === "action" && !actionCards.length && <p className="dom-coach">No Actions in hand. Enter the Buy phase to play all Treasure cards automatically.</p>}
        <div className="dom-trash"><span><Swords /> Trash</span><strong>{room.trash.length}</strong><small>{room.trash.length ? CARD_DEFINITIONS[room.trash.at(-1)]?.name : "No cards trashed"}</small></div>
      </aside>
    </div>

    <section className="dom-player-area">
      <div className="dom-hand-heading"><div><p className="dom-kicker">Your private cards</p><h2>Your hand <span>{me.hand.length}</span></h2></div><div className="dom-zone-counts"><span><strong>{me.deckCount}</strong> deck</span><span><strong>{me.discard.length}</strong> discard</span><span><strong>{me.inPlay.length}</strong> in play</span></div></div>
      <CardFan className="dom-hand" count={me.hand.length}>{me.hand.map((id, index) => <CardFace key={`${id}-${index}`} id={id} compact disabled={!myTurn || busy || room.turnPhase !== "action" || me.actions < 1 || !CARD_DEFINITIONS[id].types.includes("action") || Boolean(room.pendingChoice)} onClick={() => act("play", { handIndex: index })} />)}</CardFan>
      {me.inPlay.length > 0 && <div className="dom-in-play"><strong>In play</strong><div>{me.inPlay.map((id, index) => <span key={`${id}-${index}`}>{CARD_DEFINITIONS[id].name}</span>)}</div></div>}
    </section>

    {myChoice && <ChoiceDialog room={room} player={me} selected={selectedIndices} setSelected={setSelectedIndices} busy={busy} onResolve={(payload) => act("resolve", payload)} />}
    {showRules && <RulesDrawer onClose={() => setShowRules(false)} />}
    {room.phase === "finished" && <Results room={room} playerId={playerId} onLeave={leaveRoom} />}
  </main>;
}

function PanelTitle({ icon: Icon, eyebrow, title }) { return <div className="dom-panel-title"><Icon /><span><small>{eyebrow}</small><strong>{title}</strong></span></div>; }
function Resource({ value, label, icon }) { return <div><strong>{icon && <Coins />}{value}</strong><small>{label}</small></div>; }

function PlayerSummary({ player, active, isMe, isHost, winner }) {
  return <div className={`dom-player ${active ? "active" : ""} ${winner ? "winner" : ""}`}><span className="dom-avatar" style={{ "--player": player.color }}>{player.isComputer ? <Bot /> : player.name[0]}</span><p><strong>{player.name}{isMe ? " (you)" : ""}</strong><small>{handSize(player)} in hand · {cardTotal(player)} cards</small></p><b>{player.isComputer ? <Bot /> : isHost ? <Crown /> : null}</b></div>;
}

function SupplyPile({ id, count, player, canBuy, busy, onBuy }) {
  const definition = CARD_DEFINITIONS[id];
  const affordable = canBuy && player.buys > 0 && player.coins >= definition.cost && count > 0;
  return <CardFace id={id} count={count} affordable={affordable} disabled={!affordable || busy} onClick={onBuy} />;
}

function CardFace({ id, count, affordable, compact, disabled, selected, onClick }) {
  const definition = CARD_DEFINITIONS[id];
  const Icon = ICONS[id] || Crown;
  const kind = definition.types[0];
  return <button type="button" className={`dom-card kind-${kind} ${compact ? "compact" : ""} ${affordable ? "affordable" : ""} ${selected ? "selected" : ""}`} disabled={disabled} onClick={onClick} aria-label={`${definition.name}${count != null ? `, ${count} remaining` : ""}`}><span className="dom-card-cost"><Coins />{definition.cost}</span>{count != null && <span className="dom-card-count">{count}</span>}<span className="dom-card-art"><Icon /></span><strong>{definition.name}</strong><p>{definition.text}</p><small>{definition.types.join(" · ")}</small></button>;
}

function ChoiceDialog({ room, player, selected, setSelected, busy, onResolve }) {
  const choice = room.pendingChoice;
  if (choice.type === "gain") {
    const options = Object.keys(room.supply).filter((id) => room.supply[id] > 0 && CARD_DEFINITIONS[id].cost <= choice.maxCost && (!choice.treasureOnly || CARD_DEFINITIONS[id].types.includes("treasure")));
    return <Modal eyebrow={choice.source} title={`Gain a card costing up to ${choice.maxCost}`} note={choice.destination === "hand" ? "The gained Treasure goes directly into your hand." : "The gained card goes to your discard pile."}><div className="dom-choice-supply">{options.map((id) => <SupplyPile key={id} id={id} count={room.supply[id]} player={{ buys: 1, coins: choice.maxCost }} canBuy busy={busy} onBuy={() => onResolve({ cardId: id })} />)}</div></Modal>;
  }
  if (choice.type === "remodel-trash" || choice.type === "mine-trash") {
    const mine = choice.type === "mine-trash";
    return <Modal eyebrow={mine ? "Mine" : "Remodel"} title={mine ? "Choose a Treasure to improve" : "Choose a card to remodel"} note={mine ? "Trash it, then gain a Treasure costing up to 3 more to your hand." : "Trash it, then gain any card costing up to 2 more."}><div className="dom-choice-hand">{player.hand.map((id, index) => <CardFace key={`${id}-${index}`} id={id} compact disabled={busy || (mine && !CARD_DEFINITIONS[id].types.includes("treasure"))} onClick={() => onResolve({ index })} />)}</div>{mine && <button className="dom-secondary" disabled={busy} onClick={() => onResolve({ cancel: true })}>Skip Mine</button>}</Modal>;
  }
  const militia = choice.type === "militia-discard";
  const required = militia ? choice.count : null;
  const toggle = (index) => setSelected((current) => current.includes(index) ? current.filter((item) => item !== index) : required != null && current.length >= required ? current : [...current, index]);
  return <Modal eyebrow={militia ? "Militia attack" : "Cellar"} title={militia ? `Discard ${required} card${required === 1 ? "" : "s"}` : "Choose cards to cycle"} note={militia ? "You must finish with exactly three cards in hand." : "Discard any number, then draw the same number."}><div className="dom-choice-hand">{player.hand.map((id, index) => <CardFace key={`${id}-${index}`} id={id} compact selected={selected.includes(index)} disabled={busy} onClick={() => toggle(index)} />)}</div><button className="dom-primary" disabled={busy || (required != null && selected.length !== required)} onClick={() => onResolve({ indices: selected })}>{militia ? `Discard ${selected.length} of ${required}` : `Discard and draw ${selected.length}`}</button></Modal>;
}

function choiceName(type) {
  if (type === "militia-discard") return "a Militia attack";
  if (type.includes("mine")) return "Mine";
  if (type.includes("remodel")) return "Remodel";
  if (type === "cellar") return "Cellar";
  return "a card choice";
}

function Modal({ eyebrow, title, note, children }) {
  return <ChoiceModal wide title={title} text={<><strong>{eyebrow}.</strong> {note}</>}>{children}</ChoiceModal>;
}

function RulesDrawer({ onClose }) {
  return <ChoiceModal wide title="Build your Dominion" text="Everyone begins with seven Coppers and three Estates. Buy stronger cards, improve how your deck cycles, and own the most victory points when the game ends." onClose={onClose}>
    <p className="tbl-rule-heading">Your turn: ABC</p>
    <div className="tbl-rule-grid">
      <article><b>Action</b><p>Play one Action card by default. Villages and Markets can grant more Actions.</p></article>
      <article><b>Buy</b><p>Enter Buy to play all Treasures automatically, then buy one affordable Supply card by default.</p></article>
      <article><b>Cleanup</b><p>End your turn. Your hand and played cards are discarded, then you draw five.</p></article>
    </div>
    <p className="tbl-rule-heading">End of game</p>
    <p className="tbl-modal-copy">At 2–4 players, the game ends when Provinces or any three Supply piles are empty. At 5–6 players, the Base Cards expansion increases that threshold to four piles and supplies 15 or 18 Provinces. Highest total victory points wins; fewer turns breaks a tie.</p>
    <p className="tbl-rule-heading">This kingdom</p>
    <p className="tbl-modal-copy">This digital edition uses the official recommended first-game set: Cellar, Market, Merchant, Militia, Mine, Moat, Remodel, Smithy, Village, and Workshop.</p>
    <a className="tbl-link" href="https://www.riograndegames.com/games/dominion-base-cards/" target="_blank" rel="noreferrer"><ScrollText aria-hidden="true" /> Official Base Cards rules</a>
  </ChoiceModal>;
}

function Results({ room, playerId, onLeave }) {
  const ranked = [...room.players].sort((a, b) => room.scores[b.id] - room.scores[a.id] || a.turnsTaken - b.turnsTaken);
  const won = room.winners.includes(playerId);
  return <SharedResults
    title={won ? "Your Dominion prevails" : `${ranked[0].name} claims the realm`}
    text="Victory cards across every deck, hand, discard pile, and play area determine the final standing."
    rows={ranked.map((player) => ({ id: player.id, name: `${player.name}${player.id === playerId ? " (you)" : ""}`, value: `${room.scores[player.id]} VP`, note: `${cardTotal(player)} cards · ${player.turnsTaken} turns` }))}
  >
    <button type="button" className="tbl-primary" onClick={onLeave}>Return to the great hall</button>
  </SharedResults>;
}
