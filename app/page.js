import GameTile from "../components/game-tile";
import { GAMES } from "../lib/games";

export const metadata = {
  title: "Digital Games",
  description: "Twenty-four party games, playable in your browser.",
};

export default function Page() {
  return (
    <main className="hub-shell">
      <section className="hub-hero">
        <p className="hub-eyebrow">Twenty-four games, one table</p>
        <h1>Pick a game night.</h1>
        <p className="hub-copy">
          Pull up a chair. Choose a classic and start playing right in your browser.
        </p>
      </section>

      <section className="game-grid" aria-label="Available games">
        {GAMES.map((game) => (
          <GameTile key={game.slug} game={game} />
        ))}
      </section>
    </main>
  );
}
