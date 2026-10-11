"use client";

import { useEffect, useRef, useState } from "react";
import {
  Anchor,
  Bot,
  Play,
  Users,
} from "lucide-react";
import { PlayedCard, Seat, SeatedTable } from "./ui/seated-table";
import { getSkullKingCardArt } from "../lib/skull-king-art";
import { getSkullKingCardHelp } from "../lib/skull-king-card-help";
import { SkullKingRoomService } from "./skull-king-room-service";
import {
  SKULL_KING_DECK_MODES,
  SKULL_KING_SPECIALS,
  SKULL_KING_SUIT_DETAILS,
  formatSkullKingCard,
  getLegalSkullKingCards,
  getSkullKingGhostControllerIndex,
  getSkullKingGhostIndex,
  getSkullKingLeadSuit,
} from "../lib/skull-king";
import { ChoiceModal, GameHeader, Hero, Landing, Lobby as SharedLobby } from "./ui/table-shell";
import { orderHand } from "../lib/hand-order";
import CardFan from "./card-fan";
import { computerDelayOf, computerSpeedProp } from "../lib/computer-speed.js";
import { useComputerPacer } from "../lib/use-computer-pacer.js";

const PLAYER_NAME_KEY = "skull-king-player-name";

export default function SkullKingClient() {
  const [playerName, setPlayerName] = useState("");
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
    if (game?.phase === "bidding") setBid(0);
  }, [game?.roundNumber, game?.phase]);

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

  // The host's browser paces the computers by the room's speed (platform/computer-pacing).
  useComputerPacer({
    enabled: Boolean(game?.hostControls),
    due: Boolean(game?.computerDue),
    delayMs: computerDelayOf(game),
    step: () => roomAction("computerStep"),
    key: game?.updatedAt,
  });
  // Props for the speed control in the bar and lobby (null when no computer is seated).
  const computerSpeed = computerSpeedProp({ players: game?.players, delayMs: game?.computerDelayMs, onChange: (ms) => roomAction("setComputerSpeed", { ms }) });

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


  function updateGame(roomActionName, values) {
    void roomAction(roomActionName, values);
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
    updateGame("playCard", { cardId: card.id });
  }

  function playChoice(value) {
    updateGame("playCard", { cardId: choiceCardId, declaration: value });
    setChoiceCardId(null);
  }

  function playTigress(role) {
    updateGame("playCard", { cardId: tigressCardId, declaration: role });
    setTigressCardId(null);
  }

  function playWild15(suit) {
    updateGame("playCard", { cardId: wildCardId, declaration: suit });
    setWildCardId(null);
  }

  function flipGhostCard() {
    if (!ghost) return;
    void roomAction("playCard", { flipGhost: true });
  }


  const rulesDialog = <RulesDialog open={rulesOpen} onClose={() => setRulesOpen(false)} deckMode={game?.deckMode ?? "full"} />;

  if (!game) {
    return <Landing
      gameName="Skull King"
      theme="skull-king-theme"
      hero={<Hero
        kicker="A trick-taking voyage"
        title={<>Claim the crown of the <em>Skull King.</em></>}
        copy="Predict your haul, follow the colors, and unleash Pirates and sea monsters at exactly the right moment. Ten rounds. One captain."
        badges={[{ icon: Anchor, label: "2–9 captains" }, { icon: Bot, label: "Computer crew" }, { icon: Users, label: "10 rounds" }]}
        artLayout="free"
        art={<div className="skull-card-art" aria-label="Skull King cards at sea">
          <div className="art-moon" />
          <div className="art-wave wave-one" />
          <div className="art-wave wave-two" />
          <SkullCard card={{ id: "art-purple", type: "number", suit: "purple", rank: 14, bonus: 10 }} className="skull-art-card art-purple" />
          <SkullCard card={{ id: "art-king", type: "special", kind: "skullKing" }} className="skull-art-card art-pirate" />
          <SkullCard card={{ id: "art-black", type: "number", suit: "black", rank: 14, bonus: 20 }} className="skull-art-card art-black" />
          <span className="art-banner">Bid true. Sail bold.</span>
        </div>}
      />}
      entry={{ name: playerName, setName: setPlayerName, joinCode, setJoinCode, createRoom, joinRoom, busy, error }}
      onRules={() => setRulesOpen(true)}
      dialogs={rulesDialog}
    />;
  }

  if (game.phase === "lobby") {
    const me = game.players.find((player) => player.isViewer) ?? game.players[0];
    const selectedMode = SKULL_KING_DECK_MODES[game.deckMode] ?? SKULL_KING_DECK_MODES.full;
    const canStart = game.players.length >= 2 && game.players.length <= selectedMode.maxPlayers;
    return <SharedLobby computerSpeed={computerSpeed}
      gameName="Skull King"
      theme="skull-king-theme"
      room={{ roomCode: game.roomCode, hostId: game.hostControls ? me.playerId : game.players[0].playerId, players: game.players.map((player) => ({ ...player, id: player.playerId })) }}
      me={{ id: me.playerId }}
      busy={busy}
      error={error}
      min={2}
      max={selectedMode.maxPlayers}
      canStart={canStart}
      seatNote={`${selectedMode.label} · 10 rounds${game.players.length === 2 ? " · + Ghost Crew" : ""}`}
      options={<section className="skull-deck-options" aria-label="Card set">
        <div><strong>Card set</strong><small>{selectedMode.description}</small></div>
        {game.hostControls ? <div className="skull-deck-option-buttons">
          {Object.entries(SKULL_KING_DECK_MODES).map(([value, mode]) => (
            <button type="button" key={value} className={game.deckMode === value ? "selected" : ""} disabled={game.players.length > mode.maxPlayers} onClick={() => roomAction("setDeckMode", { deckMode: value })}>
              <strong>{mode.label}</strong><small>Up to {mode.maxPlayers}</small>
            </button>
          ))}
        </div> : <b>{selectedMode.label}</b>}
      </section>}
      onAdd={() => roomAction("addComputer")}
      onRemove={(id) => roomAction("removeComputer", { playerId: id })}
      onStart={() => roomAction("start")}
      onLeave={leaveGame}
      onRules={() => setRulesOpen(true)}
      rules={rulesDialog}
    />;
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
    <main className="skull-app skull-game-shell tbl-felt-shell skull-king-theme">
      <GameHeader computerSpeed={computerSpeed}
        title="Skull King"
        room={game}
        subtitle={`Round ${game.roundNumber} of 10 · ${game.captainCount ?? game.playerCount} captains`}
        status={game.phase === "finished" ? "Voyage complete" : game.phase === "bidding" ? "Place your bids" : game.phase === "collecting" ? "Trick complete" : yourTurn ? "Your turn" : `${game.players[game.currentPlayerIndex]?.name ?? "…"}'s turn`}
        onRules={() => setRulesOpen(true)}
        onLeave={leaveGame}
      />

      <section className="skull-table tbl-felt-fit" aria-label="Skull King game table">
        <SkullKingTable
          game={game}
          viewerIndex={viewerPlayerIndex}
          dock={game.phase === "collecting" ? (
            <div className="tbl-felt-dock wide skull-bid-dock">
              <h2>Trick complete</h2>
              <p className="skull-trick-result">{trickResultText(game)}</p>
              <p>Review the cards, then clear the trick to continue.</p>
              <button type="button" className="skull-primary full" onClick={() => updateGame("collectTrick", {})}>
                Clear trick
              </button>
            </div>
          ) : game.phase === "bidding" && viewer.bid === null ? (
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
              <button type="button" className="skull-primary full" onClick={() => updateGame("bid", { bid })}>
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
        <CardFan className="skull-hand" count={viewer.hand.length} aria-label="Your hand">
          {orderHand("skull-king", viewer.hand).map((card, index) => {
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
                    title="What does this do?"
                  >
                    ?
                  </button>
                )}
              </div>
            );
          })}
        </CardFan>
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
        <WalkThePlankDialog game={game} onChoose={(cardId) => updateGame("walkThePlank", { cardId })} />
      )}
      {game.phase === "pirateAbility" && game.pendingPirateAbility?.playerIndex !== ghostPlayerIndex && decisionControllerIndex(game, game.pendingPirateAbility?.playerIndex) === viewerPlayerIndex && (
        <PirateAbilityDialog
          game={game}
          onResolve={(choice) => updateGame("pirateAbility", { choice })}
        />
      )}
      {game.phase === "roundComplete" && (
        <RoundDialog
          game={game}
          canContinue={game.hostControls}
          onContinue={() => updateGame("nextRound", {})}
        />
      )}
      {game.phase === "gameOver" && (
        <GameOverDialog
          game={game}
          viewerPlayerIndex={viewerPlayerIndex}
          canRestart={game.hostControls}
          onRestart={() => roomAction("restart")}
          onExit={leaveGame}
        />
      )}
      {abilityCard && <CardAbilityDialog card={abilityCard} onClose={() => setAbilityCard(null)} />}
      {rulesDialog}
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
    <SkullModal kicker={<>Pirate ability</>} title={<>{pending.pirateName}</>} text={<>{pending.ability}</>}>

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
    </SkullModal>
  );
}

function Wild15Dialog({ onChoose, onClose }) {
  return (
    <SkullModal kicker={<>Wild Monkey 15</>} title={<>Choose its suit.</>} text={<>The Wild 15 may be green, yellow, or purple—never black trump.</>} onClose={onClose}>
        <div className="wild-suit-choices">
          {["green", "yellow", "purple"].map((suit) => (
            <button key={suit} type="button" className={suit} onClick={() => onChoose(suit)}>
              <b>{SKULL_KING_SUIT_DETAILS[suit].symbol}</b><span>{SKULL_KING_SUIT_DETAILS[suit].label}</span>
            </button>
          ))}
        </div>
    </SkullModal>
  );
}

function WalkThePlankDialog({ game, onChoose }) {
  const eligible = game.trick.filter((play) => game.pendingWalkThePlank.pirateCardIds.includes(play.card.id));
  return (
    <SkullModal kicker={<>Walk the Plank</>} title={<>Choose a Pirate to remove.</>} text={<>The Pirate is removed before the trick is resolved and cannot provide a capture bonus.</>}>
        <div className="plank-card-choices">
          {eligible.map((play) => (
            <button key={play.card.id} type="button" onClick={() => onChoose(play.card.id)}>
              <SkullCard card={play.card} />
              <strong>{game.players[play.playerIndex].name}</strong>
            </button>
          ))}
        </div>
    </SkullModal>
  );
}

function TigressDialog({ onChoose, onClose }) {
  return (
    <SkullModal kicker={<>Tigress</>} title={<>Fight or flee?</>} text={<>Declare her role now. She takes on every characteristic—and capture bonus—of that role for this trick.</>} onClose={onClose}>
        <div className="choice-actions">
          <button type="button" onClick={() => onChoose("escape")}><b>⚑</b><span>Play as Escape</span></button>
          <button type="button" onClick={() => onChoose("pirate")}><b>☠</b><span>Play as Pirate</span></button>
        </div>
    </SkullModal>
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
    <SkullModal kicker={<>Wild {suit}</>} title={<>Play it high or low?</>} text={<>This card follows {suit}, but it never earns a 14-card bonus.</>} onClose={onClose}>
        <div className="choice-actions">
          <button type="button" onClick={() => onChoose(0)}><b>0</b><span>Play low</span></button>
          <button type="button" onClick={() => onChoose(14)}><b>14</b><span>Play high</span></button>
        </div>
    </SkullModal>
  );
}

function CardAbilityDialog({ card, onClose }) {
  const help = getSkullKingCardHelp(card);
  if (!help) return null;

  return (
    <SkullModal kicker="Card ability" title={help.title} text={help.summary} onClose={onClose}>
      <div className="card-ability-content">
        <SkullCard card={card} className="ability-preview-card" />
        <ul>
          {help.details.map((detail) => <li key={detail}>{detail}</li>)}
        </ul>
      </div>
    </SkullModal>
  );
}

/** Every Skull King prompt is the shared dialog; this only keeps the kicker line. */
function SkullModal({ kicker, title, text, onClose, children }) {
  return (
    <ChoiceModal wide title={title} text={text ? <>{kicker && <strong>{kicker}. </strong>}{text}</> : kicker} onClose={onClose}>
      {children}
    </ChoiceModal>
  );
}

function RulesDialog({ open, onClose, deckMode = "full" }) {
  if (!open) return null;
  const resolvedDeckMode = SKULL_KING_DECK_MODES[deckMode] ? deckMode : "full";
  const hasMermaidsAndMonsters = resolvedDeckMode !== "classic";
  const hasFullDeck = resolvedDeckMode === "full";
  return (
    <SkullModal kicker={<>Captain&apos;s guide</>} title={<>Bid true. Take exactly that many tricks.</>} text={<><strong>{SKULL_KING_DECK_MODES[resolvedDeckMode].label}:</strong> {SKULL_KING_DECK_MODES[resolvedDeckMode].description}</>} onClose={onClose}>
        <p>There are ten rounds. Round one deals one card to each player, round two deals two, and so on. The player left of the dealer leads; the trick winner leads next.</p>
        <div className="deck-option-rules">
          <strong>Choose your card set</strong>
          <div>
            {Object.entries(SKULL_KING_DECK_MODES).map(([value, mode]) => (
              <article key={value} className={resolvedDeckMode === value ? "selected" : ""}>
                <span>{value === "classic" ? "70 cards" : value === "mermaids" ? "74 cards" : "93 cards"}</span>
                <h3>{mode.label}</h3>
                <p>{mode.inventory}</p>
                <small>Supports up to {mode.maxPlayers} captains.</small>
              </article>
            ))}
          </div>
          <p><b>Two-player games:</b> Graybeard&apos;s Ghost uses a third hand. Remove both Doubloons from every card set; All Cards also removes Wild Monkey 15, Walk the Plank, and all four 0/14 Choice cards.</p>
        </div>
        <div className="rules-grid">
          <div><span className="rule-icon green">✶</span><strong>Four suits</strong><p>Follow the led suit when you can. Black trumps green, yellow, and purple. Specials may always be played.</p></div>
          <div><span className="rule-icon pirate">☠</span><strong>Royal hierarchy</strong><p>{hasMermaidsAndMonsters ? "Mermaids beat numbers and the Skull King. Pirates beat Mermaids. The Skull King beats Pirates—but is always lured by a Mermaid." : "Pirates beat numbered cards, and the Skull King beats every Pirate and numbered card."}</p></div>
          <div><span className="rule-icon tigress">◐</span><strong>Tigress chooses</strong><p>When played, declare her as a Pirate or an Escape. She takes on that role&apos;s hierarchy and character bonuses for the trick.</p></div>
          <div><span className="rule-icon ghost">G</span><strong>Graybeard&apos;s Ghost</strong><p>Deal a third face-down hand and alternate which human starts each round. Flip Graybeard&apos;s top card second without following suit. The trick winner leads next; if Graybeard wins, he leads and the prior human leader plays second. He never bids or scores, and his Tigress is always an Escape.</p></div>
          {hasMermaidsAndMonsters && <div><span className="rule-icon monster">⌘</span><strong>Last monster rules</strong><p>When several monsters appear, only the last one played has an effect on the trick.</p></div>}
          <div><span className="rule-icon bonus">+20</span><strong>Treasure the 14s</strong><p>Captured green, yellow, and purple 14s are worth +10. The black 14 is +20. Bonuses score only with an exact bid.</p></div>
          {hasFullDeck && <div><span className="rule-icon wild">15</span><strong>Wild Monkey 15</strong><p>It adopts green, yellow, or purple—never black. It follows an existing non-black lead automatically and is highest under White Whale.</p></div>}
          {hasFullDeck && <div><span className="rule-icon expansion">7/8</span><strong>Expansion numbers</strong><p>Each suit has a second 7 and 8. Capturing the expansion 7 gives −5; capturing its 8 gives +5 when the bid is exact.</p></div>}
          {hasMermaidsAndMonsters && <div><span className="rule-icon mermaid">♆</span><strong>Character bonuses</strong><p>Pirate takes Mermaid: +20. Skull King takes each Pirate: +30. Mermaid takes Skull King: +40.</p></div>}
          <div><span className="rule-icon doubloon">◉</span><strong>Doubloon alliance</strong><p>It plays as an Escape. Its player and the trick winner each earn +20 when both make their bids. Winning your own Doubloon forms no alliance.</p></div>
        </div>
        {hasMermaidsAndMonsters && <div className="monster-rules">
          <p><b>Kraken</b> destroys the trick. No one wins; the player to its left leads next.</p>
          <p><b>White Whale</b> nullifies specials and suits; the highest number wins. All-special tricks have no winner.</p>
          {hasFullDeck && <p><b>Spotted Stingray</b> nullifies specials and suits; the lowest number wins. Among several Sea Monsters, only the last played applies.</p>}
          {hasFullDeck && <p><b>Davy Jones’ Locker</b> destroys every Sea Monster instead and awards its player +20 per creature when their bid is exact.</p>}
        </div>}
        <div className="named-pirate-rules">
          <strong>The {hasFullDeck ? "six" : "five"} Pirates</strong>
          <p className="pirate-rule-note">A Pirate unlocks its ability only when it wins the trick. Only Harry may act after the round&apos;s final trick.</p>
          <p><b>Rosie D’ Laney</b> chooses who leads next.</p>
          <p><b>Bendt the Bandit</b> draws two cards, then discards two.</p>
          <p><b>Rascal of Roatan</b> wagers 0, 10, or 20 points on making the bid.</p>
          <p><b>Juanita Jade</b> privately inspects the undealt deck.</p>
          <p><b>Harry the Giant</b> adjusts the bid by −1, 0, or +1.</p>
          {hasFullDeck && <p><b>Mary Thorne</b> forces a randomly selected card from any player&apos;s hand into the next trick.</p>}
        </div>
        {hasFullDeck && <div className="expansion-rules">
          <strong>Expansion tactics</strong>
          <p><b>Two players</b> remove Loot/Doubloons, the Wild 15, Walk the Plank, and every 0/14 choice card before dealing.</p>
          <p><b>First Mate Con</b> beats Pirates but loses to Mermaids and the Skull King. When he wins, he may use every captured named Pirate ability. A Mermaid or Skull King capturing Con earns +30.</p>
          <p><b>Walk the Plank</b> cannot win. Its player removes one Pirate before resolving the trick.</p>
          <p><b>The Last Volley</b> cannot win. Its player adds a second card after everyone plays, then skips the final trick.</p>
        </div>}
        <p className="rules-footnote">Exact nonzero bid: 20 points per trick plus captured bonuses. Miss a nonzero bid: lose 10 points per trick off. Bid zero: gain 10 × the round if correct, or lose that amount if you take a trick.{hasFullDeck ? " Each suit also has a 0/14 choice card; choose its value when played, but it has no bonus." : ""}</p>
        <button type="button" className="skull-primary full" onClick={onClose}>Back to the ship</button>
    </SkullModal>
  );
}

function RoundDialog({ game, canContinue, onContinue }) {
  return (
    <SkullModal kicker={<>Round {game.roundNumber} complete</>} title={<>The bids are settled.</>}>
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
    </SkullModal>
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
    <SkullModal kicker={<>Ten rounds sailed</>} title={<>{humanWon ? "You are the Skull King." : `${winners.map((player) => player.name).join(" & ")} takes the crown.`}</>} text={<>{humanWon ? "Your bids held fast through every storm." : "Another voyage could change the tide."}</>}>
        <div className="winner-mark">☠</div>
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
    </SkullModal>
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

function trickResultText(game) {
  const result = game.lastTrick;
  if (!result) return "";
  if (result.winnerIndex === null || result.winnerIndex === undefined) return "No one won this trick.";
  return `${game.players[result.winnerIndex].name} won the trick.`;
}
