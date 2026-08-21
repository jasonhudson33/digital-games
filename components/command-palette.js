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
const slugifyGroup = (group) => group.toLowerCase().replace(/[^a-z0-9]+/g, "-");

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

  /**
   * Results in render order, then the same list cut into its group blocks.
   *
   * The headings used to be emitted inline with `hit.group !== lastGroup`,
   * which only tells you anything if the list is already ordered by group —
   * and it never was, because the sort is by relevance. With the palette just
   * opened and no query typed, `"anything".startsWith("")` is true, so every
   * game ranked equal, the stable sort left them alphabetical, and the three
   * kind headings interleaved all the way down: 15 headings for 3 groups.
   *
   * Ranking still decides the order of the groups (best match first) and of the
   * rows inside them, but a group is now emitted exactly once.
   */
  const { results, sections } = useMemo(() => {
    const q = query.trim().toLowerCase();
    const games = GAMES.filter(
      (game) => !q || game.name.toLowerCase().includes(q) || KINDS[game.kind].toLowerCase().includes(q),
    ).map((game) => ({ group: KINDS[game.kind], game, name: game.name }));

    // Admin tools are reachable, but only when explicitly searched for.
    const tools = q
      ? TOOLS.filter((tool) => tool.name.toLowerCase().includes(q)).map((tool) => ({
          group: "Tools",
          tool,
          name: tool.name,
        }))
      : [];

    const grouped = new Map();
    for (const hit of [...games, ...tools]) {
      if (!grouped.has(hit.group)) grouped.set(hit.group, []);
      grouped.get(hit.group).push(hit);
    }

    const best = (hits) => Math.min(...hits.map((hit) => rank(hit.name, q)));
    const blocks = [...grouped.entries()]
      .map(([group, hits]) => ({ group, hits: [...hits].sort((a, b) => rank(a.name, q) - rank(b.name, q)) }))
      .sort((a, b) => best(a.hits) - best(b.hits));

    // Flat list drives the cursor and Enter; index must match render order.
    const flat = blocks.flatMap((block) => block.hits);
    let offset = 0;
    const withOffsets = blocks.map((block) => {
      const start = offset;
      offset += block.hits.length;
      return { ...block, start };
    });
    return { results: flat, sections: withOffsets };
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

        {/* Each group is a role="group" whose options are its direct children.
            Options used to sit inside an untitled <div> with the headings as
            bare <p> siblings, which breaks the listbox/option relationship —
            aria-activedescendant had nothing valid to point at. */}
        <div className="palette-list" id="palette-list" role="listbox" ref={listRef}>
          {results.length === 0 ? (
            <p className="palette-empty">No game called &ldquo;{query.trim()}&rdquo;.</p>
          ) : (
            sections.map((section) => (
              <div key={section.group} role="group" aria-labelledby={`palette-group-${slugifyGroup(section.group)}`}>
                <p className="palette-group" id={`palette-group-${slugifyGroup(section.group)}`}>
                  {section.group}
                </p>
                {section.hits.map((hit, offset) => {
                  const index = section.start + offset;
                  return (
                    <div
                      key={hit.tool ? hit.tool.slug : hit.game.slug}
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
                  );
                })}
              </div>
            ))
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
