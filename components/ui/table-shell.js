"use client";

import { Bot, CircleHelp, Copy, DoorOpen, LogOut, Sparkles, Users, X } from "lucide-react";

/*
 * The shared table shell: landing entry card, lobby, in-game header, modal, and
 * round results.
 *
 * These lived in components/uno-client.js and were imported from there by
 * components/dos-client.js — so DOS depended on UNO's module to render its own
 * lobby. They are the most mature UI in the codebase (a real seat rail, an
 * opponent strip, a proper hand zone) and the direction the rest of the games
 * should move toward, so they belong in a shared module rather than inside one
 * game.
 *
 * Class names are prefixed `tbl-`. The old ones were `cg-` for "color games",
 * which stopped being accurate the moment this became shared, and three of them
 * (`.primary`, `.link`, `button:disabled`) were unprefixed global selectors
 * shipped to every route.
 */

export function EntryCard({
  gameName,
  name,
  setName,
  joinCode,
  setJoinCode,
  createRoom,
  joinRoom,
  busy,
  error,
  onRules,
}) {
  return (
    <section className="tbl-entry">
      <p className="tbl-kicker">Private online table</p>
      <h2>Play {gameName}</h2>
      <p className="tbl-entry-copy">
        Create a room, share its five-character code, and fill open seats with computers.
      </p>

      <label className="tbl-field">
        Your name
        <input
          maxLength={20}
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Player name"
        />
      </label>

      <button type="button" className="tbl-primary" disabled={busy} onClick={createRoom}>
        <Users aria-hidden="true" /> Create a room
      </button>

      <p className="tbl-or">or join a room</p>

      <div className="tbl-join">
        <input
          aria-label="Room code"
          maxLength={5}
          value={joinCode}
          onChange={(event) => setJoinCode(event.target.value.toUpperCase())}
          placeholder="ROOM CODE"
        />
        <button type="button" disabled={busy} onClick={joinRoom}>
          Join
        </button>
      </div>

      <button type="button" className="tbl-link" onClick={onRules}>
        <CircleHelp aria-hidden="true" /> Official rules
      </button>

      {error && <p className="tbl-error" role="alert">{error}</p>}
    </section>
  );
}

export function Lobby({
  gameName,
  room,
  me,
  busy,
  error,
  min,
  max,
  settings,
  onAdd,
  onRemove,
  onStart,
  onLeave,
  onRules,
  rules,
}) {
  const isHost = room.hostId === me.id;

  return (
    <main className="tbl-lobby">
      <section>
        <header className="tbl-lobby-head">
          <div>
            <p className="tbl-kicker">{gameName} table ready</p>
            <h1>
              Room{" "}
              <button
                type="button"
                className="tbl-room-code"
                onClick={() => navigator.clipboard?.writeText(room.roomCode)}
              >
                {room.roomCode} <Copy aria-hidden="true" />
                <span className="visually-hidden">Copy room code</span>
              </button>
            </h1>
            <p className="tbl-lobby-hint">
              Share the code, add computer players, then start when everyone is seated.
            </p>
          </div>
          <button type="button" className="tbl-link" onClick={onRules}>
            <CircleHelp aria-hidden="true" /> Rules
          </button>
        </header>

        {settings}

        <div className="tbl-seats">
          {room.players.map((player, index) => (
            <article key={player.id} className="tbl-seat">
              <span className="tbl-seat-avatar" aria-hidden="true">
                {player.isComputer ? <Bot /> : <Users />}
              </span>
              <div>
                <strong>
                  {player.name}
                  {player.id === me.id ? " (you)" : ""}
                </strong>
                <small>
                  {index === 0 ? "Host · " : ""}
                  {player.isComputer ? "Computer" : "Human"}
                </small>
              </div>
              {isHost && player.isComputer ? (
                <button
                  type="button"
                  className="tbl-seat-remove"
                  aria-label={`Remove ${player.name}`}
                  onClick={() => onRemove(player.id)}
                >
                  <X aria-hidden="true" />
                </button>
              ) : (
                <Sparkles aria-hidden="true" />
              )}
            </article>
          ))}
        </div>

        {isHost && room.players.length < max && (
          <button type="button" className="tbl-add-seat" disabled={busy} onClick={onAdd}>
            <Bot aria-hidden="true" /> Add computer player
          </button>
        )}

        <p className="tbl-ready">
          <b>
            {room.players.length} / {max} seats
          </b>
          <span>{room.players.length >= min ? "Ready to play" : "Add one more player"}</span>
        </p>

        {isHost ? (
          <button
            type="button"
            className="tbl-primary tbl-start"
            disabled={busy || room.players.length < min}
            onClick={onStart}
          >
            <Sparkles aria-hidden="true" /> Start game
          </button>
        ) : (
          <p className="tbl-wait">Waiting for the host to start…</p>
        )}

        <button type="button" className="tbl-link tbl-leave" onClick={onLeave}>
          <DoorOpen aria-hidden="true" /> Leave room
        </button>

        {error && <p className="tbl-error" role="alert">{error}</p>}
      </section>
      {rules}
    </main>
  );
}

export function GameHeader({ title, room, status, onRules, onLeave }) {
  return (
    <header className="tbl-game-header">
      <div className="tbl-game-title">
        <p>Round {room.round} · private room</p>
        <h1>{title}</h1>
      </div>

      {/* role=status so a turn change is announced, not only seen */}
      <strong className="tbl-header-status" role="status">
        {status}
      </strong>

      <button type="button" className="tbl-header-action" onClick={onRules}>
        <CircleHelp aria-hidden="true" />
        <span className="tbl-header-action-label">Rules</span>
      </button>
      <button
        type="button"
        className="tbl-header-action"
        onClick={() => navigator.clipboard?.writeText(room.roomCode)}
      >
        <Copy aria-hidden="true" />
        <span className="tbl-header-action-label">{room.roomCode}</span>
      </button>
      <button type="button" className="tbl-header-action" onClick={onLeave}>
        <LogOut aria-hidden="true" />
        <span className="tbl-header-action-label">Leave</span>
      </button>
    </header>
  );
}

export function ChoiceModal({ title, text, actions, children, onClose, wide = false }) {
  return (
    <div className="tbl-modal-backdrop">
      {/* Focus entry, trapping and restore come from components/dialog-focus.js */}
      <section
        className={`tbl-modal${wide ? " is-wide" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        {onClose && (
          <button type="button" className="tbl-modal-close" aria-label="Close" onClick={onClose}>
            <X aria-hidden="true" />
          </button>
        )}
        <h2>{title}</h2>
        {text && <p className="tbl-modal-copy">{text}</p>}
        {children}
        {actions && <div className="tbl-modal-actions">{actions}</div>}
      </section>
    </div>
  );
}

export function RoundModal({ room, me, onNext, onLeave }) {
  const winner = room.players.find((player) => player.id === (room.winnerId || room.roundWinnerId));
  const finished = room.phase === "finished";

  return (
    <ChoiceModal
      title={finished ? `${winner.name} wins!` : `${winner.name} wins the round`}
      text={
        finished
          ? `${winner.score} points takes the game.`
          : `Scores carry forward. First to ${room.targetScore} wins.`
      }
    >
      <div className="tbl-results">
        {[...room.players]
          .sort((left, right) => right.score - left.score)
          .map((player) => (
            <div key={player.id}>
              <span>{player.name}</span>
              <b>{player.score} pts</b>
            </div>
          ))}
      </div>

      {room.phase === "roundEnd" && room.hostId === me.id ? (
        <button type="button" className="tbl-primary" onClick={onNext}>
          Deal next round
        </button>
      ) : room.phase === "roundEnd" ? (
        <p className="tbl-wait">Waiting for the host to deal…</p>
      ) : null}

      <button type="button" className="tbl-link" onClick={onLeave}>
        Leave table
      </button>
    </ChoiceModal>
  );
}
