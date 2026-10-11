"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Bot,
  Check,
  Crown,
  Gem,
  Landmark,
  LockKeyhole,
  ScrollText,
  Sparkles,
  Users,
  X,
} from "lucide-react";
import { SplendorRoomService } from "./splendor-room-service";
import {
  GEM_COLORS,
  GEM_INFO,
  canPurchase,
  currentPlayer,
  paymentForCard,
  tokenCount,
} from "../lib/splendor";
import { useEngineRoom } from "../lib/use-engine-room.js";
import { ChoiceModal, GameHeader, Hero, Landing as SharedLanding, Lobby as SharedLobby, Results as SharedResults } from "./ui/table-shell";

/** Opponents' reservations are not sent, only a count. */
const reservedCount = (player) => player.reservedCount ?? player.reserved.length;
const cardArt = {
  white: "/splendor/cards/white.webp",
  blue: "/splendor/cards/blue.webp",
  green: "/splendor/cards/green.webp",
  red: "/splendor/cards/red.webp",
  black: "/splendor/cards/black.webp",
};

export default function SplendorClient() {
  const {
    room, playerId, name, setName, joinCode, setJoinCode,
    busy, error, setError, createRoom, joinRoom, act, leaveRoom: leaveEngineRoom, computerWaiting, computerSpeed,
  } = useEngineRoom({ service: SplendorRoomService, storageKey: "splendor", computerDue: (current) => current.phase === "playing" && Boolean(currentPlayer(current)?.isComputer) });
  const [selectedGems, setSelectedGems] = useState([]);
  const [returns, setReturns] = useState({});
  const [showRules, setShowRules] = useState(false);

  const me = room?.players.find((player) => player.id === playerId) ?? null;
  const actor = room ? currentPlayer(room) : null;
  const botNeedsAction = room?.phase === "playing" && actor?.isComputer;


  useEffect(() => {
    setSelectedGems([]);
  }, [room?.currentPlayerIndex, room?.turnNumber]);

  function leaveRoom() {
    if (room?.phase !== "lobby" && !window.confirm("Leave this table? You can return later with the same room code.")) return;
    leaveEngineRoom(); setSelectedGems([]); setError("");
  }

  function buy(source, card) {
    if (!room || !me || currentPlayer(room)?.id !== playerId || room.phase !== "playing") return;
    if (!canPurchase(me, card)) { setError("You cannot afford that development yet."); return; }
    act("purchase", { source });
  }

  if (!room || !me) {
    return <SharedLanding
      gameName="Splendor"
      theme="tbl-light splendor-theme"
      hero={<Hero
        kicker="A Renaissance engine-building game"
        title={<>Splen<em>dor</em></>}
        copy="Gather brilliant gems. Invest in mines and artisans. Build an engine of permanent bonuses—and become the first merchant to command fifteen prestige."
        badges={[{ icon: Users, label: "2–4 players" }, { icon: Bot, label: "Computer rivals" }, { icon: Crown, label: "Race to 15" }]}
        backdrop={<div className="splendor-hero-art"><div className="splendor-arch" /><div className="splendor-sunburst" />{["white", "blue", "green", "red", "black"].map((color, index) => <span className={`splendor-floating-gem gem-${index}`} key={color} style={{ "--gem-color": GEM_INFO[color].hex }}><Gem /></span>)}<Crown className="splendor-hero-crown" /></div>}
      />}
      entry={{ name, setName, joinCode, setJoinCode, createRoom, joinRoom, busy, error }}
      onRules={() => setShowRules(true)}
      dialogs={showRules && <RulesDrawer onClose={() => setShowRules(false)} />}
    />;
  }
  if (room.phase === "lobby") {
    return <SharedLobby computerSpeed={computerSpeed}
      gameName="Splendor"
      theme="tbl-light splendor-theme"
      room={room}
      me={me}
      busy={busy}
      error={error}
      min={2}
      max={4}
      onAdd={() => act("addComputer")}
      onRemove={(id) => act("removeComputer", { playerId: id })}
      onStart={() => act("start")}
      onLeave={leaveRoom}
      onRules={() => setShowRules(true)}
      rules={showRules && <RulesDrawer onClose={() => setShowRules(false)} />}
    />;
  }

  const myTurn = room.phase === "playing" && actor?.id === playerId;
  const leadScore = Math.max(...room.players.map((player) => player.score));
  const availableColors = GEM_COLORS.filter((color) => room.bank[color] > 0);
  const requiredDifferent = Math.min(3, availableColors.length);

  /*
   * Both ways of taking gems now work the same: click to build a selection, then
   * confirm. Taking two of one colour used to be a separate one-click chip that
   * appeared and vanished as piles ran down; clicking the same gem twice is the
   * same gesture as clicking three different ones.
   */
  const distinct = [...new Set(selectedGems)];
  const pair = selectedGems.length === 2 && distinct.length === 1 ? distinct[0] : null;

  function pickGem(color) {
    setSelectedGems((current) => {
      const already = current.filter((item) => item === color).length;
      // second click on the same gem asks for the pair, third clears it
      if (already === 1 && current.length === 1 && room.bank[color] >= 4) return [color, color];
      if (already > 0) return current.filter((item) => item !== color);
      if (current.length >= requiredDifferent || current.some((item) => current.filter((x) => x === item).length > 1)) return current;
      return [...current, color];
    });
  }

  const take = (() => {
    if (pair) return { legal: room.bank[pair] >= 4, pair, label: `Take 2 ${GEM_INFO[pair].name.toLowerCase()}` };
    if (!selectedGems.length) return { legal: false, label: requiredDifferent === 0 ? "The bank is empty" : `Pick ${requiredDifferent} gems` };
    if (selectedGems.length < requiredDifferent) {
      const left = requiredDifferent - selectedGems.length;
      return { legal: false, label: `Pick ${left} more gem${left === 1 ? "" : "s"}` };
    }
    return { legal: true, label: `Take ${selectedGems.map((color) => GEM_INFO[color].name.toLowerCase()).join(", ")}` };
  })();

  return <main className="splendor-game-shell tbl-light splendor-theme">
    <GameHeader computerSpeed={computerSpeed}
      title="Splendor"
      room={room}
      subtitle={`Room ${room.roomCode}`}
      status={room.phase === "finished" ? "Trading complete" : myTurn ? "Your turn" : computerWaiting && actor?.isComputer ? `${actor.name} is considering…` : `${actor?.name}'s turn`}
      onRules={() => setShowRules(true)}
      onLeave={leaveRoom}
    />

    {room.finalRoundTriggeredBy && room.phase !== "finished" && <div className="splendor-final-banner"><Crown /> Final round — finish the table, then highest prestige wins.</div>}
    {error && <div className="splendor-error" role="alert">{error}<button aria-label="Dismiss" onClick={() => setError("")}><X /></button></div>}

    <div className="splendor-layout">
      <aside className="splendor-sidebar">
        <div className="splendor-panel-title"><Users /><span><small>Trading houses</small>Players</span></div>
        <div className="splendor-player-list">{room.players.map((player, index) => <PlayerSummary key={player.id} player={player} active={actor?.id === player.id && room.phase !== "finished"} isMe={player.id === playerId} isHost={index === 0} winner={room.winners.includes(player.id)} leading={player.score === leadScore && leadScore > 0} />)}</div>
        <div className="splendor-log"><div className="splendor-panel-title"><ScrollText /><span><small>Latest moves</small>Ledger</span></div>{room.log.slice(0, 6).map((line, index) => <p key={`${line}-${index}`}>{line}</p>)}</div>
      </aside>

      <section className="splendor-board">
        <PlayerStrip player={me} prestige={me.score} tokens={tokenCount(me)} />
        <div className="splendor-nobles"><div className="splendor-row-label"><Crown /><span><small>Attract patrons</small>Nobles</span></div><div className="splendor-noble-list">{room.nobles.map((noble) => <NobleTile key={noble.id} noble={noble} player={me} />)}</div></div>
        {[3, 2, 1].map((level) => <div className="splendor-market-row" key={level}>
          <Deck level={level} count={room.deckCounts[level]} disabled={!myTurn || busy || me.reserved.length >= 3} onReserve={() => act("reserve", { source: { kind: "deck", level } })} />
          <div className="splendor-development-list">{room.market[level].map((card, index) => <DevelopmentCard key={card.id} card={card} player={me} affordable={myTurn && canPurchase(me, card)} disabled={!myTurn || busy} onBuy={() => buy({ kind: "market", level, index }, card)} onReserve={() => act("reserve", { source: { kind: "market", level, index } })} canReserve={myTurn && me.reserved.length < 3} />)}</div>
        </div>)}
      </section>

      <aside className="splendor-bank">
        <div className="splendor-panel-title"><Landmark /><span><small>Shared supply</small>Gem bank</span></div>
        <p className="splendor-bank-help">{myTurn ? "Click three different gems — or the same gem twice to take two of it, when four or more remain." : "The bank is ready for the active merchant."}</p>
        <div className="splendor-token-bank">{GEM_COLORS.map((color) => <BankToken key={color} color={color} count={room.bank[color]} picked={selectedGems.filter((item) => item === color).length} disabled={!myTurn || busy || room.bank[color] === 0} onPick={() => pickGem(color)} />)}<BankToken color="gold" count={room.bank.gold} picked={0} disabled note="Gold comes with a reservation" /></div>
        <button className="splendor-primary splendor-take" disabled={!myTurn || busy || !take.legal} onClick={() => take.pair ? act("takePair", { color: take.pair }) : act("takeDifferent", { colors: selectedGems })}><Gem /> {take.label}</button>
        {selectedGems.length > 0 && <button className="splendor-quiet splendor-clear" onClick={() => setSelectedGems([])}>Clear selection</button>}
        <div className="splendor-action-note"><Sparkles /><p><strong>{myTurn ? "Choose one action" : `${actor?.name} is at the market`}</strong><span>{myTurn ? "Gather gems, buy one development, or reserve one for later." : "You can inspect every cost while you wait."}</span></p></div>
      </aside>
    </div>

    <section className="splendor-tableau">
      <div className="splendor-tableau-heading"><div><p className="splendor-kicker">Your trading house</p><h2>{me.score} prestige · {tokenCount(me)} tokens</h2></div><div className="splendor-player-token-strip">{[...GEM_COLORS, "gold"].map((color) => <MiniGem key={color} color={color} count={me.tokens[color]} />)}</div></div>
      <div className="splendor-bonus-grid">{GEM_COLORS.map((color) => <div className={`splendor-bonus-stack ${color}`} key={color}><span className="splendor-bonus-gem"><Gem /></span><strong>{me.bonuses[color]}</strong><small>{GEM_INFO[color].name} bonus</small><em>{me.developments.filter((card) => card.bonus === color).reduce((sum, card) => sum + card.points, 0)} prestige</em></div>)}</div>
      <div className="splendor-reserved"><div><LockKeyhole /><span><strong>Reserved developments</strong><small>Private to you · {me.reserved.length}/3</small></span></div>{me.reserved.length ? <div className="splendor-reserved-list">{me.reserved.map((card, index) => <DevelopmentCard key={card.id} card={card} player={me} affordable={myTurn && canPurchase(me, card)} disabled={!myTurn || busy} onBuy={() => buy({ kind: "reserved", index }, card)} reserved />)}</div> : <p>Reserve a face-up card—or draw blindly from a deck—to secure it and take one gold.</p>}</div>
    </section>

    {room.pendingReturn?.playerId === playerId && <ReturnModal player={me} count={room.pendingReturn.count} selected={returns} setSelected={setReturns} busy={busy} onConfirm={() => { act("returnTokens", { returned: returns }); setReturns({}); }} />}
    {room.pendingNoble?.playerId === playerId && <NobleChoice nobles={room.nobles.filter((noble) => room.pendingNoble.nobleIds.includes(noble.id))} onChoose={(id) => act("chooseNoble", { nobleId: id })} />}
    {showRules && <RulesDrawer onClose={() => setShowRules(false)} />}
    {room.phase === "finished" && <Results room={room} playerId={playerId} onLeave={leaveRoom} />}
  </main>;
}

/**
 * Your engine, pinned to the top of the board.
 *
 * Splendor is one question repeated: does this cost fit what I have? The answer
 * lived in a band underneath the market, so checking it meant scrolling away
 * from the card and back — 1,138px each way on a phone. Eleven numbers is a
 * strip, not a section, so it sits above the market and stays there.
 *
 * Each gem shows bonus and tokens together, because that is how a cost is paid:
 * the bonus first, and tokens for the rest.
 */
function PlayerStrip({ player, prestige, tokens }) {
  return <div className="splendor-strip">
    <div className="splendor-strip-score">
      <strong>{prestige}</strong>
      <small>prestige</small>
    </div>
    <div className="splendor-strip-gems">
      {GEM_COLORS.map((color) => <span className={`splendor-strip-gem ${color}`} key={color}>
        <b title={`${GEM_INFO[color].name} bonus`}>{player.bonuses[color]}</b>
        <i title={`${GEM_INFO[color].name} tokens`}>{player.tokens[color]}</i>
        <small>{GEM_INFO[color].name}</small>
      </span>)}
      <span className="splendor-strip-gem gold">
        <b className="splendor-strip-nobonus" aria-hidden="true">&middot;</b>
        <i title="Gold tokens">{player.tokens.gold}</i>
        <small>Gold</small>
      </span>
    </div>
    <div className={`splendor-strip-total ${tokens > 10 ? "over" : tokens === 10 ? "full" : ""}`}>
      <strong>{tokens}<span>/10</span></strong>
      <small>tokens</small>
    </div>
  </div>;
}

function PlayerSummary({ player, active, isMe, isHost, winner, leading }) {
  /* Within four of fifteen is the point at which somebody else's next turn can
     start the last round. That is the number that should change your move, and
     nothing on the board used to say it. */
  const threat = player.score >= 11 && player.score < 15;
  return <div className={`splendor-player ${active ? "active" : ""} ${winner ? "winner" : ""} ${threat ? "threat" : ""} ${leading ? "leading" : ""}`}><span className="splendor-avatar" style={{ "--player": player.color }}>{player.isComputer ? <Bot /> : player.name[0]}</span><div><strong>{player.name}{isMe ? " (you)" : ""}</strong><small>{player.isComputer ? "Computer · " : ""}{tokenCount(player)} tokens · {reservedCount(player)} reserved</small><div className="splendor-mini-bonuses">{GEM_COLORS.map((color) => <i key={color} className={color}>{player.bonuses[color]}</i>)}</div></div><b>{player.score}<small>PP</small>{threat && <em title={`${15 - player.score} prestige from the final round`}>{15 - player.score} to go</em>}</b>{isHost && <Crown className="splendor-host" />}</div>;
}

/*
 * One gem, one target. The old tile carried a second 29x13px "Take 2" chip that
 * fell under the 24px minimum, overlapped its own label on a phone, and appeared
 * or vanished depending on how many were left in the pile.
 */
function BankToken({ color, count, picked, disabled, onPick, note }) {
  const label = note
    ? `${GEM_INFO[color].name}, ${count} in the bank. ${note}.`
    : `${GEM_INFO[color].name}, ${count} in the bank${picked ? `, ${picked} picked` : ""}`;
  return <div className={`splendor-bank-token ${color} ${picked ? "selected" : ""} ${count === 0 ? "empty" : ""}`}>
    <button disabled={disabled} onClick={onPick} aria-label={label} title={note ?? undefined}>
      <span><Gem /></span>
      <strong>{count}</strong>
      <small>{GEM_INFO[color].name}</small>
      {picked > 0 && <em className="splendor-picked">{picked === 2 ? <>&times;2</> : <Check />}</em>}
    </button>
  </div>;
}

function MiniGem({ color, count }) { return <span className={`splendor-mini-gem ${color}`} title={GEM_INFO[color].name}><Gem />{count}</span>; }

/**
 * A development, priced against the player looking at it.
 *
 * The whole game is one subtraction — this card's cost, less the permanent
 * bonuses you have built, checked against the tokens in front of you — and the
 * board used to leave every part of it to the player. `paymentForCard` has
 * always returned exactly that breakdown; it was imported here and never called.
 *
 * So each cost is now drawn as discs in the order it is paid: what your bonuses
 * cover (a dashed setting, because you pay nothing for it), what you would hand
 * over in tokens, the gold that makes up the difference, and — when you cannot
 * afford it — a hollow disc for each gem you are still short. A colour and a
 * number is read at a glance; the sentence this replaced had to be parsed, and
 * it repeated what the row above it already showed.
 */
function DevelopmentCard({ card, player, affordable, disabled, onBuy, onReserve, canReserve, reserved }) {
  const payment = player ? paymentForCard(player, card) : null;
  const shortfall = payment && !payment.affordable
    ? GEM_COLORS
      .map((color) => ({ color, need: Math.max(0, Number(card.cost[color] || 0) - player.bonuses[color] - player.tokens[color]) }))
      .filter((item) => item.need > 0)
    : [];

  /*
   * One row of discs, in the order a cost is actually paid: what your bonuses
   * cover for free, what you hand over in tokens, what gold makes up, and — when
   * you cannot afford it — what you are still missing.
   */
  const parts = GEM_COLORS.flatMap((color) => {
    const total = Number(card.cost[color] || 0);
    if (!total) return [];
    if (!player) return [{ key: color, color, count: total }];
    const covered = Math.min(total, player.bonuses[color]);
    const paid = payment.colored[color];
    const missing = shortfall.find((item) => item.color === color)?.need ?? 0;
    return [
      covered > 0 && { key: `${color}-bonus`, color, count: covered, kind: "covered" },
      paid > 0 && { key: color, color, count: paid },
      missing > 0 && { key: `${color}-short`, color, count: missing, kind: "missing" },
    ].filter(Boolean);
  });
  const goldNeeded = payment?.affordable ? payment.gold : 0;

  const status = reserved && !affordable ? "Reserved"
    : reserved ? "Reserved · buy now"
    : affordable ? "Buy"
    : shortfall.length ? "Short"
    : "Development";

  const label = `${GEM_INFO[card.bonus].name} development, ${card.points} prestige, costing `
    + Object.entries(card.cost).map(([color, count]) => `${count} ${GEM_INFO[color].name.toLowerCase()}`).join(", ")
    + (affordable
      ? `. You can afford this${goldNeeded ? `, using ${goldNeeded} gold` : ""}.`
      : `. You still need ${shortfall.map((item) => `${item.need} ${GEM_INFO[item.color].name.toLowerCase()}`).join(" and ")}.`);

  return <article className={`splendor-dev-card level-${card.level} bonus-${card.bonus} ${affordable ? "affordable" : "unaffordable"} ${onReserve ? "reservable" : ""}`}>
    <button className="splendor-card-main" disabled={disabled || !affordable} onClick={onBuy} aria-label={label}>
      <span className="splendor-card-points">{card.points || <em>—</em>}</span>
      <span className="splendor-card-bonus"><Gem /><small>{GEM_INFO[card.bonus].name}</small></span>
      <span className="splendor-card-scene"><img className="splendor-card-art" src={cardArt[card.bonus]} alt="" width="300" height="152" loading="lazy" decoding="async" /></span>
      <span className="splendor-card-cost">
        {parts.map((part) => <i className={`${part.color} ${part.kind ?? ""}`} key={part.key}>{part.count}</i>)}
        {goldNeeded > 0 && <i className="gold" key="gold">{goldNeeded}</i>}
      </span>
      <span className="splendor-card-status">{status}</span>
    </button>
    {onReserve && <button className="splendor-reserve-button" disabled={!canReserve || disabled} onClick={onReserve}><LockKeyhole /> Reserve</button>}
  </article>;
}

function Deck({ level, count, disabled, onReserve }) { return <button className={`splendor-deck level-${level}`} disabled={disabled || count === 0} onClick={onReserve}><span>{Array.from({ length: level }, (_, index) => <Gem key={index} />)}</span><strong>Level {level}</strong><small>{count} cards</small><em><LockKeyhole /> Reserve blind</em></button>; }

/*
 * A noble is 3 prestige and often decides the game, and the tile used to print
 * its price and stop there — whether you were at 2/3 or 0/3 on each colour was
 * something you worked out by scrolling to your bonuses and counting.
 */
function NobleTile({ noble, player }) {
  const needs = Object.entries(noble.requirements).map(([color, count]) => ({
    color,
    count,
    have: player ? Math.min(count, player.bonuses[color]) : 0,
  }));
  const short = needs.reduce((sum, need) => sum + (need.count - need.have), 0);
  const state = !player ? "" : short === 0 ? "earned" : short <= 2 ? "close" : "";
  return <div className={`splendor-noble ${state}`}>
    <Crown />
    <strong>{noble.name}</strong>
    <span>{needs.map((need) => <i className={`${need.color} ${player && need.have >= need.count ? "met" : ""}`} key={need.color}>
      {player ? `${need.have}/${need.count}` : need.count}
    </i>)}</span>
    <small>{!player ? "3 prestige" : short === 0 ? "Ready to visit" : `3 prestige · ${short} more card${short === 1 ? "" : "s"}`}</small>
  </div>;
}

function ReturnModal({ player, count, selected, setSelected, busy, onConfirm }) {
  const total = Object.values(selected).reduce((sum, amount) => sum + Number(amount || 0), 0);
  return <div className="splendor-overlay"><section className="splendor-modal"><p className="splendor-kicker">Token limit</p><h2>Return {count} token{count === 1 ? "" : "s"}</h2><p>You may keep no more than ten tokens at the end of your turn. Choose exactly {count} to return.</p><div className="splendor-return-grid">{[...GEM_COLORS, "gold"].map((color) => <div className={color} key={color}><span><Gem /></span><strong>{player.tokens[color]}</strong><small>{GEM_INFO[color].name}</small><div><button disabled={!selected[color]} onClick={() => setSelected((current) => ({ ...current, [color]: Math.max(0, Number(current[color] || 0) - 1) }))}>−</button><b>{selected[color] || 0}</b><button disabled={total >= count || Number(selected[color] || 0) >= player.tokens[color]} onClick={() => setSelected((current) => ({ ...current, [color]: Number(current[color] || 0) + 1 }))}>+</button></div></div>)}</div><button className="splendor-primary" disabled={busy || total !== count} onClick={onConfirm}>Return {total} of {count}</button></section></div>;
}

function NobleChoice({ nobles, onChoose }) { return <div className="splendor-overlay"><section className="splendor-modal"><Crown className="splendor-modal-crown" /><p className="splendor-kicker">A prestigious visit</p><h2>Choose a noble</h2><p>Your trading house qualifies for more than one patron, but only one may visit this turn.</p><div className="splendor-noble-choice">{nobles.map((noble) => <button key={noble.id} onClick={() => onChoose(noble.id)}><NobleTile noble={noble} /></button>)}</div></section></div>; }

function RulesDrawer({ onClose }) {
  return <ChoiceModal wide title="Build a brilliant engine" text="On your turn, perform exactly one action." onClose={onClose}>
    <div className="tbl-rule-grid">
      <article><b>Take gems</b><p>Take three different colors, or take two of one color when at least four of that color remain.</p></article>
      <article><b>Reserve a development</b><p>Keep a face-up card or draw blindly from a deck, then take one gold if available. You may hold three reserved cards.</p></article>
      <article><b>Buy a development</b><p>Pay its cost with tokens. Your matching development bonuses permanently reduce every future cost; gold covers any color.</p></article>
    </div>
    <p className="tbl-rule-heading">Nobles &amp; victory</p>
    <p className="tbl-modal-copy">A qualifying noble visits automatically after your action and grants 3 prestige. Reach 15 prestige to trigger the final round. Everyone receives the same number of turns. Highest prestige wins; ties go to the player with fewer developments.</p>
    <p className="tbl-rule-heading">Important limits</p>
    <p className="tbl-modal-copy">You may end a turn with at most 10 tokens. Reserved cards do not score unless purchased. Only development bonuses—not tokens—count toward noble requirements.</p>
    <a className="tbl-link" href="https://cdn.svc.asmodee.net/production-asmodeeca/uploads/2022/01/SCSPL01EN_SPLENDOR_RULES_LIGHT.pdf" target="_blank" rel="noreferrer"><ScrollText aria-hidden="true" /> Official rulebook</a>
  </ChoiceModal>;
}

function Results({ room, playerId, onLeave }) {
  const ranked = [...room.players].sort((a, b) => b.score - a.score || a.developments.length - b.developments.length);
  const won = room.winners.includes(playerId);
  return <SharedResults
    title={won ? "A splendid victory" : `${ranked[0].name} claims the crown`}
    text="Prestige decides the winner; fewer purchased developments break a tie."
    rows={ranked.map((player) => ({
      id: player.id,
      name: `${player.name}${player.id === playerId ? " (you)" : ""}`,
      value: `${player.score} prestige`,
      note: `${player.developments.length} developments · ${player.nobles.length} nobles`,
    }))}
  >
    <button type="button" className="tbl-primary" onClick={onLeave}>Return to the guild hall</button>
  </SharedResults>;
}
