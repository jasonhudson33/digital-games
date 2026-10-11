"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Bot,
  BriefcaseBusiness,
  GraduationCap,
  Sparkles,
  TrendingUp,
  Users,
} from "lucide-react";
import { LifeRoomService } from "./life-room-service";
import { BOARD, currentLifePlayer, money, playerNetWorth } from "../lib/life";
import { useEngineRoom } from "../lib/use-engine-room.js";
import { ChoiceModal, GameHeader, Hero, Landing, Lobby, Results } from "./ui/table-shell";

/** Other seats' LIFE tile values are hidden until the game ends, so only a count is sent. */
const tileCount = (player) => player.lifeTileCount ?? player.lifeTiles.length;

export default function LifeClient() {
  const {
    room, playerId, name, setName, joinCode, setJoinCode,
    busy, error, setError, createRoom, joinRoom, act, leaveRoom: leave, computerWaiting, computerSpeed,
  } = useEngineRoom({ service: LifeRoomService, storageKey: "life", computerDue: (current) => current.phase === "playing" && Boolean(currentLifePlayer(current)?.isComputer) });
  const [showRules, setShowRules] = useState(false);
  const [spinning, setSpinning] = useState(false);
  const [spinPreview, setSpinPreview] = useState(null);

  const me = room?.players.find((player) => player.id === playerId) || null;
  const active = room ? currentLifePlayer(room) : null;


  async function handleSpin() {
    if (spinning || busy) return;
    // The server chooses the number. The wheel spins until it answers, then settles on the result.
    setSpinPreview(null);
    setSpinning(true);
    try { await act("spin"); } finally { setSpinning(false); }
  }

  if (!room || !me) {
    return <Landing
      gameName="Life"
      theme="tbl-light life-theme"
      hero={<Hero
        kicker="A whole life in one game night"
        title={<>Where will<br /><em>Life</em> take you?</>}
        copy="Choose your path, build a career, grow a family, and follow every twist of the spinner."
        badges={[{ icon: Users, label: "2–6 players" }, { icon: Bot, label: "Computer players" }, { icon: Sparkles, label: "Shared rooms" }]}
        backdrop={<div className="life-hero-art"><div className="life-sun" /><div className="life-road"><span>🚗</span><i /><b>🏡</b><strong>🌴</strong></div><div className="life-cloud one" /><div className="life-cloud two" /></div>}
      />}
      entry={{ name, setName, joinCode, setJoinCode, createRoom, joinRoom, busy, error }}
      onRules={() => setShowRules(true)}
      dialogs={showRules && <Rules onClose={() => setShowRules(false)} />}
    />;
  }
  if (room.phase === "lobby") {
    return <Lobby computerSpeed={computerSpeed}
      gameName="Life"
      theme="tbl-light life-theme"
      room={room}
      me={me}
      busy={busy}
      error={error}
      min={2}
      max={6}
      onAdd={() => act("addComputer")}
      onRemove={(id) => act("removeComputer", { playerId: id })}
      onStart={() => act("start")}
      onLeave={leave}
      onRules={() => setShowRules(true)}
      rules={showRules && <Rules onClose={() => setShowRules(false)} />}
    />;
  }

  const myTurn = room.phase === "playing" && active?.id === playerId;
  const pendingMine = myTurn && room.pending?.playerId === playerId;
  return <main className="life-game tbl-light life-theme">
    <GameHeader computerSpeed={computerSpeed}
      title="Life"
      room={room}
      subtitle={`Room ${room.roomCode}`}
      status={room.phase === "finished" ? "Journey complete" : myTurn ? "Your turn" : computerWaiting ? `${active?.name} is thinking…` : `${active?.name}'s turn`}
      onRules={() => setShowRules(true)}
      onLeave={leave}
    />
    {error && <p className="life-error" role="alert">{error}</p>}
    <section className="life-stage">
      <aside className="life-players-panel">
        <p className="life-kicker">The road crew</p>
        <div className="life-player-list">{room.players.map((player) => <PlayerCard key={player.id} player={player} active={active?.id === player.id} isMe={player.id === playerId} finished={room.phase === "finished"} />)}</div>
        <div className="life-ledger"><h3>Life feed</h3>{room.log.slice(0, 7).map((line, index) => <p key={`${line}-${index}`}>{line}</p>)}</div>
      </aside>

      <section className="life-board-panel">
        <Board room={room} spinner={<Spinner value={spinning ? spinPreview : room.lastSpin?.number} spinning={spinning} disabled={!myTurn || Boolean(room.pending) || busy || room.phase !== "playing"} onSpin={handleSpin} />} />
        <div className="life-control-dock">
          <div className="life-turn-card">
            <p className="life-kicker">{myTurn ? "Your move" : "On the road"}</p>
            <h2>{myTurn ? room.pending ? "A decision awaits" : "Spin when you're ready" : `${active?.name} is at ${BOARD[active?.position || 0].label}`}</h2>
            <p>{myTurn ? room.pending ? "Choose below to keep your journey moving." : "Click the spinner. The bank and board will handle the rest." : "Everyone sees the same spin, movement, and event."}</p>
            {myTurn && !room.pending && !me.investment && <InvestmentPicker disabled={busy} onBuy={(number) => act("invest", { number })} />}
          </div>
        </div>
      </section>
    </section>
    {pendingMine && <Decision pending={room.pending} player={me} busy={busy} onPath={(path) => act("path", { path })} onCareer={(careerId) => act("career", { careerId })} onRetire={(destination) => act("retirement", { destination })} />}
    {room.phase === "finished" && <Winner room={room} me={me} onLeave={leave} />}
    {showRules && <Rules onClose={() => setShowRules(false)} />}
  </main>;
}

function routePath(points) {
  return points.map((point, index) => `${index === 0 ? "M" : "L"}${point.x.toFixed(2)} ${point.y.toFixed(2)}`).join(" ");
}

function Board({ room, spinner }) {
  const occupied = useMemo(() => room.players.reduce((map, player) => { (map[player.position] ||= []).push(player); return map; }, {}), [room.players]);
  const activePlayer = room.players[room.currentPlayerIndex];
  const collegeRoute = routePath(BOARD.slice(0, 8));
  const sharedRoute = routePath(BOARD.slice(7));
  const careerRoute = routePath([
    BOARD[0],
    { x: 62, y: 9 },
    { x: 80, y: 8 },
    { x: 91, y: 15 },
    { x: 87, y: 24 },
    { x: 68, y: 29 },
    { x: 47, y: 28 },
    BOARD[7],
  ]);
  return <div className="life-board-wrap"><div className="life-board life-illustrated-board" aria-label="Illustrated Life board with College and Career paths from Start to Retirement">
    <svg className="life-board-map" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
      <defs>
        <filter id="life-road-shadow" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="1.2" stdDeviation="1.2" floodColor="#315236" floodOpacity=".34" /></filter>
      </defs>
      {[collegeRoute, careerRoute, sharedRoute].map((path, index) => <path key={`shadow-${index}`} className="life-map-road-shadow" d={path} />)}
      <path className="life-map-road college" d={collegeRoute} />
      <path className="life-map-road career" d={careerRoute} />
      <path className="life-map-road shared" d={sharedRoute} />
      {[collegeRoute, careerRoute, sharedRoute].map((path, index) => <path key={`center-${index}`} className="life-map-road-center" d={path} />)}
    </svg>
    <div className="life-map-label start-label">START</div>
    <div className="life-map-label college-label">COLLEGE PATH</div>
    <div className="life-map-label career-label">CAREER PATH</div>
    <div className="life-map-label merge-label">PATHS MERGE</div>
    <div className="life-board-title"><small>THE GAME OF</small><strong><i>L</i><i>I</i><i>F</i><i>E</i></strong></div>
    <div className="life-scenery life-campus" aria-hidden="true"><span>🎓</span><b>College</b></div>
    <div className="life-scenery life-city" aria-hidden="true"><span>🏙️</span><b>Career city</b></div>
    <div className="life-scenery life-homes" aria-hidden="true"><span>🏡</span><b>Family lane</b></div>
    <div className="life-scenery life-retirement" aria-hidden="true"><span>🌴</span><b>Retirement</b></div>
    <div className="life-lake lake-one" aria-hidden="true" />
    <div className="life-lake lake-two" aria-hidden="true" />
    <div className="life-board-spinner">{spinner}</div>
    {room.lastSpin && <div className="life-spin-result"><b>{room.players.find((player) => player.id === room.lastSpin.playerId)?.name} spun {room.lastSpin.number}</b><span>{Number.isFinite(room.lastSpin.moved) ? `${room.lastSpin.moved} space${room.lastSpin.moved === 1 ? "" : "s"}${room.lastSpin.stoppedAtMandatory ? " · stopped at a milestone" : ""}` : "Movement resolved"}</span></div>}
    {BOARD.map((space) => { const milestone = ["start", "job", "marriage", "house", "career-change", "retire"].includes(space.type); const playersHere = occupied[space.index] || []; return <div key={space.index} title={`${space.index + 1}. ${space.label}${Number.isFinite(space.amount) ? ` · ${money(space.amount)}` : ""}`} aria-label={`${space.index + 1}. ${space.label}`} className={`life-route-space type-${space.type} ${milestone ? "milestone" : ""} ${playersHere.length ? "occupied" : ""} ${activePlayer?.position === space.index ? "active" : ""}`} style={{ "--x": `${space.x}%`, "--y": `${space.y}%`, "--tilt": `${space.tilt}deg` }}><span className="life-route-dot">{milestone ? space.icon : space.index + 1}</span>{milestone && <small>{space.label}</small>}{playersHere.length > 0 && <div className="life-cars">{playersHere.map((player, carIndex) => <i key={player.id} style={{ "--car": player.color, "--car-index": carIndex }} title={player.name} />)}</div>}</div>; })}
  </div><div className="life-board-legend"><span><i className="payday" /> Payday</span><span><i className="life" /> LIFE moment</span><span><i className="stop" /> Stop & choose</span><span><i className="action" /> Adventure</span></div></div>;
}

function Spinner({ value, spinning, disabled, onSpin }) {
  return <button className={`life-spinner ${spinning ? "spinning" : ""}`} disabled={disabled} onClick={onSpin} aria-label="Spin the wheel from 1 to 10"><span className="life-spinner-wheel" style={{ "--spin-end": `${(value || 7) * 36 + 1080}deg` }}>{Array.from({ length: 10 }, (_, index) => <i key={index} style={{ "--n": index }}>{index + 1}</i>)}<b>{spinning ? "" : value || "SPIN"}</b></span><em>▼</em><strong>{spinning ? "Round and round…" : disabled ? "Wait for your turn" : "Click to spin"}</strong></button>;
}

function PlayerCard({ player, active, isMe, finished }) {
  return <article className={`life-player-card ${active ? "active" : ""}`} style={{ "--player": player.color }}><div className="life-player-top"><span className="life-avatar">{player.isComputer ? <Bot /> : "🚗"}</span><div><strong>{player.name}{isMe ? " (you)" : ""}</strong><small>{player.status === "retired" ? "Retired" : player.career ? `${player.career.icon} ${player.career.name}` : player.path === "college" ? "🎓 In college" : "Choosing a path"}</small></div><b>{finished ? money(playerNetWorth(player)) : money(player.cash)}</b></div><div className="life-player-details"><span>💵 {player.career ? money(player.career.salary) : "No salary"}</span><span>💛 {tileCount(player)} LIFE</span><span>{player.house ? `${player.house.icon} ${player.house.name}` : "🏠 No house"}</span><span>{player.spouse ? "💍 Married" : "○ Single"}{player.children ? ` · ${player.children} ${player.children === 1 ? "child" : "children"}` : ""}</span>{player.loans > 0 && <span className="loan">Loan balance {money(player.loans * 25000)}</span>}{player.investment && <span>📈 Invested in {player.investment}</span>}</div></article>;
}

function InvestmentPicker({ disabled, onBuy }) {
  const [open, setOpen] = useState(false);
  return <div className="life-invest"><button disabled={disabled} onClick={() => setOpen((value) => !value)}><TrendingUp /> Buy an investment · $50K</button>{open && <div>{Array.from({ length: 10 }, (_, index) => <button key={index} onClick={() => { onBuy(index + 1); setOpen(false); }}>{index + 1}</button>)}</div>}</div>;
}

function Decision({ pending, player, busy, onPath, onCareer, onRetire }) {
  const heading = pending.type === "path"
    ? { title: "Choose your starting path", text: "College opens every career, but begins with $40K in tuition loans. A career pays sooner and skips the debt." }
    : pending.type === "career"
      ? { title: pending.reason, text: "Pick the work that feels right. Your salary is collected whenever you pass a Payday." }
      : { title: "Where will you retire?", text: "Millionaire Estates competes for four bonus LIFE tiles. Countryside Acres gives one safe LIFE tile now." };
  return <ChoiceModal wide title={heading.title} text={heading.text}>
    {pending.type === "path" && <div className="life-choice-grid"><button type="button" disabled={busy} onClick={() => onPath("college")}><span><GraduationCap /></span><strong>Go to college</strong><small>More career choices · 2 tuition loans</small></button><button type="button" disabled={busy} onClick={() => onPath("career")}><span><BriefcaseBusiness /></span><strong>Start a career</strong><small>Earn sooner · no tuition debt</small></button></div>}
    {pending.type === "career" && <div className="life-career-grid">{pending.options.map((career) => <button type="button" key={career.id} disabled={busy} onClick={() => onCareer(career.id)}><span>{career.icon}</span><strong>{career.name}</strong><small>{money(career.salary)} salary {career.degree ? "· degree" : ""}</small></button>)}</div>}
    {pending.type === "retirement" && <div className="life-choice-grid"><button type="button" disabled={busy} onClick={() => onRetire("millionaire")}><span>🏰</span><strong>Millionaire Estates</strong><small>Risk it for the bonus tiles</small></button><button type="button" disabled={busy} onClick={() => onRetire("countryside")}><span>🌻</span><strong>Countryside Acres</strong><small>Take one safe LIFE tile</small></button></div>}
  </ChoiceModal>;
}

function Rules({ onClose }) {
  return <ChoiceModal wide title="How to play Life" text="Based on Hasbro's classic rules." onClose={onClose}>
    <div className="tbl-rule-grid">
      <article><b>Choose a path</b><p>Start a career right away or take tuition loans for college and unlock degree careers.</p></article>
      <article><b>Spin and move</b><p>Click the 1–10 spinner, move forward, and follow the space. Red milestone spaces stop you early.</p></article>
      <article><b>Live your Life</b><p>Collect salaries, build a family, buy a home, change careers, invest, and earn hidden LIFE tiles.</p></article>
      <article><b>Retire richest</b><p>Repay loans, add cash, home value, and LIFE tiles. The highest total wins.</p></article>
    </div>
    <p className="tbl-rule-heading">Also</p>
    <div className="tbl-rule-grid">
      <article><b>Paydays</b><p>Collect your salary whenever you pass or land on one.</p></article>
      <article><b>Loans</b><p>The bank automatically issues $20K loans when needed; each costs $25K to repay.</p></article>
      <article><b>Investments</b><p>Pay $50K for a number. Collect $10K whenever anyone spins it.</p></article>
      <article><b>Speeding</b><p>Spin 10 while another player is a Police Officer and you pay them $5K.</p></article>
    </div>
    <a className="tbl-link" href="https://www.hasbro.com/common/instruct/life.pdf" target="_blank" rel="noreferrer">Read Hasbro's classic game guide ↗</a>
  </ChoiceModal>;
}

function Winner({ room, me, onLeave }) {
  const winners = room.players.filter((player) => room.winnerIds.includes(player.id));
  const ranked = [...room.players].sort((a, b) => playerNetWorth(b) - playerNetWorth(a));
  return <Results
    title={room.winnerIds.includes(me.id) ? "You lived the richest Life!" : `${winners.map((player) => player.name).join(" & ")} win${winners.length === 1 ? "s" : ""}!`}
    text="Everyone made it to retirement."
    rows={ranked.map((player) => ({ id: player.id, name: player.name, value: money(playerNetWorth(player)) }))}
  >
    <button type="button" className="tbl-primary" onClick={onLeave}>Take another journey</button>
  </Results>;
}
