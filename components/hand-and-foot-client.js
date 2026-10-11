"use client";

import { useEffect, useRef, useState } from "react";
import {
  Footprints,
  Hand,
  Layers3,
  Play,
  Sparkles,
  Users,
  X,
} from "lucide-react";
import {
  HAND_FOOT_SUIT_SYMBOLS,
  activeCardsFor,
  canPlayHandFootCards,
  formatHandFootCard,
  getHandFootGoOutBlockReason,
  handFootCardPoints,
  handFootMeldBonus,
  handFootRankLabel,
  isThree,
  isWildCard,
  toggleHandFootCardSelection,
} from "../lib/hand-and-foot";
import { HandFootRoomService } from "./hand-and-foot-room-service";
import { ChoiceModal, GameHeader, Hero, Landing, Lobby as SharedLobby, Results } from "./ui/table-shell";

const PLAYER_NAME_KEY = "hand-foot-player-name";

export default function HandAndFootClient() {
  const [playerName, setPlayerName] = useState("");
  const [isReady, setIsReady] = useState(false);
  const [joinCode, setJoinCode] = useState("");
  const [roomToken, setRoomToken] = useState("");
  const [game, setGame] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);
  const [selectedMeldTarget, setSelectedMeldTarget] = useState(null);
  const [rulesOpen, setRulesOpen] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const latestGame = useRef(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("room")?.toUpperCase() || "";
    const savedToken = code ? getStoredRoomToken(code) : "";
    setPlayerName(localStorage.getItem(PLAYER_NAME_KEY) || "");
    setJoinCode(code);
    setRoomToken(savedToken);
    setIsReady(true);
  }, []);

  useEffect(() => {
    latestGame.current = game;
  }, [game]);

  useEffect(() => {
    if (!isReady || game || !joinCode || !roomToken) return;
    let cancelled = false;
    void HandFootRoomService.load(joinCode, roomToken).then((state) => {
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
    return HandFootRoomService.subscribe(game.roomCode, roomToken, (remote) => {
      setGame((current) => !current || remote.updatedAt >= current.updatedAt ? remote : current);
    });
  }, [game?.roomCode, roomToken]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [game?.phase, game?.roundNumber]);

  useEffect(() => {
    setSelectedIds([]);
    setSelectedMeldTarget(null);
  }, [game?.currentPlayerIndex, game?.turnStage, game?.roundNumber]);

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
    setError("");
    window.history.replaceState(null, "", `/hand-and-foot?room=${state.roomCode}`);
  }

  async function createRoom() {
    setBusy(true);
    setError("");
    try {
      const payload = await HandFootRoomService.create(usePlayerName());
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
          const state = await HandFootRoomService.load(code, savedToken);
          enterRoom(state, savedToken);
          return;
        } catch (roomError) {
          if (!isStaleRoomCredentialError(roomError)) throw roomError;
          removeStoredRoomToken(code);
        }
      }
      const payload = await HandFootRoomService.join(code, usePlayerName());
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
      const next = await HandFootRoomService.action(current.roomCode, roomToken, action, values);
      setGame(next);
      latestGame.current = next;
      setSelectedIds([]);
      setSelectedMeldTarget(null);
    } catch (roomError) {
      setError(roomError instanceof Error ? roomError.message : "The room could not be updated.");
    }
  }

  function leaveGame() {
    setGame(null);
    latestGame.current = null;
    setRoomToken("");
    setJoinCode("");
    setSelectedIds([]);
    setSelectedMeldTarget(null);
    setError("");
    window.history.replaceState(null, "", "/hand-and-foot");
  }


  function toggleCard(cardId) {
    setError("");
    setSelectedMeldTarget(null);
    const playerIndex = game.viewerPlayerIndex ?? 0;
    const player = game.players[playerIndex];
    setSelectedIds((current) => toggleHandFootCardSelection(
      activeCardsFor(game, playerIndex),
      current,
      cardId,
      game.teams[player.teamId].melds,
    ));
  }


  const rulesDialog = <RulesDialog open={rulesOpen} onClose={() => setRulesOpen(false)} />;

  if (!game) {
    return <Landing
      gameName="Hand & Foot"
      theme="tbl-light hand-and-foot-theme"
      hero={<Hero
        kicker="Partners, piles, and big-point books"
        title={<>Hand <em>&amp;</em><br />Foot</>}
        copy="Race through your hand, unlock your hidden foot, and build towering melds with the teammate sitting across from you."
        badges={[{ icon: Users, label: "4–16 players" }, { icon: Layers3, label: "Partners across the table" }, { icon: Sparkles, label: "4 rounds" }]}
        artLayout="free"
        art={<div className="hf-hero-art" aria-label="Two stacks of playing cards">
          <div className="hf-art-stack hf-art-hand"><span>HAND</span><Hand size={34} /></div>
          <div className="hf-art-stack hf-art-foot"><span>FOOT</span><Footprints size={34} /></div>
          <div className="hf-art-card art-seven">7<span>♦</span></div>
          <div className="hf-art-card art-joker">J<small>OKER</small></div>
        </div>}
      />}
      entry={{ name: playerName, setName: setPlayerName, joinCode, setJoinCode, createRoom, joinRoom, busy, error }}
      onRules={() => setRulesOpen(true)}
      dialogs={rulesDialog}
    />;
  }

  if (game.phase === "lobby") {
    const viewer = game.players.find((player) => player.isViewer) ?? game.players[0];
    const playerNameById = Object.fromEntries(game.players.map((player) => [player.playerId, player.name]));
    const canStart = game.players.length >= 4 && game.players.length <= 16 && game.players.length % 2 === 0;
    return <SharedLobby
      gameName="Hand & Foot"
      theme="tbl-light hand-and-foot-theme"
      room={{ roomCode: game.roomCode, hostId: game.hostControls ? viewer.playerId : game.players[0].playerId, players: game.players.map((player) => ({ ...player, id: player.playerId })) }}
      me={{ id: viewer.playerId }}
      busy={busy}
      error={error}
      min={4}
      max={16}
      canStart={canStart}
      seatNote={canStart ? `${Math.floor(game.players.length / 2)} teams · 13-card hand + foot` : "Add players until there is an even table of at least four."}
      options={<label className="hf-team-choice">
        <span>Your preferred teammate</span>
        <select value={game.viewerTeammateId || ""} onChange={(event) => roomAction("chooseTeammate", { teammateId: event.target.value })}>
          <option value="" disabled>Choose a player</option>
          {game.players.filter((player) => player.playerId !== viewer.playerId).map((player) => <option key={player.playerId} value={player.playerId}>{player.name}{game.teammatePreferences[player.playerId] ? ` (prefers ${playerNameById[game.teammatePreferences[player.playerId]]})` : ""}</option>)}
        </select>
        <small>Mutual choices take priority. Remaining players are paired in lobby order.</small>
      </label>}
      onAdd={() => roomAction("addComputer")}
      onRemove={(id) => roomAction("removeComputer", { playerId: id })}
      onStart={() => roomAction("start")}
      onLeave={leaveGame}
      onRules={() => setRulesOpen(true)}
      rules={rulesDialog}
    />;
  }

  if (game.phase === "round-over" || game.phase === "game-over") {
    return (
      <main className="hf-app hf-game-shell tbl-light hand-and-foot-theme">
        <GameHeader title="Hand & Foot" room={game} subtitle={`Round ${game.roundNumber} of 4`} status={game.phase === "game-over" ? "Game complete" : "Round complete"} onRules={() => setRulesOpen(true)} onLeave={leaveGame} />
        <RoundResults game={game} onNext={() => roomAction("nextRound")} onLeave={leaveGame} />
        {rulesDialog}
      </main>
    );
  }

  const viewerPlayerIndex = game.viewerPlayerIndex ?? 0;
  const human = game.players[viewerPlayerIndex];
  const activeCards = activeCardsFor(game, viewerPlayerIndex);
  const yourTurn = game.currentPlayerIndex === viewerPlayerIndex;
  const pendingDrawCards = human.pendingDraw || [];
  const precedingPlayerIndex = (viewerPlayerIndex - 1 + game.playerCount) % game.playerCount;
  const precedingPlayer = game.players[precedingPlayerIndex];
  const precedingPlayerHasDrawn = precedingPlayerIndex === game.currentPlayerIndex
    ? game.turnStage === "play" && (game.cardsDrawnThisTurn || 0) >= 2
    : (precedingPlayer.pendingDrawCount ?? precedingPlayer.pendingDraw?.length ?? 0) >= 2;
  const canDrawAhead = !yourTurn && precedingPlayerHasDrawn && pendingDrawCards.length < 2;
  const canDrawCards = (yourTurn && game.turnStage === "draw") || canDrawAhead;
  const drawPiles = game.drawPiles?.length ? game.drawPiles : [game.drawPile];
  const cardsStillToDraw = yourTurn
    ? 2 - (game.cardsDrawnThisTurn || 0)
    : 2 - pendingDrawCards.length;
  const humanTeam = game.teams[human.teamId];
  const goOutBlockReason = getHandFootGoOutBlockReason(game, viewerPlayerIndex);
  const selectedCards = activeCards.filter((card) => selectedIds.includes(card.id));
  const wildOnlySelection = selectedCards.length > 0 && selectedCards.every(isWildCard);
  const requiresWildTarget = wildOnlySelection && humanTeam.opened;
  const wildTargetRanks = requiresWildTarget
    ? [
        ...Object.keys(humanTeam.melds),
        ...(!humanTeam.melds.wild && selectedCards.length >= 3 ? ["wild"] : []),
      ]
    : [];
  const selectedCanPlay = yourTurn
    && game.turnStage === "play"
    && (!requiresWildTarget || selectedMeldTarget !== null)
    && canPlayHandFootCards(game, viewerPlayerIndex, selectedIds, selectedMeldTarget);
  const canDiscardSelected = yourTurn && game.turnStage === "play" && selectedIds.length === 1;

  function drawFromPile(pileIndex) {
    void roomAction("draw", { pileIndex, cardCount: 1 });
  }

  function discardSelectedCard() {
    if (!canDiscardSelected) return;
    void roomAction("discard", { cardId: selectedIds[0] });
  }

  function deselectAll() {
    setSelectedIds([]);
    setSelectedMeldTarget(null);
    setError("");
  }

  return (
    <main className="hf-app hf-game-shell tbl-light hand-and-foot-theme">
      <GameHeader
        title="Hand & Foot"
        room={game}
        subtitle={`Round ${game.roundNumber} of 4 · Open with ${game.roundRequirement} points`}
        status={yourTurn ? "Your turn" : `${game.players[game.currentPlayerIndex]?.name ?? "…"}'s turn`}
        onRules={() => setRulesOpen(true)}
        onLeave={leaveGame}
      />

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
              <span><strong>{player.name}{player.isViewer ? " · You" : ""}</strong><small>Team {player.teamId + 1} · {player.usingFoot ? `${player.footCount ?? player.foot.length} in foot` : `${player.handCount ?? player.hand.length} in hand · ${player.footCount ?? player.foot.length} hidden`}{(player.pendingDrawCount ?? player.pendingDraw?.length ?? 0) > 0 ? ` · ${player.pendingDrawCount ?? player.pendingDraw.length} drawn ahead` : ""}</small></span>
              {game.currentPlayerIndex === index && <b>{game.turnStage === "draw" ? "Drawing" : "Playing"}</b>}
            </div>
          ))}
        </div>

        <div className="hf-table-center">
          <div className="hf-piles">
            <div className="hf-draw-piles" aria-label="Draw piles">
              {drawPiles.map((pile, pileIndex) => (
                <button
                  key={pileIndex}
                  type="button"
                  className="hf-draw-pile"
                  disabled={!canDrawCards || pile.length === 0}
                  onClick={() => drawFromPile(pileIndex)}
                  aria-label={`Draw one card from pile ${pileIndex + 1}; ${pile.length} cards remain`}
                >
                  <span>{pile.length}</span><small>Pile {pileIndex + 1}</small>
                </button>
              ))}
            </div>
            <button type="button" className="hf-discard-pile" disabled={!canDiscardSelected} onClick={discardSelectedCard} aria-label={canDiscardSelected ? "Discard selected card" : "Select one card to discard"}>
              {game.discardPile.length ? <MiniCard card={game.discardPile.at(-1)} /> : <span>Empty</span>}
              <small>{canDiscardSelected ? "click to discard" : "discard"}</small>
            </button>
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
            <strong>{yourTurn
              ? game.turnStage === "draw"
                ? `Your turn — draw ${cardsStillToDraw === 1 ? "one more" : "two"}`
                : "Your turn — meld, then discard"
              : canDrawAhead
                ? `Draw ahead — take ${cardsStillToDraw === 1 ? "one more card" : "two cards"}`
                : pendingDrawCards.length === 2
                  ? "Cards drawn — waiting for your turn"
                  : `Waiting for ${game.players[game.currentPlayerIndex].name}`}</strong>
            <small>{human.usingFoot ? "Playing from your foot" : `Your foot is hidden (${human.footCount ?? human.foot.length} cards)`} · Team {humanTeam.opened ? "is open" : `needs ${game.roundRequirement} points`}</small>
          </div>
          <div className="hf-turn-actions">
            {canDrawCards && <button type="button" className="hf-primary compact" onClick={() => roomAction("draw", {})}>{yourTurn ? "Draw" : "Draw ahead"} {cardsStillToDraw}</button>}
            {yourTurn && game.turnStage === "play" && <>
              <button type="button" className="hf-secondary" disabled={!selectedCanPlay} onClick={() => roomAction("play", { cardIds: selectedIds, targetRank: selectedMeldTarget })}>{humanTeam.opened ? "Play selected" : "Open with selected"}</button>
              <button type="button" className="hf-discard-button" disabled={!canDiscardSelected} onClick={discardSelectedCard}>Discard selected</button>
              <button type="button" className="hf-deselect-button" disabled={selectedIds.length === 0} onClick={deselectAll}><X size={15} /> Deselect All</button>
            </>}
          </div>
        </div>
        {requiresWildTarget && (
          <div className="hf-wild-target-picker" aria-label="Choose a pile for selected wild cards">
            <span>Choose a pile for {selectedCards.length === 1 ? "the wild card" : "these wild cards"}</span>
            <div>
              {wildTargetRanks.map((rank) => {
                const legal = canPlayHandFootCards(game, viewerPlayerIndex, selectedIds, rank);
                return (
                  <button
                    key={rank}
                    type="button"
                    className={selectedMeldTarget === rank ? "selected" : ""}
                    disabled={!legal}
                    onClick={() => setSelectedMeldTarget(rank)}
                  >
                    {handFootRankLabel(rank === "wild" ? rank : Number(rank))}
                    <small>{humanTeam.melds[rank]?.length || 0} cards</small>
                  </button>
                );
              })}
            </div>
            {!wildTargetRanks.some((rank) => canPlayHandFootCards(game, viewerPlayerIndex, selectedIds, rank)) && <small>No pile can legally accept this selection.</small>}
          </div>
        )}
        {human.usingFoot && goOutBlockReason && (
          <div className="hf-go-out-warning" role="status">
            You cannot go out because {goOutBlockReason}. Keep at least two cards in your foot before discarding.
          </div>
        )}
        {error && <div className="hf-error" role="alert">{error}</div>}
        {pendingDrawCards.length > 0 && !yourTurn && (
          <div className="hf-predraw-area">
            <div><strong>Drawn for your next turn</strong><small>These cards stay separate and will not count if the round ends before your turn.</small></div>
            <div className="hf-predrawn-cards" aria-label="Cards drawn ahead">
              {pendingDrawCards.map((card) => <PlayingCard key={card.id} card={card} selected={false} disabled />)}
            </div>
          </div>
        )}
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
          const condition = cards.some(isWildCard) ? "dirty" : "clean";
          const rankLabel = handFootRankLabel(rank === "wild" ? rank : Number(rank));
          return <div className={`hf-meld ${condition} ${cards.length >= 7 ? "book" : ""}`} key={rank} aria-label={`${rankLabel} pile, ${condition}`}><strong>{rankLabel}</strong><span>{cards.length} cards</span>{bonus > 0 && <b>+{bonus.toLocaleString()}</b>}</div>;
        })}
      </div>
    </article>
  );
}

function RoundResults({ game, onNext, onLeave }) {
  const winner = game.phase === "game-over" ? game.teams[game.winnerTeamId] : null;
  const drawPileEndedRound = game.roundSummary?.endReason === "draw-pile-empty";
  return (
    <Results
      title={winner ? `Team ${winner.id + 1} wins!` : drawPileEndedRound ? "The draw pile ran out." : "Count the table."}
      text={winner ? `${winner.memberIds.map((id) => game.players[id].name).join(" and ")} finish with ${winner.score.toLocaleString()} points.` : drawPileEndedRound ? "The discard pile stays put. Laid cards and books are counted, and every card left in a hand or foot is subtracted." : "Books are counted, loose cards come off, and the next opening gets tougher."}
      rows={game.teams.map((team) => {
        const breakdown = game.roundSummary.breakdowns[team.id];
        return {
          id: String(team.id),
          name: `Team ${team.id + 1} · ${team.memberIds.map((id) => game.players[id].name).join(" + ")}`,
          value: team.score.toLocaleString(),
          note: `laid +${breakdown.laidPoints} · books +${breakdown.bookBonus} · left ${breakdown.leftoverPoints} · round ${breakdown.total}`,
        };
      })}
    >
      {!winner && game.hostControls && <button type="button" className="tbl-primary" onClick={onNext}>Start round {game.roundNumber + 1}</button>}
      {!winner && !game.hostControls && <p className="tbl-wait">Waiting for the host to start round {game.roundNumber + 1}…</p>}
      <button type="button" className="tbl-link" onClick={onLeave}>Leave game</button>
    </Results>
  );
}

function RulesDialog({ open, onClose }) {
  if (!open) return null;
  return (
    <ChoiceModal wide title="Hand & Foot" text="How to play." onClose={onClose}>
      <div className="tbl-rule-grid">
        <article><b>Partners sit opposite</b><p>Four to sixteen players, in even-numbered groups, form two-person teams. The shoe uses one more deck than the number of players. Every player gets a 13-card hand and a hidden 13-card foot.</p></article>
        <article><b>Draw, meld, discard</b><p>Draw two with the button, or click piles one card at a time. After the current player draws two, draw-ahead permission passes clockwise: each player may draw after the player immediately before them finishes drawing two. The active player cannot draw twice before discarding, and ahead-drawn cards stay separate until their turn. Natural ranks select together, while twos, jokers, and threes select individually. Use Deselect All to clear a trial selection.</p></article>
        <article><b>Open as a team</b><p>One teammate must lay 50, 90, 120, then 150 points in rounds one through four. After that, either teammate may add legal cards.</p></article>
        <article><b>Manage wilds</b><p>Twos and jokers are wild. Choose which team pile receives a wild. A regular meld may hold at most two, and must always have more natural cards than wilds. Wild-only melds are allowed.</p></article>
        <article><b>Reach your foot</b><p>Empty your hand to reveal a sorted foot. Until your teammate reaches their foot and has no 3, melds must leave you at least two foot cards before your discard. Once clear, you may meld or discard your last card to go out.</p></article>
        <article><b>Score four rounds</b><p>Count laid cards and books, then subtract every card left. The draw pile is never reshuffled; if fewer than two cards remain for a draw, the round ends and is scored. Seven-card books score 500 clean, 300 dirty, or 2,500 wild; a clean book of sevens scores 3,000, but sevens with a wild score 300.</p></article>
      </div>
      <div className="hf-point-row"><span>4–7 <b>5</b></span><span>8–K <b>10</b></span><span>A &amp; 2 <b>20</b></span><span>Joker <b>50</b></span><span>Red 3 <b>−100</b></span><span>Black 3 <b>−300</b></span></div>
    </ChoiceModal>
  );
}

function roomTokenKey(roomCode) {
  return `hand-foot-room-token:${String(roomCode || "").toUpperCase()}`;
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
