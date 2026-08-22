"use client";

import { useEffect, useRef, useState } from "react";
import { Anchor, BookOpen, Bot, Copy, DoorOpen, Play, Plus, RotateCcw, UserPlus, Users, X } from "lucide-react";
import { PlayedCard, Seat, SeatedTable } from "./ui/seated-table";
import { getSkullKingCardArt } from "../lib/skull-king-art";
import { getSkullKingCardHelp } from "../lib/skull-king-card-help";
import { SkullKingRoomService } from "./skull-king-room-service";
import {
  SKULL_KING_SPECIALS,
  SKULL_KING_SUIT_DETAILS,
  chooseBotPirateAbility,
  chooseBotSkullKingPlay,
  chooseBotWalkThePlank,
  collectSkullKingTrick,
  createSkullKingMatch,
  formatSkullKingCard,
  getLegalSkullKingCards,
  getSkullKingActingPlayerIndex,
  getSkullKingGhostControllerIndex,
  getSkullKingGhostDeclaration,
  getSkullKingGhostIndex,
  getSkullKingLeadSuit,
  playSkullKingCard,
  resolveSkullKingPirateAbility,
  resolveWalkThePlank,
  startNextSkullKingRound,
  submitSkullKingBid,
} from "../lib/skull-king";

const PLAYER_NAME_KEY = "skull-king-player-name";

export default function SkullKingClient() {
  const [playerName, setPlayerName] = useState("");
  const [playerCount, setPlayerCount] = useState(4);
  const [isReady, setIsReady] = useState(false);
  const [joinCode, setJoinCode] = useState("");
  const [roomToken, setRoomToken] = useState("");
  const [game, setGame] = useState(null);
  const [bid, setBid] = useState(0);
  const [rulesOpen, setRulesOpen] = useState(false);
  const [choiceCardId, setChoiceCardId] = useState(null);
  const [tigressCardId, setTigressCardId] = useState(null);
  const [wildCardId, setWildCardId] = useState(null);
  const [pendingPlayPlayerIndex, setPendingPlayPlayerIndex] = useState(0);
  const [abilityCard, setAbilityCard] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const latestGame = useRef(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("room")?.toUpperCase() || "";
    setPlayerName(localStorage.getItem(PLAYER_NAME_KEY) || "");
    setJoinCode(code);
    setRoomToken(code ? getStoredRoomToken(code) : "");
    setIsReady(true);
  }, []);

  useEffect(() => {
    latestGame.current = game;
  }, [game]);

  useEffect(() => {
    if (!isReady || game || !joinCode || !roomToken) return;
    let cancelled = false;
    void SkullKingRoomService.load(joinCode, roomToken).then((state) => {
      if (!cancelled) setGame(state);
    }).catch((roomError) => {
      if (isStaleRoomCredentialError(roomError)) {
        removeStoredRoomToken(joinCode);
        setRoomToken("");
      } else if (!cancelled) {
        setError(roomError instanceof Error ? roomError.message : `Could not reconnect to room ${joinCode}.`);
      }
    });
    return () => { cancelled = true; };
  }, [game, isReady, joinCode, roomToken]);

  useEffect(() => {
    if (!game?.roomCode || !roomToken) return undefined;
    return SkullKingRoomService.subscribe(game.roomCode, roomToken, (remote) => {
      setGame((current) => !current || remote.updatedAt >= current.updatedAt ? remote : current);
    });
  }, [game?.roomCode, roomToken]);

  useEffect(() => {
    if (!game || game.roomCode || !["playing", "lastVolley"].includes(game.phase) || getSkullKingActingPlayerIndex(game) === 0) return undefined;
    const timer = window.setTimeout(() => {
      setGame((current) => {
        if (!current || !["playing", "lastVolley"].includes(current.phase) || getSkullKingActingPlayerIndex(current) === 0) return current;
        const ghostIndex = getSkullKingGhostIndex(current);
        if (current.currentPlayerIndex === ghostIndex) {
          const ghostHand = current.players[ghostIndex].hand;
          const ghostCard = ghostHand[0];
          return ghostCard
            ? playSkullKingCard(current, ghostIndex, ghostCard.id, getSkullKingGhostDeclaration(ghostCard))
            : current;
        }
        const play = chooseBotSkullKingPlay(current, current.currentPlayerIndex);
        return play
          ? playSkullKingCard(current, current.currentPlayerIndex, play.card.id, play.declaredSuit ?? play.declaredRole ?? play.declaredValue)
          : current;
      });
    }, 680);
    return () => window.clearTimeout(timer);
  }, [game]);

  useEffect(() => {
    if (!game || game.roomCode || game.phase !== "walkThePlank" || decisionControllerIndex(game, game.pendingWalkThePlank?.playerIndex) === 0) return undefined;
    const timer = window.setTimeout(() => {
      setGame((current) => current?.phase === "walkThePlank"
        ? resolveWalkThePlank(current, chooseBotWalkThePlank(current))
        : current);
    }, 720);
    return () => window.clearTimeout(timer);
  }, [game]);

  useEffect(() => {
    if (!game || game.phase !== "collecting") return undefined;
    if (game.roomCode && !game.hostControls) return undefined;
    const timer = window.setTimeout(() => {
      if (game.roomCode) void roomAction("collectTrick");
      else setGame((current) => collectSkullKingTrick(current));
    }, 1250);
    return () => window.clearTimeout(timer);
  }, [game]);

  useEffect(() => {
    if (!game || game.roomCode || game.phase !== "pirateAbility") return undefined;
    const ghostIndex = getSkullKingGhostIndex(game);
    if (game.pendingPirateAbility?.playerIndex !== ghostIndex && decisionControllerIndex(game, game.pendingPirateAbility?.playerIndex) === 0) return undefined;
    const timer = window.setTimeout(() => {
      setGame((current) => current?.phase === "pirateAbility"
        ? resolveSkullKingPirateAbility(current, chooseBotPirateAbility(current))
        : current);
    }, 760);
    return () => window.clearTimeout(timer);
  }, [game]);

  useEffect(() => {
    if (game?.phase === "bidding") setBid(0);
  }, [game?.roundNumber, game?.phase]);

  function startGame() {
    const cleanName = usePlayerName();
    setGame(createSkullKingMatch({
      playerName: cleanName,
      playerCount,
      startingPlayerIndex: Math.floor(Math.random() * playerCount),
    }));
    setBid(0);
    setChoiceCardId(null);
    setTigressCardId(null);
    setWildCardId(null);
    setPendingPlayPlayerIndex(0);
    setAbilityCard(null);
    setError("");
  }

  function usePlayerName() {
    const cleanName = playerName.trim() || "Player";
    localStorage.setItem(PLAYER_NAME_KEY, cleanName);
    setPlayerName(cleanName);
    return cleanName;
  }

  function enterRoom(state, token) {
    storeRoomToken(state.roomCode, token);
    setRoomToken(token);
    setJoinCode(state.roomCode);
    setGame(state);
    latestGame.current = state;
    setError("");
    window.history.replaceState(null, "", `/skull-king?room=${state.roomCode}`);
  }

  async function createRoom() {
    setBusy(true);
    setError("");
    try {
      const payload = await SkullKingRoomService.create(usePlayerName());
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
      const savedToken = getStoredRoomToken(code);
      if (savedToken) {
        try {
          const state = await SkullKingRoomService.load(code, savedToken);
          enterRoom(state, savedToken);
          return;
        } catch (roomError) {
          if (!isStaleRoomCredentialError(roomError)) throw roomError;
          removeStoredRoomToken(code);
        }
      }
      const payload = await SkullKingRoomService.join(code, usePlayerName());
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
      const next = await SkullKingRoomService.action(current.roomCode, roomToken, action, values);
      setGame(next);
      latestGame.current = next;
    } catch (roomError) {
      setError(roomError instanceof Error ? roomError.message : "The room could not be updated.");
    }
  }

  function leaveGame() {
    setGame(null);
    latestGame.current = null;
    setRoomToken("");
    setJoinCode("");
    setChoiceCardId(null);
    setTigressCardId(null);
    setWildCardId(null);
    setPendingPlayPlayerIndex(0);
    setAbilityCard(null);
    setError("");
    window.history.replaceState(null, "", "/skull-king");
  }

  function copyInvite() {
    if (!game?.roomCode) return;
    void navigator.clipboard.writeText(`${window.location.origin}/skull-king?room=${game.roomCode}`);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  function updateGame(roomActionName, values, localUpdater) {
    if (game?.roomCode) void roomAction(roomActionName, values);
    else setGame(localUpdater);
  }

  function playHumanCard(card, playerIndex = game.viewerPlayerIndex ?? 0) {
    if (card.type === "wild15" && !getSkullKingLeadSuit(game.trick)) {
      setPendingPlayPlayerIndex(playerIndex);
      setWildCardId(card.id);
      return;
    }
    if (card.kind === "tigress") {
      setPendingPlayPlayerIndex(playerIndex);
      setTigressCardId(card.id);
      return;
    }
    if (card.type === "choice") {
      setPendingPlayPlayerIndex(playerIndex);
      setChoiceCardId(card.id);
      return;
    }
    updateGame("playCard", { cardId: card.id }, (current) => playSkullKingCard(current, playerIndex, card.id));
  }

  function playChoice(value) {
    updateGame("playCard", { cardId: choiceCardId, declaration: value }, (current) => playSkullKingCard(current, pendingPlayPlayerIndex, choiceCardId, value));
    setChoiceCardId(null);
  }

  function playTigress(role) {
    updateGame("playCard", { cardId: tigressCardId, declaration: role }, (current) => playSkullKingCard(current, pendingPlayPlayerIndex, tigressCardId, role));
    setTigressCardId(null);
  }

  function playWild15(suit) {
    updateGame("playCard", { cardId: wildCardId, declaration: suit }, (current) => playSkullKingCard(current, pendingPlayPlayerIndex, wildCardId, suit));
    setWildCardId(null);
  }

  function flipGhostCard() {
    if (!ghost) return;
    if (game.roomCode) {
      void roomAction("playCard", { flipGhost: true });
      return;
    }
    const ghostCard = ghost.hand[0];
    if (!ghostCard) return;
    setGame((current) => playSkullKingCard(current, ghostPlayerIndex, ghostCard.id, getSkullKingGhostDeclaration(ghostCard)));
  }


  if (!game) {
    return (
      <main className="skull-app skull-intro-shell">
        <section className="skull-intro">
          <div className="skull-intro-copy">
            <span className="skull-kicker"><Anchor size={16} /> A trick-taking voyage</span>
            <h1>Claim the crown of the <span>Skull King.</span></h1>
            <p>
              Predict your haul, follow the colors, and unleash Pirates and sea monsters at
              exactly the right moment. Ten rounds. One captain.
            </p>
            <div className="skull-feature-row" aria-label="Game highlights">
              <span><b>10</b> rounds</span>
              <span><b>4</b> suits</span>
              <span><b>3</b> monsters</span>
            </div>
            <div className="skull-setup-row">
              <label>
                <span>Your name</span>
                <input value={playerName} onChange={(event) => setPlayerName(event.target.value)} maxLength={18} placeholder="You" />
              </label>
              <label>
                <span>Players</span>
                <select value={playerCount} onChange={(event) => setPlayerCount(Number(event.target.value))}>
                  {[2, 3, 4, 5, 6, 7, 8, 9].map((count) => <option key={count} value={count}>{count} players</option>)}
                </select>
              </label>
              <button type="button" className="skull-primary" onClick={startGame}>Play with computers <span aria-hidden="true">→</span></button>
            </div>
            <div className="skull-entry-divider"><span>or gather a human crew</span></div>
            <div className="skull-room-entry">
              <button type="button" className="skull-secondary" disabled={busy} onClick={createRoom}><Plus size={17} /> Create a room</button>
              <div className="skull-join-row">
                <input
                  value={joinCode}
                  onChange={(event) => setJoinCode(event.target.value.toUpperCase())}
                  onKeyDown={(event) => event.key === "Enter" && joinRoom()}
                  maxLength={5}
                  placeholder="ROOM CODE"
                  aria-label="Room code"
                />
                <button type="button" disabled={busy} onClick={joinRoom}><UserPlus size={16} /> Join</button>
              </div>
            </div>
            {error && <div className="skull-error" role="alert">{error}</div>}
            <button type="button" className="skull-text-button" onClick={() => setRulesOpen(true)}><BookOpen size={16} /> How to play</button>
          </div>

          <div className="skull-card-art" aria-label="Skull King cards at sea">
            <div className="art-moon" />
            <div className="art-wave wave-one" />
            <div className="art-wave wave-two" />
            <SkullCard card={{ id: "art-purple", type: "number", suit: "purple", rank: 14, bonus: 10 }} className="skull-art-card art-purple" />
            <SkullCard card={{ id: "art-king", type: "special", kind: "skullKing" }} className="skull-art-card art-pirate" />
            <SkullCard card={{ id: "art-black", type: "number", suit: "black", rank: 14, bonus: 20 }} className="skull-art-card art-black" />
            <span className="art-banner">Bid true. Sail bold.</span>
          </div>
        </section>
        <RulesDialog open={rulesOpen} onClose={() => setRulesOpen(false)} />
      </main>
    );
  }

  if (game.phase === "lobby") {
    return (
      <SkullKingLobby
        game={game}
        copied={copied}
        error={error}
        onCopy={copyInvite}
        onLeave={leaveGame}
        onAction={roomAction}
        onRules={() => setRulesOpen(true)}
        rulesOpen={rulesOpen}
        onCloseRules={() => setRulesOpen(false)}
      />
    );
  }

  const viewerPlayerIndex = game.viewerPlayerIndex ?? 0;
  const viewer = game.players[viewerPlayerIndex];
  const ghostPlayerIndex = getSkullKingGhostIndex(game);
  const ghost = ghostPlayerIndex >= 0 ? game.players[ghostPlayerIndex] : null;
  const ghostControllerIndex = ghost ? getSkullKingGhostControllerIndex(game) : null;
  const yourTurn = game.currentPlayerIndex === viewerPlayerIndex
    || (game.currentPlayerIndex === ghostPlayerIndex && ghostControllerIndex === viewerPlayerIndex);
  const legalIds = new Set(
    ["playing", "lastVolley"].includes(game.phase) && game.currentPlayerIndex === viewerPlayerIndex
      ? getLegalSkullKingCards(game, viewerPlayerIndex).map((card) => card.id)
      : []
  );
  const canChooseGhostCard = Boolean(
    ghost
    && ["playing", "lastVolley"].includes(game.phase)
    && game.currentPlayerIndex === ghostPlayerIndex
    && ghostControllerIndex === viewerPlayerIndex
  );

  return (
    <main className="skull-app skull-game-shell tbl-felt-shell">
      <header className="skull-gamebar">
        <div className="gamebar-title">
          <span className="gamebar-anchor"><Anchor size={19} /></span>
          <div><strong>Skull King</strong><small>{game.roomCode ? `Room ${game.roomCode} · ` : ""}Round {game.roundNumber} of 10 · {game.captainCount ?? game.playerCount} captains</small></div>
        </div>
        <div className="skull-gamebar-actions">
          {game.roomCode && <button type="button" onClick={copyInvite}><Copy size={16} /> {copied ? "Copied" : "Invite"}</button>}
          <button type="button" onClick={() => setRulesOpen(true)}><BookOpen size={16} /> Rules</button>
          <button type="button" onClick={leaveGame}>{game.roomCode ? <DoorOpen size={16} /> : <RotateCcw size={16} />} {game.roomCode ? "Leave game" : "New game"}</button>
        </div>
      </header>

      <section className="skull-table tbl-felt-fit" aria-label="Skull King game table">
        <SkullKingTable
          game={game}
          viewerIndex={viewerPlayerIndex}
          dock={game.phase === "bidding" && viewer.bid === null ? (
            /* The auction goes in the middle of the table and is gone the moment
               you lock, which is what the crew's chairs then say for you. */
            <div className="tbl-felt-dock wide skull-bid-dock">
              <h2>How many tricks?</h2>
              <p>You have {game.roundNumber} {game.roundNumber === 1 ? "card" : "cards"}. Hit your bid exactly to score.</p>
              <div className="bid-options">
                {Array.from({ length: game.roundNumber + 1 }, (unused, value) => (
                  <button key={value} type="button" className={bid === value ? "selected" : ""} onClick={() => setBid(value)}>{value}</button>
                ))}
              </div>
              <button type="button" className="skull-primary full" onClick={() => updateGame("bid", { bid }, (current) => submitSkullKingBid(current, viewerPlayerIndex, bid))}>
                Lock bid at {bid}
              </button>
            </div>
          ) : null}
        />
      </section>

      <p className="skull-message" role="status">{game.message}</p>

      <section className="skull-your-seat">
        <div className="skull-turn-label">
          <span className={`turn-beacon ${yourTurn && ["playing", "lastVolley"].includes(game.phase) ? "on" : ""}`} />
          {game.phase === "bidding"
            ? viewer.bid === null ? "Study your hand, then make your bid" : "Your bid is locked"
            : game.phase === "pirateAbility"
              ? `${game.pendingPirateAbility.pirateName} is using an ability`
            : game.phase === "walkThePlank"
                ? "A Pirate must walk the plank"
                : game.currentPlayerIndex === viewerPlayerIndex && game.phase === "lastVolley"
                  ? "Your Last Volley: play one more card"
                : game.currentPlayerIndex === viewerPlayerIndex && game.phase === "playing"
                ? "Your turn, Captain"
                : game.currentPlayerIndex === ghostPlayerIndex && ghostControllerIndex === viewerPlayerIndex
                  ? "Your turn to flip Graybeard’s top card"
                : game.currentPlayerIndex !== null ? `Waiting for ${game.players[game.currentPlayerIndex].name}` : "The crew is playing"}
          <small>{viewer.bid === null ? "" : `Bid ${viewer.bid} · Won ${viewer.tricks}`}</small>
        </div>
        {error && <div className="skull-error game-error" role="alert">{error}</div>}
        <div className="skull-hand" aria-label="Your hand">
          {viewer.hand.map((card, index) => {
            const playable = legalIds.has(card.id);
            /* A card dims to mark it unplayable, which only means something
               while a trick is actually being played — every card in your
               hand reads as "unplayable" during bidding, ghost turns, and
               the rest, and that is exactly when you most need to read them
               clearly to size up your hand. */
            const dim = ["playing", "lastVolley"].includes(game.phase) && !playable;
            const cardHelp = getSkullKingCardHelp(card);
            return (
              <div key={card.id} className="skull-hand-item" style={{ "--card-index": index }}>
                <button
                  type="button"
                  className={`skull-hand-card ${playable ? "playable" : ""} ${dim ? "dim" : ""} ${game.forcedPlay?.playerIndex === viewerPlayerIndex && game.forcedPlay.cardId === card.id ? "forced" : ""}`}
                  disabled={!playable}
                  onClick={() => playHumanCard(card)}
                  aria-label={`${formatSkullKingCard(card)}${playable ? ", playable" : ""}`}
                >
                  <SkullCard card={card} />
                </button>
                {cardHelp && (
                  <button
                    type="button"
                    className="skull-card-help-link"
                    onClick={() => setAbilityCard(card)}
                    aria-label={`Explain ${formatSkullKingCard(card)}`}
                  >
                    What does this do?
                  </button>
                )}
              </div>
            );
          })}
        </div>
        {ghost && (
          <div className={`skull-ghost-area ${game.currentPlayerIndex === ghostPlayerIndex ? "active" : ""}`}>
            <div className="skull-ghost-heading">
              <span className="ghost-mark">G</span>
              <div>
                <strong>Hidden Ghost Crew hand</strong>
                <small>{game.currentPlayerIndex === ghostPlayerIndex
                  ? ghostControllerIndex === viewerPlayerIndex
                    ? "Flip the top card—it does not have to follow suit"
                    : `${game.players[ghostControllerIndex].name} flips the top card`
                  : `${game.players[ghostControllerIndex].name} flips for Graybeard this trick`}</small>
              </div>
            </div>
            <div className="skull-ghost-hand" aria-label="Ghost Crew hand">
              <button
                type="button"
                className={`skull-ghost-card-back ${canChooseGhostCard ? "playable" : ""}`}
                disabled={!canChooseGhostCard}
                onClick={flipGhostCard}
                aria-label={`Flip the top Ghost Crew card; ${ghost.handCount ?? ghost.hand.length} cards remain`}
              >
                <span>☠</span><small>Flip top card</small><b>{ghost.handCount ?? ghost.hand.length}</b>
              </button>
            </div>
          </div>
        )}
      </section>

      {choiceCardId && <ChoiceDialog card={game.players[pendingPlayPlayerIndex]?.hand.find((card) => card.id === choiceCardId)} onChoose={playChoice} onClose={() => setChoiceCardId(null)} />}
      {tigressCardId && <TigressDialog onChoose={playTigress} onClose={() => setTigressCardId(null)} />}
      {wildCardId && <Wild15Dialog onChoose={playWild15} onClose={() => setWildCardId(null)} />}
      {game.phase === "walkThePlank" && decisionControllerIndex(game, game.pendingWalkThePlank?.playerIndex) === viewerPlayerIndex && (
        <WalkThePlankDialog game={game} onChoose={(cardId) => updateGame("walkThePlank", { cardId }, (current) => resolveWalkThePlank(current, cardId))} />
      )}
      {game.phase === "pirateAbility" && game.pendingPirateAbility?.playerIndex !== ghostPlayerIndex && decisionControllerIndex(game, game.pendingPirateAbility?.playerIndex) === viewerPlayerIndex && (
        <PirateAbilityDialog
          game={game}
          onResolve={(choice) => updateGame("pirateAbility", { choice }, (current) => resolveSkullKingPirateAbility(current, choice))}
        />
      )}
      {game.phase === "roundComplete" && (
        <RoundDialog
          game={game}
          canContinue={!game.roomCode || game.hostControls}
          onContinue={() => updateGame("nextRound", {}, (current) => startNextSkullKingRound(current))}
        />
      )}
      {game.phase === "gameOver" && (
        <GameOverDialog
          game={game}
          viewerPlayerIndex={viewerPlayerIndex}
          canRestart={!game.roomCode || game.hostControls}
          onRestart={() => game.roomCode ? roomAction("restart") : startGame()}
          onExit={leaveGame}
        />
      )}
      {abilityCard && <CardAbilityDialog card={abilityCard} onClose={() => setAbilityCard(null)} />}
      <RulesDialog open={rulesOpen} onClose={() => setRulesOpen(false)} />
    </main>
  );
}

function SkullKingLobby({ game, copied, error, onCopy, onLeave, onAction, onRules, rulesOpen, onCloseRules }) {
  const canStart = game.players.length >= 2 && game.players.length <= 9;
  return (
    <main className="skull-app skull-intro-shell skull-lobby-shell">
      <section className="skull-lobby-card">
        <span className="skull-kicker"><Users size={16} /> Gather the crew</span>
        <h1>Skull <span>King</span></h1>
        <p>Invite two to nine captains. Two-player voyages add Graybeard&apos;s hidden hand; flip only its top card whenever his turn arrives.</p>

        <div className="skull-room-code">
          <span>Room code</span>
          <strong>{game.roomCode}</strong>
          <button type="button" onClick={onCopy}><Copy size={16} /> {copied ? "Copied" : "Copy invite"}</button>
        </div>

        <div className="skull-lobby-players">
          {game.players.map((player, index) => (
            <div key={player.playerId}>
              <span className="skull-avatar">{player.name.slice(0, 1).toUpperCase()}</span>
              <strong>{player.name}{player.isViewer ? " · You" : ""}</strong>
              <small>{index === 0 ? "Host" : player.isComputer ? "Computer" : "Ready"}</small>
              {player.isComputer && game.hostControls && <button type="button" onClick={() => onAction("removeComputer", { playerId: player.playerId })}><X size={14} /> Remove</button>}
            </div>
          ))}
        </div>

        {game.players.length < 9 && game.hostControls && (
          <button type="button" className="skull-add-computer" onClick={() => onAction("addComputer")}><UserPlus size={17} /> Add computer</button>
        )}

        <div className="skull-lobby-summary"><span>{game.players.length} captains</span>{game.players.length === 2 && <span>+ Ghost Crew</span>}<span>10 rounds</span><span>Private hands</span></div>
        {game.hostControls ? (
          <button type="button" className="skull-primary skull-lobby-start" disabled={!canStart} onClick={() => onAction("start")}><Play size={18} /> Start game</button>
        ) : (
          <p className="skull-lobby-waiting">Waiting for the host to start the voyage…</p>
        )}
        {!canStart && game.hostControls && <p className="skull-lobby-waiting">Invite another player or add a computer to set sail.</p>}
        {error && <div className="skull-error" role="alert">{error}</div>}
        <div className="skull-lobby-footer"><button type="button" onClick={onRules}><BookOpen size={16} /> Rules</button><button type="button" onClick={onLeave}><DoorOpen size={16} /> Leave game</button></div>
      </section>
      <RulesDialog open={rulesOpen} onClose={onCloseRules} />
    </main>
  );
}

/*
 * The crew, sitting round the felt.
 *
 * What this replaced: a scoreboard listing every captain above the table, a rail
 * of opponents across the top of it, and a row of played cards each captioned
 * with a name in 12px type. Every name was printed three times and none of the
 * three said where anyone was sitting.
 *
 * A bid is the whole game here, so it goes on the chair rather than in a
 * scoreboard somewhere else: what you said you would take, against what you have
 * taken. The lead suit is what constrains the card you may play, so it takes the
 * middle of the felt.
 */
function SkullKingTable({ game, viewerIndex, dock }) {
  const played = new Map(game.trick.map((play) => [play.playerIndex, play.card]));
  const leadSuit = game.trick.length ? getSkullKingLeadSuit(game.trick) : null;
  /* A bigger card at the table most games actually draw: 2 to 8 captains still
     have room to spare at the sizes the shared table solves for. Nine does
     not — the crowded tier is already down to a quarter less plate and gap to
     fit them, so it keeps the sizes it was solved for rather than reclaiming
     that margin. */
  const bigCard = game.playerCount > 8 ? { w: 58, h: 80 } : game.playerCount > 6 ? { w: 76, h: 106 } : { w: 75, h: 104 };

  return (
    <SeatedTable
      count={game.playerCount}
      viewerIndex={viewerIndex}
      className="skull-felt"
      table={bigCard ? { wide: { card: bigCard } } : undefined}
      dock={dock}
      middle={(
        <b
          className={`tbl-felt-mark skull-lead ${leadSuit || ""}`}
          title={game.trick.length ? `Leading: ${getLeadLabel(game)}` : "Nobody has led yet"}
        >
          {leadSuit ? SKULL_KING_SUIT_DETAILS[leadSuit].symbol : "\u2693"}
        </b>
      )}
      foot={(
        <small className="tbl-felt-meta">
          {`Trick ${game.trickNumber} / ${game.roundNumber}`}
        </small>
      )}
    >
      {({ layout, seatStyle, cardStyle }) => (
        <>
          {layout.map((spot) => {
            const card = played.get(spot.index);
            if (!card) return null;
            return (
              <PlayedCard
                key={`${spot.index}-${card.id}`}
                style={cardStyle(spot.index)}
              >
                <SkullCard card={card} />
              </PlayedCard>
            );
          })}

          {layout.map((spot) => {
            const player = game.players[spot.index];
            return (
              <Seat
                key={player.id}
                spot={spot}
                style={seatStyle(spot.index)}
                name={player.name}
                avatar={player.isComputer ? <Bot size={14} /> : player.name.slice(0, 1).toUpperCase()}
                note={player.isGhost ? "ghost crew" : `${player.score} pts`}
                hand={player.handCount ?? player.hand?.length ?? 0}
                tone={[
                  game.currentPlayerIndex === spot.index ? "turn" : "",
                  player.isGhost ? "out" : "",
                ].filter(Boolean).join(" ")}
                marks={[
                  spot.index === game.dealerIndex && { key: "deal", label: "D", title: "Dealer", tone: "deal" },
                  player.wager > 0 && { key: "wager", label: player.wager, title: `Wagered ${player.wager}`, tone: "lead" },
                ].filter(Boolean)}
              >
                {/* Taken against called. Everything in Skull King is whether those
                    two numbers match, so it is the pill rather than the second
                    line of the plate — the second line is what a full table
                    drops, and this is the last thing that should go. */}
                {!player.isGhost && (
                  <span className={`tbl-chair-pill ${player.bid === null ? "quiet" : ""}`}>
                    {player.bid === null ? "no bid" : `${player.tricks} / ${player.bid}`}
                  </span>
                )}
              </Seat>
            );
          })}
        </>
      )}
    </SeatedTable>
  );
}

function SkullCard({ card, className = "" }) {
  if (card.type === "special") {
    const details = SKULL_KING_SPECIALS[card.kind];
    const characterArt = getSkullKingCardArt(card);
    return (
      <div className={`skull-playing-card special ${card.kind} ${characterArt ? "illustrated-character" : ""} ${card.declaredRole ? `${card.declaredRole}-role` : ""} ${className}`}>
        <span className="skull-card-corner">{details.symbol}</span>
        {characterArt
          ? <span className="card-illustration character-illustration" style={{ backgroundImage: `url("${characterArt}")` }} aria-hidden="true" />
          : <span className="special-art">{details.symbol}</span>}
        <strong>{card.kind === "pirate" && card.name ? card.name : details.label}</strong>
        <small>{card.kind === "pirate" && card.abilityShort ? card.abilityShort : card.kind === "tigress" && card.declaredRole ? `Playing as ${card.declaredRole}` : specialTagline(card.kind)}</small>
      </div>
    );
  }
  if (card.type === "wild15") {
    const suit = card.declaredSuit ? SKULL_KING_SUIT_DETAILS[card.declaredSuit] : null;
    const cardArt = getSkullKingCardArt(card);
    return (
      <div className={`skull-playing-card suit-card wild15 ${card.declaredSuit || ""} ${className}`}>
        <span className="skull-card-corner"><b>15</b><i>{suit?.symbol || "✶"}</i></span>
        <span className="card-illustration suit-illustration" style={{ backgroundImage: `url("${cardArt}")` }} aria-hidden="true" />
        <small>{suit ? suit.label : "Wild Monkey"}</small>
        <span className="expansion-mark">EXP</span>
      </div>
    );
  }
  const details = SKULL_KING_SUIT_DETAILS[card.suit];
  const rank = card.type === "choice" ? (card.declaredValue ?? "0/14") : card.rank;
  const cardArt = getSkullKingCardArt(card);
  return (
    <div className={`skull-playing-card suit-card ${card.suit} ${card.type === "choice" ? "choice" : ""} ${className}`}>
      <span className="skull-card-corner"><b>{rank}</b><i>{details.symbol}</i></span>
      <span className="card-illustration suit-illustration" style={{ backgroundImage: `url("${cardArt}")` }} aria-hidden="true" />
      <small>{card.type === "choice" ? "Choose high or low" : details.label}</small>
      {card.bonus !== 0 && <span className={`bonus-ribbon ${card.bonus < 0 ? "penalty" : ""}`}>{card.bonus > 0 ? "+" : ""}{card.bonus}</span>}
      {card.expansion && <span className="expansion-mark">EXP</span>}
    </div>
  );
}

function PirateAbilityDialog({ game, onResolve }) {
  const pending = game.pendingPirateAbility;
  const player = game.players[pending.playerIndex];
  const [discardCardIds, setDiscardCardIds] = useState([]);

  function toggleDiscard(cardId) {
    setDiscardCardIds((selected) => selected.includes(cardId)
      ? selected.filter((id) => id !== cardId)
      : selected.length < pending.drawnCardIds.length ? [...selected, cardId] : selected);
  }

  return (
    <div className="skull-modal-backdrop">
      <section className="pirate-ability-dialog" role="dialog" aria-modal="true" aria-labelledby="pirate-ability-title">
        <span className="panel-kicker">Pirate ability</span>
        <h2 id="pirate-ability-title">{pending.pirateName}</h2>
        <p>{pending.ability}</p>

        {pending.pirateKey === "rosie" && (
          <div className="pirate-choice-grid">
            {game.players.map((candidate) => (
              <button key={candidate.id} type="button" onClick={() => onResolve({ leaderIndex: candidate.id })}>
                <span className="skull-avatar">{candidate.name.slice(0, 1)}</span>
                <strong>{candidate.name}</strong>
                <small>Lead next</small>
              </button>
            ))}
          </div>
        )}

        {pending.pirateKey === "bendt" && (
          <>
            <div className="bendt-draw-note">Drawn cards are marked with gold. Choose {pending.drawnCardIds.length} cards to discard.</div>
            <div className="pirate-discard-hand">
              {player.hand.map((card) => (
                <button
                  key={card.id}
                  type="button"
                  className={`${discardCardIds.includes(card.id) ? "selected" : ""} ${pending.drawnCardIds.includes(card.id) ? "drawn" : ""}`}
                  onClick={() => toggleDiscard(card.id)}
                  aria-pressed={discardCardIds.includes(card.id)}
                >
                  <SkullCard card={card} />
                </button>
              ))}
            </div>
            <button
              type="button"
              className="skull-primary full"
              disabled={discardCardIds.length !== pending.drawnCardIds.length}
              onClick={() => onResolve({ discardCardIds })}
            >
              Discard {discardCardIds.length} of {pending.drawnCardIds.length}
            </button>
          </>
        )}

        {pending.pirateKey === "rascal" && (
          <div className="pirate-number-choices">
            {[0, 10, 20].map((wager) => (
              <button key={wager} type="button" onClick={() => onResolve({ wager })}>
                <b>{wager}</b><span>{wager ? "point wager" : "No wager"}</span>
              </button>
            ))}
          </div>
        )}

        {pending.pirateKey === "juanita" && (
          <>
            <div className="undealt-preview">
              {game.drawPile.map((card) => <span key={card.id}>{formatSkullKingCard(card)}</span>)}
              {!game.drawPile.length && <em>No undealt cards remain.</em>}
            </div>
            <button type="button" className="skull-primary full" onClick={() => onResolve({})}>I&apos;ve seen enough</button>
          </>
        )}

        {pending.pirateKey === "harry" && (
          <div className="pirate-number-choices">
            {[player.bid - 1, player.bid, player.bid + 1].filter((nextBid) => nextBid >= 0 && nextBid <= game.roundNumber).map((nextBid) => (
              <button key={nextBid} type="button" onClick={() => onResolve({ bid: nextBid })}>
                <b>{nextBid}</b><span>{nextBid === player.bid ? "Keep bid" : nextBid < player.bid ? "Lower bid" : "Raise bid"}</span>
              </button>
            ))}
          </div>
        )}

        {pending.pirateKey === "mary" && (
          <div className="pirate-choice-grid">
            {game.players.filter((candidate) => !candidate.isGhost && (candidate.handCount ?? candidate.hand.length) > 0).map((candidate) => (
              <button key={candidate.id} type="button" onClick={() => onResolve({ targetPlayerIndex: candidate.id })}>
                <span className="skull-avatar">{candidate.name.slice(0, 1)}</span>
                <strong>{candidate.name}</strong>
                <small>Force a random card</small>
              </button>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function Wild15Dialog({ onChoose, onClose }) {
  return (
    <div className="skull-modal-backdrop">
      <section className="choice-dialog wild15-dialog" role="dialog" aria-modal="true" aria-labelledby="wild15-title">
        <button type="button" className="skull-modal-close" onClick={onClose} aria-label="Close"><X size={19} /></button>
        <span className="panel-kicker">Wild Monkey 15</span>
        <h2 id="wild15-title">Choose its suit.</h2>
        <p>The Wild 15 may be green, yellow, or purple—never black trump.</p>
        <div className="wild-suit-choices">
          {["green", "yellow", "purple"].map((suit) => (
            <button key={suit} type="button" className={suit} onClick={() => onChoose(suit)}>
              <b>{SKULL_KING_SUIT_DETAILS[suit].symbol}</b><span>{SKULL_KING_SUIT_DETAILS[suit].label}</span>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}

function WalkThePlankDialog({ game, onChoose }) {
  const eligible = game.trick.filter((play) => game.pendingWalkThePlank.pirateCardIds.includes(play.card.id));
  return (
    <div className="skull-modal-backdrop">
      <section className="pirate-ability-dialog" role="dialog" aria-modal="true" aria-labelledby="plank-title">
        <span className="panel-kicker">Walk the Plank</span>
        <h2 id="plank-title">Choose a Pirate to remove.</h2>
        <p>The Pirate is removed before the trick is resolved and cannot provide a capture bonus.</p>
        <div className="plank-card-choices">
          {eligible.map((play) => (
            <button key={play.card.id} type="button" onClick={() => onChoose(play.card.id)}>
              <SkullCard card={play.card} />
              <strong>{game.players[play.playerIndex].name}</strong>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}

function TigressDialog({ onChoose, onClose }) {
  return (
    <div className="skull-modal-backdrop">
      <section className="choice-dialog tigress-dialog" role="dialog" aria-modal="true" aria-labelledby="tigress-title">
        <button type="button" className="skull-modal-close" onClick={onClose} aria-label="Close"><X size={19} /></button>
        <span className="panel-kicker">Tigress</span>
        <h2 id="tigress-title">Fight or flee?</h2>
        <p>Declare her role now. She takes on every characteristic—and capture bonus—of that role for this trick.</p>
        <div className="choice-actions">
          <button type="button" onClick={() => onChoose("escape")}><b>⚑</b><span>Play as Escape</span></button>
          <button type="button" onClick={() => onChoose("pirate")}><b>☠</b><span>Play as Pirate</span></button>
        </div>
      </section>
    </div>
  );
}

function specialTagline(kind) {
  return {
    escape: "Slip away",
    doubloon: "A 20-point alliance",
    mermaid: "Lures the Skull King",
    pirate: "Takes numbered cards",
    tigress: "Pirate or Escape",
    skullKing: "Rules the Pirates",
    firstMate: "Commands captured Pirates",
    kraken: "Destroy the trick",
    whiteWhale: "Highest number wins",
    spottedStingray: "Lowest number wins",
    walkThePlank: "Remove a Pirate",
    lastVolley: "Play one more card",
    davyJones: "Destroy Sea Monsters",
  }[kind];
}

function getLeadLabel(game) {
  if (!game.trick.length) return "not set";
  const suit = getSkullKingLeadSuit(game.trick);
  return suit ? SKULL_KING_SUIT_DETAILS[suit].label : "open waters";
}

function ChoiceDialog({ card, onChoose, onClose }) {
  if (!card) return null;
  const suit = SKULL_KING_SUIT_DETAILS[card.suit].label;
  return (
    <div className="skull-modal-backdrop">
      <section className="choice-dialog" role="dialog" aria-modal="true" aria-labelledby="choice-title">
        <button type="button" className="skull-modal-close" onClick={onClose} aria-label="Close"><X size={19} /></button>
        <span className="panel-kicker">Wild {suit}</span>
        <h2 id="choice-title">Play it high or low?</h2>
        <p>This card follows {suit}, but it never earns a 14-card bonus.</p>
        <div className="choice-actions">
          <button type="button" onClick={() => onChoose(0)}><b>0</b><span>Play low</span></button>
          <button type="button" onClick={() => onChoose(14)}><b>14</b><span>Play high</span></button>
        </div>
      </section>
    </div>
  );
}

function CardAbilityDialog({ card, onClose }) {
  const help = getSkullKingCardHelp(card);
  if (!help) return null;

  return (
    <div className="skull-modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="card-ability-dialog" role="dialog" aria-modal="true" aria-labelledby="card-ability-title">
        <button type="button" className="skull-modal-close" onClick={onClose} aria-label="Close card ability"><X size={20} /></button>
        <span className="panel-kicker">Card ability</span>
        <div className="card-ability-content">
          <SkullCard card={card} className="ability-preview-card" />
          <div>
            <h2 id="card-ability-title">{help.title}</h2>
            <p>{help.summary}</p>
            <ul>
              {help.details.map((detail) => <li key={detail}>{detail}</li>)}
            </ul>
          </div>
        </div>
        <button type="button" className="skull-primary full" onClick={onClose}>Got it</button>
      </section>
    </div>
  );
}

function RulesDialog({ open, onClose }) {
  if (!open) return null;
  return (
    <div className="skull-modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="skull-rules-dialog" role="dialog" aria-modal="true" aria-labelledby="skull-rules-title">
        <button type="button" className="skull-modal-close" onClick={onClose} aria-label="Close rules"><X size={20} /></button>
        <span className="panel-kicker">Captain&apos;s guide</span>
        <h2 id="skull-rules-title">Bid true. Take exactly that many tricks.</h2>
        <p>There are ten rounds. Round one deals one card to each player, round two deals two, and so on. The player left of the dealer leads; the trick winner leads next.</p>
        <div className="rules-grid">
          <div><span className="rule-icon green">✶</span><strong>Four suits</strong><p>Follow the led suit when you can. Black trumps green, yellow, and purple. Specials may always be played.</p></div>
          <div><span className="rule-icon pirate">☠</span><strong>Royal hierarchy</strong><p>Mermaids beat numbers and the Skull King. Pirates beat Mermaids. The Skull King beats Pirates—but is always lured by a Mermaid.</p></div>
          <div><span className="rule-icon tigress">◐</span><strong>Tigress chooses</strong><p>When played, declare her as a Pirate or an Escape. She takes on that role&apos;s hierarchy and character bonuses for the trick.</p></div>
          <div><span className="rule-icon ghost">G</span><strong>Graybeard&apos;s Ghost</strong><p>Deal a third face-down hand and alternate which human starts each round. Flip Graybeard&apos;s top card second without following suit. The trick winner leads next; if Graybeard wins, he leads and the prior human leader plays second. He never bids or scores, and his Tigress is always an Escape.</p></div>
          <div><span className="rule-icon monster">⌘</span><strong>Last monster rules</strong><p>When several monsters appear, only the last one played has an effect on the trick.</p></div>
          <div><span className="rule-icon bonus">+20</span><strong>Treasure the 14s</strong><p>Captured green, yellow, and purple 14s are worth +10. The black 14 is +20. Bonuses score only with an exact bid.</p></div>
          <div><span className="rule-icon wild">15</span><strong>Wild Monkey 15</strong><p>It adopts green, yellow, or purple—never black. It follows an existing non-black lead automatically and is highest under White Whale.</p></div>
          <div><span className="rule-icon expansion">7/8</span><strong>Expansion numbers</strong><p>Each suit has a second 7 and 8. Capturing the expansion 7 gives −5; capturing its 8 gives +5 when the bid is exact.</p></div>
          <div><span className="rule-icon mermaid">♆</span><strong>Character bonuses</strong><p>Pirate takes Mermaid: +20. Skull King takes each Pirate: +30. Mermaid takes Skull King: +40.</p></div>
          <div><span className="rule-icon doubloon">◉</span><strong>Doubloon alliance</strong><p>It plays as an Escape. Its player and the trick winner each earn +20 when both make their bids. Winning your own Doubloon forms no alliance.</p></div>
        </div>
        <div className="monster-rules">
          <p><b>Kraken</b> destroys the trick. No one wins; the player to its left leads next.</p>
          <p><b>White Whale</b> nullifies specials and suits; the highest number wins. All-special tricks have no winner.</p>
          <p><b>Spotted Stingray</b> nullifies specials and suits; the lowest number wins. Among several Sea Monsters, only the last played applies.</p>
          <p><b>Davy Jones’ Locker</b> destroys every Sea Monster instead and awards its player +20 per creature when their bid is exact.</p>
        </div>
        <div className="named-pirate-rules">
          <strong>The six Pirates</strong>
          <p className="pirate-rule-note">A Pirate unlocks its ability only when it wins the trick. Only Harry may act after the round&apos;s final trick.</p>
          <p><b>Rosie D’ Laney</b> chooses who leads next.</p>
          <p><b>Bendt the Bandit</b> draws two cards, then discards two.</p>
          <p><b>Rascal of Roatan</b> wagers 0, 10, or 20 points on making the bid.</p>
          <p><b>Juanita Jade</b> privately inspects the undealt deck.</p>
          <p><b>Harry the Giant</b> adjusts the bid by −1, 0, or +1.</p>
          <p><b>Mary Thorne</b> forces a randomly selected card from any player&apos;s hand into the next trick.</p>
        </div>
        <div className="expansion-rules">
          <strong>Expansion tactics</strong>
          <p><b>Two players</b> remove Loot/Doubloons, the Wild 15, Walk the Plank, and every 0/14 choice card before dealing.</p>
          <p><b>First Mate Con</b> beats Pirates but loses to Mermaids and the Skull King. When he wins, he may use every captured named Pirate ability. A Mermaid or Skull King capturing Con earns +30.</p>
          <p><b>Walk the Plank</b> cannot win. Its player removes one Pirate before resolving the trick.</p>
          <p><b>The Last Volley</b> cannot win. Its player adds a second card after everyone plays, then skips the final trick.</p>
        </div>
        <p className="rules-footnote">Exact nonzero bid: 20 points per trick plus captured bonuses. Miss a nonzero bid: lose 10 points per trick off. Bid zero: gain 10 × the round if correct, or lose that amount if you take a trick. Each suit also has a 0/14 choice card; choose its value when played, but it has no bonus.</p>
        <button type="button" className="skull-primary full" onClick={onClose}>Back to the ship</button>
      </section>
    </div>
  );
}

function RoundDialog({ game, canContinue, onContinue }) {
  return (
    <div className="skull-modal-backdrop">
      <section className="skull-round-dialog" role="dialog" aria-modal="true" aria-labelledby="skull-round-title">
        <span className="panel-kicker">Round {game.roundNumber} complete</span>
        <h2 id="skull-round-title">The bids are settled.</h2>
        <div className="round-results">
          {game.players.filter((player) => !player.isGhost).sort((a, b) => b.score - a.score).map((player) => {
            const points = game.roundSummary.points[player.id];
            return (
              <div key={player.id}>
                <span className="skull-avatar">{player.name.slice(0, 1)}</span>
                <strong>{player.name}</strong>
                <small>
                  Bid {player.bid} · Won {player.tricks}
                  {player.roundBonus ? player.bid === player.tricks ? ` · Bonus ${signed(player.roundBonus)}` : ` · ${signed(player.roundBonus)} adjustment lost` : ""}
                  {player.wager ? ` · Wager ${player.bid === player.tricks ? "+" : "−"}${player.wager}` : ""}
                </small>
                <em className={points >= 0 ? "positive" : "negative"}>{points >= 0 ? "+" : ""}{points}</em>
                <b>{player.score}</b>
              </div>
            );
          })}
        </div>
        {canContinue
          ? <button type="button" className="skull-primary full" onClick={onContinue}>Deal round {game.roundNumber + 1} <span>→</span></button>
          : <p className="skull-lobby-waiting">Waiting for the host to deal round {game.roundNumber + 1}…</p>}
      </section>
    </div>
  );
}

function signed(value) {
  return `${value >= 0 ? "+" : ""}${value}`;
}

function GameOverDialog({ game, viewerPlayerIndex, canRestart, onRestart, onExit }) {
  const winners = game.roundSummary.winnerIndexes.map((index) => game.players[index]);
  const humanWon = winners.some((player) => player.id === viewerPlayerIndex);
  const standings = game.players.filter((player) => !player.isGhost).sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));
  return (
    <div className="skull-modal-backdrop">
      <section className="skull-round-dialog game-over" role="dialog" aria-modal="true" aria-labelledby="skull-game-over-title">
        <span className="panel-kicker">Ten rounds sailed</span>
        <div className="winner-mark">☠</div>
        <h2 id="skull-game-over-title">{humanWon ? "You are the Skull King." : `${winners.map((player) => player.name).join(" & ")} takes the crown.`}</h2>
        <p>{humanWon ? "Your bids held fast through every storm." : "Another voyage could change the tide."}</p>
        <ol className="final-standings" aria-label="Final scores">
          {standings.map((player, index) => {
            const place = standings.findIndex((candidate) => candidate.score === player.score) + 1;
            const isWinner = winners.some((winner) => winner.id === player.id);
            return (
              <li key={player.id} className={isWinner ? "winner" : ""}>
                <span className="final-place">{isWinner ? "♛" : place}</span>
                <span className="skull-avatar">{player.name.slice(0, 1)}</span>
                <strong>{player.name}</strong>
                <b>{player.score} points</b>
              </li>
            );
          })}
        </ol>
        <div className="dialog-actions">
          {canRestart && <button type="button" className="skull-primary" onClick={onRestart}>Play again</button>}
          {!canRestart && game.roomCode && <p className="skull-lobby-waiting">Waiting for the host to start another voyage…</p>}
          <button type="button" className="skull-secondary" onClick={onExit}>{game.roomCode ? "Leave game" : "Change crew"}</button>
        </div>
      </section>
    </div>
  );
}

function roomTokenKey(roomCode) {
  return `skull-king-room-token:${String(roomCode || "").toUpperCase()}`;
}

function getStoredRoomToken(roomCode) {
  const key = roomTokenKey(roomCode);
  const token = localStorage.getItem(key) || sessionStorage.getItem(key) || "";
  if (token) {
    localStorage.setItem(key, token);
    sessionStorage.removeItem(key);
  }
  return token;
}

function storeRoomToken(roomCode, token) {
  const key = roomTokenKey(roomCode);
  localStorage.setItem(key, token);
  sessionStorage.removeItem(key);
}

function removeStoredRoomToken(roomCode) {
  const key = roomTokenKey(roomCode);
  localStorage.removeItem(key);
  sessionStorage.removeItem(key);
}

function isStaleRoomCredentialError(error) {
  const message = error instanceof Error ? error.message : "";
  return message === "Room not found." || message === "Join the room before taking actions.";
}

function decisionControllerIndex(game, decisionPlayerIndex) {
  const ghostIndex = getSkullKingGhostIndex(game);
  return decisionPlayerIndex === ghostIndex
    ? getSkullKingGhostControllerIndex(game)
    : decisionPlayerIndex;
}
