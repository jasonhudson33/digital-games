/**
 * Single source of truth for the game catalogue.
 *
 * Previously this list existed twice — once in `app/page.js` as prose
 * (`status: "New · Rooms for 5–10"`) and once in `components/site-header.js`
 * as bare name/href pairs. The two had already drifted ("Hand & Foot" vs
 * "Hand and Foot"). Everything now reads from here: the hub grid and its
 * filters, the command palette, and per-route OpenGraph metadata.
 *
 * Fields
 *   slug     route segment, also the React key and the `data-game` attribute
 *   name     display name
 *   players  [min, max] — max === min means a fixed count; [1, 1] means solo
 *   minutes  [min, max] typical play time
 *   kind     "card" | "board" | "hidden"
 *   modes    which ways the game can be played
 *   hue      OKLCH hue for the tile recipe (see app/globals.css)
 *   blurb    one sentence, shown on the tile
 *   isNew    optional; shows the New badge
 *   estimated optional list of fields that are best guesses, not recorded rules
 *
 * ── On `estimated` ────────────────────────────────────────────────────────
 * The old `status` strings gave a player range for 20 of the 24 games and
 * prose for the rest. Where there was no range, the values below are
 * estimates and are marked so the UI can render them as uncertain. Correct
 * them here and every surface updates at once.
 *
 * Hues are spread so that no two alphabetically adjacent games — the order
 * they appear in the grid — sit within 40° of each other. Adding a game means
 * picking a hue at least 40° from its new neighbours.
 */

export const KINDS = {
  card: "Cards",
  board: "Board & strategy",
  hidden: "Hidden role",
};

export const MODES = {
  online: "Online rooms",
  computer: "Computer players",
  local: "Local seats",
};

/**
 * The literal carries the annotation, not the sorted result: `.sort()`
 * returns a fresh array, and a type applied to its result never reaches the
 * entries, so `players: [3, 7]` would widen to number[] instead of a tuple.
 *
 * @type {Game[]}
 */
const CATALOGUE = [
  {
    slug: "seven-up",
    name: "7-Up",
    // lib/game.js: MIN_PLAYERS 3, MAX_PLAYERS 7. The old 2-6 was a guess, and
    // the hub acted on it — offering 7-Up to a pair who could not start it, and
    // hiding it from seven people who could.
    players: [3, 7],
    minutes: [20, 30],
    kind: "card",
    modes: ["online", "computer", "local"],
    hue: 205,
    blurb: "Classic card play with local seats, computer players, and shared online rooms.",
  },
  {
    slug: "bang",
    name: "BANG!",
    players: [4, 7],
    minutes: [30, 45],
    kind: "hidden",
    modes: ["online", "computer"],
    hue: 70,
    isNew: true,
    blurb: "Draw fast in a hidden-role western showdown with friends or computer gunslingers.",
  },
  {
    slug: "catan",
    name: "Catan",
    players: [3, 4],
    minutes: [60, 90],
    kind: "board",
    modes: ["online"],
    hue: 25,
    estimated: ["players"],
    blurb: "Settle a randomized island, gather resources, trade with the bank, and race to ten victory points.",
  },
  {
    slug: "cover-your-assets",
    name: "Cover Your Assets",
    players: [2, 6],
    minutes: [20, 30],
    kind: "card",
    modes: ["online", "computer"],
    hue: 150,
    blurb: "Pair a fortune, cover your stack, and challenge exposed assets with friends or computer rivals.",
  },
  {
    slug: "dos",
    name: "DOS",
    players: [2, 4],
    minutes: [15, 25],
    kind: "card",
    modes: ["online", "computer"],
    hue: 250,
    blurb: "Match the center row with single cards or two-card sums and turn color matches into bonuses.",
  },
  {
    slug: "dominion",
    name: "Dominion",
    players: [2, 6],
    minutes: [30, 60],
    kind: "card",
    modes: ["online", "computer"],
    hue: 15,
    isNew: true,
    blurb: "Build a kingdom one shuffle at a time, refine your deck, and claim the most valuable realm.",
  },
  {
    slug: "flip-7",
    name: "Flip 7",
    players: [2, 10],
    minutes: [15, 20],
    kind: "card",
    modes: ["online", "computer"],
    hue: 320,
    isNew: true,
    blurb: "Flip unique numbers, dodge duplicates, and press your luck against friends or computer players.",
  },
  {
    slug: "hand-and-foot",
    name: "Hand and Foot",
    // Partnerships, so an even count: lib/hand-and-foot.js takes 4 up to
    // HAND_FOOT_MAX_PLAYERS (16). The catalogue used to claim 4 only.
    players: [4, 16],
    playerCounts: [4, 6, 8, 10, 12, 14, 16],
    minutes: [45, 60],
    kind: "card",
    modes: ["online", "computer"],
    hue: 100,
    blurb: "Build books with the partner across from you, unlock your hidden foot, and chase the biggest score.",
  },
  {
    slug: "hearts",
    name: "Hearts",
    players: [4, 4],
    minutes: [25, 35],
    kind: "card",
    modes: ["online", "computer"],
    hue: 358,
    estimated: ["players"],
    blurb: "Play Classic Hearts or remove every guardrail with fast, unforgiving Killer Hearts.",
  },
  {
    slug: "killer-bunnies",
    name: "Killer Bunnies",
    players: [2, 8],
    minutes: [45, 60],
    kind: "card",
    modes: ["online", "computer"],
    hue: 125,
    blurb: "Program your run, protect your Bunny Circle, and hunt the tabletop for the one Magic Carrot.",
  },
  {
    slug: "life",
    name: "Life",
    players: [2, 6],
    minutes: [30, 45],
    kind: "board",
    modes: ["online", "computer"],
    hue: 185,
    blurb: "Spin through careers, homes, family milestones, and retirement with friends or computer players.",
  },
  {
    slug: "mafia",
    name: "Mafia",
    players: [6, 15],
    minutes: [20, 40],
    kind: "hidden",
    modes: ["online"],
    hue: 288,
    estimated: ["players"],
    blurb: "Create a room, assign hidden roles, and play through shared night and day phases.",
  },
  {
    slug: "monopoly",
    name: "Monopoly",
    players: [2, 6],
    minutes: [60, 120],
    kind: "board",
    modes: ["online"],
    hue: 160,
    estimated: ["players"],
    blurb: "Buy properties, roll animated dice, trade, mortgage, auction, and build houses in shared rooms.",
  },
  {
    slug: "no-thanks",
    name: "No Thanks!",
    players: [3, 7],
    minutes: [15, 20],
    kind: "card",
    modes: ["online", "computer"],
    hue: 275,
    blurb: "Take the card or pay to pass, build low-scoring runs, and outlast friends or computer players.",
  },
  {
    slug: "pinochle",
    name: "Pinochle",
    players: [2, 6],
    minutes: [40, 60],
    kind: "card",
    modes: ["online", "computer"],
    hue: 340,
    isNew: true,
    blurb: "Win the auction, lay down your meld, call trump, and make the contract at a shared table.",
  },
  {
    slug: "qwirkle",
    name: "Qwirkle",
    players: [2, 4],
    minutes: [30, 45],
    kind: "board",
    modes: ["online", "computer"],
    hue: 235,
    blurb: "Match colors and shapes, cross the grid for bigger scores, and complete six-tile Qwirkles.",
  },
  {
    slug: "risk",
    name: "Risk",
    players: [1, 1],
    minutes: [45, 70],
    kind: "board",
    modes: ["computer"],
    hue: 95,
    blurb: "Deploy armies, roll into battle, claim continent bonuses, and conquer the world against two computer commanders.",
  },
  {
    slug: "scum",
    name: "Scum",
    players: [3, 10],
    minutes: [20, 30],
    kind: "card",
    modes: ["online", "computer"],
    hue: 50,
    ogImage: { url: "/scum-og-v2.png", width: 1672, height: 941 },
    blurb: "Climb from lowly 2s to Jokers, shed every card, and fight your way from Scum to President.",
  },
  {
    slug: "secret-hitler",
    name: "Secret Hitler",
    players: [5, 10],
    minutes: [30, 45],
    kind: "hidden",
    modes: ["online", "computer"],
    hue: 200,
    blurb: "Nominate a government, pass secret policies, and uncover the hidden Fascist team before democracy falls.",
  },
  {
    slug: "sequence",
    name: "Sequence",
    // Teams have to divide evenly, so 5, 7 and 11 cannot be dealt at all —
    // lib/sequence.js VALID_PLAYER_COUNTS is the authority.
    players: [2, 12],
    playerCounts: [2, 3, 4, 6, 8, 9, 10, 12],
    minutes: [25, 35],
    kind: "board",
    modes: ["online", "computer"],
    hue: 300,
    blurb: "Play a card, claim a space, and connect five chips with friends or computers across up to three teams.",
  },
  {
    slug: "skull-king",
    name: "Skull King",
    // lib/skull-king-rooms.js MAX_PLAYERS is 9 ("nine captains").
    players: [2, 9],
    minutes: [30, 40],
    kind: "card",
    modes: ["online", "computer"],
    hue: 175,
    blurb: "Bid your tricks, command Pirates and monsters, and survive ten rounds to claim the captain's crown.",
  },
  {
    slug: "splendor",
    name: "Splendor",
    players: [2, 4],
    minutes: [30, 40],
    kind: "board",
    modes: ["online", "computer"],
    hue: 265,
    blurb: "Gather precious gems, build a permanent engine of bonuses, and attract nobles before rival merchants.",
  },
  {
    slug: "spyrium",
    name: "Spyrium",
    players: [2, 5],
    minutes: [45, 60],
    kind: "board",
    modes: ["online", "computer"],
    hue: 140,
    blurb: "Place workers in a shifting Victorian market, mine miraculous crystals, and build an industrial empire.",
  },
  {
    slug: "ticket-to-ride",
    name: "Ticket to Ride",
    players: [2, 5],
    minutes: [40, 60],
    kind: "board",
    modes: ["online", "computer"],
    hue: 215,
    blurb: "Collect colorful train cards, claim routes across the map, and complete secret destination tickets.",
  },
  {
    slug: "uno",
    name: "UNO",
    players: [2, 10],
    minutes: [15, 25],
    kind: "card",
    modes: ["online", "computer"],
    hue: 30,
    blurb: "Play Classic UNO or flip every hand between light and dark sides in UNO Flip.",
  },
  {
    slug: "viticulture",
    name: "Viticulture",
    players: [2, 6],
    minutes: [45, 75],
    kind: "board",
    modes: ["online", "computer"],
    hue: 110,
    isNew: true,
    blurb: "Place workers through the seasons, grow a vineyard, craft wine, and fulfill orders in a race to 20 VP.",
  },
];

/** Alphabetical, which is the order the hub grid renders. */
export const GAMES = /** @type {ReadonlyArray<Game>} */ (
  [...CATALOGUE].sort((left, right) => left.name.localeCompare(right.name, "en", { numeric: true }))
);

/** Tools and admin routes that should never sit in the game list. */
export const TOOLS = [
  { slug: "killer-bunnies/cards", name: "Update Killer Bunnies cards" },
];

/**
 * "Twenty-six" was written out by hand in the README, the manifest, the root
 * metadata and the hub's eyebrow. It had already been "Twenty-four" in all four
 * a couple of games earlier, which is exactly the drift this module exists to
 * prevent.
 */
const NUMBER_WORDS = [
  "Zero", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
  "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen",
  "Seventeen", "Eighteen", "Nineteen", "Twenty",
];

export function gameCountWords() {
  const count = GAMES.length;
  if (count <= 20) return NUMBER_WORDS[count];
  const [tens, ones] = [Math.floor(count / 10) * 10, count % 10];
  const tensWord = { 20: "Twenty", 30: "Thirty", 40: "Forty", 50: "Fifty" }[tens];
  if (!tensWord) return String(count);
  return ones ? `${tensWord}-${NUMBER_WORDS[ones].toLowerCase()}` : tensWord;
}

/** @param {Game} game */
export function gameHref(game) {
  return `/${game.slug}`;
}

/**
 * @param {string} slug
 * @returns {Game | null}
 */
export function getGame(slug) {
  return GAMES.find((game) => game.slug === slug) || null;
}

/** "2–10 players" · "4 players" · "Solo" */
/** @param {Game} game */
export function playersLabel(game) {
  const [min, max] = game.players;
  if (min === 1 && max === 1) return "Solo";
  if (min === max) return `${min} players`;
  return `${min}–${max} players`;
}

/** @param {Game} game */
export function minutesLabel(game) {
  return `${game.minutes[0]}–${game.minutes[1]} min`;
}

/**
 * @param {Game} game
 * @param {string} field
 */
export function isEstimated(game, field) {
  return Boolean(game.estimated?.includes(field));
}

/**
 * @param {Game} game
 * @param {number} count
 */
export function supportsPlayerCount(game, count) {
  // `playerCounts`, where a game declares one, is the authority: some games
  // have gaps inside their range (Sequence cannot seat 5, 7 or 11; Hand and
  // Foot plays in partnerships, so only even counts deal). Filtering on the
  // endpoints alone offered games that then refused to start.
  if (game.playerCounts) return game.playerCounts.includes(count);
  return count >= game.players[0] && count <= game.players[1];
}

/** "quick" ≤ 20 min · "mid" ≤ 40 min · "long" beyond that. */
/** @param {Game} game */
export function lengthBucket(game) {
  if (game.minutes[0] <= 20) return "quick";
  if (game.minutes[0] <= 40) return "mid";
  return "long";
}

/**
 * The distinct player counts worth offering as filters: every integer any
 * game supports, so the chip row never offers a count that matches nothing.
 */
export function playerCountOptions() {
  const counts = new Set();
  for (const game of GAMES) {
    const supported = game.playerCounts
      ?? Array.from({ length: game.players[1] - game.players[0] + 1 }, (_, index) => game.players[0] + index);
    for (const n of supported) if (n <= 12) counts.add(n);
  }
  return [...counts].sort((a, b) => a - b);
}

/**
 * @typedef {Object} Game
 * @property {string} slug
 * @property {string} name
 * @property {[number, number]} players
 * @property {number[]} [playerCounts] exact seat counts, when the range has gaps
 * @property {[number, number]} minutes
 * @property {"card"|"board"|"hidden"} kind
 * @property {Array<"online"|"computer"|"local">} modes
 * @property {number} hue
 * @property {string} blurb
 * @property {boolean} [isNew]
 * @property {string[]} [estimated]
 * @property {{url: string, width: number, height: number}} [ogImage]
 */
