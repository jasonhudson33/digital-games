import Link from "next/link";

const games = [
  {
    name: "UNO",
    href: "/uno",
    status: "New · Rooms for 2–10",
    description:
      "Play Classic UNO or flip every hand between light and dark sides in UNO Flip with friends or computer rivals.",
    tone: "uno",
  },
  {
    name: "DOS",
    href: "/dos",
    status: "New · Rooms for 2–4",
    description:
      "Match the center row with single cards or two-card sums and turn color matches into bonuses.",
    tone: "dos",
  },
  {
    name: "No Thanks!",
    href: "/no-thanks",
    status: "New · Rooms for 3–7",
    description:
      "Take the card or pay to pass, build low-scoring runs, and outlast friends or computer players.",
    tone: "no-thanks",
  },
  {
    name: "Qwirkle",
    href: "/qwirkle",
    status: "New · Rooms for 2–4",
    description:
      "Match colors and shapes, cross the grid for bigger scores, and complete six-tile Qwirkles with friends or computers.",
    tone: "qwirkle",
  },
  {
    name: "Spyrium",
    href: "/spyrium",
    status: "New · Rooms for 2–5",
    description:
      "Place workers in a shifting Victorian market, mine miraculous crystals, and build an industrial empire.",
    tone: "spyrium",
  },
  {
    name: "Flip 7",
    href: "/flip-7",
    status: "New · Rooms for 2–10",
    description:
      "Flip unique numbers, dodge duplicates, and press your luck against friends or computer players.",
    tone: "flip-7",
  },
  {
    name: "Life",
    href: "/life",
    status: "New · Rooms for 2–6",
    description:
      "Spin through careers, homes, family milestones, and retirement with friends or computer players.",
    tone: "life",
  },
  {
    name: "Cover Your Assets",
    href: "/cover-your-assets",
    status: "New · Rooms for 2–6",
    description:
      "Pair a fortune, cover your stack, and challenge exposed assets with friends or computer rivals.",
    tone: "cover-your-assets",
  },
  {
    name: "Splendor",
    href: "/splendor",
    status: "New · Rooms for 2–4",
    description:
      "Gather precious gems, build a permanent engine of bonuses, and attract nobles before rival merchants.",
    tone: "splendor",
  },
  {
    name: "BANG!",
    href: "/bang",
    status: "New · Rooms for 4–7",
    description:
      "Draw fast in a hidden-role western showdown with friends or computer gunslingers.",
    tone: "bang",
  },
  {
    name: "Killer Bunnies",
    href: "/killer-bunnies",
    status: "New · Rooms for 2–8",
    description:
      "Program your run, protect your Bunny Circle, and hunt the tabletop for the one Magic Carrot.",
    tone: "killer-bunnies",
  },
  {
    name: "Secret Hitler",
    href: "/secret-hitler",
    status: "New · Rooms for 5–10",
    description:
      "Nominate a government, pass secret policies, and uncover the hidden Fascist team before democracy falls.",
    tone: "secret-hitler",
  },
  {
    name: "Sequence",
    href: "/sequence",
    status: "New · Rooms for 2–12",
    description:
      "Play a card, claim a space, and connect five chips with friends or computer players across up to three teams.",
    tone: "sequence",
  },
  {
    name: "Ticket to Ride",
    href: "/ticket-to-ride",
    status: "New · Rooms for 2–5",
    description:
      "Collect colorful train cards, claim routes across the map, and complete secret destination tickets.",
    tone: "ticket-to-ride",
  },
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
].sort((left, right) => left.name.localeCompare(right.name, "en", { numeric: true }));

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
