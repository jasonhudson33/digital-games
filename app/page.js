import Link from "next/link";

const games = [
  {
    name: "7-Up",
    href: "/seven-up",
    status: "Ready to play",
    description:
      "Classic card play with local seats, computer players, and shared online rooms.",
    tone: "warm",
  },
  {
    name: "Monopoly",
    href: "/monopoly",
    status: "Ready to play",
    description:
      "Buy properties, roll animated dice, trade, mortgage, auction, and build houses in shared rooms.",
    tone: "warm",
  },
  {
    name: "Mafia",
    href: "/mafia",
    status: "Ready to play",
    description:
      "Create a room, assign hidden roles, and play through shared night and day phases.",
    tone: "night",
  },
];

export default function Page() {
  return (
    <main className="hub-shell">
      <section className="hub-hero">
        <p className="hub-eyebrow">Digital Games</p>
        <h1>Pick a game night.</h1>
        <p className="hub-copy">
          The landing page now acts as a simple launcher, so we can keep adding
          more games here without replacing the homepage each time.
        </p>
      </section>

      <section className="game-grid" aria-label="Available games">
        {games.map((game) => (
          <Link
            key={game.name}
            href={game.href}
            className={`game-card ${game.tone === "night" ? "night" : "warm"}`}
          >
            <span className="game-status">{game.status}</span>
            <h2>{game.name}</h2>
            <p>{game.description}</p>
            <span className="game-cta">Open game</span>
          </Link>
        ))}
      </section>
    </main>
  );
}
