"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Search, X } from "lucide-react";

import GameTile, { monogram } from "./game-tile";
import {
  GAMES,
  KINDS,
  gameCountWords,
  gameHref,
  getGame,
  lengthBucket,
  playerCountOptions,
  supportsPlayerCount,
} from "../lib/games";
import { describeWhen, recentGames } from "../lib/recent-games";

const TIME_FILTERS = [
  { value: "any", label: "Any" },
  { value: "quick", label: "Under 20 min" },
  { value: "mid", label: "20–40 min" },
  { value: "long", label: "45 min +" },
];

const KIND_FILTERS = [
  { value: "all", label: "All" },
  ...Object.entries(KINDS).map(([value, label]) => ({ value, label })),
];

const COUNTS = playerCountOptions();

const EMPTY = { players: null, time: "any", kind: "all", query: "" };

function matches(game, filters) {
  if (filters.players !== null && !supportsPlayerCount(game, filters.players)) return false;
  if (filters.time !== "any" && lengthBucket(game) !== filters.time) return false;
  if (filters.kind !== "all" && game.kind !== filters.kind) return false;

  const query = filters.query.trim().toLowerCase();
  if (!query) return true;
  return (
    game.name.toLowerCase().includes(query) ||
    game.blurb.toLowerCase().includes(query) ||
    KINDS[game.kind].toLowerCase().includes(query)
  );
}

function ChipRow({ labelId, options, value, onChange, countStyle = false }) {
  return (
    <div className="chips" role="group" aria-labelledby={labelId}>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          className={`chip${countStyle ? " is-count" : ""}`}
          aria-pressed={value === option.value}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

function ResumeRow() {
  // Read after mount: localStorage does not exist during the server render, so
  // reading it in useState would produce a hydration mismatch.
  const [entries, setEntries] = useState([]);
  useEffect(() => setEntries(recentGames()), []);

  const rows = entries.map((entry) => ({ entry, game: getGame(entry.slug) })).filter((row) => row.game);
  if (rows.length === 0) return null;

  return (
    <section className="hub-resume" aria-labelledby="hub-resume-head">
      <div className="hub-row-head">
        <h2 id="hub-resume-head">Jump back in</h2>
        <span>{rows.length === 1 ? "Your last game" : `Your last ${rows.length}`}</span>
      </div>
      <div className="resume-row">
        {rows.map(({ entry, game }) => (
          <Link
            key={game.slug}
            href={gameHref(game)}
            className="resume-card"
            style={{ "--h": game.hue }}
          >
            <span className="resume-chip" aria-hidden="true">{monogram(game.name)}</span>
            <span>
              <b>{game.name}</b>
              <small>
                {describeWhen(entry.at)}
                {entry.players ? ` · ${entry.players} players` : ""}
              </small>
            </span>
            <span className="resume-go" aria-hidden="true"><ArrowRight /></span>
          </Link>
        ))}
      </div>
    </section>
  );
}

function emptyStateReason(filters) {
  const who =
    filters.players === null
      ? "these filters"
      : filters.players === 1
        ? "solo play"
        : `${filters.players} players`;
  const when = filters.time !== "any" ? " at that length" : "";
  const what = filters.kind !== "all" ? ` in ${KINDS[filters.kind].toLowerCase()}` : "";
  return `${who}${when}${what}`;
}

export default function GameHub() {
  const [filters, setFilters] = useState(EMPTY);

  const visible = useMemo(() => GAMES.filter((game) => matches(game, filters)), [filters]);
  const isFiltered =
    filters.players !== null || filters.time !== "any" || filters.kind !== "all" || filters.query.trim() !== "";

  const patch = (next) => setFilters((current) => ({ ...current, ...next }));
  const reset = () => setFilters(EMPTY);

  return (
    <main className="hub-shell">
      <section className="hub-hero">
        <p className="hub-eyebrow">{gameCountWords()} games, one table</p>
        <h1>Who&rsquo;s playing tonight?</h1>
        <p className="hub-copy">
          Tell us how many of you there are and how long you&rsquo;ve got. We&rsquo;ll show you what fits.
        </p>
      </section>

      <ResumeRow />

      <div className="hub-browse">
        <div className="hub-filters">
          <div className="filter-line">
            <span className="filter-label" id="filter-players">Players</span>
            <ChipRow
              labelId="filter-players"
              countStyle
              value={filters.players === null ? "any" : String(filters.players)}
              onChange={(value) => patch({ players: value === "any" ? null : Number(value) })}
              options={[
                { value: "any", label: "Any" },
                ...COUNTS.map((count) => ({
                  value: String(count),
                  label: count === 1 ? "Solo" : String(count),
                })),
              ]}
            />
          </div>

          <div className="filter-line">
            <span className="filter-label" id="filter-time">Time</span>
            <ChipRow
              labelId="filter-time"
              options={TIME_FILTERS}
              value={filters.time}
              onChange={(time) => patch({ time })}
            />
            <div className="hub-search">
              <Search aria-hidden="true" />
              <input
                type="search"
                value={filters.query}
                aria-label="Search games"
                placeholder="Search games…"
                onChange={(event) => patch({ query: event.target.value })}
              />
              {filters.query !== "" && (
                <button
                  type="button"
                  className="hub-search-clear"
                  aria-label="Clear search"
                  onClick={() => patch({ query: "" })}
                >
                  <X />
                </button>
              )}
            </div>
          </div>

          <div className="filter-line">
            <span className="filter-label" id="filter-kind">Kind</span>
            <ChipRow
              labelId="filter-kind"
              options={KIND_FILTERS}
              value={filters.kind}
              onChange={(kind) => patch({ kind })}
            />
          </div>

          <p className="hub-result-line">
            {/* role=status so screen readers hear the count change as chips toggle */}
            <span role="status">
              {visible.length === GAMES.length
                ? `All ${GAMES.length} games`
                : `${visible.length} of ${GAMES.length} game${visible.length === 1 ? "" : "s"}`}
            </span>
            {isFiltered && (
              <button type="button" className="hub-reset" onClick={reset}>
                Clear filters
              </button>
            )}
          </p>
        </div>

        <section className="game-grid" aria-label="Available games">
          {visible.length > 0 ? (
            visible.map((game) => <GameTile key={game.slug} game={game} />)
          ) : (
            <div className="hub-empty">
              <h2>Nothing fits that combination</h2>
              <p>
                No game in the catalogue matches {emptyStateReason(filters)}. Try widening the time range.
              </p>
              <button type="button" className="button" onClick={reset}>
                Clear filters
              </button>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
