"use client";

import { useEffect, useRef, useState } from "react";
import {
  ChevronRight,
  Copy,
  Crown,
  Play,
  Trophy,
  Bot,
  Users,
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
import { ChoiceModal, GameHeader, Hero, Landing, Lobby as SharedLobby, Results as SharedResults } from "./ui/table-shell";

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



  const rulesDialog = <RulesDialog open={rulesOpen} onClose={() => setRulesOpen(false)} />;

  if (!game) {
    return <Landing
      gameName="Scum"
      theme="tbl-light scum-theme"
      hero={<Hero
        kicker="A ruthless shedding game"
        title={<>Rise above.<br /><em>Leave no cards.</em></>}
        copy="Create a live room, invite the table, and empty your hand first. One seat wears the crown. One gets stuck with the title nobody wants."
        badges={[{ icon: Users, label: "3+ players" }, { icon: Bot, label: "Computer seats" }, { icon: Crown, label: "President to Scum" }]}
        artLayout="free"
        art={<div className="scum-intro-art"><span className="scum-sunburst" /><IntroCard rank="JK" suit="★" className="intro-card-four" /><IntroCard rank="A" suit="♥" className="intro-card-three" /><IntroCard rank="K" suit="♣" className="intro-card-two" /><IntroCard rank="2" suit="♣" className="intro-card-one" /></div>}
      />}
      entry={{ name: playerName, setName: setPlayerName, joinCode, setJoinCode, createRoom, joinRoom, busy, error }}
      onRules={() => setRulesOpen(true)}
      dialogs={rulesDialog}
    />;
  }

  if (game.phase === "lobby") {
    const me = game.players.find((player) => player.isViewer) ?? game.players[0];
    const maximumGroups = Math.floor(game.players.length / 2);
    return <SharedLobby
      gameName="Scum"
      theme="tbl-light scum-theme"
      room={{
        roomCode: game.roomCode,
        hostId: game.hostControls ? me.playerId : game.players[0].playerId,
        players: game.players.map((player) => ({ ...player, id: player.playerId })),
      }}
      me={{ id: me.playerId }}
      busy={false}
      error={error}
      min={3}
      max={Infinity}
      options={<div className="scum-lobby-options">
        <div>
          <strong>Class passing groups</strong>
          <span>Outer classes trade the most cards before later rounds.</span>
        </div>
        <select
          aria-label="Class passing groups"
          value={Math.min(game.passGroupCount, maximumGroups)}
          disabled={!game.hostControls}
          onChange={(event) => roomAction("setOptions", { passGroupCount: Number(event.target.value) })}
        >
          {Array.from({ length: maximumGroups + 1 }, (_, count) => (
            <option key={count} value={count}>{count}</option>
          ))}
        </select>
      </div>}
      seatNote={`${getScumDeckCount(Math.max(3, game.players.length))} ${getScumDeckCount(Math.max(3, game.players.length)) === 1 ? "deck" : "decks"} · no table limit`}
      onAdd={() => roomAction("addComputer")}
      onRemove={(id) => roomAction("removeComputer", { playerId: id })}
      onStart={() => roomAction("start")}
      onLeave={leaveRoom}
      onRules={() => setRulesOpen(true)}
      rules={rulesDialog}
    />;
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
    <main className="scum-app scum-game-shell tbl-light scum-theme">
      <GameHeader
        title="Scum"
        room={game}
        subtitle={`Round ${game.roundNumber || 1} · ${activePlayerCount} players · ${activeDeckCount} ${activeDeckCount === 1 ? "deck" : "decks"}`}
        status={humanTurn ? "Your turn" : `${game.players[game.currentPlayerIndex]?.name ?? "…"}'s turn`}
        onRules={() => setRulesOpen(true)}
        onLeave={leaveRoom}
      />

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

function RulesDialog({ open, onClose }) {
  if (!open) return null;
  return <ChoiceModal wide title="Lose your cards. Earn the crown." text="First out is President. Last holding cards is Scum." onClose={onClose}>
    <div className="tbl-rule-grid">
      <article><b>Know the order</b><p>Twos are lowest. Play climbs through Ace. A Joker by itself beats any natural card.</p></article>
      <article><b>Use Jokers wild</b><p>Mix Jokers into any matching group as substitutes—for example, 8 + Joker is a pair of 8s.</p></article>
      <article><b>Match the set</b><p>Beat a single with a higher single, a pair with a higher pair, and so on.</p></article>
      <article><b>Set the order</b><p>Left of the dealer starts round one. After that, every turn follows the previous finish order: President first and Scum last.</p></article>
      <article><b>Bring the table</b><p>Invite any number of players. The game adds one 54-card deck for every four players.</p></article>
      <article><b>Trade by class</b><p>Choose how many class pairs exchange before each later round. Lower classes must give their best cards; each inner pair trades one fewer.</p></article>
      <article><b>Pass or climb</b><p>Once you pass, you sit out until the pile clears. Four of a kind burns the pile.</p></article>
      <article><b>Continue or move on</b><p>After everyone else passes, the last player may keep climbing on the same pile or clear it and lead a new play.</p></article>
    </div>
  </ChoiceModal>;
}

function TradeDialog({ game, viewerPlayerIndex, selectedIds, onToggle, onComplete }) {
  const upperTrade = game.pendingTrades.find((trade) => trade.upperPlayerIndex === viewerPlayerIndex);
  const lowerTrade = game.pendingTrades.find((trade) => trade.lowerPlayerIndex === viewerPlayerIndex);
  const alreadySubmitted = Boolean(game.tradeSelections?.[viewerPlayerIndex]);
  const requiredCount = upperTrade?.count || 0;
  const viewer = game.players[viewerPlayerIndex];

  return (
    <ChoiceModal wide title="The classes exchange cards." text={`Before round ${game.roundNumber}. Lower-ranked players surrender their best cards. Upper-ranked players return the same number.`}>
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
        <button type="button" className="tbl-primary" disabled={selectedIds.length !== requiredCount} onClick={onComplete}>
          Submit trade <ChevronRight size={18} />
        </button>
      )}
    </ChoiceModal>
  );
}

function Results({ game, viewerPlayerIndex, onReplay }) {
  return (
    <SharedResults
      title={game.standings[0] === viewerPlayerIndex ? "You rule the table." : `${game.players[game.standings[0]].name} takes the crown.`}
      text="The table has spoken."
      rows={game.standings.map((playerIndex, index) => ({
        id: String(playerIndex),
        name: `${game.players[playerIndex].name}${playerIndex === viewerPlayerIndex ? " (you)" : ""}`,
        value: `${index + 1}`,
        note: scumPlaceName(index + 1, game.playerCount || game.players.length),
      }))}
    >
      {game.hostControls
        ? <button type="button" className="tbl-primary" onClick={onReplay}>Start next round <ChevronRight size={18} /></button>
        : <p className="tbl-wait">Waiting for the host to start the next round…</p>}
    </SharedResults>
  );
}

function IntroCard({ rank, suit, className }) {
  const red = suit === "♥" || suit === "♦";
  return <span className={`intro-card ${red ? "red" : ""} ${className}`}><b>{rank}</b><i>{suit}</i><em>{suit}</em></span>;
}

function roomTokenKey(roomCode) {
  return `scum-room-token:${String(roomCode || "").toUpperCase()}`;
}
