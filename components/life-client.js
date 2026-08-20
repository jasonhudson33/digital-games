"use client";

import { useEffect, useMemo, useState } from "react";
import { Bot, BriefcaseBusiness, CircleHelp, Copy, GraduationCap, Home, LogOut, Plus, Sparkles, TrendingUp, Users, X } from "lucide-react";
import { LifeRoomService } from "./life-room-service";
import { BOARD, addLifeComputer, addLifePlayer, buyInvestment, chooseCareer, chooseLifePath, chooseRetirement, createLifeLobby, currentLifePlayer, money, playerNetWorth, removeLifeComputer, runLifeComputerTurn, spinLife, startLifeGame } from "../lib/life";

const idKey = "life-player-id";
const nameKey = "life-player-name";
const roomKey = "life-active-room";

export default function LifeClient() {
  const [room, setRoom] = useState(null);
  const [playerId, setPlayerId] = useState("");
  const [name, setName] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [showRules, setShowRules] = useState(false);
  const [spinning, setSpinning] = useState(false);
  const [spinPreview, setSpinPreview] = useState(null);
  const [computerThinking, setComputerThinking] = useState(false);

  useEffect(() => {
    const storedId = localStorage.getItem(idKey) || crypto.randomUUID();
    localStorage.setItem(idKey, storedId);
    setPlayerId(storedId);
    setName(localStorage.getItem(nameKey) || "");
    const code = localStorage.getItem(roomKey);
    if (!code) return;
    LifeRoomService.load(code).then((loaded) => { if (loaded?.players.some((player) => player.id === storedId)) setRoom(loaded); }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!room?.roomCode) return undefined;
    return LifeRoomService.subscribe(room.roomCode, (next) => setRoom((current) => !current || Number(next.updatedAt || 0) >= Number(current.updatedAt || 0) ? next : current));
  }, [room?.roomCode]);

  const me = room?.players.find((player) => player.id === playerId) || null;
  const active = room ? currentLifePlayer(room) : null;

  useEffect(() => {
    if (!room || room.hostId !== playerId || room.phase !== "playing" || !active?.isComputer) { setComputerThinking(false); return undefined; }
    let cancelled = false;
    setComputerThinking(true);
    const timer = window.setTimeout(async () => {
      try { await update((current) => runLifeComputerTurn(current)); }
      finally { if (!cancelled) setComputerThinking(false); }
    }, room.pending ? 800 : 1300);
    return () => { cancelled = true; window.clearTimeout(timer); };
  }, [active?.id, room?.pending?.type, room?.updatedAt, playerId]);

  async function createRoom() {
    if (!name.trim()) return setError("Enter your name first.");
    setBusy(true); setError("");
    try { const code = await LifeRoomService.createCode(); remember(await LifeRoomService.save(createLifeLobby({ id: playerId, name: name.trim() }, code))); }
    catch (caught) { setError(caught.message); } finally { setBusy(false); }
  }

  async function joinRoom() {
    if (!name.trim() || !joinCode.trim()) return setError("Enter your name and a room code.");
    setBusy(true); setError("");
    try {
      const code = joinCode.trim().toUpperCase();
      const loaded = await LifeRoomService.load(code);
      if (!loaded) throw new Error("That room could not be found.");
      if (loaded.players.some((player) => player.id === playerId)) remember(loaded);
      else {
        if (loaded.phase !== "lobby") throw new Error("That game has already started.");
        if (loaded.players.length >= 6) throw new Error("That room is full.");
        remember(await LifeRoomService.update(code, (current) => addLifePlayer(current, { id: playerId, name: name.trim() })));
      }
    } catch (caught) { setError(caught.message); } finally { setBusy(false); }
  }

  function remember(next) { localStorage.setItem(nameKey, name.trim()); localStorage.setItem(roomKey, next.roomCode); setRoom(next); }
  async function update(action) { if (!room) return; setBusy(true); setError(""); try { const next = await LifeRoomService.update(room.roomCode, action); if (next) setRoom(next); } catch (caught) { setError(caught.message); } finally { setBusy(false); } }
  function leave() { localStorage.removeItem(roomKey); setRoom(null); }

  async function handleSpin() {
    if (spinning || busy) return;
    const result = Math.floor(Math.random() * 10) + 1;
    setSpinPreview(result);
    setSpinning(true);
    window.setTimeout(async () => { await update((current) => spinLife(current, playerId, result)); setSpinning(false); setSpinPreview(null); }, 1050);
  }

  if (!room || !me) return <LifeLanding {...{ name, setName, joinCode, setJoinCode, createRoom, joinRoom, busy, error, showRules, setShowRules }} />;
  if (room.phase === "lobby") return <LifeLobby room={room} me={me} busy={busy} error={error} onAdd={() => update(addLifeComputer)} onRemove={(id) => update((current) => removeLifeComputer(current, id))} onStart={() => update(startLifeGame)} onLeave={leave} onRules={() => setShowRules(true)} />;

  const myTurn = room.phase === "playing" && active?.id === playerId;
  const pendingMine = myTurn && room.pending?.playerId === playerId;
  return <main className="life-game">
    <header className="life-game-header">
      <div><p className="life-kicker">Room {room.roomCode}</p><h1>Life</h1></div>
      <div className={`life-turn-pill ${myTurn ? "mine" : ""}`}><span style={{ background: active?.color }} />{room.phase === "finished" ? "Journey complete" : myTurn ? "Your turn" : computerThinking ? `${active?.name} is thinking…` : `${active?.name}'s turn`}</div>
      <button onClick={() => setShowRules(true)}><CircleHelp /> Rules</button>
      <button onClick={() => navigator.clipboard?.writeText(room.roomCode)}><Copy /> {room.roomCode}</button>
      <button onClick={leave}><LogOut /> Leave</button>
    </header>
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
            {myTurn && !room.pending && !me.investment && <InvestmentPicker disabled={busy} onBuy={(number) => update((current) => buyInvestment(current, playerId, number))} />}
          </div>
        </div>
      </section>
    </section>
    {pendingMine && <Decision pending={room.pending} player={me} busy={busy} onPath={(path) => update((current) => chooseLifePath(current, playerId, path))} onCareer={(careerId) => update((current) => chooseCareer(current, playerId, careerId))} onRetire={(destination) => update((current) => chooseRetirement(current, playerId, destination))} />}
    {room.phase === "finished" && <Winner room={room} me={me} onLeave={leave} />}
    {showRules && <Rules onClose={() => setShowRules(false)} />}
  </main>;
}

function LifeLanding({ name, setName, joinCode, setJoinCode, createRoom, joinRoom, busy, error, showRules, setShowRules }) {
  return <main className="life-landing">
    <section className="life-hero">
      <div className="life-hero-copy"><p className="life-kicker">A whole life in one game night</p><h1>Where will<br /><em>Life</em> take you?</h1><p>Choose your path, build a career, grow a family, and follow every twist of the spinner.</p><div className="life-facts"><span><Users /> 2–6 players</span><span><Bot /> Computer players</span><span><Sparkles /> Shared rooms</span></div></div>
      <div className="life-hero-art" aria-hidden="true"><div className="life-sun" /><div className="life-road"><span>🚗</span><i /><b>🏡</b><strong>🌴</strong></div><div className="life-cloud one" /><div className="life-cloud two" /></div>
    </section>
    <section className="life-entry">
      <div><p className="life-kicker">Pull into the driveway</p><h2>Start a journey</h2><p>Create a room or join friends with their five-character code.</p></div>
      <label>Your name<input value={name} maxLength={20} autoComplete="nickname" onChange={(event) => setName(event.target.value)} placeholder="Player name" /></label>
      <button className="life-primary" disabled={busy} onClick={createRoom}><Plus /> Create a room</button>
      <div className="life-or"><span>or</span></div>
      <div className="life-join"><input aria-label="Room code" value={joinCode} maxLength={5} onChange={(event) => setJoinCode(event.target.value.toUpperCase())} placeholder="ROOM CODE" /><button disabled={busy} onClick={joinRoom}>Join</button></div>
      <button className="life-rule-link" onClick={() => setShowRules(true)}><CircleHelp /> How to play</button>
      {error && <p className="life-form-error">{error}</p>}
    </section>
    {showRules && <Rules onClose={() => setShowRules(false)} />}
  </main>;
}

function LifeLobby({ room, me, busy, error, onAdd, onRemove, onStart, onLeave, onRules }) {
  const isHost = me.id === room.hostId;
  return <main className="life-lobby"><section className="life-lobby-card">
    <div className="life-lobby-head"><div><p className="life-kicker">Your road trip is ready</p><h1>Room <button onClick={() => navigator.clipboard?.writeText(room.roomCode)}>{room.roomCode} <Copy /></button></h1><p>Share the code, add computer drivers, then hit the road.</p></div><button className="life-rule-link" onClick={onRules}><CircleHelp /> Rules</button></div>
    <div className="life-seats">{room.players.map((player, index) => <article key={player.id} style={{ "--player": player.color }}><span>{player.isComputer ? <Bot /> : <Users />}</span><div><strong>{player.name}{player.id === me.id ? " (you)" : ""}</strong><small>{index === 0 ? "Host · " : ""}{player.isComputer ? "Computer driver" : "Human driver"}</small></div>{player.isComputer && isHost ? <button aria-label={`Remove ${player.name}`} onClick={() => onRemove(player.id)}><X /></button> : <i>✓</i>}</article>)}</div>
    {isHost && room.players.length < 6 && <button className="life-add-bot" disabled={busy} onClick={onAdd}><Bot /> Add computer player</button>}
    <div className={`life-ready ${room.players.length >= 2 ? "yes" : ""}`}><strong>{room.players.length}/6 drivers</strong><span>{room.players.length >= 2 ? "The road is open" : "Add one more player to begin"}</span></div>
    {isHost ? <button className="life-primary life-start" disabled={busy || room.players.length < 2} onClick={onStart}><Sparkles /> Start game</button> : <p className="life-wait">Waiting for {room.players[0].name} to start…</p>}
    <button className="life-quiet" onClick={onLeave}>Leave room</button>{error && <p className="life-form-error">{error}</p>}
  </section></main>;
}

function Board({ room, spinner }) {
  const occupied = useMemo(() => room.players.reduce((map, player) => { (map[player.position] ||= []).push(player); return map; }, {}), [room.players]);
  return <div className="life-board-wrap"><div className="life-board" aria-label="Life game board">
    <div className="life-road-run road-bottom" /><div className="life-road-turn turn-bottom" /><div className="life-road-run road-low" /><div className="life-road-turn turn-low" /><div className="life-road-run road-high" /><div className="life-road-turn turn-high" /><div className="life-road-run road-top" />
    <div className="life-scenery life-scenery-town" aria-hidden="true"><span>🏙️</span><b>First big break</b></div>
    <div className="life-scenery life-scenery-college" aria-hidden="true"><span>🏫</span><b>College hill</b></div>
    <div className="life-scenery life-scenery-home" aria-hidden="true"><span>🏡</span><b>Home sweet home</b></div>
    <div className="life-scenery life-scenery-lake" aria-hidden="true"><span>⛵</span><b>Adventure lake</b></div>
    <div className="life-scenery life-scenery-mountain" aria-hidden="true"><span>🏔️</span><b>High hopes</b></div>
    <div className="life-scenery life-scenery-retire" aria-hidden="true"><span>🌴</span><b>Retirement</b></div>
    <div className="life-board-spinner">{spinner}</div>
    {BOARD.map((space) => { const point = LIFE_BOARD_POSITIONS[space.index]; return <div key={space.index} title={`${space.index + 1}. ${space.label}`} aria-label={`${space.index + 1}. ${space.label}`} className={`life-space type-${space.type}`} style={{ "--x": `${point.x}%`, "--y": `${point.y}%`, "--tilt": `${point.tilt}deg` }}><span className="life-space-number">{space.index + 1}</span><span className="life-space-icon">{space.icon}</span><small>{space.label}</small>{occupied[space.index] && <div className="life-cars">{occupied[space.index].map((player, carIndex) => <i key={player.id} style={{ "--car": player.color, "--car-index": carIndex }} title={player.name} />)}</div>}</div>; })}
  </div><div className="life-board-legend"><span><i className="payday" /> Payday</span><span><i className="life" /> LIFE moment</span><span><i className="stop" /> Stop & choose</span><span><i className="action" /> Adventure</span></div></div>;
}

const LIFE_BOARD_POSITIONS = buildLifeBoardPositions();

function buildLifeBoardPositions() {
  const points = [];
  const addLine = (count, fromX, toX, fromY, toY, wave = 0) => {
    for (let index = 0; index < count; index += 1) {
      const progress = count === 1 ? 0 : index / (count - 1);
      const x = fromX + (toX - fromX) * progress;
      const y = fromY + (toY - fromY) * progress + Math.sin(progress * Math.PI) * wave;
      const direction = Math.atan2(toY - fromY, toX - fromX) * 180 / Math.PI;
      points.push({ x, y, tilt: direction + (index % 2 ? 2 : -2) });
    }
  };
  addLine(10, 6.5, 93, 88, 88, -1.1);
  addLine(4, 93, 93, 81.5, 62, 1);
  addLine(9, 83.5, 7, 62, 62, 1.2);
  addLine(4, 7, 7, 55.3, 35, -1);
  addLine(9, 16.5, 93, 35, 35, -1.1);
  addLine(4, 93, 93, 28.5, 10, 1);
  addLine(14, 86.5, 6.5, 10, 10, 1);
  return points;
}

function Spinner({ value, spinning, disabled, onSpin }) {
  return <button className={`life-spinner ${spinning ? "spinning" : ""}`} disabled={disabled} onClick={onSpin} aria-label="Spin the wheel from 1 to 10"><span className="life-spinner-wheel" style={{ "--spin-end": `${(value || 7) * 36 + 1080}deg` }}>{Array.from({ length: 10 }, (_, index) => <i key={index} style={{ "--n": index }}>{index + 1}</i>)}<b>{spinning ? "" : value || "SPIN"}</b></span><em>▼</em><strong>{spinning ? "Round and round…" : disabled ? "Wait for your turn" : "Click to spin"}</strong></button>;
}

function PlayerCard({ player, active, isMe, finished }) {
  return <article className={`life-player-card ${active ? "active" : ""}`} style={{ "--player": player.color }}><div className="life-player-top"><span className="life-avatar">{player.isComputer ? <Bot /> : "🚗"}</span><div><strong>{player.name}{isMe ? " (you)" : ""}</strong><small>{player.status === "retired" ? "Retired" : player.career ? `${player.career.icon} ${player.career.name}` : player.path === "college" ? "🎓 In college" : "Choosing a path"}</small></div><b>{finished ? money(playerNetWorth(player)) : money(player.cash)}</b></div><div className="life-player-details"><span>💵 {player.career ? money(player.career.salary) : "No salary"}</span><span>💛 {player.lifeTiles.length} LIFE</span><span>{player.house ? `${player.house.icon} ${player.house.name}` : "🏠 No house"}</span><span>{player.spouse ? "💍 Married" : "○ Single"}{player.children ? ` · ${player.children} ${player.children === 1 ? "child" : "children"}` : ""}</span>{player.loans > 0 && <span className="loan">Loan balance {money(player.loans * 25000)}</span>}{player.investment && <span>📈 Invested in {player.investment}</span>}</div></article>;
}

function InvestmentPicker({ disabled, onBuy }) {
  const [open, setOpen] = useState(false);
  return <div className="life-invest"><button disabled={disabled} onClick={() => setOpen((value) => !value)}><TrendingUp /> Buy an investment · $50K</button>{open && <div>{Array.from({ length: 10 }, (_, index) => <button key={index} onClick={() => { onBuy(index + 1); setOpen(false); }}>{index + 1}</button>)}</div>}</div>;
}

function Decision({ pending, player, busy, onPath, onCareer, onRetire }) {
  return <div className="life-overlay" role="dialog" aria-modal="true"><section className="life-decision"><p className="life-kicker">Your life, your choice</p>{pending.type === "path" && <><h1>Choose your starting path</h1><p>College opens every career, but begins with $40K in tuition loans. A career pays sooner and skips the debt.</p><div className="life-choice-grid"><button disabled={busy} onClick={() => onPath("college")}><span><GraduationCap /></span><strong>Go to college</strong><small>More career choices · 2 tuition loans</small></button><button disabled={busy} onClick={() => onPath("career")}><span><BriefcaseBusiness /></span><strong>Start a career</strong><small>Earn sooner · no tuition debt</small></button></div></>}{pending.type === "career" && <><h1>{pending.reason}</h1><p>Pick the work that feels right. Your salary is collected whenever you pass a Payday.</p><div className="life-career-grid">{pending.options.map((career) => <button key={career.id} disabled={busy} onClick={() => onCareer(career.id)}><span>{career.icon}</span><strong>{career.name}</strong><small>{money(career.salary)} salary {career.degree ? "· degree" : ""}</small></button>)}</div></>}{pending.type === "retirement" && <><h1>Where will you retire?</h1><p>Millionaire Estates competes for four bonus LIFE tiles. Countryside Acres gives one safe LIFE tile now.</p><div className="life-choice-grid"><button disabled={busy} onClick={() => onRetire("millionaire")}><span>🏰</span><strong>Millionaire Estates</strong><small>Risk it for the bonus tiles</small></button><button disabled={busy} onClick={() => onRetire("countryside")}><span>🌻</span><strong>Countryside Acres</strong><small>Take one safe LIFE tile</small></button></div></>}</section></div>;
}

function Winner({ room, me, onLeave }) {
  const winners = room.players.filter((player) => room.winnerIds.includes(player.id));
  const ranked = [...room.players].sort((a, b) => playerNetWorth(b) - playerNetWorth(a));
  return <div className="life-overlay"><section className="life-winner"><span>🏆</span><p className="life-kicker">Everyone made it to retirement</p><h1>{room.winnerIds.includes(me.id) ? "You lived the richest Life!" : `${winners.map((player) => player.name).join(" & ")} win${winners.length === 1 ? "s" : ""}!`}</h1><div>{ranked.map((player, index) => <p key={player.id}><b>{index + 1}</b><span>{player.name}</span><strong>{money(playerNetWorth(player))}</strong></p>)}</div><button className="life-primary" onClick={onLeave}>Take another journey</button></section></div>;
}

function Rules({ onClose }) {
  return <div className="life-overlay" role="dialog" aria-modal="true"><section className="life-rules"><button className="life-modal-close" onClick={onClose}><X /></button><p className="life-kicker">Based on Hasbro's classic rules</p><h1>How to play Life</h1><div className="life-rules-grid"><article><b>1</b><h2>Choose a path</h2><p>Start a career right away or take tuition loans for college and unlock degree careers.</p></article><article><b>2</b><h2>Spin and move</h2><p>Click the 1–10 spinner, move forward, and follow the space. Red milestone spaces stop you early.</p></article><article><b>3</b><h2>Live your Life</h2><p>Collect salaries, build a family, buy a home, change careers, invest, and earn hidden LIFE tiles.</p></article><article><b>4</b><h2>Retire richest</h2><p>Repay loans, add cash, home value, and LIFE tiles. The highest total wins.</p></article></div><div className="life-rules-notes"><p><strong>Paydays:</strong> Collect your salary whenever you pass or land on one.</p><p><strong>Loans:</strong> The bank automatically issues $20K loans when needed; each costs $25K to repay.</p><p><strong>Investments:</strong> Pay $50K for a number. Collect $10K whenever anyone spins it.</p><p><strong>Speeding:</strong> Spin 10 while another player is a Police Officer and you pay them $5K.</p></div><a className="life-source" href="https://www.hasbro.com/common/instruct/life.pdf" target="_blank" rel="noreferrer">Read Hasbro's classic game guide ↗</a><button className="life-primary" onClick={onClose}>Ready to roll</button></section></div>;
}
