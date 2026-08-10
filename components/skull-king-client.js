"use client";

import { useEffect, useState } from "react";
import { Anchor, BookOpen, RotateCcw, X } from "lucide-react";
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
  getSkullKingLeadSuit,
  playSkullKingCard,
  resolveSkullKingPirateAbility,
  resolveWalkThePlank,
  startNextSkullKingRound,
  submitSkullKingBid,
} from "../lib/skull-king";

export default function SkullKingClient() {
  const [playerName, setPlayerName] = useState("");
  const [playerCount, setPlayerCount] = useState(4);
  const [game, setGame] = useState(null);
  const [bid, setBid] = useState(0);
  const [rulesOpen, setRulesOpen] = useState(false);
  const [choiceCardId, setChoiceCardId] = useState(null);
  const [tigressCardId, setTigressCardId] = useState(null);
  const [wildCardId, setWildCardId] = useState(null);

  useEffect(() => {
    if (!game || !["playing", "lastVolley"].includes(game.phase) || game.currentPlayerIndex === 0) return undefined;
    const timer = window.setTimeout(() => {
      setGame((current) => {
        if (!current || !["playing", "lastVolley"].includes(current.phase) || current.currentPlayerIndex === 0) return current;
        const play = chooseBotSkullKingPlay(current, current.currentPlayerIndex);
        return play
          ? playSkullKingCard(current, current.currentPlayerIndex, play.card.id, play.declaredSuit ?? play.declaredRole ?? play.declaredValue)
          : current;
      });
    }, 680);
    return () => window.clearTimeout(timer);
  }, [game]);

  useEffect(() => {
    if (!game || game.phase !== "walkThePlank" || game.pendingWalkThePlank?.playerIndex === 0) return undefined;
    const timer = window.setTimeout(() => {
      setGame((current) => current?.phase === "walkThePlank"
        ? resolveWalkThePlank(current, chooseBotWalkThePlank(current))
        : current);
    }, 720);
    return () => window.clearTimeout(timer);
  }, [game]);

  useEffect(() => {
    if (!game || game.phase !== "collecting") return undefined;
    const timer = window.setTimeout(() => setGame((current) => collectSkullKingTrick(current)), 1250);
    return () => window.clearTimeout(timer);
  }, [game]);

  useEffect(() => {
    if (!game || game.phase !== "pirateAbility" || game.pendingPirateAbility?.playerIndex === 0) return undefined;
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
    setGame(createSkullKingMatch({ playerName, playerCount }));
    setBid(0);
    setChoiceCardId(null);
    setTigressCardId(null);
    setWildCardId(null);
  }

  function playHumanCard(card) {
    if (card.type === "wild15" && !getSkullKingLeadSuit(game.trick)) {
      setWildCardId(card.id);
      return;
    }
    if (card.kind === "tigress") {
      setTigressCardId(card.id);
      return;
    }
    if (card.type === "choice") {
      setChoiceCardId(card.id);
      return;
    }
    setGame((current) => playSkullKingCard(current, 0, card.id));
  }

  function playChoice(value) {
    setGame((current) => playSkullKingCard(current, 0, choiceCardId, value));
    setChoiceCardId(null);
  }

  function playTigress(role) {
    setGame((current) => playSkullKingCard(current, 0, tigressCardId, role));
    setTigressCardId(null);
  }

  function playWild15(suit) {
    setGame((current) => playSkullKingCard(current, 0, wildCardId, suit));
    setWildCardId(null);
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
                  {[3, 4, 5, 6, 7, 8, 9].map((count) => <option key={count} value={count}>{count} players</option>)}
                </select>
              </label>
              <button type="button" className="skull-primary" onClick={startGame}>Set sail <span aria-hidden="true">→</span></button>
            </div>
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

  const legalIds = new Set(
    ["playing", "lastVolley"].includes(game.phase) && game.currentPlayerIndex === 0
      ? getLegalSkullKingCards(game, 0).map((card) => card.id)
      : []
  );

  return (
    <main className="skull-app skull-game-shell">
      <header className="skull-gamebar">
        <div className="gamebar-title">
          <span className="gamebar-anchor"><Anchor size={19} /></span>
          <div><strong>Skull King</strong><small>Round {game.roundNumber} of 10 · {game.playerCount} captains</small></div>
        </div>
        <div className="skull-gamebar-actions">
          <button type="button" onClick={() => setRulesOpen(true)}><BookOpen size={16} /> Rules</button>
          <button type="button" onClick={() => setGame(null)}><RotateCcw size={16} /> New game</button>
        </div>
      </header>

      <section className="skull-scoreboard" aria-label="Scoreboard">
        {game.players.map((player, index) => (
          <div key={player.id} className={`skull-score ${game.currentPlayerIndex === index ? "active" : ""} ${index === game.dealerIndex ? "dealer" : ""}`}>
            <span className="skull-avatar">{player.name.slice(0, 1).toUpperCase()}</span>
            <span className="skull-player-copy">
              <strong>{player.name}</strong>
              <small>{player.bid === null ? "No bid yet" : `${player.tricks} / ${player.bid} tricks${player.wager ? ` · ${player.wager} wager` : ""}`}</small>
            </span>
            <b>{player.score}</b>
            {index === game.dealerIndex && <i>D</i>}
          </div>
        ))}
      </section>

      <section className="skull-table" aria-label="Skull King game table">
        <div className="skull-opponents">
          {game.players.slice(1).map((player, opponentIndex) => {
            const playerIndex = opponentIndex + 1;
            return (
              <div key={player.id} className={`skull-opponent ${game.currentPlayerIndex === playerIndex ? "active" : ""}`}>
                <span className="opponent-name">{player.name}</span>
                <div className="mini-hand" aria-hidden="true">
                  {Array.from({ length: Math.min(player.hand.length, 6) }, (_, index) => <i key={index} style={{ "--mini": index }} />)}
                </div>
                <small>{player.hand.length} cards</small>
              </div>
            );
          })}
        </div>

        <div className="skull-table-center">
          <div className="skull-round-chip">TRICK {game.trickNumber} <span>/ {game.roundNumber}</span></div>
          <p className="skull-message" role="status">{game.message}</p>
          <div className={`skull-trick ${game.playerCount > 5 ? "many" : ""}`}>
            {game.trick.map((play) => (
              <div className="skull-play" key={`${play.playerIndex}-${play.card.id}`}>
                <SkullCard card={play.card} />
                <small>{game.players[play.playerIndex].name}</small>
              </div>
            ))}
            {!game.trick.length && (
              <div className="empty-sea" aria-hidden="true"><span>⚓</span><i /><i /><i /></div>
            )}
          </div>
          <div className="skull-table-meta">
            <span>Dealer: {game.players[game.dealerIndex].name}</span>
            <span>Lead: {getLeadLabel(game)}</span>
            <span>{game.deckCount} cards ashore</span>
          </div>
        </div>

        {game.phase === "bidding" && (
          <div className="bid-panel">
            <span className="panel-kicker">Make your bid</span>
            <h2>How many tricks?</h2>
            <p>You have {game.roundNumber} {game.roundNumber === 1 ? "card" : "cards"}. Hit your bid exactly to score.</p>
            <div className="bid-options">
              {Array.from({ length: game.roundNumber + 1 }, (_, value) => (
                <button key={value} type="button" className={bid === value ? "selected" : ""} onClick={() => setBid(value)}>{value}</button>
              ))}
            </div>
            <button type="button" className="skull-primary full" onClick={() => setGame((current) => submitSkullKingBid(current, 0, bid))}>
              Lock bid at {bid}
            </button>
          </div>
        )}
      </section>

      <section className="skull-your-seat">
        <div className="skull-turn-label">
          <span className={`turn-beacon ${game.currentPlayerIndex === 0 && ["playing", "lastVolley"].includes(game.phase) ? "on" : ""}`} />
          {game.phase === "bidding"
            ? "Study your hand, then make your bid"
            : game.phase === "pirateAbility"
              ? `${game.pendingPirateAbility.pirateName} is using an ability`
              : game.phase === "walkThePlank"
                ? "A Pirate must walk the plank"
                : game.currentPlayerIndex === 0 && game.phase === "lastVolley"
                  ? "Your Last Volley: play one more card"
                  : game.currentPlayerIndex === 0 && game.phase === "playing"
                ? "Your turn, Captain"
                : "The crew is playing"}
          <small>{game.players[0].bid === null ? "" : `Bid ${game.players[0].bid} · Won ${game.players[0].tricks}`}</small>
        </div>
        <div className="skull-hand" aria-label="Your hand">
          {game.players[0].hand.map((card, index) => {
            const playable = legalIds.has(card.id);
            return (
              <button
                key={card.id}
                type="button"
                className={`skull-hand-card ${playable ? "playable" : ""} ${game.forcedPlay?.playerIndex === 0 && game.forcedPlay.cardId === card.id ? "forced" : ""}`}
                style={{ "--card-index": index }}
                disabled={!playable}
                onClick={() => playHumanCard(card)}
                aria-label={`${formatSkullKingCard(card)}${playable ? ", playable" : ""}`}
              >
                <SkullCard card={card} />
              </button>
            );
          })}
        </div>
      </section>

      {choiceCardId && <ChoiceDialog card={game.players[0].hand.find((card) => card.id === choiceCardId)} onChoose={playChoice} onClose={() => setChoiceCardId(null)} />}
      {tigressCardId && <TigressDialog onChoose={playTigress} onClose={() => setTigressCardId(null)} />}
      {wildCardId && <Wild15Dialog onChoose={playWild15} onClose={() => setWildCardId(null)} />}
      {game.phase === "walkThePlank" && game.pendingWalkThePlank?.playerIndex === 0 && (
        <WalkThePlankDialog game={game} onChoose={(cardId) => setGame((current) => resolveWalkThePlank(current, cardId))} />
      )}
      {game.phase === "pirateAbility" && game.pendingPirateAbility?.playerIndex === 0 && (
        <PirateAbilityDialog
          game={game}
          onResolve={(choice) => setGame((current) => resolveSkullKingPirateAbility(current, choice))}
        />
      )}
      {game.phase === "roundComplete" && <RoundDialog game={game} onContinue={() => setGame((current) => startNextSkullKingRound(current))} />}
      {game.phase === "gameOver" && <GameOverDialog game={game} onRestart={startGame} onExit={() => setGame(null)} />}
      <RulesDialog open={rulesOpen} onClose={() => setRulesOpen(false)} />
    </main>
  );
}

function SkullCard({ card, className = "" }) {
  if (card.type === "special") {
    const details = SKULL_KING_SPECIALS[card.kind];
    return (
      <div className={`skull-playing-card special ${card.kind} ${card.declaredRole ? `${card.declaredRole}-role` : ""} ${className}`}>
        <span className="skull-card-corner">{details.symbol}</span>
        <span className="special-art">{details.symbol}</span>
        <strong>{card.kind === "pirate" && card.name ? card.name : details.label}</strong>
        <small>{card.kind === "pirate" && card.abilityShort ? card.abilityShort : card.kind === "tigress" && card.declaredRole ? `Playing as ${card.declaredRole}` : specialTagline(card.kind)}</small>
      </div>
    );
  }
  if (card.type === "wild15") {
    const suit = card.declaredSuit ? SKULL_KING_SUIT_DETAILS[card.declaredSuit] : null;
    return (
      <div className={`skull-playing-card suit-card wild15 ${card.declaredSuit || ""} ${className}`}>
        <span className="skull-card-corner"><b>15</b><i>{suit?.symbol || "✶"}</i></span>
        <span className="suit-watermark">✶</span>
        <strong>15</strong>
        <small>{suit ? suit.label : "Wild Monkey"}</small>
        <span className="expansion-mark">EXP</span>
      </div>
    );
  }
  const details = SKULL_KING_SUIT_DETAILS[card.suit];
  const rank = card.type === "choice" ? (card.declaredValue ?? "0/14") : card.rank;
  return (
    <div className={`skull-playing-card suit-card ${card.suit} ${card.type === "choice" ? "choice" : ""} ${className}`}>
      <span className="skull-card-corner"><b>{rank}</b><i>{details.symbol}</i></span>
      <span className="suit-watermark">{details.symbol}</span>
      <strong>{rank}</strong>
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
            {game.players.filter((candidate) => candidate.hand.length).map((candidate) => (
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

function RoundDialog({ game, onContinue }) {
  return (
    <div className="skull-modal-backdrop">
      <section className="skull-round-dialog" role="dialog" aria-modal="true" aria-labelledby="skull-round-title">
        <span className="panel-kicker">Round {game.roundNumber} complete</span>
        <h2 id="skull-round-title">The bids are settled.</h2>
        <div className="round-results">
          {[...game.players].sort((a, b) => b.score - a.score).map((player) => {
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
        <button type="button" className="skull-primary full" onClick={onContinue}>Deal round {game.roundNumber + 1} <span>→</span></button>
      </section>
    </div>
  );
}

function signed(value) {
  return `${value >= 0 ? "+" : ""}${value}`;
}

function GameOverDialog({ game, onRestart, onExit }) {
  const winners = game.roundSummary.winnerIndexes.map((index) => game.players[index]);
  const humanWon = winners.some((player) => player.id === 0);
  return (
    <div className="skull-modal-backdrop">
      <section className="skull-round-dialog game-over" role="dialog" aria-modal="true" aria-labelledby="skull-game-over-title">
        <span className="panel-kicker">Ten rounds sailed</span>
        <div className="winner-mark">☠</div>
        <h2 id="skull-game-over-title">{humanWon ? "You are the Skull King." : `${winners.map((player) => player.name).join(" & ")} takes the crown.`}</h2>
        <p>{humanWon ? "Your bids held fast through every storm." : "Another voyage could change the tide."}</p>
        <div className="dialog-actions">
          <button type="button" className="skull-primary" onClick={onRestart}>Play again</button>
          <button type="button" className="skull-secondary" onClick={onExit}>Change crew</button>
        </div>
      </section>
    </div>
  );
}
