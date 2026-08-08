"use client";

import { useEffect, useState } from "react";
import {
  BookOpen,
  ChevronRight,
  Crown,
  RotateCcw,
  Sparkles,
  Trophy,
  X,
} from "lucide-react";
import {
  SCUM_SUIT_SYMBOLS,
  chooseScumBotPlay,
  chooseScumCardSelection,
  createScumGame,
  getLegalScumPlays,
  getScumDeckCount,
  isLegalScumPlay,
  passScumTurn,
  playScumCards,
  scumPlaceName,
  scumRankLabel,
  startNextScumRound,
} from "../lib/scum";

const SET_NAMES = { 1: "single", 2: "pair", 3: "triple", 4: "four of a kind" };

function setName(count) {
  return SET_NAMES[count] || `set of ${count}`;
}

export default function ScumClient() {
  const [playerName, setPlayerName] = useState("");
  const [playerCount, setPlayerCount] = useState(4);
  const [game, setGame] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);
  const [rulesOpen, setRulesOpen] = useState(false);

  useEffect(() => {
    if (!game || game.phase !== "playing" || game.currentPlayerIndex === 0) return undefined;
    const timer = window.setTimeout(() => {
      setGame((current) => {
        if (!current || current.phase !== "playing" || current.currentPlayerIndex === 0) return current;
        const botIndex = current.currentPlayerIndex;
        const play = chooseScumBotPlay(current, botIndex);
        return play
          ? playScumCards(current, botIndex, play.map((card) => card.id))
          : passScumTurn(current, botIndex);
      });
    }, Math.max(180, 720 - ((game.playerCount || game.players.length) - 4) * 45));
    return () => window.clearTimeout(timer);
  }, [game]);

  useEffect(() => {
    setSelectedIds([]);
  }, [game?.currentPlayerIndex, game?.pile?.rank]);

  function begin() {
    setSelectedIds([]);
    setGame(createScumGame({ playerName, playerCount }));
  }

  function toggleCard(card) {
    if (!game || game.currentPlayerIndex !== 0 || game.phase !== "playing") return;
    setSelectedIds((current) =>
      chooseScumCardSelection(game.players[0].hand, card.id, current, game.pile?.count ?? null)
    );
  }

  function playSelected() {
    if (!game) return;
    setGame((current) => playScumCards(current, 0, selectedIds));
    setSelectedIds([]);
  }

  if (!game) {
    return (
      <main className="scum-app scum-intro-shell">
        <section className="scum-intro">
          <div className="scum-intro-copy">
            <span className="scum-kicker"><Sparkles size={15} /> A ruthless shedding game</span>
            <h1>Rise above.<br /><em>Leave no cards.</em></h1>
            <p>
              Play low, climb high, and empty your hand before the table. One seat wears the
              crown. One gets stuck with the title nobody wants.
            </p>
            <div className="scum-setup">
              <label>
                <span>Your name</span>
                <input
                  value={playerName}
                  onChange={(event) => setPlayerName(event.target.value)}
                  onKeyDown={(event) => event.key === "Enter" && begin()}
                  maxLength={18}
                  placeholder="You"
                />
              </label>
              <label className="scum-player-count">
                <span>Players</span>
                <input
                  type="number"
                  min="3"
                  value={playerCount}
                  onChange={(event) => setPlayerCount(Math.max(3, Math.floor(Number(event.target.value) || 3)))}
                  aria-describedby="scum-deck-count"
                />
                <small id="scum-deck-count">{getScumDeckCount(playerCount)} {getScumDeckCount(playerCount) === 1 ? "deck" : "decks"}</small>
              </label>
              <button type="button" className="scum-primary" onClick={begin}>
                Deal the cards <ChevronRight size={18} />
              </button>
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

  const humanTurn = game.phase === "playing" && game.currentPlayerIndex === 0;
  const activePlayerCount = game.playerCount || game.players.length;
  const activeDeckCount = game.deckCount || getScumDeckCount(activePlayerCount);
  const legalPlays = humanTurn ? getLegalScumPlays(game, 0) : [];
  const legalCardIds = new Set(legalPlays.flat().map((card) => card.id));
  const canPlay = humanTurn && isLegalScumPlay(game, 0, selectedIds);

  return (
    <main className="scum-app scum-game-shell">
      <header className="scum-gamebar">
        <div className="scum-wordmark"><span>S</span><strong>SCUM</strong></div>
        <div className="scum-gamebar-center">
          <span>Round {game.roundNumber || 1}</span><i />
          <span>{activePlayerCount} players · {activeDeckCount} {activeDeckCount === 1 ? "deck" : "decks"}</span><i />
          <span>2 low · Joker high</span>
        </div>
        <div className="scum-gamebar-actions">
          <button type="button" onClick={() => setRulesOpen(true)}><BookOpen size={16} /> Rules</button>
          <button type="button" onClick={begin}><RotateCcw size={16} /> New match</button>
        </div>
      </header>

      <section className="scum-board" aria-label="Scum card table">
        <div className="scum-opponents">
          {game.players.slice(1).map((player, offset) => (
            <Opponent key={player.id} player={player} playerCount={activePlayerCount} active={game.currentPlayerIndex === offset + 1} />
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
                  Locked: {setName(game.pile.count)} · Beat {scumRankLabel(game.pile.rank)}
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
            <span className="your-avatar">{game.players[0].name.slice(0, 1).toUpperCase()}</span>
            <div><strong>{game.players[0].name}</strong><small>{game.players[0].hand.length} cards</small></div>
            <span className="your-turn-chip">
              {game.players[0].place
                ? scumPlaceName(game.players[0].place, activePlayerCount)
                : humanTurn ? "Your turn" : game.players[0].title || "Waiting"}
            </span>
          </div>

          <div className="scum-hand" aria-label="Your hand">
            {game.players[0].hand.map((card, index) => {
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
            {!game.players[0].hand.length && <div className="hand-empty"><Trophy size={24} /> Hand cleared</div>}
          </div>

          <div className="scum-controls">
            <span>
              {selectedIds.length
                ? `${setName(selectedIds.length)} selected`
                : humanTurn && game.pile
                  ? `Tap a rank to select the required ${setName(game.pile.count)}`
                  : humanTurn
                    ? "Choose any matching set"
                    : "The table is playing…"}
            </span>
            <button
              type="button"
              className="scum-pass"
              disabled={!humanTurn || !game.pile}
              onClick={() => setGame((current) => passScumTurn(current, 0))}
            >Pass</button>
            <button type="button" className="scum-play" disabled={!canPlay} onClick={playSelected}>
              Play cards <ChevronRight size={17} />
            </button>
          </div>
        </section>
      </section>

      {game.phase === "finished" && (
        <Results game={game} onReplay={() => setGame((current) => startNextScumRound(current))} />
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
            : player.title ? `${player.title} · ${player.hand.length} cards` : `${player.hand.length} cards`}
        </small>
      </div>
      <div className="opponent-cards" aria-hidden="true">
        {Array.from({ length: Math.min(5, player.hand.length) }, (_, index) => <span key={index} style={{ "--i": index }} />)}
      </div>
      {active && <span className="thinking-dots"><i /><i /><i /></span>}
    </div>
  );
}

function IntroCard({ rank, suit, className }) {
  const red = suit === "♥" || suit === "♦";
  return <span className={`intro-card ${red ? "red" : ""} ${className}`}><b>{rank}</b><i>{suit}</i><em>{suit}</em></span>;
}

function Results({ game, onReplay }) {
  return (
    <div className="scum-modal-backdrop">
      <section className="results-card" role="dialog" aria-modal="true" aria-labelledby="results-title">
        <span className="results-crown"><Crown size={38} /></span>
        <span className="results-kicker">The table has spoken</span>
        <h2 id="results-title">{game.standings[0] === 0 ? "You rule the table." : `${game.players[game.standings[0]].name} takes the crown.`}</h2>
        <div className="results-list">
          {game.standings.map((playerIndex, index) => (
            <div key={playerIndex} className={playerIndex === 0 ? "you" : ""}>
              <span>{index + 1}</span>
              <strong>{game.players[playerIndex].name}</strong>
              <small>{scumPlaceName(index + 1, game.playerCount || game.players.length)}</small>
            </div>
          ))}
        </div>
        <button type="button" className="scum-primary" onClick={onReplay}>Start next round <ChevronRight size={18} /></button>
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
          <li><b>Know the order.</b><span>Twos are lowest. Play climbs through Ace, and Jokers are highest.</span></li>
          <li><b>Match the set.</b><span>Beat a single with a higher single, a pair with a higher pair, and so on.</span></li>
          <li><b>Take the lead.</b><span>Left of the dealer starts round one. The President starts every round after that.</span></li>
          <li><b>Bring the table.</b><span>Choose any number of players. The game adds one 54-card deck for every four players.</span></li>
          <li><b>Pass or climb.</b><span>Once you pass, you sit out until the pile clears. Four of a kind burns the pile.</span></li>
        </ol>
        <p>First out is President. Last holding cards is Scum.</p>
        <button type="button" className="scum-primary" onClick={onClose}>Got it</button>
      </section>
    </div>
  );
}
