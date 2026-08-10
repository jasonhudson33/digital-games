"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { BookOpen, Copy, DoorOpen, Footprints, Hand, Layers3, Play, Plus, Sparkles, UserPlus, Users, X } from "lucide-react";
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
  getHandFootGoOutBlockReason,
  handFootCardPoints,
  handFootMeldBonus,
  handFootRankLabel,
  isThree,
  isWildCard,
  playHandFootCards,
  startNextHandFootRound,
  toggleHandFootCardSelection,
} from "../lib/hand-and-foot";
import { HandFootRoomService } from "./hand-and-foot-room-service";

const BOT_NAMES = ["Marlow", "Vega", "Kit", "Rowan", "Jules", "Nova", "Ash", "Sage", "Remy", "Quinn", "Blair", "Drew", "Lane", "Parker", "Sky"];
const PLAYER_NAME_KEY = "hand-foot-player-name";

export default function HandAndFootClient() {
  const [playerName, setPlayerName] = useState("");
  const [playerCount, setPlayerCount] = useState(4);
  const [teammateName, setTeammateName] = useState(BOT_NAMES[0]);
  const [isReady, setIsReady] = useState(false);
  const [joinCode, setJoinCode] = useState("");
  const [roomToken, setRoomToken] = useState("");
  const [game, setGame] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);
  const [selectedMeldTarget, setSelectedMeldTarget] = useState(null);
  const [rulesOpen, setRulesOpen] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const latestGame = useRef(null);

  const availableTeammates = useMemo(() => BOT_NAMES.slice(0, playerCount - 1), [playerCount]);

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
    if (!availableTeammates.includes(teammateName)) setTeammateName(availableTeammates[0]);
  }, [playerCount, teammateName, availableTeammates]);

  useEffect(() => {
    if (!game || game.roomCode || game.phase !== "playing" || game.currentPlayerIndex === 0) return undefined;
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
            if (!playIds.length) break;
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
    }, game.playerCount > 8 ? 280 : 720);
    return () => window.clearTimeout(timer);
  }, [game]);

  useEffect(() => {
    setSelectedIds([]);
    setSelectedMeldTarget(null);
  }, [game?.currentPlayerIndex, game?.turnStage, game?.roundNumber]);

  function startGame() {
    const cleanName = usePlayerName();
    setGame(createHandFootMatch({ playerName: cleanName, playerCount, teammateName }));
    setSelectedIds([]);
    setSelectedMeldTarget(null);
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

  function copyInvite() {
    if (!game?.roomCode) return;
    void navigator.clipboard.writeText(`${window.location.origin}/hand-and-foot?room=${game.roomCode}`);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  function performAction(roomActionName, roomValues, localAction) {
    if (game?.roomCode) void roomAction(roomActionName, roomValues);
    else runAction(localAction);
  }

  function runAction(action) {
    try {
      setGame((current) => action(current));
      setSelectedIds([]);
      setSelectedMeldTarget(null);
      setError("");
    } catch (actionError) {
      setError(actionError.message);
    }
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

  if (!isReady) {
    return <main className="hf-app hf-intro-shell"><div className="hf-room-loading">Setting the table…</div></main>;
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
                  {[4, 6, 8, 10, 12, 14, 16].map((count) => <option key={count} value={count}>{count} players</option>)}
                </select>
              </label>
              <label>
                <span>Your teammate</span>
                <select value={teammateName} onChange={(event) => setTeammateName(event.target.value)}>
                  {availableTeammates.map((name) => <option key={name} value={name}>{name}</option>)}
                </select>
              </label>
              <button type="button" className="hf-primary" onClick={startGame}>Play with computers <span>→</span></button>
            </div>
            <p className="hf-seat-note"><Users size={16} /> Your chosen teammate will sit directly across from you in the turn order.</p>
            <div className="hf-entry-divider"><span>or use a shared room</span></div>
            <div className="hf-room-entry">
              <button type="button" className="hf-secondary" disabled={busy} onClick={createRoom}><Plus size={17} /> Create room</button>
              <div className="hf-join-row">
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
            {error && <div className="hf-error" role="alert">{error}</div>}
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

  if (game.phase === "lobby") {
    return (
      <HandFootLobby
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

  if (game.phase === "round-over" || game.phase === "game-over") {
    return (
      <RoundResults
        game={game}
        onNext={() => game.roomCode ? roomAction("nextRound") : runAction((current) => startNextHandFootRound(current))}
        onLeave={leaveGame}
      />
    );
  }

  const viewerPlayerIndex = game.viewerPlayerIndex ?? 0;
  const human = game.players[viewerPlayerIndex];
  const activeCards = activeCardsFor(game, viewerPlayerIndex);
  const yourTurn = game.currentPlayerIndex === viewerPlayerIndex;
  const drawPiles = game.drawPiles?.length ? game.drawPiles : [game.drawPile];
  const cardsStillToDraw = 2 - (game.cardsDrawnThisTurn || 0);
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
    performAction(
      "draw",
      { pileIndex, cardCount: 1 },
      (current) => drawHandFootCards(current, viewerPlayerIndex, pileIndex, 1),
    );
  }

  function discardSelectedCard() {
    if (!canDiscardSelected) return;
    performAction(
      "discard",
      { cardId: selectedIds[0] },
      (current) => discardHandFootCard(current, viewerPlayerIndex, selectedIds[0]),
    );
  }

  return (
    <main className="hf-app hf-game-shell">
      <header className="hf-gamebar">
        <div className="hf-game-title"><span><Layers3 size={19} /></span><div><strong>Hand &amp; Foot</strong><small>{game.roomCode ? `Room ${game.roomCode} · ` : ""}Round {game.roundNumber} of 4 · Open with {game.roundRequirement} points</small></div></div>
        <div className="hf-game-actions">
          {game.roomCode && <button type="button" onClick={copyInvite}><Copy size={16} /> {copied ? "Copied" : "Invite"}</button>}
          <button type="button" onClick={() => setRulesOpen(true)}><BookOpen size={16} /> Rules</button>
          <button type="button" onClick={leaveGame}><DoorOpen size={16} /> Leave game</button>
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
              <span><strong>{player.name}{player.isViewer ? " · You" : ""}</strong><small>Team {player.teamId + 1} · {player.usingFoot ? `${player.footCount ?? player.foot.length} in foot` : `${player.handCount ?? player.hand.length} in hand · ${player.footCount ?? player.foot.length} hidden`}</small></span>
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
                  disabled={!yourTurn || game.turnStage !== "draw" || pile.length === 0}
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
            <strong>{yourTurn ? (game.turnStage === "draw" ? `Your turn — draw ${cardsStillToDraw === 1 ? "one more" : "two"}` : "Your turn — meld, then discard") : `Waiting for ${game.players[game.currentPlayerIndex].name}`}</strong>
            <small>{human.usingFoot ? "Playing from your foot" : `Your foot is hidden (${human.footCount ?? human.foot.length} cards)`} · Team {humanTeam.opened ? "is open" : `needs ${game.roundRequirement} points`}</small>
          </div>
          <div className="hf-turn-actions">
            {yourTurn && game.turnStage === "draw" && <button type="button" className="hf-primary compact" onClick={() => performAction("draw", {}, (current) => drawHandFootCards(current, viewerPlayerIndex))}>Draw {cardsStillToDraw}</button>}
            {yourTurn && game.turnStage === "play" && <>
              <button type="button" className="hf-secondary" disabled={!selectedCanPlay} onClick={() => performAction("play", { cardIds: selectedIds, targetRank: selectedMeldTarget }, (current) => playHandFootCards(current, viewerPlayerIndex, selectedIds, selectedMeldTarget))}>{humanTeam.opened ? "Play selected" : "Open with selected"}</button>
              <button type="button" className="hf-discard-button" disabled={!canDiscardSelected} onClick={discardSelectedCard}>Discard selected</button>
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
        <div className="hf-hand" aria-label={human.usingFoot ? "Your foot" : "Your hand"}>
          {activeCards.map((card) => <PlayingCard key={card.id} card={card} selected={selectedIds.includes(card.id)} disabled={!yourTurn || game.turnStage !== "play"} onClick={() => toggleCard(card.id)} />)}
        </div>
      </section>
      <RulesDialog open={rulesOpen} onClose={() => setRulesOpen(false)} />
    </main>
  );
}

function HandFootLobby({ game, copied, error, onCopy, onLeave, onAction, onRules, rulesOpen, onCloseRules }) {
  const canStart = game.players.length >= 4 && game.players.length <= 16 && game.players.length % 2 === 0;
  const viewer = game.players.find((player) => player.isViewer);
  const playerNameById = Object.fromEntries(game.players.map((player) => [player.playerId, player.name]));
  return (
    <main className="hf-app hf-intro-shell hf-lobby-shell">
      <section className="hf-lobby-card">
        <span className="hf-kicker"><Sparkles size={15} /> Gather your teams</span>
        <h1>Hand <em>&amp;</em> Foot</h1>
        <p>Invite an even table of four to sixteen. Everyone can name a preferred teammate; mutual choices are paired first and seated opposite.</p>

        <div className="hf-room-code">
          <span>Room code</span>
          <strong>{game.roomCode}</strong>
          <button type="button" onClick={onCopy}><Copy size={16} /> {copied ? "Copied" : "Copy invite"}</button>
        </div>

        <div className="hf-lobby-players">
          {game.players.map((player, index) => (
            <div key={player.playerId}>
              <span>{player.name.slice(0, 1).toUpperCase()}</span>
              <strong>{player.name}{player.isViewer ? " · You" : ""}</strong>
              <small>
                {index === 0 ? "Host" : player.isComputer ? "Computer" : "Ready"}
                {game.teammatePreferences[player.playerId] ? ` · prefers ${playerNameById[game.teammatePreferences[player.playerId]]}` : ""}
              </small>
              {player.isComputer && game.hostControls && <button type="button" onClick={() => onAction("removeComputer", { playerId: player.playerId })}><X size={14} /> Remove</button>}
            </div>
          ))}
        </div>

        {game.players.length < 16 && game.hostControls && (
          <button type="button" className="hf-add-computer" onClick={() => onAction("addComputer")}><UserPlus size={17} /> Add computer</button>
        )}

        <label className="hf-team-choice">
          <span>Your preferred teammate</span>
          <select value={game.viewerTeammateId || ""} onChange={(event) => onAction("chooseTeammate", { teammateId: event.target.value })}>
            <option value="" disabled>Choose a player</option>
            {game.players.filter((player) => player.playerId !== viewer.playerId).map((player) => <option key={player.playerId} value={player.playerId}>{player.name}</option>)}
          </select>
          <small>Mutual choices take priority. Remaining players are paired in lobby order.</small>
        </label>

        <div className="hf-lobby-summary"><span>{game.players.length} players</span><span>{Math.floor(game.players.length / 2)} teams at start</span><span>13-card hand + foot</span></div>
        {game.hostControls ? (
          <button type="button" className="hf-primary hf-lobby-start" disabled={!canStart} onClick={() => onAction("start")}><Play size={18} /> Start game</button>
        ) : (
          <p className="hf-lobby-waiting">Waiting for the host to start the game…</p>
        )}
        {!canStart && game.hostControls && <p className="hf-lobby-waiting">Add players until there is an even table of at least four.</p>}
        {error && <div className="hf-error" role="alert">{error}</div>}
        <div className="hf-lobby-footer"><button type="button" onClick={onRules}><BookOpen size={16} /> Rules</button><button type="button" onClick={onLeave}><DoorOpen size={16} /> Leave game</button></div>
      </section>
      <RulesDialog open={rulesOpen} onClose={onCloseRules} />
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
    <main className="hf-app hf-results-shell">
      <section className="hf-results-card">
        <span className="hf-kicker">{winner ? "Game complete" : `Round ${game.roundNumber} complete`}</span>
        <h1>{winner ? `Team ${winner.id + 1} wins!` : drawPileEndedRound ? "The draw pile ran out." : "Count the table."}</h1>
        <p>{winner ? `${winner.memberIds.map((id) => game.players[id].name).join(" and ")} finish with ${winner.score.toLocaleString()} points.` : drawPileEndedRound ? "The discard pile stays put. Laid cards and books are counted, and every card left in a hand or foot is subtracted." : "Books are counted, loose cards come off, and the next opening gets tougher."}</p>
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
        <div className="hf-result-actions">
          {!winner && (!game.roomCode || game.hostControls) && <button type="button" className="hf-primary" onClick={onNext}>Start round {game.roundNumber + 1}</button>}
          {!winner && game.roomCode && !game.hostControls && <p className="hf-lobby-waiting">Waiting for the host to start round {game.roundNumber + 1}…</p>}
          <button type="button" className="hf-secondary" onClick={onLeave}><DoorOpen size={16} /> Leave game</button>
        </div>
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
          <article><b>1</b><div><h3>Partners sit opposite</h3><p>Four to sixteen players, in even-numbered groups, form two-person teams. Every player gets a 13-card hand and a hidden 13-card foot.</p></div></article>
          <article><b>2</b><div><h3>Draw, meld, discard</h3><p>Draw two with the button, or click any draw pile to take one card at a time. Clicking a natural 4 through Ace selects every matching rank, except an unplayed pair selects one at a time. Twos, jokers, and threes also select individually.</p></div></article>
          <article><b>3</b><div><h3>Open as a team</h3><p>One teammate must lay 50, 90, 120, then 150 points in rounds one through four. After that, either teammate may add legal cards.</p></div></article>
          <article><b>4</b><div><h3>Manage wilds</h3><p>Twos and jokers are wild. Choose which team pile receives a wild. A regular meld may hold at most two, and must always have more natural cards than wilds. Wild-only melds are allowed.</p></div></article>
          <article><b>5</b><div><h3>Reach your foot</h3><p>Empty your hand to reveal a sorted foot. Until your teammate reaches their foot and has no 3, melds must leave you at least two foot cards before your discard. Once clear, you may meld or discard your last card to go out.</p></div></article>
          <article><b>6</b><div><h3>Score four rounds</h3><p>Count laid cards and books, then subtract every card left. The draw pile is never reshuffled; if fewer than two cards remain for a draw, the round ends and is scored. Seven-card books score 500 clean, 300 dirty, or 2,500 wild; a clean book of sevens scores 3,000, but sevens with a wild score 300.</p></div></article>
        </div>
        <div className="hf-point-row"><span>4–7 <b>5</b></span><span>8–K <b>10</b></span><span>A &amp; 2 <b>20</b></span><span>Joker <b>50</b></span><span>Red 3 <b>−100</b></span><span>Black 3 <b>−300</b></span></div>
      </section>
    </div>
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
