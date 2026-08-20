"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

import { GAMES, KINDS, TOOLS, gameHref, minutesLabel, playersLabel } from "../lib/games";
import { rememberGame } from "../lib/recent-games";
import { useDialog } from "../lib/use-dialog";

/*
 * Replaces the 26-item flat dropdown that used to live in the site header.
 *
 * That list was ungrouped, alphabetical, taller than a phone viewport (so it
 * scrolled inside a scrolling page), and had a content-admin route — "Update KB
 * Cards" — sitting between two games where a player could hit it mid-game.
 * Finding a game in it was slower than going home and using the grid.
 */
function rank(name, query) {
  const lower = name.toLowerCase();
  if (lower === query) return 0;
  if (lower.startsWith(query)) return 1;
  if (lower.includes(query)) return 2;
  return 3;
}

export default function CommandPalette({ open, onClose }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [cursor, setCursor] = useState(0);
  const listRef = useRef(null);
  const panelRef = useDialog(open, onClose);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    const games = GAMES.filter(
      (game) => !q || game.name.toLowerCase().includes(q) || KINDS[game.kind].toLowerCase().includes(q),
    )
      .map((game) => ({ group: KINDS[game.kind], game, name: game.name }))
      .sort((a, b) => rank(a.name, q) - rank(b.name, q));

    // Admin tools are reachable, but only when explicitly searched for.
    const tools = q
      ? TOOLS.filter((tool) => tool.name.toLowerCase().includes(q)).map((tool) => ({
          group: "Tools",
          tool,
          name: tool.name,
        }))
      : [];

    return [...games, ...tools];
  }, [query]);

  useEffect(() => {
    if (open) {
      setQuery("");
      setCursor(0);
    }
  }, [open]);

  useEffect(() => setCursor(0), [query]);

  // Keep the highlighted row in view when moving with the arrow keys.
  useEffect(() => {
    listRef.current?.querySelector('[aria-selected="true"]')?.scrollIntoView({ block: "nearest" });
  }, [cursor, results.length]);

  if (!open) return null;

  function go(index) {
    const hit = results[index];
    if (!hit) return;
    if (hit.tool) {
      router.push(`/${hit.tool.slug}`);
    } else {
      rememberGame(hit.game.slug);
      router.push(gameHref(hit.game));
    }
    onClose();
  }

  function onKeyDown(event) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setCursor((current) => Math.min(current + 1, results.length - 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setCursor((current) => Math.max(current - 1, 0));
    } else if (event.key === "Enter") {
      event.preventDefault();
      go(cursor);
    }
  }

  let lastGroup = null;

  return (
    <div
      className="palette-backdrop"
      onPointerDown={(event) => event.target === event.currentTarget && onClose()}
    >
      <div
        className="palette"
        role="dialog"
        aria-modal="true"
        aria-label="Find a game"
        data-focus-managed=""
        ref={panelRef}
        tabIndex={-1}
      >
        <input
          className="palette-input"
          type="text"
          autoComplete="off"
          aria-label="Search games"
          aria-controls="palette-list"
          aria-activedescendant={results[cursor] ? `palette-option-${cursor}` : undefined}
          placeholder={`Search ${GAMES.length} games…`}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={onKeyDown}
        />

        <div className="palette-list" id="palette-list" role="listbox" ref={listRef}>
          {results.length === 0 ? (
            <p className="palette-empty">No game called &ldquo;{query.trim()}&rdquo;.</p>
          ) : (
            results.map((hit, index) => {
              const heading = hit.group !== lastGroup ? hit.group : null;
              lastGroup = hit.group;
              return (
                <div key={hit.tool ? hit.tool.slug : hit.game.slug}>
                  {heading && <p className="palette-group">{heading}</p>}
                  <div
                    id={`palette-option-${index}`}
                    className="palette-item"
                    role="option"
                    aria-selected={index === cursor}
                    onPointerEnter={() => setCursor(index)}
                    onClick={() => go(index)}
                  >
                    <span
                      className="palette-dot"
                      aria-hidden="true"
                      style={hit.game ? { "--h": hit.game.hue } : undefined}
                    />
                    <b>{hit.name}</b>
                    {hit.game && (
                      <small>
                        {playersLabel(hit.game)} · {minutesLabel(hit.game)}
                      </small>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        <p className="palette-foot">
          <span>&uarr;&darr; to move</span>
          <span>&crarr; to open</span>
          <span>esc to close</span>
        </p>
      </div>
    </div>
  );
}
