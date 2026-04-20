"use client";

import { useEffect, useRef, useState } from "react";
import {
  SUITS,
  buildSequence,
  capitalize,
  chooseComputerMove,
  compareCards,
  formatCard,
  makeEmptyTableau,
  sameCard,
} from "../lib/game";

const SUIT_SYMBOLS = {
  clubs: "♣",
  diamonds: "♦",
  hearts: "♥",
  spades: "♠",
};

const SUIT_CODES = {
  spades: "S",
  hearts: "H",
  diamonds: "D",
  clubs: "C",
};

const initialRoom = {
  roomCode: "",
  token: "",
  seatId: "",
  state: null,
  joinPreview: null,
};

export default function SevenUpClient() {
  const [mode, setMode] = useState("local");
  const [playerCount, setPlayerCount] = useState(4);
  const [dealerIndex, setDealerIndex] = useState(0);
  const [playerConfigs, setPlayerConfigs] = useState(() => buildPlayerConfigs(4));
  const [localGame, setLocalGame] = useState(null);
  const [overlayState, setOverlayState] = useState({ visible: false, playerName: "", message: "" });
  const [room, setRoom] = useState(initialRoom);
  const [createName, setCreateName] = useState("");
  const [joinRoomCode, setJoinRoomCode] = useState("");
  const [joinName, setJoinName] = useState("");
  const [error, setError] = useState("");

  const aiTimerRef = useRef(null);
  const pollTimerRef = useRef(null);

  useEffect(() => {
    hydrateFromUrl();
    return () => {
      if (aiTimerRef.current) {
        clearTimeout(aiTimerRef.current);
      }
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!localGame || overlayState.visible || localGame.winnerIndex !== null) {
      return;
    }
    const currentPlayer = localGame.players[localGame.currentPlayerIndex];
    if (currentPlayer.playerType !== "computer") {
      return;
    }
    aiTimerRef.current = window.setTimeout(() => {
      setLocalGame((previous) => runComputerTurn(previous));
    }, 700);
    return () => {
      if (aiTimerRef.current) {
        clearTimeout(aiTimerRef.current);
      }
    };
  }, [localGame, overlayState.visible]);

  useEffect(() => {
    if (!room.roomCode || !room.token) {
      stopPolling();
      return;
    }
    pollRoomState(room.roomCode, room.token);
    stopPolling();
    pollTimerRef.current = window.setInterval(() => {
      pollRoomState(room.roomCode, room.token);
    }, room.state?.status === "waiting" ? 1000 : 1500);

    function handleRoomVisibility() {
      if (document.visibilityState === "visible") {
        pollRoomState(room.roomCode, room.token);
      }
    }

    function handleRoomFocus() {
      pollRoomState(room.roomCode, room.token);
    }

    window.addEventListener("focus", handleRoomFocus);
    document.addEventListener("visibilitychange", handleRoomVisibility);

    return () => {
      stopPolling();
      window.removeEventListener("focus", handleRoomFocus);
      document.removeEventListener("visibilitychange", handleRoomVisibility);
    };
  }, [room.roomCode, room.token, room.state?.status]);

  const renderContext = getRenderContext({
    mode,
    localGame,
    overlayState,
    roomState: room.state,
  });

  const handContext = getHandContext({ mode, localGame, overlayState, roomState: room.state });

  function hydrateFromUrl() {
    const params = new URLSearchParams(window.location.search);
    const roomCode = params.get("room");
    const token = params.get("token");
    if (roomCode && token) {
      persistRoomToken(roomCode, token);
      setMode("room");
      setRoom((previous) => ({
        ...previous,
        roomCode: roomCode.toUpperCase(),
        token,
      }));
      updateUrl(roomCode, "");
      return;
    }
    if (roomCode) {
      const storedToken = readRoomToken(roomCode);
      setMode("room");
      setRoom((previous) => ({
        ...previous,
        roomCode: roomCode.toUpperCase(),
        token: storedToken,
      }));
    }
  }

  function stopPolling() {
    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }
  }

  function handlePlayerCountChange(event) {
    const nextCount = Number(event.target.value);
    setPlayerCount(nextCount);
    setDealerIndex((previous) => Math.min(previous, nextCount - 1));
    setPlayerConfigs((previous) => resizePlayerConfigs(previous, nextCount));
  }

  function handlePlayerConfigChange(index, patch) {
    setPlayerConfigs((previous) =>
      previous.map((player, playerIndex) =>
        playerIndex === index ? { ...player, ...patch } : player
      )
    );
  }

  function clearError() {
    setError("");
  }

  function handleSubmit(event) {
    event.preventDefault();
    clearError();
    if (mode === "local") {
      startLocalGame();
      return;
    }
    createRoom();
  }

  function startLocalGame() {
    const game = createLocalGame(playerConfigs, dealerIndex);
    game.log.unshift(`${game.players[game.currentPlayerIndex].name} goes first because play starts to the dealer's left.`);
    setOverlayState({ visible: false, playerName: "", message: "" });
    setLocalGame(game);
    showOverlayIfNeeded(game, `${game.players[game.currentPlayerIndex].name} goes first.`);
  }

  async function createRoom() {
    setMode("room");
    const humanSeats = playerConfigs.filter((player) => player.playerType === "human").length;
    if (humanSeats === 0) {
      setError("A room needs at least one human seat so someone can join and play.");
      return;
    }
    try {
      const payload = await postJson("/api/create-room", {
        dealerIndex,
        players: playerConfigs,
        name: createName,
      });
      const nextRoom = {
        roomCode: payload.roomCode,
        token: payload.playerToken,
        seatId: payload.viewerSeatId || "",
        state: payload.roomState || null,
        joinPreview: null,
      };
      persistRoomToken(nextRoom.roomCode, nextRoom.token);
      setRoom(nextRoom);
      updateUrl(nextRoom.roomCode, "");
    } catch (nextError) {
      setError(nextError.message);
    }
  }

  async function loadRoom(event) {
    event.preventDefault();
    clearError();
    if (!joinRoomCode.trim()) {
      setError("Enter a room code to load that room.");
      return;
    }
    try {
      const payload = await fetchJson(`/api/room?code=${encodeURIComponent(joinRoomCode.trim().toUpperCase())}`);
      setRoom((previous) => ({
        ...previous,
        roomCode: joinRoomCode.trim().toUpperCase(),
        joinPreview: payload,
      }));
    } catch (nextError) {
      setError(nextError.message);
    }
  }

  async function joinSeat(seatId) {
    clearError();
    try {
      const payload = await postJson("/api/join-room", {
        roomCode: room.roomCode,
        seatId,
        name: joinName,
      });
      const nextRoom = {
        ...room,
        token: payload.playerToken,
        seatId: payload.viewerSeatId,
        state: payload.roomState || room.state,
        joinPreview: null,
      };
      persistRoomToken(nextRoom.roomCode, nextRoom.token);
      setRoom(nextRoom);
      updateUrl(nextRoom.roomCode, "");
    } catch (nextError) {
      setError(nextError.message);
    }
  }

  async function startRoom() {
    clearError();
    try {
      const payload = await postJson("/api/start-room", {
        roomCode: room.roomCode,
        token: room.token,
      });
      setRoom((previous) => ({ ...previous, state: payload }));
      window.setTimeout(() => {
        pollRoomState(room.roomCode, room.token);
      }, 300);
    } catch (nextError) {
      setError(nextError.message);
    }
  }

  async function pollRoomState(roomCode, token) {
    try {
      const payload = await fetchJson(
        `/api/room?code=${encodeURIComponent(roomCode)}&token=${encodeURIComponent(token)}`
      );
      setRoom((previous) => {
        if (
          previous.state &&
          previous.state.status === payload.status &&
          JSON.stringify(previous.state.game) === JSON.stringify(payload.game)
        ) {
          return previous;
        }
        return { ...previous, state: payload };
      });
    } catch (nextError) {
      setError(nextError.message);
    }
  }

  function playLocalCard(card) {
    clearError();
    setLocalGame((previous) => {
      if (!previous || overlayState.visible || previous.winnerIndex !== null) {
        return previous;
      }
      const currentPlayer = previous.players[previous.currentPlayerIndex];
      if (currentPlayer.playerType !== "human") {
        return previous;
      }
      const legalMoves = currentPlayer.hand.filter((candidate) => isLegalPlay(previous.tableau, candidate));
      if (!legalMoves.some((candidate) => sameCard(candidate, card))) {
        return previous;
      }

      const nextGame = structuredClone(previous);
      const nextPlayer = nextGame.players[nextGame.currentPlayerIndex];
      nextPlayer.hand = nextPlayer.hand.filter((candidate) => !sameCard(candidate, card));
      nextPlayer.passedLastTurn = false;
      applyCardToTableau(nextGame.tableau, card);
      nextGame.log.unshift(`${nextPlayer.name} played ${formatCard(card)}.`);
      if (nextPlayer.hand.length === 0) {
        nextGame.winnerIndex = nextGame.currentPlayerIndex;
        return nextGame;
      }
      advanceTurn(nextGame);
      showOverlayIfNeeded(nextGame, `${nextPlayer.name} completed their turn.`);
      return nextGame;
    });
  }

  async function playRoomCard(card) {
    clearError();
    try {
      const payload = await postJson("/api/play-card", {
        roomCode: room.roomCode,
        token: room.token,
        card,
      });
      setRoom((previous) => ({ ...previous, state: payload }));
    } catch (nextError) {
      setError(nextError.message);
    }
  }

  function playCard(card) {
    if (mode === "local") {
      playLocalCard(card);
      return;
    }
    playRoomCard(card);
  }

  function handleLocalPass() {
    clearError();
    setLocalGame((previous) => {
      if (!previous || overlayState.visible || previous.winnerIndex !== null) {
        return previous;
      }
      const currentPlayer = previous.players[previous.currentPlayerIndex];
      const legalMoves = currentPlayer.hand.filter((card) => isLegalPlay(previous.tableau, card));
      if (currentPlayer.playerType !== "human" || legalMoves.length > 0) {
        return previous;
      }
      const nextGame = structuredClone(previous);
      nextGame.players[nextGame.currentPlayerIndex].passedLastTurn = true;
      nextGame.log.unshift(`${currentPlayer.name} passes.`);
      advanceTurn(nextGame);
      showOverlayIfNeeded(nextGame, "No legal move was available.");
      return nextGame;
    });
  }

  async function handleRoomPass() {
    clearError();
    try {
      const payload = await postJson("/api/pass-turn", {
        roomCode: room.roomCode,
        token: room.token,
      });
      setRoom((previous) => ({ ...previous, state: payload }));
    } catch (nextError) {
      setError(nextError.message);
    }
  }

  function handlePass() {
    if (mode === "local") {
      handleLocalPass();
      return;
    }
    handleRoomPass();
  }

  function leaveRoom() {
    stopPolling();
    clearRoomToken(room.roomCode);
    setRoom(initialRoom);
    updateUrl("", "");
  }

  function resetAll() {
    clearError();
    stopPolling();
    clearRoomToken(room.roomCode);
    setLocalGame(null);
    setOverlayState({ visible: false, playerName: "", message: "" });
    setRoom(initialRoom);
    updateUrl("", "");
  }

  function showOverlayIfNeeded(game, message) {
    const currentPlayer = game.players[game.currentPlayerIndex];
    const humanCount = game.players.filter((player) => player.playerType === "human").length;
    if (game.winnerIndex !== null || currentPlayer.playerType !== "human" || humanCount < 2) {
      return;
    }
    setOverlayState({
      visible: true,
      playerName: currentPlayer.name,
      message,
    });
  }

  function hideOverlay() {
    setOverlayState({ visible: false, playerName: "", message: "" });
  }

  const roomPreview = room.state || room.joinPreview;
  const roomPlayers = room.state?.players || [];
  const humanPlayers = roomPlayers.filter((player) => player.playerType === "human");
  const openHumanSeats = humanPlayers.filter((player) => !player.claimed);
  const roomReadyToDeal = Boolean(room.state && room.state.status === "waiting" && openHumanSeats.length === 0);
  const hideSetupPanel =
    (mode === "local" && Boolean(localGame)) ||
    (mode === "room" && Boolean(room.roomCode));
  const roomUrl =
    room.roomCode && typeof window !== "undefined"
      ? `${window.location.origin}?room=${room.roomCode}`
      : "-";

  return (
    <>
      <div className="page-shell">
        <header className="hero">
          <div>
            <p className="eyebrow">Card Game</p>
            <h1>7-up</h1>
            <p className="subtitle">
              Play locally, mix in computer players, or create a shared room and deal into the same game from anywhere.
            </p>
          </div>
          <button className="secondary-button" onClick={resetAll} type="button">
            New game
          </button>
        </header>

        <main className="layout">
          {!hideSetupPanel ? (
            <section className="panel control-panel">
              <h2>Setup</h2>
              <form className="setup-form" onSubmit={handleSubmit}>
                <label htmlFor="mode-select">Play mode</label>
                <select id="mode-select" value={mode} onChange={(event) => setMode(event.target.value)}>
                  <option value="local">Local game</option>
                  <option value="room">Room game</option>
                </select>

                <label htmlFor="player-count">Players</label>
                <select id="player-count" value={playerCount} onChange={handlePlayerCountChange}>
                  {Array.from({ length: 5 }, (_, index) => index + 3).map((count) => (
                    <option key={count} value={count}>
                      {count}
                    </option>
                  ))}
                </select>

                <label htmlFor="dealer-index">Dealer</label>
                <select
                  id="dealer-index"
                  value={dealerIndex}
                  onChange={(event) => setDealerIndex(Number(event.target.value))}
                >
                  {playerConfigs.map((player, index) => (
                    <option key={player.name + index} value={index}>
                      {player.name || `Player ${index + 1}`}
                    </option>
                  ))}
                </select>

                <div className="name-fields">
                  {playerConfigs.map((player, index) => (
                    <div key={index} className="player-row">
                      <div>
                        <label htmlFor={`player-name-${index}`}>Player {index + 1} name</label>
                        <input
                          id={`player-name-${index}`}
                          value={player.name}
                          maxLength={20}
                          onChange={(event) =>
                            handlePlayerConfigChange(index, { name: event.target.value })
                          }
                        />
                      </div>
                      <div>
                        <label htmlFor={`player-type-${index}`}>Type</label>
                        <select
                          id={`player-type-${index}`}
                          value={player.playerType}
                          onChange={(event) =>
                            handlePlayerConfigChange(index, { playerType: event.target.value })
                          }
                        >
                          <option value="human">Human</option>
                          <option value="computer">Computer</option>
                        </select>
                      </div>
                    </div>
                  ))}
                </div>

                {mode === "room" ? (
                  <div className="room-mode-note">
                    Room mode uses Vercel API routes for game actions. For production multiplayer, add Redis in Vercel so room state persists across serverless requests.
                  </div>
                ) : null}

                <button className="primary-button" type="submit">
                  {mode === "room" ? "Create room" : "Deal cards"}
                </button>
              </form>

              <div className="rules-note">
                <strong>Rule note:</strong> if you have a legal card, you must play it.
              </div>
            </section>
          ) : null}

          <section className="panel room-panel">
            <h2>Room Play</h2>
            {!room.roomCode ? (
              <div className="room-create-panel">
                <p className="preview-title">Start a new room</p>
                <p className="hand-help">
                  Use the player setup on the left, then create a room to get a share link for everyone else.
                </p>
                <label htmlFor="create-name">Your name</label>
                <input
                  id="create-name"
                  maxLength={20}
                  placeholder="Your name"
                  value={createName}
                  onChange={(event) => setCreateName(event.target.value)}
                />
                <button className="primary-button" type="button" onClick={createRoom}>
                  Create room
                </button>
              </div>
            ) : null}

            {!room.token ? (
              <form className="setup-form" onSubmit={loadRoom}>
                <label htmlFor="join-room-code">Room code</label>
                <input
                  id="join-room-code"
                  maxLength={6}
                  placeholder="ABC123"
                  value={joinRoomCode}
                  onChange={(event) => setJoinRoomCode(event.target.value.toUpperCase())}
                />

                <label htmlFor="join-name">Your name</label>
                <input
                  id="join-name"
                  maxLength={20}
                  placeholder="Your name"
                  value={joinName}
                  onChange={(event) => setJoinName(event.target.value)}
                />

                <button className="secondary-button" type="submit">
                  Load room
                </button>
              </form>
            ) : null}

            {roomPreview && !room.token ? (
              <div className="room-join-preview">
                <p className="preview-title">Open seats in room {roomPreview.roomCode}</p>
                {roomPreview.players
                  .filter((player) => player.playerType === "human")
                  .map((player) => (
                    <div className="join-seat-row" key={player.seatId}>
                      <span>
                        {player.label} {player.claimed ? "(taken)" : ""}
                      </span>
                      <button
                        className="secondary-button"
                        type="button"
                        disabled={player.claimed}
                        onClick={() => joinSeat(player.seatId)}
                      >
                        {player.claimed ? "Taken" : "Join seat"}
                      </button>
                    </div>
                  ))}
              </div>
            ) : null}

            {room.roomCode ? (
              <div className="room-controls">
                <div className="room-meta">
                  <span className="meta-label">Room code</span>
                  <div>{room.roomCode}</div>
                </div>
                <div className="room-meta">
                  <span className="meta-label">Share link</span>
                  <div className="room-link">{roomUrl}</div>
                </div>
                <div className="room-meta">
                  <span className="meta-label">Seat privacy</span>
                  <div>This device keeps its seat privately. Share the room link, not your private seat token.</div>
                </div>
                <div className="turn-actions">
                  <button
                    className="primary-button"
                    type="button"
                    disabled={!room.state || !room.state.hostControls || !roomReadyToDeal}
                    onClick={startRoom}
                  >
                    Deal cards
                  </button>
                  <button className="secondary-button" type="button" onClick={leaveRoom}>
                    Leave room
                  </button>
                </div>
                {room.state?.status === "waiting" ? (
                  <div className="hand-help">
                    {roomReadyToDeal
                      ? "All human players have joined. Deal cards when everyone is ready."
                      : `${openHumanSeats.length} human seat${openHumanSeats.length === 1 ? "" : "s"} still need to join before dealing.`}
                  </div>
                ) : null}
              </div>
            ) : null}
          </section>

          <section className="panel status-panel">
            {error ? <div className="error-banner">{error}</div> : null}
            <div className={`status-banner ${renderContext ? "" : "empty"}`}>
              {renderContext ? renderContext.statusText : "Start a game to begin."}
            </div>

            {renderContext?.winnerText ? (
              <div className="winner-banner">{renderContext.winnerText}</div>
            ) : null}

            <div className="meta-grid">
              <div>
                <span className="meta-label">Current player</span>
                <div>{renderContext?.currentPlayerName || "-"}</div>
              </div>
              <div>
                <span className="meta-label">Dealer</span>
                <div>{renderContext?.dealerName || "-"}</div>
              </div>
              <div>
                <span className="meta-label">Turn</span>
                <div>{renderContext?.turnCount || 0}</div>
              </div>
              <div>
                <span className="meta-label">Hand sizes</span>
                <div>{renderContext?.handSummary || "-"}</div>
              </div>
            </div>
            <button
              className={`primary-button ${overlayState.visible ? "" : "hidden"}`}
              type="button"
              onClick={hideOverlay}
            >
              Continue
            </button>
          </section>

          <section className="panel tableau-panel">
            <h2>Tableau</h2>
            <div className="tableau">
              {SUITS.map((suit) => {
                const tableau = getTableau({ mode, localGame, roomState: room.state });
                const lane = tableau ? tableau[suit] : { low: null, high: null };
                const sequence = lane.low === null ? [] : buildSequence(suit, lane.low, lane.high);
                const lowCards = sequence.filter((card) => card.rank < 7).reverse();
                const highCards = sequence.filter((card) => card.rank > 7);
                return (
                  <section className="suit-lane" key={suit}>
                    <h3>
                      {capitalize(suit)} {SUIT_SYMBOLS[suit]}
                    </h3>
                    <div className="suit-cards">
                      {sequence.length === 0 ? (
                        <div className="empty-lane">Waiting for the 7</div>
                      ) : (
                        <>
                          <div className="table-stack table-stack-low" style={buildStackStyle(lowCards.length)}>
                            {lowCards.map((card, index) => (
                                <div
                                  className="table-card-wrap"
                                  key={`${card.suit}-${card.rank}`}
                                  style={buildCardPositionStyle({
                                    index,
                                    count: lowCards.length,
                                    direction: "low",
                                  })}
                                >
                                  <PlayingCard card={card} className="table-card" />
                                </div>
                              ))}
                          </div>
                          <div className="table-center-card">
                            <PlayingCard
                              card={{ suit, rank: 7 }}
                              className="table-card table-card-center"
                            />
                          </div>
                          <div className="table-stack table-stack-high" style={buildStackStyle(highCards.length)}>
                            {highCards.map((card, index) => (
                                <div
                                  className="table-card-wrap"
                                  key={`${card.suit}-${card.rank}`}
                                  style={buildCardPositionStyle({
                                    index,
                                    count: highCards.length,
                                    direction: "high",
                                  })}
                                >
                                  <PlayingCard card={card} className="table-card" />
                                </div>
                              ))}
                          </div>
                        </>
                      )}
                    </div>
                  </section>
                );
              })}
            </div>
          </section>

          <section className="panel hand-panel">
            <div className="hand-header">
              <h2>Hand</h2>
              <p className="hand-help">{handContext.helpText}</p>
            </div>
            {handContext.cards ? (
              handContext.cards.length === 0 ? (
                <div className="hand empty-hand">{handContext.message}</div>
              ) : (
                <div className="hand">
                  {handContext.cards.map((card) => {
                    const playable = handContext.legalMoves.some((candidate) => sameCard(candidate, card));
                    return (
                      <button
                        key={`${card.suit}-${card.rank}`}
                        className={`card-button ${playable ? "playable" : "unplayable"}`}
                        type="button"
                        disabled={!playable}
                        onClick={() => playCard(card)}
                        aria-label={formatCard(card)}
                      >
                        <PlayingCard card={card} className="hand-card" />
                      </button>
                    );
                  })}
                </div>
              )
            ) : (
              <div className="hand empty-hand">{handContext.message}</div>
            )}
            <div className="hand-actions">
              <button
                className="secondary-button"
                type="button"
                disabled={!renderContext?.canPass}
                onClick={handlePass}
              >
                Pass
              </button>
            </div>
          </section>

          <section className="panel log-panel">
            <h2>Game log</h2>
            <ol className="log-list">
              {(mode === "local" ? localGame?.log : room.state?.game?.log) && (
                (mode === "local" ? localGame?.log : room.state?.game?.log).length > 0
                  ? (mode === "local" ? localGame.log : room.state.game.log).map((entry, index) => (
                      <li key={`${index}-${entry}`}>{entry}</li>
                    ))
                  : <li>No turns yet.</li>
              )}
              {!((mode === "local" ? localGame?.log : room.state?.game?.log)) ? <li>No turns yet.</li> : null}
            </ol>
          </section>
        </main>
      </div>

      {overlayState.visible ? (
        <div className="handoff-overlay">
          <div className="handoff-card">
            <p className="eyebrow">Next turn</p>
            <h2>{overlayState.playerName}</h2>
            <p>{overlayState.message}</p>
            <button className="primary-button" type="button" onClick={hideOverlay}>
              Show hand
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}

function PlayingCard({ card, className }) {
  const cid = `${rankCode(card.rank)}${SUIT_CODES[card.suit]}`;
  return <playing-card className={className} cid={cid} bordercolor="#2f261f" shadow="2,4,3" />;
}

function buildPlayerConfigs(count) {
  return Array.from({ length: count }, (_, index) => ({
    name: `Player ${index + 1}`,
    playerType: index === 0 ? "human" : "computer",
  }));
}

function resizePlayerConfigs(previous, nextCount) {
  const next = buildPlayerConfigs(nextCount);
  return next.map((fallback, index) => previous[index] || fallback);
}

function createLocalGame(players, dealerIndex) {
  const deck = [];
  for (const suit of SUITS) {
    for (let rank = 1; rank <= 13; rank += 1) {
      deck.push({ suit, rank });
    }
  }
  shuffle(deck);
  const playerStates = players.map((player) => ({
    ...player,
    hand: [],
    passedLastTurn: false,
  }));
  deck.forEach((card, index) => {
    playerStates[index % playerStates.length].hand.push(card);
  });
  playerStates.forEach((player) => player.hand.sort(compareCards));
  return {
    players: playerStates,
    dealerIndex,
    currentPlayerIndex: (dealerIndex + 1) % playerStates.length,
    turnCount: 1,
    winnerIndex: null,
    log: [],
    tableau: makeEmptyTableau(),
  };
}

function runComputerTurn(previous) {
  if (!previous || previous.winnerIndex !== null) {
    return previous;
  }
  const nextGame = structuredClone(previous);
  const currentPlayer = nextGame.players[nextGame.currentPlayerIndex];
  if (currentPlayer.playerType !== "computer") {
    return previous;
  }
  const legalMoves = currentPlayer.hand.filter((card) => isLegalPlay(nextGame.tableau, card));
  if (legalMoves.length === 0) {
    currentPlayer.passedLastTurn = true;
    nextGame.log.unshift(`${currentPlayer.name} passes.`);
    advanceTurn(nextGame);
    return nextGame;
  }
  const chosen = chooseComputerMove(legalMoves);
  currentPlayer.hand = currentPlayer.hand.filter((candidate) => !sameCard(candidate, chosen));
  currentPlayer.passedLastTurn = false;
  applyCardToTableau(nextGame.tableau, chosen);
  nextGame.log.unshift(`${currentPlayer.name} played ${formatCard(chosen)}.`);
  if (currentPlayer.hand.length === 0) {
    nextGame.winnerIndex = nextGame.currentPlayerIndex;
    return nextGame;
  }
  advanceTurn(nextGame);
  return nextGame;
}

function advanceTurn(game) {
  game.currentPlayerIndex = (game.currentPlayerIndex + 1) % game.players.length;
  game.turnCount += 1;
}

function applyCardToTableau(tableau, card) {
  const lane = tableau[card.suit];
  if (card.rank === 7) {
    lane.low = 7;
    lane.high = 7;
    return;
  }
  if (card.rank < 7) {
    lane.low = card.rank;
    return;
  }
  lane.high = card.rank;
}

function isLegalPlay(tableau, card) {
  const lane = tableau[card.suit];
  if (lane.low === null) {
    return card.rank === 7;
  }
  return card.rank === lane.low - 1 || card.rank === lane.high + 1;
}

function getTableau({ mode, localGame, roomState }) {
  if (mode === "local") {
    return localGame?.tableau || null;
  }
  return roomState?.game?.tableau || null;
}

function getRenderContext({ mode, localGame, overlayState, roomState }) {
  if (mode === "local" && localGame) {
    const player = localGame.players[localGame.currentPlayerIndex];
    const legalMoves = player.hand.filter((card) => isLegalPlay(localGame.tableau, card));
    const winner = localGame.winnerIndex !== null ? localGame.players[localGame.winnerIndex] : null;
    return {
      statusText: winner
        ? `${winner.name} has emptied their hand.`
        : player.playerType === "computer"
          ? `${player.name} is thinking...`
          : legalMoves.length > 0
            ? `${player.name} must play one of ${legalMoves.length} legal card${legalMoves.length === 1 ? "" : "s"}.`
            : `${player.name} has no legal move and must pass.`,
      currentPlayerName: player.name,
      dealerName: localGame.players[localGame.dealerIndex].name,
      turnCount: localGame.turnCount,
      handSummary: localGame.players
        .map((entry) => `${entry.name} (${entry.playerType}): ${entry.hand.length}`)
        .join(" | "),
      canPass:
        !overlayState.visible &&
        localGame.winnerIndex === null &&
        player.playerType === "human" &&
        legalMoves.length === 0,
      winnerText: winner ? `${winner.name} wins.` : "",
    };
  }

  if (mode === "room" && roomState) {
    if (!roomState.game) {
      return {
        statusText: roomState.hostControls
          ? "Share the room link, wait for the human seats to fill, then start the room."
          : "Waiting for the host to start the room.",
        currentPlayerName: "-",
        dealerName: roomState.players[roomState.dealerIndex].displayName,
        turnCount: 0,
        handSummary: roomState.players
          .map((entry) => `${entry.displayName} (${entry.playerType})`)
          .join(" | "),
        canPass: false,
        winnerText: "",
      };
    }

    const currentPlayer = roomState.players.find((entry) => entry.seatId === roomState.game.currentSeatId);
    const viewer = roomState.players.find((entry) => entry.isViewer);
    const winner = roomState.players.find((entry) => entry.seatId === roomState.game.winnerSeatId);
    const yourTurn = viewer && currentPlayer && viewer.seatId === currentPlayer.seatId;

    return {
      statusText: winner
        ? `${winner.displayName} has emptied their hand.`
        : yourTurn
          ? roomState.game.viewerLegalMoves.length > 0
            ? `It is your turn. You must play one of ${roomState.game.viewerLegalMoves.length} legal card${roomState.game.viewerLegalMoves.length === 1 ? "" : "s"}.`
            : "It is your turn and you must pass."
          : currentPlayer?.playerType === "computer"
            ? `${currentPlayer.displayName} is taking a computer turn.`
            : `Waiting for ${currentPlayer?.displayName || "the next player"}.`,
      currentPlayerName: currentPlayer?.displayName || "-",
      dealerName: roomState.players[roomState.dealerIndex].displayName,
      turnCount: roomState.game.turnCount,
      handSummary: roomState.players
        .map((entry) => `${entry.displayName} (${entry.playerType}): ${entry.handCount}`)
        .join(" | "),
      canPass: Boolean(yourTurn && roomState.game.viewerLegalMoves.length === 0 && !winner),
      winnerText: winner ? `${winner.displayName} wins.` : "",
    };
  }

  return null;
}

function getHandContext({ mode, localGame, overlayState, roomState }) {
  if (mode === "local") {
    if (!localGame) {
      return {
        cards: null,
        legalMoves: [],
        message: "No active game.",
        helpText: "Playable cards are highlighted.",
      };
    }
    if (overlayState.visible) {
      return {
        cards: null,
        legalMoves: [],
        message: "Hand hidden until the next player continues.",
        helpText: "Continue when the next human player has the screen.",
      };
    }
    const player = localGame.players[localGame.currentPlayerIndex];
    if (player.playerType === "computer") {
      return {
        cards: null,
        legalMoves: [],
        message: `${player.name} is a computer player.`,
        helpText: "Computer players automatically follow the same legal move rules.",
      };
    }
    return {
      cards: player.hand,
      legalMoves: player.hand.filter((card) => isLegalPlay(localGame.tableau, card)),
      message: "No cards remaining.",
      helpText: "Playable cards are highlighted.",
    };
  }

  if (mode === "room") {
    if (!roomState) {
      return {
        cards: null,
        legalMoves: [],
        message: "Load or create a room to see your hand.",
        helpText: "Each browser only sees its own hand in room play.",
      };
    }
    if (!roomState.game) {
      return {
        cards: null,
        legalMoves: [],
        message: "Waiting for the room to start.",
        helpText: "Each browser only sees its own hand after the room starts.",
      };
    }
    const viewer = roomState.players.find((entry) => entry.isViewer);
    if (!viewer) {
      return {
        cards: null,
        legalMoves: [],
        message: "Join a human seat to play in this room.",
        helpText: "Each browser only sees its own hand after joining a seat.",
      };
    }
    return {
      cards: viewer.hand || [],
      legalMoves: roomState.game.viewerLegalMoves || [],
      message: "No cards remaining.",
      helpText: "Playable cards are highlighted when it is your turn.",
    };
  }

  return {
    cards: null,
    legalMoves: [],
    message: "No active game.",
    helpText: "Playable cards are highlighted.",
  };
}

function shuffle(array) {
  for (let index = array.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [array[index], array[swapIndex]] = [array[swapIndex], array[index]];
  }
}

function rankCode(rank) {
  if (rank === 1) return "A";
  if (rank === 10) return "T";
  if (rank === 11) return "J";
  if (rank === 12) return "Q";
  if (rank === 13) return "K";
  return String(rank);
}

function buildStackStyle(count) {
  const cardWidth = 52;
  const minWidth = count === 0 ? 0 : cardWidth + Math.max(0, count - 1) * 18;
  return {
    minHeight: count > 0 ? "92px" : undefined,
    "--stack-card-count": count,
    "--stack-min-width": `${minWidth}px`,
  };
}

function buildCardPositionStyle({ index, count, direction }) {
  if (count <= 1) {
    return {
      zIndex: index + 1,
      [direction === "low" ? "right" : "left"]: 0,
    };
  }
  const ratio = index / (count - 1);
  const percent = ratio * 100;
  const pixelOffset = ratio * 52;
  return {
    zIndex: index + 1,
    [direction === "low" ? "right" : "left"]: `calc(${percent}% - ${pixelOffset}px)`,
  };
}

function updateUrl(roomCode, token) {
  if (typeof window === "undefined") {
    return;
  }
  const url = new URL(window.location.href);
  if (!roomCode) {
    url.searchParams.delete("room");
  } else {
    url.searchParams.set("room", roomCode);
  }
  if (token) {
    url.searchParams.set("token", token);
  } else {
    url.searchParams.delete("token");
  }
  window.history.replaceState({}, "", url);
}

function roomTokenKey(roomCode) {
  return `seven-up-room-token:${roomCode.toUpperCase()}`;
}

function persistRoomToken(roomCode, token) {
  if (typeof window === "undefined" || !roomCode || !token) {
    return;
  }
  window.sessionStorage.setItem(roomTokenKey(roomCode), token);
}

function readRoomToken(roomCode) {
  if (typeof window === "undefined" || !roomCode) {
    return "";
  }
  return window.sessionStorage.getItem(roomTokenKey(roomCode)) || "";
}

function clearRoomToken(roomCode) {
  if (typeof window === "undefined" || !roomCode) {
    return;
  }
  window.sessionStorage.removeItem(roomTokenKey(roomCode));
}

async function fetchJson(url) {
  const response = await fetch(url, { cache: "no-store" });
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.error || "Request failed.");
  }
  return payload;
}

async function postJson(url, body) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.error || "Request failed.");
  }
  return payload;
}
