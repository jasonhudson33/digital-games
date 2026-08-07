"use client";

import { useEffect, useMemo, useState } from "react";
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
    <main className={`hearts-app hearts-game-shell ${game.variant === "killer" ? "is-killer" : ""}`}>
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
        <div className="score-strip" aria-label="Scoreboard">
          {game.players.map((player, index) => (
            <div key={player.id} className={`score-item ${game.currentPlayerIndex === index && ["playing", "collecting"].includes(game.phase) ? "active" : ""}`}>
              <span className="score-avatar">{player.name.slice(0, 1).toUpperCase()}</span>
              <span><strong>{player.name}</strong><small>{player.roundPoints} this round</small></span>
              <b>{player.score}</b>
            </div>
          ))}
        </div>

        <div className="felt-table">
          <div className="opponents-rail">
            {game.players.slice(1).map((player, opponentIndex) => {
              const index = opponentIndex + 1;
              return <OpponentSeat key={player.id} player={player} active={game.currentPlayerIndex === index} />;
            })}
          </div>

          <div className="table-center">
            <span className="trick-count">Trick {game.trickNumber} / {game.cardsPerPlayer}</span>
            <div className="table-message" role="status">{game.message}</div>
            <div className={`played-cards ${game.playerCount > 4 ? "many-players" : ""}`}>
              {game.trick.map((play) => (
                <div className="played-card-slot" key={`${play.playerIndex}-${play.card.id}`}>
                  <DisplayCard card={play.card} className="played-card" />
                  <small>{game.players[play.playerIndex].name}</small>
                </div>
              ))}
              {!game.trick.length && <div className="empty-trick"><span>{game.variant === "killer" ? "☠" : "♥"}</span></div>}
            </div>
            <div className="table-meta">
              <span>
                <Heart size={14} fill="currentColor" /> Lead hearts only when they are all you hold
              </span>
              <span>Pass: {game.variant === "killer" ? "none" : game.passDirection}</span>
              {(game.carryoverCards.length > 0 || (!game.kittyClaimed && game.kitty.length > 0)) && (
                <span>Carryover: {game.carryoverCards.length + (!game.kittyClaimed ? game.kitty.length : 0)} cards</span>
              )}
            </div>
          </div>

          {game.phase === "passing" && (
            <div className="pass-callout">
              <span>Pass {game.passDirection}</span>
              <strong>Choose three cards</strong>
              <small>{game.selectedPass.length} of 3 selected</small>
              <button
                type="button"
                disabled={game.selectedPass.length !== 3}
                onClick={() => setGame((current) => completeHeartsPass(current, current.selectedPass))}
              >
                Pass cards <span aria-hidden="true">→</span>
              </button>
            </div>
          )}
        </div>

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

function OpponentSeat({ player, active }) {
  return (
    <div className={`opponent-seat ${active ? "active" : ""}`}>
      <div className="opponent-avatar">{player.name.slice(0, 1)}</div>
      <div><strong>{player.name}</strong><small>{player.hand.length} cards · {player.tricks} tricks</small></div>
      <div className="opponent-cards" aria-hidden="true">
        {Array.from({ length: Math.min(5, player.hand.length) }, (_, index) => <i key={index} style={{ "--mini-index": index }} />)}
      </div>
    </div>
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
          You must follow the led suit when possible. If you cannot, you may discard any card—including a heart.
          Hearts may only be led when your whole hand is hearts. Leftover deal cards form a kitty for the first trick winner.
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
