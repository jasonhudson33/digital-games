"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { BookOpen, Bot, Copy, Crown, DoorOpen, Plus, Sparkles, Trash2, Trophy, UserPlus, Users, X } from "lucide-react";
import {
  PINOCHLE_SUITS,
  PINOCHLE_SUIT_SYMBOLS,
  formatPinochleCard,
  getAvailableTwoPlayerMelds,
  getLegalPinochleCards,
  pinochleRankLabel,
  pinochleTeamName,
} from "../lib/pinochle";
import { PlayedCard, Seat, SeatedTable } from "./ui/seated-table";
import { PinochleRoomService } from "./pinochle-room-service";

const plural = (count, word) => `${count} ${word}${count === 1 ? "" : "s"}`;

const PLAYER_NAME_KEY = "pinochle-player-name";

export default function PinochleClient() {
  const [playerName, setPlayerName] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [roomToken, setRoomToken] = useState("");
  const [game, setGame] = useState(null);
  const [isReady, setIsReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [rulesOpen, setRulesOpen] = useState(false);
  const [bidAmount, setBidAmount] = useState(200);
  const [selectedIds, setSelectedIds] = useState([]);
  const latestGame = useRef(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("room")?.toUpperCase() || "";
    setPlayerName(localStorage.getItem(PLAYER_NAME_KEY) || "");
    setJoinCode(code);
    setRoomToken(code ? getStoredRoomToken(code) : "");
    setIsReady(true);
  }, []);

  useEffect(() => { latestGame.current = game; }, [game]);

  useEffect(() => {
    if (game?.phase) window.scrollTo({ top: 0, behavior: "smooth" });
  }, [game?.phase, game?.roomCode, game?.roundNumber]);

  useEffect(() => {
    if (!isReady || game || !joinCode || !roomToken) return;
    let cancelled = false;
    void PinochleRoomService.load(joinCode, roomToken).then((state) => {
      if (!cancelled) setGame(state);
    }).catch((roomError) => {
      if (isStaleCredential(roomError)) {
        removeStoredRoomToken(joinCode);
        setRoomToken("");
      } else if (!cancelled) setError(roomError.message);
    });
    return () => { cancelled = true; };
  }, [game, isReady, joinCode, roomToken]);

  useEffect(() => {
    if (!game?.roomCode || !roomToken) return undefined;
    return PinochleRoomService.subscribe(game.roomCode, roomToken, (remote) => {
      setGame((current) => !current || remote.updatedAt >= current.updatedAt ? remote : current);
    });
  }, [game?.roomCode, roomToken]);

  useEffect(() => {
    if (!game) return;
    setSelectedIds([]);
    const minimum = game.highBid === null ? game.minimumBid : game.highBid + 10;
    if (minimum) setBidAmount(minimum);
  }, [game?.phase, game?.currentPlayerIndex, game?.highBid, game?.roundNumber]);

  function cleanPlayerName() {
    const clean = playerName.trim().slice(0, 18) || "Player";
    localStorage.setItem(PLAYER_NAME_KEY, clean);
    setPlayerName(clean);
    return clean;
  }

  function enterRoom(state, token) {
    storeRoomToken(state.roomCode, token);
    setRoomToken(token);
    setJoinCode(state.roomCode);
    setGame(state);
    setError("");
    window.history.replaceState(null, "", `/pinochle?room=${state.roomCode}`);
  }

  async function createRoom() {
    setBusy(true);
    setError("");
    try {
      const payload = await PinochleRoomService.create(cleanPlayerName());
      enterRoom(payload.state, payload.token);
    } catch (roomError) {
      setError(roomError.message || "Could not create the room.");
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
          const state = await PinochleRoomService.load(code, savedToken);
          enterRoom(state, savedToken);
          return;
        } catch (roomError) {
          if (!isStaleCredential(roomError)) throw roomError;
          removeStoredRoomToken(code);
        }
      }
      const payload = await PinochleRoomService.join(code, cleanPlayerName());
      enterRoom(payload.state, payload.token);
    } catch (roomError) {
      setError(roomError.message || "Could not join the room.");
    } finally {
      setBusy(false);
    }
  }

  async function roomAction(action, values = {}) {
    const current = latestGame.current;
    if (!current?.roomCode || !roomToken || busy) return;
    setBusy(true);
    setError("");
    try {
      const next = await PinochleRoomService.action(current.roomCode, roomToken, action, values);
      latestGame.current = next;
      setGame(next);
      setSelectedIds([]);
    } catch (roomError) {
      setError(roomError.message || "The table could not be updated.");
    } finally {
      setBusy(false);
    }
  }

  function leaveRoom() {
    setGame(null);
    latestGame.current = null;
    setRoomToken("");
    setJoinCode("");
    setSelectedIds([]);
    setError("");
    window.history.replaceState(null, "", "/pinochle");
  }

  function copyInvite() {
    if (!game?.roomCode) return;
    void navigator.clipboard.writeText(`${window.location.origin}/pinochle?room=${game.roomCode}`);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  }


  if (!game) {
    return (
      <main className="pn-app pn-landing">
        <section className="pn-hero">
          <div className="pn-hero-copy">
            <span className="pn-kicker"><Sparkles size={15} /> Auction · meld · tricks</span>
            <h1>Call trump.<br /><em>Make your bid.</em></h1>
            <p>
              Open a private Pinochle room for two to six players. Share one five-character
              code, fill empty seats with computer players, and let the bidding begin.
            </p>
            <label className="pn-name-field">
              <span>Your name</span>
              <input value={playerName} onChange={(event) => setPlayerName(event.target.value)} maxLength={18} placeholder="Player" />
            </label>
            <div className="pn-entry-actions">
              <button type="button" className="pn-primary" disabled={busy} onClick={createRoom}><Plus size={18} /> Create a room</button>
              <div className="pn-join-box">
                <input
                  value={joinCode}
                  onChange={(event) => setJoinCode(event.target.value.toUpperCase())}
                  onKeyDown={(event) => event.key === "Enter" && joinRoom()}
                  maxLength={5}
                  placeholder="ROOM CODE"
                  aria-label="Room code"
                />
                <button type="button" disabled={busy} onClick={joinRoom}><UserPlus size={17} /> Join</button>
              </div>
            </div>
            {error && <p className="pn-error" role="alert">{error}</p>}
            <button type="button" className="pn-rules-link" onClick={() => setRulesOpen(true)}><BookOpen size={16} /> Rules for 2–6 players</button>
          </div>
          <HeroCards />
        </section>
        <RulesDialog open={rulesOpen} onClose={() => setRulesOpen(false)} />
      </main>
    );
  }

  if (game.phase === "lobby") {
    return (
      <main className="pn-app pn-room-shell">
        <header className="pn-room-header">
          <div><span className="pn-kicker">Pinochle room</span><h1>{game.roomCode}</h1></div>
          <div className="pn-header-actions">
            <button type="button" onClick={copyInvite}><Copy size={16} /> {copied ? "Copied" : "Copy invite"}</button>
            <button type="button" onClick={() => setRulesOpen(true)}><BookOpen size={16} /> Rules</button>
            <button type="button" onClick={leaveRoom}><DoorOpen size={16} /> Leave</button>
          </div>
        </header>
        <section className="pn-lobby-card">
          <div className="pn-lobby-heading">
            <div><span>Seats {game.players.length} / 6</span><h2>Build your table</h2><p>Games start with any two to six players. At four and six seats, partners alternate around the table.</p></div>
            {game.hostControls && <button type="button" className="pn-secondary" disabled={busy || game.players.length >= 6} onClick={() => roomAction("addComputer")}><Bot size={17} /> Add computer</button>}
          </div>
          <div className="pn-seat-grid">
            {Array.from({ length: 6 }, (_, index) => {
              const player = game.players[index];
              return player ? (
                <div className={`pn-lobby-seat ${player.isViewer ? "viewer" : ""}`} key={player.playerId}>
                  <span className="pn-avatar">{player.isComputer ? <Bot size={20} /> : player.name[0].toUpperCase()}</span>
                  <span><strong>{player.name}</strong><small>{player.isViewer ? "You" : player.isComputer ? "Computer" : "Connected"}</small></span>
                  {game.hostControls && player.isComputer && <button type="button" aria-label={`Remove ${player.name}`} onClick={() => roomAction("removeComputer", { playerId: player.playerId })}><Trash2 size={16} /></button>}
                </div>
              ) : <div className="pn-lobby-seat empty" key={index}><span className="pn-avatar">{index + 1}</span><span><strong>Open seat</strong><small>Share the room code</small></span></div>;
            })}
          </div>
          <div className="pn-lobby-footer">
            <p><Users size={17} /> {game.players.length < 2 ? "Waiting for at least one more player." : game.players.length === 4 || game.players.length === 6 ? "Partnership Pinochle table ready." : game.players.length === 5 ? "Five-player calling-partner table ready." : "Cutthroat Pinochle table ready."}</p>
            {game.hostControls
              ? <button type="button" className="pn-primary" disabled={busy || game.players.length < 2} onClick={() => roomAction("start")}><Crown size={18} /> Start game</button>
              : <span className="pn-waiting">Waiting for the host to deal…</span>}
          </div>
          {error && <p className="pn-error" role="alert">{error}</p>}
        </section>
        <RulesDialog open={rulesOpen} onClose={() => setRulesOpen(false)} />
      </main>
    );
  }

  return (
    <GameTable
      game={game}
      busy={busy}
      error={error}
      bidAmount={bidAmount}
      setBidAmount={setBidAmount}
      selectedIds={selectedIds}
      setSelectedIds={setSelectedIds}
      onAction={roomAction}
      onLeave={leaveRoom}
      onRules={() => setRulesOpen(true)}
      rulesOpen={rulesOpen}
      onCloseRules={() => setRulesOpen(false)}
    />
  );
}

function GameTable({ game, busy, error, bidAmount, setBidAmount, selectedIds, setSelectedIds, onAction, onLeave, onRules, rulesOpen, onCloseRules }) {
  const viewerIndex = game.viewerPlayerIndex;
  const yourTurn = game.currentPlayerIndex === viewerIndex;
  const minimumBid = game.highBid === null ? game.minimumBid : game.highBid + 10;
  const legalIds = useMemo(() => new Set(
    game.phase === "playing" && yourTurn ? getLegalPinochleCards(game, viewerIndex).map((card) => card.id) : [],
  ), [game, viewerIndex, yourTurn]);
  const availableMelds = useMemo(() => yourTurn
    ? getAvailableTwoPlayerMelds(game, viewerIndex)
    : [], [game, viewerIndex, yourTurn]);
  const viewer = game.players[viewerIndex];
  const showResults = game.phase === "round-over" || game.phase === "game-over";
  const visibleTrick = game.trick;
  const showingCompletedTrick = game.phase === "trick-complete";

  function toggleDiscard(cardId) {
    const selectionLimit = game.phase === "discarding-kitty" ? game.kittySize : game.exchangeCount;
    setSelectedIds((current) => current.includes(cardId)
      ? current.filter((id) => id !== cardId)
      : current.length < selectionLimit ? [...current, cardId] : current);
  }

  return (
    <main className="pn-app pn-game-shell">
      <header className="pn-gamebar">
        <div><span className="pn-game-mark">P</span><div><strong>Room {game.roomCode}</strong><small>{game.playerCount === 2 ? "Draw Pinochle" : game.playerCount === 5 ? "Calling partner" : game.partnershipGame ? "Partnership" : "Cutthroat"} · Round {game.roundNumber} · First to {game.targetScore}</small></div></div>
        <div className="pn-header-actions"><button type="button" onClick={onRules}><BookOpen size={16} /> Rules</button><button type="button" onClick={onLeave}><DoorOpen size={16} /> Leave</button></div>
      </header>

      <section className="pn-scoreboard" aria-label="Scoreboard">
        {game.teams.map((team) => (
          <div className={`pn-score ${team.id === viewer.teamId ? "viewer-team" : ""} ${game.contractPlayerIndexes?.includes(team.id) ? "contract-team" : ""}`} key={team.id}>
            <span>{pinochleTeamName(game, team.id)}</span><strong>{team.score}</strong>
          </div>
        ))}
      </section>

      {game.lastWashSummary && (
        <section className="pn-wash-notice" aria-label="Previous hand washed">
          <strong>Hand {game.lastWashSummary.roundNumber} washed</strong>
          <p>{game.lastWashSummary.message}</p>
          <div>
            {(game.partnershipGame ? game.teams : game.players).map((entry, index) => {
              const scoreIndex = game.partnershipGame ? entry.id : entry.teamId;
              const meld = game.partnershipGame
                ? game.lastWashSummary.teamMeldPoints[entry.id]
                : game.lastWashSummary.melds[index]?.total || 0;
              const name = game.partnershipGame ? pinochleTeamName(game, entry.id) : entry.name;
              const delta = game.lastWashSummary.roundDeltas[scoreIndex];
              return <span key={game.partnershipGame ? entry.id : entry.playerId}>{name}: meld {meld}, round {delta >= 0 ? "+" : ""}{delta}</span>;
            })}
          </div>
        </section>
      )}

      <section className="pn-table">
        <PinochleTable game={game} viewerIndex={viewerIndex} showingCompletedTrick={showingCompletedTrick} />

        <div className="pn-table-side">
          {game.playerCount === 2 && game.stockCount > 0 && game.stockTrumpCard && (
            <div className="pn-stock" aria-label={`${game.stockCount} cards remain in the draw stock; ${formatPinochleCard(game.stockTrumpCard)} is face up`}>
              <div className="pn-card-back"><span>P</span></div>
              <PinochleCard card={game.stockTrumpCard} />
              <small>{game.stockCount} cards · trump card</small>
            </div>
          )}
          <p className="pn-message" role="status">{game.message}</p>
          <TurnControls game={game} busy={busy} yourTurn={yourTurn} minimumBid={minimumBid} bidAmount={bidAmount} setBidAmount={setBidAmount} selectedIds={selectedIds} availableMelds={availableMelds} onAction={onAction} />
        </div>
      </section>

      <section className="pn-hand-zone">
        <div className="pn-hand-heading"><span className={`pn-turn-dot ${yourTurn ? "on" : ""}`} /><strong>{handInstruction(game, yourTurn) || (yourTurn ? "Your turn" : "Your hand")}</strong><small>{viewer.hand.length} cards</small></div>
        <div className="pn-hand" aria-label="Your hand">
          {viewer.hand.map((card) => {
            const playable = legalIds.has(card.id);
            const selected = selectedIds.includes(card.id);
            const canSelectCards = ["discarding-kitty", "partner-passing", "bidder-returning"].includes(game.phase) && yourTurn;
            return (
              <button
                type="button"
                key={card.id}
                className={`pn-hand-card ${playable ? "playable" : ""} ${selected ? "selected" : ""}`}
                disabled={busy || (!canSelectCards && !playable)}
                aria-label={formatPinochleCard(card)}
                aria-pressed={canSelectCards ? selected : undefined}
                onClick={() => canSelectCards ? toggleDiscard(card.id) : playable && onAction("playCard", { cardId: card.id })}
              >
                <PinochleCard card={card} />
              </button>
            );
          })}
        </div>
      </section>

      {error && <p className="pn-error pn-game-error" role="alert">{error}</p>}
      {game.phase === "acknowledging-exchange" && yourTurn && <ExchangeReceiptDialog game={game} busy={busy} onAction={onAction} />}
      {showResults && <ResultsDialog game={game} busy={busy} onAction={onAction} onLeave={onLeave} />}
      <RulesDialog open={rulesOpen} onClose={onCloseRules} />
    </main>
  );
}

/*
 * The table, with everybody in a chair.
 *
 * What this replaced: a vertical list of players down one side, a row of played
 * cards in the middle captioned with names in 12px, and a separate panel listing
 * the same people's meld. A player's name was printed in sixteen places, and 29%
 * of a 1218x518 felt carried anything at all.
 *
 * Position now answers "who played that" — the question a trick-taking game asks
 * most often — by looking rather than by reading.
 */
function PinochleTable({ game, viewerIndex, showingCompletedTrick }) {
  const played = new Map(game.trick.map((play) => [play.playerIndex, play.card]));
  const winnerIndex = showingCompletedTrick ? game.lastTrick?.winnerPlayerIndex : null;
  const viewerTeam = game.players[viewerIndex]?.teamId;
  const lastBid = new Map();
  for (const bid of game.bidHistory ?? []) lastBid.set(bid.playerIndex, bid.amount);

  return (
    <SeatedTable
      count={game.playerCount}
      viewerIndex={viewerIndex}
      middle={(
        /* Two separate marks rather than one stacked block: on a phone the ring
           of cards closes to within a card's width of the middle, so only the
           trump suit can stay there and the bid line moves to the foot. */
        <b className={`tbl-felt-mark ${game.trump === "hearts" || game.trump === "diamonds" ? "red" : ""}`} aria-hidden="true">
          {game.trump ? PINOCHLE_SUIT_SYMBOLS[game.trump] : "\u2014"}
        </b>
      )}
      foot={(
        <small className="tbl-felt-meta" aria-hidden="true">
          {game.playerCount === 2 ? `Stock ${game.stockCount}` : `Bid ${game.highBid ?? "\u2014"}`}
          {" \u00b7 Trick "}
          {showingCompletedTrick ? game.trickNumber : game.trickNumber + 1}
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
                gathered={showingCompletedTrick}
                style={cardStyle(spot.index, showingCompletedTrick ? winnerIndex : null)}
              >
                <PinochleCard card={card} />
              </PlayedCard>
            );
          })}

          {layout.map((spot) => {
            const player = game.players[spot.index];
            const meld = game.melds?.[spot.index];
            const bid = lastBid.get(spot.index);
            const bidding = game.phase === "bidding" && lastBid.has(spot.index);
            const contract = spot.index === game.highBidderIndex && game.highBid !== null;
            return (
              <Seat
                key={player.playerId}
                spot={spot}
                style={seatStyle(spot.index)}
                name={player.name}
                avatar={player.isComputer ? <Bot size={15} /> : player.name[0].toUpperCase()}
                /* Not the hand count as well: every hand in Pinochle holds the
                   same number of cards, so it only repeated the trick number in
                   the middle of the felt — and it was crowding the names. */
                note={plural(player.tricksWon || 0, "trick")}
                hand={player.handCount}
                tone={[
                  spot.index === game.currentPlayerIndex && game.phase !== "trick-complete" ? "turn" : "",
                  game.partnershipGame && player.teamId === viewerTeam && !spot.isViewer ? "mate" : "",
                ].filter(Boolean).join(" ")}
                marks={[
                  spot.index === game.dealerIndex && { key: "deal", label: "D", title: "Dealer", tone: "deal" },
                  contract && { key: "bid", label: game.highBid, title: `Took the contract at ${game.highBid}`, tone: "lead" },
                ].filter(Boolean)}
              >
                {/* The auction runs round the table the way play does, rather
                    than as a wrapping row of chips read in order. */}
                {bidding && (
                  <span className={`tbl-chair-pill ${bid === null ? "spent" : ""}`}>{bid === null ? "pass" : bid}</span>
                )}

                {/* Meld belongs to a player, so it lives on their seat. The
                    totals are always visible; the cards open on demand. */}
                {meld?.items?.length > 0 && (
                  <details className="pn-seat-meld">
                    <summary className="tbl-chair-pill quiet">{meld.total} meld</summary>
                    <div>
                      {meld.items.map((item) => (
                        <p key={item.name}>
                          <span>{item.name}</span><b>{item.points}</b>
                          <em>
                            {item.cards.map((card) => (
                              <i className={card.suit === "hearts" || card.suit === "diamonds" ? "red" : ""} key={card.id}>
                                {formatPinochleCard(card)}
                              </i>
                            ))}
                          </em>
                        </p>
                      ))}
                    </div>
                  </details>
                )}
              </Seat>
            );
          })}
        </>
      )}
    </SeatedTable>
  );
}

function TurnControls({ game, busy, yourTurn, minimumBid, bidAmount, setBidAmount, selectedIds, availableMelds, onAction }) {
  if (game.phase === "trick-complete") {
    return <div className="pn-turn-controls pn-clear-trick"><span>{game.playerCount === 2 && game.stockCount > 0 ? "Keep the trick face-up, then let its winner choose one meld." : "Everyone’s cards stay face-up until you are ready."}</span><button type="button" className="pn-primary" disabled={busy} onClick={() => onAction("clearTrick")}>Clear trick</button></div>;
  }
  if (game.phase === "acknowledging-exchange") {
    return yourTurn
      ? <div className="pn-turn-controls waiting">Review and acknowledge the cards you received.</div>
      : <div className="pn-turn-controls waiting">Waiting for {game.players[game.currentPlayerIndex]?.name} to acknowledge received cards…</div>;
  }
  if (!yourTurn) return <div className="pn-turn-controls waiting">Waiting for {game.players[game.currentPlayerIndex]?.name}…</div>;
  if (game.phase === "two-player-melding") {
    return (
      <div className="pn-turn-controls pn-meld-controls">
        <span>Lay down one meld, or draw without melding.</span>
        {availableMelds.map((meld) => <button type="button" className="pn-primary" disabled={busy} key={meld.key} onClick={() => onAction("declareMeld", { meldKey: meld.key })}>{meld.name} · {meld.points}</button>)}
        <button type="button" className="pn-pass" disabled={busy} onClick={() => onAction("skipMeld")}>{availableMelds.length ? "Skip meld & draw" : "Draw cards"}</button>
      </div>
    );
  }
  if (game.phase === "bidding") {
    return (
      <div className="pn-turn-controls pn-bid-controls">
        <label><span>Your bid</span><input type="number" min={minimumBid} step="10" value={bidAmount} onChange={(event) => setBidAmount(Number(event.target.value))} /></label>
        <button type="button" className="pn-primary" disabled={busy || bidAmount < minimumBid} onClick={() => onAction("bid", { amount: bidAmount })}>Bid {bidAmount}</button>
        <button type="button" className="pn-pass" disabled={busy} onClick={() => onAction("pass")}>Pass</button>
      </div>
    );
  }
  if (game.phase === "choosing-trump") {
    return <div className="pn-turn-controls pn-trump-controls"><span>Choose trump</span>{PINOCHLE_SUITS.map((suit) => <button type="button" key={suit} disabled={busy} className={suit === "hearts" || suit === "diamonds" ? "red" : ""} onClick={() => onAction("chooseTrump", { trump: suit })}>{PINOCHLE_SUIT_SYMBOLS[suit]}</button>)}</div>;
  }
  if (game.phase === "discarding-kitty") {
    return <div className="pn-turn-controls"><button type="button" className="pn-primary" disabled={busy || selectedIds.length !== game.kittySize} onClick={() => onAction("discardKitty", { cardIds: selectedIds })}>Return {game.kittySize} card to kitty</button></div>;
  }
  if (game.phase === "partner-passing") {
    return <div className="pn-turn-controls"><button type="button" className="pn-primary" disabled={busy || selectedIds.length !== game.exchangeCount} onClick={() => onAction("passPartnerCards", { cardIds: selectedIds })}>Send {game.exchangeCount} cards to bidder</button></div>;
  }
  if (game.phase === "bidder-returning") {
    const partner = game.players[game.exchangeReturnQueue[0]];
    return <div className="pn-turn-controls"><button type="button" className="pn-primary" disabled={busy || selectedIds.length !== game.exchangeCount} onClick={() => onAction("returnPartnerCards", { cardIds: selectedIds })}>Return {game.exchangeCount} cards to {partner.name}</button></div>;
  }
  if (game.phase === "playing") return game.canTakeRest
    ? <div className="pn-turn-controls"><span>Every remaining trick is guaranteed.</span><button type="button" className="pn-primary" disabled={busy} onClick={() => onAction("takeRest")}>Take the rest</button></div>
    : <div className="pn-turn-controls waiting">Play a highlighted card from your hand.</div>;
  return null;
}

function ExchangeReceiptDialog({ game, busy, onAction }) {
  const receipt = game.exchangeAcknowledgment;
  const sender = game.players[receipt.senderIndex];
  return (
    <div className="pn-modal-backdrop">
      <section className="pn-exchange-receipt" role="dialog" aria-modal="true" aria-label={`Cards received from ${sender.name}`}>
        <span className="pn-kicker">Partnership exchange</span>
        <h2>Cards from {sender.name}</h2>
        <p>These cards have been added to your hand. Review them before the exchange continues.</p>
        <div className="pn-received-cards">
          {receipt.cards.map((card) => <PinochleCard card={card} key={card.id} />)}
        </div>
        <button type="button" className="pn-primary" disabled={busy} onClick={() => onAction("acknowledgeExchange")}>Acknowledge cards</button>
      </section>
    </div>
  );
}

function ResultsDialog({ game, busy, onAction, onLeave }) {
  const summary = game.roundSummary;
  return (
    <div className="pn-modal-backdrop">
      <section className="pn-results" role="dialog" aria-modal="true" aria-label="Round results">
        <span className="pn-results-icon">{game.phase === "game-over" ? <Trophy size={28} /> : <Crown size={28} />}</span>
        <span className="pn-kicker">{game.phase === "game-over" ? "Game complete" : `Round ${game.roundNumber} complete`}</span>
        <h2>{game.phase === "game-over" ? `${game.winnerTeamIds.map((id) => pinochleTeamName(game, id)).join(" & ")} wins!` : game.playerCount === 2 ? "Round scored" : summary.madeContract ? "Contract made" : "Bidder set"}</h2>
        <p>{game.message}</p>
        <div className="pn-result-table">
          <div><span>Team</span><span>Meld</span><span>Tricks</span><span>Round</span><span>Total</span></div>
          {game.teams.map((team) => <div key={team.id}><strong>{pinochleTeamName(game, team.id)}</strong><span>{summary.teamMeldPoints[team.id]}</span><span>{summary.teamTrickPoints[team.id]}</span><span className={summary.roundDeltas[team.id] < 0 ? "negative" : ""}>{summary.roundDeltas[team.id] > 0 ? "+" : ""}{summary.roundDeltas[team.id]}</span><b>{team.score}</b></div>)}
        </div>
        <div className="pn-results-actions">
          {game.phase === "round-over" && game.hostControls && <button type="button" className="pn-primary" disabled={busy} onClick={() => onAction("nextRound")}>Deal next round</button>}
          {game.phase === "round-over" && !game.hostControls && <span>Waiting for the host to deal…</span>}
          <button type="button" className="pn-secondary" onClick={onLeave}>Leave table</button>
        </div>
      </section>
    </div>
  );
}

function PinochleCard({ card }) {
  const red = card.suit === "hearts" || card.suit === "diamonds";
  return <span className={`pn-card ${red ? "red" : "black"}`}><span className="pn-card-corner"><b>{pinochleRankLabel(card.rank)}</b><i>{PINOCHLE_SUIT_SYMBOLS[card.suit]}</i></span><span className="pn-card-suit">{PINOCHLE_SUIT_SYMBOLS[card.suit]}</span><span className="pn-card-corner bottom"><b>{pinochleRankLabel(card.rank)}</b><i>{PINOCHLE_SUIT_SYMBOLS[card.suit]}</i></span></span>;
}

function HeroCards() {
  return <div className="pn-hero-art" aria-label="Queen of spades and jack of diamonds make Pinochle"><div className="pn-sunburst" /><div className="pn-art-card queen"><span>Q</span><b>♠</b></div><div className="pn-art-card jack"><span>J</span><b>♦</b></div><div className="pn-art-ribbon">PINOCHLE <small>Q♠ + J♦</small></div></div>;
}

function RulesDialog({ open, onClose }) {
  if (!open) return null;
  return (
    <div className="pn-modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="pn-rules" role="dialog" aria-modal="true" aria-labelledby="pn-rules-title">
        <button type="button" className="pn-close" onClick={onClose} aria-label="Close rules"><X size={20} /></button>
        <span className="pn-kicker">How to play</span><h2 id="pn-rules-title">Room Pinochle</h2>
        <p>Three- through six-player rounds use an auction, public meld, and trick play; the bidder must earn the bid or be set back. Two-player Draw Pinochle skips the auction and lets each trick winner lay down one meld before drawing.</p>
        <div className="pn-rule-grid">
          <div><strong>2 players</strong><p>Deal 12 cards each. Turn one center-stock card face up to set trump. The trick winner may lay down exactly one meld, then draws first while the other player draws second.</p></div>
          <div><strong>3 players</strong><p>Cutthroat auction scoring: every player is their own team.</p></div>
          <div><strong>4 or 6 players</strong><p>Two fixed teams, seated alternately. Teammates combine meld and tricks, and exchange cards with the winning bidder.</p></div>
          <div><strong>5 players</strong><p>Deal nine cards each from one 48-card deck and place three cards in the center. Bidding starts at 150. Trump-jack holders join the bidder’s temporary team for scoring, with no card exchange.</p></div>
          <div><strong>The decks</strong><p>Two copies of every 9 through Ace for 2–5 players. Six-player games use four copies of every card.</p></div>
          <div><strong>Trick rules</strong><p>Follow suit when possible. You must head the current winner when able. If void, trump—and overtrump—when able.</p></div>
        </div>
        <h3>Partner exchange</h3>
        <p>After trump is called in a four-player game, the bidder’s teammate sends four cards to the bidder, who returns four cards. In a six-player game, each of the bidder’s two teammates sends three cards, and the bidder returns three cards to each teammate. Every recipient privately reviews and acknowledges each set of received cards before the exchange continues. There is no exchange in two-, three-, or five-player games.</p>
        <h3>Washed contracts</h3>
        <p>After the final hands and meld are known, the table checks the most the contract could earn using its eligible meld, every remaining counter, and the final-trick bonus. If that total cannot cover the bid, the bidder team loses the bid, opponents score their meld only, and the next hand is dealt immediately.</p>
        <h3>Take the rest</h3>
        <p>When you lead a fresh trick, a Take the rest button appears if the stock is empty, all your remaining cards are trump or aces, and no other player holds trump. The claim awards you every remaining trick, all remaining counters, and the final-trick bonus.</p>
        <h3>Five-player contract team</h3>
        <p>The bidder takes the three center cards, returns three cards, and names trump. Every player still holding a jack of trump joins the bidder for that round. A jack holder privately knows they are with the bidder, but other players do not see that teammate revealed until the trump jack is played. Only the bidder’s meld counts toward making the contract; captured trick points from the bidder and all trump-jack partners are combined with it. A partner’s own meld does not help satisfy the bid. If the contract is made, each temporary teammate scores only their own meld and captured trick points. If they are set, each receives only the negative bid.</p>
        <h3>Core meld values</h3>
        <div className="pn-meld-guide"><span>Run in trump <b>150</b></span><span>Aces around <b>100</b></span><span>Kings around <b>80</b></span><span>Queens around <b>60</b></span><span>Jacks around <b>40</b></span><span>Q♠ + J♦ <b>40</b></span><span>Trump marriage <b>40</b></span><span>Other marriage <b>20</b></span><span>Trump nine (dix) <b>10</b></span></div>
        <p className="pn-rule-note">Aces, tens, and kings captured in tricks are worth ten points each; the final trick is worth ten. A team must take a trick for its meld to score.</p>
      </section>
    </div>
  );
}

function handInstruction(game, yourTurn) {
  if (!yourTurn) return "";
  if (game.phase === "discarding-kitty") return `Choose ${game.kittySize} card to return to the kitty`;
  if (game.phase === "partner-passing") return `Choose ${game.exchangeCount} cards to send to the bidder`;
  if (game.phase === "bidder-returning") return `Choose ${game.exchangeCount} cards to return to ${game.players[game.exchangeReturnQueue[0]].name}`;
  if (game.phase === "acknowledging-exchange") return yourTurn ? "Review the cards you received" : "Your hand";
  return "";
}

function storeRoomToken(code, token) { localStorage.setItem(`pinochle-room-${code}`, token); }
function getStoredRoomToken(code) { return localStorage.getItem(`pinochle-room-${code}`) || ""; }
function removeStoredRoomToken(code) { localStorage.removeItem(`pinochle-room-${code}`); }
function isStaleCredential(error) { return /Join the room|Room not found/i.test(error?.message || ""); }
