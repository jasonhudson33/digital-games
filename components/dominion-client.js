"use client";

import { useEffect, useState } from "react";
import {
  Bot, Castle, Check, ChevronRight, CircleHelp, Coins, Copy, Crown, Gem, Hammer,
  Landmark, LogOut, Plus, ScrollText, Shield, Sparkles, Swords, Users, X,
} from "lucide-react";
import { DominionRoomService } from "./dominion-room-service";
import {
  BASE_CARD_IDS,
  CARD_DEFINITIONS,
  KINGDOM_CARD_IDS,
  MAX_PLAYERS,
  addComputerPlayer,
  addPlayer,
  advanceToBuy,
  allPlayerCards,
  buyCard,
  computerPlayerToAct,
  createLobby,
  currentPlayer,
  endTurn,
  emptyPileLimit,
  playAction,
  removeComputerPlayer,
  resolveChoice,
  runComputerTurn,
  scorePlayer,
  startGame,
} from "../lib/dominion";
import { useGameRoom } from "../lib/use-game-room.js";

const ICONS = {
  copper: Coins, silver: Coins, gold: Coins, estate: Landmark, duchy: Castle, province: Crown,
  curse: Swords, cellar: Castle, market: Landmark, merchant: Coins, militia: Swords,
  mine: Gem, moat: Shield, remodel: Hammer, smithy: Hammer, village: Users, workshop: Hammer,
};

export default function DominionClient() {
  const {
    room, setRoom, playerId, name, setName, joinCode, setJoinCode, busy, error, setError,
    createRoom, joinRoom, update,
  } = useGameRoom({ service: DominionRoomService, storageKey: "dominion", createLobby, addPlayer, maxPlayers: MAX_PLAYERS });
  const [showRules, setShowRules] = useState(false);
  const [selectedIndices, setSelectedIndices] = useState([]);
  const [computerThinking, setComputerThinking] = useState(false);

  const me = room?.players.find((player) => player.id === playerId) ?? null;
  const actor = room ? currentPlayer(room) : null;
  const computer = room ? computerPlayerToAct(room) : null;

  useEffect(() => {
    if (!room || room.hostId !== playerId || !computer) {
      setComputerThinking(false);
      return undefined;
    }
    let cancelled = false;
    setComputerThinking(true);
    const timer = window.setTimeout(async () => {
      try { await update((current) => runComputerTurn(current)); }
      finally { if (!cancelled) setComputerThinking(false); }
    }, 650);
    return () => { cancelled = true; window.clearTimeout(timer); };
  }, [computer?.id, room?.pendingChoice?.type, room?.updatedAt, room?.hostId, playerId]);

  useEffect(() => setSelectedIndices([]), [room?.pendingChoice?.type, room?.pendingChoice?.playerId]);

  function leaveRoom() {
    if (room?.phase !== "lobby" && !window.confirm("Leave this realm? You can return later with the room code.")) return;
    try { localStorage.removeItem("dominion-active-room"); } catch { /* nothing to forget */ }
    setRoom(null);
    setError("");
  }

  if (!room || !me) return <Landing {...{ name, setName, joinCode, setJoinCode, createRoom, joinRoom, busy, error }} />;
  if (room.phase === "lobby") return <Lobby room={room} me={me} busy={busy} error={error} onAddComputer={() => update(addComputerPlayer)} onRemoveComputer={(id) => update((current) => removeComputerPlayer(current, id))} onStart={() => update(startGame)} onLeave={leaveRoom} />;

  const myTurn = room.phase === "playing" && actor?.id === playerId;
  const myChoice = room.pendingChoice?.playerId === playerId;
  const actionCards = me.hand.filter((id) => CARD_DEFINITIONS[id].types.includes("action"));

  return <main className="dom-game-shell">
    <header className="dom-table-header">
      <div><p className="dom-kicker">Room {room.roomCode}</p><h1><Crown /> Dominion</h1></div>
      <div className={`dom-turn ${myTurn ? "mine" : ""}`}>{computerThinking && computer ? <Bot /> : <span style={{ background: actor?.color }} />}{room.phase === "finished" ? "Realm complete" : myChoice ? "Your response" : myTurn ? `Your ${room.turnPhase} phase` : computerThinking && computer ? `${computer.name} is deciding...` : `${actor?.name}'s turn`}</div>
      <button className="dom-code" onClick={() => navigator.clipboard?.writeText(room.roomCode)}><Copy /> {room.roomCode}</button>
      <button className="dom-icon-button" aria-label="Open rules" onClick={() => setShowRules(true)}><CircleHelp /></button>
      <button className="dom-leave" onClick={leaveRoom}><LogOut /> Leave</button>
    </header>

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
        <div className="dom-base-row">{BASE_CARD_IDS.map((id) => <SupplyPile key={id} id={id} count={room.supply[id]} player={me} canBuy={myTurn && !room.pendingChoice && room.turnPhase === "buy"} busy={busy} onBuy={() => update((current) => buyCard(current, playerId, id))} />)}</div>
        <div className="dom-kingdom-label"><Sparkles /><span><small>First-game kingdom</small>Actions that shape your deck</span></div>
        <div className="dom-kingdom-grid">{KINGDOM_CARD_IDS.map((id) => <SupplyPile key={id} id={id} count={room.supply[id]} player={me} canBuy={myTurn && !room.pendingChoice && room.turnPhase === "buy"} busy={busy} onBuy={() => update((current) => buyCard(current, playerId, id))} />)}</div>
      </section>

      <aside className="dom-turn-panel">
        <PanelTitle icon={Crown} eyebrow={`Turn ${room.turnNumber}`} title={myTurn ? "Your council" : `${actor?.name}'s council`} />
        <div className="dom-turn-resources"><Resource value={actor?.actions ?? 0} label="Actions" /><Resource value={actor?.buys ?? 0} label="Buys" /><Resource value={actor?.coins ?? 0} label="Coins" icon /></div>
        <div className={`dom-phase-card phase-${room.turnPhase}`}><small>Current phase</small><strong>{room.turnPhase === "action" ? "A. Play actions" : "B. Buy cards"}</strong><p>{room.turnPhase === "action" ? "Play an Action from your hand, or move on. Treasures are played automatically." : "Choose an affordable Supply pile, then end your turn."}</p></div>
        {myTurn && !room.pendingChoice && room.turnPhase === "action" && <button className="dom-primary" disabled={busy} onClick={() => update((current) => advanceToBuy(current, playerId))}><Coins /> Enter Buy phase</button>}
        {myTurn && !room.pendingChoice && room.turnPhase === "buy" && <button className="dom-primary" disabled={busy} onClick={() => update((current) => endTurn(current, playerId))}><Check /> End turn</button>}
        {myTurn && room.turnPhase === "action" && !actionCards.length && <p className="dom-coach">No Actions in hand. Enter the Buy phase to play all Treasure cards automatically.</p>}
        <div className="dom-trash"><span><Swords /> Trash</span><strong>{room.trash.length}</strong><small>{room.trash.length ? CARD_DEFINITIONS[room.trash.at(-1)]?.name : "No cards trashed"}</small></div>
      </aside>
    </div>

    <section className="dom-player-area">
      <div className="dom-hand-heading"><div><p className="dom-kicker">Your private cards</p><h2>Your hand <span>{me.hand.length}</span></h2></div><div className="dom-zone-counts"><span><strong>{me.deck.length}</strong> deck</span><span><strong>{me.discard.length}</strong> discard</span><span><strong>{me.inPlay.length}</strong> in play</span></div></div>
      <div className="dom-hand">{me.hand.map((id, index) => <CardFace key={`${id}-${index}`} id={id} compact disabled={!myTurn || busy || room.turnPhase !== "action" || me.actions < 1 || !CARD_DEFINITIONS[id].types.includes("action") || Boolean(room.pendingChoice)} onClick={() => update((current) => playAction(current, playerId, index))} />)}</div>
      {me.inPlay.length > 0 && <div className="dom-in-play"><strong>In play</strong><div>{me.inPlay.map((id, index) => <span key={`${id}-${index}`}>{CARD_DEFINITIONS[id].name}</span>)}</div></div>}
    </section>

    {myChoice && <ChoiceDialog room={room} player={me} selected={selectedIndices} setSelected={setSelectedIndices} busy={busy} onResolve={(payload) => update((current) => resolveChoice(current, playerId, payload))} />}
    {showRules && <RulesDrawer onClose={() => setShowRules(false)} />}
    {room.phase === "finished" && <Results room={room} playerId={playerId} onLeave={leaveRoom} />}
  </main>;
}

function Landing({ name, setName, joinCode, setJoinCode, createRoom, joinRoom, busy, error }) {
  return <main className="dom-landing"><section className="dom-hero"><div className="dom-hero-copy"><p className="dom-kicker">The original deck-building game</p><h1>Domi<span>nion</span></h1><p>Begin with a humble estate. Recruit villages, markets, smithies, and scheming courtiers until your deck becomes a kingdom worth ruling.</p><div className="dom-features"><span><Users /> 2–6 players</span><span><Bot /> Computer monarchs</span><span><Coins /> Base Cards expansion</span></div></div><div className="dom-hero-art"><div className="dom-sun" /><Castle /><span className="dom-banner left">D</span><span className="dom-banner right">G</span></div></section><section className="dom-entry"><p className="dom-kicker">The great hall</p><h2>Claim your seat</h2><p>Create a private room for up to six monarchs, invite friends with a five-character code, or fill the council with computer rivals.</p><label>Your monarch name<input value={name} maxLength={24} autoComplete="nickname" onChange={(event) => setName(event.target.value)} placeholder="e.g. Eleanor" /></label><button className="dom-primary" disabled={busy} onClick={createRoom}><Plus /> Create a room</button><div className="dom-divider"><span>or join a realm</span></div><div className="dom-join"><input aria-label="Room code" value={joinCode} maxLength={5} onChange={(event) => setJoinCode(event.target.value.toUpperCase())} placeholder="ROOM CODE" /><button disabled={busy} onClick={joinRoom}>Join <ChevronRight /></button></div>{error && <p className="dom-form-error">{error}</p>}<a className="dom-official" href="https://www.riograndegames.com/games/dominion-base-cards/" target="_blank" rel="noreferrer"><ScrollText /> Official Base Cards rules</a></section></main>;
}

function Lobby({ room, me, busy, error, onAddComputer, onRemoveComputer, onStart, onLeave }) {
  const isHost = room.hostId === me.id;
  return <main className="dom-lobby"><section className="dom-lobby-card"><div className="dom-lobby-seal"><Crown /></div><p className="dom-kicker">Your private realm</p><h1>The council assembles</h1><button className="dom-room-display" onClick={() => navigator.clipboard?.writeText(room.roomCode)}><span>{room.roomCode}</span><small><Copy /> Copy invite code</small></button><div className="dom-lobby-players">{room.players.map((player, index) => <div className="occupied" key={player.id}><span className="dom-avatar" style={{ "--player": player.color }}>{player.isComputer ? <Bot /> : player.name[0]}</span><p><strong>{player.name}</strong><small>{index === 0 ? "Host monarch" : player.isComputer ? "Computer monarch" : "Ready to rule"}</small></p>{player.isComputer && isHost ? <button aria-label={`Remove ${player.name}`} onClick={() => onRemoveComputer(player.id)}><X /></button> : <Check />}</div>)}{Array.from({ length: MAX_PLAYERS - room.players.length }, (_, index) => <div className="empty" key={index}><span className="dom-avatar"><Users /></span><p><strong>Open seat</strong><small>Invite a friend or summon a rival</small></p></div>)}</div>{room.players.length >= 5 && <div className="dom-expanded-note"><Sparkles /><span><strong>Base Cards expansion active</strong><small>Expanded Treasure, Province, and Curse supplies with a four-pile ending.</small></span></div>}{isHost && room.players.length < MAX_PLAYERS && <button className="dom-add-bot" disabled={busy} onClick={onAddComputer}><Bot /> Add computer monarch</button>}{isHost ? <button className="dom-primary dom-start" disabled={busy || room.players.length < 2} onClick={onStart}><Crown /> Begin the reign</button> : <p className="dom-waiting">Waiting for {room.players[0].name} to begin...</p>}<button className="dom-quiet" onClick={onLeave}><LogOut /> Leave room</button>{room.players.length < 2 && isHost && <p className="dom-waiting">Invite at least one monarch or add a computer to begin.</p>}{error && <p className="dom-form-error">{error}</p>}</section></main>;
}

function PanelTitle({ icon: Icon, eyebrow, title }) { return <div className="dom-panel-title"><Icon /><span><small>{eyebrow}</small><strong>{title}</strong></span></div>; }
function Resource({ value, label, icon }) { return <div><strong>{icon && <Coins />}{value}</strong><small>{label}</small></div>; }

function PlayerSummary({ player, active, isMe, isHost, winner }) {
  return <div className={`dom-player ${active ? "active" : ""} ${winner ? "winner" : ""}`}><span className="dom-avatar" style={{ "--player": player.color }}>{player.isComputer ? <Bot /> : player.name[0]}</span><p><strong>{player.name}{isMe ? " (you)" : ""}</strong><small>{player.hand.length} in hand · {allPlayerCards(player).length} cards</small></p><b>{player.isComputer ? <Bot /> : isHost ? <Crown /> : null}</b></div>;
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

function Modal({ eyebrow, title, note, children }) { return <div className="dom-overlay"><section className="dom-modal"><p className="dom-kicker">{eyebrow}</p><h2>{title}</h2><p>{note}</p>{children}</section></div>; }

function RulesDrawer({ onClose }) {
  return <div className="dom-rules-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}><aside className="dom-rules"><button className="dom-rules-close" aria-label="Close rules" onClick={onClose}><X /></button><p className="dom-kicker">How to play</p><h2>Build your Dominion</h2><p>Everyone begins with seven Coppers and three Estates. Buy stronger cards, improve how your deck cycles, and own the most victory points when the game ends.</p><h3>Your turn: ABC</h3><ol><li><strong>Action:</strong> Play one Action card by default. Villages and Markets can grant more Actions.</li><li><strong>Buy:</strong> Enter Buy to play all Treasures automatically, then buy one affordable Supply card by default.</li><li><strong>Cleanup:</strong> End your turn. Your hand and played cards are discarded, then you draw five.</li></ol><h3>End of game</h3><p>At 2–4 players, the game ends when Provinces or any three Supply piles are empty. At 5–6 players, the Base Cards expansion increases that threshold to four piles and supplies 15 or 18 Provinces. Highest total victory points wins; fewer turns breaks a tie.</p><h3>This kingdom</h3><p>This digital edition uses the official recommended first-game set: Cellar, Market, Merchant, Militia, Mine, Moat, Remodel, Smithy, Village, and Workshop.</p><a href="https://www.riograndegames.com/games/dominion-base-cards/" target="_blank" rel="noreferrer"><ScrollText /> Official Base Cards rules <ChevronRight /></a></aside></div>;
}

function Results({ room, playerId, onLeave }) {
  const ranked = [...room.players].sort((a, b) => room.scores[b.id] - room.scores[a.id] || a.turnsTaken - b.turnsTaken);
  const won = room.winners.includes(playerId);
  return <div className="dom-overlay"><section className="dom-results"><div className="dom-results-crown"><Crown /></div><p className="dom-kicker">The realm is complete</p><h2>{won ? "Your Dominion prevails" : `${ranked[0].name} claims the realm`}</h2><p>Victory cards across every deck, hand, discard pile, and play area determine the final standing.</p><div>{ranked.map((player, index) => <article className={room.winners.includes(player.id) ? "winner" : ""} key={player.id}><b>{index + 1}</b><span className="dom-avatar" style={{ "--player": player.color }}>{player.isComputer ? <Bot /> : player.name[0]}</span><p><strong>{player.name}{player.id === playerId ? " (you)" : ""}</strong><small>{allPlayerCards(player).length} cards · {player.turnsTaken} turns</small></p><em>{room.scores[player.id]}<small> VP</small></em>{room.winners.includes(player.id) && <Crown />}</article>)}</div><button className="dom-primary" onClick={onLeave}>Return to the great hall</button></section></div>;
}

function choiceName(type) {
  if (type === "militia-discard") return "a Militia attack";
  if (type.includes("mine")) return "Mine";
  if (type.includes("remodel")) return "Remodel";
  if (type === "cellar") return "Cellar";
  return "a card choice";
}
