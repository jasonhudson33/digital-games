import Link from "next/link";
import { ArrowRight, Bot } from "lucide-react";

import { gameHref, isEstimated, minutesLabel, playersLabel } from "../lib/games";

/** "Cover Your Assets" -> "CY", "UNO" -> "UN", "7-Up" -> "7U" */
export function monogram(name) {
  const words = name.replace(/[^A-Za-z0-9 ]/g, "").trim().split(/\s+/);
  const letters = words.length > 1 ? words.map((word) => word[0]).join("") : words[0] || "";
  return letters.slice(0, 2).toUpperCase();
}

/*
 * The tile carries exactly one game-specific value: --h, the OKLCH hue from
 * lib/games.js. Everything visual is derived from it in globals.css, which is
 * what let ~250 lines of per-game gradients collapse into one recipe.
 *
 * --hs (the corner spark) is computed here rather than with calc() in CSS,
 * because calc() inside oklch() invalidates the whole background shorthand.
 */
export default function GameTile({ game }) {
  return (
    <Link
      href={gameHref(game)}
      className="game-tile"
      data-game={game.slug}
      style={{ "--h": game.hue, "--hs": (game.hue + 45) % 360 }}
    >
      <span className="game-tile-mono" aria-hidden="true">
        {monogram(game.name)}
      </span>

      <span className="game-tile-top">
        {game.isNew && <span className="game-pill is-new">New</span>}
        <span className="game-pill">
          {isEstimated(game, "players") ? (
            <span className="is-estimated" title="Estimated — not recorded in the catalogue yet">
              {playersLabel(game)}
            </span>
          ) : (
            playersLabel(game)
          )}
        </span>
        <span className="game-pill">{minutesLabel(game)}</span>
        {game.modes.includes("computer") && (
          <span className="game-pill">
            <Bot aria-hidden="true" /> Computers
          </span>
        )}
      </span>

      <h2>{game.name}</h2>
      <p>{game.blurb}</p>
      <span className="game-cta">
        Open game <ArrowRight aria-hidden="true" />
      </span>
    </Link>
  );
}
