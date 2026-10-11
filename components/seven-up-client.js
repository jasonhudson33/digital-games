"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { shuffleInPlace } from "../lib/shuffle.js";
import { Bot, Copy, DoorOpen, LogOut, Sparkles, Users } from "lucide-react";
import { Seat, SeatedTable } from "./ui/seated-table";
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
  const [playerConfigs, setPlayerConfigs] = useState(() => buildPlayerConfigs(4));
  const [localGame, setLocalGame] = useState(null);
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
    if (!localGame || localGame.winnerIndex !== null) {
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
  }, [localGame]);

  useEffect(() => {
    if (!room.roomCode || !room.token) {
      stopPolling();
      return;
    }
    pollRoomState(room.roomCode, room.token);
    stopPolling();
    pollTimerRef.current = window.setInterval(() => {
      // Skip ticks while the tab is hidden. handleRoomVisibility below already
      // refetches on return, so there is nothing to catch up on. (This client
      // keeps its own loop rather than using lib/room-poll.js because
      // pollRoomState owns its state updates instead of returning state.)
      if (document.hidden) return;
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
    roomState: room.state,
  });

  const handContext = getHandContext({ mode, localGame, roomState: room.state });

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
    setPlayerConfigs((previous) => resizePlayerConfigs(previous, nextCount));
  }

  /* Local play is you against computers — one human seat, always the first
     one. Switching into it drops any second human seat a room setup left
     behind, so a stray "Player 2: Human" from room mode can't sneak a
     hot-seat pass-and-play back in. */
  function handleModeChange(nextMode) {
    setMode(nextMode);
    if (nextMode === "local") {
      setPlayerConfigs((previous) =>
        previous.map((player, index) => ({ ...player, playerType: index === 0 ? "human" : "computer" }))
      );
    }
  }

  /* Every other game's entry card has a single "Your name" box that serves both
     creating and joining. Seven-Up had three separate ones (the local seat, the
     create field, the join field) which is the same question asked three times.
     One input, fanned out to all three. */
  function setYourName(value) {
    setCreateName(value);
    setJoinName(value);
    handlePlayerConfigChange(0, { name: value.trim() || "You" });
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
    const dealerIndex = Math.floor(Math.random() * playerConfigs.length);
    const game = createLocalGame(playerConfigs, dealerIndex);
    const firstPlayer = game.players[game.currentPlayerIndex];
    game.log.unshift(`${firstPlayer.name} goes first because play starts to the dealer's left.`);
    setLocalGame(game);
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
    event?.preventDefault?.();
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
      if (!previous || previous.winnerIndex !== null) {
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
      if (!previous || previous.winnerIndex !== null) {
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

  function handleDealAgain() {
    clearError();
    if (mode === "local") {
      startLocalGame();
      return;
    }
    startRoom();
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
    setRoom(initialRoom);
    updateUrl("", "");
  }

  /* The lobby renders before this browser holds a token too — someone who has
     only loaded a room code sees the seats from the join preview — so the seat
     counts have to read from whichever of the two we actually have. */
  const roomPlayers = room.state?.players || room.joinPreview?.players || [];
  const humanPlayers = roomPlayers.filter((player) => player.playerType === "human");
  const openHumanSeats = humanPlayers.filter((player) => !player.claimed);
  const roomReadyToDeal = Boolean(room.state && room.state.status === "waiting" && openHumanSeats.length === 0);
  const roomUrl =
    room.roomCode && typeof window !== "undefined"
      ? `${window.location.origin}?room=${room.roomCode}`
      : "-";
  const playerRail = getPlayerRail({ mode, localGame, roomState: room.state });
  const winnerName =
    mode === "local"
      ? localGame?.winnerIndex !== null && localGame?.winnerIndex !== undefined
        ? localGame.players[localGame.winnerIndex]?.name || ""
        : ""
      : room.state?.game?.winnerSeatId
        ? room.state.players.find((player) => player.seatId === room.state.game.winnerSeatId)?.displayName || ""
        : "";
  const showWinnerOverlay = Boolean(winnerName);
  const canDealAgain = mode === "local" || Boolean(room.state?.hostControls);
  const gameActive = mode === "local" ? Boolean(localGame) : Boolean(room.state?.game);

  return (
    <>
      {gameActive ? (
        <main className="tbl-game seven-up-theme tbl-felt-shell">
          <SevenUpGameHeader
            mode={mode}
            roomCode={room.roomCode}
            statusText={renderContext?.statusText || ""}
            onLeave={resetAll}
          />
          {error && <p className="tbl-error" role="alert">{error}</p>}

          <section className="seven-up-felt-wrap tbl-felt-fit" aria-label="7-Up table">
            <SevenUpTable
              playerRail={playerRail}
              mode={mode}
              tableau={getTableau({ mode, localGame, roomState: room.state })}
              turnCount={renderContext?.turnCount}
            />
          </section>

          <section className="tbl-hand-zone">
            <header className="tbl-hand-header">
              <div>
                <p>Your hand</p>
                <strong>{handContext.cards ? `${handContext.cards.length} cards` : handContext.message}</strong>
              </div>
            </header>
            <p className="hand-help">{handContext.helpText}</p>
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
            <div className="tbl-actions">
              <button
                className="tbl-secondary"
                type="button"
                disabled={!renderContext?.canPass}
                onClick={handlePass}
              >
                Pass
              </button>
            </div>
          </section>

          <aside className="tbl-side tbl-log seven-up-log">
            <p>Table talk</p>
            {(() => {
              const log = mode === "local" ? localGame?.log : room.state?.game?.log;
              if (!log || log.length === 0) {
                return <span className="tbl-log-line">No turns yet.</span>;
              }
              return log.slice(0, 5).map((entry, index) => (
                <span className="tbl-log-line" key={`${index}-${entry}`}>{entry}</span>
              ));
            })()}
          </aside>
        </main>
      ) : room.roomCode ? (
        <SevenUpLobby
          room={room}
          roomUrl={roomUrl}
          joinName={joinName}
          setYourName={setYourName}
          openHumanSeats={openHumanSeats}
          humanPlayers={humanPlayers}
          roomReadyToDeal={roomReadyToDeal}
          onJoinSeat={joinSeat}
          onStart={startRoom}
          onLeave={leaveRoom}
          error={error}
        />
      ) : (
        <main className="tbl-landing seven-up-theme">
          <section className="tbl-hero">
            <p className="tbl-kicker">Lay the sevens, then run the suits</p>
            <h1>
              Seven
              <br />
              <em>Up.</em>
            </h1>
            <p className="tbl-hero-copy">
              Every suit builds outwards from its seven — up to the King, down to the Ace. Empty
              your hand first to win, and if you are holding a legal card, you must play it.
            </p>
            <div className="tbl-hero-badges">
              <span><Users aria-hidden="true" /> 3–7 players</span>
              <span><Bot aria-hidden="true" /> Computer seats</span>
              <span><Sparkles aria-hidden="true" /> Four suit runs</span>
            </div>
            <div className="tbl-hero-fan seven-up-hero-fan" aria-hidden="true">
              <PlayingCard card={{ suit: "hearts", rank: 6 }} />
              <PlayingCard card={{ suit: "spades", rank: 7 }} />
              <PlayingCard card={{ suit: "diamonds", rank: 8 }} />
            </div>
          </section>

          <form className="tbl-entry" onSubmit={handleSubmit}>
            <p className="tbl-kicker">Private table</p>
            <h2>Play 7-Up</h2>
            <p className="tbl-entry-copy">
              Deal a table against computer opponents, or create a room and share its code with
              the people you want at it.
            </p>

            <div className="tbl-modes" role="group" aria-label="Play mode">
              <button
                type="button"
                className={mode === "local" ? "is-on" : ""}
                aria-pressed={mode === "local"}
                onClick={() => handleModeChange("local")}
              >
                <Bot aria-hidden="true" /> Vs. computers
              </button>
              <button
                type="button"
                className={mode === "room" ? "is-on" : ""}
                aria-pressed={mode === "room"}
                onClick={() => handleModeChange("room")}
              >
                <Users aria-hidden="true" /> With people
              </button>
            </div>

            <label className="tbl-field">
              Your name
              <input
                maxLength={20}
                value={createName}
                placeholder="Player name"
                onChange={(event) => setYourName(event.target.value)}
              />
            </label>

            <label className="tbl-field">
              Players
              <select value={playerCount} onChange={handlePlayerCountChange}>
                {Array.from({ length: 5 }, (_, index) => index + 3).map((count) => (
                  <option key={count} value={count}>
                    {count} players
                  </option>
                ))}
              </select>
            </label>

            {mode === "local" ? (
              <p className="tbl-entry-note">
                You against {Math.max(playerCount - 1, 0)} computer opponent
                {playerCount - 1 === 1 ? "" : "s"}. Play starts to the dealer&apos;s left.
              </p>
            ) : (
              <div className="tbl-seat-types">
                {playerConfigs.map((player, index) => (
                  <div className="tbl-seat-type" key={index}>
                    <span>{index === 0 ? "You" : `Seat ${index + 1}`}</span>
                    {index === 0 ? (
                      <em>Human</em>
                    ) : (
                      <select
                        aria-label={`Seat ${index + 1} type`}
                        value={player.playerType}
                        onChange={(event) =>
                          handlePlayerConfigChange(index, { playerType: event.target.value })
                        }
                      >
                        <option value="human">Human</option>
                        <option value="computer">Computer</option>
                      </select>
                    )}
                  </div>
                ))}
              </div>
            )}

            <button type="submit" className="tbl-primary">
              {mode === "room" ? (
                <>
                  <Users aria-hidden="true" /> Create a room
                </>
              ) : (
                <>
                  <Sparkles aria-hidden="true" /> Deal cards
                </>
              )}
            </button>

            <p className="tbl-or">or join a room</p>

            <div className="tbl-join">
              <input
                aria-label="Room code"
                maxLength={6}
                value={joinRoomCode}
                placeholder="ROOM CODE"
                onChange={(event) => setJoinRoomCode(event.target.value.toUpperCase())}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    loadRoom();
                  }
                }}
              />
              <button type="button" onClick={() => loadRoom()}>
                Join
              </button>
            </div>

            <p className="tbl-entry-note">
              <strong>Rule note:</strong> if you have a legal card, you must play it.
            </p>

            {error && <p className="tbl-error" role="alert">{error}</p>}
          </form>
        </main>
      )}

      {showWinnerOverlay ? (
        <div className="handoff-overlay">
          <div className="handoff-card">
            <p className="eyebrow">Game over</p>
            <h2>{winnerName} wins</h2>
            <p>
              {canDealAgain
                ? "The game is finished. Deal again to replay with the same table."
                : "The game is finished. Waiting for the host to deal again or start a new game."}
            </p>
            <div className="turn-actions">
              {canDealAgain ? (
                <button className="primary-button" type="button" onClick={handleDealAgain}>
                  Deal again
                </button>
              ) : null}
              <button className="secondary-button" type="button" onClick={resetAll}>
                New game
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

/*
 * The room lobby, on the same .tbl-lobby shell UNO and DOS use.
 *
 * Seven-Up's seats are not theirs — a seat here is claimed by whoever loads the
 * room code, rather than added by the host — so this renders the shared seat
 * furniture against Seven-Up's own room shape instead of reusing <Lobby>.
 */
function SevenUpLobby({
  room,
  roomUrl,
  joinName,
  setYourName,
  openHumanSeats,
  humanPlayers,
  roomReadyToDeal,
  onJoinSeat,
  onStart,
  onLeave,
  error,
}) {
  const seats = room.state?.players || room.joinPreview?.players || [];
  const seated = room.token;
  const hostControls = Boolean(room.state?.hostControls);

  return (
    <main className="tbl-lobby seven-up-theme">
      <section>
        <header className="tbl-lobby-head">
          <div>
            <p className="tbl-kicker">7-Up table ready</p>
            <h1>
              Room{" "}
              <button
                type="button"
                className="tbl-room-code"
                onClick={() => navigator.clipboard?.writeText(room.roomCode)}
              >
                {room.roomCode} <Copy aria-hidden="true" />
              </button>
            </h1>
            <p className="tbl-lobby-hint">
              {seated
                ? "Share the code. Once every human seat is taken, the host deals."
                : "Pick an open seat to join this table."}
            </p>
          </div>
        </header>

        {!seated ? (
          <label className="tbl-field">
            Your name
            <input
              maxLength={20}
              value={joinName}
              placeholder="Player name"
              onChange={(event) => setYourName(event.target.value)}
            />
          </label>
        ) : null}

        <div className="tbl-seats">
          {seats.map((seat) => {
            const isComputer = seat.playerType === "computer";
            const canClaim = !seated && !isComputer && !seat.claimed;
            return (
              <article className="tbl-seat" key={seat.seatId}>
                <span className="tbl-seat-avatar" aria-hidden="true">
                  {isComputer ? <Bot /> : <Users />}
                </span>
                <div>
                  <strong>
                    {seat.displayName || seat.label}
                    {seat.isViewer ? " (you)" : ""}
                  </strong>
                  <small>
                    {isComputer ? "Computer" : seat.claimed ? "Human · seated" : "Human · open"}
                  </small>
                </div>
                {canClaim ? (
                  <button type="button" className="tbl-seat-join" onClick={() => onJoinSeat(seat.seatId)}>
                    Join
                  </button>
                ) : (
                  <Sparkles aria-hidden="true" />
                )}
              </article>
            );
          })}
        </div>

        <p className="tbl-ready">
          <b>
            {humanPlayers.length - openHumanSeats.length} / {humanPlayers.length} human seats
          </b>
          <span>
            {roomReadyToDeal
              ? "Ready to deal"
              : `${openHumanSeats.length} still open`}
          </span>
        </p>

        {hostControls ? (
          <button
            type="button"
            className="tbl-primary tbl-start"
            disabled={!roomReadyToDeal}
            onClick={onStart}
          >
            <Sparkles aria-hidden="true" /> Deal cards
          </button>
        ) : seated ? (
          <p className="tbl-wait">Waiting for the host to deal…</p>
        ) : null}

        <button type="button" className="tbl-link tbl-leave" onClick={onLeave}>
          <DoorOpen aria-hidden="true" /> Leave room
        </button>

        <p className="tbl-share">
          <span>Share link</span>
          <code>{roomUrl}</code>
        </p>

        {error && <p className="tbl-error" role="alert">{error}</p>}
      </section>
    </main>
  );
}

/*
 * The in-game header, matching the shared felt-shell look UNO and DOS use.
 * Bespoke rather than the shared <GameHeader> since Seven-Up plays either
 * hot-seat local (no room at all) or in a room — <GameHeader> assumes a
 * room object with a round number, which local play doesn't have.
 */
function SevenUpGameHeader({ mode, roomCode, statusText, onLeave }) {
  return (
    <header className="tbl-game-header">
      <div className="tbl-game-title">
        <p>{mode === "room" ? "Private room" : "Local game"}</p>
        <h1>7-Up</h1>
      </div>

      <strong className="tbl-header-status" role="status">
        {statusText}
      </strong>

      {mode === "room" && roomCode ? (
        <button
          type="button"
          className="tbl-header-action"
          onClick={() => navigator.clipboard?.writeText(roomCode)}
        >
          <Copy aria-hidden="true" />
          <span className="tbl-header-action-label">{roomCode}</span>
        </button>
      ) : null}

      <button type="button" className="tbl-header-action" onClick={onLeave}>
        <LogOut aria-hidden="true" />
        <span className="tbl-header-action-label">Leave</span>
      </button>
    </header>
  );
}

/*
 * The players, sitting round the felt.
 *
 * Local play is hot-seat: one screen, passed around, so "you" is whoever's
 * turn it is rather than a fixed device. Room play fixes "you" to the seat
 * this browser claimed. Either way the table rotates to put that seat at
 * the bottom, the same way UNO and DOS do for their own viewer.
 */
function SevenUpTable({ playerRail, mode, tableau, turnCount }) {
  const viewerIndex = Math.max(
    0,
    playerRail.findIndex((player) => player.isViewer),
  );

  return (
    <SeatedTable
      count={playerRail.length}
      viewerIndex={viewerIndex}
      className="seven-up-felt"
      middle={(
        <div className="seven-up-tableau" aria-label="Tableau">
          {SUITS.map((suit) => {
            const lane = tableau ? tableau[suit] : { low: null, high: null };
            const hasStarted = lane.low !== null;
            const run = hasStarted ? buildSequence(suit, lane.low, lane.high) : [];
            return (
              <div className={`seven-up-lane is-${suit}`} key={suit}>
                <span className="seven-up-lane-suit" aria-hidden="true">{SUIT_SYMBOLS[suit]}</span>
                {hasStarted ? (
                  <div
                    className="seven-up-lane-run"
                    aria-label={`${capitalize(suit)}: ${run.length} card${run.length === 1 ? "" : "s"} played, ${lane.low} through ${lane.high}`}
                  >
                    {run.map((card, index) => (
                      <div
                        className={`seven-up-lane-card ${card.rank === 7 ? "is-seven" : ""}`}
                        key={`${suit}-${card.rank}`}
                        style={{ "--i": index }}
                        title={formatCard(card)}
                      >
                        <PlayingCard card={card} className="seven-up-table-card" />
                      </div>
                    ))}
                  </div>
                ) : (
                  <span className="seven-up-lane-empty">Waiting for the 7</span>
                )}
              </div>
            );
          })}
        </div>
      )}
      foot={<small className="tbl-felt-meta">Turn {turnCount || 1}</small>}
    >
      {({ layout, seatStyle }) => (
        <>
          {layout.map((spot) => {
            const player = playerRail[spot.index];
            return (
              <Seat
                key={player.id}
                spot={spot}
                style={seatStyle(spot.index)}
                name={player.name}
                avatar={player.name.slice(0, 1).toUpperCase()}
                note={player.isDealer ? "Dealer" : player.orderLabel}
                hand={player.handCount}
                tone={player.isCurrent ? "turn" : ""}
                marks={[
                  player.isDealer && { key: "deal", label: "D", title: "Dealer", tone: "deal" },
                  player.isWinner && { key: "win", label: "\u2605", title: `${player.name} went out`, tone: "lead" },
                ].filter(Boolean)}
              >
                <span className="tbl-chair-pill">{player.handCount} {player.handCount === 1 ? "card" : "cards"}</span>
              </Seat>
            );
          })}
        </>
      )}
    </SeatedTable>
  );
}

const subscribeNever = () => () => {};

function PlayingCard({ card, className }) {
  const cid = `${rankCode(card.rank)}${SUIT_CODES[card.suit]}`;
  // <playing-card> rewrites its own children as soon as cardmeister loads, which
  // can be before React hydrates the landing hero's fan — React then finds an
  // <img> the server never sent and throws the whole tree away. Render the
  // element on the client only; the fan is decorative (aria-hidden) anyway.
  const mounted = useSyncExternalStore(subscribeNever, () => true, () => false);
  if (!mounted) return null;
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
  shuffleInPlace(deck);
  const playerStates = players.map((player) => ({
    ...player,
    hand: [],
    passedLastTurn: false,
  }));
  deck.forEach((card, index) => {
    playerStates[(dealerIndex + 1 + index) % playerStates.length].hand.push(card);
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
  const chosen = chooseComputerMove(legalMoves, currentPlayer.hand);
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

function getRenderContext({ mode, localGame, roomState }) {
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

function getHandContext({ mode, localGame, roomState }) {
  if (mode === "local") {
    if (!localGame) {
      return {
        cards: null,
        legalMoves: [],
        message: "No active game.",
        helpText: "Playable cards are highlighted.",
      };
    }
    const player = localGame.players[0];
    const isYourTurn = localGame.currentPlayerIndex === 0 && localGame.winnerIndex === null;
    return {
      cards: player.hand,
      legalMoves: isYourTurn ? player.hand.filter((card) => isLegalPlay(localGame.tableau, card)) : [],
      message: "No cards remaining.",
      helpText: isYourTurn
        ? "Playable cards are highlighted."
        : `Waiting for ${localGame.players[localGame.currentPlayerIndex].name}...`,
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


function rankCode(rank) {
  if (rank === 1) return "A";
  if (rank === 10) return "T";
  if (rank === 11) return "J";
  if (rank === 12) return "Q";
  if (rank === 13) return "K";
  return String(rank);
}

function getPlayerRail({ mode, localGame, roomState }) {
  if (mode === "local" && localGame) {
    return orderedPlayers(localGame.players, localGame.dealerIndex).map((player, index) => ({
      id: `${player.name}-${index}`,
      name: player.name,
      handCount: player.hand.length,
      isCurrent: localGame.currentPlayerIndex === localGame.players.indexOf(player) && localGame.winnerIndex === null,
      isWinner: localGame.winnerIndex !== null && localGame.players[localGame.winnerIndex] === player,
      isDealer: localGame.players[localGame.dealerIndex] === player,
      isViewer: localGame.players.indexOf(player) === 0,
      orderLabel: `Turn ${index + 1}`,
    }));
  }

  if (mode === "room" && roomState?.players) {
    const ordered = orderedPlayers(roomState.players, roomState.dealerIndex);
    return ordered.map((player, index) => ({
      id: player.seatId,
      name: player.displayName,
      handCount: player.handCount,
      isCurrent: roomState.game?.currentSeatId === player.seatId && !roomState.game?.winnerSeatId,
      isWinner: roomState.game?.winnerSeatId === player.seatId,
      isDealer: roomState.players[roomState.dealerIndex]?.seatId === player.seatId,
      isViewer: player.isViewer,
      orderLabel: `Turn ${index + 1}`,
    }));
  }

  return [];
}

function orderedPlayers(players, dealerIndex) {
  return players.map((_, index) => players[(dealerIndex + 1 + index) % players.length]);
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
