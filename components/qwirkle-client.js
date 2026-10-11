"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Bot,
  Check,
  Plus,
  RotateCcw,
  Sparkles,
  Trash2,
  Users,
} from "lucide-react";
import { QwirkleRoomService } from "./qwirkle-room-service";
import {
  QWIRKLE_COLOR_INFO,
  QWIRKLE_SHAPE_INFO,
  boardBounds,
  currentPlayer,
  legalTargetsForTile,
  positionKey,
  scoreMove,
  validateMove,
} from "../lib/qwirkle";
import { useEngineRoom } from "../lib/use-engine-room.js";
import { ChoiceModal, GameHeader, Hero, Landing, Lobby, Results } from "./ui/table-shell";

/** Opponents' racks are not sent, only a count. */
const rackSize = (player) => player.handCount ?? player.hand.length;

export default function QwirkleClient() {
  const {
    room, playerId, name, setName, joinCode, setJoinCode,
    busy, error, createRoom, joinRoom, act, leaveRoom: leaveEngineRoom, computerWaiting, computerSpeed,
  } = useEngineRoom({ service: QwirkleRoomService, storageKey: "qwirkle", computerDue: (current) => current.phase === "playing" && Boolean(currentPlayer(current)?.isComputer) });
  const [selectedTileId, setSelectedTileId] = useState(null);
  const [staged, setStaged] = useState([]);
  const [exchangeMode, setExchangeMode] = useState(false);
  const [exchangeIds, setExchangeIds] = useState([]);
  const [showRules, setShowRules] = useState(false);

  const me = room?.players.find((player) => player.id === playerId) ?? null;
  const activePlayer = room ? currentPlayer(room) : null;
  const computerToAct = room?.phase === "playing" && activePlayer?.isComputer ? activePlayer : null;

  useEffect(() => {
    setStaged([]);
    setSelectedTileId(null);
    setExchangeMode(false);
    setExchangeIds([]);
  }, [room?.turnNumber, room?.phase]);


  function leaveRoom() {
    if (room?.phase === "playing" && !window.confirm("Leave the table? You can rejoin with the room code.")) return;
    leaveEngineRoom();
    setStaged([]);
    setSelectedTileId(null);
  }

  if (!room || !me) {
    return <Landing
      gameName="Qwirkle"
      theme="tbl-light qwirkle-theme"
      hero={<Hero
        kicker="Color. Shape. Strategy."
        title={<>Find the match.<br /><em>Build the line.</em></>}
        copy="Turn a handful of bold tiles into clever crossings, long lines, and the perfect six-piece Qwirkle."
        badges={[{ icon: Users, label: "2–4 players" }, { icon: Bot, label: "Computer seats" }, { icon: Sparkles, label: "Room play" }]}
        artLayout="free"
        art={<div className="qwirkle-hero-grid">{SHOWCASE.map((tile, index) => <span key={index} style={{ "--x": index < 3 ? index : 2, "--y": index < 3 ? 1 : index - 1 }}><Tile tile={tile} /></span>)}</div>}
      />}
      entry={{ name, setName, joinCode, setJoinCode, createRoom, joinRoom, busy, error }}
      onRules={() => setShowRules(true)}
      dialogs={showRules && <RulesModal onClose={() => setShowRules(false)} />}
    />;
  }
  if (room.phase === "lobby") {
    return <Lobby computerSpeed={computerSpeed}
      gameName="Qwirkle"
      theme="tbl-light qwirkle-theme"
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
      rules={showRules && <RulesModal onClose={() => setShowRules(false)} />}
    />;
  }

  const myTurn = room.phase === "playing" && activePlayer?.id === playerId;
  const bounds = displayedBounds(room, staged);
  const selectedTile = me.hand.find((tile) => tile.id === selectedTileId) ?? null;
  const targets = selectedTile && myTurn && !exchangeMode ? legalTargetsForTile(room, playerId, selectedTile.id, staged, bounds) : [];
  const targetKeys = new Set(targets.map(({ x, y }) => positionKey(x, y)));
  const stagedByPosition = new Map(staged.map((placement) => [positionKey(placement.x, placement.y), me.hand.find((tile) => tile.id === placement.tileId)]));
  const exactValidation = myTurn && staged.length ? validateMove(room, playerId, staged) : { valid: false, reason: "Choose a tile, then a glowing space." };
  const preview = exactValidation.valid ? scoreMove(room, staged) : null;
  const lastMoveKeys = new Set(room.lastMove?.placements?.map(({ x, y }) => positionKey(x, y)) || []);

  function chooseTile(tileId) {
    if (!myTurn || busy || staged.some((placement) => placement.tileId === tileId)) return;
    if (exchangeMode) {
      setExchangeIds((current) => current.includes(tileId) ? current.filter((id) => id !== tileId) : [...current, tileId]);
      return;
    }
    setSelectedTileId((current) => current === tileId ? null : tileId);
  }

  function chooseSpace(x, y) {
    if (!selectedTile || !targetKeys.has(positionKey(x, y))) return;
    setStaged((current) => [...current, { tileId: selectedTile.id, x, y }]);
    setSelectedTileId(null);
  }

  function clearTurn() {
    setStaged([]);
    setSelectedTileId(null);
  }

  async function commitTurn() {
    if (!exactValidation.valid) return;
    const placements = staged;
    clearTurn();
    await act("play", { placements });
  }

  async function commitExchange() {
    if (!exchangeIds.length) return;
    const ids = exchangeIds;
    setExchangeIds([]);
    setExchangeMode(false);
    await act("exchange", { tileIds: ids });
  }

  return <main className="qwirkle-game-shell tbl-light qwirkle-theme">
    <GameHeader computerSpeed={computerSpeed}
      title="Qwirkle"
      room={room}
      subtitle={`Room ${room.roomCode}`}
      status={room.phase === "finished" ? "Game complete" : myTurn ? "Your turn" : computerWaiting ? `${activePlayer?.name} is thinking…` : `${activePlayer?.name}'s turn`}
      onRules={() => setShowRules(true)}
      onLeave={leaveRoom}
    />
    {error && <p className="qwirkle-error" role="alert">{error}</p>}
    <div className="qwirkle-layout">
      <aside className="qwirkle-sidebar">
        <div className="qwirkle-panel-heading"><p className="qwirkle-kicker">Scoreboard</p><h2>The table</h2></div>
        <div className="qwirkle-player-list">{room.players.map((player) => <div key={player.id} className={`qwirkle-player ${activePlayer?.id === player.id ? "active" : ""} ${room.winners.includes(player.id) ? "winner" : ""}`} style={{ "--player": player.color }}><span>{player.isComputer ? <Bot /> : player.name.slice(0, 1).toUpperCase()}</span><p><strong>{player.name}{player.id === playerId ? " (you)" : ""}</strong><small>{rackSize(player)} tiles</small></p><b>{player.score}<small>pts</small></b></div>)}</div>
        <div className="qwirkle-bag"><Tile back /><p><strong>{room.bagCount}</strong><small>tiles in bag</small></p></div>
        <section className="qwirkle-log"><h3>Latest plays</h3>{room.log.slice(0, 7).map((line, index) => <p key={`${line}-${index}`}>{line}</p>)}</section>
      </aside>
      <section className="qwirkle-board-panel">
        <div className="qwirkle-board-toolbar"><div><strong>Shared grid</strong><span>Scroll to explore the table</span></div>{room.lastMove?.qwirkles > 0 && <b><Sparkles /> Qwirkle!</b>}</div>
        <div className="qwirkle-board-scroll">
          <div className="qwirkle-board" style={{ gridTemplateColumns: `repeat(${bounds.maxX - bounds.minX + 1}, 58px)` }}>
            {gridPositions(bounds).map(({ x, y }) => {
              const key = positionKey(x, y);
              const tile = room.board[key] || stagedByPosition.get(key);
              const stagedTile = stagedByPosition.has(key);
              const target = targetKeys.has(key);
              return <button key={key} className={`qwirkle-cell ${tile ? "occupied" : ""} ${target ? "target" : ""} ${stagedTile ? "staged" : ""} ${lastMoveKeys.has(key) ? "last-move" : ""}`} disabled={!target} onClick={() => chooseSpace(x, y)} aria-label={tile ? `${QWIRKLE_COLOR_INFO[tile.color].name} ${QWIRKLE_SHAPE_INFO[tile.shape].name}${stagedTile ? ", staged" : ""}` : target ? `Place tile at ${x}, ${y}` : "Empty grid space"}>
                {tile ? <Tile tile={tile} /> : target ? <Plus /> : <i />}
              </button>;
            })}
          </div>
        </div>
        <div className={`qwirkle-move-status ${exactValidation.valid ? "ready" : ""}`}><div><strong>{exactValidation.valid ? `${preview.score} point${preview.score === 1 ? "" : "s"}${preview.qwirkles ? ` · ${preview.qwirkles === 1 ? "Qwirkle!" : `${preview.qwirkles} Qwirkles!`}` : ""}` : myTurn ? "Build your move" : "Watch the grid"}</strong><span>{myTurn ? exactValidation.valid ? "Your complete turn is legal and ready." : exactValidation.reason : `${activePlayer?.name} is choosing a play.`}</span></div>{staged.length > 0 && <button onClick={clearTurn}><Trash2 /> Clear</button>}<button className="qwirkle-primary" disabled={!exactValidation.valid || busy} onClick={commitTurn}><Check /> Play tiles</button></div>
      </section>
    </div>
    <section className="qwirkle-rack">
      <div className="qwirkle-rack-heading"><div><p className="qwirkle-kicker">Your rack</p><h2>{myTurn ? exchangeMode ? "Choose tiles to exchange" : "Shape your turn" : "Waiting for your turn"}</h2></div><div className="qwirkle-rack-actions">{exchangeMode ? <><button onClick={() => { setExchangeMode(false); setExchangeIds([]); }}>Cancel</button><button className="qwirkle-primary" disabled={!exchangeIds.length || exchangeIds.length > room.bagCount || busy} onClick={commitExchange}><RotateCcw /> Exchange {exchangeIds.length || ""}</button></> : <button disabled={!myTurn || busy || staged.length > 0 || room.bagCount === 0} onClick={() => { setExchangeMode(true); setSelectedTileId(null); }}><RotateCcw /> Exchange tiles</button>}</div></div>
      <div className="qwirkle-hand">{me.hand.map((tile) => { const placed = staged.some((placement) => placement.tileId === tile.id); const selected = selectedTileId === tile.id || exchangeIds.includes(tile.id); return <button key={tile.id} className={`${selected ? "selected" : ""} ${placed ? "placed" : ""}`} disabled={!myTurn || busy || placed} onClick={() => chooseTile(tile.id)} aria-label={`${QWIRKLE_COLOR_INFO[tile.color].name} ${QWIRKLE_SHAPE_INFO[tile.shape].name}`}><Tile tile={tile} /><small>{placed ? "On grid" : exchangeMode && exchangeIds.includes(tile.id) ? "Exchange" : QWIRKLE_SHAPE_INFO[tile.shape].name}</small></button>; })}</div>
      {myTurn && !exchangeMode && <p className="qwirkle-rack-tip">{!Object.keys(room.board).length ? `Opening play: place a matching set of exactly ${room.openingRequiredCount} tiles.` : selectedTile ? `${QWIRKLE_COLOR_INFO[selectedTile.color].name} ${QWIRKLE_SHAPE_INFO[selectedTile.shape].name} selected—choose a glowing grid space.` : staged.length ? "Add another matching tile or play the staged turn." : "Select a tile, then choose where it belongs on the grid."}</p>}
    </section>
    {showRules && <RulesModal onClose={() => setShowRules(false)} />}
    {room.phase === "finished" && <FinishedModal room={room} me={me} onLeave={leaveRoom} />}
  </main>;
}

const SHOWCASE = [
  { color: "red", shape: "circle" }, { color: "red", shape: "star" }, { color: "red", shape: "diamond" },
  { color: "blue", shape: "diamond" }, { color: "yellow", shape: "diamond" }, { color: "green", shape: "diamond" },
];

function RulesModal({ onClose }) {
  return <ChoiceModal wide title="How to play Qwirkle" text="Official classic rules." onClose={onClose}>
    <div className="tbl-rule-grid">
      <article><b>Match one trait</b><p>Build a line of one color with different shapes, or one shape with different colors. Exact duplicates cannot share a line.</p></article>
      <article><b>Play one line</b><p>Place one or more tiles in a single row or column. Every new line must connect to the existing grid, and no line can exceed six.</p></article>
      <article><b>Score every line</b><p>Count every tile in each line you create or extend. A crossing tile can score both its horizontal and vertical lines.</p></article>
      <article><b>Call Qwirkle</b><p>Complete a six-tile line to score its six points plus a six-point bonus. Empty your rack after the bag runs out for another six.</p></article>
    </div>
    <p className="tbl-rule-heading">Also</p>
    <div className="tbl-rule-grid">
      <article><b>Opening</b><p>The player with the largest same-color or same-shape set goes first and plays that set.</p></article>
      <article><b>Exchange</b><p>Instead of placing, exchange one or more tiles when the bag contains enough replacements. You score nothing that turn.</p></article>
      <article><b>Finish</b><p>The game ends immediately when the bag is empty and a player places their last tile. Highest score wins.</p></article>
    </div>
    <a className="tbl-link" href="https://www.mindware.orientaltrading.com/pdf/instructions/32016.pdf" target="_blank" rel="noreferrer">Read the publisher’s complete rules</a>
  </ChoiceModal>;
}

function FinishedModal({ room, me, onLeave }) {
  const won = room.winners.includes(me.id);
  const winners = room.players.filter((player) => room.winners.includes(player.id));
  const bestScore = Math.max(...winners.map((player) => player.score));
  return <Results
    title={won ? room.winners.length > 1 ? "You share the win!" : "You win!" : `${winners.map((player) => player.name).join(" and ")} ${winners.length === 1 ? "wins" : "win"}`}
    text={`The bag is empty. The winning score is ${bestScore} points.`}
    rows={[...room.players].sort((a, b) => b.score - a.score).map((player) => ({ id: player.id, name: `${player.name}${player.id === me.id ? " (you)" : ""}`, value: `${player.score}` }))}
  >
    <button type="button" className="tbl-primary" onClick={onLeave}>Back to Qwirkle</button>
  </Results>;
}

function Tile({ tile, back = false }) {
  if (back) return <span className="qwirkle-tile back"><QwirkleMark /></span>;
  return <span className="qwirkle-tile" style={{ "--tile-color": QWIRKLE_COLOR_INFO[tile.color]?.hex || "#fff" }}><Shape name={tile.shape} /></span>;
}

function Shape({ name }) {
  if (name === "circle") return <svg viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="50" r="31" /></svg>;
  if (name === "square") return <svg viewBox="0 0 100 100" aria-hidden="true"><rect x="22" y="22" width="56" height="56" rx="5" /></svg>;
  if (name === "diamond") return <svg viewBox="0 0 100 100" aria-hidden="true"><polygon points="50,14 86,50 50,86 14,50" /></svg>;
  if (name === "star") return <svg viewBox="0 0 100 100" aria-hidden="true"><polygon points="50,8 60,36 90,36 66,54 75,84 50,66 25,84 34,54 10,36 40,36" /></svg>;
  if (name === "cross") return <svg viewBox="0 0 100 100" aria-hidden="true"><path d="M36 12h28v24h24v28H64v24H36V64H12V36h24z" /></svg>;
  return <svg viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="29" r="22"/><circle cx="71" cy="50" r="22"/><circle cx="50" cy="71" r="22"/><circle cx="29" cy="50" r="22"/></svg>;
}

function QwirkleMark() {
  return <span className="qwirkle-mark" aria-hidden="true"><i /><i /><i /><i /><i /><i /></span>;
}

function displayedBounds(room, staged) {
  const base = boardBounds(room, 2);
  if (!staged.length) return base;
  return {
    minX: Math.min(base.minX, ...staged.map(({ x }) => x - 2)),
    maxX: Math.max(base.maxX, ...staged.map(({ x }) => x + 2)),
    minY: Math.min(base.minY, ...staged.map(({ y }) => y - 2)),
    maxY: Math.max(base.maxY, ...staged.map(({ y }) => y + 2)),
  };
}

function gridPositions(bounds) {
  const positions = [];
  for (let y = bounds.minY; y <= bounds.maxY; y += 1) for (let x = bounds.minX; x <= bounds.maxX; x += 1) positions.push({ x, y });
  return positions;
}
