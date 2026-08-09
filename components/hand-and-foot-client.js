"use client";

import { useEffect, useMemo, useState } from "react";
import { BookOpen, Footprints, Hand, Layers3, RotateCcw, Sparkles, Users, X } from "lucide-react";
import {
  HAND_FOOT_SUIT_SYMBOLS,
  activeCardsFor,
  canPlayHandFootCards,
  chooseHandFootBotDiscard,
  chooseHandFootBotPlay,
  createHandFootMatch,
  discardHandFootCard,
  drawHandFootCards,
  formatHandFootCard,
  handFootCardPoints,
  handFootMeldBonus,
  handFootRankLabel,
  isThree,
  isWildCard,
  playHandFootCards,
  startNextHandFootRound,
} from "../lib/hand-and-foot";

const BOT_NAMES = ["Marlow", "Vega", "Kit", "Rowan", "Jules", "Nova", "Ash"];

export default function HandAndFootClient() {
  const [playerName, setPlayerName] = useState("");
  const [playerCount, setPlayerCount] = useState(4);
  const [teammateName, setTeammateName] = useState(BOT_NAMES[0]);
  const [game, setGame] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);
  const [rulesOpen, setRulesOpen] = useState(false);
  const [error, setError] = useState("");

  const availableTeammates = BOT_NAMES.slice(0, playerCount - 1);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [game?.phase, game?.roundNumber]);

  useEffect(() => {
    if (!availableTeammates.includes(teammateName)) setTeammateName(availableTeammates[0]);
  }, [playerCount, teammateName, availableTeammates]);

  useEffect(() => {
    if (!game || game.phase !== "playing" || game.currentPlayerIndex === 0) return undefined;
    const timer = window.setTimeout(() => {
      setGame((current) => {
        if (!current || current.phase !== "playing" || current.currentPlayerIndex === 0) return current;
        try {
          let next = current;
          const botIndex = next.currentPlayerIndex;
          if (next.turnStage === "draw") next = drawHandFootCards(next, botIndex);
          let attempts = 0;
          while (next.phase === "playing" && attempts < 12) {
            attempts += 1;
            const playIds = chooseHandFootBotPlay(next, botIndex);
            const activeCount = activeCardsFor(next, botIndex).length;
            if (!playIds.length || activeCount - playIds.length === 1) break;
            try {
              next = playHandFootCards(next, botIndex, playIds);
            } catch {
              break;
            }
          }
          if (next.phase !== "playing") return next;
          const discard = chooseHandFootBotDiscard(next, botIndex);
          return discard ? discardHandFootCard(next, botIndex, discard.id) : next;
        } catch (botError) {
          return { ...current, message: `${current.players[current.currentPlayerIndex].name} could not complete the turn.` };
        }
      });
    }, 720);
    return () => window.clearTimeout(timer);
  }, [game]);

  function startGame() {
    setGame(createHandFootMatch({ playerName, playerCount, teammateName }));
    setSelectedIds([]);
    setError("");
  }

  function runAction(action) {
    try {
      setGame((current) => action(current));
      setSelectedIds([]);
      setError("");
    } catch (actionError) {
      setError(actionError.message);
    }
  }

  function toggleCard(cardId) {
    setError("");
    setSelectedIds((current) => current.includes(cardId)
      ? current.filter((id) => id !== cardId)
      : [...current, cardId]);
  }

  if (!game) {
    return (
      <main className="hf-app hf-intro-shell">
        <section className="hf-intro">
          <div className="hf-intro-copy">
            <span className="hf-kicker"><Sparkles size={15} /> Partners, piles, and big-point books</span>
            <h1>Hand <em>&amp;</em><br />Foot</h1>
            <p>
              Race through your hand, unlock your hidden foot, and build towering melds with
              the teammate sitting across from you.
            </p>

            <div className="hf-setup-grid">
              <label>
                <span>Your name</span>
                <input value={playerName} onChange={(event) => setPlayerName(event.target.value)} maxLength={18} placeholder="You" />
              </label>
              <label>
                <span>Players</span>
                <select value={playerCount} onChange={(event) => setPlayerCount(Number(event.target.value))}>
                  {[4, 6, 8].map((count) => <option key={count} value={count}>{count} players</option>)}
                </select>
              </label>
              <label>
                <span>Your teammate</span>
                <select value={teammateName} onChange={(event) => setTeammateName(event.target.value)}>
                  {availableTeammates.map((name) => <option key={name} value={name}>{name}</option>)}
                </select>
              </label>
              <button type="button" className="hf-primary" onClick={startGame}>Deal the cards <span>→</span></button>
            </div>
            <p className="hf-seat-note"><Users size={16} /> Your chosen teammate will sit directly across from you in the turn order.</p>
            <button type="button" className="hf-text-button" onClick={() => setRulesOpen(true)}><BookOpen size={16} /> Read the rules</button>
          </div>

          <div className="hf-hero-art" aria-label="Two stacks of playing cards">
            <div className="hf-sun" />
            <div className="hf-art-stack hf-art-hand"><span>HAND</span><Hand size={34} /></div>
            <div className="hf-art-stack hf-art-foot"><span>FOOT</span><Footprints size={34} /></div>
            <div className="hf-art-card art-seven">7<span>♦</span></div>
            <div className="hf-art-card art-joker">J<small>OKER</small></div>
            <div className="hf-art-badge"><b>4</b><span>rounds</span></div>
          </div>
        </section>
        <RulesDialog open={rulesOpen} onClose={() => setRulesOpen(false)} />
      </main>
    );
  }

  if (game.phase === "round-over" || game.phase === "game-over") {
    return <RoundResults game={game} onNext={() => runAction((current) => startNextHandFootRound(current))} onNew={() => setGame(null)} />;
  }

  const human = game.players[0];
  const activeCards = activeCardsFor(game, 0);
  const yourTurn = game.currentPlayerIndex === 0;
  const humanTeam = game.teams[human.teamId];
  const selectedCanPlay = yourTurn
    && game.turnStage === "play"
    && canPlayHandFootCards(game, 0, selectedIds);

  return (
    <main className="hf-app hf-game-shell">
      <header className="hf-gamebar">
        <div className="hf-game-title"><span><Layers3 size={19} /></span><div><strong>Hand &amp; Foot</strong><small>Round {game.roundNumber} of 4 · Open with {game.roundRequirement} points</small></div></div>
        <div className="hf-game-actions">
          <button type="button" onClick={() => setRulesOpen(true)}><BookOpen size={16} /> Rules</button>
          <button type="button" onClick={() => setGame(null)}><RotateCcw size={16} /> New game</button>
        </div>
      </header>

      <section className="hf-scoreboard" aria-label="Team scores">
        {game.teams.map((team) => (
          <div key={team.id} className={`hf-team-score ${team.id === human.teamId ? "yours" : ""}`}>
            <span>Team {team.id + 1}{team.id === human.teamId ? " · Yours" : ""}</span>
            <strong>{team.score.toLocaleString()}</strong>
            <small>{team.memberIds.map((id) => game.players[id].name).join(" + ")}</small>
          </div>
        ))}
      </section>

      <section className="hf-table">
        <div className="hf-seats" aria-label="Turn order">
          {game.players.map((player, index) => (
            <div key={player.id} className={`hf-seat ${game.currentPlayerIndex === index ? "active" : ""} ${player.teamId === human.teamId ? "teammate" : ""}`}>
              <span className="hf-avatar">{player.name.slice(0, 1).toUpperCase()}</span>
              <span><strong>{player.name}</strong><small>Team {player.teamId + 1} · {player.usingFoot ? `${player.foot.length} in foot` : `${player.hand.length} in hand · ${player.foot.length} hidden`}</small></span>
              {game.currentPlayerIndex === index && <b>{game.turnStage === "draw" ? "Drawing" : "Playing"}</b>}
            </div>
          ))}
        </div>

        <div className="hf-table-center">
          <div className="hf-piles">
            <div className="hf-draw-pile"><span>{game.drawPile.length}</span><small>draw pile</small></div>
            <div className="hf-discard-pile">
              {game.discardPile.length ? <MiniCard card={game.discardPile.at(-1)} /> : <span>Empty</span>}
              <small>discard</small>
            </div>
          </div>
          <div className="hf-message" role="status">{game.message}</div>
          <div className="hf-meld-board">
            {game.teams.map((team) => <TeamMelds key={team.id} team={team} players={game.players} isYours={team.id === human.teamId} />)}
          </div>
        </div>
      </section>

      <section className="hf-player-area">
        <div className="hf-player-heading">
          <div>
            <span className={`hf-turn-dot ${yourTurn ? "on" : ""}`} />
            <strong>{yourTurn ? (game.turnStage === "draw" ? "Your turn — draw two" : "Your turn — meld, then discard") : `Waiting for ${game.players[game.currentPlayerIndex].name}`}</strong>
            <small>{human.usingFoot ? "Playing from your foot" : `Your foot is hidden (${human.foot.length} cards)`} · Team {humanTeam.opened ? "is open" : `needs ${game.roundRequirement} points`}</small>
          </div>
          <div className="hf-turn-actions">
            {yourTurn && game.turnStage === "draw" && <button type="button" className="hf-primary compact" onClick={() => runAction((current) => drawHandFootCards(current, 0))}>Draw 2</button>}
            {yourTurn && game.turnStage === "play" && <>
              <button type="button" className="hf-secondary" disabled={!selectedCanPlay} onClick={() => runAction((current) => playHandFootCards(current, 0, selectedIds))}>{humanTeam.opened ? "Play selected" : "Open with selected"}</button>
              <button type="button" className="hf-discard-button" disabled={selectedIds.length !== 1} onClick={() => runAction((current) => discardHandFootCard(current, 0, selectedIds[0]))}>Discard selected</button>
            </>}
          </div>
        </div>
        {error && <div className="hf-error" role="alert">{error}</div>}
        <div className="hf-hand" aria-label={human.usingFoot ? "Your foot" : "Your hand"}>
          {activeCards.map((card) => <PlayingCard key={card.id} card={card} selected={selectedIds.includes(card.id)} disabled={!yourTurn || game.turnStage !== "play"} onClick={() => toggleCard(card.id)} />)}
        </div>
      </section>
      <RulesDialog open={rulesOpen} onClose={() => setRulesOpen(false)} />
    </main>
  );
}

function PlayingCard({ card, selected, disabled, onClick }) {
  const red = card.suit === "hearts" || card.suit === "diamonds";
  return (
    <button type="button" className={`hf-card ${red ? "red" : ""} ${isWildCard(card) ? "wild" : ""} ${isThree(card) ? "three" : ""} ${selected ? "selected" : ""}`} disabled={disabled} onClick={onClick} aria-pressed={selected}>
      {card.rank === "joker" ? <><b>J</b><span className="joker-word">JOKER</span><i>★</i></> : <><b>{handFootRankLabel(card.rank)}</b><span>{HAND_FOOT_SUIT_SYMBOLS[card.suit]}</span><i>{HAND_FOOT_SUIT_SYMBOLS[card.suit]}</i></>}
      <small>{handFootCardPoints(card)}</small>
    </button>
  );
}

function MiniCard({ card }) {
  const red = card.suit === "hearts" || card.suit === "diamonds";
  return <div className={`hf-mini-card ${red ? "red" : ""}`}>{card.rank === "joker" ? "★" : <><b>{handFootRankLabel(card.rank)}</b>{HAND_FOOT_SUIT_SYMBOLS[card.suit]}</>}</div>;
}

function TeamMelds({ team, players, isYours }) {
  const melds = Object.entries(team.melds);
  return (
    <article className={`hf-team-melds ${isYours ? "yours" : ""}`}>
      <header><span>Team {team.id + 1}</span><small>{players[team.memberIds[0]].name} + {players[team.memberIds[1]].name}</small><b>{team.opened ? "Open" : "Waiting"}</b></header>
      <div className="hf-meld-list">
        {!melds.length && <span className="hf-empty-meld">No melds yet</span>}
        {melds.map(([rank, cards]) => {
          const bonus = handFootMeldBonus(rank, cards);
          return <div className={`hf-meld ${cards.length >= 7 ? "book" : ""}`} key={rank}><strong>{handFootRankLabel(rank === "wild" ? rank : Number(rank))}</strong><span>{cards.length} cards</span>{bonus > 0 && <b>+{bonus.toLocaleString()}</b>}</div>;
        })}
      </div>
    </article>
  );
}

function RoundResults({ game, onNext, onNew }) {
  const winner = game.phase === "game-over" ? game.teams[game.winnerTeamId] : null;
  return (
    <main className="hf-app hf-results-shell">
      <section className="hf-results-card">
        <span className="hf-kicker">{winner ? "Game complete" : `Round ${game.roundNumber} complete`}</span>
        <h1>{winner ? `Team ${winner.id + 1} wins!` : "Count the table."}</h1>
        <p>{winner ? `${winner.memberIds.map((id) => game.players[id].name).join(" and ")} finish with ${winner.score.toLocaleString()} points.` : "Books are counted, loose cards come off, and the next opening gets tougher."}</p>
        <div className="hf-result-teams">
          {game.teams.map((team) => {
            const breakdown = game.roundSummary.breakdowns[team.id];
            return <article key={team.id} className={winner?.id === team.id ? "winner" : ""}>
              <header><span>Team {team.id + 1}</span><strong>{team.score.toLocaleString()}</strong></header>
              <small>{team.memberIds.map((id) => game.players[id].name).join(" + ")}</small>
              <dl><div><dt>Cards laid</dt><dd>+{breakdown.laidPoints}</dd></div><div><dt>Book bonuses</dt><dd>+{breakdown.bookBonus}</dd></div><div><dt>Cards left</dt><dd>{breakdown.leftoverPoints}</dd></div><div className="total"><dt>Round total</dt><dd>{breakdown.total}</dd></div></dl>
            </article>;
          })}
        </div>
        <div className="hf-result-actions">{!winner && <button type="button" className="hf-primary" onClick={onNext}>Start round {game.roundNumber + 1}</button>}<button type="button" className="hf-secondary" onClick={onNew}>New game</button></div>
      </section>
    </main>
  );
}

function RulesDialog({ open, onClose }) {
  if (!open) return null;
  return (
    <div className="hf-dialog-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="hf-dialog" role="dialog" aria-modal="true" aria-labelledby="hf-rules-title">
        <button type="button" className="hf-dialog-close" onClick={onClose} aria-label="Close rules"><X size={20} /></button>
        <span className="hf-kicker">How to play</span><h2 id="hf-rules-title">Hand &amp; Foot</h2>
        <div className="hf-rules-grid">
          <article><b>1</b><div><h3>Partners sit opposite</h3><p>Four, six, or eight players form two-person teams. Every player gets a 13-card hand and a hidden 13-card foot.</p></div></article>
          <article><b>2</b><div><h3>Draw, meld, discard</h3><p>Draw two. Meld three or more matching ranks, add to your team’s melds, then discard one card to finish your turn.</p></div></article>
          <article><b>3</b><div><h3>Open as a team</h3><p>One teammate must lay 50, 90, 120, then 150 points in rounds one through four. After that, either teammate may add legal cards.</p></div></article>
          <article><b>4</b><div><h3>Manage wilds</h3><p>Twos and jokers are wild. A regular meld may hold at most two wilds and never more wilds than natural cards. Wild-only melds are allowed.</p></div></article>
          <article><b>5</b><div><h3>Reach your foot</h3><p>Empty your hand to reveal and play your foot. Your last foot card must be melded, and you cannot go out while your teammate holds a 3.</p></div></article>
          <article><b>6</b><div><h3>Score four rounds</h3><p>Count laid cards and books, then subtract every card left. Seven-card books score 500 clean, 300 dirty, 2,500 wild, or 3,000 for sevens.</p></div></article>
        </div>
        <div className="hf-point-row"><span>4–7 <b>5</b></span><span>8–K <b>10</b></span><span>A &amp; 2 <b>20</b></span><span>Joker <b>50</b></span><span>Red 3 <b>−100</b></span><span>Black 3 <b>−300</b></span></div>
      </section>
    </div>
  );
}
