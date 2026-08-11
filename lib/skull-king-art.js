const SUIT_ART = {
  green: "/skull-king/suit-green.jpg",
  yellow: "/skull-king/suit-yellow.jpg",
  purple: "/skull-king/suit-purple.jpg",
  black: "/skull-king/suit-black.jpg",
};

const PIRATE_ART = {
  rosie: "/skull-king/pirate-rosie.jpg",
  bendt: "/skull-king/pirate-bendt.jpg",
  rascal: "/skull-king/pirate-rascal.jpg",
  juanita: "/skull-king/pirate-juanita.jpg",
  harry: "/skull-king/pirate-harry.jpg",
  mary: "/skull-king/pirate-mary.jpg",
};

const ESCAPE_ART = {
  "escape-0": "/skull-king/escape-dawn-sloop.jpg",
  "escape-1": "/skull-king/escape-cliff-rowboat.jpg",
  "escape-2": "/skull-king/escape-fog-ship.jpg",
  "escape-3": "/skull-king/escape-moonlit-lifeboat.jpg",
  "escape-4": "/skull-king/escape-reef-cutter.jpg",
};

const SPECIAL_ART = {
  tigress: "/skull-king/tigress.jpg",
  skullKing: "/skull-king/skull-king.jpg",
  firstMate: "/skull-king/first-mate-con.jpg",
  kraken: "/skull-king/monster-kraken.jpg",
  whiteWhale: "/skull-king/monster-white-whale.jpg",
  spottedStingray: "/skull-king/monster-spotted-stingray.jpg",
  walkThePlank: "/skull-king/walk-the-plank.jpg",
  lastVolley: "/skull-king/last-volley.jpg",
  davyJones: "/skull-king/davy-jones-locker.jpg",
};

export function getSkullKingCardArt(card) {
  if (["number", "choice"].includes(card.type)) return SUIT_ART[card.suit] || null;
  if (card.type === "wild15") return "/skull-king/wild-monkey-15.jpg";
  if (card.type !== "special") return null;
  if (card.kind === "pirate") return PIRATE_ART[card.pirateKey] || null;
  if (card.kind === "escape") return ESCAPE_ART[card.id] || ESCAPE_ART["escape-0"];
  if (card.kind === "doubloon") {
    return card.id === "doubloon-1" ? "/skull-king/doubloon-pair.jpg" : "/skull-king/doubloon-ship.jpg";
  }
  if (card.kind === "mermaid") {
    return card.id === "mermaid-1" ? "/skull-king/mermaid-moonlit.jpg" : "/skull-king/mermaid-turquoise.jpg";
  }
  return SPECIAL_ART[card.kind] || null;
}
