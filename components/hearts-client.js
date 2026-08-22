"use client";

import { useEffect, useMemo, useState } from "react";
import { PlayedCard, Seat, SeatedTable } from "./ui/seated-table";
import {
  SUIT_SYMBOLS,
  chooseBotHeartCard,
  collectHeartTrick,
  completeHeartsPass,
  createHeartsMatch,
  formatHeartCard,
  getLegalHeartCards,
  getPassCycle,
  playHeartCard,
  rankLabel,
  startNextHeartsRound,
} from "../lib/hearts";
import { BookOpen, Heart, RotateCcw, Skull, Sparkles, X } from "lucide-react";

const VARIANTS = {
  classic: {
    name: "Classic Hearts",
    shortName: "Hearts",
    icon: Heart,
    eyebrow: "The timeless trick-taker",
    description: "Follow suit, break hearts, dodge the Queen of Spades, and keep your score low.",
  },
  killer: {
    name: "Killer Hearts",
    shortName: "Killer",
    icon: Skull,
    eyebrow: "Two decks. Duplicate cards cancel.",
    description: "Five to eight players, no passing, and carried-over tricks when every lead card cancels.",
  },
};

export default function HeartsClient() {
  const [variant, setVariant] = useState("classic");
  const [playerCount, setPlayerCount] = useState(4);
  const [playerName, setPlayerName] = useState("");
  const [game, setGame] = useState(null);
  const [rulesOpen, setRulesOpen] = useState(false);

  useEffect(() => {
    if (!game || game.phase !== "playing" || game.currentPlayerIndex === 0) return undefined;
    const timer = window.setTimeout(() => {
      setGame((current) => {
        if (!current || current.phase !== "playing" || current.currentPlayerIndex === 0) return current;
        const card = chooseBotHeartCard(current, current.currentPlayerIndex);
        return card ? playHeartCard(current, current.currentPlayerIndex, card.id) : current;
      });
    }, 620);
    return () => window.clearTimeout(timer);
  }, [game]);

  useEffect(() => {
    if (!game || game.phase !== "collecting") return undefined;
    const timer = window.setTimeout(() => setGame((current) => collectHeartTrick(current)), 1050);
    return () => window.clearTimeout(timer);
  }, [game]);

  function startGame(nextVariant = variant) {
    setVariant(nextVariant);
    setGame(createHeartsMatch({ variant: nextVariant, playerName, playerCount, targetScore: 100 }));
  }

  function chooseVariant(nextVariant) {
    setVariant(nextVariant);
    setPlayerCount(nextVariant === "killer" ? 6 : 4);
  }

  function resetGame() {
    setGame(null);
  }

  function togglePassCard(cardId) {
    setGame((current) => {
      if (!current || current.phase !== "passing") return current;
      const selected = current.selectedPass.includes(cardId);
      if (!selected && current.selectedPass.length === 3) return current;
      return {
        ...current,
        selectedPass: selected
          ? current.selectedPass.filter((id) => id !== cardId)
          : [...current.selectedPass, cardId],
      };
    });
  }

  if (!game) {
    return (
      <main className="hearts-app hearts-intro-shell">
        <section className="hearts-intro">
          <div className="hearts-intro-copy">
            <span className="hearts-kicker"><Sparkles size={15} /> Pick your poison</span>
            <h1><span>Hearts,</span> with a pulse.</h1>
            <p>
              Play the classic game with three or four players—or bring a bigger table and
              two decks to Killer Hearts. Your computer rivals are ready.
            </p>

            <div className="variant-picker" role="radiogroup" aria-label="Choose a Hearts variant">
              {Object.entries(VARIANTS).map(([key, details]) => {
                const Icon = details.icon;
                return (
                  <button
                    key={key}
                    type="button"
                    className={`variant-card ${variant === key ? "selected" : ""}`}
                    role="radio"
                    aria-checked={variant === key}
                    onClick={() => chooseVariant(key)}
                  >
                    <span className="variant-icon"><Icon size={22} /></span>
                    <span>
                      <strong>{details.name}</strong>
                      <small>{details.eyebrow}</small>
                    </span>
                    <span className="variant-check" aria-hidden="true" />
                  </button>
                );
              })}
            </div>

            <div className="hearts-setup-row">
              <label>
                <span>Your name</span>
                <input
                  value={playerName}
                  onChange={(event) => setPlayerName(event.target.value)}
                  maxLength={18}
                  placeholder="You"
                />
              </label>
              <label>
                <span>Players</span>
                <select value={playerCount} onChange={(event) => setPlayerCount(Number(event.target.value))}>
                  {(variant === "killer" ? [5, 6, 7, 8] : [3, 4]).map((count) => (
                    <option key={count} value={count}>{count} players</option>
                  ))}
                </select>
              </label>
              <button type="button" className="hearts-primary" onClick={() => startGame()}>
                Deal me in <span aria-hidden="true">→</span>
              </button>
            </div>
            <button type="button" className="hearts-text-button" onClick={() => setRulesOpen(true)}>
              <BookOpen size={16} /> How to play
            </button>
          </div>

          <div className="hearts-card-art" aria-label="A fan of playing cards">
            <div className="art-orbit orbit-one" />
            <div className="art-orbit orbit-two" />
            <DisplayCard card={{ suit: "clubs", rank: 2, id: "art-1" }} className="art-card art-card-one" />
            <DisplayCard card={{ suit: "hearts", rank: 14, id: "art-2" }} className="art-card art-card-two" />
            <DisplayCard card={{ suit: "spades", rank: 12, id: "art-3" }} className="art-card art-card-three" />
            <div className="art-caption"><span>{variant === "killer" ? 52 : 26}</span> points in play</div>
          </div>
        </section>
        <RulesDialog open={rulesOpen} variant={variant} onClose={() => setRulesOpen(false)} />
      </main>
    );
  }

  const legalIds = new Set(
    game.phase === "playing" && game.currentPlayerIndex === 0
      ? getLegalHeartCards(game, 0).map((card) => card.id)
      : []
  );

  return (
    <main className={`hearts-app hearts-game-shell tbl-felt-shell ${game.variant === "killer" ? "is-killer" : ""}`}>
      <header className="hearts-gamebar">
        <div>
          <span className="gamebar-mark">{game.variant === "killer" ? <Skull size={18} /> : <Heart size={18} />}</span>
          <div>
            <strong>{VARIANTS[game.variant].name}</strong>
            <small>{game.playerCount} players · Round {game.roundNumber} · First to 100 loses</small>
          </div>
        </div>
        <div className="gamebar-actions">
          <button type="button" onClick={() => setRulesOpen(true)}><BookOpen size={16} /> Rules</button>
          <button type="button" onClick={resetGame}><RotateCcw size={16} /> New game</button>
        </div>
      </header>

      <section className="hearts-board" aria-label="Hearts game table">
        <div className="tbl-felt-fit">
          <HeartsTable
            game={game}
            onPass={() => setGame((current) => completeHeartsPass(current, current.selectedPass))}
          />
        </div>

        <p className="hearts-message" role="status">{game.message}</p>

        <div className="your-seat">
          <div className="your-turn-label">
            <span className={`turn-dot ${game.currentPlayerIndex === 0 && game.phase === "playing" ? "on" : ""}`} />
            {game.phase === "passing"
              ? "Select three cards to pass"
              : game.currentPlayerIndex === 0 && game.phase === "playing"
                ? "Your turn"
                : "Waiting for the table"}
          </div>
          <div className="player-hand" aria-label="Your hand">
            {game.players[0].hand.map((card, index) => {
              const selected = game.selectedPass.includes(card.id);
              const playable = legalIds.has(card.id);
              return (
                <button
                  key={card.id}
                  type="button"
                  className={`hand-card-button ${selected ? "selected" : ""} ${playable ? "playable" : ""}`}
                  style={{ "--card-index": index }}
                  disabled={game.phase !== "passing" && !playable}
                  aria-pressed={game.phase === "passing" ? selected : undefined}
                  aria-label={`${formatHeartCard(card)}${selected ? ", selected to pass" : playable ? ", playable" : ""}`}
                  onClick={() => {
                    if (game.phase === "passing") togglePassCard(card.id);
                    else if (playable) setGame((current) => playHeartCard(current, 0, card.id));
                  }}
                >
                  <DisplayCard card={card} />
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {game.phase === "roundComplete" && (
        <RoundDialog game={game} onContinue={() => setGame((current) => startNextHeartsRound(current))} />
      )}
      {game.phase === "gameOver" && <GameOverDialog game={game} onRestart={() => startGame(game.variant)} onExit={resetGame} />}
      <RulesDialog open={rulesOpen} variant={game.variant} onClose={() => setRulesOpen(false)} />
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
function HeartsTable({ game, onPass }) {
  const played = new Map(game.trick.map((play) => [play.playerIndex, play.card]));
  /* A cancelled trick in Killer has no winner and carries over, so there is
     nobody for it to gather onto. */
  const winnerIndex = game.phase === "collecting" ? game.lastTrick?.winnerIndex ?? null : null;
  const carried = game.carryoverCards.length + (game.kittyClaimed ? 0 : game.kitty.length);

  return (
    <SeatedTable
      count={game.playerCount}
      viewerIndex={0}
      className="hearts-felt"
      dock={game.phase === "passing" ? (
        /* The passing prompt belongs in the middle of the table: nothing is on
           the felt yet, and it goes as soon as the three cards are away. */
        <div className="tbl-felt-dock">
          <h2>Pass {game.passDirection}</h2>
          <p>Choose three cards from your hand. {game.selectedPass.length} of 3 selected.</p>
          <button type="button" className="hearts-dock-go" disabled={game.selectedPass.length !== 3} onClick={onPass}>
            Pass cards <span aria-hidden="true">{"\u2192"}</span>
          </button>
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
                key={player.id}
                spot={spot}
                style={seatStyle(spot.index)}
                name={player.name}
                avatar={player.name.slice(0, 1).toUpperCase()}
                note={`${player.roundPoints} pts`}
                hand={player.hand.length}
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
    <div className="hearts-modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="rules-dialog" role="dialog" aria-modal="true" aria-labelledby="rules-title">
        <button type="button" className="modal-close" onClick={onClose} aria-label="Close rules"><X size={20} /></button>
        <span className="dialog-kicker">Quick rules</span>
        <h2 id="rules-title">Low score wins.</h2>
        <p>Follow the suit that was led if you can. The highest card of that suit takes the trick—and any points inside it.</p>
        <div className="rules-points">
          <div><span>♥</span><strong>1 point</strong><small>each heart</small></div>
          <div><span>Q♠</span><strong>13 points</strong><small>each queen</small></div>
          <div><span>☾</span><strong>{variant === "killer" ? 52 : 26} points</strong><small>shoot the moon</small></div>
        </div>
        <div className="variant-rule-block">
          <strong>{variant === "killer" ? "Killer Hearts" : "Classic Hearts"}</strong>
          <p>
            {variant === "killer"
              ? "Five to eight players use two decks and never pass. The first 2♣ holder clockwise from the dealer leads it, and the other 2♣ holder must play theirs when their turn arrives. Matching cards of the led suit cancel as trick winners."
              : "Three or four players use one deck and pass three cards left, right, across (with four), then hold. Whoever holds the 2♣ leads the first trick and must play it."}
          </p>
        </div>
        <p className="rules-footnote">
          You must follow the led suit when possible. Damage cards—every heart and the Queen of Spades—cannot be played anywhere in the first trick. After that, if you cannot follow suit, you may discard any card.
          Before hearts are broken, they may only be led when your whole hand is hearts. Once anyone discards a heart, hearts may lead later tricks. Leftover deal cards form a kitty for the first trick winner.
          Take every penalty point to shoot the moon. The match ends when someone reaches 100; the lowest total wins.
        </p>
        <button type="button" className="hearts-primary full" onClick={onClose}>Back to the table</button>
      </section>
    </div>
  );
}

function RoundDialog({ game, onContinue }) {
  const shooter = game.roundSummary.shooterIndex >= 0 ? game.players[game.roundSummary.shooterIndex] : null;
  return (
    <div className="hearts-modal-backdrop">
      <section className="round-dialog" role="dialog" aria-modal="true" aria-labelledby="round-title">
        <span className="dialog-kicker">Round {game.roundNumber} complete</span>
        <h2 id="round-title">{shooter ? `${shooter.name} shot the moon.` : "Count the damage."}</h2>
        <div className="round-score-list">
          {[...game.players].sort((a, b) => a.score - b.score).map((player) => (
            <div key={player.id}>
              <span className="score-avatar">{player.name.slice(0, 1)}</span>
              <strong>{player.name}</strong>
              <small>+{game.roundSummary.appliedPoints[player.id]}</small>
              <b>{player.score}</b>
            </div>
          ))}
        </div>
        <button type="button" className="hearts-primary full" onClick={onContinue}>Deal round {game.roundNumber + 1} <span>→</span></button>
        <small className="next-pass">
          {game.variant === "killer"
            ? "Killer Hearts: no passing"
            : `Next pass: ${getPassCycle(game.playerCount)[game.roundNumber % getPassCycle(game.playerCount).length]}`}
        </small>
      </section>
    </div>
  );
}

function GameOverDialog({ game, onRestart, onExit }) {
  const winners = game.roundSummary.winnerIndexes.map((index) => game.players[index]);
  const humanWon = winners.some((player) => player.id === 0);
  return (
    <div className="hearts-modal-backdrop">
      <section className="round-dialog game-over-dialog" role="dialog" aria-modal="true" aria-labelledby="game-over-title">
        <span className="dialog-kicker">Match complete</span>
        <div className="game-over-icon">{humanWon ? "♥" : "♠"}</div>
        <h2 id="game-over-title">{humanWon ? "You kept your cool." : `${winners.map((player) => player.name).join(" & ")} wins.`}</h2>
        <p>{humanWon ? "Lowest score at the table. Nicely played." : "The lowest score takes the table. Ready for another deal?"}</p>
        <div className="dialog-actions">
          <button type="button" className="hearts-primary" onClick={onRestart}>Play again</button>
          <button type="button" className="hearts-secondary" onClick={onExit}>Change mode</button>
        </div>
      </section>
    </div>
  );
}
