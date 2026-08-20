"use client";

import { useEffect, useMemo, useState } from "react";
import { Bot, Check, ChevronRight, CircleHelp, Copy, Crown, Gem, Landmark, LockKeyhole, LogOut, Plus, ScrollText, Sparkles, Users, X } from "lucide-react";
import { SplendorRoomService } from "./splendor-room-service";
import {
  GEM_COLORS,
  GEM_INFO,
  addComputerPlayer,
  addPlayer,
  canPurchase,
  chooseNoble,
  createLobby,
  currentPlayer,
  paymentForCard,
  purchaseCard,
  removeComputerPlayer,
  reserveCard,
  returnTokens,
  runComputerTurn,
  startGame,
  takeDifferentTokens,
  takePairTokens,
  tokenCount,
} from "../lib/splendor";
import { useGameRoom } from "../lib/use-game-room.js";

const playerIdKey = "splendor-player-id";
const playerNameKey = "splendor-player-name";
const activeRoomKey = "splendor-active-room";
const cardArt = {
  white: "/splendor/cards/white.png",
  blue: "/splendor/cards/blue.png",
  green: "/splendor/cards/green.png",
  red: "/splendor/cards/red.png",
  black: "/splendor/cards/black.png",
};

export default function SplendorClient() {
  const {
    room, setRoom, playerId, name, setName, joinCode, setJoinCode,
    busy, setBusy, error, setError, createRoom, joinRoom, update,
  } = useGameRoom({
    service: SplendorRoomService,
    storageKey: "splendor",
    createLobby: createLobby,
    addPlayer: addPlayer,
    maxPlayers: 4,
  });
  const [selectedGems, setSelectedGems] = useState([]);
  const [returns, setReturns] = useState({});
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
      try { await update((current) => runComputerTurn(current)); }
      finally { if (!cancelled) setComputerThinking(false); }
    }, 720);
    return () => { cancelled = true; window.clearTimeout(timer); };
  }, [botNeedsAction, actor?.id, playerId, room?.updatedAt]);

  useEffect(() => {
    setSelectedGems([]);
  }, [room?.currentPlayerIndex, room?.turnNumber]);

  function leaveRoom() {
    if (room?.phase !== "lobby" && !window.confirm("Leave this table? You can return later with the same room code.")) return;
    localStorage.removeItem(activeRoomKey);
    setRoom(null); setSelectedGems([]); setError("");
  }

  function buy(source, card) {
    if (!room || !me || currentPlayer(room)?.id !== playerId || room.phase !== "playing") return;
    if (!canPurchase(me, card)) { setError("You cannot afford that development yet."); return; }
    update((current) => purchaseCard(current, playerId, source));
  }

  if (!room || !me) return <Landing name={name} setName={setName} joinCode={joinCode} setJoinCode={setJoinCode} createRoom={createRoom} joinRoom={joinRoom} busy={busy} error={error} />;
  if (room.phase === "lobby") return <Lobby room={room} me={me} busy={busy} error={error} onAddComputer={() => update(addComputerPlayer)} onRemoveComputer={(id) => update((current) => removeComputerPlayer(current, id))} onStart={() => update(startGame)} onLeave={leaveRoom} />;

  const myTurn = room.phase === "playing" && actor?.id === playerId;
  const availableColors = GEM_COLORS.filter((color) => room.bank[color] > 0);
  const requiredDifferent = Math.min(3, availableColors.length);

  return <main className="splendor-game-shell">
    <header className="splendor-table-header">
      <div><p className="splendor-kicker">Room {room.roomCode}</p><h1><Gem /> Splendor</h1></div>
      <div className={`splendor-turn ${myTurn ? "mine" : ""}`}>{actor?.isComputer ? <Bot /> : <span style={{ background: actor?.color }} />}{room.phase === "finished" ? "Trading complete" : myTurn ? "Your turn" : computerThinking && actor?.isComputer ? `${actor.name} is considering…` : `${actor?.name}'s turn`}</div>
      <button className="splendor-code" onClick={() => navigator.clipboard?.writeText(room.roomCode)}><Copy /> {room.roomCode}</button>
      <button className="splendor-icon-button" aria-label="Open rules" onClick={() => setShowRules(true)}><CircleHelp /></button>
      <button className="splendor-leave" onClick={leaveRoom}><LogOut /> Leave</button>
    </header>

    {room.finalRoundTriggeredBy && room.phase !== "finished" && <div className="splendor-final-banner"><Crown /> Final round — finish the table, then highest prestige wins.</div>}
    {error && <div className="splendor-error" role="alert">{error}<button aria-label="Dismiss" onClick={() => setError("")}><X /></button></div>}

    <div className="splendor-layout">
      <aside className="splendor-sidebar">
        <div className="splendor-panel-title"><Users /><span><small>Trading houses</small>Players</span></div>
        <div className="splendor-player-list">{room.players.map((player, index) => <PlayerSummary key={player.id} player={player} active={actor?.id === player.id && room.phase !== "finished"} isMe={player.id === playerId} isHost={index === 0} winner={room.winners.includes(player.id)} />)}</div>
        <div className="splendor-log"><div className="splendor-panel-title"><ScrollText /><span><small>Latest moves</small>Ledger</span></div>{room.log.slice(0, 6).map((line, index) => <p key={`${line}-${index}`}>{line}</p>)}</div>
      </aside>

      <section className="splendor-board">
        <div className="splendor-nobles"><div className="splendor-row-label"><Crown /><span><small>Attract patrons</small>Nobles</span></div><div className="splendor-noble-list">{room.nobles.map((noble) => <NobleTile key={noble.id} noble={noble} />)}</div></div>
        {[3, 2, 1].map((level) => <div className="splendor-market-row" key={level}>
          <Deck level={level} count={room.decks[level].length} disabled={!myTurn || busy || me.reserved.length >= 3} onReserve={() => update((current) => reserveCard(current, playerId, { kind: "deck", level }))} />
          <div className="splendor-development-list">{room.market[level].map((card, index) => <DevelopmentCard key={card.id} card={card} affordable={myTurn && canPurchase(me, card)} disabled={!myTurn || busy} onBuy={() => buy({ kind: "market", level, index }, card)} onReserve={() => update((current) => reserveCard(current, playerId, { kind: "market", level, index }))} canReserve={myTurn && me.reserved.length < 3} />)}</div>
        </div>)}
      </section>

      <aside className="splendor-bank">
        <div className="splendor-panel-title"><Landmark /><span><small>Shared supply</small>Gem bank</span></div>
        <p className="splendor-bank-help">{myTurn ? selectedGems.length ? `Choose ${requiredDifferent - selectedGems.length} more different gem${requiredDifferent - selectedGems.length === 1 ? "" : "s"}, or change your selection.` : "Take three different gems, or two of one color when four remain." : "The bank is ready for the active merchant."}</p>
        <div className="splendor-token-bank">{GEM_COLORS.map((color) => <BankToken key={color} color={color} count={room.bank[color]} selected={selectedGems.includes(color)} disabled={!myTurn || busy || room.bank[color] === 0} pairDisabled={!myTurn || busy || room.bank[color] < 4} onToggle={() => setSelectedGems((current) => current.includes(color) ? current.filter((item) => item !== color) : current.length < requiredDifferent ? [...current, color] : current)} onPair={() => update((current) => takePairTokens(current, playerId, color))} />)}<BankToken color="gold" count={room.bank.gold} disabled pairDisabled /> </div>
        <button className="splendor-primary splendor-take" disabled={!myTurn || busy || selectedGems.length !== requiredDifferent || requiredDifferent === 0} onClick={() => update((current) => takeDifferentTokens(current, playerId, selectedGems))}><Gem /> Take selected gems</button>
        <div className="splendor-action-note"><Sparkles /><p><strong>{myTurn ? "Choose one action" : `${actor?.name} is at the market`}</strong><span>{myTurn ? "Gather gems, buy one development, or reserve one for later." : "You can inspect every cost while you wait."}</span></p></div>
      </aside>
    </div>

    <section className="splendor-tableau">
      <div className="splendor-tableau-heading"><div><p className="splendor-kicker">Your trading house</p><h2>{me.score} prestige · {tokenCount(me)} tokens</h2></div><div className="splendor-player-token-strip">{[...GEM_COLORS, "gold"].map((color) => <MiniGem key={color} color={color} count={me.tokens[color]} />)}</div></div>
      <div className="splendor-bonus-grid">{GEM_COLORS.map((color) => <div className={`splendor-bonus-stack ${color}`} key={color}><span className="splendor-bonus-gem"><Gem /></span><strong>{me.bonuses[color]}</strong><small>{GEM_INFO[color].name} bonus</small><em>{me.developments.filter((card) => card.bonus === color).reduce((sum, card) => sum + card.points, 0)} prestige</em></div>)}</div>
      <div className="splendor-reserved"><div><LockKeyhole /><span><strong>Reserved developments</strong><small>Private to you · {me.reserved.length}/3</small></span></div>{me.reserved.length ? <div className="splendor-reserved-list">{me.reserved.map((card, index) => <DevelopmentCard key={card.id} card={card} affordable={myTurn && canPurchase(me, card)} disabled={!myTurn || busy} onBuy={() => buy({ kind: "reserved", index }, card)} reserved />)}</div> : <p>Reserve a face-up card—or draw blindly from a deck—to secure it and take one gold.</p>}</div>
    </section>

    {room.pendingReturn?.playerId === playerId && <ReturnModal player={me} count={room.pendingReturn.count} selected={returns} setSelected={setReturns} busy={busy} onConfirm={() => { update((current) => returnTokens(current, playerId, returns)); setReturns({}); }} />}
    {room.pendingNoble?.playerId === playerId && <NobleChoice nobles={room.nobles.filter((noble) => room.pendingNoble.nobleIds.includes(noble.id))} onChoose={(id) => update((current) => chooseNoble(current, playerId, id))} />}
    {showRules && <RulesDrawer onClose={() => setShowRules(false)} />}
    {room.phase === "finished" && <Results room={room} playerId={playerId} onLeave={leaveRoom} />}
  </main>;
}

function Landing({ name, setName, joinCode, setJoinCode, createRoom, joinRoom, busy, error }) {
  return <main className="splendor-landing"><section className="splendor-hero"><div className="splendor-hero-copy"><p className="splendor-kicker">A Renaissance engine-building game</p><h1>Splen<span>dor</span></h1><p>Gather brilliant gems. Invest in mines and artisans. Build an engine of permanent bonuses—and become the first merchant to command fifteen prestige.</p><div className="splendor-features"><span><Users /> 2–4 players</span><span><Bot /> Computer rivals</span><span><Crown /> Race to 15</span></div></div><div className="splendor-hero-art"><div className="splendor-arch" /><div className="splendor-sunburst" />{["white", "blue", "green", "red", "black"].map((color, index) => <span className={`splendor-floating-gem gem-${index}`} key={color} style={{ "--gem-color": GEM_INFO[color].hex }}><Gem /></span>)}<Crown className="splendor-hero-crown" /></div></section><section className="splendor-entry-card"><p className="splendor-kicker">The guild hall</p><h2>Take your seat</h2><p>Create a private room, invite friends with a five-character code, or fill the open seats with computer merchants.</p><label>Your merchant name<input value={name} maxLength={24} autoComplete="nickname" onChange={(event) => setName(event.target.value)} placeholder="e.g. Alessandra" /></label><button className="splendor-primary" disabled={busy} onClick={createRoom}><Plus /> Create a room</button><div className="splendor-divider"><span>or join a room</span></div><div className="splendor-join"><input aria-label="Room code" value={joinCode} maxLength={5} onChange={(event) => setJoinCode(event.target.value.toUpperCase())} placeholder="CODE" /><button disabled={busy} onClick={joinRoom}>Join <ChevronRight /></button></div>{error && <p className="splendor-form-error">{error}</p>}<a className="splendor-official-link" href="https://cdn.svc.asmodee.net/production-asmodeeca/uploads/2022/01/SCSPL01EN_SPLENDOR_RULES_LIGHT.pdf" target="_blank" rel="noreferrer"><ScrollText /> Read the official rules</a></section></main>;
}

function Lobby({ room, me, busy, error, onAddComputer, onRemoveComputer, onStart, onLeave }) {
  const isHost = room.hostId === me.id;
  return <main className="splendor-lobby"><section className="splendor-lobby-card"><div className="splendor-lobby-seal"><Gem /></div><p className="splendor-kicker">Your private guild hall</p><h1>The table is ready</h1><button className="splendor-room-display" onClick={() => navigator.clipboard?.writeText(room.roomCode)}><span>{room.roomCode}</span><small><Copy /> Copy invite code</small></button><div className="splendor-lobby-players">{room.players.map((player, index) => <div key={player.id} className="occupied"><span className="splendor-avatar" style={{ "--player": player.color }}>{player.isComputer ? <Bot /> : player.name[0]}</span><p><strong>{player.name}</strong><small>{index === 0 ? "Host" : player.isComputer ? "Computer merchant" : "Ready to trade"}</small></p>{player.isComputer && isHost ? <button aria-label={`Remove ${player.name}`} onClick={() => onRemoveComputer(player.id)}><X /></button> : <Check />}</div>)}{Array.from({ length: 4 - room.players.length }, (_, index) => <div className="empty" key={index}><span className="splendor-avatar"><Users /></span><p><strong>Open seat</strong><small>Invite a friend or add a rival</small></p></div>)}</div>{isHost && room.players.length < 4 && <button className="splendor-add-bot" disabled={busy} onClick={onAddComputer}><Bot /> Add computer merchant</button>}{isHost ? <button className="splendor-primary splendor-start" disabled={busy || room.players.length < 2} onClick={onStart}><Sparkles /> Open the market</button> : <p className="splendor-waiting">Waiting for {room.players[0].name} to open the market…</p>}<button className="splendor-quiet" onClick={onLeave}><LogOut /> Leave room</button>{room.players.length < 2 && isHost && <p className="splendor-waiting">Invite at least one merchant or add a computer to begin.</p>}{error && <p className="splendor-form-error">{error}</p>}</section></main>;
}

function PlayerSummary({ player, active, isMe, isHost, winner }) {
  return <div className={`splendor-player ${active ? "active" : ""} ${winner ? "winner" : ""}`}><span className="splendor-avatar" style={{ "--player": player.color }}>{player.isComputer ? <Bot /> : player.name[0]}</span><div><strong>{player.name}{isMe ? " (you)" : ""}</strong><small>{player.isComputer ? "Computer · " : ""}{tokenCount(player)} tokens · {player.reserved.length} reserved</small><div className="splendor-mini-bonuses">{GEM_COLORS.map((color) => <i key={color} className={color}>{player.bonuses[color]}</i>)}</div></div><b>{player.score}<small>PP</small></b>{isHost && <Crown className="splendor-host" />}</div>;
}

function BankToken({ color, count, selected, disabled, pairDisabled, onToggle, onPair }) {
  return <div className={`splendor-bank-token ${color} ${selected ? "selected" : ""} ${count === 0 ? "empty" : ""}`}><button disabled={disabled} onClick={onToggle} aria-label={`Select ${GEM_INFO[color].name}`}><span><Gem /></span><strong>{count}</strong><small>{GEM_INFO[color].name}</small>{selected && <Check className="splendor-selected-check" />}</button>{color !== "gold" && <button className="splendor-pair" disabled={pairDisabled} onClick={onPair}>Take 2</button>}</div>;
}

function MiniGem({ color, count }) { return <span className={`splendor-mini-gem ${color}`} title={GEM_INFO[color].name}><Gem />{count}</span>; }

function DevelopmentCard({ card, affordable, disabled, onBuy, onReserve, canReserve, reserved }) {
  const paymentHint = affordable ? "Affordable now" : "Development";
  return <article className={`splendor-dev-card level-${card.level} bonus-${card.bonus} ${affordable ? "affordable" : ""}`}><button className="splendor-card-main" disabled={disabled} onClick={onBuy} aria-label={`Buy ${GEM_INFO[card.bonus].name} development`}><span className="splendor-card-points">{card.points || <em>—</em>}</span><span className="splendor-card-bonus"><Gem /><small>{GEM_INFO[card.bonus].name}</small></span><span className="splendor-card-scene"><img className="splendor-card-art" src={cardArt[card.bonus]} alt="" /></span><span className="splendor-card-cost">{Object.entries(card.cost).map(([color, count]) => <i className={color} key={color}>{count}</i>)}</span><span className="splendor-card-status">{reserved ? "Reserved · click to buy" : paymentHint}</span></button>{onReserve && <button className="splendor-reserve-button" disabled={!canReserve || disabled} onClick={onReserve}><LockKeyhole /> Reserve</button>}</article>;
}

function Deck({ level, count, disabled, onReserve }) { return <button className={`splendor-deck level-${level}`} disabled={disabled || count === 0} onClick={onReserve}><span>{Array.from({ length: level }, (_, index) => <Gem key={index} />)}</span><strong>Level {level}</strong><small>{count} cards</small><em><LockKeyhole /> Reserve blind</em></button>; }

function NobleTile({ noble }) { return <div className="splendor-noble"><Crown /><strong>{noble.name}</strong><span>{Object.entries(noble.requirements).map(([color, count]) => <i className={color} key={color}>{count}</i>)}</span><small>3 prestige</small></div>; }

function ReturnModal({ player, count, selected, setSelected, busy, onConfirm }) {
  const total = Object.values(selected).reduce((sum, amount) => sum + Number(amount || 0), 0);
  return <div className="splendor-overlay"><section className="splendor-modal"><p className="splendor-kicker">Token limit</p><h2>Return {count} token{count === 1 ? "" : "s"}</h2><p>You may keep no more than ten tokens at the end of your turn. Choose exactly {count} to return.</p><div className="splendor-return-grid">{[...GEM_COLORS, "gold"].map((color) => <div className={color} key={color}><span><Gem /></span><strong>{player.tokens[color]}</strong><small>{GEM_INFO[color].name}</small><div><button disabled={!selected[color]} onClick={() => setSelected((current) => ({ ...current, [color]: Math.max(0, Number(current[color] || 0) - 1) }))}>−</button><b>{selected[color] || 0}</b><button disabled={total >= count || Number(selected[color] || 0) >= player.tokens[color]} onClick={() => setSelected((current) => ({ ...current, [color]: Number(current[color] || 0) + 1 }))}>+</button></div></div>)}</div><button className="splendor-primary" disabled={busy || total !== count} onClick={onConfirm}>Return {total} of {count}</button></section></div>;
}

function NobleChoice({ nobles, onChoose }) { return <div className="splendor-overlay"><section className="splendor-modal"><Crown className="splendor-modal-crown" /><p className="splendor-kicker">A prestigious visit</p><h2>Choose a noble</h2><p>Your trading house qualifies for more than one patron, but only one may visit this turn.</p><div className="splendor-noble-choice">{nobles.map((noble) => <button key={noble.id} onClick={() => onChoose(noble.id)}><NobleTile noble={noble} /></button>)}</div></section></div>; }

function RulesDrawer({ onClose }) { return <div className="splendor-rules-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}><aside className="splendor-rules"><button className="splendor-rules-close" onClick={onClose}><X /></button><p className="splendor-kicker">How to play</p><h2>Build a brilliant engine</h2><p>On your turn, perform exactly one action:</p><ol><li><strong>Take gems.</strong> Take three different colors, or take two of one color when at least four of that color remain.</li><li><strong>Reserve a development.</strong> Keep a face-up card or draw blindly from a deck, then take one gold if available. You may hold three reserved cards.</li><li><strong>Buy a development.</strong> Pay its cost with tokens. Your matching development bonuses permanently reduce every future cost; gold covers any color.</li></ol><h3>Nobles & victory</h3><p>A qualifying noble visits automatically after your action and grants 3 prestige. Reach 15 prestige to trigger the final round. Everyone receives the same number of turns. Highest prestige wins; ties go to the player with fewer developments.</p><h3>Important limits</h3><p>You may end a turn with at most 10 tokens. Reserved cards do not score unless purchased. Only development bonuses—not tokens—count toward noble requirements.</p><a href="https://cdn.svc.asmodee.net/production-asmodeeca/uploads/2022/01/SCSPL01EN_SPLENDOR_RULES_LIGHT.pdf" target="_blank" rel="noreferrer"><ScrollText /> Official rulebook <ChevronRight /></a></aside></div>; }

function Results({ room, playerId, onLeave }) {
  const ranked = [...room.players].sort((a, b) => b.score - a.score || a.developments.length - b.developments.length);
  const won = room.winners.includes(playerId);
  return <div className="splendor-overlay"><section className="splendor-results"><div className="splendor-results-crown"><Crown /></div><p className="splendor-kicker">The market closes</p><h2>{won ? "A splendid victory" : `${ranked[0].name} claims the crown`}</h2><p>Prestige decides the winner; fewer purchased developments break a tie.</p><div>{ranked.map((player, index) => <article className={room.winners.includes(player.id) ? "winner" : ""} key={player.id}><b>{index + 1}</b><span className="splendor-avatar" style={{ "--player": player.color }}>{player.isComputer ? <Bot /> : player.name[0]}</span><p><strong>{player.name}{player.id === playerId ? " (you)" : ""}</strong><small>{player.developments.length} developments · {player.nobles.length} nobles</small></p><em>{player.score}<small> prestige</small></em>{room.winners.includes(player.id) && <Crown />}</article>)}</div><button className="splendor-primary" onClick={onLeave}>Return to the guild hall</button></section></div>;
}
