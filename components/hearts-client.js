"use client";

import { useState } from "react";
import { PlayedCard, Seat, SeatedTable } from "./ui/seated-table";
import { ChoiceModal, GameHeader, Hero, Landing, Lobby, Results } from "./ui/table-shell";
import { HeartsRoomService } from "./hearts-room-service";
import { useEngineRoom } from "../lib/use-engine-room.js";
import {
  SUIT_SYMBOLS,
  formatHeartCard,
  getLegalHeartCards,
  getPassCycle,
  heartsPlayerCountAllowed,
  rankLabel,
} from "../lib/hearts";
import { BookOpen, Heart, Skull, Users, Bot } from "lucide-react";
import { orderHand } from "../lib/hand-order";
import CardFan from "./card-fan";

const VARIANTS = {
  classic: {
    name: "Classic Hearts",
    shortName: "Hearts",
    icon: Heart,
    eyebrow: "The timeless trick-taker",
    seats: "3–4 players",
    description: "Follow suit, break hearts, dodge the Queen of Spades, and keep your score low.",
  },
  killer: {
    name: "Killer Hearts",
    shortName: "Killer",
    icon: Skull,
    eyebrow: "Two decks. Duplicate cards cancel.",
    seats: "5–8 players",
    description: "Five to eight players, no passing, and carried-over tricks when every lead card cancels.",
  },
};

/** Whether a computer is due to act: it holds the turn, or a finished trick is waiting to be gathered. */
const computerIsDue = (room) =>
  room.phase === "collecting" || (room.phase === "playing" && Boolean(room.players[room.currentPlayerIndex]?.isComputer));

export default function HeartsClient() {
  const {
    room, playerId, name, setName, joinCode, setJoinCode, busy, error,
    createRoom, joinRoom, act, leaveRoom,
  } = useEngineRoom({
    service: HeartsRoomService,
    storageKey: "hearts",
    computerDelay: 700,
    computerDue: computerIsDue,
  });
  const [rulesOpen, setRulesOpen] = useState(false);
  const [selectedPass, setSelectedPass] = useState([]);

  const me = room?.players.find((player) => player.id === playerId || player.playerId === playerId) ?? null;
  const rulesDialog = <RulesDialog open={rulesOpen} variant={room?.variant ?? "classic"} onClose={() => setRulesOpen(false)} />;

  function togglePassCard(cardId) {
    setSelectedPass((current) => current.includes(cardId)
      ? current.filter((id) => id !== cardId)
      : current.length === 3 ? current : [...current, cardId]);
  }

  function passSelected() {
    void act("passCards", { cardIds: selectedPass }).then(() => setSelectedPass([]));
  }

  function leave() {
    setSelectedPass([]);
    leaveRoom();
  }

  if (!room || !me) {
    return <Landing
      gameName="Hearts"
      theme="tbl-light hearts-theme"
      hero={<Hero
        kicker="Pick your poison"
        title={<><span>Hearts,</span> with a pulse.</>}
        copy="Play the classic game with three or four players—or bring a bigger table and two decks to Killer Hearts. Add computer rivals to any seat."
        badges={[{ icon: Users, label: "3–8 players" }, { icon: Bot, label: "Computer rivals" }, { icon: Heart, label: "Classic and Killer" }]}
        artLayout="free"
        art={<div className="hearts-card-art" aria-label="A fan of playing cards">
          <DisplayCard card={{ suit: "clubs", rank: 2, id: "art-1" }} className="art-card art-card-one" />
          <DisplayCard card={{ suit: "hearts", rank: 14, id: "art-2" }} className="art-card art-card-two" />
          <DisplayCard card={{ suit: "spades", rank: 12, id: "art-3" }} className="art-card art-card-three" />
        </div>}
      />}
      entry={{ name, setName, joinCode, setJoinCode, createRoom, joinRoom, busy, error }}
      onRules={() => setRulesOpen(true)}
      dialogs={rulesDialog}
    />;
  }

  if (room.phase === "lobby") {
    const isHost = room.hostId === playerId;
    const allowed = heartsPlayerCountAllowed(room.variant, room.players.length);
    return <Lobby
      gameName="Hearts"
      theme="tbl-light hearts-theme"
      room={room}
      me={me}
      busy={busy}
      error={error}
      min={room.variant === "killer" ? 5 : 3}
      max={8}
      canStart={allowed}
      seatNote={allowed ? `${VARIANTS[room.variant].name} · ready to deal` : `${VARIANTS[room.variant].name} needs ${VARIANTS[room.variant].seats}`}
      options={<div className="variant-picker" role="radiogroup" aria-label="Choose a Hearts variant">
        {Object.entries(VARIANTS).map(([key, details]) => {
          const Icon = details.icon;
          return (
            <button
              key={key}
              type="button"
              className={`variant-card ${room.variant === key ? "selected" : ""}`}
              role="radio"
              aria-checked={room.variant === key}
              disabled={!isHost || busy}
              onClick={() => act("setVariant", { variant: key })}
            >
              <span className="variant-icon"><Icon size={22} /></span>
              <span>
                <strong>{details.name}</strong>
                <small>{details.eyebrow} · {details.seats}</small>
              </span>
              <span className="variant-check" aria-hidden="true" />
            </button>
          );
        })}
      </div>}
      onAdd={() => act("addComputer")}
      onRemove={(id) => act("removeComputer", { playerId: id })}
      onStart={() => act("start")}
      onLeave={leave}
      onRules={() => setRulesOpen(true)}
      rules={rulesDialog}
    />;
  }

  const viewerIndex = room.viewerIndex;
  const myTurn = room.phase === "playing" && room.currentPlayerIndex === viewerIndex;
  const legalIds = new Set(myTurn ? getLegalHeartCards(room, viewerIndex).map((card) => card.id) : []);
  const isHost = room.hostId === playerId;
  const passing = room.phase === "passing" && !room.myPass;

  return (
    <main className={`hearts-app hearts-game-shell tbl-felt-shell hearts-theme ${room.variant === "killer" ? "is-killer" : ""}`}>
      <GameHeader
        title="Hearts"
        room={room}
        subtitle={`${VARIANTS[room.variant].name} · ${room.playerCount} players · Round ${room.roundNumber}`}
        status={room.phase === "gameOver" ? "Match complete" : room.phase === "roundComplete" ? "Round complete" : room.phase === "passing" ? `Pass ${room.passDirection}` : myTurn ? "Your turn" : `${room.players[room.currentPlayerIndex]?.name ?? "…"}'s turn`}
        onRules={() => setRulesOpen(true)}
        onLeave={leave}
      />

      <section className="hearts-board" aria-label="Hearts game table">
        <div className="tbl-felt-fit">
          <HeartsTable game={room} selectedPass={selectedPass} onPass={passSelected} />
        </div>

        <p className="hearts-message" role="status">{room.message}</p>

        <div className="your-seat">
          <div className="your-turn-label">
            <span className={`turn-dot ${myTurn ? "on" : ""}`} />
            {room.phase === "passing"
              ? passing ? "Select three cards to pass" : "Waiting for the other players to pass"
              : myTurn
                ? "Your turn"
                : "Waiting for the table"}
          </div>
          <CardFan className="player-hand" count={room.players[viewerIndex].hand.length} aria-label="Your hand">
            {orderHand("hearts", room.players[viewerIndex].hand).map((card, index) => {
              const selected = selectedPass.includes(card.id) || Boolean(room.myPass?.includes(card.id));
              const playable = legalIds.has(card.id);
              return (
                <button
                  key={card.id}
                  type="button"
                  className={`hand-card-button ${selected ? "selected" : ""} ${playable ? "playable" : ""}`}
                  style={{ "--card-index": index }}
                  disabled={busy || (room.phase === "passing" ? !passing : !playable)}
                  aria-pressed={room.phase === "passing" ? selected : undefined}
                  aria-label={`${formatHeartCard(card)}${selected ? ", selected to pass" : playable ? ", playable" : ""}`}
                  onClick={() => {
                    if (room.phase === "passing") togglePassCard(card.id);
                    else if (playable) void act("playCard", { cardId: card.id });
                  }}
                >
                  <DisplayCard card={card} />
                </button>
              );
            })}
          </CardFan>
        </div>
      </section>

      {room.phase === "roundComplete" && (
        <RoundDialog game={room} isHost={isHost} busy={busy} onContinue={() => act("nextRound")} onLeave={leave} />
      )}
      {room.phase === "gameOver" && <GameOverDialog game={room} viewerIndex={viewerIndex} onExit={leave} />}
      {rulesDialog}
    </main>
  );
}

/*
 * The table, with everybody sitting at it.
 *
 * What this replaced: a scoreboard down the left listing every player, a rail of
 * opponents pinned across the top of the felt, and a row of played cards in the
 * middle captioned with names in 12px type. Every player's name was printed
 * three times, and "who played that queen?" was a question you answered by
 * reading rather than by looking.
 *
 * Hearts scores on points taken, not on tricks, so that is what a seat carries:
 * what they have picked up this round, and what they are carrying into it.
 */
function HeartsTable({ game, selectedPass, onPass }) {
  const played = new Map(game.trick.map((play) => [play.playerIndex, play.card]));
  /* A cancelled trick in Killer has no winner and carries over, so there is
     nobody for it to gather onto. */
  const winnerIndex = game.phase === "collecting" ? game.lastTrick?.winnerIndex ?? null : null;
  const carried = game.carryoverCards.length + (game.kittyClaimed ? 0 : game.kittyCount);

  return (
    <SeatedTable
      count={game.playerCount}
      viewerIndex={game.viewerIndex}
      className="hearts-felt"
      dock={game.phase === "passing" ? (
        /* The passing prompt belongs in the middle of the table: nothing is on
           the felt yet, and it goes as soon as the three cards are away. */
        <div className="tbl-felt-dock">
          <h2>Pass {game.passDirection}</h2>
          {game.myPass ? (
            <p>Your cards are chosen. Waiting for {game.players.filter((player) => !player.passReady).map((player) => player.name).join(", ")}.</p>
          ) : (
            <>
              <p>Choose three cards from your hand. {selectedPass.length} of 3 selected.</p>
              <button type="button" className="hearts-dock-go" disabled={selectedPass.length !== 3} onClick={onPass}>
                Pass cards <span aria-hidden="true">{"\u2192"}</span>
              </button>
            </>
          )}
        </div>
      ) : null}
      middle={(
        /* Whether hearts are broken decides what you are allowed to lead, so it
           belongs where you are already looking rather than in a row of pills
           below the felt. */
        <b
          className={`tbl-felt-mark hearts-broken ${game.heartsPlayed ? "on" : ""}`}
          title={game.heartsPlayed ? "Hearts are broken" : "Hearts are not broken yet"}
        >
          {"\u2665"}
        </b>
      )}
      foot={(
        <small className="tbl-felt-meta">
          {game.phase === "passing"
            ? `Pass ${game.passDirection}`
            : `Trick ${game.trickNumber} / ${game.cardsPerPlayer}`}
          {carried > 0 ? ` \u00b7 ${carried} carried` : ""}
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
                won={winnerIndex === spot.index}
                style={cardStyle(spot.index)}
              >
                <DisplayCard card={card} />
              </PlayedCard>
            );
          })}

          {layout.map((spot) => {
            const player = game.players[spot.index];
            return (
              <Seat
                key={player.playerId}
                spot={spot}
                style={seatStyle(spot.index)}
                name={player.name}
                avatar={player.name.slice(0, 1).toUpperCase()}
                note={`${player.roundPoints} pts`}
                hand={player.handCount}
                tone={game.currentPlayerIndex === spot.index && ["playing", "collecting"].includes(game.phase) ? "turn" : ""}
                marks={spot.index === game.dealerIndex
                  ? [{ key: "deal", label: "D", title: "Dealer", tone: "deal" }]
                  : []}
              >
                {/* The running total, on the person it belongs to. This is the
                    scoreboard that used to sit down the side of the table. */}
                <span className="tbl-chair-pill quiet">{player.score} total</span>
              </Seat>
            );
          })}
        </>
      )}
    </SeatedTable>
  );
}

function DisplayCard({ card, className = "" }) {
  const red = card.suit === "hearts" || card.suit === "diamonds";
  return (
    <div className={`hearts-playing-card ${red ? "red" : "black"} ${className}`}>
      <span className="card-corner card-corner-top"><b>{rankLabel(card.rank)}</b><i>{SUIT_SYMBOLS[card.suit]}</i></span>
      <span className="card-pip">{SUIT_SYMBOLS[card.suit]}</span>
      <span className="card-corner card-corner-bottom"><b>{rankLabel(card.rank)}</b><i>{SUIT_SYMBOLS[card.suit]}</i></span>
    </div>
  );
}

function RulesDialog({ open, variant, onClose }) {
  if (!open) return null;
  return (
    <ChoiceModal wide title="Low score wins." text="Quick rules. Follow the suit that was led if you can. The highest card of that suit takes the trick—and any points inside it." onClose={onClose}>
      <div className="rules-points">
        <div><span>♥</span><strong>1 point</strong><small>each heart</small></div>
        <div><span>Q♠</span><strong>13 points</strong><small>each queen</small></div>
        <div><span>☾</span><strong>{variant === "killer" ? 52 : 26} points</strong><small>shoot the moon</small></div>
      </div>
      <p className="tbl-rule-heading">{variant === "killer" ? "Killer Hearts" : "Classic Hearts"}</p>
      <p className="tbl-modal-copy">
        {variant === "killer"
          ? "Five to eight players use two decks and never pass. The first 2♣ holder clockwise from the dealer leads it, and the other 2♣ holder must play theirs when their turn arrives. Matching cards of the led suit cancel and cannot win the trick; if every lead card cancels, the trick carries over to the next."
          : "Three or four players use one deck and pass three cards left, right, across (with four), then hold. Whoever holds the 2♣ leads the first trick and must play it."}
      </p>
      <p className="tbl-modal-copy">
        You must follow the led suit when possible. Damage cards—every heart and the Queen of Spades—cannot be played anywhere in the first trick. After that, if you cannot follow suit, you may discard any card.
        Before hearts are broken, they may only be led when your whole hand is hearts. Once anyone discards a heart, hearts may lead later tricks. Leftover deal cards form a kitty for the first trick winner.
        Take every penalty point to shoot the moon. The match ends when someone reaches 100; the lowest total wins.
      </p>
    </ChoiceModal>
  );
}

function RoundDialog({ game, isHost, busy, onContinue, onLeave }) {
  const shooter = game.roundSummary.shooterIndex >= 0 ? game.players[game.roundSummary.shooterIndex] : null;
  const nextPass = game.variant === "killer"
    ? "Killer Hearts: no passing"
    : `Next pass: ${getPassCycle(game.playerCount)[game.roundNumber % getPassCycle(game.playerCount).length]}`;
  return (
    <Results
      title={shooter ? `${shooter.name} shot the moon.` : "Count the damage."}
      text={`Round ${game.roundNumber} complete. ${nextPass}`}
      rows={[...game.players].sort((a, b) => a.score - b.score).map((player) => ({
        id: player.playerId,
        name: player.name,
        value: `${player.score}`,
        note: `+${game.roundSummary.appliedPoints[player.id]}`,
      }))}
    >
      {isHost
        ? <button type="button" className="tbl-primary" disabled={busy} onClick={onContinue}>Deal round {game.roundNumber + 1}</button>
        : <p className="tbl-wait">Waiting for the host to deal…</p>}
      <button type="button" className="tbl-link" onClick={onLeave}>Leave table</button>
    </Results>
  );
}

function GameOverDialog({ game, viewerIndex, onExit }) {
  const winners = game.roundSummary.winnerIndexes.map((index) => game.players[index]);
  const youWon = winners.some((player) => player.id === viewerIndex);
  return (
    <Results
      title={youWon ? "You kept your cool." : `${winners.map((player) => player.name).join(" & ")} wins.`}
      text={youWon ? "Match complete. Lowest score at the table. Nicely played." : "Match complete. The lowest score takes the table."}
      rows={[...game.players].sort((a, b) => a.score - b.score).map((player) => ({ id: player.playerId, name: player.name, value: `${player.score}` }))}
    >
      <button type="button" className="tbl-primary" onClick={onExit}>Back to Hearts</button>
    </Results>
  );
}
