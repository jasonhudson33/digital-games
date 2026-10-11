"use client";

import { useDialog } from "../../lib/use-dialog.js";
import ComputerSpeedControl from "./computer-speed-control.js";
import { Bot, CircleHelp, Copy, DoorOpen, LogOut, Sparkles, Users, X } from "lucide-react";

/*
 * The shared page structure for every game (openspec: platform/game-layout):
 * landing entry card, lobby, in-game header, dialog, and round results.
 *
 * Nothing here is specific to a felt table. The seat rail and played-card ring
 * live in ./seated-table.js; this module is only what a board game, a tile
 * game and a card game all need around their own table.
 *
 * Each piece stamps `data-layout="<part>"` so scripts/mobile-audit.mjs can
 * check that a game really renders through it.
 *
 * Class names are prefixed `tbl-`. The old ones were `cg-` for "color games",
 * which stopped being accurate the moment this became shared.
 */

/** @param {Record<string, any>} props */
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
  extra,
}) {
  return (
    <section className="tbl-entry" data-layout="entry">
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

      {extra}

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

/**
 * The standard hero copy: a kicker, a two-line title, a sentence, badges, and
 * decorative art. Everything is content; the structure and wording around it
 * are not the game's to change.
 *
 * @param {object} props
 * @param {string} props.kicker
 * @param {import("react").ReactNode} props.title   `Line one.<br /><em>Line two.</em>`
 * @param {string} props.copy
 * @param {{ icon?: import("react").ElementType, label: string }[]} [props.badges]
 * @param {import("react").ReactNode} [props.art]    aria-hidden decoration
 * @param {import("react").ReactNode} [props.backdrop]  decoration that fills the whole hero behind the copy
 * @param {"fan" | "free"} [props.artLayout]  "fan" lays up to three pieces out as a hand of cards; "free" leaves the art's own layout alone
 */
export function Hero({ kicker, title, copy, badges = [], art, artLayout = "fan", backdrop }) {
  return (
    <>
      {backdrop && <div className="tbl-hero-backdrop" aria-hidden="true">{backdrop}</div>}
      <p className="tbl-kicker">{kicker}</p>
      <h1>{title}</h1>
      <p className="tbl-hero-copy">{copy}</p>
      {badges.length > 0 && (
        <div className="tbl-hero-badges">
          {badges.map(({ icon: Icon, label }) => (
            <span key={label}>{Icon && <Icon aria-hidden="true" />} {label}</span>
          ))}
        </div>
      )}
      {art && <div className={artLayout === "fan" ? "tbl-hero-fan" : "tbl-hero-art"} aria-hidden="true">{art}</div>}
    </>
  );
}

/**
 * Every game's landing: its hero, then the one entry card.
 *
 * @param {object} props
 * @param {string} props.gameName
 * @param {string} [props.theme]       the game's root theme class
 * @param {import("react").ReactNode} props.hero      usually <Hero />
 * @param {object} props.entry         name, setName, joinCode, setJoinCode, createRoom, joinRoom, busy, error
 * @param {() => void} [props.onRules]
 * @param {import("react").ReactNode} [props.dialogs]   rules and other dialogs
 */
export function Landing({ gameName, theme = "", hero, entry, onRules, dialogs }) {
  return (
    <main className={`tbl-landing ${theme}`.trim()} data-layout="landing">
      <section className="tbl-hero">{hero}</section>
      <EntryCard gameName={gameName} {...entry} onRules={onRules} />
      {dialogs}
    </main>
  );
}

/** @param {Record<string, any>} props */
export function Lobby({
  gameName,
  theme = "",
  room,
  me,
  busy,
  error,
  min,
  max,
  options,
  seatNote,
  canStart,
  autoStart,
  canRemove = true,
  computerSpeed,
  onAdd,
  onRemove,
  onStart,
  onLeave,
  onRules,
  rules,
}) {
  const isHost = room.hostId === me.id;
  const startable = canStart ?? room.players.length >= min;

  return (
    <main className={`tbl-lobby ${theme}`.trim()} data-layout="lobby">
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

        {options}

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
              {isHost && canRemove && player.isComputer ? (
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

        {computerSpeed && <ComputerSpeedControl variant="inline" value={computerSpeed.value} onChange={computerSpeed.onChange} />}

        {isHost && room.players.length < max && (
          <button type="button" className="tbl-add-seat" disabled={busy} onClick={onAdd}>
            <Bot aria-hidden="true" /> Add computer player
          </button>
        )}

        <p className="tbl-ready">
          <b>
            {Number.isFinite(max) ? `${room.players.length} / ${max} seats` : `${room.players.length} players`}
          </b>
          <span>
            {seatNote ?? (room.players.length >= min
              ? "Ready to play"
              : `Add ${min - room.players.length} more player${min - room.players.length === 1 ? "" : "s"}`)}
          </span>
        </p>

        {autoStart ? (
          <p className="tbl-wait">{autoStart}</p>
        ) : isHost ? (
          <button
            type="button"
            className="tbl-primary tbl-start"
            disabled={busy || !startable}
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

/** @param {Record<string, any>} props */
export function GameHeader({ title, room, status, subtitle, actions, computerSpeed, onRules, onLeave }) {
  return (
    <header className="tbl-game-header" data-layout="game-bar">
      <div className="tbl-game-title">
        <p>{subtitle ?? `Round ${room.round} · private room`}</p>
        <h1>{title}</h1>
      </div>

      {/* role=status so a turn change is announced, not only seen */}
      <strong className="tbl-header-status" role="status">
        {status}
      </strong>

      {actions}
      {computerSpeed && <ComputerSpeedControl value={computerSpeed.value} onChange={computerSpeed.onChange} />}
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

const noop = () => {};

/**
 * The shared dialog shell: backdrop, focus trap, Escape, close control. Content
 * and its own classes are the caller's; `ChoiceModal` below is the standard
 * title-and-text layout built on it.
 *
 * @param {object} props
 * @param {import("react").ReactNode} [props.children]
 * @param {boolean} [props.wide]
 * @param {string} [props.label]        accessible name when the content has no heading
 * @param {string} [props.labelledBy]   id of the heading inside the content
 * @param {string} [props.className]    the game's own classes for its content
 * @param {() => void} [props.onClose]  omit for a forced choice
 */
export function Dialog({ label, labelledBy, className = "", onClose, wide = false, children }) {
  // Focus entry, the Tab trap, Escape and focus restore. A dialog with no
  // onClose (a forced choice, a results screen) still traps focus; Escape just
  // has nothing to close.
  const panelRef = useDialog(true, onClose ?? noop);

  return (
    <div className="tbl-modal-backdrop">
      <section
        ref={panelRef}
        className={`tbl-modal${wide ? " is-wide" : ""} ${className}`.trim()}
        role="dialog"
        aria-modal="true"
        aria-label={labelledBy ? undefined : label}
        aria-labelledby={labelledBy}
        data-layout="dialog"
        data-focus-managed
      >
        {onClose && (
          <button type="button" className="tbl-modal-close" aria-label="Close" onClick={onClose}>
            <X aria-hidden="true" />
          </button>
        )}
        {children}
      </section>
    </div>
  );
}

/** @param {Record<string, any>} props */
export function ChoiceModal({ title, text, actions, children, onClose, wide = false }) {
  return (
    <Dialog label={typeof title === "string" ? title : undefined} onClose={onClose} wide={wide}>
      <h2>{title}</h2>
      {text && <p className="tbl-modal-copy">{text}</p>}
      {children}
      {actions && <div className="tbl-modal-actions">{actions}</div>}
    </Dialog>
  );
}

/**
 * End-of-round or end-of-game results in the shared dialog.
 *
 * @param {object} props
 * @param {string} props.title
 * @param {string} [props.text]
 * @param {{ id: string, name: string, value: string, note?: string }[]} [props.rows]  already ranked
 * @param {import("react").ReactNode} [props.children]  next-round / leave actions
 */
export function Results({ title, text, rows = [], children }) {
  return (
    <ChoiceModal title={title} text={text}>
      {rows.length > 0 && <div className="tbl-results">
        {rows.map((row) => (
          <div key={row.id}>
            <span>{row.name}</span>
            <b>{row.value}</b>
            {row.note && <small>{row.note}</small>}
          </div>
        ))}
      </div>}
      {children}
    </ChoiceModal>
  );
}

/** @param {Record<string, any>} props */
export function RoundModal({ room, me, onNext, onLeave }) {
  const winner = room.players.find((player) => player.id === (room.winnerId || room.roundWinnerId));
  const finished = room.phase === "finished";

  return (
    <Results
      title={finished ? `${winner.name} wins!` : `${winner.name} wins the round`}
      text={
        finished
          ? `${winner.score} points takes the game.`
          : `Scores carry forward. First to ${room.targetScore} wins.`
      }
      rows={[...room.players]
        .sort((left, right) => right.score - left.score)
        .map((player) => ({ id: player.id, name: player.name, value: `${player.score} pts` }))}
    >
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
    </Results>
  );
}
