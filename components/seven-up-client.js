"use client";

import { useState, useSyncExternalStore } from "react";
import { Bot, Sparkles, Users } from "lucide-react";
import { Seat, SeatedTable } from "./ui/seated-table";
import { ChoiceModal, GameHeader, Hero, Landing, Lobby, Results } from "./ui/table-shell";
import { SevenUpRoomService } from "./seven-up-room-service";
import { useEngineRoom } from "../lib/use-engine-room.js";
import { SUITS, buildSequence, capitalize, formatCard, sameCard } from "../lib/game";
import { orderHand } from "../lib/hand-order";
import CardFan from "./card-fan";

const SUIT_SYMBOLS = {
  clubs: "♣",
  diamonds: "♦",
  hearts: "♥",
  spades: "♠",
};

const SUIT_CODES = {
  spades: "S",
  hearts: "H",
  diamonds: "D",
  clubs: "C",
};

/** Whether a computer is due to act: it is the seat on turn and the hand is still on. */
const computerIsDue = (room) =>
  room.phase === "playing" && Boolean(room.players[room.currentPlayerIndex]?.isComputer);

export default function SevenUpClient() {
  const {
    room, playerId, name, setName, joinCode, setJoinCode, busy, error,
    createRoom, joinRoom, act, leaveRoom,
  } = useEngineRoom({
    service: SevenUpRoomService,
    storageKey: "seven-up",
    computerDelay: 700,
    computerDue: computerIsDue,
  });
  const [rulesOpen, setRulesOpen] = useState(false);

  const me = room?.players.find((player) => player.id === playerId) ?? null;
  const rulesDialog = rulesOpen && <RulesDialog onClose={() => setRulesOpen(false)} />;

  if (!room || !me) {
    return <Landing
      gameName="7-Up"
      theme="tbl-light seven-up-theme"
      hero={<Hero
        kicker="Lay the sevens, then run the suits"
        title={<>Seven<br /><em>Up.</em></>}
        copy="Every suit builds outwards from its seven — up to the King, down to the Ace. Empty your hand first to win, and if you are holding a legal card, you must play it."
        badges={[{ icon: Users, label: "3–7 players" }, { icon: Bot, label: "Computer seats" }, { icon: Sparkles, label: "Four suit runs" }]}
        art={<>
          <PlayingCard card={{ suit: "hearts", rank: 6 }} />
          <PlayingCard card={{ suit: "spades", rank: 7 }} />
          <PlayingCard card={{ suit: "diamonds", rank: 8 }} />
        </>}
      />}
      entry={{ name, setName, joinCode, setJoinCode, createRoom, joinRoom, busy, error }}
      onRules={() => setRulesOpen(true)}
      dialogs={rulesDialog}
    />;
  }

  if (room.phase === "lobby") {
    return <Lobby
      gameName="7-Up"
      theme="tbl-light seven-up-theme"
      room={room}
      me={me}
      busy={busy}
      error={error}
      min={3}
      max={7}
      onAdd={() => act("addComputer")}
      onRemove={(id) => act("removeComputer", { playerId: id })}
      onStart={() => act("start")}
      onLeave={leaveRoom}
      onRules={() => setRulesOpen(true)}
      rules={rulesDialog}
    />;
  }

  const current = room.players[room.currentPlayerIndex];
  const yourTurn = room.phase === "playing" && room.currentPlayerIndex === room.viewerIndex;
  const mustPass = yourTurn && room.legalMoves.length === 0;
  const winner = room.winnerName ? room.players.find((player) => player.name === room.winnerName) : null;
  const statusText = winner
    ? `${winner.name} has emptied their hand.`
    : yourTurn
      ? room.legalMoves.length > 0
        ? `Your turn. You must play one of ${room.legalMoves.length} legal card${room.legalMoves.length === 1 ? "" : "s"}.`
        : "Your turn. You have no legal card and must pass."
      : current?.isComputer
        ? `${current.name} is thinking…`
        : `Waiting for ${current?.name ?? "the next player"}.`;

  const playerRail = room.players
    .map((player, index) => ({ player, index }))
    .map(({ player, index }, _unused, all) => {
      const order = (index - room.dealerIndex - 1 + all.length) % all.length;
      return {
        id: player.id,
        name: player.name,
        handCount: player.handCount,
        isCurrent: room.currentPlayerIndex === index && room.phase === "playing",
        isWinner: winner?.id === player.id,
        isDealer: room.dealerIndex === index,
        isViewer: index === room.viewerIndex,
        orderLabel: `Turn ${order + 1}`,
      };
    });

  return (
    <main className="tbl-game seven-up-theme tbl-felt-shell tbl-light">
      <GameHeader
        title="7-Up"
        room={room}
        subtitle="Private room"
        status={statusText}
        onRules={() => setRulesOpen(true)}
        onLeave={leaveRoom}
      />
      {error && <p className="tbl-error" role="alert">{error}</p>}

      <section className="seven-up-felt-wrap tbl-felt-fit" aria-label="7-Up table">
        <SevenUpTable playerRail={playerRail} tableau={room.tableau} turnCount={room.turnCount + 1} />
      </section>

      <section className="tbl-hand-zone">
        <header className="tbl-hand-header">
          <div>
            <p>Your hand</p>
            <strong>{room.hand.length} cards</strong>
          </div>
        </header>
        <p className="hand-help">
          {yourTurn ? "Playable cards are highlighted." : `Waiting for ${current?.name ?? "the next player"}...`}
        </p>
        {room.hand.length === 0 ? (
          <div className="hand empty-hand">No cards remaining.</div>
        ) : (
          <CardFan className="hand" count={room.hand.length}>
            {orderHand("seven-up", room.hand).map((card) => {
              const playable = yourTurn && room.legalMoves.some((candidate) => sameCard(candidate, card));
              return (
                <button
                  key={`${card.suit}-${card.rank}`}
                  className={`card-button ${playable ? "playable" : "unplayable"}`}
                  type="button"
                  disabled={!playable || busy}
                  onClick={() => act("play", { card })}
                  aria-label={formatCard(card)}
                >
                  <PlayingCard card={card} className="hand-card" />
                </button>
              );
            })}
          </CardFan>
        )}
        <div className="tbl-actions">
          <button className="tbl-secondary" type="button" disabled={!mustPass || busy} onClick={() => act("pass")}>
            Pass
          </button>
        </div>
      </section>

      <aside className="tbl-side tbl-log seven-up-log">
        <p>Table talk</p>
        {room.log.length === 0
          ? <span className="tbl-log-line">No turns yet.</span>
          : room.log.slice(0, 5).map((entry, index) => <span className="tbl-log-line" key={`${index}-${entry}`}>{entry}</span>)}
      </aside>

      {winner && (
        <Results
          title={`${winner.name} wins`}
          text="The game is finished."
          rows={room.players.map((player) => ({ id: player.id, name: player.name, value: `${player.handCount} cards left` }))}
        >
          {room.hostId === playerId
            ? <button type="button" className="tbl-primary" disabled={busy} onClick={() => act("dealAgain")}>Deal again</button>
            : <p className="tbl-wait">Waiting for the host to deal again…</p>}
          <button type="button" className="tbl-link" onClick={leaveRoom}>Leave table</button>
        </Results>
      )}
      {rulesDialog}
    </main>
  );
}

function RulesDialog({ onClose }) {
  return (
    <ChoiceModal wide title="How to play 7-Up" text="Empty your hand first." onClose={onClose}>
      <div className="tbl-rule-grid">
        <article><b>Open with a seven</b><p>Each suit starts from its 7. Until a suit&apos;s 7 is down, no other card of that suit can be played.</p></article>
        <article><b>Build outwards</b><p>After the 7, play the next rank up or down in the same suit: 6 or 8, then 5 or 9, and so on up to the King and down to the Ace.</p></article>
        <article><b>Play if you can</b><p>If you hold a legal card you must play one. With no legal card you pass.</p></article>
        <article><b>Win by emptying your hand</b><p>The whole deck is dealt, three to seven players. The first player to play their last card wins.</p></article>
      </div>
    </ChoiceModal>
  );
}

/*
 * The players, sitting round the felt.
 *
 * Local play is hot-seat: one screen, passed around, so "you" is whoever's
 * turn it is rather than a fixed device. Room play fixes "you" to the seat
 * this browser claimed. Either way the table rotates to put that seat at
 * the bottom, the same way UNO and DOS do for their own viewer.
 */
function SevenUpTable({ playerRail, tableau, turnCount }) {
  const viewerIndex = Math.max(
    0,
    playerRail.findIndex((player) => player.isViewer),
  );

  return (
    <SeatedTable
      count={playerRail.length}
      viewerIndex={viewerIndex}
      className="seven-up-felt"
      middle={(
        <div className="seven-up-tableau" aria-label="Tableau">
          {SUITS.map((suit) => {
            const lane = tableau ? tableau[suit] : { low: null, high: null };
            const hasStarted = lane.low !== null;
            const run = hasStarted ? buildSequence(suit, lane.low, lane.high) : [];
            return (
              <div className={`seven-up-lane is-${suit}`} key={suit}>
                <span className="seven-up-lane-suit" aria-hidden="true">{SUIT_SYMBOLS[suit]}</span>
                {hasStarted ? (
                  <div
                    className="seven-up-lane-run"
                    aria-label={`${capitalize(suit)}: ${run.length} card${run.length === 1 ? "" : "s"} played, ${lane.low} through ${lane.high}`}
                  >
                    {run.map((card, index) => (
                      <div
                        className={`seven-up-lane-card ${card.rank === 7 ? "is-seven" : ""}`}
                        key={`${suit}-${card.rank}`}
                        style={{ "--i": index }}
                        title={formatCard(card)}
                      >
                        <PlayingCard card={card} className="seven-up-table-card" />
                      </div>
                    ))}
                  </div>
                ) : (
                  <span className="seven-up-lane-empty">Waiting for the 7</span>
                )}
              </div>
            );
          })}
        </div>
      )}
      foot={<small className="tbl-felt-meta">Turn {turnCount || 1}</small>}
    >
      {({ layout, seatStyle }) => (
        <>
          {layout.map((spot) => {
            const player = playerRail[spot.index];
            return (
              <Seat
                key={player.id}
                spot={spot}
                style={seatStyle(spot.index)}
                name={player.name}
                avatar={player.name.slice(0, 1).toUpperCase()}
                note={player.isDealer ? "Dealer" : player.orderLabel}
                hand={player.handCount}
                tone={player.isCurrent ? "turn" : ""}
                marks={[
                  player.isDealer && { key: "deal", label: "D", title: "Dealer", tone: "deal" },
                  player.isWinner && { key: "win", label: "\u2605", title: `${player.name} went out`, tone: "lead" },
                ].filter(Boolean)}
              >
                <span className="tbl-chair-pill">{player.handCount} {player.handCount === 1 ? "card" : "cards"}</span>
              </Seat>
            );
          })}
        </>
      )}
    </SeatedTable>
  );
}

const subscribeNever = () => () => {};

function PlayingCard({ card, className }) {
  const cid = `${rankCode(card.rank)}${SUIT_CODES[card.suit]}`;
  // <playing-card> rewrites its own children as soon as cardmeister loads, which
  // can be before React hydrates the landing hero's fan — React then finds an
  // <img> the server never sent and throws the whole tree away. Render the
  // element on the client only; the fan is decorative (aria-hidden) anyway.
  const mounted = useSyncExternalStore(subscribeNever, () => true, () => false);
  if (!mounted) return null;
  return <playing-card className={className} cid={cid} bordercolor="#2f261f" shadow="2,4,3" />;
}

function rankCode(rank) {
  if (rank === 1) return "A";
  if (rank === 10) return "T";
  if (rank === 11) return "J";
  if (rank === 12) return "Q";
  if (rank === 13) return "K";
  return String(rank);
}
