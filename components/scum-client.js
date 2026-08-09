"use client";

import { useEffect, useRef, useState } from "react";
import {
  BookOpen,
  ChevronRight,
  Copy,
  Crown,
  DoorOpen,
  Play,
  Plus,
  Sparkles,
  Trophy,
  UserPlus,
  X,
} from "lucide-react";
import {
  SCUM_SUIT_SYMBOLS,
  chooseScumCardSelection,
  getLegalScumPlays,
  getScumDeckCount,
  isLegalScumPlay,
  scumPlaceName,
  scumRankLabel,
} from "../lib/scum";
import { ScumRoomService } from "./scum-room-service";

const SET_NAMES = { 1: "single", 2: "pair", 3: "triple", 4: "four of a kind" };
const PLAYER_NAME_KEY = "scum-player-name";

function setName(count) {
  return SET_NAMES[count] || `set of ${count}`;
}

export default function ScumClient() {
  const [isReady, setIsReady] = useState(false);
  const [playerName, setPlayerName] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [roomToken, setRoomToken] = useState("");
  const [game, setGame] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);
  const [tradeSelectedIds, setTradeSelectedIds] = useState([]);
  const [rulesOpen, setRulesOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const latestGame = useRef(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("room")?.toUpperCase() || "";
    setPlayerName(localStorage.getItem(PLAYER_NAME_KEY) || "");
    setJoinCode(code);
    setRoomToken(code ? sessionStorage.getItem(roomTokenKey(code)) || "" : "");
    setIsReady(true);
  }, []);

  useEffect(() => {
    latestGame.current = game;
  }, [game]);

  useEffect(() => {
    if (!isReady || game || !joinCode || !roomToken) return;
    let cancelled = false;
    void ScumRoomService.load(joinCode, roomToken).then((state) => {
      if (cancelled) return;
      setGame(state);
      latestGame.current = state;
    }).catch(() => {
      sessionStorage.removeItem(roomTokenKey(joinCode));
      setRoomToken("");
    });
    return () => { cancelled = true; };
  }, [game, isReady, joinCode, roomToken]);

  useEffect(() => {
    if (!game?.roomCode || !roomToken) return undefined;
    return ScumRoomService.subscribe(game.roomCode, roomToken, (remote) => {
      setGame((current) => {
        const next = !current || remote.updatedAt >= current.updatedAt ? remote : current;
        latestGame.current = next;
        return next;
      });
    });
  }, [game?.roomCode, roomToken]);

  useEffect(() => {
    setSelectedIds([]);
  }, [game?.currentPlayerIndex, game?.pile?.rank]);

  useEffect(() => {
    setTradeSelectedIds([]);
  }, [game?.phase, game?.roundNumber]);

  function usePlayerName() {
    const cleanName = playerName.trim() || "Player";
    localStorage.setItem(PLAYER_NAME_KEY, cleanName);
    setPlayerName(cleanName);
    return cleanName;
  }

  function enterRoom(state, token) {
    sessionStorage.setItem(roomTokenKey(state.roomCode), token);
    setRoomToken(token);
    setJoinCode(state.roomCode);
    setGame(state);
    latestGame.current = state;
    window.history.replaceState(null, "", `/scum?room=${state.roomCode}`);
  }

  async function createRoom() {
    setBusy(true);
    setError("");
    try {
      const payload = await ScumRoomService.create(usePlayerName());
      enterRoom(payload.state, payload.token);
    } catch (roomError) {
      setError(roomError instanceof Error ? roomError.message : "Could not create the room.");
    } finally {
      setBusy(false);
    }
  }

  async function joinRoom() {
    const code = joinCode.trim().toUpperCase();
    if (!code) return setError("Enter a room code first.");
    setBusy(true);
    setError("");
    try {
      const payload = await ScumRoomService.join(code, usePlayerName());
      enterRoom(payload.state, payload.token);
    } catch (roomError) {
      setError(roomError instanceof Error ? roomError.message : "Could not join the room.");
    } finally {
      setBusy(false);
    }
  }

  async function roomAction(action, values = {}) {
    const current = latestGame.current;
    if (!current?.roomCode || !roomToken) return;
    setError("");
    try {
      const next = await ScumRoomService.action(current.roomCode, roomToken, action, values);
      setGame(next);
      latestGame.current = next;
    } catch (roomError) {
      setError(roomError instanceof Error ? roomError.message : "The room could not be updated.");
    }
  }

  function leaveRoom() {
    if (game?.roomCode) sessionStorage.removeItem(roomTokenKey(game.roomCode));
    setGame(null);
    latestGame.current = null;
    setRoomToken("");
    setJoinCode("");
    setSelectedIds([]);
    setTradeSelectedIds([]);
    setError("");
    window.history.replaceState(null, "", "/scum");
  }

  function copyInvite() {
    if (!game?.roomCode) return;
    void navigator.clipboard.writeText(`${window.location.origin}/scum?room=${game.roomCode}`);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  if (!isReady) {
    return <main className="scum-app scum-intro-shell"><div className="scum-room-loading">Setting the table…</div></main>;
  }

  if (!game) {
    return (
      <main className="scum-app scum-intro-shell">
        <section className="scum-intro">
          <div className="scum-intro-copy">
            <span className="scum-kicker"><Sparkles size={15} /> A ruthless shedding game</span>
            <h1>Rise above.<br /><em>Leave no cards.</em></h1>
            <p>
              Create a live room, invite the table, and empty your hand first. One seat wears
              the crown. One gets stuck with the title nobody wants.
            </p>
            <div className="scum-room-entry">
              <label>
                <span>Your name</span>
                <input
                  value={playerName}
                  onChange={(event) => setPlayerName(event.target.value)}
                  maxLength={18}
                  placeholder="Player"
                />
              </label>
              <button type="button" className="scum-primary" disabled={busy} onClick={createRoom}>
                <Plus size={18} /> Create room
              </button>
              <div className="scum-entry-divider"><span>or join a room</span></div>
              <div className="scum-join-row">
                <input
                  value={joinCode}
                  onChange={(event) => setJoinCode(event.target.value.toUpperCase())}
                  onKeyDown={(event) => event.key === "Enter" && joinRoom()}
                  maxLength={5}
                  placeholder="ROOM CODE"
                  aria-label="Room code"
                />
                <button type="button" disabled={busy} onClick={joinRoom}><UserPlus size={17} /> Join</button>
              </div>
              {error && <p className="scum-room-error" role="alert">{error}</p>}
              <small>3+ players · live shared turns · one deck per four players</small>
            </div>
            <button type="button" className="scum-text-button" onClick={() => setRulesOpen(true)}>
              <BookOpen size={16} /> Learn the rules
            </button>
          </div>

          <div className="scum-intro-art" aria-hidden="true">
            <span className="scum-sunburst" />
            <IntroCard rank="JK" suit="★" className="intro-card-four" />
            <IntroCard rank="A" suit="♥" className="intro-card-three" />
            <IntroCard rank="K" suit="♣" className="intro-card-two" />
            <IntroCard rank="2" suit="♣" className="intro-card-one" />
            <span className="crown-mark"><Crown size={42} /></span>
          </div>
        </section>
        <RulesDialog open={rulesOpen} onClose={() => setRulesOpen(false)} />
      </main>
    );
  }

  if (game.phase === "lobby") {
    return (
      <ScumLobby
        game={game}
        copied={copied}
        error={error}
        onCopy={copyInvite}
        onLeave={leaveRoom}
        onAction={roomAction}
        onRules={() => setRulesOpen(true)}
        rulesOpen={rulesOpen}
        onCloseRules={() => setRulesOpen(false)}
      />
    );
  }

  const viewerPlayerIndex = game.viewerPlayerIndex;
  const viewer = game.players[viewerPlayerIndex];
  const humanTurn = game.phase === "playing" && game.currentPlayerIndex === viewerPlayerIndex;
  const humanContinuation = humanTurn && game.continuationPlayerIndex === viewerPlayerIndex;
  const activePlayerCount = game.playerCount || game.players.length;
  const activeDeckCount = game.deckCount || getScumDeckCount(activePlayerCount);
  const legalPlays = humanTurn ? getLegalScumPlays(game, viewerPlayerIndex) : [];
  const legalCardIds = new Set(legalPlays.flat().map((card) => card.id));
  const canPlay = humanTurn && isLegalScumPlay(game, viewerPlayerIndex, selectedIds);

  function toggleCard(card) {
    if (!humanTurn) return;
    setSelectedIds((current) =>
      chooseScumCardSelection(viewer.hand, card.id, current, game.pile?.count ?? null)
    );
  }

  function playSelected() {
    void roomAction("play", { cardIds: selectedIds });
    setSelectedIds([]);
  }

  function toggleTradeCard(card, requiredCount) {
    setTradeSelectedIds((current) => {
      if (current.includes(card.id)) return current.filter((id) => id !== card.id);
      if (current.length >= requiredCount) return current;
      return [...current, card.id];
    });
  }

  return (
    <main className="scum-app scum-game-shell">
      <header className="scum-gamebar">
        <div className="scum-wordmark"><span>S</span><strong>SCUM</strong></div>
        <div className="scum-gamebar-center">
          <span>Room {game.roomCode}</span><i />
          <span>Round {game.roundNumber || 1}</span><i />
          <span>{activePlayerCount} players · {activeDeckCount} {activeDeckCount === 1 ? "deck" : "decks"}</span><i />
          <span>{game.passGroupCount ?? 1} passing {(game.passGroupCount ?? 1) === 1 ? "group" : "groups"}</span>
        </div>
        <div className="scum-gamebar-actions">
          <button type="button" onClick={copyInvite}><Copy size={16} /> {copied ? "Copied" : "Invite"}</button>
          <button type="button" onClick={() => setRulesOpen(true)}><BookOpen size={16} /> Rules</button>
          <button type="button" onClick={leaveRoom}><DoorOpen size={16} /> Leave</button>
        </div>
      </header>

      <section className="scum-board" aria-label="Scum card table">
        <div className="scum-opponents">
          {game.players.map((player, playerIndex) => playerIndex === viewerPlayerIndex ? null : (
            <Opponent
              key={player.playerId || player.id}
              player={player}
              playerCount={activePlayerCount}
              active={game.currentPlayerIndex === playerIndex}
            />
          ))}
        </div>

        <div className="scum-table-center">
          <div className="scum-turn-message" role="status">
            <span className={humanTurn ? "is-live" : ""} />
            <strong>{game.message}</strong>
          </div>
          <div className={`scum-pile ${game.pile ? "has-cards" : ""}`}>
            {game.pile ? (
              <>
                <span className="pile-rule">
                  {humanContinuation ? "Continuation · " : ""}Locked: {setName(game.pile.count)} · Beat {scumRankLabel(game.pile.rank)}
                </span>
                <div className="pile-cards">
                  {game.pile.cards.map((card, index) => (
                    <PlayingCard
                      key={card.id}
                      card={card}
                      className="pile-card"
                      style={{ "--pile-offset": index - (game.pile.cards.length - 1) / 2 }}
                    />
                  ))}
                </div>
                <small>{game.players[game.pile.playerIndex].name}</small>
              </>
            ) : (
              <div className="empty-pile">
                <span>♣</span>
                <strong>Open table</strong>
                <small>Play any matching set</small>
              </div>
            )}
          </div>
          <div className="scum-table-order" aria-label="Card rank order">
            <span>Low</span>
            {[2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15].map((rank) => (
              <b key={rank} className={game.pile?.rank === rank ? "current" : ""}>{rank === 15 ? "JK" : scumRankLabel(rank)}</b>
            ))}
            <span>High</span>
          </div>
        </div>

        <section className={`scum-your-seat ${humanTurn ? "active" : ""}`}>
          <div className="your-seat-meta">
            <span className="your-avatar">{viewer.name.slice(0, 1).toUpperCase()}</span>
            <div><strong>{viewer.name}</strong><small>{viewer.handCount} cards</small></div>
            <span className="your-turn-chip">
              {viewer.place
                ? scumPlaceName(viewer.place, activePlayerCount)
                : humanContinuation ? "Continuation" : humanTurn ? "Your turn" : viewer.title || "Waiting"}
            </span>
          </div>

          <div className="scum-hand" aria-label="Your hand">
            {viewer.hand.map((card, index) => {
              const selected = selectedIds.includes(card.id);
              const playable = legalCardIds.has(card.id);
              return (
                <button
                  key={card.id}
                  type="button"
                  className={`hand-card-button ${selected ? "selected" : ""} ${humanTurn && !playable ? "dimmed" : ""}`}
                  style={{ "--card-index": index }}
                  disabled={!humanTurn || !playable}
                  aria-pressed={selected}
                  aria-label={`${card.rank === 15 ? card.suit.replace("-", " ") : `${scumRankLabel(card.rank)} of ${card.suit}`}${selected ? ", selected" : ""}`}
                  onClick={() => toggleCard(card)}
                >
                  <PlayingCard card={card} />
                </button>
              );
            })}
            {!viewer.handCount && <div className="hand-empty"><Trophy size={24} /> Hand cleared</div>}
          </div>

          <div className="scum-controls">
            <span>
              {selectedIds.length
                ? `${setName(selectedIds.length)} selected`
                : humanContinuation
                  ? `Continue this ${setName(game.pile.count)} or move on`
                  : humanTurn && game.pile
                    ? `Tap a rank to select the required ${setName(game.pile.count)}`
                    : humanTurn
                      ? "Choose any matching set"
                      : "Waiting for the table…"}
            </span>
            {humanContinuation ? (
              <button type="button" className="scum-pass scum-move-on" onClick={() => roomAction("moveOn")}>Move on</button>
            ) : (
              <button
                type="button"
                className="scum-pass"
                disabled={!humanTurn || !game.pile}
                onClick={() => roomAction("pass")}
              >Pass</button>
            )}
            <button type="button" className="scum-play" disabled={!canPlay} onClick={playSelected}>
              Play cards <ChevronRight size={17} />
            </button>
          </div>
          {error && <p className="scum-game-error" role="alert">{error}</p>}
        </section>
      </section>

      {game.phase === "finished" && (
        <Results
          game={game}
          viewerPlayerIndex={viewerPlayerIndex}
          onReplay={() => roomAction("nextRound")}
        />
      )}
      {game.phase === "trading" && (
        <TradeDialog
          game={game}
          viewerPlayerIndex={viewerPlayerIndex}
          selectedIds={tradeSelectedIds}
          onToggle={toggleTradeCard}
          onComplete={() => {
            void roomAction("submitTrade", { cardIds: tradeSelectedIds });
            setTradeSelectedIds([]);
          }}
        />
      )}
      <RulesDialog open={rulesOpen} onClose={() => setRulesOpen(false)} />
    </main>
  );
}

function ScumLobby({ game, copied, error, onCopy, onLeave, onAction, onRules, rulesOpen, onCloseRules }) {
  const maximumGroups = Math.floor(game.players.length / 2);
  return (
    <main className="scum-app scum-intro-shell scum-lobby-shell">
      <section className="scum-lobby-card">
        <span className="scum-kicker"><Sparkles size={15} /> Gather the table</span>
        <h1>SCUM</h1>
        <p>Share the invite, add computer seats if you need them, and start when at least three players are ready.</p>

        <div className="scum-room-code">
          <span>Room code</span>
          <strong>{game.roomCode}</strong>
          <button type="button" onClick={onCopy}><Copy size={16} /> {copied ? "Copied" : "Copy invite"}</button>
        </div>

        <div className="scum-lobby-players">
          {game.players.map((player, index) => (
            <div key={player.playerId}>
              <span>{player.name.slice(0, 1).toUpperCase()}</span>
              <strong>{player.name}</strong>
              {player.isComputer && game.hostControls ? (
                <button type="button" onClick={() => onAction("removeComputer", { playerId: player.playerId })}><X size={14} /> Remove</button>
              ) : (
                <small>{index === 0 ? "Host" : player.isViewer ? "You" : player.isComputer ? "Computer" : "Ready"}</small>
              )}
            </div>
          ))}
        </div>

        {game.hostControls && (
          <button type="button" className="scum-add-computer" onClick={() => onAction("addComputer")}>
            <UserPlus size={17} /> Add computer
          </button>
        )}

        <div className="scum-lobby-options">
          <div>
            <strong>Class passing groups</strong>
            <span>Outer classes trade the most cards before later rounds.</span>
          </div>
          <select
            value={Math.min(game.passGroupCount, maximumGroups)}
            disabled={!game.hostControls}
            onChange={(event) => onAction("setOptions", { passGroupCount: Number(event.target.value) })}
          >
            {Array.from({ length: maximumGroups + 1 }, (_, count) => (
              <option key={count} value={count}>{count}</option>
            ))}
          </select>
        </div>

        <div className="scum-lobby-summary">
          <span>{game.players.length} players</span>
          <span>{getScumDeckCount(Math.max(3, game.players.length))} {getScumDeckCount(Math.max(3, game.players.length)) === 1 ? "deck" : "decks"}</span>
          <span>No table limit</span>
        </div>

        {game.hostControls ? (
          <button
            type="button"
            className="scum-primary scum-lobby-start"
            disabled={game.players.length < 3}
            onClick={() => onAction("start")}
          ><Play size={18} /> Start game</button>
        ) : (
          <p className="scum-lobby-waiting">Waiting for the host to start the game…</p>
        )}
        {game.hostControls && game.players.length < 3 && <p className="scum-lobby-waiting">At least three players are needed.</p>}
        {error && <p className="scum-room-error" role="alert">{error}</p>}
        <div className="scum-lobby-footer">
          <button type="button" onClick={onRules}><BookOpen size={16} /> Rules</button>
          <button type="button" onClick={onLeave}><DoorOpen size={16} /> Leave room</button>
        </div>
      </section>
      <RulesDialog open={rulesOpen} onClose={onCloseRules} />
    </main>
  );
}

function PlayingCard({ card, className = "", style }) {
  const joker = card.rank === 15;
  const red = card.suit === "hearts" || card.suit === "diamonds" || card.suit === "joker-red";
  const cardRank = joker ? "JK" : scumRankLabel(card.rank);
  return (
    <span style={style} className={`playing-card ${red ? "red" : "black"} ${joker ? "joker" : ""} ${className}`}>
      <span className="card-corner"><b>{cardRank}</b><i>{SCUM_SUIT_SYMBOLS[card.suit]}</i></span>
      <span className="card-center-suit">{SCUM_SUIT_SYMBOLS[card.suit]}</span>
      <span className="card-corner card-corner-bottom"><b>{cardRank}</b><i>{SCUM_SUIT_SYMBOLS[card.suit]}</i></span>
    </span>
  );
}

function Opponent({ player, playerCount, active }) {
  return (
    <div className={`scum-opponent ${active ? "active" : ""} ${player.place ? "finished" : ""}`}>
      <div className="opponent-avatar">{player.name.slice(0, 1)}</div>
      <div className="opponent-copy">
        <strong>{player.name}</strong>
        <small>
          {player.place
            ? scumPlaceName(player.place, playerCount)
            : player.title ? `${player.title} · ${player.handCount} cards` : `${player.handCount} cards`}
        </small>
      </div>
      <div className="opponent-cards" aria-hidden="true">
        {Array.from({ length: Math.min(5, player.handCount) }, (_, index) => <span key={index} style={{ "--i": index }} />)}
      </div>
      {active && <span className="thinking-dots"><i /><i /><i /></span>}
    </div>
  );
}

function IntroCard({ rank, suit, className }) {
  const red = suit === "♥" || suit === "♦";
  return <span className={`intro-card ${red ? "red" : ""} ${className}`}><b>{rank}</b><i>{suit}</i><em>{suit}</em></span>;
}

function TradeDialog({ game, viewerPlayerIndex, selectedIds, onToggle, onComplete }) {
  const upperTrade = game.pendingTrades.find((trade) => trade.upperPlayerIndex === viewerPlayerIndex);
  const lowerTrade = game.pendingTrades.find((trade) => trade.lowerPlayerIndex === viewerPlayerIndex);
  const alreadySubmitted = Boolean(game.tradeSelections?.[viewerPlayerIndex]);
  const requiredCount = upperTrade?.count || 0;
  const viewer = game.players[viewerPlayerIndex];

  return (
    <div className="scum-modal-backdrop">
      <section className="trade-card" role="dialog" aria-modal="true" aria-labelledby="trade-title">
        <span className="scum-kicker">Before round {game.roundNumber}</span>
        <h2 id="trade-title">The classes exchange cards.</h2>
        <p className="trade-intro">Lower-ranked players surrender their best cards. Upper-ranked players return the same number.</p>

        <div className="trade-groups">
          {game.pendingTrades.map((trade) => (
            <div key={trade.upperPlayerIndex} className={trade.upperPlayerIndex === viewerPlayerIndex || trade.lowerPlayerIndex === viewerPlayerIndex ? "is-you" : ""}>
              <span>{trade.count}</span>
              <strong>{game.players[trade.upperPlayerIndex].name}</strong>
              <small>{scumPlaceName(trade.upperPlace, game.playerCount)}</small>
              <i>⇄</i>
              <strong>{game.players[trade.lowerPlayerIndex].name}</strong>
              <small>{scumPlaceName(trade.lowerPlace, game.playerCount)}</small>
            </div>
          ))}
        </div>

        {upperTrade && !alreadySubmitted && (
          <div className="trade-choice">
            <div><strong>Choose {requiredCount} to give away</strong><small>{selectedIds.length} of {requiredCount} selected</small></div>
            <div className="trade-hand" aria-label="Choose cards to trade">
              {viewer.hand.map((card) => {
                const selected = selectedIds.includes(card.id);
                return (
                  <button
                    key={card.id}
                    type="button"
                    className={selected ? "selected" : ""}
                    aria-pressed={selected}
                    aria-label={`${card.rank === 15 ? card.suit.replace("-", " ") : `${scumRankLabel(card.rank)} of ${card.suit}`}${selected ? ", selected" : ""}`}
                    onClick={() => onToggle(card, requiredCount)}
                  ><PlayingCard card={card} /></button>
                );
              })}
            </div>
          </div>
        )}

        {lowerTrade && <p className="trade-notice">Your {lowerTrade.count} best {lowerTrade.count === 1 ? "card passes" : "cards pass"} automatically.</p>}
        {alreadySubmitted && <p className="trade-notice">Your cards are selected. Waiting for the other upper classes…</p>}
        {!upperTrade && !lowerTrade && <p className="trade-notice">Your class is not part of this round&apos;s exchange. Waiting for the trades to finish…</p>}

        {upperTrade && !alreadySubmitted && (
          <button type="button" className="scum-primary" disabled={selectedIds.length !== requiredCount} onClick={onComplete}>
            Submit trade <ChevronRight size={18} />
          </button>
        )}
      </section>
    </div>
  );
}

function Results({ game, viewerPlayerIndex, onReplay }) {
  return (
    <div className="scum-modal-backdrop">
      <section className="results-card" role="dialog" aria-modal="true" aria-labelledby="results-title">
        <span className="results-crown"><Crown size={38} /></span>
        <span className="results-kicker">The table has spoken</span>
        <h2 id="results-title">{game.standings[0] === viewerPlayerIndex ? "You rule the table." : `${game.players[game.standings[0]].name} takes the crown.`}</h2>
        <div className="results-list">
          {game.standings.map((playerIndex, index) => (
            <div key={playerIndex} className={playerIndex === viewerPlayerIndex ? "you" : ""}>
              <span>{index + 1}</span>
              <strong>{game.players[playerIndex].name}</strong>
              <small>{scumPlaceName(index + 1, game.playerCount || game.players.length)}</small>
            </div>
          ))}
        </div>
        {game.hostControls
          ? <button type="button" className="scum-primary" onClick={onReplay}>Start next round <ChevronRight size={18} /></button>
          : <p className="scum-lobby-waiting">Waiting for the host to start the next round…</p>}
      </section>
    </div>
  );
}

function RulesDialog({ open, onClose }) {
  if (!open) return null;
  return (
    <div className="scum-modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="rules-card" role="dialog" aria-modal="true" aria-labelledby="rules-title">
        <button type="button" className="dialog-close" onClick={onClose} aria-label="Close rules"><X size={20} /></button>
        <span className="scum-kicker">How to play</span>
        <h2 id="rules-title">Lose your cards.<br />Earn the crown.</h2>
        <ol>
          <li><b>Know the order.</b><span>Twos are lowest. Play climbs through Ace. A Joker by itself beats any natural card.</span></li>
          <li><b>Use Jokers wild.</b><span>Mix Jokers into any matching group as substitutes—for example, 8 + Joker is a pair of 8s.</span></li>
          <li><b>Match the set.</b><span>Beat a single with a higher single, a pair with a higher pair, and so on.</span></li>
          <li><b>Set the order.</b><span>Left of the dealer starts round one. After that, every turn follows the previous finish order: President first and Scum last.</span></li>
          <li><b>Bring the table.</b><span>Invite any number of players. The game adds one 54-card deck for every four players.</span></li>
          <li><b>Trade by class.</b><span>Choose how many class pairs exchange before each later round. Lower classes must give their best cards; each inner pair trades one fewer.</span></li>
          <li><b>Pass or climb.</b><span>Once you pass, you sit out until the pile clears. Four of a kind burns the pile.</span></li>
          <li><b>Continue or move on.</b><span>After everyone else passes, the last player may keep climbing on the same pile or clear it and lead a new play.</span></li>
        </ol>
        <p>First out is President. Last holding cards is Scum.</p>
        <button type="button" className="scum-primary" onClick={onClose}>Got it</button>
      </section>
    </div>
  );
}

function roomTokenKey(roomCode) {
  return `scum-room-token:${String(roomCode || "").toUpperCase()}`;
}
