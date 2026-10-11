"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Bot,
  Crown,
  Users,
} from "lucide-react";
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
import { ChoiceModal, Dialog, GameHeader, Hero, Landing, Lobby as SharedLobby, Results as SharedResults } from "./ui/table-shell";
import { orderHand } from "../lib/hand-order";
import CardFan from "./card-fan";
import { computerDelayOf, computerSpeedProp } from "../lib/computer-speed.js";
import { useComputerPacer } from "../lib/use-computer-pacer.js";

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

  function leaveRoom() {
    setGame(null);
    latestGame.current = null;
    setRoomToken("");
    setJoinCode("");
    setSelectedIds([]);
    setError("");
    window.history.replaceState(null, "", "/pinochle");
  }



  const rulesDialog = <RulesDialog open={rulesOpen} onClose={() => setRulesOpen(false)} />;

  if (!game) {
    return <Landing
      gameName="Pinochle"
      theme="tbl-light pinochle-theme"
      hero={<Hero
        kicker="Auction · meld · tricks"
        title={<>Call trump.<br /><em>Make your bid.</em></>}
        copy="Open a private Pinochle room for two to six players. Share one five-character code, fill empty seats with computer players, and let the bidding begin."
        badges={[{ icon: Users, label: "2–6 players" }, { icon: Bot, label: "Computer seats" }, { icon: Crown, label: "Partners or cutthroat" }]}
        artLayout="free"
        art={<HeroCards />}
      />}
      entry={{ name: playerName, setName: setPlayerName, joinCode, setJoinCode, createRoom, joinRoom, busy, error }}
      onRules={() => setRulesOpen(true)}
      dialogs={rulesDialog}
    />;
  }

  if (game.phase === "lobby") {
    const viewer = game.players.find((player) => player.isViewer) ?? game.players[0];
    return <SharedLobby computerSpeed={computerSpeed}
      gameName="Pinochle"
      theme="tbl-light pinochle-theme"
      room={{ roomCode: game.roomCode, hostId: game.hostControls ? viewer.playerId : game.players[0].playerId, players: game.players.map((player) => ({ ...player, id: player.playerId })) }}
      me={{ id: viewer.playerId }}
      busy={busy}
      error={error}
      min={2}
      max={6}
      seatNote={game.players.length < 2 ? "Waiting for at least one more player." : game.players.length === 4 || game.players.length === 6 ? "Partnership Pinochle table ready." : game.players.length === 5 ? "Five-player calling-partner table ready." : "Cutthroat Pinochle table ready."}
      onAdd={() => roomAction("addComputer")}
      onRemove={(id) => roomAction("removeComputer", { playerId: id })}
      onStart={() => roomAction("start")}
      onLeave={leaveRoom}
      onRules={() => setRulesOpen(true)}
      rules={rulesDialog}
    />;
  }

  return (
    <GameTable
      computerSpeed={computerSpeed}
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
      rulesDialog={rulesDialog}
    />
  );
}

function GameTable({ game, busy, error, bidAmount, setBidAmount, selectedIds, setSelectedIds, computerSpeed, onAction, onLeave, onRules, rulesDialog }) {
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
    <main className="pn-app pn-game-shell tbl-felt-shell tbl-light pinochle-theme">
      <GameHeader computerSpeed={computerSpeed}
        title="Pinochle"
        room={game}
        subtitle={`${game.playerCount === 2 ? "Draw Pinochle" : game.playerCount === 5 ? "Calling partner" : game.partnershipGame ? "Partnership" : "Cutthroat"} · Round ${game.roundNumber} · First to ${game.targetScore}`}
        status={showResults ? (game.phase === "game-over" ? "Game complete" : "Round complete") : yourTurn ? "Your turn" : `${game.players[game.currentPlayerIndex]?.name ?? "…"}'s turn`}
        onRules={onRules}
        onLeave={onLeave}
      />

      <section className="pn-scoreboard" aria-label="Scoreboard">
        {game.teams.map((team) => {
          const mine = team.id === viewer.teamId;
          const bidding = Boolean(game.contractPlayerIndexes?.includes(team.id));
          const progress = Math.max(0, Math.min(1, team.score / game.targetScore));
          return (
            <div className={`pn-score ${mine ? "viewer-team" : ""} ${bidding ? "contract-team" : ""}`} key={team.id}>
              <small className="pn-score-tags">
                {mine && <em>{game.partnershipGame ? "Your team" : "You"}</em>}
                {bidding && <em className="bidding">Bidding</em>}
              </small>
              <span className="pn-score-name">{pinochleTeamName(game, team.id)}</span>
              <strong aria-label={`${team.score} of ${game.targetScore} points`}>{team.score}<small>/ {game.targetScore}</small></strong>
              <i className="pn-score-bar" aria-hidden="true"><b style={{ width: `${progress * 100}%` }} /></i>
            </div>
          );
        })}
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

      <section className="pn-table tbl-felt-fit">
        <PinochleTable
          game={game}
          viewerIndex={viewerIndex}
          showingCompletedTrick={showingCompletedTrick}
          stock={game.playerCount === 2 && game.stockCount > 0 && game.stockTrumpCard && (
            <div className="pn-stock" aria-label={`${game.stockCount} cards remain in the draw stock; ${formatPinochleCard(game.stockTrumpCard)} is face up`}>
              <div className="pn-card-back"><span>P</span></div>
              <PinochleCard card={game.stockTrumpCard} />
              <small>{game.stockCount} cards</small>
            </div>
          )}
          dock={<TurnControls game={game} busy={busy} yourTurn={yourTurn} minimumBid={minimumBid} bidAmount={bidAmount} setBidAmount={setBidAmount} selectedIds={selectedIds} availableMelds={availableMelds} onAction={onAction} />}
        />
      </section>

      <div className="pn-under-table">
        <p className="pn-message" role="status">{game.message}</p>
        {game.phase === "playing" && yourTurn && game.canTakeRest && (
          /* The one control that can come up with cards already on the felt, so
             it goes under the table rather than over them. */
          <button type="button" className="pn-primary" disabled={busy} onClick={() => onAction("takeRest")}>Take the rest</button>
        )}
      </div>

      <section className="pn-hand-zone">
        <div className="pn-hand-heading"><span className={`pn-turn-dot ${yourTurn ? "on" : ""}`} /><strong>{handInstruction(game, yourTurn) || (yourTurn ? "Your turn" : "Your hand")}</strong><small>{viewer.hand.length} cards</small></div>
        <CardFan className="pn-hand" count={viewer.hand.length} aria-label="Your hand">
          {orderHand("pinochle", viewer.hand, { trump: game.trump }).map((card) => {
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
        </CardFan>
      </section>

      {error && <p className="pn-error pn-game-error" role="alert">{error}</p>}
      {game.phase === "acknowledging-exchange" && yourTurn && <ExchangeReceiptDialog game={game} busy={busy} onAction={onAction} />}
      {showResults && <ResultsDialog game={game} busy={busy} onAction={onAction} onLeave={onLeave} />}
      {rulesDialog}
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
function PinochleTable({ game, viewerIndex, showingCompletedTrick, stock, dock }) {
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
      dock={dock}
      foot={(
        <small className="tbl-felt-meta" aria-hidden="true">
          {/* No stock count here at two hands: the stock is drawn on the felt
              and says its own size. */}
          {game.playerCount === 2 ? "" : `Bid ${game.highBid ?? "\u2014"} \u00b7 `}
          {"Trick "}
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
                style={cardStyle(spot.index)}
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

          {stock}
        </>
      )}
    </SeatedTable>
  );
}

/*
 * What you have to do right now, in the middle of the table, and gone the moment
 * you have done it.
 *
 * This used to be a column of controls beside the felt, permanently 250px wide
 * whether it held an auction or the words "Waiting for Ines…". Every phase it
 * serves is one with no cards on the felt — an auction, a choice of trump, an
 * exchange, a trick waiting to be swept — so the middle of the table is free,
 * which is where a dealer would put the thing you are being asked about.
 *
 * Two phases deliberately get nothing. During play the chair with the ring round
 * it says whose turn it is and your own hand says which cards are legal, so a
 * panel repeating either would be a third place to look. And a player who has
 * already bid is told so by the pill on their own chair.
 */
function TurnControls({ game, busy, yourTurn, minimumBid, bidAmount, setBidAmount, selectedIds, availableMelds, onAction }) {
  if (game.phase === "trick-complete") {
    /* A button rather than a panel: this is the one thing you are asked to do
       while cards are still on the felt, and you have to be able to see the
       trick you are about to clear. */
    return (
      <button type="button" className="tbl-felt-sweep" disabled={busy} onClick={() => onAction("clearTrick")}>
        {game.players[game.lastTrick?.winnerPlayerIndex]?.name
          ? `${game.players[game.lastTrick.winnerPlayerIndex].name} won · Clear trick`
          : "Clear trick"}
      </button>
    );
  }

  if (game.phase === "acknowledging-exchange") {
    return (
      <div className="tbl-felt-dock">
        <h2>Cards passed</h2>
        <p>{yourTurn
          ? "Review the cards you received."
          : `Waiting for ${game.players[game.currentPlayerIndex]?.name}\u2026`}</p>
      </div>
    );
  }

  if (!yourTurn) return null;

  if (game.phase === "two-player-melding") {
    return (
      <div className="tbl-felt-dock">
        <h2>Lay a meld</h2>
        <p>Lay one down, or draw.</p>
        <div className="tbl-felt-dock-row">
          {availableMelds.map((meld) => (
            <button type="button" className="pn-primary" disabled={busy} key={meld.key} onClick={() => onAction("declareMeld", { meldKey: meld.key })}>
              {meld.name} {"\u00b7"} {meld.points}
            </button>
          ))}
          <button type="button" className="pn-pass" disabled={busy} onClick={() => onAction("skipMeld")}>
            {availableMelds.length ? "Skip meld & draw" : "Draw cards"}
          </button>
        </div>
      </div>
    );
  }

  if (game.phase === "bidding") {
    return (
      <div className="tbl-felt-dock pn-bid-dock">
        <h2>Your bid</h2>
        <p>{minimumBid} or more, or pass.</p>
        <div className="tbl-felt-dock-row">
          <input
            type="number"
            aria-label="Your bid"
            min={minimumBid}
            step="10"
            value={bidAmount}
            onChange={(event) => setBidAmount(Number(event.target.value))}
          />
          <button type="button" className="pn-primary" disabled={busy || bidAmount < minimumBid} onClick={() => onAction("bid", { amount: bidAmount })}>Bid {bidAmount}</button>
          <button type="button" className="pn-pass" disabled={busy} onClick={() => onAction("pass")}>Pass</button>
        </div>
      </div>
    );
  }

  if (game.phase === "choosing-trump") {
    return (
      <div className="tbl-felt-dock pn-trump-dock">
        <h2>Choose trump</h2>
        <p>You took it at {game.highBid}.</p>
        <div className="tbl-felt-dock-row">
          {PINOCHLE_SUITS.map((suit) => (
            <button
              type="button"
              key={suit}
              disabled={busy}
              className={suit === "hearts" || suit === "diamonds" ? "red" : ""}
              onClick={() => onAction("chooseTrump", { trump: suit })}
            >
              {PINOCHLE_SUIT_SYMBOLS[suit]}
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (game.phase === "discarding-kitty") {
    return (
      <div className="tbl-felt-dock">
        <h2>The kitty</h2>
        <p>Choose {game.kittySize} in your hand to bury.</p>
        <button type="button" className="pn-primary" disabled={busy || selectedIds.length !== game.kittySize} onClick={() => onAction("discardKitty", { cardIds: selectedIds })}>
          Return {game.kittySize} {game.kittySize === 1 ? "card" : "cards"} to kitty
        </button>
      </div>
    );
  }

  if (game.phase === "partner-passing") {
    return (
      <div className="tbl-felt-dock">
        <h2>Pass to the bidder</h2>
        <p>Choose {game.exchangeCount} cards in your hand.</p>
        <button type="button" className="pn-primary" disabled={busy || selectedIds.length !== game.exchangeCount} onClick={() => onAction("passPartnerCards", { cardIds: selectedIds })}>
          Send {game.exchangeCount} cards
        </button>
      </div>
    );
  }

  if (game.phase === "bidder-returning") {
    const partner = game.players[game.exchangeReturnQueue[0]];
    return (
      <div className="tbl-felt-dock">
        <h2>Return cards</h2>
        <p>Choose {game.exchangeCount} for {partner.name}.</p>
        <button type="button" className="pn-primary" disabled={busy || selectedIds.length !== game.exchangeCount} onClick={() => onAction("returnPartnerCards", { cardIds: selectedIds })}>
          Return {game.exchangeCount} cards
        </button>
      </div>
    );
  }

  return null;
}

function ExchangeReceiptDialog({ game, busy, onAction }) {
  const receipt = game.exchangeAcknowledgment;
  const sender = game.players[receipt.senderIndex];
  return (
    <ChoiceModal
      wide
      title={`Cards from ${sender.name}`}
      text="Partnership exchange. These cards have been added to your hand. Review them before the exchange continues."
      actions={<button type="button" className="tbl-primary" disabled={busy} onClick={() => onAction("acknowledgeExchange")}>Acknowledge cards</button>}
    >
      <div className="pn-received-cards">
        {receipt.cards.map((card) => <PinochleCard card={card} key={card.id} />)}
      </div>
    </ChoiceModal>
  );
}

function ResultsDialog({ game, busy, onAction, onLeave }) {
  const summary = game.roundSummary;
  return (
    <SharedResults
      title={game.phase === "game-over" ? `${game.winnerTeamIds.map((id) => pinochleTeamName(game, id)).join(" & ")} wins!` : game.playerCount === 2 ? "Round scored" : summary.madeContract ? "Contract made" : "Bidder set"}
      text={game.message}
      rows={game.teams.map((team) => ({
        id: String(team.id),
        name: pinochleTeamName(game, team.id),
        value: `${team.score}`,
        note: `meld ${summary.teamMeldPoints[team.id]} · tricks ${summary.teamTrickPoints[team.id]} · round ${summary.roundDeltas[team.id] > 0 ? "+" : ""}${summary.roundDeltas[team.id]}`,
      }))}
    >
      {game.phase === "round-over" && game.hostControls && <button type="button" className="tbl-primary" disabled={busy} onClick={() => onAction("nextRound")}>Deal next round</button>}
      {game.phase === "round-over" && !game.hostControls && <p className="tbl-wait">Waiting for the host to deal…</p>}
      <button type="button" className="tbl-link" onClick={onLeave}>Leave table</button>
    </SharedResults>
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
    <Dialog wide className="pn-rules" labelledBy="pn-rules-title" onClose={onClose}>
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
    </Dialog>
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
