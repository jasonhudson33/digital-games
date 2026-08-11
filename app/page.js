import Link from "next/link";

const games = [
  {
    name: "Pinochle",
    href: "/pinochle",
    status: "New · Rooms for 2–6",
    description:
      "Win the auction, lay down your meld, call trump, and make the contract at a shared table.",
    tone: "pinochle",
  },
  {
    name: "Risk",
    href: "/risk",
    status: "New · Solo campaign",
    description:
      "Deploy armies, roll into battle, claim continent bonuses, and conquer the world against two computer commanders.",
    tone: "risk",
  },
  {
    name: "Skull King",
    href: "/skull-king",
    status: "New · Ten-round voyage",
    description:
      "Bid your tricks, command Pirates and monsters, and survive ten rounds to claim the captain's crown.",
    tone: "skull-king",
  },
  {
    name: "Hand and Foot",
    href: "/hand-and-foot",
    status: "New · Partner play",
    description:
      "Build books with the partner across from you, unlock your hidden foot, and chase the biggest four-round score.",
    tone: "hand-foot",
  },
  {
    name: "Scum",
    href: "/scum",
    status: "New · Any-size table",
    description:
      "Climb from lowly 2s to Jokers, shed every card, and fight your way from Scum to President.",
    tone: "scum",
  },
  {
    name: "Hearts",
    href: "/hearts",
    status: "New · Two ways to play",
    description:
      "Play Classic Hearts or remove every guardrail with fast, unforgiving Killer Hearts.",
    tone: "hearts",
  },
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
    name: "Catan",
    href: "/catan",
    status: "Ready to play",
    description:
      "Settle a randomized island, gather resources, trade with the bank, and race to ten victory points.",
    tone: "catan",
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
          Pull up a chair. Choose a classic and start playing right in your browser.
        </p>
      </section>

      <section className="game-grid" aria-label="Available games">
        {games.map((game) => (
          <Link
            key={game.name}
            href={game.href}
            className={`game-card ${game.tone}`}
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
