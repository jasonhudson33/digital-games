"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Bot,
  Check,
  Flag,
  RotateCcw,
  Shield,
  Shuffle,
  Swords,
  Users,
} from "lucide-react";
import { StrategoRoomService } from "./stratego-room-service";
import { useEngineRoom } from "../lib/use-engine-room.js";
import { ChoiceModal, GameHeader, Hero, Landing, Lobby, Results } from "./ui/table-shell";
import {
  BOARD_SIZE,
  STRATEGO_ARMY_SIZE,
  STRATEGO_PIECE_TYPES,
  capturedByPlayer,
  currentStrategoPlayer,
  deploymentCount,
  deploymentRows,
  isLake,
  legalStrategoMoves,
  pieceAt,
  piecePosition,
  positionKey,
  resolveStrategoCombat,
  unplacedPieces,
  visibleStrategoPiece,
} from "../lib/stratego";

export default function StrategoClient() {
  const {
    room, playerId, name, setName, joinCode, setJoinCode,
    busy, error, createRoom, joinRoom, act, stepComputer, leaveRoom, copyRoomCode,
  } = useEngineRoom({ service: StrategoRoomService, storageKey: "stratego" });
  const [selectedPieceId, setSelectedPieceId] = useState(null);
  const [showRules, setShowRules] = useState(false);
  const [dismissedBattleAt, setDismissedBattleAt] = useState(null);

  const me = room?.players.find((player) => player.id === playerId) ?? null;
  const activePlayer = room ? currentStrategoPlayer(room) : null;
  const myTurn = room?.phase === "playing" && activePlayer?.id === playerId;
  const computerToAct = room?.phase === "playing" && activePlayer?.isComputer ? activePlayer : null;
  const currentBattle = useMemo(() => normalizeBattle(room), [room]);
  const battleToShow = currentBattle?.at !== dismissedBattleAt ? currentBattle : null;
  const legalTargets = useMemo(() => room && selectedPieceId && myTurn ? legalStrategoMoves(room, playerId, selectedPieceId) : [], [room, selectedPieceId, myTurn, playerId]);
  const targetKeys = useMemo(() => new Map(legalTargets.map((move) => [positionKey(move.row, move.column), move])), [legalTargets]);

  useEffect(() => {
    if (!room || room.hostId !== playerId || !computerToAct || battleToShow) return undefined;
    const timer = window.setTimeout(() => stepComputer(), 850);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [battleToShow?.at, computerToAct?.id, dismissedBattleAt, playerId, room?.updatedAt]);

  if (!room || !me) {
    return <Landing
      gameName="Stratego"
      theme="tbl-light stratego-theme"
      hero={<Hero
        kicker="The hidden battlefield"
        title={<>Outrank.<br /><em>Outthink.</em><br />Outmaneuver.</>}
        copy="Deploy forty concealed pieces, probe the enemy line, and find the Flag before your own defenses fall."
        badges={[{ icon: Users, label: "Exactly 2 players" }, { icon: Bot, label: "Human or computer" }, { icon: Shield, label: "Hidden armies" }]}
        artLayout="free"
        art={<div className="stratego-hero-board">{Array.from({ length: 36 }, (_, index) => <i key={index} className={[8, 9, 14, 15, 20, 21].includes(index) ? "lake" : index === 31 ? "flag" : index % 5 === 0 ? "red" : "blue"}>{index === 31 ? "⚑" : ""}</i>)}</div>}
      />}
      entry={{ name, setName, joinCode, setJoinCode, createRoom, joinRoom, busy, error }}
      onRules={() => setShowRules(true)}
      dialogs={showRules && <StrategoRules onClose={() => setShowRules(false)} />}
    />;
  }
  if (room.phase === "lobby") {
    return <Lobby
      gameName="Stratego"
      theme="tbl-light stratego-theme"
      room={room}
      me={me}
      busy={busy}
      error={error}
      min={2}
      max={2}
      autoStart="Deployment opens automatically when your opponent joins."
      onAdd={() => act("addComputer")}
      onRemove={() => {}}
      onLeave={leaveRoom}
      onRules={() => setShowRules(true)}
      rules={showRules && <StrategoRules onClose={() => setShowRules(false)} />}
    />;
  }

  async function chooseBoardSpace(row, column) {
    if (busy || !room) return;
    const occupant = pieceAt(room, row, column);

    if (room.phase === "setup") {
      if (me.ready) return;
      if (selectedPieceId) {
        await act("place", { pieceId: selectedPieceId, row, column });
        setSelectedPieceId(null);
        return;
      }
      if (occupant?.ownerId === playerId) setSelectedPieceId(occupant.id);
      return;
    }

    if (!myTurn || room.phase !== "playing") return;
    const target = targetKeys.get(positionKey(row, column));
    if (selectedPieceId && target) {
      setSelectedPieceId(null);
      await act("move", { pieceId: selectedPieceId, row, column });
      return;
    }
    if (occupant?.ownerId === playerId) {
      setSelectedPieceId(legalStrategoMoves(room, playerId, occupant.id).length ? occupant.id : null);
    } else {
      setSelectedPieceId(null);
    }
  }

  function selectTrayType(kind) {
    const piece = unplacedPieces(room, playerId).find((entry) => entry.kind === kind);
    if (piece) setSelectedPieceId((selected) => selected === piece.id ? null : piece.id);
  }

  async function autoArrange() {
    setSelectedPieceId(null);
    await act("autoPlace");
  }

  async function clearArmy() {
    setSelectedPieceId(null);
    await act("clear");
  }

  async function toggleReady() {
    setSelectedPieceId(null);
    await act("ready", { ready: !me.ready });
  }

  return <main className="stratego-game tbl-light stratego-theme">
    <GameHeader
      title="Stratego"
      room={room}
      subtitle={`Room ${room.roomCode}`}
      status={room.phase === "setup" ? "Secret deployment" : room.phase === "finished" ? "Battle complete" : myTurn ? "Your turn" : computerToAct ? `${activePlayer?.name} is thinking…` : `${activePlayer?.name}'s turn`}
      onRules={() => setShowRules(true)}
      onLeave={() => { setSelectedPieceId(null); leaveRoom(); }}
    />
    {error && <p className="stratego-error" role="alert">{error}</p>}

    <section className="stratego-table">
      <StrategoSidebar room={room} me={me} selectedPieceId={selectedPieceId} />
      <div className="stratego-board-column">
        {currentBattle && <BattleReport battle={currentBattle} />}
        <StrategoBoard room={room} viewerId={playerId} viewerColor={me.color} selectedPieceId={selectedPieceId} targetKeys={targetKeys} onChoose={chooseBoardSpace} />
        <p className="stratego-board-hint">{boardHint(room, me, myTurn, selectedPieceId, legalTargets.length)}</p>
      </div>
      <section className="stratego-intel">
        <div className="stratego-briefing"><p className="stratego-eyebrow">Mission</p><h2>Capture the Flag</h2><p>Enemy identities remain concealed except during battle. Keep track of what you discover.</p></div>
        <CapturedPanel title="Enemy pieces captured" pieces={capturedByPlayer(room, playerId)} />
        <CapturedPanel title="Your losses" pieces={room.captured.map((id) => room.pieces[id]).filter((piece) => piece?.ownerId === playerId)} />
        <div className="stratego-log"><h3>Battle log</h3>{room.log.slice(0, 7).map((line, index) => <p key={`${line}-${index}`}>{line}</p>)}</div>
      </section>
    </section>

    {room.phase === "setup" && <DeploymentDock room={room} me={me} busy={busy} selectedPieceId={selectedPieceId} onSelectType={selectTrayType} onAuto={autoArrange} onClear={clearArmy} onReady={toggleReady} />}
    {showRules && <StrategoRules onClose={() => setShowRules(false)} />}
    {!showRules && battleToShow && <BattleResult battle={battleToShow} onContinue={() => setDismissedBattleAt(battleToShow.at)} />}
    {!showRules && !battleToShow && room.phase === "finished" && <StrategoFinished room={room} me={me} onLeave={() => { setSelectedPieceId(null); leaveRoom(); }} />}
  </main>;
}

function StrategoBoard({ room, viewerId, viewerColor, selectedPieceId, targetKeys, onChoose }) {
  const indices = Array.from({ length: BOARD_SIZE }, (_, index) => viewerColor === "blue" ? BOARD_SIZE - 1 - index : index);
  return <div className={`stratego-board viewer-${viewerColor}`} aria-label="Stratego battlefield">{indices.flatMap((row) => indices.map((column) => {
    const key = positionKey(row, column);
    const lake = isLake(row, column);
    const piece = pieceAt(room, row, column);
    const visible = visibleStrategoPiece(piece, viewerId);
    const target = targetKeys.get(key);
    const ownSetup = room.phase === "setup" && deploymentRows(viewerColor).includes(row);
    return <button key={key} className={`stratego-square ${lake ? "lake" : ""} ${ownSetup ? "deployment" : ""} ${selectedPieceId === piece?.id ? "selected" : ""} ${target ? target.attack ? "attack-target" : "move-target" : ""}`} disabled={lake} onClick={() => onChoose(row, column)} aria-label={lake ? "Lake" : piece ? visible.hidden ? "Unknown enemy piece" : `${visible.mark} ${visible.label}` : `Empty square ${row + 1}, ${column + 1}`}>
      {lake ? <span className="stratego-water"><i /><i /><i /></span> : piece ? <PieceFace piece={visible} /> : target ? <span className="stratego-target-mark">{target.attack ? <Swords /> : "•"}</span> : null}
    </button>;
  }))}</div>;
}

function PieceFace({ piece, compact = false }) {
  return <span className={`stratego-piece ${piece.color} ${piece.hidden ? "concealed" : ""} ${compact ? "compact" : ""}`} title={piece.label}><small>{piece.hidden ? "" : piece.icon}</small><strong>{piece.mark}</strong><em>{piece.hidden ? "" : piece.label}</em></span>;
}

function DeploymentDock({ room, me, busy, selectedPieceId, onSelectType, onAuto, onClear, onReady }) {
  const unplaced = unplacedPieces(room, me.id);
  const placed = deploymentCount(room, me.id);
  const selected = room.pieces[selectedPieceId];
  return <section className="stratego-deployment-dock">
    <div className="stratego-deployment-head"><div><p className="stratego-eyebrow">Your concealed army</p><h2>{me.ready ? "Deployment locked" : selected ? `Place your ${selected.label}` : "Choose a piece, then a square"}</h2><p>{me.ready ? "Your opponent cannot see these identities. You may edit until both commanders are ready." : "Your four highlighted rows must contain all forty pieces."}</p></div><div className="stratego-deployment-count"><strong>{placed}/{STRATEGO_ARMY_SIZE}</strong><span>placed</span></div></div>
    <div className="stratego-tray">{STRATEGO_PIECE_TYPES.map((type) => { const remaining = unplaced.filter((piece) => piece.kind === type.kind).length; const selectedType = selected?.kind === type.kind && !piecePosition(room, selected.id); return <button key={type.kind} className={`${selectedType ? "selected" : ""}`} disabled={busy || me.ready || remaining === 0} onClick={() => onSelectType(type.kind)}><PieceFace piece={{ ...type, color: me.color, hidden: false }} compact /><span><strong>{type.label}</strong><small>{type.kind === "spy" ? "Special" : type.immobile ? "Immobile" : `Rank ${type.rank}`}</small></span><b>{remaining}</b></button>; })}</div>
    <div className="stratego-deployment-actions"><button disabled={busy || me.ready} onClick={onAuto}><Shuffle /> Auto arrange</button><button disabled={busy || me.ready || placed === 0} onClick={onClear}><RotateCcw /> Clear</button><button className={`stratego-ready ${me.ready ? "locked" : ""}`} disabled={busy || (!me.ready && placed !== STRATEGO_ARMY_SIZE)} onClick={onReady}>{me.ready ? <><RotateCcw /> Edit deployment</> : <><Check /> I’m ready</>}</button></div>
    <div className="stratego-ready-status">{room.players.map((player) => <span key={player.id} className={player.ready ? "ready" : ""}><i className={player.color} />{player.name}: {player.ready ? "ready" : "deploying"}</span>)}</div>
  </section>;
}

function StrategoSidebar({ room, me, selectedPieceId }) {
  const opponent = room.players.find((player) => player.id !== me.id);
  const selected = room.pieces[selectedPieceId];
  return <aside className="stratego-sidebar">
    <p className="stratego-eyebrow">Commanders</p>
    <CommanderCard player={opponent} active={currentStrategoPlayer(room)?.id === opponent?.id && room.phase === "playing"} opponent />
    <div className="stratego-versus"><span /><b>VS</b><span /></div>
    <CommanderCard player={me} active={currentStrategoPlayer(room)?.id === me.id && room.phase === "playing"} />
    <div className="stratego-selection"><h3>{selected ? "Selected piece" : "Field orders"}</h3>{selected ? <><PieceFace piece={selected} /><strong>{selected.mark} · {selected.label}</strong><p>{pieceHelp(selected)}</p></> : <p>{room.phase === "setup" ? "Select a piece from your tray or deployment, then choose one of your highlighted home squares." : "Select one of your movable pieces. Legal destinations will light up on the battlefield."}</p>}</div>
  </aside>;
}

function CommanderCard({ player, active, opponent = false }) {
  if (!player) return null;
  return <article className={`stratego-commander ${player.color} ${active ? "active" : ""}`}><span>{player.isComputer ? <Bot /> : <Shield />}</span><div><strong>{player.name}{opponent ? "" : " (you)"}</strong><small>{player.isComputer ? "computer · " : ""}{player.color} commander</small></div>{player.ready ? <Check /> : <i />}</article>;
}

function CapturedPanel({ title, pieces }) {
  const groups = STRATEGO_PIECE_TYPES.map((type) => ({ ...type, count: pieces.filter((piece) => piece.kind === type.kind).length })).filter((group) => group.count);
  return <section className="stratego-captured"><h3>{title} <span>{pieces.length}</span></h3>{groups.length ? <div>{groups.map((group) => <span key={group.kind} title={group.label}><b>{group.mark}</b><small>×{group.count}</small></span>)}</div> : <p>None yet</p>}</section>;
}

function BattleReport({ battle }) {
  return <section className="stratego-battle-report" role="status"><PieceFace piece={{ ...battle.attacker, color: battle.attackerColor, hidden: false }} compact /><div><p className="stratego-eyebrow">Latest battle</p><strong>{battle.attackerName ?? "Attacker"}’s {pieceIdentity(battle.attacker)} {battle.result}</strong><small>against {battle.defenderName ?? "Defender"}’s {pieceIdentity(battle.defender)}</small></div><span>VS</span><PieceFace piece={{ ...battle.defender, color: battle.defenderColor, hidden: false }} compact /></section>;
}

function normalizeBattle(room) {
  const battle = room?.lastBattle;
  if (!battle) return null;
  const result = resolveStrategoCombat(battle.attacker, battle.defender);
  const attackerPlayer = room.players.find((player) => player.id === battle.attackerPlayerId || player.color === battle.attackerColor);
  const defenderPlayer = room.players.find((player) => player.id === battle.defenderPlayerId || player.color === battle.defenderColor);
  return {
    ...battle,
    attackerPlayerId: battle.attackerPlayerId ?? attackerPlayer?.id,
    defenderPlayerId: battle.defenderPlayerId ?? defenderPlayer?.id,
    attackerName: battle.attackerName ?? attackerPlayer?.name ?? "Attacker",
    defenderName: battle.defenderName ?? defenderPlayer?.name ?? "Defender",
    attackerSurvives: battle.attackerSurvives ?? result.attackerSurvives,
    defenderSurvives: battle.defenderSurvives ?? result.defenderSurvives,
  };
}

function BattleResult({ battle, onContinue }) {
  const outcome = battleOutcome(battle);
  return <div className="stratego-overlay" role="dialog" aria-modal="true" aria-labelledby="stratego-battle-title"><section className="stratego-battle-modal">
    <div className="stratego-battle-icon"><Swords /></div>
    <p className="stratego-eyebrow">Both pieces revealed</p>
    <h1 id="stratego-battle-title">Battle resolved</h1>
    <div className="stratego-battle-versus">
      <BattleCombatant label="Attacker" name={battle.attackerName ?? "Attacker"} piece={battle.attacker} color={battle.attackerColor} survives={battle.attackerSurvives} />
      <span>VS</span>
      <BattleCombatant label="Defender" name={battle.defenderName ?? "Defender"} piece={battle.defender} color={battle.defenderColor} survives={battle.defenderSurvives} />
    </div>
    <div className="stratego-battle-outcome"><strong>{outcome.headline}</strong><p>{outcome.detail}</p><small>{battleExplanation(battle)}</small></div>
    <button className="stratego-primary" onClick={onContinue}>Continue</button>
  </section></div>;
}

function BattleCombatant({ label, name, piece, color, survives }) {
  return <article className={`stratego-combatant ${color}`}><p>{label}</p><PieceFace piece={{ ...piece, color, hidden: false }} /><h2>{name}</h2><strong>{pieceIdentity(piece)}</strong><span className={survives ? "survived" : "removed"}>{survives ? "Survived" : "Removed"}</span></article>;
}

function pieceIdentity(piece) {
  return `${piece.mark} · ${piece.label}`;
}

function battleOutcome(battle) {
  const attacker = `${battle.attackerName ?? "Attacker"}’s ${pieceIdentity(battle.attacker)}`;
  const defender = `${battle.defenderName ?? "Defender"}’s ${pieceIdentity(battle.defender)}`;
  if (battle.attackerSurvives && !battle.defenderSurvives) return { headline: `${attacker} wins`, detail: `${attacker} remains on the board. ${defender} is removed.` };
  if (!battle.attackerSurvives && battle.defenderSurvives) return { headline: `${defender} wins`, detail: `${defender} remains on the board. ${attacker} is removed.` };
  return { headline: "Equal ranks — both pieces are removed", detail: `${attacker} and ${defender} leave the board.` };
}

function battleExplanation(battle) {
  if (battle.defender.kind === "flag") return "Any movable piece captures the Flag and wins the game.";
  if (battle.defender.kind === "bomb" && battle.attacker.kind === "miner") return "The 8 · Miner is the only piece that can defuse a Bomb.";
  if (battle.defender.kind === "bomb") return "A Bomb defeats every attacker except an 8 · Miner.";
  if (battle.attacker.kind === "spy" && battle.defender.kind === "marshal") return "The Spy defeats the 1 · Marshal only when the Spy attacks first.";
  if (battle.attacker.rank === battle.defender.rank) return "Pieces with equal ranks remove each other.";
  return "Classic Stratego uses lower numbers as stronger ranks, so the lower number wins.";
}

function boardHint(room, me, myTurn, selectedPieceId, legalCount) {
  if (room.phase === "setup") return me.ready ? "Deployment locked. Waiting for the other commander." : selectedPieceId ? "Choose a highlighted home square. Selecting an occupied friendly square swaps the pieces." : "Choose a piece from the army tray below.";
  if (room.phase === "finished") return "The final battlefield remains visible behind the result.";
  if (!myTurn) return "Watch the enemy move. Their piece identities remain concealed.";
  if (selectedPieceId) return legalCount ? "Choose a lit square to move or attack." : "That piece cannot move. Choose another piece.";
  return "Choose one of your pieces to see its legal moves.";
}

function pieceHelp(piece) {
  if (piece.kind === "flag") return "Protect it. If the enemy captures it, the battle is over.";
  if (piece.kind === "bomb") return "Immobile. It defeats every attacker except a Miner.";
  if (piece.kind === "miner") return "Moves one square and is the only rank that defuses Bombs.";
  if (piece.kind === "scout") return "Moves any open distance in a straight line and may attack.";
  if (piece.kind === "spy") return "Defeats the Marshal only when attacking first.";
  return `Classic rank ${piece.rank}. Lower numbered ranks defeat higher numbered ranks.`;
}

function StrategoRules({ onClose }) {
  return <ChoiceModal wide title="Know your army" text="Classic Hasbro rules. This edition uses the classic numbering where 1 is the strongest rank. Capture the enemy Flag or leave the opponent without a legal move." onClose={onClose}>
    <div className="tbl-rule-grid">
      <article><b>Deploy secretly</b><p>Place all forty pieces in your four home rows. Bombs and the Flag never move.</p></article>
      <article><b>Move orthogonally</b><p>Move one square forward, backward, or sideways. Never move diagonally or through a lake.</p></article>
      <article><b>Attack</b><p>Move onto an enemy piece. The stronger rank survives; equal ranks remove each other.</p></article>
      <article><b>Take the Flag</b><p>Any movable piece can capture the Flag. Red makes the first move.</p></article>
    </div>
    <p className="tbl-rule-heading">Special pieces</p>
    <div className="tbl-rule-grid">
      <article><b>Scout 9</b><p>Moves any open distance in one straight line and may attack at the end.</p></article>
      <article><b>Miner 8</b><p>The only piece that can attack and remove a Bomb.</p></article>
      <article><b>Spy</b><p>Defeats the Marshal only when the Spy attacks first. A Marshal attacking a Spy wins.</p></article>
      <article><b>Bomb</b><p>Destroys every attacker except a Miner and stays in place.</p></article>
      <article><b>Two-square rule</b><p>A piece cannot shuttle over the same boundary more than three consecutive turns.</p></article>
    </div>
    <a className="tbl-link" href="https://instructions.hasbro.com/en-us/instruction/vintage-stratego-game" target="_blank" rel="noreferrer">Hasbro’s official classic instructions ↗</a>
  </ChoiceModal>;
}

function StrategoFinished({ room, me, onLeave }) {
  const winner = room.players.find((player) => player.id === room.winnerId);
  const won = winner?.id === me.id;
  return <Results title={won ? "Victory is yours" : `${winner?.name} wins`} text={`${winner?.name} ${room.winReason}.`}>
    <button type="button" className="tbl-primary" onClick={onLeave}>Return to headquarters</button>
  </Results>;
}
